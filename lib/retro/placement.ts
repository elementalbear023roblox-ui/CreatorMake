import type { EditorElement } from "../editor/types.ts";

const CONTAINERS=new Set(["frame","container","scrolling-frame","button"]);

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
  if(!root||!parent||!CONTAINERS.has(parent.type)||!attachable)return{elements:next,attached:false,parentId:null,role:root?.retro?.layoutRole??"free"};
  const role=root.retro?.layoutRole??root.retro?.role??"content",padding=3,existingChildren=existing.filter((item)=>item.parentId===parent.id&&!item.hidden);
  let x=parent.x+12,y=parent.y+12,width=root.width,height=root.height;
  if(role==="titlebar"){x=parent.x+padding;y=parent.y+padding;width=Math.max(16,parent.width-padding*2);}
  else if(role==="menu"){x=parent.x+padding;y=parent.y+(existingChildren.some((item)=>item.retro?.layoutRole==="titlebar")?21:padding);width=Math.max(16,parent.width-padding*2);}
  else if(role==="toolbar"){const top=existingChildren.filter((item)=>["titlebar","menu","toolbar"].includes(item.retro?.layoutRole??"")).reduce((bottom,item)=>Math.max(bottom,item.y+item.height),parent.y+padding);x=parent.x+padding;y=top;width=Math.max(16,parent.width-padding*2);}
  else if(role==="status"){x=parent.x+padding;y=parent.y+parent.height-root.height-padding;width=Math.max(16,parent.width-padding*2);}
  else if(role==="scrollbar"){x=parent.x+parent.width-root.width-padding;y=parent.y+padding;height=Math.max(root.height,parent.height-padding*2);}
  else if(role==="action"){x=parent.x+parent.width-root.width-12;y=parent.y+parent.height-root.height-11;}
  else{
    const contentChildren=existingChildren.filter((item)=>!["titlebar","menu","toolbar","status","scrollbar"].includes(item.retro?.layoutRole??""));
    y=contentChildren.length?Math.min(parent.y+parent.height-root.height-12,Math.max(...contentChildren.map((item)=>item.y+item.height))+6):parent.y+12;
    x=parent.x+12;
  }
  const dx=Math.round(x-root.x),dy=Math.round(y-root.y),dw=Math.round(width-root.width),dh=Math.round(height-root.height);
  const subtree=new Set<string>([root.id]);let changed=true;while(changed){changed=false;next.forEach((item)=>{if(item.parentId&&subtree.has(item.parentId)&&!subtree.has(item.id)){subtree.add(item.id);changed=true;}});}
  next.forEach((item)=>{if(!subtree.has(item.id))return;item.x+=dx;item.y+=dy;if(item.id===root.id){item.parentId=parent.id;item.width+=dw;item.height+=dh;item.retro={...item.retro!,autoLayout:true,detached:false};if(role==="titlebar"||role==="menu"||role==="toolbar"||role==="status")item.constraints={horizontal:"left-right",vertical:role==="status"?"bottom":"top"};else if(role==="scrollbar")item.constraints={horizontal:"right",vertical:"top-bottom"};else if(role==="action")item.constraints={horizontal:"right",vertical:"bottom"};}});
  return{elements:next,attached:true,parentId:parent.id,role};
}
