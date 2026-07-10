/**
 * Factory for static HTML template modules (load template → setSafeHtml → fade-in).
 */

import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';

export interface StaticTemplateModuleConfig {
  moduleId: string;
  templatePath: string;
  /** Optional transform applied after template load, before safe mount. */
  transformHtml?: (html: string) => string | Promise<string>;
  onAfterRender?: (container: HTMLElement) => void | Promise<void>;
  onInit?: (container: HTMLElement) => void | Promise<void>;
  onUnmount?: () => void;
}

export interface StaticTemplateModule {
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;
}

class StaticTemplateBaseModule extends BaseModule implements StaticTemplateModule {
  constructor(private readonly config: StaticTemplateModuleConfig) {
    super(config.moduleId);
  }

  protected async render(): Promise<void> {
    if (!this.container) return;

    const rawHtml = await SafeTemplateLoader.getInstance().loadTemplate(this.config.templatePath);
    const html = this.config.transformHtml ? await this.config.transformHtml(rawHtml) : rawHtml;
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
    await this.config.onAfterRender?.(this.container);
  }

  protected async init(): Promise<void> {
    if (!this.container) return;
    await this.config.onInit?.(this.container);
  }

  protected onUnmount(): void {
    this.config.onUnmount?.();
  }
}

export function createStaticTemplateModule(
  config: StaticTemplateModuleConfig
): StaticTemplateModule {
  return new StaticTemplateBaseModule(config);
}
