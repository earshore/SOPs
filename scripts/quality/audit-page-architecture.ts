import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cwd } from 'node:process';

interface PageArchitectureRecord {
  file: string;
  extendsBaseModule: boolean;
  exportsNakedMount: boolean;
  usesViewLoader: boolean;
  usesSafeTemplateLoader: boolean;
  importsRawTemplate: boolean;
  importsCss: boolean;
  usesSafeRendering: boolean;
  usesDirectHtmlWrite: boolean;
}

const projectRoot = cwd();
const modulesDir = join(projectRoot, 'src/modules');

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/');
}

function collectFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      collectFiles(fullPath, files);
      continue;
    }

    files.push(fullPath);
  }

  return files;
}

function collectPageEntries(): string[] {
  const sourceFiles = collectFiles(modulesDir)
    .filter(file => normalizePath(relative(projectRoot, file)).endsWith('.ts'))
    .filter(file => !/[./](test|spec)\.ts$/.test(file));

  const viewEntries = sourceFiles.filter(file =>
    /\/views\/.+\/index\.ts$/.test(normalizePath(relative(projectRoot, file)))
  );
  const homeEntry = join(modulesDir, 'home/homeDisplay.ts');

  return [...viewEntries, homeEntry].filter(file => statSync(file).isFile()).sort();
}

function inspectPage(file: string): PageArchitectureRecord {
  const content = readFileSync(file, 'utf8');
  const relativePath = normalizePath(relative(projectRoot, file));

  return {
    file: relativePath,
    extendsBaseModule: /\bextends\s+BaseModule\b/.test(content),
    exportsNakedMount: /\bexport\s+(?:async\s+)?function\s+mount\b/.test(content),
    usesViewLoader: /\bviewLoader\b|common\/utils\/viewLoader/.test(content),
    usesSafeTemplateLoader: /\bSafeTemplateLoader\b|\bsafeTemplateLoader\b/.test(content),
    importsRawTemplate: /template\.html\?raw|html\?raw|templateHTML/.test(content),
    importsCss: /\bimport\s+(?:[^'"]+\s+from\s+)?['"][^'"]+\.css['"]/.test(content),
    usesSafeRendering: /\bSafeRenderer\b|\bsetSafeHtml\b/.test(content),
    usesDirectHtmlWrite: /\binnerHTML\s*=|\binsertAdjacentHTML\s*\(/.test(content),
  };
}

function countBy(records: PageArchitectureRecord[], key: keyof PageArchitectureRecord): number {
  return records.filter(record => record[key]).length;
}

function listFiles(records: PageArchitectureRecord[], key: keyof PageArchitectureRecord): string[] {
  return records.filter(record => record[key]).map(record => record.file);
}

function printFileList(title: string, files: string[]): void {
  if (files.length === 0) return;

  console.log('');
  console.log(`${title} (${files.length})`);
  console.log('-'.repeat(80));
  for (const file of files) {
    console.log(`- ${file}`);
  }
}

const records = collectPageEntries().map(inspectPage);

console.log('Page architecture audit');
console.log('='.repeat(80));
console.log(`Page entries: ${records.length}`);
console.log(`Extends BaseModule: ${countBy(records, 'extendsBaseModule')}`);
console.log(`Naked mount exports: ${countBy(records, 'exportsNakedMount')}`);
console.log(`Uses viewLoader: ${countBy(records, 'usesViewLoader')}`);
console.log(`Uses SafeTemplateLoader: ${countBy(records, 'usesSafeTemplateLoader')}`);
console.log(`Imports raw template: ${countBy(records, 'importsRawTemplate')}`);
console.log(`Imports page CSS: ${countBy(records, 'importsCss')}`);
console.log(`Uses safe rendering: ${countBy(records, 'usesSafeRendering')}`);
console.log(`Direct HTML writes: ${countBy(records, 'usesDirectHtmlWrite')}`);

printFileList('Naked mount entries', listFiles(records, 'exportsNakedMount'));
printFileList('viewLoader entries', listFiles(records, 'usesViewLoader'));
printFileList('raw template entries', listFiles(records, 'importsRawTemplate'));
printFileList('direct HTML write entries', listFiles(records, 'usesDirectHtmlWrite'));

console.log('');
console.log('Status: informational');
