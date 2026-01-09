// ==========================================
// 🚀 优化版 scraperService.js
// ==========================================

import { LANGUAGE_HEADERS, PROXY_URLS } from "../../../common/constants/constants.js";
import { parseProductPage, parseReviews } from "./parserService.js";
import { sleep, getErrorSummary } from "../../../common/utils/ui.js";
import { HistoryService } from "../../../services/historyService.js";

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// ✅ 优化1: 请求超时控制器
const REQUEST_TIMEOUT_MS = 15000; // 15秒超时，防止请求永久挂起

function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT_MS) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    return fetch(url, { ...options, signal: controller.signal })
        .finally(() => clearTimeout(timeoutId));
}

// ✅ 优化2: 并发控制池 (限制同时请求数) // 限制同时最多2个请求，避免触发反爬
class RequestPool {
    constructor(maxConcurrent = 2) {
        this.max = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    async add(fn) {
        if (this.running >= this.max) {
            await new Promise(resolve => this.queue.push(resolve));
        }
        this.running++;
        try {
            return await fn();
        } finally {
            this.running--;
            if (this.queue.length > 0) {
                this.queue.shift()();
            }
        }
    }
}

const requestPool = new RequestPool(2); // 最多2个并发

// URL策略保持不变...
const URL_STRATEGIES = {
    scraperapi: (targetUrl, key) =>
        `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}`,
    zenrows: (targetUrl, key) =>
        `https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(targetUrl)}&js_render=true`,
    brightdata: (targetUrl, key) =>
        `https://api.brightdata.com/request?customer=${key}&url=${encodeURIComponent(targetUrl)}`,
    custom_api: (targetUrl, baseUrl) => {
        const separator = baseUrl.includes("?") ? (baseUrl.endsWith("=") ? "" : "&url=") : "?url=";
        const finalBase = (baseUrl.endsWith("url=") || baseUrl.endsWith("url")) ? baseUrl : `${baseUrl}${separator}`;
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

function constructFetchUrl(targetUrl, proxyConfig) {
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

// ✅ 优化3: 改进的 fetchWithProxy
async function fetchWithProxy(url, site, options = {}) {
    const { 
        retries = 3, 
        delay = 500,        // ✅ 降低基础延迟
        proxyConfig = {},
        timeout = REQUEST_TIMEOUT_MS 
    } = options;
    
    const headers = LANGUAGE_HEADERS[site];
    const separator = url.includes("?") ? "&" : "?";
    const urlWithLang = `${url}${separator}language=${headers.locale}`;

    const isAllOriginsJson = proxyConfig.type === 'allorigins';
    const isCommercial = ['scraperapi', 'zenrows', 'brightdata', 'custom_api'].includes(proxyConfig.type);
    const isFreeProxy = proxyConfig.type === 'allorigins';

    let lastError;
    
    for (let i = 0; i < retries; i++) {
        try {
            // ✅ 优化: 使用 jitter 随机化延迟，避免被检测为机器人
            if (i > 0) {
                const jitter = Math.random() * 300;
                await sleep(delay * (i + 1) + jitter); // 线性而非指数
            }

            const fetchUrl = constructFetchUrl(urlWithLang, proxyConfig);

            let reqOptions = {};
            if (!isCommercial && !isFreeProxy) {
                reqOptions = {
                    headers: {
                        "Accept-Language": headers["Accept-Language"],
                        "Accept": "text/html,application/xhtml+xml",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                    }
                };
            }

            // ✅ 使用带超时的 fetch + 并发池
            const res = await requestPool.add(() => 
                fetchWithTimeout(fetchUrl, reqOptions, timeout)
            );

            if (res.status === 403 || res.status === 401) {
                throw new Error("API Key 无效或访问被拒绝");
            }
            if (res.status === 429) {
                // ✅ 新增: 处理限流，等待后重试
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
            lastError = e;
            // ✅ 超时错误特殊处理
            if (e.name === 'AbortError') {
                console.warn(`请求超时 (attempt ${i + 1})`);
                lastError = new Error(`请求超时 (${timeout}ms)`);
            } else {
                console.warn(`Fetch attempt ${i + 1} failed:`, e.message);
            }
        }
    }
    throw lastError;
}

// ✅ 优化4: 并行评论抓取
async function fetchReviewsParallel(asin, site, fetchOptions, lang) {
    const reviewUrls = [
        `https://www.${lang.domain}/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews&sortBy=recent`,
        `https://www.${lang.domain}/product-reviews/${asin}`
    ];

    // ✅ 并行请求，取第一个成功的
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

export async function scrapeAsin(asin, site, scrapeReviews, updateStatusCallback) {
    const proxyConfig = JSON.parse(localStorage.getItem("proxy_config") || '{"type":"allorigins"}');

    if (!site || !LANGUAGE_HEADERS[site]) {
        const errorMsg = `无效的站点参数: ${site || "为空"}`;
        updateStatusCallback(asin, "failed", errorMsg);
        return {
            asin,
            scrape_status: "failed",
            error: errorMsg,
            feature_bullets: [],
            customer_reviews: []
        };
    }

    // 缓存检查 (保持不变，但移除不必要的 sleep)
    try {
        const cachedItem = HistoryService.getByAsin(asin, site);
        if (cachedItem && cachedItem.product) {
            const now = Date.now();
            const cachedTime = new Date(cachedItem.timestamp).getTime();

            if ((now - cachedTime) < CACHE_DURATION_MS) {
                const age = ((now - cachedTime) / 3600000).toFixed(1);
                updateStatusCallback(asin, "success", `⚡ 命中缓存 (${age}小时前)`);
                return cachedItem.product;  // ✅ 移除了 sleep(300)
            }
        }
    } catch (err) {
        console.warn("缓存读取失败，转为网络请求");
    }

    const fetchOptions = { retries: 3, delay: 500, proxyConfig };
    const lang = LANGUAGE_HEADERS[site];
    const baseUrl = `https://www.${lang.domain}/dp/${asin}`;

    let result = {
        asin,
        url: `${baseUrl}?language=${lang.locale}`,
        language: lang.name,
        productTitle: "",
        feature_bullets: [],
        customer_reviews: [],
        scrape_status: "pending",
        error: "",
    };

    const MAX_TASK_RETRIES = 3;

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

            // ✅ 优化: 并行抓取评论
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
                result.error = e.message;
            } else {
                // ✅ 优化: 降低重试等待时间
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

// ✅ 新增: 批量抓取优化 (可选导出)
export async function scrapeMultipleAsins(asins, site, scrapeReviews, updateStatusCallback) {
    const BATCH_SIZE = 3;  // 每批3个
    const BATCH_DELAY = 1500; // 批次间隔
    
    const results = [];
    
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