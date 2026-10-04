"use client";

import { useState } from "react";
import { AlignCenterHorizontal, AlignCenterVertical, AlignEndHorizontal, AlignEndVertical, AlignStartHorizontal, AlignStartVertical, Boxes, Columns3, Grid3X3, Rows3, X } from "lucide-react";
import type { Alignment, AlignmentTarget, BooleanOperation } from "@/lib/editor/types";
import type { RepeatGridOptions } from "@/lib/editor/operations";

type Props = {
  count: number;
  keyObjectName?: string;
  canUngroup: boolean;
  onAlign: (value: Alignment, target?: AlignmentTarget) => void;
  onDistribute: (axis: "horizontal" | "vertical", exactSpacing?: number) => void;
  onStack:(axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end")=>void;
  onAutoLayout:(axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end")=>void;
  onRepeatGrid:(options:RepeatGridOptions)=>void;
  onGroup: () => void;
  onUngroup: () => void;
  onBoolean: (operation:BooleanOperation) => void;
};

export function ContextBar(props: Props) {
  const [target,setTarget]=useState<AlignmentTarget>("selection");
  const [spacing,setSpacing]=useState("");
  const [stackAxis,setStackAxis]=useState<"horizontal"|"vertical">("vertical"),[stackAlign,setStackAlign]=useState<"start"|"center"|"end">("center");
  const [repeatOpen,setRepeatOpen]=useState(false),[repeat,setRepeat]=useState<RepeatGridOptions>({columns:5,rows:6,gapX:12,gapY:12});
  if (!props.count) return null;
  const buttons: [Alignment, typeof AlignStartVertical, string][] = [["left",AlignStartVertical,"Align left"],["hcenter",AlignCenterVertical,"Align horizontal center"],["right",AlignEndVertical,"Align right"],["top",AlignStartHorizontal,"Align top"],["vcenter",AlignCenterHorizontal,"Align vertical center"],["bottom",AlignEndHorizontal,"Align bottom"]];
  const exact=spacing.trim()===""?undefined:Number(spacing);
  return <div className="context-bar">
    <span>{props.count} selected</span>
    <label className="align-target"><span>Align to</span><select value={target} onChange={(event)=>setTarget(event.target.value as AlignmentTarget)}><option value="selection">Selection</option><option value="parent">Parent</option><option value="frame">Frame</option><option value="canvas">Canvas</option><option value="key-object">Key · {props.keyObjectName??"active"}</option></select></label>
    {buttons.map(([value,Icon,label]) => <button key={value} aria-label={label} title={`${label} to ${target}`} disabled={target==="selection"&&props.count<2} onClick={() => props.onAlign(value,target)}><Icon size={14}/></button>)}
    <span className="context-divider"/>
    <label className="exact-spacing" title="Optional exact spacing"><span>Gap</span><input aria-label="Exact distribution spacing" type="number" min="0" placeholder="Auto" value={spacing} onChange={(event)=>setSpacing(event.target.value)}/></label>
    <button aria-label="Distribute horizontally" title="Distribute horizontal spacing" disabled={props.count < 3} onClick={() => props.onDistribute("horizontal",exact)}><Rows3 size={14}/></button>
    <button aria-label="Distribute vertically" title="Distribute vertical spacing" disabled={props.count < 3} onClick={() => props.onDistribute("vertical",exact)}><Columns3 size={14}/></button>
    <select aria-label="Stack direction" value={stackAxis} onChange={(event)=>setStackAxis(event.target.value as typeof stackAxis)}><option value="horizontal">Stack →</option><option value="vertical">Stack ↓</option></select>
    <select aria-label="Stack alignment" value={stackAlign} onChange={(event)=>setStackAlign(event.target.value as typeof stackAlign)}><option value="start">Start</option><option value="center">Center</option><option value="end">End</option></select>
    <button className="context-text-action" disabled={props.count<2} title="Arrange with exact gap while preserving the active key object" onClick={()=>props.onStack(stackAxis,Number.isFinite(exact)?exact!:16,stackAlign)}>Stack</button>
    <button className="context-text-action" disabled={props.count<2} title="Wrap selection in an editable auto-layout container" onClick={()=>props.onAutoLayout(stackAxis,Number.isFinite(exact)?exact!:16,stackAlign)}>Auto layout</button>
    <div className="repeat-grid-control"><button className={`context-text-action ${repeatOpen?"active":""}`} title="Create an editable repeated grid from the selection" onClick={()=>setRepeatOpen((value)=>!value)}><Grid3X3 size={13}/> Repeat grid</button>{repeatOpen&&<div className="repeat-grid-popover" onPointerDown={(event)=>event.stopPropagation()}><header><div><strong>Repeat Grid</strong><small>Clone the complete selected hierarchy.</small></div><button aria-label="Close Repeat Grid" onClick={()=>setRepeatOpen(false)}><X size={13}/></button></header><div>{([['Columns','columns'],['Rows','rows'],['Gap X','gapX'],['Gap Y','gapY']] as const).map(([label,key])=><label key={key}><span>{label}</span><input aria-label={`Repeat grid ${label.toLowerCase()}`} type="number" min={key.startsWith('gap')?-1000:1} max={key.startsWith('gap')?1000:50} value={repeat[key]} onChange={(event)=>setRepeat((current)=>({...current,[key]:Number(event.target.value)}))}/></label>)}</div><footer><span>{Math.max(1,repeat.columns)*Math.max(1,repeat.rows)} total items</span><button onClick={()=>{props.onRepeatGrid(repeat);setRepeatOpen(false);}}>Create grid</button></footer></div>}</div>
    <button aria-label="Group selection" title="Group selection" disabled={props.count < 2} onClick={props.onGroup}><Boxes size={14}/></button>
    {props.canUngroup && <button className="context-text-action" onClick={props.onUngroup}>Ungroup</button>}
    {props.count>=2&&<><span className="context-divider"/><div className="boolean-actions" aria-label="Boolean geometry operations">{(["union","subtract","intersect","exclude","divide"] as BooleanOperation[]).map((operation)=><button key={operation} className="context-text-action" aria-label={`Boolean ${operation}`} title={`Boolean ${operation}`} onClick={()=>props.onBoolean(operation)}>{operation}</button>)}</div></>}
  </div>;
}
