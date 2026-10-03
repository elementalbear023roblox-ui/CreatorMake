import test from "node:test";
import assert from "node:assert/strict";
import { parseDesignIntent } from "../lib/ai/intent.ts";
import { CREATOR_FONTS } from "../lib/fonts/font-library.ts";

test("instructions never become visible copy",()=>{
  assert.deepEqual(parseDesignIntent("Make this UI cleaner.").literalCopy,[]);
  assert.deepEqual(parseDesignIntent("Create a revamped version of this.").literalCopy,[]);
});

test("explicit title and button copy are extracted",()=>{
  assert.equal(parseDesignIntent("Create a shop titled ITEM SHOP.").literalCopy.find((item)=>item.role==="title")?.text,"ITEM SHOP");
  assert.equal(parseDesignIntent("Use button text 'BUY NOW'.").literalCopy.find((item)=>item.role==="button")?.text,"BUY NOW");
});

test("font catalog contains at least 100 unique open families and required samples",()=>{
  assert.ok(CREATOR_FONTS.length>=100);
  assert.equal(new Set(CREATOR_FONTS.map((font)=>font.family)).size,CREATOR_FONTS.length);
  for(const family of ["Inter","Roboto","Press Start 2P","Pixelify Sans","Orbitron","Bungee","Fredoka","VT323","JetBrains Mono","Luckiest Guy"])assert.ok(CREATOR_FONTS.some((font)=>font.family===family),family);
});
