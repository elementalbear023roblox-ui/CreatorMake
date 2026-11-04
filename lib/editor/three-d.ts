import type { ThreeDSettings } from "./types";

export const DEFAULT_THREE_D_SETTINGS:ThreeDSettings={
  primitive:"cube",depth:48,bevel:4,bevelSegments:3,material:"plastic",color:"#7457ff",sideColor:"#2a1f63",metalness:.15,roughness:.38,emissiveColor:"#8d76ff",emissiveIntensity:0,transparent:false,opacity:100,lightIntensity:1.8,ambientIntensity:.72,cameraFov:35,cameraProjection:"perspective",cameraZ:4.5,cameraYaw:0,cameraPitch:2,rotationX:-12,rotationY:24,rotationZ:0,positionZ:0,scale:1,scaleX:1,scaleY:1,scaleZ:1,pivotX:0,pivotY:0,pivotZ:0,transformSpace:"local",segments:32,cornerRadius:.16,lightColor:"#ffffff",shadows:true,previewQuality:"BALANCED",fitMode:"FIT_OBJECT",viewportPadding:18,geometryMode:"PRIMITIVE",math:{preset:"wave",x:"u",y:"sin(u) * cos(v) * 0.45",z:"v",f:"x^2 + y^2 + z^2 - 1",radial:"1 + 0.28 * cos(8 * t)",uMin:-3,uMax:3,vMin:-3,vMax:3,tMin:0,tMax:Math.PI*2,resolutionU:28,resolutionV:28,implicitResolution:18,implicitBounds:1.35,threshold:0,curveRadius:.1,radialSegments:10,closed:false},sourceType:null,exportStrategy:"AUTO",
};

const finite=(value:unknown,fallback:number,min:number,max:number)=>typeof value==="number"&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const color=(value:unknown,fallback:string)=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;

export function normalizeThreeDSettings(value:Partial<ThreeDSettings>|null|undefined):ThreeDSettings{
  const source=value??{},base=DEFAULT_THREE_D_SETTINGS;
  return {...base,...source,
    depth:finite(source.depth,base.depth,1,400),bevel:finite(source.bevel,base.bevel,0,80),bevelSegments:Math.round(finite(source.bevelSegments,base.bevelSegments,1,12)),segments:Math.round(finite(source.segments,base.segments,3,96)),cornerRadius:finite(source.cornerRadius,base.cornerRadius,0,.48),
    color:color(source.color,base.color),sideColor:color(source.sideColor,base.sideColor),emissiveColor:color(source.emissiveColor,base.emissiveColor),lightColor:color(source.lightColor,base.lightColor),metalness:finite(source.metalness,base.metalness,0,1),roughness:finite(source.roughness,base.roughness,0,1),emissiveIntensity:finite(source.emissiveIntensity,base.emissiveIntensity,0,10),opacity:finite(source.opacity,base.opacity,0,100),lightIntensity:finite(source.lightIntensity,base.lightIntensity,0,10),ambientIntensity:finite(source.ambientIntensity,base.ambientIntensity,0,5),
    cameraFov:finite(source.cameraFov,base.cameraFov,10,100),cameraZ:finite(source.cameraZ,base.cameraZ,1.5,20),cameraYaw:finite(source.cameraYaw,base.cameraYaw,-180,180),cameraPitch:finite(source.cameraPitch,base.cameraPitch,-89,89),rotationX:finite(source.rotationX,base.rotationX,-3600,3600),rotationY:finite(source.rotationY,base.rotationY,-3600,3600),rotationZ:finite(source.rotationZ,base.rotationZ,-3600,3600),positionZ:finite(source.positionZ,base.positionZ,-500,500),scale:finite(source.scale,base.scale,.05,20),scaleX:finite(source.scaleX,base.scaleX,.05,20),scaleY:finite(source.scaleY,base.scaleY,.05,20),scaleZ:finite(source.scaleZ,base.scaleZ,.05,20),pivotX:finite(source.pivotX,base.pivotX,-2,2),pivotY:finite(source.pivotY,base.pivotY,-2,2),pivotZ:finite(source.pivotZ,base.pivotZ,-2,2),
    transparent:Boolean(source.transparent),shadows:source.shadows!==false,transformSpace:source.transformSpace==="world"?"world":"local",previewQuality:source.previewQuality==="PERFORMANCE"||source.previewQuality==="HIGH"?source.previewQuality:"BALANCED",fitMode:source.fitMode==="EXPAND_BOUNDS"||source.fitMode==="MANUAL"?source.fitMode:"FIT_OBJECT",viewportPadding:finite(source.viewportPadding,base.viewportPadding,0,160),geometryMode:["PARAMETRIC_SURFACE","IMPLICIT_SURFACE","PARAMETRIC_CURVE","POLAR_SHAPE"].includes(String(source.geometryMode))?source.geometryMode as ThreeDSettings["geometryMode"]:"PRIMITIVE",
    math:{...base.math,...(source.math??{}),uMin:finite(source.math?.uMin,base.math.uMin,-100,100),uMax:finite(source.math?.uMax,base.math.uMax,-100,100),vMin:finite(source.math?.vMin,base.math.vMin,-100,100),vMax:finite(source.math?.vMax,base.math.vMax,-100,100),tMin:finite(source.math?.tMin,base.math.tMin,-100,100),tMax:finite(source.math?.tMax,base.math.tMax,-100,100),resolutionU:Math.round(finite(source.math?.resolutionU,base.math.resolutionU,2,128)),resolutionV:Math.round(finite(source.math?.resolutionV,base.math.resolutionV,2,128)),implicitResolution:Math.round(finite(source.math?.implicitResolution,base.math.implicitResolution,6,36)),implicitBounds:finite(source.math?.implicitBounds,base.math.implicitBounds,.1,20),threshold:finite(source.math?.threshold,base.math.threshold,-100,100),curveRadius:finite(source.math?.curveRadius,base.math.curveRadius,.005,2),radialSegments:Math.round(finite(source.math?.radialSegments,base.math.radialSegments,3,32)),closed:Boolean(source.math?.closed)},
  };
}

export function threeDGeometryKey(settings:ThreeDSettings){return [settings.geometryMode,settings.primitive,settings.depth,settings.bevel,settings.bevelSegments,settings.segments,settings.cornerRadius,settings.previewQuality,JSON.stringify(settings.math)].join("|");}

export function rawProjectedBoundsFromPoints(points:Array<{x:number;y:number}>,width:number,height:number){
  const valid=points.filter((point)=>Number.isFinite(point.x)&&Number.isFinite(point.y)),safeWidth=Number.isFinite(width)?Math.max(1,width):1,safeHeight=Number.isFinite(height)?Math.max(1,height):1;if(!valid.length)return{left:0,top:0,width:safeWidth,height:safeHeight,right:safeWidth,bottom:safeHeight};
  const xs=valid.map((point)=>(point.x+1)*.5*safeWidth),ys=valid.map((point)=>(1-point.y)*.5*safeHeight),left=Math.min(...xs),right=Math.max(...xs),top=Math.min(...ys),bottom=Math.max(...ys);
  return{left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top),right,bottom};
}

export function projectedBoundsFromPoints(points:Array<{x:number;y:number}>,width:number,height:number){
  const safeWidth=Number.isFinite(width)?Math.max(1,width):1,safeHeight=Number.isFinite(height)?Math.max(1,height):1,raw=rawProjectedBoundsFromPoints(points,safeWidth,safeHeight),left=Math.max(0,raw.left),right=Math.min(safeWidth,raw.right),top=Math.max(0,raw.top),bottom=Math.min(safeHeight,raw.bottom);
  return{left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}
