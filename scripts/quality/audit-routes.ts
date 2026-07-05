import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { MENU_CONFIG } from '@/common/config/menuConfig';
import {
  amzHubManifest,
  appCenterManifest,
  moreManifest,
  ROUTE_MANIFESTS,
  sopsManifest,
} from '@/common/config/routeManifests';
import { convertMenuConfig } from '@/common/router/navigo/RouteConfigConverter';
import { LEGACY_ROUTE_ALIASES } from '@/common/router/legacyRouteAliases';
import { routeIdToPath } from '@/common/router/routePaths';
import type { ModuleManifest } from '@/common/config/moduleManifest';

type IssueSeverity = 'error' | 'warn';

interface AuditIssue {
  severity: IssueSeverity;
  check: string;
  message: string;
  location?: string;
}

interface StaticTabReference {
  routeId: string;
  file: string;
  line: number;
}

interface StaticSwitchTabAction {
  file: string;
  line: number;
}

interface LegacyRouteChangeEmit {
  file: string;
  line: number;
}

interface LegacyChildTabAttribute {
  file: string;
  line: number;
}

interface LegacyWindowNavigationCall {
  file: string;
  line: number;
}

interface LegacyGlobalRouteApiReference {
  file: string;
  line: number;
  kind: string;
}

interface LegacyUrlRouteReference {
  file: string;
  line: number;
  kind: string;
}

interface LoaderScope {
  name: string;
  moduleDir: string;
  manifest: ModuleManifest;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

const loaderScopes: LoaderScope[] = [
  { name: 'sops', moduleDir: 'sops', manifest: sopsManifest },
  { name: 'app_center', moduleDir: 'app_center', manifest: appCenterManifest },
  { name: 'amz_hub', moduleDir: 'amz_hub', manifest: amzHubManifest },
  { name: 'more', moduleDir: 'more', manifest: moreManifest },
];

function normalizePath(path: string): string {
  let normalized = path.trim().replace(/^#/, '');

  if (!normalized.startsWith('/')) {
    normalized = `/${normalized}`;
  }

  normalized = normalized.replace(/^\/+/, '/');

  if (normalized.length > 1 && normalized.endsWith('/')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized;
}

function addIssue(
  issues: AuditIssue[],
  severity: IssueSeverity,
  check: string,
  message: string,
  location?: string
): void {
  issues.push({ severity, check, message, location });
}

function getManifestRouteIds(): string[] {
  return ROUTE_MANIFESTS.flatMap(manifest => manifest.routes.map(route => route.routeId));
}

function auditUniqueRouteIds(issues: AuditIssue[], routeIds: string[]): void {
  const seen = new Map<string, number>();

  for (const routeId of routeIds) {
    seen.set(routeId, (seen.get(routeId) ?? 0) + 1);
  }

  for (const [routeId, count] of seen) {
    if (count > 1) {
      addIssue(issues, 'error', 'unique-route-ids', `Route id "${routeId}" appears ${count} times`);
    }
  }
}

function auditRoutePaths(issues: AuditIssue[], routeIds: string[]): Set<string> {
  const pathOwners = new Map<string, string[]>();

  for (const routeId of routeIds) {
    const path = routeIdToPath(routeId);
    const owners = pathOwners.get(path) ?? [];
    owners.push(routeId);
    pathOwners.set(path, owners);
  }

  for (const [path, owners] of pathOwners) {
    if (owners.length > 1) {
      addIssue(
        issues,
        'error',
        'unique-route-paths',
        `Route path "${path}" is shared by route ids: ${owners.join(', ')}`
      );
    }
  }

  return new Set(pathOwners.keys());
}

function getCloudflareRedirectSources(): Set<string> {
  const redirectsPath = join(projectRoot, 'public', '_redirects');
  const redirects = readFileSync(redirectsPath, 'utf-8');
  const sources = new Set<string>();

  for (const line of redirects.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const [source] = trimmed.split(/\s+/);
    if (source) {
      sources.add(source);
    }
  }

  return sources;
}

function auditCloudflareRedirects(issues: AuditIssue[], registeredPaths: Set<string>): void {
  const redirects = getCloudflareRedirectSources();
  const prefixes = new Map<string, { exact: boolean; wildcard: boolean }>();

  for (const path of registeredPaths) {
    const [, prefix, ...rest] = path.split('/');
    if (!prefix) {
      continue;
    }

    const current = prefixes.get(prefix) ?? { exact: false, wildcard: false };
    if (rest.length === 0) {
      current.exact = true;
    } else {
      current.wildcard = true;
    }
    prefixes.set(prefix, current);
  }

  for (const [prefix, required] of prefixes) {
    if (required.exact && !redirects.has(`/${prefix}`)) {
      addIssue(
        issues,
        'error',
        'cloudflare-redirects',
        `public/_redirects must include SPA fallback for "/${prefix}"`
      );
    }

    if (required.wildcard && !redirects.has(`/${prefix}/*`)) {
      addIssue(
        issues,
        'error',
        'cloudflare-redirects',
        `public/_redirects must include SPA fallback for "/${prefix}/*"`
      );
    }
  }
}

function auditManifestPathDeclarations(issues: AuditIssue[]): void {
  for (const manifest of ROUTE_MANIFESTS) {
    for (const route of manifest.routes) {
      if (!route.path) {
        addIssue(
          issues,
          'error',
          'manifest-path',
          `Route "${route.routeId}" must declare an explicit canonical path`
        );
        continue;
      }

      const normalizedPath = normalizePath(route.path);
      if (route.path !== normalizedPath) {
        addIssue(
          issues,
          'error',
          'manifest-path',
          `Route "${route.routeId}" declares non-normalized path "${route.path}"; expected "${normalizedPath}"`
        );
      }

      if (normalizedPath.includes('_')) {
        addIssue(
          issues,
          'error',
          'manifest-path',
          `Route "${route.routeId}" canonical path "${route.path}" must use kebab-case URL segments`
        );
      }
    }
  }
}

function auditAliases(issues: AuditIssue[], registeredPaths: Set<string>): void {
  const conversion = convertMenuConfig(MENU_CONFIG, { validate: true });
  const aliases: Record<string, string> = {
    ...conversion.aliases,
  };

  for (const legacyAlias of LEGACY_ROUTE_ALIASES) {
    aliases[legacyAlias.alias] = legacyAlias.routeId;
  }

  for (const [alias, target] of Object.entries(aliases)) {
    const aliasPath = normalizePath(alias);
    const targetPath = routeIdToPath(target.replace(/^\//, ''));

    if (aliasPath === targetPath) {
      addIssue(
        issues,
        'warn',
        'alias-target',
        `Alias "${aliasPath}" points to itself after normalization`
      );
    }

    if (!registeredPaths.has(targetPath)) {
      addIssue(
        issues,
        'error',
        'alias-target',
        `Alias "${aliasPath}" targets unregistered route path "${targetPath}"`
      );
    }
  }
}

function collectSourceFiles(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      if (!entry.startsWith('.') && entry !== 'node_modules' && entry !== 'dist') {
        collectSourceFiles(fullPath, files);
      }
      continue;
    }

    if (/\.(html|ts|tsx|js|jsx)$/.test(entry)) {
      files.push(fullPath);
    }
  }

  return files;
}

function isTestFile(file: string): boolean {
  return /\.(test|spec)\.[jt]sx?$/.test(file);
}

function collectStaticTabReferences(): StaticTabReference[] {
  const files = [join(projectRoot, 'index.html'), ...collectSourceFiles(join(projectRoot, 'src'))];
  const references: StaticTabReference[] = [];
  const dataTabPattern = /\bdata-tab\s*=\s*(["'])(.*?)\1/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('*')) {
        return;
      }

      let match: RegExpExecArray | null;
      dataTabPattern.lastIndex = 0;

      while ((match = dataTabPattern.exec(line)) !== null) {
        const routeId = match[2]?.trim();

        if (!routeId || routeId.includes('${')) {
          continue;
        }

        references.push({
          routeId,
          file: relative(projectRoot, file),
          line: index + 1,
        });
      }
    });
  }

  return references;
}

function collectStaticSwitchTabActions(): StaticSwitchTabAction[] {
  const files = [join(projectRoot, 'index.html'), ...collectSourceFiles(join(projectRoot, 'src'))];
  const references: StaticSwitchTabAction[] = [];
  const switchTabTagPattern = /<[^>]*\bdata-action\s*=\s*(["'])switch-tab\1[^>]*>/gis;
  const dataTabPattern = /\bdata-tab\s*=\s*(["'])(.*?)\1/i;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;

    switchTabTagPattern.lastIndex = 0;
    while ((match = switchTabTagPattern.exec(content)) !== null) {
      const tag = match[0];
      if (tag.includes('${') || dataTabPattern.test(tag)) {
        continue;
      }

      references.push({
        file: relative(projectRoot, file),
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return references;
}

function collectLegacyRouteChangeEmits(): LegacyRouteChangeEmit[] {
  const files = collectSourceFiles(join(projectRoot, 'src'));
  const references: LegacyRouteChangeEmit[] = [];
  const legacyRouteChangeEmitPattern =
    /\.emit\s*\(\s*(?:APP_EVENTS\.ROUTE_CHANGE|['"]route-change['"])/g;

  for (const file of files) {
    const relativeFile = relative(projectRoot, file);
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;

    legacyRouteChangeEmitPattern.lastIndex = 0;
    while ((match = legacyRouteChangeEmitPattern.exec(content)) !== null) {
      references.push({
        file: relativeFile,
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return references;
}

function collectLegacyChildTabAttributes(): LegacyChildTabAttribute[] {
  const files = [join(projectRoot, 'index.html'), ...collectSourceFiles(join(projectRoot, 'src'))];
  const references: LegacyChildTabAttribute[] = [];
  const childTabPattern = /\bdata-child-tab\s*=/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;

    childTabPattern.lastIndex = 0;
    while ((match = childTabPattern.exec(content)) !== null) {
      references.push({
        file: relative(projectRoot, file),
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return references;
}

function collectLegacyWindowNavigationCalls(): LegacyWindowNavigationCall[] {
  const files = collectSourceFiles(join(projectRoot, 'src'));
  const references: LegacyWindowNavigationCall[] = [];
  const windowNavigatePattern = /\bwindow\.navigateTo\s*\(/g;

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    let match: RegExpExecArray | null;

    windowNavigatePattern.lastIndex = 0;
    while ((match = windowNavigatePattern.exec(content)) !== null) {
      references.push({
        file: relative(projectRoot, file),
        line: content.slice(0, match.index).split('\n').length,
      });
    }
  }

  return references;
}

function collectLegacyGlobalRouteApiReferences(): LegacyGlobalRouteApiReference[] {
  const files = collectSourceFiles(join(projectRoot, 'src'));
  const references: LegacyGlobalRouteApiReference[] = [];
  const patterns: Array<{ kind: string; pattern: RegExp }> = [
    { kind: 'window.navigateTo assignment', pattern: /\bwindow\.navigateTo\s*=/g },
    { kind: 'legacy global router install', pattern: /\.installGlobalAPI\s*\(/g },
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    for (const { kind, pattern } of patterns) {
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        references.push({
          file: relative(projectRoot, file),
          line: content.slice(0, match.index).split('\n').length,
          kind,
        });
      }
    }
  }

  return references;
}

function collectLegacyUrlRouteReferences(): LegacyUrlRouteReference[] {
  const files = [join(projectRoot, 'index.html'), ...collectSourceFiles(join(projectRoot, 'src'))].filter(
    file => !isTestFile(file)
  );
  const references: LegacyUrlRouteReference[] = [];
  const patterns: Array<{ kind: string; pattern: RegExp }> = [
    { kind: 'hash href route', pattern: /\bhref\s*=\s*(["'])#\/[^"']*\1/g },
    { kind: 'location.hash assignment', pattern: /\b(?:window\.)?location\.hash\s*=/g },
  ];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');

    for (const { kind, pattern } of patterns) {
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(content)) !== null) {
        references.push({
          file: relative(projectRoot, file),
          line: content.slice(0, match.index).split('\n').length,
          kind,
        });
      }
    }
  }

  return references;
}

function auditStaticTabReferences(issues: AuditIssue[], routeIdSet: Set<string>): void {
  for (const reference of collectStaticTabReferences()) {
    if (!routeIdSet.has(reference.routeId)) {
      addIssue(
        issues,
        'error',
        'static-data-tab',
        `Static data-tab references unknown route id "${reference.routeId}"`,
        `${reference.file}:${reference.line}`
      );
    }
  }
}

function auditSwitchTabActions(issues: AuditIssue[]): void {
  for (const reference of collectStaticSwitchTabActions()) {
    addIssue(
      issues,
      'error',
      'static-switch-tab',
      'Static data-action="switch-tab" is missing a data-tab route id',
      `${reference.file}:${reference.line}`
    );
  }
}

function auditLegacyRouteChangeEmits(issues: AuditIssue[]): void {
  for (const reference of collectLegacyRouteChangeEmits()) {
    addIssue(
      issues,
      'error',
      'legacy-route-change-emit',
      'Direct legacy route-change emits are not allowed; use data-action="switch-tab" or navigateToRouteId()',
      `${reference.file}:${reference.line}`
    );
  }
}

function auditLegacyChildTabAttributes(issues: AuditIssue[]): void {
  for (const reference of collectLegacyChildTabAttributes()) {
    addIssue(
      issues,
      'error',
      'legacy-child-tab',
      'data-child-tab is a legacy route trigger; use data-action="switch-tab" data-tab instead',
      `${reference.file}:${reference.line}`
    );
  }
}

function auditLegacyWindowNavigationCalls(issues: AuditIssue[]): void {
  for (const reference of collectLegacyWindowNavigationCalls()) {
    addIssue(
      issues,
      'error',
      'legacy-window-navigate',
      'window.navigateTo() bypasses route-id validation; use navigateToRouteId() or data-action="switch-tab"',
      `${reference.file}:${reference.line}`
    );
  }
}

function auditLegacyGlobalRouteApis(issues: AuditIssue[]): void {
  for (const reference of collectLegacyGlobalRouteApiReferences()) {
    addIssue(
      issues,
      'error',
      'legacy-global-route-api',
      `${reference.kind} reintroduces a global path/legacy route entrypoint`,
      `${reference.file}:${reference.line}`
    );
  }
}

function auditLegacyUrlRoutes(issues: AuditIssue[]): void {
  for (const reference of collectLegacyUrlRouteReferences()) {
    addIssue(
      issues,
      'error',
      'legacy-url-route',
      `${reference.kind} bypasses routeId navigation; use data-action="switch-tab" or navigateToRouteId()`,
      `${reference.file}:${reference.line}`
    );
  }
}

function auditManifestLoaders(issues: AuditIssue[]): void {
  for (const scope of loaderScopes) {
    for (const route of scope.manifest.routes) {
      if (!route.loaderPath) {
        addIssue(
          issues,
          'error',
          'manifest-loader',
          `Business manifest route "${route.routeId}" must declare loaderPath in ${scope.name}`
        );
        continue;
      }

      if (route.loader) {
        addIssue(
          issues,
          'error',
          'manifest-loader',
          `Business manifest route "${route.routeId}" must not declare a direct loader; use loaderPath`
        );
      }

      if (!route.loaderPath.startsWith('./views/') || !route.loaderPath.endsWith('/index.ts')) {
        addIssue(
          issues,
          'error',
          'manifest-loader',
          `Manifest route "${route.routeId}" loaderPath "${route.loaderPath}" must match ./views/**/index.ts`
        );
      }

      const loaderFile = join(
        projectRoot,
        'src',
        'modules',
        scope.moduleDir,
        route.loaderPath.replace(/^\.\//, '')
      );

      try {
        if (!statSync(loaderFile).isFile()) {
          addIssue(
            issues,
            'error',
            'manifest-loader',
            `Manifest route "${route.routeId}" loaderPath "${route.loaderPath}" is not a file`
          );
        }
      } catch {
        addIssue(
          issues,
          'error',
          'manifest-loader',
          `Manifest route "${route.routeId}" loaderPath "${route.loaderPath}" does not exist`
        );
      }
    }
  }
}

function auditMenuConfig(issues: AuditIssue[], routeIdSet: Set<string>): void {
  for (const routeId of Object.keys(MENU_CONFIG.routes)) {
    if (!routeIdSet.has(routeId)) {
      addIssue(
        issues,
        'error',
        'menu-config',
        `MENU_CONFIG route "${routeId}" is not declared in route manifests`
      );
    }
  }

  for (const [routeId, config] of Object.entries(MENU_CONFIG.routes)) {
    if (!MENU_CONFIG.modules[config.moduleId]) {
      addIssue(
        issues,
        'error',
        'menu-config',
        `Route "${routeId}" references unknown module "${config.moduleId}"`
      );
    }
  }
}

function printReport(issues: AuditIssue[], routeCount: number): void {
  const errors = issues.filter(issue => issue.severity === 'error');
  const warnings = issues.filter(issue => issue.severity === 'warn');

  console.log('Route audit report');
  console.log('='.repeat(80));
  console.log(`Routes: ${routeCount}`);
  console.log(`Errors: ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (issues.length === 0) {
    console.log('Status: passed');
    return;
  }

  console.log('');

  for (const issue of issues) {
    const location = issue.location ? ` (${issue.location})` : '';
    console.log(`[${issue.severity.toUpperCase()}] ${issue.check}${location}`);
    console.log(`  ${issue.message}`);
  }
}

function main(): void {
  const issues: AuditIssue[] = [];
  const routeIds = getManifestRouteIds();
  const routeIdSet = new Set(routeIds);

  auditUniqueRouteIds(issues, routeIds);
  auditManifestPathDeclarations(issues);
  const registeredPaths = auditRoutePaths(issues, routeIds);
  auditCloudflareRedirects(issues, registeredPaths);
  auditAliases(issues, registeredPaths);
  auditSwitchTabActions(issues);
  auditLegacyRouteChangeEmits(issues);
  auditLegacyChildTabAttributes(issues);
  auditLegacyWindowNavigationCalls(issues);
  auditLegacyGlobalRouteApis(issues);
  auditLegacyUrlRoutes(issues);
  auditStaticTabReferences(issues, routeIdSet);
  auditManifestLoaders(issues);
  auditMenuConfig(issues, routeIdSet);

  printReport(issues, routeIds.length);

  if (issues.some(issue => issue.severity === 'error')) {
    process.exitCode = 1;
  }
}

main();
