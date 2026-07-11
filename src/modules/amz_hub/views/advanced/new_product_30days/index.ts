/**
 * 新品30天极速突破 视图模块
 */

import { createStaticTemplateModule } from '@/common/utils/createStaticTemplateModule';
import './styles.css';

const instance = createStaticTemplateModule({
  moduleId: 'amz_new_product_30days',
  templatePath: 'src/modules/amz_hub/views/advanced/new_product_30days/template.html',
});

export const mount = (container: HTMLElement): Promise<void> => instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
