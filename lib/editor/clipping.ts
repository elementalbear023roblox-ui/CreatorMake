import type { EditorElement } from "./types";

export type ContentClipBounds={left:number;top:number;right:number;bottom:number};

export function contentClipBounds(element:EditorElement,elements:EditorElement[]):ContentClipBounds|null{
  const byId=new Map(elements.map((item)=>[item.id,item]));
  let parentId=element.parentId,bounds:ContentClipBounds|null=null,guard=0;
  while(parentId&&guard<64){
    const parent=byId.get(parentId);if(!parent)break;
    if(parent.clipContent||parent.type==="scrolling-frame"){
      const next={left:parent.x,top:parent.y,right:parent.x+parent.width,bottom:parent.y+parent.height};
      bounds=bounds?{left:Math.max(bounds.left,next.left),top:Math.max(bounds.top,next.top),right:Math.min(bounds.right,next.right),bottom:Math.min(bounds.bottom,next.bottom)}:next;
    }
    parentId=parent.parentId;guard+=1;
  }
  return bounds;
}

const round=(value:number)=>Math.round(value*1000)/1000;
export function contentClipPath(element:EditorElement,elements:EditorElement[]):string|undefined{
  const bounds=contentClipBounds(element,elements);if(!bounds)return undefined;
  const top=Math.max(0,bounds.top-element.y),right=Math.max(0,element.x+element.width-bounds.right),bottom=Math.max(0,element.y+element.height-bounds.bottom),left=Math.max(0,bounds.left-element.x);
  if(left+right>=element.width||top+bottom>=element.height)return "inset(50%)";
  return `inset(${round(top)}px ${round(right)}px ${round(bottom)}px ${round(left)}px)`;
}
