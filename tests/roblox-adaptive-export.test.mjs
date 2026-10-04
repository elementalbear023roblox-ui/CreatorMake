import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";
import { createRobloxExport } from "../lib/roblox/exporter.ts";
import { planPixelAccurateAssets, visualHash } from "../lib/roblox/render-assets.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const fixture=()=>{
  const panel=createElement("frame");Object.assign(panel,{id:"panel",name:"StarPanel",x:180,y:120,width:600,height:360,shadow:"none",geometry:{...panel.geometry,kind:"star"}});
  const button=createElement("button");Object.assign(button,{id:"button",name:"PlayButton",parentId:"panel",x:240,y:390,width:220,height:60,text:"PLAY",fontFamily:"Roboto",autoFit:true,shadow:"none",textShadows:[],geometry:{...button.geometry,kind:"plaque"}});
  const nativeText=createElement("text");Object.assign(nativeText,{id:"native-text",name:"EditableTitle",parentId:"panel",x:240,y:160,width:320,height:54,text:"SHOP",fontFamily:"Roboto",fill:"transparent",borderColor:"transparent",shadow:"none",textShadows:[],clipContent:false,corners:{tl:0,tr:0,br:0,bl:0}});
  const rasterText=createElement("text");Object.assign(rasterText,{id:"raster-text",name:"EffectTitle",parentId:"panel",x:240,y:230,width:320,height:54,text:"LIMITED",fontFamily:"Inter",fill:"transparent",borderColor:"transparent",shadow:"none",textShadows:["0 2px 5px #000000"],clipContent:false,corners:{tl:0,tr:0,br:0,bl:0}});
  return{screen:{width:960,height:600},elements:[panel,button,nativeText,rasterText]};
};
const options={...DEFAULT_ROBLOX_EXPORT_OPTIONS,screenGuiName:"AdaptiveGui",visualMode:"ADAPTIVE"};

test("adaptive classification keeps exact-native layers editable and rasterizes unsupported geometry",()=>{
  const project=fixture(),[panel,button,nativeText,rasterText]=project.elements;
  assert.equal(classifyRobloxElement(panel).classification,"HYBRID");
  assert.equal(classifyRobloxElement(button).classification,"HYBRID");
  assert.equal(classifyRobloxElement(button).rasterPart,"background");
  assert.equal(classifyRobloxElement(nativeText).classification,"NATIVE");
  assert.equal(classifyRobloxElement(rasterText).classification,"NATIVE");
  const assets=planPixelAccurateAssets(project,options);
  assert.deepEqual(assets.map((asset)=>asset.sourceId),["panel","button::background"]);
  assert.equal(assets.find((asset)=>asset.sourceId==="button::background").visualPart,"background");
  const changed=structuredClone(button);changed.text="START";
  assert.equal(visualHash(button,"background"),visualHash(changed,"background"),"editable button copy must not invalidate its background PNG");
  assert.notEqual(visualHash(button,"full"),visualHash(changed,"full"));
});

test("adaptive manifest keeps original local coordinates under one global scale",()=>{
  const project=fixture(),assets=planPixelAccurateAssets(project,options).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${5000+index}`})),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(result.manifest.visualMode,"ADAPTIVE");assert.equal(result.manifest.sizingMode,"OFFSET");assert.equal(result.manifest.viewportScaleMode,"FIT");
  assert.equal(byId.get("panel").className,"Frame");assert.equal(byId.get("panel").properties.BackgroundTransparency,1);assert.equal(byId.get("panel").attributes.CreatorMakeExportClassification,"HYBRID");
  assert.equal(byId.get("panel::visual").className,"ImageLabel");assert.equal(byId.get("panel::visual").parentSourceId,"panel");assert.equal(byId.get("panel::visual").attributes.CreatorMakeSourceId,"panel");
  assert.equal(byId.get("button").className,"ImageButton");assert.equal(byId.get("button").properties.Active,true);assert.equal(byId.get("button").properties.AutoButtonColor,false);
  assert.equal(byId.get("button::background").name,"_Background");assert.equal(byId.get("button::text").className,"TextLabel");assert.equal(byId.get("button::text").properties.Text,"PLAY");assert.equal(byId.get("button::text").properties.TextSize,15);assert.equal(byId.get("button::text").properties.TextScaled,false);assert.deepEqual(byId.get("button::text").properties.Position,{kind:"UDim2",xScale:0,xOffset:12,yScale:0,yOffset:12});assert.deepEqual(byId.get("button::text").properties.Size,{kind:"UDim2",xScale:0,xOffset:196,yScale:0,yOffset:36});assert.equal(byId.get("button::text").decorators.length,0);
  assert.equal(byId.get("native-text").className,"TextLabel");assert.equal(byId.get("native-text").parentSourceId,"panel");
  assert.equal(byId.get("raster-text").className,"TextLabel");assert.equal(byId.get("raster-text").properties.Text,"LIMITED");assert.equal(byId.get("raster-text::pixel-text"),undefined);
  assert.deepEqual(byId.get("button").properties.Position,{kind:"UDim2",xScale:0,xOffset:60,yScale:0,yOffset:270});
  assert.deepEqual(byId.get("button").properties.Size,{kind:"UDim2",xScale:0,xOffset:220,yScale:0,yOffset:60});
  assert.equal(result.manifest.nodes.flatMap((node)=>node.decorators).filter((decorator)=>decorator.className==="UIScale").length,1);
  for(const id of ["panel","button"]){assert.equal(byId.get(id).decorators.filter((item)=>item.className==="UIAspectRatioConstraint").length,1);}
  assert.equal(result.manifest.imageManifest.length,2);const record=result.manifest.imageManifest.find((item)=>item.sourceId==="button::background");
  assert.equal(record.sourceElementId,"button");assert.equal(record.classification,"HYBRID");assert.equal(record.visualPart,"background");assert.equal(record.parentId,"panel");assert.equal(record.intendedRobloxClass,"ImageButton");assert.equal(record.interactionEnabled,true);assert.match(record.assetFilename,/playbutton-background-v[0-9a-f]+\.png/);
  assert.deepEqual(record.sourceDimensions,{width:220,height:60});assert.ok(record.croppedPixelDimensions.width>0);assert.ok(Math.abs(record.aspectRatio-220/60)<1e-7);
  assert.match(result.hierarchy,/StarPanel \[Frame\][\s\S]+_Visual \[ImageLabel\][\s\S]+PlayButton \[ImageButton\][\s\S]+_Background \[ImageLabel\][\s\S]+Text \[TextLabel\]/);
});

test("smart text export keeps exact transparent text native and pixelates visible/custom treatments",()=>{
  const exact=createElement("text");Object.assign(exact,{id:"exact",fontFamily:"Roboto",fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[],clipContent:false,text:"COINS"});
  const plaque=structuredClone(exact);Object.assign(plaque,{id:"plaque",fill:"#ff0055"});
  const custom=structuredClone(exact);Object.assign(custom,{id:"custom",fontFamily:"Inter"});
  assert.equal(classifyRobloxElement(exact).classification,"NATIVE");
  assert.equal(classifyRobloxElement(exact).intendedRobloxClass,"TextLabel");
  assert.equal(classifyRobloxElement(plaque).classification,"HYBRID");
  assert.equal(classifyRobloxElement(custom).classification,"NATIVE");
  custom.dynamicText=true;
  assert.equal(classifyRobloxElement(custom).classification,"NATIVE","dynamic text must remain editable even when its font needs an explicit compatibility substitution");
  const project={screen:{width:960,height:600},elements:[exact],assets:[]},result=createRobloxExport(project,options,[]),node=result.manifest.nodes.find((item)=>item.sourceId==="exact");
  assert.equal(node.className,"TextLabel");assert.equal(node.properties.BackgroundTransparency,1);assert.equal(node.attributes.CreatorMakeFontExact,true);
});

test("image objects require a real Roblox asset ID before adaptive native export",()=>{
  const image=createElement("image");Object.assign(image,{id:"image",shadow:"none"});
  assert.equal(classifyRobloxElement(image).classification,"RASTERIZED");
  image.roblox.imageAssetId="rbxassetid://123456";
  assert.equal(classifyRobloxElement(image).classification,"NATIVE");
  assert.equal(classifyRobloxElement(image).intendedRobloxClass,"ImageLabel");
  const button=createElement("image-button");button.roblox.imageAssetId="rbxassetid://987654";
  assert.equal(classifyRobloxElement(button).intendedRobloxClass,"ImageButton");
});
