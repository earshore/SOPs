/**
 * 数据转换工具
 * 负责不同数据格式之间的转换
 */

import { Product } from '../config/sampleData';
import { ScraperData, ScraperProduct } from '../types';

import { Logger } from '../../../../../../services/loggerService';
/**
 * 从 Scraper 单个产品数据转换为 Product 格式
 */
export function convertScraperDataToProduct(productData: unknown): Product | null {
  try {
    if (!productData || typeof productData !== 'object') {
      Logger.error('[数据转换] 产品数据无效:', productData);
      return null;
    }

    const product = productData as ScraperProduct;
    
    Logger.debug('[数据转换] 开始转换产品数据:', {
      asin: product.asin,
      hasTitle: !!(product.productTitle || product.title),
      hasBullets: !!(product.feature_bullets || product.bulletPoints || product.bullet_points),
      hasReviews: !!(product.customer_reviews || product.reviews),
      rawData: product
    });
    
    const converted: Product = {
      asin: product.asin || '',
      productTitle: product.productTitle || product.title || '',
      feature_bullets: product.feature_bullets || product.bulletPoints || product.bullet_points || [],
      customer_reviews: ((product.customer_reviews || product.reviews || []) as unknown[]).map((r: unknown) => {
        if (!r || typeof r !== 'object') {
          return {
            star_rating: 5,
            headline: '',
            body: '',
            origin_country: '',
            review_date: '',
            _origin_site: ''
          };
        }
        
        const review = r as Record<string, unknown>;
        return {
          star_rating: (review.star_rating as number) || (review.rating as number) || 5,
          headline: (review.headline as string) || (review.review_title as string) || (review.title as string) || '',
          body: (review.body as string) || (review.review_text as string) || (review.text as string) || (review.content as string) || '',
          origin_country: (review.origin_country as string) || '',
          review_date: (review.review_date as string) || '',
          _origin_site: (review._origin_site as string) || ''
        };
      }),
      scrape_status: 'success',
      metadata: {}
    };
    
    Logger.debug('[数据转换] 转换结果:', {
      asin: converted.asin,
      title: converted.productTitle,
      bulletsCount: converted.feature_bullets.length,
      reviewsCount: converted.customer_reviews.length
    });
    
    return converted;
  } catch (error) {
    Logger.error('[数据转换] 转换产品数据失败:', error, productData);
    return null;
  }
}

/**
 * 合并多个产品的数据
 */
export function mergeProducts(products: Product[]): Product {
  if (products.length === 0) {
    throw new Error('没有可合并的产品数据');
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

  Logger.debug('[数据转换] 已合并 ' + products.length + ' 个产品的数据');
  Logger.debug('[数据转换] 合并后数据: ' + mergedProduct.feature_bullets.length + ' 个卖点, ' + mergedProduct.customer_reviews.length + ' 条评论');

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
