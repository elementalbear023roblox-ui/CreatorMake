import type { ProjectExportOptions } from "./types";
import type { RobloxRenderScale, RobloxVisualMode } from "../roblox/types";

export const DEFAULT_PROJECT_EXPORT_OPTIONS: ProjectExportOptions = {
  defaultRobloxExportMode: "AUTO",
  exportQuality: "FINAL",
  preset: "BALANCED",
  nativeTextLabelExport: true,
  renderedVisualQuality: "MAXIMUM_SAFE",
  pixelAccurateBackgrounds: "AUTO",
  internalRenderScale: "AUTO",
  imageResampling: "BEST_QUALITY",
  backgroundExport: "AUTO",
  robloxImages: "AUTO",
  robloxScreenScaling: "FIT",
  referenceResolution: "1920x1080",
  customReferenceWidth: 1920,
  customReferenceHeight: 1080,
  imageExportScaling: "PRESERVE",
  hierarchyExport: "PRESERVE",
  robloxNaming: "LAYER_NAMES",
  multiplayerSafeAssets: "REQUIRE",
  studioSync: "UPDATE_EXISTING",
  incrementalSync: true,
  compatibilityWarnings: "IMPORTANT",
  exportDiagnostics: false,
  safeExportCheck: "REQUIRE",
  autoUploadChangedVisuals: "ASK",
  renderedVisualBounds: "SMART",
  strokeRendering: "AUTO",
  effectsQuality: "ULTRA",
};

export const PROJECT_OPTION_PRESETS: Record<Exclude<ProjectExportOptions["preset"], "CUSTOM">, Partial<ProjectExportOptions>> = {
  FAST_PREVIEW: {
    exportQuality: "PREVIEW",
    renderedVisualQuality: "DRAFT", internalRenderScale: "AUTO", imageResampling: "PERFORMANCE",
    robloxImages: "LOCAL_PREVIEW", incrementalSync: true, effectsQuality: "PERFORMANCE", safeExportCheck: "WARN",
  },
  BALANCED: { ...DEFAULT_PROJECT_EXPORT_OPTIONS, preset: undefined },
  ROBLOX_FINAL: {
    exportQuality: "FINAL",
    nativeTextLabelExport: true, renderedVisualQuality: "ULTRA", internalRenderScale: "AUTO", imageResampling: "BEST_QUALITY",
    robloxImages: "PUBLISHABLE", pixelAccurateBackgrounds: "AUTO", backgroundExport: "AUTO",
    multiplayerSafeAssets: "REQUIRE", safeExportCheck: "REQUIRE", effectsQuality: "ULTRA",
  },
  COMMISSION_FINAL: {
    exportQuality: "FINAL",
    nativeTextLabelExport: true, renderedVisualQuality: "MAXIMUM_SAFE", internalRenderScale: "AUTO", imageResampling: "BEST_QUALITY",
    robloxImages: "PUBLISHABLE", hierarchyExport: "PRESERVE", multiplayerSafeAssets: "REQUIRE",
    compatibilityWarnings: "ALL", safeExportCheck: "REQUIRE", effectsQuality: "ULTRA", incrementalSync:true,
  },
  MAX_QUALITY: {
    exportQuality:"FINAL",
    nativeTextLabelExport:true,renderedVisualQuality:"MAXIMUM_SAFE",pixelAccurateBackgrounds:"AUTO",internalRenderScale:"AUTO",
    imageResampling:"BEST_QUALITY",backgroundExport:"AUTO",robloxImages:"PUBLISHABLE",hierarchyExport:"PRESERVE",
    multiplayerSafeAssets:"REQUIRE",incrementalSync:true,compatibilityWarnings:"ALL",safeExportCheck:"REQUIRE",
    renderedVisualBounds:"SMART",strokeRendering:"AUTO",effectsQuality:"ULTRA",
  },
};

export function normalizeProjectExportOptions(value?: Partial<ProjectExportOptions> | null): ProjectExportOptions {
  return { ...DEFAULT_PROJECT_EXPORT_OPTIONS, ...(value ?? {}) };
}

export function applyProjectOptionPreset(preset: Exclude<ProjectExportOptions["preset"], "CUSTOM">): ProjectExportOptions {
  return { ...DEFAULT_PROJECT_EXPORT_OPTIONS, ...PROJECT_OPTION_PRESETS[preset], preset };
}

const QUALITY_SCALE: Record<ProjectExportOptions["renderedVisualQuality"], RobloxRenderScale> = {
  DRAFT: 1, STANDARD: 2, HIGH: 3, ULTRA: 4, MAXIMUM_SAFE: 8,
};

export function resolveProjectRenderScale(options: ProjectExportOptions): RobloxRenderScale {
  if (options.exportQuality === "PREVIEW") return 2;
  if (options.exportQuality === "FINAL") return 8;
  if (options.internalRenderScale !== "AUTO") return Number(options.internalRenderScale) as RobloxRenderScale;
  return QUALITY_SCALE[options.renderedVisualQuality];
}

export function resolveProjectVisualMode(options: ProjectExportOptions): RobloxVisualMode {
  if (options.pixelAccurateBackgrounds === "OFF" || options.backgroundExport === "PREFER_NATIVE") return "NATIVE";
  if (options.pixelAccurateBackgrounds === "ON" || options.backgroundExport === "PREFER_PIXEL" || options.backgroundExport === "FORCE_PIXEL") return "PIXEL_ACCURATE";
  return "ADAPTIVE";
}

export function resolveProjectResolution(options: ProjectExportOptions) {
  if (options.referenceResolution === "CUSTOM") return { label: "Custom", width: options.customReferenceWidth, height: options.customReferenceHeight };
  const [width, height] = options.referenceResolution.split("x").map(Number);
  return { label: `${width} × ${height}`, width, height };
}
