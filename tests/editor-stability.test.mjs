import test from "node:test";
import assert from "node:assert/strict";
import { isCreatorMakeAIEnabled } from "../lib/ai/feature.ts";
import { alignSelection, distributeSelection } from "../lib/editor/operations.ts";
import { createElement, createProject, createScrollingInventoryElements, exportProjectData, importProjectData, listProjects, listRecoverySnapshots, loadProject, normalizeProject, saveProject } from "../lib/editor/project.ts";
import { contentClipBounds, contentClipPath } from "../lib/editor/clipping.ts";

test("a new CreatorMake project is genuinely blank",()=>{
  const project=createProject("Blank");
  assert.deepEqual(project.elements,[]);
  assert.deepEqual(project.assets,[]);
  assert.deepEqual(project.selectedIds,[]);
  assert.deepEqual(project.activePresetIds,[]);
  assert.deepEqual(project.projectFonts,[]);
});

test("AI generation feature flag is opt-in", () => {
  const previous=process.env.CREATORMAKE_AI_ENABLED;
  try {
    delete process.env.CREATORMAKE_AI_ENABLED;
    assert.equal(isCreatorMakeAIEnabled(),false);
    process.env.CREATORMAKE_AI_ENABLED="false";
    assert.equal(isCreatorMakeAIEnabled(),false);
    process.env.CREATORMAKE_AI_ENABLED="true";
    assert.equal(isCreatorMakeAIEnabled(),true);
  } finally {
    if(previous===undefined)delete process.env.CREATORMAKE_AI_ENABLED;else process.env.CREATORMAKE_AI_ENABLED=previous;
  }
});

test("key-object alignment keeps the last-selected object stationary", () => {
  const project=createProject("Alignment"),other=createElement("rectangle"),key=createElement("rectangle");
  other.id="other";other.x=240;other.y=180;other.width=90;other.height=60;
  key.id="key";key.x=40;key.y=80;key.width=30;key.height=30;
  project.elements=[key,other];project.selectedIds=[other.id,key.id];
  alignSelection(project,"hcenter","key-object");
  assert.equal(key.x,40);
  assert.equal(other.x,10);
});

test("exact distribution spacing uses deterministic gaps", () => {
  const project=createProject("Spacing"),items=[0,1,2].map((index)=>{const item=createElement("rectangle");item.id=`item-${index}`;item.x=index*100;item.width=20;return item;});
  project.elements=items;project.selectedIds=items.map((item)=>item.id);
  distributeSelection(project,"horizontal",12);
  assert.deepEqual(items.map((item)=>item.x),[0,32,64]);
});

test("scrolling inventory scaffold is semantic and keeps 20 editable buttons",()=>{
  const elements=createScrollingInventoryElements(),scrolling=elements[0],cards=elements.slice(1);
  assert.equal(scrolling.type,"scrolling-frame");
  assert.equal(scrolling.roblox.className,"ScrollingFrame");
  assert.equal(scrolling.layoutMode,"grid");
  assert.equal(cards.length,20);
  assert.ok(cards.every((card)=>card.type==="button"&&card.parentId===scrolling.id));
});

test("legacy projects migrate to the current schema and IndexedDB-compatible saves create recovery snapshots", async() => {
  const project=createProject("Recovery");
  const legacyText=createElement("text");legacyText.fontSize=37;legacyText.fontSizeDesign=37;project.elements=[legacyText];
  const legacy=structuredClone(project);delete legacy.schemaVersion;delete legacy.elements[0].fontSizeDesign;delete legacy.elements[0].textSizingMode;delete legacy.elements[0].responsiveMinTextSize;delete legacy.elements[0].responsiveMaxTextSize;delete legacy.elements[0].textPadding;legacy.elements[0].autoFit=true;
  const normalized=normalizeProject(legacy);
  assert.equal(normalized.schemaVersion,10);
  assert.equal(normalized.elements[0].automaticCanvasSize,"None");
  assert.equal(normalized.elements[0].fontId,"inter");
  assert.equal(normalized.elements[0].fontSizeDesign,37);
  assert.equal(normalized.elements[0].fontSize,37);
  assert.equal(normalized.elements[0].textSizingMode,"fixed");
  assert.equal(normalized.elements[0].autoFit,false);
  assert.deepEqual(normalized.elements[0].textPadding,{top:12,right:12,bottom:12,left:12});
  await saveProject(project);
  project.elements[0].x+=48;project.updatedAt+=1;await saveProject(project);
  assert.equal((await listRecoverySnapshots()).length,1);
  assert.equal((await loadProject(project.id)).elements[0].x,project.elements[0].x);
  const imported=await importProjectData({format:"creatormake-project",formatVersion:1,project:JSON.parse(JSON.stringify(project))});
  assert.equal(imported.schemaVersion,10);
  assert.notEqual(imported.id,project.id);
  assert.equal(imported.elements[0].x,project.elements[0].x);
  const exported=exportProjectData(imported);
  assert.equal(exported.format,"creatormake-project");
  assert.equal(exported.schemaVersion,10);
  assert.equal(exported.project.id,imported.id);
  const summary=(await listProjects()).find((item)=>item.id===imported.id);
  assert.equal(summary.platform,"Roblox");
  assert.ok(summary.thumbnail.startsWith("data:image/svg+xml"));
  await assert.rejects(()=>importProjectData({schemaVersion:999,screen:project.screen,elements:project.elements}),/update CreatorMake/);
});

test("ordinary containers default to unclipped content while scrolling viewports always clip",()=>{
  for(const type of ["frame","container","button","image-button"]){
    assert.equal(createElement(type).clipContent,false,`${type} should not silently clip descendants`);
  }
  assert.equal(createElement("scrolling-frame").clipContent,true);
});

test("schema 10 preserves an explicit Clip Contents choice and migrates legacy implicit clipping off",()=>{
  const legacy=createProject("Legacy clipping"),legacyFrame=createElement("frame");legacy.schemaVersion=9;legacyFrame.clipContent=true;legacy.elements=[legacyFrame];
  assert.equal(normalizeProject(structuredClone(legacy)).elements[0].clipContent,false);
  const current=createProject("Explicit clipping"),currentFrame=createElement("frame");currentFrame.clipContent=true;current.elements=[currentFrame];
  assert.equal(normalizeProject(structuredClone(current)).elements[0].clipContent,true);
});

test("Clip Contents computes the same nested crop used by the editor preview",()=>{
  const outer=createElement("frame"),inner=createElement("container"),child=createElement("button");
  Object.assign(outer,{id:"outer",x:100,y:100,width:200,height:100,clipContent:true});
  Object.assign(inner,{id:"inner",parentId:outer.id,x:80,y:70,width:180,height:100,clipContent:false});
  Object.assign(child,{id:"child",parentId:inner.id,x:80,y:70,width:100,height:60});
  assert.deepEqual(contentClipBounds(child,[outer,inner,child]),{left:100,top:100,right:300,bottom:200});
  assert.equal(contentClipPath(child,[outer,inner,child]),"inset(30px 0px 0px 20px)");
  outer.clipContent=false;
  assert.equal(contentClipBounds(child,[outer,inner,child]),null);
  assert.equal(contentClipPath(child,[outer,inner,child]),undefined);
});
