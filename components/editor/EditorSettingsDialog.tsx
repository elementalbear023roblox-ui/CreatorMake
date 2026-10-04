"use client";

import { useMemo, useState } from "react";
import { Check, ChevronRight, CircleCheck, Code2, Contrast, Heart, Laptop, Moon, Palette, Search, SlidersHorizontal, Sparkles, Sun, X } from "lucide-react";
import type { AIProviderStatus, ReferenceDetail } from "@/lib/ai/types";
import { INTERFACE_THEMES, WORKSPACE_MODES, themeContrastReport, type AppearanceMode, type ThemeDefinition } from "@/lib/ui/interface-themes";
import type { InterfaceSettings } from "@/hooks/use-interface-settings";

type Props = {
  open: boolean;
  settings: InterfaceSettings;
  resolvedAppearance: "light" | "dark";
  themes: ThemeDefinition[];
  aiEnabled: boolean;
  aiStatus: AIProviderStatus | null;
  referenceDetail: ReferenceDetail;
  onReferenceDetail: (value: ReferenceDetail) => void;
  onPatch: (patch: Partial<InterfaceSettings> | ((current: InterfaceSettings) => Partial<InterfaceSettings>)) => void;
  onSelectTheme: (id: string) => void;
  onToggleFavoriteTheme: (id: string) => void;
  onSaveCustomTheme: (theme: ThemeDefinition) => void;
  onClose: () => void;
};

const CATEGORIES = ["General", "Appearance", "Themes", "Editor", "Snapping", "Canvas", "Performance", "Fonts", "Roblox", "Shortcuts", "Advanced", "Developer"] as const;
type Category = typeof CATEGORIES[number];

export function EditorSettingsDialog(props: Props) {
  const [category, setCategory] = useState<Category>("Appearance");
  const [settingsQuery, setSettingsQuery] = useState("");
  const [themeQuery, setThemeQuery] = useState("");
  const [customName, setCustomName] = useState("My Creator Theme");
  const [customAccent, setCustomAccent] = useState<[string, string, string]>(["#7c5cff", "#22d3ee", "#f472b6"]);
  const [customAngle, setCustomAngle] = useState(135);
  const [customIntensity, setCustomIntensity] = useState(100);
  const categories = CATEGORIES.filter((item) => item.toLowerCase().includes(settingsQuery.trim().toLowerCase()));
  const visibleThemes = useMemo(() => props.themes.filter((item) => `${item.name} ${item.category}`.toLowerCase().includes(themeQuery.trim().toLowerCase())), [props.themes, themeQuery]);
  if (!props.open) return null;

  const appearanceOption = (value: AppearanceMode, Icon: typeof Sun, label: string, description: string) => <button className={`appearance-option ${props.settings.appearance === value ? "active" : ""}`} onClick={() => props.onPatch({ appearance: value })}><Icon size={18}/><span><strong>{label}</strong><small>{description}</small></span>{props.settings.appearance === value && <Check size={15}/>}</button>;
  const saveCustom = () => {
    const id = `custom-${customName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;
    props.onSaveCustomTheme({ id, name: customName.trim() || "Custom Theme", category: "CreatorMake", accent: customAccent, angle: customAngle, intensity: customIntensity / 100 });
  };

  return <div className="dialog-overlay settings-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose(); }}>
    <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="CreatorMake settings">
      <header className="settings-header"><div><span className="eyebrow">CREATORMAKE</span><h2>Settings</h2></div><label className="settings-search"><Search size={14}/><input value={settingsQuery} onChange={(event) => setSettingsQuery(event.target.value)} placeholder="Search settings" aria-label="Search settings"/></label><button className="dialog-close" aria-label="Close settings" onClick={props.onClose}><X size={18}/></button></header>
      <div className="settings-layout">
        <nav className="settings-nav" aria-label="Settings categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}><span>{item}</span><ChevronRight size={13}/></button>)}</nav>
        <div className="settings-content">
          {(category === "Appearance" || category === "General") && <>
            <section className="settings-section"><div className="settings-section-title"><Contrast size={17}/><div><h3>Appearance</h3><p>Choose how CreatorMake looks. This never changes a project or its Roblox export.</p></div></div><div className="appearance-options">{appearanceOption("light", Sun, "Light", "Bright surfaces and dark text")}{appearanceOption("dark", Moon, "Dark", "Low-glare professional workspace")}{appearanceOption("system", Laptop, "System", `Follow Windows · currently ${props.resolvedAppearance}`)}</div></section>
            <section className="settings-section"><div className="settings-section-title"><SlidersHorizontal size={17}/><div><h3>Editor density</h3><p>Adjust control spacing without changing the canvas.</p></div></div><div className="segmented-control"><button className={props.settings.density === "compact" ? "active" : ""} onClick={() => props.onPatch({ density: "compact" })}>Compact</button><button className={props.settings.density === "comfortable" ? "active" : ""} onClick={() => props.onPatch({ density: "comfortable" })}>Comfortable</button></div></section>
            <section className="settings-section"><div className="settings-section-title"><Sparkles size={17}/><div><h3>Workspace</h3><p>Rearrange emphasis for a task without modifying the project.</p></div></div><div className="segmented-control workspace-presets">{WORKSPACE_MODES.map((workspaceMode)=><button key={workspaceMode} className={props.settings.workspaceMode === workspaceMode ? "active" : ""} onClick={() => props.onPatch({ workspaceMode })}>{workspaceMode}</button>)}</div></section>
          </>}
          {category === "Themes" && <>
            <section className="settings-section theme-browser"><div className="settings-section-title"><Palette size={17}/><div><h3>Color themes</h3><p>Thirty curated interface palettes with independent light and dark rendering.</p></div></div><label className="theme-search"><Search size={13}/><input value={themeQuery} onChange={(event) => setThemeQuery(event.target.value)} placeholder="Search 30 themes"/></label>
              {props.settings.recentThemeIds.length > 0 && !themeQuery && <div className="theme-strip"><span>Recent</span>{props.settings.recentThemeIds.slice(0, 6).map((id) => { const item = props.themes.find((candidate) => candidate.id === id); return item && <button key={id} onClick={() => props.onSelectTheme(id)} style={{ background: `linear-gradient(${item.angle}deg,${item.accent.join(",")})` }} title={item.name} aria-label={`Use ${item.name}`}/>; })}</div>}
              <div className="theme-gallery">{visibleThemes.map((item) => { const report = themeContrastReport(item, props.resolvedAppearance); const passing = report.primaryText >= 7 && report.secondaryText >= 4.5 && report.buttonText >= 4.5; return <article key={item.id} className={`theme-card ${props.settings.themeId === item.id ? "active" : ""}`}><button className="theme-card-main" onClick={() => props.onSelectTheme(item.id)}><span className="theme-preview" style={{ background: `linear-gradient(${item.angle}deg,${item.accent.join(",")})` }}><i/><b/><em/></span><span className="theme-meta"><strong>{item.name}</strong><small>{item.category}</small></span>{props.settings.themeId === item.id && <CircleCheck className="theme-selected" size={17}/>}</button><button className={`theme-favorite ${props.settings.favoriteThemeIds.includes(item.id) ? "active" : ""}`} onClick={() => props.onToggleFavoriteTheme(item.id)} aria-label={`${props.settings.favoriteThemeIds.includes(item.id) ? "Remove" : "Add"} ${item.name} favorite`}><Heart size={13}/></button><span className={`contrast-badge ${passing ? "pass" : "review"}`}>{passing ? "AA" : "Review"}</span></article>; })}</div>
            </section>
            <section className="settings-section custom-theme"><div className="settings-section-title"><Sparkles size={17}/><div><h3>Custom theme</h3><p>Create a personal three-color palette. Contrast-safe surfaces and text are generated automatically.</p></div></div><div className="custom-theme-form"><label><span>Name</span><input value={customName} onChange={(event) => setCustomName(event.target.value)}/></label>{customAccent.map((value, index) => <label key={index}><span>Accent {index + 1}</span><input type="color" value={value} onChange={(event) => setCustomAccent((current) => current.map((color, colorIndex) => colorIndex === index ? event.target.value : color) as [string, string, string])}/></label>)}<label className="custom-theme-slider"><span>Angle · {customAngle}°</span><input aria-label="Gradient angle" type="range" min="0" max="360" value={customAngle} onChange={(event)=>setCustomAngle(Number(event.target.value))}/></label><label className="custom-theme-slider"><span>Intensity · {customIntensity}%</span><input aria-label="Accent intensity" type="range" min="35" max="100" value={customIntensity} onChange={(event)=>setCustomIntensity(Number(event.target.value))}/></label><button className="primary-settings-button" onClick={saveCustom}>Save & apply</button></div></section>
          </>}
          {category === "Editor" && <SettingsInfo title="Editor behavior" text="Panel widths, inspector level, section visibility, density, and workspace mode persist on this device and remain separate from CreatorMake project files."/>}
          {category === "Snapping" && <SettingsInfo title="Snapping" text="Grid, smart guides, pixel snapping, tolerances, and guide locking remain available in the canvas controls for immediate visual feedback."/>}
          {category === "Canvas" && <SettingsInfo title="Canvas" text="The application theme affects the canvas surround only. Artwork colors, element fills, exported assets, and Roblox manifests remain unchanged."/>}
          {category === "Performance" && <SettingsInfo title="Performance" text="CreatorMake uses reduced motion when requested by Windows and keeps theme transitions short to protect editor responsiveness."/>}
          {category === "Fonts" && <SettingsInfo title="Font library" text="CreatorMake font favorites and recently used fonts stay in the project font workflow. Interface theme changes never replace design typography."/>}
          {category === "Roblox" && <SettingsInfo title="Roblox Studio" text="Studio Sync, manifest generation, pixel-accurate rendering, and asset upload behavior are intentionally independent from interface appearance."/>}
          {category === "Shortcuts" && <section className="settings-section shortcuts-list"><div className="settings-section-title"><Code2 size={17}/><div><h3>Keyboard shortcuts</h3><p>Core shortcuts remain active unless focus is inside a field.</p></div></div>{[["Command palette","Ctrl K"],["Save","Ctrl S"],["Undo / Redo","Ctrl Z / Ctrl Shift Z"],["Duplicate","Ctrl D"],["Group / Ungroup","Ctrl G / Ctrl Shift G"],["Select / Pen","V / P"]].map(([label, keys]) => <p key={label}><span>{label}</span><kbd>{keys}</kbd></p>)}</section>}
          {category === "Advanced" && <SettingsInfo title="Advanced" text="Experimental vector, export, and rendering architecture remains enabled. Interface preferences are isolated in a versioned local-storage record."/>}
          {category === "Developer" && <section className="settings-section developer-settings"><div className="settings-section-title"><Code2 size={17}/><div><h3>Developer diagnostics</h3><p>Provider status and local preference storage.</p></div></div><dl><dt>UI preference key</dt><dd><code>creatormake:interface-settings:v1</code></dd><dt>AI generation</dt><dd>{props.aiEnabled ? props.aiStatus?.message ?? "Checking provider…" : "Temporarily disabled"}</dd><dt>Theme registry</dt><dd>{INTERFACE_THEMES.length} built-in · {props.settings.customThemes.length} custom</dd></dl><label className="developer-select"><span>Reference detail</span><select value={props.referenceDetail} onChange={(event) => props.onReferenceDetail(event.target.value as ReferenceDetail)}><option value="auto">Auto</option><option value="high">High</option><option value="original">Original</option></select></label></section>}
        </div>
      </div>
      <footer className="settings-footer"><span><CircleCheck size={13}/> Preferences save automatically on this device</span><button onClick={props.onClose}>Done</button></footer>
    </section>
  </div>;
}

function SettingsInfo({ title, text }: { title: string; text: string }) {
  return <section className="settings-section settings-info"><div className="settings-section-title"><SlidersHorizontal size={17}/><div><h3>{title}</h3><p>{text}</p></div></div><div className="settings-safe-note"><Check size={14}/><span>These controls are non-destructive and never alter canvas geometry or Roblox export data.</span></div></section>;
}
