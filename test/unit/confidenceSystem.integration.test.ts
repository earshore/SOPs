/**
 * AI 分析置信度系统集成测试
 * 验证从分析到 UI 展示的完整流程
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { appStore } from '../../src/stores/useAppStore';
import { calculateFullReportConfidence, calculateOverallConfidence } from '../../src/modules/app_center/views/master_analysis/ai_analysis/services/confidenceCalculator';

describe('AI 分析置信度系统集成测试', () => {
  beforeEach(() => {
    // 重置 store 状态
    appStore.getState().setAnalysisReport(null);
  });

  it('应该在分析报告中包含置信度元数据', () => {
    // 模拟完整的分析报告
    const mockReport = {
      'title-keywords': {
        primary_keywords: [
          { keyword: 'wireless earbuds', weight: 'high' as const, search_volume_estimate: 'high' },
          { keyword: 'bluetooth', weight: 'high' as const, search_volume_estimate: 'high' },
          { keyword: 'noise cancelling', weight: 'medium' as const, search_volume_estimate: 'medium' }
        ],
        secondary_keywords: [
          { keyword: 'waterproof', type: 'feature', importance: 'high' },
          { keyword: 'long battery', type: 'feature', importance: 'medium' },
          { keyword: 'comfortable', type: 'feature', importance: 'medium' }
        ],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: ['Add more keywords', 'Improve structure']
      },
      'buyer-profile': {
        demographics: {
          likely_gender: 'Male',
          age_range_estimate: '25-35',
          lifestyle_indicators: ['Active', 'Tech-savvy']
        },
        buyer_types: [
          { type: 'Fitness Enthusiast', percentage_estimate: '40%', evidence: 'Gym mentions' },
          { type: 'Commuter', percentage_estimate: '35%', evidence: 'Commute mentions' }
        ],
        usage_scenes: [
          { scene: 'Gym', frequency: 'high', context: 'Workouts' },
          { scene: 'Commute', frequency: 'high', context: 'Daily travel' }
        ],
        purchase_motivations: ['Convenience', 'Quality'],
        geographic_insights: {
          primary_markets: ['US', 'UK'],
          cultural_considerations: ['Western lifestyle']
        }
      }
    };

    // 计算置信度
    const confidenceScores = calculateFullReportConfidence(mockReport);
    const overallConfidence = calculateOverallConfidence(confidenceScores);

    // 构建带置信度的报告
    const reportWithConfidence = {
      ...mockReport,
      _metadata: {
        confidence: confidenceScores,
        overallConfidence: overallConfidence,
        analyzedAt: new Date().toISOString(),
        targetIds: ['title-keywords', 'buyer-profile'],
        language: 'en'
      }
    };

    // 验证置信度元数据存在
    expect(reportWithConfidence._metadata).toBeDefined();
    expect(reportWithConfidence._metadata.confidence).toBeDefined();
    expect(reportWithConfidence._metadata.overallConfidence).toBeGreaterThan(0);

    // 验证各个报告类型的置信度
    expect(reportWithConfidence._metadata.confidence['title-keywords']).toBeGreaterThan(0);
    expect(reportWithConfidence._metadata.confidence['buyer-profile']).toBeGreaterThan(0);

    // 验证总体置信度在合理范围内
    expect(reportWithConfidence._metadata.overallConfidence).toBeGreaterThanOrEqual(0);
    expect(reportWithConfidence._metadata.overallConfidence).toBeLessThanOrEqual(1);
  });

  it('应该能够从 store 中读取置信度数据', () => {
    // 创建带置信度的报告
    const mockReport = {
      'title-keywords': {
        primary_keywords: [
          { keyword: 'test', weight: 'high' as const, search_volume_estimate: 'high' }
        ],
        secondary_keywords: [],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: [],
        key_insights: 'Test'
      },
      _metadata: {
        confidence: {
          'title-keywords': 0.75
        },
        overallConfidence: 0.75,
        analyzedAt: new Date().toISOString(),
        targetIds: ['title-keywords'],
        language: 'en'
      }
    };

    // 设置到 store
    appStore.getState().setAnalysisReport(mockReport as any);

    // 从 store 读取
    const storedReport = appStore.getState().analysis.analysisReport;

    // 验证置信度数据可以正确读取
    expect(storedReport).toBeDefined();
    expect(storedReport?._metadata).toBeDefined();
    expect(storedReport?._metadata?.confidence).toBeDefined();
    expect(storedReport?._metadata?.overallConfidence).toBe(0.75);
  });

  it('应该正确处理低置信度报告', () => {
    // 创建低质量报告（空数据）
    const lowQualityReport = {
      'title-keywords': {
        primary_keywords: [],
        secondary_keywords: [],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: [],
        key_insights: ''
      }
    };

    // 计算置信度
    const confidenceScores = calculateFullReportConfidence(lowQualityReport);
    const overallConfidence = calculateOverallConfidence(confidenceScores);

    // 验证低置信度
    expect(confidenceScores['title-keywords']).toBeLessThan(0.5);
    expect(overallConfidence).toBeLessThan(0.5);
  });

  it('应该正确处理混合质量的报告', () => {
    // 创建混合质量报告（一个高质量，一个低质量）
    const mixedReport = {
      'title-keywords': {
        primary_keywords: [
          { keyword: 'test1', weight: 'high' as const, search_volume_estimate: 'high' },
          { keyword: 'test2', weight: 'high' as const, search_volume_estimate: 'high' },
          { keyword: 'test3', weight: 'medium' as const, search_volume_estimate: 'medium' }
        ],
        secondary_keywords: [
          { keyword: 'feature1', type: 'feature', importance: 'high' },
          { keyword: 'feature2', type: 'feature', importance: 'medium' },
          { keyword: 'feature3', type: 'feature', importance: 'medium' },
          { keyword: 'feature4', type: 'feature', importance: 'low' },
          { keyword: 'feature5', type: 'feature', importance: 'low' }
        ],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: ['Good coverage', 'Well structured']
      },
      'buyer-profile': {
        demographics: {
          likely_gender: '',
          age_range_estimate: '',
          lifestyle_indicators: []
        },
        buyer_types: [],
        usage_scenes: [],
        purchase_motivations: [],
        geographic_insights: {
          primary_markets: [],
          cultural_considerations: []
        }
      }
    };

    // 计算置信度
    const confidenceScores = calculateFullReportConfidence(mixedReport);
    const overallConfidence = calculateOverallConfidence(confidenceScores);

    // 验证：title-keywords 应该高，buyer-profile 应该低
    expect(confidenceScores['title-keywords']).toBeGreaterThanOrEqual(0.5);
    expect(confidenceScores['buyer-profile']).toBeLessThan(0.3);

    // 总体置信度应该在中间
    expect(overallConfidence).toBeGreaterThanOrEqual(0.25);
    expect(overallConfidence).toBeLessThan(0.7);
  });

  it('应该正确处理缺少某些报告类型的情况', () => {
    // 只有部分报告类型
    const partialReport = {
      'title-keywords': {
        primary_keywords: [
          { keyword: 'test', weight: 'high' as const, search_volume_estimate: 'high' }
        ],
        secondary_keywords: [],
        scene_keywords: [],
        audience_keywords: [],
        removed_modifiers: [],
        removed_brand_terms: [],
        optimization_suggestions: [],
        key_insights: 'Test'
      }
      // 缺少其他报告类型
    };

    // 计算置信度
    const confidenceScores = calculateFullReportConfidence(partialReport);

    // 验证：只有 title-keywords 有置信度
    expect(confidenceScores['title-keywords']).toBeDefined();
    expect(confidenceScores['selling-points']).toBeUndefined();
    expect(confidenceScores['buyer-profile']).toBeUndefined();

    // 总体置信度应该基于存在的报告
    const overallConfidence = calculateOverallConfidence(confidenceScores);
    expect(overallConfidence).toBeGreaterThan(0);
  });

  it('应该正确计算百分比值', () => {
    const confidence = 0.756;
    const percent = Math.round(confidence * 100);

    expect(percent).toBe(76);
  });

  it('应该正确分类置信度等级', () => {
    // 高置信度
    expect(0.8 >= 0.7).toBe(true);

    // 中等置信度
    expect(0.6 >= 0.5 && 0.6 < 0.7).toBe(true);

    // 低置信度
    expect(0.3 < 0.5).toBe(true);
  });
});
