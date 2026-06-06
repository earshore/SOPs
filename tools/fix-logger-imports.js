#!/usr/bin/env node

/**
 * Fix circular dependency by removing loggerService imports from infrastructure files
 * and replacing Logger calls with console equivalents
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get list of files with loggerService import errors from ESLint
function getFilesWithLoggerImports() {
  try {
    execSync('npx eslint src --format json > eslint-output.json', {
      stdio: 'pipe',
      cwd: process.cwd()
    });
  } catch (error) {
    // ESLint exits with error code when there are violations, that's expected
  }

  const output = JSON.parse(fs.readFileSync('eslint-output.json', 'utf8'));

  const files = output
    .filter(file =>
      file.messages.some(msg =>
        msg.ruleId === 'no-restricted-imports' &&
        msg.message.includes('loggerService')
      )
    )
    .map(file => file.filePath);

  // Clean up
  fs.unlinkSync('eslint-output.json');

  return files;
}

// Map Logger methods to console equivalents
const loggerToConsoleMap = {
  'Logger.debug': 'console.log',
  'Logger.info': 'console.log',
  'Logger.warn': 'console.warn',
  'Logger.error': 'console.error',
  'Logger.log': 'console.log',
};

function fixFile(filePath) {
  console.log(`Fixing: ${path.relative(process.cwd(), filePath)}`);

  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;

  // Remove loggerService import statements
  const importPatterns = [
    /import\s+{\s*Logger\s*}\s+from\s+['"].*loggerService['"];?\s*\n/g,
    /import\s+Logger\s+from\s+['"].*loggerService['"];?\s*\n/g,
    /import\s+\*\s+as\s+Logger\s+from\s+['"].*loggerService['"];?\s*\n/g,
  ];

  for (const pattern of importPatterns) {
    if (pattern.test(content)) {
      content = content.replace(pattern, '');
      modified = true;
    }
  }

  // Replace Logger calls with console equivalents
  for (const [loggerCall, consoleCall] of Object.entries(loggerToConsoleMap)) {
    const regex = new RegExp(loggerCall.replace('.', '\\.'), 'g');
    if (regex.test(content)) {
      content = content.replace(regex, consoleCall);
      modified = true;
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }

  return false;
}

function main() {
  console.log('🔍 Scanning for files with loggerService imports...\n');

  const files = getFilesWithLoggerImports();

  console.log(`Found ${files.length} files to fix\n`);

  if (files.length === 0) {
    console.log('✅ No files to fix!');
    return;
  }

  let fixedCount = 0;

  for (const file of files) {
    if (fixFile(file)) {
      fixedCount++;
    }
  }

  console.log(`\n✅ Fixed ${fixedCount} files`);
  console.log('\n⚠️  Note: Some Logger usage may need manual review for proper console alternatives');
  console.log('Run "npm run lint" to verify all issues are resolved');
}

main();
