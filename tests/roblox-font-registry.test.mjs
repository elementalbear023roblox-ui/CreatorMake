import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { createNativeTextLabel } from "../lib/roblox/exporter.ts";
import { ROBLOX_FONT_REGISTRY, getRobloxFontCompatibility, getRobloxFontDefinition, resolveRobloxFontVariant, searchRobloxFonts } from "../lib/roblox/fonts.ts";

const required=["Accanthis ADF Std","Amatic SC","Arimo","Balthazar","Bangers","Builder Extended","Builder Mono","Builder Sans","Comic Neue Angular","Jura","Kalam","Luckiest Guy","Merriweather","Michroma","Montserrat","Nunito","Oswald","Patrick Hand","Permanent Marker","Press Start 2P","Roboto","Roboto Condensed","Roboto Mono","Roman Antique","Sarpanch","Source Sans Pro","Special Elite","Titillium Web","Ubuntu","Zekton"];

test("canonical Roblox registry contains every documented family and valid mappings",()=>{
  assert.ok(ROBLOX_FONT_REGISTRY.length>=40,`expected complete registry, got ${ROBLOX_FONT_REGISTRY.length}`);
  assert.deepEqual(required.filter((family)=>!getRobloxFontDefinition(family)),[]);
  assert.equal(new Set(ROBLOX_FONT_REGISTRY.map((font)=>font.id)).size,ROBLOX_FONT_REGISTRY.length);
  assert.equal(new Set(ROBLOX_FONT_REGISTRY.map((font)=>font.familyAsset)).size,ROBLOX_FONT_REGISTRY.length);
  for(const font of ROBLOX_FONT_REGISTRY){assert.equal(font.availability,"READY");assert.match(font.familyAsset,/^rbxasset:\/\/fonts\/families\/.+\.json$/);assert.ok(font.supportedWeights.length);assert.ok(font.supportedStyles.length);assert.ok(font.supportedWeights.includes(font.defaultWeight));assert.ok(font.supportedStyles.includes(font.defaultStyle));}
});

test("Roblox font search includes family names, categories, and legacy aliases",()=>{
  assert.ok(searchRobloxFonts("Arcade").some((font)=>font.family==="Press Start 2P"));
  assert.ok(searchRobloxFonts("Bodoni").some((font)=>font.family==="Accanthis ADF Std"));
  assert.ok(searchRobloxFonts("Code").some((font)=>font.family==="Inconsolata"));
  assert.ok(searchRobloxFonts("Mono").some((font)=>font.family==="Builder Mono"));
});

test("FontFace export uses canonical family and a real supported variant",()=>{
  const builder=getRobloxFontDefinition("Builder Sans");assert.ok(builder);
  assert.deepEqual(resolveRobloxFontVariant(builder,850,"italic"),{weight:800,style:"normal"});
  const text=createElement("text");Object.assign(text,{id:"title",fontFamily:"Builder Sans",fontWeight:850,fontStyle:"italic",fill:"transparent",borderColor:"transparent",shadow:"none",textShadows:[]});
  const node=createNativeTextLabel(text,"root",2),font=node.properties.FontFace;
  assert.equal(font.family,"rbxasset://fonts/families/BuilderSans.json");assert.equal(font.weight,"ExtraBold");assert.equal(font.style,"Normal");
  assert.equal(getRobloxFontCompatibility("BuilderSansBold").definition.family,"Builder Sans");
});
