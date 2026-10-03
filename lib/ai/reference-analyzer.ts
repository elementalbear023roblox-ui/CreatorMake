import type { AIReferenceInput, ReferenceDetail } from "./types";
import type { EditorProject } from "@/lib/editor/types";

export function referenceInputs(project:EditorProject):AIReferenceInput[]{return project.references.map((reference)=>({id:reference.id,name:reference.name,dataUrl:reference.dataUrl,role:reference.role,influence:reference.influence,notes:reference.notes,regions:reference.regions.map((region)=>({name:region.name,role:region.role,x:region.x,y:region.y,width:region.width,height:region.height}))}));}
export function multimodalContent(prompt:string,references:AIReferenceInput[],canvasImage:string|null,detail:ReferenceDetail){
  const content:Array<Record<string,unknown>>=[{type:"input_text",text:prompt}];
  if(canvasImage)content.push({type:"input_text",text:"Current CreatorMake canvas screenshot:"},{type:"input_image",image_url:canvasImage,detail});
  references.forEach((reference)=>{content.push({type:"input_text",text:`Reference ${reference.name}; role=${reference.role}; influence=${reference.influence}; notes=${reference.notes||"none"}; regions=${JSON.stringify(reference.regions)}`},{type:"input_image",image_url:reference.dataUrl,detail});});
  return content;
}

