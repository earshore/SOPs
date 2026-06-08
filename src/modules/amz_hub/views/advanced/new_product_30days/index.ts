/**
 * 新品30天极速突围 视图模块
 */

import BaseModule from "../../../../../common/BaseModule";
import { setSafeHtml } from "../../../../../common/utils/security";
import templateHTML from "./template.html?raw";

// Module class
class NewProduct30DaysModule extends BaseModule {
  constructor() {
    super("amz_new_product_30days");
  }
  async render(): Promise<void> {
    const container = this.container;
    if (!container) return;

    // ✅ 安全: 静态HTML模板，无用户输入
    setSafeHtml(container, templateHTML);
    container.classList.add("fade-in");
  }
}

const instance = new NewProduct30DaysModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
