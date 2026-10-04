import { geometryKindForElement } from "../editor/geometry.ts";
import type { EditorElement } from "../editor/types.ts";
import { getRobloxFontCompatibility } from "./fonts.ts";
import type { RobloxExportClassification, RobloxRasterPart } from "./types.ts";

export type RobloxElementClassification={classification:RobloxExportClassification;rasterPart?:RobloxRasterPart;intendedRobloxClass:string;interactionEnabled:boolean;nativeText:boolean;reasons:string[]};
export type RobloxTextExportDecision={mode:"NATIVE";className:"TextLabel"|"TextBox";fontExact:boolean;backgroundFree:boolean;reasons:string[]};

const close=(a:number,b:number)=>Math.abs(a-b)<.001;
const hasShadow=(value:string)=>Boolean(value&&value!=="none");
const transparent=(value:string)=>{const normalized=value.replaceAll(" ","").toLowerCase();if(normalized==="transparent"||normalized==="#00000000")return true;const rgba=normalized.match(/^rgba\([^,]+,[^,]+,[^,]+,([\d.]+)\)$/);return rgba?Number(rgba[1])===0:false;};
const simpleCorners=(element:EditorElement)=>{const radii=(Object.keys(element.corners)as Array<keyof EditorElement["corners"]>).map((key)=>element.cornerTypes[key]==="square"?0:element.corners[key]);return Object.values(element.cornerTypes).every((type)=>type==="round"||type==="square")&&radii.every((radius)=>close(radius,radii[0]));};
const simpleTransform=(element:EditorElement)=>close(element.scaleX,1)&&close(element.scaleY,1)&&!element.rotateX&&!element.rotateY&&!element.skewX&&!element.skewY&&!element.translateZ&&!element.z;
const simpleGradient=(element:EditorElement)=>element.gradientType==="none"||(element.gradientType==="linear"&&element.gradientStops.length>=2&&element.gradientStops.length<=6);
const textEffectsNative=(element:EditorElement)=>close(element.letterSpacing,0)&&close(element.wordSpacing,0)&&close(element.paragraphSpacing,0)&&element.textTransform==="none"&&element.textDecoration==="none"&&element.textShadows.every((shadow)=>!hasShadow(shadow))&&element.textStrokeWidth<=1&&element.textStrokePosition==="center"&&simpleTransform(element);
const backgroundFree=(element:EditorElement)=>transparent(element.fill)&&element.gradientType==="none"&&(element.borderWidth<=0||transparent(element.borderColor))&&!hasShadow(element.shadow);

export const hasVisibleTextBackground=(element:EditorElement)=>!backgroundFree(element);

export function classifyTextExport(element:EditorElement):RobloxTextExportDecision{
  const className:RobloxTextExportDecision["className"]=element.textInput?"TextBox":"TextLabel",font=getRobloxFontCompatibility(element.fontFamily),fontExact=font.level==="native",plainSurface=backgroundFree(element),effects=textEffectsNative(element),reasons:string[]=[];
  if(!fontExact)reasons.push(font.level==="close"?`${element.fontFamily} is only a close Roblox match`:`Custom font: ${element.fontFamily} has no exact Roblox native match`);
  if(!effects)reasons.push("Roblox native text keeps the words editable; unsupported spacing, decoration, shadow, stroke, or transform effects may differ");
  if(!plainSurface)reasons.push("visible background exports separately without text glyphs");
  const pixelOverride=element.textRobloxExportMode==="PIXEL_ACCURATE"||element.textRobloxExportMode==="PIXEL";
  if(pixelOverride)reasons.push("Legacy pixel-text preference was ignored because CreatorMake never rasterizes visible glyphs");
  if(!fontExact)reasons.push("editable Roblox text uses the declared compatibility font and reports the fidelity mismatch");
  return{mode:"NATIVE",className,fontExact,backgroundFree:plainSurface,reasons};
}

const simpleImage=(element:EditorElement)=>Boolean(element.roblox?.imageAssetId&&/^rbxassetid:\/\/\d+$/.test(element.roblox.imageAssetId))&&element.imageBrightness===100&&element.imageContrast===100&&element.imageSaturation===100&&element.imageHue===0&&element.imageBlur===0&&element.imageTintOpacity===0&&element.imageRotation===0&&element.imageScale===1&&element.imageScaleX===1&&element.imageScaleY===1&&element.imageOpacity===100&&!element.imageFlipX&&!element.imageFlipY&&element.imageOffsetX===0&&element.imageOffsetY===0&&element.imageCrop.x===0&&element.imageCrop.y===0&&element.imageCrop.width===100&&element.imageCrop.height===100&&simpleTransform(element);

export function classifyRobloxElement(element:EditorElement):RobloxElementClassification{
  if(element.type==="image"||element.type==="image-button"){
    const native=simpleImage(element),reasons=native?[]:[!/^rbxassetid:\/\/\d+$/.test(element.roblox?.imageAssetId??"")?"image needs a published Roblox asset ID":"image crop or adjustments need exact pixel rendering"];
    return{classification:native?"NATIVE":"RASTERIZED",rasterPart:native?undefined:"full",intendedRobloxClass:element.type==="image-button"?"ImageButton":"ImageLabel",interactionEnabled:element.type==="image-button",nativeText:false,reasons};
  }
  const reasons:string[]=[],kind=geometryKindForElement(element),isText=element.type==="text"||element.type==="button",textDecision=isText?classifyTextExport(element):undefined;
  const surfaceNative=(kind==="rectangle"||kind==="rounded-rectangle")&&!element.imageAssetId&&!element.booleanOperation&&!element.booleanOperands.length&&simpleCorners(element)&&simpleGradient(element)&&!hasShadow(element.shadow)&&element.blendMode==="normal"&&simpleTransform(element)&&!(element.clipContent&&kind==="rounded-rectangle"&&Math.max(...Object.values(element.corners))>0);
  if(element.imageAssetId)reasons.push("image fill");
  if(kind!=="rectangle"&&kind!=="rounded-rectangle")reasons.push(`custom ${kind} geometry`);if(element.booleanOperation||element.booleanOperands.length)reasons.push("boolean geometry");if(!simpleCorners(element))reasons.push("non-uniform or advanced corners");if(!simpleGradient(element))reasons.push(`${element.gradientType} gradient`);if(hasShadow(element.shadow))reasons.push("surface shadow");if(element.blendMode!=="normal")reasons.push(`${element.blendMode} blend mode`);if(!simpleTransform(element))reasons.push("advanced transform");if(element.clipContent&&kind==="rounded-rectangle"&&Math.max(...Object.values(element.corners))>0)reasons.push("rounded clipping mask");if(textDecision)reasons.push(...textDecision.reasons);
  if(isText){
    const visibleBackground=hasVisibleTextBackground(element);
    if(element.type==="button")return{classification:"HYBRID",rasterPart:visibleBackground?"background":undefined,intendedRobloxClass:"ImageButton",interactionEnabled:true,nativeText:true,reasons};
    if(visibleBackground)return{classification:"HYBRID",rasterPart:"background",intendedRobloxClass:"Frame",interactionEnabled:textDecision!.className==="TextBox",nativeText:true,reasons};
    return{classification:"NATIVE",intendedRobloxClass:textDecision!.className,interactionEnabled:textDecision!.className!=="TextLabel",nativeText:true,reasons:textDecision!.fontExact?[]:textDecision!.reasons};
  }
  const intendedRobloxClass=element.type==="scrolling-frame"?"ScrollingFrame":element.type==="frame"||element.type==="container"?"Frame":"ImageLabel";
  if(surfaceNative)return{classification:"NATIVE",intendedRobloxClass,interactionEnabled:false,nativeText:false,reasons:[]};
  if(element.type==="frame"||element.type==="container"||element.type==="scrolling-frame")return{classification:"HYBRID",rasterPart:"full",intendedRobloxClass,interactionEnabled:false,nativeText:false,reasons};
  return{classification:"RASTERIZED",rasterPart:"full",intendedRobloxClass,interactionEnabled:false,nativeText:false,reasons};
}

export function classifyRobloxElements(elements:EditorElement[]){return new Map(elements.map((element)=>[element.id,classifyRobloxElement(element)]));}
