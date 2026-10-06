import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";
import { createRobloxExport } from "../lib/roblox/exporter.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";
import { stackSelection } from "../lib/editor/operations.ts";
import { normalizeSvgPathData } from "../lib/editor/assets.ts";

test("schema 8 migrates image states and asset favorites without losing source bytes",()=>{
  const project=createProject("Images"),element=createElement("image");
  delete element.imageStateAssetIds;delete element.imagePreviewState;delete element.sliceScale;
  project.elements=[element];project.assets=[{id:"asset",name:"Logo",originalName:"logo.png",kind:"image",folder:"",mimeType:"image/png",format:"PNG",width:64,height:64,fileSize:10,contentHash:"abc",dataUrl:"data:image/png;base64,AA==",thumbnailDataUrl:"",createdAt:1,animated:false,warning:null}];
  const normalized=normalizeProject(project);
  assert.equal(normalized.schemaVersion,14);assert.equal(normalized.assets[0].favorite,false);assert.equal(normalized.assets[0].dataUrl,"data:image/png;base64,AA==");
  assert.deepEqual(normalized.elements[0].imageStateAssetIds,{default:null,hover:null,pressed:null,disabled:null,selected:null});assert.equal(normalized.elements[0].sliceScale,1);
});

test("image fills force pixel-accurate Roblox classification",()=>{
  const shape=createElement("rectangle");shape.imageAssetId="asset";
  const decision=classifyRobloxElement(shape);
  assert.equal(decision.classification,"RASTERIZED");assert.ok(decision.reasons.includes("image fill"));
});

test("native image export emits Roblox Rect-based 9-slice properties",()=>{
  const project=createProject("Slice"),image=createElement("image");image.roblox={className:"ImageLabel",imageAssetId:"rbxassetid://123456"};image.sliceCenter={left:12,top:14,right:52,bottom:54};image.sliceScale=1.5;project.elements=[image];project.selectedIds=[image.id];
  const result=createRobloxExport(project,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE"});
  assert.match(result.lua,/ScaleType\.Slice/);assert.match(result.lua,/Rect\.new\(12, 14, 52, 54\)/);assert.match(result.lua,/SliceScale = 1\.5/);
});

test("exact stack preserves the active key object",()=>{
  const project=createProject("Stack"),a=createElement("rectangle"),b=createElement("rectangle"),c=createElement("rectangle");Object.assign(a,{id:"a",x:0,y:0,width:20,height:20});Object.assign(b,{id:"b",x:100,y:100,width:30,height:30});Object.assign(c,{id:"c",x:200,y:200,width:40,height:40});project.elements=[a,b,c];project.selectedIds=["a","c","b"];
  stackSelection(project,"vertical",16,"start");
  assert.equal(b.y,100);assert.equal(b.x,100);assert.equal(c.y,146);assert.equal(a.y,64);assert.equal(a.x,100);
});

test("single-path SVG geometry converts to the editor's normalized 0-100 path space",()=>{
  assert.equal(normalizeSvgPathData("M 10 20 L 60 70 Z",{x:10,y:20,width:50,height:50}),"M 0 0 L 100 100 Z");
  assert.equal(normalizeSvgPathData("M0 0 C 5 10 15 20 20 20",{x:0,y:0,width:20,height:20}),"M 0 0 C 25 50 75 100 100 100");
});
