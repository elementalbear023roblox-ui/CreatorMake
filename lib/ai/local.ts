import { createElement, createId } from "@/lib/editor/project";
import { PRESET_BY_ID } from "@/lib/design-intelligence/system-presets";
import type { DesignPlan, EditorReference } from "@/lib/design-intelligence/types";
import type { EditorElement } from "@/lib/editor/types";
import { copyForRole, parseDesignIntent } from "./intent";
import { generateRobloxShop } from "./roblox-shop";

export type LocalGeneration = { label: string; elements: EditorElement[]; operations: string[] };
const presetFor = (plan: DesignPlan, role: keyof DesignPlan["assignments"]) => PRESET_BY_ID[plan.assignments[role]] ?? PRESET_BY_ID[plan.presetIds[0]];
const referencePalette = (plan: DesignPlan, references: EditorReference[]) => references.find((reference) => plan.referenceIds.includes(reference.id) && (reference.role === "Colors" || reference.role === "Visual Style"))?.measurements?.dominantColors;

function styleElement(element: EditorElement, plan: DesignPlan, references: EditorReference[], kind: "surface"|"accent"|"text" = "surface") {
  const geometry = presetFor(plan,"geometry"), colors = presetFor(plan,"colors"), typography = presetFor(plan,"typography"), effects = presetFor(plan,"effects"), spatial = presetFor(plan,"spatial"); const palette = referencePalette(plan,references);
  element.corners = { tl:geometry.geometry.radius,tr:geometry.geometry.radius,br:geometry.geometry.radius,bl:geometry.geometry.radius }; element.cornerRadius = geometry.geometry.radius; element.borderWidth = geometry.borders.width; element.borderColor = geometry.colors.highlight; element.padding = geometry.spacing.padding;
  element.fill = kind === "accent" ? (palette?.[1] ?? colors.colors.accent) : kind === "text" ? "transparent" : (palette?.[0] ?? colors.colors.surface); element.textColor=colors.colors.text; element.fontFamily = typography.typography.family; element.fontWeight = typography.typography.weight; element.shadow = effects.effects.shadow;
  element.gradientType = geometry.gradients.default === "off" ? "none" : geometry.gradients.type === "none" ? "none" : geometry.gradients.type; element.gradientAngle = geometry.gradients.angle; if (element.gradientType !== "none") { element.gradientStops[0].color = element.fill; element.gradientStops[1].color = colors.colors.accent; }
  element.perspective = spatial.depth.perspective; return element;
}

const makeText = (text: string, x: number, y: number, width: number, plan: DesignPlan, refs: EditorReference[], size = 16) => { const item = styleElement(createElement("text"),plan,refs,"text"); item.name = text; item.text = text; item.x = x; item.y = y; item.width = width; item.height = Math.max(30,size * 1.8); item.fontSize = size; item.fontSizeDesign=size;item.responsiveMaxTextSize=size;item.borderWidth = 0; item.shadow = "none"; item.padding = 0;item.textPadding={top:0,right:0,bottom:0,left:0}; return item; };

function generateInventory(plan: DesignPlan, refs: EditorReference[]): LocalGeneration {
  const elements: EditorElement[] = []; const preset = presetFor(plan,"geometry"); const colors = presetFor(plan,"colors");
  const root = styleElement(createElement("frame"),plan,refs); root.id = createId("researched-window"); root.name = `${preset.name} Inventory Window`; root.x = 150; root.y = 70; root.width = 660; root.height = 470; elements.push(root);
  const inner = styleElement(createElement("container"),plan,refs); inner.name = "Window Border Stack"; inner.parentId = root.id; inner.x = 157; inner.y = 77; inner.width = 646; inner.height = 456; inner.fill = colors.colors.surfaceAlt; inner.borderColor = colors.colors.shadow; elements.push(inner);
  const titleBar = styleElement(createElement("rectangle"),plan,refs,"accent"); titleBar.name = "Title Bar"; titleBar.parentId = root.id; titleBar.x = 166; titleBar.y = 88; titleBar.width = 628; titleBar.height = 38; titleBar.corners = {tl:preset.geometry.radius,tr:preset.geometry.radius,br:0,bl:0}; elements.push(titleBar);
  const title = makeText("INVENTORY",180,94,300,plan,refs,15); title.parentId = titleBar.id; title.fill = "transparent"; title.fontWeight = 700; elements.push(title);
  [0,1,2].forEach((index) => { const control = styleElement(createElement("button"),plan,refs); control.name = ["Minimize","Maximize","Close"][index]; control.parentId = titleBar.id; control.x = 690 + index * 30; control.y = 95; control.width = 24; control.height = 22; control.text = ["_","□","×"][index]; control.fontSize = 12; control.fontSizeDesign=12;control.responsiveMaxTextSize=12;control.padding = 0;control.textPadding={top:0,right:0,bottom:0,left:0};elements.push(control); });
  const content = styleElement(createElement("container"),plan,refs); content.name = "Recessed Inventory Content"; content.parentId = root.id; content.x = 174; content.y = 138; content.width = 602; content.height = 318; content.fill = colors.colors.surface; content.borderColor = colors.colors.shadow; elements.push(content);
  [0,1,2,3,4,5].forEach((index) => { const slot = styleElement(createElement("roundRect",index),plan,refs); slot.name = `Item Slot ${index + 1}`; slot.parentId = content.id; slot.x = 198 + (index % 3) * 188; slot.y = 166 + Math.floor(index / 3) * 130; slot.width = 160; slot.height = 108; slot.fill = index === 0 ? colors.colors.surfaceAlt : colors.colors.surface; slot.shadow = preset.depth.mode.includes("bevel") || preset.borders.construction.includes("bevel") ? "inset 2px 2px 0 rgba(0,0,0,.6), inset -2px -2px 0 rgba(255,255,255,.25)" : colors.effects.shadow; elements.push(slot); });
  const status = makeText("6 SLOTS  ·  1 SELECTED",184,470,310,plan,refs,12); status.parentId = root.id; elements.push(status);
  const action = styleElement(createElement("button"),plan,refs,"accent"); action.name = "Use Item"; action.parentId = root.id; action.x = 640; action.y = 466; action.width = 130; action.height = 38; action.text = "USE ITEM"; action.fontSize = 12;action.fontSizeDesign=12;action.responsiveMaxTextSize=12;elements.push(action);
  return { label:`${preset.name} inventory`, elements, operations:["built window border stack","created title bar and controls","constructed recessed inventory grid","applied semantic preset assignments"] };
}

function generateSpatial(plan: DesignPlan, refs: EditorReference[]): LocalGeneration {
  const elements: EditorElement[] = []; const spatial = presetFor(plan,"spatial"); const root = styleElement(createElement("container"),plan,refs); root.id = createId("spatial"); root.name = `${spatial.name} HUD`; root.x = 90; root.y = 90; root.width = 780; root.height = 420; root.fill = "transparent"; root.borderWidth = 0; root.shadow = "none"; elements.push(root);
  [0,1,2].forEach((index) => { const panel = styleElement(createElement("roundRect",index),plan,refs); panel.name = `Spatial Panel ${index + 1}`; panel.parentId = root.id; panel.x = 115 + index * 235; panel.y = 165 + Math.abs(1-index) * 34; panel.width = 220; panel.height = 240; panel.z = index * 40; panel.rotateY = (index-1) * -Math.max(8,spatial.spatial.tilt); panel.perspective = spatial.depth.perspective; elements.push(panel); const title = makeText(["SYSTEMS","TACTICAL","SIGNAL"][index],panel.x+24,panel.y+30,170,plan,refs,17); title.parentId = panel.id; title.textStrokeColor = "#07212b"; title.textStrokeWidth = 1; elements.push(title); });
  return { label:`three-panel ${spatial.name} HUD`, elements, operations:["planned three depth layers","created perspective-aware panels","applied emissive system rules"] };
}

function generateWindow(plan: DesignPlan, refs: EditorReference[]): LocalGeneration {
  const elements: EditorElement[] = []; const preset = presetFor(plan,"geometry"); const root = styleElement(createElement("frame"),plan,refs); root.name = `${preset.name} Window`; root.x = 190; root.y = 90; root.width = 580; root.height = 420; elements.push(root);
  const header = styleElement(createElement("rectangle"),plan,refs,"accent"); header.name = "Window Header"; header.parentId = root.id; header.x = 205; header.y = 106; header.width = 550; header.height = 48; elements.push(header);
  const intent=plan.intent??parseDesignIntent(plan.prompt); const title = makeText(copyForRole(intent,"title","INTERFACE"),225,118,360,plan,refs,18); title.name="TitleText"; title.parentId = header.id; elements.push(title);
  [0,1].forEach((index) => { const control = styleElement(createElement("button"),plan,refs); control.name = index ? "Close" : "Minimize"; control.parentId = header.id; control.x = 680 + index * 34; control.y = 116; control.width = 28; control.height = 28; control.text = index ? "×" : "_"; control.padding = 0; elements.push(control); });
  const content = styleElement(createElement("container"),plan,refs); content.name = "Content Area"; content.parentId = root.id; content.x = 215; content.y = 170; content.width = 530; content.height = 260; elements.push(content);
  const body = makeText("Structured interface content",245,212,360,plan,refs,16); body.parentId = content.id; elements.push(body);
  const action = styleElement(createElement("button"),plan,refs,"accent"); action.name = "Primary Action"; action.parentId = content.id; action.x = 565; action.y = 370; action.width = 150; action.height = 42; action.text = copyForRole(intent,"button","CONTINUE"); elements.push(action);
  return { label:`${preset.name} window`, elements, operations:["built reusable frame hierarchy","constructed title controls","applied preset geometry before color and effects"] };
}

export function generateFromDesignPlan(plan: DesignPlan, references: EditorReference[]): LocalGeneration { if (plan.layoutKind === "roblox-shop") return generateRobloxShop(plan); if (plan.layoutKind === "inventory") return generateInventory(plan,references); if (plan.layoutKind === "spatial") return generateSpatial(plan,references); return generateWindow(plan,references); }
