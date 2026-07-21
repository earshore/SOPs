import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  DEEP_CHAT_SCROLL_BUG,
  DEEP_CHAT_SCROLL_FIX,
  patchDeepChatBundleSource,
} from '../../config/patch-deep-chat-bundle.mjs';

const require = createRequire(import.meta.url);

describe('patchDeepChatBundleSource', () => {
  it('replaces the known empty messageToElements crash pattern', () => {
    const input = `prefix${DEEP_CHAT_SCROLL_BUG}suffix`;
    const patched = patchDeepChatBundleSource(input, { strict: true });
    expect(patched).toBe(`prefix${DEEP_CHAT_SCROLL_FIX}suffix`);
    expect(patched).not.toContain(DEEP_CHAT_SCROLL_BUG);
  });

  it('is idempotent when the fix is already present', () => {
    const input = `x${DEEP_CHAT_SCROLL_FIX}y`;
    expect(patchDeepChatBundleSource(input, { strict: true })).toBe(input);
  });

  it('fail-closes in strict mode when neither bug nor fix is found', () => {
    expect(() => patchDeepChatBundleSource('unrelated minified code', { strict: true })).toThrow(
      /scroll guard pattern not found/
    );
  });

  it('matches the installed deep-chat production bundle pattern', () => {
    const path = require.resolve('deep-chat/dist/deepChat.bundle.js');
    const source = readFileSync(path, 'utf8');
    const patched = patchDeepChatBundleSource(source, { strict: true });
    expect(patched.includes(DEEP_CHAT_SCROLL_FIX)).toBe(true);
    expect(patched.includes(DEEP_CHAT_SCROLL_BUG)).toBe(false);
  });
});
