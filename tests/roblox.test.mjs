import test from "node:test";
import assert from "node:assert/strict";
import { generateRobloxShop } from "../lib/ai/roblox-shop.ts";
import { parseDesignIntent } from "../lib/ai/intent.ts";
import { createRobloxExport, verifyGeneratedLua } from "../lib/roblox/exporter.ts";
import { buildActiveProjectRobloxManifest } from "../lib/roblox/active-project-manifest.ts";
import { createElement, createProject } from "../lib/editor/project.ts";
import { SYSTEM_PRESETS } from "../lib/design-intelligence/system-presets.ts";
import { diffRobloxManifests } from "../lib/roblox/sync.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const makeShop = (prompt) => generateRobloxShop({
  prompt,
  intent: parseDesignIntent(prompt),
});

test("colorful simulator shop creates the required editable hierarchy", () => {
  const shop = makeShop("Create a colorful Roblox simulator shop with a featured product at the top, six product cards, category tabs on the right, a large title, currency price badges, and a close button.");
  const names = new Set(shop.elements.map((element) => element.name));
  assert.equal(shop.label, "colorful Roblox simulator shop");
  for (const name of ["ShopWindow", "FeaturedProduct", "ProductGrid", "SideTabs", "TitleText", "CloseButton", "SaleBanner"]) assert.ok(names.has(name), name);
  assert.equal(shop.elements.filter((element) => /^ProductCard\d{2}$/.test(element.name)).length, 6);
  assert.equal(shop.elements.filter((element) => /^CategoryTab\d{2}$/.test(element.name)).length, 4);
});

test("premium prompt creates a distinct dark shop with codes", () => {
  const shop = makeShop("Create a dark premium Roblox shop with black panels, gold outlines, an angled title plaque, product cards, a codes section, and a red close button.");
  const byName = new Map(shop.elements.map((element) => [element.name, element]));
  assert.equal(shop.label, "dark premium Roblox shop");
  for (const name of ["ShopWindow", "TitlePlaque", "CodesSection", "CodeInput", "RedeemButton", "CloseButton"]) assert.ok(byName.has(name), name);
  assert.equal(byName.get("TitlePlaque").rotation, -1.5);
  assert.equal(byName.get("ShopWindow").fill, "#07080c");
});

test("Roblox export preserves names, hierarchy, decorators, and valid syntax", () => {
  const shop = makeShop("Create a colorful Roblox simulator shop with six product cards and category tabs.");
  const project = { screen: { width: 960, height: 600 }, elements: shop.elements };
  const result = createRobloxExport(project, { ...DEFAULT_ROBLOX_EXPORT_OPTIONS, visualMode:"NATIVE", screenGuiName: "CreatorMakeShop" });
  const requiredInstances = ["ScreenGui", "Frame", "TextLabel", "ImageButton", "UIStroke", "UICorner", "UIGradient", "UIListLayout", "UIGridLayout"];
  for (const className of requiredInstances) assert.match(result.lua, new RegExp(`Instance\\.new\\(\"${className}\"\\)`), className);
  for (const name of ["ShopWindow", "TitleText", "CloseButton", "ProductGrid", "SideTabs"]) assert.ok(result.lua.includes(`.Name = \"${name}\"`), name);
  assert.ok(result.hierarchy.includes("CreatorMakeShop [ScreenGui]"));
  assert.ok(result.hierarchy.includes("ProductGrid [Frame]"));
  assert.ok(result.hierarchy.includes("UIGridLayout [UIGridLayout]"));
  assert.ok(result.lua.trim().endsWith("return screenGui"));
  assert.deepEqual(verifyGeneratedLua(result.lua), { valid: true, errors: [] });
  assert.ok(!result.lua.includes("undefined"));
  assert.ok(!result.lua.includes("NaN"));
});

test("active-project manifest exports one placed frame and zero preset definitions",()=>{
  const project=createProject("Single Object"),frame=createElement("frame");Object.assign(frame,{id:"frame-only",name:"Frame1",parentId:null});project.elements=[frame];project.activePresetIds=SYSTEM_PRESETS.map((preset)=>preset.id);project.updatedAt=123;
  const result=buildActiveProjectRobloxManifest(project,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"SingleObjectGui"}),manifest=result.manifest;
  assert.equal(manifest.kind,"project");assert.equal(manifest.messageType,"PROJECT_MANIFEST");assert.equal(manifest.projectId,project.id);assert.equal(manifest.projectName,"Single Object");assert.deepEqual(manifest.projectObjectIds,["frame-only"]);assert.equal(manifest.exportDiagnostics.projectObjectCount,1);assert.equal(manifest.exportDiagnostics.exportedProjectObjectCount,1);assert.equal(manifest.exportDiagnostics.presetsExported,0);assert.equal(manifest.exportDiagnostics.presetDefinitionsIncluded,false);assert.equal(SYSTEM_PRESETS.length>0,true);assert.deepEqual(manifest.nodes.map((node)=>node.sourceId),["frame-only"]);
});

test("active-project manifest removes a deleted button without importing preset library objects",()=>{
  const project=createProject("TestProject"),frame=createElement("frame"),text=createElement("text"),button=createElement("button");Object.assign(frame,{id:"frame-1",name:"Frame1",parentId:null});Object.assign(text,{id:"text-1",name:"Text1",parentId:frame.id,text:"Text1"});Object.assign(button,{id:"button-1",name:"Button1",parentId:frame.id,text:"Button1"});project.elements=[frame,text,button];project.activePresetIds=SYSTEM_PRESETS.map((preset)=>preset.id);project.updatedAt=200;
  const first=buildActiveProjectRobloxManifest(project,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"TestProjectGui"}).manifest,next=structuredClone(project);next.elements=next.elements.filter((element)=>element.id!=="button-1");next.updatedAt=201;const second=buildActiveProjectRobloxManifest(next,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"TestProjectGui"}).manifest,operations=diffRobloxManifests(first,second);
  assert.deepEqual(first.projectObjectIds,["frame-1","text-1","button-1"]);assert.deepEqual(second.projectObjectIds,["frame-1","text-1"]);assert.equal(first.exportDiagnostics.presetsExported,0);assert.equal(second.exportDiagnostics.presetsExported,0);assert.ok(operations.some((operation)=>operation.type==="delete"&&operation.sourceId==="button-1"));assert.ok(second.nodes.every((node)=>["frame-1","text-1"].includes(node.sourceId.split("::")[0])));
});
