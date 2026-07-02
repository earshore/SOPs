/**
 * DNA 提取器测试
 * 测试多品类产品的 DNA 提取功能
 */

import { describe, it, expect, vi } from 'vitest';
import {
  extractProductDNA as extractStrictProductDNA,
  canExtractDNA as canExtractStrictDNA,
} from './dnaExtractor';
import type { FullAnalysisReport as StrictFullAnalysisReport } from '../ai_analysis/config/analysisReportData';

type FullAnalysisReport = Record<string, unknown>;
type ObjectFixture = Record<string, unknown>;
type ObjectFixtureList = ObjectFixture[];

// These tests intentionally cover legacy/partial AI outputs, so fixtures stay loose
// while production functions still receive the strict runtime contract.
const extractProductDNA = (report: FullAnalysisReport | null | undefined) =>
  extractStrictProductDNA(report as unknown as StrictFullAnalysisReport | null | undefined);

const canExtractDNA = (report: FullAnalysisReport | null | undefined) =>
  canExtractStrictDNA(report as unknown as StrictFullAnalysisReport | null | undefined);

function expectExtractedDNA<T>(value: T | null): T {
  expect(value).not.toBeNull();
  if (value === null) {
    throw new Error('Expected extracted DNA');
  }
  return value;
}

function expectDefined<T>(value: T | undefined, label: string): T {
  expect(value).toBeDefined();
  if (value === undefined) {
    throw new Error(`Expected ${label}`);
  }
  return value;
}

// Mock Logger
vi.mock('../../../../../services/loggerService', () => ({
  Logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

type BuyerProfileOptions = {
  ageRange?: string | null;
  gender?: string | null;
  lifestyleIndicators?: string[];
  buyerTypes?: ObjectFixtureList;
  motivations?: string[];
};

type SellingPointsOptions = {
  functions?: string[];
  differentiation?: string;
  bulletAnalysis?: ObjectFixtureList;
};

const createBuyerProfile = ({
  ageRange = '25-45岁',
  gender = 'female',
  lifestyleIndicators = ['时尚追求者'],
  buyerTypes = [{ type: '日常用户', percentage: 100 }],
  motivations = ['品质需求'],
}: BuyerProfileOptions = {}): ObjectFixture => ({
  demographics: {
    age_range_estimate: ageRange,
    likely_gender: gender,
    lifestyle_indicators: lifestyleIndicators,
  },
  buyer_types: buyerTypes,
  purchase_motivations: motivations,
});

const createSellingPoints = ({
  functions = ['高品质产品'],
  differentiation = '品质保证',
  bulletAnalysis = [],
}: SellingPointsOptions = {}): ObjectFixture => ({
  function_scene_matrix: { functions },
  overall_strategy: { primary_differentiation: differentiation },
  bullet_analysis: bulletAnalysis,
});

const createTitleKeywords = (secondaryKeywords: ObjectFixtureList): ObjectFixture => ({
  secondary_keywords: secondaryKeywords,
});

const createReport = ({
  buyerProfile,
  sellingPoints,
  titleKeywords,
}: {
  buyerProfile?: ObjectFixture;
  sellingPoints?: ObjectFixture;
  titleKeywords?: ObjectFixture;
}): FullAnalysisReport => {
  const report: FullAnalysisReport = {};

  if (buyerProfile) report['buyer-profile'] = buyerProfile;
  if (sellingPoints) report['selling-points'] = sellingPoints;
  if (titleKeywords) report['title-keywords'] = titleKeywords;

  return report;
};

const createWigBuyerProfile = (): ObjectFixture =>
  createBuyerProfile({
    lifestyleIndicators: ['时尚追求者', '美容爱好者', '社交活跃'],
    buyerTypes: [
      { type: '日常佩戴者', percentage: 60 },
      { type: '特殊场合用户', percentage: 40 },
    ],
    motivations: ['提升自信', '改变造型'],
  });

describe('Wig Products (假发产品)', () => {
  it('should extract DNA from wig product with hair_density, curl_pattern, lace_type, length', () => {
    const report = createReport({
      buyerProfile: createWigBuyerProfile(),
      sellingPoints: createSellingPoints({
        functions: ['150% 高密度发量', '13x4 瑞士蕾丝', '100% 真人发', '预拔发际线', '可染可烫'],
        differentiation: '医疗级透气蕾丝，佩戴8小时不闷热',
        bulletAnalysis: [
          {
            functions: ['150% density', '20 inch length', '13x4 lace frontal'],
            credibility_score: 'high',
          },
          {
            functions: ['Body wave texture', 'Pre-plucked hairline'],
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([
        { keyword: '150% density', type: 'hair_density' },
        { keyword: 'body wave', type: 'curl_pattern' },
        { keyword: '13x4 lace', type: 'lace_type' },
        { keyword: '20 inch', type: 'length' },
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    expect(result.audience).toContain('25-45岁');
    expect(result.audience).toContain('女性');
    expect(result.usps).toContain('150% 高密度发量');
    expect(result.usps).toContain('13x4 瑞士蕾丝');

    // 验证使用原始 type 值，不是硬编码的中文
    expect(result.specs).toContain('hair_density: 150% density');
    expect(result.specs).toContain('curl_pattern: body wave');
    expect(result.specs).toContain('lace_type: 13x4 lace');
    expect(result.specs).toContain('length: 20 inch');

    // 验证不应出现硬编码的中文标签
    expect(result.specs).not.toContain('发量密度');
    expect(result.specs).not.toContain('卷发类型');
    expect(result.specs).not.toContain('蕾丝类型');
    expect(result.specs).not.toContain('长度');

    // 验证置信度
    expect(result.confidence.audience).toBeGreaterThan(0.5);
    expect(result.confidence.usps).toBeGreaterThan(0.5);
    expect(result.confidence.specs).toBeGreaterThan(0.5);
  });
});

describe('Electronics Products (电子产品)', () => {
  it('should extract DNA from electronics with battery, screen_size, processor, storage', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        ageRange: '18-35岁',
        gender: 'male',
        lifestyleIndicators: ['科技爱好者', '游戏玩家', '效率追求者'],
        buyerTypes: [
          { type: '重度用户', percentage: 70 },
          { type: '专业人士', percentage: 30 },
        ],
        motivations: ['性能需求', '品质保证'],
      }),
      sellingPoints: createSellingPoints({
        functions: [
          '5000mAh 超大电池',
          '120Hz 高刷屏幕',
          '骁龙8 Gen2 处理器',
          '12GB+256GB 存储',
          '65W 快充',
        ],
        differentiation: '旗舰级性能，游戏流畅不卡顿',
        bulletAnalysis: [
          {
            functions: ['5000mAh battery', '6.7 inch AMOLED', '120Hz refresh rate'],
            credibility_score: 'high',
          },
          {
            functions: ['Snapdragon 8 Gen2', '12GB RAM', '256GB storage'],
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([
        { keyword: '5000mAh', type: 'battery' },
        { keyword: '6.7 inch', type: 'screen_size' },
        { keyword: 'Snapdragon 8 Gen2', type: 'processor' },
        { keyword: '12GB+256GB', type: 'storage' },
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    expect(result.audience).toContain('18-35岁');
    expect(result.audience).toContain('男性');

    // 验证使用原始 type 值
    expect(result.specs).toContain('battery: 5000mAh');
    expect(result.specs).toContain('screen_size: 6.7 inch');
    expect(result.specs).toContain('processor: Snapdragon 8 Gen2');
    expect(result.specs).toContain('storage: 12GB+256GB');

    // 验证不应出现硬编码的中文标签
    expect(result.specs).not.toContain('电池');
    expect(result.specs).not.toContain('屏幕尺寸');
    expect(result.specs).not.toContain('处理器');
    expect(result.specs).not.toContain('存储');
  });
});

describe('Cosmetics Products (化妆品)', () => {
  it('should extract DNA from cosmetics with scent, texture, finish, SPF', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        ageRange: '20-40岁',
        lifestyleIndicators: ['护肤达人', '品质生活', '健康意识'],
        buyerTypes: [
          { type: '日常护理用户', percentage: 80 },
          { type: '敏感肌用户', percentage: 20 },
        ],
        motivations: ['温和配方', '有效保湿'],
      }),
      sellingPoints: createSellingPoints({
        functions: ['玫瑰花香', '轻盈质地', '哑光妆效', 'SPF 50+ 防晒', '24小时持妆'],
        differentiation: '医研级配方，敏感肌可用',
        bulletAnalysis: [
          {
            functions: ['Rose scent', 'Lightweight texture', 'Matte finish'],
            credibility_score: 'high',
          },
          {
            functions: ['SPF 50+ PA++++', '24-hour wear', 'Hypoallergenic'],
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([
        { keyword: 'rose', type: 'scent' },
        { keyword: 'lightweight', type: 'texture' },
        { keyword: 'matte', type: 'finish' },
        { keyword: 'SPF 50+', type: 'SPF' },
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));

    // 验证使用原始 type 值
    expect(result.specs).toContain('scent: rose');
    expect(result.specs).toContain('texture: lightweight');
    expect(result.specs).toContain('finish: matte');
    expect(result.specs).toContain('SPF: SPF 50+');

    // 验证不应出现硬编码的中文标签
    expect(result.specs).not.toContain('香调');
    expect(result.specs).not.toContain('质地');
    expect(result.specs).not.toContain('妆效');
    expect(result.specs).not.toContain('防晒指数');
  });
});

describe('Clothing Products (服装)', () => {
  it('should extract DNA from clothing with size, material, color, style', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        lifestyleIndicators: ['职场女性', '时尚品味', '品质追求'],
        buyerTypes: [
          { type: '职业装需求', percentage: 60 },
          { type: '休闲装需求', percentage: 40 },
        ],
        motivations: ['舒适面料', '百搭款式'],
      }),
      sellingPoints: createSellingPoints({
        functions: ['S-XXL 多码可选', '100% 纯棉面料', '经典黑白配色', '修身版型', '四季可穿'],
        differentiation: '职场通勤，优雅大方',
        bulletAnalysis: [
          {
            functions: ['Size S-XXL', '100% cotton', 'Black/White'],
            credibility_score: 'high',
          },
          {
            functions: ['Slim fit', 'Business casual style'],
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([
        { keyword: 'S-XXL', type: 'size' },
        { keyword: '100% cotton', type: 'material' },
        { keyword: 'black/white', type: 'color' },
        { keyword: 'slim fit', type: 'style' },
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));

    // 验证使用原始 type 值
    expect(result.specs).toContain('size: S-XXL');
    expect(result.specs).toContain('material: 100% cotton');
    expect(result.specs).toContain('color: black/white');
    expect(result.specs).toContain('style: slim fit');

    // 验证不应出现硬编码的中文标签
    expect(result.specs).not.toContain('尺码');
    expect(result.specs).not.toContain('材质');
    expect(result.specs).not.toContain('颜色');
    expect(result.specs).not.toContain('风格');
  });
});

describe('Edge Cases - secondary keywords', () => {
  it('should handle empty secondary_keywords array', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile(),
      sellingPoints: createSellingPoints({
        functions: ['高品质产品', '性价比高'],
        bulletAnalysis: [
          {
            functions: ['Premium quality', 'Great value'],
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([]), // 空数组
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    expect(result.audience).toBeTruthy();
    expect(result.usps).toBeTruthy();
    // specs 可能为空或只包含从 bullet_analysis 提取的技术规格
  });

  it('should handle missing type field in secondary_keywords', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile(),
      sellingPoints: createSellingPoints(),
      titleKeywords: createTitleKeywords([
        { keyword: '150% density', type: null }, // type 为 null
        { keyword: 'body wave' }, // type 缺失
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    // 应该将 type 为 null 或缺失的归类为 'other'
    expect(result.specs).toContain('other:');
  });
});

describe('Edge Cases - bullet analysis', () => {
  it('should handle bullet_analysis without technical specs', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile(),
      sellingPoints: createSellingPoints({
        functions: ['高品质产品', '性价比高'],
        bulletAnalysis: [
          {
            functions: ['Beautiful design', 'Easy to use'], // 无技术规格
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([{ keyword: 'premium', type: 'quality' }]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    expect(result.specs).toContain('quality: premium');
    // bullet_analysis 中的非技术规格不应被提取到 specs
    expect(result.specs).not.toContain('Beautiful design');
    expect(result.specs).not.toContain('Easy to use');
  });
});

describe('Edge Cases - incomplete data', () => {
  it('should handle incomplete report with missing fields', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        gender: null,
        lifestyleIndicators: [],
        buyerTypes: [],
        motivations: [],
      }),
      sellingPoints: createSellingPoints({
        functions: [],
        differentiation: '',
      }),
      titleKeywords: createTitleKeywords([{ keyword: 'premium', type: 'quality' }]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));

    // 即使数据不完整，也应该尝试提取
    expect(result.confidence.audience).toBeLessThan(0.5);
    // specs 置信度较低（只有一个 keyword）
    expect(result.confidence.specs).toBeGreaterThan(0);
    expect(result.confidence.specs).toBeLessThan(0.8);
    // 验证提取的内容
    expect(result.audience).toContain('25-45岁');
    expect(result.specs).toContain('quality: premium');
  });
});

describe('Edge Cases - nullish and low confidence reports', () => {
  it('should return null for null report', () => {
    const result = extractProductDNA(null);
    expect(result).toBeNull();
  });

  it('should return null for undefined report', () => {
    const result = extractProductDNA(undefined);
    expect(result).toBeNull();
  });

  it('should return null when confidence is too low', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        ageRange: null,
        gender: null,
        lifestyleIndicators: [],
        buyerTypes: [],
        motivations: [],
      }),
      // 不提供 selling-points 和 title-keywords
    });

    const result = extractProductDNA(report);

    // 当总体置信度低于 0.2 时应返回 null
    // audience: 0 (无有效数据), usps: 0 (无 selling-points), specs: 0 (无数据)
    // 平均置信度 = 0，应返回 null
    expect(result).toBeNull();
  });
});

describe('Confidence Calculation (置信度计算)', () => {
  it('should calculate high confidence for complete data', () => {
    const report = createReport({
      buyerProfile: createWigBuyerProfile(),
      sellingPoints: createSellingPoints({
        functions: ['功能1', '功能2', '功能3', '功能4', '功能5'],
        differentiation: '核心差异化',
        bulletAnalysis: [
          {
            functions: ['150% density', '20 inch length'],
            credibility_score: 'high',
          },
        ],
      }),
      titleKeywords: createTitleKeywords([
        { keyword: '150% density', type: 'hair_density' },
        { keyword: 'body wave', type: 'curl_pattern' },
        { keyword: '13x4 lace', type: 'lace_type' },
        { keyword: '20 inch', type: 'length' },
        { keyword: 'black', type: 'color' },
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    expect(result.confidence.audience).toBeGreaterThanOrEqual(0.8);
    expect(result.confidence.usps).toBeGreaterThanOrEqual(0.7);
    expect(result.confidence.specs).toBeGreaterThanOrEqual(0.7);
  });

  it('should calculate medium confidence for partial data', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        gender: null,
        lifestyleIndicators: [],
        motivations: [],
      }),
      sellingPoints: createSellingPoints({
        functions: ['功能1', '功能2'],
        differentiation: '',
      }),
      titleKeywords: createTitleKeywords([
        { keyword: '150% density', type: 'hair_density' },
        { keyword: 'body wave', type: 'curl_pattern' },
      ]),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    expect(result.confidence.audience).toBeGreaterThan(0.2);
    expect(result.confidence.audience).toBeLessThan(0.8);
    expect(result.confidence.usps).toBeGreaterThan(0.2);
    expect(result.confidence.usps).toBeLessThan(0.8);
  });
});

describe('canExtractDNA Function', () => {
  it('should return true when buyer-profile exists', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile({
        lifestyleIndicators: [],
        buyerTypes: [],
        motivations: [],
      }),
    });

    expect(canExtractDNA(report)).toBe(true);
  });

  it('should return true when selling-points exists', () => {
    const report = createReport({
      sellingPoints: createSellingPoints({
        functions: ['功能1'],
        differentiation: '差异化',
      }),
    });

    expect(canExtractDNA(report)).toBe(true);
  });

  it('should return false for null report', () => {
    expect(canExtractDNA(null)).toBe(false);
  });

  it('should return false for undefined report', () => {
    expect(canExtractDNA(undefined)).toBe(false);
  });

  it('should return false when both buyer-profile and selling-points are missing', () => {
    const report = createReport({
      titleKeywords: createTitleKeywords([]),
    });

    expect(canExtractDNA(report)).toBe(false);
  });
});

describe('Metadata', () => {
  it('should include metadata with extractedAt timestamp', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile(),
      sellingPoints: createSellingPoints(),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    const metadata = expectDefined(result.metadata, 'DNA metadata');
    expect(metadata.extractedAt).toBeDefined();
    expect(metadata.sourceFields).toContain('buyer-profile');
    expect(metadata.sourceFields).toContain('selling-points');
  });

  it('should list only available source fields in metadata', () => {
    const report = createReport({
      buyerProfile: createBuyerProfile(),
    });

    const result = expectExtractedDNA(extractProductDNA(report));
    const metadata = expectDefined(result.metadata, 'DNA metadata');
    expect(metadata.sourceFields).toContain('buyer-profile');
    expect(metadata.sourceFields).not.toContain('selling-points');
    expect(metadata.sourceFields).not.toContain('title-keywords');
  });
});
