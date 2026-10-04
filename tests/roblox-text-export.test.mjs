import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { classifyTextExport } from "../lib/roblox/classification.ts";
import { createNativeTextLabel, createRobloxExport } from "../lib/roblox/exporter.ts";
import { planPixelAccurateAssets, renderElementSvg, visualHash } from "../lib/roblox/render-assets.ts";
import { diffRobloxManifests } from "../lib/roblox/sync.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const options={...DEFAULT_ROBLOX_EXPORT_OPTIONS,screenGuiName:"TextArchitectureGui",visualMode:"PIXEL_ACCURATE"};
const projectFor=(...elements)=>({id:"text-architecture",name:"Text Architecture",screen:{width:960,height:600},elements,assets:[]});
const mapped=(assets)=>assets.map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${70000+index}`}));

test("case A: Frame Name exports a glyph-free plaque below editable native text",()=>{
  const title=createElement("text");
  Object.assign(title,{id:"frame-name",name:"FrameName",x:85,y:58,width:500,height:100,text:"Frame Name",fontFamily:"Inter",fontSize:42,fontSizeDesign:42,padding:12,textPadding:{top:12,right:12,bottom:12,left:12},fill:"#6d28d9",gradientType:"freeform",shadow:"0 8px 18px 0 rgba(0,0,0,.35)",textShadows:[],geometry:{...title.geometry,kind:"trapezoid",skew:14},rotation:-6});
  assert.equal(classifyTextExport(title).mode,"NATIVE","AUTO keeps normal text runtime-editable even with a declared font mismatch");
  const planned=planPixelAccurateAssets(projectFor(title),options);
  assert.deepEqual(planned.map((asset)=>({sourceId:asset.sourceId,sourceElementId:asset.sourceElementId,part:asset.visualPart})),[{sourceId:"frame-name::background",sourceElementId:"frame-name",part:"background"}]);
  const backgroundSvg=renderElementSvg(title,2,"background");
  assert.ok(!backgroundSvg.includes("Frame Name"),"background render must not contain glyphs");
  const visualBounds={x:-70,y:-12,width:588,height:120},asset={...mapped(planned)[0],visualBounds,bounds:visualBounds};
  const result=createRobloxExport(projectFor(title),options,[asset]),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node])),root=byId.get("frame-name"),background=byId.get("frame-name::background"),text=byId.get("frame-name::text");
  assert.equal(result.manifest.textExportArchitecture,2);
  assert.equal(root.className,"Frame");assert.deepEqual(root.properties.Size,{kind:"UDim2",xScale:0,xOffset:500,yScale:0,yOffset:100});assert.equal(root.properties.Rotation,-6);assert.equal(root.properties.ClipsDescendants,false);
  assert.equal(background.name,"_Background");assert.equal(background.className,"ImageLabel");assert.deepEqual(background.properties.Position,{kind:"UDim2",xScale:0,xOffset:-70,yScale:0,yOffset:-12});assert.deepEqual(background.properties.Size,{kind:"UDim2",xScale:0,xOffset:588,yScale:0,yOffset:120});assert.equal(background.attributes.CreatorMakeRole,"Background");
  assert.equal(text.name,"Text");assert.equal(text.className,"TextLabel");assert.equal(text.properties.Text,"Frame Name");assert.equal(text.properties.Rotation,0);assert.equal(text.properties.Active,false);assert.equal(text.properties.Selectable,false);assert.deepEqual(text.properties.Position,{kind:"UDim2",xScale:0,xOffset:12,yScale:0,yOffset:12});assert.deepEqual(text.properties.Size,{kind:"UDim2",xScale:0,xOffset:476,yScale:0,yOffset:76});assert.equal(text.properties.TextSize,42);assert.equal(text.properties.TextScaled,false);assert.equal(text.attributes.CreatorMakeTextScaleMode,"FIXED_DESIGN_SIZE");assert.equal(text.attributes.CreatorMakeTextBoundsWidth,476);assert.equal(text.attributes.CreatorMakeBackgroundLogicalWidth,500);assert.equal(text.attributes.CreatorMakeRasterScale,Math.round(asset.scale*100)/100);assert.equal(text.decorators.length,0);assert.ok(text.properties.ZIndex>background.properties.ZIndex);assert.equal(text.attributes.CreatorMakeFontExact,false);
  assert.ok(result.compatibility.some((issue)=>issue.elementId==="frame-name"&&issue.feature==="Font"&&issue.message.includes("no exact Roblox native match")));
  assert.match(result.hierarchy,/FrameName \[Frame\][\s\S]+_Background \[ImageLabel\][\s\S]+Text \[TextLabel\]/);
});

test("case B: transparent Coins text exports as a single TextLabel",()=>{
  const coins=createElement("text");Object.assign(coins,{id:"coins",name:"Coins",text:"Coins: 500",fontFamily:"Roboto",fill:"transparent",gradientType:"none",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[]});
  const project=projectFor(coins),planned=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,planned),owned=result.manifest.nodes.filter((node)=>node.sourceId==="coins"||node.parentSourceId==="coins");
  assert.equal(planned.length,0);assert.equal(owned.length,1);assert.equal(owned[0].sourceId,"coins");assert.equal(owned[0].className,"TextLabel");assert.equal(owned[0].properties.Text,"Coins: 500");
  const native=createNativeTextLabel(coins,"parent",5);assert.equal(native.name,"Text");assert.equal(native.className,"TextLabel");assert.equal(native.properties.Text,"Coins: 500");
});

test("CreatorMake design-space font size stays authoritative when auto-fit was requested",()=>{
  const label=createElement("text");Object.assign(label,{id:"fixed-scale",name:"FixedScale",text:"Select a Color",fontFamily:"Roboto",fontSize:28,fontSizeDesign:28,autoFit:true,textSizingMode:"fixed",padding:12,textPadding:{top:12,right:12,bottom:12,left:12},fill:"transparent",gradientType:"none",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[]});
  const native=createNativeTextLabel(label,"parent",5);
  assert.equal(native.properties.TextSize,28);assert.equal(native.properties.TextScaled,false);assert.deepEqual(native.properties.Position,{kind:"UDim2",xScale:0,xOffset:12,yScale:0,yOffset:12});assert.deepEqual(native.properties.Size,{kind:"UDim2",xScale:0,xOffset:216,yScale:0,yOffset:24});assert.equal(native.attributes.CreatorMakeAutoFitRequested,true);assert.equal(native.attributes.CreatorMakeTextScaleMode,"FIXED_DESIGN_SIZE");assert.equal(native.decorators.length,0);
  const result=createRobloxExport(projectFor(label),options,[]),exported=result.manifest.nodes.find((node)=>node.sourceId==="fixed-scale"),viewport=result.manifest.nodes.find((node)=>node.attributes?.CreatorMakeRole==="Viewport");
  assert.equal(exported.properties.TextSize,28);assert.equal(exported.properties.TextScaled,false);assert.equal(exported.decorators.filter((item)=>item.className==="UIPadding").length,1);assert.equal(viewport.decorators.filter((item)=>item.className==="UIScale").length,1);
});

test("responsive text is opt-in and constrained",()=>{
  const label=createElement("text");Object.assign(label,{id:"responsive",name:"Responsive",text:"Responsive",fontFamily:"Roboto",fontSize:36,fontSizeDesign:36,textSizingMode:"responsive",autoFit:true,responsiveMinTextSize:14,responsiveMaxTextSize:40,textPadding:{top:5,right:8,bottom:5,left:8},fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[]});
  const native=createNativeTextLabel(label,"parent",5),constraint=native.decorators.find((item)=>item.className==="UITextSizeConstraint");
  assert.equal(native.properties.TextSize,36);assert.equal(native.properties.TextScaled,true);assert.equal(native.attributes.CreatorMakeTextScaleMode,"RESPONSIVE_CONSTRAINED");assert.deepEqual(constraint.properties,{MinTextSize:14,MaxTextSize:40});
});

test("case C and D: a button plaque stays clickable and text-only changes sync only TextLabel.Text",()=>{
  const play=createElement("button");Object.assign(play,{id:"play-button",name:"PlayButton",x:100,y:200,width:240,height:72,rotation:-4,text:"PLAY",fontFamily:"Roboto",fill:"#0ea5e9",gradientType:"linear",shadow:"0 5px 12px 0 rgba(0,0,0,.3)",textShadows:[]});
  const beforeProject=projectFor(play),beforeAssets=mapped(planPixelAccurateAssets(beforeProject,options)),before=createRobloxExport(beforeProject,options,beforeAssets),byId=new Map(before.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get("play-button").className,"ImageButton");assert.equal(byId.get("play-button").properties.Rotation,-4);assert.equal(byId.get("play-button").properties.Active,true);assert.equal(byId.get("play-button::background").className,"ImageLabel");assert.equal(byId.get("play-button::background").properties.Rotation,0);assert.equal(byId.get("play-button::text").className,"TextLabel");assert.equal(byId.get("play-button::text").properties.Rotation,0);assert.equal(byId.get("play-button::text").properties.Active,false);assert.ok(byId.get("play-button::text").properties.ZIndex>byId.get("play-button::background").properties.ZIndex);
  const shop=structuredClone(play);shop.text="SHOP";const afterProject=projectFor(shop),mappings=Object.fromEntries(beforeAssets.map((asset)=>[`${asset.sourceId}:${asset.visualHash}`,asset.robloxAssetId])),afterAssets=planPixelAccurateAssets(afterProject,options,mappings,beforeAssets).map((asset)=>({...asset,status:"mapped"})),after=createRobloxExport(afterProject,options,afterAssets),operations=diffRobloxManifests(before.manifest,after.manifest),backgroundBefore=beforeAssets.find((asset)=>asset.visualPart==="background"),backgroundAfter=afterAssets.find((asset)=>asset.visualPart==="background");
  assert.equal(backgroundBefore.visualHash,backgroundAfter.visualHash,"text content must not invalidate the plaque raster");assert.equal(visualHash(play,"background"),visualHash(shop,"background"));
  assert.deepEqual(operations,[{type:"update",sourceId:"play-button::text",properties:["Text"]}]);
});

test("nested rotated text and buttons keep one shared transform root in Roblox",()=>{
  const panel=createElement("frame"),button=createElement("button");
  Object.assign(panel,{id:"rotated-panel",name:"RotatedPanel",x:80,y:70,width:520,height:320,rotation:5,fill:"#111827",shadow:"none"});
  Object.assign(button,{id:"nested-button",name:"NestedButton",parentId:panel.id,x:140,y:130,width:220,height:68,rotation:-8,text:"GARAGE",fontFamily:"Roboto",fill:"#16a34a",shadow:"none",textShadows:[]});
  const project=projectFor(panel,button),assets=mapped(planPixelAccurateAssets(project,options)),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get(panel.id).properties.Rotation,5);
  assert.equal(byId.get(button.id).parentSourceId,panel.id);
  assert.equal(byId.get(button.id).properties.Rotation,-8);
  assert.equal(byId.get(`${button.id}::background`).parentSourceId,button.id);
  assert.equal(byId.get(`${button.id}::background`).properties.Rotation,0);
  assert.equal(byId.get(`${button.id}::text`).parentSourceId,button.id);
  assert.equal(byId.get(`${button.id}::text`).properties.Rotation,0);
});

test("garage buttons keep native captions on the exact pixel-visual angle",()=>{
  const specs=[
    ["car-color","Car Color",{skewY:-3.75}],
    ["accessories","Accessories",{geometry:{kind:"custom-path",pathData:"M 0 28 L 100 0 L 100 72 L 0 100 Z"}}],
    ["rim-color","Rim Color",{rotation:-2.25,skewY:-1.5}],
    ["license-plate","License Plate",{rotation:1.125,skewY:2.375}],
    ["plate-design","Plate Design",{geometry:{kind:"custom-path",pathData:"M 0 0 L 100 22 L 100 100 L 0 78 Z"}}],
    ["exit-garage","Exit Garage",{rotation:-1.5,skewY:-2.625,textRotation:.875}],
  ];
  const buttons=specs.map(([id,text,patch],index)=>{const button=createElement("button"),baseGeometry={...button.geometry};Object.assign(button,{id,name:id.replaceAll("-","_"),x:80,y:70+index*90,width:460,height:72,text,fontFamily:"Roboto",fontSize:32,fontSizeDesign:32,fill:index===5?"#b3261e":"#16a34a",borderColor:"#ffffff",borderWidth:3,shadow:"none",textShadows:[],textPadding:{top:12,right:18,bottom:12,left:18},followObjectAngle:true,...patch});if(patch.geometry)button.geometry={...baseGeometry,...patch.geometry,nodes:[],closed:true};return button;});
  const project=projectFor(...buttons),assets=mapped(planPixelAccurateAssets(project,options)),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  for(const button of buttons){
    const root=byId.get(button.id),text=byId.get(`${button.id}::text`),diagnostic=result.textRotationDiagnostics.find((row)=>row.sourceId===button.id);
    assert.equal(root.className,"ImageButton",button.name);assert.equal(text.className,"TextLabel",button.name);assert.equal(text.properties.Active,false);assert.equal(text.properties.Selectable,false);assert.equal(text.properties.TextSize,32);assert.equal(text.properties.TextScaled,false);
    assert.ok(Math.abs(diagnostic.expectedTextVisualRotation)>.1,`${button.name} must have an intentional angled caption`);assert.ok(Math.abs(diagnostic.finalTextVisualRotation-diagnostic.expectedTextVisualRotation)<.011,`${button.name} caption angle must match its pixel visual`);assert.equal(text.attributes.CreatorMakeVisualRotationSource,diagnostic.visualRotationSource);assert.ok(Math.abs(Number(text.properties.Rotation))>.1,`${button.name} TextLabel.Rotation must contain the uninherited visual angle`);
    assert.deepEqual(text.properties.AnchorPoint,{kind:"Vector2",x:.5,y:.5});assert.deepEqual(text.properties.Position,{kind:"UDim2",xScale:0,xOffset:230,yScale:0,yOffset:36});
  }
  assert.match(result.hierarchy,/car_color \[ImageButton\][\s\S]+Text \[TextLabel\]/);assert.match(result.hierarchy,/exit_garage \[ImageButton\][\s\S]+Text \[TextLabel\]/);
});

test("Follow Object Angle can be disabled without moving or resizing native text",()=>{
  const button=createElement("button");Object.assign(button,{id:"manual-caption",name:"ManualCaption",x:100,y:120,width:300,height:80,rotation:-4,skewY:-3,text:"MANUAL",fontFamily:"Roboto",fontSize:30,fontSizeDesign:30,fill:"#16a34a",shadow:"none",textShadows:[],followObjectAngle:false,textRotation:1.25,textPadding:{top:10,right:20,bottom:10,left:20}});
  const project=projectFor(button),result=createRobloxExport(project,options,mapped(planPixelAccurateAssets(project,options))),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node])),text=byId.get("manual-caption::text"),diagnostic=result.textRotationDiagnostics[0];
  assert.equal(byId.get(button.id).properties.Rotation,-4);assert.equal(text.properties.Rotation,5.25);assert.equal(diagnostic.finalTextVisualRotation,1.25);assert.equal(diagnostic.expectedTextVisualRotation,1.25);assert.equal(text.properties.TextSize,30);assert.deepEqual(text.properties.Size,{kind:"UDim2",xScale:0,xOffset:260,yScale:0,yOffset:60});
});

test("legacy PIXEL TEXT preferences are ignored and visible glyphs remain native",()=>{
  const title=createElement("text");Object.assign(title,{id:"pixel-title",name:"PixelTitle",text:"LIMITED",textRobloxExportMode:"PIXEL",fontFamily:"Inter",fill:"#7c3aed",shadow:"none",textShadows:["0 2px 4px #000000"]});
  const assets=planPixelAccurateAssets(projectFor(title),options);
  assert.deepEqual(assets.map((asset)=>[asset.sourceId,asset.visualPart]),[["pixel-title::background","background"]]);
  assert.ok(!renderElementSvg(title,2,"background").includes("LIMITED"));
  const result=createRobloxExport(projectFor(title),options,mapped(assets)),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get("pixel-title").className,"Frame");assert.equal(byId.get("pixel-title::background").attributes.CreatorMakeRole,"Background");assert.equal(byId.get("pixel-title::pixel-text"),undefined);assert.equal(byId.get("pixel-title::text").className,"TextLabel");assert.equal(byId.get("pixel-title::text").properties.Text,"LIMITED");
});

test("mixed Frame, native TextLabel, raster ImageLabel, and text background serialize in parent-first order",()=>{
  const frame=createElement("frame");Object.assign(frame,{id:"mixed-frame",name:"MixedFrame",parentId:null,fill:"#1e293b",gradientType:"none",borderWidth:0,shadow:"none"});
  const nativeText=createElement("text");Object.assign(nativeText,{id:"native-text",name:"NativeText",parentId:frame.id,text:"Coins: 500",fontFamily:"Roboto",fill:"transparent",gradientType:"none",borderWidth:0,shadow:"none",textShadows:[]});
  const rasterImage=createElement("image");Object.assign(rasterImage,{id:"pixel-image",name:"PixelImage",parentId:frame.id,imageUrl:"",fill:"#7c3aed",gradientType:"linear",shadow:"0 4px 8px 0 rgba(0,0,0,.25)"});
  const textWithBackground=createElement("text");Object.assign(textWithBackground,{id:"text-with-background",name:"TextWithBackground",parentId:frame.id,text:"New text",fontFamily:"Roboto",fill:"#0ea5e9",gradientType:"linear",shadow:"0 3px 8px 0 rgba(0,0,0,.3)",textShadows:[]});
  const project=projectFor(frame,nativeText,rasterImage,textWithBackground),assets=mapped(planPixelAccurateAssets(project,options)),result=createRobloxExport(project,options,assets),nodes=result.manifest.nodes,byId=new Map(nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get("mixed-frame").className,"Frame");assert.equal(byId.get("mixed-frame::visual").className,"ImageLabel");
  assert.equal(byId.get("native-text").className,"TextLabel");assert.equal(byId.get("native-text").properties.Text,"Coins: 500");
  assert.equal(byId.get("pixel-image").className,"Frame");assert.equal(byId.get("pixel-image::visual").className,"ImageLabel");
  assert.equal(byId.get("text-with-background").className,"Frame");assert.equal(byId.get("text-with-background::background").className,"ImageLabel");assert.equal(byId.get("text-with-background::text").className,"TextLabel");assert.equal(byId.get("text-with-background::text").properties.Text,"New text");
  const positions=new Map(nodes.map((node,index)=>[node.sourceId,index]));for(const node of nodes){if(node.parentSourceId)assert.ok(positions.get(node.parentSourceId)<positions.get(node.sourceId),`${node.parentSourceId} must precede ${node.sourceId}`);}
  assert.equal(new Set(nodes.map((node)=>node.sourceId)).size,nodes.length);assert.doesNotThrow(()=>JSON.stringify(result.manifest));
});
