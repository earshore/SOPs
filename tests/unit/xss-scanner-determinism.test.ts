import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

describe('xss-scanner report', () => {
  it('is deterministic for unchanged source input', async () => {
    const projectRoot = mkdtempSync(join(tmpdir(), 'sops-xss-scanner-'));

    try {
      const scannerDirectory = join(projectRoot, 'tools', 'security');
      const reportPath = join(projectRoot, 'docs', 'XSS_SCAN_REPORT.md');
      mkdirSync(scannerDirectory, { recursive: true });
      mkdirSync(join(projectRoot, 'src'));
      mkdirSync(join(projectRoot, 'docs'));
      copyFileSync(
        resolve('tools/security/xss-scanner.js'),
        join(scannerDirectory, 'xss-scanner.js')
      );
      writeFileSync(join(projectRoot, 'package.json'), '{"type":"module"}\n');
      writeFileSync(join(projectRoot, 'src', 'example.ts'), "export const value = 'safe';\n");

      const runScanner = () => {
        const result = spawnSync(process.execPath, [join(scannerDirectory, 'xss-scanner.js')], {
          cwd: projectRoot,
          encoding: 'utf8',
        });

        expect(result.error).toBeUndefined();
        expect(result.status, result.stderr).toBe(0);
        return readFileSync(reportPath, 'utf8');
      };

      const firstReport = runScanner();
      await new Promise(resolveWait => setTimeout(resolveWait, 1_100));
      const secondReport = runScanner();
      const scanTimeLine = /^\*\*扫描时间\*\*: .*\r?\n/m;

      expect(firstReport.replace(scanTimeLine, '')).toBe(secondReport.replace(scanTimeLine, ''));
      expect.soft(firstReport).toBe(secondReport);
      expect.soft(firstReport).not.toMatch(scanTimeLine);
      expect(secondReport).not.toMatch(scanTimeLine);
    } finally {
      rmSync(projectRoot, { recursive: true, force: true });
    }
  });
});
