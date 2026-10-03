import { PRESET_BY_ID, SYSTEM_PRESETS, matchPresets } from "./system-presets";
import { parseDesignIntent } from "@/lib/ai/intent";
import type { DesignAssignments, DesignDecision, DesignPlan, EditorReference, LayoutPlanStep, PlannedHierarchyNode, PreservationRules, ResearchRequest, ResearchResult, SystemPreset } from "./types";

const id = () => `plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const DEFAULT_PRESERVATION: PreservationRules = { layout: false, text: false, geometry: false, colors: false, typography: false, positions: false, sizes: false, hierarchy: false, effects: false, perspective: false };
const styleAliases: Record<string,string> = { "windows 98":"windows-98", win98:"windows-98", horror:"roblox-horror", crt:"crt-terminal", arcade:"arcade", cyberpunk:"cyberpunk", holographic:"holographic", hologram:"hologram-hud", forest:"forest", "game show":"game-show", "roblox classic":"roblox-classic", "roblox 2012":"roblox-2012-style", "roblox simulator":"roblox-simulator", "simulator shop":"roblox-simulator", "premium shop":"roblox-premium-shop", "exclusive shop":"roblox-premium-shop" };

export function presetsForRequest(prompt: string, style: string, research?: ResearchResult): SystemPreset[] {
  const text = `${prompt} ${style}`.toLowerCase(); const found = new Map<string,SystemPreset>();
  if((text.includes("premium")||text.includes("exclusive"))&&PRESET_BY_ID["roblox-premium-shop"])found.set("roblox-premium-shop",PRESET_BY_ID["roblox-premium-shop"]);
  Object.entries(styleAliases).forEach(([term,presetId]) => { if (text.includes(term) && PRESET_BY_ID[presetId]) found.set(presetId,PRESET_BY_ID[presetId]); });
  matchPresets(text).forEach((preset) => found.set(preset.id,preset));
  research?.matchedPresetIds.forEach((presetId) => { if (PRESET_BY_ID[presetId]) found.set(presetId,PRESET_BY_ID[presetId]); });
  if (!found.size) found.set("digital-system",PRESET_BY_ID["digital-system"] ?? SYSTEM_PRESETS[0]);
  return [...found.values()].slice(0,4);
}

export function researchQueryFor(request: ResearchRequest) {
  const prompt = request.prompt.replace(/\b(create|make|build|design|this|my|a|an|the|interface|gui|ui)\b/gi," ").replace(/\s+/g," ").trim();
  return `${prompt || request.style} visual interface design`.slice(0,140);
}

export function offlineResearch(request: ResearchRequest): ResearchResult {
  const matches = presetsForRequest(request.prompt,request.style); const primary = matches[0];
  return { query: researchQueryFor(request), status: "offline", searchedAt: Date.now(), matchedPresetIds: matches.map((preset) => preset.id), sources: [], summary: "Research unavailable — using CreatorMake System Presets and the user’s explicit instructions.", traits: { geometry: [primary.geometry.shape,primary.borders.construction], colors: [primary.colors.strategy], typography: [primary.typography.character], effects: [primary.effects.decoration,primary.depth.mode], interaction: [primary.button.pressed] } };
}

const assigned = (presets: SystemPreset[], role: keyof DesignAssignments) => {
  const ids = presets.map((preset) => preset.id); const has = (value: string) => ids.find((id) => id.includes(value));
  if (role === "colors" && (has("horror") || has("corrupt"))) return has("horror") ?? has("corrupt")!;
  if (role === "effects" && has("glitch")) return has("glitch")!;
  if (role === "effects" && (has("horror") || has("corrupt"))) return has("horror") ?? has("corrupt")!;
  if (role === "spatial" && (has("holog") || has("sci-fi"))) return has("holog") ?? has("sci-fi")!;
  return ids[0];
};

export function createDesignPlan(request: ResearchRequest & { mode: string; accuracy: string; referenceIds: string[] }, research: ResearchResult, references: EditorReference[]): DesignPlan {
  const presets = presetsForRequest(request.prompt,request.style,research); const assignments: DesignAssignments = { structure: assigned(presets,"structure"), geometry: assigned(presets,"geometry"), colors: assigned(presets,"colors"), typography: assigned(presets,"typography"), effects: assigned(presets,"effects"), spatial: assigned(presets,"spatial") };
  const input = request.prompt.toLowerCase(); const intent=parseDesignIntent(request.prompt); const selectedEdit = request.mode === "Selected objects" && /\b(red|blue|green|thicker|thinner|border|bigger|smaller|opacity|font)\b/.test(input);
  const layoutKind: DesignPlan["layoutKind"] = selectedEdit ? "selected-edit" : intent.layoutType === "shop" && (intent.platform === "Roblox" || /\bsimulator|premium|exclusive|cartoon\b/.test(input)) ? "roblox-shop" : input.includes("inventory") ? "inventory" : /(three|3|spatial|holog)/.test(input) ? "spatial" : "window";
  const refRoles = references.filter((reference) => request.referenceIds.includes(reference.id)).map((reference) => `${reference.name} (${reference.role})`);
  const decisions: DesignDecision[] = [
    { category:"Structure", source: refRoles.find((value) => /Layout|Proportions|Frame Construction/.test(value)) ?? PRESET_BY_ID[assignments.structure]?.name ?? "System preset", value: layoutKind },
    { category:"Geometry", source: PRESET_BY_ID[assignments.geometry]?.name ?? "System preset", value: PRESET_BY_ID[assignments.geometry]?.geometry.shape ?? "structured" },
    { category:"Colors", source: refRoles.find((value) => /Colors|Visual Style/.test(value)) ?? PRESET_BY_ID[assignments.colors]?.name ?? "System preset", value: PRESET_BY_ID[assignments.colors]?.colors.strategy ?? "constrained" },
    { category:"Typography", source: PRESET_BY_ID[assignments.typography]?.name ?? "System preset", value: PRESET_BY_ID[assignments.typography]?.typography.character ?? "readable" },
    { category:"Effects", source: PRESET_BY_ID[assignments.effects]?.name ?? "System preset", value: PRESET_BY_ID[assignments.effects]?.effects.decoration ?? "minimal" },
    { category:"Gradients", source: PRESET_BY_ID[assignments.geometry]?.name ?? "System preset", value: PRESET_BY_ID[assignments.geometry]?.gradients.default ?? "off" },
    { category:"Corner Radius", source: PRESET_BY_ID[assignments.geometry]?.name ?? "System preset", value: `${PRESET_BY_ID[assignments.geometry]?.geometry.radius ?? 0}px` },
  ];
  const createCount = layoutKind === "roblox-shop" ? (/premium|exclusive|black panels|gold outlines/.test(input)?39:37) : layoutKind === "inventory" ? 16 : layoutKind === "spatial" ? 7 : layoutKind === "selected-edit" ? 0 : 8;
  const hierarchy=hierarchyFor(layoutKind);const layoutPlan=layoutStepsFor(layoutKind,hierarchy);
  return { id:id(), prompt:request.prompt, mode:request.mode, style:request.style, platform:request.platform, accuracy:request.accuracy, createdAt:Date.now(), research, presetIds:presets.map((preset)=>preset.id), assignments, referenceIds:request.referenceIds, decisions, preservation: selectedEdit ? { ...DEFAULT_PRESERVATION, layout:true, text:true, positions:true, sizes:true, hierarchy:true } : DEFAULT_PRESERVATION, createCount, modifyCount:selectedEdit ? request.selectedCount : 0, layoutKind, hierarchy, layoutPlan, intent, warnings:research.status === "offline" ? ["Public research was unavailable; preset rules are being used explicitly."] : [] };
}

function hierarchyFor(kind:DesignPlan["layoutKind"]):PlannedHierarchyNode[]{
  const node=(id:string,name:string,type:string,purpose:string,parentId:string|null,layout:string,sizing:string,constraints:string,children:string[]):PlannedHierarchyNode=>({id,name,type,purpose,parentId,layout,sizing,constraints,children});
  if(kind==="roblox-shop")return [
    node("shop","SimulatorShop","Frame","Root Roblox shop window",null,"Free","Fixed 760 × 560","Center",["header","featured","content","tabs"]),
    node("header","Header","Frame","Title and window controls","shop","Horizontal · space between · gap 12","Fill × Fixed 70","Left + Right / Top",["title","close"]),
    node("title","Title","Text","Explicit shop title","header","None","Fill × Hug","Left / Center",[]),
    node("close","CloseButton","TextButton","Close action","header","None","Fixed 50 × 50","Right / Center",[]),
    node("featured","FeaturedProduct","Frame","Primary offer","shop","Horizontal · gap 12 · padding 14","Fill × Fixed 94","Left + Right / Top",[]),
    node("content","ProductGrid","Frame","Six editable products","shop","Grid · 3 columns · gaps 18/12","Fill × Fixed","Left + Right / Top",["product-1","product-2","product-3","product-4","product-5","product-6"]),
    ...Array.from({length:6},(_,index)=>node(`product-${index+1}`,`Product${String(index+1).padStart(2,"0")}`,"Frame","Product card","content","Vertical · gap 8 · padding 10","Fill × Fixed 92","Scale / Top",[])),
    node("tabs","SideTabs","Frame","Shop categories","shop","Vertical · gap 10","Fixed 92 × Fill","Right / Top + Bottom",[]),
  ];
  if(kind==="selected-edit")return [node("selection","CurrentSelection","Existing","Preserve selected hierarchy",null,"Preserve","Preserve","Preserve",[])];
  return [node("root","InterfaceWindow","Frame","Root interface window",null,"Vertical · gap 14 · padding 18","Fixed 620 × 420","Center",["header","content"]),node("header","Header","Frame","Title and controls","root","Horizontal · space between","Fill × Hug","Left + Right / Top",[]),node("content","ContentArea","Frame","Primary interface content","root",kind==="inventory"?"Grid · 4 columns":"Vertical","Fill × Fill","Left + Right / Top + Bottom",[])];
}

function layoutStepsFor(kind:DesignPlan["layoutKind"],hierarchy:PlannedHierarchyNode[]):LayoutPlanStep[]{
  const details=[
    ["hierarchy",`${hierarchy.length} named nodes planned before styling.`],["relationships","Every planned object has an explicit parent and child list."],["auto-layout",kind==="roblox-shop"?"Header horizontal, product grid 3-column, side tabs vertical.":"Root and content flows assigned before geometry."],["sizing","Fixed, hug, and fill modes assigned by purpose."],["constraints","Edge, center, and scale constraints assigned for resize behavior."],["geometry","Calculate frame bounds and child cells from layout rules."],["alignment","Resolve primary and cross-axis alignment."],["spacing","Apply padding, row gaps, and column gaps."],["typography","Apply literal UI copy only after structure is stable."],["fills","Apply preset fills, strokes, and gradients after typography."],["effects","Apply depth and decorative effects last."],["validation","Repair overflow, overlap, hierarchy, and export compatibility issues."]
  ] as const;
  return details.map(([stage,detail],index)=>({order:index+1,stage,detail}));
}

export function withResearchSourceExcluded(plan: DesignPlan, sourceId: string): DesignPlan { return { ...plan, research: { ...plan.research, sources: plan.research.sources.map((source) => source.id === sourceId ? { ...source, excluded: !source.excluded } : source) } }; }
