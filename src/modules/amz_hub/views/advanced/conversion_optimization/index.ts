/**
 * 链接转化率低自查优化的五大方面 视图模块
 */

import BaseModule from "../../../../../common/BaseModule";
import templateHTML from "./template.html?raw";

// Module class
class ConversionOptimizationModule extends BaseModule {
  constructor() {
    super("amz_conversion_optimization");
  }

  async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add("fade-in");
  }
}

const instance = new ConversionOptimizationModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
