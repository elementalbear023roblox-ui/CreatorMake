import sharp from "sharp";
import { CREATORMAKE_BRIDGE_ORIGIN } from "../lib/creatormake-version.js";

const ORIGIN = CREATORMAKE_BRIDGE_ORIGIN;
const SAMPLE_POINTS = [
  ["10%,10%", 0.1, 0.1],
  ["90%,10%", 0.9, 0.1],
  ["10%,90%", 0.1, 0.9],
  ["90%,90%", 0.9, 0.9],
  ["50%,50%", 0.5, 0.5],
];

const udim2 = (xOffset, yOffset, xScale = 0, yScale = 0) => ({ kind: "UDim2", xScale, xOffset, yScale, yOffset });
const vector2 = (x, y) => ({ kind: "Vector2", x, y });
const color3 = (r, g, b) => ({ kind: "Color3", r, g, b });
const enumValue = (enumType, item) => ({ kind: "Enum", enumType, item });
const aspect = (width, height) => ({
  className: "UIAspectRatioConstraint",
  name: "CreatorMakeAspectRatio",
  properties: { AspectRatio: width / height, AspectType: enumValue("AspectType", "ScaleWithParentSize"), DominantAxis: enumValue("DominantAxis", "Width") },
});

async function renderedAsset({ sourceId, elementName, role, layoutWidth, layoutHeight, svg }) {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  const decoded = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const pixelSamples = SAMPLE_POINTS.map(([label, normalizedX, normalizedY]) => {
    const x = Math.round((decoded.info.width - 1) * normalizedX);
    const y = Math.round((decoded.info.height - 1) * normalizedY);
    const offset = (y * decoded.info.width + x) * 4;
    return { label, normalizedX, normalizedY, rgba: Array.from(decoded.data.subarray(offset, offset + 4)) };
  });
  const visualHash = `fidelity-${sourceId}-v1`;
  return {
    sourceId,
    elementName,
    role,
    visualHash,
    layoutHash: `layout-${sourceId}-v1`,
    width: decoded.info.width,
    height: decoded.info.height,
    layoutWidth,
    layoutHeight,
    renderPixelWidth: decoded.info.width,
    renderPixelHeight: decoded.info.height,
    requestedScale: 1,
    scale: 1,
    mimeType: "image/png",
    format: "png",
    pixelEncoding: "RGBA8_STRAIGHT_ALPHA",
    layoutBounds: { x: 0, y: 0, width: layoutWidth, height: layoutHeight },
    visualBounds: { x: 0, y: 0, width: layoutWidth, height: layoutHeight },
    bounds: { x: 0, y: 0, width: layoutWidth, height: layoutHeight },
    pixelSamples,
    status: "needs-render",
    dirty: false,
    dataUrl: `data:image/png;base64,${png.toString("base64")}`,
  };
}

const mainSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="768" height="572" viewBox="0 0 768 572">
  <defs>
    <clipPath id="main"><path d="M38 0H730Q768 0 768 38V365C768 500 690 572 535 572H38Q0 572 0 534V38Q0 0 38 0Z"/></clipPath>
    <radialGradient id="tl" cx="0" cy="0" r="1"><stop stop-color="#71558e"/><stop offset="1" stop-color="#71558e" stop-opacity="0"/></radialGradient>
    <radialGradient id="tr" cx="1" cy="0" r="1"><stop stop-color="#4a8793"/><stop offset="1" stop-color="#4a8793" stop-opacity="0"/></radialGradient>
    <radialGradient id="bl" cx="0" cy="1" r="1"><stop stop-color="#8e3f72"/><stop offset="1" stop-color="#8e3f72" stop-opacity="0"/></radialGradient>
    <radialGradient id="br" cx="1" cy="1" r="1"><stop stop-color="#8d8650"/><stop offset="1" stop-color="#8d8650" stop-opacity="0"/></radialGradient>
  </defs>
  <g clip-path="url(#main)" opacity="0.92">
    <rect width="768" height="572" fill="#292842"/>
    <rect width="768" height="572" fill="url(#tl)"/>
    <rect width="768" height="572" fill="url(#tr)"/>
    <rect width="768" height="572" fill="url(#bl)"/>
    <rect width="768" height="572" fill="url(#br)"/>
  </g>
  <path d="M38 0H730Q768 0 768 38V365C768 500 690 572 535 572H38Q0 572 0 534V38Q0 0 38 0Z" fill="none" stroke="#171625" stroke-width="8"/>
</svg>`;

const titleSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="500" height="110" viewBox="0 0 500 110">
  <defs><linearGradient id="title" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#654c8b"/><stop offset=".48" stop-color="#8b477b"/><stop offset="1" stop-color="#3c8493"/></linearGradient></defs>
  <path d="M8 6H445L494 104H8Z" fill="url(#title)" stroke="#171625" stroke-width="8" stroke-linejoin="round"/>
  <text x="225" y="72" fill="#fff" font-family="Arial Black, sans-serif" font-size="54" font-weight="900" text-anchor="middle">Frame Name</text>
</svg>`;

const closeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="110" viewBox="0 0 120 110">
  <defs><linearGradient id="close" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#7a568e"/><stop offset=".55" stop-color="#b34e79"/><stop offset="1" stop-color="#477f91"/></linearGradient></defs>
  <path d="M25 5H95L115 30V80L95 105H25L5 80V30Z" fill="url(#close)" stroke="#171625" stroke-width="7" stroke-linejoin="round"/>
  <path d="M39 34L81 76M81 34L39 76" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
</svg>`;

const assets = await Promise.all([
  renderedAsset({ sourceId: "fidelity-main", elementName: "MainFrame", role: "frame-visual", layoutWidth: 768, layoutHeight: 572, svg: mainSvg }),
  renderedAsset({ sourceId: "fidelity-title", elementName: "Title", role: "text", layoutWidth: 500, layoutHeight: 110, svg: titleSvg }),
  renderedAsset({ sourceId: "fidelity-close", elementName: "CloseButton", role: "button", layoutWidth: 120, layoutHeight: 110, svg: closeSvg }),
]);
const bySource = Object.fromEntries(assets.map((asset) => [asset.sourceId, asset]));
const commonImage = (sourceId, active = false) => ({
  BackgroundTransparency: 1,
  Image: "",
  ImageColor3: color3(255, 255, 255),
  ImageTransparency: 0,
  ScaleType: enumValue("ScaleType", "Stretch"),
  Active: active,
  Selectable: active,
  ...(active ? { AutoButtonColor: false } : {}),
});
const debug = (x, y, width, height, type, asset) => ({
  CreatorMakeSourceId: asset.sourceId,
  CreatorMakeRole: type === "button" ? "Button" : "Visual",
  CreatorMakeElementType: type,
  CreatorMakeVisualHash: asset.visualHash,
  CreatorMakeLayoutX: x,
  CreatorMakeLayoutY: y,
  CreatorMakeLayoutWidth: width,
  CreatorMakeLayoutHeight: height,
  CreatorMakeLayoutAspect: width / height,
  CreatorMakeRenderPixelWidth: asset.renderPixelWidth,
  CreatorMakeRenderPixelHeight: asset.renderPixelHeight,
  CreatorMakePixelEncoding: "RGBA8_STRAIGHT_ALPHA",
});

const manifest = {
  kind: "project",
  messageType: "PROJECT_MANIFEST",
  schema: "creatormake.roblox-manifest",
  version: 2,
  projectId: "fidelity-regression",
  projectName: "Fidelity Regression",
  guiId: "fidelity-regression:screen",
  manifestVersion: "fidelity-regression:1",
  projectObjectIds: ["fidelity-main", "fidelity-title", "fidelity-close"],
  exportDiagnostics: { projectObjectCount: 3, exportedProjectObjectCount: 3, exportNodeCount: 4, presetsExported: 0, presetDefinitionsIncluded: false },
  screenGuiName: "CreatorMakeFidelityRegression",
  referenceResolution: { width: 1920, height: 1080 },
  sizingMode: "OFFSET",
  visualMode: "PIXEL_ACCURATE",
  renderScale: 1,
  viewportScaleMode: "FIT",
  assets,
  nodes: [
    {
      sourceId: "__creatormake_viewport",
      name: "CreatorMakeViewport",
      className: "Frame",
      parentSourceId: null,
      properties: { Position: udim2(0, 0, 0.5, 0.5), Size: udim2(1920, 1080), AnchorPoint: vector2(0.5, 0.5), Rotation: 0, Visible: true, ZIndex: 1, LayoutOrder: 0, ClipsDescendants: false, BackgroundTransparency: 1, Active: false },
      attributes: { CreatorMakeRole: "Viewport", CreatorMakeReferenceWidth: 1920, CreatorMakeReferenceHeight: 1080, CreatorMakeScaleMode: "FIT" },
      decorators: [{ className: "UIScale", name: "CreatorMakeGlobalScale", properties: { Scale: 1 } }],
    },
    {
      sourceId: "fidelity-main",
      name: "MainFrame",
      className: "Frame",
      parentSourceId: "__creatormake_viewport",
      properties: { Position: udim2(125, 118), Size: udim2(768, 572), AnchorPoint: vector2(0, 0), Rotation: 0, Visible: true, ZIndex: 2, LayoutOrder: 1, ClipsDescendants: false, BackgroundTransparency: 1, Active: false },
      attributes: { CreatorMakeSourceId: "fidelity-main", CreatorMakeRole: "Container", CreatorMakeElementType: "frame", CreatorMakeVisualHash: bySource["fidelity-main"].visualHash, CreatorMakeLayoutX: 125, CreatorMakeLayoutY: 118, CreatorMakeLayoutWidth: 768, CreatorMakeLayoutHeight: 572, CreatorMakeLayoutAspect: 768 / 572, CreatorMakeRenderPixelWidth: 768, CreatorMakeRenderPixelHeight: 572 },
      decorators: [aspect(768, 572)],
    },
    {
      sourceId: "fidelity-main::visual",
      name: "_Visual",
      className: "ImageLabel",
      parentSourceId: "fidelity-main",
      properties: { Position: udim2(0, 0), Size: udim2(0, 0, 1, 1), AnchorPoint: vector2(0, 0), Rotation: 0, Visible: true, ZIndex: 1, LayoutOrder: 0, ClipsDescendants: false, ...commonImage("fidelity-main") },
      attributes: debug(0, 0, 768, 572, "frame", bySource["fidelity-main"]),
      decorators: [],
    },
    {
      sourceId: "fidelity-title",
      name: "Title",
      className: "ImageLabel",
      parentSourceId: "fidelity-main",
      properties: { Position: udim2(-100, -40), Size: udim2(500, 110), AnchorPoint: vector2(0, 0), Rotation: 0, Visible: true, ZIndex: 6, LayoutOrder: 3, ClipsDescendants: false, ...commonImage("fidelity-title") },
      attributes: debug(-100, -40, 500, 110, "text", bySource["fidelity-title"]),
      decorators: [aspect(500, 110)],
    },
    {
      sourceId: "fidelity-close",
      name: "CloseButton",
      className: "ImageButton",
      parentSourceId: "fidelity-main",
      properties: { Position: udim2(720, -30), Size: udim2(120, 110), AnchorPoint: vector2(0, 0), Rotation: 0, Visible: true, ZIndex: 8, LayoutOrder: 4, ClipsDescendants: false, ...commonImage("fidelity-close", true) },
      attributes: debug(720, -30, 120, 110, "button", bySource["fidelity-close"]),
      decorators: [aspect(120, 110)],
    },
  ],
};

const stage = await fetch(`${ORIGIN}/project/current/manifest`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(manifest) });
if (!stage.ok) throw new Error(`Manifest staging failed: ${stage.status} ${await stage.text()}`);
const sync = await fetch(`${ORIGIN}/sync/request`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messageType: "PROJECT_SYNC_REQUEST", kind: "project", projectId: manifest.projectId, manifestVersion: manifest.manifestVersion, mode: "preview" }) });
if (!sync.ok) throw new Error(`Preview queue failed: ${sync.status} ${await sync.text()}`);
console.log(JSON.stringify({ staged: await stage.json(), sync: await sync.json() }, null, 2));
