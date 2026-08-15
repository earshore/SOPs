#!/usr/bin/env python3
"""Order 13 Batch 1: migrate structural slate utilities in
ppc_advertising/template.html and restricted_words/template.html to the
`.sops-neutral-*` contract classes (SOP02_SLATE_TOKEN_PLAN.md).

Screening rules (per the plan doc):
- border-slate-* / divide-slate-* / bg-slate-* (divider, card surface,
  hover rows) -> .sops-neutral-divider* / .sops-neutral-surface*
- text-slate-* used as body text hierarchy -> .sops-neutral-text*
- text-slate-* used as muted secondary copy (labels, timestamps, hints)
  -> .sops-neutral-text-muted
- text-slate-400 (faintest tier, placeholders) -> .sops-neutral-text-faint
- state-semantic usage (e.g. muted row markers in status tables) stays
  and is recorded in the screening table — verified: these two files'
  slate usage is structural/typographic only (no status-slate markers;
  status colors live in amber/emerald/red families).
"""
import re
import sys

REPLACEMENTS = [
    # Divider family
    (r"\bborder-slate-200\b", "sops-neutral-divider"),
    (r"\bborder-slate-100\b", "sops-neutral-divider-soft"),
    (r"\bdivide-slate-100\b", "sops-neutral-divider-soft"),
    # Surface family
    (r"\bbg-slate-100\b", "sops-neutral-surface-raised"),
    (r"\bbg-slate-50\b", "sops-neutral-surface"),
    # Text hierarchy (order matters: faint first to avoid 500 matching 400)
    (r"\btext-slate-400\b", "sops-neutral-text-faint"),
    (r"\btext-slate-300\b", "sops-neutral-text-faint"),
    (r"\btext-slate-500\b", "sops-neutral-text-muted"),
    (r"\btext-slate-600\b", "sops-neutral-text-muted"),
    (r"\btext-slate-700\b", "sops-neutral-text"),
    (r"\btext-slate-800\b", "sops-neutral-text-strong"),
]

FILES = [
    "src/modules/sops/views/growth/ppc_advertising/template.html",
    "src/modules/sops/views/growth/restricted_words/template.html",
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
print("files migrated:", len(FILES))
