import { createElement, createId } from "../editor/project.ts";
import type { EditorElement, ElementType } from "../editor/types.ts";
import { createVisualEffect } from "../effects/registry.ts";

export type ProfessionalDesignAssetId =
  | "retro-show-panel"
  | "modern-quest-card"
  | "future-hud-module"
  | "cinematic-title-card"
  | "minimal-settings-card"
  | "demo-retro-game-show"
  | "demo-modern-roblox"
  | "demo-futuristic";

export type ProfessionalDesignAsset = {
  id: ProfessionalDesignAssetId;
  name: string;
  kit: "1990s Arcade" | "Modern Roblox" | "Futuristic" | "Cinematic" | "Minimalist";
  category: "Component" | "Complete interface";
  description: string;
  objectCount: number;
  preview: "retro" | "modern" | "future" | "cinematic" | "minimal";
};

export const PROFESSIONAL_DESIGN_ASSETS: ProfessionalDesignAsset[] = [
  { id:"retro-show-panel",name:"Super Prize Panel",kit:"1990s Arcade",category:"Component",description:"Curved plastic marquee, layered borders, star details, and chunky actions.",objectCount:11,preview:"retro" },
  { id:"modern-quest-card",name:"Adventure Quest Card",kit:"Modern Roblox",category:"Component",description:"Illustrated game card with a reward badge, progress rail, and dimensional CTA.",objectCount:12,preview:"modern" },
  { id:"future-hud-module",name:"Holographic HUD",kit:"Futuristic",category:"Component",description:"Cut-corner telemetry panel, luminous rails, reticle, and a transparent 3D object.",objectCount:16,preview:"future" },
  { id:"cinematic-title-card",name:"Cinematic Chapter Card",kit:"Cinematic",category:"Component",description:"Wide atmospheric composition with restrained framing and display typography.",objectCount:8,preview:"cinematic" },
  { id:"minimal-settings-card",name:"Minimal Settings Card",kit:"Minimalist",category:"Component",description:"Typographic settings layout with measured spacing and quiet controls.",objectCount:13,preview:"minimal" },
  { id:"demo-retro-game-show",name:"Demo · 90s Game Show",kit:"1990s Arcade",category:"Complete interface",description:"A complete candy-colored game-show menu built from editable layers.",objectCount:24,preview:"retro" },
  { id:"demo-modern-roblox",name:"Demo · Modern Adventure",kit:"Modern Roblox",category:"Complete interface",description:"A complete Roblox adventure hub with navigation, quests, inventory, and currency.",objectCount:22,preview:"modern" },
  { id:"demo-futuristic",name:"Demo · Orbital Command",kit:"Futuristic",category:"Complete interface",description:"A complete asymmetric command interface with holographic depth and live HUD modules.",objectCount:25,preview:"future" },
];

type Patch = Partial<EditorElement>;
type Builder = {
  elements: EditorElement[];
  make: (type: ElementType, name: string, x: number, y: number, width: number, height: number, patch?: Patch, parent?: EditorElement | null) => EditorElement;
};

const stops=(a:string,b:string,c?:string)=>[
  {id:createId("stop"),color:a,position:0,opacity:100},
  ...(c?[{id:createId("stop"),color:b,position:52,opacity:100},{id:createId("stop"),color:c,position:100,opacity:100}]:[{id:createId("stop"),color:b,position:100,opacity:100}]),
];
const corners=(radius:number)=>({tl:radius,tr:radius,br:radius,bl:radius});
const textPatch=(text:string,size:number,weight=700,align:"left"|"center"|"right"="left"):Patch=>({text,fontSize:size,fontSizeDesign:size,responsiveMaxTextSize:size,fontWeight:weight,textAlign:align,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none"});
const gradient=(a:string,b:string,angle=135,c?:string):Patch=>({gradientType:"linear",gradientAngle:angle,gradientStops:stops(a,b,c)});
const effect=(type:string,parameters:Record<string,string|number|boolean>={})=>{const value=createVisualEffect(type);value.parameters={...value.parameters,...parameters};return value;};

function builder(index:number):Builder{
  const elements:EditorElement[]=[],offset=(index%6)*12;
  const make:Builder["make"]=(type,name,x,y,width,height,patch={},parent=null)=>{
    const item=createElement(type,index+elements.length);
    Object.assign(item,{id:createId(name.toLowerCase().replace(/[^a-z0-9]+/g,"-")||type),name,x:x+offset,y:y+offset,width,height,zIndex:index+elements.length+1,...patch});
    if(parent)item.parentId=parent.id;
    if(item.type==="text"||item.type==="button"){
      item.fontSizeDesign=item.fontSize;
      item.responsiveMaxTextSize=Math.max(item.responsiveMinTextSize,item.fontSize);
      item.textPadding={top:item.padding,right:item.padding,bottom:item.padding,left:item.padding};
    }
    elements.push(item);return item;
  };
  return{elements,make};
}

function retroPanel(index:number){
  const b=builder(index),m=b.make;
  const shadow=m("frame","Prize Panel Shadow",192,118,576,374,{fill:"#461c68",borderColor:"#160b2a",borderWidth:5,cornerRadius:56,corners:corners(56),shadow:"0 24px 0 #1b0b2f, 0 34px 48px rgba(0,0,0,.45)",rotation:-1});
  const shell=m("frame","Prize Panel Shell",180,102,576,374,{fill:"#ff3d87",borderColor:"#fff06a",borderWidth:7,cornerRadius:56,corners:corners(56),shadow:"inset 0 8px 0 rgba(255,255,255,.45)",...gradient("#ff4c9c","#7c2bba",150,"#2739a8")},null);
  const inset=m("frame","Prize Panel Inset",208,148,520,286,{fill:"#17104d",borderColor:"#77eeff",borderWidth:4,cornerRadius:34,corners:corners(34),shadow:"inset 0 10px 22px rgba(0,0,0,.45), 0 0 0 5px #3e1d78"},shell);
  m("text","Prize Marquee",244,115,450,62,{...textPatch("SUPER PRIZE ROUND",32,900,"center"),fontFamily:"Bungee",fontId:"bungee",letterSpacing:1.5,textColor:"#fff36b",textStrokeColor:"#5e176e",textStrokeWidth:3,textShadows:["0 7px 0 #44105e"],effects:[effect("text-extrusion",{color:"#48105f",depth:7})]},shell);
  [0,1,2,3].forEach((i)=>m("star",`Marquee Star ${i+1}`,204+i*166,122+(i%2)*10,28,28,{fill:i%2?"#5cf1ff":"#fff46c",borderColor:"#ffffff",borderWidth:2,rotation:i%2?16:-14,shadow:"0 4px 0 #5b1a73"},shell));
  const labels=["PLAY!","PRIZES","HOW TO PLAY"];
  labels.forEach((label,i)=>m("button",`Retro ${label}`,254,205+i*67,428,50,{text:label,textAlign:"center",fontFamily:"Bungee",fontId:"bungee",fontSize:19,fontSizeDesign:19,responsiveMaxTextSize:19,fontWeight:900,fill:i===0?"#ffcf36":i===1?"#3fe1f2":"#ff5aa5",borderColor:"#ffffff",borderWidth:4,cornerRadius:25,corners:corners(25),shadow:`0 8px 0 ${i===0?"#d95c2a":i===1?"#146eaa":"#8d286e"}, 0 12px 22px rgba(0,0,0,.28)`,...gradient(i===0?"#fff36b":i===1?"#75f6ff":"#ff92c8",i===0?"#ff8e27":i===1?"#2193d7":"#d53393",180)},inset));
  void shadow;
  return b.elements;
}

function modernCard(index:number){
  const b=builder(index),m=b.make;
  const card=m("frame","Adventure Quest Card",202,126,556,340,{fill:"#17243b",borderColor:"#7cb6ff",borderWidth:2,cornerRadius:28,corners:corners(28),shadow:"0 26px 60px rgba(5,16,35,.5)",...gradient("#203b63","#111a32",145)});
  m("frame","Quest Art Field",224,148,220,296,{fill:"#2f8e68",borderColor:"#b9f7d3",borderWidth:2,cornerRadius:22,corners:{tl:22,tr:8,br:8,bl:22},...gradient("#8be28d","#2f6c83",150,"#27345e")},card);
  m("ellipse","Quest Sun",248,174,76,76,{fill:"#fff08c",borderColor:"#fff8ca",borderWidth:4,shadow:"0 0 28px rgba(255,234,113,.6)"},card);
  m("vector","Quest Mountain",252,252,170,142,{fill:"#213c66",borderColor:"#6bd1c7",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"triangle"}},card);
  m("text","Quest Eyebrow",476,164,236,28,{...textPatch("WEEKLY ADVENTURE",13,800),letterSpacing:2,textColor:"#72e6be"},card);
  m("text","Quest Title",476,195,238,75,{...textPatch("SKY ISLAND\nEXPEDITION",27,850),fontFamily:"Nunito",fontId:"nunito",lineHeight:1.02,textColor:"#ffffff"},card);
  m("text","Quest Description",476,278,238,48,{...textPatch("Collect 8 cloud crystals and unlock the summit portal.",14,550),lineHeight:1.35,textColor:"#aebed7"},card);
  const rail=m("frame","Quest Progress Track",476,345,238,15,{fill:"#0c1426",borderColor:"#38506f",borderWidth:1,cornerRadius:8,corners:corners(8),shadow:"inset 0 2px 4px rgba(0,0,0,.5)"},card);
  m("frame","Quest Progress Fill",479,348,154,9,{fill:"#67e6ab",borderColor:"transparent",borderWidth:0,cornerRadius:5,corners:corners(5),...gradient("#8df2ae","#35c9bb",90)},rail);
  m("button","Quest Continue",476,380,166,48,{text:"CONTINUE",textAlign:"center",fontSize:15,fontSizeDesign:15,responsiveMaxTextSize:15,fontWeight:850,fill:"#ffcf4b",textColor:"#2a2412",borderColor:"#fff3aa",borderWidth:2,cornerRadius:15,corners:corners(15),shadow:"0 7px 0 #b77721, 0 13px 20px rgba(0,0,0,.24)",...gradient("#fff07b","#ffb52f",180)},card);
  m("frame","Quest Reward Badge",654,374,60,55,{fill:"#6c5ce7",borderColor:"#cfc8ff",borderWidth:2,cornerRadius:18,corners:corners(18),rotation:3,shadow:"0 6px 0 #3a2e91",...gradient("#9a86ff","#5b45d0",145)},card);
  m("text","Quest Reward",659,380,50,42,{...textPatch("+250\nXP",14,900,"center"),lineHeight:1,textColor:"#ffffff"},card);
  return b.elements;
}

function futureHud(index:number){
  const b=builder(index),m=b.make;
  const panel=m("vector","Holographic Command Module",170,116,620,358,{fill:"#071827",opacity:88,borderColor:"#57eaff",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"cut-corner-rectangle",inset:24},shadow:"0 0 45px rgba(36,218,255,.18), inset 0 0 40px rgba(29,170,207,.1)",effects:[effect("gradient-border",{colorA:"#55efff",colorB:"#5576ff",colorC:"#cb5cff",width:2}),effect("glass",{blur:8,opacity:12})]});
  m("line","HUD Top Rail",204,146,552,3,{fill:"#58efff",borderColor:"transparent",shadow:"0 0 12px #36dcff"},panel);
  m("text","HUD Kicker",204,162,270,26,{...textPatch("ORBITAL COMMAND / NODE 07",12,750),fontFamily:"Orbitron",fontId:"orbitron",letterSpacing:1.8,textColor:"#77edff"},panel);
  m("text","HUD Title",204,194,330,58,{...textPatch("SYSTEMS NOMINAL",28,700),fontFamily:"Orbitron",fontId:"orbitron",textColor:"#f0fbff",effects:[effect("text-outline-glow",{color:"#51e8ff",width:1,glow:7})]},panel);
  const cube=m("three-d","Holographic Reactor",548,174,194,176,{threeD:{...createElement("three-d").threeD,primitive:"rounded-box",material:"holographic",color:"#57eaff",sideColor:"#5f62ff",rotationX:-18,rotationY:28,rotationZ:8,bevel:12,ambientIntensity:1.4,transparent:true,opacity:82},robloxExportMode:"IMAGE"},panel);
  m("ellipse","Reactor Reticle Outer",574,202,140,140,{fill:"transparent",borderColor:"#5cecff",borderWidth:2,shadow:"0 0 18px rgba(63,229,255,.55)"},panel);
  m("ellipse","Reactor Reticle Inner",599,227,90,90,{fill:"transparent",borderColor:"#8b78ff",borderWidth:1,shadow:"0 0 12px rgba(132,105,255,.45)"},panel);
  const stats=[{label:"POWER",value:"98.4%",color:"#62f7c5"},{label:"VECTOR",value:"042.7°",color:"#6fe5ff"},{label:"RANGE",value:"12.8 AU",color:"#c89aff"}];
  stats.forEach((stat,i)=>{m("text",`${stat.label} Label`,206,284+i*48,104,20,{...textPatch(stat.label,10,700),letterSpacing:1.5,textColor:"#708fa4"},panel);m("text",`${stat.label} Value`,314,278+i*48,166,30,{...textPatch(stat.value,20,750,"right"),fontFamily:"Orbitron",fontId:"orbitron",textColor:stat.color},panel);m("line",`${stat.label} Divider`,204,310+i*48,278,1,{fill:"#16394b",borderColor:"transparent"},panel);});
  void cube;
  return b.elements;
}

function cinematicCard(index:number){
  const b=builder(index),m=b.make;
  const card=m("frame","Cinematic Chapter Card",148,156,664,288,{fill:"#11100f",borderColor:"#8c7754",borderWidth:1,cornerRadius:2,corners:corners(2),shadow:"0 30px 70px rgba(0,0,0,.58)",...gradient("#241b15","#090a0c",116)});
  m("frame","Atmospheric Light",150,158,660,284,{fill:"transparent",borderColor:"transparent",borderWidth:0,gradientType:"radial",gradientPoints:[{id:createId("point"),color:"#b88a4e",x:20,y:42,opacity:34,radius:52},{id:createId("point"),color:"#0b1119",x:78,y:60,opacity:76,radius:80}],shadow:"inset 0 0 90px rgba(0,0,0,.78)"},card);
  m("line","Cinema Top Rule",190,192,580,1,{fill:"#9c835e",borderColor:"transparent",opacity:80},card);
  m("text","Chapter Number",190,214,580,24,{...textPatch("CHAPTER  IV",11,650,"center"),fontFamily:"Cinzel",fontId:"cinzel",letterSpacing:5,textColor:"#c7b28d"},card);
  m("text","Cinematic Title",190,247,580,83,{...textPatch("THE LAST HORIZON",42,650,"center"),fontFamily:"Cinzel",fontId:"cinzel",letterSpacing:1.5,textColor:"#f4eee3",textShadows:["0 4px 22px rgba(0,0,0,.8)"]},card);
  m("text","Cinematic Subtitle",246,338,468,48,{...textPatch("Beyond the edge of the known world, the signal is still calling.",14,450,"center"),fontFamily:"Libre Baskerville",fontId:"libre-baskerville",fontStyle:"italic",lineHeight:1.45,textColor:"#aaa59d"},card);
  m("line","Cinema Bottom Rule",310,396,340,1,{fill:"#9c835e",borderColor:"transparent",opacity:72},card);
  m("button","Begin Chapter",400,414,160,42,{text:"BEGIN",textAlign:"center",fontFamily:"Cinzel",fontId:"cinzel",fontSize:12,fontSizeDesign:12,responsiveMaxTextSize:12,fontWeight:700,letterSpacing:3,fill:"#b09261",textColor:"#12100e",borderColor:"#e1c795",borderWidth:1,cornerRadius:1,corners:corners(1),shadow:"0 9px 22px rgba(0,0,0,.4)"},card);
  return b.elements;
}

function minimalCard(index:number){
  const b=builder(index),m=b.make;
  const card=m("frame","Minimal Settings",244,106,472,388,{fill:"#fbfbfa",borderColor:"#d9d9d4",borderWidth:1,cornerRadius:20,corners:corners(20),shadow:"0 28px 70px rgba(32,35,38,.14)"});
  m("text","Settings Title",284,144,392,42,{...textPatch("Preferences",30,650),fontFamily:"Inter",fontId:"inter",textColor:"#171918"},card);
  m("text","Settings Intro",284,190,392,40,{...textPatch("Tune the interface to match how you play.",14,450),textColor:"#747874"},card);
  const rows=[{label:"Ambient sound",value:"On"},{label:"Reduce motion",value:"Off"},{label:"Interface scale",value:"100%"}];
  rows.forEach((row,i)=>{const y=250+i*72;m("line",`Setting Rule ${i+1}`,284,y-14,392,1,{fill:"#e7e8e4",borderColor:"transparent"},card);m("text",`${row.label} Label`,284,y,240,34,{...textPatch(row.label,15,550),textColor:"#272a28"},card);m("button",`${row.label} Control`,568,y,108,34,{text:row.value,textAlign:"center",fontSize:12,fontSizeDesign:12,responsiveMaxTextSize:12,fontWeight:650,fill:i===0?"#202522":"#f1f2ef",textColor:i===0?"#ffffff":"#505551",borderColor:i===0?"#202522":"#d7d9d5",borderWidth:1,cornerRadius:17,corners:corners(17),shadow:"none"},card);});
  m("button","Save Preferences",516,446,160,40,{text:"Save changes",textAlign:"center",fontSize:13,fontSizeDesign:13,responsiveMaxTextSize:13,fontWeight:700,fill:"#325f4a",textColor:"#ffffff",borderColor:"#325f4a",borderWidth:1,cornerRadius:11,corners:corners(11),shadow:"0 6px 14px rgba(34,84,60,.18)"},card);
  return b.elements;
}

function decorateDemo(elements:EditorElement[],kind:"retro"|"modern"|"future",index:number){
  const b=builder(index+elements.length),m=b.make;
  if(kind==="retro"){
    const bg=m("frame","Game Show Backdrop",0,0,960,600,{fill:"#26125a",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#44208a","#1a0f51",135,"#0c2c74"),effects:[effect("halftone",{size:16,dotSize:2,opacity:18,color:"#f75ac5"})]});
    m("ellipse","Backdrop Bubble Left",28,72,180,180,{fill:"#ff4f9a",opacity:22,borderColor:"#ff8fc5",borderWidth:3},bg);
    m("ellipse","Backdrop Bubble Right",772,330,150,150,{fill:"#35dff1",opacity:20,borderColor:"#6ef3ff",borderWidth:3},bg);
    [0,1,2,3,4,5].forEach((i)=>m(i%2?"star":"vector",`Backdrop Spark ${i+1}`,44+(i%2)*812,126+i*58,26+(i%3)*4,26+(i%3)*4,{fill:i%3===0?"#fff36b":i%3===1?"#55edff":"#ff65aa",borderColor:"#ffffff",borderWidth:2,rotation:i%2?18:-18,...(i%2?{}:{geometry:{...createElement("vector").geometry,kind:"diamond"}})},bg));
    m("text","Game Show Header",248,24,464,42,{...textPatch("TONIGHT'S BIG SHOW",22,900,"center"),fontFamily:"Bungee",fontId:"bungee",letterSpacing:2,textColor:"#fff36b",textStrokeColor:"#4b1768",textStrokeWidth:2},bg);
    m("line","Header Wing Left",60,45,166,5,{fill:"#55edff",borderColor:"transparent",cornerRadius:3,corners:corners(3),shadow:"0 0 12px #45dfff"},bg);
    m("line","Header Wing Right",734,45,166,5,{fill:"#ff65aa",borderColor:"transparent",cornerRadius:3,corners:corners(3),shadow:"0 0 12px #ff4f9a"},bg);
    m("text","Retro Footer",238,545,484,28,{...textPatch("★  PICK A CATEGORY AND WIN BIG!  ★",13,800,"center"),fontFamily:"Bungee",fontId:"bungee",letterSpacing:1.3,textColor:"#7df0ff"},bg);
    elements.forEach((item)=>{item.zIndex+=b.elements.length;});
    return [...b.elements,...elements];
  }
  if(kind==="modern"){
    const bg=m("frame","Adventure Hub Backdrop",0,0,960,600,{fill:"#10233a",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#2f7f76","#132d4f",145,"#17213a")});
    m("frame","Top Navigation",28,22,904,64,{fill:"#101a2b",opacity:90,borderColor:"#5f8db7",borderWidth:1,cornerRadius:20,corners:corners(20),shadow:"0 14px 32px rgba(5,16,30,.32)"},bg);
    m("text","Game Brand",58,34,260,40,{...textPatch("WILDSCAPE",22,900),fontFamily:"Nunito",fontId:"nunito",letterSpacing:1.2,textColor:"#ffffff"},bg);
    ["PLAY","QUESTS","PACK"].forEach((label,i)=>m("button",`Nav ${label}`,472+i*104,36,92,36,{text:label,textAlign:"center",fontSize:11,fontSizeDesign:11,responsiveMaxTextSize:11,fontWeight:800,fill:i===1?"#62d4a5":"transparent",textColor:i===1?"#10251e":"#b6c9d9",borderColor:i===1?"#aaf1d0":"transparent",borderWidth:1,cornerRadius:12,corners:corners(12),shadow:i===1?"0 5px 0 #27795c":"none"},bg));
    m("frame","Currency Chip",802,34,100,40,{fill:"#233652",borderColor:"#f9d976",borderWidth:1,cornerRadius:20,corners:corners(20),shadow:"none"},bg);
    m("text","Currency Value",812,41,80,26,{...textPatch("◆  2,480",13,850,"center"),textColor:"#ffe281"},bg);
    m("ellipse","Player Avatar",868,102,48,48,{fill:"#78dba3",borderColor:"#d9ffe8",borderWidth:3,shadow:"0 7px 16px rgba(0,0,0,.25)",...gradient("#a7ef9b","#3e96ae",145)},bg);
    m("text","Player Level",816,156,100,28,{...textPatch("LV. 27",11,850,"right"),letterSpacing:1,textColor:"#bce7d1"},bg);
    elements.forEach((item)=>{item.y+=62;item.zIndex+=b.elements.length;});
    return [...b.elements,...elements];
  }
  const bg=m("frame","Orbital Backdrop",0,0,960,600,{fill:"#030912",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#071b31","#02050b",128,"#0d1025"),effects:[effect("grain",{size:3,intensity:10}),effect("vignette",{amount:52})]});
  for(let i=0;i<6;i+=1)m("line",`Data Line ${i+1}`,28,110+i*78,904,1,{fill:i%2?"#0d2734":"#10203e",borderColor:"transparent",opacity:72},bg);
  m("text","Command Header",38,28,560,46,{...textPatch("ORBITAL / COMMAND",24,650),fontFamily:"Orbitron",fontId:"orbitron",letterSpacing:3,textColor:"#e8fbff"},bg);
  m("text","Command Status",694,34,220,32,{...textPatch("● LINK STABLE  07:42",11,650,"right"),fontFamily:"Orbitron",fontId:"orbitron",letterSpacing:1,textColor:"#63f3c2"},bg);
  elements.forEach((item)=>{item.y+=38;item.zIndex+=b.elements.length;});
  return [...b.elements,...elements];
}

export function createProfessionalDesignAsset(id:ProfessionalDesignAssetId,index=0){
  if(id==="retro-show-panel")return{elements:retroPanel(index)};
  if(id==="modern-quest-card")return{elements:modernCard(index)};
  if(id==="future-hud-module")return{elements:futureHud(index)};
  if(id==="cinematic-title-card")return{elements:cinematicCard(index)};
  if(id==="minimal-settings-card")return{elements:minimalCard(index)};
  if(id==="demo-retro-game-show")return{elements:decorateDemo(retroPanel(index),"retro",index),background:"#1a0f51"};
  if(id==="demo-modern-roblox")return{elements:decorateDemo(modernCard(index),"modern",index),background:"#132d4f"};
  return{elements:decorateDemo(futureHud(index),"future",index),background:"#030912"};
}

export type CreativeTreatmentId="depth"|"gloss"|"border"|"highlight"|"retro"|"texture"|"glow";

export function applyCreativeTreatment(element:EditorElement,treatment:CreativeTreatmentId){
  const without=(types:string[])=>element.effects.filter((item)=>!types.includes(item.type));
  if(treatment==="depth")return{shadow:"0 15px 0 rgba(7,10,20,.38), 0 28px 48px rgba(0,0,0,.35)",translateZ:Math.max(10,element.translateZ),rotateX:element.rotateX||2,effects:[...without(["bevel","drop-shadow"]),effect("bevel",{size:5,depth:82,softness:28}),effect("drop-shadow",{y:15,blur:28,opacity:42})]} satisfies Patch;
  if(treatment==="gloss")return{gradientType:"linear",gradientAngle:180,gradientStops:stops(element.fill==="transparent"?"#e7f8ff":element.fill,"#59677d"),effects:[...without(["glass","light-sweep"]),effect("glass",{blur:8,opacity:20}),effect("light-sweep",{width:25,intensity:82,angle:110})]} satisfies Patch;
  if(treatment==="border")return{borderWidth:Math.max(3,element.borderWidth),cornerRadius:Math.max(10,element.cornerRadius),corners:corners(Math.max(10,element.cornerRadius)),effects:[...without(["gradient-border","inner-shadow"]),effect("gradient-border",{colorA:"#fff17b",colorB:"#5de7ff",colorC:"#9d5cff",width:3}),effect("inner-shadow",{y:3,blur:8,opacity:35})]} satisfies Patch;
  if(treatment==="highlight")return{effects:[...without(["light-sweep","shimmer"]),effect("light-sweep",{width:18,intensity:100,angle:118}),effect("shimmer",{width:16,opacity:52,angle:110})]} satisfies Patch;
  if(treatment==="retro")return{fontFamily:(element.type==="text"||element.type==="button")?"Bungee":element.fontFamily,fontId:(element.type==="text"||element.type==="button")?"bungee":element.fontId,fontWeight:Math.max(800,element.fontWeight),borderWidth:Math.max(4,element.borderWidth),cornerRadius:Math.max(16,element.cornerRadius),corners:corners(Math.max(16,element.cornerRadius)),shadow:"0 8px 0 #512065, 0 16px 28px rgba(0,0,0,.3)",effects:[...without(["halftone","bevel"]),effect("halftone",{size:9,dotSize:2,opacity:22,color:"#241038"}),effect("bevel",{size:5,depth:95})]} satisfies Patch;
  if(treatment==="texture")return{effects:[...without(["grain","vignette"]),effect("grain",{size:3,intensity:18}),effect("vignette",{amount:24,softness:72})]} satisfies Patch;
  return{effects:[...without(["neon-glow","edge-glow"]),effect("neon-glow",{color:element.borderColor==="transparent"?"#63eaff":element.borderColor,radius:18,layers:3,intensity:115}),effect("edge-glow",{color:"#a48bff",radius:8,opacity:58})]} satisfies Patch;
}
