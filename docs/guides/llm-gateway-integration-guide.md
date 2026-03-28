# LLM 网关接入指南

> 本指南说明如何在 SOPs 项目中接入新的 OpenAI 兼容网关。  
> 整体架构：前端只持有统一访问密码，所有 LLM 请求经由 Cloudflare Functions 代理并转发到对应网关。

---

## 架构概览

```
用户浏览器
  │  Authorization: Bearer <AUTH_PASSWORD>
  │  X-Gateway-Provider: <provider_id>
  ▼
Cloudflare Functions (sops-c)
  │  验证 AUTH_PASSWORD
  │  查路由表 → 取真实 baseURL + apiKey
  ▼
上游 LLM 网关 (OpenAI 兼容)
```

**设计原则：**
- 前端永远只请求相对路径 `/v1/...`，由 CF Functions 代理
- 用户只需填写一个统一密码 `AUTH_PASSWORD`，网关真实 key 永不暴露到前端
- 每个网关用唯一的 `provider_id`（纯小写字母+下划线）标识

---

## 接入步骤

接入一个新网关需要改动 **4 个文件** + 执行 **1 条命令**。

### 第 1 步：注册前端展示配置

文件：`src/common/constants/constants.ts`

在 `PROVIDERS` 对象中新增一项：

```ts
your_gateway: {
  name: "显示名称",
  endpoint: "https://your-gateway.example.com/v1",  // 仅用于展示，不参与实际请求
  models: [
    { id: "model-name-1", context: 128000, features: ["function"] },
    { id: "model-name-2", context: 32000,  features: ["function"] },
  ],
},
```

**注意事项：**
- `key`（如 `your_gateway`）即 `provider_id`，全项目唯一，只能含小写字母和下划线
- `endpoint` 字段仅在系统设置 UI 中展示，真实路由由 CF Functions 决定，填写实际网关地址即可
- `features` 可选值：`"function"`（工具调用）、`"vision"`（图像）、`"audio"`（音频）、`"code"`（代码）

---

### 第 2 步：注册 CF Functions 路由

文件：`functions/v1/chat/completions.js` 和 `functions/v1/models.js`

两个文件都有 `resolveGateway()` 函数，**在 `map` 对象中同步新增一项**：

```js
your_gateway: {
  baseUrl: env.GATEWAY_YOUR_GATEWAY_BASE_URL || "https://your-gateway.example.com/v1",
  apiKey:  env.GATEWAY_YOUR_GATEWAY_API_KEY  || "",
},
```

**注意事项：**
- 环境变量命名规则：`GATEWAY_` + provider_id 全大写（下划线保留）+ `_BASE_URL` / `_API_KEY`
- 两个文件（`completions.js` 和 `models.js`）必须**同步修改**，否则模型列表拉取和对话调用会路由不一致
- `|| ""` 的 fallback 留空即可，CF 会在 apiKey 为空时返回 500 并提示配置缺失

---

### 第 3 步：更新 API 端点白名单

文件：`src/common/config/apiEndpoints.ts`

在 `API_ENDPOINTS` 对象中新增域名记录：

```ts
your_gateway: {
  domain: 'your-gateway.example.com',
  requiresProxy: false,
  displayName: '显示名称',
  isDangerous: false,   // 必须为 false，表示经由 CF 代理，不是危险的直连外部 API
},
```

**注意事项：**
- `isDangerous` 必须填 `false`。如果误填 `true`，生产环境会触发安全拦截，调用直接报错
- `domain` 只填域名本身，不带 `https://` 和路径

---

### 第 4 步：配置本地 .env

文件：`.env`（不提交到 Git）

```env
# your_gateway 网关
GATEWAY_YOUR_GATEWAY_BASE_URL = https://your-gateway.example.com/v1
GATEWAY_YOUR_GATEWAY_API_KEY  = sk-xxxxxxxxxxxxxxxx
```

---

### 第 5 步：同步到 Cloudflare Pages 环境变量

**本地开发只改 `.env` 即可，生产部署必须执行此步：**

创建临时文件 `secrets.json`（执行后立即删除）：

```json
{
  "GATEWAY_YOUR_GATEWAY_BASE_URL": "https://your-gateway.example.com/v1",
  "GATEWAY_YOUR_GATEWAY_API_KEY": "sk-xxxxxxxxxxxxxxxx"
}
```

上传并删除：

```powershell
npx wrangler pages secret bulk secrets.json --project-name sops-c
del secrets.json
```

然后重新构建部署：

```powershell
npm run build
npx wrangler pages deploy dist --project-name sops-c --branch b-main-copy --commit-dirty=true
```

---

## 完整改动清单

| 序号 | 文件 | 操作 |
|------|------|------|
| 1 | `src/common/constants/constants.ts` | `PROVIDERS` 新增网关项 |
| 2 | `functions/v1/chat/completions.js` | `resolveGateway()` 的 `map` 新增路由项 |
| 3 | `functions/v1/models.js` | `resolveGateway()` 的 `map` 新增路由项（同步 #2）|
| 4 | `src/common/config/apiEndpoints.ts` | `API_ENDPOINTS` 新增域名，`isDangerous: false` |
| 5 | `.env` | 新增两行 env 变量（本地） |
| 6 | Cloudflare Pages | `wrangler pages secret bulk` 同步生产 env |

---

## 常见错误排查

### CORS 报错 / Failed to fetch
**症状：** `Access to fetch ... has been blocked by CORS policy`  
**原因：** 请求绕过了 CF Functions，直接打到外部 URL  
**检查：** `src/common/config/envConfig.ts` 的 `normalizeEndpoint()` 必须始终返回 `this.baseUrl`（相对路径），不能返回完整的 `https://` URL

### 401 访问被拒绝
**症状：** 控制台返回 `⛔ 访问被拒绝：请输入正确的访问密码`  
**原因：** 前端填写的 API Key 与 CF 环境变量 `AUTH_PASSWORD` 不匹配  
**解决：** 系统设置中的 API Key 填写 `.env` 中 `AUTH_PASSWORD` 的值（当前为 `AI2027`）

### 网关 API Key 未配置
**症状：** 返回 `⛔ 网关 xxx 未配置 API Key，请检查 Cloudflare 环境变量`  
**原因：** CF Pages 环境变量中对应的 `GATEWAY_xxx_API_KEY` 未设置  
**解决：** 执行 `wrangler pages secret bulk` 上传对应变量

### 未知网关标识
**症状：** 返回 `⛔ 未知网关标识: xxx，支持: ...`  
**原因：** 只改了 `constants.ts`，忘记同步 `completions.js` / `models.js`  
**解决：** 确保三处 provider_id 完全一致（大小写敏感）

### 模型列表拉取正常但对话失败
**原因：** `models.js` 和 `completions.js` 路由配置不一致（一个改了一个没改）  
**解决：** 对比两个文件的 `resolveGateway()` 确保完全同步

---

## 当前已接入网关

| provider_id | 显示名称 | Endpoint | 环境变量前缀 |
|-------------|---------|---------|------------|
| `llmgateway` | AI-Gateway | `https://ai-gateway.hongecb.store/v1` | `GATEWAY_LLMGATEWAY_` |
| `cb` | CB Gateway | `https://cb.hongecb.store/v1` | `GATEWAY_CB_` |
| `cb_e` | CB-E Gateway | `https://cb-e.cflts.dpdns.org/v1` | `GATEWAY_CB_E_` |
| `dooo_cn` | Dooong AI(CN) | `https://ai.ijunze.cn/v1` | `GATEWAY_DOOO_CN_` |
| `dooo` | Dooong AI | `https://ai.dooo.ng/v1` | `GATEWAY_DOOO_` |
