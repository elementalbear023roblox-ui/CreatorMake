import type { EditorAsset, EditorElement } from "../editor/types.ts";
import type { RobloxExportOptions, RobloxRenderScale } from "./types.ts";

/**
 * The one authoritative capability description for CreatorMake image export.
 *
 * The upload API accepts larger source images, but CreatorMake's local Studio
 * transport uses EditableImage, whose current hard limit is 1024x1024. Keep
 * that delivery constraint separate from the much larger canonical master.
 */
export const ROBLOX_IMAGE_CAPABILITIES={
  delivery:{maxDimension:1024,maxPixels:1024*1024,mimeType:"image/png" as const,alpha:true},
  openCloud:{maxDimensionExclusive:8000,maxFileBytes:20*1024*1024,mimeType:"image/png" as const},
} as const;

export const CREATORMAKE_MASTER_CAPABILITIES={
  fourKLongestDimension:3840,
  sixKLongestDimension:6144,
  eightKLongestDimension:7680,
  absoluteMaxDimension:8192,
  absoluteMaxPixels:7680*4320,
  maxUsefulSupersampling:24,
  bytesPerPixel:4,
  estimatedWorkingBuffers:5,
  minimumWorkingMemoryBytes:256*1024*1024,
  maximumWorkingMemoryBytes:768*1024*1024,
} as const;

export type MasterQualityClass="PREVIEW"|"SUPERSAMPLED"|"4K_CLASS"|"6K_CLASS"|"8K_CLASS";
export type MasterRenderPlan={
  qualityClass:MasterQualityClass;
  scale:number;
  width:number;
  height:number;
  targetLongestDimension:number;
  pixelBudget:number;
  estimatedWorkingBytes:number;
  complexityScore:number;
  complexityReasons:string[];
  clamped:boolean;
  warning?:string;
  sourceResolutionWarning?:string;
};

type PlanningOptions=Pick<RobloxExportOptions,"renderScale">&Partial<Pick<RobloxExportOptions,"imageResampling"|"effectsQuality">>;

const finite=(value:number,fallback=1)=>Number.isFinite(value)&&value>0?value:fallback;
const effectExtent=(value:string)=>value&&value!=="none"?(value.match(/-?[\d.]+(?=px)/g)?.map(Number)??[]).reduce((maximum,item)=>Math.max(maximum,Math.abs(item)),0):0;
const curvedGeometry=(element:EditorElement)=>["rounded-rectangle","ellipse","circle","capsule","ring","arc","pie","ticket","custom-path"].includes(element.geometry.kind)||Object.values(element.corners).some((value)=>value>0);
const diagonalGeometry=(element:EditorElement)=>Math.abs(element.rotation)>.01||Math.abs(element.skewX)>.01||Math.abs(element.skewY)>.01||Math.abs(element.rotateX)>.01||Math.abs(element.rotateY)>.01||["triangle","polygon","star","diamond","trapezoid","parallelogram","chevron","arrow","notched-rectangle","cut-corner-rectangle","tab","banner","plaque","ribbon","custom-path"].includes(element.geometry.kind);

export function masterPixelBudget(deviceMemoryGiB?:number){
  const detected=deviceMemoryGiB??(typeof navigator!=="undefined"?(navigator as Navigator&{deviceMemory?:number}).deviceMemory:undefined)??8;
  const workingBytes=Math.max(CREATORMAKE_MASTER_CAPABILITIES.minimumWorkingMemoryBytes,Math.min(CREATORMAKE_MASTER_CAPABILITIES.maximumWorkingMemoryBytes,detected*96*1024*1024));
  return Math.min(CREATORMAKE_MASTER_CAPABILITIES.absoluteMaxPixels,Math.floor(workingBytes/(CREATORMAKE_MASTER_CAPABILITIES.bytesPerPixel*CREATORMAKE_MASTER_CAPABILITIES.estimatedWorkingBuffers)));
}

export function renderComplexity(element:EditorElement,visualPart:"full"|"background"|"text"="full"){
  const reasons:string[]=[];let score=0;
  const includesText=visualPart!=="background"&&(element.type==="text"||element.type==="button")&&Boolean(element.text);
  if(includesText){score+=2;reasons.push("master-scale typography");if(element.fontSizeDesign<=36){score++;reasons.push("small typography");}}
  if(diagonalGeometry(element)){score+=2;reasons.push("diagonal or transformed geometry");}
  if(curvedGeometry(element)){score+=2;reasons.push("curved path");}
  if(element.borderWidth>0&&element.borderWidth<=4){score+=2;reasons.push("thin stroke");}
  if(element.gradientType!=="none"){score++;reasons.push("gradient");}
  const effects=Math.max(effectExtent(element.shadow),element.imageBlur,...element.textShadows.map(effectExtent));
  if(effects>0){score+=effects>=8?2:1;reasons.push("shadow, glow, or blur");}
  if(element.imageAssetId){score++;reasons.push("source texture");}
  return{score,reasons};
}

const qualityClass=(longest:number,isFinal:boolean):MasterQualityClass=>!isFinal?"PREVIEW":longest>=7000?"8K_CLASS":longest>=5600?"6K_CLASS":longest>=3500?"4K_CLASS":"SUPERSAMPLED";

export function planMasterRender(element:EditorElement,bounds:{width:number;height:number},options:PlanningOptions,visualPart:"full"|"background"|"text"="full",sourceAsset?:EditorAsset,deviceMemoryGiB?:number):MasterRenderPlan{
  const width=finite(bounds.width),height=finite(bounds.height),longest=Math.max(width,height),area=Math.max(1,width*height),isFinal=options.renderScale>=4||options.effectsQuality==="ULTRA";
  const complexity=renderComplexity(element,visualPart),budget=masterPixelBudget(deviceMemoryGiB);
  let targetLongest=longest*options.renderScale;
  if(isFinal){
    const usefulTarget=complexity.score>=6?CREATORMAKE_MASTER_CAPABILITIES.eightKLongestDimension:complexity.score>=3?CREATORMAKE_MASTER_CAPABILITIES.sixKLongestDimension:complexity.score>=1?CREATORMAKE_MASTER_CAPABILITIES.fourKLongestDimension:longest*4;
    targetLongest=Math.min(CREATORMAKE_MASTER_CAPABILITIES.eightKLongestDimension,Math.max(longest*4,Math.min(usefulTarget,longest*CREATORMAKE_MASTER_CAPABILITIES.maxUsefulSupersampling)));
  }
  const desiredScale=Math.max(.05,targetLongest/longest),safeScale=Math.min(desiredScale,CREATORMAKE_MASTER_CAPABILITIES.absoluteMaxDimension/width,CREATORMAKE_MASTER_CAPABILITIES.absoluteMaxDimension/height,Math.sqrt(budget/area)),scale=Math.max(.05,safeScale),masterWidth=Math.max(1,Math.ceil(width*scale)),masterHeight=Math.max(1,Math.ceil(height*scale)),clamped=scale+0.001<desiredScale,estimatedWorkingBytes=masterWidth*masterHeight*CREATORMAKE_MASTER_CAPABILITIES.bytesPerPixel*CREATORMAKE_MASTER_CAPABILITIES.estimatedWorkingBuffers;
  const warning=clamped?`Final master stepped down from ${Math.round(width*desiredScale)}x${Math.round(height*desiredScale)} to ${masterWidth}x${masterHeight} for browser memory safety.`:undefined;
  const sourceResolutionWarning=sourceAsset&&(sourceAsset.width<masterWidth||sourceAsset.height<masterHeight)?`Source texture resolution (${sourceAsset.width}x${sourceAsset.height}) is lower than the ${masterWidth}x${masterHeight} final master; vector geometry, text, and effects still render at master quality.`:undefined;
  return{qualityClass:qualityClass(Math.max(masterWidth,masterHeight),isFinal),scale,width:masterWidth,height:masterHeight,targetLongestDimension:Math.round(targetLongest),pixelBudget:budget,estimatedWorkingBytes,complexityScore:complexity.score,complexityReasons:complexity.reasons,clamped,warning,sourceResolutionWarning};
}

export function planRobloxDelivery(width:number,height:number){
  const capability=ROBLOX_IMAGE_CAPABILITIES.delivery,scale=Math.min(1,capability.maxDimension/Math.max(1,width),capability.maxDimension/Math.max(1,height),Math.sqrt(capability.maxPixels/Math.max(1,width*height)));
  return{width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale)),scale};
}

export function requestedQualityLabel(scale:RobloxRenderScale){return scale>=4?"FINAL":"PREVIEW";}
