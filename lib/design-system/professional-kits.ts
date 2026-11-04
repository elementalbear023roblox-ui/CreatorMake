import { createElement, createId } from "../editor/project.ts";
import type { EditorElement, ElementType } from "../editor/types.ts";
import { createVisualEffect } from "../effects/registry.ts";
import { applyDimensionalStyle } from "../editor/dimensional.ts";

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
  { id:"retro-show-panel",name:"Super Prize Panel",kit:"1990s Arcade",category:"Component",description:"Sculpted arcade marquee, compound trim, layered plastic, star hardware, and dimensional actions.",objectCount:15,preview:"retro" },
  { id:"modern-quest-card",name:"Adventure Quest Card",kit:"Modern Roblox",category:"Component",description:"Asymmetric illustrated quest surface with landscape layers, progress, reward, and a 48px action.",objectCount:15,preview:"modern" },
  { id:"future-hud-module",name:"Holographic HUD",kit:"Futuristic",category:"Component",description:"Asymmetric technical shell, compound reactor reticle, telemetry, status tabs, and live 3D.",objectCount:21,preview:"future" },
  { id:"cinematic-title-card",name:"Cinematic Chapter Card",kit:"Cinematic",category:"Component",description:"Wide atmospheric composition with restrained framing and display typography.",objectCount:8,preview:"cinematic" },
  { id:"minimal-settings-card",name:"Minimal Settings Card",kit:"Minimalist",category:"Component",description:"Typographic settings layout with measured spacing and quiet controls.",objectCount:13,preview:"minimal" },
  { id:"demo-retro-game-show",name:"Demo · 90s Game Show",kit:"1990s Arcade",category:"Complete interface",description:"A sculpted candy-plastic game-show menu with compound trim and editable marquee hardware.",objectCount:28,preview:"retro" },
  { id:"demo-modern-roblox",name:"Demo · Modern Adventure",kit:"Modern Roblox",category:"Complete interface",description:"A full Roblox adventure hub with an asymmetric quest card, party rail, missions, inventory, and currency.",objectCount:31,preview:"modern" },
  { id:"demo-futuristic",name:"Demo · Orbital Command",kit:"Futuristic",category:"Complete interface",description:"An asymmetric command deck with technical geometry, holographic depth, telemetry, and live 3D.",objectCount:34,preview:"future" },
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
  m("vector","Prize Panel Shadow",184,124,592,376,{fill:"#1a082c",borderColor:"#0b0418",borderWidth:2,opacity:82,geometry:{...createElement("vector").geometry,kind:"arcade-marquee",inset:22},shadow:"0 25px 34px rgba(0,0,0,.45)",rotation:-1});
  const shell=m("vector","Prize Panel Shell",174,96,592,376,{fill:"#f43c92",borderColor:"#fff06a",borderWidth:6,geometry:{...createElement("vector").geometry,kind:"arcade-marquee",inset:22},shadow:"0 12px 0 #491660, inset 0 8px 0 rgba(255,255,255,.38)",...gradient("#ff5cab","#8b2bc4",145,"#253daa"),effects:[effect("bevel",{size:7,depth:92}),effect("light-sweep",{width:18,intensity:55,angle:118})]});
  m("vector","Marquee Compound Trim",190,112,560,344,{fill:"#66edff",borderColor:"#fff8a1",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"ornamental-frame",thickness:5},shadow:"0 0 16px rgba(87,232,255,.48)"},shell);
  const inset=m("vector","Prize Panel Inset",207,143,526,286,{fill:"#160e4a",borderColor:"#69eaff",borderWidth:3,geometry:{...createElement("vector").geometry,kind:"organic-panel",inset:18},shadow:"inset 0 14px 28px rgba(0,0,0,.46), 0 0 0 4px #442076"},shell);
  m("vector","Prize Title Plate",235,105,470,72,{fill:"#ffcf3d",borderColor:"#fff8b0",borderWidth:3,geometry:{...createElement("vector").geometry,kind:"ribbon",inset:12,thickness:14},shadow:"0 7px 0 #a52d77",...gradient("#fff368","#ff7e39",180)},shell);
  m("text","Prize Marquee",250,116,440,48,{...textPatch("SUPER PRIZE ROUND",29,900,"center"),fontFamily:"Bungee",fontId:"bungee",letterSpacing:1.3,textColor:"#fff9bd",textStrokeColor:"#6a176e",textStrokeWidth:3,textShadows:["0 5px 0 #59105c"],effects:[effect("text-extrusion",{color:"#48105f",depth:6})]},shell);
  [0,1,2,3].forEach((i)=>m("star",`Marquee Star ${i+1}`,198+i*177,120+(i%2)*12,28,28,{fill:i%2?"#5cf1ff":"#fff46c",borderColor:"#ffffff",borderWidth:2,rotation:i%2?16:-14,shadow:"0 4px 0 #5b1a73"},shell));
  const labels=["PLAY!","PRIZES","HOW TO PLAY"];
  labels.forEach((label,i)=>m("button",`Retro ${label}`,254,202+i*68,430,52,{text:label,textAlign:"center",fontFamily:"Bungee",fontId:"bungee",fontSize:18,fontSizeDesign:18,responsiveMaxTextSize:18,fontWeight:900,fill:i===0?"#ffcf36":i===1?"#3fe1f2":"#ff5aa5",textColor:i===0?"#4a2051":"#ffffff",borderColor:"#ffffff",borderWidth:3,geometry:{...createElement("button").geometry,kind:i===1?"tech-panel":"plaque",inset:i===1?8:11},shadow:`0 8px 0 ${i===0?"#d95c2a":i===1?"#146eaa":"#8d286e"}, 0 12px 22px rgba(0,0,0,.28)`,...gradient(i===0?"#fff36b":i===1?"#75f6ff":"#ff92c8",i===0?"#ff8e27":i===1?"#2193d7":"#d53393",180),effects:[effect("bevel",{size:4,depth:78})]},inset));
  m("ellipse","Left Marquee Bulb",185,276,22,22,{fill:"#fff36b",borderColor:"#ffffff",borderWidth:2,shadow:"0 0 16px #fff36b"},shell);
  m("ellipse","Right Marquee Bulb",733,276,22,22,{fill:"#5cf1ff",borderColor:"#ffffff",borderWidth:2,shadow:"0 0 16px #5cf1ff"},shell);
  return b.elements;
}

function modernCard(index:number){
  const b=builder(index),m=b.make;
  m("vector","Adventure Card Shadow",194,137,574,350,{fill:"#071426",borderColor:"transparent",borderWidth:0,opacity:74,geometry:{...createElement("vector").geometry,kind:"organic-panel",inset:16},shadow:"0 24px 54px rgba(3,12,27,.55)"});
  const card=m("vector","Adventure Quest Card",188,122,574,350,{fill:"#17243b",borderColor:"#78bfff",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"organic-panel",inset:16},shadow:"inset 0 1px 0 rgba(255,255,255,.15)",...gradient("#24466d","#111a32",145),effects:[effect("glass",{blur:7,opacity:10})]});
  m("vector","Quest Art Field",208,144,232,306,{fill:"#2f8e68",borderColor:"#b9f7d3",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:14},...gradient("#84dda0","#2f7186",150,"#26345f")},card);
  m("ellipse","Quest Sun",232,168,74,74,{fill:"#fff08c",borderColor:"#fff8ca",borderWidth:3,shadow:"0 0 28px rgba(255,234,113,.6)"},card);
  m("vector","Quest Mountain Back",232,248,184,154,{fill:"#37638a",borderColor:"#7de0d1",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"triangle"},rotation:-3},card);
  m("vector","Quest Mountain Front",266,282,154,121,{fill:"#183b5c",borderColor:"#9bd9d0",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"triangle"},rotation:4},card);
  m("ellipse","Quest Cloud",216,352,112,38,{fill:"#d9fff4",opacity:74,borderColor:"#ffffff",borderWidth:1,shadow:"0 8px 18px rgba(17,63,82,.2)"},card);
  m("text","Quest Eyebrow",466,154,248,26,{...textPatch("WEEKLY ADVENTURE",12,850),letterSpacing:2.2,textColor:"#72e6be"},card);
  m("text","Quest Title",466,188,250,76,{...textPatch("SKY ISLAND\nEXPEDITION",28,900),fontFamily:"Nunito",fontId:"nunito",lineHeight:1.02,textColor:"#ffffff"},card);
  m("text","Quest Description",466,271,248,46,{...textPatch("Collect 8 cloud crystals and unlock the summit portal.",14,600),lineHeight:1.32,textColor:"#b9c9de"},card);
  const rail=m("frame","Quest Progress Track",466,334,248,16,{fill:"#091426",borderColor:"#3a5878",borderWidth:1,cornerRadius:8,corners:corners(8),shadow:"inset 0 2px 5px rgba(0,0,0,.55)"},card);
  m("frame","Quest Progress Fill",469,337,166,10,{fill:"#67e6ab",borderColor:"transparent",borderWidth:0,cornerRadius:5,corners:corners(5),...gradient("#a2f6b6","#35c9bb",90)},rail);
  m("button","Quest Continue",466,376,174,50,{text:"CONTINUE",textAlign:"center",fontSize:15,fontSizeDesign:15,responsiveMaxTextSize:15,fontWeight:900,fill:"#ffcf4b",textColor:"#2a2412",borderColor:"#fff3aa",borderWidth:2,geometry:{...createElement("button").geometry,kind:"tech-panel",inset:8},shadow:"0 7px 0 #a96b1d, 0 14px 22px rgba(0,0,0,.24)",...gradient("#fff27e","#ffb52f",180),effects:[effect("bevel",{size:4,depth:74})]},card);
  m("vector","Quest Reward Badge",654,370,70,62,{fill:"#7661ed",borderColor:"#d8d2ff",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"plaque",inset:16},rotation:3,shadow:"0 6px 0 #35298e",...gradient("#a993ff","#5841cc",145)},card);
  m("text","Quest Reward",662,380,54,38,{...textPatch("+250\nXP",14,900,"center"),lineHeight:1,textColor:"#ffffff"},card);
  return b.elements;
}

function futureHud(index:number){
  const b=builder(index),m=b.make;
  m("vector","Command Module Shadow",162,126,636,362,{fill:"#020711",opacity:80,borderColor:"transparent",borderWidth:0,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:18},shadow:"0 24px 58px rgba(0,0,0,.62)"});
  const panel=m("vector","Holographic Command Module",154,106,636,362,{fill:"#061827",opacity:94,borderColor:"#57eaff",borderWidth:2,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:18},shadow:"0 0 45px rgba(36,218,255,.2), inset 0 0 46px rgba(29,170,207,.12)",effects:[effect("gradient-border",{colorA:"#55efff",colorB:"#5576ff",colorC:"#cb5cff",width:2}),effect("glass",{blur:8,opacity:12})]});
  m("vector","HUD Inner Rail",170,122,604,330,{fill:"transparent",borderColor:"#1d5870",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:14},opacity:72},panel);
  m("line","HUD Top Rail",190,144,548,3,{fill:"#58efff",borderColor:"transparent",shadow:"0 0 12px #36dcff"},panel);
  m("text","HUD Kicker",190,158,286,26,{...textPatch("ORBITAL COMMAND / NODE 07",12,750),fontFamily:"Orbitron",fontId:"orbitron",letterSpacing:1.8,textColor:"#77edff"},panel);
  m("text","HUD Title",190,190,342,58,{...textPatch("SYSTEMS NOMINAL",28,700),fontFamily:"Orbitron",fontId:"orbitron",textColor:"#f0fbff",effects:[effect("text-outline-glow",{color:"#51e8ff",width:1,glow:7})]},panel);
  m("three-d","Holographic Reactor",548,166,194,184,{threeD:{...createElement("three-d").threeD,primitive:"rounded-box",material:"holographic",color:"#57eaff",sideColor:"#5f62ff",rotationX:-18,rotationY:28,rotationZ:8,bevel:12,ambientIntensity:1.4,transparent:true,opacity:82},robloxExportMode:"IMAGE"},panel);
  m("vector","Reactor Compound Reticle",565,181,160,160,{fill:"#59eaff",borderColor:"#b694ff",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"ornamental-frame",thickness:5},shadow:"0 0 20px rgba(63,229,255,.58)"},panel);
  m("ellipse","Reactor Reticle Inner",600,216,90,90,{fill:"transparent",borderColor:"#8b78ff",borderWidth:1,shadow:"0 0 12px rgba(132,105,255,.45)"},panel);
  const stats=[{label:"POWER",value:"98.4%",color:"#62f7c5"},{label:"VECTOR",value:"042.7°",color:"#6fe5ff"},{label:"RANGE",value:"12.8 AU",color:"#c89aff"}];
  stats.forEach((stat,i)=>{m("text",`${stat.label} Label`,190,276+i*48,104,20,{...textPatch(stat.label,10,700),letterSpacing:1.5,textColor:"#708fa4"},panel);m("text",`${stat.label} Value`,300,270+i*48,174,30,{...textPatch(stat.value,20,750,"right"),fontFamily:"Orbitron",fontId:"orbitron",textColor:stat.color},panel);m("line",`${stat.label} Divider`,188,302+i*48,290,1,{fill:"#16394b",borderColor:"transparent"},panel);});
  ["CORE","NAV","COMMS"].forEach((label,i)=>m("button",`HUD ${label} Tab`,518+i*76,384,70,44,{text:label,textAlign:"center",fontFamily:"Orbitron",fontId:"orbitron",fontSize:8,fontSizeDesign:8,responsiveMaxTextSize:8,fontWeight:750,letterSpacing:.8,fill:i===0?"#173f4c":"#0b1e2d",textColor:i===0?"#78f5df":"#718ca0",borderColor:i===0?"#56eac5":"#24485c",borderWidth:1,geometry:{...createElement("button").geometry,kind:"tech-panel",inset:8},shadow:i===0?"0 0 14px rgba(80,232,197,.3)":"none"},panel));
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
  // The backdrop and the component share one insertion offset so complete
  // interfaces stay registered as one coherent composition.
  const b=builder(index),m=b.make;
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
    m("vector","Top Navigation",28,22,904,68,{fill:"#101a2b",opacity:94,borderColor:"#5f8db7",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:8},shadow:"0 14px 32px rgba(5,16,30,.32)"},bg);
    m("text","Game Brand",58,34,260,40,{...textPatch("WILDSCAPE",22,900),fontFamily:"Nunito",fontId:"nunito",letterSpacing:1.2,textColor:"#ffffff"},bg);
    ["PLAY","QUESTS","PACK"].forEach((label,i)=>m("button",`Nav ${label}`,456+i*108,32,98,46,{text:label,textAlign:"center",fontSize:11,fontSizeDesign:11,responsiveMaxTextSize:11,fontWeight:850,fill:i===1?"#62d4a5":"transparent",textColor:i===1?"#10251e":"#b6c9d9",borderColor:i===1?"#aaf1d0":"transparent",borderWidth:1,geometry:{...createElement("button").geometry,kind:i===1?"plaque":"tech-panel",inset:8},shadow:i===1?"0 5px 0 #27795c":"none"},bg));
    m("vector","Currency Chip",790,31,118,46,{fill:"#233652",borderColor:"#f9d976",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"plaque",inset:12},shadow:"none"},bg);
    m("text","Currency Value",804,41,90,26,{...textPatch("◆  2,480",13,850,"center"),textColor:"#ffe281"},bg);
    m("ellipse","Player Avatar",868,102,48,48,{fill:"#78dba3",borderColor:"#d9ffe8",borderWidth:3,shadow:"0 7px 16px rgba(0,0,0,.25)",...gradient("#a7ef9b","#3e96ae",145)},bg);
    m("text","Player Level",816,156,100,28,{...textPatch("LV. 27",11,850,"right"),letterSpacing:1,textColor:"#bce7d1"},bg);
    const rail=m("vector","Mission Rail",24,128,140,390,{fill:"#122a43",borderColor:"#61a8bd",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:12},shadow:"0 18px 38px rgba(3,14,28,.35)",...gradient("#173f4e","#111d35",165)},bg);
    m("text","Mission Rail Title",42,152,104,38,{...textPatch("TODAY",14,900,"center"),fontFamily:"Nunito",fontId:"nunito",letterSpacing:2,textColor:"#a8f0d0"},rail);
    ["DAILY RUN","SKY KEYS","BOSS RAID"].forEach((label,i)=>m("button",`Mission ${label}`,38,208+i*78,112,54,{text:label,textAlign:"center",fontFamily:"Nunito",fontId:"nunito",fontSize:10,fontSizeDesign:10,responsiveMaxTextSize:10,fontWeight:850,fill:i===0?"#2d6b69":"#182b42",textColor:i===0?"#d9fff0":"#a9bfd0",borderColor:i===0?"#6de0b1":"#36566d",borderWidth:1,geometry:{...createElement("button").geometry,kind:i===1?"organic-panel":"tech-panel",inset:10},shadow:i===0?"0 5px 0 #17443c":"none"},rail));
    m("vector","Party Ready Chip",38,458,112,42,{fill:"#684bd8",borderColor:"#bdb1ff",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"plaque",inset:14},shadow:"0 5px 0 #34237f",...gradient("#8f76f4","#553cc1",145)},rail);
    elements.forEach((item)=>{item.y+=62;item.zIndex+=b.elements.length;});
    return [...b.elements,...elements];
  }
  const bg=m("frame","Orbital Backdrop",0,0,960,600,{fill:"#030912",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#071b31","#02050b",128,"#0d1025"),effects:[effect("grain",{size:3,intensity:10}),effect("vignette",{amount:52})]});
  for(let i=0;i<6;i+=1)m("line",`Data Line ${i+1}`,28,110+i*78,904,1,{fill:i%2?"#0d2734":"#10203e",borderColor:"transparent",opacity:72},bg);
  m("text","Command Header",38,28,560,46,{...textPatch("ORBITAL / COMMAND",24,650),fontFamily:"Orbitron",fontId:"orbitron",letterSpacing:3,textColor:"#e8fbff"},bg);
  m("text","Command Status",694,34,220,32,{...textPatch("● LINK STABLE  07:42",11,650,"right"),fontFamily:"Orbitron",fontId:"orbitron",letterSpacing:1,textColor:"#63f3c2"},bg);
  const commandRail=m("vector","Command Rail",22,112,112,430,{fill:"#061421",borderColor:"#1f6075",borderWidth:1,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:12},opacity:92,shadow:"0 0 26px rgba(41,204,235,.12)"},bg);
  ["SYS","MAP","LOG"].forEach((label,i)=>m("button",`Command ${label}`,38,156+i*86,80,56,{text:label,textAlign:"center",fontFamily:"Orbitron",fontId:"orbitron",fontSize:10,fontSizeDesign:10,responsiveMaxTextSize:10,fontWeight:750,letterSpacing:1,fill:i===0?"#113e49":"#081b29",textColor:i===0?"#69f0d0":"#65879a",borderColor:i===0?"#4be3c1":"#224657",borderWidth:1,geometry:{...createElement("button").geometry,kind:"tech-panel",inset:10},shadow:i===0?"0 0 16px rgba(75,227,193,.28)":"none"},commandRail));
  elements.forEach((item)=>{item.y+=38;item.zIndex+=b.elements.length;});
  return [...b.elements,...elements];
}

export function createProfessionalDesignAsset(id:ProfessionalDesignAssetId,index=0){
  if(id==="retro-show-panel")return{elements:retroPanel(index)};
  if(id==="modern-quest-card")return{elements:modernCard(index)};
  if(id==="future-hud-module")return{elements:futureHud(index)};
  if(id==="cinematic-title-card")return{elements:cinematicCard(index)};
  if(id==="minimal-settings-card")return{elements:minimalCard(index)};
  const dimensionalize=(items:EditorElement[],kind:"retro"|"modern"|"future")=>items.map((item)=>{const match=kind==="retro"?/Prize Panel Shell|Prize Title Plate|Prize Marquee|Retro PLAY|Retro PRIZES|Retro HOW TO PLAY/.test(item.name):kind==="modern"?/Adventure Quest Card|Quest Title|Quest Continue|Quest Reward Badge|Nav QUESTS|Party Ready Chip/.test(item.name):/Holographic Command Module|HUD Title|HUD .* Tab|Reactor Compound Reticle|Command SYS/.test(item.name);if(!match)return item;const style=kind==="retro"?"arcade-plastic":kind==="modern"?"premium-cartoon":"futuristic-technology";return{...item,shadow:"none",dimension:applyDimensionalStyle(item.dimension,style)};});
  if(id==="demo-retro-game-show")return{elements:dimensionalize(decorateDemo(retroPanel(index),"retro",index),"retro"),background:"#1a0f51"};
  if(id==="demo-modern-roblox")return{elements:dimensionalize(decorateDemo(modernCard(index),"modern",index),"modern"),background:"#132d4f"};
  return{elements:dimensionalize(decorateDemo(futureHud(index),"future",index),"future"),background:"#030912"};
}

export type CreativeTreatmentId="depth"|"gloss"|"border"|"highlight"|"retro"|"texture"|"glow"|"chrome"|"holographic"|"cartoon-plastic"|"cinematic-metal";

export function applyCreativeTreatment(element:EditorElement,treatment:CreativeTreatmentId){
  const without=(types:string[])=>element.effects.filter((item)=>!types.includes(item.type));
  if(treatment==="depth")return{dimension:applyDimensionalStyle(element.dimension,"premium-cartoon"),shadow:"none",translateZ:Math.max(10,element.translateZ),rotateX:element.rotateX||2,effects:without(["bevel","drop-shadow"])} satisfies Patch;
  if(treatment==="gloss")return{gradientType:"linear",gradientAngle:180,gradientStops:stops(element.fill==="transparent"?"#e7f8ff":element.fill,"#59677d"),effects:[...without(["glass","light-sweep"]),effect("glass",{blur:8,opacity:20}),effect("light-sweep",{width:25,intensity:82,angle:110})]} satisfies Patch;
  if(treatment==="border")return{borderWidth:Math.max(3,element.borderWidth),cornerRadius:Math.max(10,element.cornerRadius),corners:corners(Math.max(10,element.cornerRadius)),effects:[...without(["gradient-border","inner-shadow"]),effect("gradient-border",{colorA:"#fff17b",colorB:"#5de7ff",colorC:"#9d5cff",width:3}),effect("inner-shadow",{y:3,blur:8,opacity:35})]} satisfies Patch;
  if(treatment==="highlight")return{effects:[...without(["light-sweep","shimmer"]),effect("light-sweep",{width:18,intensity:100,angle:118}),effect("shimmer",{width:16,opacity:52,angle:110})]} satisfies Patch;
  if(treatment==="retro")return{fontFamily:(element.type==="text"||element.type==="button")?"Bungee":element.fontFamily,fontId:(element.type==="text"||element.type==="button")?"bungee":element.fontId,fontWeight:Math.max(800,element.fontWeight),borderWidth:Math.max(4,element.borderWidth),cornerRadius:Math.max(16,element.cornerRadius),corners:corners(Math.max(16,element.cornerRadius)),shadow:"0 8px 0 #512065, 0 16px 28px rgba(0,0,0,.3)",effects:[...without(["halftone","bevel"]),effect("halftone",{size:9,dotSize:2,opacity:22,color:"#241038"}),effect("bevel",{size:5,depth:95})]} satisfies Patch;
  if(treatment==="texture")return{effects:[...without(["grain","vignette"]),effect("grain",{size:3,intensity:18}),effect("vignette",{amount:24,softness:72})]} satisfies Patch;
  if(treatment==="glow")return{effects:[...without(["neon-glow","edge-glow"]),effect("neon-glow",{color:element.borderColor==="transparent"?"#63eaff":element.borderColor,radius:18,layers:3,intensity:115}),effect("edge-glow",{color:"#a48bff",radius:8,opacity:58})]} satisfies Patch;
  if(treatment==="chrome")return{dimension:applyDimensionalStyle(element.dimension,"chrome-metallic"),fill:"#b9c7d4",borderColor:"#edf8ff",borderWidth:Math.max(2,element.borderWidth),shadow:"none",effects:without(["bevel","light-sweep","grain"])} satisfies Patch;
  if(treatment==="holographic")return{dimension:applyDimensionalStyle(element.dimension,"holographic-glass"),fill:"#5ae7f2",borderColor:"#d9fbff",borderWidth:Math.max(2,element.borderWidth),blendMode:"screen",shadow:"none",effects:[...without(["holographic","edge-glow"]),effect("edge-glow",{color:"#65efff",radius:10,opacity:66})]} satisfies Patch;
  if(treatment==="cartoon-plastic")return{dimension:applyDimensionalStyle(element.dimension,"premium-cartoon"),borderColor:"#ffffff",borderWidth:Math.max(3,element.borderWidth),shadow:"none",effects:without(["bevel","light-sweep","inner-shadow"])} satisfies Patch;
  return{dimension:applyDimensionalStyle(element.dimension,"cinematic-depth"),fill:"#303844",borderColor:"#9ca9b8",borderWidth:Math.max(1,element.borderWidth),shadow:"none",effects:[...without(["bevel","grain","vignette"]),effect("grain",{size:2,intensity:12}),effect("vignette",{amount:20,softness:70})]} satisfies Patch;
}
