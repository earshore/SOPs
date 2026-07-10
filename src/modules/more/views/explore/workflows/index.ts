/**
 * More 模块 - 工作流页面
 */

import { createStaticTemplateModule } from '@/common/utils/createStaticTemplateModule';

const instance = createStaticTemplateModule({
  moduleId: 'more_workflows',
  templatePath: 'src/modules/more/views/explore/workflows/template.html',
});

export const mount = (container: HTMLElement): Promise<void> => instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
