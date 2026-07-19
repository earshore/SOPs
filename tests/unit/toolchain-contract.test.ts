import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import viteConfig from '../../vite.config.js';

describe('release toolchain contract', () => {
  it('declares the Vite 8 Node floor consistently', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
      engines: { node: string };
    };
    expect(packageJson.engines.node).toBe('^20.19.0 || >=22.12.0');
    expect(readFileSync('.node-version', 'utf8').trim()).toBe('20.19.0');
  });

  it('ratchets all four coverage dimensions', () => {
    const thresholds = viteConfig.test?.coverage?.thresholds;
    expect(thresholds).toEqual({
      lines: 82,
      statements: 80,
      functions: 82,
      branches: 65,
    });
  });
});
