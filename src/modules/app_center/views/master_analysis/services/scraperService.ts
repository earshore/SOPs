// ==========================================
// 🚀 src/modules/app_center/views/master_analysis/services/scraperService.ts
// 🎯 Phase 4: 已迁移使用 StorageService
// 🎯 P0优化: 完整类型定义
// ==========================================

import { LANGUAGE_HEADERS, PROXY_URLS } from '../../../../../common/constants/constants';
import { parseProductPage, parseReviews } from "./parserService";
import { sleep, getErrorSummary } from '../../../../../common/ui';
import { HistoryService } from "./historyService";
import { StorageService } from "../../../../../services/storageService";
import { configCenter } from '../../../../../common/config/ConfigCenter';
import type {
  ProxyConfig,
  FetchOptions,
  ScrapedProduct,
  StatusCallback,
  ScraperSite
} from '@/types/modules-business';

const CACHE_DURATION_MS = configCenter.get<number>('scraper.cacheDuration') || 24 * 60 * 60 * 1000;

// ----------------------------------------
// 请求超时控制器
// ----------------------------------------

const REQUEST_TIMEOUT_MS = configCenter.get<number>('scraper.requestTimeout') || 15000;

function fetchWithTimeout(url: string, options: RequestInit = {}, timeout: number = REQUEST_TIMEOUT_MS): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
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

// ----------------------------------------
// URL 策略
// ----------------------------------------

type URLStrategy = (targetUrl: string, key?: string) => string;

const URL_STRATEGIES: Record<string, URLStrategy> = {
    scraperapi: (targetUrl, key) =>
        `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}`,
    zenrows: (targetUrl, key) =>
        `https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(targetUrl)}&js_render=true`,
    brightdata: (targetUrl, key) =>
        `https://api.brightdata.com/request?customer=${key}&url=${encodeURIComponent(targetUrl)}`,
    custom_api: (targetUrl, baseUrl) => {
        const separator = baseUrl!.includes("?") ? (baseUrl!.endsWith("=") ? "" : "&url=") : "?url=";
        const finalBase = (baseUrl!.endsWith("url=") || baseUrl!.endsWith("url")) ? baseUrl : `${baseUrl}${separator}`;
        return `${finalBase}${encodeURIComponent(targetUrl)}`;
    },
    allorigins: (targetUrl) =>
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`,
    corsproxy: (targetUrl) =>
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,
    corsanywhere: (targetUrl) =>
        `https://cors-anywhere.herokuapp.com/${targetUrl}`,
    custom_proxy: (targetUrl, proxyUrl) => `${proxyUrl}${encodeURIComponent(targetUrl)}`,
    custom: (targetUrl, proxyUrl) => `${proxyUrl}${encodeURIComponent(targetUrl)}`
};

function constructFetchUrl(targetUrl: string, proxyConfig: ProxyConfig): string {
    const { type = "allorigins", customUrl } = proxyConfig;
    const strategy = URL_STRATEGIES[type];

    if (strategy) {
        if (['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy', 'custom'].includes(type)) {
            if (!customUrl) throw new Error(`未配置 API Key 或 URL`);
            return strategy(targetUrl, customUrl);
        }
        return strategy(targetUrl);
    }
    return (PROXY_URLS.allorigins || "https://api.allorigins.win/get?url=") + encodeURIComponent(targetUrl);
}

// ----------------------------------------
// 代理请求
// ----------------------------------------

async function fetchWithProxy(url: string, site: string, options: FetchOptions = {}): Promise<string> {
    const scraperConfig = {
        retries: configCenter.get<number>('scraper.maxRetries') || 3,
        delay: configCenter.get<number>('scraper.retryDelay') || 500,
        timeout: configCenter.get<number>('scraper.requestTimeout') || REQUEST_TIMEOUT_MS
    };

    const {
        retries = scraperConfig.retries,
        delay = scraperConfig.delay,
        proxyConfig = {},
        timeout = scraperConfig.timeout
    } = options;

    const headers = LANGUAGE_HEADERS[site];
    if (!headers) {
        throw new Error(`未找到站点 ${site} 的配置`);
    }
    
    const separator = url.includes("?") ? "&" : "?";
    const urlWithLang = `${url}${separator}language=${headers.locale}`;

    const isAllOriginsJson = proxyConfig.type === 'allorigins';
    const isCommercial = ['scraperapi', 'zenrows', 'brightdata', 'custom_api'].includes(proxyConfig.type || '');
    const isFreeProxy = proxyConfig.type === 'allorigins';

    let lastError: Error | undefined;

    for (let i = 0; i < retries; i++) {
        try {
            // 使用 jitter 随机化延迟，避免被检测为机器人
            if (i > 0) {
                const jitter = Math.random() * 300;
                await sleep(delay * (i + 1) + jitter);
            }

            const fetchUrl = constructFetchUrl(urlWithLang, proxyConfig);

            let reqOptions: RequestInit = {};
            if (!isCommercial && !isFreeProxy) {
                reqOptions = {
                    headers: {
                        "Accept-Language": headers["Accept-Language"],
                        "Accept": "text/html,application/xhtml+xml",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                };
            }

            // 使用带超时的 fetch + 并发池
            const res = await requestPool.add(() =>
                fetchWithTimeout(fetchUrl, reqOptions, timeout)
            );

            if (res.status === 403 || res.status === 401) {
                throw new Error("API Key 无效或访问被拒绝");
            }
            if (res.status === 429) {
                // 处理限流，等待后重试
                await sleep(2000 + Math.random() * 1000);
                throw new Error("请求过于频繁 (429)");
            }
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            let text = await res.text();

            if (isAllOriginsJson) {
                try {
                    const json = JSON.parse(text);
                    text = json.contents;
                } catch (e) { /* ignore */ }
            }

            if (!text || text.length < 200) {
                if (!isCommercial) throw new Error("返回内容过短，可能无效");
            }

            return text;

        } catch (e) {
            lastError = e as Error;
            // 超时错误特殊处理
            if ((e as any).name === 'AbortError') {
                console.warn(`请求超时 (attempt ${i + 1})`);
                lastError = new Error(`请求超时 (${timeout}ms)`);
            } else {
                console.warn(`Fetch attempt ${i + 1} failed:`, (e as Error).message);
            }
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
): Promise<any[]> {
    const reviewUrls = [
        `https://www.${lang.domain}/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews&sortBy=recent`,
        `https://www.${lang.domain}/product-reviews/${asin}`
    ];

    // 并行请求，取第一个成功的
    const results = await Promise.allSettled(
        reviewUrls.map(url =>
            fetchWithProxy(url, site, { ...fetchOptions, retries: 2 })
                .then(html => parseReviews(html))
        )
    );

    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.length > 0) {
            return result.value;
        }
    }
    return [];
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
    // 使用 StorageService 获取代理配置
    const proxyConfig = StorageService.getProxyConfig();

    if (!site || !LANGUAGE_HEADERS[site]) {
        const errorMsg = `无效的站点参数: ${site || "为空"}`;
        updateStatusCallback(asin, "failed", errorMsg);
        return {
            asin,
            url: '',
            language: '',
            productTitle: '',
            scrape_status: "failed",
            error: errorMsg,
            feature_bullets: [],
            customer_reviews: []
        };
    }

    // 缓存检查
    try {
        const cachedItem = HistoryService.getByAsin(asin, site);
        if (cachedItem && cachedItem.product) {
            const now = Date.now();
            const cachedTime = new Date(cachedItem.timestamp).getTime();

            if ((now - cachedTime) < CACHE_DURATION_MS) {
                const age = ((now - cachedTime) / 3600000).toFixed(1);
                updateStatusCallback(asin, "success", `⚡ 命中缓存 (${age}小时前)`);
                return cachedItem.product;
            }
        }
    } catch (err) {
        console.warn("缓存读取失败，转为网络请求");
    }

    const fetchOptions: FetchOptions = { 
        retries: configCenter.get<number>('scraper.maxRetries') || 3, 
        delay: configCenter.get<number>('scraper.retryDelay') || 500, 
        proxyConfig 
    };
    const lang = LANGUAGE_HEADERS[site];
    const baseUrl = `https://www.${lang.domain}/dp/${asin}`;

    let result: ScrapedProduct = {
        asin,
        url: `${baseUrl}?language=${lang.locale}`,
        language: lang.name,
        productTitle: "",
        feature_bullets: [],
        customer_reviews: [],
        scrape_status: "pending",
        error: "",
    };

    const MAX_TASK_RETRIES = configCenter.get<number>('scraper.maxRetries') || 3;

    for (let attempt = 1; attempt <= MAX_TASK_RETRIES; attempt++) {
        try {
            updateStatusCallback(asin, "scraping", `正在采集 (第 ${attempt} 次)...`);

            const productHtml = await fetchWithProxy(baseUrl, site, fetchOptions);
            const { title, bullets } = parseProductPage(productHtml, asin, site);

            if (!title || title.includes("Robot Check")) {
                throw new Error("触发反爬验证 (Robot Check)");
            }

            result.productTitle = title;
            result.feature_bullets = bullets;

            // 并行抓取评论
            if (scrapeReviews) {
                updateStatusCallback(asin, "scraping", "正在分析评论...");

                let reviews = await fetchReviewsParallel(asin, site, fetchOptions, lang);

                // 回退: 从商品页解析
                if (reviews.length === 0) {
                    reviews = parseReviews(productHtml);
                }

                result.customer_reviews = reviews.map(r => ({
                    headline: r.title || "",
                    body: r.content || "",
                    star_rating: r.rating || 0,
                    is_verified: r.isVerified || false,
                    review_date: ""
                }));
            }

            result.scrape_status = "success";
            break;

        } catch (e) {
            console.error(`Task Error ${asin}:`, e);
            if (attempt === MAX_TASK_RETRIES) {
                result.scrape_status = "failed";
                result.error = (e as Error).message;
            } else {
                await sleep(1000 * attempt);
            }
        }
    }

    const summary = result.scrape_status === "failed"
        ? getErrorSummary(result.error)
        : `标题:✓, 描述:${result.feature_bullets.length}, 评论:${result.customer_reviews.length}`;

    updateStatusCallback(asin, result.scrape_status, summary);
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
