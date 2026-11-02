"use client";

import { useMemo, useState } from "react";
import { BoxSelect, Grid3X3, Search, Shapes, Type } from "lucide-react";
import { ROBLOX_COMPONENTS, ROBLOX_ELEMENTS, type RobloxComponentKind, type RobloxElementKind } from "@/lib/roblox/component-library";

export function RobloxLibraryPanel({onInsertElement,onInsertComponent}:{onInsertElement:(kind:RobloxElementKind)=>void;onInsertComponent:(kind:RobloxComponentKind)=>void}){
  const [section,setSection]=useState<"elements"|"components">("elements"),[query,setQuery]=useState("");
  const normalized=query.trim().toLowerCase();
  const elements=useMemo(()=>ROBLOX_ELEMENTS.filter((item)=>!normalized||`${item.name} ${item.nativeClass} ${item.description}`.toLowerCase().includes(normalized)),[normalized]);
  const components=useMemo(()=>ROBLOX_COMPONENTS.filter((item)=>!normalized||`${item.name} ${item.category} ${item.description}`.toLowerCase().includes(normalized)),[normalized]);
  return <div className="roblox-library-panel"><header><div><strong>Roblox UI</strong><small>Editable native-first objects</small></div><span>ScreenGui</span></header><div className="roblox-library-switch"><button className={section==="elements"?"active":""} onClick={()=>setSection("elements")}><Shapes size={13}/> Elements</button><button className={section==="components"?"active":""} onClick={()=>setSection("components")}><Grid3X3 size={13}/> Components</button></div><label className="library-search"><Search size={12}/><input aria-label="Search Roblox UI library" placeholder="Search Roblox UI" value={query} onChange={(event)=>setQuery(event.target.value)}/></label>{section==="elements"?<div className="roblox-element-list">{elements.map((item)=><button key={item.kind} onClick={()=>onInsertElement(item.kind)}><i>{item.nativeClass.includes("Text")?<Type size={14}/>:<BoxSelect size={14}/>}</i><span><strong>{item.name}</strong><small>{item.description}</small></span><em>{item.nativeClass}</em></button>)}</div>:<div className="roblox-component-list">{components.map((item)=><article key={item.kind}><div><span>{item.category}</span><strong>{item.name}</strong><small>{item.description}</small></div><button onClick={()=>onInsertComponent(item.kind)}>Insert editable</button></article>)}</div>}<footer>Objects stay editable. CreatorMake only rasterizes effects that Roblox cannot reproduce natively.</footer></div>;
}
