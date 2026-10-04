import { createElement } from "./project.ts";
import { distributedPositions, logicalBounds, logicalRect, normalizeDesignValue } from "./geometry-math.ts";
import { inheritedObjectRotation } from "./visual-transform.ts";
import type { Alignment, AlignmentTarget, EditorElement, EditorProject } from "./types";

export const selectedElements = (project: EditorProject) => project.elements.filter((item) => project.selectedIds.includes(item.id));
export function selectionBounds(project: EditorProject) {
  return logicalBounds(selectedElements(project));
}
function boundsForElement(item:EditorElement){return logicalRect(item);}
type AlignmentBounds={left:number;top:number;right:number;bottom:number;width:number;height:number;cx:number;cy:number};
function activeElement(project:EditorProject,items:EditorElement[]){return project.elements.find((item)=>item.id===project.selectedIds.at(-1))??items.at(-1);}
function alignmentBounds(project:EditorProject,target:AlignmentTarget,items:EditorElement[]):AlignmentBounds|null{const active=activeElement(project,items);if(!active)return null;if(target==="canvas")return{left:0,top:0,right:project.screen.width,bottom:project.screen.height,width:project.screen.width,height:project.screen.height,cx:project.screen.width/2,cy:project.screen.height/2};if(target==="key-object")return boundsForElement(active);if(target==="parent"){const parent=project.elements.find((item)=>item.id===active.parentId);return parent?boundsForElement(parent):alignmentBounds(project,"canvas",items);}if(target==="frame"){let current=active.parentId?project.elements.find((item)=>item.id===active.parentId):undefined,last:EditorElement|undefined;while(current){if(current.type==="frame"||current.type==="container"||current.type==="scrolling-frame")last=current;current=current.parentId?project.elements.find((item)=>item.id===current!.parentId):undefined;}return last?boundsForElement(last):alignmentBounds(project,"canvas",items);}return selectionBounds(project);}
export function alignSelection(project: EditorProject, alignment: Alignment,target:AlignmentTarget="selection") {
  const items = selectedElements(project); if (!items.length||(target==="selection"&&items.length<2)) return; const bounds = alignmentBounds(project,target,items);if(!bounds)return;const key=target==="key-object"?activeElement(project,items)?.id:null;
  items.forEach((item) => {if(item.id===key)return; if (alignment === "left") item.x = normalizeDesignValue(bounds.left); if (alignment === "hcenter") item.x = normalizeDesignValue(bounds.cx - item.width / 2); if (alignment === "right") item.x = normalizeDesignValue(bounds.right - item.width); if (alignment === "top") item.y = normalizeDesignValue(bounds.top); if (alignment === "vcenter") item.y = normalizeDesignValue(bounds.cy - item.height / 2); if (alignment === "bottom") item.y = normalizeDesignValue(bounds.bottom - item.height); });
}
export function distributeSelection(project: EditorProject, axis: "horizontal" | "vertical",exactSpacing?:number) {
  const items = selectedElements(project).sort((a, b) => axis === "horizontal" ? a.x - b.x : a.y - b.y); if (items.length < 3) return;
  if (axis === "horizontal") { const start = items[0].x; const end = items.at(-1)!.x + items.at(-1)!.width; const total = items.reduce((sum, item) => sum + item.width, 0); const gap = normalizeDesignValue(exactSpacing??(end - start - total) / (items.length - 1)); const positions=distributedPositions(items.map((item)=>item.width),start,gap);items.forEach((item,index)=>{item.x=positions[index];}); }
  else { const start = items[0].y; const end = items.at(-1)!.y + items.at(-1)!.height; const total = items.reduce((sum, item) => sum + item.height, 0); const gap = normalizeDesignValue(exactSpacing??(end - start - total) / (items.length - 1)); const positions=distributedPositions(items.map((item)=>item.height),start,gap);items.forEach((item,index)=>{item.y=positions[index];}); }
}
export function stackSelection(project:EditorProject,axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end"="center"){
  const items=selectedElements(project).sort((a,b)=>axis==="horizontal"?a.x-b.x:a.y-b.y);if(items.length<2)return;
  const key=activeElement(project,items)!;const keyIndex=items.findIndex((item)=>item.id===key.id);
  const exactGap=normalizeDesignValue(gap),cross=(item:EditorElement)=>{if(axis==="horizontal"){item.y=normalizeDesignValue(alignment==="start"?key.y:alignment==="end"?key.y+key.height-item.height:key.y+(key.height-item.height)/2);}else item.x=normalizeDesignValue(alignment==="start"?key.x:alignment==="end"?key.x+key.width-item.width:key.x+(key.width-item.width)/2);};
  items.forEach((item,index)=>{if(axis==="horizontal"){const delta=index>keyIndex?key.width+items.slice(keyIndex+1,index).reduce((sum,current)=>sum+current.width,0)+exactGap*(index-keyIndex):-items.slice(index,keyIndex).reduce((sum,current)=>sum+current.width,0)-exactGap*(keyIndex-index);item.x=normalizeDesignValue(key.x+delta);}else{const delta=index>keyIndex?key.height+items.slice(keyIndex+1,index).reduce((sum,current)=>sum+current.height,0)+exactGap*(index-keyIndex):-items.slice(index,keyIndex).reduce((sum,current)=>sum+current.height,0)-exactGap*(keyIndex-index);item.y=normalizeDesignValue(key.y+delta);}cross(item);});
}
export function convertSelectionToAutoLayout(project:EditorProject,axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end"="center"){
  if(project.selectedIds.length<2)return;stackSelection(project,axis,gap,alignment);groupSelection(project);const group=project.elements.find((item)=>item.id===project.selectedIds[0]);if(!group)return;group.name=axis==="horizontal"?"Horizontal Stack":"Vertical Stack";group.layoutMode=axis;group.gap=gap;group.primaryAlign="start";group.crossAlign=alignment;group.layoutPadding={top:0,right:0,bottom:0,left:0};group.clipContent=false;group.borderWidth=0;group.borderColor="transparent";
}
export type RepeatGridOptions={columns:number;rows:number;gapX:number;gapY:number};
export function repeatGridSelection(project:EditorProject,options:RepeatGridOptions){
  const columns=Math.max(1,Math.min(50,Math.round(options.columns))),rows=Math.max(1,Math.min(50,Math.round(options.rows))),gapX=Math.max(-1000,Math.min(1000,options.gapX)),gapY=Math.max(-1000,Math.min(1000,options.gapY));
  if(!project.selectedIds.length||columns*rows<=1)return;
  const selectedSet=new Set(project.selectedIds),hasSelectedAncestor=(item:EditorElement)=>{let parent=item.parentId;while(parent){if(selectedSet.has(parent))return true;parent=project.elements.find((candidate)=>candidate.id===parent)?.parentId??null;}return false;};
  const roots=project.elements.filter((item)=>selectedSet.has(item.id)&&!hasSelectedAncestor(item));if(!roots.length)return;
  const sourceIds=new Set(roots.map((item)=>item.id));let changed=true;while(changed){changed=false;project.elements.forEach((item)=>{if(item.parentId&&sourceIds.has(item.parentId)&&!sourceIds.has(item.id)){sourceIds.add(item.id);changed=true;}});}
  const sources=project.elements.filter((item)=>sourceIds.has(item.id)),left=Math.min(...roots.map((item)=>item.x)),top=Math.min(...roots.map((item)=>item.y)),right=Math.max(...roots.map((item)=>item.x+item.width)),bottom=Math.max(...roots.map((item)=>item.y+item.height)),stepX=normalizeDesignValue(right-left+gapX),stepY=normalizeDesignValue(bottom-top+gapY);
  const selected=[...roots.map((item)=>item.id)];let sequence=1;
  for(let row=0;row<rows;row++)for(let column=0;column<columns;column++){if(row===0&&column===0)continue;sequence+=1;const stamp=`${Date.now().toString(36)}_${row}_${column}`,idMap=new Map(sources.map((item,index)=>[item.id,`${item.type}_grid_${stamp}_${index}`]));const clones=sources.map((item)=>({...structuredClone(item),id:idMap.get(item.id)!,parentId:item.parentId?(idMap.get(item.parentId)??item.parentId):null,name:roots.some((root)=>root.id===item.id)?`${item.name} ${String(sequence).padStart(2,"0")}`:item.name,x:normalizeDesignValue(item.x+column*stepX),y:normalizeDesignValue(item.y+row*stepY)}));project.elements.push(...clones);roots.forEach((root)=>selected.push(idMap.get(root.id)!));}
  project.selectedIds=selected;
}
export function groupSelection(project: EditorProject) {
  const bounds = selectionBounds(project); if (!bounds || project.selectedIds.length < 2) return;
  const group = createElement("container", project.elements.length); group.name = "Group"; group.x = bounds.left; group.y = bounds.top; group.width = bounds.width; group.height = bounds.height; group.fill = "transparent"; group.borderColor = "#48d7ff"; group.borderWidth = 1; group.shadow = "none";
  project.elements.forEach((item) => { if (project.selectedIds.includes(item.id)) item.parentId = group.id; }); project.elements.push(group); project.selectedIds = [group.id];
}
export function ungroupSelection(project: EditorProject) {
  const groups = new Set(project.selectedIds); const childIds: string[] = []; project.elements.forEach((item) => { if (item.parentId && groups.has(item.parentId)) { item.parentId = null; childIds.push(item.id); } }); project.elements = project.elements.filter((item) => !groups.has(item.id) || item.name !== "Group"); project.selectedIds = childIds;
}

export type LayerDropPosition="before"|"inside"|"after";
export type LayerReparentRequest={draggedIds:string[];targetId:string|null;position:LayerDropPosition;keepLocalPosition?:boolean};
export type LayerReparentResult={ok:boolean;movedIds:string[];reason?:string};
const CONTAINER_TYPES=new Set<EditorElement["type"]>(["frame","container","scrolling-frame","button","image-button"]);

export function canContainChildren(element:EditorElement|null){return element===null||CONTAINER_TYPES.has(element.type);}
function descendantSet(elements:EditorElement[],roots:Iterable<string>){const result=new Set(roots);let changed=true;while(changed){changed=false;elements.forEach((element)=>{if(element.parentId&&result.has(element.parentId)&&!result.has(element.id)){result.add(element.id);changed=true;}});}return result;}
export function hierarchyRootIds(elements:EditorElement[],ids:Iterable<string>){const selected=new Set(ids);return elements.filter((element)=>{if(!selected.has(element.id))return false;let parent=element.parentId;while(parent){if(selected.has(parent))return false;parent=elements.find((candidate)=>candidate.id===parent)?.parentId??null;}return true;}).map((element)=>element.id);}

export function validateLayerReparent(project:EditorProject,request:LayerReparentRequest):LayerReparentResult{
  const byId=new Map(project.elements.map((element)=>[element.id,element])),roots=hierarchyRootIds(project.elements,request.draggedIds),rootSet=new Set(roots);
  if(!roots.length)return{ok:false,movedIds:[],reason:"Select at least one layer to move."};
  if(roots.some((id)=>byId.get(id)?.locked))return{ok:false,movedIds:[],reason:"Unlock the selected layer before moving it."};
  const target=request.targetId?byId.get(request.targetId):null;
  if(request.targetId&&!target)return{ok:false,movedIds:[],reason:"The drop target no longer exists."};
  if(target?.locked)return{ok:false,movedIds:[],reason:"Unlock the target container before adding or reordering children."};
  const descendants=descendantSet(project.elements,rootSet);
  if(request.targetId&&descendants.has(request.targetId))return{ok:false,movedIds:[],reason:"A layer cannot be moved inside itself or one of its descendants."};
  const newParentId=request.position==="inside"?request.targetId:(target?.parentId??null),newParent=newParentId?byId.get(newParentId)??null:null;
  if(!canContainChildren(newParent))return{ok:false,movedIds:[],reason:`${newParent?.name??"This layer"} cannot contain child layers.`};
  if(request.position==="inside"&&!canContainChildren(target??null))return{ok:false,movedIds:[],reason:`${target?.name??"This layer"} cannot contain child layers.`};
  return{ok:true,movedIds:roots};
}

export function reparentLayers(project:EditorProject,request:LayerReparentRequest):LayerReparentResult{
  const validation=validateLayerReparent(project,request);if(!validation.ok)return validation;
  const byId=new Map(project.elements.map((element)=>[element.id,element])),roots=validation.movedIds.map((id)=>byId.get(id)!).filter(Boolean),target=request.targetId?byId.get(request.targetId)??null:null,newParentId=request.position==="inside"?target?.id??null:target?.parentId??null,newParent=newParentId?byId.get(newParentId)??null:null,newParentWorldRotation=newParent?inheritedObjectRotation(newParent,project.elements)+newParent.rotation:0;
  roots.forEach((element)=>{const oldWorldRotation=inheritedObjectRotation(element,project.elements)+element.rotation;if(request.keepLocalPosition){const oldParent=element.parentId?byId.get(element.parentId):null,localX=element.x-(oldParent?.x??0),localY=element.y-(oldParent?.y??0);element.x=(newParent?.x??0)+localX;element.y=(newParent?.y??0)+localY;}else element.rotation=oldWorldRotation-newParentWorldRotation;element.parentId=newParentId;});
  const moved=new Set(roots.map((element)=>element.id)),siblings=project.elements.filter((element)=>element.parentId===newParentId&&!moved.has(element.id)).sort((a,b)=>b.zIndex-a.zIndex||project.elements.indexOf(b)-project.elements.indexOf(a));
  let insertion=0;if(request.position!=="inside"&&target){const targetIndex=siblings.findIndex((element)=>element.id===target.id);insertion=targetIndex<0?siblings.length:targetIndex+(request.position==="after"?1:0);}
  const visualOrder=[...siblings.slice(0,insertion),...roots,...siblings.slice(insertion)],base=Math.max(visualOrder.length,...visualOrder.map((element)=>element.zIndex));visualOrder.forEach((element,index)=>{element.zIndex=base-index;});
  project.selectedIds=roots.map((element)=>element.id);
  return{ok:true,movedIds:roots.map((element)=>element.id)};
}

export function indentSelection(project:EditorProject):LayerReparentResult{
  const roots=hierarchyRootIds(project.elements,project.selectedIds);if(!roots.length)return{ok:false,movedIds:[],reason:"Select a layer to indent."};
  const first=project.elements.find((element)=>element.id===roots[0])!,siblings=project.elements.filter((element)=>element.parentId===first.parentId&&!roots.includes(element.id)).sort((a,b)=>b.zIndex-a.zIndex),index=siblings.findIndex((element)=>element.zIndex<first.zIndex),target=siblings[index>=0?index:siblings.length-1];
  if(!target)return{ok:false,movedIds:[],reason:"There is no previous container to move into."};
  return reparentLayers(project,{draggedIds:roots,targetId:target.id,position:"inside"});
}

export function outdentSelection(project:EditorProject):LayerReparentResult{
  const roots=hierarchyRootIds(project.elements,project.selectedIds);if(!roots.length)return{ok:false,movedIds:[],reason:"Select a layer to outdent."};
  const first=project.elements.find((element)=>element.id===roots[0])!,parent=first.parentId?project.elements.find((element)=>element.id===first.parentId):null;
  if(!parent)return{ok:false,movedIds:[],reason:"The selected layer is already at the screen root."};
  return reparentLayers(project,{draggedIds:roots,targetId:parent.id,position:"after"});
}
