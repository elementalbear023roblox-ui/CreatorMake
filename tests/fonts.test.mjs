import test from "node:test";
import assert from "node:assert/strict";
import { CREATOR_FONTS, FONT_BY_ID, resolveCreatorFontVariant } from "../lib/fonts/font-library.ts";

test("public font registry has stable unique ids and complete legal source metadata",()=>{
  assert.ok(CREATOR_FONTS.length>=100);
  assert.equal(new Set(CREATOR_FONTS.map((font)=>font.id)).size,CREATOR_FONTS.length);
  assert.equal(new Set(CREATOR_FONTS.map((font)=>font.family.toLowerCase())).size,CREATOR_FONTS.length);
  for(const font of CREATOR_FONTS){
    assert.equal(FONT_BY_ID[font.id],font);
    assert.match(font.id,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.equal(font.displayName,font.family);
    assert.ok(font.sourceUrl.startsWith("https://fonts.googleapis.com/"));
    assert.ok(font.license.length>10);
    assert.ok(font.weights.length>0&&font.weights.every((weight)=>Number.isInteger(weight)&&weight>=100&&weight<=900));
    assert.ok(font.styles.length>0&&font.styles.every((style)=>style==="normal"||style==="italic"));
  }
});

test("variant resolution never invents a face",()=>{
  for(const font of CREATOR_FONTS){const variant=resolveCreatorFontVariant(font,650,"italic");assert.ok(font.weights.includes(variant.weight));assert.ok(font.styles.includes(variant.style));}
});
