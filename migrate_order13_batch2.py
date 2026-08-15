#!/usr/bin/env python3
"""Order 13 Batch 2: migrate structural slate utilities in the service group
(email_templates / negative_review / qa_maintenance) to .sops-neutral-*
contract classes (SOP02_SLATE_TOKEN_PLAN.md §4b).

Screening rules (per the plan doc + batch-1 precedent):
- border-slate-200 -> .sops-neutral-divider            (divider)
- border-slate-100 / divide-slate-100 -> .sops-neutral-divider-soft
- bg-slate-50 -> .sops-neutral-surface                 (card surface)
- bg-slate-100 -> .sops-neutral-surface-raised         (raised surface)
- text-slate-300/400 -> .sops-neutral-text-faint
- text-slate-500/600 -> .sops-neutral-text-muted
- text-slate-700 -> .sops-neutral-text
- text-slate-800 -> .sops-neutral-text-strong

Retained by screening (state-semantic badges, recorded):
- bg-slate-400 x5: priority/category badges (P3 badge in email_templates
  parallels the P0 red/P1 amber/P2 primary/EU purple family; E类 badge in
  qa_maintenance) — state semantics, keep in place.
- bg-slate-200 x3: inline status mini-labels — state semantics, keep.
- border-slate-300 x4: input/checkbox control borders (batch-1 precedent) —
  control border contract, keep.
"""
import re

REPLACEMENTS = [
    (r"\bborder-slate-200\b", "sops-neutral-divider"),
    (r"\bborder-slate-100\b", "sops-neutral-divider-soft"),
    (r"\bdivide-slate-100\b", "sops-neutral-divider-soft"),
    (r"\bbg-slate-100\b", "sops-neutral-surface-raised"),
    (r"\bbg-slate-50\b", "sops-neutral-surface"),
    (r"\btext-slate-400\b", "sops-neutral-text-faint"),
    (r"\btext-slate-300\b", "sops-neutral-text-faint"),
    (r"\btext-slate-500\b", "sops-neutral-text-muted"),
    (r"\btext-slate-600\b", "sops-neutral-text-muted"),
    (r"\btext-slate-700\b", "sops-neutral-text"),
    (r"\btext-slate-800\b", "sops-neutral-text-strong"),
]

FILES = [
    "src/modules/sops/views/service/email_templates/template.html",
    "src/modules/sops/views/service/negative_review/template.html",
    "src/modules/sops/views/service/qa_maintenance/template.html",
]

report = []
for f in FILES:
    t = open(f, encoding="utf-8").read()
    for pat, rep in REPLACEMENTS:
        n = len(re.findall(pat, t))
        if n:
            t = re.sub(pat, rep, t)
            report.append(f"{f}: {pat} -> {rep} x{n}")
    open(f, "w", encoding="utf-8").write(t)

print("\n".join(report))
