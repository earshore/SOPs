/**
 * 成熟期运营策略 视图模块
 */

import { createStaticTemplateModule } from '@/common/utils/createStaticTemplateModule';
import './styles.css';

const instance = createStaticTemplateModule({
  moduleId: 'amz_mature_phase',
  templatePath: 'src/modules/amz_hub/views/advanced/mature_phase/template.html',
});

export const mount = (container: HTMLElement): Promise<void> => instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
