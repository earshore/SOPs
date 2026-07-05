import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectSourceFiles(fullPath, files);
      continue;
    }

    if (/\.[jt]sx?$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

describe('module base class convergence', () => {
  it('keeps production modules from using StandardModule', () => {
    const modulesDir = join(cwd(), 'src/modules');
    const offenders = collectSourceFiles(modulesDir)
      .filter(file => readFileSync(file, 'utf-8').includes('StandardModule'))
      .map(file => relative(cwd(), file));

    expect(offenders).toEqual([]);
  });

  it('keeps production modules from using sync async-service shortcuts', () => {
    const modulesDir = join(cwd(), 'src/modules');
    const syncShortcutPattern = /\bthis\.(logger|http)\b/;
    const offenders = collectSourceFiles(modulesDir)
      .filter(file => syncShortcutPattern.test(readFileSync(file, 'utf-8')))
      .map(file => relative(cwd(), file));

    expect(offenders).toEqual([]);
  });
});
