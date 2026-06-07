import { describe, expect, it } from "vitest";
import { MENU_CONFIG } from "@/common/config/menuConfig";
import {
  BUSINESS_ROUTE_MANIFESTS,
  ROUTE_MANIFESTS,
} from "@/common/config/routeManifests";
import { buildModuleMap } from "@/common/config/moduleManifest";
import { ALL_ROUTE_ID_VALUES } from "@/common/constants/routes";

describe("module manifests", () => {
  const manifestRouteIds = ROUTE_MANIFESTS.flatMap((manifest) =>
    manifest.routes.map((route) => route.routeId),
  );

  it("derive the menu route table from every manifest route", () => {
    expect(Object.keys(MENU_CONFIG.routes)).toEqual(manifestRouteIds);
  });

  it("derive route id constants from every manifest route", () => {
    expect(ALL_ROUTE_ID_VALUES).toEqual(manifestRouteIds);
  });

  it("derive module maps from manifest loaders", () => {
    for (const manifest of BUSINESS_ROUTE_MANIFESTS) {
      const routesWithLoaders = manifest.routes
        .filter((route) => route.loader)
        .map((route) => route.routeId);

      expect(Object.keys(buildModuleMap(manifest))).toEqual(routesWithLoaders);
    }
  });
});
