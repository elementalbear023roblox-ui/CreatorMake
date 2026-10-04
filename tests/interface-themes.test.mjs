import assert from "node:assert/strict";
import test from "node:test";
import { INTERFACE_THEMES, WORKSPACE_MODES, buildInterfaceTokens, getTheme, themeContrastReport, tokensToCssVariables } from "../lib/ui/interface-themes.ts";

test("publishes the six professional workspace modes in product order", () => {
  assert.deepEqual(WORKSPACE_MODES, ["design", "vector", "prototype", "roblox", "review", "deliver"]);
});

test("ships exactly 30 unique built-in interface themes", () => {
  assert.equal(INTERFACE_THEMES.length, 30);
  assert.equal(new Set(INTERFACE_THEMES.map((theme) => theme.id)).size, 30);
  assert.equal(new Set(INTERFACE_THEMES.map((theme) => theme.name)).size, 30);
  assert.deepEqual(INTERFACE_THEMES.map((theme) => theme.name), ["Creator Purple","Blurple","Electric Violet","Neon Cyan","Cyan Purple","Magenta","Hot Pink","Cherry Red","Crimson","Sunset","Orange","Amber","Gold","Lime","Emerald","Mint","Aqua","Ocean","Deep Blue","Royal Blue","Indigo","Lavender","Rose","Monochrome","Graphite","Windows 98","Y2K","Webcore","Cyber","Game Show"]);
  for (const theme of INTERFACE_THEMES) {
    assert.equal(theme.accent.length, 3);
    theme.accent.forEach((color) => assert.match(color, /^#[0-9a-f]{6}$/i));
  }
});

test("every built-in theme generates accessible light and dark text tokens", () => {
  for (const theme of INTERFACE_THEMES) {
    for (const appearance of ["light", "dark"]) {
      const report = themeContrastReport(theme, appearance);
      assert.ok(report.primaryText >= 7, `${theme.name} ${appearance} primary contrast ${report.primaryText}`);
      assert.ok(report.secondaryText >= 4.5, `${theme.name} ${appearance} secondary contrast ${report.secondaryText}`);
      assert.ok(report.disabledText >= 3, `${theme.name} ${appearance} disabled contrast ${report.disabledText}`);
      assert.ok(report.buttonText >= 4.5, `${theme.name} ${appearance} button contrast ${report.buttonText}`);
      assert.ok(report.focusRing >= 3, `${theme.name} ${appearance} focus contrast ${report.focusRing}`);
      assert.ok(report.selectedState >= 4.5, `${theme.name} ${appearance} selected-state contrast ${report.selectedState}`);
      assert.ok(report.propertyInput >= 7, `${theme.name} ${appearance} property-input contrast ${report.propertyInput}`);
    }
  }
});

test("token generation is deterministic and does not mutate a theme definition", () => {
  const theme = getTheme("windows-98");
  const snapshot = structuredClone(theme);
  const first = buildInterfaceTokens(theme, "dark");
  const second = buildInterfaceTokens(theme, "dark");
  assert.deepEqual(first, second);
  assert.deepEqual(theme, snapshot);
  assert.equal(tokensToCssVariables(first)["--cm-background"], first.background);
  assert.match(first.gradient, /linear-gradient/);
});

test("light and dark appearance remain independent from color-theme selection", () => {
  const theme = getTheme("ocean");
  const light = buildInterfaceTokens(theme, "light");
  const dark = buildInterfaceTokens(theme, "dark");
  assert.notEqual(light.background, dark.background);
  assert.equal(theme.id, "ocean");
  assert.deepEqual(theme.accent, ["#0369a1", "#0891b2", "#22c55e"]);
});
