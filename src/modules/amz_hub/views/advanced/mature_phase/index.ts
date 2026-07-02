/**
 * 成熟期运营策略 视图模块
 * 涵盖品牌防御、类目延展、TACOS控制、库存周转优化
 */

import BaseModule from '../../../../../common/BaseModule';
import { setSafeHtml } from '../../../../../common/utils/security';
import './styles.css';
import templateHTML from './template.html?raw';

class MaturePhaseModule extends BaseModule {
  constructor() {
    super('amz_mature_phase');
  }

  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, templateHTML);
    container.classList.add('fade-in');
  }
}

const instance = new MaturePhaseModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
