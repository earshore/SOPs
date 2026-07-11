/**
 * More 模块 - Agent Center 页面
 */

import { createStaticTemplateModule } from '@/common/utils/createStaticTemplateModule';

const instance = createStaticTemplateModule({
  moduleId: 'more_agents',
  templatePath: 'src/modules/more/views/explore/agents/template.html',
});

export const mount = (container: HTMLElement): Promise<void> => instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
