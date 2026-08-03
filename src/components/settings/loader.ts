// TD-SET-01 Phase 2: HTML fragments assembled in fixed order.
// Reuses the viewLoader ?raw mechanism: fragments live under sections/*.html and are
// inlined into the shell so the injected template is byte-equivalent to the pre-split file.
const settingsSectionTemplates = import.meta.glob<string>('./sections/*.html', {
  eager: true,
  query: '?raw',
  import: 'default',
}) as Record<string, string>;

/** Fixed assembly order ? MUST mirror the marker order inside the shell template. */
export const SETTINGS_SECTION_ORDER: readonly string[] = [
  'llmSection',
  'toolStrategySection',
  'toolStrategyGeneralAi',
  'toolStrategyMasterAnalysis',
  'toolStrategyDeepChat',
  'toolStrategyKeywordHunter',
  'toolStrategyPpcFlags',
  'networkSection',
  'dataSection',
  'appearanceSection',
  'diagnosticsSection',
];

/** Inline every section fragment into the shell; returns the fully assembled template. */
export function assembleSettingsTemplate(shellHtml: string): string {
  let html = shellHtml;
  for (const name of SETTINGS_SECTION_ORDER) {
    const slot = `<!--settings-slot:${name}-->`;
    if (!html.includes(slot)) continue;
    const fragment = settingsSectionTemplates[`./sections/${name}.html`];
    if (fragment == null) continue;
    html = html.replace(slot, fragment);
  }
  return html;
}
