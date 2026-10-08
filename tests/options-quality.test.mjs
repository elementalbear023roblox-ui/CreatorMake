import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { applyProjectOptionPreset, DEFAULT_PROJECT_EXPORT_OPTIONS, resolveProjectRenderScale } from "../lib/editor/options.ts";
import { maximumSafeInternalScale, planPixelAccurateAssets } from "../lib/roblox/render-assets.ts";
import { CREATORMAKE_MASTER_CAPABILITIES, ROBLOX_IMAGE_CAPABILITIES, planMasterRender } from "../lib/roblox/image-capabilities.ts";

test("project export options persist in schema 14 while editor options remain outside the project",()=>{
  const project=createProject("Options");project.exportOptions={...project.exportOptions,renderedVisualQuality:"ULTRA",incrementalSync:false};
  const restored=normalizeProject(structuredClone(project));assert.equal(restored.schemaVersion,14);assert.equal(restored.exportOptions.defaultRobloxExportMode,"AUTO");assert.equal(restored.exportOptions.exportQuality,"FINAL");assert.equal(restored.exportOptions.renderedVisualQuality,"ULTRA");assert.equal(restored.exportOptions.incrementalSync,false);assert.equal("previewQuality" in restored.exportOptions,false);
  const legacy=structuredClone(project);delete legacy.exportOptions;legacy.schemaVersion=13;assert.deepEqual(normalizeProject(legacy).exportOptions,DEFAULT_PROJECT_EXPORT_OPTIONS);
  const commission=createProject("Commission","commission");assert.equal(commission.exportOptions.defaultRobloxExportMode,"AUTO");assert.equal(commission.exportOptions.exportQuality,"FINAL");assert.equal(commission.exportOptions.robloxImages,"PUBLISHABLE");assert.equal(commission.exportOptions.hierarchyExport,"PRESERVE");assert.equal(commission.exportOptions.multiplayerSafeAssets,"REQUIRE");
});

test("the primary Preview and Final choices resolve to predictable render quality",()=>{
  assert.equal(resolveProjectRenderScale({...DEFAULT_PROJECT_EXPORT_OPTIONS,exportQuality:"PREVIEW"}),2);
  assert.equal(resolveProjectRenderScale({...DEFAULT_PROJECT_EXPORT_OPTIONS,exportQuality:"FINAL"}),8);
  assert.equal(DEFAULT_PROJECT_EXPORT_OPTIONS.effectsQuality,"ULTRA");assert.equal(DEFAULT_PROJECT_EXPORT_OPTIONS.renderedVisualQuality,"MAXIMUM_SAFE");
  assert.equal(resolveProjectRenderScale({...DEFAULT_PROJECT_EXPORT_OPTIONS,exportQuality:"FINAL",internalRenderScale:"4"}),8,"Final owns automatic master planning even for projects saved with an old manual override");
  const preview=applyProjectOptionPreset("FAST_PREVIEW"),final=applyProjectOptionPreset("ROBLOX_FINAL"),commission=applyProjectOptionPreset("COMMISSION_FINAL"),maximum=applyProjectOptionPreset("MAX_QUALITY");
  assert.equal(preview.exportQuality,"PREVIEW");assert.equal(resolveProjectRenderScale(preview),2);
  assert.equal(final.exportQuality,"FINAL");assert.equal(final.nativeTextLabelExport,true);assert.equal(resolveProjectRenderScale(final),8);
  assert.equal(commission.exportQuality,"FINAL");assert.equal(resolveProjectRenderScale(commission),8);
  assert.equal(maximum.exportQuality,"FINAL");assert.equal(maximum.preset,"MAX_QUALITY");assert.equal(maximum.renderedVisualQuality,"MAXIMUM_SAFE");assert.equal(maximum.imageResampling,"BEST_QUALITY");assert.equal(maximum.robloxImages,"PUBLISHABLE");assert.equal(maximum.safeExportCheck,"REQUIRE");
});

test("garage button backgrounds supersample independently while caption glyphs stay out of PNG assets",()=>{
  const button=createElement("button");Object.assign(button,{id:"car-color",name:"Car Color",text:"Car Color",width:600,height:120,geometry:{...button.geometry,kind:"trapezoid",skew:12},borderWidth:2,shadow:"0 8px 18px rgba(0,0,0,.3)"});
  const project=createProject("Garage");project.elements=[button];
  const plans=[1,2,3,4,8].map((renderScale)=>planPixelAccurateAssets(project,{visualMode:"PIXEL_ACCURATE",renderScale})[0]);
  assert.ok(plans.every((asset)=>asset.sourceId==="car-color::background"&&asset.visualPart==="background"));assert.ok(plans.every((asset)=>!asset.sourceId.includes("text")&&!asset.sourceId.includes("glyph")));
  assert.ok(plans[3].internalRenderPixelWidth>plans[0].internalRenderPixelWidth);assert.equal(plans[4].internalRenderPixelWidth,plans[3].internalRenderPixelWidth);assert.equal(new Set(plans.map((asset)=>asset.visualHash)).size,4,"Final master quality is automatic instead of exposing several equivalent manual scales");
  const effects=["PERFORMANCE","HIGH","ULTRA"].map((effectsQuality)=>planPixelAccurateAssets(project,{visualMode:"PIXEL_ACCURATE",renderScale:3,effectsQuality})[0]);
  assert.equal(effects[0].internalScale,2);assert.equal(effects[1].internalScale,3);assert.ok(effects[2].internalScale>4);assert.equal(new Set(effects.map((asset)=>asset.visualHash)).size,3);
});

test("Maximum Safe clamps oversized visuals before allocating an unsafe canvas",()=>{
  const scale=maximumSafeInternalScale({width:6000,height:4000},8);assert.ok(scale<1.5);assert.ok(6000*scale<=8192);assert.ok(6000*4000*scale*scale<=CREATORMAKE_MASTER_CAPABILITIES.absoluteMaxPixels+.1);
});

test("Final IMAGE garage buttons receive an 8K-class master and one Roblox-safe delivery plan",()=>{
  const button=createElement("button");Object.assign(button,{id:"exit-garage",name:"EXIT GARAGE",text:"EXIT GARAGE",width:400,height:70,robloxExportMode:"IMAGE",geometry:{...button.geometry,kind:"trapezoid",skew:12},borderWidth:2,shadow:"0 8px 18px rgba(0,0,0,.3)",fontSizeDesign:32});
  const project=createProject("Garage Final");project.elements=[button];
  const plan=planPixelAccurateAssets(project,{visualMode:"ADAPTIVE",renderScale:8,imageResampling:"BEST_QUALITY",effectsQuality:"ULTRA"})[0];
  assert.equal(plan.visualPart,"full","IMAGE mode must flatten background, text, stroke, and effects together");
  assert.equal(plan.masterQuality,"8K_CLASS");assert.ok(Math.max(plan.masterRenderPixelWidth,plan.masterRenderPixelHeight)>=7000);assert.ok((plan.internalScale??0)>8,"a small detailed object uses aggressive canonical supersampling");
  assert.ok(plan.deliveryPixelWidth<=ROBLOX_IMAGE_CAPABILITIES.delivery.maxDimension);assert.ok(plan.deliveryPixelHeight<=ROBLOX_IMAGE_CAPABILITIES.delivery.maxDimension);assert.equal(plan.layoutWidth,400);assert.equal(plan.layoutHeight,70);
  assert.notEqual(plan.masterHash,plan.deliveryHash);assert.equal(plan.visualHash,plan.deliveryHash);
});

test("adaptive master planning steps down on constrained devices without changing logical size",()=>{
  const panel=createElement("button");Object.assign(panel,{width:1920,height:1080,text:"EXIT GARAGE",robloxExportMode:"IMAGE",borderWidth:2,geometry:{...panel.geometry,kind:"custom-path",pathData:"M 0 0 L 1920 40 L 1880 1080 L 0 1040 Z"}});
  const roomy=planMasterRender(panel,{width:1920,height:1080},{renderScale:8,effectsQuality:"ULTRA"},"full",undefined,8),constrained=planMasterRender(panel,{width:1920,height:1080},{renderScale:8,effectsQuality:"ULTRA"},"full",undefined,2);
  assert.equal(roomy.qualityClass,"8K_CLASS");assert.equal(roomy.width,7680);assert.equal(roomy.height,4320);assert.ok(constrained.width<roomy.width);assert.ok(constrained.clamped);assert.match(constrained.warning,/memory safety/);
});

test("properties alignment uses one tokenized grid and exposes the simplified export workflow",async()=>{
  const [css,inspector,options,toolbar]=await Promise.all([readFile(new URL("../app/property-grid.css",import.meta.url),"utf8"),readFile(new URL("../components/editor/Inspector.tsx",import.meta.url),"utf8"),readFile(new URL("../components/editor/OptionsSection.tsx",import.meta.url),"utf8"),readFile(new URL("../components/editor/TopToolbar.tsx",import.meta.url),"utf8")]);
  for(const token of ["--property-label-width","--control-height","--section-padding","--panel-gap","--field-gap","--section-icon-size"])assert.match(css,new RegExp(token));
  assert.ok(inspector.indexOf("Roblox Export")<inspector.indexOf("<summary>Options</summary>"));assert.match(inspector,/Export As/);assert.match(inspector,/AUTO/);assert.match(inspector,/ORIGINAL/);assert.match(inspector,/IMAGE/);assert.match(inspector,/Render the complete button, including its text/);assert.match(inspector,/Runtime text changes require Auto\/Original export/);
  assert.match(options,/PROJECT EXPORT/);assert.match(options,/Default Export/);assert.match(options,/PREVIEW/);assert.match(options,/FINAL/);assert.match(options,/ADVANCED EXPORT/);assert.match(options,/Search advanced options/);assert.doesNotMatch(options,/MAX QUALITY EXPORT/);assert.doesNotMatch(options,/Internal Render Scale/);
  assert.match(toolbar,/\+ Create/);assert.match(toolbar,/>Import</);assert.match(toolbar,/Roblox Check/);assert.match(toolbar,/SYNC/);assert.match(toolbar,/> Export</);assert.doesNotMatch(toolbar,/QUICK BUILD/);
});
