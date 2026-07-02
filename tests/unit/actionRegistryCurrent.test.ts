import { describe, expect, it, vi, afterEach } from "vitest";
import {
  registerAction,
  unregisterAction,
} from "@/common/utils/actionRegistry";

const GLOBAL_SYSTEM_ACTIONS = [
  "clear-sidebar-search",
  "openPerformanceMonitor",
  "showPerformanceReport",
  "switchTheme",
  "getAllThemes",
  "getCurrentTheme",
  "showLogs",
  "showErrors",
  "clearLogs",
  "downloadLogs",
];

describe("ActionRegistry naming conventions", () => {
  afterEach(() => {
    GLOBAL_SYSTEM_ACTIONS.forEach((actionName) => unregisterAction(actionName));
    vi.restoreAllMocks();
  });

  it("does not warn for global system actions without module prefixes", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    GLOBAL_SYSTEM_ACTIONS.forEach((actionName) => {
      registerAction(actionName, () => {});
    });

    expect(
      warnSpy.mock.calls.some(([message]) =>
        String(message).includes("未使用模块前缀"),
      ),
    ).toBe(false);
  });
});
