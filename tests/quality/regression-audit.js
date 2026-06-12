import fs from 'fs';
import path from 'path';

const rootDir = process.cwd();
const reportsDir = path.join(rootDir, 'tests', 'quality', 'reports');
const outputFile = path.join(reportsDir, 'regression-audit.json');

const COVERAGE_THRESHOLDS = {
  statements: 60,
  branches: 55,
  functions: 60,
  lines: 60,
};

const TEST_FILE_PATTERN = /\.(test|spec)\.(ts|tsx|js|jsx)$/;
const SKIP_PATTERN = /\b(?:test|it|describe)\.skip\s*\(|\btest\.fixme\s*\(|\btest\.skip\s*\(\s*\)/g;

function walkFiles(dir, predicate, files = []) {
  if (!fs.existsSync(dir)) return files;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'coverage' || entry.name === 'playwright-report') {
        continue;
      }
      walkFiles(fullPath, predicate, files);
    } else if (!predicate || predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

function toRelative(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/');
}

function getTestArea(relativePath) {
  if (relativePath.startsWith('tests/unit/')) return 'unit';
  if (relativePath.startsWith('tests/integration/')) return 'integration';
  if (relativePath.startsWith('tests/e2e/')) return 'e2e';
  if (relativePath.startsWith('tests/startup/')) return 'startup';
  if (relativePath.startsWith('tests/performance/')) return 'performance';
  if (relativePath.startsWith('tests/visual/')) return 'visual';
  if (relativePath.startsWith('src/')) return 'src-local';
  return 'other';
}

function countTestFiles() {
  const files = [
    ...walkFiles(path.join(rootDir, 'tests'), file => TEST_FILE_PATTERN.test(file)),
    ...walkFiles(path.join(rootDir, 'src'), file => TEST_FILE_PATTERN.test(file)),
  ].map(toRelative);

  const byArea = {};
  for (const file of files) {
    const area = getTestArea(file);
    byArea[area] = (byArea[area] || 0) + 1;
  }

  return {
    total: files.length,
    byArea,
  };
}

function readCoverage() {
  const summaryPath = path.join(rootDir, 'coverage', 'coverage-summary.json');
  if (!fs.existsSync(summaryPath)) {
    return null;
  }

  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const total = summary.total;
  if (!total) return null;

  return Object.fromEntries(
    Object.entries(COVERAGE_THRESHOLDS).map(([metric, threshold]) => {
      const pct = total[metric]?.pct ?? 0;
      return [metric, {
        pct,
        threshold,
        passed: pct >= threshold,
      }];
    }),
  );
}

function summarizePlaywrightResults() {
  const resultsPath = path.join(rootDir, 'tests', 'playwright-report', 'results.json');
  if (!fs.existsSync(resultsPath)) {
    return null;
  }

  const report = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
  const summary = {
    total: 0,
    files: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    withoutResults: 0,
    timedOut: 0,
    interrupted: 0,
    other: 0,
  };
  const files = new Set();

  function visitSuite(suite) {
    for (const spec of suite.specs || []) {
      if (typeof spec.file === 'string') {
        files.add(spec.file);
      }
      for (const test of spec.tests || []) {
        summary.total += 1;
        if (!Array.isArray(test.results) || test.results.length === 0) {
          summary.withoutResults += 1;
        }
        const status = test.status === 'expected'
          ? 'passed'
          : test.status === 'unexpected'
            ? 'failed'
            : test.status;
        if (Object.prototype.hasOwnProperty.call(summary, status)) {
          summary[status] += 1;
        } else {
          summary.other += 1;
        }
      }
    }

    for (const child of suite.suites || []) {
      visitSuite(child);
    }
  }

  for (const suite of report.suites || []) {
    visitSuite(suite);
  }

  summary.files = files.size;
  return summary;
}

function countExplicitSkips() {
  const testDirs = [
    path.join(rootDir, 'tests', 'e2e'),
    path.join(rootDir, 'tests', 'startup'),
    path.join(rootDir, 'tests', 'performance'),
    path.join(rootDir, 'tests', 'visual'),
  ];
  const files = testDirs.flatMap(dir => walkFiles(dir, file => TEST_FILE_PATTERN.test(file)));
  const byFile = [];
  let total = 0;

  for (const file of files) {
    const content = fs.readFileSync(file, 'utf8');
    const count = [...content.matchAll(SKIP_PATTERN)].length;
    if (count > 0) {
      total += count;
      byFile.push({
        file: toRelative(file),
        count,
      });
    }
  }

  byFile.sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
  return { total, byFile };
}

function buildTodos(coverage, playwright, explicitSkips, testFiles) {
  const todos = [];
  const browserTestFileCount = ['e2e', 'startup', 'performance', 'visual']
    .reduce((total, area) => total + (testFiles.byArea[area] || 0), 0);

  if (!coverage) {
    todos.push('Generate Vitest coverage before auditing: npm run test:coverage -- --run --reporter=dot --maxWorkers=2 --silent');
  } else {
    for (const [metric, result] of Object.entries(coverage)) {
      if (!result.passed) {
        todos.push(`Raise ${metric} coverage from ${result.pct}% to at least ${result.threshold}%.`);
      }
    }
  }

  if (!playwright) {
    todos.push('Run Playwright once so tests/playwright-report/results.json exists.');
  } else if (playwright.total > 0 && playwright.passed === 0) {
    todos.push(`Produce executable Playwright regression evidence: current report has 0 passed tests across ${playwright.total} listed tests.`);
  } else if (playwright.skipped > 0) {
    todos.push(`Reduce skipped Playwright tests: ${playwright.skipped}/${playwright.total} are skipped.`);
  }

  if (playwright && playwright.files > 0 && playwright.files < browserTestFileCount) {
    todos.push(`Broaden Playwright execution: current JSON report covers ${playwright.files}/${browserTestFileCount} browser-facing test files.`);
  }

  if (explicitSkips.total > 0) {
    todos.push(`Review ${explicitSkips.total} explicit skip/fixme calls in browser-facing tests.`);
  }

  return todos;
}

function printAudit(audit) {
  console.log('Regression test audit');
  console.log('='.repeat(22));
  console.log(`Test files: ${audit.testFiles.total}`);
  console.log(`By area: ${JSON.stringify(audit.testFiles.byArea)}`);

  if (audit.coverage) {
    console.log('Coverage:');
    for (const [metric, result] of Object.entries(audit.coverage)) {
      const status = result.passed ? 'pass' : 'fail';
      console.log(`  ${metric}: ${result.pct}% / ${result.threshold}% (${status})`);
    }
  } else {
    console.log('Coverage: missing coverage/coverage-summary.json');
  }

  if (audit.playwright) {
    console.log(`Playwright: ${audit.playwright.passed} passed, ${audit.playwright.failed} failed, ${audit.playwright.skipped} skipped/no-result, ${audit.playwright.total} total across ${audit.playwright.files} files`);
    if (audit.playwright.withoutResults > 0) {
      console.log(`Playwright tests without execution results: ${audit.playwright.withoutResults}`);
    }
  } else {
    console.log('Playwright: missing tests/playwright-report/results.json');
  }

  console.log(`Explicit browser-test skips: ${audit.explicitSkips.total}`);
  for (const item of audit.explicitSkips.byFile.slice(0, 10)) {
    console.log(`  ${item.file}: ${item.count}`);
  }

  console.log('Todos:');
  if (audit.todos.length === 0) {
    console.log('  None from automated audit.');
  } else {
    for (const todo of audit.todos) {
      console.log(`  - ${todo}`);
    }
  }
}

const audit = {
  generatedAt: new Date().toISOString(),
  testFiles: countTestFiles(),
  coverage: readCoverage(),
  playwright: summarizePlaywrightResults(),
  explicitSkips: countExplicitSkips(),
};

audit.todos = buildTodos(audit.coverage, audit.playwright, audit.explicitSkips, audit.testFiles);

fs.mkdirSync(reportsDir, { recursive: true });
fs.writeFileSync(outputFile, `${JSON.stringify(audit, null, 2)}\n`);

printAudit(audit);
console.log(`\nWrote ${toRelative(outputFile)}`);
