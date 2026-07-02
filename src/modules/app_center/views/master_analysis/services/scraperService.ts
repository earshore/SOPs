// ==========================================
// 🚀 src/modules/app_center/views/master_analysis/services/scraperService.ts
// 🎯 Phase 4: 已迁移使用 StorageService
// 🎯 P0优化: 完整类型定义
// ==========================================

import { LANGUAGE_HEADERS } from '../../../../../common/constants/constants';
import { parseProductPage, parseReviews } from './parserService';
import { sleep, getErrorSummary } from '../../../../../common/ui';
import { HistoryService } from './historyService';
import { StorageService } from '../../../../../services/storageService';
import { configCenter } from '../../../../../common/config/ConfigCenter';
import { ValidationError, ApiError, SystemError } from '@common/errors/AppError';
import type {
  ProxyConfig,
  FetchOptions,
  ScrapedProduct,
  StatusCallback,
  ScraperSite,
} from '@/types/modules-business';

const nativeLoggerConsole = globalThis.console;

const CACHE_DURATION_MS = configCenter.get<number>('scraper.cacheDuration') || 24 * 60 * 60 * 1000;

// ----------------------------------------
// 请求超时控制器
// ----------------------------------------

const REQUEST_TIMEOUT_MS = configCenter.get<number>('scraper.requestTimeout') || 15000;

function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeout: number = REQUEST_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeoutId)
  );
}

/**
 * 并发控制池
 */
class RequestPool {
  private max: number;
  private running: number = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrent: number = 2) {
    this.max = maxConcurrent;
  }

  async add<T>(fn: () => Promise<T>): Promise<T> {
    if (this.running >= this.max) {
      await new Promise<void>(resolve => this.queue.push(resolve));
    }
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
      if (this.queue.length > 0) {
        const resolve = this.queue.shift();
        if (resolve) resolve();
      }
    }
  }
}

const requestPool = new RequestPool(configCenter.get<number>('scraper.maxConcurrent') || 2);

type LanguageHeader = (typeof LANGUAGE_HEADERS)[keyof typeof LANGUAGE_HEADERS];

interface ProxyFetchContext {
  url: string;
  site: string;
  headers: LanguageHeader;
  urlWithLang: string;
  proxyConfig: ProxyConfig;
  timeout: number;
  delay: number;
}

interface ScrapeContext {
  asin: string;
  site: ScraperSite;
  scrapeReviews: boolean;
  updateStatusCallback: StatusCallback;
  fetchOptions: FetchOptions;
  lang: LanguageHeader;
  baseUrl: string;
}

interface ScrapedContent {
  title: string;
  bullets: string[];
  reviews: ScrapedProduct['customer_reviews'];
}

// ----------------------------------------
// URL 策略
// ----------------------------------------

type URLStrategy = (targetUrl: string, key: string) => string;

const URL_STRATEGIES: Record<string, URLStrategy> = {
  scraperapi: (targetUrl, key) =>
    `https://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}`,
  zenrows: (targetUrl, key) =>
    `https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(targetUrl)}&js_render=true`,
  brightdata: (targetUrl, key) =>
    `https://api.brightdata.com/request?customer=${key}&url=${encodeURIComponent(targetUrl)}`,
  custom_api: (targetUrl, baseUrl) => {
    const separator = baseUrl.includes('?') ? (baseUrl.endsWith('=') ? '' : '&url=') : '?url=';
    const finalBase =
      baseUrl.endsWith('url=') || baseUrl.endsWith('url') ? baseUrl : `${baseUrl}${separator}`;
    return `${finalBase}${encodeURIComponent(targetUrl)}`;
  },
  custom_proxy: (targetUrl, proxyUrl) => `${proxyUrl}${encodeURIComponent(targetUrl)}`,
  custom: (targetUrl, proxyUrl) => `${proxyUrl}${encodeURIComponent(targetUrl)}`,
};

function constructFetchUrl(targetUrl: string, proxyConfig: ProxyConfig): string {
  const { type = 'custom_api', customUrl } = proxyConfig;
  const strategy = URL_STRATEGIES[type];

  if (strategy) {
    if (!customUrl) {
      throw new ValidationError(
        `未配置 API Key 或 URL`,
        'SCRAPER_SVC_001',
        'customUrl',
        undefined,
        { module: 'ScraperService', action: 'constructFetchUrl', proxyType: type }
      );
    }
    return strategy(targetUrl, customUrl);
  }
  throw new ValidationError(`未支持的采集代理类型`, 'SCRAPER_SVC_001', 'type', type, {
    module: 'ScraperService',
    action: 'constructFetchUrl',
    proxyType: type,
  });
}

function getScraperRequestConfig(options: FetchOptions): {
  retries: number;
  delay: number;
  proxyConfig: ProxyConfig;
  timeout: number;
} {
  return {
    retries: options.retries ?? configCenter.get<number>('scraper.maxRetries') ?? 3,
    delay: options.delay ?? configCenter.get<number>('scraper.retryDelay') ?? 500,
    proxyConfig: options.proxyConfig ?? {},
    timeout:
      options.timeout ?? configCenter.get<number>('scraper.requestTimeout') ?? REQUEST_TIMEOUT_MS,
  };
}

function getLanguageHeader(site: string): LanguageHeader {
  const headers = LANGUAGE_HEADERS[site];
  if (!headers) {
    throw new ValidationError(`未找到站点 ${site} 的配置`, 'SCRAPER_SVC_002', 'site', site, {
      module: 'ScraperService',
      action: 'fetchWithProxy',
    });
  }

  return headers;
}

function addLanguageParameter(url: string, locale: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}language=${locale}`;
}

function isCommercialProxy(proxyConfig: ProxyConfig): boolean {
  return ['scraperapi', 'zenrows', 'brightdata', 'custom_api'].includes(proxyConfig.type || '');
}

function createProxyRequestOptions(headers: LanguageHeader, proxyConfig: ProxyConfig): RequestInit {
  if (isCommercialProxy(proxyConfig)) {
    return {};
  }

  return {
    headers: {
      'Accept-Language': headers['Accept-Language'],
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  };
}

async function waitBeforeProxyAttempt(attempt: number, delay: number): Promise<void> {
  if (attempt === 0) {
    return;
  }

  const jitter = Math.random() * 300;
  await sleep(delay * (attempt + 1) + jitter);
}

async function assertProxyResponseOk(res: Response, context: ProxyFetchContext): Promise<void> {
  if (res.status === 403 || res.status === 401) {
    throw new ApiError('API Key 无效或访问被拒绝', 'SCRAPER_SVC_003', res.status, undefined, {
      module: 'ScraperService',
      action: 'fetchWithProxy',
      url: context.url,
      site: context.site,
      proxyType: context.proxyConfig.type,
    });
  }

  if (res.status === 429) {
    await sleep(2000 + Math.random() * 1000);
    throw new ApiError('请求过于频繁 (429)', 'SCRAPER_SVC_004', 429, undefined, {
      module: 'ScraperService',
      action: 'fetchWithProxy',
      url: context.url,
      site: context.site,
    });
  }

  if (!res.ok) {
    throw new ApiError(`HTTP Error ${res.status}`, 'SCRAPER_SVC_005', res.status, undefined, {
      module: 'ScraperService',
      action: 'fetchWithProxy',
      url: context.url,
      site: context.site,
    });
  }
}

function assertProxyTextOk(text: string, context: ProxyFetchContext): void {
  if (text && text.length >= 200) {
    return;
  }

  if (isCommercialProxy(context.proxyConfig)) {
    return;
  }

  throw new ApiError('返回内容过短，可能无效', 'SCRAPER_SVC_006', undefined, text, {
    module: 'ScraperService',
    action: 'fetchWithProxy',
    url: context.url,
    site: context.site,
    contentLength: text?.length || 0,
  });
}

function normalizeProxyAttemptError(errorValue: unknown, attempt: number, timeout: number): Error {
  const error = errorValue instanceof Error ? errorValue : new Error(String(errorValue));

  if (error.name === 'AbortError') {
    nativeLoggerConsole.warn(`请求超时 (attempt ${attempt + 1})`);
    return new Error(`请求超时 (${timeout}ms)`);
  }

  nativeLoggerConsole.warn(`Fetch attempt ${attempt + 1} failed:`, error.message);
  return error;
}

async function fetchProxyAttempt(context: ProxyFetchContext, attempt: number): Promise<string> {
  await waitBeforeProxyAttempt(attempt, context.delay);

  const fetchUrl = constructFetchUrl(context.urlWithLang, context.proxyConfig);
  const reqOptions = createProxyRequestOptions(context.headers, context.proxyConfig);
  const res = await requestPool.add(() => fetchWithTimeout(fetchUrl, reqOptions, context.timeout));

  await assertProxyResponseOk(res, context);

  const text = await res.text();
  assertProxyTextOk(text, context);
  return text;
}

// ----------------------------------------
// 代理请求
// ----------------------------------------

async function fetchWithProxy(
  url: string,
  site: string,
  options: FetchOptions = {}
): Promise<string> {
  const { retries, delay, proxyConfig, timeout } = getScraperRequestConfig(options);
  const headers = getLanguageHeader(site);
  const context: ProxyFetchContext = {
    url,
    site,
    headers,
    urlWithLang: addLanguageParameter(url, headers.locale),
    proxyConfig,
    timeout,
    delay,
  };

  let lastError: Error | undefined;

  for (let i = 0; i < retries; i++) {
    try {
      return await fetchProxyAttempt(context, i);
    } catch (e) {
      lastError = normalizeProxyAttemptError(e, i, timeout);
    }
  }
  throw lastError;
}

/**
 * 并行评论抓取
 */
async function fetchReviewsParallel(
  asin: string,
  site: ScraperSite,
  fetchOptions: FetchOptions,
  lang: { domain: string; locale: string; name: string }
): Promise<unknown[]> {
  const reviewUrls = [
    `https://www.${lang.domain}/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews&sortBy=recent`,
    `https://www.${lang.domain}/product-reviews/${asin}`,
  ];

  // 并行请求，取第一个成功的
  const results = await Promise.allSettled(
    reviewUrls.map(url =>
      fetchWithProxy(url, site, { ...fetchOptions, retries: 2 }).then(html => parseReviews(html))
    )
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.length > 0) {
      return result.value;
    }
  }
  return [];
}

function createFailedScrapedProduct(asin: string, error: string): ScrapedProduct {
  return {
    asin,
    url: '',
    language: '',
    productTitle: '',
    scrape_status: 'failed',
    error,
    feature_bullets: [],
    customer_reviews: [],
  };
}

async function getCachedScrapedProduct(context: ScrapeContext): Promise<ScrapedProduct | null> {
  try {
    const cachedItem = await HistoryService.getByAsinAsync(context.asin, context.site);
    if (!cachedItem?.product) {
      return null;
    }

    const now = Date.now();
    const cachedTime = new Date(cachedItem.timestamp).getTime();
    if (now - cachedTime >= CACHE_DURATION_MS) {
      return null;
    }

    const age = ((now - cachedTime) / 3600000).toFixed(1);
    context.updateStatusCallback(context.asin, 'success', `命中缓存 (${age}小时前)`);
    return cachedItem.product;
  } catch (err) {
    nativeLoggerConsole.warn('缓存读取失败，转为网络请求');
    return null;
  }
}

function createScrapeFetchOptions(proxyConfig: ProxyConfig): FetchOptions {
  return {
    retries: configCenter.get<number>('scraper.maxRetries') || 3,
    delay: configCenter.get<number>('scraper.retryDelay') || 500,
    proxyConfig,
  };
}

function createPendingScrapedProduct(context: ScrapeContext): ScrapedProduct {
  return {
    asin: context.asin,
    url: `${context.baseUrl}?language=${context.lang.locale}`,
    language: context.lang.name,
    productTitle: '',
    feature_bullets: [],
    customer_reviews: [],
    scrape_status: 'pending',
    error: '',
  };
}

function assertValidProductTitle(title: string, context: ScrapeContext, attempt: number): void {
  if (title && !title.includes('Robot Check')) {
    return;
  }

  throw new SystemError('触发反爬验证 (Robot Check)', 'SCRAPER_SVC_007', {
    module: 'ScraperService',
    action: 'scrapeAsin',
    asin: context.asin,
    site: context.site,
    attempt,
  });
}

function toCustomerReviews(reviews: unknown[]): ScrapedProduct['customer_reviews'] {
  return reviews.map(r => {
    const review = r as { title?: string; content?: string; rating?: number; isVerified?: boolean };
    return {
      headline: review.title || '',
      body: review.content || '',
      star_rating: review.rating || 0,
      is_verified: review.isVerified || false,
      review_date: '',
    };
  });
}

async function scrapeProductReviews(
  context: ScrapeContext,
  productHtml: string
): Promise<ScrapedProduct['customer_reviews']> {
  context.updateStatusCallback(context.asin, 'scraping', '正在分析评论...');

  let reviews = await fetchReviewsParallel(
    context.asin,
    context.site,
    context.fetchOptions,
    context.lang
  );
  if (reviews.length === 0) {
    reviews = parseReviews(productHtml);
  }

  return toCustomerReviews(reviews);
}

async function scrapeProductContent(
  context: ScrapeContext,
  attempt: number
): Promise<ScrapedContent> {
  context.updateStatusCallback(context.asin, 'scraping', `正在采集 (第 ${attempt} 次)...`);

  const productHtml = await fetchWithProxy(context.baseUrl, context.site, context.fetchOptions);
  const { title, bullets } = parseProductPage(productHtml, context.asin, context.site);
  assertValidProductTitle(title, context, attempt);

  return {
    title,
    bullets,
    reviews: context.scrapeReviews ? await scrapeProductReviews(context, productHtml) : [],
  };
}

function applyScrapedContent(result: ScrapedProduct, content: ScrapedContent): void {
  result.productTitle = content.title;
  result.feature_bullets = content.bullets;
  result.customer_reviews = content.reviews;
  result.scrape_status = 'success';
}

async function handleScrapeAttemptFailure(
  error: unknown,
  attempt: number,
  maxRetries: number,
  result: ScrapedProduct,
  asin: string
): Promise<void> {
  console.error(`Task Error ${asin}:`, error);

  if (attempt === maxRetries) {
    result.scrape_status = 'failed';
    result.error = (error as Error).message;
    return;
  }

  await sleep(1000 * attempt);
}

async function runScrapeAttempts(context: ScrapeContext, result: ScrapedProduct): Promise<void> {
  const maxRetries = configCenter.get<number>('scraper.maxRetries') || 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      applyScrapedContent(result, await scrapeProductContent(context, attempt));
      return;
    } catch (error) {
      await handleScrapeAttemptFailure(error, attempt, maxRetries, result, context.asin);
    }
  }
}

function createScrapeSummary(result: ScrapedProduct): string {
  return result.scrape_status === 'failed'
    ? getErrorSummary(result.error)
    : `标题:已采集, 描述:${result.feature_bullets.length}, 评论:${result.customer_reviews.length}`;
}

/**
 * 主抓取函数
 * @param asin - 产品ASIN
 * @param site - 站点标识
 * @param scrapeReviews - 是否抓取评论
 * @param updateStatusCallback - 状态更新回调
 * @returns 抓取的产品数据
 */
export async function scrapeAsin(
  asin: string,
  site: ScraperSite,
  scrapeReviews: boolean,
  updateStatusCallback: StatusCallback
): Promise<ScrapedProduct> {
  if (!site || !LANGUAGE_HEADERS[site]) {
    const errorMsg = `无效的站点参数: ${site || '为空'}`;
    updateStatusCallback(asin, 'failed', errorMsg);
    return createFailedScrapedProduct(asin, errorMsg);
  }

  const proxyConfig = StorageService.getProxyConfig();
  const lang = getLanguageHeader(site);
  const baseUrl = `https://www.${lang.domain}/dp/${asin}`;
  const context: ScrapeContext = {
    asin,
    site,
    scrapeReviews,
    updateStatusCallback,
    fetchOptions: createScrapeFetchOptions(proxyConfig),
    lang,
    baseUrl,
  };

  const cachedProduct = await getCachedScrapedProduct(context);
  if (cachedProduct) {
    return cachedProduct;
  }

  const result = createPendingScrapedProduct(context);
  await runScrapeAttempts(context, result);
  updateStatusCallback(asin, result.scrape_status, createScrapeSummary(result));
  return result;
}

/**
 * 批量抓取优化
 * @param asins - ASIN列表
 * @param site - 站点标识
 * @param scrapeReviews - 是否抓取评论
 * @param updateStatusCallback - 状态更新回调
 * @returns 抓取的产品数据列表
 */
export async function scrapeMultipleAsins(
  asins: string[],
  site: ScraperSite,
  scrapeReviews: boolean,
  updateStatusCallback: StatusCallback
): Promise<ScrapedProduct[]> {
  const BATCH_SIZE = configCenter.get<number>('scraper.batchSize') || 3;
  const BATCH_DELAY = configCenter.get<number>('scraper.batchDelay') || 1500;

  const results: ScrapedProduct[] = [];

  for (let i = 0; i < asins.length; i += BATCH_SIZE) {
    const batch = asins.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(asin => scrapeAsin(asin, site, scrapeReviews, updateStatusCallback))
    );

    results.push(...batchResults);

    // 批次间延迟，避免触发反爬
    if (i + BATCH_SIZE < asins.length) {
      await sleep(BATCH_DELAY + Math.random() * 500);
    }
  }

  return results;
}
