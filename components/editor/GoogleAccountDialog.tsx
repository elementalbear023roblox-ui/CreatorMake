"use client";

import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, ShieldCheck, X } from "lucide-react";
import type { GoogleAccountStatus } from "@/hooks/use-google-account";
import type { GoogleAccountSession, GoogleCloudSyncResult } from "@/lib/google/account";

type Props={open:boolean;session:GoogleAccountSession|null;clientId:string;status:GoogleAccountStatus;error:string;lastSyncAt:number|null;lastResult:GoogleCloudSyncResult|null;projectCount:number;onClientId:(value:string)=>void;onConnect:()=>Promise<boolean>;onSync:()=>Promise<unknown>;onDisconnect:()=>Promise<void>;onClose:()=>void};

const timeLabel=(value:number|null)=>value?new Date(value).toLocaleString():"Not synced yet";

export function GoogleAccountDialog(props:Props){
  if(!props.open)return null;
  const busy=props.status==="connecting"||props.status==="syncing";
  return <div className="dialog-overlay account-overlay" onMouseDown={props.onClose}><section className="project-dialog google-account-dialog" role="dialog" aria-modal="true" aria-labelledby="google-account-title" onMouseDown={(event)=>event.stopPropagation()}>
    <button className="dialog-close" aria-label="Close Google account" onClick={props.onClose}><X size={17}/></button>
    <header><span className="account-kicker">CREATORMAKE ACCOUNT</span><h2 id="google-account-title">Your projects, backed up privately.</h2><p>CreatorMake remains local-first. Google sign-in adds a private backup in your Google Drive app data and merges projects without erasing the copies already on this device.</p></header>
    {props.session?<>
      <section className="google-profile-card">
        {props.session.profile.picture?<img src={props.session.profile.picture} alt="" referrerPolicy="no-referrer"/>:<span className="google-avatar">{props.session.profile.name.slice(0,1).toUpperCase()}</span>}
        <div><strong>{props.session.profile.name}</strong><small>{props.session.profile.email}</small></div><span className={`cloud-state ${props.status}`}><Cloud size={14}/>{props.status==="syncing"?"Syncing…":props.status==="error"?"Needs attention":"Cloud backup on"}</span>
      </section>
      <section className="account-sync-grid"><div><small>LOCAL LIBRARY</small><strong>{props.projectCount} project{props.projectCount===1?"":"s"}</strong></div><div><small>LAST GOOGLE BACKUP</small><strong>{timeLabel(props.lastSyncAt)}</strong></div></section>
      {props.lastResult&&<p className="account-result">Google Drive has {props.lastResult.uploadedProjects} project{props.lastResult.uploadedProjects===1?"":"s"}. This sync added {props.lastResult.added} and updated {props.lastResult.updated} local project{props.lastResult.updated===1?"":"s"}.</p>}
      {props.error&&<output className="project-error">{props.error}</output>}
      <div className="account-actions"><button className="primary" disabled={busy} onClick={()=>void props.onSync()}><RefreshCw size={14}/>{props.status==="syncing"?"Syncing projects…":"Sync now"}</button><button disabled={busy} onClick={()=>void props.onDisconnect()}><LogOut size={14}/> Sign out</button></div>
    </>:<>
      <section className="account-benefits"><div><ShieldCheck size={17}/><span><strong>Existing projects stay put</strong><small>First sign-in uploads the complete local library, including imported assets and recovery snapshots.</small></span></div><div><Cloud size={17}/><span><strong>Private Google Drive app data</strong><small>CreatorMake requests access only to its own hidden backup file, not your normal Drive documents.</small></span></div><div><CloudOff size={17}/><span><strong>Works while signed out</strong><small>Signing out stops cloud backup but never removes projects from this browser.</small></span></div></section>
      <label className="google-client-field"><span>Google OAuth web client ID</span><input value={props.clientId} onChange={(event)=>props.onClientId(event.target.value)} placeholder="123456789-….apps.googleusercontent.com" autoComplete="off" spellCheck={false}/><small>This public client ID connects the deployed CreatorMake site to Google. It is not a secret and is stored only in this browser unless included in the production build.</small></label>
      {props.error&&<output className="project-error">{props.error}</output>}
      <button className="google-connect" disabled={busy||!props.clientId.trim()} onClick={()=>void props.onConnect()}><span className="google-g">G</span><span>{props.status==="connecting"?"Opening Google…":"Continue with Google"}</span><LogIn size={14}/></button>
    </>}
    <footer className="account-privacy">Local autosave remains active at all times. Google access tokens stay in this browser session and are never written into a CreatorMake project.</footer>
  </section></div>;
}
