import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { EFFECT_CATEGORIES, EFFECT_DEFINITIONS, EFFECT_PRESETS, createVisualEffect, instantiateEffectPreset, normalizeVisualEffects } from "../lib/effects/registry.ts";
import { composeVisualEffects, visualEffectExtent } from "../lib/effects/render.ts";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";

test("professional effects registry covers every library category with real parameter schemas",()=>{
  assert.equal(EFFECT_CATEGORIES.length,11);
  assert.ok(EFFECT_DEFINITIONS.length>=35);
  for(const category of EFFECT_CATEGORIES)assert.ok(EFFECT_DEFINITIONS.some((effect)=>effect.category===category),`missing ${category}`);
  for(const definition of EFFECT_DEFINITIONS){assert.ok(definition.parameters.length>0);assert.equal(new Set(definition.parameters.map((parameter)=>parameter.key)).size,definition.parameters.length);}
});

test("effect composition preserves stack order and computes export-safe glow bounds",()=>{
  const element=createElement("text");
  element.effects=[createVisualEffect("neon-glow"),createVisualEffect("brightness"),createVisualEffect("gaussian-blur")];
  const presentation=composeVisualEffects(element),filter=presentation.filter??"";
  assert.ok(filter.indexOf("drop-shadow")<filter.indexOf("brightness"));
  assert.ok(filter.indexOf("brightness")<filter.indexOf("blur"));
  assert.ok(visualEffectExtent(element)>20);
});

test("effects compositor stays inside its GPU performance budget",()=>{
  const element=createElement("text"),glow=createVisualEffect("neon-glow");
  glow.parameters.layers=8;element.effects=[glow];
  const optimized=composeVisualEffects(element),passes=(optimized.filter?.match(/drop-shadow/g)??[]).length;
  assert.equal(passes,2,"high-layer text glows should preserve their look without creating unbounded filter passes");
  const frame=createElement("frame");frame.effects=[glow];const framePresentation=composeVisualEffects(frame);
  assert.equal(framePresentation.filter,undefined,"rectangular GUI glows should use cheaper box shadows");assert.equal(framePresentation.boxShadows.length,2);
  assert.equal(optimized.animated,false);
  const scanlines=createVisualEffect("scanlines");element.effects=[scanlines];
  assert.doesNotMatch(composeVisualEffects(element).overlays[0].className,/effect-is-animated/);
  scanlines.animation.enabled=true;
  const animated=composeVisualEffects(element);assert.equal(animated.animated,true);assert.match(animated.overlays[0].className,/effect-is-animated/);
});

test("effect instances serialize, normalize unsafe input, and survive project migration",()=>{
  const glow=createVisualEffect("neon-glow");
  const normalized=normalizeVisualEffects([{...glow,parameters:{...glow.parameters,radius:9999}},{type:"not-real"}]);
  assert.equal(normalized.length,1);assert.equal(normalized[0].parameters.radius,120);
  const project=createProject("Effects"),element=createElement("frame");element.effects=normalized;project.elements=[element];
  const restored=normalizeProject(structuredClone(project));
  assert.equal(restored.schemaVersion,19);assert.equal(restored.elements[0].effects[0].type,"neon-glow");assert.notEqual(restored.elements[0].effects,element.effects);
});

test("Roblox export never silently drops visual effects",()=>{
  const text=createElement("text");text.effects=[createVisualEffect("chromatic-aberration")];
  const textResult=classifyRobloxElement(text);assert.equal(textResult.classification,"RASTERIZED");assert.equal(textResult.rasterPart,"full");assert.match(textResult.reasons.join(" "),/effect stack/i);
  const button=createElement("button");button.effects=[createVisualEffect("neon-glow")];
  const buttonResult=classifyRobloxElement(button);assert.equal(buttonResult.classification,"HYBRID");assert.equal(buttonResult.nativeText,false);
});

test("effect presets create independent editable stacks",()=>{
  const first=instantiateEffectPreset(EFFECT_PRESETS[0]),second=instantiateEffectPreset(EFFECT_PRESETS[0]);
  assert.ok(first.length>=2);assert.notEqual(first[0].id,second[0].id);first[0].parameters.radius=1;assert.notEqual(first[0].parameters.radius,second[0].parameters.radius);
});

test("effects inspector exposes the complete stack workflow",async()=>{
  const source=await readFile(new URL("../components/editor/EffectsSection.tsx",import.meta.url),"utf8");
  for(const label of ["Add Effect","Effects Library","Disable all","Enable all","Clear stack","Save stack as preset","Animation","Delay","Phase offset","Duplicate effect","Reset effect"])assert.match(source,new RegExp(label));
  const inspectorSource=await readFile(new URL("../components/editor/Inspector.tsx",import.meta.url),"utf8");
  assert.match(inspectorSource,/querySelectorAll<HTMLDetailsElement>\(\":scope > details\"\)/,"nested animation disclosures must not be persisted as top-level inspector sections");
  const surfaceSource=await readFile(new URL("../components/editor/ElementSurface.tsx",import.meta.url),"utf8");
  assert.doesNotMatch(surfaceSource,/composeVisualEffects\(element\)\.overlays/,"an element must reuse one composed effect presentation");
  assert.match(surfaceSource,/memo\(ElementSurfaceView/,"unchanged canvas surfaces should not recompute their effect stack");
  const editorSource=await readFile(new URL("../hooks/use-editor.ts",import.meta.url),"utf8");
  assert.match(editorSource,/if\(transactionRef\.current\)transient\(mutate,projectRef\.current\.selectedIds\)/,"continuous property edits should be frame-batched instead of deep-cloning every input event");
  assert.match(editorSource,/editorLowFidelity/,"canvas transforms should temporarily suspend expensive visual effects");
  const css=await readFile(new URL("../app/globals.css",import.meta.url),"utf8");
  assert.match(css,/@keyframes cm-effect-spectrum\{from\{transform:/,"spectrum animation should stay on the compositor");
  assert.doesNotMatch(css,/@keyframes cm-effect-spectrum[^@]*background-position/,"spectrum animation must not repaint its background every frame");
});
