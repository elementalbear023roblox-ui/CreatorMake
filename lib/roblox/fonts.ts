export type RobloxFontAvailability = "READY" | "LOADING" | "FAILED" | "UNSUPPORTED";
export type RobloxFontCategory = "Sans" | "Serif" | "Display" | "Handwritten" | "Pixel / Arcade" | "Mono / Code" | "Decorative";
export type RobloxFontStyle = "normal" | "italic";
export type RobloxFontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export type RobloxFontEnumMapping = { enumName:string; weight?:RobloxFontWeight; style?:RobloxFontStyle };
export type RobloxFontDefinition = {
  id:string; displayName:string; family:string; familyAsset:string; enumMappings:RobloxFontEnumMapping[];
  supportedWeights:RobloxFontWeight[]; supportedStyles:RobloxFontStyle[]; defaultWeight:RobloxFontWeight;
  defaultStyle:RobloxFontStyle; aliases:string[]; category:RobloxFontCategory; availability:RobloxFontAvailability; webPreviewFamily?:string;
};
export type RobloxFontCompatibility = {
  level:"native"|"close"|"unsupported";
  label:"ROBLOX NATIVE"|"CLOSE ROBLOX MATCH"|"CUSTOM / NOT DIRECTLY SUPPORTED";
  family?:string; enumName?:string; matchName?:string; definition?:RobloxFontDefinition;
};

const slug=(value:string)=>value.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"");
const normal:RobloxFontStyle[]=["normal"],normalItalic:RobloxFontStyle[]=["normal","italic"];
const weights=(...values:RobloxFontWeight[])=>values;
const mapping=(enumName:string,weight?:RobloxFontWeight,style?:RobloxFontStyle):RobloxFontEnumMapping=>({enumName,...(weight?{weight}:{}),...(style?{style}:{})});
function font(displayName:string,file:string,category:RobloxFontCategory,supportedWeights:RobloxFontWeight[]=weights(400),supportedStyles:RobloxFontStyle[]=normal,enumMappings:RobloxFontEnumMapping[]=[],aliases:string[]=[],webPreviewFamily?:string):RobloxFontDefinition{
  return{id:slug(displayName),displayName,family:displayName,familyAsset:`rbxasset://fonts/families/${file}.json`,enumMappings,supportedWeights,supportedStyles,defaultWeight:supportedWeights.includes(400)?400:supportedWeights[0],defaultStyle:supportedStyles.includes("normal")?"normal":supportedStyles[0],aliases:[...new Set([displayName,file,...aliases,...enumMappings.map((item)=>item.enumName)])],category,availability:"READY",...(webPreviewFamily?{webPreviewFamily}:{})};
}

// Canonical CreatorMake registry. Family assets and legacy Enum.Font aliases
// follow Roblox's Font datatype reference. Variant arrays are explicit so the
// picker and exporter never advertise or synthesize an unsupported Roblox face.
export const ROBLOX_FONT_REGISTRY:RobloxFontDefinition[]=[
  font("Accanthis ADF Std","AccanthisADFStd","Serif",weights(400),normal,[mapping("Bodoni")],["Accanthis","Bodoni"]),
  font("Amatic SC","AmaticSC","Handwritten",weights(400,700),normal,[mapping("AmaticSC")],[],"Amatic SC"),
  font("Arimo","Arimo","Sans",weights(400,700),normalItalic,[mapping("Arimo",400),mapping("ArimoBold",700)],[],"Arimo"),
  font("Balthazar","Balthazar","Serif",weights(400),normal,[mapping("Fantasy")],["Fantasy"],"Balthazar"),
  font("Bangers","Bangers","Display",weights(400),normal,[mapping("Bangers")],[],"Bangers"),
  font("Builder Extended","BuilderExtended","Display",weights(300,400,600,700,800),normal,[],["BuilderExtended"]),
  font("Builder Mono","BuilderMono","Mono / Code",weights(300,400,700),normal,[],["BuilderMono"]),
  font("Builder Sans","BuilderSans","Sans",weights(100,300,400,500,600,700,800),normal,[mapping("BuilderSans",400),mapping("BuilderSansMedium",500),mapping("BuilderSansBold",700),mapping("BuilderSansExtraBold",800)],["Builder","Gotham"]),
  font("Comic Neue Angular","ComicNeueAngular","Decorative",weights(400,700),normalItalic,[mapping("Cartoon")],["Cartoon","Comic Neue"]),
  font("Creepster","Creepster","Decorative",weights(400),normal,[mapping("Creepster")],[],"Creepster"),
  font("Denk One","DenkOne","Display",weights(400),normal,[mapping("DenkOne")],[],"Denk One"),
  font("Fondamento","Fondamento","Decorative",weights(400),normalItalic,[mapping("Fondamento")],[],"Fondamento"),
  font("Fredoka One","FredokaOne","Display",weights(400),normal,[mapping("FredokaOne")],["Fredoka"]),
  font("Grenze Gotisch","GrenzeGotisch","Decorative",weights(400,700),normal,[mapping("GrenzeGotisch")],[],"Grenze Gotisch"),
  font("Guru","Guru","Serif",weights(400),normal,[mapping("Garamond")],["Garamond"]),
  font("Highway Gothic","HighwayGothic","Display",weights(400),normal,[mapping("Highway")],["Highway"]),
  font("Inconsolata","Inconsolata","Mono / Code",weights(400,700),normal,[mapping("Code")],["Code"],"Inconsolata"),
  font("Indie Flower","IndieFlower","Handwritten",weights(400),normal,[mapping("IndieFlower")],[],"Indie Flower"),
  font("Josefin Sans","JosefinSans","Sans",weights(400,700),normalItalic,[mapping("JosefinSans")],[],"Josefin Sans"),
  font("Jura","Jura","Sans",weights(400,700),normal,[mapping("Jura")],[],"Jura"),
  font("Kalam","Kalam","Handwritten",weights(400,700),normal,[mapping("Kalam")],[],"Kalam"),
  font("Legacy Arial","LegacyArial","Sans",weights(400,700),normalItalic,[mapping("Legacy")],["Arial","Legacy"]),
  font("Luckiest Guy","LuckiestGuy","Display",weights(400),normal,[mapping("LuckiestGuy")],[],"Luckiest Guy"),
  font("Merriweather","Merriweather","Serif",weights(400,700),normalItalic,[mapping("Merriweather")],[],"Merriweather"),
  font("Michroma","Michroma","Display",weights(400),normal,[mapping("Michroma")],[],"Michroma"),
  font("Montserrat","Montserrat","Sans",weights(400,500,600,700,800),normalItalic,[],[],"Montserrat"),
  font("Nunito","Nunito","Sans",weights(400,600,700,800),normalItalic,[mapping("Nunito")],[],"Nunito"),
  font("Oswald","Oswald","Display",weights(400,500,600,700),normal,[mapping("Oswald")],[],"Oswald"),
  font("Patrick Hand","PatrickHand","Handwritten",weights(400),normal,[mapping("PatrickHand")],[],"Patrick Hand"),
  font("Permanent Marker","PermanentMarker","Handwritten",weights(400),normal,[mapping("PermanentMarker")],[],"Permanent Marker"),
  font("Press Start 2P","PressStart2P","Pixel / Arcade",weights(400),normal,[mapping("Arcade")],["Arcade","Pixel"],"Press Start 2P"),
  font("Roboto","Roboto","Sans",weights(300,400,500,700,900),normalItalic,[mapping("Roboto")],[],"Roboto"),
  font("Roboto Condensed","RobotoCondensed","Sans",weights(300,400,700),normalItalic,[mapping("RobotoCondensed")],[],"Roboto Condensed"),
  font("Roboto Mono","RobotoMono","Mono / Code",weights(400,700),normalItalic,[mapping("RobotoMono")],[],"Roboto Mono"),
  font("Roman Antique","RomanAntique","Serif",weights(400),normal,[mapping("Antique")],["Antique"]),
  font("Sarpanch","Sarpanch","Display",weights(400,500,600,700,800,900),normal,[mapping("Sarpanch")],[],"Sarpanch"),
  font("Source Sans Pro","SourceSansPro","Sans",weights(300,400,600,700),normalItalic,[mapping("SourceSans",400),mapping("SourceSansLight",300),mapping("SourceSansSemibold",600),mapping("SourceSansBold",700),mapping("SourceSansItalic",400,"italic")],["Source Sans","SourceSans"]),
  font("Special Elite","SpecialElite","Decorative",weights(400),normal,[mapping("SpecialElite")],[],"Special Elite"),
  font("Titillium Web","TitilliumWeb","Sans",weights(300,400,600,700),normalItalic,[mapping("TitilliumWeb")],[],"Titillium Web"),
  font("Ubuntu","Ubuntu","Sans",weights(300,400,500,700),normalItalic,[mapping("Ubuntu")],[],"Ubuntu"),
  font("Zekton","Zekton","Display",weights(400),normal,[mapping("SciFi")],["Sci Fi","SciFi"]),
];

export const ROBLOX_NATIVE_FONT_REGISTRY=ROBLOX_FONT_REGISTRY;
export const ROBLOX_FONT_CATEGORIES:Array<"All"|RobloxFontCategory>=["All","Sans","Serif","Display","Handwritten","Pixel / Arcade","Mono / Code","Decorative"];
export const DEFAULT_ROBLOX_FONT_FAMILY="Builder Sans";
const normalized=(value:string)=>value.trim().toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const definitionsByName=new Map<string,RobloxFontDefinition>();
ROBLOX_FONT_REGISTRY.forEach((definition)=>[definition.id,definition.displayName,definition.family,definition.familyAsset,...definition.aliases].forEach((value)=>definitionsByName.set(normalized(value),definition)));
export function getRobloxFontDefinition(value:string){return definitionsByName.get(normalized(value));}
export function isRobloxNativeFontFamily(family:string){return getRobloxFontDefinition(family)?.availability==="READY";}
export function searchRobloxFonts(query:string){const needle=normalized(query);return ROBLOX_FONT_REGISTRY.filter((definition)=>definition.availability==="READY"&&(!needle||normalized([definition.displayName,definition.family,definition.category,...definition.aliases].join(" ")).includes(needle)));}
export function resolveRobloxFontVariant(definition:RobloxFontDefinition,weight:number=definition.defaultWeight,style:RobloxFontStyle=definition.defaultStyle){const actualWeight=definition.supportedWeights.reduce((best,value)=>Math.abs(value-weight)<Math.abs(best-weight)?value:best,definition.defaultWeight),actualStyle=definition.supportedStyles.includes(style)?style:definition.defaultStyle;return{weight:actualWeight,style:actualStyle};}

const closeMatches:Record<string,{enumName:string;matchName:string}>={
  "Inter":{enumName:"BuilderSans",matchName:"Builder Sans"},"Open Sans":{enumName:"SourceSans",matchName:"Source Sans Pro"},"Lato":{enumName:"BuilderSans",matchName:"Builder Sans"},"Poppins":{enumName:"BuilderSans",matchName:"Builder Sans"},"Manrope":{enumName:"BuilderSans",matchName:"Builder Sans"},"DM Sans":{enumName:"BuilderSans",matchName:"Builder Sans"},"Outfit":{enumName:"BuilderSans",matchName:"Builder Sans"},"Figtree":{enumName:"BuilderSans",matchName:"Builder Sans"},"Source Sans 3":{enumName:"SourceSans",matchName:"Source Sans Pro"},
  "IBM Plex Mono":{enumName:"Code",matchName:"Inconsolata"},"Noto Sans Mono":{enumName:"Code",matchName:"Inconsolata"},"Source Code Pro":{enumName:"Code",matchName:"Inconsolata"},"Space Mono":{enumName:"Code",matchName:"Inconsolata"},"JetBrains Mono":{enumName:"Code",matchName:"Inconsolata"},"Fira Code":{enumName:"Code",matchName:"Inconsolata"},"VT323":{enumName:"Code",matchName:"Inconsolata"},"Share Tech Mono":{enumName:"Code",matchName:"Inconsolata"},"Pixelify Sans":{enumName:"Arcade",matchName:"Press Start 2P"},"Silkscreen":{enumName:"Arcade",matchName:"Press Start 2P"},
  "Fredoka":{enumName:"FredokaOne",matchName:"Fredoka One"},"Baloo 2":{enumName:"Cartoon",matchName:"Comic Neue Angular"},"Lilita One":{enumName:"LuckiestGuy",matchName:"Luckiest Guy"},"Titan One":{enumName:"LuckiestGuy",matchName:"Luckiest Guy"},"Comic Neue":{enumName:"Cartoon",matchName:"Comic Neue Angular"},"Orbitron":{enumName:"SciFi",matchName:"Zekton"},"Oxanium":{enumName:"SciFi",matchName:"Zekton"},"Audiowide":{enumName:"SciFi",matchName:"Zekton"},"Rajdhani":{enumName:"SciFi",matchName:"Zekton"},"Bungee":{enumName:"BuilderSansExtraBold",matchName:"Builder Sans"},
};
export function suggestRobloxNativeFamily(family:string){const native=getRobloxFontDefinition(family);if(native)return native.family;const close=closeMatches[family];return close?.matchName??DEFAULT_ROBLOX_FONT_FAMILY;}
export function getRobloxFontCompatibility(family:string):RobloxFontCompatibility{const definition=getRobloxFontDefinition(family);if(definition)return{level:"native",label:"ROBLOX NATIVE",family:definition.familyAsset,enumName:definition.enumMappings[0]?.enumName,definition};const close=closeMatches[family];if(close)return{level:"close",label:"CLOSE ROBLOX MATCH",enumName:close.enumName,matchName:close.matchName};return{level:"unsupported",label:"CUSTOM / NOT DIRECTLY SUPPORTED"};}
export function robloxFontLua(family:string,weight:number,style:RobloxFontStyle){const compatibility=getRobloxFontCompatibility(family),definition=compatibility.definition;if(definition){const variant=resolveRobloxFontVariant(definition,weight,style),robloxWeight=variant.weight===100?"Thin":variant.weight===200?"ExtraLight":variant.weight===300?"Light":variant.weight===500?"Medium":variant.weight===600?"SemiBold":variant.weight===700?"Bold":variant.weight===800?"ExtraBold":variant.weight===900?"Heavy":"Regular";return`Font.new(${JSON.stringify(definition.familyAsset)}, Enum.FontWeight.${robloxWeight}, Enum.FontStyle.${variant.style==="italic"?"Italic":"Normal"})`;}return`Font.fromEnum(Enum.Font.${compatibility.enumName??"BuilderSans"})`;}
