import { exportProjectLibrary, mergeProjectLibrary, type CreatorMakeLibraryMergeResult } from "../editor/project.ts";

const GOOGLE_SCRIPT_ID="creatormake-google-identity";
const GOOGLE_SCRIPT_URL="https://accounts.google.com/gsi/client";
const GOOGLE_USERINFO_URL="https://openidconnect.googleapis.com/v1/userinfo";
const DRIVE_API="https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API="https://www.googleapis.com/upload/drive/v3";
const DRIVE_FILE_NAME="CreatorMake Library.json";
const CLIENT_ID_KEY="creatormake:google-client-id";
const SESSION_KEY="creatormake:google-session";
const LAST_SYNC_KEY="creatormake:google-last-sync";
const GOOGLE_SCOPES="openid email profile https://www.googleapis.com/auth/drive.appdata";

export type GoogleProfile={sub:string;name:string;email:string;picture?:string};
export type GoogleAccountSession={accessToken:string;expiresAt:number;profile:GoogleProfile};
export type GoogleCloudSyncResult=CreatorMakeLibraryMergeResult&{uploadedProjects:number;remoteFileCreated:boolean;syncedAt:number};

type GoogleTokenResponse={access_token?:string;expires_in?:number;error?:string;error_description?:string};
type GoogleTokenClient={requestAccessToken:(options?:{prompt?:string})=>void};
type GoogleAccounts={oauth2:{initTokenClient:(config:{client_id:string;scope:string;callback:(response:GoogleTokenResponse)=>void;error_callback?:(error:{type?:string;message?:string})=>void})=>GoogleTokenClient;revoke:(token:string,callback:()=>void)=>void}};

declare global{interface Window{google?:{accounts:GoogleAccounts}}}

const buildClientId=String(import.meta.env?.VITE_GOOGLE_CLIENT_ID??"").trim();
const browserStorage=()=>typeof window!=="undefined"?window.localStorage:null;
const sessionStorageSafe=()=>typeof window!=="undefined"?window.sessionStorage:null;

export const isGoogleClientId=(value:string)=>/^\d+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(value.trim());

export function getGoogleClientId(){
  const saved=browserStorage()?.getItem(CLIENT_ID_KEY)?.trim()??"";
  return isGoogleClientId(saved)?saved:isGoogleClientId(buildClientId)?buildClientId:"";
}

export function saveGoogleClientId(value:string){
  const normalized=value.trim();
  if(!isGoogleClientId(normalized))throw new Error("Enter a valid Google OAuth web client ID ending in .apps.googleusercontent.com.");
  browserStorage()?.setItem(CLIENT_ID_KEY,normalized);
  return normalized;
}

export function loadGoogleSession():GoogleAccountSession|null{
  try{const raw=sessionStorageSafe()?.getItem(SESSION_KEY);if(!raw)return null;const value=JSON.parse(raw) as GoogleAccountSession;if(!value?.accessToken||!value.profile?.email||value.expiresAt<=Date.now()+30_000){sessionStorageSafe()?.removeItem(SESSION_KEY);return null;}return value;}catch{return null;}
}

const storeGoogleSession=(session:GoogleAccountSession)=>{sessionStorageSafe()?.setItem(SESSION_KEY,JSON.stringify(session));};
export const getLastGoogleSync=()=>Number(browserStorage()?.getItem(LAST_SYNC_KEY)??0)||null;

async function loadGoogleIdentity(){
  if(typeof window==="undefined")throw new Error("Google sign-in is available in the CreatorMake web app.");
  if(window.google?.accounts?.oauth2)return window.google.accounts;
  await new Promise<void>((resolve,reject)=>{
    const existing=document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement|null;
    const script=existing??document.createElement("script");
    const finish=()=>window.google?.accounts?.oauth2?resolve():reject(new Error("Google sign-in did not become available."));
    script.addEventListener("load",finish,{once:true});script.addEventListener("error",()=>reject(new Error("CreatorMake could not load Google sign-in.")),{once:true});
    if(!existing){script.id=GOOGLE_SCRIPT_ID;script.src=GOOGLE_SCRIPT_URL;script.async=true;script.defer=true;document.head.appendChild(script);}
  });
  if(!window.google?.accounts?.oauth2)throw new Error("Google sign-in did not become available.");
  return window.google.accounts;
}

const fetchGoogleProfile=async(accessToken:string)=>{
  const response=await fetch(GOOGLE_USERINFO_URL,{headers:{Authorization:`Bearer ${accessToken}`}});
  if(!response.ok)throw new Error(`Google account verification failed (${response.status}).`);
  const profile=await response.json() as Partial<GoogleProfile>;
  if(!profile.sub||!profile.email)throw new Error("Google did not return an account identity.");
  return{sub:profile.sub,name:profile.name?.trim()||profile.email,email:profile.email,picture:profile.picture} satisfies GoogleProfile;
};

export async function signInWithGoogle(clientId=getGoogleClientId()):Promise<GoogleAccountSession>{
  const normalized=saveGoogleClientId(clientId),accounts=await loadGoogleIdentity();
  const token=await new Promise<GoogleTokenResponse>((resolve,reject)=>{
    const client=accounts.oauth2.initTokenClient({client_id:normalized,scope:GOOGLE_SCOPES,callback:(response)=>response.error?reject(new Error(response.error_description||response.error)):resolve(response),error_callback:(error)=>reject(new Error(error.message||error.type||"Google sign-in was interrupted."))});
    client.requestAccessToken({prompt:"select_account consent"});
  });
  if(!token.access_token)throw new Error("Google sign-in did not return an access token.");
  const session:GoogleAccountSession={accessToken:token.access_token,expiresAt:Date.now()+Math.max(60,Number(token.expires_in)||3600)*1000,profile:await fetchGoogleProfile(token.access_token)};
  storeGoogleSession(session);return session;
}

export async function signOutGoogle(session:GoogleAccountSession|null){
  sessionStorageSafe()?.removeItem(SESSION_KEY);
  if(!session?.accessToken||typeof window==="undefined")return;
  try{const accounts=await loadGoogleIdentity();await new Promise<void>((resolve)=>accounts.oauth2.revoke(session.accessToken,resolve));}catch{/* The local session is cleared even if Google revocation is unavailable. */}
}

const googleApiError=async(response:Response)=>{try{const body=await response.json() as {error?:{message?:string}|string};const value=typeof body.error==="string"?body.error:body.error?.message;if(value)return value;}catch{/* Fall back to status text. */}return`${response.status} ${response.statusText}`.trim();};
const authorizedFetch=async(url:string,session:GoogleAccountSession,init:RequestInit={})=>{
  if(session.expiresAt<=Date.now()+30_000)throw new Error("Your Google session expired. Sign in again to continue cloud backup.");
  const headers=new Headers(init.headers);headers.set("Authorization",`Bearer ${session.accessToken}`);const response=await fetch(url,{...init,headers});
  if(!response.ok)throw new Error(`Google Drive sync failed: ${await googleApiError(response)}`);return response;
};

async function findLibraryFile(session:GoogleAccountSession){
  const query=new URLSearchParams({spaces:"appDataFolder",q:`name = '${DRIVE_FILE_NAME}' and trashed = false`,fields:"files(id,name,modifiedTime)",orderBy:"modifiedTime desc",pageSize:"10"});
  const response=await authorizedFetch(`${DRIVE_API}/files?${query}`,session),body=await response.json() as {files?:Array<{id:string;name:string;modifiedTime?:string}>};return body.files?.[0]??null;
}

async function downloadLibrary(session:GoogleAccountSession,fileId:string){const response=await authorizedFetch(`${DRIVE_API}/files/${encodeURIComponent(fileId)}?alt=media`,session);return response.json() as Promise<unknown>;}

async function createLibraryFile(session:GoogleAccountSession){
  const response=await authorizedFetch(`${DRIVE_API}/files?fields=id`,session,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:DRIVE_FILE_NAME,parents:["appDataFolder"]})}),body=await response.json() as {id?:string};if(!body.id)throw new Error("Google Drive did not create the CreatorMake backup file.");return body.id;
}

async function uploadLibrary(session:GoogleAccountSession,fileId:string,value:unknown){await authorizedFetch(`${DRIVE_UPLOAD_API}/files/${encodeURIComponent(fileId)}?uploadType=media`,session,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify(value)});}

export async function syncGoogleProjectLibrary(session:GoogleAccountSession):Promise<GoogleCloudSyncResult>{
  const remoteFile=await findLibraryFile(session);let merge:CreatorMakeLibraryMergeResult={added:0,updated:0,kept:0,recoveriesAdded:0,activeProjectId:null};
  if(remoteFile)merge=await mergeProjectLibrary(await downloadLibrary(session,remoteFile.id));
  const library=await exportProjectLibrary(),fileId=remoteFile?.id??await createLibraryFile(session);await uploadLibrary(session,fileId,library);
  const syncedAt=Date.now();browserStorage()?.setItem(LAST_SYNC_KEY,String(syncedAt));return{...merge,uploadedProjects:library.projects.length,remoteFileCreated:!remoteFile,syncedAt};
}
