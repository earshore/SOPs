// src/modules/app_center/views/master_analysis/services/parserService.ts
import { SELECTOR_MAP, VERIFIED_PURCHASE_PATTERNS } from '@/common/constants/constants';

const nativeLoggerConsole = globalThis.console;
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
  return '';
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
    const text = el.textContent || el.className || '';
    const textMatch = text.match(/(\d)([.,](\d))?/);
    if (textMatch) return parseFloat(textMatch[0].replace(',', '.'));

    // 尝试2: aria-label (Accessibility属性)
    const label = el.getAttribute('aria-label') || '';
    const labelMatch = label.match(/(\d)([.,](\d))?/);
    if (labelMatch) return parseFloat(labelMatch[0].replace(',', '.'));
  }
  return 0; // 默认0分
}

function getTextLength(element: Element): number {
  return element.textContent?.length || 0;
}

function extractLongestSpanText(element: Element): string {
  const spans = Array.from(element.querySelectorAll('span'));
  if (spans.length === 0) return '';

  return (
    spans
      .reduce((longest, current) =>
        getTextLength(longest) > getTextLength(current) ? longest : current
      )
      .textContent?.trim() || ''
  );
}

function extractReviewContent(container: Element): string {
  const bodySelectors = SELECTOR_MAP.reviewBody || [];
  for (const sel of bodySelectors) {
    const bodyEl = container.querySelector(sel);
    if (!bodyEl) continue;

    const content = extractLongestSpanText(bodyEl) || bodyEl.textContent?.trim() || '';
    if (content.length > 10) return content;
  }
  return '';
}

function normalizeReviewTitle(container: Element): string {
  return safeExtractText(container, SELECTOR_MAP.reviewTitle || []).replace(
    /^\d+([.,]\d)?\s*(von|out of|sur|su|de)\s*\d+\s*(Sternen?|stars?|étoiles?|stelle|estrellas)?\s*-?\s*/i,
    ''
  );
}

function isVerifiedPurchase(container: Element): boolean {
  const containerText = container.textContent || '';
  return VERIFIED_PURCHASE_PATTERNS.some(p => containerText.includes(p));
}

function getReviewDedupeKey(content: string): string {
  return content.substring(0, 50);
}

function appendUniqueReview(
  reviews: ParsedReview[],
  seenContents: Set<string>,
  review: ParsedReview
): void {
  if (!review.content || review.content.length <= 10) return;

  const key = getReviewDedupeKey(review.content);
  if (seenContents.has(key)) return;

  seenContents.add(key);
  reviews.push(review);
}

function findFirstMatchingElements(root: Element | Document, selectors: string[]): Element[] {
  for (const sel of selectors) {
    const elements = root.querySelectorAll(sel);
    if (elements.length > 0) return Array.from(elements);
  }

  return [];
}

function findReviewContainers(doc: Document): Element[] {
  return findFirstMatchingElements(doc, SELECTOR_MAP.reviewContainers || []);
}

function appendFallbackReview(
  reviews: ParsedReview[],
  seenContents: Set<string>,
  content: string | undefined
): void {
  if (!content || content.length <= 20) return;

  const key = getReviewDedupeKey(content);
  if (seenContents.has(key)) return;

  seenContents.add(key);
  reviews.push({
    title: 'User Review',
    content,
    rating: 0,
    isVerified: false,
  });
}

function parseFallbackReviews(doc: Document): ParsedReview[] {
  nativeLoggerConsole.warn(
    'Parser: No review containers found, fallback to direct body extraction.'
  );

  const reviews: ParsedReview[] = [];
  const seenContents = new Set<string>();
  const bodyElements = findFirstMatchingElements(doc, SELECTOR_MAP.reviewBody || []);

  bodyElements.forEach(element => {
    appendFallbackReview(reviews, seenContents, element.textContent?.trim());
  });

  return reviews.slice(0, 20);
}

function parseReviewContainer(container: Element): ParsedReview {
  return {
    content: extractReviewContent(container),
    title: normalizeReviewTitle(container),
    rating: extractRating(container, SELECTOR_MAP.reviewRating || []),
    isVerified: isVerifiedPurchase(container),
  };
}

function parseStandardReviews(reviewContainers: Element[]): ParsedReview[] {
  const reviews: ParsedReview[] = [];
  const seenContents = new Set<string>();

  reviewContainers.forEach(container => {
    appendUniqueReview(reviews, seenContents, parseReviewContainer(container));
  });

  return reviews.slice(0, 20);
}

// ----------------------------------------
// 3. 主解析逻辑 (Main Logic)
// ----------------------------------------

/**
 * 解析产品页面，提取标题和要点
 */
export function parseProductPage(html: string, _asin: string, _site: string): ParsedProduct {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // 1. 提取标题
  const title = safeExtractText(doc, SELECTOR_MAP.productTitle || []);

  // 2. 提取五点描述 (Feature Bullets)
  const bullets: string[] = [];
  const bulletSelectors = SELECTOR_MAP.bulletPoints || [];
  for (const sel of bulletSelectors) {
    const els = doc.querySelectorAll(sel);
    if (els.length > 0) {
      els.forEach(el => {
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
  const doc = parser.parseFromString(html, 'text/html');
  const reviewContainers = findReviewContainers(doc);

  if (reviewContainers.length === 0) {
    return parseFallbackReviews(doc);
  }

  return parseStandardReviews(reviewContainers);
}
