import { defineModuleManifest } from "@/common/config/moduleManifest";

export const moreManifest = defineModuleManifest({
  moduleId: "more_core",
  panelId: "panel-more",
  routes: [
    {
      key: "OVERVIEW",
      routeId: "more_overview",
      label: "更多总览",
      icon: "fas fa-th-large",
      loader: () => import("./views/overview/index"),
    },
    {
      key: "AGENTS",
      routeId: "more_agents",
      label: "智能体",
      icon: "fas fa-robot",
      category: "explore",
      loader: () => import("./views/explore/agents/index"),
    },
    {
      key: "PROMPTS",
      routeId: "more_prompts",
      label: "提示词",
      icon: "fas fa-message",
      category: "explore",
      loader: () => import("./views/explore/prompts/index"),
    },
    {
      key: "WORKFLOWS",
      routeId: "more_workflows",
      label: "工作流",
      icon: "fas fa-diagram-project",
      category: "explore",
      loader: () => import("./views/explore/workflows/index"),
    },
  ],
} as const);
