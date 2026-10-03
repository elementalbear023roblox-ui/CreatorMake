import { createElement } from "./project.ts";
import type { Alignment, AlignmentTarget, EditorElement, EditorProject } from "./types";

export const selectedElements = (project: EditorProject) => project.elements.filter((item) => project.selectedIds.includes(item.id));
export function selectionBounds(project: EditorProject) {
  const items = selectedElements(project); if (!items.length) return null;
  const left = Math.min(...items.map((item) => item.x)); const top = Math.min(...items.map((item) => item.y));
  const right = Math.max(...items.map((item) => item.x + item.width)); const bottom = Math.max(...items.map((item) => item.y + item.height));
  return { left, top, right, bottom, width: right - left, height: bottom - top, cx: (left + right) / 2, cy: (top + bottom) / 2 };
}
function boundsForElement(item:EditorElement){return{left:item.x,top:item.y,right:item.x+item.width,bottom:item.y+item.height,width:item.width,height:item.height,cx:item.x+item.width/2,cy:item.y+item.height/2};}
type AlignmentBounds={left:number;top:number;right:number;bottom:number;width:number;height:number;cx:number;cy:number};
function activeElement(project:EditorProject,items:EditorElement[]){return project.elements.find((item)=>item.id===project.selectedIds.at(-1))??items.at(-1);}
function alignmentBounds(project:EditorProject,target:AlignmentTarget,items:EditorElement[]):AlignmentBounds|null{const active=activeElement(project,items);if(!active)return null;if(target==="canvas")return{left:0,top:0,right:project.screen.width,bottom:project.screen.height,width:project.screen.width,height:project.screen.height,cx:project.screen.width/2,cy:project.screen.height/2};if(target==="key-object")return boundsForElement(active);if(target==="parent"){const parent=project.elements.find((item)=>item.id===active.parentId);return parent?boundsForElement(parent):alignmentBounds(project,"canvas",items);}if(target==="frame"){let current=active.parentId?project.elements.find((item)=>item.id===active.parentId):undefined,last:EditorElement|undefined;while(current){if(current.type==="frame"||current.type==="container"||current.type==="scrolling-frame")last=current;current=current.parentId?project.elements.find((item)=>item.id===current!.parentId):undefined;}return last?boundsForElement(last):alignmentBounds(project,"canvas",items);}return selectionBounds(project);}
export function alignSelection(project: EditorProject, alignment: Alignment,target:AlignmentTarget="selection") {
  const items = selectedElements(project); if (!items.length||(target==="selection"&&items.length<2)) return; const bounds = alignmentBounds(project,target,items);if(!bounds)return;const key=target==="key-object"?activeElement(project,items)?.id:null;
  items.forEach((item) => {if(item.id===key)return; if (alignment === "left") item.x = bounds.left; if (alignment === "hcenter") item.x = bounds.cx - item.width / 2; if (alignment === "right") item.x = bounds.right - item.width; if (alignment === "top") item.y = bounds.top; if (alignment === "vcenter") item.y = bounds.cy - item.height / 2; if (alignment === "bottom") item.y = bounds.bottom - item.height; });
}
export function distributeSelection(project: EditorProject, axis: "horizontal" | "vertical",exactSpacing?:number) {
  const items = selectedElements(project).sort((a, b) => axis === "horizontal" ? a.x - b.x : a.y - b.y); if (items.length < 3) return;
  if (axis === "horizontal") { const start = items[0].x; const end = items.at(-1)!.x + items.at(-1)!.width; const total = items.reduce((sum, item) => sum + item.width, 0); const gap = exactSpacing??(end - start - total) / (items.length - 1); let cursor = start; items.forEach((item) => { item.x = cursor; cursor += item.width + gap; }); }
  else { const start = items[0].y; const end = items.at(-1)!.y + items.at(-1)!.height; const total = items.reduce((sum, item) => sum + item.height, 0); const gap = exactSpacing??(end - start - total) / (items.length - 1); let cursor = start; items.forEach((item) => { item.y = cursor; cursor += item.height + gap; }); }
}
export function stackSelection(project:EditorProject,axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end"="center"){
  const items=selectedElements(project).sort((a,b)=>axis==="horizontal"?a.x-b.x:a.y-b.y);if(items.length<2)return;
  const key=activeElement(project,items)!;const keyIndex=items.findIndex((item)=>item.id===key.id);
  const cross=(item:EditorElement)=>{if(axis==="horizontal"){item.y=alignment==="start"?key.y:alignment==="end"?key.y+key.height-item.height:key.y+(key.height-item.height)/2;}else item.x=alignment==="start"?key.x:alignment==="end"?key.x+key.width-item.width:key.x+(key.width-item.width)/2;};
  cross(key);let cursor=axis==="horizontal"?key.x+key.width:key.y+key.height;
  for(let index=keyIndex+1;index<items.length;index++){const item=items[index];if(axis==="horizontal"){item.x=cursor+gap;cursor=item.x+item.width;}else{item.y=cursor+gap;cursor=item.y+item.height;}cross(item);}
  cursor=axis==="horizontal"?key.x:key.y;
  for(let index=keyIndex-1;index>=0;index--){const item=items[index];if(axis==="horizontal"){item.x=cursor-gap-item.width;cursor=item.x;}else{item.y=cursor-gap-item.height;cursor=item.y;}cross(item);}
}
export function convertSelectionToAutoLayout(project:EditorProject,axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end"="center"){
  if(project.selectedIds.length<2)return;stackSelection(project,axis,gap,alignment);groupSelection(project);const group=project.elements.find((item)=>item.id===project.selectedIds[0]);if(!group)return;group.name=axis==="horizontal"?"Horizontal Stack":"Vertical Stack";group.layoutMode=axis;group.gap=gap;group.primaryAlign="start";group.crossAlign=alignment;group.layoutPadding={top:0,right:0,bottom:0,left:0};group.clipContent=false;group.borderWidth=0;group.borderColor="transparent";
}
export function groupSelection(project: EditorProject) {
  const bounds = selectionBounds(project); if (!bounds || project.selectedIds.length < 2) return;
  const group = createElement("container", project.elements.length); group.name = "Group"; group.x = bounds.left; group.y = bounds.top; group.width = bounds.width; group.height = bounds.height; group.fill = "transparent"; group.borderColor = "#48d7ff"; group.borderWidth = 1; group.shadow = "none";
  project.elements.forEach((item) => { if (project.selectedIds.includes(item.id)) item.parentId = group.id; }); project.elements.push(group); project.selectedIds = [group.id];
}
export function ungroupSelection(project: EditorProject) {
  const groups = new Set(project.selectedIds); const childIds: string[] = []; project.elements.forEach((item) => { if (item.parentId && groups.has(item.parentId)) { item.parentId = null; childIds.push(item.id); } }); project.elements = project.elements.filter((item) => !groups.has(item.id) || item.name !== "Group"); project.selectedIds = childIds;
}
