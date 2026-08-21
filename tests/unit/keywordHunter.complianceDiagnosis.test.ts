/**
 * keyword_hunter 评分提示词 — 2026 商品名称新规合规诊断维度契约测试
 *
 * 验收要点：
 * 1. 输入校验门限（>30 chars）保持不变，存量分析能力不受影响
 * 2. 新增「TITLE COMPLIANCE DIAGNOSIS」段为诊断性扣分（非硬拦截）
 * 3. 输出评分表增加「标题合规（2026新规）」诊断行
 * 4. 执行顺序包含标题合规诊断步
 * 5. 既有评分维度（SEO/COSMO/Rufus/语言语调/Risk）保持不变
 */

import { describe, it, expect } from 'vitest';

import { ANALYSIS_PROMPT_TEMPLATE, TRANSLATE_PROMPT_TEMPLATE } from '@/modules/app_center/views/keyword_hunter/constants/prompts';

describe('ANALYSIS_PROMPT_TEMPLATE input validation gate', () => {
  it('should keep the >30 chars input validation gate unchanged', () => {
    expect(ANALYSIS_PROMPT_TEMPLATE).toContain('>30 chars');
    expect(ANALYSIS_PROMPT_TEMPLATE).toContain('HARD GATE');
  });

  it('should keep the translation template untouched', () => {
    expect(TRANSLATE_PROMPT_TEMPLATE).toContain('【1】');
  });
});

describe('ANALYSIS_PROMPT_TEMPLATE title compliance diagnosis', () => {
  const template = ANALYSIS_PROMPT_TEMPLATE;

  it('should include the 2026 title compliance diagnosis section', () => {
    expect(template).toContain('TITLE COMPLIANCE DIAGNOSIS');
  });

  it('should state it is diagnostic, not a hard gate', () => {
    expect(template).toMatch(/diagnostic|not a hard gate/i);
  });

  it('should enforce the 75-character title limit in the diagnosis', () => {
    expect(template).toMatch(/75\s*char/i);
  });

  it('should cover word repetition limits (≤2)', () => {
    expect(template).toMatch(/repetition\s*≤\s*2|repetition ≤ 2/);
  });

  it('should list the banned special characters', () => {
    expect(template).toContain('!');
    expect(template).toContain('$');
    expect(template).toContain('encoding/measurement');
  });

  it('should ban promotional language', () => {
    expect(template).toMatch(/best seller, free, sale|promotional/i);
  });

  it('should enforce the information order', () => {
    expect(template).toMatch(/Brand → Style → Product type/);
  });

  it('should reference parent/child variation consistency', () => {
    expect(template).toMatch(/parent\/child|variation/i);
  });

  it('should reference the Product Highlights field as the overflow delegate', () => {
    expect(template).toMatch(/Product Highlights|Highlights/);
    expect(template).toMatch(/125\s*char/i);
  });

  it('should use graded deductions instead of blocking', () => {
    expect(template).toMatch(/-2 to -5/);
    expect(template).toMatch(/-5 to -10/);
    expect(template).toMatch(/0 pts deducted/);
  });
});

describe('ANALYSIS_PROMPT_TEMPLATE output format integration', () => {
  const template = ANALYSIS_PROMPT_TEMPLATE;

  it('should add a title compliance row to the scoring table', () => {
    expect(template).toContain('标题合规（2026新规）');
    expect(template).toContain('诊断性扣分');
  });

  it('should keep all existing scoring dimensions', () => {
    expect(template).toContain('SEO覆盖');
    expect(template).toContain('COSMO意图');
    expect(template).toContain('Rufus就绪');
    expect(template).toContain('语言语调');
    expect(template).toContain('违规');
  });

  it('should preserve the original rubric point allocations (35/20/15/20)', () => {
    expect(template).toContain('SEO & KEYWORD COVERAGE (35 pts)');
    expect(template).toContain('COSMO INTENT MATCHING (20 pts)');
    expect(template).toContain('RUFUS AI READINESS (15 pts)');
    expect(template).toContain('LANGUAGE & TONE (20 pts)');
  });
});

describe('ANALYSIS_PROMPT_TEMPLATE execution order', () => {
  const template = ANALYSIS_PROMPT_TEMPLATE;

  it('should place Title Compliance Diagnosis after Risk Check', () => {
    const riskIndex = template.indexOf('2. Risk Check');
    const complianceIndex = template.indexOf('Title Compliance Diagnosis');

    expect(riskIndex).toBeGreaterThan(0);
    expect(complianceIndex).toBeGreaterThan(riskIndex);
  });

  it('should keep the total step count at 8', () => {
    const orderMatch = template.match(/# EXECUTION ORDER([\s\S]*?)Begin audit now/);

    expect(orderMatch).not.toBeNull();
    const stepLines = orderMatch![1].trim().split('\n').filter(line => /^\d+\./.test(line));

    expect(stepLines).toHaveLength(8);
  });
});
