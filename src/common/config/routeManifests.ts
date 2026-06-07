import { amzHubManifest } from "@/modules/amz_hub/module.manifest";
import { appCenterManifest } from "@/modules/app_center/module.manifest";
import { homeManifest } from "@/modules/home/module.manifest";
import { moreManifest } from "@/modules/more/module.manifest";
import { sopsManifest } from "@/modules/sops/module.manifest";

export {
  amzHubManifest,
  appCenterManifest,
  homeManifest,
  moreManifest,
  sopsManifest,
};

export const ROUTE_MANIFESTS = [
  homeManifest,
  sopsManifest,
  appCenterManifest,
  amzHubManifest,
  moreManifest,
] as const;

export const BUSINESS_ROUTE_MANIFESTS = [
  sopsManifest,
  appCenterManifest,
  amzHubManifest,
  moreManifest,
] as const;
