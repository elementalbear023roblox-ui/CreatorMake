import { elementBackground } from "../editor/render.ts";
import { geometryPresentation, openGeometryStrokeWidth, usesVectorSurface } from "../editor/geometry.ts";
import { rasterizeWithCreatorMakeRenderer } from "../editor/canvas-rasterizer.ts";
import { designFontSize, textPadding, textSizingMode } from "../editor/text-sizing.ts";
import { CREATOR_FONTS, creatorFontRasterStyle, hasLoadedCreatorFontFace, loadCreatorFont, resolveCreatorFontVariant } from "../fonts/font-library.ts";
import type { CreatorFont, FontLoadStatus } from "../fonts/font-library.ts";
import type { EditorAsset, EditorElement, EditorProject } from "../editor/types.ts";
import { classifyRobloxElement, classifyTextExport, hasVisibleTextBackground } from "./classification.ts";
import type { RobloxExportOptions, RobloxRasterPart, RobloxRenderAsset, RobloxRenderAssetRole, RobloxRenderScale } from "./types.ts";

export type RobloxAssetMappings = Record<string,string>;
// Bump whenever canonical geometry interpretation changes so IndexedDB cannot
// reuse a pre-fidelity rectangular raster for an unchanged custom path.
const RENDERER_VERSION=13;
const MAX_EDITABLE_IMAGE_DIMENSION=1024;
const SAMPLE_POINTS=[
  {label:"10%,10%",normalizedX:.1,normalizedY:.1},
  {label:"90%,10%",normalizedX:.9,normalizedY:.1},
  {label:"10%,90%",normalizedX:.1,normalizedY:.9},
  {label:"90%,90%",normalizedX:.9,normalizedY:.9},
  {label:"50%,50%",normalizedX:.5,normalizedY:.5},
] as const;

const stable=(value:unknown):string=>{
  if(value===null||typeof value!=="object")return JSON.stringify(value);
  if(Array.isArray(value))return`[${value.map(stable).join(",")}]`;
  return`{${Object.entries(value as Record<string,unknown>).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>`${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
};
const hash=(value:unknown)=>{let result=2166136261;const text=stable(value);for(let index=0;index<text.length;index++){result^=text.charCodeAt(index);result=Math.imul(result,16777619);}return`v${(result>>>0).toString(16).padStart(8,"0")}`;};
const esc=(value:string)=>value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
const css=(value:string)=>value.replaceAll("&","&amp;").replaceAll('"',"&quot;").replaceAll("<","&lt;");
const px=(value:number)=>Number.isFinite(value)?Number(value.toFixed(3)):0;
const validAssetId=(value?:string)=>/^rbxassetid:\/\/\d+$/.test(value??"");
const mappingKey=(sourceId:string,visualHash:string)=>`${sourceId}:${visualHash}`;

export function normalizeRobloxAssetId(value:string){const trimmed=value.trim();if(/^\d+$/.test(trimmed))return`rbxassetid://${trimmed}`;return validAssetId(trimmed)?trimmed:"";}
export function assetMappingKey(sourceId:string,visualHash:string){return mappingKey(sourceId,visualHash);}

const sharedTextObjectScale=(element:EditorElement,visualPart:RobloxRasterPart)=>{
  if((element.type!=="text"&&element.type!=="button")||visualPart==="full")return 1;
  return Number.isFinite(element.scaleX)&&element.scaleX>0&&Math.abs(element.scaleX-element.scaleY)<.0001?element.scaleX:1;
};
const rasterElementForPart=(element:EditorElement,visualPart:RobloxRasterPart)=>sharedTextObjectScale(element,visualPart)!==1?{...element,scaleX:1,scaleY:1}:element;

export function visualStateForElement(element:EditorElement,visualPart:RobloxRasterPart="full"){
  const splitTextVisual=(element.type==="text"||element.type==="button")&&visualPart!=="full",rasterElement=rasterElementForPart(element,visualPart),advancedTransform={scaleX:rasterElement.scaleX,scaleY:rasterElement.scaleY,rotation:splitTextVisual?0:element.rotation,rotateX:element.rotateX,rotateY:element.rotateY,skewX:element.skewX,skewY:element.skewY,perspective:element.perspective,perspectiveOriginX:element.perspectiveOriginX,perspectiveOriginY:element.perspectiveOriginY,translateZ:element.translateZ,z:element.z,originX:element.originX,originY:element.originY};
  const surface={
    type:element.type,width:element.width,height:element.height,opacity:element.opacity,
    fill:element.fill,borderColor:element.borderColor,borderWidth:element.borderWidth,cornerRadius:element.cornerRadius,corners:element.corners,cornerTypes:element.cornerTypes,
    geometry:element.geometry,booleanOperation:element.booleanOperation,booleanOperands:element.booleanOperands,
    gradientType:element.gradientType,gradientAngle:element.gradientAngle,gradientStops:element.gradientStops,gradientPoints:element.gradientPoints,fourCornerColors:element.fourCornerColors,
    blendMode:element.blendMode,shadow:element.shadow,padding:element.padding,clipContent:element.clipContent,advancedTransform,
    image:{assetId:element.imageAssetId,fit:element.imageFit,crop:element.imageCrop,offsetX:element.imageOffsetX,offsetY:element.imageOffsetY,scale:element.imageScale,scaleX:element.imageScaleX,scaleY:element.imageScaleY,rotation:element.imageRotation,opacity:element.imageOpacity,flipX:element.imageFlipX,flipY:element.imageFlipY,tileWidth:element.imageTileWidth,tileHeight:element.imageTileHeight,brightness:element.imageBrightness,contrast:element.imageContrast,saturation:element.imageSaturation,hue:element.imageHue,blur:element.imageBlur,tint:element.imageTint,tintOpacity:element.imageTintOpacity,sliceCenter:element.sliceCenter},
  };
  if(visualPart==="background")return{...surface,visualPart};
  const text={type:element.type,width:element.width,height:element.height,opacity:element.opacity,padding:textPadding(element),clipContent:element.clipContent,advancedTransform,visualPart,
    text:element.text,textColor:element.textColor,fontFamily:element.fontFamily,fontSizeDesign:designFontSize(element),textSizingMode:textSizingMode(element),fontWeight:element.fontWeight,fontStyle:element.fontStyle,
    lineHeight:element.lineHeight,letterSpacing:element.letterSpacing,wordSpacing:element.wordSpacing,paragraphSpacing:element.paragraphSpacing,verticalAlign:element.verticalAlign,
    textTransform:element.textTransform,textDecoration:element.textDecoration,textStrokeColor:element.textStrokeColor,textStrokeWidth:element.textStrokeWidth,textStrokeOpacity:element.textStrokeOpacity,textStrokePosition:element.textStrokePosition,textShadows:element.textShadows,textBoxMode:element.textBoxMode,autoFit:element.autoFit,textAlign:element.textAlign,
  };
  return visualPart==="text"?text:{...surface,...text};
}

export function layoutStateForElement(element:EditorElement){
  return {parentId:element.parentId,x:element.x,y:element.y,width:element.width,height:element.height,anchorX:element.anchorX,anchorY:element.anchorY,rotation:element.rotation,zIndex:element.zIndex,hidden:element.hidden,locked:element.locked,constraints:element.constraints};
}

export const visualHash=(element:EditorElement,visualPart:RobloxRasterPart="full",assetHash="")=>hash({rendererVersion:RENDERER_VERSION,visual:visualStateForElement(element,visualPart),assetHash});
export const layoutHash=(element:EditorElement)=>hash(layoutStateForElement(element));

const roleFor=(element:EditorElement):RobloxRenderAssetRole=>element.type==="frame"||element.type==="container"||element.type==="scrolling-frame"?"frame-visual":element.type==="text"?"text":element.type==="button"||element.type==="image-button"?"button":element.type==="image"?"image":"shape";
const effectPadding=(value:string)=>{const numbers=value.match(/-?[\d.]+(?=px)/g)?.map(Number)??[];if(!value||value==="none"||!numbers.length)return 0;const[x=0,y=0,blur=0,spread=0]=numbers;return Math.min(96,Math.max(Math.abs(x),Math.abs(y))+Math.max(0,blur)+Math.max(0,spread));};
const shadowPadding=(element:EditorElement,visualPart:RobloxRasterPart)=>{
  const includeSurface=visualPart!=="text",includeText=visualPart!=="background"&&(element.type==="text"||element.type==="button");
  return Math.ceil(Math.max(includeSurface?effectPadding(element.shadow):0,...(includeText?element.textShadows.map(effectPadding):[]),includeText?element.textStrokeWidth:0,includeSurface&&geometryPresentation(element).open?openGeometryStrokeWidth(element)/2:0));
};

type Box={minX:number;minY:number;maxX:number;maxY:number};
const includePoint=(box:Box,x:number,y:number)=>{box.minX=Math.min(box.minX,x);box.minY=Math.min(box.minY,y);box.maxX=Math.max(box.maxX,x);box.maxY=Math.max(box.maxY,y);};
function svgPathBounds(path:string):Box|undefined{
  const tokens=path.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)??[];if(!tokens.length)return;
  const box:Box={minX:Infinity,minY:Infinity,maxX:-Infinity,maxY:-Infinity};let index=0,command="",x=0,y=0,startX=0,startY=0;
  const isCommand=(value:string)=>/^[a-zA-Z]$/.test(value),number=()=>Number(tokens[index++]),available=(count:number)=>index+count<=tokens.length&&!isCommand(tokens[index]);
  while(index<tokens.length){if(isCommand(tokens[index]))command=tokens[index++];if(!command)break;const relative=command===command.toLowerCase(),upper=command.toUpperCase();
    if(upper==="Z"){x=startX;y=startY;includePoint(box,x,y);command="";continue;}
    const arity:{[key:string]:number}={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7},count=arity[upper];if(!count||!available(count)){command="";continue;}
    do{
      const values=Array.from({length:count},number),point=(px:number,py:number)=>({x:relative?x+px:px,y:relative?y+py:py});
      if(upper==="M"||upper==="L"||upper==="T"){const end=point(values[0],values[1]);x=end.x;y=end.y;includePoint(box,x,y);if(upper==="M"){startX=x;startY=y;command=relative?"l":"L";}}
      else if(upper==="H"){x=relative?x+values[0]:values[0];includePoint(box,x,y);}
      else if(upper==="V"){y=relative?y+values[0]:values[0];includePoint(box,x,y);}
      else if(upper==="C"){const c1=point(values[0],values[1]),c2=point(values[2],values[3]),end=point(values[4],values[5]);includePoint(box,c1.x,c1.y);includePoint(box,c2.x,c2.y);x=end.x;y=end.y;includePoint(box,x,y);}
      else if(upper==="S"||upper==="Q"){const control=point(values[0],values[1]),end=point(values[2],values[3]);includePoint(box,control.x,control.y);x=end.x;y=end.y;includePoint(box,x,y);}
      else if(upper==="A"){const rx=Math.abs(values[0]),ry=Math.abs(values[1]),end=point(values[5],values[6]);includePoint(box,x-rx,y-ry);includePoint(box,x+rx,y+ry);includePoint(box,end.x-rx,end.y-ry);includePoint(box,end.x+rx,end.y+ry);x=end.x;y=end.y;includePoint(box,x,y);}
    }while(available(count));
  }
  return Number.isFinite(box.minX)?box:undefined;
}

function canonicalArtworkBounds(element:EditorElement){
  const layout:Box={minX:0,minY:0,maxX:element.width,maxY:element.height};if(!usesVectorSurface(element))return layout;
  const presentation=geometryPresentation(element),raw=svgPathBounds(presentation.path);if(!raw)return layout;
  const scale=String(presentation.transform??"").match(/scale\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/),scaleX=scale?Number(scale[1]):1,scaleY=scale?Number(scale[2]??scale[1]):1;
  const pathBox:Box={minX:Math.min(raw.minX*scaleX,raw.maxX*scaleX),minY:Math.min(raw.minY*scaleY,raw.maxY*scaleY),maxX:Math.max(raw.minX*scaleX,raw.maxX*scaleX),maxY:Math.max(raw.minY*scaleY,raw.maxY*scaleY)},stroke=(presentation.open?openGeometryStrokeWidth(element):element.borderWidth)/2;
  return{minX:Math.min(layout.minX,pathBox.minX-stroke),minY:Math.min(layout.minY,pathBox.minY-stroke),maxX:Math.max(layout.maxX,pathBox.maxX+stroke),maxY:Math.max(layout.maxY,pathBox.maxY+stroke)};
}

export function visualBoundsForElement(element:EditorElement,visualPart:RobloxRasterPart="full"){
  const splitTextVisual=(element.type==="text"||element.type==="button")&&visualPart!=="full",rasterElement=rasterElementForPart(element,visualPart),padding=shadowPadding(element,visualPart),art=visualPart==="text"?{minX:0,minY:0,maxX:element.width,maxY:element.height}:canonicalArtworkBounds(element),originX=element.width*element.originX/100,originY=element.height*element.originY/100,skewX=Math.tan(element.skewX*Math.PI/180),skewY=Math.tan(element.skewY*Math.PI/180),a=rasterElement.scaleX*Math.cos(element.rotateY*Math.PI/180),b=skewY,c=skewX,d=rasterElement.scaleY*Math.cos(element.rotateX*Math.PI/180),angle=(splitTextVisual?0:element.rotation)*Math.PI/180,cos=Math.cos(angle),sin=Math.sin(angle),points=[[art.minX,art.minY],[art.maxX,art.minY],[art.maxX,art.maxY],[art.minX,art.maxY]].map(([x,y])=>{const tx=a*(x-originX)+c*(y-originY),ty=b*(x-originX)+d*(y-originY);return{x:originX+tx*cos-ty*sin,y:originY+tx*sin+ty*cos};}),minX=Math.min(...points.map((point)=>point.x)),maxX=Math.max(...points.map((point)=>point.x)),minY=Math.min(...points.map((point)=>point.y)),maxY=Math.max(...points.map((point)=>point.y));
  return{x:minX-padding,y:minY-padding,width:Math.max(1,maxX-minX+padding*2),height:Math.max(1,maxY-minY+padding*2)};
}

export function planPixelAccurateAssets(project:EditorProject,options:Pick<RobloxExportOptions,"renderScale">&Partial<Pick<RobloxExportOptions,"visualMode">>,mappings:RobloxAssetMappings={},previous:RobloxRenderAsset[]=[]){
  const previousBySource=new Map(previous.map((asset)=>[asset.sourceId,asset])),assetById=new Map((project.assets??[]).map((asset)=>[asset.id,asset]));
  return project.elements.filter((element)=>!element.hidden).flatMap((element):RobloxRenderAsset[]=>{
    const classification=classifyRobloxElement(element);
    if(options.visualMode==="ADAPTIVE"&&classification.classification==="NATIVE")return[];
    const textElement=element.type==="text"||element.type==="button",parts:RobloxRasterPart[]=textElement?(hasVisibleTextBackground(element)?["background"]:[]):[options.visualMode==="ADAPTIVE"?(classification.rasterPart??"full"):"full"];
    const sourceAsset=element.imageAssetId?assetById.get(element.imageAssetId):undefined;
    return parts.map((visualPart):RobloxRenderAsset=>{
      const sourceId=textElement?`${element.id}::${visualPart==="background"?"background":"pixel-text"}`:element.id,visual=visualHash(element,visualPart,sourceAsset?.contentHash),prior=previousBySource.get(sourceId),robloxAssetId=normalizeRobloxAssetId(mappings[mappingKey(sourceId,visual)]??"");
      const layoutBounds={x:0,y:0,width:element.width,height:element.height},visualBounds=visualBoundsForElement(element,visualPart),scale=Math.min(options.renderScale,MAX_EDITABLE_IMAGE_DIMENSION/Math.max(1,visualBounds.width),MAX_EDITABLE_IMAGE_DIMENSION/Math.max(1,visualBounds.height)),renderPixelWidth=Math.max(1,Math.min(MAX_EDITABLE_IMAGE_DIMENSION,Math.ceil(visualBounds.width*scale))),renderPixelHeight=Math.max(1,Math.min(MAX_EDITABLE_IMAGE_DIMENSION,Math.ceil(visualBounds.height*scale))),dirty=Boolean(prior&&prior.visualHash!==visual);
      return{sourceId,sourceElementId:element.id,elementName:visualPart==="background"?`${element.name} Background`:visualPart==="text"?`${element.name} Text`:element.name,role:visualPart==="background"&&textElement?"text-background":visualPart==="text"?"text-glyphs":roleFor(element),classification:options.visualMode==="ADAPTIVE"?classification.classification:textElement?"HYBRID":"RASTERIZED",visualPart,intendedRobloxClass:classification.intendedRobloxClass,interactionEnabled:classification.interactionEnabled,visualHash:visual,layoutHash:layoutHash(element),width:renderPixelWidth,height:renderPixelHeight,layoutWidth:element.width,layoutHeight:element.height,renderPixelWidth,renderPixelHeight,requestedScale:options.renderScale,scale,mimeType:"image/png",format:"png",layoutBounds,visualBounds,bounds:visualBounds,pixelEncoding:"RGBA8_STRAIGHT_ALPHA",robloxAssetId:robloxAssetId||undefined,status:dirty?"dirty":"needs-render",dirty};
    });
  });
}

const fontCss=(element:EditorElement)=>[
  `color:${element.textColor}`,`font-family:${JSON.stringify(element.fontFamily)}`,`font-size:${px(designFontSize(element))}px`,`font-weight:${element.fontWeight}`,`font-style:${element.fontStyle}`,
  `line-height:${px(element.lineHeight)}`,`letter-spacing:${px(element.letterSpacing)}px`,`word-spacing:${px(element.wordSpacing)}px`,`text-align:${element.textAlign}`,
  `text-transform:${element.textTransform}`,`text-decoration:${element.textDecoration}`,`text-shadow:${element.textShadows.join(",")||"none"}`,
  element.textStrokeWidth?`-webkit-text-stroke:${px(element.textStrokeWidth)}px ${element.textStrokeColor}`:"",`paint-order:stroke fill`,`white-space:${element.textBoxMode==="auto-width"?"pre":"pre-wrap"}`,
].filter(Boolean).join(";");
const alignment=(element:EditorElement)=>element.verticalAlign==="top"?"flex-start":element.verticalAlign==="bottom"?"flex-end":"center";
const advancedTransform=(element:EditorElement)=>`perspective(${px(element.perspective)}px) translateZ(${px(element.translateZ+element.z)}px) rotateX(${px(element.rotateX)}deg) rotateY(${px(element.rotateY)}deg) skew(${px(element.skewX)}deg,${px(element.skewY)}deg) scale(${px(element.scaleX)},${px(element.scaleY)})`;
const contentStyle=(element:EditorElement,includeSurface:boolean)=>{const padding=textPadding(element);return[
  `position:absolute`,`left:0`,`top:0`,`width:${px(element.width)}px`,`height:${px(element.height)}px`,`box-sizing:border-box`,`display:flex`,`overflow:${element.clipContent?"hidden":"visible"}`,
  `align-items:${alignment(element)}`,element.type==="button"?"justify-content:center":"",`padding:${px(padding.top)}px ${px(padding.right)}px ${px(padding.bottom)}px ${px(padding.left)}px`,fontCss(element),
  includeSurface?`background:${elementBackground(element)}`:"",includeSurface?`border:${px(element.borderWidth)}px solid ${element.borderColor}`:"",includeSurface?`border-radius:${px(element.corners.tl)}px ${px(element.corners.tr)}px ${px(element.corners.br)}px ${px(element.corners.bl)}px`:"",includeSurface?`box-shadow:${element.shadow}`:"",
  `opacity:${px(element.opacity/100)}`,`transform:${advancedTransform(element)}`,`transform-origin:${px(element.originX)}% ${px(element.originY)}%`,`mix-blend-mode:${element.blendMode}`,
].filter(Boolean).join(";");};

export function renderElementSvg(element:EditorElement,scale:RobloxRenderScale,visualPart:RobloxRasterPart="full"){
  const rasterElement=rasterElementForPart(element,visualPart),visualBounds=visualBoundsForElement(element,visualPart),renderWidth=Math.max(1,Math.ceil(visualBounds.width*scale)),renderHeight=Math.max(1,Math.ceil(visualBounds.height*scale)),offsetX=-visualBounds.x,offsetY=-visualBounds.y,offset=`transform:translate(${px(offsetX)}px,${px(offsetY)}px)`;
  let body:string;
  if(visualPart==="text"){
    body=`<foreignObject x="${px(offsetX)}" y="${px(offsetY)}" width="${px(element.width)}" height="${px(element.height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="${css(contentStyle(rasterElement,false))}">${esc(element.text)}</div></foreignObject>`;
  }else if(usesVectorSurface(element)){
    const geometry=geometryPresentation(element),clipId=`shape-${element.id.replace(/[^a-zA-Z0-9_-]/g,"")}`,strokeWidth=geometry.open?openGeometryStrokeWidth(element):element.borderWidth,stroke=geometry.open?(element.fill==="transparent"?element.borderColor:element.fill):element.borderColor;
    const text=visualPart==="full"&&(element.type==="button"||element.type==="text")?`<foreignObject x="${px(offsetX)}" y="${px(offsetY)}" width="${px(element.width)}" height="${px(element.height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="${css(contentStyle(element,false))}">${esc(element.text)}</div></foreignObject>`:"";
    body=`<g style="${offset}"><defs><clipPath id="${clipId}"><path d="${esc(geometry.path)}"${geometry.transform?` transform="${esc(geometry.transform)}"`:""} fill-rule="${geometry.fillRule}" clip-rule="${geometry.fillRule}"/></clipPath></defs>${geometry.open?"":`<foreignObject x="0" y="0" width="${px(element.width)}" height="${px(element.height)}" clip-path="url(#${clipId})"><div xmlns="http://www.w3.org/1999/xhtml" style="width:100%;height:100%;background:${css(elementBackground(element))};box-shadow:${css(element.shadow)}"></div></foreignObject>`}<path d="${esc(geometry.path)}"${geometry.transform?` transform="${esc(geometry.transform)}"`:""} fill="none" stroke="${esc(stroke)}" stroke-width="${px(strokeWidth)}" stroke-opacity="${stroke==="transparent"?0:1}" fill-rule="${geometry.fillRule}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></g>${text}`;
  }else{
    body=`<foreignObject x="${px(offsetX)}" y="${px(offsetY)}" width="${px(element.width)}" height="${px(element.height)}"><div xmlns="http://www.w3.org/1999/xhtml" style="${css(contentStyle(rasterElement,true))}">${visualPart==="full"&&(element.type==="button"||element.type==="text")?esc(element.text):""}</div></foreignObject>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${renderWidth}" height="${renderHeight}" viewBox="0 0 ${px(visualBounds.width)} ${px(visualBounds.height)}"><rect width="100%" height="100%" fill="none"/>${body}</svg>`;
}

export async function renderTextBackgroundVisual(element:EditorElement,requestedScale:RobloxRenderScale,asset?:EditorAsset){
  if(element.type!=="text"&&element.type!=="button")throw new Error("TEXT_BACKGROUND_RENDER_INVALID: expected a CreatorMake text or button element.");
  return rasterizeWithCreatorMakeRenderer(element,requestedScale,"background","",asset);
}

type CachedAsset=RobloxRenderAsset&{cacheKey:string};
const memory=new Map<string,CachedAsset>();
const cacheKey=(asset:RobloxRenderAsset)=>`${asset.sourceId}:${asset.visualHash}:${asset.requestedScale}:renderer-${RENDERER_VERSION}`;
let databasePromise:Promise<IDBDatabase>|null=null;
const database=()=>databasePromise??=new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open("CreatorMakeRenderCache",1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains("assets")){const store=db.createObjectStore("assets",{keyPath:"cacheKey"});store.createIndex("sourceId","sourceId");}};request.onsuccess=()=>resolve(request.result);request.onerror=()=>{databasePromise=null;reject(request.error);};});
const cachedGet=async(key:string)=>{const inMemory=memory.get(key);if(inMemory)return inMemory;if(typeof indexedDB==="undefined")return undefined;try{const db=await database(),read=new Promise<CachedAsset|undefined>((resolve,reject)=>{const request=db.transaction("assets","readonly").objectStore("assets").get(key);request.onsuccess=()=>resolve(request.result as CachedAsset|undefined);request.onerror=()=>reject(request.error);});return await Promise.race([read,new Promise<undefined>((resolve)=>setTimeout(()=>resolve(undefined),250))]);}catch{return undefined;}};
const cachedPut=async(asset:RobloxRenderAsset)=>{const value={...asset,cacheKey:cacheKey(asset)};memory.set(value.cacheKey,value);if(typeof indexedDB==="undefined")return;try{const db=await database(),write=new Promise<void>((resolve,reject)=>{const request=db.transaction("assets","readwrite").objectStore("assets").put(value);request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);});await Promise.race([write,new Promise<void>((resolve)=>setTimeout(resolve,250))]);}catch{/* Memory cache still provides deterministic reuse for this session. */}};

export type PixelExportFontDebug={requestedFamily:string;requestedWeight:number;requestedStyle:"normal"|"italic";loadedFamily:string;loadedWeight:number;loadedStyle:"normal"|"italic";ready:true;embedded:true;css:string};
export type PixelExportFontRuntime={load:(font:CreatorFont,weight:number,style:"normal"|"italic")=>Promise<FontLoadStatus>;loadDescriptor:(descriptor:string,text:string)=>Promise<number>;hasLoadedFace:(family:string,weight?:number,style?:"normal"|"italic")=>boolean;rasterStyle:(font:CreatorFont,weight:number,style:"normal"|"italic",text:string)=>Promise<string>};
const defaultFontRuntime:PixelExportFontRuntime={load:loadCreatorFont,loadDescriptor:async(descriptor,text)=>(await document.fonts.load(descriptor,text)).length,hasLoadedFace:hasLoadedCreatorFontFace,rasterStyle:creatorFontRasterStyle};

export async function ensurePixelExportFont(element:EditorElement,runtime:PixelExportFontRuntime=defaultFontRuntime):Promise<PixelExportFontDebug|undefined>{
  if(element.type!=="text"&&element.type!=="button")return;
  const registered=CREATOR_FONTS.find((font)=>font.id===element.fontId&&font.family===element.fontFamily);
  if(!registered)throw new Error(`FONT_RENDER_BLOCKED: Font failed to load: ${element.fontFamily}`);
  const variant=resolveCreatorFontVariant(registered,element.fontWeight,element.fontStyle);
  const result=await runtime.load(registered,variant.weight,variant.style);
  if(result!=="loaded")throw new Error(`FONT_RENDER_BLOCKED: Font failed to load: ${element.fontFamily} ${variant.weight} ${variant.style}`);
  const sample=element.text||"CreatorMake",descriptor=`${variant.style} ${variant.weight} ${Math.max(1,designFontSize(element))}px ${JSON.stringify(element.fontFamily)}`;
  const faceCount=await runtime.loadDescriptor(descriptor,sample);
  if(faceCount<1||!runtime.hasLoadedFace(element.fontFamily,variant.weight,variant.style))throw new Error(`FONT_RENDER_BLOCKED: Font fallback detected: ${element.fontFamily}`);
  let css:string;try{css=await runtime.rasterStyle(registered,variant.weight,variant.style,sample);}catch(error){throw new Error(`FONT_RENDER_BLOCKED: Font failed to embed: ${element.fontFamily}. ${error instanceof Error?error.message:String(error)}`);}
  if(!css.includes("@font-face"))throw new Error(`FONT_RENDER_BLOCKED: Font failed to embed: ${element.fontFamily}`);
  return{requestedFamily:element.fontFamily,requestedWeight:element.fontWeight,requestedStyle:element.fontStyle,loadedFamily:registered.family,loadedWeight:variant.weight,loadedStyle:variant.style,ready:true,embedded:true,css};
}

const sampleCanvas=(canvas:HTMLCanvasElement)=>{const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("Canvas 2D rendering is unavailable.");const image=context.getImageData(0,0,canvas.width,canvas.height);return SAMPLE_POINTS.map((sample)=>{const pixelX=Math.max(0,Math.min(canvas.width-1,Math.round(sample.normalizedX*(canvas.width-1)))),pixelY=Math.max(0,Math.min(canvas.height-1,Math.round(sample.normalizedY*(canvas.height-1)))),index=(pixelY*canvas.width+pixelX)*4;return{...sample,pixelX,pixelY,rgba:[image.data[index],image.data[index+1],image.data[index+2],image.data[index+3]] as [number,number,number,number]};});};

export async function renderPixelAccurateAssets(project:EditorProject,options:Pick<RobloxExportOptions,"renderScale">&Partial<Pick<RobloxExportOptions,"visualMode">>,mappings:RobloxAssetMappings={},previous:RobloxRenderAsset[]=[],onProgress?:(assets:RobloxRenderAsset[])=>void){
  const plans=planPixelAccurateAssets(project,options,mappings,previous),byId=new Map(project.elements.map((element)=>[element.id,element])),assetById=new Map((project.assets??[]).map((asset)=>[asset.id,asset])),previousBySource=new Map(previous.map((asset)=>[asset.sourceId,asset])),results:RobloxRenderAsset[]=[];
  for(let planIndex=0;planIndex<plans.length;planIndex++){
    const plan=plans[planIndex];
    const key=cacheKey(plan),cached=await cachedGet(key),mapping=normalizeRobloxAssetId(mappings[mappingKey(plan.sourceId,plan.visualHash)]??"");
    if(cached?.dataUrl){const prior=previousBySource.get(plan.sourceId),samePrior=prior?.visualHash===plan.visualHash?prior:undefined;results.push({...plan,...cached,layoutHash:plan.layoutHash,layoutWidth:plan.layoutWidth,layoutHeight:plan.layoutHeight,layoutBounds:plan.layoutBounds,requestedScale:plan.requestedScale,visualHash:plan.visualHash,dataUrl:cached.dataUrl,pixelSamples:cached.pixelSamples,renderedAt:cached.renderedAt,localPath:samePrior?.localPath??cached.localPath,localUrl:samePrior?.localUrl??cached.localUrl,robloxAssetId:mapping||undefined,status:mapping?"mapped":"needs-publish",dirty:false});onProgress?.([...results,...plans.slice(planIndex+1)]);continue;}
    const element=byId.get(plan.sourceElementId??plan.sourceId);if(!element)continue;
    const rendering={...plan,status:"rendering" as const};results.push(rendering);onProgress?.([...results,...plans.slice(planIndex+1)]);
    try{
      const font=(plan.visualPart??"full")!=="background"?await ensurePixelExportFont(element):undefined;
      if(font)console.info(`[CreatorMake Export Font] Element: ${element.name} | Requested: ${font.requestedFamily} ${font.requestedWeight} ${font.requestedStyle} | Loaded: ${font.loadedFamily} ${font.loadedWeight} ${font.loadedStyle} | Ready: YES | Embedded: YES`);
      const rendered=plan.visualPart==="background"&&(element.type==="text"||element.type==="button")
        ?await renderTextBackgroundVisual(element,plan.requestedScale,element.imageAssetId?assetById.get(element.imageAssetId):undefined)
        :await rasterizeWithCreatorMakeRenderer(element,plan.requestedScale,plan.visualPart??"full",font?.css??"",element.imageAssetId?assetById.get(element.imageAssetId):undefined);
      const asset:RobloxRenderAsset={...plan,dataUrl:rendered.dataUrl,sourceDataUrl:rendered.sourceDataUrl,differenceDataUrl:rendered.differenceDataUrl,fidelity:rendered.fidelity,width:rendered.width,height:rendered.height,renderPixelWidth:rendered.renderPixelWidth,renderPixelHeight:rendered.renderPixelHeight,scale:rendered.scale,visualBounds:rendered.visualBounds,bounds:rendered.visualBounds,pixelSamples:sampleCanvas(rendered.canvas),renderedAt:Date.now(),robloxAssetId:mapping||undefined,status:mapping?"mapped":"needs-publish",dirty:false};
      const fidelity=asset.fidelity;if(!fidelity)throw new Error("EXPORT FIDELITY FAILURE: renderer returned no fidelity report.");
      console.info(`[CreatorMake Export Fidelity] Element: ${element.name} | Geometry: ${geometryPresentation(element).open?"OpenPath":element.geometry.kind} | Match: ${fidelity.matchPercent}% | Bounds Match: ${fidelity.boundsMatch?"PASS":"FAIL"} | Aspect Ratio Match: ${fidelity.aspectRatioMatch?"PASS":"FAIL"} | Transform Match: ${fidelity.transformMatch?"PASS":"FAIL"} | Alpha Edges: ${fidelity.alphaEdgeSafety?"PASS":"FAIL"}`);
      if(!fidelity.passed){results[results.length-1]={...asset,status:"error",error:`EXPORT FIDELITY FAILURE: ${fidelity.matchPercent}% match (minimum ${fidelity.thresholdPercent}%).`,dirty:true};}
      else{results[results.length-1]=asset;void cachedPut(asset);}
    }
    catch(error){const message=error instanceof Error?error.message:"Render failed.";if(message==="The CreatorMake canvas renderer produced no visible pixels for this element.")results.pop();else results[results.length-1]={...plan,status:"error",error:message,dirty:true};}
    onProgress?.([...results,...plans.slice(planIndex+1)]);
  }
  return results;
}
