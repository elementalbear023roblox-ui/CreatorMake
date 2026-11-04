import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";
import { createRobloxElement, ROBLOX_ELEMENTS } from "../lib/roblox/component-library.ts";

test("3D objects are real saved editor elements with safe Roblox image fallback",()=>{
  const object=createElement("three-d");
  assert.equal(object.type,"three-d");
  assert.equal(object.threeD.primitive,"cube");
  assert.equal(object.threeD.material,"plastic");
  assert.equal(object.robloxExportMode,"IMAGE");
  const classification=classifyRobloxElement(object);
  assert.equal(classification.classification,"RASTERIZED");
  assert.equal(classification.intendedRobloxClass,"ImageLabel");
  assert.match(classification.resolvedLabel,/Premium|Image/);
});

test("schema 18 migrates older projects without losing editable geometry and stroke controls",()=>{
  const project=createProject("Migration"),frame=createElement("frame");
  project.elements=[frame];
  const legacy=structuredClone(project);legacy.schemaVersion=15;delete legacy.elements[0].threeD;
  const restored=normalizeProject(legacy);
  assert.equal(restored.schemaVersion,18);
  assert.equal(restored.elements[0].geometry.kind,"rectangle");
  assert.equal(restored.elements[0].threeD.primitive,"cube");
  assert.equal(restored.elements[0].strokeLineCap,"round");
  assert.deepEqual(restored.elements[0].strokeDash,[]);
});

test("Native and Image Text are distinct editable insert choices",()=>{
  assert.ok(ROBLOX_ELEMENTS.some((item)=>item.kind==="image-text-label"&&item.nativeClass==="ImageLabel"));
  assert.ok(ROBLOX_ELEMENTS.some((item)=>item.kind==="image-text-button"&&item.nativeClass==="ImageButton"));
  const native=createRobloxElement("text-label")[0],image=createRobloxElement("image-text-label")[0],button=createRobloxElement("image-text-button")[0];
  assert.equal(native.robloxExportMode,null);
  assert.equal(image.type,"text");assert.equal(image.robloxExportMode,"IMAGE");assert.equal(image.textRobloxExportMode,"PIXEL_ACCURATE");
  assert.equal(button.type,"button");assert.equal(button.robloxExportMode,"IMAGE");assert.ok(button.effects.length>0);
});

test("professional navigation and GPU renderer are wired into the real editor",async()=>{
  const [layers,inspector,surface]=await Promise.all([readFile(new URL("../components/editor/LayersPanel.tsx",import.meta.url),"utf8"),readFile(new URL("../components/editor/Inspector.tsx",import.meta.url),"utf8"),readFile(new URL("../components/editor/ThreeDObjectSurface.tsx",import.meta.url),"utf8")]);
  for(const label of ["Layers","Insert","Assets","Templates"])assert.match(layers,new RegExp(`\\"${label}\\"`));
  assert.match(inspector,/Text Type/);assert.match(inspector,/Convert to 3D/);assert.match(inspector,/3D Geometry/);
  assert.match(surface,/WebGLRenderer/);assert.match(surface,/webglcontextlost/);assert.doesNotMatch(surface,/forceContextLoss/);assert.match(surface,/PCFSoftShadowMap/);
});
