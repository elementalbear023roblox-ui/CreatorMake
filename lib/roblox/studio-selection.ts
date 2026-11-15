import { createElement, createProject } from "../editor/project.ts";
import { resolveRobloxLayout } from "../editor/roblox-layout.ts";
import type { EditorElement, EditorProject, ElementType } from "../editor/types.ts";
import { ROBLOX_FONT_REGISTRY } from "./fonts.ts";
import { STUDIO_SELECTION_DECORATOR_PROPERTIES, STUDIO_SELECTION_FORMAT, STUDIO_SELECTION_GUI_PROPERTIES } from "./studio-selection-schema.ts";
import type { RobloxExportOptions, RobloxManifestNode, RobloxPropertyValue } from "./types.ts";

type JsonObject = Record<string, unknown>;
const record = (value: unknown): JsonObject | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : undefined;
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
const identifier = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const editorTypes = {
  Frame: "frame", CanvasGroup: "container", ScrollingFrame: "scrolling-frame",
  TextLabel: "text", TextButton: "button", TextBox: "text",
  ImageLabel: "image", ImageButton: "image-button", ViewportFrame: "frame", VideoFrame: "frame",
} satisfies Record<string, ElementType>;

const numericFields = {
  Color3: ["r","g","b"], Vector2: ["x","y"], Vector3: ["x","y","z"],
  UDim: ["scale","offset"], UDim2: ["xScale","xOffset","yScale","yOffset"],
  Rect: ["minX","minY","maxX","maxY"],
};

function safeValue(value: unknown): RobloxPropertyValue | undefined {
  if (typeof value === "string" || typeof value === "boolean" || finite(value)) return value;
  const object = record(value);
  if (!object || typeof object.kind !== "string") return;
  const fields = numericFields[object.kind as keyof typeof numericFields];
  if (Object.hasOwn(numericFields, object.kind) && fields.every((key) => finite(object[key]))) {
    return Object.fromEntries([["kind",object.kind], ...fields.map((key) => [key,object[key]])]) as RobloxPropertyValue;
  }
  if (object.kind === "Enum" && identifier(object.enumType) && identifier(object.item)) {
    return {kind:"Enum",enumType:object.enumType,item:object.item};
  }
  if (object.kind === "Font" && typeof object.family === "string" && identifier(object.weight) && identifier(object.style)) {
    return {kind:"Font",family:object.family,weight:object.weight,style:object.style,enumName:""};
  }
  if ((object.kind !== "ColorSequence" && object.kind !== "NumberSequence")
    || !Array.isArray(object.keypoints) || object.keypoints.length < 2 || object.keypoints.length > 20) return;
  const points = object.keypoints.map(record);
  let previous = -1;
  for (const point of points) {
    if (!point || !finite(point.time) || point.time <= previous || point.time > 1) return;
    previous = point.time;
  }
  if (points[0]?.time !== 0 || previous !== 1) return;
  if (object.kind === "ColorSequence") {
    const keypoints = [];
    for (const point of points) {
      const color = record(point?.color);
      if (!color || !finite(color.r) || !finite(color.g) || !finite(color.b)) return;
      keypoints.push({time:point!.time as number,color:{r:color.r,g:color.g,b:color.b}});
    }
    return {kind:"ColorSequence",keypoints};
  }
  const keypoints = [];
  for (const point of points) {
    if (!point || !finite(point.value) || (point.envelope !== undefined && !finite(point.envelope))) return;
    keypoints.push({time:point.time as number,value:point.value,envelope:point.envelope as number|undefined});
  }
  return {kind:"NumberSequence",keypoints};
}

export function sanitizeStudioProperties(value: unknown, fields: readonly string[]) {
  const input = record(value);
  const properties: Record<string,RobloxPropertyValue> = {};
  for (const field of fields) {
    const property = safeValue(input?.[field]);
    if (property !== undefined) properties[field] = property;
  }
  return properties;
}

export function sanitizeStudioNode(value: unknown): RobloxManifestNode {
  const node = record(value);
  if (!node || typeof node.sourceId !== "string" || !node.sourceId || node.sourceId.includes("::")
    || typeof node.name !== "string" || typeof node.className !== "string" || !Object.hasOwn(editorTypes,node.className)) {
    throw new Error("Studio selection contains an invalid or unsupported GUI object.");
  }
  const properties = sanitizeStudioProperties(node.properties, STUDIO_SELECTION_GUI_PROPERTIES[node.className as keyof typeof editorTypes]);
  const attributes = Object.fromEntries(Object.entries(record(node.attributes) ?? {}).filter(([key,value]) =>
    /^[a-zA-Z_][a-zA-Z_0-9]{0,99}$/.test(key) && !key.startsWith("CreatorMake")
    && (typeof value === "string" || typeof value === "boolean" || finite(value)),
  )) as RobloxManifestNode["attributes"];
  const decorators = (Array.isArray(node.decorators) ? node.decorators : []).flatMap((value) => {
    const decorator = record(value);
    if (!decorator || typeof decorator.className !== "string" || typeof decorator.name !== "string"
      || !Object.hasOwn(STUDIO_SELECTION_DECORATOR_PROPERTIES, decorator.className)) return [];
    return [{
      className:decorator.className,name:decorator.name,
      properties:sanitizeStudioProperties(decorator.properties, STUDIO_SELECTION_DECORATOR_PROPERTIES[decorator.className as keyof typeof STUDIO_SELECTION_DECORATOR_PROPERTIES]),
    }];
  });
  return {
    sourceId:node.sourceId,name:node.name,className:node.className,
    parentSourceId:typeof node.parentSourceId === "string" ? node.parentSourceId : null,properties,attributes,decorators,
  };
}

const number = (value: RobloxPropertyValue | undefined, fallback: number) => finite(value) ? value : fallback;
const item = (value: RobloxPropertyValue | undefined) => typeof value === "object" && value.kind === "Enum" ? value.item : "";
const color = (value: RobloxPropertyValue | undefined, fallback: string) => typeof value === "object" && value.kind === "Color3"
  ? "#" + [value.r,value.g,value.b].map((component) => Math.round(clamp(component,0,255)).toString(16).padStart(2,"0")).join("")
  : fallback;
const zero = {kind:"UDim2" as const,xScale:0,xOffset:0,yScale:0,yOffset:0};
const asUDim2 = (value: RobloxPropertyValue | undefined) => typeof value === "object" && value.kind === "UDim2" ? value : zero;
const asVector = (value: RobloxPropertyValue | undefined) => typeof value === "object" && value.kind === "Vector2" ? value : {x:0,y:0};
const weights = {Thin:100,ExtraLight:200,Light:300,Regular:400,Medium:500,SemiBold:600,Bold:700,ExtraBold:800,Heavy:900};

function gradientOpacity(transparency: RobloxPropertyValue | undefined, time: number) {
  if (typeof transparency!=="object" || transparency.kind!=="NumberSequence") return 100;
  const points=transparency.keypoints;
  const index=points.findIndex((point)=>point.time>=time);
  if(index<=0) return 100*(1-(index===0?points[0].value:points.at(-1)?.value??0));
  const previous=points[index-1], next=points[index];
  const weight=next.time>previous.time?(time-previous.time)/(next.time-previous.time):1;
  return 100*(1-(previous.value+(next.value-previous.value)*weight));
}

export function studioSourceExportOptions(project: EditorProject): Partial<RobloxExportOptions> {
  if (!project.studioSource) return {};
  const settings = project.studioSource.settings;
  return {
    screenGuiName: project.screen.name,
    displayOrder: number(settings.DisplayOrder,0),
    resetOnSpawn: settings.ResetOnSpawn === true,
    zIndexBehavior: item(settings.ZIndexBehavior) === "Sibling" ? "Sibling" : "Global",
  };
}

export const studioEditableFields = [
  "rotation","hidden","clipContent","zIndex","fill","opacity","text","textColor","fontSizeDesign",
  "fontFamily","fontWeight","fontStyle","richText","textSizingMode","textBoxMode","textAlign","verticalAlign",
  "lineHeight","cornerRadius","borderWidth","borderColor","gradientType","gradientAngle","gradientStops",
] as const;

export function studioSelectionToProject(value: unknown) {
  const packet = record(value);
  if (packet?.format !== STUDIO_SELECTION_FORMAT || packet.formatVersion !== 1 || !Array.isArray(packet.nodes)
    || packet.nodes.length === 0 || packet.nodes.length > 10000) throw new Error("Expected a CreatorMake Studio selection export.");
  const project = createProject(typeof packet.name === "string" ? packet.name : "Studio GUI");
  const resolution = record(packet.resolution);
  const width = finite(resolution?.width) ? clamp(Math.round(resolution.width), 1, 10000) : 1920;
  const height = finite(resolution?.height) ? clamp(Math.round(resolution.height), 1, 10000) : 1080;
  project.screen = { ...project.screen, name:project.name, width, height };
  Object.assign(project.exportOptions,{pixelAccurateBackgrounds:"OFF",backgroundExport:"PREFER_NATIVE",referenceResolution:"CUSTOM",customReferenceWidth:width,customReferenceHeight:height});
  const warnings = (Array.isArray(packet.warnings) ? packet.warnings : []).filter((item): item is string => typeof item === "string").slice(0,1000);
  project.studioSource = {settings:sanitizeStudioProperties(packet.settings,STUDIO_SELECTION_GUI_PROPERTIES.ScreenGui),warnings};
  const parents = new Map<string,EditorElement>();
  for (const [index, object] of packet.nodes.entries()) {
    const node = sanitizeStudioNode(object);
    if (parents.has(node.sourceId)) throw new Error("Studio selection contains duplicate GUI identities.");
    const parent = node.parentSourceId ? parents.get(node.parentSourceId) : {x:0,y:0,width,height};
    if (!parent) throw new Error("Studio selection contains a missing or out-of-order parent.");
    const p = node.properties;
    const position = asUDim2(p.Position), size = asUDim2(p.Size), anchor = asVector(p.AnchorPoint);
    const element = createElement(editorTypes[node.className as keyof typeof editorTypes],index);
    const stroke = node.decorators.find((decorator) => decorator.className === "UIStroke")?.properties;
    const corner = node.decorators.find((decorator) => decorator.className === "UICorner")?.properties.CornerRadius;
    const gradient = node.decorators.find((decorator) => decorator.className === "UIGradient" && decorator.properties.Enabled !== false)?.properties;
    Object.assign(element,resolveRobloxLayout(parent,position,size,anchor),{
      id:node.sourceId,parentId:node.parentSourceId,name:node.name,rotation:number(p.Rotation,0),zIndex:number(p.ZIndex,1),
      originX:50,originY:50,hidden:p.Visible===false,clipContent:p.ClipsDescendants===true,
      opacity:100*(1-number(p.TextTransparency??p.ImageTransparency??p.BackgroundTransparency,0)),
      fill:p.BackgroundTransparency===1?"transparent":color(p.BackgroundColor3,"#ffffff"),
      shadow:"none",layoutMode:"none",borderWidth:number(stroke?.Thickness,number(p.BorderSizePixel,0)),
      borderColor:color(stroke?.Color??p.BorderColor3,"#000000"),cornerRadius:0,
      padding:0,textPadding:{top:0,right:0,bottom:0,left:0},
      text:typeof p.Text==="string"?p.Text:"",textColor:color(p.TextColor3,"#000000"),
      fontSize:number(p.TextSize,18),fontSizeDesign:number(p.TextSize,18),
      richText:p.RichText===true,textSizingMode:p.TextScaled===true?"responsive":"fixed",
      textBoxMode:p.TextWrapped===true?"fixed":"auto-width",
      textAlign:item(p.TextXAlignment).toLowerCase()||"left",verticalAlign:item(p.TextYAlignment).toLowerCase()||"center",
      lineHeight:number(p.LineHeight,1),textInput:node.className==="TextBox",
      canvasSizeX:width*asUDim2(p.CanvasSize).xScale+asUDim2(p.CanvasSize).xOffset,
      canvasSizeY:height*asUDim2(p.CanvasSize).yScale+asUDim2(p.CanvasSize).yOffset,
      scrollingEnabled:p.ScrollingEnabled!==false,scrollBarThickness:number(p.ScrollBarThickness,8),
      robloxExportMode:"ORIGINAL",
    });
    const radius=typeof corner==="object"&&corner.kind==="UDim"
      ? corner.offset+Math.min(element.width,element.height)*corner.scale : 0;
    element.cornerRadius=radius;
    element.corners={tl:radius,tr:radius,bl:radius,br:radius};
    const gradientColor=gradient?.Color;
    if (typeof gradientColor==="object" && gradientColor.kind==="ColorSequence") {
      element.gradientType="linear";
      element.gradientAngle=number(gradient?.Rotation,0);
      element.gradientStops=gradientColor.keypoints.map((point,i)=>({
        id:"studio-stop-"+i,color:color({kind:"Color3",...point.color},"#ffffff"),
        position:point.time*100,opacity:gradientOpacity(gradient?.Transparency,point.time),
      }));
    }
    const font = p.FontFace;
    if (typeof font === "object" && font.kind === "Font") {
      const definition=ROBLOX_FONT_REGISTRY.find((entry)=>entry.familyAsset===font.family);
      if(definition){
        element.fontFamily=definition.family;element.fontId=definition.id;
        element.fontWeight=weights[font.weight as keyof typeof weights]??definition.defaultWeight;
        element.fontStyle=font.style==="Italic"?"italic":"normal";
      } else warnings.push(node.name+": Studio font preserved in export. Browser preview uses its available font.");
    }
    element.roblox={
      ...element.roblox,
      imageAssetId:typeof p.Image==="string"?p.Image:undefined,
      nativeLayout:{positionX:position.xScale,positionY:position.yScale,sizeX:size.xScale,sizeY:size.yScale,anchorX:anchor.x,anchorY:anchor.y},
      studioSource:{node,baseline:Object.fromEntries(studioEditableFields.map((key)=>[key,structuredClone(element[key])]))},
    };
    parents.set(element.id,element);
    project.elements.push(element);
  }
  if (project.elements.some((element)=>["ImageLabel","ImageButton","VideoFrame","ViewportFrame"].includes(element.roblox!.studioSource!.node.className))) {
    warnings.push("External media references are preserved. Studio-only media can appear as blank placeholders in the browser.");
  }
  if (project.elements.some((element)=>element.roblox!.studioSource!.node.decorators.some((decorator)=>/Layout$/.test(decorator.className)))) {
    warnings.push("Studio layout objects are preserved and evaluated in Roblox. The browser previews the underlying positions.");
  }
  return project;
}
