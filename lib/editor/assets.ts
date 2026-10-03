import { createElement, createId, createVectorElement } from "./project.ts";
import type { EditorAsset, EditorElement, Screen } from "./types.ts";

export const IMAGE_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.svg,image/png,image/jpeg,image/webp,image/gif,image/svg+xml";
const MIME_FORMAT:Record<string,EditorAsset["format"]>={"image/png":"PNG","image/jpeg":"JPEG","image/webp":"WEBP","image/gif":"GIF","image/svg+xml":"SVG"};
const SUPPORTED_MIMES=new Set(Object.keys(MIME_FORMAT));

const bytesToDataUrl=(bytes:ArrayBuffer,mimeType:string)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(reader.error??new Error("CreatorMake could not read the image file."));reader.readAsDataURL(new Blob([bytes],{type:mimeType}));});
const sha256=async(bytes:ArrayBuffer)=>{const digest=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(digest)].map((value)=>value.toString(16).padStart(2,"0")).join("");};

function sanitizeSvg(source:string){
  const documentValue=new DOMParser().parseFromString(source,"image/svg+xml");
  if(documentValue.querySelector("parsererror"))throw new Error("The SVG file is malformed.");
  documentValue.querySelectorAll("script,foreignObject").forEach((node)=>node.remove());
  documentValue.querySelectorAll("*").forEach((node)=>{
    [...node.attributes].forEach((attribute)=>{
      const name=attribute.name.toLowerCase(),value=attribute.value.trim();
      if(name.startsWith("on"))node.removeAttribute(attribute.name);
      if((name==="href"||name==="xlink:href")&&!value.startsWith("#")&&!value.startsWith("data:image/"))node.removeAttribute(attribute.name);
    });
  });
  return new XMLSerializer().serializeToString(documentValue.documentElement);
}

const loadImage=async(source:string)=>new Promise<HTMLImageElement>((resolve,reject)=>{const image=new Image();image.decoding="async";image.onload=()=>resolve(image);image.onerror=()=>reject(new Error("The browser could not decode this image."));image.src=source;});

async function createThumbnail(source:string,width:number,height:number){
  const image=await loadImage(source),limit=280,scale=Math.min(1,limit/Math.max(width,height)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(width*scale));canvas.height=Math.max(1,Math.round(height*scale));const context=canvas.getContext("2d");if(!context)throw new Error("Canvas previews are unavailable in this browser.");context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(image,0,0,canvas.width,canvas.height);return canvas.toDataURL("image/webp",.82);
}

export async function importImageFile(file:File):Promise<EditorAsset>{
  let mimeType=file.type.toLowerCase();
  if(!mimeType){const extension=file.name.split(".").pop()?.toLowerCase();mimeType=extension==="jpg"||extension==="jpeg"?"image/jpeg":extension?`image/${extension==="svg"?"svg+xml":extension}`:"";}
  if(!SUPPORTED_MIMES.has(mimeType))throw new Error(`${file.name} is not a supported PNG, JPEG, WEBP, GIF, or SVG image.`);
  let bytes=await file.arrayBuffer();
  if(mimeType==="image/svg+xml"){const sanitized=sanitizeSvg(new TextDecoder().decode(bytes));bytes=new TextEncoder().encode(sanitized).buffer;}
  const [contentHash,dataUrl]=await Promise.all([sha256(bytes),bytesToDataUrl(bytes,mimeType)]),image=await loadImage(dataUrl),width=image.naturalWidth||image.width,height=image.naturalHeight||image.height;
  if(!width||!height)throw new Error(`${file.name} has no usable image dimensions.`);
  const animated=mimeType==="image/gif",warning=animated?"Animated GIF — static preview currently.":width*height>36_000_000?"Large source image — CreatorMake uses a cached preview while retaining the original.":null;
  return{id:createId("asset"),name:file.name.replace(/\.[^.]+$/,"")||"Imported Image",originalName:file.name,kind:"image",folder:"",mimeType:mimeType as EditorAsset["mimeType"],format:MIME_FORMAT[mimeType],width,height,fileSize:bytes.byteLength,contentHash,dataUrl,thumbnailDataUrl:await createThumbnail(dataUrl,width,height),createdAt:Date.now(),animated,warning,favorite:false};
}

export function createImageElementForAsset(asset:EditorAsset,index:number,screen:Screen,position?:{x:number;y:number},asButton=false):EditorElement{
  const element=createElement(asButton?"image-button":"image",index),maxWidth=Math.max(64,screen.width*.6),maxHeight=Math.max(64,screen.height*.6),scale=Math.min(1,maxWidth/asset.width,maxHeight/asset.height),width=Math.max(16,Math.round(asset.width*scale)),height=Math.max(16,Math.round(asset.height*scale));
  element.name=asset.name;element.imageAssetId=asset.id;element.width=width;element.height=height;element.x=Math.round(position?.x??(screen.width-width)/2);element.y=Math.round(position?.y??(screen.height-height)/2);element.roblox={className:asButton?"ImageButton":"ImageLabel"};return element;
}

const SVG_PARAMETER_COUNTS:Record<string,number>={M:2,L:2,H:1,V:1,C:6,S:4,Q:4,T:2,A:7};
export function normalizeSvgPathData(pathData:string,viewBox:{x:number;y:number;width:number;height:number}){
  const tokens=pathData.match(/[a-zA-Z]|[-+]?(?:\d*\.)?\d+(?:e[-+]?\d+)?/gi)??[];if(!tokens.length||viewBox.width<=0||viewBox.height<=0)return null;
  const out:string[]=[];let index=0,command="";
  const x=(value:number,relative:boolean)=>relative?value/viewBox.width*100:(value-viewBox.x)/viewBox.width*100;
  const y=(value:number,relative:boolean)=>relative?value/viewBox.height*100:(value-viewBox.y)/viewBox.height*100;
  const n=(value:number)=>String(Math.round(value*10000)/10000);
  while(index<tokens.length){if(/^[a-zA-Z]$/.test(tokens[index]))command=tokens[index++];if(!command)return null;out.push(command);const upper=command.toUpperCase();if(upper==="Z"){command="";continue;}const count=SVG_PARAMETER_COUNTS[upper];if(!count)return null;const relative=command===command.toLowerCase();let first=true;while(index<tokens.length&&!/^[a-zA-Z]$/.test(tokens[index])){if(index+count>tokens.length)return null;const values=tokens.slice(index,index+count).map(Number);index+=count;if(values.some((value)=>!Number.isFinite(value)))return null;let mapped:number[];if(upper==="H")mapped=[x(values[0],relative)];else if(upper==="V")mapped=[y(values[0],relative)];else if(upper==="A")mapped=[values[0]/viewBox.width*100,values[1]/viewBox.height*100,values[2],values[3],values[4],x(values[5],relative),y(values[6],relative)];else mapped=values.map((value,valueIndex)=>valueIndex%2===0?x(value,relative):y(value,relative));if(!first&&upper==="M")out.push(relative?"l":"L");out.push(...mapped.map(n));first=false;} }
  return out.join(" ");
}

export function createVectorElementForSvgAsset(asset:EditorAsset,index:number,screen:Screen,position?:{x:number;y:number}){
  if(asset.mimeType!=="image/svg+xml")throw new Error("Only SVG assets can be converted into editable vector paths.");
  const comma=asset.dataUrl.indexOf(","),encoded=asset.dataUrl.slice(comma+1),source=asset.dataUrl.slice(0,comma).includes(";base64")?atob(encoded):decodeURIComponent(encoded),documentValue=new DOMParser().parseFromString(source,"image/svg+xml");
  if(documentValue.querySelector("parsererror"))throw new Error("The SVG source is malformed.");
  const paths=[...documentValue.querySelectorAll("path[d]")];if(paths.length!==1)throw new Error("Editable SVG conversion currently supports a single path. Multi-path SVGs remain reusable image assets.");
  const svg=documentValue.documentElement,viewBoxValues=(svg.getAttribute("viewBox")??`0 0 ${asset.width} ${asset.height}`).trim().split(/[\s,]+/).map(Number),viewBox={x:viewBoxValues[0]??0,y:viewBoxValues[1]??0,width:viewBoxValues[2]||asset.width,height:viewBoxValues[3]||asset.height},pathData=normalizeSvgPathData(paths[0].getAttribute("d")??"",viewBox);
  if(!pathData)throw new Error("This SVG path uses commands CreatorMake cannot safely convert. It remains available as an image asset.");
  const element=createVectorElement("custom-path",index),maxWidth=Math.max(64,screen.width*.6),maxHeight=Math.max(64,screen.height*.6),scale=Math.min(1,maxWidth/asset.width,maxHeight/asset.height);element.name=`${asset.name} Vector`;element.width=Math.max(16,Math.round(asset.width*scale));element.height=Math.max(16,Math.round(asset.height*scale));element.x=Math.round(position?.x??(screen.width-element.width)/2);element.y=Math.round(position?.y??(screen.height-element.height)/2);element.geometry={...element.geometry,kind:"custom-path",pathData,nodes:[],closed:/z\s*$/i.test(pathData)};const fill=paths[0].getAttribute("fill")??svg.getAttribute("fill");if(fill&&fill!=="none")element.fill=fill;return element;
}
