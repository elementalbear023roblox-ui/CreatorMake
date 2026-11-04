import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { compileMathExpression, validateMathExpression } from "../lib/editor/math-expression.ts";
import { generateImplicitSurface, generateParametricCurve, generateParametricSurface, generatePolarContour, MATH_SHAPE_PRESETS } from "../lib/editor/mathematical-geometry.ts";
import { DEFAULT_THREE_D_SETTINGS, normalizeThreeDSettings, rawProjectedBoundsFromPoints, threeDGeometryKey } from "../lib/editor/three-d.ts";

test("restricted math expressions support documented operators without JavaScript execution",()=>{
  const expression=compileMathExpression("clamp(sin(u) * 2 + v^2, -3, 3)",["u","v"]);
  assert.ok(Math.abs(expression.evaluate({u:Math.PI/2,v:2})-3)<1e-9);
  assert.equal(validateMathExpression("sqrt(-1)",[],{}).valid,false);
  assert.throws(()=>compileMathExpression("globalThis.alert(1)",[]),/Unsupported character|Unsupported function|not available|Invalid number/);
  assert.throws(()=>compileMathExpression("new Function(1)",[]),/Unsupported function|Variable/);
});

test("parametric surfaces, curves, and polar contours generate finite editable geometry",()=>{
  const math={...DEFAULT_THREE_D_SETTINGS.math,resolutionU:12,resolutionV:8};
  const surface=generateParametricSurface(math);assert.equal(surface.positions.length,(12+1)*(8+1)*3);assert.equal(surface.indices.length,12*8*6);assert.ok(surface.positions.every(Number.isFinite));
  const curve=generateParametricCurve({...math,x:"cos(t)",y:"t / 6",z:"sin(t)",tMin:0,tMax:Math.PI*2});assert.ok(curve.length>20);assert.ok(curve.every((point)=>Object.values(point).every(Number.isFinite)));
  const contour=generatePolarContour({...math,radial:"1 + 0.25 * cos(6 * t)"});assert.ok(contour.length>=48);assert.ok(contour.every((point)=>Number.isFinite(point.x)&&Number.isFinite(point.y)));
  assert.ok(MATH_SHAPE_PRESETS.some((preset)=>preset.id==="mobius"));assert.ok(MATH_SHAPE_PRESETS.some((preset)=>preset.id==="gyroid"));
});

test("implicit equations produce an actual indexed mesh and reject empty volumes",()=>{
  const sphere=generateImplicitSurface({...DEFAULT_THREE_D_SETTINGS.math,f:"x^2 + y^2 + z^2 - 1",implicitResolution:10,implicitBounds:1.3});assert.ok(sphere.positions.length>0);assert.ok(sphere.indices.length>0);assert.ok(sphere.positions.every(Number.isFinite));
  assert.throws(()=>generateImplicitSurface({...DEFAULT_THREE_D_SETTINGS.math,f:"1",implicitResolution:8}),/did not cross/);
});

test("auto-fit settings normalize safely and mathematical definitions affect the geometry cache key",()=>{
  const normalized=normalizeThreeDSettings({fitMode:"EXPAND_BOUNDS",viewportPadding:999,geometryMode:"PARAMETRIC_SURFACE",math:{...DEFAULT_THREE_D_SETTINGS.math,x:"u * 2",resolutionU:500}});assert.equal(normalized.fitMode,"EXPAND_BOUNDS");assert.equal(normalized.viewportPadding,160);assert.equal(normalized.math.resolutionU,128);
  assert.notEqual(threeDGeometryKey(normalized),threeDGeometryKey({...normalized,math:{...normalized.math,x:"u * 3"}}));
  const raw=rawProjectedBoundsFromPoints([{x:-2,y:1.5},{x:2,y:-1.5}],320,200);assert.ok(raw.left<0);assert.ok(raw.right>320);assert.ok(raw.top<0);assert.ok(raw.bottom>200);
});

test("renderer and CSS preserve zero-alpha backgrounds and keep editor overlays out of exports",async()=>{
  const [surface,css,rasterizer]=await Promise.all([readFile(new URL("../components/editor/ThreeDObjectSurface.tsx",import.meta.url),"utf8"),readFile(new URL("../app/globals.css",import.meta.url),"utf8"),readFile(new URL("../lib/editor/canvas-rasterizer.ts",import.meta.url),"utf8")]);
  assert.match(surface,/scene\.background=null/);assert.match(surface,/setClearColor\(0x000000,0\)/);assert.match(surface,/setClearAlpha\(0\)/);assert.match(surface,/FIT_OBJECT/);assert.match(surface,/EXPAND_BOUNDS/);assert.match(surface,/generateImplicitSurface/);
  const rule=css.match(/\.three-d-element-surface\{[^}]+\}/)?.[0]??"";assert.match(rule,/background:transparent!important/);assert.match(rule,/box-shadow:none!important/);assert.doesNotMatch(rule,/radial-gradient/);assert.match(css,/\[data-creatormake-export-element\] \.three-d-badge/);
  assert.match(rasterizer,/source\.dataset\.cssWidth/);assert.match(rasterizer,/context\.clearRect/);
});
