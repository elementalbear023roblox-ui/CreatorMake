import { copyForRole, parseDesignIntent } from "./intent.ts";
import { createElement } from "../editor/project.ts";
import type { DesignPlan } from "../design-intelligence/types";
import type { EditorElement, ElementType } from "../editor/types";

export type RobloxShopGeneration = { label: string; elements: EditorElement[]; operations: string[] };

type ShopTheme = {
  premium: boolean;
  shell: string;
  panel: string;
  card: string;
  accent: string;
  accent2: string;
  outline: string;
  text: string;
  muted: string;
};

const BRIGHT: ShopTheme = { premium:false,shell:"#f7f8ff",panel:"#ffffff",card:"#ffe452",accent:"#21d7bd",accent2:"#ff6b45",outline:"#151525",text:"#ffffff",muted:"#24334e" };
const PREMIUM: ShopTheme = { premium:true,shell:"#07080c",panel:"#12141b",card:"#25211a",accent:"#f5bd36",accent2:"#e84555",outline:"#f5bd36",text:"#ffffff",muted:"#b6a36f" };

function patchElement(type: ElementType, name: string, patch: Partial<EditorElement>) {
  const element=createElement(type);
  Object.assign(element,{name,...patch});
  if(patch.cornerRadius!==undefined&&!patch.corners) element.corners={tl:patch.cornerRadius,tr:patch.cornerRadius,br:patch.cornerRadius,bl:patch.cornerRadius};
  return element;
}

function frame(name:string,parentId:string|null,x:number,y:number,width:number,height:number,fill:string,borderColor:string,borderWidth:number,radius:number,extra:Partial<EditorElement>={}){
  return patchElement(name==="ShopWindow"?"frame":"container",name,{parentId,x,y,width,height,fill,borderColor,borderWidth,cornerRadius:radius,padding:0,shadow:"none",...extra,roblox:{className:"Frame",...extra.roblox}});
}

function label(name:string,text:string,parentId:string,x:number,y:number,width:number,height:number,size:number,color:string,extra:Partial<EditorElement>={}){
  return patchElement("text",name,{parentId,x,y,width,height,text,textColor:color,fill:"transparent",borderWidth:0,borderColor:"transparent",padding:0,fontFamily:"Fredoka",fontWeight:700,fontSize:size,textAlign:"center",verticalAlign:"center",shadow:"none",...extra,roblox:{className:"TextLabel",...extra.roblox}});
}

function button(name:string,text:string,parentId:string,x:number,y:number,width:number,height:number,fill:string,color:string,borderColor:string,borderWidth:number,radius:number,extra:Partial<EditorElement>={}){
  return patchElement("button",name,{parentId,x,y,width,height,text,textColor:color,fill,borderColor,borderWidth,cornerRadius:radius,padding:4,fontFamily:"Fredoka",fontWeight:700,fontSize:14,textAlign:"center",verticalAlign:"center",shadow:"none",...extra,roblox:{className:"TextButton",...extra.roblox}});
}

function addProduct(elements:EditorElement[],parentId:string,index:number,x:number,y:number,theme:ShopTheme){
  const palette=theme.premium?["#2d271c","#22242e","#29201f","#1c2528","#28201c","#242027"]:["#fff05c","#72e4ff","#ff9b62","#b98cff","#72e89c","#ff7ea8"];
  const card=frame(`ProductCard${String(index+1).padStart(2,"0")}`,parentId,x,y,166,92,palette[index],theme.premium?"#846c31":theme.outline,theme.premium?2:3,theme.premium?8:13,{gradientType:"linear",gradientAngle:155,gradientStops:[{id:`product-${index}-a`,color:palette[index],position:0,opacity:100},{id:`product-${index}-b`,color:theme.premium?"#11131a":"#ffffff",position:100,opacity:theme.premium?92:42}]});
  elements.push(card);
  elements.push(label(`ProductName${String(index+1).padStart(2,"0")}`,theme.premium?["BIG YEN","INSANE YEN","VIP PASS","LUCK BOOST","ULTRA CRATE","GOLD PACK"][index]:["TRIPLE HATCH","AUTO HATCH","EXTRA PET","SUPER LUCK","MEGA BOOST","GOLDEN EGG"][index],card.id,x+8,y+9,150,34,theme.premium?12:11,theme.premium?"#ffe5a1":"#ffffff",{textStrokeColor:theme.premium?"#281d08":theme.outline,textStrokeWidth:theme.premium?1:1.5,textStrokeOpacity:100}));
  elements.push(button(`PriceBadge${String(index+1).padStart(2,"0")}`,theme.premium?["R$999","R$1599","R$499","R$299","R$799","R$1299"][index]:["R$29","R$29","R$29","R$49","R$79","R$99"][index],card.id,x+42,y+55,82,27,theme.premium?"#36d274":"#ffca24",theme.premium?"#ffffff":"#272014",theme.premium?"#bdf4bf":theme.outline,2,10,{fontSize:11,textStrokeColor:theme.premium?"#176534":"#ffffff",textStrokeWidth:theme.premium?1:0}));
}

export function generateRobloxShop(plan:DesignPlan):RobloxShopGeneration{
  const intent=plan.intent??parseDesignIntent(plan.prompt);
  const premium=intent.style.some((style)=>style==="dark"||style==="premium"||style==="exclusive")||/premium|exclusive|black panels|gold outlines/i.test(plan.prompt);
  const theme=premium?PREMIUM:BRIGHT;
  const elements:EditorElement[]=[];
  const title=copyForRole(intent,"title",premium?"EXCLUSIVE SHOP":"SHOP");
  const actionCopy=copyForRole(intent,"button",premium?"REDEEM":"R$ 199");

  const root=frame("ShopWindow",null,116,40,728,520,theme.shell,theme.outline,premium?4:5,premium?4:18,{shadow:premium?"0 18px 45px rgba(0,0,0,.7)":"0 14px 0 rgba(20,21,37,.32)"}); elements.push(root);
  const inner=frame("InnerPanel",root.id,126,50,708,500,theme.panel,premium?"#5c4920":theme.outline,premium?1:2,premium?2:13); elements.push(inner);
  const header=frame("Header",root.id,premium?137:148,58,premium?687:676,68,"transparent","transparent",0,0,{layoutMode:"horizontal",gap:12,primaryAlign:"space-between",crossAlign:"center",layoutPadding:{top:0,right:0,bottom:0,left:0},frameType:"header",clipContent:false});elements.push(header);
  const plaque=frame("TitlePlaque",header.id,premium?137:148,58,premium?390:575,68,premium?"#08090d":"#ff3b38",theme.outline,premium?3:4,premium?0:12,{rotation:premium?-1.5:0,gradientType:premium?"none":"linear",gradientAngle:90,gradientStops:[{id:"plaque-a",color:premium?"#08090d":"#ff5b39",position:0,opacity:100},{id:"plaque-b",color:premium?"#08090d":"#ff1f37",position:100,opacity:100}]}); elements.push(plaque);
  elements.push(label("TitleText",title,plaque.id,premium?155:166,68,premium?335:430,48,premium?28:34,theme.text,{fontFamily:premium?"Bungee":"Luckiest Guy",fontWeight:700,textStrokeColor:premium?"#1b1304":theme.outline,textStrokeWidth:premium?1.5:2.5,textStrokeOpacity:100,textAlign:"left"}));
  elements.push(button("CloseButton","×",header.id,774,61,50,50,theme.accent2,"#ffffff",premium?"#ffd3d6":theme.outline,3,25,{fontSize:30,textStrokeColor:theme.outline,textStrokeWidth:1.5}));

  const featured=frame("FeaturedProduct",root.id,153,139,565,94,premium?"#221e16":theme.accent,premium?"#8b7131":theme.outline,premium?2:4,premium?6:15,{gradientType:"linear",gradientAngle:100,gradientStops:[{id:"featured-a",color:premium?"#332a17":"#2ae3c9",position:0,opacity:100},{id:"featured-b",color:premium?"#0c0d12":"#6cf6d7",position:100,opacity:100}]}); elements.push(featured);
  const icon=patchElement("star","FeaturedIcon",{parentId:featured.id,x:169,y:151,width:68,height:68,fill:premium?theme.accent:"#ffc928",borderColor:theme.outline,borderWidth:3,cornerRadius:0,padding:0,shadow:"none",roblox:{className:"Frame"}}); elements.push(icon);
  elements.push(label("FeaturedTitle",premium?"ROYAL FORTUNE":"STARTER PACK",featured.id,249,152,250,30,18,theme.text,{textAlign:"left",textStrokeColor:theme.outline,textStrokeWidth:1.5}));
  elements.push(label("FeaturedSubtitle",premium?"LIMITED PREMIUM BUNDLE":"A great offer you can't refuse!",featured.id,250,182,280,26,11,premium?theme.muted:"#124d61",{textAlign:"left",fontFamily:"Nunito",fontWeight:700,textStrokeWidth:0}));
  elements.push(button("FeaturedPrice",actionCopy,featured.id,610,168,91,34,premium?"#35c96f":"#ffcf2d",premium?"#ffffff":"#2b2210",theme.outline,2,12,{fontSize:13,textStrokeWidth:0}));

  const grid=frame("ProductGrid",root.id,153,247,565,premium?202:250,"transparent","transparent",0,0,{layoutMode:"grid",gridColumns:3,rowGap:premium?8:20,columnGap:12,layoutPadding:{top:7,right:7,bottom:7,left:7},frameType:"grid",clipContent:false,roblox:{className:"Frame",layout:"grid"}}); elements.push(grid);
  for(let index=0;index<6;index++) addProduct(elements,grid.id,index,160+(index%3)*184,254+Math.floor(index/3)*(premium?100:112),theme);
  elements.filter((item)=>item.parentId===grid.id).forEach((item)=>{item.sizingX="fill";});

  const tabs=frame("SideTabs",root.id,731,139,92,premium?258:312,"transparent","transparent",0,0,{layoutMode:"vertical",gap:10,primaryAlign:"start",crossAlign:"center",layoutPadding:{top:6,right:6,bottom:6,left:6},frameType:"navigation",clipContent:false,roblox:{className:"Frame",layout:"vertical"}}); elements.push(tabs);
  const tabLabels=premium?["VIP","YEN","BOOSTS","CODES"]:["EGGS","PASSES","GEMS","BOOSTS"];
  const tabColors=premium?["#6f55dc","#d8942d","#2e9abf","#e9475a"]:["#8b59ee","#e84242","#e94ccf","#268bdc"];
  tabLabels.forEach((text,index)=>elements.push(button(`CategoryTab${String(index+1).padStart(2,"0")}`,text,tabs.id,739,145+index*64,76,54,tabColors[index],"#ffffff",theme.outline,3,12,{fontSize:10,textStrokeColor:theme.outline,textStrokeWidth:1,sizingX:"fill"})));

  if(premium){
    const codes=frame("CodesSection",root.id,153,459,565,76,"#062d51","#176fb0",2,5,{gradientType:"linear",gradientAngle:90,gradientStops:[{id:"codes-a",color:"#074c82",position:0,opacity:100},{id:"codes-b",color:"#031d39",position:100,opacity:100}]}); elements.push(codes);
    elements.push(label("CodesTitle","— CODES —",codes.id,168,464,530,24,15,"#45bfff",{textStrokeColor:"#001c34",textStrokeWidth:1}));
    elements.push(button("CodeInput","ENTER CODE",codes.id,181,494,330,29,"#eef1f4","#8b8f96","#9aa1aa",1,5,{fontFamily:"Nunito",fontWeight:600,fontSize:12,textStrokeWidth:0,roblox:{className:"TextButton"}}));
    elements.push(button("RedeemButton",actionCopy,codes.id,526,494,174,29,"#2f9fe7","#ffffff","#0a4678",2,5,{fontSize:12,textStrokeColor:"#0a4678",textStrokeWidth:1}));
  }else{
    const sale=frame("SaleBanner",root.id,153,489,565,44,"#58e85e",theme.outline,3,12,{gradientType:"linear",gradientAngle:90,gradientStops:[{id:"sale-a",color:"#68f46b",position:0,opacity:100},{id:"sale-b",color:"#29c94b",position:100,opacity:100}]}); elements.push(sale);
    elements.push(label("SaleText","50% SALE!  ·  DOUBLE REWARDS",sale.id,166,495,538,30,18,"#ffffff",{textStrokeColor:theme.outline,textStrokeWidth:1.75}));
  }

  return {label:premium?"dark premium Roblox shop":"colorful Roblox simulator shop",elements,operations:["parsed instructions separately from literal UI copy","built named Roblox shop hierarchy","created editable featured product, cards, badges, tabs, and close control",premium?"applied premium black-and-gold construction with code redemption":"applied cartoon double-outline construction with sale banner","attached Roblox instance and layout metadata"]};
}
