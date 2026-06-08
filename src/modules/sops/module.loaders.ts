import type { ModuleMap } from "@/types/modules-business";

export const MODULE_MAP: ModuleMap = {
  sops_overview: () => import("./views/overview/index"),
  sops_npi_tracker: () => import("./views/growth/npi_tracker/index"),
  sops_listing_seo: () => import("./views/growth/listing_seo/index"),
  sops_ppc_advertising: () => import("./views/growth/ppc_advertising/index"),
  sops_restricted_words: () => import("./views/growth/restricted_words/index"),
  sops_promotion_submission: () =>
    import("./views/growth/promotion_submission/index"),
  sops_competitor_monitoring: () =>
    import("./views/growth/competitor_monitoring/index"),
  sops_fba_shipping: () => import("./views/backend/fba_shipping/index"),
  sops_procurement_qc: () => import("./views/backend/procurement_qc/index"),
  sops_inventory_replenishment: () =>
    import("./views/backend/inventory_replenishment/index"),
  sops_account_security: () => import("./views/safety/account_security/index"),
  sops_permission_management: () =>
    import("./views/safety/permission_management/index"),
  sops_brand_infringement: () =>
    import("./views/safety/brand_infringement/index"),
  sops_performance_notification: () =>
    import("./views/safety/performance_notification/index"),
  sops_product_compliance: () =>
    import("./views/safety/product_compliance/index"),
  sops_eu_gpsr_compliance: () =>
    import("./views/safety/eu_gpsr_compliance/index"),
  sops_email_templates: () => import("./views/service/email_templates/index"),
  sops_negative_review: () => import("./views/service/negative_review/index"),
  sops_qa_maintenance: () => import("./views/service/qa_maintenance/index"),
};
