"use client";

import { elementBackground, elementSurfaceStyle } from "@/lib/editor/render";
import { geometryPresentation, openGeometryStrokeWidth, usesVectorSurface } from "@/lib/editor/geometry";
import { resolveCaptionGeometry } from "@/lib/editor/visual-transform";
import type { CSSProperties } from "react";
import type { EditorAsset, EditorElement } from "@/lib/editor/types";

const shadowFilter=(shadow:string)=>{
  if(!shadow||shadow==="none")return undefined;
  const match=shadow.match(/^(-?[\d.]+px)\s+(-?[\d.]+px)\s+([\d.]+px)(?:\s+-?[\d.]+px)?\s+(.+)$/);
  return match?`drop-shadow(${match[1]} ${match[2]} ${match[3]} ${match[4]})`:undefined;
};

const imageFilter=(element:EditorElement)=>`brightness(${element.imageBrightness}%) contrast(${element.imageContrast}%) saturate(${element.imageSaturation}%) hue-rotate(${element.imageHue}deg) blur(${element.imageBlur}px)`;
const imagePosition=(element:EditorElement)=>`${50+element.imageOffsetX}% ${50+element.imageOffsetY}%`;
const imageTransform=(element:EditorElement)=>`rotate(${element.imageRotation}deg) scale(${element.imageScale*(element.imageFlipX?-1:1)*element.imageScaleX}, ${element.imageScale*(element.imageFlipY?-1:1)*element.imageScaleY})`;
const imageFillStyle=(element:EditorElement,asset:EditorAsset):CSSProperties=>({position:"absolute",inset:0,backgroundImage:`url(${JSON.stringify(asset.dataUrl).slice(1,-1)})`,backgroundRepeat:element.imageFit==="tile"?"repeat":"no-repeat",backgroundPosition:imagePosition(element),backgroundSize:element.imageFit==="tile"?`${Math.max(1,element.imageTileWidth)}px ${Math.max(1,element.imageTileHeight)}px`:element.imageFit==="fill"?"cover":element.imageFit==="stretch"?"100% 100%":element.imageFit==="original"?`${asset.width}px ${asset.height}px`:"contain",filter:imageFilter(element),opacity:element.imageOpacity/100,transform:imageTransform(element),transformOrigin:"center",pointerEvents:"none"});

function ImageSurface({element,asset}:{element:EditorElement;asset?:EditorAsset}){
  const surfaceStyle:CSSProperties={...elementSurfaceStyle(element),padding:0,background:"transparent",overflow:"hidden"};
  if(!asset)return <span className="element-surface image-element-surface missing-image" data-creatormake-surface="true" data-creatormake-element-id={element.id} style={surfaceStyle}><strong>MISSING IMAGE</strong><small>Relink or replace in Assets</small></span>;
  const crop=element.imageCrop,cropped=crop.x!==0||crop.y!==0||crop.width!==100||crop.height!==100,mediaStyle:CSSProperties={position:"absolute",left:cropped?`${-crop.x/Math.max(1,crop.width)*100}%`:0,top:cropped?`${-crop.y/Math.max(1,crop.height)*100}%`:0,width:cropped?`${10000/Math.max(1,crop.width)}%`:"100%",height:cropped?`${10000/Math.max(1,crop.height)}%`:"100%",objectFit:element.imageFit==="fill"?"cover":element.imageFit==="stretch"?"fill":element.imageFit==="original"?"none":"contain",objectPosition:imagePosition(element),filter:imageFilter(element),opacity:element.imageOpacity/100,transform:imageTransform(element),transformOrigin:"center",pointerEvents:"none"};
  return <span className="element-surface image-element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id} style={surfaceStyle}>
    {element.imageFit==="tile"?<span className="editor-image-tile" style={{...mediaStyle,backgroundImage:`url(${JSON.stringify(asset.dataUrl).slice(1,-1)})`,backgroundRepeat:"repeat",backgroundPosition:imagePosition(element),backgroundSize:`${Math.max(1,element.imageTileWidth)}px ${Math.max(1,element.imageTileHeight)}px`}}/>:<img className="editor-image-source" src={asset.dataUrl} alt="" draggable={false} style={mediaStyle}/>}
    {element.imageTintOpacity>0&&<span className="editor-image-tint" style={{position:"absolute",inset:0,background:element.imageTint,opacity:element.imageTintOpacity/100,mixBlendMode:"multiply",pointerEvents:"none"}}/>}
  </span>;
}

export function ElementSurface({element,asset,elements=[element]}:{element:EditorElement;asset?:EditorAsset;elements?:EditorElement[]}){
  if(element.type==="image"||element.type==="image-button")return <ImageSurface element={element} asset={asset}/>;
  const textBearing=element.type==="text"||element.type==="button",caption=textBearing?resolveCaptionGeometry(element,elements):null,vertical=element.verticalAlign==="top"?"flex-start":element.verticalAlign==="bottom"?"flex-end":"center",horizontal=element.textAlign==="left"?"flex-start":element.textAlign==="right"?"flex-end":"center";
  const captionStyle:CSSProperties|undefined=caption?caption.captionGeometry.cssTransform?{left:0,top:0,width:caption.captionSize.width,height:caption.captionSize.height,fontSize:caption.resolvedTextSize,alignItems:vertical,justifyContent:horizontal,transform:caption.captionGeometry.cssTransform,transformOrigin:"0 0"}:{left:caption.captionCenter.x,top:caption.captionCenter.y,width:caption.captionSize.width,height:caption.captionSize.height,fontSize:caption.resolvedTextSize,alignItems:vertical,justifyContent:horizontal,transform:`translate(-50%,-50%) rotate(${caption.editorTextLocalRotation}deg)`}:undefined;
  const text=caption?<span className="caption-text-content" style={captionStyle}>{element.text}</span>:null;
  const debug=caption&&element.showCaptionGeometry?(()=>{const geometry=caption.captionGeometry,points=(quad:typeof geometry.surfaceQuad)=>[quad.topLeft,quad.topRight,quad.bottomRight,quad.bottomLeft].map((point)=>`${point.x},${point.y}`).join(" "),surface=geometry.surfaceQuad,textQuad=geometry.textQuad,surfaceCenter={x:(surface.topLeft.x+surface.topRight.x+surface.bottomRight.x+surface.bottomLeft.x)/4,y:(surface.topLeft.y+surface.topRight.y+surface.bottomRight.y+surface.bottomLeft.y)/4},xEnd={x:(surface.topRight.x+surface.bottomRight.x)/2,y:(surface.topRight.y+surface.bottomRight.y)/2},yEnd={x:(surface.bottomLeft.x+surface.bottomRight.x)/2,y:(surface.bottomLeft.y+surface.bottomRight.y)/2};return <svg className="caption-transform-debug" viewBox={`0 0 ${Math.max(1,element.width)} ${Math.max(1,element.height)}`} preserveAspectRatio="none" aria-hidden="true"><polygon className="caption-debug-surface" points={points(surface)}/><polygon className="caption-debug-text" points={points(textQuad)}/><line className="caption-debug-axis-x" x1={surfaceCenter.x} y1={surfaceCenter.y} x2={xEnd.x} y2={xEnd.y}/><line className="caption-debug-axis-y" x1={surfaceCenter.x} y1={surfaceCenter.y} x2={yEnd.x} y2={yEnd.y}/><line className="caption-debug-baseline" x1={geometry.textBaseline.from.x} y1={geometry.textBaseline.from.y} x2={geometry.textBaseline.to.x} y2={geometry.textBaseline.to.y}/><text x={4} y={10}>{geometry.transformKind} · {Math.round(geometry.safeWidth*10)/10}×{Math.round(geometry.safeHeight*10)/10} · {caption.resolvedTextSize}px</text></svg>;})():null;
  if(!usesVectorSurface(element))return <span className="element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id} style={{...elementSurfaceStyle(element),padding:textBearing?0:element.padding,overflow:element.imageAssetId?"hidden":undefined}}>{asset&&<i className="editor-image-fill" style={imageFillStyle(element,asset)}/>} {element.imageTintOpacity>0&&asset&&<i className="editor-image-tint" style={{position:"absolute",inset:0,background:element.imageTint,opacity:element.imageTintOpacity/100,mixBlendMode:"multiply",pointerEvents:"none"}}/>}{text}{debug}</span>;
  const geometry=geometryPresentation(element),clipId=`geometry-${element.id.replace(/[^a-zA-Z0-9_-]/g,"")}`,strokeWidth=geometry.open?openGeometryStrokeWidth(element):element.borderWidth;
  const stroke=geometry.open?(element.fill==="transparent"?element.borderColor:element.fill):element.borderColor;
  return <span className="element-surface vector-element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id}>
    <svg className="vector-geometry" viewBox={`0 0 ${Math.max(1,element.width)} ${Math.max(1,element.height)}`} preserveAspectRatio="none" aria-hidden="true" style={{filter:shadowFilter(element.shadow)}}>
      <defs><clipPath id={clipId}><path d={geometry.path} transform={geometry.transform} fillRule={geometry.fillRule} clipRule={geometry.fillRule}/></clipPath></defs>
      {!geometry.open&&<foreignObject x="0" y="0" width={Math.max(1,element.width)} height={Math.max(1,element.height)} clipPath={`url(#${clipId})`}><div className="vector-geometry-fill" style={{background:asset?"transparent":elementBackground(element),position:"relative"}}>{asset&&<i className="editor-image-fill" style={imageFillStyle(element,asset)}/>}</div></foreignObject>}
      <path d={geometry.path} transform={geometry.transform} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeOpacity={stroke==="transparent"?0:1} fillRule={geometry.fillRule} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {element.showCaptionGeometry&&<svg className="caption-shape-debug" viewBox={`0 0 ${Math.max(1,element.width)} ${Math.max(1,element.height)}`} preserveAspectRatio="none" aria-hidden="true"><path d={geometry.path} transform={geometry.transform} fill="none" fillRule={geometry.fillRule}/></svg>}
    {text}{debug}
  </span>;
}
