import type { EditorElement, EditorProject } from "./types.ts";
import { resizeElementWithConstraints } from "./transforms.ts";
import { applyAutoLayout } from "./layout.ts";

export type ResponsivePreviewIssue={elementId:string;severity:"warning"|"error";kind:"offscreen"|"small-target"|"text-clipping";message:string};

const clamp=(value:number,min:number|null,max:number|null)=>Math.max(min??4,Math.min(max??Infinity,value));

function resizeRoot(element:EditorElement,screen:EditorProject["screen"],width:number,height:number){
  const next={x:element.x,y:element.y,width:element.width,height:element.height};
  const right=screen.width-(element.x+element.width),bottom=screen.height-(element.y+element.height),centerX=element.x+element.width/2-screen.width/2,centerY=element.y+element.height/2-screen.height/2;
  if(element.constraints.horizontal==="right")next.x=width-right-element.width;
  else if(element.constraints.horizontal==="left-right")next.width=clamp(width-element.x-right,element.minWidth,element.maxWidth);
  else if(element.constraints.horizontal==="center")next.x=width/2+centerX-element.width/2;
  else if(element.constraints.horizontal==="scale"){const ratio=width/Math.max(1,screen.width);next.x=element.x*ratio;next.width=clamp(element.width*ratio,element.minWidth,element.maxWidth);}
  if(element.constraints.vertical==="bottom")next.y=height-bottom-element.height;
  else if(element.constraints.vertical==="top-bottom")next.height=clamp(height-element.y-bottom,element.minHeight,element.maxHeight);
  else if(element.constraints.vertical==="center")next.y=height/2+centerY-element.height/2;
  else if(element.constraints.vertical==="scale"){const ratio=height/Math.max(1,screen.height);next.y=element.y*ratio;next.height=clamp(element.height*ratio,element.minHeight,element.maxHeight);}
  return next;
}

export function resolveResponsivePreview(project:EditorProject,width:number,height:number):EditorProject{
  const next=structuredClone(project);
  project.elements.filter((element)=>!element.parentId).forEach((element)=>resizeElementWithConstraints(next,project,element.id,resizeRoot(element,project.screen,width,height)));
  applyAutoLayout(next);
  next.screen={...next.screen,width,height};
  return next;
}

export function diagnoseResponsivePreview(project:EditorProject):ResponsivePreviewIssue[]{
  const issues:ResponsivePreviewIssue[]=[];
  project.elements.filter((element)=>!element.hidden).forEach((element)=>{
    if(element.x<0||element.y<0||element.x+element.width>project.screen.width||element.y+element.height>project.screen.height)issues.push({elementId:element.id,severity:"error",kind:"offscreen",message:`${element.name} extends outside the simulated screen.`});
    if(["button","image-button"].includes(element.type)&&(element.width<44||element.height<44))issues.push({elementId:element.id,severity:"warning",kind:"small-target",message:`${element.name} is smaller than the recommended 44 px touch target.`});
    if(["text","button"].includes(element.type)&&element.height<Math.max(12,element.fontSizeDesign*element.lineHeight))issues.push({elementId:element.id,severity:"warning",kind:"text-clipping",message:`${element.name} may clip at its current text size.`});
  });
  return issues;
}
