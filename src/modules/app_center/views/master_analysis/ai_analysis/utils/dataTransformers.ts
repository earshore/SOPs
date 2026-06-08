/**
 * 数据转换工具
 * 负责不同数据格式之间的转换
 */

import type { Product } from '../config/sampleData';
import { ScraperData, ScraperProduct } from '../types';
import { ValidationError } from '@common/errors/AppError';

function pickFirst<T>(...values: T[]): T | undefined {
  return values.find(value => Boolean(value));
}

function normalizeReview(reviewData: unknown): Product['customer_reviews'][number] {
  if (!reviewData || typeof reviewData !== 'object') {
    return {
      star_rating: 5,
      headline: '',
      body: '',
      origin_country: '',
      review_date: '',
      _origin_site: ''
    };
  }

  const review = reviewData as Record<string, unknown>;
  return {
    star_rating: pickFirst(
      review.star_rating as number,
      review.rating as number
    ) || 5,
    headline: pickFirst(
      review.headline as string,
      review.review_title as string,
      review.title as string
    ) || '',
    body: pickFirst(
      review.body as string,
      review.review_text as string,
      review.text as string,
      review.content as string
    ) || '',
    origin_country: (review.origin_country as string) || '',
    review_date: (review.review_date as string) || '',
    _origin_site: (review._origin_site as string) || ''
  };
}

function getProductTitle(product: ScraperProduct): string {
  return pickFirst(product.productTitle, product.title) || '';
}

function getFeatureBullets(product: ScraperProduct): Product['feature_bullets'] {
  return pickFirst(
    product.feature_bullets,
    product.bulletPoints,
    product.bullet_points
  ) || [];
}

function getCustomerReviews(product: ScraperProduct): Product['customer_reviews'] {
  const reviews = pickFirst(product.customer_reviews, product.reviews) || [];
  return (reviews as unknown[]).map(normalizeReview);
}

/**
 * 从 Scraper 单个产品数据转换为 Product 格式
 */
export function convertScraperDataToProduct(productData: unknown): Product | null {
  try {
    if (!productData || typeof productData !== 'object') {
      console.error('[数据转换] 产品数据无效:', productData);
      return null;
    }

    const product = productData as ScraperProduct;
    const converted: Product = {
      asin: product.asin || '',
      productTitle: getProductTitle(product),
      feature_bullets: getFeatureBullets(product),
      customer_reviews: getCustomerReviews(product),
      scrape_status: 'success',
      metadata: {}
    };

    return converted;
  } catch (error) {
    console.error('[数据转换] 转换产品数据失败:', { error, productData });
    return null;
  }
}

/**
 * 合并多个产品的数据
 */
export function mergeProducts(products: Product[]): Product {
  if (products.length === 0) {
    throw new ValidationError(
      '没有可合并的产品数据',
      'DATA_TRANSFORMER_001',
      'products',
      products,
      { module: 'DataTransformers', action: 'mergeProducts' }
    );
  }

  // 合并多个产品的数据
  const mergedProduct: Product = {
    asin: products.map(p => p.asin).join(', '),
    productTitle: products.map(p => p.productTitle).join(' | '),
    feature_bullets: products.flatMap(p => p.feature_bullets),
    customer_reviews: products.flatMap(p => p.customer_reviews),
    scrape_status: 'success',
    metadata: {
      merged: true,
      product_count: products.length,
      asins: products.map(p => p.asin)
    }
  };

  return mergedProduct;
}

/**
 * 从 Scraper 数据中提取 ASIN 列表
 */
export function extractAsinsFromScraperData(scrapedData: unknown): string[] {
  if (!scrapedData || typeof scrapedData !== 'object') {
    return [];
  }
  
  const data = scrapedData as ScraperData;
  
  if (!data.products || !Array.isArray(data.products)) {
    return [];
  }
  
  return data.products
    .map(p => p.asin)
    .filter((asin): asin is string => !!asin && typeof asin === 'string');
}

/**
 * 从 Scraper 数据中获取指定 ASIN 的产品
 */
export function getProductsByAsins(scrapedData: unknown, asins: string[]): Product[] {
  const products: Product[] = [];
  
  if (!scrapedData || typeof scrapedData !== 'object') {
    return products;
  }
  
  const data = scrapedData as ScraperData;
  
  if (!data.products || !Array.isArray(data.products)) {
    return products;
  }
  
  for (const asin of asins) {
    const matchedProduct = data.products.find(p => p.asin === asin);
    if (matchedProduct) {
      const product = convertScraperDataToProduct(matchedProduct);
      if (product) {
        products.push(product);
      }
    }
  }
  
  return products;
}
