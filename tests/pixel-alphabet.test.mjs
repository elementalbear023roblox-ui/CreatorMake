import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject, normalizeProject } from "../lib/editor/project.ts";
import { DEFAULT_PIXEL_COMPOSER, EXTENDED_PIXEL_CHARACTERS, layoutPixelComposer, pixelGlyph, pixelGlyphContours, PIXEL_REFERENCE_LIMITATIONS, REFERENCE_PIXEL_CHARACTERS } from "../lib/editor/pixel-alphabet.ts";
import { tightThreeDRenderBounds } from "../lib/editor/three-d.ts";

test("reference pixel masks preserve supplied silhouettes instead of substituting a font",()=>{
  assert.equal(REFERENCE_PIXEL_CHARACTERS,"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234");
  assert.deepEqual(pixelGlyph("A").rows,[".####.","##..##","##..##","##..##","######","##..##","##..##"]);
  assert.deepEqual(pixelGlyph("B").rows,["#####.","##..##","##..##","#####.","##..##","##..##","#####."]);
  assert.deepEqual(pixelGlyph("g").rows,[".#####","##..##","##..##",".#####","....##",".####."]);
  assert.deepEqual(pixelGlyph("4").rows,["...###","..####",".##.##","##..##","######","....##","....##"]);
  assert.equal(pixelGlyph("4").source,"reference");
  assert.equal(pixelGlyph("5").source,"style-extension");
  assert.match(PIXEL_REFERENCE_LIMITATIONS,/5 is clipped/);
  assert.ok(EXTENDED_PIXEL_CHARACTERS.includes("9"));
});

test("pixel masks trace into efficient exterior contours and real holes",()=>{
  const a=pixelGlyphContours("A"),b=pixelGlyphContours("B"),i=pixelGlyphContours("i");
  assert.equal(a.length,1);assert.equal(a[0].holes.length,1);
  assert.equal(b.length,1);assert.equal(b[0].holes.length,2);
  assert.equal(i.length,2,"the detached lowercase i dot remains a separate closed solid");
  assert.ok(a[0].outer.length<40,"contour tracing avoids one cube per source pixel");
});

test("CREATORMAKE composer produces independent ordered character placements",()=>{
  const layout=layoutPixelComposer({...DEFAULT_PIXEL_COMPOSER,text:"CREATORMAKE",letterSpacing:10});
  assert.equal(layout.placements.length,11);
  assert.equal(layout.placements.map((item)=>item.character).join(""),"CREATORMAKE");
  assert.deepEqual(layout.placements.map((item)=>item.index),[0,1,2,3,4,5,6,7,8,9,10]);
  assert.ok(layout.placements.every((item)=>item.width>0&&item.height>0));
});

test("automatic render bounds apply exactly ten design pixels around noninteger projected bounds",()=>{
  const bounds=tightThreeDRenderBounds({left:40.25,top:20.75,right:140.25,bottom:120.75},10,0);
  assert.deepEqual(bounds,{left:30,top:10,right:151,bottom:131,width:121,height:121,padding:10,effectPadding:0});
  const withEffect=tightThreeDRenderBounds({left:-2.5,top:4.2,right:97.1,bottom:54.8},10,6);
  assert.deepEqual(withEffect,{left:-19,top:-12,right:114,bottom:71,width:133,height:83,padding:10,effectPadding:6});
});

test("pixel letters and composer metadata survive schema migration and save reload",()=>{
  const project=createProject("Pixel word"),group=createElement("container"),letter=createElement("three-d");group.pixelComposer={...DEFAULT_PIXEL_COMPOSER,text:"A"};group.text="A";letter.parentId=group.id;letter.threeD={...letter.threeD,primitive:"pixel-letter",pixelGlyph:"A",pixelGlyphIndex:0,depth:72,material:"chrome",rotationX:24,rotationY:-16,automaticBounds:true,boundsPadding:10};project.elements=[group,letter];
  const restored=normalizeProject(structuredClone(project)),savedGroup=restored.elements[0],savedLetter=restored.elements[1];
  assert.equal(restored.schemaVersion,20);assert.equal(savedGroup.pixelComposer?.text,"A");assert.equal(savedLetter.threeD.primitive,"pixel-letter");assert.equal(savedLetter.threeD.pixelGlyph,"A");assert.equal(savedLetter.threeD.depth,72);assert.equal(savedLetter.threeD.material,"chrome");assert.equal(savedLetter.threeD.boundsPadding,10);
});
