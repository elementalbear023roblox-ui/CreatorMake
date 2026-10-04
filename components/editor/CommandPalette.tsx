"use client";

import { useMemo, useState } from "react";
import { Command, Search } from "lucide-react";

export type EditorCommand={label:string;hint?:string;category?:"Create"|"Edit"|"Arrange"|"View"|"Roblox"|"Workspace"|"Settings";keywords?:string;action:()=>void};

export function CommandPalette({open,onClose,commands}:{open:boolean;onClose:()=>void;commands:EditorCommand[]}){
  const [query,setQuery]=useState(""),[active,setActive]=useState(0);
  const close=()=>{setQuery("");setActive(0);onClose();};
  const results=useMemo(()=>{const needle=query.trim().toLowerCase();return commands.filter((item)=>`${item.label} ${item.category??""} ${item.keywords??""}`.toLowerCase().includes(needle)).slice(0,30);},[commands,query]);
  if(!open)return null;
  const run=(index:number)=>{const command=results[index];if(command){command.action();close();}};
  return <div className="dialog-overlay command-overlay" onMouseDown={close}><section className="command-palette professional" role="dialog" aria-modal="true" aria-label="Command palette" onMouseDown={(event)=>event.stopPropagation()}><header><Command size={15}/><span>Quick actions</span><kbd>Ctrl K</kbd></header><label><Search size={16}/><input autoFocus value={query} onChange={(event)=>{setQuery(event.target.value);setActive(0);}} placeholder="Search tools, workspaces, and commands…" onKeyDown={(event)=>{if(event.key==="Escape")close();else if(event.key==="ArrowDown"){event.preventDefault();setActive((value)=>Math.min(results.length-1,value+1));}else if(event.key==="ArrowUp"){event.preventDefault();setActive((value)=>Math.max(0,value-1));}else if(event.key==="Enter"){event.preventDefault();run(active);}}}/></label><div>{results.map((command,index)=><button key={command.label} className={active===index?"active":""} onMouseEnter={()=>setActive(index)} onClick={()=>run(index)}><small>{command.category??"Command"}</small><span>{command.label}</span>{command.hint&&<kbd>{command.hint}</kbd>}</button>)}{!results.length&&<p>No matching commands. Try “Roblox”, “theme”, “grid”, or “frame”.</p>}</div><footer><span>↑↓ Navigate</span><span>Enter Run</span><span>Esc Close</span></footer></section></div>;
}
