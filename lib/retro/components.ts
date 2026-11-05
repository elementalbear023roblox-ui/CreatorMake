import { createElement, createId } from "../editor/project.ts";
import type { EditorAsset, EditorElement, ElementType, RetroComponentKind, RetroMetadata, RetroVisualFamily } from "../editor/types.ts";
import { createVisualEffect } from "../effects/registry.ts";

export type RetroCategory="Windows"|"Frames"|"Buttons"|"Text"|"Icons"|"Pixel Art"|"Patterns"|"Decorations"|"Components"|"Templates";
export type RetroAssetId=
  |"window-98-app"|"window-95-dialog"|"window-internet"
  |"frame-checker"|"frame-stepped"|"frame-cdrom"
  |"button-win98"|"button-arcade"|"button-cdrom"|"button-gameshow"
  |"text-pixel-title"|"icon-computer"|"pattern-checker"|"decoration-stars"|"component-warning"
  |"template-windows98"|"template-cdrom"|"template-creator-time";

export type RetroLibraryItem={
  id:RetroAssetId;name:string;category:RetroCategory;family:RetroVisualFamily;description:string;preview:string;badge?:string;
};

export const RETRO_LIBRARY:RetroLibraryItem[]=[
  {id:"window-98-app",name:"Windows 98 Application",category:"Windows",family:"windows",description:"Editable title bar, menu, controls, status bar, and recessed content.",preview:"win98",badge:"SIGNATURE"},
  {id:"window-95-dialog",name:"Classic System Dialog",category:"Windows",family:"windows",description:"Compact raised dialog with original warning icon and action row.",preview:"win95"},
  {id:"window-internet",name:"Web Surfer Window",category:"Windows",family:"internet",description:"Early-browser chrome with tiled page graphics and chunky navigation.",preview:"internet"},
  {id:"frame-checker",name:"Checker Slice Frame",category:"Frames",family:"gameshow",description:"Crisp repeating purple-and-yellow nine-slice border.",preview:"checker",badge:"9-SLICE"},
  {id:"frame-stepped",name:"Stepped Pixel Frame",category:"Frames",family:"arcade",description:"Layered frame with preserved pixel corners and inset center.",preview:"stepped"},
  {id:"frame-cdrom",name:"Chrome CD-ROM Frame",category:"Frames",family:"cdrom",description:"Metallic compound rail with glossy dimensional accents.",preview:"chrome"},
  {id:"button-win98",name:"Windows 98 Button",category:"Buttons",family:"windows",description:"Rectangular raised system button with pressed-ready construction.",preview:"button-win"},
  {id:"button-arcade",name:"Arcade Action Button",category:"Buttons",family:"arcade",description:"High-contrast electronic action control with pixel depth.",preview:"button-arcade"},
  {id:"button-cdrom",name:"Glossy CD-ROM Button",category:"Buttons",family:"cdrom",description:"Asymmetric dimensional control with reflective highlight.",preview:"button-cdrom"},
  {id:"button-gameshow",name:"Game Show Buzzer",category:"Buttons",family:"gameshow",description:"Chunky candy-plastic control for loud 1990s interfaces.",preview:"button-show"},
  {id:"text-pixel-title",name:"Pixel Display Title",category:"Text",family:"arcade",description:"Sharp display lettering with editable outline and shadow.",preview:"type"},
  {id:"icon-computer",name:"Retro Computer Icon",category:"Icons",family:"windows",description:"Original editable pixel-style desktop computer icon.",preview:"icon"},
  {id:"pattern-checker",name:"Web Checker Tile",category:"Patterns",family:"internet",description:"Editable checker background with deliberately crisp scale.",preview:"pattern"},
  {id:"decoration-stars",name:"Game Show Star Cluster",category:"Decorations",family:"gameshow",description:"Independent colorful star and sparkle layers.",preview:"stars"},
  {id:"component-warning",name:"Corrupted Warning Panel",category:"Components",family:"horror",description:"CRT warning panel with scanline and chromatic treatments.",preview:"horror"},
  {id:"template-windows98",name:"Template · Windows 98 App",category:"Templates",family:"windows",description:"Complete late-1990s utility interface with editable hierarchy.",preview:"template-win",badge:"TEMPLATE"},
  {id:"template-cdrom",name:"Template · CD-ROM Menu",category:"Templates",family:"cdrom",description:"Colorful metallic multimedia launcher with glossy controls.",preview:"template-cd",badge:"TEMPLATE"},
  {id:"template-creator-time",name:"Template · Creator Time",category:"Templates",family:"gameshow",description:"Purple-and-yellow game-show popup with a dramatic title and close control.",preview:"template-show",badge:"TEMPLATE"},
];

export type RetroBuildResult={elements:EditorElement[];assets:EditorAsset[];background?:string;rootId:string};
type Patch=Partial<EditorElement>;
type Builder={elements:EditorElement[];make:(type:ElementType,name:string,x:number,y:number,width:number,height:number,patch?:Patch,parent?:EditorElement|null,role?:string)=>EditorElement};

const corners=(value:number)=>({tl:value,tr:value,br:value,bl:value});
const stops=(a:string,b:string,c?:string)=>[{id:createId("stop"),color:a,position:0,opacity:100},...(c?[{id:createId("stop"),color:b,position:52,opacity:100},{id:createId("stop"),color:c,position:100,opacity:100}]:[{id:createId("stop"),color:b,position:100,opacity:100}])];
const text=(value:string,size:number,weight=700,align:"left"|"center"|"right"="left"):Patch=>({text:value,fontSize:size,fontSizeDesign:size,responsiveMaxTextSize:size,fontWeight:weight,textAlign:align,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",padding:0,textPadding:{top:0,right:0,bottom:0,left:0}});
const gradient=(a:string,b:string,angle=180,c?:string):Patch=>({gradientType:"linear",gradientAngle:angle,gradientStops:stops(a,b,c)});
const effect=(type:string,parameters:Record<string,string|number|boolean>={})=>{const value=createVisualEffect(type);value.parameters={...value.parameters,...parameters};return value;};

function builder(id:RetroAssetId,family:RetroVisualFamily,kind:RetroComponentKind,index:number):Builder{
  const elements:EditorElement[]=[],componentId=createId(`retro-${id}`),offset=(index%4)*14;
  const make:Builder["make"]=(type,name,x,y,width,height,patch={},parent=null,role="part")=>{
    const item=createElement(type,index+elements.length);
    const retro:RetroMetadata={componentId,assetId:id,family,kind,role,style:id,pixelScale:2};
    Object.assign(item,{id:createId(`retro-${role}`),name,x:x+offset,y:y+offset,width,height,zIndex:index+elements.length+1,retro,...patch});
    if(parent)item.parentId=parent.id;
    if(item.type==="text"||item.type==="button"){item.fontSizeDesign=item.fontSize;item.responsiveMaxTextSize=Math.max(item.responsiveMinTextSize,item.fontSize);item.textPadding={top:item.padding,right:item.padding,bottom:item.padding,left:item.padding};}
    elements.push(item);return item;
  };
  return{elements,make};
}

function windows98(id:RetroAssetId,index:number,complete=false):RetroBuildResult{
  const b=builder(id,"windows",complete?"template":"window",index),m=b.make;
  const root=m("frame",complete?"Windows 98 Studio":"Windows 98 Window",complete?72:172,complete?58:104,complete?816:616,complete?486:388,{fill:"#c0c0c0",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),frameType:"window",shadow:"3px 3px 0 #000000, inset -2px -2px 0 #404040, inset 2px 2px 0 #dfdfdf"},null,"window");
  const title=m("frame","Active Title Bar",root.x+7,root.y+7,root.width-14,30,{fill:"#000080",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#000080","#1084d0",90)},root,"titlebar");
  m("rectangle","Application Icon",title.x+5,title.y+5,20,20,{fill:"#ffe76b",borderColor:"#000000",borderWidth:1,cornerRadius:0,corners:corners(0),shadow:"inset -2px -2px 0 #9b5e00"},title,"icon");
  m("text","Window Title",title.x+31,title.y+4,title.width-130,22,{...text(complete?"CreatorMake 98 · Retro Project":"Retro Painter 98",14,800),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#ffffff"},title,"title");
  ["_","□","×"].forEach((label,i)=>m("button",`Window ${i===0?"Minimize":i===1?"Maximize":"Close"}`,title.x+title.width-70+i*22,title.y+5,19,20,{...text(label,12,900,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -1px -1px 0 #000000, inset 1px 1px 0 #dfdfdf"},title,"control"));
  const menu=m("frame","Menu Bar",root.x+8,root.y+40,root.width-16,27,{fill:"#c0c0c0",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0)},root,"menu");
  ["File","Edit","View","Insert","Help"].forEach((label,i)=>m("text",`${label} Menu`,menu.x+8+i*54,menu.y+5,50,18,{...text(label,12,400),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#000000",textDecoration:i===0?"underline":"none"},menu,"menu-item"));
  const body=m("frame","Recessed Content",root.x+10,root.y+70,root.width-20,root.height-108,{fill:"#ffffff",borderColor:"#808080",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset 2px 2px 0 #000000, inset -2px -2px 0 #dfdfdf"},root,"content");
  if(complete){
    const rail=m("frame","Tool Rail",body.x+8,body.y+8,150,body.height-16,{fill:"#c0c0c0",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -1px -1px 0 #808080"},body,"navigation");
    m("text","Tool Rail Heading",rail.x+10,rail.y+10,128,24,{...text("COMPONENTS",12,800),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#000000"},rail,"label");
    ["Windows","Buttons","Pixel Art","Patterns"].forEach((label,i)=>m("button",`${label} Tool`,rail.x+10,rail.y+42+i*45,128,34,{...text(label,12,500),fill:i===0?"#000080":"#c0c0c0",textColor:i===0?"#ffffff":"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -1px -1px 0 #404040"},rail,"navigation-item"));
    const doc=m("frame","Document Canvas",body.x+168,body.y+8,body.width-176,body.height-16,{fill:"#008080",borderColor:"#808080",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset 2px 2px 0 #000000"},body,"workspace");
    const dialog=m("frame","Example Dialog",doc.x+84,doc.y+48,356,202,{fill:"#c0c0c0",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),shadow:"4px 4px 0 rgba(0,0,0,.55), inset -2px -2px 0 #404040"},doc,"window");
    const dialogTitle=m("frame","Dialog Title Bar",dialog.x+6,dialog.y+6,dialog.width-12,26,{fill:"#000080",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0)},dialog,"titlebar");
    m("text","Dialog Title",dialogTitle.x+7,dialogTitle.y+4,250,19,{...text("Welcome to CreatorMake 98",13,800),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#ffffff"},dialogTitle,"title");
    m("text","Dialog Message",dialog.x+28,dialog.y+60,300,54,{...text("Your retro interface is ready.\nEvery layer remains editable.",13,400,"center"),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#000000",lineHeight:1.35},dialog,"content");
    m("button","Dialog OK",dialog.x+128,dialog.y+138,100,34,{...text("OK",13,600,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -2px -2px 0 #000000, inset 2px 2px 0 #dfdfdf"},dialog,"button");
  }else{
    m("text","Window Welcome",body.x+24,body.y+24,body.width-48,52,{...text("Welcome to Retro Painter 98",22,700),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#000080"},body,"content");
    m("text","Window Copy",body.x+24,body.y+78,body.width-48,50,{...text("Choose a component from the library, then customize it with the Properties panel.",13,400),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#202020",lineHeight:1.4},body,"content");
    m("button","Primary Action",body.x+body.width-142,body.y+body.height-56,116,34,{...text("Continue",13,600,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -2px -2px 0 #000000, inset 2px 2px 0 #dfdfdf"},body,"button");
  }
  const status=m("frame","Status Bar",root.x+10,root.y+root.height-32,root.width-20,22,{fill:"#c0c0c0",borderColor:"#808080",borderWidth:1,cornerRadius:0,corners:corners(0),shadow:"inset 1px 1px 0 #ffffff"},root,"status");
  m("text","Status Text",status.x+6,status.y+3,status.width-12,16,{...text(complete?"Ready · 18 editable layers":"Ready",11,400),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#202020"},status,"status-text");
  return{elements:b.elements,assets:[],background:complete?"#008080":undefined,rootId:root.id};
}

function systemDialog(index:number):RetroBuildResult{
  const b=builder("window-95-dialog","windows","window",index),m=b.make;
  const root=m("frame","Classic System Dialog",238,154,484,288,{fill:"#c0c0c0",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),frameType:"window",shadow:"4px 4px 0 #000, inset -2px -2px 0 #404040"},null,"window");
  const title=m("frame","Dialog Title Bar",root.x+7,root.y+7,root.width-14,28,{fill:"#000080",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0)},root,"titlebar");
  m("text","Dialog Title",title.x+8,title.y+4,350,20,{...text("CreatorMake System Message",13,800),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#ffffff"},title,"title");
  m("button","Close",title.x+title.width-24,title.y+4,20,20,{...text("×",13,900,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -1px -1px 0 #000"},title,"control");
  m("vector","Original Warning Icon",root.x+28,root.y+72,66,58,{fill:"#ffe23f",borderColor:"#000000",borderWidth:3,geometry:{...createElement("vector").geometry,kind:"triangle"}},root,"icon");
  m("text","Warning Mark",root.x+48,root.y+87,26,33,{...text("!",25,900,"center"),textColor:"#000000"},root,"icon-label");
  m("text","Dialog Message",root.x+112,root.y+70,330,92,{...text("This interface contains dangerously high levels of nostalgia. Continue?",14,400),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#000000",lineHeight:1.45},root,"content");
  ["Yes","No","Details…"].forEach((label,i)=>m("button",`${label} Button`,root.x+104+i*104,root.y+214,92,34,{...text(label,13,i===0?700:400,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -2px -2px 0 #000, inset 2px 2px 0 #dfdfdf"},root,"button"));
  return{elements:b.elements,assets:[],rootId:root.id};
}

function internetWindow(index:number):RetroBuildResult{
  const b=builder("window-internet","internet","window",index),m=b.make;
  const root=m("frame","Web Surfer 3.0",160,94,640,412,{fill:"#c0c0c0",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),shadow:"4px 4px 0 #171717, inset -2px -2px 0 #404040"},null,"window");
  const title=m("frame","Browser Title Bar",root.x+7,root.y+7,root.width-14,28,{fill:"#800080",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#5b1b83","#d336a6",90)},root,"titlebar");
  m("text","Browser Title",title.x+8,title.y+4,470,20,{...text("Web Surfer 3.0 — CreatorMake Home",13,800),fontFamily:"Tahoma",fontId:"tahoma",textColor:"#ffffff"},title,"title");
  const toolbar=m("frame","Navigation Toolbar",root.x+9,root.y+42,root.width-18,58,{fill:"#c0c0c0",borderColor:"#808080",borderWidth:1,cornerRadius:0,corners:corners(0)},root,"toolbar");
  ["←","→","⌂","★"].forEach((label,i)=>m("button",`Browser ${label}`,toolbar.x+7+i*39,toolbar.y+8,33,28,{...text(label,15,800,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset -1px -1px 0 #000"},toolbar,"button"));
  m("frame","Address Field",toolbar.x+174,toolbar.y+8,toolbar.width-183,28,{fill:"#ffffff",borderColor:"#808080",borderWidth:2,cornerRadius:0,corners:corners(0),shadow:"inset 1px 1px 0 #000"},toolbar,"field");
  m("text","Address Text",toolbar.x+184,toolbar.y+13,toolbar.width-204,18,{...text("http://www.creatormake.local/retro",11,400),fontFamily:"Courier New",fontId:"courier",textColor:"#000000"},toolbar,"field-text");
  const page=m("frame","Early Web Page",root.x+10,root.y+104,root.width-20,root.height-142,{fill:"#000066",borderColor:"#000000",borderWidth:2,cornerRadius:0,corners:corners(0),...gradient("#000066","#24004b",135)},root,"content");
  m("text","Web Banner",page.x+28,page.y+20,page.width-56,66,{...text("★ CREATORMAKE ONLINE ★",30,900,"center"),fontFamily:"Times New Roman",fontId:"times",textColor:"#ffff00",textStrokeColor:"#ff00ff",textStrokeWidth:2,textShadows:["3px 3px 0 #00ffff"]},page,"title");
  m("line","Rainbow Rule",page.x+34,page.y+96,page.width-68,8,{fill:"#00ffff",borderColor:"#ff00ff",borderWidth:2,shadow:"0 0 0 2px #ffff00"},page,"decoration");
  m("text","Web Copy",page.x+80,page.y+126,page.width-160,72,{...text("Welcome, net traveler!\nBuild cool interfaces for the information superhighway.",16,700,"center"),fontFamily:"Courier New",fontId:"courier",textColor:"#ffffff",lineHeight:1.5},page,"content");
  m("button","Enter Website",page.x+190,page.y+214,220,38,{...text("ENTER THE GUI ZONE",14,800,"center"),fontFamily:"Courier New",fontId:"courier",fill:"#ffff00",textColor:"#000080",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),shadow:"5px 5px 0 #ff00ff"},page,"button");
  return{elements:b.elements,assets:[],rootId:root.id};
}

function nineSliceFrame(index:number):RetroBuildResult{
  const id="frame-checker" as const,b=builder(id,"gameshow","frame",index),m=b.make,componentId=createId("checker-slice"),assetId=createId("checker-slice-asset");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" shape-rendering="crispEdges"><path fill="#35115f" d="M0 0h64v64H0z"/><path fill="#fff15a" d="M0 0h16v8H0zm16 8h16v8H16zm32-8h16v8H48zm0 48h16v8H48zM16 48h16v8H16zM0 56h16v8H0zM0 16h8v16H0zm8 16h8v16H8zM56 16h8v16h-8zm-8 16h8v16h-8z"/><path fill="#9c4dff" d="M8 0h8v8H8zm24 0h16v8H32zM0 8h16v8H0zm48 8h16v32H48zM0 48h16v8H0zm32 48h16v8H32z"/><path fill="#6e28b8" d="M16 16h32v32H16z"/><path fill="#160829" d="M20 20h24v24H20z"/></svg>`;
  const dataUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,asset:EditorAsset={id:assetId,name:"Checker Slice Border",originalName:"checker-slice.svg",kind:"texture",folder:"Retro Frames",mimeType:"image/svg+xml",format:"SVG",width:64,height:64,fileSize:svg.length,contentHash:componentId,dataUrl,thumbnailDataUrl:dataUrl,createdAt:Date.now(),animated:false,warning:null,favorite:false};
  const frame=m("image","Checker Nine-Slice Frame",190,120,580,360,{imageAssetId:asset.id,imageFit:"stretch",sliceCenter:{left:16,top:16,right:48,bottom:48},sliceScale:1,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"8px 8px 0 rgba(22,8,41,.65)",roblox:{className:"ImageLabel"}},null,"nine-slice");
  frame.retro={componentId,assetId:id,family:"gameshow",kind:"frame",role:"nine-slice",style:id,pixelScale:2};
  return{elements:b.elements,assets:[asset],rootId:frame.id};
}

function layeredFrame(id:"frame-stepped"|"frame-cdrom",index:number):RetroBuildResult{
  const cd=id==="frame-cdrom",family:RetroVisualFamily=cd?"cdrom":"arcade",b=builder(id,family,"frame",index),m=b.make;
  const root=m("vector",cd?"Chrome CD-ROM Frame":"Stepped Pixel Frame",176,112,608,376,{fill:cd?"#23304a":"#1a123d",borderColor:cd?"#d9f6ff":"#f3ff58",borderWidth:cd?4:8,geometry:{...createElement("vector").geometry,kind:cd?"tech-panel":"cut-corner-rectangle",inset:cd?18:14},shadow:cd?"0 14px 0 #080f1e, 0 24px 40px rgba(0,0,0,.5)":"8px 8px 0 #080513",...gradient(cd?"#dff8ff":"#6d2dcc",cd?"#54627e":"#17113b",145,cd?"#18233b":"#ff3c9b"),effects:cd?[effect("bevel",{size:7,depth:92}),effect("light-sweep",{width:18,intensity:70,angle:118})]:[effect("dither",{scale:2,density:28})]},null,"frame");
  const inner=m("vector",cd?"Chrome Inner Rail":"Pixel Inner Rail",root.x+24,root.y+24,root.width-48,root.height-48,{fill:cd?"#10192d":"#24145b",borderColor:cd?"#5de5ff":"#ff5ecf",borderWidth:cd?3:6,geometry:{...createElement("vector").geometry,kind:cd?"tech-panel":"cut-corner-rectangle",inset:cd?14:10},shadow:"inset 5px 5px 0 rgba(0,0,0,.45)"},root,"inner-frame");
  m("text",cd?"Disc Console Title":"Arcade Frame Title",inner.x+32,inner.y+32,inner.width-64,54,{...text(cd?"MULTIMEDIA CONTROL DECK":"PLAYER SELECT",cd?25:28,900,"center"),fontFamily:cd?"Orbitron":"Bungee",fontId:cd?"orbitron":"bungee",textColor:cd?"#dffaff":"#fff45b",textStrokeColor:cd?"#14223c":"#611a80",textStrokeWidth:cd?1:3,textShadows:[cd?"0 3px 0 #28718f":"4px 4px 0 #ff3d9c"]},inner,"title");
  return{elements:b.elements,assets:[],rootId:root.id};
}

function retroButton(id:"button-win98"|"button-arcade"|"button-cdrom"|"button-gameshow",index:number):RetroBuildResult{
  const family:RetroVisualFamily=id==="button-win98"?"windows":id==="button-cdrom"?"cdrom":id==="button-gameshow"?"gameshow":"arcade",b=builder(id,family,"button",index),m=b.make;
  const patch:Patch=id==="button-win98"?{...text("OK",14,600,"center"),fill:"#c0c0c0",textColor:"#000000",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),shadow:"inset -2px -2px 0 #000000, inset 2px 2px 0 #dfdfdf"}:id==="button-arcade"?{...text("START GAME",18,900,"center"),fontFamily:"Orbitron",fontId:"orbitron",fill:"#15122f",textColor:"#74f7ff",borderColor:"#ff4bd2",borderWidth:5,cornerRadius:2,corners:corners(2),shadow:"0 8px 0 #07050e, 0 0 18px rgba(70,235,255,.55)"}:id==="button-cdrom"?{...text("EXPLORE",18,900,"center"),fontFamily:"Arial Black",fontId:"arial",fill:"#2b4f77",textColor:"#ffffff",borderColor:"#d8f7ff",borderWidth:3,geometry:{...createElement("button").geometry,kind:"tech-panel",inset:12},shadow:"0 10px 0 #13243b, 0 18px 34px rgba(0,0,0,.4)",...gradient("#9feaff","#355d91",155,"#1a2c52"),effects:[effect("bevel",{size:5,depth:82}),effect("light-sweep",{width:20,intensity:74,angle:118})]}:{...text("BUZZ!",24,900,"center"),fontFamily:"Bungee",fontId:"bungee",fill:"#ffcb38",textColor:"#5b185e",borderColor:"#fff7a8",borderWidth:5,cornerRadius:28,corners:corners(28),shadow:"0 12px 0 #9a2c74, 0 20px 34px rgba(0,0,0,.36)",...gradient("#fff064","#ff7a2f",180),effects:[effect("bevel",{size:6,depth:94})]};
  const button=m("button",RETRO_LIBRARY.find((item)=>item.id===id)!.name,330,236,id==="button-gameshow"?300:260,id==="button-gameshow"?92:68,patch,null,"button");
  return{elements:b.elements,assets:[],rootId:button.id};
}

function simpleAsset(id:Exclude<RetroAssetId,"window-98-app"|"window-95-dialog"|"window-internet"|"frame-checker"|"frame-stepped"|"frame-cdrom"|"button-win98"|"button-arcade"|"button-cdrom"|"button-gameshow"|"template-windows98"|"template-cdrom"|"template-creator-time">,index:number):RetroBuildResult{
  const item=RETRO_LIBRARY.find((entry)=>entry.id===id)!,b=builder(id,item.family,item.category==="Patterns"?"pattern":item.category==="Icons"?"decoration":item.category==="Text"?"decoration":"decoration",index),m=b.make;
  if(id==="text-pixel-title"){const root=m("text","Pixel Display Title",244,230,472,92,{...text("INSERT COIN",42,900,"center"),fontFamily:"Press Start 2P",fontId:"press-start-2p",textColor:"#fff45d",textStrokeColor:"#7b1d9b",textStrokeWidth:3,textShadows:["5px 5px 0 #ff3f9c"],letterSpacing:2},null,"title");return{elements:b.elements,assets:[],rootId:root.id};}
  if(id==="icon-computer"){const root=m("frame","Retro Computer Icon",374,174,212,220,{fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none"},null,"icon");m("frame","Computer Monitor",root.x+22,root.y+18,168,124,{fill:"#d8d2bd",borderColor:"#ffffff",borderWidth:5,cornerRadius:2,corners:corners(2),shadow:"8px 8px 0 #756f60"},root,"part");m("frame","Computer Screen",root.x+42,root.y+38,128,78,{fill:"#0b5260",borderColor:"#2a2a24",borderWidth:5,cornerRadius:0,corners:corners(0),shadow:"inset 5px 5px 0 #07323b"},root,"screen");m("line","Screen Cursor",root.x+62,root.y+80,48,8,{fill:"#7bffcc",borderColor:"transparent",borderWidth:0,shadow:"0 0 8px #7bffcc"},root,"cursor");m("vector","Monitor Stand",root.x+78,root.y+142,56,42,{fill:"#c2baa3",borderColor:"#6f695c",borderWidth:3,geometry:{...createElement("vector").geometry,kind:"trapezoid"}},root,"part");m("frame","Keyboard",root.x+38,root.y+184,140,25,{fill:"#b7af9b",borderColor:"#ffffff",borderWidth:3,cornerRadius:0,corners:corners(0),shadow:"4px 4px 0 #6d675a"},root,"part");return{elements:b.elements,assets:[],rootId:root.id};}
  if(id==="pattern-checker"){const root=m("frame","Early Web Checker Pattern",190,120,580,360,{fill:"#270054",borderColor:"#ffff00",borderWidth:4,cornerRadius:0,corners:corners(0),effects:[effect("checkerboard",{size:24,colorA:"#270054",colorB:"#007777",opacity:100})]},null,"pattern");return{elements:b.elements,assets:[],rootId:root.id};}
  if(id==="decoration-stars"){const root=m("container","Game Show Star Cluster",310,170,340,260,{fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none"},null,"cluster");[[20,40,92,"#fff15b"],[150,10,64,"#ff4d9d"],[232,92,78,"#54efff"],[80,150,48,"#a876ff"],[214,184,38,"#fff15b"]].forEach(([x,y,size,color],i)=>m("star",`Show Star ${i+1}`,root.x+Number(x),root.y+Number(y),Number(size),Number(size),{fill:String(color),borderColor:"#ffffff",borderWidth:3,rotation:i%2?18:-14,shadow:`5px 5px 0 ${i%2?"#5d267f":"#b62c70"}`},root,"star"));return{elements:b.elements,assets:[],rootId:root.id};}
  const root=m("vector","Corrupted Warning Panel",190,160,580,280,{fill:"#07140d",borderColor:"#5cff76",borderWidth:3,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:18},shadow:"8px 8px 0 #001306, 0 0 22px rgba(68,255,112,.34)",effects:[effect("scanlines",{spacing:5,intensity:38}),effect("chromatic-aberration",{amount:3})]},null,"panel");m("text","Warning Code",root.x+38,root.y+42,root.width-76,46,{...text("SYSTEM//MEMORY ERROR",25,900,"center"),fontFamily:"VT323",fontId:"vt323",textColor:"#79ff8e",textShadows:["3px 0 0 #ff335f","-3px 0 0 #22aaff"]},root,"title");m("text","Warning Body",root.x+58,root.y+112,root.width-116,88,{...text("DO NOT CLOSE THIS WINDOW\nRECOVERY LOOP: 09/??",20,500,"center"),fontFamily:"VT323",fontId:"vt323",textColor:"#d8ffe0",lineHeight:1.4},root,"content");return{elements:b.elements,assets:[],rootId:root.id};
}

function cdromTemplate(index:number):RetroBuildResult{
  const b=builder("template-cdrom","cdrom","template",index),m=b.make;
  const bg=m("frame","CD-ROM Starfield",0,0,960,600,{fill:"#08132f",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#32125f","#061c3d",135,"#0e6b76"),effects:[effect("grain",{size:3,intensity:14}),effect("vignette",{amount:36,softness:70})]},null,"background");
  const disc=m("ellipse","Compact Disc",620,88,260,260,{fill:"#93efff",borderColor:"#f5ffff",borderWidth:4,shadow:"0 18px 36px rgba(0,0,0,.45)",gradientType:"conic",gradientStops:stops("#f7fdff","#7b65ff","#ff6fd4"),effects:[effect("holographic",{intensity:62})]},bg,"decoration");m("ellipse","Disc Hub",disc.x+91,disc.y+91,78,78,{fill:"#07152b",borderColor:"#dffaff",borderWidth:4,shadow:"inset 0 0 20px #000"},disc,"decoration");
  const console=m("vector","Multimedia Console",76,74,604,454,{fill:"#182440",borderColor:"#d9f7ff",borderWidth:4,geometry:{...createElement("vector").geometry,kind:"tech-panel",inset:22},shadow:"0 18px 0 #050a18, 0 32px 54px rgba(0,0,0,.55)",...gradient("#52617f","#17213b",145,"#080f24"),effects:[effect("bevel",{size:8,depth:88})]},bg,"window");
  m("text","CD-ROM Logo",console.x+42,console.y+42,470,72,{...text("CREATOR DISC",42,900),fontFamily:"Orbitron",fontId:"orbitron",textColor:"#efffff",textStrokeColor:"#21476c",textStrokeWidth:2,textShadows:["0 6px 0 #5f2c88"]},console,"title");
  m("text","CD-ROM Subtitle",console.x+46,console.y+112,430,32,{...text("INTERACTIVE MULTIMEDIA EXPERIENCE",13,700),fontFamily:"Orbitron",fontId:"orbitron",textColor:"#69efff",letterSpacing:2},console,"subtitle");
  const labels=["EXPLORE","PLAY MOVIE","GALLERY","EXIT"];
  labels.forEach((label,i)=>m("button",`CD ${label}`,console.x+48,console.y+176+i*58,334,44,{...text(label,15,900),fontFamily:"Arial Black",fontId:"arial",fill:i===0?"#6f4cff":"#263c63",textColor:"#ffffff",borderColor:i===0?"#f0ddff":"#75dfff",borderWidth:3,geometry:{...createElement("button").geometry,kind:"tech-panel",inset:10},shadow:"0 7px 0 #10172b",...gradient(i===0?"#c26eff":"#4f7aa2",i===0?"#5630bf":"#1d2d52",160),effects:[effect("light-sweep",{width:16,intensity:56,angle:120})]},console,"button"));
  m("text","CD Version",console.x+410,console.y+350,142,54,{...text("DISC 01\nVERSION 2.98",12,700,"center"),fontFamily:"Courier New",fontId:"courier",textColor:"#9fefff",lineHeight:1.45},console,"label");
  return{elements:b.elements,assets:[],background:"#08132f",rootId:bg.id};
}

function creatorTimeTemplate(index:number):RetroBuildResult{
  const b=builder("template-creator-time","gameshow","template",index),m=b.make;
  const bg=m("frame","Creator Time Stage",0,0,960,600,{fill:"#250b59",borderColor:"transparent",borderWidth:0,cornerRadius:0,corners:corners(0),...gradient("#6e1aa8","#281063",135,"#061e5d"),effects:[effect("halftone",{size:14,dotSize:2,opacity:22,color:"#ffef67"})]},null,"background");
  [[36,64,128,"#ffea53"],[760,62,144,"#ff4aa8"],[54,412,116,"#45e8ff"],[820,432,86,"#ffea53"]].forEach(([x,y,size,color],i)=>m("star",`Stage Star ${i+1}`,Number(x),Number(y),Number(size),Number(size),{fill:String(color),opacity:24,borderColor:String(color),borderWidth:4,rotation:i%2?18:-18},bg,"decoration"));
  const popup=m("vector","Creator Time Popup",142,96,676,420,{fill:"#7b28c3",borderColor:"#fff05a",borderWidth:8,geometry:{...createElement("vector").geometry,kind:"arcade-marquee",inset:24},shadow:"0 16px 0 #240c4e, 0 30px 54px rgba(0,0,0,.5)",...gradient("#d14fe9","#6c24ba",145,"#2a1979"),effects:[effect("bevel",{size:8,depth:98})]},bg,"window");
  const inner=m("vector","Creator Time Inner Frame",popup.x+28,popup.y+72,popup.width-56,popup.height-100,{fill:"#251052",borderColor:"#55edff",borderWidth:5,geometry:{...createElement("vector").geometry,kind:"ornamental-frame",thickness:7},shadow:"inset 0 12px 28px rgba(0,0,0,.5)"},popup,"content");
  const plate=m("vector","Dimensional Title Plate",popup.x+86,popup.y+20,popup.width-172,96,{fill:"#ffcf36",borderColor:"#fff9ab",borderWidth:5,geometry:{...createElement("vector").geometry,kind:"ribbon",inset:14,thickness:18},shadow:"0 10px 0 #a6327d, 0 18px 30px rgba(0,0,0,.35)",...gradient("#fff36b","#ff7e31",180),effects:[effect("bevel",{size:6,depth:94})]},popup,"titlebar");
  m("text","Creator Time Title",plate.x+32,plate.y+18,plate.width-64,58,{...text("CREATOR TIME!",38,900,"center"),fontFamily:"Bungee",fontId:"bungee",textColor:"#fffbd0",textStrokeColor:"#6d1f79",textStrokeWidth:4,textShadows:["0 6px 0 #4a155c"]},plate,"title");
  m("text","Creator Time Message",inner.x+60,inner.y+76,inner.width-120,96,{...text("A NEW CHALLENGE\nHAS APPEARED!",30,900,"center"),fontFamily:"Bungee",fontId:"bungee",textColor:"#fff15b",textStrokeColor:"#892baf",textStrokeWidth:3,lineHeight:1.22},inner,"content");
  m("text","Creator Time Copy",inner.x+90,inner.y+188,inner.width-180,60,{...text("Build the strangest interface you can\nbefore the clock hits zero.",16,700,"center"),fontFamily:"Trebuchet MS",fontId:"trebuchet",textColor:"#ffffff",lineHeight:1.45},inner,"content");
  m("button","Creator Time Start",inner.x+132,inner.y+258,inner.width-264,58,{...text("LET'S CREATE!",20,900,"center"),fontFamily:"Bungee",fontId:"bungee",fill:"#ffce38",textColor:"#581658",borderColor:"#fff7a6",borderWidth:5,cornerRadius:18,corners:corners(18),shadow:"0 10px 0 #a62b76",...gradient("#fff16b","#ff892e",180),effects:[effect("bevel",{size:5,depth:92})]},inner,"button");
  m("button","Large Custom Close",popup.x+popup.width-70,popup.y+24,48,48,{...text("×",28,900,"center"),fill:"#ff4d91",textColor:"#ffffff",borderColor:"#fff3a0",borderWidth:4,cornerRadius:8,corners:corners(8),shadow:"0 7px 0 #77205f",...gradient("#ff87bb","#d42d86",180)},popup,"control");
  return{elements:b.elements,assets:[],background:"#250b59",rootId:bg.id};
}

export function createRetroAsset(id:RetroAssetId,index=0):RetroBuildResult{
  if(id==="window-98-app")return windows98(id,index);
  if(id==="window-95-dialog")return systemDialog(index);
  if(id==="window-internet")return internetWindow(index);
  if(id==="frame-checker")return nineSliceFrame(index);
  if(id==="frame-stepped"||id==="frame-cdrom")return layeredFrame(id,index);
  if(id==="button-win98"||id==="button-arcade"||id==="button-cdrom"||id==="button-gameshow")return retroButton(id,index);
  if(id==="template-windows98")return windows98(id,index,true);
  if(id==="template-cdrom")return cdromTemplate(index);
  if(id==="template-creator-time")return creatorTimeTemplate(index);
  return simpleAsset(id,index);
}

export function createPixelArtAsset(name:string,pixels:string[],size:number,index=0):RetroBuildResult{
  const componentId=createId("pixel-art"),assetId=createId("pixel-art-asset"),cell=8,svgSize=size*cell;
  const rects=pixels.map((color,i)=>color==="transparent"?"":`<rect x="${(i%size)*cell}" y="${Math.floor(i/size)*cell}" width="${cell}" height="${cell}" fill="${color}"/>`).join("");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}" shape-rendering="crispEdges">${rects}</svg>`,dataUrl=`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  const asset:EditorAsset={id:assetId,name,originalName:`${name.toLowerCase().replace(/[^a-z0-9]+/g,"-")||"pixel-art"}.svg`,kind:"image",folder:"Pixel Studio",mimeType:"image/svg+xml",format:"SVG",width:svgSize,height:svgSize,fileSize:svg.length,contentHash:componentId,dataUrl,thumbnailDataUrl:dataUrl,createdAt:Date.now(),animated:false,warning:null,favorite:false};
  const element=createElement("image",index);Object.assign(element,{id:createId("pixel-art"),name,x:360+(index%5)*12,y:190+(index%5)*12,width:240,height:240,imageAssetId:asset.id,imageFit:"stretch",fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",retro:{componentId,assetId:"pixel-studio",family:"arcade",kind:"pixel-art",role:"art",style:"custom",pixelScale:8} satisfies RetroMetadata});
  return{elements:[element],assets:[asset],rootId:element.id};
}
