import { createElement, createId } from "@/lib/editor/project";
import type { EditorElement } from "@/lib/editor/types";
import type { SystemPreset } from "./types";

const apply = (element:EditorElement,preset:SystemPreset,kind:"surface"|"accent"|"text"="surface") => {
  element.fill=kind==="text"?"transparent":kind==="accent"?preset.colors.accent:preset.colors.surface;
  element.borderColor=preset.colors.highlight;element.borderWidth=preset.borders.width;element.cornerRadius=preset.geometry.radius;element.corners={tl:preset.geometry.radius,tr:preset.geometry.radius,br:preset.geometry.radius,bl:preset.geometry.radius};
  element.fontFamily=preset.typography.family;element.fontWeight=preset.typography.weight;element.shadow=preset.effects.shadow;element.padding=preset.spacing.padding;element.gradientType=preset.gradients.default==="off"?"none":preset.gradients.type;
  return element;
};

export function createPresetTestScene(preset:SystemPreset,index=0):EditorElement[]{
  const ox=120+(index%4)*24,oy=80+(index%4)*24,elements:EditorElement[]=[];
  const root=apply(createElement("frame"),preset);root.id=createId("preset-sheet");root.name=`${preset.name} Component Sheet`;root.x=ox;root.y=oy;root.width=720;root.height=500;elements.push(root);
  const title=apply(createElement("rectangle"),preset,"accent");title.name="Title Bar";title.parentId=root.id;title.x=ox+18;title.y=oy+18;title.width=684;title.height=46;elements.push(title);
  const heading=apply(createElement("text"),preset,"text");heading.name="Component Sheet Label";heading.parentId=title.id;heading.x=title.x+16;heading.y=title.y+8;heading.width=360;heading.height=28;heading.padding=0;heading.text=`${preset.name.toUpperCase()} · COMPONENTS`;heading.fontSize=14;heading.borderWidth=0;heading.shadow="none";elements.push(heading);
  const component=(type:EditorElement["type"],name:string,x:number,y:number,w:number,h:number,text="")=>{const item=apply(createElement(type),preset,type==="button"?"accent":"surface");item.name=name;item.parentId=root.id;item.x=ox+x;item.y=oy+y;item.width=w;item.height=h;item.text=text;item.fontSize=12;elements.push(item);return item;};
  component("button","Button",32,92,150,42,"BUTTON");const pressed=component("button","Pressed Button",200,92,150,42,"PRESSED");pressed.shadow=`inset ${Math.max(1,preset.depth.amount)}px ${Math.max(1,preset.depth.amount)}px 0 ${preset.colors.shadow}`;
  const input=component("container","Input",368,92,250,42);input.fill=preset.colors.surfaceAlt;const inputText=apply(createElement("text"),preset,"text");inputText.name="Input Text";inputText.parentId=input.id;inputText.x=input.x+12;inputText.y=input.y+8;inputText.width=200;inputText.height=24;inputText.padding=0;inputText.borderWidth=0;inputText.shadow="none";inputText.fontSize=12;inputText.text="Editable input";elements.push(inputText);
  component("roundRect","Card",32,158,200,126);component("container","Panel",250,158,368,126);component("roundRect","Popup",32,306,244,116);
  const body=component("text","Text",304,316,220,34,"Readable system text");body.fill="transparent";body.borderWidth=0;body.shadow="none";body.padding=0;
  const icon=component("star","Icon",548,310,54,54);icon.fill=preset.colors.accent;
  const progress=component("container","Progress Bar",304,380,298,28);progress.fill=preset.colors.surfaceAlt;const fill=apply(createElement("rectangle"),preset,"accent");fill.name="Progress Fill";fill.parentId=progress.id;fill.x=progress.x+4;fill.y=progress.y+4;fill.width=190;fill.height=20;fill.borderWidth=0;fill.shadow="none";elements.push(fill);
  return elements;
}
