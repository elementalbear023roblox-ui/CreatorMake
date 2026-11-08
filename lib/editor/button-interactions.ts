import type { ButtonInteractionSettings, ButtonVisualState, EditorElement, GradientStop } from "./types";

const clamp=(value:number,min=0,max=255)=>Math.max(min,Math.min(max,value));
const hex=(value:number)=>Math.round(clamp(value)).toString(16).padStart(2,"0");
const parse=(color:string)=>/^#[\da-f]{6}$/i.test(color)?[1,3,5].map((start)=>Number.parseInt(color.slice(start,start+2),16)):[116,87,255];
export const shiftButtonColor=(color:string,amount:number)=>{const [r,g,b]=parse(color);return`#${hex(r+amount)}${hex(g+amount)}${hex(b+amount)}`;};
const stops=(a:string,b:string):GradientStop[]=>[{id:"button-state-start",color:a,position:0,opacity:100},{id:"button-state-end",color:b,position:100,opacity:100}];

export function createButtonVisualState(color:string,variant:"normal"|"hover"|"pressed"="normal"):ButtonVisualState{
  const delta=variant==="hover"?24:variant==="pressed"?-30:0,base=shiftButtonColor(color,delta);
  return{color:base,transparency:0,gradientEnabled:false,gradientAngle:135,gradientStops:stops(base,shiftButtonColor(base,variant==="pressed"?-14:14))};
}

export function createButtonInteractionSettings(fill="#7457ff",enabled=true):ButtonInteractionSettings{
  return{enabled,disabled:false,normal:createButtonVisualState(fill),hover:createButtonVisualState(fill,"hover"),pressed:createButtonVisualState(fill,"pressed"),hoverDuration:.15,pressedDuration:.1,easing:"Quad",imageMode:"auto",overlayOpacity:18};
}

export function normalizeButtonInteractionSettings(value:Partial<ButtonInteractionSettings>|null|undefined,fill:string,enabled=true):ButtonInteractionSettings{
  const base=createButtonInteractionSettings(fill,enabled),source=value??{};
  const state=(key:"normal"|"hover"|"pressed")=>({...base[key],...(source[key]??{}),gradientStops:(source[key]?.gradientStops??base[key].gradientStops).map((stop,index)=>({...stop,id:stop.id||`button-${key}-${index}`}))});
  return{...base,...source,enabled:typeof source.enabled==="boolean"?source.enabled:enabled,normal:state("normal"),hover:state("hover"),pressed:state("pressed")};
}

export function buttonStateElement(element:EditorElement,state:"normal"|"hover"|"pressed"){
  const visual=element.buttonInteraction[state];
  return{...element,fill:visual.color,opacity:Math.max(0,100-visual.transparency),gradientType:visual.gradientEnabled?"linear" as const:"none" as const,gradientAngle:visual.gradientAngle,gradientStops:visual.gradientStops};
}

export const isInteractiveButton=(element:EditorElement|undefined|null)=>Boolean(element&&(element.type==="button"||element.type==="image-button"));
