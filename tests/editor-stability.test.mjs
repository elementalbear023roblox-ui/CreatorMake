import test from "node:test";
import assert from "node:assert/strict";
import { isCreatorMakeAIEnabled } from "../lib/ai/feature.ts";
import { alignSelection, distributeSelection } from "../lib/editor/operations.ts";
import { createElement, createProject, createScrollingInventoryElements, exportProjectData, importProjectData, listProjects, listRecoverySnapshots, loadProject, normalizeProject, saveProject } from "../lib/editor/project.ts";

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
  project.elements=[createElement("frame")];
  const legacy=structuredClone(project);delete legacy.schemaVersion;
  const normalized=normalizeProject(legacy);
  assert.equal(normalized.schemaVersion,7);
  assert.equal(normalized.elements[0].automaticCanvasSize,"None");
  assert.equal(normalized.elements[0].fontId,"inter");
  await saveProject(project);
  project.elements[0].x+=48;project.updatedAt+=1;await saveProject(project);
  assert.equal((await listRecoverySnapshots()).length,1);
  assert.equal((await loadProject(project.id)).elements[0].x,project.elements[0].x);
  const imported=await importProjectData({format:"creatormake-project",formatVersion:1,project:JSON.parse(JSON.stringify(project))});
  assert.equal(imported.schemaVersion,7);
  assert.notEqual(imported.id,project.id);
  assert.equal(imported.elements[0].x,project.elements[0].x);
  const exported=exportProjectData(imported);
  assert.equal(exported.format,"creatormake-project");
  assert.equal(exported.schemaVersion,7);
  assert.equal(exported.project.id,imported.id);
  const summary=(await listProjects()).find((item)=>item.id===imported.id);
  assert.equal(summary.platform,"Roblox");
  assert.ok(summary.thumbnail.startsWith("data:image/svg+xml"));
  await assert.rejects(()=>importProjectData({schemaVersion:999,screen:project.screen,elements:project.elements}),/update CreatorMake/);
});
