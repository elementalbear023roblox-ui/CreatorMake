import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { normalizeThreeDSettings, projectedBoundsFromPoints, threeDGeometryKey } from "../lib/editor/three-d.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";

test("3D transforms are finite, independently scalable, and safe from zero geometry",()=>{
  const settings=normalizeThreeDSettings({rotationX:Number.NaN,rotationY:725,positionZ:Number.POSITIVE_INFINITY,scale:0,scaleX:-4,scaleY:2.25,scaleZ:.4,pivotX:99,depth:0});
  assert.equal(settings.rotationX,-12);assert.equal(settings.rotationY,725);assert.equal(settings.positionZ,0);assert.equal(settings.scale,.05);assert.equal(settings.scaleX,.05);assert.equal(settings.scaleY,2.25);assert.equal(settings.scaleZ,.4);assert.equal(settings.pivotX,2);assert.equal(settings.depth,1);
});

test("combined 3D transforms survive save/reload without changing viewport dimensions",()=>{
  const project=createProject("3D stability"),cube=createElement("three-d");const originalSize={width:cube.width,height:cube.height};cube.x+=50;cube.y-=20;cube.threeD={...cube.threeD,positionZ:75,rotationX:37,rotationY:-82,rotationZ:143,scale:1.4,scaleX:.7,scaleY:1.8,scaleZ:2.1,material:"metal",transformSpace:"world"};project.elements=[cube];
  const restored=normalizeProject(structuredClone(project)),saved=restored.elements[0];assert.deepEqual({width:saved.width,height:saved.height},originalSize);assert.deepEqual({x:saved.x,y:saved.y,z:saved.threeD.positionZ},{x:cube.x,y:cube.y,z:75});assert.deepEqual({x:saved.threeD.rotationX,y:saved.threeD.rotationY,z:saved.threeD.rotationZ},{x:37,y:-82,z:143});assert.deepEqual({x:saved.threeD.scaleX,y:saved.threeD.scaleY,z:saved.threeD.scaleZ},{x:.7,y:1.8,z:2.1});assert.equal(saved.threeD.material,"metal");assert.equal(saved.threeD.transformSpace,"world");
});

test("multiple 3D objects never share transform or material state",()=>{
  const first=createElement("three-d"),second=createElement("three-d",1);first.threeD={...first.threeD,rotationY:90,material:"chrome"};assert.notEqual(first.threeD,second.threeD);assert.equal(second.threeD.rotationY,24);assert.equal(second.threeD.material,"plastic");assert.notEqual(threeDGeometryKey({...first.threeD,primitive:"plane"}),threeDGeometryKey(first.threeD));
});

test("projected 3D bounds remain finite and clipped to the viewport",()=>{
  assert.deepEqual(projectedBoundsFromPoints([{x:-.5,y:.5},{x:.75,y:-.25}],320,200),{left:80,top:50,width:200,height:75});const fallback=projectedBoundsFromPoints([{x:Number.NaN,y:0}],320,200);assert.ok(Number.isFinite(fallback.left)&&Number.isFinite(fallback.width));
});

test("stable renderer lifecycle updates one scene and recovers WebGL context loss",async()=>{
  const surface=await readFile(new URL("../components/editor/ThreeDObjectSurface.tsx",import.meta.url),"utf8"),canvas=await readFile(new URL("../components/editor/CanvasStage.tsx",import.meta.url),"utf8");assert.match(surface,/\[element\.id\]/);assert.doesNotMatch(surface,/forceContextLoss/);assert.match(surface,/webglcontextlost/);assert.match(surface,/webglcontextrestored/);assert.match(surface,/ResizeObserver/);assert.match(surface,/threeDGeometryKey/);assert.match(surface,/requestAnimationFrame/);assert.match(surface,/three-d-projected-bounds/);for(const shortcut of ['"w"','"e"','"r"','"q"'])assert.match(canvas,new RegExp(shortcut));assert.match(canvas,/startThreeDGizmo/);assert.match(canvas,/gizmoSpace/);
});

test("3D export remains an honest editable-source ImageLabel fallback",()=>{
  const cube=createElement("three-d");cube.robloxExportMode=null;const decision=classifyRobloxElement(cube);assert.equal(decision.intendedRobloxClass,"ImageLabel");assert.equal(decision.classification,"RASTERIZED");assert.match(decision.reasons.join(" "),/editable GPU 3D/);
});
