import type { EditorProject } from "@/lib/editor/types";
import type { CompactElement, CreatorMakeContext } from "./types";

const compact=(item:EditorProject["elements"][number]):CompactElement=>({id:item.id,type:item.type,name:item.name,parentId:item.parentId,x:item.x,y:item.y,width:item.width,height:item.height,rotation:item.rotation,fill:item.fill,borderColor:item.borderColor,borderWidth:item.borderWidth,cornerRadius:item.cornerRadius,text:item.text,textColor:item.textColor,fontFamily:item.fontFamily,fontSize:item.fontSize,fontWeight:item.fontWeight,layoutMode:item.layoutMode,gap:item.gap,gridColumns:item.gridColumns,padding:item.padding,shadow:item.shadow,hidden:item.hidden,locked:item.locked});

export function buildCreatorMakeContext(project:EditorProject,generationMode:string):CreatorMakeContext{
  const relevant=new Set(project.selectedIds);
  if(project.selectedIds.length){let changed=true;while(changed){changed=false;project.elements.forEach((item)=>{if(item.parentId&&relevant.has(item.parentId)&&!relevant.has(item.id)){relevant.add(item.id);changed=true;}});}}
  const isModification=/selected|refine|restyle|fix|current/i.test(generationMode);
  const source=isModification&&relevant.size?project.elements.filter((item)=>relevant.has(item.id)):project.elements;
  const allowedIds=new Set(source.map((item)=>item.id));
  const hierarchy=source.map((item)=>({id:item.id,parentId:item.parentId&&allowedIds.has(item.parentId)?item.parentId:null,children:source.filter((child)=>child.parentId===item.id).map((child)=>child.id)}));
  const active=project.elements.find((item)=>item.id===project.selectedIds.at(-1))??null;
  return {project:{id:project.id,name:project.name},screen:project.screen,selection:[...project.selectedIds],activeFrame:active?compact(active):null,elements:source.map(compact),hierarchy,activePresetIds:[...project.activePresetIds],generationMode,preserve:{layout:isModification,text:isModification,size:isModification,hierarchy:isModification}};
}

