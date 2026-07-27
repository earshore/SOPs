# Deep Chat Vision Upload UX M1 — 上线前审查（当前功能分支）

**Date:** 2026-07-28  
**Branch under review:** `feature/deep-chat-vision-upload-ux`  
**HEAD:** `5daece459317fd8014499c6636785687ed244f98`  
**Merge base (`main`):** `ab40abc1a354ad53bae0022aafea2d69de621c66`  
**Constraint from owner:** **禁止合并到 `main`，直至人工拍板。** 本审查仅在当前分支执行与记录。

**Spec:** [2026-07-27-deep-chat-vision-upload-ux-design.md](../specs/2026-07-27-deep-chat-vision-upload-ux-design.md)  
**Plan:** [2026-07-27-deep-chat-vision-upload-ux.md](../plans/2026-07-27-deep-chat-vision-upload-ux.md)  
**Prior branch code review:** [2026-07-28-deep-chat-vision-upload-branch-review.md](./2026-07-28-deep-chat-vision-upload-branch-review.md)

---

## 0. 审查范围与非范围

### 在范围内

- Plan Tasks 1–8 实现是否齐全  
- Spec 约束（白名单、12MB、无 base64 落盘、ghost 次级钮、helper、meta、脱敏）  
- **本分支上新鲜执行的自动化门禁**（见 §2）  
- 安全/回滚/残余风险  
- 是否允许「等你拍板后合并」

### 明确不在本审查内

- **未** `git merge` / `git push` / 开 PR / 部署 Pages  
- **未** 在真实 vision 模型上完成人工 E1–E13 全矩阵  
- **未** 跑全仓 release-smoke / 全量 `ci:quality`（仅 deep-chat 相关门禁 + type-check + lint warning-gate）

---

## 1. Plan 完成度

| Task | 交付 | 分支证据（commit 主题） | 审查 |
| --- | --- | --- | --- |
| 1 校验 SSOT | 白名单 / 12MB / SVG / 远程拒 | `bfe65397` | 过 |
| 2 请求路径 + meta + 脱敏 | 不落盘、count meta | `b4c8088c` | 过 |
| 3 Config + padding 108 | images + 文案 | `eaedfbd6` | 过 |
| 4 Styles ghost + 双主排除 | CSS | `d7df779f` | 过 |
| 5 Aligner + helper | submit-only + 卡片外 helper | `5a29538a` | 过 |
| 6 模型切换 / 粘贴 | toast 诚实 | `7205e851` | 过 |
| 7 测试门禁 | unit + e2e 诚实 skip | `f0efc731` + `5daece45` | 过 |
| 8 CHANGELOG | Unreleased | `5daece45` | 过 |

**结论：** Plan 实现任务 **已全部完成**（代码 + 自动化门禁层面）。

---

## 2. 本审查新鲜门禁证据（2026-07-28 当场重跑）

| 门禁 | 命令 | 结果 | Exit |
| --- | --- | --- | --- |
| Unit / integration | `npx vitest run src/modules/app_center/views/playground/deep-chat` | **190 passed / 19 files** | **0** |
| TypeScript | `npm run type-check` | `tsc --noEmit` clean | **0** |
| ESLint warning gate | `npm run lint:warning-gate` | **0/0 warning(s)** | **0** |
| E2E send suite | `npx playwright test tests/e2e/deep-chat-send.spec.ts --project=chromium --workers=1` | **18 passed, 1 skipped** | **0** |

### E2E 细分（vision 相关）

| 用例 | 结果 | 含义 |
| --- | --- | --- |
| non-vision：隐藏上传 + 发送钉位 | **PASS** | 硬门禁 |
| vision seed 后发送钉位 | **PASS** | 硬门禁 |
| upload 出现时双按钮几何 | **SKIPPED** | 诚实 skip → 人工 E1/V1；**非假绿** |

其余 send/stop/skill/viewport 用例均 **PASS**（发送几何回归面未坏）。

---

## 3. Spec 约束静态核对（代码抽样）

| 约束 | 状态 | 证据 |
| --- | --- | --- |
| MAX 4 / 5MB / **12MB total** | Pass | `visionAttachments.ts` L11–15 |
| 白名单、无 `image/*` | Pass | `DEEP_CHAT_VISION_ACCEPTED_FORMATS` L17–18 |
| 禁 SVG / bmp；拒 http(s) | Pass | `isSvg` / `isAllowedVisionImage` / remote 分支 |
| 中文 COPY SSOT | Pass | `DEEP_CHAT_VISION_COPY` L23–40 |
| 无 base64 落盘 | Pass | 集成测 + `attachmentMeta: { count }` 路径 |
| 历史诚实 | Pass | `historyMeta` + display-only 包装 |
| data:image 日志脱敏 | Pass | `uiHooks` redaction 单测 2 条 |
| Ghost + `:not(#upload-images-button)` | Pass | `deepChatStyles.ts` 大量排除选择器；upload `end: 55px` |
| Helper 文案 | Pass | `helper` 与 host `syncDeepChatVisionHelper` |
| 模型切换不静默清空 | Pass | `shellUi` toast `modelSwitch` |
| CHANGELOG Unreleased | Pass | 提交 `5daece45` |

---

## 4. 安全与隐私

| 项 | 判定 |
| --- | --- |
| SVG XSS 面 | 已收口（mime + 扩展名） |
| 远程图 URL | 拒绝（M1） |
| Thread / localStorage 大图 | 禁止 base64；仅 count meta |
| 日志 | 脱敏 data:image / 长 base64 |
| Magic-byte 深度检查 | **非目标**（接受） |
| 线包 ≈4/3 仍可能 413 | **残余**；有 `payloadLarge` 友好映射（best-effort） |

**无 Critical 安全阻断。**

---

## 5. 上线前缺口（必须对你诚实）

| ID | 缺口 | 严重度 | 是否阻断「合并」 | 是否阻断「生产发版」 |
| --- | --- | --- | --- | --- |
| P1 | 人工矩阵 E1–E13 未在真 vision 模型上勾完 | Important | 否（可带「合并后人工」） | **是（建议）** |
| P2 | Mock 下双按钮几何 e2e 常 skip | Minor/Important | 否（已诚实） | 否（人工 E1） |
| P3 | 未跑全仓 release-smoke / 生产 build 产物审查 | Important | 否（功能分支审查足够） | **是（发版前）** |
| P4 | 设计/SDD 文档大量 untracked，未入分支提交 | Minor | 否 | 否（文档卫生） |
| P5 | 工作区另有无关脏文件（`docs/XSS_SCAN_REPORT.md` 等） | Minor | 否 | 否（勿误带入） |
| P6 | 未 push / 无 PR | Info | 否 | 否 |

---

## 6. 回滚

- **无 feature flag**（spec 明确）。  
- 回滚 = Pages 回上一部署 / `git revert` 本分支 8 个 commit 范围。  
- 数据面：无新增云端存储；最坏本地 thread 多 `attachmentMeta.count` 字段，向前兼容。

---

## 7. 裁决

### 7.1 对「当前功能分支质量」

| 问题 | 裁决 |
| --- | --- |
| Plan 是否执行完？ | **是** |
| 自动化门禁（本审查当场）？ | **全部通过**（e2e 1 skip 诚实） |
| 是否发现必须立刻修的 Critical？ | **否** |
| 分支代码审查？ | 维持 **Ready to merge（待你拍板）** |

### 7.2 对「合并到 main」

**禁止自动合并。**  
在你书面拍板前，本代理 **不会** 执行 `merge` 到 `main` / 默认分支。

**建议你拍板合并的前提（最低）：**

1. 认可本报告 §2 门禁证据  
2. 接受 P1/P2 人工矩阵为 **合并后或发版前** 清单  
3. 确认不要把无关脏文件带进合并  

### 7.3 对「生产上线 / 发版」

**尚不可签发「可上线」最终 Go。**  
发版前仍需：

1. 真机 vision：至少 E1、E2、E3/E4 或 E5、E6、E7、E12  
2. 全量或发布流水线 smoke / build  
3. 发布说明与回滚窗口确认  

---

## 8. 总体结论（一句话）

**在 `feature/deep-chat-vision-upload-ux` 上：Plan 已完成，当场自动化门禁全绿，上线前代码审查通过「可合并待拍板」；未获你批准前不合并 main；完整生产上线还需人工 vision 矩阵与发版流水线。**

---

## 9. Sign-off

| 角色 | 状态 | 备注 |
| --- | --- | --- |
| 工程自动化审查（本文件） | **PASS — MERGE_WHEN_APPROVED** | 禁止擅自合 main |
| 产品人工 E1–E13 | **PENDING** | 见 spec §9.6 |
| 发版 / 上线签字 | **NOT REQUESTED / NOT GRANTED** | 等你拍板 |

**Reviewer:** Agent prelaunch pass on feature branch only  
**Date:** 2026-07-28  
**No merge performed.**
