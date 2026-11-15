import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject, exportProjectData, importProjectData } from "../lib/editor/project.ts";
import { resolveResponsivePreview } from "../lib/editor/responsive-preview.ts";
import { createRobloxExport, verifyGeneratedLua } from "../lib/roblox/exporter.ts";
import { studioSelectionToProject, studioSourceExportOptions } from "../lib/roblox/studio-selection.ts";
import { createStudioTransferFile } from "../lib/roblox/studio-transfer.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const udim2 = (xScale,xOffset,yScale,yOffset) => ({kind:"UDim2",xScale,xOffset,yScale,yOffset});
const enumeration = (enumType,item) => ({kind:"Enum",enumType,item});
const options = {...DEFAULT_ROBLOX_EXPORT_OPTIONS, visualMode:"NATIVE", sizingMode:"OFFSET"};
const screenSource = {
  format:"creatormake-studio-selection",formatVersion:1,name:"Studio Menu",
  resolution:{width:960,height:600},warnings:["The original gameplay script stays in Studio."],
  settings:{Enabled:false, DisplayOrder:6, ZIndexBehavior:enumeration("ZIndexBehavior","Sibling"),
    ScreenInsets:enumeration("ScreenInsets","CoreUISafeInsets"), ClipToDeviceSafeArea:true},
  nodes:[
    {sourceId:"panel",parentSourceId:null,name:"Panel",className:"CanvasGroup",
      properties:{Position:udim2(.5,20,.5,8),Size:udim2(.5,12,.4,-10),AnchorPoint:{kind:"Vector2",x:.5,y:.5},
        GroupTransparency:.2,Source:"never allowed"},attributes:{DesignedInStudio:true},
      decorators:[{className:"UIGradient",name:"Accent",properties:{Transparency:{kind:"NumberSequence",keypoints:[
        {time:0,value:.1,envelope:0},{time:1,value:.7,envelope:0.1},
      ]}}}]},
    {sourceId:"label",parentSourceId:"panel",name:"Title",className:"TextLabel",
      properties:{Position:udim2(.25,3,0,10),Size:udim2(.6,5,0,28),Text:"(",TextSize:14,TextScaled:false,
        BackgroundTransparency:1,TextTransparency:0,
        FontFace:{kind:"Font",family:"rbxassetid://12345",style:"Normal",weight:"Bold"}},
      decorators:[]},
  ],
};

test("Studio selection preserves native properties across a project save and an editable export",async()=>{
  const project=await importProjectData(screenSource);
  assert.equal(project.elements[1].opacity,100);
  assert.equal(project.elements[1].fill,"transparent");
  assert.equal(project.elements[1].parentId,"panel");
  assert.equal(project.studioSource.warnings.length,2);
  const reloaded=await importProjectData(exportProjectData(project));
  reloaded.elements[1].text="Edited in CreatorMake";
  const output=createRobloxExport(reloaded,{...options,...studioSourceExportOptions(reloaded)});
  const [panel,text]=output.manifest.nodes;
  assert.equal(panel.className,"CanvasGroup");
  assert.deepEqual(panel.properties.Position,screenSource.nodes[0].properties.Position);
  assert.deepEqual(panel.properties.Size,screenSource.nodes[0].properties.Size);
  assert.equal(panel.properties.GroupTransparency,.2);
  assert.equal(panel.attributes.DesignedInStudio,true);
  assert.equal(panel.properties.Source,undefined);
  assert.deepEqual(panel.decorators,screenSource.nodes[0].decorators);
  assert.equal(text.parentSourceId,"panel");
  assert.deepEqual(text.properties.FontFace, {...screenSource.nodes[1].properties.FontFace,enumName:""});
  assert.equal(text.properties.Text,"Edited in CreatorMake");
  assert.equal(output.manifest.screenGuiSettings.enabled,false);
  assert.equal(output.manifest.screenGuiSettings.displayOrder,6);
  assert.equal(output.manifest.screenGuiSafeArea.ScreenInsets.item,"CoreUISafeInsets");
  assert.equal(verifyGeneratedLua(output.lua).valid,true);
});

test("nested Scale and Offset survive resizing, including a non-zero anchor",()=>{
  const project=studioSelectionToProject(screenSource);
  const preview=resolveResponsivePreview(project,520,420);
  const [panel,label]=preview.elements;
  assert.equal(panel.width,272);
  assert.equal(panel.height,158);
  assert.equal(panel.x,144);
  assert.equal(label.width,.6*272+5);
  assert.equal(label.x,144+.25*272+3);
  assert.equal(project.screen.width,960);
});

test("large Lua exports scope their locals and preserve punctuation in strings",()=>{
  const project=createProject();
  project.elements=Array.from({length:320},(_,i)=>({...createElement("frame",i),id:"row-"+i,name:"row ("+i}));
  project.elements[0].name="undefined (\x01) café";
  const result=createRobloxExport(project,options);
  assert.match(result.lua,/instances\[320\] = /);
  assert.match(result.lua,/undefined \(\\001\) café/);
  assert.equal(verifyGeneratedLua(result.lua).valid,true);
  assert.ok(result.lua.lastIndexOf("screenGui.Parent = StarterGui")>result.lua.indexOf("instances[320]"));
});

test("native export retains hidden Studio objects and keeps older orphaned layers",()=>{
  const project=studioSelectionToProject(screenSource);
  project.elements[0].hidden=true;
  const orphan={...createElement("frame"),parentId:"removed-frame"};
  project.elements.push(orphan);
  const output=createRobloxExport(project,options);
  assert.equal(output.manifest.nodes.find((node)=>node.sourceId==="panel").properties.Visible,false);
  assert.equal(output.manifest.nodes.find((node)=>node.sourceId==="label").parentSourceId,"panel");
  assert.equal(output.manifest.nodes.find((node)=>node.sourceId===orphan.id).parentSourceId,null);
  assert.equal(orphan.parentId,"removed-frame");
});

test("native gradients retain their endpoints and valid opacity sequences",()=>{
  const project=createProject();
  const frame=createElement("frame");
  frame.gradientType="linear";
  frame.gradientStops=Array.from({length:24},(_,index)=>({id:`stop-${index}`,position:4+index*4,color:"#2255ee",opacity:100-index}));
  project.elements=[frame];
  const gradient=createRobloxExport(project,options).manifest.nodes[0].decorators.find((item)=>item.className==="UIGradient");
  assert.equal(gradient.properties.Color.keypoints.length,20);
  assert.equal(gradient.properties.Color.keypoints[0].time,0);
  assert.equal(gradient.properties.Color.keypoints.at(-1).time,1);
  assert.equal(gradient.properties.Transparency.keypoints.at(-1).value,.23);
});

test("Studio JSON blocks executable and unpublished imports",()=>{
  const project=createProject();
  project.elements=[createElement("button")];
  const manifest=createRobloxExport(project,options).manifest;
  assert.equal(JSON.parse(createStudioTransferFile(manifest)).manifest.projectId,project.id);
  project.elements[0].buttonInteraction.enabled=true;
  assert.throws(()=>createStudioTransferFile(createRobloxExport(project,options).manifest),/includes enabled button scripts/);
  assert.throws(()=>createStudioTransferFile({...manifest,assets:[{sourceId:"custom",visualHash:"png"}]}),/permanent Roblox asset IDs/);
});
