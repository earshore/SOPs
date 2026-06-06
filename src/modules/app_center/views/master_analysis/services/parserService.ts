// src/modules/app_center/views/master_analysis/services/parserService.ts
import {
  SELECTOR_MAP,
  VERIFIED_PURCHASE_PATTERNS,
} from '../../../../../common/constants/constants';
// ----------------------------------------
// 1. 类型定义
// ----------------------------------------

interface ParsedProduct {
  title: string;
  bullets: string[];
}

interface ParsedReview {
  title: string;
  content: string;
  rating: number;
  isVerified: boolean;
}

// ----------------------------------------
// 2. 通用解析工具 (Utility Functions)
// ----------------------------------------

/**
 * 安全提取元素文本
 * @param root - 根元素
 * @param selector - 选择器或选择器数组
 * @returns 提取到的文本，如果没找到则返回 ""
 */
function safeExtractText(root: Element | Document, selector: string | string[]): string {
  const selectors = Array.isArray(selector) ? selector : [selector];
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const text = el?.textContent?.trim();
    if (text) return text;
  }
  return "";
}

/**
 * 解析星级评分
 * @param container - 容器元素
 * @param selectors - 选择器数组
 */
function extractRating(container: Element, selectors: string[]): number {
  for (const sel of selectors) {
    const el = container.querySelector(sel);
    if (!el) continue;

    // 尝试1: 文本解析 (e.g. "4.5 out of 5 stars")
    const text = el.textContent || el.className || "";
    const textMatch = text.match(/(\d)([.,](\d))?/);
    if (textMatch) return parseFloat(textMatch[0].replace(",", "."));

    // 尝试2: aria-label (Accessibility属性)
    const label = el.getAttribute("aria-label") || "";
    const labelMatch = label.match(/(\d)([.,](\d))?/);
    if (labelMatch) return parseFloat(labelMatch[0].replace(",", "."));
  }
  return 0; // 默认0分
}

// ----------------------------------------
// 3. 主解析逻辑 (Main Logic)
// ----------------------------------------

/**
 * 解析产品页面，提取标题和要点
 */
export function parseProductPage(html: string, _asin: string, _site: string): ParsedProduct {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // 1. 提取标题
  const title = safeExtractText(doc, SELECTOR_MAP.productTitle || []);

  // 2. 提取五点描述 (Feature Bullets)
  const bullets: string[] = [];
  const bulletSelectors = SELECTOR_MAP.bulletPoints || [];
  for (const sel of bulletSelectors) {
    const els = doc.querySelectorAll(sel);
    if (els.length > 0) {
      els.forEach((el) => {
        const text = el.textContent?.trim();
        // 过滤掉无效或重复的描述
        if (text && text.length > 5 && !bullets.includes(text)) {
          bullets.push(text);
        }
      });
      break; // 只要找到一组有效的选择器就停止
    }
  }

  return {
    title,
    bullets: bullets.slice(0, 5), // 只取前5条
  };
}

/**
 * 解析评论页面，提取评论列表
 */
export function parseReviews(html: string): ParsedReview[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const reviews: ParsedReview[] = [];
  const seenContents = new Set<string>(); // 用于去重

  // 1. 定位评论容器
  let reviewContainers: Element[] = [];
  const containerSelectors = SELECTOR_MAP.reviewContainers || [];
  for (const sel of containerSelectors) {
    const containers = doc.querySelectorAll(sel);
    if (containers.length > 0) {
      reviewContainers = Array.from(containers); // 转为数组方便操作
      break;
    }
  }

  // 2. 兜底策略：未找到容器，尝试直接提取 Body
  if (reviewContainers.length === 0) {
    console.warn(
      "Parser: No review containers found, fallback to direct body extraction."
    );
    // 这种情况下通常无法提取评分和标题，只能提取内容
    const bodySelectors = SELECTOR_MAP.reviewBody || [];
    for (const sel of bodySelectors) {
      const els = doc.querySelectorAll(sel);
      if (els.length > 0) {
        els.forEach((el) => {
          const content = el.textContent?.trim();
          if (
            content &&
            content.length > 20 &&
            !seenContents.has(content.substring(0, 50))
          ) {
            seenContents.add(content.substring(0, 50));
            reviews.push({
              title: "User Review", // 占位符
              content,
              rating: 0,
              isVerified: false,
            });
          }
        });
        if (reviews.length > 0) break;
      }
    }
    return reviews.slice(0, 20);
  }

  // 3. 标准解析流程
  reviewContainers.forEach((container) => {
    // A. 提取内容
    let content = "";
    // 优先查找内部 span，因为有时外层包含多余空格
    const bodySelectors = SELECTOR_MAP.reviewBody || [];
    for (const sel of bodySelectors) {
      const bodyEl = container.querySelector(sel);
      if (!bodyEl) continue;

      // 尝试提取更纯净的文本
      const spans = bodyEl.querySelectorAll("span");
      if (spans.length > 0) {
        // 找出字数最多的那个 span，通常是正文
        content =
          Array.from(spans)
            .reduce((a, b) =>
              (a.textContent?.length || 0) > (b.textContent?.length || 0)
                ? a
                : b
            )
            .textContent?.trim() || "";
      }

      if (!content) content = bodyEl.textContent?.trim() || "";
      if (content.length > 10) break;
    }

    // B. 提取标题
    let title = safeExtractText(container, SELECTOR_MAP.reviewTitle || []);
    // 清理标题中的杂质 (e.g. "5.0 out of 5 stars Great Product")
    title = title.replace(
      /^\d+([.,]\d)?\s*(von|out of|sur|su|de)\s*\d+\s*(Sternen?|stars?|étoiles?|stelle|estrellas)?\s*-?\s*/i,
      ""
    );

    // C. 提取评分
    const rating = extractRating(container, SELECTOR_MAP.reviewRating || []);

    // D. 校验是否 VP (Verified Purchase)
    const containerText = container.textContent || "";
    const isVerified = VERIFIED_PURCHASE_PATTERNS.some((p) =>
      containerText.includes(p)
    );

    // E. 最终组装与去重
    if (
      content &&
      content.length > 10 &&
      !seenContents.has(content.substring(0, 50))
    ) {
      seenContents.add(content.substring(0, 50));
      reviews.push({ title, content, rating, isVerified });
    }
  });

  return reviews.slice(0, 20);
}
