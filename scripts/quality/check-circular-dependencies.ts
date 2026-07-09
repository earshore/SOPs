import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import madge from 'madge';

const SOURCE_DIR = 'src';
const TEMP_PREFIX = '.madge-scan-';
const VITE_URL_QUERY_PATTERN = /\?url(?=['"])/g;

async function collectTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async entry => {
      const filePath = join(directory, entry.name);

      if (entry.isDirectory()) {
        return collectTypeScriptFiles(filePath);
      }

      return extname(entry.name) === '.ts' ? [filePath] : [];
    })
  );

  return nestedFiles.flat();
}

async function normalizeViteAssetImports(directory: string): Promise<void> {
  const files = await collectTypeScriptFiles(directory);

  await Promise.all(
    files.map(async file => {
      const source = await readFile(file, 'utf8');
      const normalizedSource = source.replace(VITE_URL_QUERY_PATTERN, '');

      if (normalizedSource !== source) {
        await writeFile(file, normalizedSource);
      }
    })
  );
}

async function writeTemporaryTsConfig(tempRoot: string): Promise<string> {
  const rootConfig = JSON.parse(await readFile('tsconfig.json', 'utf8')) as {
    compilerOptions?: Record<string, unknown>;
    include?: string[];
  };

  rootConfig.compilerOptions = {
    ...rootConfig.compilerOptions,
    baseUrl: '.',
    paths: {
      '@/*': ['src/*'],
    },
  };
  rootConfig.include = ['src/**/*'];

  const configPath = join(tempRoot, 'tsconfig.madge.json');
  await writeFile(configPath, `${JSON.stringify(rootConfig, null, 2)}\n`);
  return configPath;
}

async function main(): Promise<void> {
  const tempRoot = await mkdtemp(TEMP_PREFIX);

  try {
    const tempSourceDir = join(tempRoot, SOURCE_DIR);
    await cp(SOURCE_DIR, tempSourceDir, { recursive: true });
    await normalizeViteAssetImports(tempSourceDir);

    const tsConfig = await writeTemporaryTsConfig(tempRoot);
    const result = await madge(tempSourceDir, {
      baseDir: tempRoot,
      fileExtensions: ['ts'],
      tsConfig,
    });
    const circular = result.circular();
    const warnings = result.warnings();
    const skipped = warnings.skipped ?? [];

    console.log('Circular dependency audit');
    console.log('================================================================================');
    console.log(`Circular dependencies: ${circular.length}`);
    console.log(`Skipped dependencies: ${skipped.length}`);

    if (circular.length > 0) {
      console.log('\nCircular dependency chains:');
      for (const chain of circular) {
        console.log(`- ${chain.join(' -> ')}`);
      }
    }

    if (skipped.length > 0) {
      console.log('\nSkipped dependencies:');
      for (const dependency of skipped) {
        console.log(`- ${dependency}`);
      }
    }

    if (circular.length > 0 || skipped.length > 0) {
      console.log('\nStatus: failed');
      process.exitCode = 1;
      return;
    }

    console.log('Status: passed');
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
