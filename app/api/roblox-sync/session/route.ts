import { diffRobloxManifests } from "@/lib/roblox/sync";
import { assertManifest, createPairingCode, createSyncToken, hashSyncToken, publicSession, requirePublisher, SyncRouteError, syncDb, syncErrorResponse } from "@/lib/roblox/sync-server";
import type { RobloxManifest } from "@/lib/roblox/types";

const clean=(value:unknown,max:number,fallback:string)=>typeof value==="string"?(value.trim().slice(0,max)||fallback):fallback;

export async function POST(request:Request){try{
  const body=await request.json() as {projectId?:string;projectName?:string;screenGuiName?:string;manifest?:RobloxManifest};
  if(body.manifest)assertManifest(body.manifest);
  const db=syncDb(),id=crypto.randomUUID(),publisherToken=createSyncToken(),publisherTokenHash=await hashSyncToken(publisherToken),now=Date.now(),expiresAt=now+5*60_000;
  let pairingCode="";for(let attempt=0;attempt<8;attempt++){const candidate=createPairingCode();const existing=await db.prepare("SELECT id FROM roblox_pairing_sessions WHERE pairing_code = ?").bind(candidate).first();if(!existing){pairingCode=candidate;break;}}
  if(!pairingCode)throw new SyncRouteError(503,"Could not allocate a pairing code. Try again.");
  const manifest=body.manifest??null,operations=manifest?diffRobloxManifests(null,manifest):[];
  await db.prepare(`INSERT INTO roblox_pairing_sessions (id,pairing_code,project_id,project_name,screen_gui_name,status,mode,publisher_token_hash,expires_at,created_at,revision,manifest_json,operations_json) VALUES (?,?,?,?,?,'pending','manual',?,?,?,?,?,?)`).bind(id,pairingCode,clean(body.projectId,128,"local-project"),clean(body.projectName,120,"CreatorMake Project"),clean(body.screenGuiName,80,"CreatorMakeGui"),publisherTokenHash,expiresAt,now,manifest?1:0,manifest?JSON.stringify(manifest):null,JSON.stringify(operations)).run();
  return Response.json({session:{id,status:"pending",mode:"manual",projectId:clean(body.projectId,128,"local-project"),projectName:clean(body.projectName,120,"CreatorMake Project"),screenGuiName:clean(body.screenGuiName,80,"CreatorMakeGui"),expiresAt,connectedAt:null,lastSeenAt:null,revision:manifest?1:0,appliedRevision:0,pendingChanges:manifest?1:0,pluginOnline:false},pairingCode,publisherToken},{status:201});
}catch(error){return syncErrorResponse(error);}}

export async function GET(request:Request){try{const id=new URL(request.url).searchParams.get("id");if(!id)throw new SyncRouteError(400,"Session id is required.");let row=await requirePublisher(request,id);if(row.status==="pending"&&row.expires_at<Date.now()){await syncDb().prepare("UPDATE roblox_pairing_sessions SET status = 'expired' WHERE id = ? AND status = 'pending'").bind(id).run();row={...row,status:"expired"};}return Response.json({session:publicSession(row)});}catch(error){return syncErrorResponse(error);}}

export async function DELETE(request:Request){try{const id=new URL(request.url).searchParams.get("id");if(!id)throw new SyncRouteError(400,"Session id is required.");await requirePublisher(request,id);await syncDb().prepare("UPDATE roblox_pairing_sessions SET status = 'disconnected', studio_token_hash = NULL WHERE id = ?").bind(id).run();return Response.json({ok:true});}catch(error){return syncErrorResponse(error);}}
