/**
 * Alpine 组件计算属性
 * 定义所有 computed 属性的 getter 方法
 */

import { appStore } from '@/stores/useAppStore';
import { analysisTargets } from '../config/analysisTargets';
import { getProductByAsin, Product } from '../config/sampleData';
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
}

/**
 * 创建计算属性方法
 */
export function createComputedProperties(context: AlpineContext): ComputedProperties {
  return {
    /**
     * 获取当前选中的产品列表
     */
    get currentProducts(): Product[] {
      const products: Product[] = [];
      
      // 优先从 Scraper 数据获取
      const scrapedData = appStore.getState().scraper?.scrapedData as ScrapedData | null;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        console.log('[计算属性] 开始从 Scraper 数据获取产品, selectedAsins:', context.selectedAsins);
        for (const asin of context.selectedAsins) {
          const matchedProduct = scrapedData.products.find(p => p.asin === asin);
          if (matchedProduct) {
            console.log('[计算属性] 找到匹配产品:', asin, matchedProduct);
            const product = convertScraperDataToProduct(matchedProduct);
            if (product) {
              console.log('[计算属性] 产品转换成功:', asin);
              products.push(product);
            } else {
              console.warn('[计算属性] 产品转换失败:', asin, matchedProduct);
            }
          } else {
            console.warn('[计算属性] 未找到匹配产品:', asin);
          }
        }
      } else {
        console.warn('[计算属性] Scraper 数据不可用:', {
          hasScrapedData: !!scrapedData,
          hasProducts: !!(scrapedData && scrapedData.products),
          productsLength: scrapedData?.products?.length
        });
      }
      
      // 如果没有从 Scraper 获取到，从示例数据获取
      if (products.length === 0) {
        console.log('[计算属性] 尝试从示例数据获取产品');
        for (const asin of context.selectedAsins) {
          const product = getProductByAsin(asin);
          if (product) {
            console.log('[计算属性] 从示例数据获取到产品:', asin);
            products.push(product);
          }
        }
      }
      
      console.log('[计算属性] currentProducts 最终结果:', products.length, '个产品');
      return products;
    },

    /**
     * 获取可用的 ASIN 列表
     */
    get availableAsins(): string[] {
      // 优先从 Scraper 获取 ASIN 列表
      const scrapedData = appStore.getState().scraper?.scrapedData as ScrapedData | null;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        return scrapedData.products
          .map(p => p.asin)
          .filter((asin): asin is string => !!asin);
      }
      // 没有真实数据时返回空数组
      return [];
    },

    /**
     * 是否有数据
     */
    get hasData(): boolean {
      return this.currentProducts.length > 0;
    },

    /**
     * 是否可以开始分析
     * 注意：这里必须检查 context.selectedTargets，因为它是响应式的
     * 但由于 Alpine.js 的初始化顺序问题，我们需要确保至少有一个目标被选中
     */
    get canAnalyze(): boolean {
      // 如果 selectedTargets 为空但 analysisTargets 有值，说明还没初始化完成
      // 这种情况下暂时返回 false，等待 init() 完成后会重新计算
      const hasTargets = context.selectedTargets && context.selectedTargets.length > 0;
      const result = hasTargets && this.hasData && !context.isAnalyzing;
      console.log('[计算属性] canAnalyze 检查:', {
        selectedTargets: context.selectedTargets?.length || 0,
        hasData: this.hasData,
        currentProducts: this.currentProducts.length,
        isAnalyzing: context.isAnalyzing,
        canAnalyze: result
      });
      return result;
    },

    /**
     * 分析目标配置
     */
    get analysisTargets() {
      return analysisTargets;
    },

    /**
     * 实时解析分析结果
     * 从原始 analysisReport 动态生成展示格式
     */
    get results(): AnalysisResult[] {
      if (!context.analysisReport || !context.selectedTargets || context.selectedTargets.length === 0) {
        return [];
      }
      
      try {
        const results = parseAnalysisReport(
          context.analysisReport as FullAnalysisReport,
          context.selectedTargets
        );
        console.log('[计算属性] results 实时解析:', results.length, '个结果');
        return results;
      } catch (error) {
        console.error('[计算属性] results 解析失败:', error);
        return [];
      }
    },

    /**
     * Listings 分析结果
     */
    get listingsResults(): AnalysisResult[] {
      const filtered = this.results.filter(r => r.source === 'Listings');
      console.log('[计算属性] listingsResults:', {
        totalResults: this.results.length,
        listingsCount: filtered.length
      });
      return filtered;
    },

    /**
     * Reviews 分析结果
     */
    get reviewsResults(): AnalysisResult[] {
      const filtered = this.results.filter(r => r.source === 'Reviews');
      console.log('[计算属性] reviewsResults:', {
        totalResults: this.results.length,
        reviewsCount: filtered.length
      });
      return filtered;
    },

    /**
     * 总高亮数量
     */
    get totalHighlights(): number {
      return this.results.reduce((acc, r) => acc + r.highlights.length, 0);
    },

    /**
     * 总详情数量
     */
    get totalDetails(): number {
      return this.results.reduce((acc, r) => acc + r.details.length, 0);
    },

    /**
     * 是否有 Scraper 数据
     */
    get hasScraperData(): boolean {
      const scrapedData = appStore.getState().scraper?.scrapedData as ScrapedData | null;
      return !!(scrapedData && scrapedData.products && scrapedData.products.length > 0);
    },

    /**
     * 数据源标签
     */
    get dataSourceLabel(): string {
      switch (context.dataSource) {
        case 'scraper': return '数据采集';
        case 'sample': return '示例数据';
        default: return '未知';
      }
    },

    /**
     * 数据源市场
     */
    get dataSourceMarketplace(): string {
      const scrapedData = appStore.getState().scraper?.scrapedData as ScrapedData | null;
      if (scrapedData?.metadata?.marketplace) {
        return scrapedData.metadata.marketplace;
      }
      return '未知';
    },

    /**
     * 数据源时间戳
     */
    get dataSourceTimestamp(): string {
      const scrapedData = appStore.getState().scraper?.scrapedData as ScrapedData | null;
      if (scrapedData?.metadata?.scrape_timestamp) {
        return scrapedData.metadata.scrape_timestamp;
      }
      return '未知';
    },

    /**
     * 完整报告数据
     * 只包含原始 analysisReport，不包含转换后的 results
     */
    get fullReportData(): FullReportData | null {
      if (!context.analysisReport) return null;
      
      // 获取产品标题（用于显示）
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

    /**
     * 所有选中任务的总 token 数
     */
    get totalTokenCount(): number {
      if (context.selectedTargets.length === 0 || this.currentProducts.length === 0) {
        return 0;
      }
      return context.selectedTargets.reduce((total, targetId) => {
        return total + getPromptTokenCount(targetId, this.currentProducts);
      }, 0);
    },

    /**
     * 格式化的总 token 数
     */
    get formattedTotalTokenCount(): string {
      return formatTokenCount(this.totalTokenCount);
    }
  };
}
