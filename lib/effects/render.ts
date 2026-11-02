import type { CSSProperties } from "react";
import type { EditorElement, VisualEffectInstance } from "../editor/types";

export type EffectOverlay={id:string;className:string;style:CSSProperties};
export type EffectPresentation={filter?:string;boxShadows:string[];backdropFilter?:string;imageRendering?:CSSProperties["imageRendering"];mixBlendMode?:CSSProperties["mixBlendMode"];overlays:EffectOverlay[];classes:string[];maxExtent:number;animated:boolean};
const num=(effect:VisualEffectInstance,key:string,fallback=0)=>typeof effect.parameters[key]==="number"?Number(effect.parameters[key]):fallback;
const str=(effect:VisualEffectInstance,key:string,fallback="")=>typeof effect.parameters[key]==="string"?String(effect.parameters[key]):fallback;
const flag=(effect:VisualEffectInstance,key:string,fallback=false)=>typeof effect.parameters[key]==="boolean"?Boolean(effect.parameters[key]):fallback;
const alpha=(color:string,opacity:number)=>`color-mix(in srgb, ${color} ${Math.max(0,Math.min(100,opacity))}%, transparent)`;
const animationStyle=(effect:VisualEffectInstance,name:string):CSSProperties=>effect.animation.enabled?{animationName:name,animationDuration:`${Math.max(.15,effect.animation.duration/Math.max(.1,effect.animation.speed))}s`,animationDelay:`${effect.animation.delay-Math.max(0,effect.animation.phaseOffset)}s`,animationDirection:effect.animation.loopMode==="ping-pong"?"alternate":effect.animation.direction,animationIterationCount:effect.animation.loopMode==="once"?1:"infinite",animationTimingFunction:effect.animation.easing}:{animation:"none"};
const overlay=(effect:VisualEffectInstance,suffix:string,className:string,style:CSSProperties):EffectOverlay=>({id:`${effect.id}:${suffix}`,className:`cm-effect-overlay ${className}${effect.animation.enabled?" effect-is-animated":""}`,style});

export function composeVisualEffects(element:Pick<EditorElement,"effects"|"corners"|"type">):EffectPresentation{
  const filters:string[]=[],boxShadows:string[]=[],overlays:EffectOverlay[]=[],classes:string[]=[];
  let backdropFilter:string|undefined,imageRendering:CSSProperties["imageRendering"],mixBlendMode:CSSProperties["mixBlendMode"],maxExtent=0,animated=false;
  const enabledEffects=element.effects.filter((item)=>item.enabled),boxGlowTarget=["frame","container","scrolling-frame","button","image","image-button"].includes(element.type);
  if(enabledEffects.length)classes.push("has-visual-effects");
  for(const effect of enabledEffects){
    animated||=effect.animation.enabled;
    classes.push(`has-effect-${effect.type}`);
    if(["neon-glow","outer-glow","inner-glow","bloom","edge-glow","rainbow-glow"].includes(effect.type)){
      const color=str(effect,"color","#8b5cff"),radius=num(effect,"radius",18),opacity=num(effect,"opacity",90),intensity=num(effect,"intensity",100)/100,layers=Math.max(1,Math.round(num(effect,"layers",3))),outer=flag(effect,"outer",effect.type!=="inner-glow"),inner=flag(effect,"inner",effect.type==="inner-glow"),spread=num(effect,"spread",3),softness=num(effect,"softness",65)/100,falloff=num(effect,"falloff",65)/100,blend=str(effect,"blendMode","screen") as CSSProperties["mixBlendMode"];
      if(blend&&blend!=="normal")mixBlendMode=blend;
      const renderLayers=Math.min(2,layers);
      if(outer)for(let layer=1;layer<=renderLayers;layer++){const progress=layer/renderLayers,blur=Math.max(.25,radius*(.28+progress*.72)*(1+softness*.35)+spread*progress),layerOpacity=opacity*intensity*(1-progress*falloff*.9)*(layers/renderLayers),shadow=`0 0 ${blur.toFixed(2)}px ${Math.max(0,spread*progress).toFixed(2)}px ${alpha(color,layerOpacity)}`;if(boxGlowTarget)boxShadows.push(shadow);else filters.push(`drop-shadow(0 0 ${blur.toFixed(2)}px ${alpha(color,layerOpacity)})`);maxExtent=Math.max(maxExtent,blur*1.8+spread);}
      if(inner)boxShadows.push(`inset 0 0 ${Math.max(1,radius).toFixed(2)}px ${Math.max(0,spread).toFixed(2)}px ${alpha(color,opacity*intensity)}`);
      if(effect.type==="rainbow-glow"){const distance=Math.max(1,radius*.3);filters.push(`drop-shadow(${distance}px 0 ${radius*.45}px ${alpha("#ff3b81",opacity*.55)})`,`drop-shadow(${-distance}px 0 ${radius*.45}px ${alpha("#31d7ff",opacity*.55)})`);}
      continue;
    }
    if(effect.type==="gaussian-blur"){const radius=num(effect,"radius",6);filters.push(`blur(${radius}px)`);maxExtent=Math.max(maxExtent,radius*2);continue;}
    if(effect.type==="brightness"){filters.push(`brightness(${num(effect,"amount",120)}%)`);continue;}
    if(effect.type==="contrast"){filters.push(`contrast(${num(effect,"amount",125)}%)`);continue;}
    if(effect.type==="saturation"){filters.push(`saturate(${num(effect,"amount",140)}%)`);continue;}
    if(effect.type==="hue-shift"){filters.push(`hue-rotate(${num(effect,"angle",45)}deg)`);continue;}
    if(effect.type==="grayscale"){filters.push(`grayscale(${num(effect,"amount",100)}%)`);continue;}
    if(effect.type==="sepia"){filters.push(`sepia(${num(effect,"amount",80)}%)`);continue;}
    if(effect.type==="invert"){filters.push(`invert(${num(effect,"amount",100)}%)`);continue;}
    if(effect.type==="sharpen"){filters.push(`contrast(${100+num(effect,"amount",35)*.35}%)`);classes.push("effect-sharpen");continue;}
    if(effect.type==="drop-shadow"){
      const x=num(effect,"x"),y=num(effect,"y",12),blur=num(effect,"blur",24),spread=num(effect,"spread"),color=str(effect,"color","#000"),opacity=num(effect,"opacity",50);boxShadows.push(`${x}px ${y}px ${blur}px ${spread}px ${alpha(color,opacity)}`);maxExtent=Math.max(maxExtent,Math.abs(x)+Math.abs(y)+blur*1.5+Math.max(0,spread));continue;
    }
    if(effect.type==="inner-shadow"){
      boxShadows.push(`inset ${num(effect,"x")}px ${num(effect,"y",5)}px ${num(effect,"blur",12)}px ${num(effect,"spread")}px ${alpha(str(effect,"color","#000"),num(effect,"opacity",55))}`);continue;
    }
    if(effect.type==="bevel"){
      const size=num(effect,"size",4),depth=num(effect,"depth",70);boxShadows.push(`inset ${-size}px ${-size}px ${size*2}px ${alpha("#000",depth*.55)}`,`inset ${size}px ${size}px ${size*1.5}px ${alpha("#fff",depth*.42)}`);continue;
    }
    if(effect.type==="glass"||effect.type==="frosted-glass"){
      const blur=num(effect,"blur",effect.type==="glass"?8:18),opacity=num(effect,"opacity",24),tint=str(effect,"tint","#d8e7ff"),saturation=num(effect,"saturation",130);backdropFilter=`blur(${blur}px) saturate(${saturation}%)`;overlays.push(overlay(effect,"glass","effect-glass",{background:`linear-gradient(145deg,${alpha(tint,opacity*1.35)},${alpha("#ffffff",opacity*.25)} 45%,${alpha(tint,opacity*.55)})`,mixBlendMode:"screen",borderRadius:"inherit"}));if(effect.type==="frosted-glass")overlays.push(overlay(effect,"frost","effect-grain",{opacity:num(effect,"grain",12)/100,backgroundImage:"radial-gradient(circle,#fff 0 1px,transparent 1px)",backgroundSize:"3px 3px",mixBlendMode:"overlay"}));continue;
    }
    if(effect.type==="pixelation"||effect.type==="retro-8bit"){
      const size=Math.max(1,num(effect,"pixelSize",8)),strength=num(effect,"strength",100),shape=str(effect,"shape","square");imageRendering="pixelated";classes.push("effect-pixelated");overlays.push(overlay(effect,"pixels",`effect-pixel-grid shape-${shape}`,{opacity:Math.min(.6,strength/250),backgroundImage:"linear-gradient(90deg,#0003 1px,transparent 1px),linear-gradient(#0003 1px,transparent 1px)",backgroundSize:`${size}px ${size}px`,backgroundPosition:`${num(effect,"offsetX")}px ${num(effect,"offsetY")}px`,mixBlendMode:"overlay"}));if(effect.type==="retro-8bit")filters.push(`contrast(${num(effect,"contrast",125)}%) saturate(115%)`);continue;
    }
    if(effect.type==="dither"){
      const size=num(effect,"pixelSize",4),color=str(effect,"color","#000"),strength=num(effect,"strength",45);overlays.push(overlay(effect,"dither","effect-dither",{opacity:strength/100,backgroundImage:`radial-gradient(circle,${alpha(color,70)} 0 1px,transparent 1.2px)`,backgroundSize:`${size}px ${size}px`,mixBlendMode:"overlay"}));continue;
    }
    if(effect.type==="scanlines"){
      const vertical=str(effect,"direction","horizontal")==="vertical",size=num(effect,"size",5),thickness=num(effect,"thickness",1),direction=vertical?"90deg":"180deg";overlays.push(overlay(effect,"scanlines","effect-scanlines",{inset:vertical?"0 -30px":"-30px 0",opacity:num(effect,"opacity",24)/100,backgroundImage:`repeating-linear-gradient(${direction},transparent 0,transparent ${Math.max(0,size-thickness)}px,#000 ${Math.max(0,size-thickness)}px,#000 ${size}px)`,backgroundSize:vertical?`${size}px 100%`:`100% ${size}px`,"--cm-effect-scan-x":vertical?"30px":"0px","--cm-effect-scan-y":vertical?"0px":"30px",...animationStyle(effect,"cm-effect-scan")} as CSSProperties));continue;
    }
    if(effect.type==="crt"){
      filters.push(`contrast(${num(effect,"contrast",118)}%)`);const size=num(effect,"scanlineSize",4);overlays.push(overlay(effect,"crt-lines","effect-scanlines",{opacity:num(effect,"scanlineOpacity",22)/100,backgroundImage:`repeating-linear-gradient(180deg,transparent 0,transparent ${size-1}px,#000 ${size-1}px,#000 ${size}px)`}),overlay(effect,"crt-tint","effect-crt-tint",{background:`radial-gradient(ellipse at center,${alpha(str(effect,"tint","#54ff9f"),num(effect,"tintOpacity",12))} 0%,transparent 58%,${alpha("#000",num(effect,"vignette",38))} 100%)`,mixBlendMode:"screen"}));continue;
    }
    if(effect.type==="chromatic-aberration"){
      const distance=num(effect,"distance",4),angle=num(effect,"angle")*Math.PI/180,x=Math.cos(angle)*distance,y=Math.sin(angle)*distance,opacity=num(effect,"opacity",70);filters.push(`drop-shadow(${x.toFixed(2)}px ${y.toFixed(2)}px 0 ${alpha("#ff174f",opacity*.75)})`,`drop-shadow(${(-x).toFixed(2)}px ${(-y).toFixed(2)}px 0 ${alpha("#00d8ff",opacity*.75)})`);maxExtent=Math.max(maxExtent,distance+2);continue;
    }
    if(effect.type==="digital-glitch"||effect.type==="wave-distortion"){
      const distance=num(effect,effect.type==="digital-glitch"?"distance":"amplitude",6);overlays.push(overlay(effect,"distortion",effect.type==="digital-glitch"?"effect-digital-glitch":"effect-wave",{opacity:num(effect,"opacity",65)/100,backgroundImage:"repeating-linear-gradient(180deg,transparent 0 8%,#ff2b8a44 8% 10%,transparent 10% 18%,#25dfff33 18% 20%)",mixBlendMode:"screen","--cm-effect-distance":`${distance}px`,...animationStyle(effect,effect.type==="digital-glitch"?"cm-effect-glitch":"cm-effect-wave")} as CSSProperties));maxExtent=Math.max(maxExtent,distance);continue;
    }
    if(effect.type==="animated-gradient"){
      overlays.push(overlay(effect,"gradient","effect-animated-gradient",{inset:"-55%",opacity:num(effect,"opacity",48)/100,background:`linear-gradient(${num(effect,"angle",120)}deg,${str(effect,"colorA")},${str(effect,"colorB")},${str(effect,"colorC")},${str(effect,"colorA")})`,mixBlendMode:str(effect,"blendMode","screen") as CSSProperties["mixBlendMode"],transform:"translate3d(-12%,-6%,0) scale(1.45)",...animationStyle(effect,"cm-effect-gradient")}));continue;
    }
    if(effect.type==="rainbow-cycle"||effect.type==="holographic"){
      const opacity=num(effect,"opacity",55);overlays.push(overlay(effect,"spectrum",effect.type==="holographic"?"effect-holographic":"effect-rainbow",{inset:"-55%",opacity:opacity/100,background:`conic-gradient(from ${num(effect,"angle",0)}deg,#ff3b81,#ffd24a,#46f7a5,#38bdf8,#8b5cf6,#ff3b81)`,mixBlendMode:"screen",filter:`saturate(${num(effect,"saturation",120)}%)`,transform:"rotate(0deg) scale(1.45)",...animationStyle(effect,"cm-effect-spectrum")}));continue;
    }
    if(effect.type==="chrome"){
      filters.push(`contrast(${num(effect,"contrast",160)}%)`);overlays.push(overlay(effect,"chrome","effect-chrome",{opacity:num(effect,"opacity",65)/100,background:`linear-gradient(${num(effect,"angle",90)}deg,#080b12 0%,#f8fbff 18%,#526174 36%,#fff 51%,#1a2431 69%,#d9e8f5 86%,#090d14 100%)`,mixBlendMode:"screen"}));continue;
    }
    if(effect.type==="text-extrusion"){
      const depth=Math.max(1,Math.round(num(effect,"depth",8))),angle=num(effect,"angle",135)*Math.PI/180,color=str(effect,"color","#321b78"),opacity=num(effect,"opacity",85),passes=Math.min(3,depth);for(let layer=1;layer<=passes;layer++){const distance=depth*layer/passes;filters.push(`drop-shadow(${(Math.cos(angle)*distance).toFixed(2)}px ${(Math.sin(angle)*distance).toFixed(2)}px 0 ${alpha(color,opacity*(1-layer/passes*.45))})`);}maxExtent=Math.max(maxExtent,depth+2);continue;
    }
    if(effect.type==="text-outline-glow"){
      const color=str(effect,"color","#68e7ff"),width=num(effect,"width",2),glow=num(effect,"glow",12),opacity=num(effect,"opacity",90);filters.push(`drop-shadow(${width}px 0 0 ${alpha(color,opacity)})`,`drop-shadow(${-width}px 0 0 ${alpha(color,opacity)})`,`drop-shadow(0 ${width}px 0 ${alpha(color,opacity)})`,`drop-shadow(0 ${-width}px 0 ${alpha(color,opacity)})`,`drop-shadow(0 0 ${glow}px ${alpha(color,opacity*.75)})`);maxExtent=Math.max(maxExtent,width+glow*1.5);continue;
    }
    if(effect.type==="grain"){
      const size=num(effect,"size",3);overlays.push(overlay(effect,"grain","effect-grain",{opacity:num(effect,"intensity",18)/100,backgroundImage:"radial-gradient(circle at 20% 30%,#fff 0 1px,transparent 1.2px),radial-gradient(circle at 70% 60%,#000 0 1px,transparent 1.2px)",backgroundSize:`${size}px ${size}px,${size+1}px ${size+1}px`,mixBlendMode:str(effect,"blendMode","overlay") as CSSProperties["mixBlendMode"]}));continue;
    }
    if(effect.type==="halftone"){
      const size=num(effect,"size",8),dot=num(effect,"dotSize",2);overlays.push(overlay(effect,"halftone","effect-halftone",{opacity:num(effect,"opacity",38)/100,backgroundImage:`radial-gradient(circle,${str(effect,"color","#000")} 0 ${dot}px,transparent ${dot+.5}px)`,backgroundSize:`${size}px ${size}px`,transform:`rotate(${num(effect,"angle",30)}deg) scale(1.5)`,mixBlendMode:"multiply"}));continue;
    }
    if(effect.type==="checkerboard"){
      const size=num(effect,"size",12),a=str(effect,"colorA","#fff"),b=str(effect,"colorB","#000");overlays.push(overlay(effect,"checker","effect-checkerboard",{opacity:num(effect,"opacity",28)/100,backgroundColor:a,backgroundImage:`linear-gradient(45deg,${b} 25%,transparent 25%,transparent 75%,${b} 75%),linear-gradient(45deg,${b} 25%,transparent 25%,transparent 75%,${b} 75%)`,backgroundPosition:`0 0,${size}px ${size}px`,backgroundSize:`${size*2}px ${size*2}px`,mixBlendMode:"overlay"}));continue;
    }
    if(effect.type==="gradient-border"){
      const width=num(effect,"width",3);overlays.push(overlay(effect,"border","effect-gradient-border",{padding:`${width}px`,background:`linear-gradient(${num(effect,"angle",120)}deg,${str(effect,"colorA")},${str(effect,"colorB")},${str(effect,"colorC")})`,opacity:num(effect,"opacity",100)/100,borderRadius:"inherit",WebkitMask:"linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0)",WebkitMaskComposite:"xor",maskComposite:"exclude"} as CSSProperties));continue;
    }
    if(effect.type==="neon-stroke"){
      const color=str(effect,"color","#44e7ff"),width=num(effect,"width",3),glow=num(effect,"glow",18),opacity=num(effect,"opacity",100);overlays.push(overlay(effect,"stroke","effect-neon-stroke",{border:`${width}px solid ${alpha(color,opacity)}`,borderRadius:"inherit",boxShadow:`0 0 ${glow}px ${alpha(color,opacity*.8)},inset 0 0 ${glow*.6}px ${alpha(color,opacity*.45)}`}));maxExtent=Math.max(maxExtent,glow*1.5);continue;
    }
    if(effect.type==="light-sweep"||effect.type==="shimmer"){
      const color=str(effect,effect.type==="light-sweep"?"color":"color","#fff"),width=num(effect,"width",20),opacity=num(effect,effect.type==="light-sweep"?"intensity":"opacity",70);overlays.push(overlay(effect,"shine","effect-shimmer",{inset:"-15% -85%",opacity:Math.min(1,opacity/100),background:`linear-gradient(${num(effect,"angle",110)}deg,transparent ${50-width/2}%,${alpha(color,70)} 50%,transparent ${50+width/2}%)`,transform:"translate3d(-38%,0,0)",...animationStyle(effect,"cm-effect-shimmer")}));continue;
    }
    if(effect.type==="vignette"){
      const color=flag(effect,"invert")?"#ffffff":str(effect,"color","#000"),amount=num(effect,"amount",45),softness=num(effect,"softness",65);overlays.push(overlay(effect,"vignette","effect-vignette",{background:`radial-gradient(ellipse at center,transparent ${Math.max(0,softness-35)}%,${alpha(color,amount)} 100%)`}));continue;
    }
  }
  return{filter:filters.length?filters.join(" "):undefined,boxShadows,backdropFilter,imageRendering,mixBlendMode,overlays,classes,maxExtent,animated};
}

export function visualEffectExtent(element:Pick<EditorElement,"effects"|"corners"|"type">){return composeVisualEffects(element).maxExtent;}
