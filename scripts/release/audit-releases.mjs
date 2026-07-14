/**
 * Audit GitHub releases vs tags vs CHANGELOG.
 * Usage: node scripts/release/audit-releases.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isTagOnlyArchiveTag } from './release-history-policy.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

function sh(cmd) {
  return execSync(cmd, {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, LANG: 'en_US.UTF-8' },
  });
}

const releases = JSON.parse(
  sh('gh api "repos/earshore/SOPs/releases?per_page=100" --paginate')
);
// paginate may return array of arrays
const flat = Array.isArray(releases[0]) ? releases.flat() : releases;

const tags = sh('git tag -l "v*"')
  .split(/\r?\n/)
  .map((t) => t.trim())
  .filter(Boolean);

const changelog = readFileSync(resolve(ROOT, 'docs/CHANGELOG.md'), 'utf8');
const clVersions = [...changelog.matchAll(/^## \[([^\]]+)\]/gm)].map((m) => m[1]);

const preRe = /-(alpha|beta|rc)(\.|$)/i;

const report = {
  summary: {
    releases: flat.length,
    tags: tags.length,
    changelogVersions: clVersions.filter((v) => v !== 'Unreleased').length,
  },
  latest: null,
  issues: [],
  recommendations: [],
  inventory: {
    ga: [],
    prerelease: [],
    withAssets: [],
    withoutAssets: [],
    shortBody: [],
    emptyBody: [],
    rcNotPre: [],
    gaMarkedPre: [],
    tagsWithoutRelease: [],
    releasesWithoutChangelog: [],
    changelogWithoutRelease: [],
    tagOnlyArchives: [],
    tagOnlyArchiveReleases: [],
  },
};

const latest = flat.find((r) => !r.prerelease && !r.draft) || flat[0];
// GitHub latest is first non-prerelease by API /releases/latest
try {
  report.latest = JSON.parse(sh('gh api repos/earshore/SOPs/releases/latest'));
} catch {
  report.latest = latest;
}

const relTags = new Set(flat.map((r) => r.tag_name));

for (const r of flat) {
  const tag = r.tag_name;
  const body = r.body || '';
  const assets = (r.assets || []).map((a) => a.name);
  const isPreName = preRe.test(tag);

  if (isTagOnlyArchiveTag(tag)) {
    report.inventory.tagOnlyArchiveReleases.push(tag);
  }

  if (r.prerelease) report.inventory.prerelease.push(tag);
  else report.inventory.ga.push(tag);

  if (assets.length) report.inventory.withAssets.push({ tag, assets });
  else report.inventory.withoutAssets.push(tag);

  if (!body.trim()) report.inventory.emptyBody.push(tag);
  else if (body.length < 200) report.inventory.shortBody.push({ tag, len: body.length, pre: r.prerelease });

  if (isPreName && !r.prerelease) report.inventory.rcNotPre.push(tag);
  if (!isPreName && r.prerelease) report.inventory.gaMarkedPre.push(tag);

  const ver = tag.replace(/^v/, '');
  if (!clVersions.includes(ver) && !clVersions.includes(tag)) {
    report.inventory.releasesWithoutChangelog.push(tag);
  }
}

for (const t of tags) {
  if (!relTags.has(t)) {
    if (isTagOnlyArchiveTag(t)) report.inventory.tagOnlyArchives.push(t);
    else report.inventory.tagsWithoutRelease.push(t);
  }
}

for (const v of clVersions) {
  if (v === 'Unreleased') continue;
  if (!relTags.has(`v${v}`) && !relTags.has(v)) {
    if (!isTagOnlyArchiveTag(`v${v}`)) report.inventory.changelogWithoutRelease.push(v);
  }
}

// Issues
if (report.latest?.tag_name && preRe.test(report.latest.tag_name)) {
  report.issues.push({
    severity: 'P0',
    id: 'latest-is-prerelease-name',
    detail: `Latest tag name looks pre-release: ${report.latest.tag_name}`,
  });
}
if (report.latest?.prerelease) {
  report.issues.push({
    severity: 'P0',
    id: 'latest-flag-prerelease',
    detail: 'GitHub Latest is marked prerelease',
  });
}
if (report.inventory.rcNotPre.length) {
  report.issues.push({
    severity: 'P0',
    id: 'rc-not-prerelease',
    detail: report.inventory.rcNotPre.join(', '),
  });
}
if (report.inventory.tagsWithoutRelease.length) {
  report.issues.push({
    severity: 'P1',
    id: 'orphan-tags',
    detail: report.inventory.tagsWithoutRelease.join(', '),
  });
}
if (report.inventory.tagOnlyArchiveReleases.length) {
  report.issues.push({
    severity: 'P1',
    id: 'tag-only-archives-published',
    detail: report.inventory.tagOnlyArchiveReleases.join(', '),
  });
}
if (report.inventory.withAssets.length < 3) {
  report.issues.push({
    severity: 'P1',
    id: 'few-assets',
    detail: `Only ${report.inventory.withAssets.length} release(s) have artifacts: ${report.inventory.withAssets.map((x) => x.tag).join(', ')}`,
  });
}
if (report.inventory.shortBody.length) {
  report.issues.push({
    severity: 'P2',
    id: 'short-bodies',
    detail: `${report.inventory.shortBody.length} releases have body < 200 chars`,
  });
}
if (report.inventory.releasesWithoutChangelog.length > 20) {
  report.issues.push({
    severity: 'P2',
    id: 'changelog-coverage',
    detail: `${report.inventory.releasesWithoutChangelog.length} releases lack CHANGELOG section (expected for pre-3.0.4 era)`,
  });
}

// Enterprise checklist recommendations
const gaRecent = report.inventory.ga.filter((t) => /^v3\./.test(t));
for (const tag of gaRecent) {
  const r = flat.find((x) => x.tag_name === tag);
  const body = r?.body || '';
  const missing = [];
  if (!/产物|SHA256|build-info|sops-dist/i.test(body) && !(r?.assets?.length)) missing.push('artifacts');
  if (!/回滚|rollback|上一/i.test(body)) missing.push('rollback');
  if (!/部署|DEPLOYMENT|sops\.hongecb/i.test(body)) missing.push('deploy-target');
  if (body.length < 400) missing.push('detailed-notes');
  if (missing.length) {
    report.recommendations.push({ tag, missing, bodyLen: body.length, assets: (r?.assets || []).length });
  }
}

// Pre-release recent short notes
for (const item of report.inventory.shortBody.filter((x) => x.pre && /^v3\.0\.4-rc/.test(x.tag))) {
  report.recommendations.push({
    tag: item.tag,
    missing: ['expand-from-changelog'],
    bodyLen: item.len,
  });
}

// Sort inventory lists for readability
report.inventory.ga.sort();
report.inventory.prerelease.sort();
report.inventory.withoutAssets = report.inventory.withoutAssets.length;

const outPath = resolve(ROOT, 'release-artifacts/RELEASE_AUDIT.json');
try {
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');
} catch {
  // ignore if dir missing
}

// Human summary
console.log('=== SOPs Release Audit ===');
console.log(JSON.stringify(report.summary, null, 2));
console.log('\nLatest:', report.latest?.tag_name, 'prerelease=', report.latest?.prerelease);
console.log('Assets on latest:', (report.latest?.assets || []).map((a) => a.name).join(', ') || 'none');
console.log('\nGA releases (' + report.inventory.ga.length + '):', report.inventory.ga.join(', '));
console.log('\nPrereleases (' + report.inventory.prerelease.length + ') sample:', report.inventory.prerelease.slice(-12).join(', '));
console.log('\nWith assets:', report.inventory.withAssets);
console.log('\nTags without release:', report.inventory.tagsWithoutRelease);
console.log('\nTag-only archives:', report.inventory.tagOnlyArchives);
console.log('\nTag-only archives published as releases:', report.inventory.tagOnlyArchiveReleases);
console.log('\nRC not pre-release flag:', report.inventory.rcNotPre);
console.log('\nShort bodies:', report.inventory.shortBody);
console.log('\nReleases without CHANGELOG section count:', report.inventory.releasesWithoutChangelog.length);
console.log('  sample:', report.inventory.releasesWithoutChangelog.slice(0, 25).join(', '));
console.log('\nCHANGELOG without release:', report.inventory.changelogWithoutRelease);
console.log('\nIssues:');
for (const i of report.issues) console.log(`  [${i.severity}] ${i.id}: ${i.detail}`);
console.log('\nRecommendations (GA v3 + short RC):');
for (const r of report.recommendations) console.log(' ', r);
console.log('\nFull JSON length', JSON.stringify(report).length);
