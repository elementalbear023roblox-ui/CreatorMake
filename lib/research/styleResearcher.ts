import { offlineResearch, presetsForRequest, researchQueryFor } from "@/lib/design-intelligence/planner";
import type { ResearchRequest, ResearchResult } from "@/lib/design-intelligence/types";
import { wikipediaSearch } from "./webSearch";

export async function researchStyle(request: ResearchRequest): Promise<ResearchResult> {
  if (request.selectedCount === 1 && /\b(red|blue|green|thicker|thinner|border|opacity)\b/i.test(request.prompt)) return { ...offlineResearch(request), status:"bypassed", summary:"Targeted selected-object edit — external research is unnecessary." };
  const query = researchQueryFor(request); try { const sources = await wikipediaSearch.search(query); if (!sources.length) return offlineResearch(request); const presets = presetsForRequest(request.prompt,request.style); const primary = presets[0]; return { query, status:"researched", searchedAt:Date.now(), sources, matchedPresetIds:presets.map((preset)=>preset.id), summary:`Compared ${sources.length} public reference sources with ${presets.map((preset)=>preset.name).join(" + ")} system rules.`, traits:{ geometry:[primary.geometry.shape,primary.borders.construction,`${primary.geometry.borderLayers} border layer(s)`], colors:[primary.colors.strategy,`accent ${primary.colors.accent}`], typography:[primary.typography.character,primary.typography.scale], effects:[primary.effects.decoration,primary.depth.mode,`gradients ${primary.gradients.default}`], interaction:[primary.button.construction,primary.button.pressed] } }; } catch { return offlineResearch(request); }
}
