/**
 * Release helpers: validate version/tag rules, extract CHANGELOG notes,
 * package dist artifacts with build-info and SHA256SUMS.
 *
 * Usage:
 *   tsx scripts/release/prepare-release.ts validate [--tag vX.Y.Z]
 *   tsx scripts/release/prepare-release.ts notes [--version X.Y.Z] [--out path]
 *   tsx scripts/release/prepare-release.ts package [--version X.Y.Z]
 */
import { createHash } from 'node:crypto';
import {
  createReadStream,
  existsSync,
  mkdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHANGELOG_PATH = join(ROOT, 'docs/CHANGELOG.md');
const PACKAGE_JSON_PATH = join(ROOT, 'package.json');
const DIST_DIR = join(ROOT, 'dist');
const ARTIFACTS_DIR = join(ROOT, 'release-artifacts');

const PRE_RELEASE_RE = /-(alpha|beta|rc)(\.|$)/i;
const SEMVER_RE =
  /^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)(?:\.\d+)?)?$/i;

type PackageJson = { version: string; name?: string };

function readPackageVersion(): string {
  const pkg = JSON.parse(readFileSync(PACKAGE_JSON_PATH, 'utf8')) as PackageJson;
  if (!pkg.version) {
    throw new Error('package.json missing version');
  }
  return pkg.version;
}

function normalizeTag(tag: string): string {
  return tag.startsWith('v') ? tag.slice(1) : tag;
}

function isPreRelease(version: string): boolean {
  return PRE_RELEASE_RE.test(version);
}

function parseArgs(argv: string[]): { command: string; flags: Record<string, string> } {
  const [command = 'help', ...rest] = argv;
  const flags: Record<string, string> = {};
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (!token?.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else {
      flags[key] = 'true';
    }
  }
  return { command, flags };
}

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function resolveTagVersion(flags: Record<string, string>): string {
  if (flags.tag) return normalizeTag(flags.tag);
  if (flags.version) return normalizeTag(flags.version);
  const envTag = process.env.GITHUB_REF_NAME || process.env.RELEASE_TAG || '';
  if (envTag.startsWith('v') || SEMVER_RE.test(envTag)) {
    return normalizeTag(envTag);
  }
  return readPackageVersion();
}

/** Extract ## [version] section from CHANGELOG (until next ## ). */
export function extractChangelogSection(changelog: string, version: string): string {
  const headingRe = new RegExp(
    `^## \\[${escapeRegExp(version)}\\][^\\n]*\\n`,
    'm'
  );
  const match = headingRe.exec(changelog);
  if (!match || match.index === undefined) {
    throw new Error(
      `CHANGELOG.md has no section for [${version}]. Add it before releasing.`
    );
  }
  const start = match.index + match[0].length;
  const rest = changelog.slice(start);
  const nextHeading = /^## \[/m.exec(rest);
  const body = (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
  return `## [${version}]\n\n${body}\n`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildReleaseBody(version: string, changelogSection: string): string {
  const channel = isPreRelease(version)
    ? version.includes('-rc')
      ? 'Release Candidate'
      : version.includes('-beta')
        ? 'Beta'
        : 'Alpha'
    : 'Stable (GA)';
  const sha = git('rev-parse HEAD') || process.env.GITHUB_SHA || 'unknown';
  const shortSha = sha.slice(0, 12);
  const buildTime = new Date().toISOString();
  const productionVerification = version === '3.0.7-rc.1';
  const preNote = isPreRelease(version)
    ? productionVerification
      ? '\n> ⚠ 预发布候选，已批准覆盖生产域进行验证；GitHub Latest 应仍指向最新 GA。\n'
      : '\n> ⚠ 预发布候选，**不要**默认用于生产。GitHub Latest 应仍指向最新 GA。\n'
    : '';

  // Prefer full CHANGELOG section; never invent a shorter substitute.
  // Historical RC / baseline narratives stay in docs/CHANGELOG.md and README.
  return `## SOPs ${version}

**发布通道：** ${channel}  
**环境：** ${productionVerification ? 'Production verification' : isPreRelease(version) ? 'Staging' : 'Production'}${'  '}
**部署目标：** https://sops.hongecb.store  
**Git tag：** v${version}  
**Commit：** \`${shortSha}\`  
**构建时间：** ${buildTime}
${preNote}
### 运维与部署

- 产物：\`sops-dist-${version}.zip\`、\`build-info.json\`、\`SHA256SUMS.txt\`
- 回滚：上一 GA 见 GitHub Releases（Latest 以外的正式版）；README「最新发布」保留完整历史发版描述
- 验证：首页可达、核心路由可进、LLM 网关连通、\`npm run test:e2e:smoke\`
- 部署步骤：docs/DEPLOYMENT.md
- 发布策略：docs/RELEASE_POLICY.md（禁止删减历史发版叙述；CHANGELOG 为 SSOT）

### 完整变更

以下正文直接摘自 \`docs/CHANGELOG.md\` 的 \`${version}\` 章节（**完整保留，不压缩**）。  
更早 RC / 基线的逐条描述见同文件各历史章节与仓库 README「最新发布」。

---

### CHANGELOG

${changelogSection.trim()}
`;
}

function commandValidate(flags: Record<string, string>): void {
  const pkgVersion = readPackageVersion();
  const tagVersion = resolveTagVersion(flags);

  if (!SEMVER_RE.test(pkgVersion)) {
    throw new Error(`package.json version is not supported semver: ${pkgVersion}`);
  }
  if (!SEMVER_RE.test(tagVersion)) {
    throw new Error(`tag/version is not supported semver: ${tagVersion}`);
  }
  if (pkgVersion !== tagVersion) {
    throw new Error(
      `Version mismatch: package.json=${pkgVersion} tag/expected=${tagVersion}`
    );
  }

  // Hard rule: if validating a GA tag name without pre-release, package must match.
  // Pre-release tags must never be treated as GA by callers (workflow sets --prerelease).
  if (isPreRelease(tagVersion)) {
    console.log(`OK: pre-release version ${tagVersion} (must publish as GitHub Pre-release)`);
  } else {
    console.log(`OK: GA version ${tagVersion} (eligible for GitHub Latest)`);
  }

  // Ensure CHANGELOG section exists
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  extractChangelogSection(changelog, tagVersion);
  console.log(`OK: CHANGELOG section found for ${tagVersion}`);
  console.log(`OK: pre-release flag should be: ${isPreRelease(tagVersion)}`);
}

function commandNotes(flags: Record<string, string>): void {
  const version = resolveTagVersion(flags);
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  const section = extractChangelogSection(changelog, version);
  const body = buildReleaseBody(version, section);
  const outPath = flags.out
    ? resolve(ROOT, flags.out)
    : join(ARTIFACTS_DIR, 'RELEASE_BODY.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body, 'utf8');
  console.log(`Wrote release notes: ${relative(ROOT, outPath)}`);
  // Also print path for CI
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `notes_path=${outPath}\n`, {
      flag: 'a',
    });
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `is_prerelease=${isPreRelease(version)}\n`,
      { flag: 'a' }
    );
    writeFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`, {
      flag: 'a',
    });
  }
}

async function sha256File(filePath: string): Promise<string> {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

/**
 * Create dist archive without extra deps: prefer tar zip, then PowerShell, then tar.gz.
 */
async function createDistArchive(version: string): Promise<string> {
  if (!existsSync(DIST_DIR)) {
    throw new Error('dist/ missing. Run build before release:package.');
  }

  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  const zipName = `sops-dist-${version}.zip`;
  const zipPath = join(ARTIFACTS_DIR, zipName);

  // Prefer tar (Git Bash / GitHub runners often have it). Format zip if possible.
  try {
    if (existsSync(zipPath)) {
      // overwrite
    }
    execSync(`tar -a -cf "${zipPath}" -C "${DIST_DIR}" .`, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    if (existsSync(zipPath) && statSync(zipPath).size > 0) {
      return zipPath;
    }
  } catch {
    // fall through
  }

  // Fallback: gzip a single tar stream built manually is heavy; use PowerShell Compress-Archive
  try {
    const ps = `Compress-Archive -Path (Join-Path '${DIST_DIR}' '*') -DestinationPath '${zipPath}' -Force`;
    execSync(`powershell -NoProfile -Command "${ps}"`, {
      cwd: ROOT,
      stdio: 'inherit',
    });
    if (existsSync(zipPath)) return zipPath;
  } catch {
    // fall through
  }

  // Last resort: write a .tar.gz using only Node streams (directory walk + simple concat is not tar).
  // Emit gzipped concatenated file list is wrong. Create a minimal tar.gz via `tar -czf` if zip failed.
  const tgzPath = join(ARTIFACTS_DIR, `sops-dist-${version}.tar.gz`);
  try {
    execSync(`tar -czf "${tgzPath}" -C "${DIST_DIR}" .`, {
      cwd: ROOT,
      stdio: 'inherit',
      shell: true,
    });
    return tgzPath;
  } catch (error) {
    throw new Error(
      `Failed to create dist archive. Install tar or use PowerShell Compress-Archive. ${String(error)}`
    );
  }
}

async function commandPackage(flags: Record<string, string>): Promise<void> {
  const version = resolveTagVersion(flags);
  const sha = git('rev-parse HEAD') || process.env.GITHUB_SHA || 'unknown';
  const shortSha = sha.slice(0, 12);
  const nodeVersion = process.version;
  const buildTime = new Date().toISOString();

  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const buildInfo = {
    name: 'sops',
    version,
    gitSha: sha,
    gitShaShort: shortSha,
    nodeVersion,
    buildTime,
    distPresent: existsSync(DIST_DIR),
    homepage: 'https://sops.hongecb.store',
  };
  const buildInfoPath = join(ARTIFACTS_DIR, 'build-info.json');
  writeFileSync(buildInfoPath, `${JSON.stringify(buildInfo, null, 2)}\n`, 'utf8');

  const archivePath = await createDistArchive(version);
  const archiveName = archivePath.split(/[/\\]/).pop() || 'archive';

  const sums: string[] = [];
  for (const file of [archivePath, buildInfoPath]) {
    const digest = await sha256File(file);
    const name = file.split(/[/\\]/).pop() || file;
    sums.push(`${digest}  ${name}`);
  }
  const sumsPath = join(ARTIFACTS_DIR, 'SHA256SUMS.txt');
  writeFileSync(sumsPath, `${sums.join('\n')}\n`, 'utf8');

  console.log(`Artifacts in ${relative(ROOT, ARTIFACTS_DIR)}:`);
  console.log(`  - ${archiveName}`);
  console.log('  - build-info.json');
  console.log('  - SHA256SUMS.txt');
}

function printHelp(): void {
  console.log(`Usage:
  tsx scripts/release/prepare-release.ts validate [--tag vX.Y.Z]
  tsx scripts/release/prepare-release.ts notes [--version X.Y.Z] [--out path]
  tsx scripts/release/prepare-release.ts package [--version X.Y.Z]
`);
}

async function main(): Promise<void> {
  const { command, flags } = parseArgs(process.argv.slice(2));
  switch (command) {
    case 'validate':
      commandValidate(flags);
      break;
    case 'notes':
      commandNotes(flags);
      break;
    case 'package':
      await commandPackage(flags);
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      printHelp();
      throw new Error(`Unknown command: ${command}`);
  }
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
