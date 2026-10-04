import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { calculateCreatorMakeFitScale, createRobloxExport, createTextScaleDiagnostics } from "../lib/roblox/exporter.ts";
import { planPixelAccurateAssets } from "../lib/roblox/render-assets.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const setText=(element,patch)=>Object.assign(element,patch,{fontSizeDesign:patch.fontSize,fontSize:patch.fontSize,textSizingMode:"fixed",autoFit:false,responsiveMaxTextSize:patch.fontSize});
const fixture=()=>{
  const project=createProject("Garage Text Scaling Regression");project.id="garage-text-scaling";project.screen={...project.screen,width:1920,height:1080};
  const carName=setText(createElement("text"),{id:"car-name",name:"Car Name",x:60,y:35,width:920,height:90,text:"Car Name",fontFamily:"Roboto",fontSize:54,fontWeight:700,fill:"#111827",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[],textPadding:{top:12,right:22,bottom:12,left:22}});
  const selectColor=setText(createElement("text"),{id:"select-color",name:"Select a Color",x:145,y:190,width:500,height:100,text:"Select a Color",fontFamily:"Roboto",fontSize:52,fontWeight:500,fill:"#171717",borderColor:"#ffffff",borderWidth:3,shadow:"none",textShadows:[],textPadding:{top:15,right:20,bottom:15,left:20},geometry:{...createElement("text").geometry,kind:"plaque"}});
  const premium=setText(createElement("text"),{id:"premium-colors",name:"Premium Colors",x:190,y:305,width:360,height:46,text:"PREMIUM COLORS",fontFamily:"Roboto",fontSize:28,fontWeight:500,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[],textPadding:{top:0,right:0,bottom:0,left:0},textAlign:"center"});
  const regular=setText(createElement("text"),{id:"regular-colors",name:"Regular Colors",x:190,y:545,width:360,height:46,text:"REGULAR COLORS",fontFamily:"Roboto",fontSize:28,fontWeight:500,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[],textPadding:{top:0,right:0,bottom:0,left:0},textAlign:"center"});
  const play=setText(createElement("button"),{id:"exit-garage",name:"Exit Garage",x:1450,y:900,width:300,height:80,text:"Exit Garage",fontFamily:"Roboto",fontSize:36,fontWeight:700,fill:"#b3261e",borderColor:"#ffffff",borderWidth:3,shadow:"none",textShadows:[],textPadding:{top:12,right:18,bottom:12,left:18},geometry:{...createElement("button").geometry,kind:"plaque"}});
  const input=setText(createElement("text"),{id:"garage-input",name:"Garage Input",x:1050,y:35,width:420,height:72,text:"Search cars",fontFamily:"Roboto",fontSize:30,fontWeight:400,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[],textPadding:{top:10,right:16,bottom:10,left:16},textInput:true});
  project.elements=[carName,selectColor,premium,regular,play,input];return normalizeProject(project);
};
const options={...DEFAULT_ROBLOX_EXPORT_OPTIONS,screenGuiName:"GarageTextScaling",visualMode:"ADAPTIVE",renderScale:2};
const mapped=(assets)=>assets.map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${88000+index}`}));

test("garage fixture exports fixed design-space TextSize and exact local content bounds",()=>{
  const project=fixture(),assets=mapped(planPixelAccurateAssets(project,options)),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  const viewport=byId.get("__creatormake_viewport"),allScales=result.manifest.nodes.flatMap((node)=>node.decorators.map((decorator)=>({node,decorator}))).filter(({decorator})=>decorator.className==="UIScale");
  assert.equal(allScales.length,1);assert.equal(allScales[0].node.sourceId,"__creatormake_viewport");assert.equal(allScales[0].decorator.name,"CreatorMakeGlobalScale");assert.equal(viewport.attributes.CreatorMakeDeviceScaleOwner,"CreatorMakeGlobalScale");

  const select=byId.get("select-color::text");assert.equal(select.properties.TextSize,52);assert.equal(select.properties.TextScaled,false);assert.deepEqual(select.properties.Position,{kind:"UDim2",xScale:0,xOffset:20,yScale:0,yOffset:15});assert.deepEqual(select.properties.Size,{kind:"UDim2",xScale:0,xOffset:460,yScale:0,yOffset:70});assert.equal(select.attributes.CreatorMakeTextBoundsWidth,460);assert.equal(select.attributes.CreatorMakeTextBoundsHeight,70);assert.equal(select.attributes.CreatorMakeBackgroundLogicalWidth,500);assert.equal(select.attributes.CreatorMakeBackgroundLogicalHeight,100);assert.equal(select.decorators.some((item)=>item.className==="UITextSizeConstraint"),false);
  const play=byId.get("exit-garage::text");assert.equal(play.properties.Text,"Exit Garage");assert.equal(play.properties.TextSize,36);assert.equal(play.properties.TextScaled,false);assert.equal(play.properties.Active,false);assert.equal(play.properties.Selectable,false);assert.deepEqual(play.properties.Size,{kind:"UDim2",xScale:0,xOffset:264,yScale:0,yOffset:56});assert.equal(byId.get("exit-garage").className,"ImageButton");
  for(const [id,size,text] of [["car-name::text",54,"Car Name"],["premium-colors",28,"PREMIUM COLORS"],["regular-colors",28,"REGULAR COLORS"],["garage-input",30,"Search cars"]]){const node=byId.get(id);assert.equal(node.properties.Text,text);assert.equal(node.properties.TextSize,size);assert.equal(node.properties.TextScaled,false);assert.equal(node.attributes.CreatorMakeTextScaleMode,"FIXED_DESIGN_SIZE");assert.equal(node.decorators.some((item)=>item.className==="UITextSizeConstraint"),false);}
  assert.equal(byId.get("garage-input").className,"TextBox");assert.equal(byId.get("garage-input").properties.TextSize,30);
});

test("text/background proportions stay invariant across the complete viewport matrix",()=>{
  const project=fixture(),result=createRobloxExport(project,options,mapped(planPixelAccurateAssets(project,options))),matrix=[[1920,1080],[1366,768],[1280,720],[2560,1440],[3840,2160],[390,844],[844,390],[1024,768],[3440,1440]];
  for(const [width,height] of matrix){
    const diagnostics=createTextScaleDiagnostics(project,result.manifest.nodes,width,height),expectedScale=calculateCreatorMakeFitScale(1920,1080,width,height),select=diagnostics.find((row)=>row.sourceId==="select-color"),play=diagnostics.find((row)=>row.sourceId==="exit-garage");
    assert.ok(select,`Select a Color diagnostic missing at ${width}x${height}`);assert.ok(play,`PLAY diagnostic missing at ${width}x${height}`);
    assert.equal(select.creatorMakeTextSize,52);assert.equal(select.exportedRobloxTextSize,52);assert.equal(select.textScaled,false);assert.ok(Math.abs(select.rootScale-expectedScale)<1e-12);assert.ok(Math.abs(select.finalVisualTextSize-52*expectedScale)<1e-9);assert.ok(Math.abs(select.backgroundBounds.visualHeight-100*expectedScale)<1e-9);assert.ok(Math.abs(select.textBounds.visualHeight-70*expectedScale)<1e-9);assert.ok(Math.abs(select.finalVisualTextSize/select.backgroundBounds.visualHeight-.52)<1e-12);assert.ok(Math.abs(select.textToBackgroundHeightRatio-.7)<1e-12);
    assert.ok(Math.abs(play.finalVisualTextSize/play.backgroundBounds.visualHeight-.45)<1e-12);assert.ok(Math.abs(play.textToBackgroundHeightRatio-.7)<1e-12);
  }
});

test("canvas zoom and raster resolution never change native TextSize",()=>{
  const base=fixture(),zoomed=structuredClone(base);zoomed.canvasZoom=4;
  for(const renderScale of [1,2,3,4]){const exportOptions={...options,renderScale},assets=mapped(planPixelAccurateAssets(zoomed,exportOptions)),result=createRobloxExport(zoomed,exportOptions,assets),select=result.manifest.nodes.find((node)=>node.sourceId==="select-color::text");assert.equal(select.properties.TextSize,52);assert.equal(select.attributes.CreatorMakeExportedRobloxTextSize,52);assert.deepEqual(select.properties.Size,{kind:"UDim2",xScale:0,xOffset:460,yScale:0,yOffset:70});}
});

test("garage text backgrounds and native labels inherit one shared object scale",()=>{
  const project=fixture(),scale=1.65,regressionIds=["car-name","select-color","premium-colors","regular-colors","exit-garage"];
  for(const element of project.elements){if(regressionIds.includes(element.id))Object.assign(element,{scaleX:scale,scaleY:scale,originX:50,originY:50});}
  const unscaled=fixture(),unscaledPlans=planPixelAccurateAssets(unscaled,options),scaledPlans=planPixelAccurateAssets(project,options);
  for(const id of ["select-color","exit-garage"]){
    const before=unscaledPlans.find((asset)=>asset.sourceElementId===id&&asset.visualPart==="background"),after=scaledPlans.find((asset)=>asset.sourceElementId===id&&asset.visualPart==="background");
    assert.deepEqual(after.visualBounds,before.visualBounds,`${id} background must not bake the shared object scale into its PNG bounds`);
  }
  const result=createRobloxExport(project,options,mapped(scaledPlans)),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node])),diagnostics=createTextScaleDiagnostics(project,result.manifest.nodes,1920,1080);
  for(const id of regressionIds){
    const root=byId.get(id),text=byId.get(`${id}::text`)??root,objectScales=root.decorators.filter((decorator)=>decorator.className==="UIScale"&&decorator.name==="CreatorMakeObjectScale");
    assert.equal(objectScales.length,1,`${id} must own one shared object UIScale`);assert.equal(objectScales[0].properties.Scale,scale);assert.equal(text.properties.TextSize,project.elements.find((element)=>element.id===id).fontSizeDesign);assert.equal(text.properties.TextScaled,false);if(text!==root){assert.equal(text.decorators.some((decorator)=>decorator.className==="UIScale"),false);assert.equal(text.parentSourceId,id);}
    const diagnostic=diagnostics.find((row)=>row.sourceId===id);assert.equal(diagnostic.objectScale,scale);assert.equal(diagnostic.parentUIScales.filter((item)=>item.name==="CreatorMakeObjectScale").length,1);assert.equal(diagnostic.parentUIScales.filter((item)=>item.name==="CreatorMakeGlobalScale").length,1);assert.ok(Math.abs(diagnostic.finalVisualTextSize-diagnostic.creatorMakeTextSize*scale)<1e-9);
  }
});
