import opentype from "opentype.js";
import marolaData from "./data/marola-3d.json" with { type: "json" };
import type { FontOutlineCommand, ProjectThreeDFont, ThreeDGlyphDefinition, TypographyComposerSettings } from "./types";

export const MAROLA_THREE_D_FONT=marolaData as ProjectThreeDFont;
export const BUILTIN_THREE_D_FONTS:ProjectThreeDFont[]=[MAROLA_THREE_D_FONT];
export const DEFAULT_TYPOGRAPHY_COMPOSER:TypographyComposerSettings={fontId:"marola-3d",text:"MRCREATOR'S CREATOR TIME",letterSpacing:2,wordSpacing:36,lineSpacing:26,alignment:"center",scale:1,depth:56,bevel:3,bevelDepth:3,bevelSegments:3,curveDetail:20,material:"retro-plastic",groupRotation:0,letterRotation:0,perspective:35,kerning:true};

const english=(record:Record<string,string>|undefined)=>record?.en??Object.values(record??{})[0]??"";
const round=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Math.round(Number(value)):fallback;
const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"").slice(0,42)||"font";
const formatOf=(file:File):ProjectThreeDFont["format"]=>{const extension=file.name.split(".").pop()?.toUpperCase();if(extension==="TTF"||extension==="OTF"||extension==="WOFF"||extension==="WOFF2")return extension;throw new Error("Choose a TTF, OTF, WOFF, or WOFF2 font file.");};
const embeddingOf=(fsType:number):ProjectThreeDFont["embedding"]=>fsType&2?"restricted":fsType&4?"preview-print":fsType&8?"editable":fsType===0?"installable":"unknown";
const command=(input:opentype.PathCommand):FontOutlineCommand=>{
  if(input.type==="Z")return{type:"Z"};
  if(input.type==="C")return{type:"C",x:round(input.x),y:round(input.y),x1:round(input.x1),y1:round(input.y1),x2:round(input.x2),y2:round(input.y2)};
  if(input.type==="Q")return{type:"Q",x:round(input.x),y:round(input.y),x1:round(input.x1),y1:round(input.y1)};
  return{type:input.type==="M"?"M":"L",x:round(input.x),y:round(input.y)};
};

export async function parseThreeDFontFile(file:File):Promise<ProjectThreeDFont>{
  const format=formatOf(file);if(file.size>18_000_000)throw new Error("Font files must be 18 MB or smaller.");
  let bytes=new Uint8Array(await file.arrayBuffer());
  if(format==="WOFF2"){const module=await import("wawoff2/decompress.js");bytes=new Uint8Array(await module.default(bytes));}
  const buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength) as ArrayBuffer,font=opentype.parse(buffer),glyphs:Record<string,ThreeDGlyphDefinition>={},characters:string[]=[];
  for(let index=0;index<font.glyphs.length;index++){
    const glyph=font.glyphs.get(index),unicode=glyph.unicode;if(!Number.isInteger(unicode)||unicode!<32||unicode!>0xffff)continue;
    const character=String.fromCodePoint(unicode!),path=glyph.getPath(0,0,font.unitsPerEm),commands=path.commands.map(command);if(!commands.length&&character!==" ")continue;
    characters.push(character);glyphs[character]={advanceWidth:round(glyph.advanceWidth,font.unitsPerEm*.5),xMin:round(glyph.xMin),yMin:round(glyph.yMin),xMax:round(glyph.xMax),yMax:round(glyph.yMax),commands};
  }
  if(!Object.keys(glyphs).some((character)=>character!==" "))throw new Error("This font has no supported outline glyphs.");
  const kerning:Record<string,number>={},kernable=characters.filter((character)=>character.codePointAt(0)!<=255);for(const left of kernable)for(const right of kernable){const value=round(font.getKerningValue(font.charToGlyph(left),font.charToGlyph(right)));if(value)kerning[`${left}${right}`]=value;}
  const digest=await crypto.subtle.digest("SHA-256",buffer),hash=[...new Uint8Array(digest)].slice(0,6).map((value)=>value.toString(16).padStart(2,"0")).join(""),family=english(font.names.fontFamily as Record<string,string>)||english(font.names.fullName as Record<string,string>)||file.name.replace(/\.[^.]+$/,"");
  return{id:`${slug(family)}-${hash}`,family,displayName:family,originalName:file.name,format,source:"imported",copyright:english(font.names.copyright as Record<string,string>),license:"Imported by the project owner, who confirmed they have permission to use this font. CreatorMake stores outline data, not a downloadable font binary.",embedding:embeddingOf(round((font.tables.os2 as {fsType?:number}|undefined)?.fsType)),unitsPerEm:font.unitsPerEm,ascender:font.ascender,descender:font.descender,supportedCharacters:characters.join(""),glyphs,kerning,importedAt:Date.now()};
}

export function typographyFont(fonts:ProjectThreeDFont[],id:string){return fonts.find((font)=>font.id===id)??BUILTIN_THREE_D_FONTS.find((font)=>font.id===id)??MAROLA_THREE_D_FONT;}
export function glyphSvgPath(glyph:ThreeDGlyphDefinition){return glyph.commands.map((item)=>item.type==="Z"?"Z":item.type==="C"?`C${item.x1} ${item.y1} ${item.x2} ${item.y2} ${item.x} ${item.y}`:item.type==="Q"?`Q${item.x1} ${item.y1} ${item.x} ${item.y}`:`${item.type}${item.x} ${item.y}`).join(" ");}

export function layoutThreeDTypography(font:ProjectThreeDFont,settings:TypographyComposerSettings){
  const scale=Math.max(.25,Math.min(4,settings.scale)),unitScale=150/font.unitsPerEm*scale,lineHeight=Math.max(80,(font.ascender-font.descender)*unitScale+settings.lineSpacing),lines=settings.text.split("\n"),placements:Array<{character:string;index:number;x:number;y:number;width:number;height:number;glyph:ThreeDGlyphDefinition}>=[],widths=lines.map((line)=>{let width=0,previous="";for(const character of [...line]){if(character===" "){width+=settings.wordSpacing*scale;previous="";continue;}const glyph=font.glyphs[character];if(!glyph)continue;if(previous&&settings.kerning)width+=(font.kerning[`${previous}${character}`]??0)*unitScale;width+=glyph.advanceWidth*unitScale+settings.letterSpacing*scale;previous=character;}return Math.max(1,width-settings.letterSpacing*scale);}),width=Math.max(1,...widths),height=Math.max(lineHeight,lines.length*lineHeight-settings.lineSpacing),indexByCharacter=new Map<number,number>();let sourceIndex=0;
  lines.forEach((line,lineIndex)=>{let x=settings.alignment==="center"?(width-widths[lineIndex])/2:settings.alignment==="right"?width-widths[lineIndex]:0,previous="";for(const character of [...line]){const index=sourceIndex++;if(character===" "){x+=settings.wordSpacing*scale;previous="";continue;}const glyph=font.glyphs[character];if(!glyph)continue;if(previous&&settings.kerning)x+=(font.kerning[`${previous}${character}`]??0)*unitScale;const glyphWidth=Math.max(24,(glyph.xMax-glyph.xMin)*unitScale),glyphHeight=Math.max(40,(glyph.yMax-glyph.yMin)*unitScale),advance=glyph.advanceWidth*unitScale;placements.push({character,index,x:x+glyph.xMin*unitScale,y:lineIndex*lineHeight+(font.ascender-glyph.yMax)*unitScale,width:glyphWidth,height:glyphHeight,glyph});x+=advance+settings.letterSpacing*scale;previous=character;indexByCharacter.set(index,placements.length-1);}});
  return{width,height,placements,missing:[...new Set([...settings.text].filter((character)=>character!==" "&&character!=="\n"&&!font.glyphs[character]))]};
}
