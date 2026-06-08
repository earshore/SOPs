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
    },
    {
      key: "AGENTS",
      routeId: "more_agents",
      label: "智能体",
      icon: "fas fa-robot",
      category: "explore",
    },
    {
      key: "PROMPTS",
      routeId: "more_prompts",
      label: "提示词",
      icon: "fas fa-message",
      category: "explore",
    },
    {
      key: "WORKFLOWS",
      routeId: "more_workflows",
      label: "工作流",
      icon: "fas fa-diagram-project",
      category: "explore",
    },
  ],
} as const);
