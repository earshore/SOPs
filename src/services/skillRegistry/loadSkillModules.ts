/** Production loaders — paths relative to this file under src/services/skillRegistry */

export function loadProductionSkillModules(): Record<string, string> {
  return import.meta.glob('../../../vendor/amazon-skills/*/SKILL.md', {
    query: '?raw',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
}

/** Use ?url so script bodies are not inlined into the JS bundle */
export function loadProductionScriptModules(): Record<string, string> {
  return import.meta.glob('../../../vendor/amazon-skills/*/scripts/**', {
    query: '?url',
    import: 'default',
    eager: true,
  }) as Record<string, string>;
}
