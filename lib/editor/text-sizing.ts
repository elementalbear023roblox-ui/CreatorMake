import type { EdgeInsets, EditorElement, EditorProject, TextSizingMode } from "./types.ts";

const positive=(value:number|undefined,fallback:number)=>Number.isFinite(value)&&Number(value)>0?Number(value):fallback;

export function designFontSize(element:EditorElement){return positive(element.fontSizeDesign,positive(element.fontSize,18));}

export function textSizingMode(element:EditorElement):TextSizingMode{return element.textSizingMode==="responsive"?"responsive":"fixed";}

export function textPadding(element:EditorElement):EdgeInsets{
  const fallback=Math.max(0,Number.isFinite(element.padding)?element.padding:0),value=element.textPadding;
  return{top:Math.max(0,Number(value?.top??fallback)||0),right:Math.max(0,Number(value?.right??fallback)||0),bottom:Math.max(0,Number(value?.bottom??fallback)||0),left:Math.max(0,Number(value?.left??fallback)||0)};
}

export function responsiveTextBounds(element:EditorElement){
  const design=designFontSize(element),min=positive(element.responsiveMinTextSize,Math.min(8,design)),max=Math.max(min,positive(element.responsiveMaxTextSize,design));
  return{min,max};
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
      element.textSizingMode=element.autoFit||element.textSizingMode==="responsive"?"responsive":"fixed";
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
    const bounds=responsiveTextBounds(element);element.responsiveMinTextSize=bounds.min;element.responsiveMaxTextSize=bounds.max;
    element.textPadding=textPadding(element);
  }
}
