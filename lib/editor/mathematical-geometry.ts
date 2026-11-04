import type { ThreeDGeometryMode, ThreeDMathDefinition } from "./types";
import { compileMathExpression } from "./math-expression.ts";

export type MathPoint={x:number;y:number;z:number};
export type GeneratedMathMesh={positions:number[];indices:number[];mode:ThreeDGeometryMode;warnings:string[]};
export type MathPreset={id:string;name:string;mode:ThreeDGeometryMode;math:Partial<ThreeDMathDefinition>};

export const MATH_SHAPE_PRESETS:MathPreset[]=[
  {id:"wave",name:"Sine Wave Surface",mode:"PARAMETRIC_SURFACE",math:{x:"u",y:"sin(u) * cos(v) * 0.45",z:"v",uMin:-3,uMax:3,vMin:-3,vMax:3}},
  {id:"mobius",name:"Möbius Strip",mode:"PARAMETRIC_SURFACE",math:{x:"(1 + v * cos(u / 2)) * cos(u)",y:"v * sin(u / 2)",z:"(1 + v * cos(u / 2)) * sin(u)",uMin:0,uMax:Math.PI*2,vMin:-.4,vMax:.4,closed:true}},
  {id:"torus",name:"Parametric Torus",mode:"PARAMETRIC_SURFACE",math:{x:"(1 + 0.35 * cos(v)) * cos(u)",y:"0.35 * sin(v)",z:"(1 + 0.35 * cos(v)) * sin(u)",uMin:0,uMax:Math.PI*2,vMin:0,vMax:Math.PI*2,closed:true}},
  {id:"helicoid",name:"Helicoid",mode:"PARAMETRIC_SURFACE",math:{x:"v * cos(u)",y:"u * 0.22",z:"v * sin(u)",uMin:-Math.PI*2,uMax:Math.PI*2,vMin:-1.2,vMax:1.2}},
  {id:"sphere",name:"Implicit Sphere",mode:"IMPLICIT_SURFACE",math:{f:"x^2 + y^2 + z^2 - 1",implicitBounds:1.35,implicitResolution:20}},
  {id:"gyroid",name:"Gyroid Surface",mode:"IMPLICIT_SURFACE",math:{f:"sin(x) * cos(y) + sin(y) * cos(z) + sin(z) * cos(x)",implicitBounds:3.14,implicitResolution:22}},
  {id:"spiral",name:"Spiral Tube",mode:"PARAMETRIC_CURVE",math:{x:"cos(t)",y:"t / 6",z:"sin(t)",tMin:-Math.PI*3,tMax:Math.PI*3,curveRadius:.1}},
  {id:"flower",name:"Polar Flower",mode:"POLAR_SHAPE",math:{radial:"1 + 0.28 * cos(8 * t)",tMin:0,tMax:Math.PI*2,closed:true}},
  {id:"star",name:"Mathematical Star",mode:"POLAR_SHAPE",math:{radial:"1 + 0.35 * cos(5 * t)",tMin:0,tMax:Math.PI*2,closed:true}},
];

const point=(x:number,y:number,z:number):MathPoint=>{if(!Number.isFinite(x)||!Number.isFinite(y)||!Number.isFinite(z))throw new Error("The equation produced an invalid vertex.");return{x,y,z};};

export function generateParametricSurface(math:ThreeDMathDefinition):GeneratedMathMesh{
  const x=compileMathExpression(math.x,["u","v"]),y=compileMathExpression(math.y,["u","v"]),z=compileMathExpression(math.z,["u","v"]),columns=Math.max(2,Math.min(128,Math.round(math.resolutionU))),rows=Math.max(2,Math.min(128,Math.round(math.resolutionV))),positions:number[]=[],indices:number[]=[];
  for(let row=0;row<=rows;row++)for(let column=0;column<=columns;column++){
    const u=math.uMin+(math.uMax-math.uMin)*(column/columns),v=math.vMin+(math.vMax-math.vMin)*(row/rows),variables={u,v};positions.push(x.evaluate(variables),y.evaluate(variables),z.evaluate(variables));
  }
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){const a=row*(columns+1)+column,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}
  return{positions,indices,mode:"PARAMETRIC_SURFACE",warnings:[]};
}

export function generateParametricCurve(math:ThreeDMathDefinition){
  const x=compileMathExpression(math.x,["t"]),y=compileMathExpression(math.y,["t"]),z=compileMathExpression(math.z,["t"]),steps=Math.max(8,Math.min(512,Math.round(math.resolutionU*3)));
  return Array.from({length:steps+1},(_,index)=>{const t=math.tMin+(math.tMax-math.tMin)*(index/steps),variables={t};return point(x.evaluate(variables),y.evaluate(variables),z.evaluate(variables));});
}

export function generatePolarContour(math:ThreeDMathDefinition){
  const radial=compileMathExpression(math.radial,["t","theta"]),steps=Math.max(12,Math.min(512,Math.round(math.resolutionU*4)));
  return Array.from({length:steps},(_,index)=>{const t=math.tMin+(math.tMax-math.tMin)*(index/steps),radius=radial.evaluate({t,theta:t});return{x:Math.cos(t)*radius,y:Math.sin(t)*radius};});
}

const TETRAHEDRA=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]] as const;
const CORNERS=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]] as const;
const TETRA_EDGES=[[0,1],[0,2],[0,3],[1,2],[1,3],[2,3]] as const;

export function generateImplicitSurface(math:ThreeDMathDefinition):GeneratedMathMesh{
  const f=compileMathExpression(math.f,["x","y","z"]),resolution=Math.max(6,Math.min(36,Math.round(math.implicitResolution))),bound=Math.max(.1,Math.min(20,math.implicitBounds)),step=bound*2/resolution,threshold=math.threshold,positions:number[]=[],indices:number[]=[];
  const interpolate=(a:MathPoint,b:MathPoint,fa:number,fb:number)=>{const denominator=fb-fa,t=Math.abs(denominator)<1e-9?.5:Math.max(0,Math.min(1,(threshold-fa)/denominator));return point(a.x+(b.x-a.x)*t,a.y+(b.y-a.y)*t,a.z+(b.z-a.z)*t);};
  const emit=(vertices:MathPoint[])=>{if(vertices.length<3)return;const start=positions.length/3;for(const vertex of vertices)positions.push(vertex.x,vertex.y,vertex.z);if(vertices.length===3)indices.push(start,start+1,start+2);else if(vertices.length===4)indices.push(start,start+1,start+2,start,start+2,start+3);};
  for(let iz=0;iz<resolution;iz++)for(let iy=0;iy<resolution;iy++)for(let ix=0;ix<resolution;ix++){
    const cube=CORNERS.map(([dx,dy,dz])=>point(-bound+(ix+dx)*step,-bound+(iy+dy)*step,-bound+(iz+dz)*step)),values=cube.map((vertex)=>f.evaluate(vertex));
    for(const tetra of TETRAHEDRA){const intersections:MathPoint[]=[];for(const [edgeA,edgeB] of TETRA_EDGES){const a=tetra[edgeA],b=tetra[edgeB],fa=values[a],fb=values[b];if((fa<=threshold)!==(fb<=threshold))intersections.push(interpolate(cube[a],cube[b],fa,fb));}emit(intersections);}
  }
  if(!indices.length)throw new Error("The implicit equation did not cross the selected sampling volume. Increase bounds or adjust the threshold.");
  return{positions,indices,mode:"IMPLICIT_SURFACE",warnings:resolution>=32?["High implicit resolution may render slowly on older devices."]:[]};
}

export function applyMathPreset(math:ThreeDMathDefinition,presetId:string){const preset=MATH_SHAPE_PRESETS.find((item)=>item.id===presetId);return preset?{mode:preset.mode,math:{...math,...preset.math,preset:preset.id}}:null;}
