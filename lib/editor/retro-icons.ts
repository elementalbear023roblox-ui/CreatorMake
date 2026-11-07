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
  {kind:"warning-sign",name:"Windows Warning Sign",shortName:"Warning",description:"Chunky yellow system-warning triangle with a raised black exclamation mark.",silhouette:"warning-triangle",defaultColors:{front:"#ffd83d",side:"#9b6400",accent:"#fff4a8",detail:"#111111",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-8,y:18,z:0}},
  {kind:"dice",name:"Game-Show Dice",shortName:"Dice",description:"Glossy ivory cube with dimensional dark pips and a strong three-quarter silhouette.",silhouette:"dice-cube",defaultColors:{front:"#f4f0dc",side:"#9c9279",accent:"#ffffff",detail:"#17131d",screen:"#000080"},defaultMaterial:"plastic",defaultRotation:{x:-22,y:32,z:8}},
  {kind:"coin-pile",name:"Pile of Coins",shortName:"Coin Pile",description:"Layered stack of individually modeled gold coins with bright beveled rims.",silhouette:"coin-stack",defaultColors:{front:"#ffd33d",side:"#9d5805",accent:"#fff2a1",detail:"#6d3300",screen:"#000080"},defaultMaterial:"brushed-metal",defaultRotation:{x:-18,y:25,z:-3}},
  {kind:"inverted-dice",name:"Inverted Color Dice",shortName:"Inverse Dice",description:"Dark arcade dice with electric contrasting pips for inverted-color graphics.",silhouette:"inverse-dice",defaultColors:{front:"#231443",side:"#0b0718",accent:"#8dffea",detail:"#fff04f",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-22,y:32,z:8}},
  {kind:"shoe",name:"1990s Prize Shoe",shortName:"Shoe",description:"Colorful dimensional sneaker with a thick sole, tongue, heel, and raised laces.",silhouette:"sneaker",defaultColors:{front:"#f04d78",side:"#6b1f62",accent:"#ffffff",detail:"#262038",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-14,y:-25,z:-5}},
  {kind:"red-buzzer",name:"Big Red Buzzer",shortName:"Buzzer",description:"Oversized glossy red dome on a deep arcade pedestal with a gold trim ring.",silhouette:"buzzer-dome",defaultColors:{front:"#e32228",side:"#5c0c16",accent:"#ffb33f",detail:"#24131b",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-18,y:24,z:0}},
  {kind:"prize-wheel",name:"Prize Wheel",shortName:"Prize Wheel",description:"Color-segmented game-show wheel with rim bulbs, spokes, hub, pointer, and stand.",silhouette:"prize-wheel",defaultColors:{front:"#8b4dff",side:"#35176d",accent:"#fff05a",detail:"#ff3e83",screen:"#31d9e8"},defaultMaterial:"retro-plastic",defaultRotation:{x:-7,y:20,z:0}},
  {kind:"golden-ticket",name:"Golden Ticket",shortName:"Golden Ticket",description:"Thick metallic admission ticket with clipped corners, inset stripe, and raised star.",silhouette:"gold-ticket",defaultColors:{front:"#ffd64f",side:"#a75b06",accent:"#fff4a8",detail:"#6a3200",screen:"#000080"},defaultMaterial:"brushed-metal",defaultRotation:{x:-12,y:24,z:-8}},
  {kind:"winners-cup",name:"Winner's Cup",shortName:"Winner's Cup",description:"Polished trophy with a flared bowl, curved handles, stem, and tiered base.",silhouette:"trophy-cup",defaultColors:{front:"#ffd441",side:"#8f4b05",accent:"#fff1a0",detail:"#5d2a00",screen:"#000080"},defaultMaterial:"brushed-metal",defaultRotation:{x:-12,y:24,z:0}},
  {kind:"stage-curtains",name:"Stage Curtains",shortName:"Curtains",description:"Pleated velvet theater curtains with valance, gold tiebacks, and a dark stage opening.",silhouette:"stage-curtains",defaultColors:{front:"#c61f49",side:"#4b0b2b",accent:"#f3bd3f",detail:"#190d22",screen:"#12071b"},defaultMaterial:"retro-plastic",defaultRotation:{x:-5,y:15,z:0}},
  {kind:"slot-machine",name:"Slot Machine",shortName:"Slot Machine",description:"Chunky casino cabinet with three reels, illuminated marquee, coin tray, and side lever.",silhouette:"slot-machine",defaultColors:{front:"#df3047",side:"#57152b",accent:"#ffd640",detail:"#211426",screen:"#f6efe0"},defaultMaterial:"retro-plastic",defaultRotation:{x:-10,y:28,z:0}},
  {kind:"marquee-sign",name:"Bulb Marquee Sign",shortName:"Marquee",description:"Dimensional show-card plaque surrounded by individually modeled glowing bulbs.",silhouette:"bulb-marquee",defaultColors:{front:"#7c3cff",side:"#28134f",accent:"#fff064",detail:"#ff3f8d",screen:"#211335"},defaultMaterial:"retro-plastic",defaultRotation:{x:-8,y:20,z:0}},
  {kind:"vhs-tape",name:"VHS Tape",shortName:"VHS",description:"Black video cassette with two visible reels, center window, label, and edge details.",silhouette:"vhs-cassette",defaultColors:{front:"#242329",side:"#09090c",accent:"#d8d1b7",detail:"#55515b",screen:"#16141c"},defaultMaterial:"plastic",defaultRotation:{x:-20,y:28,z:-4}},
  {kind:"hard-drive",name:"Classic Hard Drive",shortName:"Hard Drive",description:"Open hard disk with metallic platter, spindle, actuator arm, and circuit-board body.",silhouette:"hard-disk",defaultColors:{front:"#bfc6c9",side:"#444a50",accent:"#75d8c5",detail:"#25282b",screen:"#2a7c61"},defaultMaterial:"metal",defaultRotation:{x:-28,y:28,z:2}},
  {kind:"compact-disc",name:"Rainbow Compact Disc",shortName:"CD",description:"Reflective 1990s optical disc with a center opening and colorful radial highlights.",silhouette:"compact-disc",defaultColors:{front:"#c8d4df",side:"#56616c",accent:"#ff58b9",detail:"#48e5ff",screen:"#ffe95e"},defaultMaterial:"holographic",defaultRotation:{x:-16,y:28,z:-4}},
  {kind:"email-envelope",name:"Email Envelope",shortName:"Email",description:"Beveled cream envelope with layered flap geometry and a blue Internet-mail badge.",silhouette:"mail-envelope",defaultColors:{front:"#f1e7c8",side:"#8d8267",accent:"#2a64d6",detail:"#4f493d",screen:"#000080"},defaultMaterial:"plastic",defaultRotation:{x:-12,y:24,z:-4}},
  {kind:"spinning-globe",name:"Spinning Internet Globe",shortName:"Globe",description:"Glossy blue globe with raised gold latitude and longitude rings on a desktop stand.",silhouette:"internet-globe",defaultColors:{front:"#278dd8",side:"#12416d",accent:"#ffd84a",detail:"#172543",screen:"#49e7c6"},defaultMaterial:"plastic",defaultRotation:{x:-10,y:24,z:0}},
  {kind:"starburst",name:"3D Starburst",shortName:"Starburst",description:"Explosive layered twelve-point promotional burst with a glossy raised center.",silhouette:"starburst",defaultColors:{front:"#ff4f86",side:"#7e174f",accent:"#fff052",detail:"#4d174d",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-9,y:20,z:-6}},
  {kind:"mystery-box",name:"Mystery Box",shortName:"Mystery Box",description:"Purple prize cube with gold bands, lid seams, and a raised dimensional question mark.",silhouette:"mystery-cube",defaultColors:{front:"#7645d8",side:"#2d175f",accent:"#ffd84b",detail:"#171022",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-20,y:32,z:4}},
  {kind:"puzzle-piece",name:"Puzzle Piece",shortName:"Puzzle",description:"Thick interlocking puzzle tile with rounded tabs and a bright plastic finish.",silhouette:"puzzle-piece",defaultColors:{front:"#35b9e7",side:"#155377",accent:"#9ff3ff",detail:"#142c45",screen:"#000080"},defaultMaterial:"retro-plastic",defaultRotation:{x:-12,y:24,z:-7}},
  {kind:"hourglass",name:"Golden Hourglass",shortName:"Hourglass",description:"Framed glass timer with opposing chambers, visible sand, and four polished supports.",silhouette:"hourglass",defaultColors:{front:"#d8eff4",side:"#8c560b",accent:"#ffd84c",detail:"#4b2b08",screen:"#f1bd39"},defaultMaterial:"glass",defaultRotation:{x:-10,y:25,z:0}},
  {kind:"golden-key",name:"Golden Key",shortName:"Golden Key",description:"Ornate dimensional key with a circular bow, long shaft, teeth, and polished highlights.",silhouette:"golden-key",defaultColors:{front:"#ffd84b",side:"#8d4b06",accent:"#fff3a6",detail:"#5c2c00",screen:"#000080"},defaultMaterial:"brushed-metal",defaultRotation:{x:-12,y:24,z:-14}},
];

export const RETRO_ICON_MATERIAL_PRESETS=[
  {id:"metal",name:"Polished Metal",material:"metal" as ThreeDMaterial,roughness:.24,metalness:.68},
  {id:"glossy",name:"Retro Glossy Plastic",material:"retro-plastic" as ThreeDMaterial,roughness:.2,metalness:.08},
  {id:"computer",name:"Classic Computer Plastic",material:"plastic" as ThreeDMaterial,roughness:.54,metalness:.02},
  {id:"chrome",name:"Chrome",material:"chrome" as ThreeDMaterial,roughness:.08,metalness:.95},
  {id:"gold",name:"Gold",material:"brushed-metal" as ThreeDMaterial,roughness:.19,metalness:.78,color:"#ffd33d",sideColor:"#9b4d08",accentColor:"#fff2a1"},
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
  const metal=["metal","brushed-metal","chrome"].includes(definition.defaultMaterial),deep=["monitor","slot-machine","mystery-box","dice","inverted-dice"].includes(definition.kind),flat=["golden-ticket","email-envelope","starburst","puzzle-piece","golden-key"].includes(definition.kind);
  element.name=`3D ${definition.shortName}`;element.width=320;element.height=320;element.threeD={...element.threeD,primitive:"retro-icon",iconKind:definition.kind,iconStyle:options.style,color:definition.defaultColors.front,sideColor:definition.defaultColors.side,accentColor:definition.defaultColors.accent,detailColor:definition.defaultColors.detail,screenColor:definition.defaultColors.screen,material:definition.defaultMaterial,rotationX:definition.defaultRotation.x,rotationY:definition.defaultRotation.y,rotationZ:definition.defaultRotation.z,depth:deep?72:flat?46:definition.kind==="clock"?54:64,bevel:definition.kind==="monitor"?7:6,bevelDepth:6,bevelSegments:3,roughness:metal?.24:.28,metalness:metal?.68:.08,lightIntensity:2.05,ambientIntensity:.68,cameraFov:32,cameraZ:4.8,viewportPadding:18,automaticBounds:true,boundsPadding:10,previewQuality:"HIGH",fontId:MAROLA_THREE_D_FONT.id,fontFamily:MAROLA_THREE_D_FONT.family,fontGlyph:"$",fontGlyphOutline:glyph?structuredClone(glyph):null,...options.settings};
  return element;
}
