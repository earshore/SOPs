# 安全 Playbook（BYOK 静态站）

**Status:** active · SSOT · v1.0  
**Updated:** 2026-07-26  
**Owner:** 工程 + 维护者  
**产品形态:** Cloudflare Pages 静态前端 + 浏览器本地数据 + 用户自备 LLM/采集网关（BYOK）

> **上位法：** 根目录 [SECURITY.md](../SECURITY.md)（报告渠道与支持版本）  
> **产品边界：** [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)  
> **部署/CSP：** [DEPLOYMENT.md](./DEPLOYMENT.md) · **事故处理：** [OPS_RUNBOOK.md](./OPS_RUNBOOK.md)

本文**不**覆盖：多租户登录、服务端会话、RBAC、服务端代持生产 LLM Key。

---

## 1. 威胁模型（一页纸）

### 1.1 资产

| 资产 | 位置 | 敏感度 |
| --- | --- | --- |
| LLM API Key | 浏览器本机加密存储（非服务端） | 高 |
| 采集代理 Key | 同上 | 高 |
| 作业数据 / 历史 / 导出备份 | localStorage / IndexedDB / 用户磁盘 JSON | 中–高 |
| 静态 JS/CSS | Cloudflare Pages `dist/` | 中（供应链/篡改） |
| 网关策略与额度 | new-api 后台（本仓外） | 高 |

### 1.2 信任边界

```
[用户浏览器]
   ├─ 本机存储（密钥、配置、历史）
   ├─ 同源页面脚本（完全可信于该源）
   ├─ 浏览器扩展 / 本机其他进程（半可信 / 敌对）
   └─ 网络
        ├─ Pages CDN（静态）
        ├─ new-api 网关（用户 Key）
        └─ 第三方采集 API（用户 Key）
```

### 1.3 主要威胁与处置

| 威胁 | 场景 | 缓解（现状 + 要求） | 残余风险 |
| --- | --- | --- | --- |
| **XSS → 读本机密钥** | 未转义 `innerHTML` / 危险 Markdown | 安全渲染（`setSafeHtml` / textContent）；`xss:gate`；禁止业务裸 `innerHTML` 用户数据 | 同源恶意扩展仍可读存储 |
| **密钥入库** | 提交 `.env`、文档、示例 | `secret:scan`；SECURITY 禁止清单；Keys 不进 Pages secrets | 历史 git 需人工轮换 |
| **导出备份泄露** | 用户导出 JSON 含 secrets | 导出确认文案 + 安全边界句；用户自管文件 | 用户误传文件 |
| **供应链** | 依赖漏洞 / 恶意包 | `ci:security`、审计；锁文件 | 传递依赖滞后 |
| **网关滥用** | Key 泄露后被刷量 | 额度/限流在 **new-api**；前端不托管 | 用户弱 Key 策略 |
| **CSP 绕过** | 改坏 `_headers` | 发版查 CSP；DEPLOYMENT 契约 | 人为改坏 |
| **点击劫持** | iframe 嵌套 | `X-Frame-Options: DENY` 等响应头 | — |
| **本地清空** | 误点危险操作 | `confirmWithModal` 二次确认 | 无服务端恢复 |
| **多用户** | N/A | **不做**；单浏览器信任模型 | 共享电脑需用户自管 |

### 1.4 明确不防御（产品诚实）

- 同源脚本或已安装的恶意扩展读取 localStorage/IndexedDB  
- 用户主动导出后把备份发到不可信渠道  
- 网关运营方滥用日志（由网关运营治理，非本仓）  
- 无账号体系下的「跨设备同步安全」

---

## 2. 安全验收清单（PR / RC）

### 2.1 每个触及 UI 或数据的 PR

- [ ] 用户/模型输出 HTML 不走裸 `innerHTML`（`textContent` / `setSafeHtml` / 静态模板）  
- [ ] 无新增密钥、token、内网账号进 diff  
- [ ] 危险操作（清空、replace 导入）有共享确认  
- [ ] 新增外连域名已更新 CSP（`public/_headers` / 策略文档）  
- [ ] Toast/错误文案不打印完整 Key  

### 2.2 设置 / 存储 / 导出

- [ ] 密钥字段可遮罩；边界文案不承诺「服务端加密托管」  
- [ ] 导出路径提示可能含密钥  
- [ ] 导入失败不半写入后静默成功  

### 2.3 发版 / 部署

- [ ] `npm run ci:security` 绿（或完整 `npm run build`）  
- [ ] 生产 CSP `connect-src` 仍含网关域，且无擅自放行模型直连厂商（见 DEPLOYMENT）  
- [ ] 未把生产 LLM Key 配进 Cloudflare Pages 项目密钥  
- [ ] 若启用 Sentry：DSN 主机已进 CSP，且发版说明写明  

### 2.4 命令

```bash
npm run xss:gate
npm run secret:scan
npm run ci:security
```

---

## 3. 事件响应（摘要）

| 事件 | 动作 |
| --- | --- |
| 密钥进仓 | 立即轮换；`git` 历史清理评估；通知维护者 |
| 疑似 XSS | 修渲染路径；`xss:gate`；评估是否需用户改 Key |
| 站点被挂马/异常 JS | Pages 回滚上一部署；查构建产物与 DNS |
| 用户报告 Key 被刷 | 网关侧禁用 Key；用户本机清存储并换 Key |

详细回滚步骤：[OPS_RUNBOOK.md](./OPS_RUNBOOK.md)。报告渠道：[SECURITY.md](../SECURITY.md)。

---

## 4. 工具与门禁

| 工具 | 命令 | 作用 |
| --- | --- | --- |
| XSS 门 | `npm run xss:gate` | 静态扫描危险渲染模式 |
| Secret 扫描 | `npm run secret:scan` | 防密钥入库 |
| 循环依赖 | `npm run circular:check` | 架构卫生 |
| 汇总 | `npm run ci:security` | prebuild 绑定 |

---

## 5. 相关

- [SECURITY.md](../SECURITY.md)  
- [PRODUCT_PRINCIPLES.md](./PRODUCT_PRINCIPLES.md)  
- [CONTENT_DESIGN.md](./CONTENT_DESIGN.md)（安全文案诚实）  
- [COMPONENT_GUIDELINES.md](./COMPONENT_GUIDELINES.md)  
- [TECH_DEBT_BOARD.md](./TECH_DEBT_BOARD.md)  
