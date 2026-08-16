"""Rewrite stale doc references to archived locations in active docs.

Single-pass substitution with one rule per file name to avoid double prefixes.
"""

MAPPING = [
    # order matters: longer/more-specific first
    ('docs/CMP02_FORM_DEBT_PLAN.md', 'docs/archive/cmp02/CMP02_FORM_DEBT_PLAN.md'),
    ('docs/DARK_MODE_DEBT_CLOSURE_SPEC.md', 'docs/archive/debt/DARK_MODE_DEBT_CLOSURE_SPEC.md'),
    ('docs/EMPTY_STATE_CONVERGENCE_PLAN.md', 'docs/archive/debt/EMPTY_STATE_CONVERGENCE_PLAN.md'),
    ('docs/GUI014_GLASS_COLOR_PALETTE.md', 'docs/archive/theme/GUI014_GLASS_COLOR_PALETTE.md'),
    ('docs/THM02_FINAL_SUMMARY.md', 'docs/archive/theme/THM02_FINAL_SUMMARY.md'),
    ('docs/THM01_S_MAP.md', 'docs/archive/theme/THM01_S_MAP.md'),
    ('docs/THM01_LEGACY_POOL_LEDGER.md', 'docs/archive/theme/THM01_LEGACY_POOL_LEDGER.md'),
    ('docs/THM01_LEGACY_POOL_RC5_PLAN.md', 'docs/archive/theme/THM01_LEGACY_POOL_RC5_PLAN.md'),
    ('docs/THM01_CONVERGENCE.md', 'docs/archive/theme/THM01_CONVERGENCE.md'),
    ('docs/SOP02_SLATE_PROGRESS_REPORT.md', 'docs/archive/quality/SOP02_SLATE_PROGRESS_REPORT.md'),
    ('docs/SOP02_SLATE_TOKEN_PLAN.md', 'docs/archive/quality/SOP02_SLATE_TOKEN_PLAN.md'),
    ('docs/SETTINGS_UI_TEXT_PLAN.md', 'docs/archive/quality/SETTINGS_UI_TEXT_PLAN.md'),
    ('docs/SETTINGS_UI_TEXT_SPEC.md', 'docs/archive/quality/SETTINGS_UI_TEXT_SPEC.md'),
    ('docs/CMP02_BATCH4B_TOKEN_MIGRATION_PLAN.md', 'docs/archive/cmp02/CMP02_BATCH4B_TOKEN_MIGRATION_PLAN.md'),
    ('docs/CMP02_BATCH4_SCHEDULING_ASSESSMENT.md', 'docs/archive/cmp02/CMP02_BATCH4_SCHEDULING_ASSESSMENT.md'),
    ('docs/CMP02_DOWNGRADE_RECHECK_MONITOR.md', 'docs/archive/cmp02/CMP02_DOWNGRADE_RECHECK_MONITOR.md'),
    ('docs/CMP02_DOWNGRADE_RECHECK_PASS.md', 'docs/archive/cmp02/CMP02_DOWNGRADE_RECHECK_PASS.md'),
    ('docs/CMP02_DOWNGRADE_TO_P3_SPEC.md', 'docs/archive/cmp02/CMP02_DOWNGRADE_TO_P3_SPEC.md'),
    ('docs/CMP02_SYSTEM_A_CLOSURE_REPORT.md', 'docs/archive/cmp02/CMP02_SYSTEM_A_CLOSURE_REPORT.md'),
    ('docs/CMP02_SYSTEM_A_PHASE1_PLAN.md', 'docs/archive/cmp02/CMP02_SYSTEM_A_PHASE1_PLAN.md'),
    ('docs/TD_THM_02_PHASE_B_PLAN.md', 'docs/archive/debt/TD_THM_02_PHASE_B_PLAN.md'),
    ('docs/DEBT_FINAL_TIGHTENING_CLOSURE.md', 'docs/archive/debt/DEBT_FINAL_TIGHTENING_CLOSURE.md'),
    ('docs/DEBT_FINAL_TIGHTENING_PLAN.md', 'docs/archive/debt/DEBT_FINAL_TIGHTENING_PLAN.md'),
    ('docs/NEXT_PHASES_PLAN.md', 'docs/archive/debt/NEXT_PHASES_PLAN.md'),
    ('docs/REMAINING_DEBT_BLOCKERS_OPTIMIZATION.md', 'docs/archive/debt/REMAINING_DEBT_BLOCKERS_OPTIMIZATION.md'),
    ('docs/THM02_DOWNGRADE_AND_GLASS_REVIEW.md', 'docs/archive/theme/THM02_DOWNGRADE_AND_GLASS_REVIEW.md'),
]

FILES = [
    'docs/CHANGELOG.md',
    'docs/TECH_DEBT_BOARD.md',
    'docs/SMOKE_BASELINE_FIX_PLAN.md',
    'docs/TECH_DEBT_TIGHTENING_ROADMAP.md',
    'docs/THEME_SYSTEM_GUIDELINES.md',
    'docs/TECH_DEBT_AUDIT.md',
]

changed = 0
for path in FILES:
    with open(path) as f:
        text = f.read()
    orig = text
    for old, new in MAPPING:
        text = text.replace(old, new)
    if text != orig:
        with open(path, 'w') as f:
            f.write(text)
        changed += 1
        print(f'updated {path}')
print(f'changed {changed}/{len(FILES)}')
