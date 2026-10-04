import type { EditorProject } from "@/lib/editor/types";
import type { AIValidationResult, ContentPlan, ValidationIssue } from "./types";
import { designFontSize, textPadding } from "../editor/text-sizing.ts";

export function validateAIProject(project:EditorProject,content?:ContentPlan):AIValidationResult{
  const issues:ValidationIssue[]=[],ids=new Set<string>();
  for(const item of project.elements){
    if(ids.has(item.id))issues.push({code:"duplicate-id",elementId:item.id,message:`Duplicate stable ID ${item.id}.`,repaired:false});ids.add(item.id);
    if(!Number.isFinite(item.x)||!Number.isFinite(item.y)||!Number.isFinite(item.width)||!Number.isFinite(item.height)||item.width<=0||item.height<=0)issues.push({code:"invalid-geometry",elementId:item.id,message:`${item.name} has invalid or zero dimensions.`,repaired:false});
    if(item.parentId&&!project.elements.some((parent)=>parent.id===item.parentId))issues.push({code:"missing-parent",elementId:item.id,message:`${item.name} refers to a missing parent.`,repaired:false});
    if((item.type==="text"||item.type==="button")&&item.text){const padding=textPadding(item),size=designFontSize(item),usable=Math.max(1,item.width-padding.left-padding.right),chars=Math.max(1,Math.floor(usable/Math.max(4,size*.56))),lines=Math.ceil(item.text.length/chars),needed=lines*size*item.lineHeight+padding.top+padding.bottom;if(needed>item.height+2)issues.push({code:"text-overflow",elementId:item.id,message:`${item.name} text is likely clipped.`,repaired:false});}
    if(item.x+item.width<0||item.y+item.height<0||item.x>project.screen.width||item.y>project.screen.height)issues.push({code:"outside-canvas",elementId:item.id,message:`${item.name} is entirely outside the canvas.`,repaired:false});
  }
  content?.exactCounts.forEach((expected)=>{const term=expected.subject.toLowerCase().replace(/\s+/g,"");const actual=project.elements.filter((item)=>item.name.toLowerCase().replace(/\s+/g,"").includes(term.replace(/s$/,"").slice(0,12))).length;if(actual!==expected.count)issues.push({code:"prompt-count",elementId:null,message:`Expected ${expected.count} ${expected.subject}; found ${actual}.`,repaired:false});});
  return {passed:issues.length===0,repaired:0,issues};
}
