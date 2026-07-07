import BaseModule from '@/common/BaseModule';
import { SafeTemplateLoader } from '@/common/infrastructure/SafeModuleLoader';
import { setSafeHtml } from '@/common/utils/security';

// PPC 广告投放与优化 SOP
class PpcAdvertisingModule extends BaseModule {
  protected async render(): Promise<void> {
    if (!this.container) return;

    const html = await SafeTemplateLoader.getInstance().loadTemplate(
      'src/modules/sops/views/growth/ppc_advertising/template.html'
    );
    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(this.container, html);
    this.container.classList.add('fade-in');
  }
}

const ppcAdvertisingModule = new PpcAdvertisingModule('ppc_advertising');

export const mount = (container: HTMLElement): Promise<void> =>
  ppcAdvertisingModule.mount(container);
export const unmount = (): void => {
  ppcAdvertisingModule.unmount();
};
