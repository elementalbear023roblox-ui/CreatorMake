import type { CSSProperties } from "react";
import type { EditorElement } from "./types";
import { designFontSize, textPadding } from "./text-sizing.ts";

const alpha = (hex: string, opacity: number) => {
  if (!hex.startsWith("#") || hex.length !== 7) return hex;
  const value = Math.round((opacity / 100) * 255).toString(16).padStart(2, "0"); return `${hex}${value}`;
};

export function elementBackground(element: EditorElement) {
  if (element.gradientType === "none") return element.fill;
  if(element.gradientType==="four-corner"){
    const colors=element.fourCornerColors;return [
      `radial-gradient(circle at 0% 0%, ${colors.tl} 0%, ${alpha(colors.tl,0)} 72%)`,
      `radial-gradient(circle at 100% 0%, ${colors.tr} 0%, ${alpha(colors.tr,0)} 72%)`,
      `radial-gradient(circle at 0% 100%, ${colors.bl} 0%, ${alpha(colors.bl,0)} 72%)`,
      `radial-gradient(circle at 100% 100%, ${colors.br} 0%, ${alpha(colors.br,0)} 72%)`,element.fill,
    ].join(", ");
  }
  if(element.gradientType==="freeform")return [...element.gradientPoints.map((point)=>`radial-gradient(circle at ${point.x}% ${point.y}%, ${alpha(point.color,point.opacity)} 0%, ${alpha(point.color,Math.max(0,point.opacity*.65))} ${Math.max(4,point.radius*.35)}%, ${alpha(point.color,0)} ${point.radius}%)`),element.fill].join(", ");
  const stops = element.gradientStops.map((stop) => `${alpha(stop.color, stop.opacity)} ${stop.position}%`).join(", ");
  if (element.gradientType === "radial") return `radial-gradient(circle at center, ${stops})`;
  if (element.gradientType === "conic") return `conic-gradient(from ${element.gradientAngle}deg, ${stops})`;
  if (element.gradientType === "diamond") return `conic-gradient(from 45deg at 50% 50%, ${stops}, ${stops})`;
  return `linear-gradient(${element.gradientAngle}deg, ${stops})`;
}

export function elementStyle(element: EditorElement): CSSProperties {
  return {
    left: element.x, top: element.y, width: element.width, height: element.height,
    transform: `perspective(${element.perspective}px) translateZ(${element.translateZ + element.z}px) rotateX(${element.rotateX}deg) rotateY(${element.rotateY}deg) rotateZ(${element.rotation}deg) skew(${element.skewX}deg,${element.skewY}deg) scale(${element.scaleX},${element.scaleY})`,
    transformOrigin: `${element.originX}% ${element.originY}%`, perspectiveOrigin: `${element.perspectiveOriginX}% ${element.perspectiveOriginY}%`, zIndex: element.zIndex, opacity: element.opacity / 100, color: element.textColor, fontFamily: element.fontFamily, fontSize: designFontSize(element),
    fontWeight: element.fontWeight, fontStyle: element.fontStyle, textAlign: element.textAlign, lineHeight: element.lineHeight, letterSpacing: element.letterSpacing, wordSpacing: element.wordSpacing,
    textTransform: element.textTransform, textDecoration: element.textDecoration, textShadow: element.textShadows.join(", ") || undefined,
    WebkitTextStroke: element.textStrokeWidth ? `${element.textStrokeWidth}px ${alpha(element.textStrokeColor, element.textStrokeOpacity)}` : undefined,
    paintOrder: "stroke fill", mixBlendMode: element.blendMode,
  };
}

export function elementSurfaceStyle(element: EditorElement): CSSProperties {
  const clipPath = element.type === "ellipse" ? "ellipse(50% 50% at 50% 50%)" : element.type === "polygon" ? "polygon(50% 0,100% 38%,82% 100%,18% 100%,0 38%)" : element.type === "star" ? "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 94%,50% 72%,21% 94%,32% 57%,2% 35%,39% 35%)" : undefined;
  const alignItems=element.type === "button" || element.type === "text" ? element.verticalAlign === "top" ? "flex-start" : element.verticalAlign === "bottom" ? "flex-end" : "center" : "flex-start";
  const padding=element.type==="text"||element.type==="button"?textPadding(element):element.padding;
  return { position: "absolute", inset: 0, display: "flex", alignItems, justifyContent: element.type === "button" ? "center" : undefined, background: elementBackground(element), borderColor: element.borderColor, borderWidth: element.borderWidth, borderStyle: "solid", borderRadius: `${element.corners.tl}px ${element.corners.tr}px ${element.corners.br}px ${element.corners.bl}px`, boxShadow: element.shadow, padding:typeof padding==="number"?padding:`${padding.top}px ${padding.right}px ${padding.bottom}px ${padding.left}px`, clipPath, overflow: "visible", boxSizing: "border-box" };
}
