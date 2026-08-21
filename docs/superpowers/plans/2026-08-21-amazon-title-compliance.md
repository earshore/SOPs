# Amazon 2026 商品名称合规 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Amazon 2026 商品名称指南落地为带适用性上下文的标题/亮点校验、提示词约束、辅助提取提示和一致文档。

**Architecture:** 保留 `titleComplianceService` 的纯函数和 v1/v2 兼容接口，在服务内部先解析商城、类目、首次发布和变体上下文，再运行适用规则。PromptLab 只负责生成约束，Deep Chat/Keyword Hunter 通过共享提取函数提供辅助告警；最终发布入口可据报告决定 warning 或阻止。

**Tech Stack:** TypeScript, Vitest, existing PromptLab/Keyword Hunter modules, Markdown/HTML templates.

---

### Task 1: Rewrite the specification and establish the execution contract

**Files:**
- Modify: `worknotes/spec-amazon-title-2026.md`
- Create: `docs/superpowers/specs/2026-08-21-amazon-title-compliance-design.md`
- Create: `docs/superpowers/plans/2026-08-21-amazon-title-compliance.md`

- [x] **Step 1: Record the PDF scope, exceptions, field split, and acceptance criteria.**
- [x] **Step 2: Remove unsupported 2026-07-27 and global-75 assertions.**
- [x] **Step 3: Self-review for contradictions between v1 compatibility and v2 applicability.**

### Task 2: Make the compliance service context-aware (TDD)

**Files:**
- Test: `tests/unit/titleComplianceService.test.ts`
- Modify: `src/services/titleComplianceService.ts`

- [x] **Step 1: Add failing tests** for `isFirstPublication`, exempt marketplaces/media categories, FSA/HSA phrases, permitted unit abbreviations, exact banned characters, highlights, parent/child variation context, and Unicode character counting.
- [x] **Step 2: Run** `npm test -- --run tests/unit/titleComplianceService.test.ts` and confirm the new assertions fail for the missing behavior.
- [x] **Step 3: Add the smallest context resolver and input fields**; return v1 baseline for exempt contexts and v2 only when applicable.
- [x] **Step 4: Add restricted phrase, highlights, and variation checks; correct the character/context rules without changing unrelated behavior.
- [x] **Step 5: Run the focused test until green, then run the existing title test suite again.

### Task 3: Align PromptLab generation rules (TDD)

**Files:**
- Test: `tests/unit/promptlabService.titleRules.test.ts`
- Modify: `src/modules/app_center/views/master_analysis/services/promptlabService.ts`

- [x] **Step 1: Add failing assertions** that v2 permits `cm/oz/in/kg` and rejects complete FSA/HSA eligibility phrases.
- [x] **Step 2: Run the focused PromptLab test and verify the failure is caused by the current instruction text.
- [x] **Step 3: Update only the v2 guideline strings and generated compliance checklist text.
- [x] **Step 4: Run the PromptLab title-rule tests and type-check the changed service.

### Task 4: Add shared title extraction and auxiliary UI diagnostics (TDD)

**Files:**
- Test: `src/modules/app_center/views/playground/deep-chat/composer/listingCopySanitize.test.ts`
- Test: `src/modules/app_center/views/keyword_hunter/input/titleCompliance.test.ts`
- Create: `src/modules/app_center/views/keyword_hunter/input/titleCompliance.ts`
- Modify: `src/modules/app_center/views/playground/deep-chat/composer/listingCopySanitize.ts`
- Modify: `src/modules/app_center/views/keyword_hunter/input/index.ts`

- [x] **Step 1: Add failing tests** for all supported Title/Titel markers and explicit “not found” results.
- [x] **Step 2: Run the focused tests and verify they fail before the helper exists.
- [x] **Step 3: Implement the shared extractor using Unicode-safe title counting and structured “found/not found” output.
- [x] **Step 4: Use it for Keyword Hunter counters/warnings and keep Deep Chat display sanitization behavior unchanged.
- [x] **Step 5: Run focused tests and lint the changed files.

### Task 5: Correct operational documentation and static examples

**Files:**
- Modify: `src/modules/amz_hub/views/knowledge/seo_strategy/template.html`
- Modify: `src/modules/amz_hub/views/practice/quality_listing/template.html`
- Modify: `src/modules/sops/views/growth/listing_seo/template.html`

- [x] **Step 1: Replace old 60/200, 70–80/80, Europe-only, and unsupported transition-date language.
- [x] **Step 2: Replace the overlong synonym-stuffed example and stop describing `&` as forbidden.
- [x] **Step 3: Add the explicit scope/field split/FSA-HSA/brand-field caveat while retaining existing 75 and 125 checklist items.
- [x] **Step 4: Run targeted text searches for stale claims and format checks on changed Markdown/HTML.

### Task 6: Verification and handoff

**Files:**
- No new production files.

- [x] **Step 1: Run** `npm test -- --run tests/unit/titleComplianceService.test.ts tests/unit/promptlabService.titleRules.test.ts` (连同 Keyword Hunter、提取器/Deep Chat 定向测试共 124/124 通过)。
- [x] **Step 2: Run** `npm run type-check` and `npm run lint -- --no-fix` (or the repository-equivalent focused lint command).
- [x] **Step 3: Run** `rg -n "200 字符|60 字符|2026-07-27|欧洲站通用|前 80|前 70–80|不使用计量单位缩写"` over the changed docs/source and resolve only task-related matches.
- [x] **Step 4: Review `git diff` and report any unrelated pre-existing changes without removing them.

> 全量 `npm test -- --run` 已完成：348 个测试文件通过，4 个文件中的 7 个既有测试失败（PromptLab 配置偏好、PC motion CSS、UI 模板可访问性、API endpoint 模板约束等）；本次新增标题合规、提取器和 Keyword Hunter 定向回归均通过。
