"use client";

import { elementBackground, elementSurfaceStyle } from "@/lib/editor/render";
import { geometryPresentation, openGeometryStrokeWidth, usesVectorSurface } from "@/lib/editor/geometry";
import type { CSSProperties } from "react";
import type { EditorAsset, EditorElement } from "@/lib/editor/types";
import { textPadding } from "@/lib/editor/text-sizing";

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

export function ElementSurface({element,asset}:{element:EditorElement;asset?:EditorAsset}){
  if(element.type==="image"||element.type==="image-button")return <ImageSurface element={element} asset={asset}/>;
  const text=(element.type==="text"||element.type==="button")?<span>{element.text}</span>:null;
  if(!usesVectorSurface(element))return <span className="element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id} style={{...elementSurfaceStyle(element),overflow:element.imageAssetId?"hidden":undefined}}>{asset&&<i className="editor-image-fill" style={imageFillStyle(element,asset)}/>} {element.imageTintOpacity>0&&asset&&<i className="editor-image-tint" style={{position:"absolute",inset:0,background:element.imageTint,opacity:element.imageTintOpacity/100,mixBlendMode:"multiply",pointerEvents:"none"}}/>}{text}</span>;
  const geometry=geometryPresentation(element),clipId=`geometry-${element.id.replace(/[^a-zA-Z0-9_-]/g,"")}`,strokeWidth=geometry.open?openGeometryStrokeWidth(element):element.borderWidth;
  const stroke=geometry.open?(element.fill==="transparent"?element.borderColor:element.fill):element.borderColor;
  const vertical=element.verticalAlign==="top"?"flex-start":element.verticalAlign==="bottom"?"flex-end":"center";
  return <span className="element-surface vector-element-surface" data-creatormake-surface="true" data-creatormake-element-id={element.id}>
    <svg className="vector-geometry" viewBox={`0 0 ${Math.max(1,element.width)} ${Math.max(1,element.height)}`} preserveAspectRatio="none" aria-hidden="true" style={{filter:shadowFilter(element.shadow)}}>
      <defs><clipPath id={clipId}><path d={geometry.path} transform={geometry.transform} fillRule={geometry.fillRule} clipRule={geometry.fillRule}/></clipPath></defs>
      {!geometry.open&&<foreignObject x="0" y="0" width={Math.max(1,element.width)} height={Math.max(1,element.height)} clipPath={`url(#${clipId})`}><div className="vector-geometry-fill" style={{background:asset?"transparent":elementBackground(element),position:"relative"}}>{asset&&<i className="editor-image-fill" style={imageFillStyle(element,asset)}/>}</div></foreignObject>}
      <path d={geometry.path} transform={geometry.transform} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeOpacity={stroke==="transparent"?0:1} fillRule={geometry.fillRule} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
    {text&&<span className="vector-text-content" style={{alignItems:vertical,justifyContent:element.type==="button"?"center":undefined,padding:`${textPadding(element).top}px ${textPadding(element).right}px ${textPadding(element).bottom}px ${textPadding(element).left}px`}}>{text}</span>}
  </span>;
}
