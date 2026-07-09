import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';

function collectIndexFiles(directory: string): string[] {
  return readdirSync(directory).flatMap(entry => {
    const fullPath = join(directory, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      return collectIndexFiles(fullPath);
    }

    return entry === 'index.ts' ? [fullPath] : [];
  });
}

function normalizePath(file: string): string {
  return relative(cwd(), file).replace(/\\/g, '/');
}

describe('SOP template page shell migration', () => {
  const migratedSopIndexFiles = collectIndexFiles(join(cwd(), 'src/modules/sops/views')).filter(
    file => normalizePath(file) !== 'src/modules/sops/views/growth/npi_tracker/index.ts'
  );

  it('keeps migrated SOP pages on the shared template shell instead of hand-rolled module lifecycle code', () => {
    const forbiddenPatterns = [
      /class\s+\w+Module\s+extends\s+BaseModule/,
      /private\s+registeredActions\s*:/,
      /SafeTemplateLoader\.getInstance\(\)\.loadTemplate/,
      /\bsetSafeHtml\s*\(/,
      /\bregisterActionsWithLegacy\s*\(/,
      /\bunregisterActions\s*\(/,
    ];

    const offenders = migratedSopIndexFiles.filter(file => {
      const source = readFileSync(file, 'utf8');
      return forbiddenPatterns.some(pattern => pattern.test(source));
    });

    expect(offenders.map(normalizePath)).toEqual([]);
  });

  it('keeps the complex NPI tracker outside the shared shell guard until its business state is separated', () => {
    expect(migratedSopIndexFiles.map(normalizePath)).not.toContain(
      'src/modules/sops/views/growth/npi_tracker/index.ts'
    );
  });
});
