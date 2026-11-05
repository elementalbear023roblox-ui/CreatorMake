"use client";

import { useEffect, useMemo, useState } from "react";
import { Grid3X3, Search, Sparkles } from "lucide-react";
import { RETRO_LIBRARY, type RetroAssetId, type RetroCategory } from "@/lib/retro/components";
import { PixelStudio } from "./PixelStudio";

type Props={onInsert:(id:RetroAssetId)=>void;onCreatePixel:(name:string,pixels:string[],size:number)=>void};
const CATEGORIES:RetroCategory[]=["Windows","Buttons","Inputs","Navigation","Containers","System Icons","Frames","Text","Icons","Pixel Art","Patterns","Decorations","Components","Templates"];
const FAMILY_LABELS={windows:"WIN 98 CLASSIC",internet:"EARLY WEB",cdrom:"CD-ROM",arcade:"ARCADE",gameshow:"GAME SHOW",horror:"HORROR"} as const;

export function RetroLibraryPanel({onInsert,onCreatePixel}:Props){
  const[category,setCategory]=useState<RetroCategory>("Windows"),[query,setQuery]=useState(""),[family,setFamily]=useState("all"),[pixelOpen,setPixelOpen]=useState(false);
  useEffect(()=>{const change=(event:Event)=>{const detail=(event as CustomEvent<string>).detail;if(detail==="Pixel Art"){setCategory("Pixel Art");setPixelOpen(true);}else if(CATEGORIES.includes(detail as RetroCategory))setCategory(detail as RetroCategory);};window.addEventListener("creatormake:retro-category",change);return()=>window.removeEventListener("creatormake:retro-category",change);},[]);
  const visible=useMemo(()=>RETRO_LIBRARY.filter((item)=>(category==="Pixel Art"?false:item.category===category)&&(family==="all"||item.family===family)&&(item.name+item.description).toLowerCase().includes(query.toLowerCase())),[category,family,query]);
  return <section className="retro-library-panel">
    <header className="retro-library-heading"><span><b>CM</b><span><strong>RETRO LIBRARY</strong><small>Original editable components</small></span></span><Sparkles size={16}/></header>
    <label className="retro-search"><Search size={13}/><input value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Search retro parts"/></label>
    <div className="retro-category-grid" role="tablist" aria-label="Retro asset categories">{CATEGORIES.map((item)=><button key={item} className={category===item?"active":""} onClick={()=>setCategory(item)}><i aria-hidden="true" data-category={item}/><span>{item}</span></button>)}</div>
    <div className="retro-family-filter"><button className={family==="all"?"active":""} onClick={()=>setFamily("all")}>ALL</button>{Object.entries(FAMILY_LABELS).map(([id,label])=><button key={id} className={family===id?"active":""} onClick={()=>setFamily(id)}>{label}</button>)}</div>
    {category==="Pixel Art"?<div className="pixel-library-launch"><div className="pixel-launch-preview"><Grid3X3 size={42}/><i/><i/><i/></div><strong>Draw a custom pixel asset</strong><p>Create icons, border tiles, corner pieces, buttons, and small textures on a true pixel grid.</p><button onClick={()=>setPixelOpen(true)}>Open Pixel Studio</button><small>Transparent SVG · nearest-neighbor scaling · editable project asset</small></div>:<div className="retro-preview-grid">{visible.map((item)=><button key={item.id} className="retro-asset-card" data-preview={item.preview} onClick={()=>onInsert(item.id)} title={`Insert ${item.name}`}><span className="retro-card-preview"><i/><i/><i/><b>{item.preview.startsWith("template")?"CM":item.preview.includes("button")?"GO":""}</b></span><span className="retro-card-copy"><strong>{item.name}</strong><small>{item.description}</small><em>{FAMILY_LABELS[item.family]}{item.badge?` · ${item.badge}`:""}</em></span></button>)}{!visible.length&&<div className="retro-empty">No components match this filter.</div>}</div>}
    <footer><span><i/> Crisp pixel scaling</span><span><i/> Roblox-ready hierarchy</span></footer>
    {pixelOpen&&<PixelStudio onClose={()=>setPixelOpen(false)} onSave={onCreatePixel}/>} 
  </section>;
}
