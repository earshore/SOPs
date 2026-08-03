// TD-SET-01 Phase 2: mirrors loader.ts assembly for source-contract tests.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Fixed assembly order ? must stay in sync with src/components/settings/loader.ts. */
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

const read = (rel: string): string =>
  readFileSync(resolve(process.cwd(), rel), 'utf8');

/** Shell + fragments, assembled exactly like the runtime loader does. */
export function readSettingsTemplate(): string {
  let html = read('src/components/settings/systemSettings.html');
  for (const name of SETTINGS_SECTION_ORDER) {
    const slot = `<!--settings-slot:${name}-->`;
    if (!html.includes(slot)) continue;
    html = html.replace(slot, read(`src/components/settings/sections/${name}.html`));
  }
  return html;
}

/** All settings styles in import order (cascade order preserved). */
export function readSettingsStyles(): string {
  const files = [
    'systemSettings.css',
    'sections/llmSection.css',
    'sections/appearanceSection.css',
    'sections/toolStrategySection.css',
    'sections/networkSection.css',
    'sections/dataSection.css',
    'sections/diagnosticsSection.css',
  ];
  return files.map(f => read(`src/components/settings/${f}`)).join('\n');
}
