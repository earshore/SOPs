/**
 * Factory for Alpine panel modules (register → load template → SafeRenderer → cleanup).
 */

import BaseModule from '@/common/BaseModule';
import {
  SafeTemplateLoader,
  type ModuleLoadOptions,
} from '@/common/infrastructure/SafeModuleLoader';
import { SafeRenderer } from '@/common/infrastructure/SafeRenderer';
import { AlpineRegistry } from '@/common/infrastructure/AlpineRegistry';
import { destroyAlpineComponent } from './alpineLifecycle';

export interface AlpinePanelModuleConfig {
  moduleId: string;
  panelName: string;
  factory: () => unknown;
  templatePath: string;
  templateOptions?: Pick<ModuleLoadOptions, 'retryCount' | 'timeout' | 'onError'>;
  onInit?: (container: HTMLElement, module: AlpinePanelBaseModule) => void | Promise<void>;
  onBeforeRender?: () => void;
  logPrefix?: string;
}

export interface AlpinePanelModule {
  mount(container: HTMLElement): Promise<void>;
  unmount(): void;
  readonly isMounted: boolean;
  cleanupPanel(): void;
}

export class AlpinePanelBaseModule extends BaseModule implements AlpinePanelModule {
  constructor(private readonly config: AlpinePanelModuleConfig) {
    super(config.moduleId);
  }

  protected async render(): Promise<void> {
    const container = this.container;
    if (!container) return;
    const mountSignal = this.getAbortSignal();

    this.config.onBeforeRender?.();
    AlpineRegistry.getInstance().register(this.config.panelName, this.config.factory);

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      this.config.templatePath,
      this.config.templateOptions
    );
    if (!this.isCurrentMount(mountSignal)) return;

    container.classList.add('fade-in');
    SafeRenderer.getInstance().renderTemplate(container, html);
  }

  protected async init(): Promise<void> {
    if (!this.container) return;
    await this.config.onInit?.(this.container, this);
  }

  protected onUnmount(): void {
    this.cleanupPanel();
  }

  cleanupPanel(): void {
    const prefix = this.config.logPrefix ?? this.config.moduleId;
    try {
      destroyAlpineComponent(`[x-data="${this.config.panelName}"]`);
      AlpineRegistry.getInstance().unregister(this.config.panelName);
    } catch (error) {
      console.error(`[${prefix}] ❌ 模块卸载失败:`, error);
    }
  }

  /** Expose auto-cleanup event binding for onInit binders (same lifecycle as BaseModule). */
  bindEventListener(
    target: HTMLElement | Window | Document | null,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions
  ): void {
    // Cast through BaseModule's broader overload implementation surface.
    (
      this as unknown as {
        addEventListener: (
          target: EventTarget | null,
          type: string,
          listener: EventListenerOrEventListenerObject,
          options?: boolean | AddEventListenerOptions
        ) => void;
      }
    ).addEventListener(target, type, listener, options);
  }
}

export function createAlpinePanelModule(config: AlpinePanelModuleConfig): AlpinePanelModule {
  return new AlpinePanelBaseModule(config);
}
