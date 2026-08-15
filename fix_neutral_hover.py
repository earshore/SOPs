#!/usr/bin/env python3
"""Add hover variants (.sops-neutral-text-hover / .sops-neutral-surface-hover)
after the .sops-neutral-text-faint block in sops_style.css, and fix the one
template line that emitted a raw hover:sops-neutral-text utility."""

css_path = "/home/ubuntu/SOPs/src/modules/sops/sops_style.css"
lines = open(css_path, encoding="utf-8").read().split("\n")

anchor = None
for i, ln in enumerate(lines):
    if ln == ".sops-neutral-text-faint {":
        anchor = i
if anchor is None:
    raise SystemExit("anchor not found")

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

hover_block = """
/* Order 13 (SOP-02 Step 1): hover variants for interactive rows. These
 * flip the text/surface tier on hover via the same token chain, avoiding
 * inline Tailwind slate hover utilities that would trip the semantic gate. */
.sops-neutral-text-hover:hover {
  color: var(--sops-neutral-text);
}
.sops-neutral-surface-hover:hover {
  background-color: var(--sops-neutral-surface-raised);
}"""

lines.insert(end + 1, hover_block)
open(css_path, "w", encoding="utf-8").write("\n".join(lines))

# Fix the template line: hover:sops-neutral-text -> sops-neutral-text-hover,
# hover:bg-slate-200 -> sops-neutral-surface-hover
tpl_path = (
    "/home/ubuntu/SOPs/src/modules/sops/views/growth/restricted_words/template.html"
)
t = open(tpl_path, encoding="utf-8").read()
old = "sops-neutral-text-muted hover:sops-neutral-text hover:bg-slate-200"
new = "sops-neutral-text-muted sops-neutral-text-hover sops-neutral-surface-hover"
assert old in t, "template line not found"
t = t.replace(old, new)
open(tpl_path, "w", encoding="utf-8").write(t)
print("hover variants inserted at line", end + 1, "; template line fixed")
