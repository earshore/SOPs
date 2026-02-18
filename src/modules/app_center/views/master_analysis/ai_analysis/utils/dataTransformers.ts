/**
 * 数据转换工具
 * 负责不同数据格式之间的转换
 */

import { Product } from '../config/sampleData';

/**
 * 从 Scraper 单个产品数据转换为 Product 格式
 */
export function convertScraperDataToProduct(productData: unknown): Product | null {
  try {
    if (!productData || typeof productData !== 'object') {
      console.error('[数据转换] 产品数据无效:', productData);
      return null;
    }

    const product = productData as Record<string, unknown>;
    
    console.log('[数据转换] 开始转换产品数据:', {
      asin: product.asin,
      hasTitle: !!(product.productTitle || product.title),
      hasBullets: !!(product.feature_bullets || product.bulletPoints || product.bullet_points),
      hasReviews: !!(product.customer_reviews || product.reviews),
      rawData: product
    });
    
    const converted = {
      asin: (product.asin as string) || '',
      productTitle: (product.productTitle as string) || (product.title as string) || '',
      feature_bullets: (product.feature_bullets as string[]) || (product.bulletPoints as string[]) || (product.bullet_points as string[]) || [],
      customer_reviews: ((product.customer_reviews as unknown[]) || (product.reviews as unknown[]) || []).map((r: unknown) => {
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
    
    console.log('[数据转换] 转换结果:', {
      asin: converted.asin,
      title: converted.productTitle,
      bulletsCount: converted.feature_bullets.length,
      reviewsCount: converted.customer_reviews.length
    });
    
    return converted;
  } catch (error) {
    console.error('[数据转换] 转换产品数据失败:', error, productData);
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

  console.log('[数据转换] 已合并 ' + products.length + ' 个产品的数据');
  console.log('[数据转换] 合并后数据: ' + mergedProduct.feature_bullets.length + ' 个卖点, ' + mergedProduct.customer_reviews.length + ' 条评论');

  return mergedProduct;
}

/**
 * 从 Scraper 数据中提取 ASIN 列表
 */
export function extractAsinsFromScraperData(scrapedData: any): string[] {
  if (!scrapedData || !scrapedData.products || !Array.isArray(scrapedData.products)) {
    return [];
  }
  
  return scrapedData.products
    .map((p: any) => p.asin)
    .filter((asin: string) => asin && typeof asin === 'string');
}

/**
 * 从 Scraper 数据中获取指定 ASIN 的产品
 */
export function getProductsByAsins(scrapedData: any, asins: string[]): Product[] {
  const products: Product[] = [];
  
  if (!scrapedData || !scrapedData.products || !Array.isArray(scrapedData.products)) {
    return products;
  }
  
  for (const asin of asins) {
    const matchedProduct = scrapedData.products.find((p: any) => p.asin === asin);
    if (matchedProduct) {
      const product = convertScraperDataToProduct(matchedProduct);
      if (product) {
        products.push(product);
      }
    }
  }
  
  return products;
}
