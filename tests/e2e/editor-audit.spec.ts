import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import sharp from "sharp";
import opentype from "opentype.js";

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
  expect(project.schemaVersion).toBe(20);
  expect(project.elements).toHaveLength(31);
  expect(project.elements.some((element:{geometry:{kind:string}})=>element.geometry.kind==="organic-panel")).toBeTruthy();
  expect(project.elements.some((element:{geometry:{kind:string}})=>element.geometry.kind==="tech-panel")).toBeTruthy();
  expect(project.elements.some((element:{dimension:{enabled:boolean}})=>element.dimension.enabled)).toBeTruthy();
});

test("3D preview refines to Ultra resolution only after interaction settles",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/?workflow=adaptive-3d-resolution");
  await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();
  await page.getByRole("button",{name:"Design kits",exact:true}).click();
  const card=page.locator(".design-kit-card").filter({hasText:"Demo · Orbital Command"});
  await card.getByRole("button",{name:"Insert interface"}).click();
  const canvas=page.getByLabel("Holographic Reactor transparent 3D preview");
  await expect(canvas).toHaveAttribute("data-render-ready","true",{timeout:15_000});
  await page.getByRole("button",{name:"Design Layout and appearance"}).click();
  await page.locator('[data-layer-type="three-d"]').filter({hasText:"Holographic Reactor"}).click();
  await page.locator("details.three-d-inspector").filter({hasText:"3D Lighting & Camera"}).locator("summary").click();
  await page.getByLabel("Pixel resolution").selectOption("ULTRA");
  await expect(canvas).toHaveAttribute("data-resolution-mode","settled",{timeout:15_000});
  const resolution=await canvas.evaluate((node)=>({scale:Number(node.dataset.resolutionScale),pixelWidth:Number(node.dataset.pixelWidth),pixelHeight:Number(node.dataset.pixelHeight),cssWidth:Number(node.dataset.cssWidth),cssHeight:Number(node.dataset.cssHeight)}));
  expect(resolution.scale).toBeGreaterThanOrEqual(5.9);
  expect(resolution.pixelWidth).toBeGreaterThanOrEqual(resolution.cssWidth*5.9);
  expect(resolution.pixelHeight).toBeGreaterThanOrEqual(resolution.cssHeight*5.9);
});

test("reference pixel letters are real 3D meshes with exact automatic bounds",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/?workflow=pixel-alphabet-bounds");
  await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();
  await page.locator(".roblox-library-switch button").filter({hasText:"3D"}).click();
  await page.getByRole("button",{name:"Pixel",exact:true}).click();
  await page.getByRole("button",{name:"Insert 3D pixel A"}).click();
  const canvas=page.getByLabel("3D Pixel A transparent 3D preview");
  await expect(canvas).toHaveAttribute("data-render-ready","true",{timeout:15_000});
  await expect(canvas).toHaveAttribute("data-selection-padding","10");
  const before=await canvas.evaluate((node)=>({geometry:(node.closest(".three-d-element-surface") as HTMLElement).dataset.geometryBounds!.split(",").map(Number),render:(node.closest(".three-d-element-surface") as HTMLElement).dataset.renderBounds!.split(",").map(Number),effect:Number((node.closest(".three-d-element-surface") as HTMLElement).dataset.effectPadding),width:node.getBoundingClientRect().width,parentWidth:(node.closest(".canvas-element") as HTMLElement).getBoundingClientRect().width}));
  const [left,top,width,height]=before.geometry,[renderLeft,renderTop,renderWidth,renderHeight]=before.render;
  expect(before.effect).toBe(0);
  expect(renderLeft).toBe(Math.floor(left-10));
  expect(renderTop).toBe(Math.floor(top-10));
  expect(renderWidth).toBe(Math.ceil(left+width+10)-Math.floor(left-10));
  expect(renderHeight).toBe(Math.ceil(top+height+10)-Math.floor(top-10));
  expect(before.width).toBeLessThan(before.parentWidth);
  await page.getByRole("button",{name:"Design Layout and appearance"}).click();
  await page.getByRole("spinbutton",{name:"Rotate Y value"}).fill("67");
  await expect(canvas).toHaveAttribute("data-render-ready","true");
  await expect.poll(async()=>canvas.evaluate((node)=>(node.closest(".three-d-element-surface") as HTMLElement).dataset.geometryBounds)).not.toBe(before.geometry.join(","));
});

test("3D Letter Composer creates independent editable CREATORMAKE objects",async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/?workflow=pixel-word-composer");
  await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();
  await page.locator(".roblox-library-switch button").filter({hasText:"3D"}).click();
  await page.getByRole("button",{name:"Pixel",exact:true}).click();
  await page.getByLabel("Source text").fill("CREATORMAKE");
  await page.getByRole("button",{name:"Generate separate 3D letters"}).click();
  const letters=page.locator('canvas[aria-label^="3D Pixel "]');
  await expect(letters).toHaveCount(11);
  await page.getByRole("tab",{name:"Layers",exact:true}).click();
  await expect(page.locator('[data-layer-type="container"]').filter({hasText:"3D Pixel Word · CREATORMAKE"})).toBeVisible();
  await expect(page.locator('[data-layer-type="three-d"]')).toHaveCount(11);
});

test("Marola uses original outline meshes, metrics, and tight bounds",async({page},testInfo)=>{
  await page.setViewportSize({width:1440,height:900});
  await page.goto("/?workflow=marola-3d-typography");
  await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();
  await page.locator(".roblox-library-switch button").filter({hasText:"3D"}).click();
  await page.getByRole("button",{name:"3D Typography",exact:true}).click();
  await expect(page.locator(".font-origin-note")).toContainText("Marola");
  await expect(page.locator(".font-origin-note")).toContainText("Original supplied outline font");
  await page.getByRole("button",{name:"Insert Marola A"}).click();
  const letter=page.getByLabel("3D Marola A transparent 3D preview");
  await expect(letter).toHaveAttribute("data-render-ready","true",{timeout:15_000});
  await expect(letter).toHaveAttribute("data-selection-padding","10");
  await expect(letter).not.toHaveAttribute("data-geometry-error",/.+/);
  await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();
  await page.getByRole("button",{name:"Compose Text",exact:true}).click();
  await page.getByLabel("Source text").fill("MRCREATOR'S CREATOR TIME");
  await page.getByRole("button",{name:"Generate editable 3D text"}).click();
  await expect(page.locator('canvas[aria-label^="3D Marola "]')).toHaveCount(23);
  await page.getByRole("tab",{name:"Layers",exact:true}).click();
  await expect(page.locator('[data-layer-type="container"]').filter({hasText:"3D Marola · MRCREATOR'S CREATOR TIME"})).toBeVisible();
  await page.screenshot({path:testInfo.outputPath("marola-3d-composition.png"),fullPage:false});
});

test("custom TTF import persists project outlines and creates genuine 3D glyphs",async({page})=>{
  const notdefPath=new opentype.Path();notdefPath.moveTo(0,0);notdefPath.lineTo(500,0);notdefPath.lineTo(500,700);notdefPath.lineTo(0,700);notdefPath.close();
  const aPath=new opentype.Path();aPath.moveTo(40,0);aPath.lineTo(300,760);aPath.lineTo(560,0);aPath.lineTo(430,0);aPath.lineTo(365,200);aPath.lineTo(220,200);aPath.lineTo(155,0);aPath.close();aPath.moveTo(260,330);aPath.lineTo(325,330);aPath.lineTo(293,520);aPath.close();
  const font=new opentype.Font({familyName:"Audit Outline",styleName:"Regular",unitsPerEm:1000,ascender:800,descender:-200,glyphs:[new opentype.Glyph({name:".notdef",advanceWidth:600,path:notdefPath}),new opentype.Glyph({name:"A",unicode:65,advanceWidth:620,path:aPath})]});
  await page.setViewportSize({width:1440,height:900});await page.goto("/?workflow=custom-3d-font-import");await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();await page.locator(".roblox-library-switch button").filter({hasText:"3D"}).click();await page.getByRole("button",{name:"3D Typography",exact:true}).click();
  await page.getByLabel("I have permission to use this font").check();
  await page.locator(".font-import-box input[type=file]").setInputFiles({name:"audit-outline.ttf",mimeType:"font/ttf",buffer:Buffer.from(font.toArrayBuffer())});
  await expect(page.locator(".font-import-box")).toContainText("Audit Outline imported",{timeout:15_000});
  await expect(page.locator(".three-d-typography select").first()).toHaveValue(/audit-outline-/);
  await page.getByRole("button",{name:"Insert Audit Outline A"}).click();
  const canvas=page.getByLabel("3D Audit Outline A transparent 3D preview");await expect(canvas).toHaveAttribute("data-render-ready","true",{timeout:15_000});await expect(canvas).toHaveAttribute("data-selection-padding","10");
  await expect(page.locator(".project-chip small")).toContainText("Saved",{timeout:10_000});await page.reload();await page.getByRole("button",{name:/^Insert Add objects and assets$/}).click();await page.locator(".roblox-library-switch button").filter({hasText:"3D"}).click();await page.getByRole("button",{name:"3D Typography",exact:true}).click();await expect(page.locator(".three-d-typography select").first().locator("option")).toContainText(["Marola","Audit Outline · Project"]);
});
