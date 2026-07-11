/**
 * 促销活动 视图模块
 */

import { createStaticTemplateModule } from '@/common/utils/createStaticTemplateModule';
import './styles.css';

const instance = createStaticTemplateModule({
  moduleId: 'amz_promo_activities',
  templatePath: 'src/modules/amz_hub/views/practice/promo_activities/template.html',
});

export const mount = (container: HTMLElement): Promise<void> => instance.mount(container);
export const unmount = (): void => {
  instance.unmount();
};
