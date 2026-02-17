/**
 * Alpine 组件计算属性
 * 定义所有 computed 属性的 getter 方法
 */

import state from '@common/state';
import { analysisTargets } from '../config/analysisTargets';
import { getProductByAsin, Product } from '../config/sampleData';
import { convertScraperDataToProduct } from '../utils/dataTransformers';
import { AnalysisResult } from '../types';

/**
 * 计算属性接口
 */
export interface ComputedProperties {
  currentProducts: Product[];
  availableAsins: string[];
  hasData: boolean;
  canAnalyze: boolean;
  analysisTargets: typeof analysisTargets;
  listingsResults: AnalysisResult[];
  reviewsResults: AnalysisResult[];
  totalHighlights: number;
  totalDetails: number;
  hasScraperData: boolean;
  dataSourceLabel: string;
  dataSourceMarketplace: string;
  dataSourceTimestamp: string;
  fullReportData: any;
}

/**
 * 创建计算属性方法
 */
export function createComputedProperties(context: any) {
  return {
    /**
     * 获取当前选中的产品列表
     */
    get currentProducts(): Product[] {
      const products: Product[] = [];
      
      // 优先从 Scraper 数据获取
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        for (const asin of context.selectedAsins) {
          const matchedProduct = scrapedData.products.find((p: any) => p.asin === asin);
          if (matchedProduct) {
            const product = convertScraperDataToProduct(matchedProduct);
            if (product) {
              products.push(product);
            }
          }
        }
      }
      
      // 如果没有从 Scraper 获取到，从示例数据获取
      if (products.length === 0) {
        for (const asin of context.selectedAsins) {
          const product = getProductByAsin(asin);
          if (product) {
            products.push(product);
          }
        }
      }
      
      return products;
    },

    /**
     * 获取可用的 ASIN 列表
     */
    get availableAsins(): string[] {
      // 优先从 Scraper 获取 ASIN 列表
      const scrapedData = state.scraper?.scrapedData;
      console.log('[availableAsins] state.scraper:', state.scraper);
      console.log('[availableAsins] scrapedData:', scrapedData);
      
      if (scrapedData && scrapedData.products && scrapedData.products.length > 0) {
        const asins = scrapedData.products.map((p: any) => p.asin).filter((asin: string) => asin);
        console.log('[availableAsins] 从 Scraper 获取:', asins);
        return asins;
      }
      // 没有真实数据时，从示例数据获取
      const { getAvailableAsins } = require('../config/sampleData');
      const sampleAsins = getAvailableAsins();
      console.log('[availableAsins] 从示例数据获取:', sampleAsins);
      return sampleAsins;
    },

    /**
     * 是否有数据
     */
    get hasData(): boolean {
      const result = this.availableAsins.length > 0;
      console.log('[hasData] availableAsins.length:', this.availableAsins.length, 'result:', result);
      return result;
    },

    /**
     * 是否可以开始分析
     */
    get canAnalyze(): boolean {
      const selectedAsinsCount = context.selectedAsins.length;
      const selectedTargetsCount = context.selectedTargets.length;
      const availableAsinsCount = this.availableAsins.length;
      const isAnalyzing = context.isAnalyzing;
      
      const result = selectedAsinsCount > 0 && 
                     selectedTargetsCount > 0 && 
                     availableAsinsCount > 0 && 
                     !isAnalyzing;
      
      console.log('[canAnalyze] 检查条件:', {
        selectedAsins: selectedAsinsCount,
        selectedTargets: selectedTargetsCount,
        availableAsins: availableAsinsCount,
        isAnalyzing: isAnalyzing,
        result: result
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
     * Listings 分析结果
     */
    get listingsResults(): AnalysisResult[] {
      return context.results.filter((r: AnalysisResult) => r.source === 'Listings');
    },

    /**
     * Reviews 分析结果
     */
    get reviewsResults(): AnalysisResult[] {
      return context.results.filter((r: AnalysisResult) => r.source === 'Reviews');
    },

    /**
     * 总高亮数量
     */
    get totalHighlights(): number {
      return context.results.reduce((acc: number, r: AnalysisResult) => acc + r.highlights.length, 0);
    },

    /**
     * 总详情数量
     */
    get totalDetails(): number {
      return context.results.reduce((acc: number, r: AnalysisResult) => acc + r.details.length, 0);
    },

    /**
     * 是否有 Scraper 数据
     */
    get hasScraperData(): boolean {
      const scrapedData = state.scraper?.scrapedData;
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
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata) {
        return scrapedData.metadata.marketplace || '未知';
      }
      return '未知';
    },

    /**
     * 数据源时间戳
     */
    get dataSourceTimestamp(): string {
      const scrapedData = state.scraper?.scrapedData;
      if (scrapedData && scrapedData.metadata && scrapedData.metadata.scrape_timestamp) {
        // 使用 formatHistoryDate 需要从 reportGenerator 导入
        return scrapedData.metadata.scrape_timestamp;
      }
      return '未知';
    },

    /**
     * 完整报告数据
     */
    get fullReportData() {
      if (!context.analysisReport) return null;
      
      return {
        metadata: {
          asins: context.selectedAsins,
          targets: context.selectedTargets,
          timestamp: new Date().toISOString(),
          dataSource: context.dataSource,
          marketplace: this.dataSourceMarketplace
        },
        results: context.results,
        analysisReport: context.analysisReport
      };
    }
  };
}
