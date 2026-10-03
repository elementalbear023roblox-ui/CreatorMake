import type { CornerKey, CornerType, EditorElement, ElementType, GeometryKind, PathNode, VectorGeometry } from "./types.ts";

export const GEOMETRY_OPTIONS: ReadonlyArray<{kind:GeometryKind;label:string}> = [
  {kind:"rectangle",label:"Rectangle"},{kind:"rounded-rectangle",label:"Rounded Rectangle"},{kind:"ellipse",label:"Ellipse"},{kind:"circle",label:"Circle"},{kind:"line",label:"Line"},{kind:"triangle",label:"Triangle"},{kind:"polygon",label:"Polygon"},{kind:"star",label:"Star"},{kind:"diamond",label:"Diamond"},{kind:"trapezoid",label:"Trapezoid"},{kind:"parallelogram",label:"Parallelogram"},{kind:"chevron",label:"Chevron"},{kind:"arrow",label:"Arrow"},{kind:"capsule",label:"Capsule"},{kind:"ring",label:"Ring"},{kind:"arc",label:"Arc"},{kind:"pie",label:"Pie"},{kind:"notched-rectangle",label:"Notched Rectangle"},{kind:"cut-corner-rectangle",label:"Cut-Corner Rectangle"},{kind:"ticket",label:"Ticket"},{kind:"bracket",label:"Bracket"},{kind:"tab",label:"Tab"},{kind:"banner",label:"Banner"},{kind:"plaque",label:"Plaque"},{kind:"ribbon",label:"Ribbon"},{kind:"custom-path",label:"Custom Path"},
];
const GEOMETRY_KINDS=new Set<GeometryKind>(GEOMETRY_OPTIONS.map((option)=>option.kind));

export const DEFAULT_VECTOR_GEOMETRY:VectorGeometry={kind:"triangle",sides:6,points:5,innerRadius:46,inset:18,thickness:18,skew:22,arcStart:0,arcEnd:270,pathData:"M 0 100 L 50 0 L 100 100 Z",nodes:[],closed:true};
export const DEFAULT_CORNER_TYPES:Record<CornerKey,CornerType>={tl:"round",tr:"round",br:"round",bl:"round"};
export const CORNER_TYPES:ReadonlyArray<CornerType>=["square","round","chamfer","inset","notch","concave","scoop"];

type Point={x:number;y:number};
export type GeometryPresentation={path:string;open:boolean;fillRule:"nonzero"|"evenodd";transform?:string};
const n=(value:number)=>Number(value.toFixed(3));
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
const TYPE_DEFAULT_GEOMETRY:Record<ElementType,GeometryKind>={frame:"rectangle",container:"rectangle","scrolling-frame":"rectangle",text:"rectangle",rectangle:"rectangle",roundRect:"rounded-rectangle",ellipse:"ellipse",line:"line",polygon:"polygon",star:"star",button:"rectangle",image:"rectangle","image-button":"rectangle",vector:"triangle"};
export const defaultGeometryKindForElementType=(type:ElementType)=>TYPE_DEFAULT_GEOMETRY[type];
const legacyDefaultGeometry=(geometry:VectorGeometry)=>geometry.kind===DEFAULT_VECTOR_GEOMETRY.kind&&geometry.sides===DEFAULT_VECTOR_GEOMETRY.sides&&geometry.points===DEFAULT_VECTOR_GEOMETRY.points&&geometry.innerRadius===DEFAULT_VECTOR_GEOMETRY.innerRadius&&geometry.inset===DEFAULT_VECTOR_GEOMETRY.inset&&geometry.thickness===DEFAULT_VECTOR_GEOMETRY.thickness&&geometry.skew===DEFAULT_VECTOR_GEOMETRY.skew&&geometry.arcStart===DEFAULT_VECTOR_GEOMETRY.arcStart&&geometry.arcEnd===DEFAULT_VECTOR_GEOMETRY.arcEnd&&geometry.pathData===DEFAULT_VECTOR_GEOMETRY.pathData&&geometry.nodes.length===0&&geometry.closed===DEFAULT_VECTOR_GEOMETRY.closed;
const pathFromPoints=(points:Point[],close=true)=>`${points.map((point,index)=>`${index?"L":"M"} ${n(point.x)} ${n(point.y)}`).join(" ")}${close?" Z":""}`;
const polar=(cx:number,cy:number,rx:number,ry:number,degrees:number):Point=>{const radians=(degrees-90)*Math.PI/180;return{x:cx+rx*Math.cos(radians),y:cy+ry*Math.sin(radians)};};
const regularPoints=(width:number,height:number,count:number,inner?:number)=>{const cx=width/2,cy=height/2,rx=width/2,ry=height/2,total=inner?count*2:count;return Array.from({length:total},(_,index)=>{const radius=inner&&index%2?inner:1,angle=-Math.PI/2+index*Math.PI*2/total;return{x:cx+Math.cos(angle)*rx*radius,y:cy+Math.sin(angle)*ry*radius};});};
const ellipsePath=(cx:number,cy:number,rx:number,ry:number)=>`M ${n(cx)} ${n(cy-ry)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx)} ${n(cy+ry)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx)} ${n(cy-ry)} Z`;
const arcDelta=(start:number,end:number)=>{const raw=end-start;if(Math.abs(raw)>=360)return 360;const normalized=((raw%360)+360)%360;return normalized===0?360:normalized;};
const arcPath=(width:number,height:number,start:number,end:number,close:boolean)=>{const cx=width/2,cy=height/2,rx=width/2,ry=height/2,delta=arcDelta(start,end),first=polar(cx,cy,rx,ry,start);if(delta>=359.999)return close?ellipsePath(cx,cy,rx,ry):`M ${n(cx)} ${n(cy-ry)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx)} ${n(cy+ry)} A ${n(rx)} ${n(ry)} 0 1 1 ${n(cx)} ${n(cy-ry)}`;const last=polar(cx,cy,rx,ry,start+delta),arc=`M ${n(first.x)} ${n(first.y)} A ${n(rx)} ${n(ry)} 0 ${delta>180?1:0} 1 ${n(last.x)} ${n(last.y)}`;return close?`M ${n(cx)} ${n(cy)} L ${n(first.x)} ${n(first.y)} A ${n(rx)} ${n(ry)} 0 ${delta>180?1:0} 1 ${n(last.x)} ${n(last.y)} Z`:arc;};

export function pathNodesToSvg(nodes:PathNode[],closed:boolean,width:number,height:number){
  if(!nodes.length)return"";const point=(node:PathNode)=>({x:node.x/100*width,y:node.y/100*height}),handle=(node:PathNode,side:"in"|"out")=>{const base=point(node);return{x:base.x+node[`${side}X`]/100*width,y:base.y+node[`${side}Y`]/100*height};};const first=point(nodes[0]),commands=[`M ${n(first.x)} ${n(first.y)}`];
  const segment=(from:PathNode,to:PathNode)=>{const end=point(to),c1=handle(from,"out"),c2=handle(to,"in"),curved=Math.abs(from.outX)+Math.abs(from.outY)+Math.abs(to.inX)+Math.abs(to.inY)>0.001;commands.push(curved?`C ${n(c1.x)} ${n(c1.y)} ${n(c2.x)} ${n(c2.y)} ${n(end.x)} ${n(end.y)}`:`L ${n(end.x)} ${n(end.y)}`);};
  for(let index=1;index<nodes.length;index++)segment(nodes[index-1],nodes[index]);if(closed&&nodes.length>2){segment(nodes.at(-1)!,nodes[0]);commands.push("Z");}return commands.join(" ");
}

const cornerRadius=(element:EditorElement,key:CornerKey,width:number,height:number)=>element.cornerTypes[key]==="square"?0:clamp(element.corners[key],0,Math.min(width,height)/2);
export function cornerRectanglePath(element:EditorElement,width=element.width,height=element.height){
  const types=element.cornerTypes,r={tl:cornerRadius(element,"tl",width,height),tr:cornerRadius(element,"tr",width,height),br:cornerRadius(element,"br",width,height),bl:cornerRadius(element,"bl",width,height)};
  const commands:string[]=[`M ${n(r.tl)} 0`,`L ${n(width-r.tr)} 0`];
  const corner=(key:CornerKey,type:CornerType,radius:number)=>{
    if(!radius||type==="square"){if(key==="tr")commands.push(`L ${n(width)} 0`);if(key==="br")commands.push(`L ${n(width)} ${n(height)}`);if(key==="bl")commands.push(`L 0 ${n(height)}`);if(key==="tl")commands.push("L 0 0");return;}
    if(key==="tr"){
      if(type==="round")commands.push(`Q ${n(width)} 0 ${n(width)} ${n(radius)}`);else if(type==="chamfer")commands.push(`L ${n(width)} ${n(radius)}`);else if(type==="notch")commands.push(`L ${n(width-radius*1.25)} ${n(radius*1.25)} L ${n(width)} ${n(radius)}`);else if(type==="scoop")commands.push(`Q ${n(width-radius)} ${n(radius)} ${n(width)} ${n(radius)}`);else if(type==="concave")commands.push(`C ${n(width-radius)} 0 ${n(width-radius)} ${n(radius)} ${n(width)} ${n(radius)}`);else commands.push(`L ${n(width-radius)} ${n(radius)} L ${n(width)} ${n(radius)}`);
    } else if(key==="br"){
      if(type==="round")commands.push(`Q ${n(width)} ${n(height)} ${n(width-radius)} ${n(height)}`);else if(type==="chamfer")commands.push(`L ${n(width-radius)} ${n(height)}`);else if(type==="notch")commands.push(`L ${n(width-radius*1.25)} ${n(height-radius*1.25)} L ${n(width-radius)} ${n(height)}`);else if(type==="scoop")commands.push(`Q ${n(width-radius)} ${n(height-radius)} ${n(width-radius)} ${n(height)}`);else if(type==="concave")commands.push(`C ${n(width)} ${n(height-radius)} ${n(width-radius)} ${n(height-radius)} ${n(width-radius)} ${n(height)}`);else commands.push(`L ${n(width-radius)} ${n(height-radius)} L ${n(width-radius)} ${n(height)}`);
    } else if(key==="bl"){
      if(type==="round")commands.push(`Q 0 ${n(height)} 0 ${n(height-radius)}`);else if(type==="chamfer")commands.push(`L 0 ${n(height-radius)}`);else if(type==="notch")commands.push(`L ${n(radius*1.25)} ${n(height-radius*1.25)} L 0 ${n(height-radius)}`);else if(type==="scoop")commands.push(`Q ${n(radius)} ${n(height-radius)} 0 ${n(height-radius)}`);else if(type==="concave")commands.push(`C ${n(radius)} ${n(height)} ${n(radius)} ${n(height-radius)} 0 ${n(height-radius)}`);else commands.push(`L ${n(radius)} ${n(height-radius)} L 0 ${n(height-radius)}`);
    } else {
      if(type==="round")commands.push(`Q 0 0 ${n(radius)} 0`);else if(type==="chamfer")commands.push(`L ${n(radius)} 0`);else if(type==="notch")commands.push(`L ${n(radius*1.25)} ${n(radius*1.25)} L ${n(radius)} 0`);else if(type==="scoop")commands.push(`Q ${n(radius)} ${n(radius)} ${n(radius)} 0`);else if(type==="concave")commands.push(`C 0 ${n(radius)} ${n(radius)} ${n(radius)} ${n(radius)} 0`);else commands.push(`L ${n(radius)} ${n(radius)} L ${n(radius)} 0`);
    }
  };
  corner("tr",types.tr,r.tr);commands.push(`L ${n(width)} ${n(height-r.br)}`);corner("br",types.br,r.br);commands.push(`L ${n(r.bl)} ${n(height)}`);corner("bl",types.bl,r.bl);commands.push(`L 0 ${n(r.tl)}`);corner("tl",types.tl,r.tl);commands.push("Z");return commands.join(" ");
}

const vectorPath=(element:EditorElement,kind:GeometryKind,width:number,height:number):GeometryPresentation=>{
  const geometry=element.geometry,inset=clamp(geometry.inset,0,48)/100,thickness=clamp(geometry.thickness,1,48)/100,ix=width*inset,iy=height*inset;
  if(kind==="rectangle"||kind==="rounded-rectangle")return{path:cornerRectanglePath(element,width,height),open:false,fillRule:"nonzero"};
  if(kind==="ellipse")return{path:ellipsePath(width/2,height/2,width/2,height/2),open:false,fillRule:"nonzero"};
  if(kind==="circle"){const radius=Math.min(width,height)/2;return{path:ellipsePath(width/2,height/2,radius,radius),open:false,fillRule:"nonzero"};}
  if(kind==="line")return{path:`M 0 ${n(height/2)} L ${n(width)} ${n(height/2)}`,open:true,fillRule:"nonzero"};
  if(kind==="triangle")return{path:pathFromPoints([{x:width/2,y:0},{x:width,y:height},{x:0,y:height}]),open:false,fillRule:"nonzero"};
  if(kind==="polygon")return{path:pathFromPoints(regularPoints(width,height,clamp(Math.round(geometry.sides),3,24))),open:false,fillRule:"nonzero"};
  if(kind==="star")return{path:pathFromPoints(regularPoints(width,height,clamp(Math.round(geometry.points),3,24),clamp(geometry.innerRadius,5,95)/100)),open:false,fillRule:"nonzero"};
  if(kind==="diamond")return{path:pathFromPoints([{x:width/2,y:0},{x:width,y:height/2},{x:width/2,y:height},{x:0,y:height/2}]),open:false,fillRule:"nonzero"};
  if(kind==="trapezoid")return{path:pathFromPoints([{x:ix,y:0},{x:width-ix,y:0},{x:width,y:height},{x:0,y:height}]),open:false,fillRule:"nonzero"};
  if(kind==="parallelogram"){const shift=clamp(Math.abs(geometry.skew),0,45)/100*width,reverse=geometry.skew<0;return{path:pathFromPoints(reverse?[{x:0,y:0},{x:width-shift,y:0},{x:width,y:height},{x:shift,y:height}]:[{x:shift,y:0},{x:width,y:0},{x:width-shift,y:height},{x:0,y:height}]),open:false,fillRule:"nonzero"};}
  if(kind==="chevron"){const t=Math.max(2,Math.min(width,height)*thickness);return{path:pathFromPoints([{x:0,y:0},{x:width-t,y:0},{x:width,y:height/2},{x:width-t,y:height},{x:0,y:height},{x:t,y:height/2}]),open:false,fillRule:"nonzero"};}
  if(kind==="arrow"){const head=Math.max(width*.24,ix),shaft=Math.max(2,height*thickness);return{path:pathFromPoints([{x:0,y:(height-shaft)/2},{x:width-head,y:(height-shaft)/2},{x:width-head,y:0},{x:width,y:height/2},{x:width-head,y:height},{x:width-head,y:(height+shaft)/2},{x:0,y:(height+shaft)/2}]),open:false,fillRule:"nonzero"};}
  if(kind==="capsule"){const copy={...element,cornerTypes:{tl:"round",tr:"round",br:"round",bl:"round"} as EditorElement["cornerTypes"],corners:{tl:height/2,tr:height/2,br:height/2,bl:height/2}};return{path:cornerRectanglePath(copy,width,height),open:false,fillRule:"nonzero"};}
  if(kind==="ring"){const innerX=width/2*(1-thickness),innerY=height/2*(1-thickness);return{path:`${ellipsePath(width/2,height/2,width/2,height/2)} ${ellipsePath(width/2,height/2,innerX,innerY)}`,open:false,fillRule:"evenodd"};}
  if(kind==="arc")return{path:arcPath(width,height,geometry.arcStart,geometry.arcEnd,false),open:true,fillRule:"nonzero"};
  if(kind==="pie")return{path:arcPath(width,height,geometry.arcStart,geometry.arcEnd,true),open:false,fillRule:"nonzero"};
  if(kind==="notched-rectangle")return{path:pathFromPoints([{x:ix,y:0},{x:width-ix,y:0},{x:width-ix,y:iy},{x:width,y:iy},{x:width,y:height-iy},{x:width-ix,y:height-iy},{x:width-ix,y:height},{x:ix,y:height},{x:ix,y:height-iy},{x:0,y:height-iy},{x:0,y:iy},{x:ix,y:iy}]),open:false,fillRule:"nonzero"};
  if(kind==="cut-corner-rectangle")return{path:pathFromPoints([{x:ix,y:0},{x:width-ix,y:0},{x:width,y:iy},{x:width,y:height-iy},{x:width-ix,y:height},{x:ix,y:height},{x:0,y:height-iy},{x:0,y:iy}]),open:false,fillRule:"nonzero"};
  if(kind==="ticket"){const notch=Math.min(width,height)*inset;return{path:`M 0 0 H ${n(width)} V ${n(height/2-notch)} A ${n(notch)} ${n(notch)} 0 0 0 ${n(width)} ${n(height/2+notch)} V ${n(height)} H 0 V ${n(height/2+notch)} A ${n(notch)} ${n(notch)} 0 0 0 0 ${n(height/2-notch)} Z`,open:false,fillRule:"nonzero"};}
  if(kind==="bracket"){const t=Math.max(2,Math.min(width,height)*thickness);return{path:pathFromPoints([{x:0,y:0},{x:width,y:0},{x:width,y:t},{x:t,y:t},{x:t,y:height-t},{x:width,y:height-t},{x:width,y:height},{x:0,y:height}]),open:false,fillRule:"nonzero"};}
  if(kind==="tab")return{path:pathFromPoints([{x:0,y:0},{x:width-ix,y:0},{x:width,y:iy},{x:width,y:height},{x:0,y:height}]),open:false,fillRule:"nonzero"};
  if(kind==="banner")return{path:pathFromPoints([{x:0,y:0},{x:width,y:0},{x:width-ix,y:height/2},{x:width,y:height},{x:0,y:height}]),open:false,fillRule:"nonzero"};
  if(kind==="plaque")return{path:pathFromPoints([{x:ix,y:0},{x:width-ix,y:0},{x:width,y:height/2},{x:width-ix,y:height},{x:ix,y:height},{x:0,y:height/2}]),open:false,fillRule:"nonzero"};
  if(kind==="ribbon"){const fold=Math.max(2,Math.min(width,height)*thickness);return{path:pathFromPoints([{x:0,y:fold},{x:ix,y:fold},{x:ix,y:0},{x:width-ix,y:0},{x:width-ix,y:fold},{x:width,y:fold},{x:width-fold,y:height/2},{x:width,y:height-fold},{x:width-ix,y:height-fold},{x:width-ix,y:height},{x:ix,y:height},{x:ix,y:height-fold},{x:0,y:height-fold},{x:fold,y:height/2}]),open:false,fillRule:"nonzero"};}
  if(geometry.nodes.length>=2)return{path:pathNodesToSvg(geometry.nodes,geometry.closed,width,height),open:!geometry.closed,fillRule:"evenodd"};
  return{path:geometry.pathData||"M 50 50",open:!geometry.closed,fillRule:"evenodd",transform:`scale(${n(width/100)} ${n(height/100)})`};
};

export function geometryKindForElement(element:EditorElement):GeometryKind{
  if(element.type==="vector")return element.geometry.kind;
  // Schema v3 gave every non-vector object DEFAULT_VECTOR_GEOMETRY (a triangle),
  // even though its visible surface was rectangular. Treat only that exact old
  // sentinel as the element-type default. Any other stored kind is an explicit
  // surface/background geometry and is authoritative for editor and export.
  return legacyDefaultGeometry(element.geometry)?defaultGeometryKindForElementType(element.type):element.geometry.kind;
}
export function geometryPresentation(element:EditorElement,width=element.width,height=element.height):GeometryPresentation{const kind=geometryKindForElement(element);if(!GEOMETRY_KINDS.has(kind))throw new Error(`Unsupported geometry renderer: ${String(kind)}`);return vectorPath(element,kind,Math.max(1,width),Math.max(1,height));}
export function usesVectorSurface(element:EditorElement){const kind=geometryKindForElement(element);return element.type==="vector"||!["rectangle","rounded-rectangle"].includes(kind)||Object.values(element.cornerTypes).some((type)=>type!=="round");}
export function supportsAdvancedCorners(element:EditorElement){const kind=geometryKindForElement(element);return ["frame","container","scrolling-frame","rectangle","roundRect","button"].includes(element.type)||(element.type==="vector"&&(kind==="rectangle"||kind==="rounded-rectangle"));}
export function openGeometryStrokeWidth(element:EditorElement){const kind=geometryKindForElement(element);return kind==="line"||kind==="arc"||kind==="custom-path"?Math.max(1,Math.min(element.width,element.height)*clamp(element.geometry.thickness,1,48)/100):element.borderWidth;}

const node=(x:number,y:number,index:number,type:PathNode["type"]="corner",handles:Partial<PathNode>={}):PathNode=>({id:`node_${index}_${Math.random().toString(36).slice(2,7)}`,x:n(x),y:n(y),type,inX:0,inY:0,outX:0,outY:0,...handles});
const ellipseNodes=()=>{const k=27.614;return[node(50,0,0,"symmetric",{inX:-k,outX:k}),node(100,50,1,"symmetric",{inY:-k,outY:k}),node(50,100,2,"symmetric",{inX:k,outX:-k}),node(0,50,3,"symmetric",{inY:k,outY:-k})];};
export function canConvertToPath(element:EditorElement){const contours=(element.geometry.pathData.match(/\bM\b/gi)??[]).length;return geometryKindForElement(element)!=="ring"&&!element.booleanOperation&&contours<=1;}
export function geometryNodesFromElement(element:EditorElement){
  if(element.geometry.kind==="custom-path"&&element.geometry.nodes.length)return structuredClone(element.geometry.nodes);
  if(element.geometry.kind==="custom-path"&&element.geometry.pathData){const points=[...element.geometry.pathData.matchAll(/[ML]\s+(-?[\d.]+)[,\s]+(-?[\d.]+)/gi)].map((match)=>({x:clamp(Number(match[1]),0,100),y:clamp(Number(match[2]),0,100)}));if(points.length>=2)return points.map((point,index)=>node(point.x,point.y,index));}
  const kind=geometryKindForElement(element);
  if(kind==="ellipse"||kind==="circle"||kind==="capsule")return ellipseNodes();
  if(kind==="line")return[node(0,50,0),node(100,50,1)];
  if(kind==="arc"||kind==="pie"){const delta=arcDelta(element.geometry.arcStart,element.geometry.arcEnd),steps=Math.max(3,Math.ceil(delta/30)),points=Array.from({length:steps+1},(_,index)=>{const point=polar(50,50,50,50,element.geometry.arcStart+delta*index/steps);return node(point.x,point.y,index);});return kind==="pie"?[node(50,50,steps+1),...points]:points;}
  const presentation=geometryPresentation(element),points=[...presentation.path.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map((match)=>({x:Number(match[1])/Math.max(1,element.width)*100,y:Number(match[2])/Math.max(1,element.height)*100})).filter((point,index,items)=>index===0||Math.abs(point.x-items[index-1].x)>.001||Math.abs(point.y-items[index-1].y)>.001);
  const usable=points.length>=2?points:[{x:0,y:0},{x:100,y:0},{x:100,y:100},{x:0,y:100}];return usable.map((point,index)=>node(point.x,point.y,index));
}
