"use client";

import type { ReactNode } from "react";

export function PropertyRow({ label, scope, hint, children, className = "" }: { label:string; scope?:"OBJECT"|"PROJECT"|"EDITOR"; hint?:string; children:ReactNode; className?:string }) {
  return <div className={`property-row ${className}`} title={hint}><span className="property-label">{label}{scope&&<small className={`option-scope ${scope.toLowerCase()}`}>{scope}</small>}</span><div className="property-control">{children}</div>{hint&&<small className="property-help">{hint}</small>}</div>;
}

export function SelectField({ label, value, options, scope, hint, onChange }: { label:string; value:string; options:Array<string|{value:string;label:string}>; scope?:"OBJECT"|"PROJECT"|"EDITOR"; hint?:string; onChange:(value:string)=>void }) {
  return <PropertyRow label={label} scope={scope} hint={hint}><select aria-label={label} value={value} onChange={(event)=>onChange(event.target.value)}>{options.map((option)=>{const value=typeof option==="string"?option:option.value,label=typeof option==="string"?option:option.label;return <option key={value} value={value}>{label}</option>;})}</select></PropertyRow>;
}

export function CheckboxField({ label, checked, scope, hint, disabled=false, onChange }: { label:string; checked:boolean; scope?:"OBJECT"|"PROJECT"|"EDITOR"; hint?:string; disabled?:boolean; onChange:(value:boolean)=>void }) {
  return <PropertyRow label={label} scope={scope} hint={hint}><label className={`property-checkbox ${disabled?"disabled":""}`}><input type="checkbox" checked={checked} disabled={disabled} onChange={(event)=>onChange(event.target.checked)}/><span aria-hidden="true"/><b>{checked?"On":"Off"}</b></label></PropertyRow>;
}

export function NumberField({ label, value, min, max, step=1, unit="", scope, hint, onChange }: { label:string; value:number; min?:number; max?:number; step?:number; unit?:string; scope?:"OBJECT"|"PROJECT"|"EDITOR"; hint?:string; onChange:(value:number)=>void }) {
  return <PropertyRow label={label} scope={scope} hint={hint}><span className="property-number"><input aria-label={label} type="number" value={value} min={min} max={max} step={step} onChange={(event)=>onChange(Number(event.target.value)||0)}/>{unit&&<i>{unit}</i>}</span></PropertyRow>;
}

export function SegmentedControl({ label, value, values, scope, hint, onChange }: { label:string; value:string; values:Array<{value:string;label:string}>; scope?:"OBJECT"|"PROJECT"|"EDITOR"; hint?:string; onChange:(value:string)=>void }) {
  return <PropertyRow label={label} scope={scope} hint={hint} className="segmented-row"><div className="property-segmented">{values.map((item)=><button key={item.value} className={value===item.value?"active":""} onClick={()=>onChange(item.value)}>{item.label}</button>)}</div></PropertyRow>;
}
