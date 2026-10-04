"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_THEME_ID, INTERFACE_THEMES, WORKSPACE_MODES, buildInterfaceTokens, getTheme, tokensToCssVariables, type AppearanceMode, type DensityMode, type ResolvedAppearance, type ThemeDefinition, type WorkspaceMode } from "@/lib/ui/interface-themes";

export const INTERFACE_SETTINGS_KEY = "creatormake:interface-settings:v1";

export type InterfaceSettings = {
  appearance: AppearanceMode;
  themeId: string;
  density: DensityMode;
  workspaceMode: WorkspaceMode;
  leftPanelWidth: number;
  rightPanelWidth: number;
  favoriteThemeIds: string[];
  recentThemeIds: string[];
  customThemes: ThemeDefinition[];
  inspectorMode: "basic" | "advanced" | "expert" | "master";
  inspectorCollapsed: string[];
  inspectorPinned: string[];
};

export const DEFAULT_INTERFACE_SETTINGS: InterfaceSettings = {
  appearance: "system",
  themeId: DEFAULT_THEME_ID,
  density: "comfortable",
  workspaceMode: "design",
  leftPanelWidth: 244,
  rightPanelWidth: 286,
  favoriteThemeIds: [DEFAULT_THEME_ID, "ocean", "graphite"],
  recentThemeIds: [DEFAULT_THEME_ID],
  customThemes: [],
  inspectorMode: "advanced",
  inspectorCollapsed: [],
  inspectorPinned: [],
};

const isAppearance = (value: unknown): value is AppearanceMode => value === "light" || value === "dark" || value === "system";
const isWorkspace = (value: unknown): value is WorkspaceMode => typeof value === "string" && WORKSPACE_MODES.includes(value as WorkspaceMode);
const loadSettings = (): InterfaceSettings => {
  if (typeof window === "undefined") return DEFAULT_INTERFACE_SETTINGS;
  try {
    const stored = JSON.parse(localStorage.getItem(INTERFACE_SETTINGS_KEY) ?? "{}") as Partial<InterfaceSettings>;
    return {
      ...DEFAULT_INTERFACE_SETTINGS,
      ...stored,
      appearance: isAppearance(stored.appearance) ? stored.appearance : DEFAULT_INTERFACE_SETTINGS.appearance,
      workspaceMode: isWorkspace(stored.workspaceMode) ? stored.workspaceMode : DEFAULT_INTERFACE_SETTINGS.workspaceMode,
      favoriteThemeIds: Array.isArray(stored.favoriteThemeIds) ? stored.favoriteThemeIds : DEFAULT_INTERFACE_SETTINGS.favoriteThemeIds,
      recentThemeIds: Array.isArray(stored.recentThemeIds) ? stored.recentThemeIds.slice(0, 8) : DEFAULT_INTERFACE_SETTINGS.recentThemeIds,
      customThemes: Array.isArray(stored.customThemes) ? stored.customThemes : [],
      inspectorCollapsed: Array.isArray(stored.inspectorCollapsed) ? stored.inspectorCollapsed : [],
      inspectorPinned: Array.isArray(stored.inspectorPinned) ? stored.inspectorPinned : [],
    };
  } catch { return DEFAULT_INTERFACE_SETTINGS; }
};

export function useInterfaceSettings() {
  const [settings, setSettings] = useState<InterfaceSettings>(DEFAULT_INTERFACE_SETTINGS);
  const [systemAppearance, setSystemAppearance] = useState<ResolvedAppearance>("dark");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => { const initialize=window.queueMicrotask(()=>{setSettings(loadSettings());setHydrated(true);}); return()=>void initialize; }, []);
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const sync = () => setSystemAppearance(query.matches ? "dark" : "light");
    sync(); query.addEventListener("change", sync); return () => query.removeEventListener("change", sync);
  }, []);

  const resolvedAppearance: ResolvedAppearance = settings.appearance === "system" ? systemAppearance : settings.appearance;
  const activeTheme = useMemo(() => getTheme(settings.themeId, settings.customThemes), [settings.customThemes, settings.themeId]);
  const tokens = useMemo(() => buildInterfaceTokens(activeTheme, resolvedAppearance), [activeTheme, resolvedAppearance]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(INTERFACE_SETTINGS_KEY, JSON.stringify(settings));
  }, [hydrated, settings]);
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.appearance = resolvedAppearance;
    root.dataset.appearancePreference = settings.appearance;
    root.dataset.interfaceTheme = activeTheme.id;
    root.dataset.density = settings.density;
    root.dataset.workspace = settings.workspaceMode;
    root.style.colorScheme = resolvedAppearance;
    Object.entries(tokensToCssVariables(tokens)).forEach(([name, value]) => root.style.setProperty(name, value));
  }, [activeTheme.id, resolvedAppearance, settings.appearance, settings.density, settings.workspaceMode, tokens]);

  const patch = useCallback((value: Partial<InterfaceSettings> | ((current: InterfaceSettings) => Partial<InterfaceSettings>)) => {
    setSettings((current) => ({ ...current, ...(typeof value === "function" ? value(current) : value) }));
  }, []);
  const selectTheme = useCallback((themeId: string) => patch((current) => ({ themeId, recentThemeIds: [themeId, ...current.recentThemeIds.filter((id) => id !== themeId)].slice(0, 8) })), [patch]);
  const toggleFavoriteTheme = useCallback((themeId: string) => patch((current) => ({ favoriteThemeIds: current.favoriteThemeIds.includes(themeId) ? current.favoriteThemeIds.filter((id) => id !== themeId) : [...current.favoriteThemeIds, themeId] })), [patch]);
  const saveCustomTheme = useCallback((definition: ThemeDefinition) => patch((current) => ({ customThemes: [definition, ...current.customThemes.filter((item) => item.id !== definition.id)], themeId: definition.id, recentThemeIds: [definition.id, ...current.recentThemeIds.filter((id) => id !== definition.id)].slice(0, 8) })), [patch]);
  const cycleAppearance = useCallback(() => patch((current) => ({ appearance: current.appearance === "system" ? "light" : current.appearance === "light" ? "dark" : "system" })), [patch]);

  return { settings, patch, selectTheme, toggleFavoriteTheme, saveCustomTheme, cycleAppearance, resolvedAppearance, activeTheme, themes: [...settings.customThemes, ...INTERFACE_THEMES], hydrated };
}
