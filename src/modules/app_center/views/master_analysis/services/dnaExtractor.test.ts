/**
 * DNA 提取器测试
 * 测试多品类产品的 DNA 提取功能
 */

import { describe, it, expect, vi } from 'vitest';
import {
  extractProductDNA as extractStrictProductDNA,
  canExtractDNA as canExtractStrictDNA
} from './dnaExtractor';
import type { FullAnalysisReport as StrictFullAnalysisReport } from '../ai_analysis/config/analysisReportData';

type FullAnalysisReport = Record<string, unknown>;

// These tests intentionally cover legacy/partial AI outputs, so fixtures stay loose
// while production functions still receive the strict runtime contract.
const extractProductDNA = (report: FullAnalysisReport | null | undefined) =>
  extractStrictProductDNA(report as unknown as StrictFullAnalysisReport | null | undefined);

const canExtractDNA = (report: FullAnalysisReport | null | undefined) =>
  canExtractStrictDNA(report as unknown as StrictFullAnalysisReport | null | undefined);

// Mock Logger
vi.mock('../../../../../services/loggerService', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
  }
}));

describe('DNA Extractor - Multi-Category Products', () => {
  describe('Wig Products (假发产品)', () => {
    it('should extract DNA from wig product with hair_density, curl_pattern, lace_type, length', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者', '美容爱好者', '社交活跃']
          },
          buyer_types: [
            { type: '日常佩戴者', percentage: 60 },
            { type: '特殊场合用户', percentage: 40 }
          ],
          purchase_motivations: ['提升自信', '改变造型']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '150% 高密度发量',
              '13x4 瑞士蕾丝',
              '100% 真人发',
              '预拔发际线',
              '可染可烫'
            ]
          },
          overall_strategy: {
            primary_differentiation: '医疗级透气蕾丝，佩戴8小时不闷热'
          },
          bullet_analysis: [
            {
              functions: ['150% density', '20 inch length', '13x4 lace frontal'],
              credibility_score: 'high'
            },
            {
              functions: ['Body wave texture', 'Pre-plucked hairline'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '150% density', type: 'hair_density' },
            { keyword: 'body wave', type: 'curl_pattern' },
            { keyword: '13x4 lace', type: 'lace_type' },
            { keyword: '20 inch', type: 'length' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.audience).toContain('25-45岁');
      expect(result!.audience).toContain('女性');
      expect(result!.usps).toContain('150% 高密度发量');
      expect(result!.usps).toContain('13x4 瑞士蕾丝');

      // 验证使用原始 type 值，不是硬编码的中文
      expect(result!.specs).toContain('hair_density: 150% density');
      expect(result!.specs).toContain('curl_pattern: body wave');
      expect(result!.specs).toContain('lace_type: 13x4 lace');
      expect(result!.specs).toContain('length: 20 inch');

      // 验证不应出现硬编码的中文标签
      expect(result!.specs).not.toContain('发量密度');
      expect(result!.specs).not.toContain('卷发类型');
      expect(result!.specs).not.toContain('蕾丝类型');
      expect(result!.specs).not.toContain('长度');

      // 验证置信度
      expect(result!.confidence.audience).toBeGreaterThan(0.5);
      expect(result!.confidence.usps).toBeGreaterThan(0.5);
      expect(result!.confidence.specs).toBeGreaterThan(0.5);
    });
  });

  describe('Electronics Products (电子产品)', () => {
    it('should extract DNA from electronics with battery, screen_size, processor, storage', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '18-35岁',
            likely_gender: 'male',
            lifestyle_indicators: ['科技爱好者', '游戏玩家', '效率追求者']
          },
          buyer_types: [
            { type: '重度用户', percentage: 70 },
            { type: '专业人士', percentage: 30 }
          ],
          purchase_motivations: ['性能需求', '品质保证']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '5000mAh 超大电池',
              '120Hz 高刷屏幕',
              '骁龙8 Gen2 处理器',
              '12GB+256GB 存储',
              '65W 快充'
            ]
          },
          overall_strategy: {
            primary_differentiation: '旗舰级性能，游戏流畅不卡顿'
          },
          bullet_analysis: [
            {
              functions: ['5000mAh battery', '6.7 inch AMOLED', '120Hz refresh rate'],
              credibility_score: 'high'
            },
            {
              functions: ['Snapdragon 8 Gen2', '12GB RAM', '256GB storage'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '5000mAh', type: 'battery' },
            { keyword: '6.7 inch', type: 'screen_size' },
            { keyword: 'Snapdragon 8 Gen2', type: 'processor' },
            { keyword: '12GB+256GB', type: 'storage' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.audience).toContain('18-35岁');
      expect(result!.audience).toContain('男性');

      // 验证使用原始 type 值
      expect(result!.specs).toContain('battery: 5000mAh');
      expect(result!.specs).toContain('screen_size: 6.7 inch');
      expect(result!.specs).toContain('processor: Snapdragon 8 Gen2');
      expect(result!.specs).toContain('storage: 12GB+256GB');

      // 验证不应出现硬编码的中文标签
      expect(result!.specs).not.toContain('电池');
      expect(result!.specs).not.toContain('屏幕尺寸');
      expect(result!.specs).not.toContain('处理器');
      expect(result!.specs).not.toContain('存储');
    });
  });

  describe('Cosmetics Products (化妆品)', () => {
    it('should extract DNA from cosmetics with scent, texture, finish, SPF', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '20-40岁',
            likely_gender: 'female',
            lifestyle_indicators: ['护肤达人', '品质生活', '健康意识']
          },
          buyer_types: [
            { type: '日常护理用户', percentage: 80 },
            { type: '敏感肌用户', percentage: 20 }
          ],
          purchase_motivations: ['温和配方', '有效保湿']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '玫瑰花香',
              '轻盈质地',
              '哑光妆效',
              'SPF 50+ 防晒',
              '24小时持妆'
            ]
          },
          overall_strategy: {
            primary_differentiation: '医研级配方，敏感肌可用'
          },
          bullet_analysis: [
            {
              functions: ['Rose scent', 'Lightweight texture', 'Matte finish'],
              credibility_score: 'high'
            },
            {
              functions: ['SPF 50+ PA++++', '24-hour wear', 'Hypoallergenic'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: 'rose', type: 'scent' },
            { keyword: 'lightweight', type: 'texture' },
            { keyword: 'matte', type: 'finish' },
            { keyword: 'SPF 50+', type: 'SPF' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();

      // 验证使用原始 type 值
      expect(result!.specs).toContain('scent: rose');
      expect(result!.specs).toContain('texture: lightweight');
      expect(result!.specs).toContain('finish: matte');
      expect(result!.specs).toContain('SPF: SPF 50+');

      // 验证不应出现硬编码的中文标签
      expect(result!.specs).not.toContain('香调');
      expect(result!.specs).not.toContain('质地');
      expect(result!.specs).not.toContain('妆效');
      expect(result!.specs).not.toContain('防晒指数');
    });
  });

  describe('Clothing Products (服装)', () => {
    it('should extract DNA from clothing with size, material, color, style', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['职场女性', '时尚品味', '品质追求']
          },
          buyer_types: [
            { type: '职业装需求', percentage: 60 },
            { type: '休闲装需求', percentage: 40 }
          ],
          purchase_motivations: ['舒适面料', '百搭款式']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              'S-XXL 多码可选',
              '100% 纯棉面料',
              '经典黑白配色',
              '修身版型',
              '四季可穿'
            ]
          },
          overall_strategy: {
            primary_differentiation: '职场通勤，优雅大方'
          },
          bullet_analysis: [
            {
              functions: ['Size S-XXL', '100% cotton', 'Black/White'],
              credibility_score: 'high'
            },
            {
              functions: ['Slim fit', 'Business casual style'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: 'S-XXL', type: 'size' },
            { keyword: '100% cotton', type: 'material' },
            { keyword: 'black/white', type: 'color' },
            { keyword: 'slim fit', type: 'style' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();

      // 验证使用原始 type 值
      expect(result!.specs).toContain('size: S-XXL');
      expect(result!.specs).toContain('material: 100% cotton');
      expect(result!.specs).toContain('color: black/white');
      expect(result!.specs).toContain('style: slim fit');

      // 验证不应出现硬编码的中文标签
      expect(result!.specs).not.toContain('尺码');
      expect(result!.specs).not.toContain('材质');
      expect(result!.specs).not.toContain('颜色');
      expect(result!.specs).not.toContain('风格');
    });
  });

  describe('Edge Cases (边界情况)', () => {
    it('should handle empty secondary_keywords array', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者']
          },
          buyer_types: [{ type: '日常用户', percentage: 100 }],
          purchase_motivations: ['品质需求']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['高品质产品', '性价比高']
          },
          overall_strategy: {
            primary_differentiation: '品质保证'
          },
          bullet_analysis: [
            {
              functions: ['Premium quality', 'Great value'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [] // 空数组
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.audience).toBeTruthy();
      expect(result!.usps).toBeTruthy();
      // specs 可能为空或只包含从 bullet_analysis 提取的技术规格
    });

    it('should handle missing type field in secondary_keywords', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者']
          },
          buyer_types: [{ type: '日常用户', percentage: 100 }],
          purchase_motivations: ['品质需求']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['高品质产品']
          },
          overall_strategy: {
            primary_differentiation: '品质保证'
          },
          bullet_analysis: []
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '150% density', type: null as any }, // type 为 null
            { keyword: 'body wave' } as any // type 缺失
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      // 应该将 type 为 null 或缺失的归类为 'other'
      expect(result!.specs).toContain('other:');
    });

    it('should handle bullet_analysis without technical specs', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者']
          },
          buyer_types: [{ type: '日常用户', percentage: 100 }],
          purchase_motivations: ['品质需求']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['高品质产品', '性价比高']
          },
          overall_strategy: {
            primary_differentiation: '品质保证'
          },
          bullet_analysis: [
            {
              functions: ['Beautiful design', 'Easy to use'], // 无技术规格
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: 'premium', type: 'quality' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.specs).toContain('quality: premium');
      // bullet_analysis 中的非技术规格不应被提取到 specs
      expect(result!.specs).not.toContain('Beautiful design');
      expect(result!.specs).not.toContain('Easy to use');
    });

    it('should handle incomplete report with missing fields', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: null as any,
            lifestyle_indicators: []
          },
          buyer_types: [],
          purchase_motivations: []
        },
        'selling-points': {
          function_scene_matrix: {
            functions: []
          },
          overall_strategy: {
            primary_differentiation: ''
          },
          bullet_analysis: []
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: 'premium', type: 'quality' }
          ]
        }
      };

      const result = extractProductDNA(report);

      // 即使数据不完整，也应该尝试提取
      expect(result).not.toBeNull();
      expect(result!.confidence.audience).toBeLessThan(0.5);
      // specs 置信度较低（只有一个 keyword）
      expect(result!.confidence.specs).toBeGreaterThan(0);
      expect(result!.confidence.specs).toBeLessThan(0.8);
      // 验证提取的内容
      expect(result!.audience).toContain('25-45岁');
      expect(result!.specs).toContain('quality: premium');
    });

    it('should return null for null report', () => {
      const result = extractProductDNA(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined report', () => {
      const result = extractProductDNA(undefined);
      expect(result).toBeNull();
    });

    it('should return null when confidence is too low', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: null as any,
            likely_gender: null as any,
            lifestyle_indicators: []
          },
          buyer_types: [],
          purchase_motivations: []
        }
        // 不提供 selling-points 和 title-keywords
      };

      const result = extractProductDNA(report);

      // 当总体置信度低于 0.2 时应返回 null
      // audience: 0 (无有效数据), usps: 0 (无 selling-points), specs: 0 (无数据)
      // 平均置信度 = 0，应返回 null
      expect(result).toBeNull();
    });
  });

  describe('Confidence Calculation (置信度计算)', () => {
    it('should calculate high confidence for complete data', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者', '美容爱好者', '社交活跃']
          },
          buyer_types: [
            { type: '日常佩戴者', percentage: 60 },
            { type: '特殊场合用户', percentage: 40 }
          ],
          purchase_motivations: ['提升自信', '改变造型']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['功能1', '功能2', '功能3', '功能4', '功能5']
          },
          overall_strategy: {
            primary_differentiation: '核心差异化'
          },
          bullet_analysis: [
            {
              functions: ['150% density', '20 inch length'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '150% density', type: 'hair_density' },
            { keyword: 'body wave', type: 'curl_pattern' },
            { keyword: '13x4 lace', type: 'lace_type' },
            { keyword: '20 inch', type: 'length' },
            { keyword: 'black', type: 'color' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.confidence.audience).toBeGreaterThanOrEqual(0.8);
      expect(result!.confidence.usps).toBeGreaterThanOrEqual(0.7);
      expect(result!.confidence.specs).toBeGreaterThanOrEqual(0.7);
    });

    it('should calculate medium confidence for partial data', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: null as any,
            lifestyle_indicators: []
          },
          buyer_types: [{ type: '日常用户', percentage: 100 }],
          purchase_motivations: []
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['功能1', '功能2']
          },
          overall_strategy: {
            primary_differentiation: ''
          },
          bullet_analysis: []
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '150% density', type: 'hair_density' },
            { keyword: 'body wave', type: 'curl_pattern' }
          ]
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.confidence.audience).toBeGreaterThan(0.2);
      expect(result!.confidence.audience).toBeLessThan(0.8);
      expect(result!.confidence.usps).toBeGreaterThan(0.2);
      expect(result!.confidence.usps).toBeLessThan(0.8);
    });
  });

  describe('canExtractDNA Function', () => {
    it('should return true when buyer-profile exists', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: []
          },
          buyer_types: [],
          purchase_motivations: []
        }
      };

      expect(canExtractDNA(report)).toBe(true);
    });

    it('should return true when selling-points exists', () => {
      const report: FullAnalysisReport = {
        'selling-points': {
          function_scene_matrix: {
            functions: ['功能1']
          },
          overall_strategy: {
            primary_differentiation: '差异化'
          },
          bullet_analysis: []
        }
      };

      expect(canExtractDNA(report)).toBe(true);
    });

    it('should return false for null report', () => {
      expect(canExtractDNA(null)).toBe(false);
    });

    it('should return false for undefined report', () => {
      expect(canExtractDNA(undefined)).toBe(false);
    });

    it('should return false when both buyer-profile and selling-points are missing', () => {
      const report: FullAnalysisReport = {
        'title-keywords': {
          secondary_keywords: []
        }
      };

      expect(canExtractDNA(report)).toBe(false);
    });
  });

  describe('Metadata', () => {
    it('should include metadata with extractedAt timestamp', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者']
          },
          buyer_types: [{ type: '日常用户', percentage: 100 }],
          purchase_motivations: ['品质需求']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['高品质产品']
          },
          overall_strategy: {
            primary_differentiation: '品质保证'
          },
          bullet_analysis: []
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.metadata).toBeDefined();
      expect(result!.metadata!.extractedAt).toBeDefined();
      expect(result!.metadata!.sourceFields).toContain('buyer-profile');
      expect(result!.metadata!.sourceFields).toContain('selling-points');
    });

    it('should list only available source fields in metadata', () => {
      const report: FullAnalysisReport = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚追求者']
          },
          buyer_types: [{ type: '日常用户', percentage: 100 }],
          purchase_motivations: ['品质需求']
        }
      };

      const result = extractProductDNA(report);

      expect(result).not.toBeNull();
      expect(result!.metadata!.sourceFields).toContain('buyer-profile');
      expect(result!.metadata!.sourceFields).not.toContain('selling-points');
      expect(result!.metadata!.sourceFields).not.toContain('title-keywords');
    });
  });
});
