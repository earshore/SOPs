import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readSettingsTemplate } from './settingsTemplateAssembly';

const transitionsCssPath = resolve(process.cwd(), 'src/css/utilities/transitions.css');
const variablesCssPath = resolve(process.cwd(), 'src/css/foundation/variables.css');
const buttonsCssPath = resolve(process.cwd(), 'src/css/components/buttons.css');
const badgesCssPath = resolve(process.cwd(), 'src/css/components/badges.css');
const cardsCssPath = resolve(process.cwd(), 'src/css/components/cards.css');
const explicitMotionComponentPaths = [
  buttonsCssPath,
  badgesCssPath,
  cardsCssPath,
  resolve(process.cwd(), 'src/css/components/icon-container.css'),
  resolve(process.cwd(), 'src/css/components/insight-cards.css'),
  resolve(process.cwd(), 'src/css/components/stat-cards.css'),
  resolve(process.cwd(), 'src/css/components/language-selector.css'),
  resolve(process.cwd(), 'src/css/components/timeline.css'),
  resolve(process.cwd(), 'src/css/components/tabs.css'),
  resolve(process.cwd(), 'src/css/components/modals.css'),
  resolve(process.cwd(), 'src/css/components/progress.css'),
  resolve(process.cwd(), 'src/css/components/toast.css'),
  resolve(process.cwd(), 'src/css/components/chat.css'),
  resolve(process.cwd(), 'src/css/components/markdown.css'),
  resolve(process.cwd(), 'src/css/components/header-main.css'),
  resolve(process.cwd(), 'src/css/utilities/legacy-compat.css'),
];
const explicitMotionModulePaths = [
  resolve(process.cwd(), 'src/modules/sops/sops_style.css'),
  resolve(process.cwd(), 'src/modules/amz_hub/amz_hub_style.css'),
  resolve(process.cwd(), 'src/modules/more/views/explore/prompts/prompts_style.css'),
  resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/master_analysis_style.css'),
  resolve(
    process.cwd(),
    'src/modules/app_center/views/master_analysis/ai_analysis/ai_analysis_style.css'
  ),
  resolve(process.cwd(), 'src/modules/amz_hub/views/practice/promo_tools/styles.css'),
  resolve(process.cwd(), 'src/modules/amz_hub/views/practice/promo_activities/styles.css'),
  resolve(process.cwd(), 'src/modules/amz_hub/views/practice/marketing_calendar/styles.css'),
  resolve(process.cwd(), 'src/modules/app_center/views/keyword_hunter/styles.css'),
  resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/scraper/scraper_style.css'),
];
const explicitMotionTemplatePaths = [
  resolve(process.cwd(), 'src/components/settings/systemSettings.html'),
  resolve(process.cwd(), 'src/common/ui/navigation.ts'),
  resolve(process.cwd(), 'src/common/ui/megaMenu.ts'),
  resolve(process.cwd(), 'src/common/ui/search.ts'),
  resolve(process.cwd(), 'src/components/modal/confirmModal.ts'),
  resolve(
    process.cwd(),
    'src/modules/app_center/views/master_analysis/scraper/handlers/importHandler.ts'
  ),
];
const convergedDeepTemplatePaths = [
  resolve(process.cwd(), 'src/modules/app_center/views/keyword_hunter/input/template.html'),
  resolve(process.cwd(), 'src/modules/app_center/views/keyword_hunter/process/template.html'),
  resolve(process.cwd(), 'src/modules/app_center/views/keyword_hunter/process/index.ts'),
  resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/ai_analysis/template.html'),
  resolve(
    process.cwd(),
    'src/modules/app_center/views/master_analysis/ai_analysis/components/AlpinePanel.ts'
  ),
  resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/promptlab/template.html'),
  resolve(
    process.cwd(),
    'src/modules/app_center/views/master_analysis/promptlab/components/reportRenderer.ts'
  ),
  resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/scraper/template.html'),
  resolve(process.cwd(), 'src/modules/app_center/views/master_analysis/scraper/utils/renderers.ts'),
  resolve(process.cwd(), 'src/modules/more/views/explore/prompts/template.html'),
  resolve(
    process.cwd(),
    'src/modules/sops/views/growth/restricted_words/restrictedWordsHandler.ts'
  ),
  resolve(process.cwd(), 'src/modules/sops/views/safety/product_compliance/template.html'),
  resolve(process.cwd(), 'src/modules/sops/views/safety/eu_gpsr_compliance/template.html'),
];

describe('PC motion CSS contract', () => {
  it('keeps shared transition utilities constrained to non-layout properties', () => {
    const css = readFileSync(transitionsCssPath, 'utf8');
    const variablesCss = readFileSync(variablesCssPath, 'utf8');

    // B5-THM01: --transition-interactive-properties 令牌已归档（动效簇），
    // 共享过渡工具类内联同一受约束属性清单。
    expect(variablesCss).not.toContain('--transition-interactive-properties:');
    expect(css).toContain(
      'color, background-color, border-color, fill, stroke, opacity, box-shadow, transform'
    );
    expect(css).toContain('transition-property:');
    expect(css).not.toMatch(/transition\s*:\s*all\b/);
  });

  it('keeps common interactive components from animating every CSS property', () => {
    const buttonsCss = readFileSync(buttonsCssPath, 'utf8');
    const badgesCss = readFileSync(badgesCssPath, 'utf8');
    const cardsCss = readFileSync(cardsCssPath, 'utf8');

    explicitMotionComponentPaths.forEach(cssPath => {
      expect(readFileSync(cssPath, 'utf8')).not.toMatch(/transition\s*:\s*all\b/);
    });
    // B5-THM01/D14: .badge 过渡已收敛为离散属性字面值（200ms ease），不含 opacity/transform。
    expect(badgesCss).toContain('background-color 200ms ease');
    expect(badgesCss).toContain('border-color 200ms ease');
    expect(badgesCss).toContain('color 200ms ease');
    expect(cardsCss).toContain('transform var(--duration-slow) var(--ease-spring)');
    expect(cardsCss).toContain('box-shadow var(--duration-slow) var(--ease-spring)');
    // B5-THM01: --micro-* 令牌未落地，按钮微交互过渡为字面 250ms ease。
    expect(buttonsCss).toContain('transform 250ms ease');
  });

  it('keeps converged PC module styles from animating every CSS property', () => {
    explicitMotionModulePaths.forEach(cssPath => {
      expect(readFileSync(cssPath, 'utf8')).not.toMatch(/transition\s*:\s*all\b/);
    });
  });

  it('keeps high-frequency PC templates on stable interaction feedback', () => {
    explicitMotionTemplatePaths.forEach(templatePath => {
      const template = readFileSync(templatePath, 'utf8');

      expect(template).not.toContain('transition-all');
      expect(template).not.toMatch(/\b(?:hover|active|group-hover):scale/);
      expect(template).not.toMatch(/\bhover:rotate/);
      expect(template).toContain('focus-visible:ring-2');
    });

    // TD-SET-01 Phase 2: settings template is now shell + fragments; the assembled
    // template (not just the shell) must keep the same motion contract as the old
    // single-file template.
    const settingsTemplate = readSettingsTemplate();
    expect(settingsTemplate).not.toContain('transition-all');
    expect(settingsTemplate).not.toMatch(/\b(?:hover|active|group-hover):scale/);
    expect(settingsTemplate).not.toMatch(/\bhover:rotate/);
    expect(settingsTemplate).toContain('focus-visible:ring-2');
  });

  it('keeps converged deep PC templates from using broad or scaling hover feedback', () => {
    convergedDeepTemplatePaths.forEach(templatePath => {
      const template = readFileSync(templatePath, 'utf8');

      expect(template).not.toContain('transition-all');
      expect(template).not.toMatch(/\b(?:hover|active|group-hover):scale/);
      expect(template).not.toMatch(/\bhover:rotate/);
    });
  });
});
