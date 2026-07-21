# Amazon Skills Page + Skill Registry Design Spec

**Date:** 2026-07-21  
**Status:** Implemented  
**Scope:** Phase A — Skills page + callable skillRegistry (not workbench UI)

> Chinese product copy for UI is defined in the implementation plan and code.
> This document is the approved engineering design (restored after encoding corruption of the original Chinese draft).

## 1. Goals

1. Add **Skills** under More → LLM Explore, matching explore violet style.
2. Ship Amazon-Skills assets under endor/amazon-skills (intended submodule; archive vendor used when git clone blocked).
3. Provide full-app skillRegistry with list / get / loadSkillContext.
4. Workbench may load any skill by id (no PPC/Daily Report binding this phase).
5. More overview card entry with badge **已接入**.

## 2. Locked Decisions

| ID | Decision | Choice |
|----|----------|--------|
| D1 | Scope | Skills page + Registry; explicit skillId load |
| D2 | Assets | endor/amazon-skills from nexscope-ai/Amazon-Skills |
| D3 | Load | Vite import.meta.glob + runtime parse |
| D4 | Consumer | In-app agents/workflows |
| D5 | Language | Chinese UI shell + English SKILL.md body |
| D6 | Default format | loadSkillContext → 
aw |
| D7 | scripts | metadata only; ?url probe; never execute in browser |
| D8 | DI | singleton export only |
| D9 | UI | explore violet + prompts patterns |
| D10 | Overview | card between Agents and Prompts; badge 已接入 |

## 3. Routing

- routeId: more_skills
- path: /more/explore/skills
- label: 技能
- icon: as fa-graduation-cap
- category: explore
- alias: /more_skills
- order: agents → **skills** → prompts → workflows

## 4. skillRegistry API

- ensureInitialized() soft-empty ok
- listSkills(query?)
- getSkill(id) / hasSkill(id)
- getCategories()
- loadSkillContext(id, { format?: 'raw'|'body' }) — SKILL_REG_001 / SKILL_REG_002
- loadSkillsContext(ids, { strict?, format? })
- getStats()
- Never default-inject all skills into one prompt

## 5. Skills Page UI

Banner + metrics + workbench contract snippet + search + categories + cards + detail modal (copy raw / id / install cmd). Safe DOM (	extContent / createElement).

## 6. More Overview

Insert skills card; explore subtitle includes 技能; badge 已接入.

## 7. Implementation Evidence (CP4)

- Unit tests: skillRegistry + router paths (30 related tests green)
- 
pm run type-check green
- 
pm run build:app green (skills chunk produced)

## 8. Known Deviation

Git submodule clone failed (HTTPS to github.com reset). Assets committed as vendor snapshot (52 SKILL.md trees) with endor/amazon-skills/VENDOR_SOURCE.md upgrade path to submodule.

## 9. Out of Scope (kept)

Workbench UI, script execution, LLM on page, force-bind PPC agents, DI registration, full Chinese translation of SKILL.md.
