"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createElement, createProject, createScrollingInventoryElements, createVectorElement, deleteStoredProject, discardRecoverySnapshot, duplicateProject, importProjectData, listProjects, listRecoverySnapshots, loadActiveProject, loadProject, restoreRecoverySnapshot, saveProject } from "@/lib/editor/project";
import { alignSelection, convertSelectionToAutoLayout, distributeSelection, groupSelection, stackSelection, ungroupSelection } from "@/lib/editor/operations";
import { applyAutoLayout } from "@/lib/editor/layout";
import { applySharedPerspective } from "@/lib/editor/transforms";
import { createImageElementForAsset, createVectorElementForSvgAsset, importImageFile } from "@/lib/editor/assets";
import type { Alignment, AlignmentTarget, EditorElement, EditorHistoryCommand, EditorProject, ElementType, GenerationHistoryEntry, GeometryKind, ProjectSummary, RecoverySnapshot } from "@/lib/editor/types";
import type { EditorReference, FrameRecipe, ResearchResult } from "@/lib/design-intelligence/types";

const descendantIds=(elements:EditorElement[],roots:string[])=>{const ids=new Set(roots);let changed=true;while(changed){changed=false;elements.forEach((item)=>{if(item.parentId&&ids.has(item.parentId)&&!ids.has(item.id)){ids.add(item.id);changed=true;}});}return ids;};
const HISTORY_LIMIT=100,HISTORY_MEMORY_LIMIT=48*1024*1024;
const historyComparable=(project:EditorProject)=>({...project,updatedAt:0,assets:project.assets.map(({dataUrl,thumbnailDataUrl,...asset})=>asset)});
const historyBytes=(project:EditorProject)=>JSON.stringify(historyComparable(project)).length*2;
const mutableProject=(current:EditorProject,affectedIds?:Iterable<string>)=>{
  if(affectedIds===undefined){const assets=current.assets;const next=structuredClone({...current,assets:[]}) as EditorProject;next.assets=assets.map((asset)=>({...asset}));return next;}
  const ids=new Set(affectedIds);return{...current,elements:current.elements.map((element)=>ids.has(element.id)?structuredClone(element):element),selectedIds:[...current.selectedIds],assets:[...current.assets]} as EditorProject;
};
const trimHistory=(items:EditorHistoryCommand[])=>{let next=items.slice(-HISTORY_LIMIT),bytes=next.reduce((sum,item)=>sum+item.estimatedBytes,0);while(next.length>1&&bytes>HISTORY_MEMORY_LIMIT){bytes-=next[0].estimatedBytes;next=next.slice(1);}return next;};

export function useEditor() {
  const [project, setProject] = useState<EditorProject>({
    schemaVersion: 7, id: "project_initial", name: "Untitled UI", createdAt: 0, updatedAt: 0, platform:"Roblox", status:"Draft", tags:[], archived:false,
    screen: { id: "screen_initial", name: "Desktop", width: 960, height: 600, background: "#0e1220", x: 2100, y: 1400 },
    elements: [
      seedElement("frame_initial", "frame", "Interface panel", { x: 230, y: 130, width: 460, height: 320, fill: "#181c2b" }),
      seedElement("text_initial", "text", "Title", { x: 330, y: 205, width: 300, height: 48, fill: "transparent", borderColor: "transparent", borderWidth: 0, text: "CREATOR HUD", fontSize: 28, fontWeight: 700 }),
      seedElement("button_initial", "button", "Primary action", { x: 365, y: 345, width: 180, height: 48, fill: "#7457ff", borderColor: "#8d76ff", text: "ENTER GAME", textAlign: "center", fontSize: 15, fontWeight: 700 }),
    ],
    assets: [], assetFolders:["Logos","Icons","Characters","Textures","Backgrounds","Client Assets"], selectedIds: ["button_initial"], references: [], activePresetIds: ["digital-system"], favoritePresetIds: [], favoriteFontIds: [], recentFontIds: ["inter"], customFrameRecipes: [], researchCache: {}, generationHistory: [], projectFonts:[{fontId:"inter",weights:[500,700],styles:["normal"]}], fontPolicy:{allowSyntheticWeight:false,allowSyntheticItalic:false},
  });
  const [past, setPast] = useState<EditorHistoryCommand[]>([]);
  const [future, setFuture] = useState<EditorHistoryCommand[]>([]);
  const [status, setStatus] = useState<"saving" | "saved" | "unsaved" | "error">("saved");
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [recoveries,setRecoveries]=useState<RecoverySnapshot[]>([]);
  const hydrated = useRef(false);
  const saveToken=useRef(0);
  const projectRef=useRef(project);
  const transactionRef=useRef<{label:string;before:EditorProject}|null>(null);
  const transientBlocked=useRef(false);
  const transientFrame=useRef<number|null>(null);
  const pendingTransient=useRef<{operations:Array<(draft:EditorProject)=>void>;affectedIds:Set<string>|null}|null>(null);
  const nudgeTimer=useRef<number|null>(null);
  projectRef.current=project;

  const refreshLibrary=useCallback(async()=>{const[projectList,recoveryList]=await Promise.all([listProjects(),listRecoverySnapshots()]);setProjects(projectList);setRecoveries(recoveryList);},[]);

  const forceSave=useCallback(async(target?:EditorProject)=>{
    const value=structuredClone(target??projectRef.current),token=++saveToken.current;
    setStatus("saving");
    try{await saveProject(value);await refreshLibrary();if(token===saveToken.current)setStatus("saved");return true;}
    catch(error){console.error("CreatorMake project save failed",error);if(token===saveToken.current)setStatus("error");return false;}
  },[refreshLibrary]);

  useEffect(() => {
    let cancelled=false;
    void (async()=>{try{const active=await loadActiveProject();if(cancelled)return;if(active)setProject(active);else{const initial=createProject();await saveProject(initial,{createRecovery:false});if(!cancelled)setProject(initial);}await refreshLibrary();if(!cancelled){hydrated.current=true;setStatus("saved");}}catch(error){console.error("CreatorMake project hydration failed",error);if(!cancelled){hydrated.current=true;setStatus("error");}}})();
    return()=>{cancelled=true;};
  },[refreshLibrary]);

  useEffect(() => {
    if (!hydrated.current) return;
    if(transactionRef.current||pendingTransient.current)return;
    setStatus("unsaved");
    const timer = window.setTimeout(() => { void forceSave(project); }, 650);
    return () => window.clearTimeout(timer);
  }, [forceSave,project]);

  useEffect(()=>{const onVisibility=()=>{if(document.visibilityState==="hidden"&&hydrated.current)void forceSave();};document.addEventListener("visibilitychange",onVisibility);return()=>document.removeEventListener("visibilitychange",onVisibility);},[forceSave]);

  const recordHistory=useCallback((label:string,before:EditorProject,after:EditorProject)=>{
    if(JSON.stringify(historyComparable(before))===JSON.stringify(historyComparable(after)))return;
    const command:EditorHistoryCommand={id:`history_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`,label,before,after,createdAt:Date.now(),estimatedBytes:historyBytes(before)+historyBytes(after)};
    setPast((items)=>trimHistory([...items,command]));setFuture([]);
  },[]);

  const applyTransientNow=useCallback((pending:{operations:Array<(draft:EditorProject)=>void>;affectedIds:Set<string>|null})=>{
    const current=projectRef.current,next=mutableProject(current,pending.affectedIds??undefined);pending.operations.forEach((operation)=>operation(next));projectRef.current=next;setProject(next);
  },[]);

  const flushTransient=useCallback(()=>{
    if(transientFrame.current!==null){cancelAnimationFrame(transientFrame.current);transientFrame.current=null;}
    const pending=pendingTransient.current;pendingTransient.current=null;if(pending)applyTransientNow(pending);
  },[applyTransientNow]);

  const beginHistoryTransaction=useCallback((label:string)=>{
    flushTransient();
    if(transactionRef.current)return;
    transientBlocked.current=false;transactionRef.current={label,before:projectRef.current};
  },[flushTransient]);

  const transient=useCallback((mutate:(draft:EditorProject)=>void,affectedIds?:Iterable<string>)=>{
    if(transientBlocked.current)return;
    if(!transactionRef.current)transactionRef.current={label:"Edit",before:projectRef.current};
    const pending=pendingTransient.current??{operations:[],affectedIds:new Set<string>()};pending.operations.push(mutate);
    if(affectedIds===undefined)pending.affectedIds=null;else if(pending.affectedIds)for(const id of affectedIds)pending.affectedIds.add(id);
    pendingTransient.current=pending;
    if(transientFrame.current===null)transientFrame.current=requestAnimationFrame(()=>{transientFrame.current=null;const value=pendingTransient.current;pendingTransient.current=null;if(value)applyTransientNow(value);});
  },[applyTransientNow]);

  const finishGesture=useCallback(()=>{
    flushTransient();const transaction=transactionRef.current;transactionRef.current=null;transientBlocked.current=false;if(!transaction)return;
    const current=projectRef.current,next=mutableProject(current);applyAutoLayout(next);next.updatedAt=Date.now();projectRef.current=next;setProject(next);recordHistory(transaction.label,transaction.before,next);
  },[flushTransient,recordHistory]);

  const cancelHistoryTransaction=useCallback(()=>{
    const active=Boolean(transactionRef.current||pendingTransient.current||transientFrame.current!==null);if(transientFrame.current!==null){cancelAnimationFrame(transientFrame.current);transientFrame.current=null;}pendingTransient.current=null;const transaction=transactionRef.current;transactionRef.current=null;transientBlocked.current=active;if(transaction){projectRef.current=transaction.before;setProject(transaction.before);}
  },[]);

  const commit = useCallback((mutate:(draft:EditorProject)=>void,label="Edit")=>{
    flushTransient();const current=projectRef.current,next=mutableProject(current);mutate(next);applyAutoLayout(next);next.updatedAt=Date.now();
    if(JSON.stringify(historyComparable(current))===JSON.stringify(historyComparable(next)))return;
    projectRef.current=next;setProject(next);
    if(transactionRef.current)return;
    recordHistory(label,current,next);
  },[flushTransient,recordHistory]);

  const addElement = (type: ElementType) => commit((draft) => {
    if(type==="scrolling-frame"){const elements=createScrollingInventoryElements(draft.elements.length);draft.elements.push(...elements);draft.selectedIds=[elements[0].id];return;}
    const element = createElement(type, draft.elements.length); draft.elements.push(element); draft.selectedIds = [element.id];
  });
  const addGeometry = (kind:GeometryKind) => commit((draft)=>{const element=createVectorElement(kind,draft.elements.length);draft.elements.push(element);draft.selectedIds=[element.id];});
  const select = (id: string | null, additive = false) => setProject((current) => ({ ...current, selectedIds: id ? (additive ? (current.selectedIds.includes(id) ? current.selectedIds.filter((item) => item !== id) : [...current.selectedIds, id]) : [id]) : [] }));
  const setSelection = (ids: string[], mode: "replace" | "toggle" = "replace") => setProject((current) => ({ ...current, selectedIds: mode === "replace" ? [...new Set(ids)] : [...new Set([...current.selectedIds.filter((id) => !ids.includes(id)),...ids.filter((id) => !current.selectedIds.includes(id))])] }));
  const updateSelected = (patch: Partial<EditorElement>) => commit((draft) => { const resolvedPatch=patch.fontFamily?{...patch,fontId:patch.fontFamily.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"")}:patch;applySharedPerspective(draft,resolvedPatch);draft.elements = draft.elements.map((el) => draft.selectedIds.includes(el.id) ? { ...el, ...resolvedPatch } : el); },propertyLabel(patch,projectRef.current));
  const deleteSelected = () => commit((draft) => { const ids=descendantIds(draft.elements,draft.selectedIds);draft.elements = draft.elements.filter((el) => !ids.has(el.id)); draft.selectedIds = []; });
  const duplicateSelected = () => commit((draft) => {
    const sourceIds=descendantIds(draft.elements,draft.selectedIds),sources=draft.elements.filter((el)=>sourceIds.has(el.id)),idMap=new Map(sources.map((el)=>[el.id,`${el.type}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`]));const clones=sources.map((el)=>({...structuredClone(el),id:idMap.get(el.id)!,parentId:el.parentId?(idMap.get(el.parentId)??el.parentId):null,name:draft.selectedIds.includes(el.id)?`${el.name} Copy`:el.name,x:el.x+16,y:el.y+16}));
    draft.elements.push(...clones); draft.selectedIds = draft.selectedIds.map((id)=>idMap.get(id)).filter((id):id is string=>Boolean(id));
  });
  const reorder = (id: string, direction: -1 | 1) => commit((draft) => {
    const index = draft.elements.findIndex((el) => el.id === id); const target = index + direction;
    if (index < 0 || target < 0 || target >= draft.elements.length) return;
    [draft.elements[index], draft.elements[target]] = [draft.elements[target], draft.elements[index]];
  });
  const align = (alignment: Alignment,target:AlignmentTarget="selection") => commit((draft) => alignSelection(draft, alignment,target),`Align ${alignment}`);
  const distribute = (axis: "horizontal" | "vertical",exactSpacing?:number) => commit((draft) => distributeSelection(draft, axis,exactSpacing),`Distribute ${axis}`);
  const stack = (axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end"="center")=>commit((draft)=>stackSelection(draft,axis,gap,alignment),`Stack ${axis}`);
  const autoLayoutSelection = (axis:"horizontal"|"vertical",gap:number,alignment:"start"|"center"|"end"="center")=>commit((draft)=>convertSelectionToAutoLayout(draft,axis,gap,alignment),"Convert to Auto Layout");
  const group = () => commit(groupSelection,"Group Selection");
  const ungroup = () => commit(ungroupSelection,"Ungroup Selection");
  const nudge = (x: number, y: number) => {if(!transactionRef.current)beginHistoryTransaction(`Move ${projectRef.current.selectedIds.length>1?`${projectRef.current.selectedIds.length} Objects`:`"${projectRef.current.elements.find((item)=>item.id===projectRef.current.selectedIds[0])?.name??"Object"}"`}`);transient((draft) => { const ids=descendantIds(draft.elements,draft.selectedIds);draft.elements.forEach((item) => { if (ids.has(item.id) && !item.locked) { item.x += x; item.y += y; } }); },descendantIds(projectRef.current.elements,projectRef.current.selectedIds));if(nudgeTimer.current!==null)window.clearTimeout(nudgeTimer.current);nudgeTimer.current=window.setTimeout(()=>finishGesture(),180);};
  const addReferences = (references: EditorReference[]) => commit((draft) => { draft.references.push(...references); });
  const updateReference = (id: string, patch: Partial<EditorReference>) => commit((draft) => { const reference = draft.references.find((item) => item.id === id); if (reference) Object.assign(reference,patch); });
  const removeReference = (id: string) => commit((draft) => { draft.references = draft.references.filter((item) => item.id !== id); });
  const togglePreset = (id: string) => commit((draft) => { draft.activePresetIds = draft.activePresetIds.includes(id) ? draft.activePresetIds.filter((item) => item !== id) : [...draft.activePresetIds,id].slice(-4); });
  const toggleFavoritePreset = (id: string) => commit((draft) => { draft.favoritePresetIds = draft.favoritePresetIds.includes(id) ? draft.favoritePresetIds.filter((item) => item !== id) : [...draft.favoritePresetIds,id]; });
  const applyFont = (id: string, family: string, weight = 400, style: EditorElement["fontStyle"] = "normal") => commit((draft) => { draft.elements.forEach((item) => { if (draft.selectedIds.includes(item.id) && (item.type === "text" || item.type === "button")) { item.fontId=id; item.fontFamily = family; item.fontWeight = weight; item.fontStyle = style; } }); draft.recentFontIds = [id,...draft.recentFontIds.filter((item) => item !== id)].slice(0,12); });
  const toggleFavoriteFont = (id: string) => commit((draft) => { draft.favoriteFontIds = draft.favoriteFontIds.includes(id) ? draft.favoriteFontIds.filter((item) => item !== id) : [...draft.favoriteFontIds,id]; });
  const saveFrameRecipe = (recipe: FrameRecipe) => commit((draft) => { const index = draft.customFrameRecipes.findIndex((item) => item.id === recipe.id); if (index >= 0) draft.customFrameRecipes[index] = recipe; else draft.customFrameRecipes.push(recipe); });
  const cacheResearch = (key: string, result: ResearchResult) => commit((draft) => { draft.researchCache[key] = result; });
  const restoreGeneration = (entry: GenerationHistoryEntry) => commit((draft) => { draft.elements = structuredClone(entry.before.elements); draft.selectedIds = [...entry.before.selectedIds]; });
  const undo = () => {if(transactionRef.current){cancelHistoryTransaction();return;}setPast((items) => { const command = items.at(-1); if (!command) return items; setFuture((next) => [command, ...next]);projectRef.current=command.before;setProject(command.before);return items.slice(0, -1); });};
  const redo = () => setFuture((items) => { const command = items[0]; if (!command) return items; setPast((previous) => trimHistory([...previous,command]));projectRef.current=command.after;setProject(command.after);return items.slice(1); });

  const importImages=async(files:Iterable<File>,position?:{x:number;y:number},placeOnCanvas=true)=>{
    const imported=await Promise.all([...files].map(importImageFile)),current=projectRef.current,byHash=new Map(current.assets.map((asset)=>[asset.contentHash,asset]));
    commit((draft)=>{const placed:EditorElement[]=[];imported.forEach((candidate,index)=>{const existing=byHash.get(candidate.contentHash)??draft.assets.find((asset)=>asset.contentHash===candidate.contentHash),asset=existing??candidate;if(!existing){draft.assets.push(asset);byHash.set(asset.contentHash,asset);}if(placeOnCanvas){const element=createImageElementForAsset(asset,draft.elements.length+index,draft.screen,position?{x:position.x+index*18,y:position.y+index*18}:undefined);draft.elements.push(element);placed.push(element);}});if(placed.length)draft.selectedIds=placed.map((item)=>item.id);},`Import ${imported.length} Image${imported.length===1?"":"s"}`);
    return imported.map((candidate)=>byHash.get(candidate.contentHash)??candidate);
  };
  const placeAsset=(assetId:string,position?:{x:number;y:number},asButton=false)=>commit((draft)=>{const asset=draft.assets.find((item)=>item.id===assetId);if(!asset)return;const element=createImageElementForAsset(asset,draft.elements.length,draft.screen,position,asButton);draft.elements.push(element);draft.selectedIds=[element.id];},asButton?"Create Image Button":"Place Image");
  const placeSvgAsVector=(assetId:string,position?:{x:number;y:number})=>{const asset=projectRef.current.assets.find((item)=>item.id===assetId);if(!asset)return;const element=createVectorElementForSvgAsset(asset,projectRef.current.elements.length,projectRef.current.screen,position);commit((draft)=>{draft.elements.push(element);draft.selectedIds=[element.id];},"Convert SVG to Editable Vector");};
  const renameAsset=(assetId:string,name:string)=>commit((draft)=>{const asset=draft.assets.find((item)=>item.id===assetId);if(asset)asset.name=name.trim()||asset.name;},"Rename Asset");
  const setAssetFolder=(assetId:string,folder:string)=>commit((draft)=>{const asset=draft.assets.find((item)=>item.id===assetId);if(asset)asset.folder=folder;},"Move Asset");
  const toggleFavoriteAsset=(assetId:string)=>commit((draft)=>{const asset=draft.assets.find((item)=>item.id===assetId);if(asset)asset.favorite=!asset.favorite;},"Favorite Asset");
  const createAssetFolder=(name:string)=>commit((draft)=>{const folder=name.trim();if(folder&&!draft.assetFolders.some((item)=>item.toLowerCase()===folder.toLowerCase()))draft.assetFolders.push(folder);},"Create Asset Folder");
  const applyAssetToSelection=(assetId:string)=>commit((draft)=>{draft.elements.forEach((item)=>{if(draft.selectedIds.includes(item.id))item.imageAssetId=assetId;});},"Apply Image Asset");

  const createNewProject = async(name: string) => { await forceSave();const next = createProject(name || "Untitled UI"); await saveProject(next,{createRecovery:false});setProject(next); setPast([]); setFuture([]); await refreshLibrary(); };
  const openProject = async(id: string) => { await forceSave();const next = await loadProject(id); if (next) { setProject(next); setPast([]); setFuture([]); } };
  const renameProject = (name: string) => commit((draft) => { draft.name = name.trim() || draft.name; });
  const duplicateCurrent = async() => { await forceSave();const next = duplicateProject(projectRef.current); await saveProject(next,{createRecovery:false});setProject(next); setPast([]); setFuture([]); await refreshLibrary(); };
  const removeProject = async(id: string) => { await deleteStoredProject(id);const remaining = await listProjects(); setProjects(remaining); if (id === projectRef.current.id) { const next = remaining[0] ? await loadProject(remaining[0].id) : createProject(); if (next) { await saveProject(next,{createRecovery:false});setProject(next); } }await refreshLibrary(); };
  const importProject = async(value:unknown) => { const next=await importProjectData(value);setProject(next);setPast([]);setFuture([]);await refreshLibrary(); };
  const recoverProject = async(id:string) => { const next=await restoreRecoverySnapshot(id);if(!next)return;setProject(next);setPast([]);setFuture([]);await refreshLibrary(); };
  const discardRecovery=async(id:string)=>{await discardRecoverySnapshot(id);await refreshLibrary();};
  const archiveProject=async(id:string)=>{const target=await loadProject(id);if(!target)return;target.archived=!target.archived;target.updatedAt=Date.now();await saveProject(target,{createRecovery:false});if(id===projectRef.current.id)setProject(target);await refreshLibrary();};

  return { project, setProject, past, future, historyEntries:[...past].reverse(), status, projects, recoveries, commit, beginHistoryTransaction, transient, finishGesture, cancelHistoryTransaction, importImages, placeAsset, placeSvgAsVector, renameAsset, setAssetFolder, toggleFavoriteAsset, createAssetFolder, applyAssetToSelection, addElement, addGeometry, select, setSelection, updateSelected, deleteSelected, duplicateSelected, reorder, align, distribute, stack, autoLayoutSelection, group, ungroup, nudge, addReferences, updateReference, removeReference, togglePreset, toggleFavoritePreset, applyFont, toggleFavoriteFont, saveFrameRecipe, cacheResearch, restoreGeneration, undo, redo, forceSave, createNewProject, openProject, renameProject, duplicateCurrent, removeProject, importProject, recoverProject, discardRecovery, archiveProject };
}

function seedElement(id: string, type: ElementType, name: string, patch: Partial<EditorElement>): EditorElement {
  return { ...createElement(type), id, name, ...patch };
}

function propertyLabel(patch:Partial<EditorElement>,project:EditorProject){const keys=Object.keys(patch),count=project.selectedIds.length,name=count>1?`${count} Objects`:`"${project.elements.find((item)=>item.id===project.selectedIds[0])?.name??"Object"}"`;if(keys.some((key)=>["x","y"].includes(key)))return`Move ${name}`;if(keys.some((key)=>["width","height"].includes(key)))return`Resize ${name}`;if(keys.includes("rotation"))return`Rotate ${name}`;if(keys.includes("fontFamily")||keys.includes("fontId"))return"Change Font";if(keys.some((key)=>key.startsWith("gradient")))return"Change Gradient";if(keys.includes("geometry"))return"Edit Path";if(keys.includes("imageAssetId"))return"Replace Image";return`Change ${keys[0]??"Property"}`;}
