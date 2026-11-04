import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createElement } from "../lib/editor/project.ts";
import { applyCreativeTreatment, createProfessionalDesignAsset, PROFESSIONAL_DESIGN_ASSETS } from "../lib/design-system/professional-kits.ts";
import { WORKSPACE_MODES } from "../lib/ui/interface-themes.ts";

test("professional gallery ships five distinct kits and three complete editable demonstrations",()=>{
  assert.deepEqual([...new Set(PROFESSIONAL_DESIGN_ASSETS.map((asset)=>asset.kit))],["1990s Arcade","Modern Roblox","Futuristic","Cinematic","Minimalist"]);
  assert.equal(PROFESSIONAL_DESIGN_ASSETS.filter((asset)=>asset.category==="Complete interface").length,3);
  for(const asset of PROFESSIONAL_DESIGN_ASSETS){
    const {elements}=createProfessionalDesignAsset(asset.id);
    assert.equal(elements.length,asset.objectCount,`${asset.name} preview count must match its real editable layers`);
    assert.equal(new Set(elements.map((element)=>element.id)).size,elements.length);
    assert.ok(elements.every((element)=>Number.isFinite(element.x)&&Number.isFinite(element.y)&&element.width>0&&element.height>0));
  }
});

test("the three demonstrations differ in geometry, typography, materials, and composition",()=>{
  const retro=createProfessionalDesignAsset("demo-retro-game-show").elements;
  const modern=createProfessionalDesignAsset("demo-modern-roblox").elements;
  const future=createProfessionalDesignAsset("demo-futuristic").elements;
  assert.ok(retro.some((element)=>element.type==="star"));
  assert.ok(retro.some((element)=>element.fontFamily==="Bungee"));
  assert.ok(modern.some((element)=>element.name==="Quest Art Field"));
  assert.ok(modern.some((element)=>element.name==="Player Avatar"));
  assert.ok(future.some((element)=>element.type==="three-d"&&element.threeD.material==="holographic"));
  assert.ok(future.some((element)=>element.geometry.kind==="tech-panel"));
  assert.ok(future.some((element)=>element.geometry.kind==="ornamental-frame"));
  assert.ok(retro.some((element)=>element.geometry.kind==="arcade-marquee"));
  assert.ok(modern.some((element)=>element.geometry.kind==="organic-panel"));
  for(const demo of [retro,modern,future]){
    const roots=demo.filter((element)=>!element.parentId);
    assert.ok(roots.some((element)=>element.width>=900&&element.height>=580),"each demo owns a full-canvas backdrop");
    assert.ok(demo.every((element)=>element.parentId||element.x>=0&&element.y>=0),"root layers stay on canvas");
  }
  assert.notDeepEqual(new Set(retro.map((element)=>element.fontFamily)),new Set(modern.map((element)=>element.fontFamily)));
});

test("Creative Mode treatments are multi-property, editable, and non-destructive",()=>{
  const source=createElement("button"),before=structuredClone(source);
  for(const treatment of ["depth","gloss","border","highlight","retro","texture","glow","chrome","holographic","cartoon-plastic","cinematic-metal"]){
    const patch=applyCreativeTreatment(source,treatment);
    assert.ok(Object.keys(patch).length>=1);
    assert.ok((patch.effects??[]).length>=2,`${treatment} must build a real editable effect stack`);
  }
  assert.deepEqual(source,before,"previewing a treatment must not mutate the source element");
  assert.ok(WORKSPACE_MODES.includes("creative"));
});

test("the real editor exposes the visual gallery, Creative Mode, and Roblox handoff",async()=>{
  const [library,editor,toolbar,css]=await Promise.all([
    readFile(new URL("../components/editor/RobloxLibraryPanel.tsx",import.meta.url),"utf8"),
    readFile(new URL("../components/editor/CreatorMakeEditor.tsx",import.meta.url),"utf8"),
    readFile(new URL("../components/editor/TopToolbar.tsx",import.meta.url),"utf8"),
    readFile(new URL("../app/globals.css",import.meta.url),"utf8"),
  ]);
  assert.match(library,/design-kit-gallery/);
  assert.match(library,/Complete interface/);
  assert.match(editor,/Creative Mode quick actions/);
  for(const material of ["Chrome","Holographic","Cartoon Plastic","Cinematic Metal"])assert.match(editor,new RegExp(material));
  assert.match(editor,/Roblox properties/);
  assert.match(toolbar,/Export to Roblox/);
  assert.match(css,/data-workspace="creative"/);
  assert.match(css,/kit-preview-retro/);
  assert.match(css,/kit-preview-future/);
});
