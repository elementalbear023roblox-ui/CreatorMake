import type { EditorProject } from "../editor/types.ts";
import { createRobloxExport } from "./exporter.ts";
import type { RobloxExportOptions, RobloxRenderAsset } from "./types.ts";

const VIEWPORT_SOURCE_ID="__creatormake_viewport";

const nodeOwnerId=(node:ReturnType<typeof createRobloxExport>["manifest"]["nodes"][number])=>{
  const attributes=node.attributes??{};
  const explicit=attributes.CreatorMakeSourceElementId??attributes.CreatorMakeLayoutSourceId??attributes.CreatorMakeSourceId??attributes.CreatorMakeLogicalParentId;
  if(typeof explicit==="string"&&explicit.length>0)return explicit.split("::")[0];
  return node.sourceId.split("::")[0];
};

/**
 * Canonical Roblox export boundary. It accepts one active project document and
 * deliberately has no access to preset, template, component, or asset-library
 * registries. Every exported node must resolve to an element in that document.
 */
export function buildActiveProjectRobloxManifest(project:EditorProject,options:RobloxExportOptions,renderAssets?:RobloxRenderAsset[]){
  if(!project?.id||!project.name||!Array.isArray(project.elements))throw new Error("ACTIVE_PROJECT_MISSING: No CreatorMake project is currently available for import.");
  const output=createRobloxExport(project,options,renderAssets),allowedIds=new Set(project.elements.map((element)=>element.id));
  const foreign=output.manifest.nodes.filter((node)=>node.sourceId!==VIEWPORT_SOURCE_ID&&!allowedIds.has(nodeOwnerId(node)));
  if(foreign.length)throw new Error(`ACTIVE_PROJECT_EXPORT_VIOLATION: ${foreign.map((node)=>`${node.sourceId} (${node.name})`).join(", ")} did not originate in project ${project.id}.`);
  if(output.manifest.kind!=="project"||output.manifest.messageType!=="PROJECT_MANIFEST"||output.manifest.projectId!==project.id)throw new Error("ACTIVE_PROJECT_EXPORT_VIOLATION: the manifest lost its active-project identity.");
  if(output.manifest.exportDiagnostics.presetsExported!==0||output.manifest.exportDiagnostics.presetDefinitionsIncluded)throw new Error("ACTIVE_PROJECT_EXPORT_VIOLATION: preset definitions cannot be exported.");
  return output;
}
