import { describe, expect, it } from 'vitest';
import { redactSensitiveError } from './uiHooks';

describe('redactSensitiveError vision payloads', () => {
  it('redacts data:image values in objects', () => {
    const huge = 'data:image/png;base64,' + 'A'.repeat(200);
    const redacted = redactSensitiveError({
      message: 'fail',
      image_url: huge,
      nested: { src: huge },
    }) as Record<string, unknown>;
    const serialized = JSON.stringify(redacted);
    expect(serialized).not.toContain('data:image/png;base64,AAA');
    expect(serialized).toMatch(/REDACTED|data:image/i); // short marker ok
    expect(serialized.length).toBeLessThan(huge.length);
  });

  it('redacts long base64-looking strings in Error message if present', () => {
    const err = new Error('boom data:image/jpeg;base64,' + 'B'.repeat(120));
    const redacted = redactSensitiveError(err) as { message: string };
    expect(redacted.message).not.toContain('BBBBBBBBBB');
  });
});
