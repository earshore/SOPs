// src/services/scraperService.js
import { LANGUAGE_HEADERS, PROXY_URLS } from "../../../common/constants/constants.js";
import { parseProductPage, parseReviews } from "./parserService.js";
import { sleep, getErrorSummary } from "../../../common/utils/ui.js";
import { HistoryService } from "../../../services/historyService.js";

// ==========================================
// 1. 常量与策略定义
// ==========================================

// 缓存有效期：24小时
const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

/**
 * URL 构造策略
 */
const URL_STRATEGIES = {
    // --- 商业 API ---
    // 修改后：去掉 &render=true，除非你明确需要抓取动态加载的内容
    scraperapi: (targetUrl, key) =>
        `http://api.scraperapi.com?api_key=${key}&url=${encodeURIComponent(targetUrl)}`,
    zenrows: (targetUrl, key) =>
        `https://api.zenrows.com/v1/?apikey=${key}&url=${encodeURIComponent(targetUrl)}&js_render=true`,

    brightdata: (targetUrl, key) =>
        `https://api.brightdata.com/request?customer=${key}&url=${encodeURIComponent(targetUrl)}`,

    // --- 自定义 API ---
    custom_api: (targetUrl, baseUrl) => {
        // 智能补全 ?url=
        const separator = baseUrl.includes("?") ? (baseUrl.endsWith("=") ? "" : "&url=") : "?url=";
        const finalBase = (baseUrl.endsWith("url=") || baseUrl.endsWith("url")) ? baseUrl : `${baseUrl}${separator}`;
        return `${finalBase}${encodeURIComponent(targetUrl)}`;
    },

    // --- 免费/旧版兼容 ---
    allorigins: (targetUrl) =>
        `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}`, // JSON模式

    corsproxy: (targetUrl) =>
        `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`,

    corsanywhere: (targetUrl) =>
        `https://cors-anywhere.herokuapp.com/${targetUrl}`,

    // --- 自定义代理 ---
    custom_proxy: (targetUrl, proxyUrl) => `${proxyUrl}${encodeURIComponent(targetUrl)}`,
    custom: (targetUrl, proxyUrl) => `${proxyUrl}${encodeURIComponent(targetUrl)}` // 兼容旧版
};

// ==========================================
// 2. 网络请求层
// ==========================================

function constructFetchUrl(targetUrl, proxyConfig) {
    const { type = "allorigins", customUrl } = proxyConfig;
    const strategy = URL_STRATEGIES[type];

    if (strategy) {
        // 校验必填项
        if (['scraperapi', 'zenrows', 'brightdata', 'custom_api', 'custom_proxy', 'custom'].includes(type)) {
            if (!customUrl) throw new Error(`未配置 API Key 或 URL`);
            return strategy(targetUrl, customUrl);
        }
        return strategy(targetUrl);
    }
    // 默认兜底
    return (PROXY_URLS.allorigins || "https://api.allorigins.win/get?url=") + encodeURIComponent(targetUrl);
}

// src/services/scraperService.js

async function fetchWithProxy(url, site, options = {}) {
    const { retries = 3, delay = 1000, proxyConfig = {} } = options;
    const headers = LANGUAGE_HEADERS[site];
    const separator = url.includes("?") ? "&" : "?";
    const urlWithLang = `${url}${separator}language=${headers.locale}`;

    const isAllOriginsJson = proxyConfig.type === 'allorigins';

    for (let i = 0; i < retries; i++) {
        try {
            if (i > 0) await sleep(delay * Math.pow(1.5, i));

            const fetchUrl = constructFetchUrl(urlWithLang, proxyConfig);

            // === 修复核心 ===
            // 商业 API：通常不需要 header，参数都在 URL 里
            // AllOrigins (免费)：不能带 Header，否则触发浏览器 CORS 预检失败 (Network Error)
            // 其他自定义代理：可能需要模拟浏览器 Header

            const isCommercial = ['scraperapi', 'zenrows', 'brightdata', 'custom_api'].includes(proxyConfig.type);
            const isFreeProxy = proxyConfig.type === 'allorigins';

            let reqOptions = {};

            // 只有在使用 "非商业" 且 "非AllOrigins" (例如 corsproxy 或 自定义 HTTP 代理) 时才发送 Header
            if (!isCommercial && !isFreeProxy) {
                reqOptions = {
                    headers: {
                        "Accept-Language": headers["Accept-Language"],
                        "Accept": "text/html,application/xhtml+xml",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
                    }
                };
            }

            const res = await fetch(fetchUrl, reqOptions);

            if (res.status === 403 || res.status === 401) throw new Error("API Key 无效或访问被拒绝");
            if (!res.ok) throw new Error(`HTTP Error ${res.status}`);

            let text = await res.text();

            // AllOrigins JSON 解析
            if (isAllOriginsJson) {
                try {
                    const json = JSON.parse(text);
                    text = json.contents;
                } catch (e) { /* ignore - 有时候返回的直接是HTML或者错误文本 */ }
            }

            // 调低阈值，有些反爬页面内容很少，防止误判抛出错误
            if (!text || text.length < 200) {
                if (!isCommercial) throw new Error("返回内容过短，可能无效");
            }

            return text;

        } catch (e) {
            console.warn(`Fetch attempt ${i + 1} failed:`, e); // 增加日志方便调试
            if (i === retries - 1) throw e;
        }
    }
}
// ==========================================
// 3. 业务逻辑 (含缓存)
// ==========================================

export async function scrapeAsin(asin, site, scrapeReviews, updateStatusCallback) {
    const proxyConfig = JSON.parse(localStorage.getItem("proxy_config") || '{"type":"allorigins"}');

    // === 修复 4: 增加防御性编程，检查 Site 是否有效 ===
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
    // ===============================================

    // ✅ 步骤 1: 检查缓存 (保持原有逻辑...)
    try {
        const cachedItem = HistoryService.getByAsin(asin, site);
        if (cachedItem && cachedItem.product) {
            const now = Date.now();
            const cachedTime = new Date(cachedItem.timestamp).getTime();

            if ((now - cachedTime) < CACHE_DURATION_MS) {
                const age = ((now - cachedTime) / 3600000).toFixed(1);
                updateStatusCallback(asin, "scraping", "正在读取缓存...");
                await sleep(300);
                updateStatusCallback(asin, "success", `⚡ 命中缓存 (${age}小时前)`);
                return cachedItem.product;
            }
        }
    } catch (err) {
        console.warn("缓存读取失败，转为网络请求");
    }

    // ✅ 步骤 2: 网络请求
    const fetchOptions = { retries: 3, delay: 1000, proxyConfig };
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

            // 1. 主页
            const productHtml = await fetchWithProxy(baseUrl, site, fetchOptions);
            const { title, bullets } = parseProductPage(productHtml, asin, site);

            if (!title || title.includes("Robot Check")) throw new Error("触发反爬验证 (Robot Check)");

            result.productTitle = title;
            result.feature_bullets = bullets;

            // 2. 评论 (可选)
            if (scrapeReviews) {
                updateStatusCallback(asin, "scraping", "正在分析评论...");
                await sleep(500 + Math.random() * 800);
                let reviews = [];
                const reviewUrls = [
                    `https://www.${lang.domain}/product-reviews/${asin}/ref=cm_cr_dp_d_show_all_btm?ie=UTF8&reviewerType=all_reviews&sortBy=recent`,
                    `https://www.${lang.domain}/product-reviews/${asin}`
                ];

                let reviewSuccess = false;
                for (const rUrl of reviewUrls) {
                    if (reviewSuccess) break;
                    try {
                        const rHtml = await fetchWithProxy(rUrl, site, fetchOptions);
                        const rData = parseReviews(rHtml);
                        if (rData.length > 0) {
                            reviews = rData;
                            reviewSuccess = true;
                        }
                    } catch (e) { }
                }

                if (!reviewSuccess) {
                    const homeReviews = parseReviews(productHtml);
                    if (homeReviews.length > 0) reviews = homeReviews;
                }

                result.customer_reviews = reviews.map(r => ({
                    headline: r.title || "", body: r.content || "", star_rating: r.rating || 0, is_verified: r.isVerified || false, review_date: ""
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
                await sleep(2000 * attempt);
            }
        }
    }

    const summary = result.scrape_status === "failed" ? getErrorSummary(result.error) : `标题:✓, 描述:${result.feature_bullets.length}, 评论:${result.customer_reviews.length}`;
    updateStatusCallback(asin, result.scrape_status, summary);

    return result;
}