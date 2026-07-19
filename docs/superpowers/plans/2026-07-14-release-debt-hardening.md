# Release Debt Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按已批准规格把仓库收紧为可本地证明的发布候选，并保留生产环境外部验证门禁。

**Architecture:** 工作拆成四个按依赖顺序执行的计划。前三个计划分别交付静态托管合同、质量/运行时合同和浏览器测试合同；第四个计划只组合这些已验证入口，生成发布产物、SBOM、readiness 记录并定义真实 Cloudflare/Sentry 验证。

**Tech Stack:** TypeScript、Vitest、Vite、Playwright、Lighthouse、npm、Cloudflare Pages、GitHub Actions YAML

---

## Execution order

1. [Routing and static-host contract](./2026-07-14-release-debt-hardening-01-routing-static.md)
2. [Quality, Node, and scanner debt](./2026-07-14-release-debt-hardening-02-quality-runtime.md)
3. [Browser isolation and performance](./2026-07-14-release-debt-hardening-03-browser-performance.md)
4. [Release orchestration and production governance](./2026-07-14-release-debt-hardening-04-release-governance.md)

Do not begin a later plan until the preceding plan's final verification and commit are complete. Plans 1–3 create the commands consumed by Plan 4.

## Shared invariants

- Use TDD for every behavior change: add a focused failing test, observe the expected failure, implement the minimum change, rerun the focused test, then run the plan-level gate.
- Do not run or repair GitHub Actions quota/billing. Workflow files are checked statically only.
- Do not deploy, push, tag, create a GitHub Release, or mutate Cloudflare/Sentry state.
- Preserve unrelated user changes. Every commit stages only the files named by its task.
- Generated reports under ignored paths are evidence, not commits.
- A missing report, interrupted test, or externally unverified production condition is never reported as passed.

## Final evidence

After all four plans:

```powershell
npm run release:gate
npm run tech-debt:gate
git status --short
```

Expected:

- `release:gate` exits 0 and creates a verified archive, CycloneDX SBOM, `build-info.json`, `release-readiness.json`, release notes, and `SHA256SUMS.txt`.
- `tech-debt:gate` reports zero actionable critical/high/medium findings.
- `git status --short` is empty after the final intended commit.

Production readiness is a separate command and requires external inputs:

```powershell
$env:PAGES_PREVIEW_URL='https://preview.example'
$env:MONITORING_MODE='verified'
npm run release:production-gate
```

Do not execute this example without a real preview URL and the approved monitoring evidence. Until then the allowed conclusion is “release-candidate ready; production externally unverified.”
