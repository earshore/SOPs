import { afterEach, describe, expect, it } from 'vitest';
import {
  clearRuntimeCssRule,
  getRuntimeCssRuleText,
  updateRuntimeCssRule,
} from '@/common/utils/runtimeStyles';

describe('runtimeStyles', () => {
  afterEach(() => {
    clearRuntimeCssRule('unit-test-rule');
  });

  it('registers and clears a runtime CSS rule by key', () => {
    updateRuntimeCssRule('unit-test-rule', '#unit-test-target', {
      left: '12px',
      top: '24px',
    });

    expect(getRuntimeCssRuleText('unit-test-rule')).toContain('left:12px');
    expect(getRuntimeCssRuleText('unit-test-rule')).toContain('top:24px');

    clearRuntimeCssRule('unit-test-rule');
    expect(getRuntimeCssRuleText('unit-test-rule')).toBeNull();
  });

  it('clearRuntimeCssRule is idempotent', () => {
    clearRuntimeCssRule('unit-test-rule');
    clearRuntimeCssRule('unit-test-rule');
    expect(getRuntimeCssRuleText('unit-test-rule')).toBeNull();
  });
});
