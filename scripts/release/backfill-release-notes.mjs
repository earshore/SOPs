/**
 * Backfill GitHub Release notes from docs/CHANGELOG.md (full section, no compression).
 *
 * Usage:
 *   node scripts/release/backfill-release-notes.mjs
 *   node scripts/release/backfill-release-notes.mjs --dry-run
 *   node scripts/release/backfill-release-notes.mjs --only 3.0.4,3.0.4-rc.11
 */
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTagOnlyArchiveVersion } from './release-history-policy.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHANGELOG_PATH = join(ROOT, 'docs/CHANGELOG.md');
const OUT_DIR = join(ROOT, 'release-artifacts/backfill');
const PRE_RE = /-(alpha|beta|rc)(\.|$)/i;

const DEFAULT_VERSIONS = [
  '3.0.7-rc.2',
  '3.0.7-rc.1',
  '3.0.6',
  '3.0.5',
  '3.0.4',
  '3.0.4-rc.11',
  '3.0.4-rc.10',
  '3.0.4-rc.9',
  '3.0.4-rc.8',
  '3.0.4-rc.7',
  '3.0.4-rc.6',
  '3.0.4-rc.5',
  '3.0.4-rc.4',
  '3.0.4-rc.3',
  '3.0.4-rc.2',
  '3.0.4-rc.1',
];

function sh(cmd, opts = {}) {
  const out = execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
    maxBuffer: 10 * 1024 * 1024,
  });
  if (out == null) return '';
  return String(out).trim();
}

function parseArgs(argv) {
  const flags = { dryRun: false, only: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--dry-run') flags.dryRun = true;
    if (argv[i] === '--only' && argv[i + 1]) {
      flags.only = argv[i + 1].split(',').map((s) => s.trim()).filter(Boolean);
      i += 1;
    }
  }
  return flags;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractChangelogSection(changelog, version) {
  const headingRe = new RegExp(`^## \\[${escapeRegExp(version)}\\][^\\n]*\\n`, 'm');
  const match = headingRe.exec(changelog);
  if (!match || match.index === undefined) {
    throw new Error(`CHANGELOG has no section for [${version}]`);
  }
  const start = match.index + match[0].length;
  const rest = changelog.slice(start);
  const nextHeading = /^## \[/m.exec(rest);
  const body = (nextHeading ? rest.slice(0, nextHeading.index) : rest).trim();
  return `## [${version}]\n\n${body}\n`;
}

function tagSha(version) {
  const tag = `v${version}`;
  try {
    return sh(`git rev-list -n 1 ${tag}`);
  } catch {
    return sh('git rev-parse HEAD');
  }
}

function isPre(version) {
  return PRE_RE.test(version);
}

function channelOf(version) {
  if (version.includes('-rc')) return 'Release Candidate';
  if (version.includes('-beta')) return 'Beta';
  if (version.includes('-alpha')) return 'Alpha';
  return 'Stable (GA)';
}

function buildBody(version, section, extra = '') {
  const sha = tagSha(version);
  const shortSha = sha.slice(0, 12);
  const pre = isPre(version);
  const productionVerification = version.startsWith('3.0.7-rc.');
  const preNote = pre
    ? productionVerification
      ? '\n> ⚠ 预发布候选，已批准覆盖生产域进行验证；GitHub Latest 应仍指向最新 GA（当前为 `v3.0.6`）。\n'
      : '\n> ⚠ 预发布候选，**不要**默认用于生产。GitHub Latest 应仍指向最新 GA（当前为 `v3.0.6`）。\n'
    : '';

  const rollback =
    version.startsWith('3.0.7-')
      ? '生产回滚：`v3.0.6` 对应的上一条 Pages 部署；GitHub Latest 保持 `v3.0.6`'
      : version === '3.0.6'
      ? '上一 GA：`v3.0.5`'
      : version === '3.0.5'
        ? '上一 GA：`v3.0.4`'
        : version === '3.0.4'
          ? '上一 GA：`v3.0.2`；后继 GA：`v3.0.5`'
          : pre
            ? '后继收口 GA：`v3.0.5`；同线完整叙述见 CHANGELOG 各 RC 章节与 README「最新发布」'
            : '见 GitHub Releases 中更早正式版';

  return `## SOPs ${version}

**发布通道：** ${channelOf(version)}  
**环境：** ${productionVerification ? 'Production verification' : pre ? 'Staging / 历史候选' : 'Production'}${'  '}
**部署目标：** https://sops.hongecb.store  
**Git tag：** v${version}  
**Commit：** \`${shortSha}\`  
**笔记回填：** 自 \`docs/CHANGELOG.md\` 完整章节生成（不压缩）
${preNote}
### 运维与部署

- 产物：自 \`v3.0.4-rc.11\` / \`v3.0.5\` 起附带 \`sops-dist-*.zip\`、\`build-info.json\`、\`SHA256SUMS.txt\`（更早版本可能无归档产物，以源码 tag 为准）
- 回滚：${rollback}
- 验证：首页可达、核心路由可进、LLM 网关连通、\`npm run test:e2e:smoke\`
- 部署步骤：docs/DEPLOYMENT.md
- 发布策略：docs/RELEASE_POLICY.md（禁止删减历史发版叙述；CHANGELOG 为 SSOT）
${extra}
### 完整变更

以下正文直接摘自 \`docs/CHANGELOG.md\` 的 \`${version}\` 章节（**完整保留，不压缩**）。  
更早 / 更晚版本的逐条描述见同文件其他章节与仓库 README「最新发布」。

---

### CHANGELOG

${section.trim()}
`;
}

function deployExtraFor305() {
  return `
### 生产部署记录

- **已部署** Cloudflare Pages 项目 \`sops\`，branch \`main\`
- **生产域名：** https://sops.hongecb.store （HTTP 200，CSP 含 \`https://new.hongecb.store\`）
- **部署预览示例：** https://26139b95.sops-3js.pages.dev
- **应用版本：** package.json / UI = \`3.0.5\`
`;
}

function releaseExists(tag) {
  try {
    sh(`gh release view ${tag}`);
    return true;
  } catch {
    return false;
  }
}

function applyNotes(version, bodyPath, dryRun) {
  const tag = `v${version}`;
  const pre = isPre(version);
  if (dryRun) {
    console.log(`[dry-run] would edit ${tag} pre=${pre} notes=${bodyPath}`);
    return;
  }
  if (pre) {
    sh(`gh release edit ${tag} --prerelease --notes-file "${bodyPath}" --title "${tag}"`, {
      stdio: 'inherit',
    });
  } else if (version === '3.0.6') {
    sh(`gh release edit ${tag} --latest --notes-file "${bodyPath}" --title "${tag}"`, {
      stdio: 'inherit',
    });
  } else {
    // Do not steal Latest from 3.0.6
    sh(`gh release edit ${tag} --notes-file "${bodyPath}" --title "${tag}"`, {
      stdio: 'inherit',
    });
  }
  console.log(`updated ${tag}`);
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const versions = flags.only ?? DEFAULT_VERSIONS;
  mkdirSync(OUT_DIR, { recursive: true });
  const changelog = readFileSync(CHANGELOG_PATH, 'utf8');

  const results = [];
  for (const version of versions) {
    const tag = `v${version}`;
    try {
      if (isTagOnlyArchiveVersion(version)) {
        results.push({ version, status: 'tag-only-archive' });
        console.log(`skip ${tag}: tag-only archive`);
        continue;
      }
      if (!releaseExists(tag)) {
        results.push({ version, status: 'skip-no-release' });
        console.warn(`skip ${tag}: no GitHub release`);
        continue;
      }
      const section = extractChangelogSection(changelog, version);
      const extra = version === '3.0.5' ? deployExtraFor305() : '';
      const body = buildBody(version, section, extra);
      const out = join(OUT_DIR, `RELEASE_BODY_${version}.md`);
      writeFileSync(out, body, 'utf8');
      applyNotes(version, out, flags.dryRun);
      results.push({ version, status: 'ok', bytes: body.length });
    } catch (error) {
      results.push({ version, status: 'error', error: String(error.message || error) });
      console.error(`fail ${version}:`, error.message || error);
    }
  }

  const summaryPath = join(OUT_DIR, 'SUMMARY.json');
  writeFileSync(summaryPath, `${JSON.stringify({ results, dryRun: flags.dryRun }, null, 2)}\n`, 'utf8');
  console.log('summary ->', summaryPath);
  const failed = results.filter((r) => r.status === 'error');
  if (failed.length) process.exitCode = 1;
}

main();
