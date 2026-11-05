import test from "node:test";
import assert from "node:assert/strict";
import { createPixelArtAsset, createRetroAsset, RETRO_LIBRARY } from "../lib/retro/components.ts";
import { createRobloxExport } from "../lib/roblox/exporter.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

test("retro library exposes distinct curated families instead of recolored duplicates",()=>{
  assert.ok(RETRO_LIBRARY.length>=15);
  assert.deepEqual(new Set(RETRO_LIBRARY.map((item)=>item.family)),new Set(["windows","internet","cdrom","arcade","gameshow","horror"]));
  assert.ok(RETRO_LIBRARY.every((item)=>item.description.length>24));
});

test("signature Windows 98 component is a real editable hierarchy",()=>{
  const result=createRetroAsset("window-98-app",0),roles=new Set(result.elements.map((item)=>item.retro?.role));
  assert.ok(result.elements.length>=12);
  for(const role of ["window","titlebar","title","control","menu","content","button","status"])assert.ok(roles.has(role),role);
  assert.ok(result.elements.every((item)=>item.retro?.componentId));
  assert.equal(result.assets.length,0);
});

test("checker frame carries explicit nine-slice data through Roblox export",()=>{
  const result=createRetroAsset("frame-checker",0),frame=result.elements[0];
  assert.deepEqual(frame.sliceCenter,{left:16,top:16,right:48,bottom:48});
  assert.equal(result.assets[0].format,"SVG");
  frame.roblox={className:"ImageLabel",imageAssetId:"rbxassetid://123456"};
  const exported=createRobloxExport({screen:{width:960,height:600},elements:[frame]},{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"RetroSliceGui"});
  const node=exported.manifest.nodes.find((item)=>item.sourceId===frame.id);
  assert.deepEqual(node.properties.ScaleType,{kind:"Enum",enumType:"ScaleType",item:"Slice"});
  assert.deepEqual(node.properties.SliceCenter,{kind:"Rect",minX:16,minY:16,maxX:48,maxY:48});
});

test("three required templates are intentionally different and remain editable",()=>{
  const windows=createRetroAsset("template-windows98",0),cdrom=createRetroAsset("template-cdrom",0),show=createRetroAsset("template-creator-time",0);
  assert.ok(windows.elements.length>=20);assert.ok(cdrom.elements.length>=10);assert.ok(show.elements.length>=12);
  assert.equal(windows.background,"#008080");assert.equal(cdrom.background,"#08132f");assert.equal(show.background,"#250b59");
  assert.notEqual(windows.elements[0].geometry.kind,cdrom.elements.find((item)=>item.retro?.role==="window")?.geometry.kind);
  assert.ok(show.elements.some((item)=>item.name==="Large Custom Close"));
  assert.ok([windows,cdrom,show].every((result)=>result.elements.every((item)=>item.id&&item.name&&item.retro)));
});

test("Pixel Studio output is transparent, crisp, reusable, and editable",()=>{
  const pixels=Array(256).fill("transparent");pixels[0]="#fff05a";pixels[17]="#ff4c9b";
  const result=createPixelArtAsset("Test Icon",pixels,16,0),element=result.elements[0],asset=result.assets[0];
  assert.equal(element.retro.kind,"pixel-art");assert.equal(element.imageFit,"stretch");assert.equal(asset.format,"SVG");
  assert.match(asset.dataUrl,/shape-rendering%3D%22crispEdges%22/);assert.match(decodeURIComponent(asset.dataUrl),/<rect x="0" y="0"/);assert.equal(decodeURIComponent(asset.dataUrl).includes("transparent"),false);
});
