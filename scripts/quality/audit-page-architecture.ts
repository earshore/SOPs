import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { cwd } from 'node:process';

interface PageArchitectureRecord {
  file: string;
  implementationFiles: string[];
  extendsBaseModule: boolean;
  exportsNakedMount: boolean;
  usesViewLoader: boolean;
  usesSafeTemplateLoader: boolean;
  importsRawTemplate: boolean;
  importsCss: boolean;
  usesSafeRendering: boolean;
  usesDirectHtmlWrite: boolean;
  usesSafeModuleLoaderAsModuleLoader: boolean;
  usesModuleCssRegistry: boolean;
}

interface PageArchitectureIssue {
  check: string;
  file: string;
  message: string;
}

const projectRoot = cwd();
const modulesDir = join(projectRoot, 'src/modules');
const businessModuleLoaderFiles = [
  'src/modules/app_center/module.loaders.ts',
  'src/modules/sops/module.loaders.ts',
  'src/modules/amz_hub/module.loaders.ts',
  'src/modules/more/module.loaders.ts',
];

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

function collectModuleSourceFiles(extensions: readonly string[]): string[] {
  return collectFiles(modulesDir)
    .filter(file => extensions.some(extension => file.endsWith(extension)))
    .filter(file => !/[./](test|spec)\.ts$/.test(file))
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

function collectPageImplementationFiles(entryFile: string): string[] {
  const content = readFileSync(entryFile, 'utf8');
  const files = [entryFile];
  const exportFromPattern = /\bexport\s+(?:\{[^}]*\}|\*)\s+from\s+['"]([^'"]+)['"]/g;

  for (const match of content.matchAll(exportFromPattern)) {
    const target = resolveRelativeTsFile(entryFile, match[1]);
    if (target) {
      files.push(target);
    }
  }

  return [...new Set(files)].sort();
}

function inspectPage(file: string): PageArchitectureRecord {
  const implementationFiles = collectPageImplementationFiles(file);
  const content = implementationFiles.map(item => readFileSync(item, 'utf8')).join('\n');
  const relativePath = normalizePath(relative(projectRoot, file));

  return {
    file: relativePath,
    implementationFiles: implementationFiles.map(item =>
      normalizePath(relative(projectRoot, item))
    ),
    extendsBaseModule: /\bextends\s+BaseModule\b/.test(content),
    exportsNakedMount: /\bexport\s+(?:async\s+)?function\s+mount\b/.test(content),
    usesViewLoader: /\bviewLoader\b|common\/utils\/viewLoader/.test(content),
    usesSafeTemplateLoader: /\bSafeTemplateLoader\b|\bsafeTemplateLoader\b/.test(content),
    importsRawTemplate: /template\.html\?raw|html\?raw|templateHTML/.test(content),
    importsCss: /\bimport\s+(?:[^'"]+\s+from\s+)?['"][^'"]+\.css['"]/.test(content),
    usesSafeRendering: /\bSafeRenderer\b|\bsetSafeHtml\b/.test(content),
    usesDirectHtmlWrite: /\binnerHTML\s*=|\binsertAdjacentHTML\s*\(/.test(content),
    usesSafeModuleLoaderAsModuleLoader:
      /\bimport\s*\{\s*SafeModuleLoader\b|\bsafeModuleLoader\b|SafeTemplateLoader\.getInstance\(\)\.loadModule|safeTemplateLoader\.loadModule/.test(
        content
      ),
    usesModuleCssRegistry:
      /\bloadModuleCSS\b|\bmoduleCSSRegistry\b|\bcssRegistry\b|\bregisterModuleCSS\b/.test(content),
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

function collectHardIssues(records: PageArchitectureRecord[]): PageArchitectureIssue[] {
  const checks: Array<{
    key: keyof PageArchitectureRecord;
    check: string;
    message: string;
  }> = [
    {
      key: 'exportsNakedMount',
      check: 'naked-mount',
      message:
        'Page entry must not export a naked function mount(); use the standard module wrapper.',
    },
    {
      key: 'usesViewLoader',
      check: 'view-loader',
      message: 'Page entry must not use common/utils/viewLoader; use SafeTemplateLoader.',
    },
    {
      key: 'importsRawTemplate',
      check: 'raw-template',
      message: 'Page entry must not import template.html?raw; use SafeTemplateLoader.',
    },
    {
      key: 'usesDirectHtmlWrite',
      check: 'direct-html-write',
      message: 'Page entry must not write direct HTML; use SafeRenderer or setSafeHtml.',
    },
    {
      key: 'usesSafeModuleLoaderAsModuleLoader',
      check: 'safe-module-loader-main-chain',
      message:
        'Page entry must not use SafeModuleLoader as a module loader; main loading stays in ModuleLoader.',
    },
    {
      key: 'usesModuleCssRegistry',
      check: 'module-css-registry',
      message:
        'Page entry must not reintroduce module CSS registry side paths; import CSS statically.',
    },
  ];

  const missingBaseModuleIssues = records
    .filter(record => !record.extendsBaseModule)
    .map(record => ({
      check: 'base-module',
      file: record.file,
      message: 'Page entry implementation must extend BaseModule.',
    }));

  return [
    ...missingBaseModuleIssues,
    ...checks.flatMap(({ key, check, message }) =>
      records
        .filter(record => record[key])
        .map(record => ({
          check,
          file: record.file,
          message,
        }))
    ),
  ];
}

function collectSourcePatternIssues(options: {
  files: string[];
  pattern: RegExp;
  check: string;
  message: string;
}): PageArchitectureIssue[] {
  return options.files
    .filter(file => options.pattern.test(readFileSync(file, 'utf8')))
    .map(file => ({
      check: options.check,
      file: normalizePath(relative(projectRoot, file)),
      message: options.message,
    }));
}

function collectModuleLoaderIssues(): PageArchitectureIssue[] {
  return businessModuleLoaderFiles.flatMap(file => {
    const absolutePath = join(projectRoot, file);
    const content = readFileSync(absolutePath, 'utf8');
    const issues: PageArchitectureIssue[] = [];

    if (!content.includes("import.meta.glob('./views/**/index.ts')")) {
      issues.push({
        check: 'module-loaders-generated',
        file,
        message: 'Business module loaders must be generated from ./views/**/index.ts.',
      });
    }

    if (!content.includes('buildModuleMapFromLoaderPaths')) {
      issues.push({
        check: 'module-loaders-manifest-source',
        file,
        message: 'Business module loaders must derive MODULE_MAP from manifest loaderPath values.',
      });
    }

    if (/export\s+const\s+MODULE_MAP\s*=\s*\{/.test(content)) {
      issues.push({
        check: 'module-loaders-handwritten-map',
        file,
        message: 'Business module loaders must not hand-write routeId-to-loader maps.',
      });
    }

    return issues;
  });
}

const records = collectPageEntries().map(inspectPage);
const moduleTsFiles = collectModuleSourceFiles(['.ts']);
const moduleTsAndHtmlFiles = collectModuleSourceFiles(['.ts', '.html']);
const issues = [
  ...collectHardIssues(records),
  ...collectSourcePatternIssues({
    files: moduleTsFiles,
    pattern: /\bStandardModule\b/,
    check: 'standard-module',
    message: 'Production modules must use BaseModule; StandardModule is compatibility-only.',
  }),
  ...collectSourcePatternIssues({
    files: moduleTsFiles,
    pattern:
      /\bthis\.(logger|http)\b|\bcontainer\.resolve(?:<[^>]+>)?\(\s*['"](logger|http)['"]\s*\)/,
    check: 'sync-async-service',
    message:
      'Async DI services must be resolved asynchronously; use getLogger(), getHttp(), or resolveAsync().',
  }),
  ...collectSourcePatternIssues({
    files: moduleTsAndHtmlFiles,
    pattern: /每日自动更新|实时同步|最后自动执行/,
    check: 'production-automation-copy',
    message:
      'Pages without a production data source must not promise automatic updates, real-time sync, or automatic execution.',
  }),
  ...collectModuleLoaderIssues(),
];

console.log('Page architecture audit');
console.log('='.repeat(80));
console.log(`Page entries: ${records.length}`);
console.log(`Errors: ${issues.length}`);
console.log(`Extends BaseModule: ${countBy(records, 'extendsBaseModule')}`);
console.log(`Naked mount exports: ${countBy(records, 'exportsNakedMount')}`);
console.log(`Uses viewLoader: ${countBy(records, 'usesViewLoader')}`);
console.log(`Uses SafeTemplateLoader: ${countBy(records, 'usesSafeTemplateLoader')}`);
console.log(`Imports raw template: ${countBy(records, 'importsRawTemplate')}`);
console.log(`Imports page CSS: ${countBy(records, 'importsCss')}`);
console.log(`Uses safe rendering: ${countBy(records, 'usesSafeRendering')}`);
console.log(`Direct HTML writes: ${countBy(records, 'usesDirectHtmlWrite')}`);
console.log(
  `Uses SafeModuleLoader module chain: ${countBy(records, 'usesSafeModuleLoaderAsModuleLoader')}`
);
console.log(`Uses module CSS registry: ${countBy(records, 'usesModuleCssRegistry')}`);
console.log(
  `Uses StandardModule in production modules: ${issues.filter(issue => issue.check === 'standard-module').length}`
);
console.log(
  `Uses sync async-service shortcuts: ${issues.filter(issue => issue.check === 'sync-async-service').length}`
);
console.log(
  `Uses production automation copy: ${issues.filter(issue => issue.check === 'production-automation-copy').length}`
);
console.log(
  `Module loader source issues: ${issues.filter(issue => issue.check.startsWith('module-loaders-')).length}`
);

printFileList('Naked mount entries', listFiles(records, 'exportsNakedMount'));
printFileList(
  'Missing BaseModule entries',
  records.filter(record => !record.extendsBaseModule).map(record => record.file)
);
printFileList('viewLoader entries', listFiles(records, 'usesViewLoader'));
printFileList('raw template entries', listFiles(records, 'importsRawTemplate'));
printFileList('direct HTML write entries', listFiles(records, 'usesDirectHtmlWrite'));
printFileList(
  'SafeModuleLoader module-chain entries',
  listFiles(records, 'usesSafeModuleLoaderAsModuleLoader')
);
printFileList('module CSS registry entries', listFiles(records, 'usesModuleCssRegistry'));

if (issues.length > 0) {
  console.log('');
  console.log('Errors');
  console.log('-'.repeat(80));
  for (const issue of issues) {
    console.log(`[ERROR] ${issue.check} (${issue.file})`);
    console.log(`  ${issue.message}`);
  }
}

console.log('');
console.log(`Status: ${issues.length > 0 ? 'failed' : 'passed'}`);

if (issues.length > 0) {
  process.exitCode = 1;
}
