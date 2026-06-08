/**
 * Alpine 组件计算属性
 * 定义所有 computed 属性的 getter 方法
 */

import { appStore } from '@/stores/useAppStore';
import { analysisTargets } from '../config/analysisTargets';
import type { Product } from '../config/sampleData';
import { convertScraperDataToProduct } from '../utils/dataTransformers';
import { parseAnalysisReport } from '../services/analysisService';
import { AnalysisResult, AlpineContext, FullReportData } from '../types';
import type { ScrapedData } from '@/types/modules-business';
import type { FullAnalysisReport } from '../config/analysisReportData';
import { getPromptTokenCount } from './helpers';
import { formatTokenCount } from '../utils/tokenCounter';

/**
 * 计算属性接口
 */
export interface ComputedProperties {
  currentProducts: Product[];
  availableAsins: string[];
  hasData: boolean;
  canAnalyze: boolean;
  analysisTargets: typeof analysisTargets;
  results: AnalysisResult[];
  listingsResults: AnalysisResult[];
  reviewsResults: AnalysisResult[];
  totalHighlights: number;
  totalDetails: number;
  hasScraperData: boolean;
  dataSourceLabel: string;
  dataSourceMarketplace: string;
  dataSourceTimestamp: string;
  fullReportData: FullReportData | null;
  totalTokenCount: number;
  formattedTotalTokenCount: string;
  listingAnalysisTargets: typeof analysisTargets;
  reviewAnalysisTargets: typeof analysisTargets;
  totalFeatureBulletCount: number;
  totalCustomerReviewCount: number;
  productSummaryText: string;
  dataSourceMetaText: string;
  hasNoAvailableAsins: boolean;
  hasNoScraperData: boolean;
  hasSelectedAnalysisInput: boolean;
  hasMissingAnalysisInput: boolean;
  selectedTaskCountText: string;
  promptPanelToggleText: string;
}

type ComputedMixin<T extends object> = T & ThisType<ComputedProperties>;

function applyComputedMixin(target: object, mixin: object): void {
  Object.defineProperties(target, Object.getOwnPropertyDescriptors(mixin));
}

function getScrapedData(): ScrapedData | null {
  return appStore.getState().scraper?.scrapedData as ScrapedData | null;
}

function getCurrentProducts(context: AlpineContext): Product[] {
  const products: Product[] = [];

  // 优先从 Scraper 数据获取
  const scrapedData = getScrapedData();
  if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
    for (const asin of context.selectedAsins) {
      const matchedProduct = scrapedData.products.find(p => p.asin === asin);
      if (matchedProduct) {
        const product = convertScraperDataToProduct(matchedProduct);
        if (product) {
          products.push(product);
        }
      }
    }
  }

  return products;
}

function createProductComputedProperties(context: AlpineContext): ComputedMixin<Pick<
  ComputedProperties,
  | 'currentProducts'
  | 'availableAsins'
  | 'hasData'
  | 'canAnalyze'
  | 'analysisTargets'
  | 'listingAnalysisTargets'
  | 'reviewAnalysisTargets'
>> {
  return {
    get currentProducts(): Product[] {
      return getCurrentProducts(context);
    },

    get availableAsins(): string[] {
      const scrapedData = getScrapedData();
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        return scrapedData.products
          .map(p => p.asin)
          .filter((asin): asin is string => !!asin);
      }
      return [];
    },

    get hasData(): boolean {
      return this.currentProducts.length > 0;
    },

    get canAnalyze(): boolean {
      const hasTargets = context.selectedTargets && context.selectedTargets.length > 0;
      const result = hasTargets && this.hasData && !context.isAnalyzing;
      return result;
    },

    get analysisTargets() {
      return analysisTargets;
    },

    get listingAnalysisTargets() {
      return analysisTargets.filter(target => target.source === 'Listings');
    },

    get reviewAnalysisTargets() {
      return analysisTargets.filter(target => target.source === 'Reviews');
    },
  };
}

function createSummaryComputedProperties(context: AlpineContext): ComputedMixin<Pick<
  ComputedProperties,
  | 'totalFeatureBulletCount'
  | 'totalCustomerReviewCount'
  | 'productSummaryText'
  | 'dataSourceMetaText'
  | 'hasNoAvailableAsins'
  | 'hasNoScraperData'
  | 'hasSelectedAnalysisInput'
  | 'hasMissingAnalysisInput'
  | 'selectedTaskCountText'
  | 'promptPanelToggleText'
>> {
  return {
    get totalFeatureBulletCount(): number {
      return this.currentProducts.reduce((sum, product) => sum + product.feature_bullets.length, 0);
    },

    get totalCustomerReviewCount(): number {
      return this.currentProducts.reduce((sum, product) => sum + product.customer_reviews.length, 0);
    },

    get productSummaryText(): string {
      return `包含 ${this.currentProducts.length} 个产品，共 ${this.totalCustomerReviewCount} 条评论`;
    },

    get dataSourceMetaText(): string {
      return `市场: ${this.dataSourceMarketplace} · 抓取时间: ${this.dataSourceTimestamp}`;
    },

    get hasNoAvailableAsins(): boolean {
      return this.availableAsins.length === 0;
    },

    get hasNoScraperData(): boolean {
      return !this.hasScraperData;
    },

    get hasSelectedAnalysisInput(): boolean {
      return context.selectedTargets.length > 0 && this.currentProducts.length > 0;
    },

    get hasMissingAnalysisInput(): boolean {
      return context.selectedTargets.length === 0 || context.selectedAsins.length === 0;
    },

    get selectedTaskCountText(): string {
      return `${context.selectedTargets.length} 个任务`;
    },

    get promptPanelToggleText(): string {
      return `${context.showPromptPanel ? '收起' : '展开'} 预览`;
    },
  };
}

function createResultComputedProperties(context: AlpineContext): ComputedMixin<Pick<
  ComputedProperties,
  'results' | 'listingsResults' | 'reviewsResults' | 'totalHighlights' | 'totalDetails'
>> {
  return {
    get results(): AnalysisResult[] {
      if (!context.analysisReport || !context.selectedTargets || context.selectedTargets.length === 0) {
        return [];
      }

      try {
        const results = parseAnalysisReport(
          context.analysisReport as FullAnalysisReport,
          context.selectedTargets
        );
        return results;
      } catch (error) {
        console.error('[计算属性] results 解析失败:', error);
        return [];
      }
    },

    get listingsResults(): AnalysisResult[] {
      const filtered = this.results.filter(r => r.source === 'Listings');
      return filtered;
    },

    get reviewsResults(): AnalysisResult[] {
      const filtered = this.results.filter(r => r.source === 'Reviews');
      return filtered;
    },

    get totalHighlights(): number {
      return this.results.reduce((acc, r) => acc + r.highlights.length, 0);
    },

    get totalDetails(): number {
      return this.results.reduce((acc, r) => acc + r.details.length, 0);
    },
  };
}

function createDataSourceComputedProperties(context: AlpineContext): ComputedMixin<Pick<
  ComputedProperties,
  'hasScraperData' | 'dataSourceLabel' | 'dataSourceMarketplace' | 'dataSourceTimestamp' | 'fullReportData'
>> {
  return {
    get hasScraperData(): boolean {
      const scrapedData = getScrapedData();
      return !!(scrapedData && scrapedData.products && scrapedData.products.length > 0);
    },

    get dataSourceLabel(): string {
      return '数据采集';
    },

    get dataSourceMarketplace(): string {
      const scrapedData = getScrapedData();
      if (scrapedData?.metadata?.marketplace) {
        return scrapedData.metadata.marketplace;
      }
      return '未知';
    },

    get dataSourceTimestamp(): string {
      const scrapedData = getScrapedData();
      if (scrapedData?.metadata?.scrape_timestamp) {
        return scrapedData.metadata.scrape_timestamp;
      }
      return '未知';
    },

    get fullReportData(): FullReportData | null {
      if (!context.analysisReport) return null;

      const productTitle = this.currentProducts.length > 0
        ? this.currentProducts.map(p => p.productTitle).join(' | ')
        : undefined;

      return {
        metadata: {
          asins: context.selectedAsins,
          targets: context.selectedTargets,
          timestamp: new Date().toISOString(),
          dataSource: context.dataSource,
          marketplace: this.dataSourceMarketplace,
          productTitle
        },
        analysisReport: context.analysisReport
      };
    },
  };
}

function createTokenComputedProperties(): ComputedMixin<Pick<
  ComputedProperties,
  'totalTokenCount' | 'formattedTotalTokenCount'
>> {
  return {
    get totalTokenCount(): number {
      const ctx = this as unknown as AlpineContext & ComputedProperties;
      if (ctx.selectedTargets.length === 0 || ctx.currentProducts.length === 0) {
        return 0;
      }
      return ctx.selectedTargets.reduce((total, targetId) => {
        return total + getPromptTokenCount(targetId, ctx.currentProducts);
      }, 0);
    },

    get formattedTotalTokenCount(): string {
      return formatTokenCount(this.totalTokenCount);
    },
  };
}

/**
 * 创建计算属性方法
 */
export function createComputedProperties(context: AlpineContext): ComputedProperties {
  const computed = {} as ComputedProperties;

  applyComputedMixin(computed, createProductComputedProperties(context));
  applyComputedMixin(computed, createSummaryComputedProperties(context));
  applyComputedMixin(computed, createResultComputedProperties(context));
  applyComputedMixin(computed, createDataSourceComputedProperties(context));
  applyComputedMixin(computed, createTokenComputedProperties());

  return computed;
}
