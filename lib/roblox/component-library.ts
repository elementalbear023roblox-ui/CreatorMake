import { createElement, createId } from "../editor/project.ts";
import type { EditorElement, ElementType } from "../editor/types.ts";
import { createVisualEffect } from "../effects/registry.ts";

export type RobloxElementKind =
  | "frame"
  | "scrolling-frame"
  | "text-label"
  | "text-button"
  | "text-box"
  | "image-label"
  | "image-button"
  | "list-layout"
  | "grid-layout";

export type RobloxComponentKind =
  | "rounded-button"
  | "neon-button"
  | "glass-panel"
  | "health-bar"
  | "progress-bar"
  | "notification"
  | "toggle"
  | "inventory-grid"
  | "main-menu";

export const ROBLOX_ELEMENTS: Array<{kind:RobloxElementKind;name:string;nativeClass:string;description:string}> = [
  {kind:"frame",name:"Frame",nativeClass:"Frame",description:"Native container with optional UICorner, UIStroke, and UIGradient."},
  {kind:"scrolling-frame",name:"Scrolling Frame",nativeClass:"ScrollingFrame",description:"Scrollable native container with automatic canvas sizing."},
  {kind:"text-label",name:"Text Label",nativeClass:"TextLabel",description:"Editable Roblox-native text whenever the selected font is compatible."},
  {kind:"text-button",name:"Text Button",nativeClass:"TextButton",description:"Interactive native button with editable text and visual states."},
  {kind:"text-box",name:"Text Box",nativeClass:"TextBox",description:"Editable text-input control for Roblox experiences."},
  {kind:"image-label",name:"Image Label",nativeClass:"ImageLabel",description:"Image surface that preserves crop, fit, and nine-slice settings."},
  {kind:"image-button",name:"Image Button",nativeClass:"ImageButton",description:"Interactive image control with default, hover, pressed, and disabled assets."},
  {kind:"list-layout",name:"List Layout",nativeClass:"UIListLayout",description:"Editable container configured with native vertical auto layout."},
  {kind:"grid-layout",name:"Grid Layout",nativeClass:"UIGridLayout",description:"Editable container configured with a native responsive grid."},
];

export const ROBLOX_COMPONENTS: Array<{kind:RobloxComponentKind;name:string;category:string;description:string}> = [
  {kind:"rounded-button",name:"Rounded Action",category:"Buttons",description:"Native TextButton, UICorner, UIStroke, and responsive center anchoring."},
  {kind:"neon-button",name:"Neon Action",category:"Buttons",description:"Editable button with a selective neon effect and native text."},
  {kind:"glass-panel",name:"Glass Panel",category:"Panels",description:"Layered editable panel with a selective glass treatment."},
  {kind:"health-bar",name:"Health Bar",category:"HUD",description:"Native frame hierarchy with editable fill and label."},
  {kind:"progress-bar",name:"Progress Bar",category:"HUD",description:"Native progress track, fill, and percentage label."},
  {kind:"notification",name:"Notification",category:"Feedback",description:"Editable toast with message and close button."},
  {kind:"toggle",name:"Settings Toggle",category:"Controls",description:"Native settings row with an editable toggle control."},
  {kind:"inventory-grid",name:"Inventory Grid",category:"Inventory",description:"ScrollingFrame with UIGridLayout and editable item buttons."},
  {kind:"main-menu",name:"Main Menu",category:"Menus",description:"Responsive editable panel, title, and native action buttons."},
];

const offsetFor=(index:number)=>({x:140+(index%5)*18,y:90+(index%5)*18});
const finishText=(element:EditorElement)=>{element.fontSizeDesign=element.fontSize;element.responsiveMaxTextSize=Math.max(element.responsiveMinTextSize,element.fontSize);element.textPadding={top:element.padding,right:element.padding,bottom:element.padding,left:element.padding};};
const name=(element:EditorElement,value:string)=>{element.id=createId(value.toLowerCase().replace(/[^a-z0-9]+/g,"-"));element.name=value;return element;};
const child=(element:EditorElement,parent:EditorElement,x:number,y:number)=>{element.parentId=parent.id;element.x=parent.x+x;element.y=parent.y+y;return element;};

export function createRobloxElement(kind:RobloxElementKind,index=0):EditorElement[]{
  const origin=offsetFor(index);
  const type:ElementType=kind==="text-label"?"text":kind==="text-button"||kind==="text-box"?"button":kind==="image-label"?"image":kind==="image-button"?"image-button":kind==="scrolling-frame"?"scrolling-frame":kind==="list-layout"||kind==="grid-layout"?"container":"frame";
  const element=name(createElement(type,index),ROBLOX_ELEMENTS.find((item)=>item.kind===kind)?.name??"Roblox UI");
  element.x=origin.x;element.y=origin.y;
  if(kind==="text-label"){element.text="TEXT LABEL";element.fill="transparent";element.borderColor="transparent";element.textAlign="center";element.width=240;}
  if(kind==="text-button"){element.text="BUTTON";element.textAlign="center";element.cornerRadius=8;element.corners={tl:8,tr:8,br:8,bl:8};}
  if(kind==="text-box"){element.text="TYPE HERE";element.textInput=true;element.textAlign="left";element.fill="#171a24";element.borderColor="#596077";}
  if(kind==="image-label"||kind==="image-button"){element.width=180;element.height=120;element.fill="#202432";element.text=kind==="image-button"?"IMAGE BUTTON":"";}
  if(kind==="scrolling-frame"){element.width=360;element.height=280;element.automaticCanvasSize="Y";element.canvasSizeY=560;element.frameType="content";}
  if(kind==="list-layout"||kind==="grid-layout"){element.width=420;element.height=280;element.frameType="content";element.layoutMode=kind==="grid-layout"?"grid":"vertical";element.gridColumns=kind==="grid-layout"?3:1;element.gap=12;element.rowGap=12;element.columnGap=12;element.layoutPadding={top:16,right:16,bottom:16,left:16};element.padding=16;}
  finishText(element);
  return[element];
}

export function createRobloxComponent(kind:RobloxComponentKind,index=0):EditorElement[]{
  const origin=offsetFor(index),elements:EditorElement[]=[];
  const add=<T extends EditorElement>(element:T)=>{elements.push(element);return element;};
  if(kind==="rounded-button"||kind==="neon-button"){
    const button=add(name(createElement("button",index),kind==="neon-button"?"Neon Action":"Rounded Action"));Object.assign(button,{x:370,y:272,width:220,height:56,text:kind==="neon-button"?"PLAY NOW":"CONTINUE",textAlign:"center",fill:kind==="neon-button"?"#14223a":"#7457ff",borderColor:kind==="neon-button"?"#38dfff":"#9d8aff",borderWidth:2,cornerRadius:12,corners:{tl:12,tr:12,br:12,bl:12},constraints:{horizontal:"center",vertical:"center"},anchorX:.5,anchorY:.5,shadow:"0 10px 24px rgba(0,0,0,.34)"});if(kind==="neon-button"){const glow=createVisualEffect("neon-glow");glow.parameters={...glow.parameters,color:"#38dfff",radius:14,layers:2,intensity:75};button.effects=[glow];}finishText(button);return elements;
  }
  if(kind==="glass-panel"){
    const panel=add(name(createElement("frame",index),"Glass Panel"));Object.assign(panel,{x:220,y:135,width:520,height:330,fill:"#172035",opacity:78,borderColor:"#9edcff",borderWidth:1,cornerRadius:18,corners:{tl:18,tr:18,br:18,bl:18},constraints:{horizontal:"center",vertical:"center"},shadow:"0 24px 55px rgba(0,0,0,.38)"});const glass=createVisualEffect("glass");panel.effects=[glass];const title=add(child(name(createElement("text",index+1),"Panel Title"),panel,28,24));Object.assign(title,{width:360,height:42,text:"INTERFACE PANEL",fontSize:26,textAlign:"left",fill:"transparent",borderColor:"transparent"});finishText(title);return elements;
  }
  if(kind==="health-bar"||kind==="progress-bar"){
    const track=add(name(createElement("frame",index),kind==="health-bar"?"Health Bar":"Progress Bar"));Object.assign(track,{x:origin.x+100,y:origin.y+120,width:420,height:52,fill:"#101521",borderColor:"#596077",borderWidth:2,cornerRadius:13,corners:{tl:13,tr:13,br:13,bl:13},constraints:{horizontal:"left-right",vertical:kind==="health-bar"?"bottom":"center"},clipContent:true});const fill=add(child(name(createElement("frame",index+1),kind==="health-bar"?"Health Fill":"Progress Fill"),track,5,5));Object.assign(fill,{width:kind==="health-bar"?300:260,height:42,fill:kind==="health-bar"?"#35d07f":"#6a5cff",borderColor:"transparent",cornerRadius:9,corners:{tl:9,tr:9,br:9,bl:9},constraints:{horizontal:"scale",vertical:"top-bottom"}});const label=add(child(name(createElement("text",index+2),kind==="health-bar"?"Health Label":"Progress Label"),track,0,0));Object.assign(label,{width:420,height:52,text:kind==="health-bar"?"HEALTH 75 / 100":"62%",textAlign:"center",fill:"transparent",borderColor:"transparent",fontSize:16,constraints:{horizontal:"left-right",vertical:"top-bottom"}});finishText(label);return elements;
  }
  if(kind==="notification"){
    const toast=add(name(createElement("frame",index),"Notification"));Object.assign(toast,{x:origin.x+250,y:origin.y+30,width:430,height:92,fill:"#171b27",borderColor:"#6b5cff",borderWidth:2,cornerRadius:12,corners:{tl:12,tr:12,br:12,bl:12},constraints:{horizontal:"right",vertical:"top"},shadow:"0 16px 32px rgba(0,0,0,.38)"});const message=add(child(name(createElement("text",index+1),"Notification Message"),toast,20,18));Object.assign(message,{width:330,height:56,text:"Your changes were saved successfully.",fontSize:15,textAlign:"left",fill:"transparent",borderColor:"transparent",constraints:{horizontal:"left-right",vertical:"top-bottom"}});finishText(message);const close=add(child(name(createElement("button",index+2),"Close Notification"),toast,372,24));Object.assign(close,{width:44,height:44,text:"×",textAlign:"center",fill:"#262b3a",borderColor:"#4b5268",cornerRadius:8,corners:{tl:8,tr:8,br:8,bl:8},constraints:{horizontal:"right",vertical:"center"}});finishText(close);return elements;
  }
  if(kind==="toggle"){
    const row=add(name(createElement("frame",index),"Settings Toggle"));Object.assign(row,{x:origin.x+100,y:origin.y+120,width:420,height:64,fill:"#171b27",borderColor:"#363d52",borderWidth:1,cornerRadius:10,corners:{tl:10,tr:10,br:10,bl:10},constraints:{horizontal:"left-right",vertical:"top"}});const label=add(child(name(createElement("text",index+1),"Toggle Label"),row,18,12));Object.assign(label,{width:280,height:40,text:"Enable notifications",fontSize:16,textAlign:"left",fill:"transparent",borderColor:"transparent",constraints:{horizontal:"left-right",vertical:"center"}});finishText(label);const control=add(child(name(createElement("button",index+2),"Toggle Control"),row,350,13));Object.assign(control,{width:54,height:38,text:"●",textAlign:"right",fill:"#6a5cff",borderColor:"transparent",cornerRadius:19,corners:{tl:19,tr:19,br:19,bl:19},constraints:{horizontal:"right",vertical:"center"},padding:8});finishText(control);return elements;
  }
  if(kind==="inventory-grid"){
    const inventory=add(name(createElement("scrolling-frame",index),"Inventory Grid"));Object.assign(inventory,{x:170,y:90,width:620,height:420,fill:"#111623",borderColor:"#4d5875",borderWidth:2,cornerRadius:14,corners:{tl:14,tr:14,br:14,bl:14},layoutMode:"grid",gridColumns:4,rowGap:12,columnGap:12,layoutPadding:{top:18,right:18,bottom:18,left:18},automaticCanvasSize:"Y",canvasSizeY:720,constraints:{horizontal:"center",vertical:"center"}});for(let itemIndex=0;itemIndex<8;itemIndex++){const item=add(child(name(createElement("button",index+itemIndex+1),`Inventory Item ${itemIndex+1}`),inventory,18+(itemIndex%4)*146,18+Math.floor(itemIndex/4)*124));Object.assign(item,{width:134,height:112,text:`ITEM ${String(itemIndex+1).padStart(2,"0")}`,textAlign:"center",fill:itemIndex%2?"#252044":"#17314a",borderColor:itemIndex%2?"#8b6dff":"#39d8ef",borderWidth:1,cornerRadius:9,corners:{tl:9,tr:9,br:9,bl:9},sizingX:"fill"});finishText(item);}return elements;
  }
  const menu=add(name(createElement("frame",index),"Main Menu"));Object.assign(menu,{x:290,y:60,width:380,height:480,fill:"#121725",borderColor:"#6757d9",borderWidth:2,cornerRadius:18,corners:{tl:18,tr:18,br:18,bl:18},constraints:{horizontal:"center",vertical:"center"},layoutMode:"vertical",gap:14,layoutPadding:{top:30,right:30,bottom:30,left:30},shadow:"0 28px 70px rgba(0,0,0,.45)"});const title=add(child(name(createElement("text",index+1),"Menu Title"),menu,30,30));Object.assign(title,{width:320,height:74,text:"CREATOR HUD",fontSize:30,textAlign:"center",fill:"transparent",borderColor:"transparent",sizingX:"fill"});finishText(title);["PLAY","SETTINGS","CREDITS"].forEach((value,buttonIndex)=>{const button=add(child(name(createElement("button",index+buttonIndex+2),`${value[0]}${value.slice(1).toLowerCase()} Button`),menu,30,124+buttonIndex*72));Object.assign(button,{width:320,height:56,text:value,textAlign:"center",fill:buttonIndex===0?"#7457ff":"#232a3d",borderColor:buttonIndex===0?"#a998ff":"#48516c",borderWidth:1,cornerRadius:10,corners:{tl:10,tr:10,br:10,bl:10},sizingX:"fill"});finishText(button);});return elements;
}
