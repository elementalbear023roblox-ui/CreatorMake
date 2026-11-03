import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement, createProject } from "../lib/editor/project.ts";
import { diagnoseResponsivePreview, resolveResponsivePreview } from "../lib/editor/responsive-preview.ts";
import { ROBLOX_COMPONENTS, ROBLOX_ELEMENTS, createRobloxComponent, createRobloxElement } from "../lib/roblox/component-library.ts";

test("Roblox library inserts real editable objects instead of placeholder tabs",async()=>{
  assert.equal(ROBLOX_ELEMENTS.length,11);
  assert.ok(ROBLOX_COMPONENTS.length>=9);
  for(const definition of ROBLOX_ELEMENTS){const items=createRobloxElement(definition.kind,1);assert.equal(items.length,1);assert.ok(items[0].id);assert.ok(Number.isFinite(items[0].x));}
  for(const definition of ROBLOX_COMPONENTS){const items=createRobloxComponent(definition.kind,2),ids=new Set(items.map((item)=>item.id));assert.equal(ids.size,items.length,`${definition.name} ids must be unique`);assert.ok(items.every((item)=>Number.isFinite(item.x)&&Number.isFinite(item.y)&&item.width>0&&item.height>0));assert.ok(items.every((item)=>!item.parentId||ids.has(item.parentId)),`${definition.name} hierarchy must remain self-contained`);}
  const panel=await readFile(new URL("../components/editor/LayersPanel.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(panel,/Available in a later CreatorMake phase/);
  assert.match(panel,/RobloxLibraryPanel/);
});

test("responsive preview applies the same constraints recursively without mutating the project",()=>{
  const project=createProject("Responsive Test"),panel=createElement("frame"),button=createElement("button");
  Object.assign(panel,{id:"panel",x:330,y:210,width:300,height:180,constraints:{horizontal:"center",vertical:"center"}});
  Object.assign(button,{id:"button",parentId:"panel",x:540,y:330,width:70,height:34,constraints:{horizontal:"right",vertical:"bottom"}});
  project.elements=[panel,button];
  const preview=resolveResponsivePreview(project,390,844),nextPanel=preview.elements[0],nextButton=preview.elements[1];
  assert.equal(nextPanel.x,45);
  assert.equal(nextPanel.y,332);
  assert.equal(nextButton.x,nextPanel.x+210);
  assert.equal(nextButton.y,nextPanel.y+120);
  assert.equal(project.elements[0].x,330,"preview must never alter saved geometry");
  assert.ok(diagnoseResponsivePreview(preview).some((issue)=>issue.kind==="small-target"));
  const menuProject=createProject("Menu Preview");menuProject.elements=createRobloxComponent("main-menu",0);const phoneMenu=resolveResponsivePreview(menuProject,390,844);
  assert.deepEqual(diagnoseResponsivePreview(phoneMenu),[],"the built-in main menu should fit the phone preview without false overflow warnings");
});

test("the Roblox-first workflow defaults to Simple properties and exposes real preview diagnostics",async()=>{
  const settings=await readFile(new URL("../hooks/use-interface-settings.ts",import.meta.url),"utf8"),inspector=await readFile(new URL("../components/editor/Inspector.tsx",import.meta.url),"utf8"),editor=await readFile(new URL("../components/editor/CreatorMakeEditor.tsx",import.meta.url),"utf8"),toolbar=await readFile(new URL("../components/editor/TopToolbar.tsx",import.meta.url),"utf8");
  assert.match(settings,/workspaceMode: "roblox"/);
  assert.match(settings,/inspectorMode: "basic"/);
  assert.match(inspector,/>Simple<\/button>/);
  assert.match(inspector,/>Advanced<\/button>/);
  assert.match(inspector,/Make Responsive/);
  assert.match(editor,/diagnoseResponsivePreview/);
  assert.match(editor,/Export to Roblox/);
  assert.match(toolbar,/Export to Roblox/);
});
