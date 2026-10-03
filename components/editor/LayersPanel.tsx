"use client";

import { useState } from "react";
import { ChevronDown, Circle, Eye, EyeOff, Frame, Hexagon, ImageIcon, Lock, LockOpen, Minus, MoreHorizontal, Search, Square, Star, Type } from "lucide-react";
import type { EditorElement, EditorProject } from "@/lib/editor/types";
import type { FrameRecipe, SystemPreset } from "@/lib/design-intelligence/types";
import type { CreatorFont } from "@/lib/fonts/font-library";
import { FontBrowser, FrameBrowser, GenerationHistory, ReferenceBoard, SystemPresetBrowser } from "./IntelligencePanels";
import { AssetsPanel } from "./AssetsPanel";

type Props = { project: EditorProject; onSelect: (id: string, additive?: boolean) => void; onPatch: (id: string, patch: Partial<EditorElement>) => void; onReorder: (id: string, direction: -1 | 1) => void; onImportImages:(files:Iterable<File>)=>Promise<unknown>;onPlaceAsset:(assetId:string,position?:{x:number;y:number},asButton?:boolean)=>void;onPlaceSvgVector:(assetId:string)=>void;onRenameAsset:(assetId:string,name:string)=>void;onAssetFolder:(assetId:string,folder:string)=>void;onFavoriteAsset:(assetId:string)=>void;onCreateAssetFolder:(name:string)=>void;onApplyAssetFill:(assetId:string)=>void; onTogglePreset:(id:string)=>void; onFavoritePreset:(id:string)=>void; onTestPreset:(preset:SystemPreset)=>void; onInsertFrame:(recipe:FrameRecipe)=>void; onSaveFrame:(recipe:FrameRecipe)=>void; onApplyFont:(font:CreatorFont,weight:number,style:"normal"|"italic")=>void; onFavoriteFont:(id:string)=>void; onRerun:(entry:EditorProject["generationHistory"][number])=>void; onRestore:(entry:EditorProject["generationHistory"][number])=>void; onDuplicatePrompt:(entry:EditorProject["generationHistory"][number])=>void };
const icons = { frame: Frame, container: Frame, "scrolling-frame": Frame, text: Type, rectangle: Square, roundRect: Square, ellipse: Circle, line: Minus, polygon: Hexagon, star: Star, button: Square, vector: Hexagon, image:ImageIcon,"image-button":ImageIcon };

export function LayersPanel({ project, onSelect, onPatch, onReorder, onImportImages,onPlaceAsset,onPlaceSvgVector,onRenameAsset,onAssetFolder,onFavoriteAsset,onCreateAssetFolder,onApplyAssetFill,onTogglePreset, onFavoritePreset, onTestPreset, onInsertFrame, onSaveFrame, onApplyFont, onFavoriteFont, onRerun, onRestore, onDuplicatePrompt }: Props) {
  const [tab, setTab] = useState("layers"); const [query, setQuery] = useState(""); const visibleLayers = project.elements.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
  return <aside className="left-panel"><div className="panel-tabs">
      <div className="tabs-list" role="tablist">
        {['Layers','Assets','Frames','Fonts','Components','Templates','Styles','References','History'].map((item) => <button key={item} role="tab" aria-selected={tab === item.toLowerCase()} className={tab === item.toLowerCase() ? "active" : ""} onClick={() => setTab(item.toLowerCase())}>{item}</button>)}
      </div>
      {tab === "layers" ? <div className="layers-content">
        <div className="panel-heading"><span>Layers</span><button title="Layer actions"><MoreHorizontal size={15}/></button></div><label className="layer-search"><Search size={12}/><input aria-label="Filter layers" placeholder="Filter layers" value={query} onChange={(event) => setQuery(event.target.value)}/></label>
        <div className="screen-row"><ChevronDown size={13}/><Frame size={14}/><span>{project.screen.name}</span></div>
        <div className="layer-list">
          {[...visibleLayers].reverse().map((element) => { const Icon = icons[element.type]; const selected = project.selectedIds.includes(element.id); return <div key={element.id} className={`layer ${selected ? "selected" : ""} ${element.parentId ? "nested" : ""}`} onClick={(event) => onSelect(element.id, event.shiftKey)}>
            <button className="disclosure" aria-label={`Select ${element.name}`}><Icon size={13}/></button><span>{element.name}</span>
            <div className="layer-actions">
              <button aria-label={element.hidden ? "Show layer" : "Hide layer"} onClick={(event) => { event.stopPropagation(); onPatch(element.id, { hidden: !element.hidden }); }}>{element.hidden ? <EyeOff size={12}/> : <Eye size={12}/>}</button>
              <button aria-label={element.locked ? "Unlock layer" : "Lock layer"} onClick={(event) => { event.stopPropagation(); onPatch(element.id, { locked: !element.locked }); }}>{element.locked ? <Lock size={12}/> : <LockOpen size={12}/>}</button>
            </div>
          </div>; })}
        </div>
        {project.selectedIds.length === 1 && <div className="layer-order"><button onClick={() => onReorder(project.selectedIds[0], 1)}>Bring forward</button><button onClick={() => onReorder(project.selectedIds[0], -1)}>Send backward</button></div>}
      </div> : tab === "assets" ? <AssetsPanel assets={project.assets} folders={project.assetFolders} onImport={onImportImages} onPlace={onPlaceAsset} onPlaceVector={onPlaceSvgVector} onRename={onRenameAsset} onFolder={onAssetFolder} onFavorite={onFavoriteAsset} onCreateFolder={onCreateAssetFolder} onApplyFill={onApplyAssetFill}/> : tab === "frames" ? <FrameBrowser custom={project.customFrameRecipes} onInsert={onInsertFrame} onSave={onSaveFrame}/> : tab === "fonts" ? <FontBrowser favorites={project.favoriteFontIds} recent={project.recentFontIds} projectFonts={[...new Set(project.elements.map((item)=>item.fontFamily))]} selectedText={project.elements.find((item)=>project.selectedIds.includes(item.id))?.text??""} onApply={onApplyFont} onFavorite={onFavoriteFont}/> : tab === "styles" ? <SystemPresetBrowser active={project.activePresetIds} favorites={project.favoritePresetIds} onToggle={onTogglePreset} onFavorite={onFavoritePreset} onTest={onTestPreset}/> : tab === "references" ? <ReferenceBoard references={project.references}/> : tab === "history" ? <GenerationHistory entries={project.generationHistory} onRerun={onRerun} onRestore={onRestore} onDuplicate={onDuplicatePrompt}/> : <div className="empty-panel"><span>{tab}</span><p>Available in a later CreatorMake phase.</p></div>}
    </div>
  </aside>;
}
