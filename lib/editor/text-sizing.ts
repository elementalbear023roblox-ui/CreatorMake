import { getRobloxFontDefinition, suggestRobloxNativeFamily } from "../roblox/fonts.ts";
import type { EdgeInsets, EditorElement, EditorProject, TextSizingMode } from "./types.ts";

const positive=(value:number|undefined,fallback:number)=>Number.isFinite(value)&&Number(value)>0?Number(value):fallback;

export function designFontSize(element:EditorElement){return positive(element.fontSizeDesign,positive(element.fontSize,18));}

export function textSizingMode(element:EditorElement):TextSizingMode{return element.textSizingMode==="responsive"?"responsive":element.textSizingMode==="fit-geometry"?"fit-geometry":"fixed";}

export function textPadding(element:EditorElement):EdgeInsets{
  const fallback=Math.max(0,Number.isFinite(element.padding)?element.padding:0),value=element.textPadding;
  return{top:Math.max(0,Number(value?.top??fallback)||0),right:Math.max(0,Number(value?.right??fallback)||0),bottom:Math.max(0,Number(value?.bottom??fallback)||0),left:Math.max(0,Number(value?.left??fallback)||0)};
}

export function responsiveTextBounds(element:EditorElement){
  const design=designFontSize(element),min=positive(element.responsiveMinTextSize,Math.min(8,design)),max=Math.max(min,positive(element.responsiveMaxTextSize,design));
  return{min,max};
}

export type NativeTextMeasurement={width:number;height:number;family:string;source:"browser-font-metrics"|"deterministic-family-metrics"};
const familyWidthFactors:Record<string,number>={"press start 2p":.62,"roboto condensed":.47,"builder extended":.61,"builder mono":.6,"roboto mono":.6,"inconsolata":.6,"bangers":.52,"oswald":.49,"amatic sc":.47,"luckiest guy":.57,"fredoka one":.56,"builder sans":.53,"roboto":.52};
const normalizedFamily=(value:string)=>value.trim().toLowerCase();
export function robloxPreviewFontFamily(element:Pick<EditorElement,"fontFamily">){const mapped=suggestRobloxNativeFamily(element.fontFamily),definition=getRobloxFontDefinition(mapped);return definition?.webPreviewFamily??definition?.family??mapped;}
const transformedText=(element:Pick<EditorElement,"text"|"textTransform">)=>element.textTransform==="uppercase"?element.text.toUpperCase():element.textTransform==="lowercase"?element.text.toLowerCase():element.textTransform==="capitalize"?element.text.replace(/\b\p{L}/gu,(value)=>value.toUpperCase()):element.text;
function deterministicLineWidth(line:string,size:number,family:string,letterSpacing:number,wordSpacing:number){const base=familyWidthFactors[normalizedFamily(family)]??.53;let width=0;for(const glyph of line){const factor=/\s/.test(glyph)?.34:/[ilI1|!.,'`]/.test(glyph)?.27:/[MW@#%&]/.test(glyph)?.86:/[A-Z0-9]/.test(glyph)?base*1.08:base;width+=size*factor;}return width+Math.max(0,line.length-1)*letterSpacing+(line.match(/\s/g)?.length??0)*wordSpacing;}

/** Measures the mapped Roblox face in the browser and uses deterministic family metrics during server/test execution. */
export function measureNativeText(element:EditorElement,size:number):NativeTextMeasurement{
  const family=robloxPreviewFontFamily(element),lines=(transformedText(element)||" ").split(/\r?\n/),stroke=Math.max(0,element.textStrokeWidth),lineHeight=Math.max(.6,element.lineHeight),letterSpacing=Number(element.letterSpacing)||0,wordSpacing=Number(element.wordSpacing)||0;
  if(typeof document!=="undefined"){
    const context=document.createElement("canvas").getContext("2d");
    if(context){context.font=`${element.fontStyle} ${element.fontWeight} ${size}px ${JSON.stringify(family)}`;const metrics=lines.map((line)=>context.measureText(line||" ")),widths=metrics.map((item,index)=>item.width+Math.max(0,lines[index].length-1)*letterSpacing+(lines[index].match(/\s/g)?.length??0)*wordSpacing),glyphHeight=Math.max(size,...metrics.map((item)=>item.actualBoundingBoxAscent+item.actualBoundingBoxDescent).filter(Number.isFinite)),height=glyphHeight+(lines.length-1)*size*lineHeight;return{width:Math.max(0,...widths)+stroke*2,height:Math.max(size,height)+stroke*2,family,source:"browser-font-metrics"};}
  }
  return{width:Math.max(0,...lines.map((line)=>deterministicLineWidth(line,size,family,letterSpacing,wordSpacing)))+stroke*2,height:Math.max(size,lines.length*size*lineHeight)+stroke*2,family,source:"deterministic-family-metrics"};
}

export function fitTextToCaption(element:EditorElement,safeWidth:number,safeHeight:number){
  const min=Math.max(1,Number(element.fitMinTextSize)||8),max=Math.max(min,Number(element.fitMaxTextSize)||Math.max(48,designFontSize(element))),availableWidth=Math.max(0,safeWidth),availableHeight=Math.max(0,safeHeight),fits=(size:number)=>{const measured=measureNativeText(element,size);return measured.width<=availableWidth+.001&&measured.height<=availableHeight+.001;};
  if(!fits(min))return{size:min,measurement:measureNativeText(element,min),availableWidth,availableHeight,clamped:"min" as const};
  let low=min,high=max;for(let index=0;index<18;index++){const middle=(low+high)/2;if(fits(middle))low=middle;else high=middle;}const size=Math.floor(low*4)/4;return{size,measurement:measureNativeText(element,size),availableWidth,availableHeight,clamped:size>=max-.25?"max" as const:"fit" as const};
}

export function textContentBounds(element:EditorElement){
  const padding=textPadding(element);
  return{x:padding.left,y:padding.top,width:Math.max(0,element.width-padding.left-padding.right),height:Math.max(0,element.height-padding.top-padding.bottom),padding};
}

export function synchronizeTextSizingMutation(before:EditorProject,after:EditorProject){
  const previousById=new Map(before.elements.map((element)=>[element.id,element]));
  for(const element of after.elements){
    const previous=previousById.get(element.id),isText=element.type==="text"||element.type==="button"||element.textInput;
    if(!isText)continue;
    if(!previous){
      element.fontSizeDesign=positive(element.fontSize,designFontSize(element));
      element.fontSize=element.fontSizeDesign;
      const legacyPadding=Math.max(0,Number.isFinite(element.padding)?element.padding:0);
      if(!element.textPadding||Object.values(element.textPadding).every((value)=>value===12)&&legacyPadding!==12)element.textPadding={top:legacyPadding,right:legacyPadding,bottom:legacyPadding,left:legacyPadding};
      element.textSizingMode=element.autoFit||element.textSizingMode==="responsive"?"responsive":element.textSizingMode==="fit-geometry"?"fit-geometry":"fixed";
    }else{
      const sizeChanged=element.fontSize!==previous.fontSize,designChanged=element.fontSizeDesign!==previous.fontSizeDesign;
      if(sizeChanged&&!designChanged)element.fontSizeDesign=positive(element.fontSize,designFontSize(previous));
      else if(designChanged)element.fontSize=positive(element.fontSizeDesign,designFontSize(previous));
      else{element.fontSizeDesign=designFontSize(element);element.fontSize=element.fontSizeDesign;}
      const modeChanged=element.textSizingMode!==previous.textSizingMode,legacyModeChanged=element.autoFit!==previous.autoFit;
      if(!modeChanged&&legacyModeChanged)element.textSizingMode=element.autoFit?"responsive":"fixed";
      const paddingUnchanged=(["top","right","bottom","left"] as const).every((edge)=>element.textPadding?.[edge]===previous.textPadding?.[edge]);
      if(element.padding!==previous.padding&&paddingUnchanged){const inset=Math.max(0,element.padding);element.textPadding={top:inset,right:inset,bottom:inset,left:inset};}
    }
    element.autoFit=element.textSizingMode==="responsive";
    element.fitMinTextSize=Math.max(1,Number(element.fitMinTextSize)||8);element.fitMaxTextSize=Math.max(element.fitMinTextSize,Number(element.fitMaxTextSize)||Math.max(48,element.fontSizeDesign));element.fitMinHorizontalPadding=Math.max(0,Number(element.fitMinHorizontalPadding)||0);element.fitMinVerticalPadding=Math.max(0,Number(element.fitMinVerticalPadding)||0);element.sharedCaptionSize=Boolean(element.sharedCaptionSize);element.sharedCaptionGroup=String(element.sharedCaptionGroup??"").trim();
    const bounds=responsiveTextBounds(element);element.responsiveMinTextSize=bounds.min;element.responsiveMaxTextSize=bounds.max;
    element.textPadding=textPadding(element);
  }
}
