export type RobloxSizingMode = "AUTO" | "SCALE" | "OFFSET" | "HYBRID";
export type RobloxVisualMode = "NATIVE" | "ADAPTIVE" | "PIXEL_ACCURATE";
export type RobloxRenderScale = 1 | 2 | 3 | 4 | 6 | 8;
export type RobloxDeployTarget = "STARTER_GUI" | "PLAYER_GUI_PREVIEW";
export type RobloxCompatibilityLevel = "native" | "approximation" | "unsupported";
export type RobloxExportClassification = "NATIVE" | "HYBRID" | "RASTERIZED";
export type RobloxRasterPart = "full" | "background" | "text";
export type RobloxResolution = { label:string;width:number;height:number };
export type RobloxExportOptions = {
  screenGuiName:string;
  sizingMode:RobloxSizingMode;
  resolution:RobloxResolution;
  visualMode:RobloxVisualMode;
  renderScale:RobloxRenderScale;
  imageResampling?:"PERFORMANCE"|"BALANCED"|"BEST_QUALITY";
  effectsQuality?:"PERFORMANCE"|"HIGH"|"ULTRA";
  resetOnSpawn:boolean;
  includeStroke:boolean;
  includeCorners:boolean;
  includeGradients:boolean;
  includeLayouts:boolean;
  includeConstraints:boolean;
};
export type RobloxRenderAssetStatus = "needs-render" | "rendering" | "rendered" | "preview-ready" | "needs-publish" | "needs-mapping" | "mapped" | "dirty" | "error";
export type RobloxRenderAssetRole = "frame-visual" | "text" | "button" | "shape" | "image" | "text-background" | "text-glyphs" | "transformed-text-glyphs";
export type RobloxPixelSample = { label:string;normalizedX:number;normalizedY:number;pixelX:number;pixelY:number;rgba:[number,number,number,number] };
export type RobloxRenderFidelity = {
  matchPercent:number;
  thresholdPercent:number;
  passed:boolean;
  boundsMatch:boolean;
  aspectRatioMatch:boolean;
  transformMatch:boolean;
  alphaEdgeSafety:boolean;
  source:"live-canvas"|"isolated-canvas-renderer";
};
export type RobloxRenderAsset = {
  sourceId:string;
  sourceElementId?:string;
  elementName:string;
  role:RobloxRenderAssetRole;
  classification?:RobloxExportClassification;
  visualPart?:RobloxRasterPart;
  intendedRobloxClass?:string;
  interactionEnabled?:boolean;
  visualHash:string;
  layoutHash:string;
  width:number;
  height:number;
  layoutWidth:number;
  layoutHeight:number;
  renderPixelWidth:number;
  renderPixelHeight:number;
  requestedScale:RobloxRenderScale;
  scale:number;
  internalScale?:number;
  internalRenderPixelWidth?:number;
  internalRenderPixelHeight?:number;
  scaleClamped?:boolean;
  scaleWarning?:string;
  mimeType:"image/png";
  format:"png";
  layoutBounds:{x:number;y:number;width:number;height:number};
  visualBounds:{x:number;y:number;width:number;height:number};
  bounds:{x:number;y:number;width:number;height:number};
  pixelEncoding:"RGBA8_STRAIGHT_ALPHA";
  pixelSamples?:RobloxPixelSample[];
  dataUrl?:string;
  sourceDataUrl?:string;
  differenceDataUrl?:string;
  fidelity?:RobloxRenderFidelity;
  localPath?:string;
  localUrl?:string;
  robloxAssetId?:string;
  renderedAt?:number;
  status:RobloxRenderAssetStatus;
  dirty:boolean;
  error?:string;
};
export type RobloxImageManifestEntry = {
  sourceId:string;
  sourceElementId?:string;
  elementName:string;
  assetFilename:string;
  visualHash:string;
  classification:Exclude<RobloxExportClassification,"NATIVE">;
  visualPart:RobloxRasterPart;
  sourceDimensions:{width:number;height:number};
  croppedPixelDimensions:{width:number;height:number};
  visualBounds:{x:number;y:number;width:number;height:number};
  layoutAspectRatio:number;
  visualAspectRatio:number;
  aspectRatio:number;
  position:{x:number;y:number};
  size:{width:number;height:number};
  parentId:string|null;
  zIndex:number;
  anchorPoint:{x:number;y:number};
  intendedRobloxClass:string;
  interactionEnabled:boolean;
};
export type RobloxCompatibilityIssue = { elementId:string;elementName:string;level:RobloxCompatibilityLevel;feature:string;message:string };
export type RobloxPropertyValue = string|number|boolean|
  {kind:"Color3";r:number;g:number;b:number}|
  {kind:"Vector2";x:number;y:number}|
  {kind:"UDim";scale:number;offset:number}|
  {kind:"UDim2";xScale:number;xOffset:number;yScale:number;yOffset:number}|
  {kind:"Rect";minX:number;minY:number;maxX:number;maxY:number}|
  {kind:"Enum";enumType:string;item:string}|
  {kind:"ColorSequence";keypoints:Array<{time:number;color:{r:number;g:number;b:number}}>}|
  {kind:"NumberSequence";keypoints:Array<{time:number;value:number}>}|
  {kind:"Font";family:string|null;enumName:string;weight:string;style:string};
export type RobloxManifestNode = {
  sourceId:string;
  name:string;
  className:string;
  parentSourceId:string|null;
  properties:Record<string,RobloxPropertyValue>;
  attributes?:Record<string,string|number|boolean>;
  decorators:Array<{className:string;name:string;properties:Record<string,RobloxPropertyValue>}>;
};
export type RobloxManifest = { kind:"project";messageType:"PROJECT_MANIFEST";schema:"creatormake.roblox-manifest";version:1|2;textExportArchitecture?:2|3;projectId:string;projectName:string;manifestVersion:string;projectObjectIds:string[];exportDiagnostics:{projectObjectCount:number;exportedProjectObjectCount:number;exportNodeCount:number;presetsExported:0;presetDefinitionsIncluded:false};screenGuiName:string;deployTarget?:RobloxDeployTarget;screenGuiSettings?:{enabled:boolean;displayOrder:number;ignoreGuiInset:boolean;resetOnSpawn:boolean;zIndexBehavior:"Global"|"Sibling"};referenceResolution:{width:number;height:number};sizingMode:RobloxSizingMode;visualMode?:RobloxVisualMode;renderScale?:RobloxRenderScale;viewportScaleMode?:"FIT";assets?:RobloxRenderAsset[];imageManifest?:RobloxImageManifestEntry[];nodes:RobloxManifestNode[] };

export type RobloxSyncOperation =
  | {type:"create";sourceId:string}
  | {type:"update";sourceId:string;properties:string[]}
  | {type:"delete";sourceId:string}
  | {type:"reparent";sourceId:string;parentSourceId:string|null}
  | {type:"reorder";sourceId:string;index:number}
  | {type:"rename";sourceId:string;name:string};

export const ROBLOX_RESOLUTIONS:RobloxResolution[]=[
  {label:"1920 × 1080",width:1920,height:1080},{label:"1366 × 768",width:1366,height:768},{label:"1280 × 720",width:1280,height:720},{label:"2560 × 1440",width:2560,height:1440},{label:"3840 × 2160",width:3840,height:2160},{label:"Mobile Portrait",width:390,height:844},{label:"Mobile Landscape",width:844,height:390},{label:"Tablet",width:1024,height:768},{label:"Ultrawide",width:3440,height:1440},
];

export const DEFAULT_ROBLOX_EXPORT_OPTIONS:RobloxExportOptions={screenGuiName:"CreatorMakeGui",sizingMode:"AUTO",resolution:ROBLOX_RESOLUTIONS[0],visualMode:"ADAPTIVE",renderScale:2,imageResampling:"BEST_QUALITY",effectsQuality:"HIGH",resetOnSpawn:false,includeStroke:true,includeCorners:true,includeGradients:true,includeLayouts:true,includeConstraints:true};
