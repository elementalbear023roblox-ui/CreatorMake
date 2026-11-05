import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {createRetroAsset,RETRO_LIBRARY} from "../lib/retro/components.ts";
import {WINDOWS98_CLASSIC,preferredMessageBoxSize} from "../lib/retro/windows98-design.ts";
import {createProject} from "../lib/editor/project.ts";
import {resizeElementWithConstraints} from "../lib/editor/transforms.ts";

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

test("intelligent anchors preserve frame anatomy during resize",()=>{
  const built=createRetroAsset("window-98-explorer",0),before=createProject("before");before.elements=structuredClone(built.elements);const draft=structuredClone(before),root=before.elements.find((item)=>item.id===built.rootId),beforeTitle=before.elements.find((item)=>item.retro?.layoutRole==="titlebar"),beforeStatus=before.elements.find((item)=>item.retro?.layoutRole==="status"),beforeScroll=before.elements.find((item)=>item.retro?.layoutRole==="scrollbar");assert.ok(root&&beforeTitle&&beforeStatus&&beforeScroll);
  resizeElementWithConstraints(draft,before,root.id,{x:root.x,y:root.y,width:root.width+160,height:root.height+100});
  const title=draft.elements.find((item)=>item.id===beforeTitle.id),status=draft.elements.find((item)=>item.id===beforeStatus.id),scroll=draft.elements.find((item)=>item.id===beforeScroll.id);assert.ok(title&&status&&scroll);
  assert.equal(title.width,beforeTitle.width+160);assert.equal(status.width,beforeStatus.width+160);assert.equal(status.y,beforeStatus.y+100);assert.equal(scroll.x,beforeScroll.x+160);assert.equal(scroll.height,beforeScroll.height+100);
});

test("classic pixel edges are explicit layers and the library separates historical assets",async()=>{
  const css=await readFile(new URL("../app/retro-studio.css",import.meta.url),"utf8"),source=await readFile(new URL("../components/editor/ElementSurface.tsx",import.meta.url),"utf8");
  assert.match(css,/\.win98-raised.*border-color:#fff #000 #000 #fff/);assert.match(css,/\.win98-sunken.*border-color:#000 #fff #fff #000/);assert.ok((source.match(/<RetroPixelBorder element=\{element\}\/>/g)??[]).length>=2,"ordinary and vector surfaces both mount pixel borders");
  const historical=RETRO_LIBRARY.filter((item)=>item.family==="windows");assert.ok(historical.length>=25);assert.ok(historical.some((item)=>item.category==="Inputs"));assert.ok(historical.some((item)=>item.category==="Navigation"));assert.ok(historical.some((item)=>item.category==="System Icons"));
  assert.equal(WINDOWS98_CLASSIC.colors.buttonFace,"#c0c0c0");assert.equal(WINDOWS98_CLASSIC.font.pointSize,8);
});
