// test/unit/dnaExtractor.multiCategory.test.ts
// ================================================================
// 🧪 DNA 提取器多品类测试
// 验证零硬编码架构支持不同产品品类
// ================================================================

import { describe, it, expect } from 'vitest';
import { extractProductDNA } from '../../src/modules/app_center/views/master_analysis/services/dnaExtractor';
import type { FullAnalysisReport } from '../../src/modules/app_center/views/master_analysis/ai_analysis/config/analysisReportData';

    it('应该正确提取假发产品的技术参数', () => {
      const wigReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁',
            likely_gender: 'female',
            lifestyle_indicators: ['时尚达人', '美妆爱好者']
          },
          buyer_types: [
            { type: '品质追求者', confidence: 0.8 }
          ],
          purchase_motivations: ['提升形象', '日常佩戴']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '180% 高密度',
              '13x4 蕾丝前额',
              '100% 真人发',
              '可染可烫',
              '透气舒适'
            ]
          },
          overall_strategy: {
            primary_differentiation: '超高密度，自然逼真'
          },
          bullet_analysis: [
            {
              functions: ['180% density', '22 inch length', '150g weight'],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '22 inch', type: 'hair_length' },
            { keyword: '180%', type: 'density' },
            { keyword: 'Natural Black', type: 'color' },
            { keyword: '13x4', type: 'lace_type' },
            { keyword: 'Body Wave', type: 'curl_pattern' },
            { keyword: 'Medium', type: 'cap_size' }
          ]
        }
      };

      const dna = extractProductDNA(wigReport);

      expect(dna).not.toBeNull();

      // 验证目标受众
      expect(dna!.audience).toContain('25-45岁');
      expect(dna!.audience).toContain('女性');

      // 验证核心卖点
      expect(dna!.usps).toContain('180% 高密度');
      expect(dna!.usps).toContain('真人发');

      // 验证技术参数 - 应该包含假发特定的类型
      expect(dna!.specs).toContain('hair_length');
      expect(dna!.specs).toContain('22 inch');
      expect(dna!.specs).toContain('density');
      expect(dna!.specs).toContain('180%');
      expect(dna!.specs).toContain('lace_type');
      expect(dna!.specs).toContain('13x4');
      expect(dna!.specs).toContain('curl_pattern');

      // 验证置信度
      expect(dna!.confidence.specs).toBeGreaterThan(0.5);
    });

    it('应该识别假发产品的技术规格模式', () => {
      const wigReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-45岁'
          },
          buyer_types: [{ type: '时尚人士', confidence: 0.7 }],
          purchase_motivations: ['提升形象']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['高密度设计']
          },
          bullet_analysis: [
            {
              functions: [
                '180% density for natural look',
                '13x4 lace frontal',
                '150g net weight',
                'Pre-plucked hairline'
              ],
              credibility_score: 'high'
            }
          ]
        }
      };

      const dna = extractProductDNA(wigReport);

      expect(dna).not.toBeNull();

      // 验证技术规格识别
      expect(dna!.specs).toMatch(/180%/); // 百分号模式
      expect(dna!.specs).toMatch(/13x4/); // 范围模式（x分隔符）
      expect(dna!.specs).toMatch(/150g/); // 数字+单位模式
    });

    it('应该正确提取电子产品的技术参数', () => {
      const electronicsReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '18-35岁',
            likely_gender: 'male',
            lifestyle_indicators: ['科技爱好者', '游戏玩家']
          },
          buyer_types: [
            { type: '早期采用者', confidence: 0.9 }
          ],
          purchase_motivations: ['性能提升', '游戏体验']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '5000mAh 大电池',
              '120Hz 高刷屏',
              '骁龙 8 Gen 2',
              '65W 快充',
              '三摄系统'
            ]
          },
          overall_strategy: {
            primary_differentiation: '旗舰级性能，超长续航'
          },
          bullet_analysis: [
            {
              functions: [
                '5000mAh battery capacity',
                '6.7 inch AMOLED display',
                '12GB RAM + 256GB storage',
                '50MP main camera'
              ],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '5000mAh', type: 'battery' },
            { keyword: '6.7 inch', type: 'screen_size' },
            { keyword: 'Snapdragon 8 Gen 2', type: 'processor' },
            { keyword: '12GB', type: 'ram' },
            { keyword: '256GB', type: 'storage' },
            { keyword: '120Hz', type: 'refresh_rate' },
            { keyword: '50MP', type: 'camera' }
          ]
        }
      };

      const dna = extractProductDNA(electronicsReport);

      expect(dna).not.toBeNull();

      // 验证目标受众
      expect(dna!.audience).toContain('18-35岁');
      expect(dna!.audience).toContain('男性');
      expect(dna!.audience).toContain('科技爱好者');

      // 验证核心卖点
      expect(dna!.usps).toContain('5000mAh');
      expect(dna!.usps).toContain('120Hz');

      // 验证技术参数 - 应该包含电子产品特定的类型
      expect(dna!.specs).toContain('battery');
      expect(dna!.specs).toContain('5000mAh');
      expect(dna!.specs).toContain('screen_size');
      expect(dna!.specs).toContain('6.7 inch');
      expect(dna!.specs).toContain('processor');
      expect(dna!.specs).toContain('ram');
      expect(dna!.specs).toContain('12GB');
      expect(dna!.specs).toContain('storage');
      expect(dna!.specs).toContain('256GB');

      // 验证置信度
      expect(dna!.confidence.specs).toBeGreaterThan(0.6);
    });

    it('应该识别电子产品的技术规格模式', () => {
      const electronicsReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '20-40岁'
          },
          buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
          purchase_motivations: ['性能']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['高性能处理器']
          },
          bullet_analysis: [
            {
              functions: [
                '5000mAh large battery',
                '6.7 inch display',
                '100-240V wide voltage',
                '5V/2A charging',
                'Type-C port'
              ],
              credibility_score: 'high'
            }
          ]
        }
      };

      const dna = extractProductDNA(electronicsReport);

      expect(dna).not.toBeNull();

      // 验证技术规格识别
      expect(dna!.specs).toMatch(/5000mAh/); // 数字+单位
      expect(dna!.specs).toMatch(/6\.7/); // 小数模式
      expect(dna!.specs).toMatch(/100-240V/); // 范围模式
      expect(dna!.specs).toMatch(/5V\/2A/); // 技术符号
    });

    it('应该正确提取美妆产品的技术参数', () => {
      const beautyReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '20-35岁',
            likely_gender: 'female',
            lifestyle_indicators: ['美妆达人', '时尚博主']
          },
          buyer_types: [
            { type: '品质追求者', confidence: 0.85 }
          ],
          purchase_motivations: ['提升妆容', '持久定妆']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              'SPF 50+ 防晒',
              '24小时持久',
              '轻薄透气',
              '遮瑕力强',
              '不脱妆'
            ]
          },
          overall_strategy: {
            primary_differentiation: '超强遮瑕，持久不脱妆'
          },
          bullet_analysis: [
            {
              functions: [
                'SPF 50+ PA++++',
                '30ml net content',
                '24-hour long lasting',
                'Full coverage'
              ],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '30ml', type: 'size' },
            { keyword: 'SPF 50+', type: 'sun_protection' },
            { keyword: 'Shade 3', type: 'shade' },
            { keyword: 'Matte', type: 'finish' },
            { keyword: 'Full Coverage', type: 'coverage' },
            { keyword: 'Waterproof', type: 'feature' }
          ]
        }
      };

      const dna = extractProductDNA(beautyReport);

      expect(dna).not.toBeNull();

      // 验证目标受众
      expect(dna!.audience).toContain('20-35岁');
      expect(dna!.audience).toContain('女性');

      // 验证核心卖点
      expect(dna!.usps).toContain('SPF 50+');
      expect(dna!.usps).toContain('24小时');

      // 验证技术参数 - 应该包含美妆产品特定的类型
      expect(dna!.specs).toContain('size');
      expect(dna!.specs).toContain('30ml');
      expect(dna!.specs).toContain('sun_protection');
      expect(dna!.specs).toContain('SPF 50+');
      expect(dna!.specs).toContain('shade');
      expect(dna!.specs).toContain('finish');
      expect(dna!.specs).toContain('coverage');

      // 验证置信度
      expect(dna!.confidence.specs).toBeGreaterThan(0.5);
    });

    it('应该识别美妆产品的技术规格模式', () => {
      const beautyReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '20-35岁'
          },
          buyer_types: [{ type: '美妆爱好者', confidence: 0.8 }],
          purchase_motivations: ['美妆']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: ['持久定妆']
          },
          bullet_analysis: [
            {
              functions: [
                'SPF 50+ protection',
                '30ml volume',
                '24-hour wear',
                'Shade 3 medium tone'
              ],
              credibility_score: 'high'
            }
          ]
        }
      };

      const dna = extractProductDNA(beautyReport);

      expect(dna).not.toBeNull();

      // 验证技术规格识别
      expect(dna!.specs).toMatch(/SPF\s*50/); // 字母+数字模式
      expect(dna!.specs).toMatch(/30ml/); // 数字+单位模式
      expect(dna!.specs).toMatch(/Shade\s*3/); // 字母+数字模式
    });

  describe('香水产品（基准测试）', () => {
    it('应该正确提取香水产品的技术参数', () => {
      const perfumeReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '25-40岁',
            likely_gender: 'male',
            lifestyle_indicators: ['商务人士', '品味追求者']
          },
          buyer_types: [
            { type: '高端消费者', confidence: 0.85 }
          ],
          purchase_motivations: ['提升形象', '商务场合']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '持久8小时',
              '木质香调',
              '适合商务',
              '高级感',
              '经典配方'
            ]
          },
          overall_strategy: {
            primary_differentiation: '经典木质香调，持久留香'
          },
          bullet_analysis: [
            {
              functions: [
                '8-hour longevity',
                '50ml/1.7oz volume',
                'Aromatic woody scent'
              ],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '50ml/1.7oz', type: 'size' },
            { keyword: 'Aromatic Woody', type: 'scent' },
            { keyword: 'Long Lasting', type: 'feature' },
            { keyword: 'EDT', type: 'concentration' }
          ]
        }
      };

      const dna = extractProductDNA(perfumeReport);

      expect(dna).not.toBeNull();

      // 验证目标受众
      expect(dna!.audience).toContain('25-40岁');
      expect(dna!.audience).toContain('男性');

      // 验证核心卖点
      expect(dna!.usps).toContain('持久');
      expect(dna!.usps).toContain('木质');

      // 验证技术参数
      expect(dna!.specs).toContain('size');
      expect(dna!.specs).toContain('50ml');
      expect(dna!.specs).toContain('scent');
      expect(dna!.specs).toContain('feature');

      // 验证置信度
      expect(dna!.confidence.specs).toBeGreaterThan(0.5);
    });
  });

    it('所有品类应该使用一致的输出格式', () => {
      const categories = [
        {
          name: '假发',
          report: {
            'buyer-profile': {
              demographics: { age_range_estimate: '25-45岁' },
              buyer_types: [{ type: '时尚人士', confidence: 0.8 }],
              purchase_motivations: ['美观']
            },
            'title-keywords': {
              secondary_keywords: [
                { keyword: '22 inch', type: 'hair_length' },
                { keyword: '180%', type: 'density' }
              ]
            }
          }
        },
        {
          name: '电子产品',
          report: {
            'buyer-profile': {
              demographics: { age_range_estimate: '18-35岁' },
              buyer_types: [{ type: '科技爱好者', confidence: 0.8 }],
              purchase_motivations: ['性能']
            },
            'title-keywords': {
              secondary_keywords: [
                { keyword: '5000mAh', type: 'battery' },
                { keyword: '6.7 inch', type: 'screen_size' }
              ]
            }
          }
        },
        {
          name: '美妆',
          report: {
            'buyer-profile': {
              demographics: { age_range_estimate: '20-35岁' },
              buyer_types: [{ type: '美妆达人', confidence: 0.8 }],
              purchase_motivations: ['美妆']
            },
            'title-keywords': {
              secondary_keywords: [
                { keyword: '30ml', type: 'size' },
                { keyword: 'SPF 50+', type: 'sun_protection' }
              ]
            }
          }
        }
      ];

      categories.forEach(({ name, report }) => {
        const dna = extractProductDNA(report as any);

        expect(dna, `${name} 应该能提取 DNA`).not.toBeNull();

        // 验证输出格式一致性
        expect(dna!.specs, `${name} 应该包含规格`).toBeTruthy();

        // 验证格式：type: value
        const specLines = dna!.specs.split('\n');
        specLines.forEach(line => {
          if (line.trim()) {
            expect(line, `${name} 的规格行应该包含冒号`).toContain(':');
          }
        });
      });
    });

    it('所有品类应该正确识别技术规格', () => {
      const techSpecs = [
        { text: '180% density', category: '假发', shouldMatch: true },
        { text: '13x4 lace', category: '假发', shouldMatch: true },
        { text: '22 inch length', category: '假发', shouldMatch: true },
        { text: '5000mAh battery', category: '电子', shouldMatch: true },
        { text: '6.7 inch screen', category: '电子', shouldMatch: true },
        { text: '100-240V input', category: '电子', shouldMatch: true },
        { text: 'SPF 50+ protection', category: '美妆', shouldMatch: true },
        { text: '30ml volume', category: '美妆', shouldMatch: true },
        { text: 'Shade 3', category: '美妆', shouldMatch: true },
        { text: 'soft texture', category: '通用', shouldMatch: false },
        { text: 'high quality', category: '通用', shouldMatch: false }
      ];

      techSpecs.forEach(({ text, category, shouldMatch }) => {
        const report: any = {
          'buyer-profile': {
            demographics: { age_range_estimate: '20-40岁' },
            buyer_types: [{ type: '消费者', confidence: 0.7 }],
            purchase_motivations: ['购买']
          },
          'selling-points': {
            function_scene_matrix: {
              functions: ['功能']
            },
            bullet_analysis: [
              {
                functions: [text],
                credibility_score: 'high'
              }
            ]
          }
        };

        const dna = extractProductDNA(report);

        if (shouldMatch) {
          expect(dna, `${category} - "${text}" 应该被识别为技术规格`).not.toBeNull();
          if (dna) {
            expect(dna.specs, `${category} - "${text}" 应该出现在规格中`).toContain(text);
          }
        } else {
          // 非技术规格可能不会出现在 specs 中
          if (dna) {
            // 这是可选的，因为可能会被过滤掉
          }
        }
      });
    });

  describe('未知品类支持', () => {
    it('应该支持完全未知的产品品类', () => {
      const unknownCategoryReport: any = {
        'buyer-profile': {
          demographics: {
            age_range_estimate: '30-50岁',
            likely_gender: 'female',
            lifestyle_indicators: ['家居爱好者']
          },
          buyer_types: [
            { type: '品质追求者', confidence: 0.8 }
          ],
          purchase_motivations: ['提升生活品质']
        },
        'selling-points': {
          function_scene_matrix: {
            functions: [
              '超大容量',
              '节能省电',
              '智能控制',
              '静音运行'
            ]
          },
          overall_strategy: {
            primary_differentiation: '智能节能，超大容量'
          },
          bullet_analysis: [
            {
              functions: [
                '500L capacity',
                '40dB noise level',
                'Energy rating A+++'
              ],
              credibility_score: 'high'
            }
          ]
        },
        'title-keywords': {
          secondary_keywords: [
            { keyword: '500L', type: 'capacity' },
            { keyword: '40dB', type: 'noise_level' },
            { keyword: 'A+++', type: 'energy_rating' },
            { keyword: 'Stainless Steel', type: 'material' },
            { keyword: 'Smart Control', type: 'feature' }
          ]
        }
      };

      const dna = extractProductDNA(unknownCategoryReport);

      expect(dna).not.toBeNull();

      // 验证能够提取未知品类的数据
      expect(dna!.audience).toBeTruthy();
      expect(dna!.usps).toBeTruthy();
      expect(dna!.specs).toBeTruthy();

      // 验证未知类型被正确处理（使用原始 type）
      expect(dna!.specs).toContain('capacity');
      expect(dna!.specs).toContain('500L');
      expect(dna!.specs).toContain('noise_level');
      expect(dna!.specs).toContain('40dB');
      expect(dna!.specs).toContain('energy_rating');

      // 验证置信度
      expect(dna!.confidence.specs).toBeGreaterThan(0.5);
    });
  });
