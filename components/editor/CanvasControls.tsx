"use client";

import { Grid3X3, Lock, Magnet, Ruler, Settings2 } from "lucide-react";
import type { PixelSnapMode, SnapMode, SnapSettings } from "@/lib/editor/snapping";

type Props = {
  showGrid:boolean; gridSize:number; snapMode:SnapMode; pixelSnap:PixelSnapMode; snapSettings:SnapSettings; showGuides:boolean; lockGuides:boolean;
  onShowGrid:(value:boolean)=>void; onGridSize:(value:number)=>void; onSnapMode:(value:SnapMode)=>void; onPixelSnap:(value:PixelSnapMode)=>void; onSnapSettings:(value:SnapSettings)=>void; onShowGuides:(value:boolean)=>void; onLockGuides:(value:boolean)=>void;
};

export function CanvasControls(props:Props){
  const update=(patch:Partial<SnapSettings>)=>props.onSnapSettings({...props.snapSettings,...patch});
  return <div className="canvas-controls" role="toolbar" aria-label="Canvas precision controls">
    <div className="snap-mode-control" role="group" aria-label="Snapping mode">
      {(["free","smart","grid"] as SnapMode[]).map((mode)=><button key={mode} className={props.snapMode===mode?"active":""} aria-pressed={props.snapMode===mode} title={mode==="free"?"Free movement · hold Shift for temporary Smart snapping":mode==="smart"?"Smart alignment and equal-spacing snapping · hold Ctrl/Cmd to disable":"Snap positions to the "+props.gridSize+"px grid"} onClick={()=>props.onSnapMode(mode)}>{mode[0].toUpperCase()+mode.slice(1)}</button>)}
    </div>
    <button className={props.snapMode!=="free"?"active":""} aria-pressed={props.snapMode!=="free"} title="Quick magnet toggle" onClick={()=>props.onSnapMode(props.snapMode==="free"?"smart":"free")}><Magnet size={14}/><span>Magnet</span></button>
    <button className={props.showGrid?"active":""} aria-pressed={props.showGrid} title="Toggle grid overlay" onClick={()=>props.onShowGrid(!props.showGrid)}><Grid3X3 size={14}/><span>Grid</span></button>
    <label title="Grid spacing"><span>Step</span><select aria-label="Grid size" value={props.gridSize} onChange={(event)=>props.onGridSize(Number(event.target.value))}>{[1,2,4,8,10,12,16,20,24,32,64].map((value)=><option key={value} value={value}>{value}px</option>)}</select></label>
    <label title="Pixel rounding is independent from Smart and Grid snapping"><span>Pixels</span><select aria-label="Pixel snapping" value={props.pixelSnap} onChange={(event)=>props.onPixelSnap(event.target.value as PixelSnapMode)}><option value="off">Fractional</option><option value="half">Half px</option><option value="whole">Whole px</option></select></label>
    <button className={props.showGuides?"active":""} aria-pressed={props.showGuides} title="Show smart and ruler guides · drag from a ruler to add" onClick={()=>props.onShowGuides(!props.showGuides)}><Ruler size={14}/><span>Guides</span></button>
    <button className={props.lockGuides?"active":""} aria-pressed={props.lockGuides} title={props.lockGuides?"Unlock ruler guides":"Lock ruler guides"} onClick={()=>props.onLockGuides(!props.lockGuides)}><Lock size={14}/><span>{props.lockGuides?"Locked":"Lock"}</span></button>
    <details className="snap-settings"><summary title="Snapping settings"><Settings2 size={14}/></summary><div>
      <label><span>Threshold</span><input aria-label="Snap threshold" type="number" min="2" max="16" value={props.snapSettings.thresholdPx} onChange={(event)=>update({thresholdPx:Number(event.target.value)})}/><b>screen px</b></label>
      <label><input type="checkbox" checked={props.snapSettings.alignEdges} onChange={(event)=>update({alignEdges:event.target.checked})}/>Edges</label>
      <label><input type="checkbox" checked={props.snapSettings.alignCenters} onChange={(event)=>update({alignCenters:event.target.checked})}/>Centers</label>
      <label><input type="checkbox" checked={props.snapSettings.alignBaselines} onChange={(event)=>update({alignBaselines:event.target.checked})}/>Text baselines</label>
      <label><input type="checkbox" checked={props.snapSettings.equalSpacing} onChange={(event)=>update({equalSpacing:event.target.checked})}/>Equal spacing</label>
      <label><input type="checkbox" checked={props.snapSettings.parentPadding} onChange={(event)=>update({parentPadding:event.target.checked})}/>Parent padding</label>
      <label><input type="checkbox" checked={props.snapSettings.gridWithSmart} onChange={(event)=>update({gridWithSmart:event.target.checked})}/>Grid after Smart</label>
      <small>Ctrl/Cmd disables snapping during a gesture. Shift enables Smart temporarily in Free mode.</small>
    </div></details>
  </div>;
}
