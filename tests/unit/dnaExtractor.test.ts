// test/unit/dnaExtractor.test.ts
// ================================================================
// 🧪 DNA 提取器单元测试
// 测试从 AI 分析报告中提取产品 DNA 的逻辑
// ================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { extractProductDNA, canExtractDNA } from '../../src/modules/app_center/views/master_analysis/services/dnaExtractor';
import type { FullAnalysisReport } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';

  describe('canExtractDNA', () => {
    it('应该在报告为 null 时返回 false', () => {
      expect(canExtractDNA(null)).toBe(false);
    });

    it('应该在报告为 undefined 时返回 false', () => {
      expect(canExtractDNA(undefined)).toBe(false);
    });

    it('应该在有 buyer-profile 时返回 true', () => {
      const report = {
        'buyer-profile': {
          demographics: {},
          buyer_types: [],
          purchase_motivations: []
        }
      } as any;

      expect(canExtractDNA(report)).toBe(true);
    });

    it('应该在有 selling-points 时返回 true', () => {
      const report = {
        'selling-points': {
          function_scene_matrix: { functions: [] },
          bullet_analysis: []
        }
      } as any;

      expect(canExtractDNA(report)).toBe(true);
    });

    it('应该在既没有 buyer-profile 也没有 selling-points 时返回 false', () => {
      const report = {
        'title-keywords': {}
      } as any;

      expect(canExtractDNA(report)).toBe(false);
    });
  });

    it('应该在报告为 null 时返回 null', () => {
      expect(extractProductDNA(null)).toBeNull();
    });

    it('应该在报告为 undefined 时返回 null', () => {
      expect(extractProductDNA(undefined)).toBeNull();
    });

    it('应该从完整报告中提取产品 DNA', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁',
            likely_gender: 'male',
            lifestyle_indicators: ['科技爱好者', '健身达人', '音乐发烧友']
          },
          buyer_types: [
            { type: '早期采用者', confidence: 0.8 },
            { type: '品质追求者', confidence: 0.7 }
          ],
          purchase_motivations: ['提升生活品质', '追求科技体验']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '40小时超长续航',
              '主动降噪',
              'IPX7防水',
              '蓝牙5.3连接',
              '快速充电'
            ]
          },
          overall_strategy: {
            primary_differentiation: '行业领先的续航能力'
          },
          bullet_analysis: [
            {
              functions: ['40小时续航', '快充15分钟用3小时'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '40小时', type: 'size' },
            { keyword: 'IPX7', type: 'feature' },
            { keyword: '蓝牙5.3', type: 'feature' }
          ]
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.audience).toBeTruthy();
      expect(dna!.usps).toBeTruthy();
      expect(dna!.specs).toBeTruthy();
    });

    it('应该正确提取目标受众', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁',
            likely_gender: 'male',
            lifestyle_indicators: ['科技爱好者', '健身达人']
          },
          buyer_types: [
            { type: '早期采用者', confidence: 0.8 }
          ],
          purchase_motivations: ['提升生活品质']
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.audience).toContain('25-35岁');
      expect(dna!.audience).toContain('男性');
      expect(dna!.audience).toContain('科技爱好者');
      expect(dna!.confidence.audience).toBeGreaterThan(0);
    });

    it('应该正确提取核心卖点', () => {
      const mockReport: any = {
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '40小时超长续航',
              '主动降噪',
              'IPX7防水'
            ]
          },
          overall_strategy: {
            primary_differentiation: '行业领先的续航能力'
          }
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.usps).toContain('40小时超长续航');
      expect(dna!.usps).toContain('主动降噪');
      expect(dna!.usps).toContain('行业领先的续航能力');
      expect(dna!.usps).toMatch(/^-/m); // 应该包含列表标记
      expect(dna!.confidence.usps).toBeGreaterThan(0);
    });

    it('应该正确提取技术参数', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁'
          },
          buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
          purchase_motivations: []
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '40小时', type: 'size' },
            { keyword: 'IPX7', type: 'feature' },
            { keyword: '蓝牙5.3', type: 'feature' }
          ]
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.specs).toContain('40小时');
      expect(dna!.specs).toContain('IPX7');
      expect(dna!.specs).toContain('蓝牙5.3');
      expect(dna!.confidence.specs).toBeGreaterThan(0);
    });

    it('应该包含元数据信息', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁',
            likely_gender: 'male'
          },
          buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
          purchase_motivations: ['提升生活品质']
        },
        'selling-points': {
          function_scene_matrix: { functions: ['测试功能', '高级功能'] }
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.metadata).toBeDefined();
      expect(dna!.metadata!.extractedAt).toBeDefined();
      expect(dna!.metadata!.sourceFields).toContain('buyer-profile');
      expect(dna!.metadata!.sourceFields).toContain('selling-points');
    });

    it('应该在置信度过低时返回 null', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {},
          buyer_types: [],
          purchase_motivations: []
        }
      };

      const dna = extractProductDNA(mockReport);

      // 空数据应该导致低置信度，返回 null
      expect(dna).toBeNull();
    });

    it('应该处理部分数据缺失的情况', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁'
          },
          buyer_types: [],
          purchase_motivations: []
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['主动降噪']
          }
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.audience).toContain('25-35岁');
      expect(dna!.usps).toContain('主动降噪');
    });

    it('应该正确计算置信度', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁',
            likely_gender: 'male',
            lifestyle_indicators: ['科技爱好者']
          },
          buyer_types: [
            { type: '早期采用者', confidence: 0.8 }
          ],
          purchase_motivations: ['提升生活品质']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['40小时续航', '主动降噪']
          },
          overall_strategy: {
            primary_differentiation: '超长续航'
          }
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '40小时', type: 'size' },
            { keyword: 'IPX7', type: 'feature' }
          ]
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.confidence.audience).toBeGreaterThan(0);
      expect(dna!.confidence.audience).toBeLessThanOrEqual(1);
      expect(dna!.confidence.usps).toBeGreaterThan(0);
      expect(dna!.confidence.usps).toBeLessThanOrEqual(1);
      expect(dna!.confidence.specs).toBeGreaterThan(0);
      expect(dna!.confidence.specs).toBeLessThanOrEqual(1);
    });

    it('应该处理空的 function_scene_matrix', () => {
      const mockReport: any = {
        'selling-points': {
          function_scene_matrix: {
            functions: []
          },
          bullet_analysis: [
            {
              functions: ['备用功能'],
              credibility_score: 'high'
            }
          ]
        }
      };

      const dna = extractProductDNA(mockReport);

      // 应该从 bullet_analysis 中提取
      if (dna) {
        expect(dna.usps).toContain('备用功能');
      }
    });

    it('应该限制提取的数据量', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            lifestyle_indicators: Array(20).fill('特征')
          },
          buyer_types: Array(10).fill({ type: '类型', confidence: 0.5 }),
          purchase_motivations: Array(10).fill('动机')
        },
        'selling-points': {
          function_scene_matrix: {
            functions: Array(20).fill('功能')
          }
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();

      // 验证数据被限制在合理范围内
      const audienceParts = dna!.audience.split(',').length;
      expect(audienceParts).toBeLessThan(10); // 应该限制数量

      const uspLines = dna!.usps.split('\n').filter(l => l.trim()).length;
      expect(uspLines).toBeLessThanOrEqual(6); // 最多6行（5个功能 + 1个差异化）
    });

    it('应该处理异常数据格式', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: null,
          buyer_types: undefined,
          purchase_motivations: 'invalid'
        }
      };

      // 不应该抛出错误
      expect(() => extractProductDNA(mockReport)).not.toThrow();

      const dna = extractProductDNA(mockReport);
      // 可能返回 null 或空数据
      if (dna) {
        expect(dna.audience).toBeDefined();
      }
    });

  describe('边界情况测试', () => {
    it('应该处理空对象', () => {
      const emptyReport: any = {};
      expect(extractProductDNA(emptyReport)).toBeNull();
    });

    it('应该处理只有一个字段的报告', () => {
      const report: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁'
          },
          buyer_types: [],
          purchase_motivations: []
        }
      };

      const dna = extractProductDNA(report);
      // 可能返回 null（置信度太低）或包含部分数据
      if (dna) {
        expect(dna.audience).toContain('25-35岁');
      }
    });

    it('应该处理超长文本', () => {
      const longText = 'A'.repeat(1000);
      const report: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: longText
          },
          buyer_types: [{ type: longText, confidence: 0.8 }],
          purchase_motivations: [longText]
        }
      };

      const dna = extractProductDNA(report);
      if (dna) {
        // 应该能处理，不会崩溃
        expect(dna.audience).toBeDefined();
      }
    });
  });

  describe('数据质量验证', () => {
    it('提取的受众应该是可读的文本', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁',
            likely_gender: 'male',
            lifestyle_indicators: ['科技爱好者']
          },
          buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
          purchase_motivations: ['提升生活品质']
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.audience).toMatch(/[\u4e00-\u9fa5]/); // 包含中文
      expect(dna!.audience.length).toBeGreaterThan(0);
      expect(dna!.audience.length).toBeLessThan(500);
    });

    it('提取的卖点应该是列表格式', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁'
          },
          buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
          purchase_motivations: []
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['功能1', '功能2', '功能3']
          }
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.usps).toMatch(/^-/m); // 包含列表标记
      expect(dna!.usps.split('\n').length).toBeGreaterThan(1); // 多行
    });

    it('提取的参数应该包含技术信息', () => {
      const mockReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-35岁'
          },
          buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
          purchase_motivations: []
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '40小时', type: 'size' },
            { keyword: 'IPX7', type: 'feature' }
          ]
        }
      };

      const dna = extractProductDNA(mockReport);

      expect(dna).not.toBeNull();
      expect(dna!.specs).toBeTruthy();
      // 应该包含数字或技术术语
      expect(dna!.specs).toMatch(/\d+|[A-Z]+\d+/);
    });
  });
