import assert from "node:assert/strict";
import test from "node:test";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { DEFAULT_TYPOGRAPHY_COMPOSER, MAROLA_THREE_D_FONT, layoutThreeDTypography } from "../lib/editor/three-d-typography.ts";

test("supplied Marola font uses original outlines and honest metadata",()=>{
  assert.equal(MAROLA_THREE_D_FONT.family,"Marola");
  assert.equal(MAROLA_THREE_D_FONT.originalName,"MAROLA__.TTF");
  assert.equal(MAROLA_THREE_D_FONT.source,"builtin");
  assert.equal(MAROLA_THREE_D_FONT.embedding,"unknown");
  for(const character of ["A","B","O","R","S","a","z","0","9","$"])assert.ok(MAROLA_THREE_D_FONT.glyphs[character]?.commands.length>2,character);
  assert.ok(MAROLA_THREE_D_FONT.glyphs.A.commands.filter((item)=>item.type==="M").length>=2,"A preserves its counter contour");
  assert.ok(MAROLA_THREE_D_FONT.glyphs.B.commands.filter((item)=>item.type==="M").length>=3,"B preserves both counters");
  assert.ok(MAROLA_THREE_D_FONT.glyphs.O.commands.filter((item)=>item.type==="M").length>=2,"O preserves its opening");
  assert.notEqual(MAROLA_THREE_D_FONT.glyphs.I.advanceWidth,MAROLA_THREE_D_FONT.glyphs.W.advanceWidth,"original variable widths remain intact");
});

test("3D typography layout uses metrics, kerning, multiple lines, and independent placements",()=>{
  const settings={...DEFAULT_TYPOGRAPHY_COMPOSER,text:"MRCREATOR'S CREATOR TIME\nA B O R S",alignment:"center",kerning:true},layout=layoutThreeDTypography(MAROLA_THREE_D_FONT,settings);
  assert.equal(layout.missing.length,0);
  assert.equal(layout.placements.length,[...settings.text].filter((character)=>character!==" "&&character!=="\n").length);
  assert.ok(layout.width>layout.placements[0].width);
  assert.ok(layout.height>layout.placements[0].height);
  assert.equal(new Set(layout.placements.map((item)=>item.index)).size,layout.placements.length);
});

test("schema 20 preserves imported fonts, outline glyph meshes, and editable source text",()=>{
  const project=createProject("3D typography"),font=structuredClone(MAROLA_THREE_D_FONT),group=createElement("container"),letter=createElement("three-d");font.id="project-font";font.source="imported";font.importedAt=1;project.threeDFonts=[font];group.typographyComposer={...DEFAULT_TYPOGRAPHY_COMPOSER,fontId:font.id,text:"A"};letter.parentId=group.id;letter.threeD={...letter.threeD,primitive:"font-letter",fontId:font.id,fontFamily:font.family,fontGlyph:"A",fontGlyphOutline:structuredClone(font.glyphs.A),bevelDepth:7,curveDetail:24,depthDirection:"forward"};project.elements=[group,letter];
  const restored=normalizeProject(structuredClone(project));
  assert.equal(restored.schemaVersion,20);assert.equal(restored.threeDFonts[0].glyphs.A.commands.length,font.glyphs.A.commands.length);assert.equal(restored.elements[0].typographyComposer?.text,"A");assert.equal(restored.elements[1].threeD.primitive,"font-letter");assert.equal(restored.elements[1].threeD.fontGlyph,"A");assert.equal(restored.elements[1].threeD.bevelDepth,7);assert.equal(restored.elements[1].threeD.depthDirection,"forward");assert.equal(restored.elements[1].threeD.boundsPadding,10);
});
