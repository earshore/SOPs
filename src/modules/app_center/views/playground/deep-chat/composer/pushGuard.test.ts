import { describe, expect, it } from 'vitest';
import { resolveIncompleteGenerationGuard } from './pushGuard';

describe('resolveIncompleteGenerationGuard', () => {
  it('按钮气泡匹配到 partial → 拦截（正常路径）', () => {
    expect(
      resolveIncompleteGenerationGuard({ status: 'partial' }, { status: 'partial' })
    ).toBe('partial');
  });

  it('按钮气泡匹配到 stopped → 拦截', () => {
    expect(
      resolveIncompleteGenerationGuard({ status: 'stopped' }, { status: 'partial' })
    ).toBe('stopped');
  });

  it('按钮气泡匹配不到（失败路径拆分渲染），但线程最新 AI 是 partial → 兜底拦截', () => {
    expect(resolveIncompleteGenerationGuard(undefined, { status: 'partial' })).toBe('partial');
    expect(resolveIncompleteGenerationGuard(undefined, { status: 'stopped' })).toBe('stopped');
  });

  it('按钮气泡无 status 且线程最新 AI 无 status → 放行', () => {
    expect(resolveIncompleteGenerationGuard(undefined, undefined)).toBeUndefined();
    expect(resolveIncompleteGenerationGuard({}, {})).toBeUndefined();
    expect(
      resolveIncompleteGenerationGuard({ status: undefined }, { status: undefined })
    ).toBeUndefined();
  });

  it('按钮气泡无 status、线程最新 AI 无 status（但存在历史 partial 之外）→ 放行', () => {
    expect(resolveIncompleteGenerationGuard(undefined, {})).toBeUndefined();
  });
});