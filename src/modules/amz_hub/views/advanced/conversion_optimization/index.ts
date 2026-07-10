/**
 * 链接转化率低自查优化的应对方面 视图模块
 */

import { createStaticTemplateModule } from '@/common/utils/createStaticTemplateModule';
import './styles.css';

const instance = createStaticTemplateModule({
  moduleId: 'amz_conversion_optimization',
  templatePath: 'src/modules/amz_hub/views/advanced/conversion_optimization/template.html',
});

export const mount = (container: HTMLElement): Promise<void> => instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
