"use client";

import { Cloud, CloudOff, LogIn, LogOut, RefreshCw, Settings2, ShieldCheck, X } from "lucide-react";
import type { GoogleAccountStatus } from "@/hooks/use-google-account";
import type { GoogleAccountSession, GoogleCloudSyncResult } from "@/lib/google/account";

type Props={open:boolean;session:GoogleAccountSession|null;clientId:string;configured:boolean;status:GoogleAccountStatus;error:string;lastSyncAt:number|null;lastResult:GoogleCloudSyncResult|null;projectCount:number;onClientId:(value:string)=>void;onConnect:()=>Promise<boolean>;onSync:()=>Promise<unknown>;onDisconnect:()=>Promise<void>;onClose:()=>void};

const timeLabel=(value:number|null)=>value?new Date(value).toLocaleString():"Not synced yet";

export function GoogleAccountDialog(props:Props){
  if(!props.open)return null;
  const busy=props.status==="connecting"||props.status==="syncing";
  return <div className="dialog-overlay account-overlay" onMouseDown={props.onClose}><section className="project-dialog google-account-dialog" role="dialog" aria-modal="true" aria-labelledby="google-account-title" onMouseDown={(event)=>event.stopPropagation()}>
    <button className="dialog-close" aria-label="Close Google account" onClick={props.onClose}><X size={17}/></button>
    <header><span className="account-kicker">GOOGLE BACKUP</span><h2 id="google-account-title">{props.session?"Your CreatorMake library":"Sign in and keep creating anywhere."}</h2><p>{props.session?"Your local library remains the source of truth while CreatorMake keeps a private backup synchronized with Google Drive.":"Choose your Google account once. CreatorMake will back up projects privately without reading the rest of your Drive."}</p></header>
    {props.session?<>
      <section className="google-profile-card">
        {props.session.profile.picture?<img src={props.session.profile.picture} alt="" referrerPolicy="no-referrer"/>:<span className="google-avatar">{props.session.profile.name.slice(0,1).toUpperCase()}</span>}
        <div><strong>{props.session.profile.name}</strong><small>{props.session.profile.email}</small></div><span className={`cloud-state ${props.status}`}><Cloud size={14}/>{props.status==="syncing"?"Syncing…":props.status==="error"?"Needs attention":"Backup on"}</span>
      </section>
      <section className="account-sync-grid"><div><small>LOCAL LIBRARY</small><strong>{props.projectCount} project{props.projectCount===1?"":"s"}</strong></div><div><small>LAST BACKUP</small><strong>{timeLabel(props.lastSyncAt)}</strong></div></section>
      {props.lastResult&&<p className="account-result">Google Drive has {props.lastResult.uploadedProjects} project{props.lastResult.uploadedProjects===1?"":"s"}. This sync added {props.lastResult.added} and updated {props.lastResult.updated} local project{props.lastResult.updated===1?"":"s"}.</p>}
      {props.error&&<output className="project-error">{props.error}</output>}
      <div className="account-actions"><button className="primary" disabled={busy} onClick={()=>void props.onSync()}><RefreshCw size={14}/>{props.status==="syncing"?"Syncing projects…":"Sync now"}</button><button disabled={busy} onClick={()=>void props.onDisconnect()}><LogOut size={14}/> Sign out</button></div>
    </>:<>
      <section className="account-benefits"><div><ShieldCheck size={17}/><span><strong>Private by design</strong><small>Access is limited to CreatorMake’s hidden app backup. Your normal Drive files stay out of reach.</small></span></div><div><CloudOff size={17}/><span><strong>Local-first and offline-ready</strong><small>Your projects remain on this device and continue working when you sign out or lose connection.</small></span></div></section>
      {!props.configured&&<section className="google-setup-card"><Settings2 size={18}/><div><strong>Google sign-in needs one administrator setting</strong><p>Add a Google OAuth Web client ID for this production origin. Once configured, everyone gets the direct account chooser instead of this setup step.</p></div><details open><summary>Configure this browser</summary><label className="google-client-field"><span>Google OAuth web client ID</span><input value={props.clientId} onChange={(event)=>props.onClientId(event.target.value)} placeholder="123456789-….apps.googleusercontent.com" autoComplete="off" spellCheck={false}/><small>Use a Web application client authorized for https://creatormake-site.vercel.app. This public ID is not a password or secret.</small></label></details></section>}
      {props.error&&<output className="project-error">{props.error}</output>}
      <button className="google-connect" disabled={busy||!props.configured} onClick={()=>void props.onConnect()}><span className="google-g">G</span><span>{props.status==="connecting"?"Opening Google account chooser…":"Continue with Google"}</span><LogIn size={14}/></button>
    </>}
    <footer className="account-privacy">Google access tokens stay in this browser session and are never saved inside a CreatorMake project.</footer>
  </section></div>;
}
