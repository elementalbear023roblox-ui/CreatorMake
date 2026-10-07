import { createServer } from "node:http";
import { mkdir, readFile, readdir, unlink, writeFile } from "node:fs/promises";
import { basename, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import sharp from "sharp";
import {
  CREATORMAKE_APP_VERSION,
  CREATORMAKE_BRIDGE_ORIGIN,
  CREATORMAKE_BRIDGE_VERSION,
  CREATORMAKE_PLUGIN_VERSION,
  CREATORMAKE_PRODUCTION_ORIGIN,
  CREATORMAKE_PROTOCOL_VERSION,
} from "../lib/creatormake-version.js";
import { createRobloxImageAsset, publicRobloxPublishingConfig, readRobloxPublishingConfig, waitForRobloxAssetOperation } from "./roblox-open-cloud.mjs";

const bridgeUrl = new URL(CREATORMAKE_BRIDGE_ORIGIN);
const DEFAULT_HOST = bridgeUrl.hostname;
const DEFAULT_PORT = Number(bridgeUrl.port);
const MAX_MANIFEST_BYTES = 100 * 1024 * 1024;
const PIXEL_CHUNK_BYTES = 192 * 1024;
const PROTOCOL_VERSION = CREATORMAKE_PROTOCOL_VERSION;
const REQUIRED_PLUGIN_VERSION = CREATORMAKE_PLUGIN_VERSION;
const PLUGIN_ONLINE_MS = 8_000;
const SYNC_LEASE_MS = 120_000;
const TEXT_EXPORT_ARCHITECTURE = 3;
const DEFAULT_ALLOWED_ORIGINS = [
  "http://127.0.0.1:5173",
  "http://localhost:5173",
  CREATORMAKE_PRODUCTION_ORIGIN,
];
const configuredOrigins=(process.env.CREATORMAKE_TRUSTED_ORIGINS??"").split(",").map((value)=>value.trim()).filter(Boolean).map((value)=>{const url=new URL(value);if(!["http:","https:"].includes(url.protocol)||url.pathname!=="/"||url.search||url.hash)throw new Error(`Invalid CREATORMAKE_TRUSTED_ORIGINS entry: ${value}`);return url.origin;});
const ALLOWED_ORIGINS = new Set([...DEFAULT_ALLOWED_ORIGINS,...configuredOrigins]);

function isLoopbackOrigin(origin) {
  try {
    const url = new URL(origin);
    return ["http:", "https:"].includes(url.protocol)
      && ["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      && url.username === ""
      && url.password === "";
  } catch {
    return false;
  }
}

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.has(origin) || isLoopbackOrigin(origin);
}

function sendJson(response, statusCode, value, origin) {
  const body = JSON.stringify(value);
  const headers = {
    "Cache-Control": "no-store",
    "Content-Length": Buffer.byteLength(body),
    "Content-Type": "application/json; charset=utf-8",
    Vary: "Origin",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  response.writeHead(statusCode, headers);
  response.end(body);
}

const SUPPORTED_NODE_CLASSES = new Set(["Frame", "ImageLabel", "ImageButton", "TextLabel", "TextButton", "TextBox", "ScrollingFrame"]);
const SUPPORTED_DECORATOR_CLASSES = new Set(["UIAspectRatioConstraint", "UICorner", "UIGradient", "UIGridLayout", "UIListLayout", "UIPadding", "UIScale", "UISizeConstraint", "UIStroke", "UITextSizeConstraint"]);
const plainObject = (value) => Boolean(value && typeof value === "object" && !Array.isArray(value));
const manifestFieldError = (node, index, field, reason) => new Error(`Manifest validation failed: Object: ${node?.sourceId || `nodes[${index}]`} | Type: ${node?.attributes?.CreatorMakeElementType || node?.className || "Unknown"} | Field: ${field} | Reason: ${reason}`);

function validateManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Manifest must be a JSON object.");
  }
  if (value.schema !== "creatormake.roblox-manifest" || ![1, 2].includes(value.version)) {
    throw new Error("Manifest must use CreatorMake Roblox UI schema version 1 or 2.");
  }
  if (value.kind === "preset-library") throw new Error("CreatorMake sync error: received preset library instead of project manifest.");
  if (value.kind !== "project" || value.messageType !== "PROJECT_MANIFEST") throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: kind | Reason: only PROJECT_MANIFEST payloads are accepted");
  if (typeof value.projectId !== "string" || value.projectId.trim().length === 0) throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: projectId | Reason: expected the active CreatorMake project id");
  if (typeof value.projectName !== "string" || value.projectName.trim().length === 0) throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: projectName | Reason: expected the active CreatorMake project name");
  if (typeof value.manifestVersion !== "string" || value.manifestVersion.length === 0) throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: manifestVersion | Reason: expected a non-empty version");
  if (!Array.isArray(value.projectObjectIds) || value.projectObjectIds.some((id) => typeof id !== "string" || id.length === 0) || new Set(value.projectObjectIds).size !== value.projectObjectIds.length) throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: projectObjectIds | Reason: expected unique active-project object ids");
  if (!plainObject(value.exportDiagnostics) || value.exportDiagnostics.presetsExported !== 0 || value.exportDiagnostics.presetDefinitionsIncluded !== false) throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: exportDiagnostics | Reason: preset definitions must never be exported");
  if (value.exportDiagnostics.projectObjectCount !== value.projectObjectIds.length) throw new Error("Manifest validation failed: Object: project | Type: ProjectManifest | Field: exportDiagnostics.projectObjectCount | Reason: count must match projectObjectIds");
  if (typeof value.screenGuiName !== "string" || value.screenGuiName.trim().length === 0) {
    throw new Error("Manifest is missing screenGuiName.");
  }
  if (!Array.isArray(value.nodes)) {
    throw new Error("Manifest nodes must be an array.");
  }

  const ids = new Set();
  for (const [index, node] of value.nodes.entries()) {
    if (!plainObject(node)) throw manifestFieldError(node, index, "node", "expected a plain JSON object");
    if (typeof node.sourceId !== "string" || node.sourceId.length === 0) throw manifestFieldError(node, index, "sourceId", "expected a non-empty string");
    if (ids.has(node.sourceId)) throw manifestFieldError(node, index, "sourceId", `duplicate CreatorMakeId ${node.sourceId}`);
    if (typeof node.className !== "string" || !SUPPORTED_NODE_CLASSES.has(node.className)) throw manifestFieldError(node, index, "className", `unsupported Roblox GUI class ${String(node.className)}`);
    if (typeof node.name !== "string" || node.name.length === 0) throw manifestFieldError(node, index, "name", "expected a non-empty string");
    if (node.parentSourceId !== null && node.parentSourceId !== undefined && typeof node.parentSourceId !== "string") throw manifestFieldError(node, index, "parentSourceId", "expected a CreatorMakeId string or null");
    if (!plainObject(node.properties)) throw manifestFieldError(node, index, "properties", "expected a plain JSON object");
    if (node.attributes !== undefined && !plainObject(node.attributes)) throw manifestFieldError(node, index, "attributes", "expected a plain JSON object");
    if (!Array.isArray(node.decorators)) throw manifestFieldError(node, index, "decorators", "expected an array");
    for (const [decoratorIndex, decorator] of node.decorators.entries()) {
      if (!plainObject(decorator) || !SUPPORTED_DECORATOR_CLASSES.has(decorator.className) || !plainObject(decorator.properties)) throw manifestFieldError(node, index, `decorators[${decoratorIndex}]`, "expected a supported Roblox UI decorator with plain properties");
    }
    ids.add(node.sourceId);
  }
  const created = new Set();
  for (const [index, node] of value.nodes.entries()) {
    if (node.parentSourceId && !ids.has(node.parentSourceId)) throw manifestFieldError(node, index, "parentSourceId", `unknown parent ${node.parentSourceId}`);
    if (node.parentSourceId && !created.has(node.parentSourceId)) throw manifestFieldError(node, index, "parentSourceId", `parent ${node.parentSourceId} must appear before its child`);
    created.add(node.sourceId);
  }
  const projectObjectIds = new Set(value.projectObjectIds);
  for (const [index, node] of value.nodes.entries()) {
    if (node.sourceId === "__creatormake_viewport") continue;
    const attributes = node.attributes ?? {};
    const explicitOwner = attributes.CreatorMakeSourceElementId ?? attributes.CreatorMakeLayoutSourceId ?? attributes.CreatorMakeSourceId ?? attributes.CreatorMakeLogicalParentId;
    const ownerId = String(explicitOwner ?? node.sourceId).split("::")[0];
    if (!projectObjectIds.has(ownerId)) throw manifestFieldError(node, index, "sourceId", `object owner ${ownerId} is not in active project ${value.projectId}; preset libraries cannot be imported`);
  }

  const textRoots = value.nodes.filter((node) => ["text", "button"].includes(node.attributes?.CreatorMakeElementType));
  if (textRoots.length > 0 && value.textExportArchitecture !== TEXT_EXPORT_ARCHITECTURE) {
    throw new Error(`TEXT_EXPORT_ARCHITECTURE_OUTDATED: expected ${TEXT_EXPORT_ARCHITECTURE}. Refresh CreatorMake and stage the project again.`);
  }
  if(value.nodes.some((node)=>node.attributes?.CreatorMakeRole==="PixelText"||(node.attributes?.CreatorMakeVisualPart==="text"&&node.className==="ImageLabel"&&node.attributes?.CreatorMakeRole!=="TransformedText")))throw new Error("LEGACY_PIXEL_TEXT_REJECTED: text images are accepted only for explicit shear/perspective TransformedText nodes.");
  for (const root of textRoots) {
    const children = value.nodes.filter((node) => node.parentSourceId === root.sourceId);
    const standaloneNative = ["TextLabel", "TextBox"].includes(root.className) && typeof root.properties?.Text === "string";
    const nativeChild = children.some((node) => ["TextLabel", "TextBox"].includes(node.className) && typeof node.properties?.Text === "string");
    const exactChild = children.some((node) => node.className === "ImageLabel" && node.attributes?.CreatorMakeRole === "TransformedText" && node.attributes?.CreatorMakeRequiresExactTextRaster === true && typeof node.attributes?.CreatorMakeEditableText === "string");
    const combinedVisual = children.some((node) => node.attributes?.CreatorMakeRole === "Visual" || node.attributes?.CreatorMakeVisualPart === "full");
    const rootIndex=value.nodes.indexOf(root);
    if (combinedVisual) throw manifestFieldError(root,rootIndex,"children","LEGACY_TEXT_RASTER_REJECTED: combined _Visual is not valid for split text");
    if (!standaloneNative && !nativeChild && !exactChild) throw manifestFieldError(root,rootIndex,"children","TEXT_INSTANCE_MISSING: expected native editable text or an explicit TransformedText ImageLabel with preserved source text");
  }
  const manifestNodesById=new Map(value.nodes.map((node)=>[node.sourceId,node]));
  for(const [index,node] of value.nodes.entries()){
    if(!["TextLabel","TextButton","TextBox"].includes(node.className))continue;
    const mode=node.attributes?.CreatorMakeTextScaleMode,sourceSize=Number(node.attributes?.CreatorMakeTextSize),exportedSize=Number(node.properties?.TextSize),constraints=node.decorators.filter((decorator)=>decorator.className==="UITextSizeConstraint");
    const inheritedScales=[];let scaleCursor=node,scaleGuard=0;
    while(scaleCursor&&scaleGuard++<value.nodes.length+1){for(const decorator of scaleCursor.decorators??[]){if(decorator.className==="UIScale")inheritedScales.push({name:decorator.name,scale:Number(decorator.properties?.Scale),sourceId:scaleCursor.sourceId});}scaleCursor=scaleCursor.parentSourceId?manifestNodesById.get(scaleCursor.parentSourceId):undefined;}
    const globalScales=inheritedScales.filter((item)=>item.name==="CreatorMakeGlobalScale"),objectScales=inheritedScales.filter((item)=>item.name==="CreatorMakeObjectScale");
    if(mode==="FIXED_DESIGN_SIZE"||mode==="RESPONSIVE_CONSTRAINED"){
      if((value.visualMode==="PIXEL_ACCURATE"||value.visualMode==="ADAPTIVE")&&globalScales.length!==1)throw manifestFieldError(node,index,"decorators",`expected exactly one inherited CreatorMakeGlobalScale, received ${globalScales.length}`);
      if(objectScales.length>1)throw manifestFieldError(node,index,"decorators",`expected at most one inherited CreatorMakeObjectScale, received ${objectScales.length}`);
    }
    if(mode==="FIXED_DESIGN_SIZE"){
      if(node.properties.TextScaled!==false)throw manifestFieldError(node,index,"properties.TextScaled","fixed CreatorMake text must remain false and inherit its shared object/root UIScale hierarchy");
      if(!Number.isFinite(sourceSize)||!Number.isFinite(exportedSize)||Math.abs(sourceSize-exportedSize)>.001)throw manifestFieldError(node,index,"properties.TextSize",`expected exact design-space TextSize ${sourceSize}, received ${exportedSize}`);
      if(constraints.length)throw manifestFieldError(node,index,"decorators","fixed CreatorMake text must not have UITextSizeConstraint");
    }
    if(mode==="RESPONSIVE_CONSTRAINED"){
      if(node.properties.TextScaled!==true)throw manifestFieldError(node,index,"properties.TextScaled","responsive CreatorMake text requires TextScaled=true");
      if(constraints.length!==1)throw manifestFieldError(node,index,"decorators","responsive CreatorMake text requires exactly one UITextSizeConstraint");
    }
    if(node.attributes?.CreatorMakeCaptionLayoutSpace==="LOCAL_CHILD"){
      const safeWidth=Number(node.attributes.CreatorMakeCaptionSafeWidth),safeHeight=Number(node.attributes.CreatorMakeCaptionSafeHeight),minimumWidth=Number(node.attributes.CreatorMakeCaptionMinimumWidth),minimumHeight=Number(node.attributes.CreatorMakeCaptionMinimumHeight),measuredWidth=Number(node.attributes.CreatorMakeMeasuredTextWidth),measuredHeight=Number(node.attributes.CreatorMakeMeasuredTextHeight),glyphSafeX=Number(node.attributes.CreatorMakeGlyphSafeX),glyphSafeY=Number(node.attributes.CreatorMakeGlyphSafeY),declaredOverflow=node.attributes.CreatorMakeTextOverflow===true,size=node.properties?.Size??{};
      if(![safeWidth,safeHeight,minimumWidth,minimumHeight,measuredWidth,measuredHeight,glyphSafeX,glyphSafeY].every(Number.isFinite))throw manifestFieldError(node,index,"attributes","caption safe-region and glyph-metric diagnostics must be finite numbers");
      if((safeWidth<minimumWidth||safeHeight<minimumHeight)&&!declaredOverflow)throw manifestFieldError(node,index,"attributes.CreatorMakeCaptionSafeHeight",`caption safe region ${safeWidth}x${safeHeight} is smaller than required ${minimumWidth}x${minimumHeight}`);
      if((safeWidth+.001<measuredWidth+glyphSafeX*2||safeHeight+.001<measuredHeight+glyphSafeY*2)&&!declaredOverflow)throw manifestFieldError(node,index,"attributes.CreatorMakeMeasuredTextHeight","caption safe region does not fit measured glyphs plus native safety margin");
      if(size.kind!=="UDim2"||Number(size.xOffset)<=0||Number(size.yOffset)<=0)throw manifestFieldError(node,index,"properties.Size","native caption TextLabel must have a non-collapsed rectangular size");
    }
  }
  if ((value.visualMode === "PIXEL_ACCURATE" || value.visualMode === "ADAPTIVE") && !Array.isArray(value.assets)) throw new Error("Manifest validation failed: Object: project | Type: ScreenGui | Field: assets | Reason: rendered visual mode requires an asset array");
  for (const [index, asset] of (value.assets ?? []).entries()) {
    if (!plainObject(asset)) throw new Error(`Manifest validation failed: Object: assets[${index}] | Type: ImageAsset | Field: asset | Reason: expected a plain JSON object`);
    if (typeof asset.sourceId !== "string" || asset.sourceId.length === 0) throw new Error(`Manifest validation failed: Object: assets[${index}] | Type: ImageAsset | Field: sourceId | Reason: expected a non-empty string`);
    if (typeof asset.visualHash !== "string" || asset.visualHash.length === 0) throw new Error(`Manifest validation failed: Object: ${asset.sourceId} | Type: ImageAsset | Field: visualHash | Reason: expected a non-empty string`);
  }
  return value;
}

const safeSegment = (value) => String(value || "asset").replace(/[^a-z0-9_-]+/gi, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "asset";
const validAssetId = (value) => /^rbxassetid:\/\/\d+$/.test(value ?? "");
const assetMappingKey = (screenGuiName, sourceId, visualHash) => `${screenGuiName}:${sourceId}:${visualHash}`;
const visualMappingKey = (screenGuiName, visualHash) => `${screenGuiName}:visual:${visualHash}`;

function applyAssetMappings(manifest, mappingCache, incoming = []) {
  if (!manifest) return 0;
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  for (const mapping of incoming) {
    if (!mapping || typeof mapping.sourceId !== "string" || typeof mapping.visualHash !== "string" || !validAssetId(mapping.robloxAssetId)) {
      throw new Error("Every asset mapping needs sourceId, visualHash, and a real rbxassetid:// number.");
    }
    mappingCache.set(assetMappingKey(manifest.screenGuiName, mapping.sourceId, mapping.visualHash), mapping.robloxAssetId);
    mappingCache.set(visualMappingKey(manifest.screenGuiName, mapping.visualHash), mapping.robloxAssetId);
  }
  let mapped = 0;
  for (const asset of assets) {
    const cached = mappingCache.get(assetMappingKey(manifest.screenGuiName, asset.sourceId, asset.visualHash))
      ?? mappingCache.get(visualMappingKey(manifest.screenGuiName, asset.visualHash));
    const assetId = validAssetId(asset.robloxAssetId) ? asset.robloxAssetId : cached;
    if (!validAssetId(assetId)) continue;
    asset.robloxAssetId = assetId;
    asset.status = "mapped";
    asset.dirty = false;
    mapped += 1;
    for (const node of manifest.nodes) {
      const attributes = node.attributes ?? {};
      if ((node.className === "ImageLabel" || node.className === "ImageButton") && attributes.CreatorMakeSourceId === asset.sourceId && attributes.CreatorMakeVisualHash === asset.visualHash) {
        node.properties.Image = assetId;
        node.attributes = { ...attributes, CreatorMakeAssetStatus: "mapped" };
      }
    }
  }
  refreshManifestDiagnostics(manifest);
  return mapped;
}

function refreshManifestDiagnostics(manifest) {
  if (!manifest) return;
  const assets = Array.isArray(manifest.assets) ? manifest.assets : [];
  const unmappedAssets = assets.filter((asset) => !validAssetId(asset.robloxAssetId)).length;
  const unstagedAssets = assets.filter((asset) => !asset.localPath && !validAssetId(asset.robloxAssetId)).length;
  manifest.importDiagnostics = {
    schemaVersion: "valid",
    project: "valid",
    instances: "valid",
    assets: Array.isArray(manifest.assets) || (manifest.visualMode !== "PIXEL_ACCURATE" && manifest.visualMode !== "ADAPTIVE") ? "valid" : "missing",
    unmappedAssets,
    previewOnlyAssets: unmappedAssets,
    needsPublish: unmappedAssets,
    previewReady: unstagedAssets === 0,
    readyForImport: unstagedAssets === 0,
    reason: unstagedAssets > 0 ? "RENDERED_PNG_REQUIRED" : unmappedAssets > 0 ? "STUDIO_PREVIEW_READY" : "READY",
  };
}

function createBasicTestManifest() {
  return {
    kind: "project",
    messageType: "PROJECT_MANIFEST",
    schema: "creatormake.roblox-manifest",
    version: 1,
    protocolVersion: PROTOCOL_VERSION,
    schemaVersion: 1,
    projectId: "creatormake-connection-test",
    projectName: "CreatorMake Connection Test",
    manifestVersion: "connection-test:1",
    projectObjectIds: ["creatormake-connection-frame"],
    exportDiagnostics: { projectObjectCount: 1, exportedProjectObjectCount: 1, exportNodeCount: 1, presetsExported: 0, presetDefinitionsIncluded: false },
    screenGuiName: "CreatorMakeConnectionTest",
    referenceResolution: { width: 1280, height: 720 },
    sizingMode: "AUTO",
    visualMode: "NATIVE",
    nodes: [{
      sourceId: "creatormake-connection-frame",
      name: "ConnectionFrame",
      className: "Frame",
      parentSourceId: null,
      properties: {
        Position: { kind: "UDim2", xScale: 0, xOffset: 24, yScale: 0, yOffset: 24 },
        Size: { kind: "UDim2", xScale: 0, xOffset: 240, yScale: 0, yOffset: 120 },
        BackgroundColor3: { kind: "Color3", r: 104, g: 79, b: 242 },
        BorderSizePixel: 0,
      },
      attributes: { CreatorMakeDiagnostic: true },
      decorators: [{
        className: "UICorner",
        name: "Corner",
        properties: { CornerRadius: { kind: "UDim", scale: 0, offset: 10 } },
      }],
    }],
    assets: [],
    importDiagnostics: {
      schemaVersion: "valid",
      project: "valid",
      instances: "valid",
      assets: "valid",
      unmappedAssets: 0,
      previewOnlyAssets: 0,
      needsPublish: 0,
      previewReady: true,
      readyForImport: true,
      reason: "READY",
    },
  };
}

function createSyncPlan(manifest, previousManifest) {
  const assets = Array.isArray(manifest?.assets) ? manifest.assets : [];
  const uniqueVisuals = new Map();
  for (const asset of assets) {
    const entry = uniqueVisuals.get(asset.visualHash);
    if (!entry || (!validAssetId(entry.robloxAssetId) && validAssetId(asset.robloxAssetId))) uniqueVisuals.set(asset.visualHash, asset);
  }
  const before = new Map((previousManifest?.nodes ?? []).map((node) => [node.sourceId, JSON.stringify(node)]));
  const afterIds = new Set((manifest?.nodes ?? []).map((node) => node.sourceId));
  const changedNodes = (manifest?.nodes ?? []).filter((node) => before.get(node.sourceId) !== JSON.stringify(node)).length;
  const deletedNodes = [...before.keys()].filter((sourceId) => !afterIds.has(sourceId)).length;
  const publishAssets = [...uniqueVisuals.values()].filter((asset) => !validAssetId(asset.robloxAssetId)).length;
  const previousVisuals = new Set((previousManifest?.assets ?? []).map((asset) => asset.visualHash));
  const changedVisuals = [...uniqueVisuals.keys()].filter((visualHash) => !previousVisuals.has(visualHash)).length;
  return {
    nodes: manifest?.nodes?.length ?? 0,
    totalAssets: assets.length,
    uniqueVisuals: uniqueVisuals.size,
    previewAssets: uniqueVisuals.size,
    changedVisuals,
    publishAssets,
    publishedAssets: uniqueVisuals.size - publishAssets,
    reusedAssets: assets.length - uniqueVisuals.size,
    changedNodes,
    deletedNodes,
  };
}

function verifyRgbaSamples(asset, data, width, height) {
  const expected = Array.isArray(asset?.pixelSamples) ? asset.pixelSamples : [];
  if (!expected.length) return { sampleMatch: true, samplesChecked: 0, maxChannelDifference: 0, averageChannelDifference: 0 };
  let maximum = 0;
  let total = 0;
  let channels = 0;
  const samples = expected.map((sample) => {
    const pixelX = Math.max(0, Math.min(width - 1, Math.round(Number(sample.normalizedX) * (width - 1))));
    const pixelY = Math.max(0, Math.min(height - 1, Math.round(Number(sample.normalizedY) * (height - 1))));
    const index = (pixelY * width + pixelX) * 4;
    const actual = [data[index], data[index + 1], data[index + 2], data[index + 3]];
    const expectedRgba = Array.isArray(sample.rgba) ? sample.rgba : [];
    const differences = actual.map((value, channel) => Math.abs(value - Number(expectedRgba[channel] ?? value)));
    for (const difference of differences) { maximum = Math.max(maximum, difference); total += difference; channels += 1; }
    return { label: sample.label, normalizedX: sample.normalizedX, normalizedY: sample.normalizedY, expected: expectedRgba, actual, differences };
  });
  return { sampleMatch: maximum === 0, samplesChecked: samples.length, maxChannelDifference: maximum, averageChannelDifference: channels ? total / channels : 0, samples };
}

function createLayoutDiagnostics(manifest) {
  const assets = new Map();
  for (const asset of manifest?.assets ?? []) {
    const sourceElementId=asset.sourceElementId??asset.sourceId,current=assets.get(sourceElementId);
    if(!current||asset.visualPart==="background"||asset.visualPart==="full")assets.set(sourceElementId,asset);
  }
  const nodes = new Map((manifest?.nodes ?? []).map((node) => [node.sourceId, node]));
  return (manifest?.nodes ?? []).filter((node) => node.attributes?.CreatorMakeLayoutWidth !== undefined && !String(node.sourceId ?? "").includes("::")).map((node) => {
    const asset = assets.get(node.attributes.CreatorMakeLayoutSourceId ?? node.attributes.CreatorMakeSourceId ?? node.sourceId);
    const parent = nodes.get(node.parentSourceId);
    const parentWidth = Number(parent?.attributes?.CreatorMakeLayoutWidth ?? manifest.referenceResolution?.width ?? 1);
    const parentHeight = Number(parent?.attributes?.CreatorMakeLayoutHeight ?? manifest.referenceResolution?.height ?? 1);
    const position = node.properties?.Position ?? {};
    const size = node.properties?.Size ?? {};
    const anchor = node.properties?.AnchorPoint ?? {};
    const width = Number(size.xScale ?? 0) * parentWidth + Number(size.xOffset ?? 0);
    const height = Number(size.yScale ?? 0) * parentHeight + Number(size.yOffset ?? 0);
    const x = Number(position.xScale ?? 0) * parentWidth + Number(position.xOffset ?? 0) - Number(anchor.x ?? 0) * width;
    const y = Number(position.yScale ?? 0) * parentHeight + Number(position.yOffset ?? 0) - Number(anchor.y ?? 0) * height;
    const visualNode=(manifest?.nodes??[]).find((candidate)=>candidate.parentSourceId===node.sourceId&&["Visual","BackgroundImage","Background","PixelText","TextImage","TransformedText"].includes(candidate.attributes?.CreatorMakeRole));
    const visualPosition=visualNode?.properties?.Position??{},visualSize=visualNode?.properties?.Size??{};
    const visualX=Number(visualPosition.xScale??0)*width+Number(visualPosition.xOffset??0),visualY=Number(visualPosition.yScale??0)*height+Number(visualPosition.yOffset??0),visualWidth=Number(visualSize.xScale??0)*width+Number(visualSize.xOffset??0),visualHeight=Number(visualSize.yScale??0)*height+Number(visualSize.yOffset??0);
    return {
      name: node.name,
      sourceId: node.sourceId,
      exportAs: node.attributes?.CreatorMakeExportMode ?? "AUTO",
      resolvedArchitecture: node.attributes?.CreatorMakeVisualArchitecture ?? "LEGACY_INFERRED",
      requiresVisualWrapper: node.attributes?.CreatorMakeNeedsVisualWrapper === true,
      hasInnerVisual: Boolean(visualNode),
      validation: node.attributes?.CreatorMakeExpectsVisualChild === true && !visualNode ? "FAIL" : "PASS",
      layout: {
        x: node.attributes.CreatorMakeLayoutX,
        y: node.attributes.CreatorMakeLayoutY,
        width: node.attributes.CreatorMakeLayoutWidth,
        height: node.attributes.CreatorMakeLayoutHeight,
        aspect: node.attributes.CreatorMakeLayoutAspect,
      },
      visual: {offsetX:asset?.visualBounds?.x??node.attributes.CreatorMakeVisualOffsetX??0,offsetY:asset?.visualBounds?.y??node.attributes.CreatorMakeVisualOffsetY??0,width:asset?.visualBounds?.width??node.attributes.CreatorMakeVisualWidth??width,height:asset?.visualBounds?.height??node.attributes.CreatorMakeVisualHeight??height},
      raster: { scale:asset?.scale??0,pixelWidth: asset?.renderPixelWidth ?? 0,pixelHeight: asset?.renderPixelHeight ?? 0,alphaEdgeSafety:asset?.fidelity?.alphaEdgeSafety??node.attributes.CreatorMakeAlphaEdgeSafety??false },
      robloxContainer: { x, y, width, height, aspect: width / Math.max(1, height) },
      robloxVisual: visualNode?{x:visualX,y:visualY,width:visualWidth,height:visualHeight}:null,
    };
  });
}

function createTextScaleDiagnostics(manifest){
  const nodes=new Map((manifest?.nodes??[]).map((node)=>[node.sourceId,node])),reference=manifest?.referenceResolution??{},viewport=(manifest?.nodes??[]).find((node)=>node.attributes?.CreatorMakeRole==="Viewport");
  return (manifest?.nodes??[]).filter((node)=>["TextLabel","TextButton","TextBox"].includes(node.className)).map((node)=>{
    const scales=[];let cursor=node,guard=0;while(cursor&&guard++<(manifest.nodes?.length??0)+1){for(const decorator of cursor.decorators??[]){if(decorator.className==="UIScale")scales.push({name:decorator.name,scale:Number(decorator.properties?.Scale),sourceId:cursor.sourceId});}cursor=cursor.parentSourceId?nodes.get(cursor.parentSourceId):undefined;}
    const font=node.properties?.FontFace??{},constraints=(node.decorators??[]).filter((decorator)=>decorator.className==="UITextSizeConstraint");
    return{name:node.name,sourceId:node.sourceId,creatorMakeTextSize:node.attributes?.CreatorMakeTextSize,exportedTextSize:node.properties?.TextSize,textScaled:node.properties?.TextScaled,textSizeConstraints:constraints.length,measuredGlyphs:{width:node.attributes?.CreatorMakeMeasuredTextWidth,height:node.attributes?.CreatorMakeMeasuredTextHeight},safeRegion:{width:node.attributes?.CreatorMakeCaptionSafeWidth,height:node.attributes?.CreatorMakeCaptionSafeHeight,minimumWidth:node.attributes?.CreatorMakeCaptionMinimumWidth,minimumHeight:node.attributes?.CreatorMakeCaptionMinimumHeight,glyphSafeX:node.attributes?.CreatorMakeGlyphSafeX,glyphSafeY:node.attributes?.CreatorMakeGlyphSafeY,usedFallback:node.attributes?.CreatorMakeCaptionUsedFallback,fallbackReason:node.attributes?.CreatorMakeCaptionFallbackReason,overflow:node.attributes?.CreatorMakeTextOverflow},creatorMakeTextBox:{x:node.attributes?.CreatorMakeTextBoundsX,y:node.attributes?.CreatorMakeTextBoundsY,width:node.attributes?.CreatorMakeTextBoundsWidth,height:node.attributes?.CreatorMakeTextBoundsHeight},creatorMakeParentBox:{width:node.attributes?.CreatorMakeBackgroundLogicalWidth,height:node.attributes?.CreatorMakeBackgroundLogicalHeight},referenceViewport:{width:reference.width,height:reference.height},robloxViewport:{width:viewport?.attributes?.CreatorMakeViewportWidth??"runtime",height:viewport?.attributes?.CreatorMakeViewportHeight??"runtime"},editorZoom:"not exported; intentionally ignored",rootUIScale:scales.find((item)=>item.name==="CreatorMakeGlobalScale")?.scale??null,objectScale:node.attributes?.CreatorMakeObjectScale??scales.find((item)=>item.name==="CreatorMakeObjectScale")?.scale??1,parentUIScales:scales,fontFace:font.family??font.enumName??null,fontWeight:font.weight??node.attributes?.CreatorMakeFontWeight??null,robloxParent:node.parentSourceId,rasterScale:node.attributes?.CreatorMakeRasterScale??1};
  });
}

async function persistRenderedAssets(manifest, outputRoot) {
  const stored = structuredClone(manifest);
  stored.protocolVersion = PROTOCOL_VERSION;
  stored.schemaVersion = stored.version;
  refreshManifestDiagnostics(stored);
  const assets = Array.isArray(stored.assets) ? stored.assets : [];
  if (!assets.length) return stored;
  const projectDirectory = join(outputRoot, safeSegment(stored.screenGuiName));
  await mkdir(projectDirectory, { recursive: true });
  const retainedFiles = new Set();
  for (const asset of assets) {
    if (!asset || typeof asset.sourceId !== "string" || typeof asset.visualHash !== "string") throw new Error("Every rendered asset needs sourceId and visualHash fields.");
    if (asset.dataUrl) {
      const match = String(asset.dataUrl).match(/^data:image\/png;base64,([a-z0-9+/=]+)$/i);
      if (!match) throw new Error(`Rendered asset ${asset.sourceId} is not a valid PNG data URL.`);
      const filename = `${safeSegment(asset.elementName)}-${safeSegment(asset.sourceId)}-${safeSegment(asset.visualHash)}@${asset.scale || 1}x.png`;
      const filePath = join(projectDirectory, basename(filename));
      await writeFile(filePath, Buffer.from(match[1], "base64"));
      asset.localPath = relative(process.cwd(), filePath).split(sep).join("/");
      asset.localUrl = `/assets/${encodeURIComponent(safeSegment(stored.screenGuiName))}/${encodeURIComponent(basename(filename))}`;
      delete asset.dataUrl;
    }
    if (asset.localPath) retainedFiles.add(basename(asset.localPath));
    asset.dirty = false;
    asset.status = validAssetId(asset.robloxAssetId) ? "mapped" : asset.localPath ? "needs-publish" : asset.status;
  }
  for (const filename of await readdir(projectDirectory)) {
    if (filename.toLowerCase().endsWith(".png") && !retainedFiles.has(filename)) await unlink(join(projectDirectory, filename));
  }
  return stored;
}

async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_MANIFEST_BYTES) {
      throw new Error("Manifest exceeds the 5 MB local-sync limit.");
    }
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function isCreatorMakeServerRunning(url) {
  try {
    const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1_500) });
    if (!response.ok) return false;
    const health = await response.json();
    return health?.status === "ok"
      && health?.app === "CreatorMake"
      && health?.bridgeVersion === CREATORMAKE_BRIDGE_VERSION
      && health?.protocolVersion === PROTOCOL_VERSION;
  } catch {
    return false;
  }
}

export async function startStudioSyncServer({
  host = DEFAULT_HOST,
  port = DEFAULT_PORT,
  quiet = false,
  outputDir = resolve(process.cwd(), "creatormake-rendered"),
  publishingEnvironment = process.env,
  openCloudFetch = fetch,
  publishingSleep,
} = {}) {
  let currentManifest = null;
  let currentManifestRevision = 0;
  let lastSuccessfulManifest = null;
  let lastUpdatedAt = null;
  let syncSequence = 0;
  let syncJob = null;
  let publishSequence = 0;
  let publishingJob = null;
  const mappingCache = new Map();
  const pixelCache = new Map();
  const pluginSessions = new Map();
  const requestedUrl = `http://${host}:${port}`;
  const publishingConfig = readRobloxPublishingConfig(publishingEnvironment);
  const mappingFile = join(outputDir, "asset-mappings.json");

  await mkdir(outputDir, { recursive: true });
  try {
    const entries = JSON.parse(await readFile(mappingFile, "utf8"));
    if (Array.isArray(entries)) for (const entry of entries) {
      if (Array.isArray(entry) && typeof entry[0] === "string" && validAssetId(entry[1])) mappingCache.set(entry[0], entry[1]);
    }
  } catch (error) {
    if (error?.code !== "ENOENT" && !quiet) console.warn(`[CreatorMake] Ignoring invalid asset mapping cache: ${error instanceof Error ? error.message : String(error)}`);
  }

  const persistMappingCache = () => writeFile(mappingFile, JSON.stringify([...mappingCache.entries()], null, 2));

  const activePlugins = () => {
    const threshold = Date.now() - PLUGIN_ONLINE_MS;
    for (const [instanceId, session] of pluginSessions) if (session.lastSeenMs < threshold) pluginSessions.delete(instanceId);
    return [...pluginSessions.values()];
  };
  const publicSyncJob = () => syncJob ? {
    id: syncJob.id,
    mode: syncJob.mode,
    status: syncJob.status,
    message: syncJob.message,
    error: syncJob.error,
    requestedAt: syncJob.requestedAt,
    startedAt: syncJob.startedAt,
    completedAt: syncJob.completedAt,
    claimedBy: syncJob.claimedBy,
    plan: syncJob.plan,
    result: syncJob.result,
  } : null;
  const publicPublishingJob = () => publishingJob ? {
    id: publishingJob.id,
    status: publishingJob.status,
    message: publishingJob.message,
    error: publishingJob.error,
    total: publishingJob.total,
    completed: publishingJob.completed,
    published: publishingJob.published,
    reused: publishingJob.reused,
    requestedAt: publishingJob.requestedAt,
    completedAt: publishingJob.completedAt,
  } : null;
  const publishingSummary = () => {
    const assets = currentManifest?.assets ?? [];
    const unique = new Map();
    for (const asset of assets) if (!unique.has(asset.visualHash) || validAssetId(asset.robloxAssetId)) unique.set(asset.visualHash, asset);
    const needsPublish = [...unique.values()].filter((asset) => !validAssetId(asset.robloxAssetId)).length;
    return {
      config: publicRobloxPublishingConfig(publishingConfig),
      totalAssets: assets.length,
      uniqueVisuals: unique.size,
      needsPublish,
      publishedVisuals: unique.size - needsPublish,
      previewOnlyAssets: assets.filter((asset) => !validAssetId(asset.robloxAssetId)).length,
      job: publicPublishingJob(),
    };
  };
  const queueStudioSync = (mode, message) => {
    if (syncJob && ["pending", "running"].includes(syncJob.status)) return false;
    syncJob = {
      id: `sync-${Date.now().toString(36)}-${(++syncSequence).toString(36)}`,
      mode,
      status: "pending",
      message,
      error: null,
      requestedAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      claimedBy: null,
      leaseUntilMs: 0,
      plan: createSyncPlan(currentManifest, lastSuccessfulManifest),
      result: null,
    };
    return true;
  };
  const publishCurrentAssets = async () => {
    const job = publishingJob;
    if (!job || !currentManifest) return;
    job.status = "running";
    try {
      const unique = new Map();
      for (const asset of currentManifest.assets ?? []) if (!validAssetId(asset.robloxAssetId) && !unique.has(asset.visualHash)) unique.set(asset.visualHash, asset);
      job.total = unique.size;
      let index = 0;
      for (const asset of unique.values()) {
        index += 1;
        job.message = `Publishing ${index}/${job.total}: ${asset.elementName || asset.sourceId}`;
        if (!asset.localPath) throw new Error(`Rendered PNG is not staged for ${asset.elementName || asset.sourceId}.`);
        const filePath = resolve(outputDir, safeSegment(currentManifest.screenGuiName), basename(asset.localPath));
        const allowedRoot = `${resolve(outputDir)}${sep}`;
        if (!filePath.startsWith(allowedRoot)) throw new Error("Invalid rendered asset path.");
        const operation = await createRobloxImageAsset({
          pngBytes: new Uint8Array(await readFile(filePath)),
          filename: basename(filePath),
          displayName: asset.elementName,
          config: publishingConfig,
          fetchImpl: openCloudFetch,
        });
        const result = await waitForRobloxAssetOperation(operation.path, {
          config: publishingConfig,
          fetchImpl: openCloudFetch,
          ...(publishingSleep ? { sleep: publishingSleep } : {}),
        });
        const mappings = (currentManifest.assets ?? [])
          .filter((candidate) => candidate.visualHash === asset.visualHash)
          .map((candidate) => ({ sourceId: candidate.sourceId, visualHash: candidate.visualHash, robloxAssetId: result.robloxAssetId }));
        applyAssetMappings(currentManifest, mappingCache, mappings);
        await persistMappingCache();
        job.completed += 1;
        job.published += 1;
        job.reused += Math.max(0, mappings.length - 1);
      }
      job.status = "completed";
      job.completedAt = new Date().toISOString();
      job.message = job.total === 0 ? "All visual hashes already have permanent Roblox IDs." : `Published ${job.published} unique visual asset(s).`;
      lastUpdatedAt = new Date().toISOString();
      queueStudioSync("install-starter-gui", "Waiting for Studio to install the managed ScreenGui in StarterGui for every player.");
    } catch (error) {
      job.status = "failed";
      job.completedAt = new Date().toISOString();
      job.error = error instanceof Error ? error.message : "Roblox Open Cloud publishing failed.";
      job.message = "Publishing stopped.";
    }
  };
  const notePlugin = (body) => {
    if (!body || typeof body.instanceId !== "string" || body.instanceId.length < 8 || typeof body.pluginVersion !== "number") {
      throw new Error("Plugin heartbeat requires instanceId and pluginVersion.");
    }
    const session = {
      instanceId: body.instanceId.slice(0, 100),
      pluginVersion: body.pluginVersion,
      protocolVersion: typeof body.protocolVersion === "number" ? body.protocolVersion : null,
      appVersion: typeof body.appVersion === "string" ? body.appVersion.slice(0, 40) : null,
      status: typeof body.status === "string" ? body.status.slice(0, 80) : "idle",
      placeId: typeof body.placeId === "number" ? body.placeId : null,
      lastSeenAt: new Date().toISOString(),
      lastSeenMs: Date.now(),
    };
    pluginSessions.set(session.instanceId, session);
    return session;
  };
  const touchPlugin = (instanceId, status) => {
    const session = pluginSessions.get(instanceId);
    if (!session) return;
    session.status = status;
    session.lastSeenAt = new Date().toISOString();
    session.lastSeenMs = Date.now();
  };

  const server = createServer(async (request, response) => {
    const origin = request.headers.origin;
    const requestUrl = new URL(request.url ?? "/", requestedUrl);

    if (request.method === "OPTIONS") {
      if (origin && !isAllowedOrigin(origin)) {
        sendJson(response, 403, { error: "Origin is not allowed." });
        return;
      }
      response.writeHead(204, {
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Origin": origin ?? "http://127.0.0.1:5173",
        ...(request.headers["access-control-request-private-network"] === "true" ? { "Access-Control-Allow-Private-Network": "true" } : {}),
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      });
      response.end();
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/health") {
      const assets = currentManifest?.assets ?? [];
      const plugins = activePlugins();
      const compatiblePlugin = plugins.find((plugin) => plugin.protocolVersion === PROTOCOL_VERSION && plugin.pluginVersion >= REQUIRED_PLUGIN_VERSION);
      const newestPlugin = plugins.toSorted((left, right) => right.pluginVersion - left.pluginVersion)[0] ?? null;
      const connectionState = syncJob?.status === "failed" ? "SYNC_ERROR"
        : !newestPlugin ? "WAITING_FOR_STUDIO"
        : newestPlugin.pluginVersion < REQUIRED_PLUGIN_VERSION || newestPlugin.protocolVersion === null || newestPlugin.protocolVersion < PROTOCOL_VERSION ? "PLUGIN_OUTDATED"
          : newestPlugin.protocolVersion > PROTOCOL_VERSION ? "CREATORMAKE_UPDATE_REQUIRED"
            : "STUDIO_CONNECTED";
      sendJson(response, 200, {
        ok: true,
        status: "ok",
        app: "CreatorMake",
        service: "CreatorMake Studio Sync",
        appVersion: CREATORMAKE_APP_VERSION,
        bridgeVersion: CREATORMAKE_BRIDGE_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        connectionState,
        pluginOnline: Boolean(compatiblePlugin),
        pluginVersionRequired: REQUIRED_PLUGIN_VERSION,
        plugins: plugins.map(({ instanceId, pluginVersion, protocolVersion, appVersion, status, placeId, lastSeenAt }) => ({ instanceId, pluginVersion, protocolVersion, appVersion, status, placeId, lastSeenAt })),
        manifestReady: currentManifest !== null,
        currentProjectId: currentManifest?.projectId ?? null,
        currentProjectName: currentManifest?.projectName ?? null,
        currentManifestVersion: currentManifest?.manifestVersion ?? null,
        currentManifestRevision,
        currentManifestEndpoint: "/project/current/manifest",
        lastUpdatedAt,
        renderedAssets: assets.filter((asset) => asset.localPath).length,
        unmappedAssets: assets.filter((asset) => !validAssetId(asset.robloxAssetId)).length,
        uploadReady: assets.filter((asset) => asset.localPath && !validAssetId(asset.robloxAssetId)).length,
        previewReady: Boolean(currentManifest?.importDiagnostics?.previewReady),
        lastSuccessfulSyncAt: syncJob?.status === "completed" ? syncJob.completedAt : null,
        publishing: publishingSummary(),
        diagnostics: {
          webApp: "running",
          syncServer: "running",
          appVersion: CREATORMAKE_APP_VERSION,
          bridgeVersion: CREATORMAKE_BRIDGE_VERSION,
          port: activePort || port,
          studio: connectionState,
          pluginVersion: newestPlugin?.pluginVersion ?? null,
          pluginProtocol: newestPlugin?.protocolVersion ?? null,
          pluginAppVersion: newestPlugin?.appVersion ?? null,
          protocol: PROTOCOL_VERSION,
          manifest: currentManifest ? "valid" : "not-staged",
          pixelTransport: currentManifest?.assets?.some((asset) => asset.localPath) ? "ready" : "not-staged",
          studioPreview: currentManifest?.importDiagnostics?.previewReady ? "ready" : "not-staged",
          deployTarget: assets.every((asset) => validAssetId(asset.robloxAssetId)) ? "StarterGui — Every Player" : "StarterGui — Local Studio Import",
          managedScreenGui: currentManifest?.screenGuiName ?? null,
          runtime: "Client",
          multiPlayerReady: assets.every((asset) => validAssetId(asset.robloxAssetId)),
          previewClient: compatiblePlugin ? "connected" : "not-running",
          assetUpload: publishingConfig.configured ? "open-cloud-ready" : "not-configured",
          lastError: syncJob?.status === "failed" ? syncJob.error : publishingJob?.status === "failed" ? publishingJob.error : null,
        },
        sync: publicSyncJob(),
      }, origin);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/publishing/status") {
      sendJson(response, 200, { status: "ok", ...publishingSummary() }, origin);
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/publish") {
      if (origin && !isAllowedOrigin(origin)) {
        sendJson(response, 403, { error: "Origin is not allowed." });
        return;
      }
      if (!currentManifest) {
        sendJson(response, 409, { error: "Stage a CreatorMake project manifest before publishing." }, origin);
        return;
      }
      if (!publishingConfig.configured) {
        sendJson(response, 409, { error: `Roblox publishing is not configured: ${publishingConfig.missing.join(", ")}. Configure the CreatorMake server environment; credentials are never sent to Studio or the browser.` }, origin);
        return;
      }
      if (publishingJob && ["pending", "running"].includes(publishingJob.status)) {
        sendJson(response, 409, { error: `Publishing ${publishingJob.id} is already ${publishingJob.status}.` }, origin);
        return;
      }
      const summary = publishingSummary();
      publishingJob = {
        id: `publish-${Date.now().toString(36)}-${(++publishSequence).toString(36)}`,
        status: "pending",
        message: "Preparing original CreatorMake PNGs for Roblox Open Cloud.",
        error: null,
        total: summary.needsPublish,
        completed: 0,
        published: 0,
        reused: 0,
        requestedAt: new Date().toISOString(),
        completedAt: null,
      };
      sendJson(response, 202, { status: "ok", publishing: publishingSummary() }, origin);
      void publishCurrentAssets();
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/plugin/heartbeat") {
      try {
        const session = notePlugin(await readJsonBody(request));
        sendJson(response, 200, {
          status: "ok",
          app: "CreatorMake",
          service: "CreatorMake Studio Sync",
          appVersion: CREATORMAKE_APP_VERSION,
          bridgeVersion: CREATORMAKE_BRIDGE_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          accepted: session.pluginVersion >= REQUIRED_PLUGIN_VERSION && session.protocolVersion === PROTOCOL_VERSION,
          pluginVersionRequired: REQUIRED_PLUGIN_VERSION,
          connectionState: session.pluginVersion < REQUIRED_PLUGIN_VERSION || session.protocolVersion === null || session.protocolVersion < PROTOCOL_VERSION ? "PLUGIN_OUTDATED" : session.protocolVersion === PROTOCOL_VERSION ? "STUDIO_CONNECTED" : "CREATORMAKE_UPDATE_REQUIRED",
          manifestReady: currentManifest !== null,
          sync: publicSyncJob(),
        }, origin);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid plugin heartbeat." }, origin);
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/sync/claim") {
      try {
        const session = notePlugin(await readJsonBody(request));
        if (session.protocolVersion !== PROTOCOL_VERSION || session.pluginVersion < REQUIRED_PLUGIN_VERSION) {
          const reason = session.pluginVersion < REQUIRED_PLUGIN_VERSION || session.protocolVersion === null || session.protocolVersion < PROTOCOL_VERSION ? "PLUGIN_UPDATE_REQUIRED" : "CREATORMAKE_UPDATE_REQUIRED";
          sendJson(response, 409, { error: reason, pluginProtocolVersion: session.protocolVersion, serverProtocolVersion: PROTOCOL_VERSION, pluginVersionRequired: REQUIRED_PLUGIN_VERSION }, origin);
          return;
        }
        if (!syncJob || ["completed", "failed"].includes(syncJob.status)) {
          sendJson(response, 200, { status: "idle" }, origin);
          return;
        }
        const leaseExpired = !syncJob.leaseUntilMs || syncJob.leaseUntilMs < Date.now();
        if (syncJob.claimedBy && syncJob.claimedBy !== session.instanceId && !leaseExpired) {
          sendJson(response, 200, { status: "busy", jobId: syncJob.id }, origin);
          return;
        }
        syncJob.claimedBy = session.instanceId;
        syncJob.leaseUntilMs = Date.now() + SYNC_LEASE_MS;
        if (syncJob.status === "pending") {
          syncJob.status = "running";
          syncJob.startedAt = new Date().toISOString();
          syncJob.message = "Studio claimed the sync job.";
        }
        sendJson(response, 200, { status: "claimed", jobId: syncJob.id, mode: syncJob.mode, plan: syncJob.plan }, origin);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid sync claim." }, origin);
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/sync/progress") {
      try {
        const body = await readJsonBody(request);
        if (body.messageType !== "PROJECT_SYNC_PROGRESS") throw new Error("Sync progress must use PROJECT_SYNC_PROGRESS.");
        if (!syncJob || body.jobId !== syncJob.id || body.instanceId !== syncJob.claimedBy) throw new Error("Sync progress does not match the active Studio job.");
        touchPlugin(body.instanceId, "syncing");
        syncJob.leaseUntilMs = Date.now() + SYNC_LEASE_MS;
        syncJob.message = typeof body.message === "string" ? body.message.slice(0, 500) : syncJob.message;
        syncJob.result = body.result && typeof body.result === "object" ? body.result : syncJob.result;
        sendJson(response, 200, { status: "ok", sync: publicSyncJob() }, origin);
      } catch (error) {
        sendJson(response, 409, { error: error instanceof Error ? error.message : "Invalid sync progress." }, origin);
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/sync/result") {
      try {
        const body = await readJsonBody(request);
        if (body.messageType !== "PROJECT_SYNC_RESULT") throw new Error("Sync result must use PROJECT_SYNC_RESULT.");
        if (!syncJob || body.jobId !== syncJob.id || body.instanceId !== syncJob.claimedBy) throw new Error("Sync result does not match the active Studio job.");
        touchPlugin(body.instanceId, body.status === "completed" ? "idle" : "error");
        const succeeded = body.status === "completed";
        syncJob.status = succeeded ? "completed" : "failed";
        syncJob.completedAt = new Date().toISOString();
        syncJob.message = typeof body.message === "string" ? body.message.slice(0, 500) : succeeded ? "Studio sync completed." : "Studio sync failed.";
        syncJob.error = succeeded ? null : (typeof body.error === "string" ? body.error.slice(0, 2_000) : "Studio sync failed.");
        syncJob.result = body.result && typeof body.result === "object" ? body.result : syncJob.result;
        syncJob.leaseUntilMs = 0;
        if (succeeded) lastSuccessfulManifest = structuredClone(currentManifest);
        sendJson(response, 200, { status: "ok", sync: publicSyncJob() }, origin);
      } catch (error) {
        sendJson(response, 409, { error: error instanceof Error ? error.message : "Invalid sync result." }, origin);
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/sync/request") {
      if (origin && !isAllowedOrigin(origin)) {
        sendJson(response, 403, { error: "Origin is not allowed." });
        return;
      }
      if (!currentManifest) {
        sendJson(response, 409, { error: "Stage a CreatorMake project manifest before requesting Studio sync." }, origin);
        return;
      }
      if (syncJob && ["pending", "running"].includes(syncJob.status)) {
        sendJson(response, 409, { error: `Sync ${syncJob.id} is already ${syncJob.status}.` }, origin);
        return;
      }
      let body;
      try { body = await readJsonBody(request); } catch (error) { sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid PROJECT_SYNC_REQUEST." }, origin); return; }
      if (body.messageType !== "PROJECT_SYNC_REQUEST" || body.kind !== "project") { sendJson(response, 400, { error: "Studio sync accepts only PROJECT_SYNC_REQUEST messages for kind project." }, origin); return; }
      if (body.projectId !== currentManifest.projectId || body.manifestVersion !== currentManifest.manifestVersion) { sendJson(response, 409, { error: `Sync request project ${String(body.projectId)} does not match current project ${currentManifest.projectId}.` }, origin); return; }
      const mode = body.mode === "install-starter-gui" || body.mode === "apply-published" ? "install-starter-gui" : "preview";
      queueStudioSync(mode, mode === "preview" ? "Waiting for Studio to build the current PlayerGui preview." : "Waiting for Studio to import the managed ScreenGui into StarterGui.");
      sendJson(response, 202, { status: "ok", sync: publicSyncJob() }, origin);
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/asset-pixels") {
      try {
        if (!currentManifest) throw new Error("No CreatorMake manifest is staged.");
        const sourceId = requestUrl.searchParams.get("sourceId") ?? "";
        const visualHash = requestUrl.searchParams.get("visualHash") ?? "";
        const offset = Number.parseInt(requestUrl.searchParams.get("offset") ?? "0", 10);
        const asset = currentManifest.assets?.find((candidate) => candidate.sourceId === sourceId && candidate.visualHash === visualHash);
        if (!asset?.localPath) throw new Error("Rendered asset not found in the current manifest.");
        if (!Number.isSafeInteger(offset) || offset < 0) throw new Error("Invalid pixel offset.");
        const cacheKey = `${sourceId}:${visualHash}`;
        let decoded = pixelCache.get(cacheKey);
        if (!decoded) {
          const filePath = resolve(outputDir, safeSegment(currentManifest.screenGuiName), basename(asset.localPath));
          const allowedRoot = `${resolve(outputDir)}${sep}`;
          if (!filePath.startsWith(allowedRoot)) throw new Error("Invalid rendered asset path.");
          const image = sharp(filePath);
          const sourceInfo = await image.metadata();
          if (!sourceInfo.width || !sourceInfo.height || sourceInfo.width > 8000 || sourceInfo.height > 8000) throw new Error("Rendered image dimensions are invalid for Roblox upload.");
          const resizedForEditableImage = sourceInfo.width > 1024 || sourceInfo.height > 1024;
          const pipeline = resizedForEditableImage
            ? image.resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true, kernel: "lanczos3" })
            : image;
          const result = await pipeline.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
          const expectedBytes = result.info.width * result.info.height * 4;
          if (result.info.channels !== 4 || result.data.length !== expectedBytes) throw new Error("CreatorMake could not produce an exact RGBA8 pixel buffer.");
          const verification = verifyRgbaSamples(asset, result.data, result.info.width, result.info.height);
          if (!resizedForEditableImage && !verification.sampleMatch) throw new Error(`CreatorMake PNG RGBA verification failed for ${asset.elementName ?? asset.sourceId}; maximum channel difference ${verification.maxChannelDifference}.`);
          let opaquePixels = 0;
          let transparentPixels = 0;
          let partialPixels = 0;
          for (let index = 3; index < result.data.length; index += 4) {
            if (result.data[index] === 255) opaquePixels += 1;
            else if (result.data[index] === 0) transparentPixels += 1;
            else partialPixels += 1;
          }
          decoded = {
            data: result.data,
            width: result.info.width,
            height: result.info.height,
            sourceWidth: sourceInfo.width,
            sourceHeight: sourceInfo.height,
            sizingStrategy: resizedForEditableImage ? "fit-within-1024" : "direct",
            channels: result.info.channels,
            pixelFormat: "RGBA8",
            rgbaEncoding: "RGBA8_STRAIGHT_ALPHA",
            alpha: { preserved: true, opaquePixels, transparentPixels, partialPixels },
            verification: resizedForEditableImage ? { ...verification, sampleMatch: false, reason: "SOURCE_EXCEEDED_EDITABLEIMAGE_LIMIT" } : verification,
          };
          pixelCache.set(cacheKey, decoded);
        }
        if (offset > decoded.data.length) throw new Error("Pixel offset is beyond the asset payload.");
        const end = Math.min(decoded.data.length, offset + PIXEL_CHUNK_BYTES);
        const chunk = decoded.data.subarray(offset, end);
        sendJson(response, 200, {
          sourceId,
          visualHash,
          width: decoded.width,
          height: decoded.height,
          sourceWidth: decoded.sourceWidth,
          sourceHeight: decoded.sourceHeight,
          sizingStrategy: decoded.sizingStrategy,
          channels: decoded.channels,
          pixelFormat: decoded.pixelFormat,
          rgbaEncoding: decoded.rgbaEncoding,
          alpha: decoded.alpha,
          verification: decoded.verification,
          offset,
          totalBytes: decoded.data.length,
          dataBase64: chunk.toString("base64"),
          done: end >= decoded.data.length,
        }, origin);
        if (end >= decoded.data.length) pixelCache.delete(cacheKey);
      } catch (error) {
        sendJson(response, 404, { error: error instanceof Error ? error.message : "Rendered pixel data is unavailable." }, origin);
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname.startsWith("/assets/")) {
      try {
        const parts = requestUrl.pathname.split("/").filter(Boolean).map(decodeURIComponent);
        if (parts.length !== 3 || parts[0] !== "assets") throw new Error("Invalid asset path.");
        const filePath = resolve(outputDir, safeSegment(parts[1]), basename(parts[2]));
        const allowedRoot = `${resolve(outputDir)}${sep}`;
        if (!filePath.startsWith(allowedRoot)) throw new Error("Invalid asset path.");
        const body = await readFile(filePath);
        response.writeHead(200, {"Cache-Control":"no-store","Content-Length":body.length,"Content-Type":"image/png",...(origin && isAllowedOrigin(origin) ? {"Access-Control-Allow-Origin":origin} : {})});
        response.end(body);
      } catch {
        sendJson(response, 404, { error: "Rendered asset not found." }, origin);
      }
      return;
    }

    if (request.method === "GET" && requestUrl.pathname === "/basic-test") {
      sendJson(response, 200, createBasicTestManifest(), origin);
      return;
    }

    if (request.method === "DELETE" && requestUrl.pathname === "/project/current/manifest") {
      if (origin && !isAllowedOrigin(origin)) { sendJson(response, 403, { error: "Origin is not allowed." }); return; }
      const unlessProjectId = requestUrl.searchParams.get("unlessProjectId");
      if (!unlessProjectId || currentManifest?.projectId !== unlessProjectId) {
        currentManifest = null;lastSuccessfulManifest = null;syncJob = null;publishingJob = null;lastUpdatedAt = new Date().toISOString();currentManifestRevision += 1;pixelCache.clear();
      }
      sendJson(response, 200, { status: "ok", messageType: "PROJECT_MANIFEST_CLEARED", currentProjectId: currentManifest?.projectId ?? null, currentManifestRevision }, origin);
      return;
    }

    if (request.method === "GET" && ["/project/current/manifest", "/manifest"].includes(requestUrl.pathname)) {
      if (!currentManifest) {
        sendJson(response, 503, {
          error: "No CreatorMake project is currently available for import.",
          hint: "Open the active project in CreatorMake and click Sync to Studio.",
        }, origin);
        return;
      }
      const requestedJobId = requestUrl.searchParams.get("jobId");
      if (requestedJobId && requestedJobId !== syncJob?.id) {
        sendJson(response, 409, { error: "The requested Studio sync job is no longer current." }, origin);
        return;
      }
      sendJson(response, 200, currentManifest, origin);
      return;
    }

    if (request.method === "POST" && ["/project/current/manifest", "/manifest"].includes(requestUrl.pathname)) {
      if (origin && !isAllowedOrigin(origin)) {
        sendJson(response, 403, { error: "Origin is not allowed." });
        return;
      }
      if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, { error: "Content-Type must be application/json." }, origin);
        return;
      }
      if (syncJob && ["pending", "running"].includes(syncJob.status)) {
        sendJson(response, 409, { error: `Wait for Studio sync ${syncJob.id} to finish before staging another project revision.` }, origin);
        return;
      }
      try {
        currentManifest = await persistRenderedAssets(validateManifest(await readJsonBody(request)), outputDir);
        for (const asset of currentManifest.assets ?? []) {
          if (validAssetId(asset.robloxAssetId)) {
            mappingCache.set(assetMappingKey(currentManifest.screenGuiName, asset.sourceId, asset.visualHash), asset.robloxAssetId);
            mappingCache.set(visualMappingKey(currentManifest.screenGuiName, asset.visualHash), asset.robloxAssetId);
          }
        }
        applyAssetMappings(currentManifest, mappingCache);
        await persistMappingCache();
        pixelCache.clear();
        lastUpdatedAt = new Date().toISOString();
        currentManifestRevision += 1;
        const layoutDiagnostics = createLayoutDiagnostics(currentManifest);
        const textScaleDiagnostics = createTextScaleDiagnostics(currentManifest);
        if (!quiet) console.log(`[CreatorMake] PROJECT_MANIFEST staged\nProject: ${currentManifest.projectName}\nProject id: ${currentManifest.projectId}\nProject object count: ${currentManifest.exportDiagnostics.projectObjectCount}\nExport object count: ${currentManifest.exportDiagnostics.exportedProjectObjectCount}\nRoblox node count: ${currentManifest.nodes.length}\nPresets exported: ${currentManifest.exportDiagnostics.presetsExported}\nManifest version: ${currentManifest.manifestVersion}\n${JSON.stringify(currentManifest, null, 2)}`);
        if (!quiet) console.log(`[CreatorMake] Layout / visual / raster diagnostics · reference ${currentManifest.referenceResolution?.width}×${currentManifest.referenceResolution?.height} · global scale mode ${currentManifest.viewportScaleMode??"none"}\n${JSON.stringify(layoutDiagnostics, null, 2)}`);
        if (!quiet) console.log(`[CreatorMake] TEXT EXPORT DEBUG · design TextSize must equal exported TextSize before inherited UIScale\n${JSON.stringify(textScaleDiagnostics, null, 2)}`);
        sendJson(response, 200, {
          status: "ok",
          messageType: "PROJECT_MANIFEST_STORED",
          projectId: currentManifest.projectId,
          projectName: currentManifest.projectName,
          manifestVersion: currentManifest.manifestVersion,
          manifestRevision: currentManifestRevision,
          projectObjectCount: currentManifest.exportDiagnostics.projectObjectCount,
          exportedProjectObjectCount: currentManifest.exportDiagnostics.exportedProjectObjectCount,
          presetsExported: currentManifest.exportDiagnostics.presetsExported,
          nodes: currentManifest.nodes.length,
          assets: currentManifest.assets?.length ?? 0,
          mappedAssets: currentManifest.assets?.filter((asset) => validAssetId(asset.robloxAssetId)).length ?? 0,
          renderedAssets: currentManifest.assets ?? [],
          layoutDiagnostics,
          lastUpdatedAt,
        }, origin);
      } catch (error) {
        sendJson(response, 400, {
          error: error instanceof Error ? error.message : "Invalid manifest.",
        }, origin);
      }
      return;
    }

    if (request.method === "POST" && requestUrl.pathname === "/asset-mappings") {
      if (!String(request.headers["content-type"] ?? "").toLowerCase().startsWith("application/json")) {
        sendJson(response, 415, { error: "Content-Type must be application/json." }, origin);
        return;
      }
      try {
        if (!currentManifest) throw new Error("No CreatorMake manifest is staged.");
        const body = await readJsonBody(request);
        if (body.screenGuiName !== currentManifest.screenGuiName || !Array.isArray(body.mappings)) throw new Error("Mappings do not match the current CreatorMake project.");
        const mappedAssets = applyAssetMappings(currentManifest, mappingCache, body.mappings);
        await persistMappingCache();
        lastUpdatedAt = new Date().toISOString();
        sendJson(response, 200, { status: "ok", mappedAssets, unmappedAssets: (currentManifest.assets?.length ?? 0) - mappedAssets, lastUpdatedAt }, origin);
      } catch (error) {
        sendJson(response, 400, { error: error instanceof Error ? error.message : "Invalid asset mapping update." }, origin);
      }
      return;
    }

    sendJson(response, 404, { error: "Not found." }, origin);
  });

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, resolve);
    });
  } catch (error) {
    if (error?.code === "EADDRINUSE" && await isCreatorMakeServerRunning(requestedUrl)) {
      if (!quiet) console.log(`[CreatorMake] Studio Sync already running at ${requestedUrl}`);
      return { server: null, url: requestedUrl, reused: true };
    }
    throw error;
  }

  const address = server.address();
  const activePort = typeof address === "object" && address ? address.port : port;
  const activeUrl = `http://${host}:${activePort}`;
  if (!quiet) {
    console.log(`[CreatorMake] Studio Sync ready at ${activeUrl}`);
    console.log(`[CreatorMake] App ${CREATORMAKE_APP_VERSION} · Bridge ${CREATORMAKE_BRIDGE_VERSION} · Plugin ${REQUIRED_PLUGIN_VERSION} · Protocol ${PROTOCOL_VERSION}`);
    console.log(`[CreatorMake] Health check: ${activeUrl}/health`);
  }
  return { server, url: activeUrl, reused: false };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invokedPath === import.meta.url) {
  await startStudioSyncServer();
}
