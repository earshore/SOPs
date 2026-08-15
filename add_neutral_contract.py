#!/usr/bin/env python3
"""次序 13 批 1：在 sops_style.css 中 .npi-tracker-page 契约块后插入 .sops-neutral 契约族。"""

path = "/home/ubuntu/SOPs/src/modules/sops/sops_style.css"
lines = open(path, encoding="utf-8").read().split("\n")

# 定位 .npi-tracker-page 便利类块（.npi-status-neutral-soft 之后）与 dark subtle 块尾
anchor = None
for i, ln in enumerate(lines):
    if ln == ".npi-status-neutral-soft {":
        anchor = i
if anchor is None:
    raise SystemExit("anchor not found")

# anchor 之后找到 .npi-status-neutral-soft 块的结束 "}"
end = None
depth = 0
started = False
for j in range(anchor, len(lines)):
    ln = lines[j]
    if ln.endswith("{"):
        depth += 1
        started = True
    if ln.strip() == "}":
        depth -= 1
        if started and depth == 0:
            end = j
            break
if end is None:
    raise SystemExit("end brace not found")

insert_at = end + 1

neutral_block = """
/* Order 13 (SOP-02 Step 1): `.sops-neutral-*` contract — structural slate
 * gray-scale families (dividers, card surfaces, body text hierarchy, muted
 * copy). Structural context only: border/divide/bg and body-text levels.
 * Slate uses carrying real status semantics are screened out per the
 * `SOP02_SLATE_TOKEN_PLAN.md` screening table and left in place.
 * Dark flips apply automatically via the token redefinitions below — no
 * per-class dark selectors needed. */
.sops-neutral {
  --sops-neutral-divider: #e2e8f0;
  --sops-neutral-divider-soft: #f1f5f9;
  --sops-neutral-surface: #f8fafc;
  --sops-neutral-surface-raised: #f1f5f9;
  --sops-neutral-text: #334155;
  --sops-neutral-text-strong: #1e293b;
  --sops-neutral-text-muted: #64748b;
  --sops-neutral-text-faint: #94a3b8;
}
[data-color-mode-resolved='dark'] .sops-neutral {
  --sops-neutral-divider: #475569;
  --sops-neutral-divider-soft: #334155;
  --sops-neutral-surface: #1e293b;
  --sops-neutral-surface-raised: #0f172a;
  --sops-neutral-text: #cbd5e1;
  --sops-neutral-text-strong: #e2e8f0;
  --sops-neutral-text-muted: #94a3b8;
  --sops-neutral-text-faint: #64748b;
}
/* Order 13 (SOP-02 Step 1): convenience classes over the contract.
 * Consume these classes in templates (never inline Tailwind slate
 * utilities for structural grays — the semantic baseline gate will block
 * any new hit once the baseline is refreshed after migration). */
.sops-neutral-divider {
  border-color: var(--sops-neutral-divider);
}
.sops-neutral-divider-soft {
  border-color: var(--sops-neutral-divider-soft);
}
.sops-neutral-surface {
  background-color: var(--sops-neutral-surface);
}
.sops-neutral-surface-raised {
  background-color: var(--sops-neutral-surface-raised);
}
.sops-neutral-text {
  color: var(--sops-neutral-text);
}
.sops-neutral-text-strong {
  color: var(--sops-neutral-text-strong);
}
.sops-neutral-text-muted {
  color: var(--sops-neutral-text-muted);
}
.sops-neutral-text-faint {
  color: var(--sops-neutral-text-faint);
}
/* Order 13 (SOP-02 Step 1): hover variants for interactive rows. These
 * flip the text tier on hover via the same token chain, avoiding inline
 * Tailwind slate hover utilities that would trip the semantic gate. */
.sops-neutral-text-hover:hover {
  color: var(--sops-neutral-text);
}
.sops-neutral-surface-hover:hover {
  background-color: var(--sops-neutral-surface-raised);
}
"""

lines.insert(insert_at, neutral_block.rstrip("\n"))
open(path, "w", encoding="utf-8").write("\n".join(lines))
print("contract inserted at line", insert_at)
