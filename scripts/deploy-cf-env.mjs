/**
 * Cloudflare Pages 环境变量一键部署脚本
 *
 * 读取 .env 文件，按变量类型自动分发：
 *   - *_API_KEY、AUTH_PASSWORD  → wrangler pages secret bulk（加密存储）
 *   - *_BASE_URL 及其他明文变量 → Cloudflare REST API（明文存储）
 *
 * 使用方式：
 *   node scripts/deploy-cf-env.mjs [--project-name sops] [--env production] [--dry-run]
 *
 * 依赖：本机已登录 wrangler（npx wrangler login）
 */

import fs from 'fs';
import path from 'path';
import { execSync, spawnSync } from 'child_process';
import os from 'os';

// ─── 参数解析 ────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (flag, fallback) => {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : fallback;
};
const PROJECT_NAME = getArg('--project-name', 'sops');
const CF_ENV = getArg('--env', 'production');
const DRY_RUN = args.includes('--dry-run');

// ─── 工具函数 ────────────────────────────────────────────────────────────────
const log = (msg) => console.log(`[deploy-cf-env] ${msg}`);
const warn = (msg) => console.warn(`[deploy-cf-env] ⚠  ${msg}`);
const ok = (msg) => console.log(`[deploy-cf-env] ✓  ${msg}`);
const fail = (msg) => { console.error(`[deploy-cf-env] ✗  ${msg}`); process.exit(1); };

// ─── 读取并解析 .env ─────────────────────────────────────────────────────────
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) fail(`.env 文件不存在：${filePath}`);
  const content = fs.readFileSync(filePath, 'utf-8');
  const vars = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed.slice(eqIdx + 1).trim();
    if (key) vars[key] = value;
  }
  return vars;
}

// ─── 变量分类 ─────────────────────────────────────────────────────────────────
function classify(vars) {
  const secrets = {};   // 加密
  const plaintext = {}; // 明文

  // 密钥判断规则：变量名包含 _API_KEY、_SECRET、_PASSWORD、_TOKEN
  const SECRET_PATTERN = /(_API_KEY|_SECRET|_PASSWORD|_TOKEN)$/i;

  for (const [k, v] of Object.entries(vars)) {
    if (SECRET_PATTERN.test(k)) {
      secrets[k] = v;
    } else {
      plaintext[k] = v;
    }
  }
  return { secrets, plaintext };
}

// ─── 读取 wrangler OAuth token ────────────────────────────────────────────────
function readWranglerToken() {
  // wrangler 将 token 存在 XDG_CONFIG 路径下
  const candidates = [
    path.join(os.homedir(), 'AppData', 'Roaming', 'xdg.config', '.wrangler', 'config', 'default.toml'),
    path.join(os.homedir(), '.config', '.wrangler', 'config', 'default.toml'),
    path.join(os.homedir(), '.wrangler', 'config', 'default.toml'),
  ];

  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    const content = fs.readFileSync(p, 'utf-8');
    // 解析 oauth_token 或 api_token
    const oauthMatch = content.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (oauthMatch) return { token: oauthMatch[1], type: 'oauth' };
    const apiMatch = content.match(/api_token\s*=\s*"([^"]+)"/);
    if (apiMatch) return { token: apiMatch[1], type: 'api' };
  }

  // 也支持环境变量 CLOUDFLARE_API_TOKEN
  if (process.env.CLOUDFLARE_API_TOKEN) {
    return { token: process.env.CLOUDFLARE_API_TOKEN, type: 'api' };
  }

  return null;
}

// ─── 获取 Account ID ──────────────────────────────────────────────────────────
async function getAccountId(token) {
  const res = await fetch('https://api.cloudflare.com/client/v4/accounts?per_page=1', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!data.success || !data.result?.length) {
    fail(`无法获取 Account ID：${JSON.stringify(data.errors)}`);
  }
  return data.result[0].id;
}

// ─── 上传加密变量（wrangler secret bulk）─────────────────────────────────────
function uploadSecrets(secrets) {
  if (!Object.keys(secrets).length) {
    log('无加密变量，跳过');
    return;
  }

  log(`上传加密变量（${Object.keys(secrets).length} 个）：${Object.keys(secrets).join(', ')}`);

  if (DRY_RUN) {
    ok('[dry-run] 跳过实际上传');
    return;
  }

  const tmpFile = path.join(os.tmpdir(), `.cf-secrets-${Date.now()}.json`);
  try {
    fs.writeFileSync(tmpFile, JSON.stringify(secrets, null, 2));
    const result = spawnSync(
      'npx',
      ['wrangler', 'pages', 'secret', 'bulk', tmpFile, '--project-name', PROJECT_NAME, '--env', CF_ENV],
      { stdio: 'inherit', shell: true }
    );
    if (result.status !== 0) fail('wrangler secret bulk 失败');
    ok('加密变量上传完成');
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
}

// ─── 上传明文变量（Cloudflare REST API）──────────────────────────────────────
async function uploadPlaintext(plaintext, token) {
  if (!Object.keys(plaintext).length) {
    log('无明文变量，跳过');
    return;
  }

  log(`上传明文变量（${Object.keys(plaintext).length} 个）：${Object.keys(plaintext).join(', ')}`);

  if (DRY_RUN) {
    ok('[dry-run] 跳过实际上传');
    return;
  }

  const accountId = await getAccountId(token);
  log(`Account ID: ${accountId}`);

  // 构造 env_vars payload
  const envVars = {};
  for (const [k, v] of Object.entries(plaintext)) {
    envVars[k] = { value: v, type: 'plain_text' };
  }

  const payload = {
    deployment_configs: {
      [CF_ENV === 'production' ? 'production' : 'preview']: {
        env_vars: envVars,
      },
    },
  };

  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/${PROJECT_NAME}`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  const data = await res.json();
  if (!data.success) {
    fail(`REST API 失败：${JSON.stringify(data.errors)}`);
  }
  ok('明文变量上传完成');
}

// ─── 主流程 ───────────────────────────────────────────────────────────────────
async function main() {
  const envFile = path.resolve(process.cwd(), '.env');
  log(`读取 ${envFile}`);
  log(`目标项目：${PROJECT_NAME}  环境：${CF_ENV}${DRY_RUN ? '  [dry-run]' : ''}`);

  const vars = parseEnvFile(envFile);
  log(`共读取到 ${Object.keys(vars).length} 个变量`);

  const { secrets, plaintext } = classify(vars);
  log(`  加密变量：${Object.keys(secrets).length} 个`);
  log(`  明文变量：${Object.keys(plaintext).length} 个`);

  // 上传加密变量
  uploadSecrets(secrets);

  // 上传明文变量（需要 token）
  if (Object.keys(plaintext).length > 0) {
    if (DRY_RUN) {
      await uploadPlaintext(plaintext, null);
    } else {
      const tokenInfo = readWranglerToken();
      if (!tokenInfo) {
        fail(
          '未找到 wrangler 登录 token。\n' +
          '请先执行 `npx wrangler login`，或设置环境变量 CLOUDFLARE_API_TOKEN=<your-token>'
        );
      }
      log(`使用 wrangler ${tokenInfo.type} token`);
      await uploadPlaintext(plaintext, tokenInfo.token);
    }
  }

  console.log('');
  ok('所有环境变量已同步到 Cloudflare Pages ✔');
}

main().catch((e) => fail(e.message));
