"use client";

import { useState } from "react";
import { Copy, Download, EyeOff, Group, ImagePlus, Layers3, Lock, PenTool, Scissors, SquarePlus, Trash2, Ungroup, type LucideIcon } from "lucide-react";
import type { EditorElement } from "@/lib/editor/types";

type Props={x:number;y:number;selected:EditorElement[];canPaste:boolean;canUngroup:boolean;onClose:()=>void;onCut:()=>void;onCopy:()=>void;onPaste:()=>void;onDuplicate:()=>void;onDelete:()=>void;onRename:(name:string)=>void;onGroup:()=>void;onUngroup:()=>void;onAutoLayout:()=>void;onToggleLock:()=>void;onToggleVisibility:()=>void;onEditPath:()=>void;onImport:()=>void;onCreateFrame:()=>void;onRoblox:()=>void};

export function EditorContextMenu(props:Props){
  const [renaming,setRenaming]=useState(false),single=props.selected.length===1,item=props.selected[0];
  const run=(action:()=>void)=>{action();props.onClose();};
  return <div className="editor-context-menu" role="menu" style={{left:props.x,top:props.y}} onPointerDown={(event)=>event.stopPropagation()}>
    <header><span>{single?item.name:props.selected.length?`${props.selected.length} objects`:"Canvas"}</span><small>{single?item.type:"Quick actions"}</small></header>
    {renaming&&single?<form onSubmit={(event)=>{event.preventDefault();const data=new FormData(event.currentTarget),name=String(data.get("name")??"").trim();if(name)props.onRename(name);props.onClose();}}><input autoFocus name="name" defaultValue={item.name} onKeyDown={(event)=>{if(event.key==="Escape")props.onClose();}}/><button>Rename</button></form>:<>
      {props.selected.length>0&&<><MenuItem icon={Scissors} label="Cut" hint="Ctrl X" onClick={()=>run(props.onCut)}/><MenuItem icon={Copy} label="Copy" hint="Ctrl C" onClick={()=>run(props.onCopy)}/><MenuItem icon={SquarePlus} label="Duplicate" hint="Ctrl D" onClick={()=>run(props.onDuplicate)}/>{single&&<button onClick={()=>setRenaming(true)}><span>Rename</span><kbd>F2</kbd></button>}<hr/></>}
      {!props.selected.length&&<><MenuItem icon={Copy} label="Paste" hint="Ctrl V" disabled={!props.canPaste} onClick={()=>run(props.onPaste)}/><MenuItem icon={ImagePlus} label="Import Image" onClick={()=>run(props.onImport)}/><MenuItem icon={SquarePlus} label="Create Frame" hint="F" onClick={()=>run(props.onCreateFrame)}/><hr/></>}
      {props.selected.length>0&&<><MenuItem icon={Group} label="Group selection" hint="Ctrl G" disabled={props.selected.length<2} onClick={()=>run(props.onGroup)}/><MenuItem icon={Ungroup} label="Ungroup" disabled={!props.canUngroup} onClick={()=>run(props.onUngroup)}/><MenuItem icon={Layers3} label="Auto Layout" hint="Shift A" onClick={()=>run(props.onAutoLayout)}/>{single&&<MenuItem icon={PenTool} label="Edit vector path" disabled={item.type==="text"||item.type==="image"||item.type==="image-button"} onClick={()=>run(props.onEditPath)}/>}<hr/><MenuItem icon={Lock} label={props.selected.every((entry)=>entry.locked)?"Unlock":"Lock"} onClick={()=>run(props.onToggleLock)}/><MenuItem icon={EyeOff} label={props.selected.every((entry)=>entry.hidden)?"Show":"Hide"} onClick={()=>run(props.onToggleVisibility)}/><MenuItem icon={Download} label="Roblox export" onClick={()=>run(props.onRoblox)}/><hr/><MenuItem icon={Trash2} label="Delete" hint="Del" danger onClick={()=>run(props.onDelete)}/></>}
    </>}
  </div>;
}

function MenuItem({icon:Icon,label,hint,onClick,disabled,danger}:{icon:LucideIcon;label:string;hint?:string;onClick:()=>void;disabled?:boolean;danger?:boolean}){return <button role="menuitem" className={danger?"danger":""} disabled={disabled} onClick={onClick}><Icon size={13}/><span>{label}</span>{hint&&<kbd>{hint}</kbd>}</button>;}
