import fs from "node:fs";
import path from "node:path";
import opentype from "opentype.js";

const [input,output,id="imported-3d"] = process.argv.slice(2);
if(!input||!output)throw new Error("Usage: node scripts/generate-three-d-font.mjs input.ttf output.json [id]");
const bytes=fs.readFileSync(input),buffer=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),font=opentype.parse(buffer),english=(record)=>record?.en??Object.values(record??{})[0]??"",glyphs={},characters=[];
for(let index=0;index<font.glyphs.length;index++){
  const glyph=font.glyphs.get(index),unicode=glyph.unicode;
  if(!Number.isInteger(unicode)||unicode<32||unicode>0xffff)continue;
  const character=String.fromCodePoint(unicode),pathData=glyph.getPath(0,0,font.unitsPerEm),commands=pathData.commands.map((command)=>{
    if(command.type==="Z")return{type:"Z"};
    const result={type:command.type,x:Math.round(command.x),y:Math.round(command.y)};
    if("x1" in command){result.x1=Math.round(command.x1);result.y1=Math.round(command.y1);}
    if("x2" in command){result.x2=Math.round(command.x2);result.y2=Math.round(command.y2);}
    return result;
  });
  if(!commands.length&&character!==" ")continue;
  characters.push(character);glyphs[character]={advanceWidth:Math.round(glyph.advanceWidth??font.unitsPerEm*.5),xMin:Math.round(glyph.xMin??0),yMin:Math.round(glyph.yMin??0),xMax:Math.round(glyph.xMax??0),yMax:Math.round(glyph.yMax??0),commands};
}
const kerning={};for(const left of characters)for(const right of characters){const value=Math.round(font.getKerningValue(font.charToGlyph(left),font.charToGlyph(right)));if(value)kerning[`${left}${right}`]=value;}
const fsType=Number(font.tables?.os2?.fsType??0),embedding=fsType&2?"restricted":fsType&4?"preview-print":fsType&8?"editable":fsType===0?"installable":"unknown",extension=path.extname(input).slice(1).toUpperCase(),family=english(font.names.fontFamily)||english(font.names.fullName)||path.basename(input,path.extname(input)),payload={id,family,displayName:family,originalName:path.basename(input),format:extension,source:"builtin",copyright:english(font.names.copyright),license:"User-supplied font; retain the original license and do not redistribute the binary without permission.",embedding,unitsPerEm:font.unitsPerEm,ascender:font.ascender,descender:font.descender,supportedCharacters:characters.join(""),glyphs,kerning,importedAt:0};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,`${JSON.stringify(payload)}\n`);
console.log(`${family}: ${characters.length} glyphs, ${Object.keys(kerning).length} kerning pairs, embedding=${embedding}`);
