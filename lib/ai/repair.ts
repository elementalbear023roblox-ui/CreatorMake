import type { EditorProject } from "@/lib/editor/types";
import type { AIValidationResult } from "./types";
import { validateAIProject } from "./validator";

export function deterministicRepair(project:EditorProject){let repaired=0;const ids=new Set(project.elements.map((item)=>item.id));for(const item of project.elements){if(item.parentId&&!ids.has(item.parentId)){item.parentId=null;repaired++;}if(!Number.isFinite(item.x)){item.x=0;repaired++;}if(!Number.isFinite(item.y)){item.y=0;repaired++;}if(!Number.isFinite(item.width)||item.width<=0){item.width=4;repaired++;}if(!Number.isFinite(item.height)||item.height<=0){item.height=4;repaired++;}if((item.type==="text"||item.type==="button")&&item.text){const usable=Math.max(1,item.width-item.padding*2),chars=Math.max(1,Math.floor(usable/Math.max(4,item.fontSize*.56))),needed=Math.ceil(item.text.length/chars)*item.fontSize*item.lineHeight+item.padding*2;if(needed>item.height){item.height=Math.ceil(needed);repaired++;}}}
  const validation=validateAIProject(project);return {...validation,repaired,issues:validation.issues.map((issue)=>({...issue,repaired:false}))} satisfies AIValidationResult;
}

