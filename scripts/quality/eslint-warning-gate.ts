import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

type ESLintSeverity = 0 | 1 | 2;

interface ESLintMessage {
  ruleId: string | null;
  severity: ESLintSeverity;
  message: string;
  line?: number;
  column?: number;
}

interface ESLintResult {
  filePath: string;
  messages: ESLintMessage[];
}

interface WarningBaselineEntry {
  filePath: string;
  ruleId: string;
  message: string;
  count: number;
}

interface WarningBaseline {
  version: 1;
  command: string;
  totalWarnings: number;
  warnings: WarningBaselineEntry[];
}

interface WarningInstance {
  filePath: string;
  ruleId: string;
  message: string;
  line: number;
  column: number;
}

interface WarningBucket {
  entry: WarningBaselineEntry;
  examples: WarningInstance[];
}

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baselinePath = path.join(repoRoot, "config", "eslint-warning-baseline.json");
const eslintArgs = [
  "src",
  "--ignore-pattern",
  "**/*.test.ts",
  "--ignore-pattern",
  "**/*.test.tsx",
  "--ignore-pattern",
  "**/*.spec.ts",
  "--ignore-pattern",
  "**/*.spec.tsx",
  "--format",
  "json",
];

function normalizePath(filePath: string): string {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function getWarningKey(entry: Pick<WarningBaselineEntry, "filePath" | "ruleId" | "message">): string {
  return JSON.stringify([entry.filePath, entry.ruleId, entry.message]);
}

function runESLint(): ESLintResult[] {
  const eslintBin = path.join(repoRoot, "node_modules", "eslint", "bin", "eslint.js");

  try {
    const output = execFileSync(process.execPath, [eslintBin, ...eslintArgs], {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
      stdio: ["ignore", "pipe", "pipe"],
    });

    return JSON.parse(output) as ESLintResult[];
  } catch (error: unknown) {
    const execError = error as { stdout?: string | Buffer };
    if (!execError.stdout) {
      throw error;
    }

    const output = execError.stdout.toString();
    return JSON.parse(output) as ESLintResult[];
  }
}

function collectWarnings(results: ESLintResult[]): WarningInstance[] {
  return results.flatMap((result) =>
    result.messages
      .filter((message) => message.severity === 1)
      .map((message) => ({
        filePath: normalizePath(result.filePath),
        ruleId: message.ruleId || "unknown-rule",
        message: message.message,
        line: message.line || 0,
        column: message.column || 0,
      })),
  );
}

function bucketWarnings(warnings: WarningInstance[]): Map<string, WarningBucket> {
  const buckets = new Map<string, WarningBucket>();

  warnings.forEach((warning) => {
    const key = getWarningKey(warning);
    const bucket = buckets.get(key);

    if (bucket) {
      bucket.entry.count += 1;
      bucket.examples.push(warning);
      return;
    }

    buckets.set(key, {
      entry: {
        filePath: warning.filePath,
        ruleId: warning.ruleId,
        message: warning.message,
        count: 1,
      },
      examples: [warning],
    });
  });

  return buckets;
}

function readBaseline(): WarningBaseline {
  if (!fs.existsSync(baselinePath)) {
    throw new Error(`ESLint warning baseline not found: ${baselinePath}`);
  }

  return JSON.parse(fs.readFileSync(baselinePath, "utf8")) as WarningBaseline;
}

function getExceededBuckets(warnings: WarningInstance[], baseline: WarningBaseline): WarningBucket[] {
  const baselineCounts = new Map(
    baseline.warnings.map((entry) => [getWarningKey(entry), entry.count]),
  );

  return Array.from(bucketWarnings(warnings).values())
    .filter((bucket) => bucket.entry.count > (baselineCounts.get(getWarningKey(bucket.entry)) || 0))
    .sort((a, b) => getWarningKey(a.entry).localeCompare(getWarningKey(b.entry)));
}

function printExceededBuckets(newBuckets: WarningBucket[], baseline: WarningBaseline): void {
  const baselineCounts = new Map(
    baseline.warnings.map((entry) => [getWarningKey(entry), entry.count]),
  );

  const newWarningCount = newBuckets.reduce((sum, bucket) => {
    const allowed = baselineCounts.get(getWarningKey(bucket.entry)) || 0;
    return sum + bucket.entry.count - allowed;
  }, 0);

  console.error(`ESLint warning gate failed: ${newWarningCount} warning(s) exceed the baseline.`);
  newBuckets.slice(0, 20).forEach((bucket) => {
    const allowed = baselineCounts.get(getWarningKey(bucket.entry)) || 0;
    const example = bucket.examples[0];
    console.error(
      `${example.filePath}:${example.line}:${example.column} ${bucket.entry.ruleId} +${bucket.entry.count - allowed} ${bucket.entry.message}`,
    );
  });

  if (newBuckets.length > 20) {
    console.error(`...and ${newBuckets.length - 20} more warning bucket(s).`);
  }
}

function writeBaseline(warnings: WarningInstance[]): void {
  if (fs.existsSync(baselinePath) && !process.argv.includes("--allow-new-warnings")) {
    const baseline = readBaseline();
    const exceededBuckets = getExceededBuckets(warnings, baseline);

    if (exceededBuckets.length > 0) {
      printExceededBuckets(exceededBuckets, baseline);
      console.error(
        "Baseline update refused because it would accept new warnings. Remove the new warnings before updating.",
      );
      process.exit(1);
    }
  }

  const entries = Array.from(bucketWarnings(warnings).values())
    .map((bucket) => bucket.entry)
    .sort((a, b) => getWarningKey(a).localeCompare(getWarningKey(b)));

  const baseline: WarningBaseline = {
    version: 1,
    command: `node node_modules/eslint/bin/eslint.js ${eslintArgs.join(" ")}`,
    totalWarnings: warnings.length,
    warnings: entries,
  };

  fs.writeFileSync(baselinePath, `${JSON.stringify(baseline, null, 2)}\n`);
  console.log(`ESLint warning baseline updated: ${warnings.length} warning(s)`);
}

function checkBaseline(warnings: WarningInstance[]): void {
  const baseline = readBaseline();
  const newBuckets = getExceededBuckets(warnings, baseline);

  if (newBuckets.length === 0) {
    console.log(`ESLint warning gate passed: ${warnings.length}/${baseline.totalWarnings} warning(s)`);
    return;
  }

  printExceededBuckets(newBuckets, baseline);
  console.error("Run npm run lint:warning-baseline after removing warnings to refresh the lower baseline.");
  process.exit(1);
}

const warnings = collectWarnings(runESLint());

if (process.argv.includes("--update")) {
  writeBaseline(warnings);
} else {
  checkBaseline(warnings);
}
