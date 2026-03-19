/**
 * 教你打造优质Listing 视图模块
 */

import BaseModule from "../../../../../common/BaseModule";
import templateHTML from "./template.html?raw";

class QualityListingModule extends BaseModule {
  constructor() {
    super("amz_quality_listing");
  }

  async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add("fade-in");
  }
}

const instance = new QualityListingModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
