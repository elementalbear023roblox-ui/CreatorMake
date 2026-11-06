import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRetroAsset,RETRO_LIBRARY} from "../lib/retro/components.ts";
import {WINDOWS98_CLASSIC,preferredMessageBoxSize} from "../lib/retro/windows98-design.ts";
import {createProject} from "../lib/editor/project.ts";
import {resizeElementWithConstraints} from "../lib/editor/transforms.ts";
import {placeRetroComponent} from "../lib/retro/placement.ts";

test("corrected CreatorMake warning dialog uses measured Windows 98 geometry",()=>{
  const result=createRetroAsset("window-95-dialog",0),root=result.elements.find((item)=>item.id===result.rootId),icon=result.elements.find((item)=>item.retro?.layoutRole==="dialog-icon"&&item.type==="vector"),message=result.elements.find((item)=>item.retro?.layoutRole==="dialog-message"),buttons=result.elements.filter((item)=>item.retro?.layoutRole==="action"),title=result.elements.find((item)=>item.name==="Dialog Title Bar");
  assert.ok(root&&icon&&message&&title);assert.equal(root.retro.kind,"dialog");assert.equal(root.retro.authenticity,"historical");assert.equal(root.retro.borderPrimitive,"window");
  assert.ok(root.width<400&&root.height<160,`${root.width}x${root.height}`);assert.equal(icon.width,32);assert.equal(icon.height,32);assert.equal(title.height,18);
  assert.equal(message.fontFamily,"MS Sans Serif");assert.equal(message.fontSize,11);assert.equal(message.fontWeight,400);
  assert.equal(message.textRobloxExportMode,"PIXEL_ACCURATE");
  assert.deepEqual(buttons.map((item)=>[item.width,item.height]),[[75,23],[75,23],[75,23]]);assert.equal(buttons[0].retro.borderPrimitive,"default-button");
  assert.deepEqual(buttons.map((item)=>item.text),["Yes","No","Details..."]);assert.equal(message.text,"This interface contains dangerously high levels of nostalgia. Continue?");
});

test("strict Windows 98 presets do not leak modern type or oversized web buttons",()=>{
  const window=createRetroAsset("window-98-app",0),template=createRetroAsset("template-windows98",0),button=createRetroAsset("button-win98",0),all=[...window.elements,...template.elements];
  assert.ok(all.filter((item)=>item.type==="text"||item.type==="button").every((item)=>item.fontFamily==="MS Sans Serif"));
  assert.ok(all.filter((item)=>item.type==="text"||item.type==="button").every((item)=>item.textRobloxExportMode==="PIXEL_ACCURATE"));
  const root=button.elements.find((item)=>item.id===button.rootId);assert.ok(root);assert.deepEqual([root.width,root.height],[75,23]);assert.equal(root.retro.borderPrimitive,"default-button");
});

test("message box sizing grows from content and actions instead of arbitrary offsets",()=>{
  const short=preferredMessageBoxSize("Continue?",1),long=preferredMessageBoxSize("This is a substantially longer message that needs enough measured room to wrap without creating a giant empty dialog.",3);
  assert.ok(long.width>short.width);assert.ok(long.height>=short.height);assert.ok(short.width>=300);assert.ok(long.width<=566);
});

test("Explorer and Properties are structured editable applications",()=>{
  const explorer=createRetroAsset("window-98-explorer",0),properties=createRetroAsset("window-98-properties",0);
  for(const role of ["titlebar","menu","toolbar","field","client","scrollbar","status"])assert.ok(explorer.elements.some((item)=>item.retro?.layoutRole===role),`Explorer ${role}`);
  assert.ok(explorer.elements.length>=25);assert.ok(properties.elements.filter((item)=>item.retro?.layoutRole==="tab").length>=4);assert.equal(properties.elements.filter((item)=>item.retro?.layoutRole==="action").length,3);
  assert.ok([...explorer.elements,...properties.elements].filter((item)=>item.type==="text"||item.type==="button").every((item)=>item.fontFamily==="MS Sans Serif"));
});

test("file picker, installer, and help window use complete classic anatomy",()=>{
  const open=createRetroAsset("window-98-open-file",0),installer=createRetroAsset("window-98-installer",0),help=createRetroAsset("window-98-help",0);
  for(const name of ["Look In Field","File List","File Name Field","File Type Field","Open Button","Cancel Button"])assert.ok(open.elements.some((item)=>item.name===name),`Open dialog ${name}`);
  assert.equal(installer.elements.filter((item)=>item.retro?.layoutRole==="action").length,3);assert.ok(installer.elements.some((item)=>item.name==="Wizard Banner"));
  for(const role of ["titlebar","menu","toolbar","client","status"])assert.ok(help.elements.some((item)=>item.retro?.layoutRole===role),`Help ${role}`);
  assert.ok([...open.elements,...installer.elements,...help.elements].filter((item)=>item.type==="text"||item.type==="button").every((item)=>item.fontFamily==="MS Sans Serif"));
});

test("expanded controls have distinct authentic construction",()=>{
  const states=[["button-win98","default-button",100],["button-win98-standard","raised",100],["button-win98-pressed","sunken",100],["button-win98-disabled","raised",62]];
  for(const [id,border,opacity] of states){const built=createRetroAsset(id,0),root=built.elements.find((item)=>item.id===built.rootId);assert.ok(root);assert.deepEqual([root.width,root.height],[75,23]);assert.equal(root.retro.borderPrimitive,border);assert.equal(root.opacity,opacity);assert.equal(root.fontFamily,"MS Sans Serif");}
  for(const id of ["input-password","input-multiline","input-numeric","input-trackbar","nav-tree","nav-toolbar","nav-dropdown-menu","control-spin","control-caption-close"]){const built=createRetroAsset(id,0),root=built.elements.find((item)=>item.id===built.rootId);assert.ok(root,`${id} root`);assert.ok(built.elements.length>=(id==="control-caption-close"?1:2),`${id} hierarchy`);}
  for(const id of ["icon-computer98","icon-disk","icon-settings","icon-search","icon-printer","icon-network","icon-display"]){const built=createRetroAsset(id,0);assert.ok(built.elements.length>=3,`${id} details`);}
});

test("retro insertion attaches structural assets to the selected parent",()=>{
  const window=createRetroAsset("window-98-app",0),parent=window.elements.find((item)=>item.id===window.rootId);assert.ok(parent);
  const status=createRetroAsset("nav-status",window.elements.length),placedStatus=placeRetroComponent(status.elements,status.rootId,parent,window.elements),statusRoot=placedStatus.elements.find((item)=>item.id===status.rootId);assert.ok(statusRoot);assert.equal(placedStatus.attached,true);assert.equal(statusRoot.parentId,parent.id);assert.equal(statusRoot.width,parent.width-6);assert.equal(statusRoot.y,parent.y+parent.height-statusRoot.height-3);assert.deepEqual(statusRoot.constraints,{horizontal:"left-right",vertical:"bottom"});
  const toolbar=createRetroAsset("nav-toolbar",window.elements.length),placedToolbar=placeRetroComponent(toolbar.elements,toolbar.rootId,parent,window.elements),toolbarRoot=placedToolbar.elements.find((item)=>item.id===toolbar.rootId);assert.ok(toolbarRoot);assert.equal(toolbarRoot.parentId,parent.id);assert.ok(toolbarRoot.y>=parent.y+40);assert.deepEqual(toolbarRoot.constraints,{horizontal:"left-right",vertical:"top"});
  const firstButton=createRetroAsset("button-win98-standard",window.elements.length),placedFirst=placeRetroComponent(firstButton.elements,firstButton.rootId,parent,window.elements),firstRoot=placedFirst.elements.find((item)=>item.id===firstButton.rootId);assert.ok(firstRoot);const existingWithFirst=[...window.elements,...placedFirst.elements],secondButton=createRetroAsset("button-win98-disabled",existingWithFirst.length),placedSecond=placeRetroComponent(secondButton.elements,secondButton.rootId,firstRoot,existingWithFirst),secondRoot=placedSecond.elements.find((item)=>item.id===secondButton.rootId);assert.ok(secondRoot);assert.equal(secondRoot.parentId,parent.id,"a control selected inside a window resolves to the nearest container");assert.equal(firstRoot.parentId,secondRoot.parentId);assert.ok(secondRoot.x<firstRoot.x,"action siblings form a right-aligned row");
  const dialog=createRetroAsset("window-95-dialog",0),free=placeRetroComponent(dialog.elements,dialog.rootId,parent,window.elements);assert.equal(free.attached,false,"complete windows remain top-level");
});

test("intelligent anchors preserve frame anatomy during resize",()=>{
  const built=createRetroAsset("window-98-explorer",0),before=createProject("before");before.elements=structuredClone(built.elements);const draft=structuredClone(before),root=before.elements.find((item)=>item.id===built.rootId),beforeTitle=before.elements.find((item)=>item.retro?.layoutRole==="titlebar"),beforeStatus=before.elements.find((item)=>item.retro?.layoutRole==="status"),beforeScroll=before.elements.find((item)=>item.retro?.layoutRole==="scrollbar");assert.ok(root&&beforeTitle&&beforeStatus&&beforeScroll);
  resizeElementWithConstraints(draft,before,root.id,{x:root.x,y:root.y,width:root.width+160,height:root.height+100});
  const title=draft.elements.find((item)=>item.id===beforeTitle.id),status=draft.elements.find((item)=>item.id===beforeStatus.id),scroll=draft.elements.find((item)=>item.id===beforeScroll.id);assert.ok(title&&status&&scroll);
  assert.equal(title.width,beforeTitle.width+160);assert.equal(status.width,beforeStatus.width+160);assert.equal(status.y,beforeStatus.y+100);assert.equal(scroll.x,beforeScroll.x+160);assert.equal(scroll.height,beforeScroll.height+100);
});

test("classic pixel edges are explicit layers and the library separates historical assets",async()=>{
  const css=await readFile(new URL("../app/retro-studio.css",import.meta.url),"utf8"),source=await readFile(new URL("../components/editor/ElementSurface.tsx",import.meta.url),"utf8");
  assert.match(css,/\.win98-raised.*border-color:#fff #000 #000 #fff/);assert.match(css,/\.win98-sunken.*border-color:#000 #fff #fff #000/);assert.ok((source.match(/<RetroPixelBorder element=\{element\}\/>/g)??[]).length>=2,"ordinary and vector surfaces both mount pixel borders");
  const historical=RETRO_LIBRARY.filter((item)=>item.family==="windows");assert.ok(historical.length>=50);assert.ok(historical.some((item)=>item.category==="Inputs"));assert.ok(historical.some((item)=>item.category==="Navigation"));assert.ok(historical.some((item)=>item.category==="System Icons"));
  assert.equal(WINDOWS98_CLASSIC.colors.buttonFace,"#c0c0c0");assert.equal(WINDOWS98_CLASSIC.font.pointSize,8);
});
