import type { EditorElement, RobloxLayoutScale } from "./types.ts";

type Rect = Pick<EditorElement, "x" | "y" | "width" | "height">;
type Vector = { x: number; y: number };
export type RobloxUDim2 = { kind: "UDim2"; xScale: number; xOffset: number; yScale: number; yOffset: number };

const dim = (scale: Vector, offset: Vector): RobloxUDim2 => ({
  kind: "UDim2",
  xScale: scale.x,
  xOffset: Math.round(offset.x),
  yScale: scale.y,
  yOffset: Math.round(offset.y),
});

export function normalizeRobloxLayout(data?: RobloxLayoutScale): RobloxLayoutScale | undefined {
  if (!data) return;
  const finite = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0;
  return {
    positionX: finite(data.positionX), positionY: finite(data.positionY),
    sizeX: finite(data.sizeX), sizeY: finite(data.sizeY),
    anchorX: finite(data.anchorX), anchorY: finite(data.anchorY),
  };
}

export function getRobloxLayout(element: Rect, parent: Rect, layout: RobloxLayoutScale) {
  const { anchorX, anchorY, positionX, positionY, sizeX, sizeY } = layout;
  return {
    Position: dim({ x: positionX, y: positionY }, {
      x: element.x - parent.x + element.width * anchorX - parent.width * positionX,
      y: element.y - parent.y + element.height * anchorY - parent.height * positionY,
    }),
    Size: dim({ x: sizeX, y: sizeY }, {
      x: element.width - parent.width * sizeX,
      y: element.height - parent.height * sizeY,
    }),
    AnchorPoint: { kind: "Vector2" as const, x: anchorX, y: anchorY },
  };
}

export function resolveRobloxLayout(
  parent: Rect,
  position: RobloxUDim2,
  size: RobloxUDim2,
  anchor: Vector,
): Rect {
  const width = Math.max(0, parent.width * size.xScale + size.xOffset);
  const height = Math.max(0, parent.height * size.yScale + size.yOffset);
  return {
    x: parent.x + parent.width * position.xScale + position.xOffset - width * anchor.x,
    y: parent.y + parent.height * position.yScale + position.yOffset - height * anchor.y,
    width, height,
  };
}

export function resizeRobloxLayout(element: EditorElement, before: Rect, after: Rect): Rect | undefined {
  const layout = element.roblox?.nativeLayout;
  if (!layout) return;
  const properties = getRobloxLayout(element, before, layout);
  return resolveRobloxLayout(after, properties.Position, properties.Size, properties.AnchorPoint);
}
