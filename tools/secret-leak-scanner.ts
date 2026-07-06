#!/usr/bin/env node
/**
 * 高置信度凭据泄漏扫描器
 *
 * 扫描 Git 可见文件，阻断真实 provider token、私钥和敏感 env 赋值进入仓库。
 * 命中输出始终脱敏，避免二次传播。
 */

import * as fs from 'fs';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

export interface SecretFinding {
  ruleId: string;
  file: string;
  line: number;
  preview: string;
}

interface SecretRule {
  id: string;
  pattern: RegExp;
}

const MAX_TEXT_BYTES = 2 * 1024 * 1024;

const SECRET_RULES: SecretRule[] = [
  { id: 'openai-compatible-token', pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{40,}\b/g },
  { id: 'github-token', pattern: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/g },
  { id: 'aws-access-key', pattern: /\bAKIA[0-9A-Z]{16}\b/g },
  { id: 'google-api-key', pattern: /\bAIza[0-9A-Za-z_-]{30,}\b/g },
  { id: 'slack-token', pattern: /\bxox[baprs]-[A-Za-z0-9-]{40,}\b/g },
  {
    id: 'jwt-token',
    pattern: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    id: 'private-key-block',
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g,
  },
];

const SENSITIVE_ASSIGNMENT_PATTERN =
  /^\s*(?:export\s+)?(AUTH_PASSWORD|GATEWAY_NEW_API_API_KEY|OPENAI_API_KEY|ANTHROPIC_API_KEY|GOOGLE_API_KEY|GITHUB_TOKEN|SLACK_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY)\s*[:=]\s*["']?([^"'\s#]+)["']?/gim;

const PLACEHOLDER_PATTERN =
  /^(?:\$[A-Z0-9_]+|%[A-Z0-9_]+%|<[^>]+>|your-?.*|.*placeholder.*|.*example.*|.*dummy.*|.*fake.*|.*test.*|.*changeme.*|.*browser-key.*|.*secret(?:-key|-value)?|sk-your-api-key-here)$/i;

const TEXT_EXTENSIONS = new Set([
  '.cjs',
  '.css',
  '.html',
  '.js',
  '.json',
  '.jsx',
  '.md',
  '.mjs',
  '.toml',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
]);

const SKIP_PATH_PATTERNS = [
  /^node_modules[\\/]/,
  /^\.git[\\/]/,
  /^dist[\\/]/,
  /^build[\\/]/,
  /^html[\\/]/,
  /^coverage[\\/]/,
  /^tests[\\/]performance[\\/]/,
  /^tests[\\/]quality[\\/].*\.(?:html|json)$/i,
  /(?:^|[\\/])package-lock\.json$/i,
  /\.(?:avif|bmp|gif|ico|jpeg|jpg|pdf|png|svg|webp|woff2?|ttf|zip)$/i,
];

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function listGitVisibleFiles(rootDir = process.cwd()): string[] {
  const output = execFileSync(
    'git',
    ['ls-files', '--cached', '--others', '--exclude-standard', '-z'],
    {
      cwd: rootDir,
      encoding: 'utf8',
    }
  );

  return output
    .split('\0')
    .map(file => file.trim())
    .filter(Boolean)
    .filter(file => !shouldSkipPath(file));
}

export function shouldSkipPath(filePath: string): boolean {
  const normalized = normalizePath(filePath);
  return SKIP_PATH_PATTERNS.some(pattern => pattern.test(normalized));
}

function isTextFile(filePath: string, size: number): boolean {
  if (size > MAX_TEXT_BYTES) return false;
  const baseName = path.basename(filePath);
  if (baseName.startsWith('.env')) return true;
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase());
}

function lineNumberFor(content: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i += 1) {
    if (content.charCodeAt(i) === 10) line += 1;
  }
  return line;
}

function mask(value: string): string {
  if (value.length <= 8) return '***';
  return `${value.slice(0, 4)}***${value.slice(-4)}`;
}

function addPatternFindings(file: string, content: string, findings: SecretFinding[]): void {
  for (const rule of SECRET_RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of content.matchAll(rule.pattern)) {
      const value = match[0];
      if (PLACEHOLDER_PATTERN.test(value)) continue;
      findings.push({
        ruleId: rule.id,
        file,
        line: lineNumberFor(content, match.index ?? 0),
        preview: mask(value),
      });
    }
  }
}

function addSensitiveAssignmentFindings(
  file: string,
  content: string,
  findings: SecretFinding[]
): void {
  SENSITIVE_ASSIGNMENT_PATTERN.lastIndex = 0;
  for (const match of content.matchAll(SENSITIVE_ASSIGNMENT_PATTERN)) {
    const key = match[1] ?? 'SENSITIVE_VALUE';
    const value = match[2] ?? '';
    if (!value || PLACEHOLDER_PATTERN.test(value)) continue;
    findings.push({
      ruleId: 'sensitive-env-assignment',
      file,
      line: lineNumberFor(content, match.index ?? 0),
      preview: `${key}=${mask(value)}`,
    });
  }
}

export function scanContent(file: string, content: string): SecretFinding[] {
  const findings: SecretFinding[] = [];
  addPatternFindings(file, content, findings);
  addSensitiveAssignmentFindings(file, content, findings);
  return findings;
}

function scanFile(rootDir: string, file: string, findings: SecretFinding[]): void {
  const fullPath = path.join(rootDir, file);
  if (!fs.existsSync(fullPath)) return;

  const stat = fs.statSync(fullPath);
  if (!stat.isFile() || !isTextFile(file, stat.size)) return;

  findings.push(...scanContent(file, fs.readFileSync(fullPath, 'utf8')));
}

export function runSecretScan(rootDir = process.cwd()): {
  filesScanned: number;
  findings: SecretFinding[];
} {
  const files = listGitVisibleFiles(rootDir);
  const findings: SecretFinding[] = [];

  for (const file of files) {
    scanFile(rootDir, file, findings);
  }

  return { filesScanned: files.length, findings };
}

function run(): void {
  const result = runSecretScan();

  if (result.findings.length > 0) {
    console.error('❌ Secret scan failed. Remove or rotate the matched values before committing.');
    for (const finding of result.findings) {
      console.error(`- ${finding.file}:${finding.line} [${finding.ruleId}] ${finding.preview}`);
    }
    process.exit(1);
  }

  console.log(`✅ Secret scan passed. Scanned ${result.filesScanned} Git-visible files.`);
}

function isMainModule(): boolean {
  if (typeof process.argv[1] === 'undefined') return false;

  const scriptPath = path.resolve(process.argv[1]);
  const modulePath = path.resolve(fileURLToPath(import.meta.url));
  return scriptPath === modulePath;
}

if (isMainModule()) {
  run();
}
