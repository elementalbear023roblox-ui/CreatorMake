import { createElement } from "./project.ts";
import type { EditorElement, RetroIconKind, RetroIconStyle, ThreeDMaterial, ThreeDSettings } from "./types.ts";
import { MAROLA_THREE_D_FONT } from "./three-d-typography.ts";

export type RetroIconDefinition={kind:RetroIconKind;name:string;shortName:string;description:string;silhouette:string;defaultColors:{front:string;side:string;accent:string;detail:string;screen:string};defaultMaterial:ThreeDMaterial;defaultRotation:{x:number;y:number;z:number}};
export type RetroIconInsertOptions={kind:RetroIconKind;style:RetroIconStyle;settings?:Partial<ThreeDSettings>};

export const RETRO_ICON_LIBRARY:RetroIconDefinition[]=[
  {kind:"gear",name:"Mechanical Settings Gear",shortName:"Gear",description:"Twelve-tooth extruded mechanism with a true center opening and beveled metal faces.",silhouette:"gear",defaultColors:{front:"#d9dde2",side:"#565d68",accent:"#ffffff",detail:"#1c2330",screen:"#132c35"},defaultMaterial:"metal",defaultRotation:{x:-12,y:24,z:-8}},
  {kind:"dollar",name:"Game-Show Dollar Sign",shortName:"Dollar",description:"Chunky dimensional currency lettering with a gold face, orange sidewalls, and readable counters.",silhouette:"dollar",defaultColors:{front:"#ffd635",side:"#a84b08",accent:"#fff5a6",detail:"#5b2100",screen:"#132c35"},defaultMaterial:"retro-plastic",defaultRotation:{x:-10,y:22,z:-7}},
  {kind:"clock",name:"Round Countdown Clock",shortName:"Clock",description:"Layered glossy clock body with a raised rim, recessed face, hour marks, and adjustable hands.",silhouette:"clock",defaultColors:{front:"#f4f0d8",side:"#3c1f89",accent:"#8d63ff",detail:"#21173f",screen:"#132c35"},defaultMaterial:"plastic",defaultRotation:{x:-10,y:20,z:0}},
  {kind:"monitor",name:"Beige CRT Monitor",shortName:"CRT",description:"Deep 1990s monitor housing with a recessed screen, substantial bezel, stand, buttons, and status light.",silhouette:"monitor",defaultColors:{front:"#d7cba7",side:"#81775d",accent:"#f2e7c8",detail:"#342f25",screen:"#173541"},defaultMaterial:"plastic",defaultRotation:{x:-9,y:27,z:0}},
];

export const RETRO_ICON_MATERIAL_PRESETS=[
  {id:"glossy",name:"Retro Glossy Plastic",material:"retro-plastic" as ThreeDMaterial,roughness:.2,metalness:.08},
  {id:"computer",name:"Classic Computer Plastic",material:"plastic" as ThreeDMaterial,roughness:.54,metalness:.02},
  {id:"chrome",name:"Chrome",material:"chrome" as ThreeDMaterial,roughness:.08,metalness:.95},
  {id:"gold",name:"Gold",material:"metal" as ThreeDMaterial,roughness:.19,metalness:.78,color:"#ffd33d",sideColor:"#9b4d08",accentColor:"#fff2a1"},
  {id:"arcade",name:"Arcade Plastic",material:"plastic" as ThreeDMaterial,roughness:.16,metalness:.04},
  {id:"matte",name:"Matte Plastic",material:"matte" as ThreeDMaterial,roughness:.88,metalness:0},
  {id:"translucent",name:"Translucent Plastic",material:"transparent" as ThreeDMaterial,roughness:.18,metalness:.04,opacity:72,transparent:true},
  {id:"pixel",name:"Pixelated CGI",material:"toon" as ThreeDMaterial,roughness:.62,metalness:.08,iconStyle:"pixelated-cgi" as RetroIconStyle},
] as const;

export const RETRO_ICON_CAMERA_PRESETS=[
  {id:"front",name:"Front",rotationX:0,rotationY:0,cameraPitch:0,cameraYaw:0},
  {id:"three-quarter",name:"Three-quarter",rotationX:-12,rotationY:24,cameraPitch:2,cameraYaw:0},
  {id:"isometric",name:"Isometric",rotationX:-28,rotationY:36,cameraPitch:5,cameraYaw:0},
  {id:"low",name:"Low angle",rotationX:10,rotationY:24,cameraPitch:-8,cameraYaw:0},
  {id:"high",name:"High angle",rotationX:-30,rotationY:22,cameraPitch:9,cameraYaw:0},
] as const;

export function retroGearProfile(teeth:number,toothDepth:number){
  const count=Math.max(6,Math.min(24,Math.round(teeth))),depth=Math.max(.08,Math.min(.55,toothDepth)),points:Array<{x:number;y:number}>=[];
  for(let tooth=0;tooth<count;tooth++)for(let step=0;step<4;step++){const angle=(tooth*4+step)/(count*4)*Math.PI*2-Math.PI/2,radius=step===1||step===2?1+depth:1;points.push({x:Math.cos(angle)*radius,y:Math.sin(angle)*radius});}
  return points;
}

export function createRetroIconElement(options:RetroIconInsertOptions,index=0):EditorElement{
  const definition=RETRO_ICON_LIBRARY.find((item)=>item.kind===options.kind)??RETRO_ICON_LIBRARY[0],element=createElement("three-d",index),glyph=MAROLA_THREE_D_FONT.glyphs["$"];
  element.name=`3D ${definition.shortName}`;element.width=320;element.height=320;element.threeD={...element.threeD,primitive:"retro-icon",iconKind:definition.kind,iconStyle:options.style,color:definition.defaultColors.front,sideColor:definition.defaultColors.side,accentColor:definition.defaultColors.accent,detailColor:definition.defaultColors.detail,screenColor:definition.defaultColors.screen,material:definition.defaultMaterial,rotationX:definition.defaultRotation.x,rotationY:definition.defaultRotation.y,rotationZ:definition.defaultRotation.z,depth:definition.kind==="monitor"?72:definition.kind==="clock"?54:64,bevel:definition.kind==="monitor"?7:6,bevelDepth:6,bevelSegments:3,roughness:definition.defaultMaterial==="metal"?.24:.28,metalness:definition.defaultMaterial==="metal"?.68:.08,lightIntensity:2.05,ambientIntensity:.68,cameraFov:32,cameraZ:4.8,viewportPadding:18,automaticBounds:true,boundsPadding:10,previewQuality:"HIGH",fontId:MAROLA_THREE_D_FONT.id,fontFamily:MAROLA_THREE_D_FONT.family,fontGlyph:"$",fontGlyphOutline:glyph?structuredClone(glyph):null,...options.settings};
  return element;
}
