console.log("📚 AmzHub Core Module Loading...");

import "./amz_hub_style.css";
import {
  createModuleLoader,
  ModuleLoader,
} from "../../common/utils/ModuleLoader";
import { buildModuleMap } from "@/common/config/moduleManifest";
import type { ModuleMap, ModuleLoaderFn } from "@/types/modules-business";
import { amzHubManifest } from "./module.manifest";

// ================= 路由配置表 =================
const MODULE_MAP: ModuleMap = buildModuleMap(amzHubManifest);

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
