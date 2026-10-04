import { geometryKindForElement, geometryPresentation, usesVectorSurface } from "./geometry.ts";
import type { EditorElement } from "./types";

type Point={x:number;y:number};
type Segment={from:Point;to:Point;length:number;angle:number;midY:number};
export type VisualLinearTransform={a:number;b:number;c:number;d:number};

const EPSILON=1e-7;
const radians=(degrees:number)=>degrees*Math.PI/180;
const degrees=(value:number)=>value*180/Math.PI;
const finite=(value:number,fallback=0)=>Number.isFinite(value)?value:fallback;
const normalizeAngle=(value:number)=>{const normalized=((finite(value)+180)%360+360)%360-180;return Math.abs(normalized)<EPSILON?0:normalized;};
const normalizeAxisAngle=(value:number)=>{let normalized=normalizeAngle(value);if(normalized>=90)normalized-=180;if(normalized<-90)normalized+=180;return Math.abs(normalized)<EPSILON?0:normalized;};
const axisDistance=(left:number,right:number)=>Math.abs(normalizeAxisAngle(left-right));

function straightSegments(path:string,scaleX=1,scaleY=1):Segment[]{
  const tokens=path.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)??[];
  const result:Segment[]=[];let index=0,command="",current:Point={x:0,y:0},start:Point={x:0,y:0};
  const isCommand=(value:string)=>/^[a-zA-Z]$/.test(value),number=()=>Number(tokens[index++]),push=(next:Point)=>{const from={x:current.x*scaleX,y:current.y*scaleY},to={x:next.x*scaleX,y:next.y*scaleY},dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy);if(length>EPSILON)result.push({from,to,length,angle:normalizeAxisAngle(degrees(Math.atan2(dy,dx))),midY:(from.y+to.y)/2});current=next;};
  while(index<tokens.length){
    if(isCommand(tokens[index]))command=tokens[index++];
    if(!command)break;
    const relative=command===command.toLowerCase(),upper=command.toUpperCase(),point=(x:number,y:number):Point=>({x:relative?current.x+x:x,y:relative?current.y+y:y});
    if(upper==="Z"){push({...start});command="";continue;}
    if(!["M","L","H","V"].includes(upper))return[];
    if(upper==="H"){push({x:relative?current.x+number():number(),y:current.y});continue;}
    if(upper==="V"){push({x:current.x,y:relative?current.y+number():number()});continue;}
    if(index+1>=tokens.length||isCommand(tokens[index])||isCommand(tokens[index+1])){command="";continue;}
    const next=point(number(),number());
    if(upper==="M"){current=next;start={...next};command=relative?"l":"L";}else push(next);
  }
  return result;
}

/** Returns a geometry-authored caption baseline only when the canonical vector has a clear primary axis. */
export function geometryBaselineAngle(element:EditorElement):number{
  if(!usesVectorSurface(element))return 0;
  const kind=geometryKindForElement(element),presentation=geometryPresentation(element),scale=String(presentation.transform??"").match(/scale\(([-\d.]+)(?:[ ,]+([-\d.]+))?\)/),scaleX=scale?Number(scale[1]):1,scaleY=scale?Number(scale[2]??scale[1]):1,segments=straightSegments(presentation.path,scaleX,scaleY);
  if(!segments.length)return 0;
  if(kind==="line")return normalizeAxisAngle(segments.reduce((longest,item)=>item.length>longest.length?item:longest).angle);
  const minimumLength=Math.max(8,element.width*.22),candidates=segments.filter((segment)=>segment.length>=minimumLength&&Math.abs(segment.angle)<=45).sort((left,right)=>right.length-left.length);
  let best:{angle:number;score:number}|undefined;
  for(let leftIndex=0;leftIndex<candidates.length;leftIndex++)for(let rightIndex=leftIndex+1;rightIndex<candidates.length;rightIndex++){
    const left=candidates[leftIndex],right=candidates[rightIndex];
    if(axisDistance(left.angle,right.angle)>2.5||Math.abs(left.midY-right.midY)<Math.max(4,element.height*.18))continue;
    const rightAngle=left.angle+normalizeAxisAngle(right.angle-left.angle),angle=normalizeAxisAngle((left.angle*left.length+rightAngle*right.length)/(left.length+right.length)),score=left.length+right.length;
    if(!best||score>best.score)best={angle,score};
  }
  if(best)return best.angle;
  return 0;
}

/** The same local linear surface transform used by the pixel renderer's visual bounds. */
export function visualLinearTransform(element:EditorElement):VisualLinearTransform{
  return{
    a:finite(element.scaleX,1)*Math.cos(radians(finite(element.rotateY))),
    b:Math.tan(radians(finite(element.skewY))),
    c:Math.tan(radians(finite(element.skewX))),
    d:finite(element.scaleY,1)*Math.cos(radians(finite(element.rotateX))),
  };
}

export function transformedBaselineAngle(element:EditorElement,baselineAngle=geometryBaselineAngle(element)){
  const {a,b,c,d}=visualLinearTransform(element),x=Math.cos(radians(baselineAngle)),y=Math.sin(radians(baselineAngle));
  return normalizeAngle(degrees(Math.atan2(b*x+d*y,a*x+c*y)));
}

function inverseBaselineAngle(transform:VisualLinearTransform,targetAngle:number){
  const {a,b,c,d}=transform,determinant=a*d-b*c,x=Math.cos(radians(targetAngle)),y=Math.sin(radians(targetAngle));
  if(Math.abs(determinant)<EPSILON)return targetAngle;
  return normalizeAngle(degrees(Math.atan2((-b*x+a*y)/determinant,(d*x-c*y)/determinant)));
}

export function inheritedObjectRotation(element:EditorElement,elements:EditorElement[]){
  const byId=new Map(elements.map((item)=>[item.id,item]));let parentId=element.parentId,total=0,guard=0;
  while(parentId&&guard++<64){const parent=byId.get(parentId);if(!parent||parent.hidden)break;total+=finite(parent.rotation);parentId=parent.parentId;}
  return total;
}

export type TextRotationResolution={
  objectLocalRotation:number;
  parentWorldRotation:number;
  geometryBaselineAngle:number;
  pixelVisualRotation:number;
  textLocalRotation:number;
  followObjectAngle:boolean;
  visualRotationSource:"object-transform"|"surface-transform"|"geometry"|"geometry+surface-transform";
  ownerEffectiveWorldRotation:number;
  rotationInheritedByRobloxParent:number;
  textLabelRotation:number;
  standaloneTextRotation:number;
  finalTextWorldRotation:number;
  editorTextLocalRotation:number;
};

/** Canonical editor/Roblox text-angle resolver. Roblox properties consume the uninherited delta only. */
export function resolveTextRotation(element:EditorElement,elements:EditorElement[]):TextRotationResolution{
  const objectLocalRotation=finite(element.rotation),parentWorldRotation=inheritedObjectRotation(element,elements),geometryAngle=geometryBaselineAngle(element),pixelVisualRotation=transformedBaselineAngle(element,geometryAngle),textLocalRotation=finite(element.textRotation),followObjectAngle=element.followObjectAngle!==false,hasGeometry=Math.abs(geometryAngle)>.0001,hasSurface=Math.abs(pixelVisualRotation-geometryAngle)>.0001,visualRotationSource=hasGeometry?(hasSurface?"geometry+surface-transform":"geometry"):(hasSurface?"surface-transform":"object-transform"),rotationInheritedByRobloxParent=parentWorldRotation+objectLocalRotation,ownerEffectiveWorldRotation=rotationInheritedByRobloxParent+pixelVisualRotation,desiredWorldRotation=followObjectAngle?ownerEffectiveWorldRotation+textLocalRotation:textLocalRotation,textLabelRotation=desiredWorldRotation-rotationInheritedByRobloxParent,standaloneTextRotation=desiredWorldRotation-parentWorldRotation,editorDesiredAfterObject=desiredWorldRotation-objectLocalRotation,editorTextLocalRotation=inverseBaselineAngle(visualLinearTransform(element),editorDesiredAfterObject);
  return{objectLocalRotation,parentWorldRotation,geometryBaselineAngle:geometryAngle,pixelVisualRotation,textLocalRotation,followObjectAngle,visualRotationSource,ownerEffectiveWorldRotation,rotationInheritedByRobloxParent,textLabelRotation,standaloneTextRotation,finalTextWorldRotation:rotationInheritedByRobloxParent+textLabelRotation,editorTextLocalRotation};
}
