import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/storageService', () => ({
  StorageService: {
    getLLMConfig: vi.fn(),
  },
}));

import { StorageService } from '@/services/storageService';
import {
  buildLooseAnalysisJsonSchema,
  withStructuredAnalysisOptions,
} from './structuredAnalysisOptions';

describe('withStructuredAnalysisOptions', () => {
  beforeEach(() => {
    vi.mocked(StorageService.getLLMConfig).mockReturnValue({
      apiPath: 'responses',
    } as never);
  });

  it('attaches soft jsonSchema for gpt-5.5 on responses path', () => {
    const opts = withStructuredAnalysisOptions(
      { temperature: 0.3, stream: true },
      { provider: 'new_api', model: 'gpt-5.5', schemaName: 'title-keywords' }
    );
    expect(opts.jsonMode).toBe(true);
    expect(opts.apiPath).toBe('responses');
    expect(opts.jsonSchema?.name).toBe('title-keywords');
    expect(opts.jsonSchema?.strict).toBe(false);
    expect(opts.jsonSchema?.schema).toMatchObject({ type: 'object' });
  });

  it('keeps jsonMode without jsonSchema when path is chat_completions', () => {
    vi.mocked(StorageService.getLLMConfig).mockReturnValue({
      apiPath: 'chat_completions',
    } as never);
    const opts = withStructuredAnalysisOptions(
      { temperature: 0.2 },
      { provider: 'new_api', model: 'deepseek-v4-flash' }
    );
    expect(opts.jsonMode).toBe(true);
    expect(opts.apiPath).toBe('chat_completions');
    expect(opts.jsonSchema).toBeUndefined();
  });

  it('builds safe schema names', () => {
    expect(buildLooseAnalysisJsonSchema('title-keywords').name).toBe('title-keywords');
    expect(buildLooseAnalysisJsonSchema('a/b c').name).toBe('a_b_c');
  });
});
