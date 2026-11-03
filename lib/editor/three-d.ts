import type { ThreeDSettings } from "./types";

export const DEFAULT_THREE_D_SETTINGS:ThreeDSettings={
  primitive:"cube",depth:48,bevel:4,bevelSegments:3,material:"plastic",color:"#7457ff",sideColor:"#2a1f63",metalness:.15,roughness:.38,emissiveColor:"#8d76ff",emissiveIntensity:0,transparent:false,opacity:100,lightIntensity:1.8,ambientIntensity:.72,cameraFov:35,cameraProjection:"perspective",cameraZ:4.5,cameraYaw:0,cameraPitch:2,rotationX:-12,rotationY:24,rotationZ:0,positionZ:0,scale:1,scaleX:1,scaleY:1,scaleZ:1,pivotX:0,pivotY:0,pivotZ:0,transformSpace:"local",segments:32,cornerRadius:.16,lightColor:"#ffffff",shadows:true,previewQuality:"BALANCED",sourceType:null,exportStrategy:"AUTO",
};

const finite=(value:unknown,fallback:number,min:number,max:number)=>typeof value==="number"&&Number.isFinite(value)?Math.min(max,Math.max(min,value)):fallback;
const color=(value:unknown,fallback:string)=>typeof value==="string"&&/^#[0-9a-f]{6}$/i.test(value)?value:fallback;

export function normalizeThreeDSettings(value:Partial<ThreeDSettings>|null|undefined):ThreeDSettings{
  const source=value??{},base=DEFAULT_THREE_D_SETTINGS;
  return {...base,...source,
    depth:finite(source.depth,base.depth,1,400),bevel:finite(source.bevel,base.bevel,0,80),bevelSegments:Math.round(finite(source.bevelSegments,base.bevelSegments,1,12)),segments:Math.round(finite(source.segments,base.segments,3,96)),cornerRadius:finite(source.cornerRadius,base.cornerRadius,0,.48),
    color:color(source.color,base.color),sideColor:color(source.sideColor,base.sideColor),emissiveColor:color(source.emissiveColor,base.emissiveColor),lightColor:color(source.lightColor,base.lightColor),metalness:finite(source.metalness,base.metalness,0,1),roughness:finite(source.roughness,base.roughness,0,1),emissiveIntensity:finite(source.emissiveIntensity,base.emissiveIntensity,0,10),opacity:finite(source.opacity,base.opacity,0,100),lightIntensity:finite(source.lightIntensity,base.lightIntensity,0,10),ambientIntensity:finite(source.ambientIntensity,base.ambientIntensity,0,5),
    cameraFov:finite(source.cameraFov,base.cameraFov,10,100),cameraZ:finite(source.cameraZ,base.cameraZ,1.5,20),cameraYaw:finite(source.cameraYaw,base.cameraYaw,-180,180),cameraPitch:finite(source.cameraPitch,base.cameraPitch,-89,89),rotationX:finite(source.rotationX,base.rotationX,-3600,3600),rotationY:finite(source.rotationY,base.rotationY,-3600,3600),rotationZ:finite(source.rotationZ,base.rotationZ,-3600,3600),positionZ:finite(source.positionZ,base.positionZ,-500,500),scale:finite(source.scale,base.scale,.05,20),scaleX:finite(source.scaleX,base.scaleX,.05,20),scaleY:finite(source.scaleY,base.scaleY,.05,20),scaleZ:finite(source.scaleZ,base.scaleZ,.05,20),pivotX:finite(source.pivotX,base.pivotX,-2,2),pivotY:finite(source.pivotY,base.pivotY,-2,2),pivotZ:finite(source.pivotZ,base.pivotZ,-2,2),
    transparent:Boolean(source.transparent),shadows:source.shadows!==false,transformSpace:source.transformSpace==="world"?"world":"local",previewQuality:source.previewQuality==="PERFORMANCE"||source.previewQuality==="HIGH"?source.previewQuality:"BALANCED",
  };
}

export function threeDGeometryKey(settings:ThreeDSettings){return [settings.primitive,settings.depth,settings.bevel,settings.bevelSegments,settings.segments,settings.cornerRadius,settings.previewQuality].join("|");}

export function projectedBoundsFromPoints(points:Array<{x:number;y:number}>,width:number,height:number){
  const valid=points.filter((point)=>Number.isFinite(point.x)&&Number.isFinite(point.y)),safeWidth=Number.isFinite(width)?Math.max(1,width):1,safeHeight=Number.isFinite(height)?Math.max(1,height):1;if(!valid.length)return{left:0,top:0,width:safeWidth,height:safeHeight};
  const xs=valid.map((point)=>(point.x+1)*.5*safeWidth),ys=valid.map((point)=>(1-point.y)*.5*safeHeight),left=Math.max(0,Math.min(...xs)),right=Math.min(safeWidth,Math.max(...xs)),top=Math.max(0,Math.min(...ys)),bottom=Math.min(safeHeight,Math.max(...ys));
  return{left,top,width:Math.max(1,right-left),height:Math.max(1,bottom-top)};
}
