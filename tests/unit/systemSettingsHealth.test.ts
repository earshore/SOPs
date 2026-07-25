import { expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  evaluateSettingsHealth,
  isRuntimeRawInvalid,
} from '@/components/settings/domain/settingsHealth';

it('UT-P0-09 reports safe defaults when runtime was repaired', () => {
  const result = evaluateSettingsHealth({
    runtimeNormalized: true,
    hasLlmEndpoint: false,
    hasLlmKey: false,
  });
  expect(result.ok).toBe(false);
  expect(result.messages.length).toBeGreaterThan(0);
  expect(result.messages.some(m => m.includes('安全默认'))).toBe(true);
});

it('UT-P0-09b healthy when endpoint and key present without repair', () => {
  const result = evaluateSettingsHealth({
    runtimeNormalized: false,
    hasLlmEndpoint: true,
    hasLlmKey: true,
  });
  expect(result.ok).toBe(true);
  expect(result.messages).toEqual([]);
});

it('UT-P0-09c warns on high storage usage ratio', () => {
  const result = evaluateSettingsHealth({
    runtimeNormalized: false,
    hasLlmEndpoint: true,
    hasLlmKey: true,
    storageUsageRatio: 0.9,
  });
  expect(result.ok).toBe(false);
  expect(result.messages.some(m => m.includes('存储'))).toBe(true);
});

it('UT-P0-09d isRuntimeRawInvalid detects unusable payloads', () => {
  expect(isRuntimeRawInvalid(null)).toBe(false);
  expect(isRuntimeRawInvalid(undefined)).toBe(false);
  expect(isRuntimeRawInvalid({ version: 1 })).toBe(false);
  expect(isRuntimeRawInvalid('broken')).toBe(true);
  expect(isRuntimeRawInvalid([])).toBe(true);
  expect(isRuntimeRawInvalid(42)).toBe(true);
});

it('UT-P0-07 scraperService reads runtime scraper options not ConfigCenter', () => {
  const src = readFileSync(
    resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/services/scraperService.ts'),
    'utf8'
  );
  expect(src).toContain('getRuntimeScraperOptions');
  expect(src).not.toMatch(/configCenter\.get\(/);
  expect(src).not.toMatch(/from ['"]@\/common\/config\/ConfigCenter['"]/);
});

it('UT-P0-08 ConfigCenter marks llm/scraper/storage numerics as FALLBACK-ONLY', () => {
  const src = readFileSync(resolve(process.cwd(), 'src/common/config/ConfigCenter.ts'), 'utf8');
  expect(src).toContain('FALLBACK-ONLY');
  expect(src).toContain('runtimeStrategyService');
});
