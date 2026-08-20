import {
  bindCategoryFilterButtons,
  scrollToModuleSection,
} from '@/common/utils/overviewInteractions';

import {
  createSopTemplateModule,
  type SopTemplateModuleContext,
} from '../../utils/sopTemplateModule';

const sopsOverviewModule = createSopTemplateModule({
  moduleId: 'sops_overview',
  templatePath: 'src/modules/sops/views/overview/template.html',
  onInit: (container, context) => {
    initOverviewEvents(container, context);
  },
});

export const mount = (container: HTMLElement): Promise<void> => sopsOverviewModule.mount(container);
export const unmount = (): void => {
  sopsOverviewModule.unmount();
};

/**
 * 滚动到指定的模块区域
 * @param categoryId - 分类 ID (growth, backend, safety, service)
 */
export function scrollToModule(categoryId: string): void {
  scrollToModuleSection(categoryId, {
    idPrefix: 'sop-module-',
    highlightClass: 'sop-module-highlight',
  });
}

function initOverviewEvents(container: HTMLElement, context: SopTemplateModuleContext): void {
  const disposeFilter = bindCategoryFilterButtons(container);
  context.addDisposable(disposeFilter);
}
