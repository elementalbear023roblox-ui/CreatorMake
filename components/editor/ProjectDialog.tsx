"use client";

import { useRef, useState } from "react";
import { Archive, Copy, Download, FolderOpen, Plus, RotateCcw, Trash2, Upload, X } from "lucide-react";
import type { ProjectSummary, RecoverySnapshot } from "@/lib/editor/types";

type MaybePromise=void|Promise<void>;
type Props = {
  open:boolean;onOpenChange:(open:boolean)=>void;activeId:string;currentName:string;projects:ProjectSummary[];recoveries:RecoverySnapshot[];
  onCreate:(name:string)=>MaybePromise;onOpen:(id:string)=>MaybePromise;onRename:(name:string)=>MaybePromise;onDuplicate:()=>MaybePromise;onDelete:(id:string)=>MaybePromise;
  onImport:(value:unknown)=>MaybePromise;onExport:(id:string)=>MaybePromise;onArchive:(id:string)=>MaybePromise;onRecover:(id:string)=>MaybePromise;onDiscardRecovery:(id:string)=>MaybePromise;
};

export function ProjectDialog(props:Props){
  const[newName,setNewName]=useState("New UI Project"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
  const importInput=useRef<HTMLInputElement>(null),renameInput=useRef<HTMLInputElement>(null);
  if(!props.open)return null;
  const run=async(action:()=>MaybePromise,close=false)=>{setBusy(true);setError("");try{await action();if(close)props.onOpenChange(false);}catch(problem){setError(problem instanceof Error?problem.message:"CreatorMake could not complete that project action.");}finally{setBusy(false);}};
  const importFile=async(file:File|undefined)=>{if(!file)return;await run(async()=>{const value=JSON.parse(await file.text()) as unknown;await props.onImport(value);},true);if(importInput.current)importInput.current.value="";};
  const active=props.projects.filter((project)=>!project.archived),archived=props.projects.filter((project)=>project.archived);
  const cards=(items:ProjectSummary[])=>items.map((project)=><article key={project.id} className={`project-card ${project.id===props.activeId?"active":""}`}>
    <button className="project-card-open" onClick={()=>void run(()=>props.onOpen(project.id),true)} disabled={busy}>
      <img src={project.thumbnail} alt=""/><span className="project-card-title"><strong>{project.name}</strong><em>{project.status}</em></span>
      <small>{project.platform} · {project.width}×{project.height} · {project.frameCount} frame{project.frameCount===1?"":"s"}</small>
      <small>Edited {new Date(project.updatedAt).toLocaleString()} · Created {new Date(project.createdAt).toLocaleDateString()}</small>
    </button>
    <footer><button onClick={()=>void run(()=>props.onOpen(project.id),true)}><FolderOpen size={13}/> Open</button><button onClick={()=>void run(()=>props.onExport(project.id))}><Download size={13}/> Export</button><button onClick={()=>void run(()=>props.onArchive(project.id))}><Archive size={13}/> {project.archived?"Restore":"Archive"}</button><button className="danger" onClick={()=>{if(window.confirm(`Delete “${project.name}”? Recovery snapshots are kept separately.`))void run(()=>props.onDelete(project.id));}} disabled={props.projects.length===1}><Trash2 size={13}/></button></footer>
  </article>);
  return <div className="dialog-overlay" onMouseDown={()=>props.onOpenChange(false)}><section className="project-dialog project-library" role="dialog" aria-modal="true" aria-labelledby="project-dialog-title" onMouseDown={(event)=>event.stopPropagation()}>
    <button className="dialog-close" aria-label="Close" onClick={()=>props.onOpenChange(false)}>×</button>
    <header><h2 id="project-dialog-title">Projects</h2><p>Local-first CreatorMake projects stored in IndexedDB, with automatic saves and recovery.</p></header>
    <div className="project-create"><input value={newName} onChange={(event)=>setNewName(event.target.value)} aria-label="New project name"/><button disabled={busy} onClick={()=>void run(()=>props.onCreate(newName),true)}><Plus size={14}/> Create</button><button disabled={busy} onClick={()=>importInput.current?.click()}><Upload size={14}/> Import .creatormake</button><input ref={importInput} className="visually-hidden" type="file" accept=".creatormake,.creatormake-project,.json,application/json" onChange={(event)=>void importFile(event.target.files?.[0])}/></div>
    {error&&<output className="project-error">{error}</output>}
    <div className="project-rename"><input ref={renameInput} defaultValue={props.currentName} aria-label="Current project name"/><button disabled={busy} onClick={()=>void run(()=>props.onRename(renameInput.current?.value??props.currentName))}>Rename current</button><button disabled={busy} onClick={()=>void run(props.onDuplicate,true)}><Copy size={14}/> Duplicate</button></div>
    <div className="project-card-grid">{cards(active)}{active.length===0&&<p className="project-empty">No active projects. Restore one from Archive.</p>}</div>
    {archived.length>0&&<details className="project-archive"><summary>Archive · {archived.length}</summary><div className="project-card-grid">{cards(archived)}</div></details>}
    {props.recoveries.length>0&&<section className="recovery-list"><header><strong>Recovery snapshots</strong><small>Recoveries open as new projects and never overwrite the healthy original.</small></header>{props.recoveries.slice(0,8).map((snapshot)=><div key={snapshot.id}><button onClick={()=>void run(()=>props.onRecover(snapshot.id),true)}><RotateCcw size={14}/><span><strong>{snapshot.projectName}</strong><small>{new Date(snapshot.savedAt).toLocaleString()}</small></span></button><button aria-label={`Discard recovery for ${snapshot.projectName}`} onClick={()=>void run(()=>props.onDiscardRecovery(snapshot.id))}><X size={13}/></button></div>)}</section>}
  </section></div>;
}
