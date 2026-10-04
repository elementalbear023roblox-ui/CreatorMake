import { DEFAULT_CORNER_TYPES, DEFAULT_VECTOR_GEOMETRY, GEOMETRY_OPTIONS, defaultGeometryKindForElementType, geometryKindForElement } from "./geometry.ts";
import type { EditorAsset, EditorElement, EditorProject, ElementType, GeometryKind, ProjectSummary, RecoverySnapshot } from "./types";
import { CREATOR_FONTS, FONT_BY_ID } from "../fonts/font-library.ts";
import { getRobloxFontDefinition, resolveRobloxFontVariant } from "../roblox/fonts.ts";

const PROJECT_PREFIX = "creatormake:project:";
const INDEX_KEY = "creatormake:projects";
const ACTIVE_KEY = "creatormake:active";
const RECOVERY_KEY = "creatormake:recovery";
const LEGACY_MIGRATED_KEY = "legacy-localstorage-migrated";
const DATABASE_NAME = "CreatorMakeProjects";
const DATABASE_VERSION = 2;
const PROJECT_STORE = "projects";
const SUMMARY_STORE = "summaries";
const RECOVERY_STORE = "recoveries";
const SETTINGS_STORE = "settings";
const ASSET_STORE = "assets";
export const CREATORMAKE_SCHEMA_VERSION = 11 as const;
const EMPTY_COMMISSION_BRIEF={clientLabel:"",gameName:"",targetDevices:["Desktop","Phone","Tablet"],requestedStyle:"",colorPalette:"",fonts:"",deliverables:"Roblox-ready project, PNG previews, project backup",notes:""};

export const createId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

export function createElement(type: ElementType, index = 0): EditorElement {
  const offset = (index % 8) * 18;
  const base = {
    id: createId(type), type, parentId: null, rotation: 0, scaleX: 1, scaleY: 1, originX: 50, originY: 50, opacity: 100,
    anchorX: 0, anchorY: 0, zIndex: index + 1, layoutMode: "none" as const, layoutWrap: false, gap: 12, rowGap: 12, columnGap: 12,
    layoutPadding: { top: 0, right: 0, bottom: 0, left: 0 }, primaryAlign: "start" as const, crossAlign: "start" as const, gridColumns: 3,
    sizingX: "fixed" as const, sizingY: "fixed" as const, minWidth: null, maxWidth: null, minHeight: null, maxHeight: null,
    constraints: { horizontal: "left" as const, vertical: "top" as const }, clipContent: type === "scrolling-frame",
    canvasSizeX: 600, canvasSizeY: 720, automaticCanvasSize: "None" as const, canvasPositionX: 0, canvasPositionY: 0, scrollingDirection: "Y" as const,
    scrollBarThickness: 8, scrollBarImageColor: "#7457ff", scrollBarImageTransparency: 0, elasticBehavior: "WhenScrollable" as const, scrollingEnabled: true, verticalScrollBarPosition: "Right" as const, scrollBarInset: "ScrollBar" as const,
    frameType: type === "frame" ? "frame" as const : type === "container" || type === "scrolling-frame" ? "content" as const : "card" as const,
    borderColor: "#6b7280", borderWidth: type === "text" ? 0 : 1, cornerRadius: 6,
    corners: { tl: 6, tr: 6, br: 6, bl: 6 }, gradientType: "none" as const, gradientAngle: 135,
    cornerTypes: { ...DEFAULT_CORNER_TYPES }, geometry: { ...DEFAULT_VECTOR_GEOMETRY, kind:defaultGeometryKindForElementType(type) }, booleanOperation: null, booleanOperands: [],
    gradientStops: [{ id: createId("stop"), color: "#7457ff", position: 0, opacity: 100 }, { id: createId("stop"), color: "#25c8ff", position: 100, opacity: 100 }], blendMode: "normal" as const,
    gradientPoints:[{id:createId("point"),color:"#7457ff",x:25,y:25,opacity:100,radius:58},{id:createId("point"),color:"#25c8ff",x:75,y:70,opacity:100,radius:62}],fourCornerColors:{tl:"#7457ff",tr:"#25c8ff",bl:"#ff4aa2",br:"#ffcb4d"},
    shadow: "0 12px 30px rgba(0,0,0,.28)", textColor: "#ffffff", fontId: "inter", fontFamily: "Inter", fontSize: 18, fontSizeDesign: 18, fontWeight: 500, fontStyle: "normal" as const, lineHeight: 1.2, letterSpacing: 0, wordSpacing: 0, paragraphSpacing: 0,
    verticalAlign: "center" as const, textTransform: "none" as const, textDecoration: "none" as const,
    textStrokeColor: "#000000", textStrokeWidth: 0, textStrokeOpacity: 100, textStrokePosition: "center" as const, textShadows: [], textBoxMode: "fixed" as const, autoFit: false, textSizingMode: "fixed" as const, followObjectAngle:true, textRotation:0, responsiveMinTextSize: 8, responsiveMaxTextSize: 18, textAlign: "left" as const, padding: 12, textPadding: { top: 12, right: 12, bottom: 12, left: 12 },
    z: 0, rotateX: 0, rotateY: 0, perspective: 900, perspectiveOriginX: 50, perspectiveOriginY: 50, translateZ: 0, skewX: 0, skewY: 0, locked: false, hidden: false,
    imageAssetId:null,imageFit:"fit" as const,imageCrop:{x:0,y:0,width:100,height:100},imageOffsetX:0,imageOffsetY:0,imageScale:1,imageScaleX:1,imageScaleY:1,imageRotation:0,imageOpacity:100,imageFlipX:false,imageFlipY:false,imageTileWidth:128,imageTileHeight:128,imageBrightness:100,imageContrast:100,imageSaturation:100,imageHue:0,imageBlur:0,imageTint:"#ffffff",imageTintOpacity:0,imageStateAssetIds:{default:null,hover:null,pressed:null,disabled:null,selected:null},imagePreviewState:"default" as const,sliceCenter:null,sliceScale:1,
    textRobloxExportMode:"AUTO" as const,dynamicText:false,richText:false,textInput:false,
  };
  if (type === "frame") return { ...base, name: "Frame", x: 230 + offset, y: 130 + offset, width: 460, height: 320, fill: "#181c2b", text: "" };
  if (type === "container") return { ...base, name: "Container", x: 280 + offset, y: 170 + offset, width: 320, height: 220, fill: "#161a26", borderColor: "#4c5268", text: "" };
  if (type === "scrolling-frame") return { ...base, name: "Scrolling Frame", x: 180 + offset, y: 100 + offset, width: 600, height: 400, fill: "#161a26", borderColor: "#4c5268", text: "", layoutMode: "grid", gridColumns: 4, rowGap: 12, columnGap: 12, layoutPadding: { top: 16, right: 16, bottom: 16, left: 16 }, canvasSizeX: 600, canvasSizeY: 720, roblox: { className: "ScrollingFrame", layout: "grid" } };
  if (type === "text") return { ...base, name: "Text", x: 330 + offset, y: 220 + offset, width: 240, height: 48, fill: "transparent", borderColor: "transparent", text: "New text", fontSize: 28, fontSizeDesign: 28, responsiveMaxTextSize: 28, fontWeight: 700 };
  if (type === "button") return { ...base, name: "Button", x: 360 + offset, y: 330 + offset, width: 180, height: 48, fill: "#7457ff", borderColor: "#8d76ff", text: "Button", textAlign: "center", fontSize: 15, fontSizeDesign: 15, responsiveMaxTextSize: 15, fontWeight: 700 };
  if (type === "image" || type === "image-button") return { ...base, name: type === "image-button" ? "Image Button" : "Image", x: 350 + offset, y: 190 + offset, width: 220, height: 160, fill: "transparent", borderColor: "transparent", borderWidth: 0, shadow: "none", padding: 0, text: "", roblox: { className: type === "image-button" ? "ImageButton" : "ImageLabel" } };
  if (type === "ellipse") return { ...base, name: "Ellipse", x: 380 + offset, y: 190 + offset, width: 140, height: 140, fill: "#2d69ff", borderColor: "#63d6ff", text: "", cornerRadius: 999 };
  if (type === "line") return { ...base, name: "Line", x: 340 + offset, y: 270 + offset, width: 220, height: 4, fill: "#63d6ff", borderColor: "transparent", borderWidth: 0, text: "", cornerRadius: 2 };
  if (type === "polygon" || type === "star") return { ...base, name: type === "star" ? "Star" : "Polygon", x: 380 + offset, y: 190 + offset, width: 150, height: 150, fill: type === "star" ? "#ffcc4a" : "#2d69ff", borderColor: "#63d6ff", text: "", cornerRadius: 0 };
  if (type === "vector") return { ...base, name: "Triangle", x: 380 + offset, y: 190 + offset, width: 170, height: 150, fill: "#2d69ff", borderColor: "#63d6ff", text: "", cornerRadius: 0, corners:{tl:0,tr:0,br:0,bl:0}, cornerTypes:{tl:"square",tr:"square",br:"square",bl:"square"} };
  const radius=type === "roundRect" ? 22 : 4;
  return { ...base, name: type === "roundRect" ? "Rounded rectangle" : "Rectangle", x: 380 + offset, y: 190 + offset, width: 160, height: 120, fill: "#2d69ff", borderColor: "#63d6ff", text: "", cornerRadius: radius, corners:{tl:radius,tr:radius,br:radius,bl:radius} };
}

export function createScrollingInventoryElements(index=0):EditorElement[]{
  const scrolling=createElement("scrolling-frame",index);scrolling.name="Inventory Scroll";scrolling.canvasSizeY=600;
  const cards=Array.from({length:20},(_,cardIndex)=>{const card=createElement("button",index+cardIndex+1);card.id=createId("inventory-card");card.name=`Inventory Card ${cardIndex+1}`;card.parentId=scrolling.id;card.width=133;card.height=100;card.sizingX="fill";card.text=`ITEM ${String(cardIndex+1).padStart(2,"0")}`;card.fontSize=14;card.fontSizeDesign=14;card.responsiveMaxTextSize=14;card.fill=cardIndex%2?"#2f2557":"#1d3156";card.borderColor=cardIndex%2?"#8c64ff":"#4ddcff";card.gradientType="linear";card.gradientAngle=135;card.gradientStops=[{id:createId("stop"),color:cardIndex%2?"#7148ff":"#1764d8",position:0,opacity:100},{id:createId("stop"),color:cardIndex%2?"#d143b7":"#22c7d9",position:100,opacity:100}];card.shadow="0 8px 18px rgba(0,0,0,.24)";return card;});
  return[scrolling,...cards];
}

export function createVectorElement(kind:GeometryKind,index=0){
  const element=createElement("vector",index),label=GEOMETRY_OPTIONS.find((item)=>item.kind===kind)?.label??"Vector Shape";
  element.name=label;element.geometry={...DEFAULT_VECTOR_GEOMETRY,kind};
  if(kind==="line"){element.height=24;element.fill="#63d6ff";element.borderColor="transparent";element.geometry.thickness=14;}
  if(kind==="circle"){element.width=150;element.height=150;}
  if(kind==="capsule"){element.width=220;element.height=84;}
  if(kind==="ring"||kind==="arc"||kind==="pie"){element.width=160;element.height=160;}
  if(kind==="custom-path"){element.width=260;element.height=200;element.geometry.pathData="";element.geometry.nodes=[];element.geometry.closed=false;element.geometry.thickness=2;}
  if(kind==="rectangle"){element.corners={tl:0,tr:0,br:0,bl:0};}
  if(kind==="rounded-rectangle"){element.corners={tl:22,tr:22,br:22,bl:22};element.cornerRadius=22;element.cornerTypes={...DEFAULT_CORNER_TYPES};}
  return element;
}

export function createProject(name = "Untitled UI",projectKind:EditorProject["projectKind"]="blank"): EditorProject {
  const now = Date.now();
  return {
    schemaVersion: CREATORMAKE_SCHEMA_VERSION,
    id: createId("project"), name, createdAt: now, updatedAt: now,
    platform: "Roblox", status: "Draft", tags: [], archived: false, projectKind, commissionBrief:structuredClone(EMPTY_COMMISSION_BRIEF),
    screen: { id: createId("screen"), name: "Desktop", width: 960, height: 600, background: "#0e1220", x: 2100, y: 1400 },
    elements: [], assets: [], assetFolders: ["Logos","Icons","Characters","Textures","Backgrounds","Client Assets"], selectedIds: [], references: [], activePresetIds: [], favoritePresetIds: [], favoriteFontIds: [], recentFontIds: [], customFrameRecipes: [], researchCache: {}, generationHistory: [], projectFonts: [], fontPolicy: {allowSyntheticWeight:false,allowSyntheticItalic:false},
  };
}

export function normalizeProject(project: EditorProject): EditorProject {
  const sourceSchema=Number(project.schemaVersion??0);
  project.schemaVersion = CREATORMAKE_SCHEMA_VERSION;
  project.platform ??= "Roblox"; project.status ??= "Draft"; project.tags ??= []; project.archived ??= false;project.projectKind ??= "blank";project.commissionBrief={...EMPTY_COMMISSION_BRIEF,...(project.commissionBrief??{}),targetDevices:[...(project.commissionBrief?.targetDevices??EMPTY_COMMISSION_BRIEF.targetDevices)]};
  project.screen.x ??= 2100; project.screen.y ??= 1400;
  project.references ??= []; project.activePresetIds ??= ["digital-system"]; project.favoritePresetIds ??= []; project.favoriteFontIds ??= []; project.recentFontIds ??= []; project.customFrameRecipes ??= []; project.researchCache ??= {}; project.generationHistory ??= []; project.fontPolicy ??= {allowSyntheticWeight:false,allowSyntheticItalic:false};
  project.assets ??= []; project.assets=project.assets.map((asset)=>({...asset,favorite:asset.favorite??false})); project.assetFolders ??= ["Logos","Icons","Characters","Textures","Backgrounds","Client Assets"];
  project.elements = project.elements.map((element) => {
    const base = createElement(element.type === ("shape" as ElementType) ? "rectangle" : element.type);
    const byFamily=CREATOR_FONTS.find((font)=>font.family.toLowerCase()===String(element.fontFamily??"").replace(/["']/g,"").toLowerCase());
    const robloxFont=getRobloxFontDefinition(String(element.fontFamily??element.fontId??"")),font=robloxFont?{id:robloxFont.id,family:robloxFont.family}:FONT_BY_ID[element.fontId as keyof typeof FONT_BY_ID]??byFamily??FONT_BY_ID.inter,robloxVariant=robloxFont?resolveRobloxFontVariant(robloxFont,Number(element.fontWeight)||robloxFont.defaultWeight,element.fontStyle==="italic"?"italic":"normal"):null;
    const legacySize=Number.isFinite(element.fontSize)&&element.fontSize>0?element.fontSize:base.fontSize;
    const storedDesignSize=Number((element as EditorElement).fontSizeDesign);
    const fontSizeDesign=sourceSchema<CREATORMAKE_SCHEMA_VERSION||!Number.isFinite(storedDesignSize)||storedDesignSize<=0?legacySize:storedDesignSize;
    const textSizingMode=element.textSizingMode==="responsive"?"responsive" as const:"fixed" as const;
    const legacyPadding=Math.max(0,Number.isFinite(element.padding)?element.padding:base.padding),rawTextPadding=element.textPadding??{top:legacyPadding,right:legacyPadding,bottom:legacyPadding,left:legacyPadding};
    const textPadding={top:Math.max(0,Number(rawTextPadding.top)||0),right:Math.max(0,Number(rawTextPadding.right)||0),bottom:Math.max(0,Number(rawTextPadding.bottom)||0),left:Math.max(0,Number(rawTextPadding.left)||0)};
    const requestedMin=Number(element.responsiveMinTextSize),requestedMax=Number(element.responsiveMaxTextSize),responsiveMinTextSize=Math.max(1,Number.isFinite(requestedMin)?requestedMin:Math.min(8,fontSizeDesign)),responsiveMaxTextSize=Math.max(responsiveMinTextSize,Number.isFinite(requestedMax)?requestedMax:fontSizeDesign);
    const clipContent=element.type==="scrolling-frame"?true:sourceSchema<10?false:Boolean(element.clipContent),followObjectAngle=sourceSchema<11?true:element.followObjectAngle!==false,textRotation=Number.isFinite(element.textRotation)?element.textRotation:0;
    const normalized={ ...base, ...element, clipContent, followObjectAngle, textRotation, imageStateAssetIds:{...base.imageStateAssetIds,...element.imageStateAssetIds}, fontId:font.id, fontFamily:font.family, fontWeight:robloxVariant?.weight??element.fontWeight??base.fontWeight,fontStyle:robloxVariant?.style??element.fontStyle??base.fontStyle,fontSize:fontSizeDesign, fontSizeDesign, textSizingMode, autoFit:textSizingMode==="responsive", responsiveMinTextSize, responsiveMaxTextSize, textPadding, type: element.type === ("shape" as ElementType) ? "rectangle" : element.type, corners: element.corners ?? { tl: element.cornerRadius ?? 0, tr: element.cornerRadius ?? 0, br: element.cornerRadius ?? 0, bl: element.cornerRadius ?? 0 }, cornerTypes: element.cornerTypes??{...DEFAULT_CORNER_TYPES}, geometry:{...DEFAULT_VECTOR_GEOMETRY,...element.geometry}, booleanOperation:element.booleanOperation??null, booleanOperands:element.booleanOperands??[], gradientStops: element.gradientStops ?? base.gradientStops,gradientPoints:element.gradientPoints??base.gradientPoints,fourCornerColors:element.fourCornerColors??base.fourCornerColors };
    normalized.geometry.kind=geometryKindForElement(normalized);
    return normalized;
  });
  const fontManifest=new Map<string,{fontId:string;weights:Set<number>;styles:Set<"normal"|"italic">}>();
  project.elements.filter((element)=>element.type==="text"||element.type==="button").forEach((element)=>{const entry=fontManifest.get(element.fontId)??{fontId:element.fontId,weights:new Set<number>(),styles:new Set<"normal"|"italic">()};entry.weights.add(element.fontWeight);entry.styles.add(element.fontStyle);fontManifest.set(element.fontId,entry);});
  project.projectFonts=[...fontManifest.values()].map((item)=>({fontId:item.fontId,weights:[...item.weights].sort((a,b)=>a-b),styles:[...item.styles]}));
  return project;
}

type SettingRecord={key:string;value:unknown};
type AssetRecord={key:string;projectId:string;asset:EditorAsset};
const memory={projects:new Map<string,EditorProject>(),assets:new Map<string,EditorAsset[]>(),summaries:new Map<string,ProjectSummary>(),recoveries:new Map<string,RecoverySnapshot>(),settings:new Map<string,unknown>()};
let databasePromise:Promise<IDBDatabase>|null=null;
let storageReady:Promise<IDBDatabase|null>|null=null;

const requestResult=<T>(request:IDBRequest<T>)=>new Promise<T>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error??new Error("IndexedDB request failed."));});
const transactionDone=(transaction:IDBTransaction)=>new Promise<void>((resolve,reject)=>{transaction.oncomplete=()=>resolve();transaction.onerror=()=>reject(transaction.error??new Error("IndexedDB transaction failed."));transaction.onabort=()=>reject(transaction.error??new Error("IndexedDB transaction was aborted."));});

function openDatabase(){
  if(databasePromise)return databasePromise;
  databasePromise=new Promise<IDBDatabase>((resolve,reject)=>{
    const request=indexedDB.open(DATABASE_NAME,DATABASE_VERSION);
    request.onupgradeneeded=()=>{
      const database=request.result;
      if(!database.objectStoreNames.contains(PROJECT_STORE))database.createObjectStore(PROJECT_STORE,{keyPath:"id"});
      if(!database.objectStoreNames.contains(SUMMARY_STORE)){const store=database.createObjectStore(SUMMARY_STORE,{keyPath:"id"});store.createIndex("updatedAt","updatedAt");}
      if(!database.objectStoreNames.contains(RECOVERY_STORE)){const store=database.createObjectStore(RECOVERY_STORE,{keyPath:"id"});store.createIndex("savedAt","savedAt");}
      if(!database.objectStoreNames.contains(SETTINGS_STORE))database.createObjectStore(SETTINGS_STORE,{keyPath:"key"});
      if(!database.objectStoreNames.contains(ASSET_STORE)){const store=database.createObjectStore(ASSET_STORE,{keyPath:"key"});store.createIndex("projectId","projectId");}
    };
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>{databasePromise=null;reject(request.error??new Error("CreatorMake could not open its project database."));};
    request.onblocked=()=>reject(new Error("CreatorMake project storage is blocked by another tab. Close older CreatorMake tabs and retry."));
  });
  return databasePromise;
}

const legacyProjectValues=()=>{
  if(typeof localStorage==="undefined")return[] as EditorProject[];
  const values:EditorProject[]=[];
  for(let index=0;index<localStorage.length;index++){const key=localStorage.key(index);if(!key?.startsWith(PROJECT_PREFIX))continue;try{const parsed=JSON.parse(localStorage.getItem(key)??"") as EditorProject;if(parsed?.screen&&Array.isArray(parsed.elements))values.push(normalizeProject(parsed));}catch{/* Invalid legacy values are left untouched for manual recovery. */}}
  return values;
};

function projectThumbnail(project:EditorProject){
  const width=320,height=180,sx=width/project.screen.width,sy=height/project.screen.height;
  const safeColor=(value:string,fallback:string)=>/^#[0-9a-f]{3,8}$/i.test(value)?value:fallback;
  const shapes=project.elements.filter((item)=>!item.hidden).slice(0,40).map((item)=>{const x=Math.max(0,item.x*sx),y=Math.max(0,item.y*sy),w=Math.max(1,item.width*sx),h=Math.max(1,item.height*sy),fill=safeColor(item.fill,"#31374a"),stroke=safeColor(item.borderColor,"#5b647d"),radius=Math.max(0,Math.min(24,item.cornerRadius*Math.min(sx,sy)));return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${w.toFixed(1)}" height="${h.toFixed(1)}" rx="${radius.toFixed(1)}" fill="${fill}" fill-opacity="${Math.max(0,Math.min(1,item.opacity/100)).toFixed(2)}" stroke="${stroke}" stroke-width="${Math.max(.5,item.borderWidth*Math.min(sx,sy)).toFixed(1)}"/>`;}).join("");
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect width="100%" height="100%" fill="${safeColor(project.screen.background,"#0e1220")}"/>${shapes}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const projectSummary=(project:EditorProject):ProjectSummary=>({id:project.id,name:project.name,createdAt:project.createdAt,updatedAt:project.updatedAt,platform:project.platform,status:project.status,tags:[...project.tags],archived:project.archived,projectKind:project.projectKind,thumbnail:projectThumbnail(project),width:project.screen.width,height:project.screen.height,frameCount:project.elements.filter((item)=>item.type==="frame"||item.type==="container"||item.type==="scrolling-frame").length});

async function migrateLegacy(database:IDBDatabase){
  const current=await requestResult(database.transaction(SETTINGS_STORE,"readonly").objectStore(SETTINGS_STORE).get(LEGACY_MIGRATED_KEY)) as SettingRecord|undefined;
  if(current?.value===true)return;
  const projects=legacyProjectValues();
  const activeId=typeof localStorage!=="undefined"?localStorage.getItem(ACTIVE_KEY):null;
  let recoveries:RecoverySnapshot[]=[];if(typeof localStorage!=="undefined")try{const values=JSON.parse(localStorage.getItem(RECOVERY_KEY)??"[]") as RecoverySnapshot[];if(Array.isArray(values))recoveries=values.filter((item)=>item?.project&&typeof item.savedAt==="number").map((item)=>({...item,project:normalizeProject(item.project)}));}catch{/* Preserve malformed legacy recovery JSON for manual recovery. */}
  const transaction=database.transaction([PROJECT_STORE,SUMMARY_STORE,RECOVERY_STORE,SETTINGS_STORE],"readwrite"),projectStore=transaction.objectStore(PROJECT_STORE),summaryStore=transaction.objectStore(SUMMARY_STORE),recoveryStore=transaction.objectStore(RECOVERY_STORE),settings=transaction.objectStore(SETTINGS_STORE);
  projects.forEach((project)=>{projectStore.put(project);summaryStore.put(projectSummary(project));});
  recoveries.slice(0,8).forEach((snapshot)=>recoveryStore.put(snapshot));
  if(activeId)settings.put({key:ACTIVE_KEY,value:activeId} satisfies SettingRecord);
  settings.put({key:LEGACY_MIGRATED_KEY,value:true} satisfies SettingRecord);
  await transactionDone(transaction);
  if(typeof localStorage!=="undefined"){
    projects.forEach((project)=>localStorage.removeItem(PROJECT_PREFIX+project.id));localStorage.removeItem(INDEX_KEY);if(recoveries.length)localStorage.removeItem(RECOVERY_KEY);localStorage.removeItem(ACTIVE_KEY);
  }
}

async function ensureStorage(){
  if(typeof indexedDB==="undefined")return null;
  storageReady??=openDatabase().then(async(database)=>{await migrateLegacy(database);return database;});
  return storageReady;
}

async function getSetting<T>(key:string){const database=await ensureStorage();if(!database)return memory.settings.get(key) as T|undefined;const value=await requestResult(database.transaction(SETTINGS_STORE,"readonly").objectStore(SETTINGS_STORE).get(key)) as SettingRecord|undefined;return value?.value as T|undefined;}

export async function loadProject(id:string):Promise<EditorProject|null>{
  const database=await ensureStorage();
  if(!database){const project=memory.projects.get(id);if(!project)return null;const value=structuredClone(project);value.assets=structuredClone(memory.assets.get(id)??value.assets??[]);return normalizeProject(value);}
  const transaction=database.transaction([PROJECT_STORE,ASSET_STORE],"readonly"),projectRequest=requestResult(transaction.objectStore(PROJECT_STORE).get(id)) as Promise<EditorProject|undefined>,assetRequest=requestResult(transaction.objectStore(ASSET_STORE).index("projectId").getAll(id)) as Promise<AssetRecord[]>,[value,records]=await Promise.all([projectRequest,assetRequest]);
  if(!value)return null;
  value.assets=records.map((record)=>record.asset);
  return normalizeProject(value);
}

export async function listProjects():Promise<ProjectSummary[]>{
  const database=await ensureStorage();
  const values=database?await requestResult(database.transaction(SUMMARY_STORE,"readonly").objectStore(SUMMARY_STORE).getAll()) as ProjectSummary[]:[...memory.summaries.values()];
  return values.sort((a,b)=>b.updatedAt-a.updatedAt);
}

export async function listRecoverySnapshots():Promise<RecoverySnapshot[]>{
  const database=await ensureStorage();
  const values=database?await requestResult(database.transaction(RECOVERY_STORE,"readonly").objectStore(RECOVERY_STORE).getAll()) as RecoverySnapshot[]:[...memory.recoveries.values()];
  return values.filter((item)=>item?.project&&typeof item.savedAt==="number").map((item)=>({...item,project:normalizeProject(item.project)})).sort((a,b)=>b.savedAt-a.savedAt);
}

async function storeRecovery(previous:EditorProject){
  const snapshots=await listRecoverySnapshots(),latest=snapshots.find((item)=>item.projectId===previous.id);
  if(latest&&Date.now()-latest.savedAt<15_000)return;
  const snapshot:RecoverySnapshot={id:createId("recovery"),projectId:previous.id,projectName:previous.name,savedAt:Date.now(),project:structuredClone(previous)},database=await ensureStorage();
  if(!database){memory.recoveries.set(snapshot.id,snapshot);snapshots.slice(7).forEach((item)=>memory.recoveries.delete(item.id));return;}
  const transaction=database.transaction(RECOVERY_STORE,"readwrite"),store=transaction.objectStore(RECOVERY_STORE);store.put(snapshot);snapshots.slice(7).forEach((item)=>store.delete(item.id));await transactionDone(transaction);
}

export async function saveProject(project:EditorProject,{createRecovery=true}:{createRecovery?:boolean}={}){
  const normalized=normalizeProject(structuredClone(project)),previous=await loadProject(normalized.id);
  if(createRecovery&&previous&&JSON.stringify({...previous,updatedAt:0})!==JSON.stringify({...normalized,updatedAt:0}))await storeRecovery(previous);
  const summary=projectSummary(normalized),database=await ensureStorage();
  if(!database){const record=structuredClone(normalized);record.assets=[];memory.projects.set(normalized.id,record);memory.assets.set(normalized.id,structuredClone(normalized.assets));memory.summaries.set(normalized.id,summary);memory.settings.set(ACTIVE_KEY,normalized.id);return normalized;}
  const transaction=database.transaction([PROJECT_STORE,ASSET_STORE,SUMMARY_STORE,SETTINGS_STORE],"readwrite"),record=structuredClone(normalized),assetStore=transaction.objectStore(ASSET_STORE);record.assets=[];transaction.objectStore(PROJECT_STORE).put(record);assetStore.delete(IDBKeyRange.bound(`${normalized.id}:`,`${normalized.id}:\uffff`));normalized.assets.forEach((asset)=>assetStore.put({key:`${normalized.id}:${asset.id}`,projectId:normalized.id,asset} satisfies AssetRecord));transaction.objectStore(SUMMARY_STORE).put(summary);transaction.objectStore(SETTINGS_STORE).put({key:ACTIVE_KEY,value:normalized.id} satisfies SettingRecord);await transactionDone(transaction);return normalized;
}

export async function loadActiveProject(){const id=await getSetting<string>(ACTIVE_KEY);return id?loadProject(id):null;}

export async function deleteStoredProject(id:string){const database=await ensureStorage();if(!database){memory.projects.delete(id);memory.assets.delete(id);memory.summaries.delete(id);return;}const transaction=database.transaction([PROJECT_STORE,ASSET_STORE,SUMMARY_STORE],"readwrite");transaction.objectStore(PROJECT_STORE).delete(id);transaction.objectStore(ASSET_STORE).delete(IDBKeyRange.bound(`${id}:`,`${id}:\uffff`));transaction.objectStore(SUMMARY_STORE).delete(id);await transactionDone(transaction);}

export async function discardRecoverySnapshot(id:string){const database=await ensureStorage();if(!database){memory.recoveries.delete(id);return;}const transaction=database.transaction(RECOVERY_STORE,"readwrite");transaction.objectStore(RECOVERY_STORE).delete(id);await transactionDone(transaction);}

export async function restoreRecoverySnapshot(id:string){const snapshot=(await listRecoverySnapshots()).find((item)=>item.id===id);if(!snapshot)return null;const restored=structuredClone(snapshot.project);restored.id=createId("project");restored.name=`${snapshot.projectName} · Recovered`;restored.createdAt=Date.now();restored.updatedAt=Date.now();restored.selectedIds=[];await saveProject(restored,{createRecovery:false});return restored;}

export async function importProjectData(value:unknown){
  if(!value||typeof value!=="object")throw new Error("The selected file is not a CreatorMake project.");
  const packageValue=value as {format?:string;project?:unknown},raw=packageValue.format==="creatormake-project"?packageValue.project:value,candidate=raw as Partial<EditorProject>;
  if(!candidate||typeof candidate!=="object"||!candidate.screen||!Array.isArray(candidate.elements))throw new Error("Project file is missing its screen or element hierarchy.");
  if(typeof candidate.schemaVersion==="number"&&candidate.schemaVersion>CREATORMAKE_SCHEMA_VERSION)throw new Error(`This project uses schema ${candidate.schemaVersion}; update CreatorMake before importing it.`);
  const imported=normalizeProject(structuredClone(candidate) as EditorProject);imported.id=createId("project");imported.name=`${imported.name?.trim()||"Imported UI"}`;imported.createdAt=Date.now();imported.updatedAt=Date.now();imported.selectedIds=imported.selectedIds.filter((id)=>imported.elements.some((item)=>item.id===id));await saveProject(imported,{createRecovery:false});return imported;
}

export function exportProjectData(project:EditorProject){return{format:"creatormake-project",formatVersion:1,exportedAt:new Date().toISOString(),schemaVersion:CREATORMAKE_SCHEMA_VERSION,project:normalizeProject(structuredClone(project))};}

export function duplicateProject(source: EditorProject): EditorProject {
  const copy = structuredClone(source);
  copy.id = createId("project"); copy.name = `${source.name} Copy`; copy.createdAt = Date.now(); copy.updatedAt = Date.now(); copy.selectedIds = [];
  return copy;
}
