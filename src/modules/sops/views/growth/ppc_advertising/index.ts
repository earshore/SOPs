import { createSopTemplateModule } from '../../../utils/sopTemplateModule';

// PPC 广告投放与优化 SOP
const ppcAdvertisingModule = createSopTemplateModule({
  moduleId: 'ppc_advertising',
  templatePath: 'src/modules/sops/views/growth/ppc_advertising/template.html',
});

export const mount = (container: HTMLElement): Promise<void> =>
  ppcAdvertisingModule.mount(container);
export const unmount = (): void => {
  ppcAdvertisingModule.unmount();
};
