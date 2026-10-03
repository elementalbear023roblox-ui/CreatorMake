import type { EditorElement, EditorProject, ResizeCorner } from "./types";

export type Bounds={left:number;top:number;right:number;bottom:number;width:number;height:number;cx:number;cy:number};
export type TransformSource={id:string;x:number;y:number;width:number;height:number};

const clamp=(value:number,min:number|null,max:number|null)=>Math.max(min??4,Math.min(max??Infinity,value));

export function resizeElementWithConstraints(draft:EditorProject,before:EditorProject,id:string,next:{x:number;y:number;width:number;height:number}){
  const originalById=new Map(before.elements.map((item)=>[item.id,item])),draftById=new Map(draft.elements.map((item)=>[item.id,item])),root=draftById.get(id),originalRoot=originalById.get(id);if(!root||!originalRoot)return;
  Object.assign(root,next);
  const visit=(parentBefore:EditorElement,parentAfter:EditorElement)=>{const children=before.elements.filter((item)=>item.parentId===parentBefore.id);children.forEach((childBefore)=>{const child=draftById.get(childBefore.id);if(!child)return;const left=childBefore.x-parentBefore.x,right=parentBefore.x+parentBefore.width-(childBefore.x+childBefore.width),top=childBefore.y-parentBefore.y,bottom=parentBefore.y+parentBefore.height-(childBefore.y+childBefore.height),centerX=childBefore.x+childBefore.width/2-(parentBefore.x+parentBefore.width/2),centerY=childBefore.y+childBefore.height/2-(parentBefore.y+parentBefore.height/2);
      if(parentBefore.layoutMode==="none"){
        if(childBefore.constraints.horizontal==="right")child.x=parentAfter.x+parentAfter.width-right-childBefore.width;
        else if(childBefore.constraints.horizontal==="left-right"){child.x=parentAfter.x+left;child.width=clamp(parentAfter.width-left-right,child.minWidth,child.maxWidth);}
        else if(childBefore.constraints.horizontal==="center")child.x=parentAfter.x+parentAfter.width/2+centerX-childBefore.width/2;
        else if(childBefore.constraints.horizontal==="scale"){const ratio=parentAfter.width/Math.max(1,parentBefore.width);child.x=parentAfter.x+left*ratio;child.width=clamp(childBefore.width*ratio,child.minWidth,child.maxWidth);}
        else child.x=parentAfter.x+left;
        if(childBefore.constraints.vertical==="bottom")child.y=parentAfter.y+parentAfter.height-bottom-childBefore.height;
        else if(childBefore.constraints.vertical==="top-bottom"){child.y=parentAfter.y+top;child.height=clamp(parentAfter.height-top-bottom,child.minHeight,child.maxHeight);}
        else if(childBefore.constraints.vertical==="center")child.y=parentAfter.y+parentAfter.height/2+centerY-childBefore.height/2;
        else if(childBefore.constraints.vertical==="scale"){const ratio=parentAfter.height/Math.max(1,parentBefore.height);child.y=parentAfter.y+top*ratio;child.height=clamp(childBefore.height*ratio,child.minHeight,child.maxHeight);}
        else child.y=parentAfter.y+top;
      }
      visit(childBefore,child);
    });};
  visit(originalRoot,root);
}

export function calculateSelectionResize(bounds:Bounds,sources:TransformSource[],corner:ResizeCorner,dx:number,dy:number,preserveRatio:boolean,fromCenter:boolean){
  const ratio=bounds.width/Math.max(1,bounds.height);let width=Math.max(8,bounds.width+(corner.includes("e")?dx:-dx)),height=Math.max(4,bounds.height+(corner.includes("s")?dy:-dy));
  if(preserveRatio){if(Math.abs(dx)>Math.abs(dy))height=width/ratio;else width=height*ratio;}
  let left=corner.includes("w")?bounds.right-width:bounds.left,top=corner.includes("n")?bounds.bottom-height:bounds.top;if(fromCenter){left=bounds.cx-width/2;top=bounds.cy-height/2;}
  const sx=width/Math.max(1,bounds.width),sy=height/Math.max(1,bounds.height);return sources.map((source)=>({id:source.id,x:left+(source.x-bounds.left)*sx,y:top+(source.y-bounds.top)*sy,width:Math.max(4,source.width*sx),height:Math.max(4,source.height*sy)}));
}

export function applySharedPerspective(project:EditorProject,patch:Partial<EditorElement>){
  const items=project.elements.filter((item)=>project.selectedIds.includes(item.id)&&!item.locked);if(items.length<2||(patch.rotateX===undefined&&patch.rotateY===undefined))return false;
  const left=Math.min(...items.map((item)=>item.x)),right=Math.max(...items.map((item)=>item.x+item.width)),top=Math.min(...items.map((item)=>item.y)),bottom=Math.max(...items.map((item)=>item.y+item.height)),cx=(left+right)/2,cy=(top+bottom)/2,active=items.at(-1)!;
  const rotateX=((patch.rotateX??active.rotateX)-active.rotateX)*Math.PI/180,rotateY=((patch.rotateY??active.rotateY)-active.rotateY)*Math.PI/180,perspective=Math.max(100,patch.perspective??active.perspective);
  items.forEach((item)=>{const centerX=item.x+item.width/2,centerY=item.y+item.height/2,dx=centerX-cx,dy=centerY-cy,yAfterX=dy*Math.cos(rotateX),zAfterX=dy*Math.sin(rotateX),xAfterY=dx*Math.cos(rotateY)+zAfterX*Math.sin(rotateY),zAfterY=-dx*Math.sin(rotateY)+zAfterX*Math.cos(rotateY),projection=perspective/Math.max(40,perspective+zAfterY);item.x=cx+xAfterY*projection-item.width/2;item.y=cy+yAfterX*projection-item.height/2;item.translateZ+=zAfterY;});return true;
}
