import { elementStyle } from "./render.ts";
import type { EditorAsset, EditorElement } from "./types.ts";
import type { RobloxRasterPart, RobloxRenderScale } from "../roblox/types.ts";

export type RendererBounds={x:number;y:number;width:number;height:number};
export type CanvasRendererFidelity={
  matchPercent:number;
  thresholdPercent:number;
  passed:boolean;
  boundsMatch:boolean;
  aspectRatioMatch:boolean;
  transformMatch:boolean;
  alphaEdgeSafety:boolean;
  source:"live-canvas"|"isolated-canvas-renderer";
};
export type CanvasRendererRaster={
  dataUrl:string;
  sourceDataUrl:string;
  differenceDataUrl:string;
  width:number;
  height:number;
  renderPixelWidth:number;
  renderPixelHeight:number;
  scale:number;
  visualBounds:RendererBounds;
  fidelity:CanvasRendererFidelity;
  canvas:HTMLCanvasElement;
};

type Capture={canvas:HTMLCanvasElement;dataUrl:string;bounds:RendererBounds;scale:number;alphaEdgeSafety:boolean;alphaEdgeContact:string[]};
const XHTML="http://www.w3.org/1999/xhtml";
const SVG="http://www.w3.org/2000/svg";
const MAX_RENDER_DIMENSION=1024;
const FIDELITY_THRESHOLD=98.5;
export const RASTER_SAFETY_PADDING=3;

export type AlphaBoundsValidation={
  crop:{x:number;y:number;width:number;height:number};
  visible:{x:number;y:number;width:number;height:number};
  touchesSourceEdge:{left:boolean;right:boolean;top:boolean;bottom:boolean};
  touchesCropEdge:{left:boolean;right:boolean;top:boolean;bottom:boolean};
  passed:boolean;
};

const waitForPaint=()=>new Promise<void>((resolve)=>requestAnimationFrame(()=>resolve()));
const finite=(value:number,fallback=0)=>Number.isFinite(value)?value:fallback;
const effectExtent=(value:string)=>{
  if(!value||value==="none")return 0;
  const values=value.match(/-?[\d.]+(?=px)/g)?.map(Number)??[];
  const[x=0,y=0,blur=0,spread=0]=values;
  return Math.max(Math.abs(x),Math.abs(y))+Math.max(0,blur)*1.5+Math.max(0,spread);
};
const renderMargin=(element:EditorElement,visualPart:RobloxRasterPart)=>{
  const includeSurface=visualPart!=="text",includeText=visualPart!=="background",textEffects=includeText?element.textShadows.map(effectExtent):[];
  const raw=Math.max(includeSurface?effectExtent(element.shadow):0,...textEffects,includeText?element.textStrokeWidth:0,2);
  return Math.ceil((raw+3)*Math.max(1,Math.abs(element.scaleX),Math.abs(element.scaleY)));
};

function createStage(element:EditorElement){
  const stage=document.createElement("div");
  stage.dataset.creatormakeRasterHost="true";
  Object.assign(stage.style,{position:"fixed",left:"-100000px",top:"-100000px",width:`${Math.max(1,element.width)}px`,height:`${Math.max(1,element.height)}px`,overflow:"visible",pointerEvents:"none",zIndex:"-2147483647",isolation:"isolate",background:"transparent",contain:"none"});
  document.body.appendChild(stage);
  return stage;
}

function copyComputedStyles(source:Element,target:Element){
  if(target instanceof HTMLElement||target instanceof SVGElement){
    const computed=getComputedStyle(source);
    for(let index=0;index<computed.length;index++){
      const property=computed.item(index);
      if(property.startsWith("animation")||property.startsWith("transition")||property==="caret-color")continue;
      target.style.setProperty(property,computed.getPropertyValue(property),computed.getPropertyPriority(property));
    }
  }
  const sourceChildren=Array.from(source.children),targetChildren=Array.from(target.children);
  for(let index=0;index<Math.min(sourceChildren.length,targetChildren.length);index++)copyComputedStyles(sourceChildren[index],targetChildren[index]);
}

function cleanClone(source:HTMLElement,visualPart:RobloxRasterPart){
  const clone=source.cloneNode(true) as HTMLElement;
  copyComputedStyles(source,clone);
  clone.classList.remove("is-selected","is-locked");
  clone.style.setProperty("position","absolute");
  clone.style.setProperty("right","auto");
  clone.style.setProperty("bottom","auto");
  clone.style.setProperty("inset-inline-start","auto");
  clone.style.setProperty("inset-inline-end","auto");
  clone.style.setProperty("inset-block-start","auto");
  clone.style.setProperty("inset-block-end","auto");
  clone.style.setProperty("left","0px");
  clone.style.setProperty("top","0px");
  clone.style.setProperty("outline","none");
  clone.style.setProperty("pointer-events","none");
  if(visualPart==="background"){
    clone.querySelectorAll(".vector-text-content").forEach((node)=>node.remove());
    const surface=clone.querySelector(":scope > [data-creatormake-surface]");
    if(surface&&!surface.classList.contains("vector-element-surface"))surface.replaceChildren();
  }
  return clone;
}

export function calculateAlphaCropBounds(width:number,height:number,data:Uint8ClampedArray,scale:number,safetyDesignPixels=RASTER_SAFETY_PADDING):AlphaBoundsValidation{
  let minX=width,minY=height,maxX=-1,maxY=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]>0){minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);}
  if(maxX<minX||maxY<minY)throw new Error("The CreatorMake canvas renderer produced no visible pixels for this element.");
  const safetyPixels=Math.max(1,Math.ceil(safetyDesignPixels*Math.max(.05,scale))),cropX=Math.max(0,Math.floor(minX-safetyPixels)),cropY=Math.max(0,Math.floor(minY-safetyPixels)),cropRight=Math.min(width,Math.ceil(maxX+1+safetyPixels)),cropBottom=Math.min(height,Math.ceil(maxY+1+safetyPixels)),cropWidth=cropRight-cropX,cropHeight=cropBottom-cropY;
  const touchesSourceEdge={left:minX===0,right:maxX===width-1,top:minY===0,bottom:maxY===height-1},touchesCropEdge={left:minX-cropX===0,right:cropRight-1-maxX===0,top:minY-cropY===0,bottom:cropBottom-1-maxY===0};
  return{crop:{x:cropX,y:cropY,width:cropWidth,height:cropHeight},visible:{x:minX,y:minY,width:maxX-minX+1,height:maxY-minY+1},touchesSourceEdge,touchesCropEdge,passed:!Object.values(touchesCropEdge).some(Boolean)};
}

function alphaCrop(canvas:HTMLCanvasElement,bounds:RendererBounds,scale:number):Capture{
  const context=canvas.getContext("2d",{willReadFrequently:true});
  if(!context)throw new Error("Canvas 2D pixel inspection is unavailable.");
  const pixels=context.getImageData(0,0,canvas.width,canvas.height),validation=calculateAlphaCropBounds(canvas.width,canvas.height,pixels.data,scale),{x:minX,y:minY,width,height}=validation.crop,cropped=document.createElement("canvas");cropped.width=width;cropped.height=height;
  const croppedContext=cropped.getContext("2d",{willReadFrequently:true});if(!croppedContext)throw new Error("Canvas 2D rendering is unavailable.");
  croppedContext.putImageData(context.getImageData(minX,minY,width,height),0,0);
  const exact={x:bounds.x+minX/scale,y:bounds.y+minY/scale,width:width/scale,height:height/scale};
  return{canvas:cropped,dataUrl:cropped.toDataURL("image/png"),bounds:exact,scale,alphaEdgeSafety:validation.passed,alphaEdgeContact:Object.entries(validation.touchesCropEdge).filter(([,touches])=>touches).map(([edge])=>edge)};
}

async function captureNode(source:HTMLElement,stage:HTMLElement,requestedScale:RobloxRenderScale,margin:number,fontFaceCss=""):Promise<Capture>{
  const stageRect=stage.getBoundingClientRect(),rectangles=[source,...Array.from(source.querySelectorAll<HTMLElement|SVGElement>("*"))].map((node)=>node.getBoundingClientRect()).filter((rect)=>Number.isFinite(rect.left)&&Number.isFinite(rect.top)&&rect.width>0&&rect.height>0);
  const left=Math.min(...rectangles.map((rect)=>rect.left)),top=Math.min(...rectangles.map((rect)=>rect.top)),right=Math.max(...rectangles.map((rect)=>rect.right)),bottom=Math.max(...rectangles.map((rect)=>rect.bottom));
  const measured={x:left-stageRect.left,y:top-stageRect.top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
  let lastEdgeContact:string[]=[];
  for(let attempt=0;attempt<3;attempt++){
    const expandedMargin=margin*(attempt+1)+attempt*RASTER_SAFETY_PADDING,provisional={x:measured.x-expandedMargin,y:measured.y-expandedMargin,width:measured.width+expandedMargin*2,height:measured.height+expandedMargin*2};
    const scale=Math.max(.05,Math.min(requestedScale,MAX_RENDER_DIMENSION/provisional.width,MAX_RENDER_DIMENSION/provisional.height));
    const pixelWidth=Math.max(1,Math.ceil(provisional.width*scale)),pixelHeight=Math.max(1,Math.ceil(provisional.height*scale));
    const cssWidth=pixelWidth/scale,cssHeight=pixelHeight/scale,clone=cleanClone(source,"full");
    const frame=document.createElementNS(XHTML,"div");
    frame.setAttribute("style",`position:relative;width:${cssWidth}px;height:${cssHeight}px;overflow:visible;background:transparent;isolation:isolate`);
    const placement=document.createElementNS(XHTML,"div");placement.setAttribute("style",`position:absolute;left:${-provisional.x}px;top:${-provisional.y}px;width:0;height:0;overflow:visible;background:transparent`);placement.appendChild(clone);frame.appendChild(placement);
    const serialized=new XMLSerializer().serializeToString(frame),embeddedStyle=fontFaceCss?`<defs><style type="text/css"><![CDATA[${fontFaceCss.replaceAll("]]>","]]]]><![CDATA[>")}]]></style></defs>`:"",svg=`<svg xmlns="${SVG}" width="${pixelWidth}" height="${pixelHeight}" viewBox="0 0 ${cssWidth} ${cssHeight}">${embeddedStyle}<foreignObject x="0" y="0" width="${cssWidth}" height="${cssHeight}">${serialized}</foreignObject></svg>`;
    const image=await new Promise<HTMLImageElement>((resolve,reject)=>{const target=new Image();target.decoding="async";target.onload=()=>resolve(target);target.onerror=()=>reject(new Error("The browser could not rasterize the CreatorMake canvas surface."));target.src=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;});
    const canvas=document.createElement("canvas");canvas.width=pixelWidth;canvas.height=pixelHeight;
    const context=canvas.getContext("2d",{willReadFrequently:true});if(!context)throw new Error("Canvas 2D rendering is unavailable.");
    context.clearRect(0,0,pixelWidth,pixelHeight);context.drawImage(image,0,0,pixelWidth,pixelHeight);
    const cropped=alphaCrop(canvas,provisional,scale);if(cropped.alphaEdgeSafety)return cropped;lastEdgeContact=cropped.alphaEdgeContact;
  }
  throw new Error(`VISUAL_BOUNDS_TOO_SMALL: visible pixels still touch raster edge(s) ${lastEdgeContact.join(", ")||"unknown"} after automatic bounds expansion.`);
}

function findLiveCanvasElement(elementId:string){
  return Array.from(document.querySelectorAll<HTMLElement>("[data-element-id]")).find((node)=>node.dataset.elementId===elementId&&!node.closest("[data-creatormake-raster-host]"));
}

function referenceClone(source:HTMLElement,visualPart:RobloxRasterPart,renderElement:EditorElement){
  const clone=source.cloneNode(false) as HTMLElement,surface=source.querySelector<HTMLElement>(":scope > [data-creatormake-surface]");
  clone.classList.remove("is-selected","is-locked");clone.style.left="0px";clone.style.top="0px";clone.style.outline="none";clone.style.transform=String(elementStyle(renderElement).transform??"none");
  if(surface){const surfaceClone=surface.cloneNode(true) as HTMLElement;if(visualPart==="background"){surfaceClone.querySelectorAll(".vector-text-content").forEach((node)=>node.remove());if(!surfaceClone.classList.contains("vector-element-surface"))surfaceClone.replaceChildren();}else if(visualPart==="text"){if(surfaceClone.classList.contains("vector-element-surface")){surfaceClone.querySelectorAll(":scope > :not(.vector-text-content)").forEach((node)=>node.remove());}else{surfaceClone.style.background="transparent";surfaceClone.style.border="0";surfaceClone.style.boxShadow="none";surfaceClone.style.clipPath="none";}}clone.appendChild(surfaceClone);}
  return clone;
}

function compareCaptures(source:Capture,exported:Capture){
  const union={x:Math.min(source.bounds.x,exported.bounds.x),y:Math.min(source.bounds.y,exported.bounds.y),right:Math.max(source.bounds.x+source.bounds.width,exported.bounds.x+exported.bounds.width),bottom:Math.max(source.bounds.y+source.bounds.height,exported.bounds.y+exported.bounds.height)};
  const scale=Math.max(.05,Math.min(source.scale,exported.scale)),width=Math.max(1,Math.ceil((union.right-union.x)*scale)),height=Math.max(1,Math.ceil((union.bottom-union.y)*scale));
  const normalized=(capture:Capture)=>{const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;const context=canvas.getContext("2d",{willReadFrequently:true})!;context.drawImage(capture.canvas,(capture.bounds.x-union.x)*scale,(capture.bounds.y-union.y)*scale,capture.bounds.width*scale,capture.bounds.height*scale);return context.getImageData(0,0,width,height);};
  const a=normalized(source),b=normalized(exported),difference=document.createElement("canvas");difference.width=width;difference.height=height;const differenceContext=difference.getContext("2d",{willReadFrequently:true})!,diff=differenceContext.createImageData(width,height);
  let error=0,active=0,maxDelta=0;
  for(let index=0;index<a.data.length;index+=4){const activePixel=a.data[index+3]>0||b.data[index+3]>0;if(!activePixel)continue;active++;let pixelDelta=0;for(let channel=0;channel<4;channel++){const delta=Math.abs(a.data[index+channel]-b.data[index+channel]);maxDelta=Math.max(maxDelta,delta);pixelDelta+=delta<=4?0:delta;}error+=pixelDelta;const amount=Math.min(255,Math.round(pixelDelta/4));diff.data[index]=255;diff.data[index+1]=Math.max(0,80-amount);diff.data[index+2]=Math.max(0,80-amount);diff.data[index+3]=amount;}
  differenceContext.putImageData(diff,0,0);const matchPercent=active?Math.max(0,100*(1-error/(active*4*255))):100,tolerance=1/scale+0.01;
  const boundsMatch=Math.abs(source.bounds.x-exported.bounds.x)<=tolerance&&Math.abs(source.bounds.y-exported.bounds.y)<=tolerance&&Math.abs(source.bounds.width-exported.bounds.width)<=tolerance&&Math.abs(source.bounds.height-exported.bounds.height)<=tolerance;
  const sourceAspect=source.bounds.width/Math.max(.001,source.bounds.height),exportAspect=exported.bounds.width/Math.max(.001,exported.bounds.height),aspectRatioMatch=Math.abs(sourceAspect-exportAspect)<=.002;
  return{matchPercent,differenceDataUrl:difference.toDataURL("image/png"),boundsMatch,aspectRatioMatch,transformMatch:boundsMatch&&maxDelta<=8};
}

export async function rasterizeWithCreatorMakeRenderer(element:EditorElement,requestedScale:RobloxRenderScale,visualPart:RobloxRasterPart="full",fontFaceCss="",asset?:EditorAsset):Promise<CanvasRendererRaster>{
  if(typeof document==="undefined")throw new Error("CreatorMake canvas rasterization requires a browser document.");
  const [{createElement},{createRoot},{flushSync},{ElementSurface}]=await Promise.all([import("react"),import("react-dom/client"),import("react-dom"),import("../../components/editor/ElementSurface")]);
  const splitTextVisual=(element.type==="text"||element.type==="button")&&visualPart!=="full",baseElement={...element,x:0,y:0,rotation:splitTextVisual?0:element.rotation},renderElement=visualPart==="background"?{...baseElement,text:""}:visualPart==="text"?{...baseElement,fill:"transparent",gradientType:"none" as const,borderColor:"transparent",borderWidth:0,shadow:"none"}:baseElement,stage=createStage(renderElement),root=createRoot(stage),margin=renderMargin(renderElement,visualPart);
  try{
    flushSync(()=>root.render(createElement("div",{"data-element-id":element.id,"data-creatormake-export-element":"true",className:`canvas-element type-${element.type}`,style:elementStyle(renderElement)},createElement(ElementSurface,{element:renderElement,asset}))));
    await document.fonts.ready;await waitForPaint();
    const exportNode=stage.querySelector<HTMLElement>("[data-creatormake-export-element]");if(!exportNode)throw new Error("CreatorMake could not mount the isolated canvas renderer.");
    const exported=await captureNode(exportNode,stage,requestedScale,margin,fontFaceCss),live=findLiveCanvasElement(element.id);
    let source=exported,sourceKind:CanvasRendererFidelity["source"]="isolated-canvas-renderer";
    if(live){const sourceStage=createStage(renderElement);try{const clone=referenceClone(live,visualPart,renderElement);sourceStage.appendChild(clone);await waitForPaint();source=await captureNode(clone,sourceStage,requestedScale,margin,fontFaceCss);sourceKind="live-canvas";}finally{sourceStage.remove();}}
    const comparison=compareCaptures(source,exported),alphaEdgeSafety=exported.alphaEdgeSafety===true,fidelity:CanvasRendererFidelity={matchPercent:Number(comparison.matchPercent.toFixed(3)),thresholdPercent:FIDELITY_THRESHOLD,passed:comparison.matchPercent>=FIDELITY_THRESHOLD&&comparison.boundsMatch&&comparison.aspectRatioMatch&&alphaEdgeSafety,boundsMatch:comparison.boundsMatch,aspectRatioMatch:comparison.aspectRatioMatch,transformMatch:comparison.transformMatch,alphaEdgeSafety,source:sourceKind};
    return{dataUrl:exported.dataUrl,sourceDataUrl:source.dataUrl,differenceDataUrl:comparison.differenceDataUrl,width:exported.canvas.width,height:exported.canvas.height,renderPixelWidth:exported.canvas.width,renderPixelHeight:exported.canvas.height,scale:exported.scale,visualBounds:{x:finite(exported.bounds.x),y:finite(exported.bounds.y),width:finite(exported.bounds.width,1),height:finite(exported.bounds.height,1)},fidelity,canvas:exported.canvas};
  }finally{root.unmount();stage.remove();}
}
