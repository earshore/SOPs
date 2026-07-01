import type { ModuleMap } from "@/types/modules-business";

export const MODULE_MAP: ModuleMap = {
  app_center_overview: () => import("./views/overview/index"),
  scraper: () => import("./views/master_analysis/scraper/index"),
  ai_analysis: () => import("./views/master_analysis/ai_analysis/index"),
  promptlab: () => import("./views/master_analysis/promptlab/index"),
  ppc_search_terms: () => import("./views/ppc_search_terms/index"),
  kw_input: () => import("./views/keyword_hunter/input/index"),
  kw_process: () => import("./views/keyword_hunter/process/index"),
  kw_analysis: () => import("./views/keyword_hunter/analysis/index"),
  playground: () => import("./views/playground/deep-chat/index"),
};
