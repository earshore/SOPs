import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { cwd } from 'node:process';

const modulesDir = join(cwd(), 'src/modules');
const srcDir = join(cwd(), 'src');

const nakedMountAllowlist: string[] = [];

const viewLoaderAllowlist: string[] = [];

const rawTemplateAllowlist: string[] = [];

function normalizePath(file: string): string {
  return file.replace(/\\/g, '/');
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }

    if (/\.(ts|html)$/.test(entry) && !/\.(test|spec)\.ts$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function findOffenders(pattern: RegExp, extensions: readonly string[] = ['.ts']): string[] {
  return collectFiles(modulesDir)
    .filter(file => extensions.some(extension => file.endsWith(extension)))
    .filter(file => pattern.test(readFileSync(file, 'utf8')))
    .map(file => normalizePath(relative(cwd(), file)))
    .sort();
}

function findSourceOffenders(pattern: RegExp, extensions: readonly string[] = ['.ts']): string[] {
  return collectFiles(srcDir)
    .filter(file => extensions.some(extension => file.endsWith(extension)))
    .filter(file => pattern.test(readFileSync(file, 'utf8')))
    .map(file => normalizePath(relative(cwd(), file)))
    .sort();
}

function resolveRelativeTsFile(baseFile: string, specifier: string): string | null {
  if (!specifier.startsWith('.')) {
    return null;
  }

  const target = join(dirname(baseFile), specifier.endsWith('.ts') ? specifier : `${specifier}.ts`);

  try {
    return statSync(target).isFile() ? target : null;
  } catch {
    return null;
  }
}

function collectPageEntries(): string[] {
  const viewEntries = collectFiles(modulesDir).filter(file =>
    /\/views\/.+\/index\.ts$/.test(normalizePath(relative(cwd(), file)))
  );
  const homeEntry = join(modulesDir, 'home/homeDisplay.ts');

  return [...viewEntries, homeEntry].filter(file => statSync(file).isFile()).sort();
}

function collectPageImplementationContent(entryFile: string): string {
  const content = readFileSync(entryFile, 'utf8');
  const files = [entryFile];
  const exportFromPattern = /\bexport\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(exportFromPattern)) {
    const target = resolveRelativeTsFile(entryFile, match[1]);
    if (target) {
      files.push(target);
    }
  }

  return [...new Set(files)].map(file => readFileSync(file, 'utf8')).join('\n');
}

describe('page architecture convergence', () => {
  it('keeps every page entry implementation on BaseModule', () => {
    const offenders = collectPageEntries()
      .filter(file => !/\bextends\s+BaseModule\b/.test(collectPageImplementationContent(file)))
      .map(file => normalizePath(relative(cwd(), file)));

    expect(offenders).toEqual([]);
  });

  it('does not add new naked mount page entries', () => {
    const offenders = findOffenders(/\bexport\s+(?:async\s+)?function\s+mount\b/);

    expect(offenders).toEqual(nakedMountAllowlist);
  });

  it('does not add safeMount usage in production modules', () => {
    const offenders = findOffenders(/\bsafeMount\b|common\/utils\/safeMount/);

    expect(offenders).toEqual([]);
  });

  it('does not add new viewLoader usage in production modules', () => {
    const offenders = findOffenders(/\bviewLoader\b|common\/utils\/viewLoader/);

    expect(offenders).toEqual(viewLoaderAllowlist);
  });

  it('does not add new raw template imports in production modules', () => {
    const offenders = findOffenders(/template\.html\?raw|html\?raw|templateHTML/);

    expect(offenders).toEqual(rawTemplateAllowlist);
  });

  it('keeps SafeModuleLoader scoped to template loading in production modules', () => {
    const offenders = findOffenders(
      /\bimport\s*\{\s*SafeModuleLoader\b|\bsafeModuleLoader\b|SafeTemplateLoader\.getInstance\(\)\.loadModule|safeTemplateLoader\.loadModule/
    );

    expect(offenders).toEqual([]);
  });

  it('does not reintroduce a module CSS registry side path', () => {
    const offenders = findSourceOffenders(
      /\bloadModuleCSS\b|\bmoduleCSSRegistry\b|\bcssRegistry\b|\bregisterModuleCSS\b/
    );

    expect(offenders).toEqual([]);
  });

  it('keeps high-risk automation copy behind human-confirmation wording', () => {
    const offenders = findOffenders(/每日自动更新|实时同步|最后自动执行/, ['.ts', '.html']);

    expect(offenders).toEqual([]);
  });
});
