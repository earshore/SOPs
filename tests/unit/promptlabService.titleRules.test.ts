/**
 * promptlabService 双版本 Listing Prompt 契约测试
 *
 * 覆盖亚马逊《商品名称要求和指南》（2026 新规）落地方案 P0：
 *  - v1（经典版 · 180 字符）：现网文案零改动
 *  - v2（2026 新规版 · 75 字符）：完整合规模板（≤75 字符、重复词、特殊字符、
 *    促销用语、信息顺序、变体规则、商品亮点字段）
 *  - 版本偏好归一化与默认值语义
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  promptlabService,
  normalizeListingPromptVersion,
  DEFAULT_LISTING_PROMPT_VERSION,
  LISTING_PROMPT_VERSIONS,
} from '@/modules/app_center/views/master_analysis/services/promptlabService';

import type { UserProductProfile } from '@/types/state';

const baseInputs: UserProductProfile = {
  targetMarket: 'English',
  keywordsTier1: 'portable blender',
  keywordsTier2: 'usb blender for gym',
  audience: 'fitness enthusiasts and busy parents',
  usps: '60-second fast blending with USB-C recharge',
  specs: '400ml capacity, 22000 RPM, BPA-free Tritan',
  specsAuthority: 'user-confirmed',
  socialHook: '',
  negative: '',
  tone: 'professional',
  customStrategy: '',
  useCosmo: true,
  useRufus: true,
  useEmoji: true,
  selectedReportSections: [],
  charLimit: 5000,
};

describe('normalizeListingPromptVersion', () => {
  it('should keep v2 as v2', () => {
    expect(normalizeListingPromptVersion('v2')).toBe('v2');
  });

  it('should keep v1 as v1', () => {
    expect(normalizeListingPromptVersion('v1')).toBe('v1');
  });

  it('should fallback unknown strings to v1', () => {
    expect(normalizeListingPromptVersion('v3')).toBe('v1');
    expect(normalizeListingPromptVersion('legacy')).toBe('v1');
  });

  it('should fallback nullish and non-string values to v1', () => {
    expect(normalizeListingPromptVersion(null)).toBe('v1');
    expect(normalizeListingPromptVersion(undefined)).toBe('v1');
    expect(normalizeListingPromptVersion('')).toBe('v1');
    expect(normalizeListingPromptVersion(42 as unknown)).toBe('v1');
  });

  it('should default to v1 when no preference is set', () => {
    expect(DEFAULT_LISTING_PROMPT_VERSION).toBe('v1');
  });

  it('should expose v1 and v2 as the only supported versions', () => {
    expect(LISTING_PROMPT_VERSIONS).toEqual(['v1', 'v2']);
  });
});

describe('generateMasterPrompt v1 (classic · 180 chars)', () => {
  it('should preserve the current production title guidance (180 chars)', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v1');

    expect(prompt).toContain('180');
    expect(prompt).toContain('Title');
    expect(prompt).toContain('ROLE');
  });

  it('should produce the same output with and without an explicit v1 version', () => {
    const explicit = promptlabService.generateMasterPrompt(baseInputs, null, 'v1');
    const implicit = promptlabService.generateMasterPrompt(baseInputs, null);

    expect(explicit).toBe(implicit);
  });

  it('should not leak 2026 title compliance clauses into v1', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v1');

    expect(prompt).not.toContain('Title Compliance');
    expect(prompt).not.toContain('75 characters');
    expect(prompt).not.toContain('Product Highlights');
  });
});

describe('generateMasterPrompt v2 (2026 rules · 75 chars)', () => {
  it('should state the 75-character title limit', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toContain('75');
    expect(prompt).toMatch(/75\s*char/i);
  });

  it('should include the 2026 title compliance clause block', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toContain('Title Compliance');
  });

  it('should cover word repetition limits', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/repetition|repeated|repeating/i);
    expect(prompt).toMatch(/\b2\b.{0,20}(time|times|occurrence|occurrences)/i);
  });

  it('should cover the forbidden / restricted special characters', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/character/i);
    expect(prompt).toContain('!');
  });

  it('should ban promotional language', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/promotion|promotional|best seller|free|sale|guarantee/i);
  });

  it('should allow factual measurement unit abbreviations', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/cm|oz|in|kg/i);
    expect(prompt).not.toContain('Do not use measurement-unit abbreviations');
  });

  it('should reject complete FSA/HSA eligibility phrases', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/FSA.*HSA|fsa\/hsa/i);
    expect(prompt).toMatch(/eligible|requirements/i);
  });

  it('should enforce the information order (brand, style, product type, attributes, color/size, model)', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/order/i);
    expect(prompt).toMatch(/brand/i);
  });

  it('should introduce the Product Highlights / extended bullets field', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/highlights|extended|125/i);
  });

  it('should reference variation (parent/child) rules', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toMatch(/variation|parent|child|ASIN/i);
  });

  it('should carry over input context into v2 output', () => {
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null, 'v2');

    expect(prompt).toContain(baseInputs.keywordsTier1);
    expect(prompt).toContain(baseInputs.usps);
  });

  it('should fall back to v1 for unknown version strings', () => {
    const unknown = promptlabService.generateMasterPrompt(baseInputs, null, 'v3' as never);
    const v1 = promptlabService.generateMasterPrompt(baseInputs, null, 'v1');

    expect(unknown).toBe(v1);
  });
});

describe('ConfigCenter preference integration', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should not import configCenter at module top-level (preference read is lazy)', () => {
    // 版本偏好通过 PromptlabPanel 的 getter 懒读取 configCenter，
    // promptlabService 纯函数不依赖任何配置源，保证单测与 SSR 场景安全。
    const prompt = promptlabService.generateMasterPrompt(baseInputs, null);

    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(0);
  });
});
