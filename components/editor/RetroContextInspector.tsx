"use client";

import type { EditorElement } from "@/lib/editor/types";
import { createVisualEffect } from "@/lib/effects/registry";

type Props={selected:EditorElement;onUpdate:(patch:Partial<EditorElement>)=>void};
const cornerTypes=["square","round","chamfer","inset","notch","concave","scoop"] as const;

export function RetroContextInspector({selected,onUpdate}:Props){
  if(!selected.retro)return null;
  const meta=selected.retro,textBearing=selected.type==="text"||selected.type==="button",isButton=selected.type==="button"||selected.type==="image-button",historical=meta.family==="windows"&&meta.authenticity==="historical",structural=["window","dialog","frame"].includes(meta.kind);
  const applyCorner=(value:typeof cornerTypes[number])=>onUpdate({cornerTypes:{tl:value,tr:value,br:value,bl:value},corners:value==="square"?{tl:0,tr:0,br:0,bl:0}:selected.corners});
  const effect=(type:string)=>{const next=createVisualEffect(type);onUpdate({effects:[...selected.effects.filter((item)=>item.type!==type),next]});};
  const normalShadow=meta.family==="windows"?"inset -2px -2px 0 #000000, inset 2px 2px 0 #dfdfdf":meta.family==="gameshow"?"0 10px 0 #8f286e, 0 18px 28px rgba(0,0,0,.32)":"0 7px 0 #101427, 0 14px 24px rgba(0,0,0,.35)";
  return <section className="retro-context-inspector" aria-label="Retro component properties">
    <header><span className="retro-context-icon">R</span><span><strong>{meta.kind.toUpperCase()} DESIGNER</strong><small>{meta.family.toUpperCase()} · {meta.role.replace(/-/g," ")}</small></span><em>LIVE</em></header>
    <label><span>Layer name</span><input value={selected.name} onChange={(event)=>onUpdate({name:event.target.value})}/></label>
    {historical&&<div className="win98-authenticity-note"><strong>WINDOWS 98 CLASSIC · 96 DPI</strong><span>MS Sans Serif 8 pt when installed</span><small>Fallback: Microsoft Sans Serif / Arial · approximate metrics</small></div>}
    {textBearing&&<label><span>{isButton?"Label":"Text"}</span><textarea value={selected.text} onChange={(event)=>onUpdate({text:event.target.value})}/></label>}
    {historical&&structural&&<><div className="retro-property-pair"><label><span>Width</span><input aria-label="Retro width" type="number" min="32" value={selected.width} onChange={(event)=>onUpdate({width:Math.max(32,Number(event.target.value)||32)})}/></label><label><span>Height</span><input aria-label="Retro height" type="number" min="24" value={selected.height} onChange={(event)=>onUpdate({height:Math.max(24,Number(event.target.value)||24)})}/></label></div><label><span>Classic border</span><select value={meta.borderPrimitive??"flat"} onChange={(event)=>onUpdate({retro:{...meta,borderPrimitive:event.target.value as NonNullable<typeof meta.borderPrimitive>}})}>{["window","raised","sunken","default-button","flat"].map((value)=><option key={value} value={value}>{value}</option>)}</select></label><label className="retro-check"><input type="checkbox" checked={meta.autoLayout!==false} onChange={(event)=>onUpdate({retro:{...meta,autoLayout:event.target.checked,detached:!event.target.checked}})}/><span>Keep intelligent anchors</span></label></>}
    <div className="retro-property-pair"><label><span>{textBearing?"Text color":"Surface"}</span><input type="color" value={textBearing?selected.textColor:selected.fill.startsWith("#")?selected.fill:"#c0c0c0"} onChange={(event)=>onUpdate(textBearing?{textColor:event.target.value}:{fill:event.target.value})}/></label><label><span>Border</span><input type="color" value={selected.borderColor.startsWith("#")?selected.borderColor:"#ffffff"} onChange={(event)=>onUpdate({borderColor:event.target.value})}/></label></div>
    {historical?<div className="win98-edge-readout"><span>Edge construction</span><strong>2 × deliberate 1 px layers</strong></div>:<label><span>Pixel / border size</span><input type="range" min="0" max="16" step="1" value={selected.borderWidth} onChange={(event)=>onUpdate({borderWidth:Number(event.target.value),retro:{...meta,pixelScale:Math.max(1,Number(event.target.value))}})}/><output>{selected.borderWidth}px</output></label>}
    {!textBearing&&!historical&&<label><span>Corner construction</span><select value={selected.cornerTypes.tl} onChange={(event)=>applyCorner(event.target.value as typeof cornerTypes[number])}>{cornerTypes.map((value)=><option key={value} value={value}>{value}</option>)}</select></label>}
    {isButton&&<div className="retro-state-preview"><span>State preview</span><button onClick={()=>onUpdate(historical?{shadow:"none",opacity:100,retro:{...meta,borderPrimitive:"raised"}}:{shadow:normalShadow,opacity:100})}>Normal</button><button onClick={()=>onUpdate(historical?{shadow:"none",opacity:100,retro:{...meta,borderPrimitive:"sunken"}}:{shadow:"inset 3px 3px 0 rgba(0,0,0,.55)",opacity:100})}>Pressed</button><button onClick={()=>onUpdate(historical?{opacity:46,shadow:"none",retro:{...meta,borderPrimitive:"raised"}}:{opacity:46,shadow:"none"})}>Disabled</button></div>}
    {!historical&&<div className="retro-effect-actions"><span>Retro effects</span><button onClick={()=>effect("dither")}>Dither</button><button onClick={()=>effect("scanlines")}>CRT</button><button onClick={()=>effect("bevel")}>Bevel</button><button onClick={()=>effect("drop-shadow")}>Pixel shadow</button></div>}
    <p>All changes remain editable and use the existing CreatorMake undo, save, and Roblox export pipeline.</p>
  </section>;
}
