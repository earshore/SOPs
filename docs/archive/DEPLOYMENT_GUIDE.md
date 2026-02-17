# 部署指南

> AihangSOP项目构建和部署流程

---

## 🏗️ 构建流程

### 开发环境构建

```bash
# 启动开发服务器
npm run dev

# 访问地址
http://localhost:3000
```

**特性:**
- 热模块替换(HMR)
- 源码映射(Source Maps)
- 快速刷新
- TypeScript类型检查

---

### 生产环境构建

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

**输出目录:** `dist/`

**构建产物:**
```
dist/
├── index.html              # 入口HTML
├── assets/
│   ├── css/                # 样式文件
│   │   ├── main-*.css      # 主样式
│   │   └── module-*.css    # 模块样式
│   └── js/                 # JavaScript文件
│       ├── main-*.js       # 主入口
│       ├── core-*.js       # 核心基础设施
│       ├── vendor-*.js     # 第三方库
│       └── module-*.js     # 业务模块
└── favicon.ico
```

---

## 📊 构建优化

### 代码分割策略

当前配置已优化代码分割:

**核心包:**
- `core` - 核心基础设施(EventBus/Router/DI/Errors)
- `ui` - UI工具和组件
- `router` - 路由系统

**第三方库:**
- `vendor-alpine` - Alpine.js
- `vendor-markdown` - Marked
- `vendor-charts` - Chart.js
- `vendor-grid` - GridStack
- `vendor-utils` - 工具库(Lodash/DayJS)

**业务模块:**
- `module-home` - 首页
- `module-amz-hub` - Amazon Hub
- `module-sops-*` - SOPs各子模块
- `module-app-center` - App Center
- `module-master-prompt` - Master Prompt
- `module-keyword-hunter` - Keyword Hunter

### 构建性能指标

**目标:**
- 构建时间: < 25秒
- 首屏包体积: < 500KB
- 最大chunk: < 500KB
- 循环依赖: 0个

**当前表现:**
```
构建时间: ~22秒
首屏包体积: ~400KB
最大chunk: ~457KB
循环依赖: 0个
```

---

## 🚀 部署方式

### 1. 静态文件部署

适用于Nginx、Apache等静态服务器。

**步骤:**

1. 构建生产版本
```bash
npm run build
```

2. 将`dist/`目录内容上传到服务器

3. 配置服务器

**Nginx配置示例:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/aihang-sop/dist;
    index index.html;

    # 启用gzip压缩
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # SPA路由支持
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

**Apache配置示例:**
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/aihang-sop/dist

    <Directory /var/www/aihang-sop/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # SPA路由支持
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # 启用压缩
    <IfModule mod_deflate.c>
        AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
    </IfModule>

    # 静态资源缓存
    <FilesMatch "\.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$">
        Header set Cache-Control "max-age=31536000, public, immutable"
    </FilesMatch>
</VirtualHost>
```

---

### 2. CDN部署

适用于全球加速场景。

**推荐CDN:**
- Cloudflare
- AWS CloudFront
- 阿里云CDN
- 腾讯云CDN

**步骤:**

1. 构建生产版本
2. 上传到对象存储(S3/OSS/COS)
3. 配置CDN指向存储桶
4. 设置缓存规则

**缓存策略:**
```
HTML文件: 不缓存或短期缓存(5分钟)
JS/CSS文件: 长期缓存(1年)
图片/字体: 长期缓存(1年)
```

---

### 3. Docker部署

适用于容器化环境。

**Dockerfile:**
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源码
COPY . .

# 构建
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建产物
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制Nginx配置
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

**构建和运行:**
```bash
# 构建镜像
docker build -t aihang-sop:latest .

# 运行容器
docker run -d -p 80:80 aihang-sop:latest
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  web:
    build: .
    ports:
      - "80:80"
    restart: unless-stopped
    environment:
      - NODE_ENV=production
```

---

### 4. Vercel部署

适用于快速部署和预览。

**步骤:**

1. 连接GitHub仓库
2. 配置构建命令
```
Build Command: npm run build
Output Directory: dist
```

3. 自动部署

**vercel.json配置:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🔒 安全配置

### 环境变量

生产环境必须配置:

```bash
# .env.production
VITE_API_BASE_URL=https://api.your-domain.com
VITE_APP_ENV=production
```

**注意:** 
- 不要在代码中硬编码敏感信息
- 使用环境变量管理配置
- `.env`文件不要提交到Git

### CSP配置

在HTML中添加Content Security Policy:

```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' 'unsafe-eval'; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data: https:; 
               font-src 'self' data:;">
```

或在Nginx中配置:
```nginx
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;" always;
```

---

## 📈 性能监控

### Web Vitals上报

配置性能指标上报端点:

```typescript
// src/main.ts
import { webVitalsService } from '@/services/webVitalsService';

// 上报到服务器
webVitalsService.reportMetrics('https://api.your-domain.com/metrics');
```

### 错误监控

集成Sentry(可选):

```bash
npm install @sentry/browser
```

```typescript
// src/main.ts
import * as Sentry from '@sentry/browser';

if (import.meta.env.PROD) {
  Sentry.init({
    dsn: 'your-sentry-dsn',
    environment: 'production',
    tracesSampleRate: 0.1
  });
}
```

---

## 🔄 CI/CD配置

### GitHub Actions

`.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build
        run: npm run build

      - name: Deploy to Server
        uses: easingthemes/ssh-deploy@v2
        env:
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          REMOTE_HOST: ${{ secrets.REMOTE_HOST }}
          REMOTE_USER: ${{ secrets.REMOTE_USER }}
          TARGET: /var/www/aihang-sop/dist
          SOURCE: dist/
```

---

## 🧪 部署前检查清单

- [ ] 运行所有测试: `npm test`
- [ ] 检查TypeScript错误: `npm run type-check`
- [ ] 构建生产版本: `npm run build`
- [ ] 预览构建结果: `npm run preview`
- [ ] 检查包体积: 查看构建输出
- [ ] 验证环境变量配置
- [ ] 测试所有核心功能
- [ ] 检查浏览器兼容性
- [ ] 验证性能指标(Lighthouse)
- [ ] 检查安全配置(CSP/HTTPS)

---

## 🐛 故障排查

### 构建失败

**问题:** 依赖安装失败
```bash
# 清理缓存重新安装
rm -rf node_modules package-lock.json
npm install
```

**问题:** TypeScript类型错误
```bash
# 检查类型错误
npm run type-check
```

### 部署后白屏

**可能原因:**
1. 路由配置错误 - 检查服务器路由重写规则
2. 资源路径错误 - 检查`base`配置
3. JavaScript错误 - 查看浏览器控制台

**解决方案:**
```javascript
// vite.config.js
export default defineConfig({
  base: '/your-base-path/' // 如果部署在子路径
});
```

### 性能问题

**检查项:**
1. 启用gzip/brotli压缩
2. 配置静态资源缓存
3. 使用CDN加速
4. 检查包体积是否过大

---

## 📞 支持

遇到部署问题请查看:
- [GitHub Issues](https://github.com/your-repo/issues)
- [开发指南](./DEVELOPMENT_GUIDE.md)
- [架构文档](./ARCHITECTURE_COMPREHENSIVE_ANALYSIS.md)

---

**文档版本:** 1.0.0  
**最后更新:** 2024年
