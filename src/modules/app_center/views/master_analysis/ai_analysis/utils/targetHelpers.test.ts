import { describe, expect, it } from 'vitest';
import { getTargetColor, getTargetConfig, getTargetIcon, getTargetStyle } from './targetHelpers';
import {
  estimateTokenCost,
  estimateTokenCount,
  formatCost,
  formatTokenCount,
} from './tokenCounter';

describe('targetHelpers', () => {
  it('returns configured target metadata', () => {
    const config = getTargetConfig('title-keywords');

    expect(config?.name).toBe('标题核心词根');
    expect(getTargetIcon('title-keywords')).toBe(config?.icon);
    expect(getTargetColor('title-keywords')).toBe(config?.color);
    expect(getTargetStyle('title-keywords')).toEqual({
      icon: config?.icon,
      color: config?.color,
    });
  });

  it('uses fallback metadata for unknown targets', () => {
    expect(getTargetConfig('missing-target')).toBeUndefined();
    expect(getTargetIcon('missing-target')).toBe('fa-solid fa-circle-question');
    expect(getTargetColor('missing-target')).toBe('slate');
    expect(getTargetStyle('missing-target')).toEqual({
      icon: 'fa-solid fa-circle-question',
      color: 'slate',
    });
  });
});

describe('tokenCounter', () => {
  it('estimates mixed-language token counts', () => {
    expect(estimateTokenCount('')).toBe(0);
    expect(estimateTokenCount('abcd')).toBe(1);
    expect(estimateTokenCount('测试abcd')).toBe(5);
  });

  it('formats token counts and estimated costs', () => {
    expect(formatTokenCount(850)).toBe('850');
    expect(formatTokenCount(1250)).toBe('1.3K');
    expect(estimateTokenCost(1000, 'gpt-4')).toBe(0.03);
    expect(estimateTokenCost(1000, 'gpt-3.5')).toBe(0.0015);
    expect(formatCost(0.001)).toBe('<$0.01');
    expect(formatCost(0.123)).toBe('$0.12');
  });
});
