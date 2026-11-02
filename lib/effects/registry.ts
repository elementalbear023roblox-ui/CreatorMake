import type { EffectAnimation, EffectCategory, EffectParameterValue, ElementType, VisualEffectInstance } from "../editor/types";

export type EffectParameterDefinition={key:string;label:string;kind:"number"|"color"|"select"|"boolean";defaultValue:EffectParameterValue;min?:number;max?:number;step?:number;unit?:string;options?:string[]};
export type EffectDefinition={id:string;name:string;category:EffectCategory;description:string;parameters:EffectParameterDefinition[];supportedTypes?:ElementType[];nativeRoblox:boolean;exportHint:string};

export const EFFECT_CATEGORIES:EffectCategory[]=["Lighting & Glow","Pixel & Retro","Blur & Focus","Distortion & Warping","Color & Gradients","Shadows & Depth","Holographic & Futuristic","Text & Typography","Stroke Effects","Texture & Material","Animation & Motion"];
const number=(key:string,label:string,defaultValue:number,min:number,max:number,step=1,unit=""):EffectParameterDefinition=>({key,label,kind:"number",defaultValue,min,max,step,unit});
const color=(key:string,label:string,defaultValue:string):EffectParameterDefinition=>({key,label,kind:"color",defaultValue});
const select=(key:string,label:string,defaultValue:string,options:string[]):EffectParameterDefinition=>({key,label,kind:"select",defaultValue,options});
const bool=(key:string,label:string,defaultValue:boolean):EffectParameterDefinition=>({key,label,kind:"boolean",defaultValue});
const glow=[color("color","Glow color","#8b5cff"),number("intensity","Intensity",100,0,300),number("radius","Radius",18,0,120,.5,"px"),number("softness","Softness",65,0,100,1,"%"),number("spread","Spread",3,0,60,.5,"px"),number("opacity","Opacity",90,0,100,1,"%"),number("layers","Glow layers",3,1,6),number("falloff","Falloff",65,0,100,1,"%"),select("blendMode","Blend mode","screen",["normal","screen","lighten","overlay"]),bool("inner","Inner glow",false),bool("outer","Outer glow",true)];
const intensity=[number("intensity","Intensity",60,0,100,1,"%"),number("opacity","Opacity",70,0,100,1,"%")];
const speed=[number("speed","Animation speed",1,.1,8,.1,"×")];
const all=(id:string,name:string,category:EffectCategory,description:string,parameters:EffectParameterDefinition[],nativeRoblox=false,exportHint="Rasterized for pixel-accurate Roblox export"):EffectDefinition=>({id,name,category,description,parameters,nativeRoblox,exportHint});

export const EFFECT_DEFINITIONS:EffectDefinition[]=[
  all("neon-glow","Neon Glow","Lighting & Glow","Layered high-energy inner and outer illumination.",glow),
  all("outer-glow","Outer Glow","Lighting & Glow","Soft light extending beyond the object.",glow.map((item)=>item.key==="layers"?{...item,defaultValue:2}:item)),
  all("inner-glow","Inner Glow","Lighting & Glow","Illumination contained within the object.",glow.map((item)=>item.key==="inner"?{...item,defaultValue:true}:item.key==="outer"?{...item,defaultValue:false}:item)),
  all("bloom","Bloom","Lighting & Glow","Bright-region bloom with a broad falloff.",[...glow,number("threshold","Brightness threshold",65,0,100,1,"%")]),
  all("edge-glow","Edge Glow","Lighting & Glow","Concentrated light following visible contours.",[...glow,number("edgeWidth","Edge width",2,.25,16,.25,"px")]),
  all("rainbow-glow","Rainbow Glow","Lighting & Glow","Layered spectral illumination around the silhouette.",[...glow,number("hueSpread","Hue spread",180,0,360,1,"°"),...speed]),
  all("light-sweep","Light Sweep","Lighting & Glow","A moving specular highlight across the object.",[color("color","Light color","#ffffff"),number("width","Sweep width",22,2,80,1,"%"),number("intensity","Intensity",80,0,200,1,"%"),number("angle","Angle",115,0,360,1,"°"),...speed]),
  all("pixelation","Classic Pixelation","Pixel & Retro","Non-destructive hard-edged pixel grid treatment.",[number("pixelSize","Pixel size",8,1,64,1,"px"),number("density","Density",100,10,300,1,"%"),select("shape","Pixel shape","square",["square","round","diamond"]),number("sharpness","Edge sharpness",100,0,100,1,"%"),number("strength","Strength",100,0,100,1,"%"),number("offsetX","Offset X",0,-64,64,1,"px"),number("offsetY","Offset Y",0,-64,64,1,"px")]),
  all("retro-8bit","Retro 8-Bit","Pixel & Retro","Hard pixels, reduced color depth, and arcade contrast.",[number("pixelSize","Pixel size",10,2,48,1,"px"),number("levels","Color levels",8,2,32,1),number("contrast","Contrast",125,50,250,1,"%"),number("strength","Strength",100,0,100,1,"%")]),
  all("dither","Dithered Gradient","Pixel & Retro","Ordered dot dithering for retro color transitions.",[number("pixelSize","Pattern size",4,1,24,1,"px"),number("strength","Strength",45,0,100,1,"%"),select("pattern","Pattern","bayer",["bayer","dots","diagonal"]),color("color","Pattern color","#000000")]),
  all("scanlines","Scanlines","Pixel & Retro","Configurable CRT scanline overlay.",[number("size","Line spacing",5,2,30,1,"px"),number("thickness","Line thickness",1,1,10,1,"px"),number("opacity","Opacity",24,0,100,1,"%"),select("direction","Direction","horizontal",["horizontal","vertical"]),...speed]),
  all("crt","CRT Screen","Pixel & Retro","Scanlines, phosphor tint, vignette, and display contrast.",[number("scanlineSize","Scanline size",4,2,20,1,"px"),number("scanlineOpacity","Scanline opacity",22,0,100,1,"%"),number("vignette","Vignette",38,0,100,1,"%"),number("contrast","Contrast",118,50,250,1,"%"),color("tint","Phosphor tint","#54ff9f"),number("tintOpacity","Tint",12,0,100,1,"%")]),
  all("chromatic-aberration","Chromatic Aberration","Pixel & Retro","Color-channel displacement around edges.",[number("distance","Channel distance",4,0,30,.25,"px"),number("angle","Direction",0,0,360,1,"°"),number("opacity","Opacity",70,0,100,1,"%")]),
  all("digital-glitch","Digital Glitch","Distortion & Warping","Seeded color displacement and scan tearing.",[...intensity,number("frequency","Frequency",35,0,100,1,"%"),number("distance","Displacement",7,0,40,.5,"px"),number("seed","Seed",1337,0,99999,1),select("direction","Direction","horizontal",["horizontal","vertical"]),...speed]),
  all("wave-distortion","Wave Distortion","Distortion & Warping","Animated wave bands with controlled amplitude.",[number("amplitude","Amplitude",6,0,40,.5,"px"),number("frequency","Frequency",3,.25,12,.25),number("phase","Phase",0,0,360,1,"°"),number("opacity","Opacity",70,0,100,1,"%"),...speed]),
  all("gaussian-blur","Gaussian Blur","Blur & Focus","Smooth GPU-accelerated blur.",[number("radius","Radius",6,0,80,.25,"px")]),
  all("sharpen","Sharpen","Blur & Focus","Crisp edge enhancement.",[number("amount","Amount",35,0,100,1,"%")]),
  all("brightness","Brightness","Color & Gradients","Adjusts overall luminance.",[number("amount","Brightness",120,0,300,1,"%")],true,"Native color where possible; otherwise rasterized"),
  all("contrast","Contrast","Color & Gradients","Expands or compresses tonal contrast.",[number("amount","Contrast",125,0,300,1,"%")]),
  all("saturation","Saturation","Color & Gradients","Controls color intensity.",[number("amount","Saturation",140,0,400,1,"%")]),
  all("hue-shift","Hue Shift","Color & Gradients","Rotates all hues while preserving editability.",[number("angle","Hue",45,-360,360,1,"°")]),
  all("grayscale","Grayscale","Color & Gradients","Removes color by a controllable amount.",[number("amount","Amount",100,0,100,1,"%")]),
  all("sepia","Sepia","Color & Gradients","Warm photographic toning.",[number("amount","Amount",80,0,100,1,"%")]),
  all("invert","Invert","Color & Gradients","Inverts rendered colors.",[number("amount","Amount",100,0,100,1,"%")]),
  all("animated-gradient","Animated Gradient","Color & Gradients","Moving multi-color overlay that preserves the original fill.",[color("colorA","Color A","#7c3cff"),color("colorB","Color B","#22d3ee"),color("colorC","Color C","#ff4da6"),number("angle","Angle",120,0,360,1,"°"),number("opacity","Opacity",48,0,100,1,"%"),select("blendMode","Blend mode","screen",["normal","screen","overlay","color"]),...speed]),
  all("rainbow-cycle","Rainbow Cycle","Color & Gradients","Animated full-spectrum color cycling.",[number("opacity","Opacity",55,0,100,1,"%"),number("saturation","Saturation",100,0,200,1,"%"),...speed]),
  all("drop-shadow","Outer Shadow","Shadows & Depth","Layerable drop shadow with precise offset and spread.",[color("color","Color","#000000"),number("x","X",0,-100,100,.5,"px"),number("y","Y",12,-100,100,.5,"px"),number("blur","Blur",24,0,160,.5,"px"),number("spread","Spread",0,-40,100,.5,"px"),number("opacity","Opacity",50,0,100,1,"%")],true,"Roblox uses a rendered shadow layer when required"),
  all("inner-shadow","Inner Shadow","Shadows & Depth","Recessed interior depth.",[color("color","Color","#000000"),number("x","X",0,-60,60,.5,"px"),number("y","Y",5,-60,60,.5,"px"),number("blur","Blur",12,0,80,.5,"px"),number("spread","Spread",0,-30,60,.5,"px"),number("opacity","Opacity",55,0,100,1,"%")]),
  all("bevel","Bevel","Shadows & Depth","Directional highlight and shadow for raised edges.",[number("size","Size",4,1,30,.5,"px"),number("softness","Softness",35,0,100,1,"%"),number("depth","Depth",70,0,200,1,"%"),number("angle","Light angle",135,0,360,1,"°")]),
  all("glass","Glass","Texture & Material","Transparent glass surface with specular depth.",[number("blur","Background blur",8,0,40,.5,"px"),number("opacity","Surface opacity",18,0,100,1,"%"),number("saturation","Saturation",130,0,300,1,"%"),color("tint","Tint","#b8d8ff")]),
  all("frosted-glass","Frosted Glass","Texture & Material","Diffuse translucent material with background blur.",[number("blur","Background blur",18,0,60,.5,"px"),number("opacity","Surface opacity",32,0,100,1,"%"),number("grain","Frost grain",12,0,100,1,"%"),color("tint","Tint","#d8e7ff")]),
  all("grain","Grain","Texture & Material","Fine procedural material grain.",[number("size","Grain size",3,1,16,1,"px"),number("intensity","Intensity",18,0,100,1,"%"),number("seed","Seed",42,0,99999,1),select("blendMode","Blend mode","overlay",["normal","overlay","soft-light","multiply"])]),
  all("halftone","Halftone","Texture & Material","Comic-style repeating dot screen.",[number("size","Dot spacing",8,2,40,1,"px"),number("dotSize","Dot size",2,1,20,.5,"px"),number("angle","Angle",30,0,360,1,"°"),number("opacity","Opacity",38,0,100,1,"%"),color("color","Dot color","#000000")]),
  all("checkerboard","Checkerboard","Texture & Material","Adjustable repeating square pattern.",[number("size","Cell size",12,2,80,1,"px"),number("opacity","Opacity",28,0,100,1,"%"),color("colorA","Color A","#ffffff"),color("colorB","Color B","#000000")]),
  all("holographic","Holographic Surface","Holographic & Futuristic","Iridescent spectral surface with shifting highlights.",[number("opacity","Opacity",52,0,100,1,"%"),number("angle","Angle",135,0,360,1,"°"),number("intensity","Intensity",100,0,200,1,"%"),...speed]),
  all("chrome","Chrome Surface","Holographic & Futuristic","High-contrast reflective metallic finish.",[number("contrast","Contrast",160,50,300,1,"%"),number("shine","Shine",75,0,100,1,"%"),number("angle","Angle",90,0,360,1,"°"),number("opacity","Opacity",65,0,100,1,"%")]),
  all("text-extrusion","Text Extrusion","Text & Typography","Layered editable-text depth with directional color shading.",[color("color","Extrusion color","#321b78"),number("depth","Depth",8,1,40,1,"px"),number("angle","Direction",135,0,360,1,"°"),number("opacity","Opacity",85,0,100,1,"%")]),
  all("text-outline-glow","Outline Glow","Text & Typography","Crisp luminous outline for editable text and labels.",[color("color","Outline color","#68e7ff"),number("width","Outline width",2,.25,12,.25,"px"),number("glow","Glow radius",12,0,80,.5,"px"),number("opacity","Opacity",90,0,100,1,"%")]),
  all("neon-stroke","Neon Stroke","Stroke Effects","Contour-following illuminated stroke.",[color("color","Stroke color","#44e7ff"),number("width","Width",3,.25,30,.25,"px"),number("glow","Glow strength",18,0,100,.5,"px"),number("opacity","Opacity",100,0,100,1,"%")]),
  all("gradient-border","Gradient Border","Stroke Effects","Multicolor border overlay.",[color("colorA","Color A","#7c3cff"),color("colorB","Color B","#22d3ee"),color("colorC","Color C","#ff4da6"),number("width","Width",3,.25,24,.25,"px"),number("angle","Angle",120,0,360,1,"°"),number("opacity","Opacity",100,0,100,1,"%")]),
  all("shimmer","Shimmer","Animation & Motion","Animated material highlight.",[color("color","Highlight","#ffffff"),number("width","Width",18,2,80,1,"%"),number("opacity","Opacity",65,0,100,1,"%"),number("angle","Angle",110,0,360,1,"°"),...speed]),
  all("vignette","Vignette","Texture & Material","Darkens or brightens the object edges.",[color("color","Color","#000000"),number("amount","Amount",45,0,100,1,"%"),number("softness","Softness",65,0,100,1,"%"),bool("invert","Light vignette",false)])
];

export const EFFECT_BY_ID=new Map(EFFECT_DEFINITIONS.map((definition)=>[definition.id,definition]));
export const DEFAULT_EFFECT_ANIMATION:EffectAnimation={enabled:false,duration:2,speed:1,direction:"normal",loopMode:"loop",easing:"ease-in-out",delay:0,phaseOffset:0};
const effectId=()=>`effect_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;

export function createVisualEffect(type:string,overrides:Partial<VisualEffectInstance>={}){
  const definition=EFFECT_BY_ID.get(type)??EFFECT_DEFINITIONS[0];
  const base:VisualEffectInstance={id:effectId(),type:definition.id,name:definition.name,enabled:true,expanded:true,parameters:Object.fromEntries(definition.parameters.map((parameter)=>[parameter.key,parameter.defaultValue])),animation:{...DEFAULT_EFFECT_ANIMATION}};
  return{...base,...overrides,animation:{...DEFAULT_EFFECT_ANIMATION,...overrides.animation}} satisfies VisualEffectInstance;
}

export function normalizeVisualEffects(value:unknown):VisualEffectInstance[]{
  if(!Array.isArray(value))return[];
  return value.flatMap((candidate)=>{if(!candidate||typeof candidate!=="object")return[];const source=candidate as Partial<VisualEffectInstance>,definition=EFFECT_BY_ID.get(String(source.type));if(!definition)return[];const defaults=createVisualEffect(definition.id),parameters={...defaults.parameters};for(const parameter of definition.parameters){const current=source.parameters?.[parameter.key];if(parameter.kind==="number"&&typeof current==="number"&&Number.isFinite(current))parameters[parameter.key]=Math.max(parameter.min??-Infinity,Math.min(parameter.max??Infinity,current));else if(parameter.kind==="boolean"&&typeof current==="boolean")parameters[parameter.key]=current;else if((parameter.kind==="color"||parameter.kind==="select")&&typeof current==="string")parameters[parameter.key]=current;}return[{...defaults,id:typeof source.id==="string"?source.id:defaults.id,name:typeof source.name==="string"&&source.name.trim()?source.name.trim():definition.name,enabled:source.enabled!==false,expanded:Boolean(source.expanded),parameters,animation:{...DEFAULT_EFFECT_ANIMATION,...(source.animation??{})}}];});
}

export type EffectPreset={id:string;name:string;category:string;effects:Array<{type:string;parameters?:Record<string,EffectParameterValue>;animation?:Partial<EffectAnimation>}>};
export const EFFECT_PRESETS:EffectPreset[]=[
  {id:"neon-arcade",name:"Neon Arcade",category:"Neon",effects:[{type:"neon-glow",parameters:{color:"#21dfff",radius:20,intensity:145,layers:4}},{type:"chromatic-aberration",parameters:{distance:2,opacity:45}},{type:"scanlines",parameters:{opacity:12,size:5}}]},
  {id:"electric-purple",name:"Electric Purple",category:"Neon",effects:[{type:"neon-glow",parameters:{color:"#9d4dff",radius:24,intensity:170,layers:4}},{type:"bloom",parameters:{color:"#ff4de1",radius:12,opacity:50}}]},
  {id:"8bit-arcade",name:"8-Bit Arcade",category:"Retro",effects:[{type:"retro-8bit"},{type:"dither",parameters:{strength:22}},{type:"scanlines",parameters:{size:4,opacity:15}}]},
  {id:"crt-terminal",name:"CRT Terminal",category:"Retro",effects:[{type:"crt"},{type:"outer-glow",parameters:{color:"#48ff91",radius:8,opacity:45,layers:2}}]},
  {id:"holographic-interface",name:"Holographic Interface",category:"Futuristic",effects:[{type:"holographic",animation:{enabled:true,duration:4}},{type:"edge-glow",parameters:{color:"#5defff",radius:10,opacity:60}}]},
  {id:"cyberpunk-neon",name:"Cyberpunk Neon",category:"Futuristic",effects:[{type:"animated-gradient",animation:{enabled:true,duration:5}},{type:"neon-glow",parameters:{color:"#ff3ed1",radius:18,layers:3}},{type:"digital-glitch",parameters:{intensity:20,opacity:25}}]},
  {id:"chrome",name:"Polished Chrome",category:"Luxury",effects:[{type:"chrome"},{type:"shimmer",animation:{enabled:true,duration:3}}]},
  {id:"crystal-glass",name:"Crystal Glass",category:"Luxury",effects:[{type:"glass",parameters:{blur:14,opacity:24}},{type:"gradient-border",parameters:{width:1.5,opacity:70}},{type:"inner-glow",parameters:{color:"#ffffff",radius:9,opacity:35}}]},
  {id:"pixel-corruption",name:"Pixel Corruption",category:"Experimental",effects:[{type:"pixelation",parameters:{pixelSize:7,strength:70}},{type:"digital-glitch",animation:{enabled:true,duration:1.2}},{type:"chromatic-aberration",parameters:{distance:6}}]}
];

export function instantiateEffectPreset(preset:EffectPreset){return preset.effects.map((item)=>{const effect=createVisualEffect(item.type,{animation:{...DEFAULT_EFFECT_ANIMATION,...item.animation}});return{...effect,parameters:{...effect.parameters,...item.parameters}};});}
