import { env } from "cloudflare:workers";
import type { RobloxManifest, RobloxSyncOperation } from "./types";

export type RobloxSyncStatus="pending"|"connected"|"disconnected"|"expired";
export type RobloxSyncSessionRow={
  id:string;pairing_code:string;project_id:string;project_name:string;screen_gui_name:string;status:RobloxSyncStatus;mode:"manual"|"live";
  publisher_token_hash:string;studio_token_hash:string|null;plugin_instance_id:string|null;expires_at:number;created_at:number;connected_at:number|null;last_seen_at:number|null;
  revision:number;applied_revision:number;manifest_json:string|null;operations_json:string;
};

export class SyncRouteError extends Error{constructor(public status:number,message:string){super(message);}}

export function syncDb(){const db=env.DB;if(!db)throw new SyncRouteError(503,"Roblox Studio sync storage is not configured for this environment.");return db;}

const bytesToHex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map((value)=>value.toString(16).padStart(2,"0")).join("");
export async function hashSyncToken(token:string){return bytesToHex(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)));}
export function createSyncToken(byteLength=32){const bytes=new Uint8Array(byteLength);crypto.getRandomValues(bytes);return [...bytes].map((value)=>value.toString(16).padStart(2,"0")).join("");}
export function createPairingCode(){const values=new Uint32Array(1);crypto.getRandomValues(values);return String(100000+(values[0]%900000));}
export function bearerToken(request:Request){const match=request.headers.get("authorization")?.match(/^Bearer\s+([a-f0-9]{32,})$/i);if(!match)throw new SyncRouteError(401,"A valid scoped session token is required.");return match[1];}
export function assertManifest(value:unknown):asserts value is RobloxManifest{const manifest=value as Partial<RobloxManifest>|null;if(!manifest||manifest.schema!=="creatormake.roblox-manifest"||manifest.version!==1||!Array.isArray(manifest.nodes))throw new SyncRouteError(400,"A valid CreatorMake Roblox manifest is required.");if(manifest.nodes.length>5000)throw new SyncRouteError(413,"This sync exceeds the 5,000-instance session limit.");}
export function parseManifest(row:RobloxSyncSessionRow){if(!row.manifest_json)return null;try{return JSON.parse(row.manifest_json) as RobloxManifest;}catch{return null;}}
export function parseOperations(row:RobloxSyncSessionRow){try{return JSON.parse(row.operations_json) as RobloxSyncOperation[];}catch{return [];}}
export function publicSession(row:RobloxSyncSessionRow){return{id:row.id,status:row.status,mode:row.mode,projectId:row.project_id,projectName:row.project_name,screenGuiName:row.screen_gui_name,expiresAt:row.expires_at,connectedAt:row.connected_at,lastSeenAt:row.last_seen_at,revision:row.revision,appliedRevision:row.applied_revision,pendingChanges:Math.max(0,row.revision-row.applied_revision),pluginOnline:Boolean(row.last_seen_at&&Date.now()-row.last_seen_at<12_000)};}
export async function requirePublisher(request:Request,id:string){const db=syncDb(),tokenHash=await hashSyncToken(bearerToken(request));const row=await db.prepare("SELECT * FROM roblox_pairing_sessions WHERE id = ?").bind(id).first<RobloxSyncSessionRow>();if(!row||row.publisher_token_hash!==tokenHash)throw new SyncRouteError(401,"This CreatorMake pairing session is unavailable.");return row;}
export async function requireStudio(request:Request,id:string){const db=syncDb(),tokenHash=await hashSyncToken(bearerToken(request));const row=await db.prepare("SELECT * FROM roblox_pairing_sessions WHERE id = ?").bind(id).first<RobloxSyncSessionRow>();if(!row||row.studio_token_hash!==tokenHash||row.status!=="connected")throw new SyncRouteError(401,"The Studio pairing token is invalid or disconnected.");return row;}
export function syncErrorResponse(error:unknown){if(error instanceof SyncRouteError)return Response.json({error:error.message},{status:error.status});console.error("Roblox sync route failed",error);return Response.json({error:"Roblox Studio sync is temporarily unavailable."},{status:500});}
