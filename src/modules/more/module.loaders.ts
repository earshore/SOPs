import type { ModuleMap } from "@/types/modules-business";

export const MODULE_MAP: ModuleMap = {
  more_overview: () => import("./views/overview/index"),
  more_agents: () => import("./views/explore/agents/index"),
  more_prompts: () => import("./views/explore/prompts/index"),
  more_workflows: () => import("./views/explore/workflows/index"),
};
