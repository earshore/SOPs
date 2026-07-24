import { describe, expect, it } from 'vitest';
import {
  OPENAI_PLATFORM_CAPABILITY_MATRIX,
  listCapabilitiesByStatus,
  summarizePlatformCapability,
} from './platformCapability';

describe('OPENAI_PLATFORM_CAPABILITY_MATRIX', () => {
  it('has unique ids and covers all status buckets', () => {
    const ids = OPENAI_PLATFORM_CAPABILITY_MATRIX.map(r => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    const summary = summarizePlatformCapability();
    expect(summary.implemented).toBeGreaterThan(0);
    expect(summary.gateway_dependent).toBeGreaterThan(0);
    expect(summary.not_in_scope).toBeGreaterThan(0);
    expect(listCapabilitiesByStatus('implemented').length).toBe(summary.implemented);
  });

  it('marks Deep Chat business tools as implemented', () => {
    const row = OPENAI_PLATFORM_CAPABILITY_MATRIX.find(r => r.id === 'product.deep_chat.tools');
    expect(row?.status).toBe('implemented');
  });

  it('marks chat tools as implemented (dual-path full Create parity)', () => {
    const row = OPENAI_PLATFORM_CAPABILITY_MATRIX.find(r => r.id === 'chat.tools');
    expect(row?.status).toBe('implemented');
  });
});
