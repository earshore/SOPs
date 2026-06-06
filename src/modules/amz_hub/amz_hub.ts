console.log("📚 AmzHub Core Module Loading...");

import "./amz_hub_style.css";
import {
  createModuleLoader,
  ModuleLoader,
} from "../../common/utils/ModuleLoader";
import type { ModuleMap, ModuleLoaderFn } from "@/types/modules-business";
import { AMZ_HUB_ROUTES } from "@/common/constants/routes";

// ================= 路由配置表 =================
// 使用路由常量，避免硬编码
const MODULE_MAP: ModuleMap = {
  // 总览
  [AMZ_HUB_ROUTES.OVERVIEW]: () => import("./views/overview/index"),

  // Amazon知识早知道 (knowledge)
  [AMZ_HUB_ROUTES.EU_INSIGHTS]: () =>
    import("./views/knowledge/eu_insights/index"),
  [AMZ_HUB_ROUTES.SEO_STRATEGY]: () =>
    import("./views/knowledge/seo_strategy/index"),
  [AMZ_HUB_ROUTES.ECOSYSTEM]: () => import("./views/knowledge/ecosystem/index"),

  // 入门实操宝典 (practice)
  [AMZ_HUB_ROUTES.QUALITY_LISTING]: () =>
    import("./views/practice/quality_listing/index"),
  [AMZ_HUB_ROUTES.MARKETING_CALENDAR]: () =>
    import("./views/practice/marketing_calendar/index"),
  [AMZ_HUB_ROUTES.PROMO_ACTIVITIES]: () =>
    import("./views/practice/promo_activities/index"),
  [AMZ_HUB_ROUTES.PROMO_TOOLS]: () =>
    import("./views/practice/promo_tools/index"),

  // 运营提升全攻略 (advanced)
  [AMZ_HUB_ROUTES.NEW_PRODUCT_30DAYS]: () =>
    import("./views/advanced/new_product_30days/index"),
  [AMZ_HUB_ROUTES.CONVERSION_OPTIMIZATION]: () =>
    import("./views/advanced/conversion_optimization/index"),
};

// ================= 使用通用ModuleLoader =================
const moduleLoader: ModuleLoader = createModuleLoader({
  containerId: "amz_hub_content_area",
  shellId: "panel-amz_hub",
  moduleMap: MODULE_MAP,
  loaderColor: "blue",
  moduleName: "AmzHub",
});

/**
 * 注册子模块 (Plugin API)
 * @param routeId - 路由 ID
 * @param loader - 动态导入函数
 */
export function registerHubModule(
  routeId: string,
  loader: ModuleLoaderFn,
): void {
  moduleLoader.registerSubModule(routeId, loader);
}

console.log("✅ AmzHub Module 加载完成");
