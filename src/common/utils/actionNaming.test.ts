import { describe, expect, it } from 'vitest';
import { validateDataActionName, validateRegistryActionName } from './actionNaming';

describe('action naming conventions', () => {
  it('accepts known global registry actions', () => {
    expect(validateRegistryActionName('switch-tab')).toMatchObject({
      valid: true,
      kind: 'global',
    });
    expect(validateRegistryActionName('openSettings')).toMatchObject({
      valid: true,
      kind: 'global',
    });
  });

  it('accepts prefixed legacy registry actions with camelCase suffixes', () => {
    expect(validateRegistryActionName('keyword_hunter_cleanKeywords')).toMatchObject({
      valid: true,
      kind: 'prefixed',
    });
    expect(validateRegistryActionName('sops_copyReviewTemplate')).toMatchObject({
      valid: true,
      kind: 'prefixed',
    });
  });

  it('rejects unprefixed registry actions that are not global actions', () => {
    expect(validateRegistryActionName('copyReviewTemplate')).toMatchObject({
      valid: false,
    });
  });

  it('accepts local kebab-case DOM actions for data-action values', () => {
    expect(validateDataActionName('open-next-step-editor')).toMatchObject({
      valid: true,
      kind: 'kebab-local',
    });
  });

  it('rejects mixed action names outside the registry protocol', () => {
    expect(validateDataActionName('keyword_hunter_clean_keywords')).toMatchObject({
      valid: false,
    });
  });
});
