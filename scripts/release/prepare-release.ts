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
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { execFileSync, execSync } from 'node:child_process';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHANGELOG_PATH = join(ROOT, 'docs/CHANGELOG.md');
const PACKAGE_JSON_PATH = join(ROOT, 'package.json');
const DIST_DIR = join(ROOT, 'dist');
const ARTIFACTS_DIR = join(ROOT, 'release-artifacts');

const PRE_RELEASE_RE = /-(alpha|beta|rc)(\.|$)/i;
const SEMVER_RE = /^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc)(?:\.\d+)?)?$/i;

type PackageJson = { version: string; name?: string };
type ReleaseTarget = { version: string; tag?: string };
type ValidatedReleaseContext = {
  version: string;
  tag?: string;
  changelog: string;
  sha?: string;
};

export type ReleaseTagBinding = {
  tag: string;
  exists: boolean;
  objectType?: string;
  tagSha?: string;
  headSha: string;
};

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

function gitRaw(args: readonly string[]): string {
  return execFileSync('git', args, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function git(args: readonly string[]): string {
  return gitRaw(args).trim();
}

function gitSucceeds(args: readonly string[]): boolean {
  try {
    execFileSync('git', args, {
      cwd: ROOT,
      stdio: 'ignore',
    });
    return true;
  } catch {
    return false;
  }
}

export function resolveCleanReleaseCommit(status: string, headSha: string): string {
  const changes = status
    .split(/\r?\n/)
    .filter(entry => entry && !entry.startsWith('!! ') && entry !== ' M docs/XSS_SCAN_REPORT.md');
  if (changes.length > 0) {
    throw new Error(
      'Release notes and packages require a clean git worktree. Commit or stash changes before releasing.'
    );
  }

  const sha = headSha.trim();
  if (!sha) {
    throw new Error('Unable to resolve git HEAD for release metadata.');
  }
  return sha;
}

function resolveReleaseCommit(): string {
  return resolveCleanReleaseCommit(
    gitRaw(['status', '--porcelain=v1', '--untracked-files=all']),
    git(['rev-parse', 'HEAD'])
  );
}

export function assertAnnotatedTagAtHead(binding: ReleaseTagBinding): void {
  if (!binding.exists) {
    throw new Error(`Release tag does not exist: ${binding.tag}`);
  }
  if (binding.objectType !== 'tag') {
    throw new Error(`Release tag must be annotated: ${binding.tag}`);
  }
  if (!binding.tagSha || binding.tagSha.trim() !== binding.headSha.trim()) {
    throw new Error(
      `Release tag/HEAD mismatch: tag=${binding.tagSha || 'unresolved'} HEAD=${binding.headSha}`
    );
  }
}

function resolveReleaseTarget(flags: Record<string, string>): ReleaseTarget {
  const environmentTag =
    process.env.RELEASE_TAG ||
    (process.env.GITHUB_REF_TYPE === 'tag' ? process.env.GITHUB_REF_NAME || '' : '');
  const tag = flags.tag || environmentTag || undefined;
  const version = normalizeTag(flags.version || tag || readPackageVersion());

  if (tag && normalizeTag(tag) !== version) {
    throw new Error(`Version mismatch: tag=${tag} version=${version}`);
  }

  return { version, tag };
}

function assertTagBinding(tag: string, headSha: string): void {
  const tagRef = `refs/tags/${tag}`;
  if (!gitSucceeds(['show-ref', '--verify', '--quiet', tagRef])) {
    assertAnnotatedTagAtHead({ tag, exists: false, headSha });
    return;
  }

  const objectType = git(['cat-file', '-t', tagRef]);
  if (objectType !== 'tag') {
    assertAnnotatedTagAtHead({ tag, exists: true, objectType, headSha });
    return;
  }

  assertAnnotatedTagAtHead({
    tag,
    exists: true,
    objectType,
    tagSha: git(['rev-parse', `${tag}^{commit}`]),
    headSha,
  });
}

function resolveValidatedReleaseContext(
  flags: Record<string, string>,
  requireClean: boolean
): ValidatedReleaseContext {
  const { tag, version } = resolveReleaseTarget(flags);
  const packageVersion = readPackageVersion();

  if (!SEMVER_RE.test(packageVersion)) {
    throw new Error(`package.json version is not supported semver: ${packageVersion}`);
  }
  if (!SEMVER_RE.test(version)) {
    throw new Error(`tag/version is not supported semver: ${version}`);
  }
  if (packageVersion !== version) {
    throw new Error(`Version mismatch: package.json=${packageVersion} tag/expected=${version}`);
  }
  if (tag && tag !== `v${version}`) {
    throw new Error(`Release tag must include the v prefix: ${tag}`);
  }

  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');
  extractChangelogSection(changelog, version);
  const sha = requireClean ? resolveReleaseCommit() : tag ? git(['rev-parse', 'HEAD']) : undefined;

  if (tag && sha) {
    assertTagBinding(tag, sha);
  }

  return { version, tag, changelog, sha };
}

/** Extract ## [version] section from CHANGELOG (until next ## ). */
export function extractChangelogSection(changelog: string, version: string): string {
  const headingRe = new RegExp(`^## \\[${escapeRegExp(version)}\\][^\\n]*\\n`, 'm');
  const match = headingRe.exec(changelog);
  if (!match || match.index === undefined) {
    throw new Error(`CHANGELOG.md has no section for [${version}]. Add it before releasing.`);
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

export function buildReleaseBody(
  version: string,
  changelogSection: string,
  sha = 'unknown'
): string {
  const channel = isPreRelease(version)
    ? version.includes('-rc')
      ? 'Release Candidate'
      : version.includes('-beta')
        ? 'Beta'
        : 'Alpha'
    : 'Stable (GA)';
  const shortSha = sha.slice(0, 12);
  const buildTime = new Date().toISOString();
  const productionVerification = version.startsWith('3.0.7-rc.');
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

### 发版后冒烟（OPS — 提交 Release 前确认）

- [ ] \`https://sops.hongecb.store\`（或本版部署目标）可打开
- [ ] 浏览器控制台无致命红错
- [ ] 系统设置可打开；侧栏一级/二级可点
- [ ] AI 连接：测试连接（值班自有 Key）
- [ ] 一处工具主路径冒烟（如 Deep Chat 发一句或打开分析页）
- [ ] CSP \`connect-src\` 仍含网关域（\`new.hongecb.store\`）
- [ ] 自动化：\`npm run test:e2e:smoke\`（CI 或本地）已绿

### 无障碍发版抽检（A11y — RC 建议 / GA 必做）

- [ ] Tab 可达顶栏 → 主内容；focus-visible 可见
- [ ] 系统设置：Esc / 脏数据确认可用键盘
- [ ] 确认弹层：焦点在对话框内，关闭后焦点不丢
- [ ] 至少一处业务主 CTA 可键盘触发
- [ ] 图标按钮有 accessible name（抽检）

### 完整变更

以下正文直接摘自 \`docs/CHANGELOG.md\` 的 \`${version}\` 章节（**完整保留，不压缩**）。  
更早 RC / 基线的逐条描述见同文件各历史章节与仓库 README「最新发布」。

---

### CHANGELOG

${changelogSection.trim()}
`;
}

function commandValidate(flags: Record<string, string>): void {
  const { tag, version } = resolveValidatedReleaseContext(flags, false);

  // Hard rule: if validating a GA tag name without pre-release, package must match.
  // Pre-release tags must never be treated as GA by callers (workflow sets --prerelease).
  if (isPreRelease(version)) {
    console.log(`OK: pre-release version ${version} (must publish as GitHub Pre-release)`);
  } else {
    console.log(`OK: GA version ${version} (eligible for GitHub Latest)`);
  }

  console.log(`OK: CHANGELOG section found for ${version}`);
  if (tag) {
    console.log(`OK: annotated tag ${tag} points at HEAD`);
  }
  console.log(`OK: pre-release flag should be: ${isPreRelease(version)}`);
}

function commandNotes(flags: Record<string, string>): void {
  const { changelog, sha, version } = resolveValidatedReleaseContext(flags, true);
  if (!sha) {
    throw new Error('Unable to resolve git HEAD for release notes.');
  }
  const section = extractChangelogSection(changelog, version);
  const body = buildReleaseBody(version, section, sha);
  const outPath = flags.out ? resolve(ROOT, flags.out) : join(ARTIFACTS_DIR, 'RELEASE_BODY.md');
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, body, 'utf8');
  console.log(`Wrote release notes: ${relative(ROOT, outPath)}`);
  // Also print path for CI
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `notes_path=${outPath}\n`, {
      flag: 'a',
    });
    writeFileSync(process.env.GITHUB_OUTPUT, `is_prerelease=${isPreRelease(version)}\n`, {
      flag: 'a',
    });
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

export function clearCurrentVersionArchives(artifactsDir: string, version: string): void {
  for (const extension of ['zip', 'tar.gz']) {
    rmSync(join(artifactsDir, `sops-dist-${version}.${extension}`), { force: true });
  }
}

async function commandPackage(flags: Record<string, string>): Promise<void> {
  const { sha, version } = resolveValidatedReleaseContext(flags, true);
  if (!sha) {
    throw new Error('Unable to resolve git HEAD for release package.');
  }
  const shortSha = sha.slice(0, 12);
  const nodeVersion = process.version;
  const buildTime = new Date().toISOString();

  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  clearCurrentVersionArchives(ARTIFACTS_DIR, version);

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

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
