import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

function collectTsFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectTsFiles(fullPath);
    }

    return fullPath.endsWith('.ts') && !fullPath.endsWith('.test.ts') ? [fullPath] : [];
  });
}

describe('SOP template copy action migration', () => {
  const sopsViewFiles = collectTsFiles(join(cwd(), 'src/modules/sops/views'));

  it('does not use native alert feedback in SOP view modules', () => {
    const offenders = sopsViewFiles.filter(file => readFileSync(file, 'utf8').includes('alert('));

    expect(offenders.map(file => file.replace(`${cwd()}\\`, ''))).toEqual([]);
  });

  it('does not inline clipboard copy logic in SOP view modules', () => {
    const offenders = sopsViewFiles.filter(file =>
      readFileSync(file, 'utf8').includes('copyTextToClipboard')
    );

    expect(offenders.map(file => file.replace(`${cwd()}\\`, ''))).toEqual([]);
  });
});
