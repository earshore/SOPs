// src/modules/amz_hub/views/practice/promo_activities/index.ts
import BaseModule from "../../../../../common/BaseModule";
import templateHTML from "./template.html?raw";
import "./styles.css";

import { Logger } from "../../../../../services/loggerService";

class PromoActivitiesModule extends BaseModule {
  constructor() {
    super("amz_promo_activities");
  }

  async render(): Promise<void> {
    // ✅ 安全: 静态HTML模板，无用户输入
    this.container!.innerHTML = templateHTML;
    this.container!.classList.add("fade-in");
    Logger.debug("✅ [PromoActivities] 促销活动页面已加载");
  }

  protected onUnmount(): void {
    Logger.debug("🗑️ [PromoActivities] 模块已卸载");
  }
}

const instance = new PromoActivitiesModule();
export const mount = (c: HTMLElement) => instance.mount(c);
export const unmount = () => instance.unmount();
