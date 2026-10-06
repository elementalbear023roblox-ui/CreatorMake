import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { applyProjectOptionPreset, DEFAULT_PROJECT_EXPORT_OPTIONS, resolveProjectRenderScale } from "../lib/editor/options.ts";
import { maximumSafeInternalScale, planPixelAccurateAssets } from "../lib/roblox/render-assets.ts";

test("project export options persist in schema 14 while editor options remain outside the project",()=>{
  const project=createProject("Options");project.exportOptions={...project.exportOptions,renderedVisualQuality:"ULTRA",incrementalSync:false};
  const restored=normalizeProject(structuredClone(project));assert.equal(restored.schemaVersion,14);assert.equal(restored.exportOptions.renderedVisualQuality,"ULTRA");assert.equal(restored.exportOptions.incrementalSync,false);assert.equal("previewQuality" in restored.exportOptions,false);
  const legacy=structuredClone(project);delete legacy.exportOptions;legacy.schemaVersion=13;assert.deepEqual(normalizeProject(legacy).exportOptions,DEFAULT_PROJECT_EXPORT_OPTIONS);
});

test("quality presets resolve to genuinely different internal supersampling scales",()=>{
  const values=["DRAFT","STANDARD","HIGH","ULTRA","MAXIMUM_SAFE"].map((renderedVisualQuality)=>resolveProjectRenderScale({...DEFAULT_PROJECT_EXPORT_OPTIONS,renderedVisualQuality}));
  assert.deepEqual(values,[1,2,3,4,8]);assert.equal(applyProjectOptionPreset("ROBLOX_FINAL").nativeTextLabelExport,true);assert.equal(resolveProjectRenderScale(applyProjectOptionPreset("COMMISSION_FINAL")),8);const maximum=applyProjectOptionPreset("MAX_QUALITY");assert.equal(maximum.preset,"MAX_QUALITY");assert.equal(maximum.renderedVisualQuality,"MAXIMUM_SAFE");assert.equal(maximum.imageResampling,"BEST_QUALITY");assert.equal(maximum.robloxImages,"PUBLISHABLE");assert.equal(maximum.safeExportCheck,"REQUIRE");
});

test("garage button backgrounds supersample independently while caption glyphs stay out of PNG assets",()=>{
  const button=createElement("button");Object.assign(button,{id:"car-color",name:"Car Color",text:"Car Color",width:600,height:120,geometry:{...button.geometry,kind:"trapezoid",skew:12},borderWidth:2,shadow:"0 8px 18px rgba(0,0,0,.3)"});
  const project=createProject("Garage");project.elements=[button];
  const plans=[1,2,3,4,8].map((renderScale)=>planPixelAccurateAssets(project,{visualMode:"PIXEL_ACCURATE",renderScale})[0]);
  assert.ok(plans.every((asset)=>asset.sourceId==="car-color::background"&&asset.visualPart==="background"));assert.ok(plans.every((asset)=>!asset.sourceId.includes("text")&&!asset.sourceId.includes("glyph")));
  assert.ok(plans[3].internalRenderPixelWidth>plans[0].internalRenderPixelWidth);assert.ok(plans[4].internalRenderPixelWidth>=plans[3].internalRenderPixelWidth);assert.equal(new Set(plans.map((asset)=>asset.visualHash)).size,5);
  const effects=["PERFORMANCE","HIGH","ULTRA"].map((effectsQuality)=>planPixelAccurateAssets(project,{visualMode:"PIXEL_ACCURATE",renderScale:3,effectsQuality})[0]);
  assert.deepEqual(effects.map((asset)=>asset.internalScale),[2,3,4]);assert.equal(new Set(effects.map((asset)=>asset.visualHash)).size,3);
});

test("Maximum Safe clamps oversized visuals before allocating an unsafe canvas",()=>{
  const scale=maximumSafeInternalScale({width:6000,height:4000},8);assert.ok(scale<1);assert.ok(6000*scale<=8192);assert.ok(6000*4000*scale*scale<=16_777_216.1);
});

test("properties alignment uses one tokenized grid and Options follows Roblox Text Export",async()=>{
  const [css,inspector,options]=await Promise.all([readFile(new URL("../app/property-grid.css",import.meta.url),"utf8"),readFile(new URL("../components/editor/Inspector.tsx",import.meta.url),"utf8"),readFile(new URL("../components/editor/OptionsSection.tsx",import.meta.url),"utf8")]);
  for(const token of ["--property-label-width","--control-height","--section-padding","--panel-gap","--field-gap","--section-icon-size"])assert.match(css,new RegExp(token));
  assert.ok(inspector.indexOf("Roblox Text Export")<inspector.indexOf("<summary>Options</summary>"));assert.ok((options.match(/(?:select|toggle)\(\"/g)??[]).length>=30);assert.match(options,/Search options/);assert.match(options,/QUICK OPTIONS/);assert.match(options,/RECENTLY CHANGED/);assert.match(options,/MAX QUALITY EXPORT/);assert.match(options,/FAST_PREVIEW/);assert.match(options,/COMMISSION_FINAL/);assert.match(options,/MAX_QUALITY/);
});
