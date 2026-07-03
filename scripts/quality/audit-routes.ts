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
import { routeIdToPath } from '@/common/router/routePaths';
import { MODULE_MAP as AMZ_HUB_MODULE_MAP } from '@/modules/amz_hub/module.loaders';
import { MODULE_MAP as APP_CENTER_MODULE_MAP } from '@/modules/app_center/module.loaders';
import { MODULE_MAP as MORE_MODULE_MAP } from '@/modules/more/module.loaders';
import { MODULE_MAP as SOPS_MODULE_MAP } from '@/modules/sops/module.loaders';
import type { ModuleManifest } from '@/common/config/moduleManifest';
import type { ModuleMap } from '@/types/modules-business';

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

interface LoaderScope {
  name: string;
  manifest: ModuleManifest;
  moduleMap: ModuleMap;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..', '..');

const loaderScopes: LoaderScope[] = [
  { name: 'sops', manifest: sopsManifest, moduleMap: SOPS_MODULE_MAP },
  { name: 'app_center', manifest: appCenterManifest, moduleMap: APP_CENTER_MODULE_MAP },
  { name: 'amz_hub', manifest: amzHubManifest, moduleMap: AMZ_HUB_MODULE_MAP },
  { name: 'more', manifest: moreManifest, moduleMap: MORE_MODULE_MAP },
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

function auditManifestPathDeclarations(issues: AuditIssue[]): void {
  for (const manifest of ROUTE_MANIFESTS) {
    for (const route of manifest.routes) {
      if (!route.path) {
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
    }
  }
}

function auditAliases(issues: AuditIssue[], registeredPaths: Set<string>): void {
  const conversion = convertMenuConfig(MENU_CONFIG, { validate: true });
  const aliases: Record<string, string> = {
    ...conversion.aliases,
    '/ppc_search_terms': '/ppc_search_terms',
    '/app-center/playground': '/playground',
  };

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

function auditModuleMaps(issues: AuditIssue[]): void {
  for (const scope of loaderScopes) {
    const manifestRouteIds = new Set(scope.manifest.routes.map(route => route.routeId));
    const moduleMapRouteIds = new Set(Object.keys(scope.moduleMap));

    for (const routeId of manifestRouteIds) {
      if (!moduleMapRouteIds.has(routeId)) {
        addIssue(
          issues,
          'error',
          'module-map',
          `Manifest route "${routeId}" has no MODULE_MAP loader in ${scope.name}`
        );
      }
    }

    for (const routeId of moduleMapRouteIds) {
      if (!manifestRouteIds.has(routeId)) {
        addIssue(
          issues,
          'error',
          'module-map',
          `MODULE_MAP loader "${routeId}" is not declared in ${scope.name} manifest`
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
  auditAliases(issues, registeredPaths);
  auditStaticTabReferences(issues, routeIdSet);
  auditModuleMaps(issues);
  auditMenuConfig(issues, routeIdSet);

  printReport(issues, routeIds.length);

  if (issues.some(issue => issue.severity === 'error')) {
    process.exitCode = 1;
  }
}

main();
