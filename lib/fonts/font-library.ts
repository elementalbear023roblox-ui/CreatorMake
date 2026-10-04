export type FontCategory = "Sans Serif" | "Serif" | "Monospace" | "Pixel" | "Retro" | "Arcade" | "Computer" | "Terminal" | "Game UI" | "Horror" | "Sci-Fi" | "Industrial" | "Broadcast" | "Game Show" | "Cartoon" | "Comic" | "Handwritten" | "Display" | "Elegant" | "Condensed" | "Wide";
export type CreatorFont = { id:string;displayName:string;family:string;categories:FontCategory[];weights:number[];styles:Array<"normal"|"italic">;sourceType:"remote-stylesheet";source:"Google Fonts";sourceUrl:string;license:string };
export type FontLoadStatus = "idle" | "loading" | "loaded" | "failed";
export type FontFailureReason="NETWORK_ERROR"|"CSS_LOAD_ERROR"|"FACE_LOAD_ERROR"|"WEIGHT_NOT_AVAILABLE"|"STYLE_NOT_AVAILABLE"|"TIMEOUT"|"SOURCE_NOT_FOUND"|"FALLBACK_DETECTED";
export type FontDiagnostic={status:FontLoadStatus;failureReason?:FontFailureReason;message?:string;loadDurationMs?:number;attempts:number};

const groups: Array<{ categories: FontCategory[]; families: string[] }> = [
  { categories:["Sans Serif"], families:["Inter","Roboto","Arimo","Josefin Sans","Titillium Web","Open Sans","Lato","Montserrat","Poppins","Nunito","Nunito Sans","Raleway","Ubuntu","Work Sans","Manrope","DM Sans","Plus Jakarta Sans","Outfit","Rubik","Mulish","Karla","Figtree","Urbanist","Public Sans","Noto Sans","Source Sans 3","Merriweather Sans","Libre Franklin"] },
  { categories:["Sans Serif","Industrial"], families:["Barlow","Barlow Condensed","Barlow Semi Condensed","Archivo","Archivo Narrow","IBM Plex Sans","PT Sans"] },
  { categories:["Serif","Elegant"], families:["Balthazar","Fondamento","IBM Plex Serif","Noto Serif","Source Serif 4","Merriweather","PT Serif","Libre Baskerville","Bitter","Crimson Pro","Lora","Playfair Display","EB Garamond","Cormorant Garamond","Spectral","Roboto Slab","Zilla Slab","Arvo","Bree Serif","Cinzel","Cinzel Decorative"] },
  { categories:["Monospace","Computer"], families:["IBM Plex Mono","Noto Sans Mono","Source Code Pro","Space Mono","JetBrains Mono","Fira Code","Fira Mono","Roboto Mono","Inconsolata","Ubuntu Mono","Anonymous Pro","Cousine","Cutive Mono","DM Mono","Martian Mono","Overpass Mono","Spline Sans Mono"] },
  { categories:["Terminal","Retro"], families:["VT323","Share Tech Mono","Nova Mono","Azeret Mono","Chivo Mono","Major Mono Display","Syne Mono"] },
  { categories:["Pixel","Arcade","Game UI"], families:["Press Start 2P","Silkscreen","Pixelify Sans","Tiny5","Jersey 10","Jersey 15","Jersey 20","Jersey 25","DotGothic16","Micro 5","Handjet","Jacquard 12","Kode Mono"] },
  { categories:["Sci-Fi","Game UI"], families:["Jura","Oxanium","Orbitron","Audiowide","Rajdhani","Chakra Petch","Exo 2","Teko","Michroma","Electrolize","Quantico","Saira","Saira Condensed","Tomorrow"] },
  { categories:["Display","Industrial"], families:["Bangers","Denk One","Sarpanch","Russo One","Black Ops One","Bungee","Bungee Shade","Bungee Inline","Bebas Neue","Anton","Oswald","League Spartan","Archivo Black","Alfa Slab One","Righteous","Staatliches","Graduate","Fjalla One","Big Shoulders Display","Big Shoulders Stencil Display"] },
  { categories:["Cartoon","Game Show"], families:["Fredoka","Baloo 2","Luckiest Guy","Lilita One","Titan One","Concert One","Modak","Chewy","Bubblegum Sans","Boogaloo","Coiny","Fascinate","Faster One"] },
  { categories:["Handwritten","Comic"], families:["Amatic SC","Indie Flower","Permanent Marker","Rock Salt","Caveat","Patrick Hand","Comic Neue","Special Elite","Kalam","Gloria Hallelujah","Schoolbell","Shadows Into Light","Covered By Your Grace","Gochi Hand","Walter Turncoat"] },
  { categories:["Horror","Display"], families:["Creepster","Grenze Gotisch","Butcherman","Eater","Nosifer","Rubik Wet Paint","Rubik Glitch","Metal Mania","UnifrakturCook","Pirata One"] },
  { categories:["Broadcast","Condensed"], families:["Roboto Condensed","Open Sans Condensed","News Cycle","Encode Sans Condensed","Pathway Gothic One","Abel","Asap Condensed"] },
  { categories:["Wide","Display"], families:["Syncopate","Monoton","Zen Dots","Bruno Ace","Bruno Ace SC","Goldman","Days One"] },
];

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
// Families that do not follow the broad category defaults below. These variants
// mirror the Google Fonts family metadata (the legacy Open Sans Condensed family
// exposes 300/700). Keeping this explicit prevents a successful family load from
// masking a missing bold or italic face during a full-library audit.
const verifiedVariants: Record<string,{weights:number[];styles:Array<"normal"|"italic">}> = {
  "Amatic SC":{weights:[400,700],styles:["normal"]},
  "Arimo":{weights:[400,700],styles:["normal","italic"]},
  "Balthazar":{weights:[400],styles:["normal"]},
  "Bangers":{weights:[400],styles:["normal"]},
  "Denk One":{weights:[400],styles:["normal"]},
  "Fondamento":{weights:[400],styles:["normal","italic"]},
  "Grenze Gotisch":{weights:[400,700],styles:["normal"]},
  "Indie Flower":{weights:[400],styles:["normal"]},
  "Josefin Sans":{weights:[400,700],styles:["normal","italic"]},
  "Jura":{weights:[400,700],styles:["normal"]},
  "Sarpanch":{weights:[400,500,600,700,800,900],styles:["normal"]},
  "Titillium Web":{weights:[300,400,600,700],styles:["normal","italic"]},
  "Inter":{weights:[400,500,700],styles:["normal","italic"]},
  "Abel":{weights:[400],styles:["normal"]},
  "Audiowide":{weights:[400],styles:["normal"]},
  "Bree Serif":{weights:[400],styles:["normal"]},
  "Caveat":{weights:[400,700],styles:["normal"]},
  "Cinzel":{weights:[400,700],styles:["normal"]},
  "Cinzel Decorative":{weights:[400,700],styles:["normal"]},
  "Covered By Your Grace":{weights:[400],styles:["normal"]},
  "Cutive Mono":{weights:[400],styles:["normal"]},
  "DM Mono":{weights:[400],styles:["normal","italic"]},
  "Electrolize":{weights:[400],styles:["normal"]},
  "Fira Code":{weights:[400,700],styles:["normal"]},
  "Fira Mono":{weights:[400,700],styles:["normal"]},
  "Gloria Hallelujah":{weights:[400],styles:["normal"]},
  "Gochi Hand":{weights:[400],styles:["normal"]},
  "Inconsolata":{weights:[400,700],styles:["normal"]},
  "Kalam":{weights:[400,700],styles:["normal"]},
  "Major Mono Display":{weights:[400],styles:["normal"]},
  "Manrope":{weights:[400,700],styles:["normal"]},
  "Martian Mono":{weights:[400,700],styles:["normal"]},
  "Michroma":{weights:[400],styles:["normal"]},
  "Noto Sans Mono":{weights:[400,700],styles:["normal"]},
  "Nova Mono":{weights:[400],styles:["normal"]},
  "Open Sans Condensed":{weights:[300,700],styles:["normal"]},
  "Outfit":{weights:[400,700],styles:["normal"]},
  "Overpass Mono":{weights:[400,700],styles:["normal"]},
  "Pathway Gothic One":{weights:[400],styles:["normal"]},
  "Patrick Hand":{weights:[400],styles:["normal"]},
  "Permanent Marker":{weights:[400],styles:["normal"]},
  "Roboto Slab":{weights:[400,700],styles:["normal"]},
  "Rock Salt":{weights:[400],styles:["normal"]},
  "Schoolbell":{weights:[400],styles:["normal"]},
  "Shadows Into Light":{weights:[400],styles:["normal"]},
  "Share Tech Mono":{weights:[400],styles:["normal"]},
  "Special Elite":{weights:[400],styles:["normal"]},
  "Syne Mono":{weights:[400],styles:["normal"]},
  "UnifrakturCook":{weights:[700],styles:["normal"]},
  "VT323":{weights:[400],styles:["normal"]},
  "Walter Turncoat":{weights:[400],styles:["normal"]},
};
const deduped = new Map<string,CreatorFont>();
groups.forEach(({categories,families}) => families.forEach((family) => {
  const id=slug(family), existing=deduped.get(id);
  const singleWeight=categories.some((category)=>["Pixel","Arcade","Display","Horror","Handwritten","Game Show"].includes(category));
  const italicCapable=categories.some((category)=>["Sans Serif","Serif","Monospace","Comic","Elegant"].includes(category));
  const verified=verifiedVariants[family];
  deduped.set(id,{ id,displayName:family,family,categories:[...new Set([...(existing?.categories??[]),...categories])],weights:verified?.weights??(singleWeight?[400]:[400,700]),styles:verified?.styles??(italicCapable?["normal","italic"]:["normal"]),sourceType:"remote-stylesheet",source:"Google Fonts",sourceUrl:"https://fonts.googleapis.com/css2",license:"Open font license; see Google Fonts family metadata" });
}));

export const CREATOR_FONTS = [...deduped.values()].sort((a,b)=>a.family.localeCompare(b.family));
export const FONT_BY_ID = Object.fromEntries(CREATOR_FONTS.map((font)=>[font.id,font]));
export const FONT_CATEGORIES: Array<"All"|FontCategory> = ["All","Sans Serif","Serif","Monospace","Pixel","Retro","Arcade","Computer","Terminal","Game UI","Horror","Sci-Fi","Industrial","Broadcast","Game Show","Cartoon","Comic","Handwritten","Display","Elegant","Condensed","Wide"];

const status = new Map<string,FontLoadStatus>();
const promises = new Map<string,Promise<FontLoadStatus>>();
const diagnostics=new Map<string,FontDiagnostic>();
const rasterStyles = new Map<string,Promise<string>>();
const closest = (values:number[],requested:number) => values.reduce((best,value)=>Math.abs(value-requested)<Math.abs(best-requested)?value:best,values[0]??400);
const keyFor = (font:CreatorFont,weight:number,style:"normal"|"italic") => `${font.id}:${weight}:${style}`;

export function resolveCreatorFontVariant(font:CreatorFont,weight=400,style:"normal"|"italic"="normal"){
  return{weight:closest(font.weights,weight),style:font.styles.includes(style)?style:"normal" as const};
}

export function getFontLoadStatus(font:CreatorFont,weight=400,style:"normal"|"italic"="normal"){
  const{weight:actualWeight,style:actualStyle}=resolveCreatorFontVariant(font,weight,style);
  return status.get(keyFor(font,actualWeight,actualStyle))??"idle";
}

export function getFontDiagnostic(font:CreatorFont,weight=400,style:"normal"|"italic"="normal"){
  const variant=resolveCreatorFontVariant(font,weight,style);return diagnostics.get(keyFor(font,variant.weight,variant.style))??{status:"idle",attempts:0};
}

const timeout=<T>(promise:Promise<T>,milliseconds=12_000)=>new Promise<T>((resolve,reject)=>{const timer=setTimeout(()=>reject(Object.assign(new Error(`Font load exceeded ${milliseconds}ms.`),{fontReason:"TIMEOUT" satisfies FontFailureReason})),milliseconds);promise.then((value)=>{clearTimeout(timer);resolve(value);},(error)=>{clearTimeout(timer);reject(error);});});
const normalizedFamily=(value:string)=>value.replace(/["']/g,"").trim().toLowerCase();
const faceSupportsWeight=(declared:string,weight:number)=>{const numbers=declared.match(/\d+/g)?.map(Number)??[];return numbers.length>1?weight>=numbers[0]&&weight<=numbers.at(-1)!:numbers.length===0||numbers[0]===weight;};
export function hasLoadedCreatorFontFace(family:string,weight?:number,style?:"normal"|"italic"){
  if(typeof document==="undefined")return false;
  return Array.from(document.fonts).some((face)=>normalizedFamily(face.family)===normalizedFamily(family)&&face.status==="loaded"&&(weight===undefined||faceSupportsWeight(face.weight,weight))&&(style===undefined||face.style===style));
}

function fallbackMetricsDetected(family:string,weight:number,style:"normal"|"italic"){
  const canvas=document.createElement("canvas"),context=canvas.getContext("2d");if(!context)return false;
  const samples=["mmmmmmmmmm","iiiiiiiiii","WQ@#123","Hamburgefontsiv"],signature=(font:string)=>{context.font=`${style} ${weight} 32px ${font}`;return samples.map((sample)=>context.measureText(sample).width.toFixed(3)).join(":");},requested=signature(JSON.stringify(family));
  return ["Arial","Times New Roman","monospace"].every((fallback)=>signature(JSON.stringify(fallback))===requested);
}

export function loadCreatorFont(font: CreatorFont, weight=400, style:"normal"|"italic"="normal"):Promise<FontLoadStatus> {
  if (typeof document === "undefined") return Promise.resolve("idle");
  if(!font.weights.includes(weight)){diagnostics.set(keyFor(font,weight,style),{status:"failed",failureReason:"WEIGHT_NOT_AVAILABLE",message:`${font.family} does not advertise weight ${weight}.`,attempts:1});return Promise.resolve("failed");}
  if(!font.styles.includes(style)){diagnostics.set(keyFor(font,weight,style),{status:"failed",failureReason:"STYLE_NOT_AVAILABLE",message:`${font.family} does not advertise ${style}.`,attempts:1});return Promise.resolve("failed");}
  const actualWeight=weight,actualStyle=style,key=keyFor(font,actualWeight,actualStyle);
  const existing=promises.get(key); if(existing)return existing;
  status.set(key,"loading");diagnostics.set(key,{status:"loading",attempts:0});
  const request=(async():Promise<FontLoadStatus>=>{const started=performance.now();let lastReason:FontFailureReason="FACE_LOAD_ERROR",lastMessage="Font face did not load.";
    for(let attempt=1;attempt<=3;attempt++)try{
      let link=document.querySelector<HTMLLinkElement>(`link[data-creator-font="${key}"]`);
      if(!link){link=document.createElement("link");link.rel="stylesheet";link.dataset.creatorFont=key;link.href=`${font.sourceUrl}?family=${encodeURIComponent(font.family).replace(/%20/g,"+")}:ital,wght@${actualStyle==="italic"?1:0},${actualWeight}&display=block`;document.head.appendChild(link);}
      await timeout(new Promise<void>((resolve,reject)=>{if(link!.sheet){resolve();return;}link!.addEventListener("load",()=>resolve(),{once:true});link!.addEventListener("error",()=>reject(Object.assign(new Error("Font stylesheet failed to load."),{fontReason:"CSS_LOAD_ERROR" satisfies FontFailureReason})),{once:true});}));
      const descriptor=`${actualStyle} ${actualWeight} 32px ${JSON.stringify(font.family)}`,faces=await timeout(document.fonts.load(descriptor,"Hamburgefontsiv WQ@#123"));
      if(!faces.length||!hasLoadedCreatorFontFace(font.family,actualWeight,actualStyle))throw Object.assign(new Error("The requested face was not present after its stylesheet loaded."),{fontReason:"FACE_LOAD_ERROR" satisfies FontFailureReason});
      if(fallbackMetricsDetected(font.family,actualWeight,actualStyle))throw Object.assign(new Error("Font metrics match every sentinel fallback."),{fontReason:"FALLBACK_DETECTED" satisfies FontFailureReason});
      status.set(key,"loaded");diagnostics.set(key,{status:"loaded",loadDurationMs:Math.round(performance.now()-started),attempts:attempt});return"loaded";
    }catch(error){lastReason=(error as {fontReason?:FontFailureReason})?.fontReason??((error instanceof TypeError)?"NETWORK_ERROR":"FACE_LOAD_ERROR");lastMessage=error instanceof Error?error.message:String(error);document.querySelectorAll(`link[data-creator-font="${key}"]`).forEach((item)=>item.remove());if(attempt<3)await new Promise((resolve)=>setTimeout(resolve,attempt*250));}
    status.set(key,"failed");diagnostics.set(key,{status:"failed",failureReason:lastReason,message:lastMessage,loadDurationMs:Math.round(performance.now()-started),attempts:3});return"failed";
  })();
  promises.set(key,request); return request;
}

export function retryCreatorFont(font:CreatorFont,weight=400,style:"normal"|"italic"="normal"){
  const{weight:actualWeight,style:actualStyle}=resolveCreatorFontVariant(font,weight,style),key=keyFor(font,actualWeight,actualStyle);
  promises.delete(key);status.delete(key);diagnostics.delete(key);document.querySelectorAll(`link[data-creator-font="${key}"]`).forEach((link)=>link.remove());return loadCreatorFont(font,actualWeight,actualStyle);
}

const blobDataUrl=(buffer:ArrayBuffer,mimeType:string)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>typeof reader.result==="string"?resolve(reader.result):reject(new Error("Font bytes could not be encoded."));reader.onerror=()=>reject(reader.error??new Error("Font bytes could not be read."));reader.readAsDataURL(new Blob([buffer],{type:mimeType||"font/woff2"}));});

/** Returns a self-contained @font-face stylesheet for SVG/foreignObject capture. */
export function creatorFontRasterStyle(font:CreatorFont,weight=400,style:"normal"|"italic"="normal",text="CreatorMake"){
  const{weight:actualWeight,style:actualStyle}=resolveCreatorFontVariant(font,weight,style),cacheKey=`${keyFor(font,actualWeight,actualStyle)}:${text}`;
  const existing=rasterStyles.get(cacheKey);if(existing)return existing;
  const request=(async()=>{
    const family=encodeURIComponent(font.family).replace(/%20/g,"+"),sample=encodeURIComponent(text||"CreatorMake"),url=`https://fonts.googleapis.com/css2?family=${family}:ital,wght@${actualStyle==="italic"?1:0},${actualWeight}&display=block&text=${sample}`;
    const response=await fetch(url,{mode:"cors"});if(!response.ok)throw new Error(`Font stylesheet request failed (${response.status}).`);
    let css=await response.text();
    if(!css.includes("@font-face")||!new RegExp(`font-family:\\s*['\"]${font.family.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}['\"]`,"i").test(css))throw new Error("Font stylesheet did not contain the requested family.");
    const urls=[...new Set([...css.matchAll(/url\((['\"]?)(https:\/\/[^)'\"]+)\1\)/g)].map((match)=>match[2]))];
    if(!urls.length)throw new Error("Font stylesheet did not provide a font resource.");
    for(const sourceUrl of urls){const fontResponse=await fetch(sourceUrl,{mode:"cors"});if(!fontResponse.ok)throw new Error(`Font resource request failed (${fontResponse.status}).`);const dataUrl=await blobDataUrl(await fontResponse.arrayBuffer(),fontResponse.headers.get("content-type")??"font/woff2");css=css.split(sourceUrl).join(dataUrl);}
    return css.replace(/font-display:\s*[^;]+;/gi,"font-display:block;");
  })();
  rasterStyles.set(cacheKey,request);request.catch(()=>rasterStyles.delete(cacheKey));return request;
}

export type FontAuditResult={ready:CreatorFont[];failed:Array<{font:CreatorFont;variants:string[]}>;testedVariants:number};
export async function auditCreatorFonts(onProgress?:(complete:number,total:number,font:CreatorFont)=>void):Promise<FontAuditResult>{
  const jobs=CREATOR_FONTS.flatMap((font)=>font.weights.flatMap((weight)=>font.styles.map((style)=>({font,weight,style}))));let cursor=0,complete=0;const failures=new Map<string,string[]>();
  const worker=async()=>{while(cursor<jobs.length){const job=jobs[cursor++];const result=await loadCreatorFont(job.font,job.weight,job.style);if(result!=="loaded")failures.set(job.font.id,[...(failures.get(job.font.id)??[]),`${job.weight} ${job.style}`]);complete++;onProgress?.(complete,jobs.length,job.font);}};
  await Promise.all(Array.from({length:Math.min(8,jobs.length)},worker));return{ready:CREATOR_FONTS.filter((font)=>!failures.has(font.id)),failed:CREATOR_FONTS.filter((font)=>failures.has(font.id)).map((font)=>({font,variants:failures.get(font.id)!})),testedVariants:jobs.length};
}
