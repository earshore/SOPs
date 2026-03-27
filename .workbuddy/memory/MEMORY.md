# SOPS 项目长期记忆

## 项目信息
- **项目名称**: SOPS (Amazing Amazon Architect - 亚马逊运营管理平台)
- **主要技术栈**: Vite + TypeScript + Alpine.js + Tailwind CSS
- **构建工具**: Vite 5.x
- **包管理器**: npm

## Cloudflare 部署配置
- **部署平台**: Cloudflare Pages
- **项目名称**: sops
- **生产分支**: b3-24
- **构建命令**: `npm run build`
- **输出目录**: `dist/`
- **Wrangler 版本**: 4.61.1
- **配置文件**: `wrangler.toml`

### 部署命令
```bash
# 部署到 Cloudflare Pages
wrangler pages deploy dist --project-name sops --branch b3-24
```

### 账户信息
- **账户邮箱**: earshore@163.com
- **账户ID**: f8557b8acef971d10dddfb3bde91592e

## 开发约定
- Node.js 版本要求: >=18.0.0
- 使用 ES 模块 (type: module)
- 代码风格: ESLint + Prettier
- 测试框架: Vitest (单元测试) + Playwright (E2E测试)

## 重要提醒
- 部署前确保先运行 `npm run build` 构建项目
- Git 工作目录有未提交更改时，可使用 `--commit-dirty=true` 参数
