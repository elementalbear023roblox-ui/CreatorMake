import type { EditorElement } from "./types.ts";
import { logicalBounds, logicalRect, normalizeDesignValue } from "./geometry-math.ts";

export type SnapMode = "free" | "smart" | "grid";
export type PixelSnapMode = "off" | "whole" | "half";
export type SnapAxis = "x" | "y";
export type SnapRect = { left:number;top:number;right:number;bottom:number;width:number;height:number;cx:number;cy:number };
export type SnapGuide = { axis:SnapAxis;position:number;kind:"edge"|"center"|"baseline"|"parent"|"spacing";label?:string;from?:number;to?:number };
export type SnapMeasurement = { axis:SnapAxis;from:number;to:number;cross:number;value:number;label:string };
export type SnapLatch = { x?:number;y?:number };
export type SnapSettings = {
  thresholdPx:number;
  releasePx:number;
  nearbyRadiusPx:number;
  alignEdges:boolean;
  alignCenters:boolean;
  alignBaselines:boolean;
  equalSpacing:boolean;
  parentPadding:boolean;
  gridWithSmart:boolean;
  maxCandidates:number;
};

export const DEFAULT_SNAP_SETTINGS:SnapSettings={thresholdPx:6,releasePx:10,nearbyRadiusPx:720,alignEdges:true,alignCenters:true,alignBaselines:true,equalSpacing:true,parentPadding:true,gridWithSmart:false,maxCandidates:96};

export function rectFromElement(item:Pick<EditorElement,"x"|"y"|"width"|"height">):SnapRect{return logicalRect(item);}
export function moveRect(rect:SnapRect,dx:number,dy:number):SnapRect{return{...rect,left:normalizeDesignValue(rect.left+dx),right:normalizeDesignValue(rect.right+dx),cx:normalizeDesignValue(rect.cx+dx),top:normalizeDesignValue(rect.top+dy),bottom:normalizeDesignValue(rect.bottom+dy),cy:normalizeDesignValue(rect.cy+dy)};}
export function boundsForElements(items:Array<Pick<EditorElement,"x"|"y"|"width"|"height">>):SnapRect|null{return logicalBounds(items);}

type Target={id:string;parentId:string|null;type?:string;locked?:boolean;rect:SnapRect};
type Candidate={axis:SnapAxis;correction:number;position:number;kind:SnapGuide["kind"];priority:number;label?:string;measurement?:SnapMeasurement};
const overlap=(a1:number,a2:number,b1:number,b2:number)=>Math.min(a2,b2)-Math.max(a1,b1)>=-1;
const quantize=(value:number,step:number)=>normalizeDesignValue(Math.round(value/step)*step);
const targetDistance=(a:SnapRect,b:SnapRect)=>Math.max(0,Math.max(a.left-b.right,b.left-a.right),Math.max(a.top-b.bottom,b.top-a.bottom));

function nearbyTargets(elements:EditorElement[],moving:SnapRect,parentId:string|null,radius:number,limit:number):Target[]{
  return elements.filter((item)=>!item.hidden).map((item)=>({id:item.id,parentId:item.parentId,type:item.type,locked:item.locked,rect:rectFromElement(item)})).filter((item)=>targetDistance(moving,item.rect)<=radius).sort((a,b)=>Number(b.parentId===parentId)-Number(a.parentId===parentId)||targetDistance(moving,a.rect)-targetDistance(moving,b.rect)).slice(0,limit);
}

function alignmentCandidates(proposed:SnapRect,targets:Target[],parentId:string|null,parentBounds:SnapRect|null,screen:SnapRect,settings:SnapSettings):Candidate[]{
  const out:Candidate[]=[];
  const add=(axis:SnapAxis,own:number,target:number,kind:SnapGuide["kind"],priority:number,label?:string)=>out.push({axis,correction:target-own,position:target,kind,priority,label});
  const axes=(rect:SnapRect)=>({x:settings.alignEdges?[rect.left,rect.right]:[],xc:settings.alignCenters?[rect.cx]:[],y:settings.alignEdges?[rect.top,rect.bottom]:[],yc:settings.alignCenters?[rect.cy]:[]});
  const own=axes(proposed);
  for(const target of targets){const values=axes(target.rect),priority=target.parentId===parentId?0:3;
    own.x.forEach((value)=>values.x.forEach((candidate)=>add("x",value,candidate,"edge",priority)));
    own.xc.forEach((value)=>values.xc.forEach((candidate)=>add("x",value,candidate,"center",priority)));
    own.y.forEach((value)=>values.y.forEach((candidate)=>add("y",value,candidate,"edge",priority)));
    own.yc.forEach((value)=>values.yc.forEach((candidate)=>add("y",value,candidate,"center",priority)));
    if(settings.alignBaselines&&target.type==="text"){const ownBaseline=proposed.top+proposed.height*.8,targetBaseline=target.rect.top+target.rect.height*.8;add("y",ownBaseline,targetBaseline,"baseline",priority+1,"Baseline");}
  }
  for(const [rect,priority,label] of [[parentBounds,1,"Parent"],[screen,2,"Canvas"]] as const){if(!rect)continue;const values=axes(rect);own.x.forEach((value)=>values.x.forEach((candidate)=>add("x",value,candidate,"parent",priority,label)));own.xc.forEach((value)=>values.xc.forEach((candidate)=>add("x",value,candidate,"parent",priority,label)));own.y.forEach((value)=>values.y.forEach((candidate)=>add("y",value,candidate,"parent",priority,label)));own.yc.forEach((value)=>values.yc.forEach((candidate)=>add("y",value,candidate,"parent",priority,label)));}
  return out;
}

function spacingCandidates(proposed:SnapRect,targets:Target[],parentId:string|null,parentBounds:SnapRect|null,settings:SnapSettings):Candidate[]{
  if(!settings.equalSpacing)return[];const out:Candidate[]=[];
  const scoped=targets.filter((item)=>item.parentId===parentId);
  const add=(axis:SnapAxis,correction:number,position:number,gap:number,from:number,to:number,cross:number,priority=0)=>out.push({axis,correction,position,kind:"spacing",priority,label:`${Math.round(gap*100)/100}px`,measurement:{axis,from,to,cross,value:gap,label:`${Math.round(gap*100)/100}px`}});
  const byX=[...scoped].sort((a,b)=>a.rect.left-b.rect.left),byY=[...scoped].sort((a,b)=>a.rect.top-b.rect.top);
  for(let index=0;index<byX.length-1;index++){const a=byX[index].rect,b=byX[index+1].rect,gap=b.left-a.right;if(gap<0)continue;
    if(overlap(proposed.top,proposed.bottom,a.top,a.bottom)){add("x",a.right+gap-proposed.left,a.right+gap,gap,a.right,a.right+gap,Math.min(proposed.top,a.top));add("x",b.right+gap-proposed.left,b.right+gap,gap,b.right,b.right+gap,Math.min(proposed.top,b.top));add("x",a.left-gap-proposed.right,a.left-gap-proposed.width,gap,a.left-gap,a.left,Math.min(proposed.top,a.top));}
    const available=b.left-a.right-proposed.width;if(available>=0&&overlap(proposed.top,proposed.bottom,Math.min(a.top,b.top),Math.max(a.bottom,b.bottom))){const equal=available/2,target=a.right+equal;add("x",target-proposed.left,target,equal,a.right,target,Math.min(proposed.top,a.top,b.top),-1);}
  }
  for(let index=0;index<byY.length-1;index++){const a=byY[index].rect,b=byY[index+1].rect,gap=b.top-a.bottom;if(gap<0)continue;
    if(overlap(proposed.left,proposed.right,a.left,a.right)){add("y",a.bottom+gap-proposed.top,a.bottom+gap,gap,a.bottom,a.bottom+gap,Math.min(proposed.left,a.left));add("y",b.bottom+gap-proposed.top,b.bottom+gap,gap,b.bottom,b.bottom+gap,Math.min(proposed.left,b.left));add("y",a.top-gap-proposed.bottom,a.top-gap-proposed.height,gap,a.top-gap,a.top,Math.min(proposed.left,a.left));}
    const available=b.top-a.bottom-proposed.height;if(available>=0&&overlap(proposed.left,proposed.right,Math.min(a.left,b.left),Math.max(a.right,b.right))){const equal=available/2,target=a.bottom+equal;add("y",target-proposed.top,target,equal,a.bottom,target,Math.min(proposed.left,a.left,b.left),-1);}
  }
  if(settings.parentPadding&&parentBounds){for(const item of scoped){const leftPad=item.rect.left-parentBounds.left,rightPad=parentBounds.right-item.rect.right,topPad=item.rect.top-parentBounds.top,bottomPad=parentBounds.bottom-item.rect.bottom;if(leftPad>=0)add("x",parentBounds.left+leftPad-proposed.left,parentBounds.left+leftPad,leftPad,parentBounds.left,parentBounds.left+leftPad,parentBounds.top,-1);if(rightPad>=0)add("x",parentBounds.right-rightPad-proposed.right,parentBounds.right-rightPad-proposed.width,rightPad,parentBounds.right-rightPad,parentBounds.right,parentBounds.top,-1);if(topPad>=0)add("y",parentBounds.top+topPad-proposed.top,parentBounds.top+topPad,topPad,parentBounds.top,parentBounds.top+topPad,parentBounds.left,-1);if(bottomPad>=0)add("y",parentBounds.bottom-bottomPad-proposed.bottom,parentBounds.bottom-bottomPad-proposed.height,bottomPad,parentBounds.bottom-bottomPad,parentBounds.bottom,parentBounds.left,-1);}}
  return out;
}

function choose(candidates:Candidate[],axis:SnapAxis,threshold:number){return candidates.filter((item)=>item.axis===axis&&Math.abs(item.correction)<=threshold).sort((a,b)=>Math.abs(a.correction)-Math.abs(b.correction)||a.priority-b.priority)[0];}
function pixelStep(mode:PixelSnapMode){return mode==="whole"?1:mode==="half"?.5:0;}

export function computeMoveSnap(input:{movingBounds:SnapRect;dx:number;dy:number;elements:EditorElement[];movingIds:Set<string>;parentId:string|null;parentBounds:SnapRect|null;screen:SnapRect;zoom:number;mode:SnapMode;gridSize:number;pixelSnap:PixelSnapMode;settings?:Partial<SnapSettings>;latch?:SnapLatch;forceSmart?:boolean;disableSnap?:boolean}){
  const settings={...DEFAULT_SNAP_SETTINGS,...input.settings},zoom=Math.max(.05,input.zoom),threshold=settings.thresholdPx/zoom,release=settings.releasePx/zoom;
  let dx=input.dx,dy=input.dy;let proposed=moveRect(input.movingBounds,dx,dy);const guides:SnapGuide[]=[],measurements:SnapMeasurement[]=[];const latch:SnapLatch={};
  if(input.disableSnap)return{dx,dy,guides,measurements,latch};
  const smart=input.forceSmart||input.mode==="smart";
  if(smart){
    if(input.latch?.x!==undefined&&Math.abs(proposed.left-input.latch.x)<=release){dx+=input.latch.x-proposed.left;proposed=moveRect(input.movingBounds,dx,dy);latch.x=input.latch.x;guides.push({axis:"x",position:input.latch.x,kind:"edge"});}
    if(input.latch?.y!==undefined&&Math.abs(proposed.top-input.latch.y)<=release){dy+=input.latch.y-proposed.top;proposed=moveRect(input.movingBounds,dx,dy);latch.y=input.latch.y;guides.push({axis:"y",position:input.latch.y,kind:"edge"});}
    const elements=input.elements.filter((item)=>!input.movingIds.has(item.id)),targets=nearbyTargets(elements,proposed,input.parentId,settings.nearbyRadiusPx/zoom,settings.maxCandidates),candidates=[...alignmentCandidates(proposed,targets,input.parentId,input.parentBounds,input.screen,settings),...spacingCandidates(proposed,targets,input.parentId,input.parentBounds,settings)];
    if(latch.x===undefined){const candidate=choose(candidates,"x",threshold);if(candidate){dx+=candidate.correction;latch.x=input.movingBounds.left+dx;guides.push({axis:"x",position:candidate.position,kind:candidate.kind,label:candidate.label});if(candidate.measurement)measurements.push(candidate.measurement);}}
    if(latch.y===undefined){const candidate=choose(candidates,"y",threshold);if(candidate){dy+=candidate.correction;latch.y=input.movingBounds.top+dy;guides.push({axis:"y",position:candidate.position,kind:candidate.kind,label:candidate.label});if(candidate.measurement)measurements.push(candidate.measurement);}}
  }
  if(input.mode==="grid"||(smart&&settings.gridWithSmart)){dx=quantize(input.movingBounds.left+dx,input.gridSize)-input.movingBounds.left;dy=quantize(input.movingBounds.top+dy,input.gridSize)-input.movingBounds.top;}
  const step=pixelStep(input.pixelSnap);if(step){dx=quantize(input.movingBounds.left+dx,step)-input.movingBounds.left;dy=quantize(input.movingBounds.top+dy,step)-input.movingBounds.top;}
  return{dx:normalizeDesignValue(dx),dy:normalizeDesignValue(dy),guides,measurements,latch};
}

export function inspectDistances(moving:SnapRect,elements:EditorElement[],movingIds:Set<string>,zoom:number){const nearby=nearbyTargets(elements.filter((item)=>!movingIds.has(item.id)),moving,null,720/Math.max(.05,zoom),24),measurements:SnapMeasurement[]=[];for(const target of nearby){const rect=target.rect;if(rect.right<=moving.left&&overlap(rect.top,rect.bottom,moving.top,moving.bottom)){const value=moving.left-rect.right;measurements.push({axis:"x",from:rect.right,to:moving.left,cross:(Math.max(rect.top,moving.top)+Math.min(rect.bottom,moving.bottom))/2,value,label:`${Math.round(value*100)/100}px`});}if(rect.left>=moving.right&&overlap(rect.top,rect.bottom,moving.top,moving.bottom)){const value=rect.left-moving.right;measurements.push({axis:"x",from:moving.right,to:rect.left,cross:(Math.max(rect.top,moving.top)+Math.min(rect.bottom,moving.bottom))/2,value,label:`${Math.round(value*100)/100}px`});}if(rect.bottom<=moving.top&&overlap(rect.left,rect.right,moving.left,moving.right)){const value=moving.top-rect.bottom;measurements.push({axis:"y",from:rect.bottom,to:moving.top,cross:(Math.max(rect.left,moving.left)+Math.min(rect.right,moving.right))/2,value,label:`${Math.round(value*100)/100}px`});}if(rect.top>=moving.bottom&&overlap(rect.left,rect.right,moving.left,moving.right)){const value=rect.top-moving.bottom;measurements.push({axis:"y",from:moving.bottom,to:rect.top,cross:(Math.max(rect.left,moving.left)+Math.min(rect.right,moving.right))/2,value,label:`${Math.round(value*100)/100}px`});}}return measurements.sort((a,b)=>a.value-b.value).slice(0,4);}

export function snapResizeValue(value:number,peers:number[],zoom:number,settings:Partial<SnapSettings>={}){const merged={...DEFAULT_SNAP_SETTINGS,...settings},threshold=merged.thresholdPx/Math.max(.05,zoom),best=peers.map((candidate)=>({candidate,distance:Math.abs(candidate-value)})).filter((item)=>item.distance<=threshold).sort((a,b)=>a.distance-b.distance)[0];return best?.candidate??value;}

export function snapRotation(angle:number,mode:SnapMode,peerAngles:number[],shiftKey=false){if(shiftKey)return Math.round(angle/15)*15;if(mode==="smart"){const common=[0,30,45,60,90,120,135,150,180,210,225,240,270,300,315,330,...peerAngles];const best=common.map((candidate)=>({candidate,distance:Math.abs((((angle-candidate)+540)%360)-180)})).sort((a,b)=>a.distance-b.distance)[0];if(best&&best.distance<=3)return best.candidate;}return angle;}
