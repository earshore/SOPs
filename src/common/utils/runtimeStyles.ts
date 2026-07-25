const runtimeRuleSelectors = new Map<string, string>();
const runtimeRuleTexts = new Map<string, string>();

type RuntimeCssDeclarations = Record<string, string | number | null | undefined>;

export function updateRuntimeCssRule(
  key: string,
  selector: string,
  declarations: RuntimeCssDeclarations
): void {
  if (typeof document === 'undefined') {
    return;
  }

  const previousSelector = runtimeRuleSelectors.get(key);
  if (previousSelector) {
    deleteRuntimeCssRule(previousSelector);
  }

  const declarationText = serializeDeclarations(declarations);
  runtimeRuleSelectors.set(key, selector);

  if (!declarationText) {
    runtimeRuleTexts.delete(key);
    return;
  }

  const ruleText = `${selector}{${declarationText}}`;
  runtimeRuleTexts.set(key, ruleText);
  insertRuntimeCssRule(ruleText);
}

export function getRuntimeCssRuleText(key: string): string | null {
  return runtimeRuleTexts.get(key) ?? null;
}

/** Remove a previously registered runtime rule by key (idempotent). */
export function clearRuntimeCssRule(key: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const selector = runtimeRuleSelectors.get(key);
  if (selector) {
    deleteRuntimeCssRule(selector);
  }
  runtimeRuleSelectors.delete(key);
  runtimeRuleTexts.delete(key);
}

function serializeDeclarations(declarations: RuntimeCssDeclarations): string {
  return Object.entries(declarations)
    .filter(
      (entry): entry is [string, string | number] => entry[1] !== null && entry[1] !== undefined
    )
    .filter(([property]) => /^-{0,2}[a-zA-Z][a-zA-Z0-9-]*$/.test(property))
    .map(([property, value]) => `${property}:${sanitizeCssValue(value)}`)
    .join(';');
}

function sanitizeCssValue(value: string | number): string {
  return String(value).replace(/[;{}]/g, '').trim();
}

function deleteRuntimeCssRule(selector: string): void {
  for (const sheet of getAccessibleStyleSheets()) {
    const rules = getCssRules(sheet);
    if (!rules) continue;

    for (let index = rules.length - 1; index >= 0; index -= 1) {
      const rule = rules[index];
      if (isStyleRuleForSelector(rule, selector)) {
        sheet.deleteRule(index);
      }
    }
  }
}

function insertRuntimeCssRule(ruleText: string): void {
  const sheet = getWritableStyleSheet();
  if (!sheet) {
    return;
  }

  try {
    sheet.insertRule(ruleText, sheet.cssRules.length);
  } catch {
    // Dynamic rules are best-effort UI positioning; the base stylesheet remains usable.
  }
}

function getWritableStyleSheet(): CSSStyleSheet | null {
  for (const sheet of getAccessibleStyleSheets()) {
    try {
      const index = sheet.cssRules.length;
      sheet.insertRule(':root{}', index);
      sheet.deleteRule(index);
      return sheet;
    } catch {
      // Continue looking for a same-origin writable sheet.
    }
  }

  const documentWithAdoptedSheets = document as Document & {
    adoptedStyleSheets?: CSSStyleSheet[];
  };

  if (
    typeof CSSStyleSheet === 'function' &&
    Array.isArray(documentWithAdoptedSheets.adoptedStyleSheets)
  ) {
    const sheet = new CSSStyleSheet();
    documentWithAdoptedSheets.adoptedStyleSheets = [
      ...documentWithAdoptedSheets.adoptedStyleSheets,
      sheet,
    ];
    return sheet;
  }

  return null;
}

function getAccessibleStyleSheets(): CSSStyleSheet[] {
  return Array.from(document.styleSheets).filter((sheet): sheet is CSSStyleSheet => {
    return getCssRules(sheet) !== null;
  });
}

function getCssRules(sheet: CSSStyleSheet): CSSRuleList | null {
  try {
    return sheet.cssRules;
  } catch {
    return null;
  }
}

function isStyleRuleForSelector(rule: CSSRule | undefined, selector: string): boolean {
  if (!rule) {
    return false;
  }

  return 'selectorText' in rule && (rule as CSSStyleRule).selectorText === selector;
}
