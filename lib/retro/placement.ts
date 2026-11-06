import type { EditorElement } from "../editor/types.ts";

const CONTAINERS=new Set(["frame","container","scrolling-frame"]);

export type RetroPlacementResult={elements:EditorElement[];attached:boolean;parentId:string|null;role:string;};

/**
 * Attaches an inserted retro component to the selected container using the
 * structural role declared by the component. All coordinates stay in the
 * editor's absolute design space, so legacy projects and Roblox export keep
 * the same geometry model.
 */
export function placeRetroComponent(elements:EditorElement[],rootId:string,parent:EditorElement|null,existing:EditorElement[]):RetroPlacementResult{
  const next=elements.map((item)=>structuredClone(item)),root=next.find((item)=>item.id===rootId);
  const attachable=root&&(["button","control","icon"].includes(root.retro?.kind??"")||["titlebar","menu","toolbar","status","scrollbar","action","field","navigation-item"].includes(root.retro?.layoutRole??""));
  let target=parent,guard=0;while(target&&!CONTAINERS.has(target.type)&&target.parentId&&guard<32){target=existing.find((item)=>item.id===target?.parentId)??null;guard++;}
  if(!root||!target||!CONTAINERS.has(target.type)||!attachable)return{elements:next,attached:false,parentId:null,role:root?.retro?.layoutRole??"free"};
  const role=root.retro?.layoutRole??root.retro?.role??"content",padding=3,existingChildren=existing.filter((item)=>item.parentId===target.id&&!item.hidden);
  let x=target.x+12,y=target.y+12,width=root.width,height=root.height;
  if(role==="titlebar"){x=target.x+padding;y=target.y+padding;width=Math.max(16,target.width-padding*2);}
  else if(role==="menu"){x=target.x+padding;y=target.y+(existingChildren.some((item)=>item.retro?.layoutRole==="titlebar")?21:padding);width=Math.max(16,target.width-padding*2);}
  else if(role==="toolbar"){const top=existingChildren.filter((item)=>["titlebar","menu","toolbar"].includes(item.retro?.layoutRole??"")).reduce((bottom,item)=>Math.max(bottom,item.y+item.height),target.y+padding);x=target.x+padding;y=top;width=Math.max(16,target.width-padding*2);}
  else if(role==="status"){x=target.x+padding;y=target.y+target.height-root.height-padding;width=Math.max(16,target.width-padding*2);}
  else if(role==="scrollbar"){x=target.x+target.width-root.width-padding;y=target.y+padding;height=Math.max(root.height,target.height-padding*2);}
  else if(role==="action"){const actionSiblings=existingChildren.filter((item)=>item.retro?.layoutRole==="action");x=target.x+target.width-root.width-12-actionSiblings.length*(root.width+6);y=target.y+target.height-root.height-11;}
  else{
    const contentChildren=existingChildren.filter((item)=>!["titlebar","menu","toolbar","status","scrollbar"].includes(item.retro?.layoutRole??""));
    y=contentChildren.length?Math.min(target.y+target.height-root.height-12,Math.max(...contentChildren.map((item)=>item.y+item.height))+6):target.y+12;
    x=target.x+12;
  }
  const dx=Math.round(x-root.x),dy=Math.round(y-root.y),dw=Math.round(width-root.width),dh=Math.round(height-root.height);
  const subtree=new Set<string>([root.id]);let changed=true;while(changed){changed=false;next.forEach((item)=>{if(item.parentId&&subtree.has(item.parentId)&&!subtree.has(item.id)){subtree.add(item.id);changed=true;}});}
  next.forEach((item)=>{if(!subtree.has(item.id))return;item.x+=dx;item.y+=dy;if(item.id===root.id){item.parentId=target.id;item.width+=dw;item.height+=dh;item.retro={...item.retro!,autoLayout:true,detached:false};if(role==="titlebar"||role==="menu"||role==="toolbar"||role==="status")item.constraints={horizontal:"left-right",vertical:role==="status"?"bottom":"top"};else if(role==="scrollbar")item.constraints={horizontal:"right",vertical:"top-bottom"};else if(role==="action")item.constraints={horizontal:"right",vertical:"bottom"};}});
  return{elements:next,attached:true,parentId:target.id,role};
}
