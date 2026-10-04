export type AppearanceMode = "light" | "dark" | "system";
export type ResolvedAppearance = "light" | "dark";
export type DensityMode = "compact" | "comfortable";
export type WorkspaceMode = "design" | "vector" | "prototype" | "roblox" | "review" | "deliver";
export const WORKSPACE_MODES: WorkspaceMode[] = ["design", "vector", "prototype", "roblox", "review", "deliver"];

export type ThemeDefinition = {
  id: string;
  name: string;
  category: "CreatorMake" | "Professional" | "Retro" | "Expressive";
  accent: [string, string, string];
  angle: number;
  intensity: number;
};

export type InterfaceThemeTokens = {
  background: string;
  panel: string;
  panelElevated: string;
  floatingBackground: string;
  surface: string;
  surfaceHover: string;
  surfaceActive: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textFaint: string;
  accent: string;
  accentHover: string;
  accentPressed: string;
  accentSoft: string;
  accentText: string;
  focus: string;
  selection: string;
  positive: string;
  warning: string;
  danger: string;
  info: string;
  canvasSurround: string;
  gradient: string;
  gradientStart: string;
  gradientMiddle: string;
  gradientEnd: string;
  scrollbar: string;
  scrollbarHover: string;
};

const theme = (id: string, name: string, category: ThemeDefinition["category"], accent: [string, string, string], angle = 135, intensity = 1): ThemeDefinition => ({ id, name, category, accent, angle, intensity });

export const INTERFACE_THEMES: ThemeDefinition[] = [
  theme("creator-purple", "Creator Purple", "CreatorMake", ["#7c5cff", "#4f8cff", "#2dd4bf"]),
  theme("blurple", "Blurple", "CreatorMake", ["#5865f2", "#7289da", "#8b5cf6"]),
  theme("electric-violet", "Electric Violet", "CreatorMake", ["#7c3aed", "#a855f7", "#6366f1"]),
  theme("neon-cyan", "Neon Cyan", "CreatorMake", ["#0891b2", "#22d3ee", "#67e8f9"]),
  theme("cyan-purple", "Cyan Purple", "CreatorMake", ["#06b6d4", "#6366f1", "#a855f7"]),
  theme("magenta", "Magenta", "Expressive", ["#c026d3", "#e879f9", "#7c3aed"]),
  theme("hot-pink", "Hot Pink", "Expressive", ["#db2777", "#f472b6", "#a855f7"]),
  theme("cherry-red", "Cherry Red", "Expressive", ["#be123c", "#f43f5e", "#fb7185"]),
  theme("crimson", "Crimson", "Professional", ["#991b1b", "#dc2626", "#e11d48"]),
  theme("sunset", "Sunset", "Expressive", ["#ea580c", "#e11d48", "#9333ea"], 115, .96),
  theme("orange", "Orange", "Professional", ["#ea580c", "#f97316", "#fb923c"], 125, .9),
  theme("amber", "Amber", "Professional", ["#b45309", "#f59e0b", "#fbbf24"], 125, .86),
  theme("gold", "Gold", "Professional", ["#a16207", "#eab308", "#fde047"], 135, .82),
  theme("lime", "Lime", "Expressive", ["#4d7c0f", "#84cc16", "#a3e635"], 125, .88),
  theme("emerald", "Emerald", "Professional", ["#047857", "#10b981", "#34d399"], 135, .84),
  theme("mint", "Mint", "Expressive", ["#059669", "#5eead4", "#99f6e4"], 140, .88),
  theme("aqua", "Aqua", "Expressive", ["#0e7490", "#22d3ee", "#5eead4"], 135, .92),
  theme("ocean", "Ocean", "Professional", ["#0369a1", "#0891b2", "#22c55e"], 120, .9),
  theme("deep-blue", "Deep Blue", "Professional", ["#1e3a8a", "#1d4ed8", "#0ea5e9"], 145, .86),
  theme("royal-blue", "Royal Blue", "Professional", ["#1d4ed8", "#2563eb", "#6366f1"], 145, .9),
  theme("indigo", "Indigo", "Professional", ["#4338ca", "#6366f1", "#8b5cf6"], 145, .88),
  theme("lavender", "Lavender", "Expressive", ["#7c3aed", "#c084fc", "#60a5fa"], 135, .9),
  theme("rose", "Rose", "Expressive", ["#be123c", "#fb7185", "#f9a8d4"], 125, .9),
  theme("monochrome", "Monochrome", "Professional", ["#52525b", "#a1a1aa", "#71717a"], 160, .5),
  theme("graphite", "Graphite", "Professional", ["#64748b", "#94a3b8", "#475569"], 145, .62),
  theme("windows-98", "Windows 98", "Retro", ["#008080", "#000080", "#c0c0c0"], 90, .74),
  theme("y2k", "Y2K", "Retro", ["#ec4899", "#22d3ee", "#a3e635"], 120, 1),
  theme("webcore", "Webcore", "Retro", ["#2563eb", "#10b981", "#facc15"], 90, .96),
  theme("cyber", "Cyber", "Expressive", ["#7c3aed", "#22d3ee", "#ec4899"], 135, 1),
  theme("game-show", "Game Show", "Expressive", ["#ef4444", "#facc15", "#2563eb"], 110, 1),
];

export const DEFAULT_THEME_ID = "creator-purple";

const clamp = (value: number, min = 0, max = 255) => Math.min(max, Math.max(min, value));
const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  const normalized = value.length === 3 ? value.split("").map((part) => part + part).join("") : value;
  const number = Number.parseInt(normalized, 16);
  return { r: (number >> 16) & 255, g: (number >> 8) & 255, b: number & 255 };
};
const rgbToHex = ({ r, g, b }: { r: number; g: number; b: number }) => `#${[r, g, b].map((value) => Math.round(clamp(value)).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, amount: number) => {
  const left = hexToRgb(a), right = hexToRgb(b), ratio = clamp(amount, 0, 1);
  return rgbToHex({ r: left.r + (right.r - left.r) * ratio, g: left.g + (right.g - left.g) * ratio, b: left.b + (right.b - left.b) * ratio });
};
const luminance = (hex: string) => {
  const values = Object.values(hexToRgb(hex)).map((value) => { const channel = value / 255; return channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4; });
  return .2126 * values[0] + .7152 * values[1] + .0722 * values[2];
};

export const contrastRatio = (foreground: string, background: string) => {
  const a = luminance(foreground), b = luminance(background);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
};

export const readableText = (background: string) => contrastRatio("#ffffff", background) >= contrastRatio("#000000", background) ? "#ffffff" : "#000000";

const ensureContrast = (color: string, background: string, minimum: number) => {
  let result = color;
  const target = luminance(background) > .45 ? "#000000" : "#ffffff";
  for (let index = 0; index < 12 && contrastRatio(result, background) < minimum; index += 1) result = mix(result, target, .14);
  return result;
};

export function getTheme(themeId: string, customThemes: ThemeDefinition[] = []) {
  return [...customThemes, ...INTERFACE_THEMES].find((item) => item.id === themeId) ?? INTERFACE_THEMES[0];
}

export function buildInterfaceTokens(definition: ThemeDefinition, appearance: ResolvedAppearance): InterfaceThemeTokens {
  const [primary, secondary, tertiary] = definition.accent;
  const dark = appearance === "dark";
  const background = dark ? mix("#090a0f", primary, .025 * definition.intensity) : mix("#f7f8fb", primary, .025 * definition.intensity);
  const panel = dark ? mix("#11131a", primary, .045 * definition.intensity) : mix("#ffffff", primary, .035 * definition.intensity);
  const surface = dark ? mix("#181b24", primary, .065 * definition.intensity) : mix("#eef1f6", primary, .055 * definition.intensity);
  const surfaceHover = dark ? mix("#222632", primary, .12 * definition.intensity) : mix("#e1e6ee", primary, .10 * definition.intensity);
  const accent = dark ? mix(primary, "#ffffff", .12) : mix(primary, "#000000", contrastRatio(primary, "#ffffff") >= 4.5 ? 0 : .22);
  const text = dark ? "#f4f6fb" : "#181a21";
  const textMuted = dark ? "#a3a9b9" : "#555d6d";
  return {
    background,
    panel,
    panelElevated: dark ? mix(panel, "#ffffff", .035) : "#ffffff",
    floatingBackground: dark ? mix(panel, "#ffffff", .055) : "#ffffff",
    surface,
    surfaceHover,
    surfaceActive: mix(surface, accent, dark ? .2 : .14),
    border: dark ? "#2a2e3a" : "#d6dbe4",
    borderStrong: dark ? "#414758" : "#aab2c0",
    text,
    textMuted,
    textFaint: dark ? "#737b8e" : "#727b8a",
    accent,
    accentHover: dark ? mix(accent, "#ffffff", .12) : mix(accent, "#000000", .12),
    accentPressed: dark ? mix(accent, "#000000", .16) : mix(accent, "#000000", .22),
    accentSoft: mix(surface, accent, dark ? .28 : .16),
    accentText: readableText(accent),
    focus: ensureContrast(secondary, background, 3),
    selection: mix(surface, primary, dark ? .34 : .2),
    positive: dark ? "#43d18a" : "#087a4d",
    warning: dark ? "#f2bf62" : "#8a5200",
    danger: dark ? "#ff6b7a" : "#b42336",
    info: dark ? "#6bb7ff" : "#075faa",
    canvasSurround: dark ? mix("#08090d", secondary, .025) : mix("#dfe3ea", secondary, .035),
    gradient: `linear-gradient(${definition.angle}deg, ${primary}, ${secondary} 54%, ${tertiary})`,
    gradientStart: primary,
    gradientMiddle: secondary,
    gradientEnd: tertiary,
    scrollbar: dark ? "#343949" : "#bec5d1",
    scrollbarHover: accent,
  };
}

export function themeContrastReport(definition: ThemeDefinition, appearance: ResolvedAppearance) {
  const tokens = buildInterfaceTokens(definition, appearance);
  return {
    primaryText: contrastRatio(tokens.text, tokens.background),
    secondaryText: contrastRatio(tokens.textMuted, tokens.panel),
    disabledText: contrastRatio(tokens.textFaint, tokens.panel),
    buttonText: contrastRatio(tokens.accentText, tokens.accent),
    focusRing: contrastRatio(tokens.focus, tokens.background),
    selectedState: contrastRatio(tokens.text, tokens.selection),
    propertyInput: contrastRatio(tokens.text, tokens.surface),
  };
}

export function tokensToCssVariables(tokens: InterfaceThemeTokens) {
  const cm = Object.fromEntries(Object.entries(tokens).map(([key, value]) => [`--cm-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value]));
  return {...cm,"--app-background":tokens.background,"--panel-background":tokens.panel,"--panel-secondary":tokens.surface,"--floating-background":tokens.floatingBackground,"--canvas-surround":tokens.canvasSurround,"--border":tokens.border,"--border-strong":tokens.borderStrong,"--text-primary":tokens.text,"--text-secondary":tokens.textMuted,"--text-muted":tokens.textFaint,"--accent":tokens.accent,"--accent-hover":tokens.accentHover,"--accent-pressed":tokens.accentPressed,"--accent-soft":tokens.accentSoft,"--selection":tokens.selection,"--focus-ring":tokens.focus,"--danger":tokens.danger,"--warning":tokens.warning,"--success":tokens.positive,"--info":tokens.info,"--gradient-start":tokens.gradientStart,"--gradient-middle":tokens.gradientMiddle,"--gradient-end":tokens.gradientEnd,"--scrollbar":tokens.scrollbar,"--scrollbar-hover":tokens.scrollbarHover};
}
