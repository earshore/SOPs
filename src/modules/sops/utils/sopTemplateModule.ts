import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { registerActionsWithLegacy, unregisterActions } from '@/common/utils/actionRegistry';
import { setSafeHtml } from '@/common/utils/security';

import type { OwnerFieldController } from './ownerField';
import type { ActionHandler } from '@/common/utils/actionRegistry';

export type SopTemplateAction = (...args: unknown[]) => unknown;

export interface SopTemplateModuleContext {
  addDisposable(dispose: () => void): void;
  addEventListener(
    target: EventTarget | null,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void;
  setTimeout(callback: () => void, delay: number): number;
}

export interface SopTemplateModuleConfig {
  moduleId: string;
  templatePath: string;
  ownerFields?: OwnerFieldController[];
  actions?: Record<string, SopTemplateAction>;
  onAfterRender?: (
    container: HTMLElement,
    context: SopTemplateModuleContext
  ) => void | Promise<void>;
  onInit?: (container: HTMLElement, context: SopTemplateModuleContext) => void | Promise<void>;
  onUnmount?: () => void;
}

export interface SopTemplateModule {
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;
}

class SopTemplateBaseModule extends BaseModule implements SopTemplateModule {
  private registeredActions: string[] = [];

  constructor(private readonly config: SopTemplateModuleConfig) {
    super(config.moduleId);
  }

  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(this.config.templatePath);
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
    await this.config.onAfterRender?.(this.container, this.createContext());
  }

  protected async init(): Promise<void> {
    if (!this.container) return;

    this.config.ownerFields?.forEach(ownerField => ownerField.restore());
    await this.config.onInit?.(this.container, this.createContext());

    if (this.config.actions && Object.keys(this.config.actions).length > 0) {
      this.registeredActions = registerActionsWithLegacy(
        this.config.actions as Record<string, ActionHandler>
      );
    }
  }

  protected onUnmount(): void {
    this.config.onUnmount?.();

    if (this.registeredActions.length === 0) return;

    unregisterActions(this.registeredActions);
    this.registeredActions = [];
  }

  private createContext(): SopTemplateModuleContext {
    return {
      addDisposable: dispose => this.addDisposable(dispose),
      addEventListener: (target, type, listener, options) => {
        if (!target) return;
        target.addEventListener(type, listener, options);
        this.addDisposable(() => {
          target.removeEventListener(type, listener, options);
        });
      },
      setTimeout: (callback, delay) => this.setTimeout(callback, delay),
    };
  }
}

export function createSopTemplateModule(config: SopTemplateModuleConfig): SopTemplateModule {
  return new SopTemplateBaseModule(config);
}
