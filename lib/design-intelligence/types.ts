export type PresetCategory = "OS" | "Game" | "Retro" | "Technology" | "Environment" | "Historical" | "Media" | "Art" | "Dark" | "Professional" | "Custom";
export type PresetRole = "structure" | "geometry" | "colors" | "typography" | "effects" | "spatial";
export type ReferenceRole = "Layout" | "Proportions" | "Geometry" | "Frame Construction" | "Visual Style" | "Colors" | "Typography" | "Buttons" | "Borders" | "Icons" | "Components" | "Background" | "Effects" | "Animation" | "Perspective" | "Depth" | "Lighting" | "Inspiration" | "Custom";

export type SystemPreset = {
  id: string; name: string; category: PresetCategory; description: string;
  geometry: { shape: string; cornerStyle: string; radius: number; density: "compact" | "balanced" | "spacious"; borderLayers: number };
  colors: { surface: string; surfaceAlt: string; accent: string; text: string; highlight: string; shadow: string; strategy: string };
  typography: { family: string; character: string; weight: number; alignment: "left" | "center"; scale: "compact" | "standard" | "display" };
  spacing: { unit: number; padding: number; gap: number };
  borders: { construction: string; width: number; highlightSide: string; shadowSide: string };
  gradients: { default: "off" | "subtle" | "active"; type: "linear" | "radial" | "conic" | "none"; angle: number };
  effects: { shadow: string; blur: number; glow: number; decoration: string };
  depth: { mode: string; amount: number; perspective: number };
  button: { shape: string; construction: string; pressed: string };
  window: { construction: string; titleBar: string; contentInset: number };
  spatial: { enabled: boolean; tilt: number; layers: number };
  platforms: string[];
  aiRules: { prefer: string[]; avoid: string[] };
};

export type FrameRecipe = {
  id: string; name: string; tags: string[]; outerShape: string; corner: string; radius: number;
  borderStack: string[]; header: string; contentInset: number; decoration: string; depth: string; controls: number;
};

export type EditorReference = {
  id: string; name: string; dataUrl: string; role: ReferenceRole; influence: number; createdAt: number; notes: string;
  measurements?: { aspectRatio: number; dominantColors: string[]; contrast: string; density: string };
  regions: { id: string; name: string; x: number; y: number; width: number; height: number; role: ReferenceRole }[];
};

export type ResearchSource = { id: string; title: string; url: string; provider: string; excerpt: string; excluded: boolean };
export type ResearchResult = {
  query: string; status: "researched" | "offline" | "bypassed"; summary: string; searchedAt: number;
  traits: { geometry: string[]; colors: string[]; typography: string[]; effects: string[]; interaction: string[] };
  matchedPresetIds: string[]; sources: ResearchSource[];
};

export type PreservationRules = { layout: boolean; text: boolean; geometry: boolean; colors: boolean; typography: boolean; positions: boolean; sizes: boolean; hierarchy: boolean; effects: boolean; perspective: boolean };
export type DesignAssignments = Record<PresetRole, string>;
export type DesignDecision = { category: string; source: string; value: string };
export type PlannedHierarchyNode = { id:string; name:string; type:string; purpose:string; parentId:string|null; layout:string; sizing:string; constraints:string; children:string[] };
export type LayoutPlanStep = { order:number; stage:"hierarchy"|"relationships"|"auto-layout"|"sizing"|"constraints"|"geometry"|"alignment"|"spacing"|"typography"|"fills"|"effects"|"validation"; detail:string };
export type DesignPlan = {
  id: string; prompt: string; mode: string; style: string; platform: string; accuracy: string; createdAt: number;
  research: ResearchResult; presetIds: string[]; assignments: DesignAssignments; referenceIds: string[];
  decisions: DesignDecision[]; preservation: PreservationRules; createCount: number; modifyCount: number;
  layoutKind: "inventory" | "spatial" | "window" | "roblox-shop" | "selected-edit"; warnings: string[];
  hierarchy: PlannedHierarchyNode[];
  layoutPlan: LayoutPlanStep[];
  intent?: import("@/lib/ai/intent").ParsedDesignIntent;
};

export type ResearchRequest = { prompt: string; style: string; platform: string; referenceCount: number; selectedCount: number; refresh?: boolean };
