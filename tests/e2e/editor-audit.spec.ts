import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const viewports = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "reported-regression", width: 607, height: 420 },
  { name: "phone", width: 390, height: 844 },
] as const;

for (const viewport of viewports) {
  test(`editor chrome remains contained at ${viewport.name}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await expect(page.locator(".editor-shell")).toBeVisible();
    await page.waitForTimeout(250);

    const layout = await page.evaluate(() => {
      const selectors = [".brand-project", ".area-navigation", ".context-toolstrip", ".top-actions"];
      const regions = selectors.map((selector) => {
        const element = document.querySelector<HTMLElement>(selector);
        if (!element) throw new Error(`Missing toolbar region: ${selector}`);
        const rect = element.getBoundingClientRect();
        return { selector, left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      const collisions: string[] = [];
      for (let first = 0; first < regions.length; first += 1) {
        for (let second = first + 1; second < regions.length; second += 1) {
          const a = regions[first], b = regions[second];
          const overlapWidth = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const overlapHeight = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (overlapWidth > 1 && overlapHeight > 1) collisions.push(`${a.selector} overlaps ${b.selector}`);
        }
      }
      return {
        collisions,
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        bodyWidth: document.body.scrollWidth,
        regions,
        canvasControls: (() => {
          const rect = document.querySelector<HTMLElement>(".canvas-controls")?.getBoundingClientRect();
          return rect ? { left: rect.left, right: rect.right } : null;
        })(),
      };
    });

    expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.bodyWidth).toBeLessThanOrEqual(layout.viewportWidth);
    expect(layout.collisions).toEqual([]);
    for (const region of layout.regions) {
      expect(region.left).toBeGreaterThanOrEqual(-1);
      expect(region.right).toBeLessThanOrEqual(layout.viewportWidth + 1);
    }
    expect(layout.canvasControls).not.toBeNull();
    expect(layout.canvasControls!.left).toBeGreaterThanOrEqual(-1);
    expect(layout.canvasControls!.right).toBeLessThanOrEqual(layout.viewportWidth + 1);

    await page.screenshot({ path: testInfo.outputPath(`${viewport.name}.png`), fullPage: false });
  });
}

test("core editor controls complete a real browser workflow", async ({ page }) => {
  const pageErrors: string[] = [], consoleErrors: string[] = [], failedRequests: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error" && !message.text().includes("net::ERR_CONNECTION_REFUSED")) consoleErrors.push(message.text()); });
  page.on("requestfailed", (request) => { const url = new URL(request.url()); if (!(url.hostname === "127.0.0.1" && url.port !== "4173")) failedRequests.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText ?? "failed"}`); });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await expect(page.locator(".editor-shell")).toBeVisible();

  const canvasObjects = page.locator(".canvas-element");
  const initialCount = await canvasObjects.count();
  await page.getByRole("button", { name: /Insert/ }).click();
  await page.getByRole("button", { name: "Create frame" }).click();
  await expect(canvasObjects).toHaveCount(initialCount + 1);
  await page.keyboard.press("Control+z");
  await expect(canvasObjects).toHaveCount(initialCount);

  await page.getByRole("button", { name: "Create frame" }).click();
  await page.getByRole("button", { name: "Create text" }).click();
  await page.getByRole("button", { name: "Create 3D object" }).click();
  await page.getByLabel("Create object").selectOption("button");
  await page.locator('input[type="file"]').setInputFiles({
    name: "audit-image.png",
    mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR42mP8z8Dwn4GBgYGJAQoAHgQCAWYLK3sAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByRole("button", { name: "Design", exact: true }).click();
  await page.getByLabel("Shape tools").selectOption("star");
  await expect(canvasObjects).toHaveCount(initialCount + 6);

  await page.getByRole("button", { name: "Effects", exact: true }).click();
  await page.getByRole("button", { name: "Add Effect" }).click();
  await page.locator(".effects-library button").filter({ hasText: "Neon Glow" }).click();
  await expect(page.getByLabel("Neon Glow instance name")).toBeVisible();
  await expect(page.locator(".project-chip small")).toContainText("Saved", { timeout: 10_000 });

  const savedCount = await canvasObjects.count();
  await page.reload();
  await expect(page.locator(".editor-shell")).toBeVisible();
  await expect(page.locator(".canvas-element")).toHaveCount(savedCount);
  await expect(page.getByLabel("Neon Glow instance name")).toBeVisible();

  await page.getByRole("button", { name: "Search commands" }).click();
  await expect(page.getByRole("dialog", { name: /command/i })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: /command/i })).toBeHidden();

  await page.locator(".brand").click();
  await expect(page.getByRole("dialog", { name: /project/i })).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Export", exact: true }).click();
  await page.getByRole("button", { name: "Export to Roblox" }).click();
  const exportDialog = page.getByRole("dialog", { name: /Roblox/i });
  await expect(exportDialog).toBeVisible();

  const [projectDownload] = await Promise.all([
    page.waitForEvent("download"),
    exportDialog.getByRole("button", { name: "Project JSON" }).click(),
  ]);
  const projectPath = await projectDownload.path();
  expect(projectPath).not.toBeNull();
  const projectFile = JSON.parse(await readFile(projectPath!, "utf8"));
  expect(projectFile.elements).toHaveLength(savedCount);
  expect(projectFile.elements.some((element: { type: string }) => element.type === "three-d")).toBeTruthy();

  const [luaDownload] = await Promise.all([
    page.waitForEvent("download"),
    exportDialog.getByRole("button", { name: "Lua", exact: true }).click(),
  ]);
  const luaPath = await luaDownload.path();
  expect(luaPath).not.toBeNull();
  const lua = await readFile(luaPath!, "utf8");
  expect(lua).toContain('Instance.new("ScreenGui")');
  expect(lua.trim().endsWith("return screenGui")).toBeTruthy();

  await exportDialog.locator("summary").filter({ hasText: "Settings → Roblox → Diagnostics" }).click();
  await exportDialog.getByRole("button", { name: "Visual Hashes / Mappings" }).click();
  const pngButton = exportDialog.locator(".pixel-assets .asset-actions button").filter({ hasText: "PNG" }).first();
  await expect(pngButton).toBeEnabled({ timeout: 30_000 });
  const [pngDownload] = await Promise.all([page.waitForEvent("download"), pngButton.click()]);
  const pngPath = await pngDownload.path();
  expect(pngPath).not.toBeNull();
  const png = await sharp(pngPath!).metadata();
  expect(png.format).toBe("png");
  expect(png.width).toBeGreaterThan(0);
  expect(png.height).toBeGreaterThan(0);
  expect(png.hasAlpha).toBeTruthy();
  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(failedRequests).toEqual([]);
});

test("compact Insert opens one contained drawer", async ({ page }) => {
  await page.setViewportSize({ width: 607, height: 420 });
  await page.goto("/");
  await expect(page.locator(".editor-shell[data-compact=true]")).toBeVisible();
  await page.getByRole("button", { name: /Insert/ }).click();
  const drawer = page.locator(".workspace > .left-panel");
  await expect(drawer).toBeVisible();
  const box = await drawer.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(607);
  await expect(page.locator(".workspace > .right-panel")).toHaveCount(0);
});

test("professional demo stays editable through preview, save, reload, and Roblox export", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?workflow=professional-demo");
  await page.getByRole("button", { name: /^Insert Add objects and assets$/ }).click();
  await page.getByRole("button", { name: "Design kits", exact: true }).click();
  const card=page.locator(".design-kit-card").filter({hasText:"Demo · Modern Adventure"});
  await card.getByRole("button", {name:"Insert interface"}).click();
  await expect(page.locator(".canvas-element")).toHaveCount(31);
  await expect(page.locator(".project-chip small")).toContainText("Saved",{timeout:10_000});

  await page.reload();
  await expect(page.locator(".canvas-element")).toHaveCount(31);
  await page.getByRole("button", {name:"Preview project"}).click();
  await expect(page.locator(".preview-diagnostics.ready")).toContainText("Responsive check passed");
  await expect(page.locator(".preview-canvas .canvas-element")).toHaveCount(31);

  await page.getByRole("button", {name:"Export to Roblox"}).click();
  const exportDialog=page.getByRole("dialog",{name:/Roblox/i});
  await expect(exportDialog).toBeVisible();
  const [download]=await Promise.all([page.waitForEvent("download"),exportDialog.getByRole("button",{name:"Project JSON"}).click()]);
  const downloadPath=await download.path();
  expect(downloadPath).not.toBeNull();
  const project=JSON.parse(await readFile(downloadPath!,"utf8"));
  expect(project.schemaVersion).toBe(19);
  expect(project.elements).toHaveLength(31);
  expect(project.elements.some((element:{geometry:{kind:string}})=>element.geometry.kind==="organic-panel")).toBeTruthy();
  expect(project.elements.some((element:{geometry:{kind:string}})=>element.geometry.kind==="tech-panel")).toBeTruthy();
  expect(project.elements.some((element:{dimension:{enabled:boolean}})=>element.dimension.enabled)).toBeTruthy();
});
