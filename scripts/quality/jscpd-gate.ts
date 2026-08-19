/**
 * jscpd duplication gate (Level 1 engineering hardening).
 *
 * Usage:
 *   pnpm jscpd:gate                        # verify duplication is within the
 *                                          # threshold defined in config/.jscpdrc.json
 *   pnpm jscpd:gate --update                # print current stats without failing
 *                                          # (useful when intentionally raising
 *                                          # the baseline, followed by editing
 *                                          # config/.jscpdrc.json threshold)
 *
 * The raw threshold check is delegated to the jscpd CLI itself (its exit code
 * already implements "duplications >= threshold => failure"). This script adds
 * a human-readable summary so CI logs show the actual duplication percentage,
 * and a --threshold CLI override for temporary spikes.
 */
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const configPath = path.join(repoRoot, "config", ".jscpdrc.json");

interface JscpdStats {
  lines?: number;
  tokens?: number;
  sources?: number;
  clones?: number;
  duplicatedLines?: number;
  duplicatedTokens?: number;
  percentage?: number;
  percentageTokens?: number;
  newDuplicatedLines?: number;
  newClones?: number;
  // legacy / fallback keys when parsed from older formats
  totalLines?: number;
  duplicatedLinesFallback?: number;
}

const args = process.argv.slice(2);
const updateMode = args.includes("--update");
const thresholdIdx = args.indexOf("--threshold");
const thresholdOverride =
  thresholdIdx >= 0 ? Number(args[thresholdIdx + 1]) : undefined;

function readJscpdConfig(): { threshold: number; ignore?: string[] } {
  if (!fs.existsSync(configPath)) {
    throw new Error(`jscpd config not found: ${configPath}`);
  }
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function buildArgs(): string[] {
  const base = [
    "--config", configPath,
    "--reporters", "json",
  ];
  if (thresholdOverride !== undefined) {
    base.push("--threshold", String(thresholdOverride));
  }
  return [...base, path.join(repoRoot, "src")];
}

function printSummary(stats: JscpdStats, threshold: number): void {
  console.log("=== jscpd duplication gate ===");
  console.log(`files scanned      : ${stats.sources ?? "n/a"}`);
  console.log(`total lines        : ${stats.lines ?? stats.totalLines ?? "n/a"}`);
  console.log(`duplicated lines   : ${stats.duplicatedLines ?? "n/a"}`);
  console.log(`duplication ratio  : ${(stats.percentage ?? 0).toFixed(2)}%`);
  console.log(`duplicate clones   : ${stats.clones ?? "n/a"}`);
  console.log(`threshold          : ${threshold}%`);
}

async function main(): Promise<number> {
  const cfg = readJscpdConfig();
  const threshold = thresholdOverride ?? cfg.threshold;

  // Run jscpd with the json reporter. Child errors (threshold exceeded) are
  // caught below; other failures propagate.
  const reportDir = path.join(repoRoot, "report");
  fs.mkdirSync(reportDir, { recursive: true });

  let exitCode = 0;
  try {
    execFileSync("jscpd", buildArgs(), { cwd: repoRoot, stdio: "inherit" });
  } catch (err: unknown) {
    const status = (err as { status?: number }).status;
    exitCode = typeof status === "number" ? status : 1;
  }

  let stats: JscpdStats = {};
  try {
    const report = JSON.parse(
      fs.readFileSync(path.join(reportDir, "jscpd-report.json"), "utf8"),
    );
    // jscpd v4 stores the aggregate numbers under statistics.total; fall
    // back to a per-format scan when the summary is absent.
    stats =
      (report.statistics?.total as JscpdStats | undefined) ??
      computeSummary(report.statistics);
  } catch {
    stats = {};
  }

  printSummary(stats, threshold);

  if (exitCode !== 0 && !updateMode) {
    console.error(
      `\njscpd gate failed: duplication ratio (${(stats.percentage ?? 0).toFixed(2)}%) ` +
        `exceeds the threshold (${threshold}%).`,
    );
    console.error(
      "See the report above for the duplicated fragments. To raise the bar " +
        "legitimately, reduce duplication first; to acknowledge a measured " +
        "increase, update `threshold` in config/.jscpdrc.json via PR review.",
    );
    return 1;
  }

  if (updateMode) {
    console.log("(update mode: no failure on threshold breach)");
  }
  return 0;
}

/** Fallback: aggregate per-file duplication stats from the formats map.
 * jscpd v4 json reporter stores formats as { typescript: [...], css: [...] }
 * where each value is an ARRAY of per-source entries (a trailing "total"
 * entry carries the aggregate). */
function computeSummary(statistics?: Record<string, unknown>): JscpdStats {
  if (!statistics || typeof statistics !== "object") {
    return {};
  }
  const formats = statistics.formats as
    | Record<string, Array<Record<string, number>>>
    | undefined;
  if (!formats) {
    return {};
  }
  let totalLines = 0;
  let duplicatedLines = 0;
  let totalFiles = 0;
  for (const [format, entries] of Object.entries(formats)) {
    if (format === "total" || !Array.isArray(entries)) continue;
    for (const info of entries) {
      totalFiles += 1;
      totalLines += info.lines ?? 0;
      duplicatedLines += info.duplicatedLines ?? 0;
    }
  }
  return {
    sources: totalFiles,
    lines: totalLines,
    duplicatedLines,
    percentage: totalLines > 0 ? (100 * duplicatedLines) / totalLines : 0,
  };
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(2);
  });
