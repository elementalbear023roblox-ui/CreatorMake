import { PRESET_BY_ID } from "./system-presets";
import type { DesignPlan } from "./types";
import type { EditorElement } from "@/lib/editor/types";

export type ValidationIssue = { code: string; elementId: string; message: string; repaired: boolean };
export type ValidationResult = { elements: EditorElement[]; issues: ValidationIssue[]; repaired: number; passed: boolean };

const overlaps = (a: EditorElement,b: EditorElement) => {
  const width=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x));
  const height=Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
  return width*height;
};

export function validateAndRepairGeneration(input: EditorElement[], plan: DesignPlan): ValidationResult {
  const elements=structuredClone(input), issues:ValidationIssue[]=[]; const byId=new Map(elements.map((item)=>[item.id,item]));
  const precise=plan.accuracy.toLowerCase()==="precise";
  const geometry=PRESET_BY_ID[plan.assignments.geometry];
  for(const element of elements){
    if(!Number.isFinite(element.x)||!Number.isFinite(element.y)||!Number.isFinite(element.width)||!Number.isFinite(element.height)||element.width<=0||element.height<=0){
      const repaired=precise; issues.push({code:"invalid-dimensions",elementId:element.id,message:`${element.name} had invalid or zero-size geometry.`,repaired});
      if(repaired){element.x=Number.isFinite(element.x)?element.x:0;element.y=Number.isFinite(element.y)?element.y:0;element.width=Math.max(4,Number.isFinite(element.width)?element.width:4);element.height=Math.max(4,Number.isFinite(element.height)?element.height:4);}
    }
    if(element.parentId){ const parent=byId.get(element.parentId); if(!parent){ const repaired=precise; issues.push({code:"broken-hierarchy",elementId:element.id,message:`${element.name} referenced a missing parent.`,repaired}); if(repaired)element.parentId=null; }
      else { const inset=Math.max(0,parent.padding,parent.borderWidth); const minX=parent.x+inset,minY=parent.y+inset,maxX=parent.x+parent.width-inset,maxY=parent.y+parent.height-inset; const overflow=element.x<minX||element.y<minY||element.x+element.width>maxX||element.y+element.height>maxY; if(overflow){const repaired=precise;issues.push({code:"parent-overflow",elementId:element.id,message:`${element.name} exceeded ${parent.name} bounds.`,repaired});if(repaired){element.width=Math.min(element.width,Math.max(4,maxX-minX));element.height=Math.min(element.height,Math.max(4,maxY-minY));element.x=Math.min(Math.max(element.x,minX),Math.max(minX,maxX-element.width));element.y=Math.min(Math.max(element.y,minY),Math.max(minY,maxY-element.height));}}
      }
    }
    if(geometry?.gradients.default==="off"&&element.gradientType!=="none"){const repaired=precise;issues.push({code:"preset-gradient",elementId:element.id,message:`${element.name} used a gradient forbidden by ${geometry.name}.`,repaired});if(repaired)element.gradientType="none";}
    const invalidCorner=Object.values(element.corners).some((value)=>!Number.isFinite(value)||value<0)||!Number.isFinite(element.cornerRadius)||element.cornerRadius<0;
    if(invalidCorner){const repaired=precise;issues.push({code:"invalid-corners",elementId:element.id,message:`${element.name} had an invalid corner radius.`,repaired});if(repaired){const fallback=geometry?.geometry.radius??0;element.cornerRadius=fallback;element.corners={tl:fallback,tr:fallback,br:fallback,bl:fallback};}}
    if((element.type==="text"||element.type==="button")&&element.text){const charsPerLine=Math.max(1,Math.floor((element.width-element.padding*2)/Math.max(4,element.fontSize*.58)));const lines=Math.ceil(element.text.length/charsPerLine);const needed=lines*element.fontSize*element.lineHeight+element.padding*2;if(needed>element.height+2){const repaired=precise;issues.push({code:"text-overflow",elementId:element.id,message:`${element.name} text exceeded its box.`,repaired});if(repaired){if(element.textBoxMode==="fixed"&&element.autoFit)element.fontSize=Math.max(7,Math.floor(element.fontSize*(element.height/needed)));else element.height=Math.ceil(needed);}}
    }
  }
  const byParent=new Map<string,EditorElement[]>(); elements.forEach((item)=>{if(item.parentId){const list=byParent.get(item.parentId)??[];list.push(item);byParent.set(item.parentId,list);}});
  byParent.forEach((siblings)=>{for(let i=0;i<siblings.length;i++)for(let j=i+1;j<siblings.length;j++){const a=siblings[i],b=siblings[j];if(a.type==="text"||b.type==="text"||a.type==="container"||b.type==="container"||a.type==="frame"||b.type==="frame"||a.type==="scrolling-frame"||b.type==="scrolling-frame")continue;const area=overlaps(a,b),smaller=Math.min(a.width*a.height,b.width*b.height);if(smaller>0&&area/smaller>.72)issues.push({code:"unwanted-overlap",elementId:b.id,message:`${a.name} and ${b.name} substantially overlap.`,repaired:false});}});
  const repaired=issues.filter((issue)=>issue.repaired).length;
  return {elements,issues,repaired,passed:issues.every((issue)=>issue.repaired)};
}
