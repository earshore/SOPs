import { defineModuleManifest } from "@/common/config/moduleManifest";

export const homeManifest = defineModuleManifest({
  moduleId: "home",
  panelId: "panel-home",
  routes: [
    {
      key: "HOME",
      routeId: "home",
      label: "首页",
      icon: "fas fa-home",
      viewPath: "/src/modules/home/homeDisplay.html",
    },
  ],
} as const);
