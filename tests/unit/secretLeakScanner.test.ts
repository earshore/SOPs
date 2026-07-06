import { describe, expect, it } from 'vitest';
import { scanContent, shouldSkipPath } from '../../tools/secret-leak-scanner';

describe('secret-leak-scanner', () => {
  it('detects high-confidence provider tokens and masks output', () => {
    const token = `sk-${'a'.repeat(48)}`;
    const findings = scanContent('docs/DEPLOYMENT.md', `GATEWAY_NEW_API_API_KEY=${token}`);

    expect(findings.map(finding => finding.ruleId)).toContain('openai-compatible-token');
    expect(findings.map(finding => finding.ruleId)).toContain('sensitive-env-assignment');
    expect(findings.some(finding => finding.preview.includes(token))).toBe(false);
    expect(findings.every(finding => finding.line === 1)).toBe(true);
  });

  it('ignores placeholders and fake test values', () => {
    const findings = scanContent(
      '.env.example',
      [
        'GATEWAY_NEW_API_API_KEY=sk-your-api-key-here',
        'AUTH_PASSWORD=changeme',
        "const apiKey = 'test-api-key';",
        'OPENAI_API_KEY=$OPENAI_API_KEY',
      ].join('\n')
    );

    expect(findings).toEqual([]);
  });

  it('detects private key blocks and reports the correct line', () => {
    const privateKeyHeader = ['-----BEGIN', 'PRIVATE KEY-----'].join(' ');
    const findings = scanContent(
      'config/keys.txt',
      ['comment', privateKeyHeader, 'abc', '-----END PRIVATE KEY-----'].join('\n')
    );

    expect(findings).toEqual([
      expect.objectContaining({
        ruleId: 'private-key-block',
        file: 'config/keys.txt',
        line: 2,
      }),
    ]);
  });

  it('skips generated reports and binary assets', () => {
    expect(shouldSkipPath('tests/quality/security-audit-2026-07-06.json')).toBe(true);
    expect(shouldSkipPath('dist/assets/index.js')).toBe(true);
    expect(shouldSkipPath('src/services/llmService.ts')).toBe(false);
  });
});
