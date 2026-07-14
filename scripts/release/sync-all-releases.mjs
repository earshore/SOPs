/**
 * Full sync: every GitHub Release gets complete notes; CHANGELOG gets every version section.
 * Never deletes existing CHANGELOG detail — only fills gaps from GitHub bodies.
 *
 * Usage:
 *   node scripts/release/sync-all-releases.mjs --dry-run
 *   node scripts/release/sync-all-releases.mjs
 *   node scripts/release/sync-all-releases.mjs --skip-github   # CHANGELOG only
 *   node scripts/release/sync-all-releases.mjs --skip-changelog # GitHub only
 */
import { execSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const CHANGELOG_PATH = join(ROOT, 'docs/CHANGELOG.md');
const RELEASES_PATH = join(ROOT, 'release-artifacts/all-releases.json');
const OUT_DIR = join(ROOT, 'release-artifacts/sync-all');
const PRE_RE = /-(alpha|beta|rc)(\.|$)/i;

function sh(cmd, opts = {}) {
  const out = execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: opts.stdio ?? ['ignore', 'pipe', 'pipe'],
    maxBuffer: 20 * 1024 * 1024,
  });
  return out == null ? '' : String(out).trim();
}

function parseArgs(argv) {
  return {
    dryRun: argv.includes('--dry-run'),
    skipGithub: argv.includes('--skip-github'),
    skipChangelog: argv.includes('--skip-changelog'),
  };
}

function versionFromTag(tag) {
  return tag.startsWith('v') ? tag.slice(1) : tag;
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

/** Parse loose semver for sort: major.minor.patch[-pre.N] */
function parseSemver(version) {
  const m = version.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-(alpha|beta|rc)(?:\.(\d+))?)?$/i
  );
  if (!m) {
    return { major: 0, minor: 0, patch: 0, preType: 99, preNum: 0, raw: version };
  }
  // Within same major.minor.patch: GA first, then rc/beta/alpha high→low.
  const preMap = { rc: 3, beta: 2, alpha: 1 };
  const isGa = !m[4];
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    preRank: isGa ? 100 : preMap[m[4].toLowerCase()] || 0,
    preNum: m[5] != null ? Number(m[5]) : m[4] ? 0 : 0,
    raw: version,
  };
}

function compareVersionsDesc(a, b) {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa.major !== pb.major) return pb.major - pa.major;
  if (pa.minor !== pb.minor) return pb.minor - pa.minor;
  if (pa.patch !== pb.patch) return pb.patch - pa.patch;
  if (pa.preRank !== pb.preRank) return pb.preRank - pa.preRank;
  return pb.preNum - pa.preNum;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Map version -> full section body without heading */
function parseChangelogSections(text) {
  const map = new Map();
  const lines = text.split(/\r?\n/);
  let current = null;
  let buf = [];
  const flush = () => {
    if (current != null) {
      map.set(current, buf.join('\n').trim());
    }
  };
  for (const line of lines) {
    const m = line.match(/^## \[([^\]]+)\]/);
    if (m) {
      flush();
      current = m[1];
      buf = [];
    } else if (current != null) {
      buf.push(line);
    }
  }
  flush();
  return map;
}

function stripLeadingVersionHeading(text, version) {
  const re = new RegExp(`^## \\[${escapeRegExp(version)}\\][^\\n]*\\r?\\n+`);
  return text.replace(re, '').trim();
}

function dateOnly(iso) {
  if (!iso) return 'unknown';
  return iso.slice(0, 10);
}

function stripGeneratedWrapper(body, version) {
  // If body already has our generated header, keep only CHANGELOG part when possible
  const marker = '### CHANGELOG\n';
  const idx = body.indexOf(marker);
  let raw = idx >= 0 ? body.slice(idx + marker.length).trim() : body.trim();
  raw = stripLeadingVersionHeading(raw, version);
  // Drop nested ops headers if entire generated doc was stored
  if (raw.startsWith('## SOPs ')) {
    const inner = raw.indexOf(marker);
    if (inner >= 0) {
      raw = stripLeadingVersionHeading(raw.slice(inner + marker.length).trim(), version);
    }
  }
  return raw.trim();
}

function sectionFromRelease(version, release, existingBody) {
  // Special-case superseded mistaken line — keep a short stable blurb
  if (version === '3.0.5-rc.1' || version === '3.0.5-rc.2') {
    return [
      '> **Superseded / 已取代**：误标版本线 tag，勿用于生产。请使用 GA `v3.0.5`。',
      '',
      '该 tag 属于曾误标的 `3.0.5-rc` 线，内容已并入冻结线 `3.0.4-rc.*` 并收口于 GA `v3.0.5`。',
      '本条目仅作归档说明，避免孤儿 tag 无文档。',
    ].join('\n');
  }

  if (existingBody && existingBody.length > 40) {
    let body = stripLeadingVersionHeading(existingBody.trim(), version);
    // Unwrap accidentally nested full release templates
    if (body.includes('## SOPs ') || body.includes('### CHANGELOG')) {
      body = stripGeneratedWrapper(body, version);
    }
    if (body.length > 40) return body;
  }
  const raw = stripGeneratedWrapper(release.body || '', version);
  const date = dateOnly(release.published_at);
  const lines = [
    `> Historical notes imported from GitHub Release \`${release.tag_name}\` (${date}).`,
    '',
  ];
  if (raw && !raw.startsWith('## SOPs ')) {
    lines.push(raw);
  } else if (raw) {
    lines.push(stripGeneratedWrapper(raw, version) || raw);
  } else {
    lines.push('### Notes');
    lines.push(`- Release \`${release.tag_name}\` (${release.name || version}).`);
    lines.push('- 原始发布说明为空；保留 tag 作为历史里程碑。');
  }
  return lines.join('\n').trim();
}

function buildReleaseNotes(version, section, release) {
  const pre = isPre(version) || release.prerelease;
  const shaTry = (() => {
    try {
      return sh(`git rev-list -n 1 v${version}`);
    } catch {
      return release.target_commitish || 'unknown';
    }
  })();
  const shortSha = String(shaTry).slice(0, 12);
  const date = dateOnly(release.published_at);
  const preNote = pre
    ? '\n> ⚠ 预发布或历史候选。GitHub Latest 仅指向稳定 GA（当前 `v3.0.6`）。\n'
    : '';

  let extra = '';
  if (version === '3.0.5') {
    extra = `
### 生产部署记录

- **已部署** Cloudflare Pages 项目 \`sops\`，branch \`main\`
- **生产域名：** https://sops.hongecb.store
- **应用版本：** \`3.0.5\`
`;
  }
  if (version === '3.0.5-rc.1' || version === '3.0.5-rc.2') {
    extra = `
### 状态

- **Superseded**：误标 \`3.0.5-rc\` 线，内容已收口于 \`v3.0.5\` GA。
- 请勿作为开发或生产基线。
`;
  }

  const assetsNote =
    (release.assets || []).length > 0
      ? `- 产物：${release.assets.map((a) => `\`${a}\``).join('、')}`
      : '- 产物：本版本无归档 dist（历史 release）；以源码 tag 为准。自 `v3.0.4-rc.11` / `v3.0.5` 起新发版附带 zip + SHA256';

  return `## SOPs ${version}

**发布通道：** ${channelOf(version)}  
**环境：** ${pre ? 'Staging / 历史候选' : 'Production / 历史稳定'}  
**部署目标：** https://sops.hongecb.store  
**Git tag：** v${version}  
**发布日期：** ${date}  
**Commit：** \`${shortSha}\`  
**笔记来源：** docs/CHANGELOG.md 完整章节（同步脚本，不压缩）
${preNote}
### 运维与部署

${assetsNote}
- 回滚：优先使用上一 GA；当前 Latest 为 \`v3.0.6\`
- 验证：首页可达、核心路由可进、LLM 网关连通
- 部署步骤：docs/DEPLOYMENT.md
- 发布策略：docs/RELEASE_POLICY.md
${extra}
### 完整变更

以下正文摘自 \`docs/CHANGELOG.md\` 的 \`${version}\` 章节（**完整保留**）。

---

### CHANGELOG

## [${version}] - ${date}

${section.trim()}
`;
}

function writeFullChangelog(unreleasedBody, versionSectionsOrdered) {
  const header = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

${unreleasedBody.trim()}

`;

  const parts = [header];
  for (const { version, date, body } of versionSectionsOrdered) {
    parts.push(`## [${version}] - ${date}\n\n${body.trim()}\n\n`);
  }
  return parts.join('').replace(/\n{3,}/g, '\n\n').trim() + '\n';
}

function updateGithubRelease(version, notesPath, release, dryRun) {
  const tag = `v${version}`;
  const pre = isPre(version) || release.prerelease;
  if (dryRun) {
    console.log(`[dry-run] gh release edit ${tag}`);
    return;
  }
  if (version === '3.0.6' && !pre) {
    sh(`gh release edit ${tag} --latest --notes-file "${notesPath}" --title "${tag}"`, {
      stdio: 'inherit',
    });
  } else if (pre) {
    sh(`gh release edit ${tag} --prerelease --notes-file "${notesPath}" --title "${tag}${version.startsWith('3.0.5-rc') ? ' (superseded)' : ''}"`, {
      stdio: 'inherit',
    });
  } else {
    sh(`gh release edit ${tag} --notes-file "${notesPath}" --title "${tag}"`, {
      stdio: 'inherit',
    });
  }
  console.log('updated', tag);
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  mkdirSync(OUT_DIR, { recursive: true });

  if (!existsSync(RELEASES_PATH)) {
    console.log('fetching releases...');
    sh('node scripts/release/fetch-all-releases.mjs', { stdio: 'inherit' });
  }

  const releases = JSON.parse(readFileSync(RELEASES_PATH, 'utf8'));
  const changelogText = readFileSync(CHANGELOG_PATH, 'utf8');
  const existing = parseChangelogSections(changelogText);
  const unreleased = existing.get('Unreleased') || '';

  // Dedupe by version
  const byVersion = new Map();
  for (const r of releases) {
    const v = versionFromTag(r.tag_name);
    if (!byVersion.has(v)) byVersion.set(v, r);
  }

  // Semver descending (GA of a triple ranks above its RCs)
  const versions = [...byVersion.keys()].sort(compareVersionsDesc);

  const versionSectionsOrdered = [];
  for (const version of versions) {
    const release = byVersion.get(version);
    const existingBody = existing.get(version);
    // Prefer existing CHANGELOG detail whenever present and non-trivial
    // Always run through sectionFromRelease so superseded / unwrap rules apply
    let body = sectionFromRelease(version, release, existingBody);
    versionSectionsOrdered.push({
      version,
      date: dateOnly(release.published_at),
      body,
      release,
    });
  }

  if (!flags.skipChangelog) {
    const next = writeFullChangelog(unreleased, versionSectionsOrdered);
    const outCl = join(OUT_DIR, 'CHANGELOG.generated.md');
    writeFileSync(outCl, next, 'utf8');
    if (flags.dryRun) {
      console.log('[dry-run] would write docs/CHANGELOG.md bytes', next.length);
    } else {
      writeFileSync(CHANGELOG_PATH, next, 'utf8');
      console.log('wrote docs/CHANGELOG.md', next.length, 'bytes,', versions.length, 'versions');
    }
  }

  // Refresh section map after write for notes generation
  const finalSections = flags.skipChangelog
    ? existing
    : parseChangelogSections(
        flags.dryRun
          ? writeFullChangelog(unreleased, versionSectionsOrdered)
          : readFileSync(CHANGELOG_PATH, 'utf8')
      );

  const summary = [];
  if (!flags.skipGithub) {
    for (const { version, release } of versionSectionsOrdered) {
      const sectionBody = finalSections.get(version) || sectionFromRelease(version, release, null);
      const notes = buildReleaseNotes(version, sectionBody, release);
      const notesPath = join(OUT_DIR, `notes-${version}.md`);
      writeFileSync(notesPath, notes, 'utf8');
      try {
        updateGithubRelease(version, notesPath, release, flags.dryRun);
        summary.push({ version, status: 'ok', bytes: notes.length });
      } catch (error) {
        summary.push({ version, status: 'error', error: String(error.message || error) });
        console.error('fail', version, error.message || error);
      }
    }
  }

  writeFileSync(
    join(OUT_DIR, 'SUMMARY.json'),
    JSON.stringify({ flags, count: versions.length, summary }, null, 2),
    'utf8'
  );
  console.log('done. versions:', versions.length);
  const failed = summary.filter((s) => s.status === 'error');
  if (failed.length) process.exitCode = 1;
}

main();
