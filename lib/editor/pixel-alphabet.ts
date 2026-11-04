export type PixelGlyphSource="reference"|"style-extension";
export type PixelGlyphDefinition={character:string;rows:string[];source:PixelGlyphSource;confidence:"exact"|"extended";advance:number};
export type PixelPoint={x:number;y:number};
export type PixelContour={outer:PixelPoint[];holes:PixelPoint[][]};

const REFERENCE_ROWS:Record<string,string[]>={
  A:[".####.","##..##","##..##","##..##","######","##..##","##..##"],B:["#####.","##..##","##..##","#####.","##..##","##..##","#####."],C:[".####.","##..##","##....","##....","##....","##..##",".####."],D:["#####.","##..##","##..##","##..##","##..##","##..##","#####."],E:["######","##....","##....","####..","##....","##....","######"],F:["######","##....","##....","####..","##....","##....","##...."],G:[".####.","##..##","##....","##.###","##..##","##..##",".#####"],H:["##..##","##..##","##..##","######","##..##","##..##","##..##"],I:["######","..##..","..##..","..##..","..##..","..##..","######"],J:["..#####","....##.","....##.","....##.","....##.","##..##.",".####.."],K:["##..##","##.##.","####..","###...","####..","##.##.","##..##"],L:["##....","##....","##....","##....","##....","##....","######"],M:["##...##","##...##","###.###","#######","##.#.##","##...##","##...##"],N:["##..##","##..##","###.##","######","##.###","##..##","##..##"],O:[".####.","##..##","##..##","##..##","##..##","##..##",".####."],P:["#####.","##..##","##..##","##..##","#####.","##....","##...."],Q:[".####.","##..##","##..##","###.##","######","##.##.",".##.##"],R:["#####.","##..##","##..##","##..##","#####.","##.##.","##..##"],S:[".####.","##..##","##....",".####.","....##","##..##",".####."],T:["######","..##..","..##..","..##..","..##..","..##..","..##.."],U:["##..##","##..##","##..##","##..##","##..##","##..##",".####."],V:["##..##","##..##","##..##","##..##","##..##",".####.","..##.."],W:["##...##","##...##","##.#.##","##.#.##","##.#.##","##.#.##",".##.##."],X:["##..##","##..##",".####.","..##..",".####.","##..##","##..##"],Y:["##..##","##..##",".####.","..##..","..##..","..##..","..##.."],Z:["######","....##","...##.","..##..",".##...","##....","######"],
  a:[".####.","....##",".#####","##..##",".#####"],b:["##....","##....","#####.","##..##","##..##","##..##","#####."],c:[".####.","##..##","##....","##..##",".####."],d:["....##","....##",".#####","##..##","##..##","##..##",".#####"],e:[".####.","##..##","######","##....",".####."],f:["..###",".##..","#####",".##..",".##..",".##..",".##.."],g:[".#####","##..##","##..##",".#####","....##",".####."],h:["##....","##....","#####.","##..##","##..##","##..##","##..##"],i:["..##..","......","####..","..##..","..##..","..##..","######"],j:["....##","......","..####","....##","....##","....##","##..##",".####."],k:["##....","##....","##.##.","####..","####..","##.##.","##..##"],l:["####..","..##..","..##..","..##..","..##..","..##..","######"],m:["###.##.","##.#.##","##.#.##","##...##","##...##"],n:["#####.","##..##","##..##","##..##","##..##"],o:[".####.","##..##","##..##","##..##",".####."],p:["#####.","##..##","##..##","#####.","##....","##...."],q:[".#####","##..##","##..##",".#####","....##","....##"],r:["##..##","##.###","###...","##....","##...."],s:[".####.","##....",".####.","....##","#####."],t:[".##..","#####",".##..",".##..",".##..","..###"],u:["##..##","##..##","##..##","##..##",".####."],v:["##..##","##..##","##..##",".####.","..##.."],w:["##...##","##...##","##.#.##","##.#.##",".##.##."],x:["##..##",".####.","..##..",".####.","##..##"],y:["##..##","##..##","##..##",".#####","....##",".####."],z:["######","...##.","..##..",".##...","######"],
  "0":[".####.","##..##","##.###","######","###.##","##..##",".####."],"1":["..##..",".###..","####..","#.##..","..##..","..##..","######"],"2":[".####.","##..##","....##","...##.","..##..",".##...","######"],"3":[".####.","##..##","....##","..###.","....##","##..##",".####."],"4":["...###","..####",".##.##","##..##","######","....##","....##"],
};

const EXTENSION_ROWS:Record<string,string[]>={
  "5":["######","##....","#####.","....##","....##","##..##",".####."],"6":[".####.","##....","#####.","##..##","##..##","##..##",".####."],"7":["######","....##","...##.","..##..",".##...",".##...",".##..."],"8":[".####.","##..##","##..##",".####.","##..##","##..##",".####."],"9":[".####.","##..##","##..##",".#####","....##","....##",".####."],
  ".":["..","..","..","..","..","##","##"],",":["...","...","...","...",".##",".##","##."],"!":["##","##","##","##","##","..","##"],"?":[".####.","##..##","....##","...##.","..##..","......","..##.."],"-":["......","......","......","######","......","......","......"],"+":["......","..##..","..##..","######","..##..","..##..","......"],":":["..","##","##","..","##","##",".."],
};

const definition=(character:string,rows:string[],source:PixelGlyphSource):PixelGlyphDefinition=>({character,rows,source,confidence:source==="reference"?"exact":"extended",advance:Math.max(...rows.map((row)=>row.length),1)+2});
export const PIXEL_GLYPHS:Record<string,PixelGlyphDefinition>=Object.fromEntries([...Object.entries(REFERENCE_ROWS).map(([character,rows])=>[character,definition(character,rows,"reference")]),...Object.entries(EXTENSION_ROWS).map(([character,rows])=>[character,definition(character,rows,"style-extension")])]);
export const REFERENCE_PIXEL_CHARACTERS="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz01234";
export const EXTENDED_PIXEL_CHARACTERS="56789.,!?-+:";
export const PIXEL_REFERENCE_LIMITATIONS="A-Z, a-z, and 0-4 are fully visible in the supplied crop. The 5 is clipped and 6-9 plus punctuation are matching-style extensions, not claimed reference matches.";

export function pixelGlyph(character:string){return PIXEL_GLYPHS[character]??PIXEL_GLYPHS["?"];}
export function pixelGlyphDimensions(character:string){const glyph=pixelGlyph(character),width=Math.max(...glyph.rows.map((row)=>row.length),1),height=glyph.rows.length;return{width,height,advance:glyph.advance};}

const pointKey=(point:PixelPoint)=>`${point.x},${point.y}`;
const area=(points:PixelPoint[])=>points.reduce((sum,point,index)=>{const next=points[(index+1)%points.length];return sum+point.x*next.y-next.x*point.y;},0)/2;
const inside=(point:PixelPoint,polygon:PixelPoint[])=>{let hit=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],cross=(a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y||Number.EPSILON)+a.x;if(cross)hit=!hit;}return hit;};
const simplify=(points:PixelPoint[])=>points.filter((point,index)=>{const before=points[(index+points.length-1)%points.length],after=points[(index+1)%points.length];return(before.x-point.x)*(point.y-after.y)!==(before.y-point.y)*(point.x-after.x);});

export function pixelGlyphContours(character:string):PixelContour[]{
  const glyph=pixelGlyph(character),height=glyph.rows.length,width=Math.max(...glyph.rows.map((row)=>row.length),1),filled=(x:number,y:number)=>y>=0&&y<height&&x>=0&&glyph.rows[y]?.[x]==="#",edges:Array<{from:PixelPoint;to:PixelPoint;direction:number}>=[];
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(filled(x,y)){
    if(!filled(x,y-1))edges.push({from:{x,y},to:{x:x+1,y},direction:0});
    if(!filled(x+1,y))edges.push({from:{x:x+1,y},to:{x:x+1,y:y+1},direction:1});
    if(!filled(x,y+1))edges.push({from:{x:x+1,y:y+1},to:{x,y:y+1},direction:2});
    if(!filled(x-1,y))edges.push({from:{x,y:y+1},to:{x,y},direction:3});
  }
  const outgoing=new Map<string,number[]>();edges.forEach((edge,index)=>outgoing.set(pointKey(edge.from),[...(outgoing.get(pointKey(edge.from))??[]),index]));const unused=new Set(edges.map((_,index)=>index)),loops:PixelPoint[][]=[];
  while(unused.size){const first=unused.values().next().value as number,start=edges[first],points=[start.from],startKey=pointKey(start.from);let current=first,direction=start.direction;
    while(unused.has(current)){const edge=edges[current];unused.delete(current);points.push(edge.to);if(pointKey(edge.to)===startKey)break;const candidates=(outgoing.get(pointKey(edge.to))??[]).filter((index)=>unused.has(index)),order=[(direction+1)%4,direction,(direction+3)%4,(direction+2)%4];current=candidates.sort((a,b)=>order.indexOf(edges[a].direction)-order.indexOf(edges[b].direction))[0];if(current===undefined)break;direction=edges[current].direction;}
    const loop=simplify(points.slice(0,-1));if(loop.length>=3)loops.push(loop);
  }
  const outers=loops.filter((loop)=>area(loop)>0),holes=loops.filter((loop)=>area(loop)<0);return outers.map((outer)=>({outer,holes:holes.filter((hole)=>inside(hole[0],outer))}));
}

export type PixelComposerSettings={text:string;letterSpacing:number;wordSpacing:number;lineSpacing:number;alignment:"left"|"center"|"right";scale:number;depth:number;material:string;letterRotation:number;groupRotation:number;perspective:number};
export const DEFAULT_PIXEL_COMPOSER:PixelComposerSettings={text:"CREATOR",letterSpacing:12,wordSpacing:36,lineSpacing:24,alignment:"left",scale:1,depth:56,material:"retro-plastic",letterRotation:0,groupRotation:0,perspective:35};
export type PixelComposerPlacement={character:string;index:number;line:number;x:number;y:number;width:number;height:number};
export function layoutPixelComposer(settings:PixelComposerSettings):{placements:PixelComposerPlacement[];width:number;height:number}{
  const unit=24*Math.max(.25,settings.scale),lineHeight=190*Math.max(.25,settings.scale),letterWidth=(character:string)=>Math.max(72,pixelGlyphDimensions(character).advance*unit/8),lines=String(settings.text||"").replace(/\r/g,"").split("\n").slice(0,8),widths=lines.map((line)=>[...line].reduce((sum,character)=>sum+(character===" "?settings.wordSpacing:letterWidth(character)+settings.letterSpacing),0)),overallWidth=Math.max(1,...widths),placements:PixelComposerPlacement[]=[];let index=0;
  lines.forEach((line,lineIndex)=>{let x=settings.alignment==="center"?(overallWidth-widths[lineIndex])/2:settings.alignment==="right"?overallWidth-widths[lineIndex]:0;for(const character of line){if(character===" "){x+=settings.wordSpacing;continue;}const width=letterWidth(character),height=lineHeight;placements.push({character,index:index++,line:lineIndex,x,y:lineIndex*(lineHeight+settings.lineSpacing),width,height});x+=width+settings.letterSpacing;}});return{placements,width:overallWidth,height:Math.max(lineHeight,lines.length*lineHeight+Math.max(0,lines.length-1)*settings.lineSpacing)};
}
