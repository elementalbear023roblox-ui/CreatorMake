"use client";

import { useState } from "react";
import { Cloud, LockKeyhole, LogIn, LogOut, RefreshCw, ShieldCheck, UserRound, X } from "lucide-react";
import type { GoogleAccountStatus } from "@/hooks/use-google-account";
import type { CreatorMakeAccountStatus } from "@/hooks/use-creator-account";
import type { CreatorMakeProfile } from "@/lib/accounts/creator-account";
import type { GoogleAccountSession, GoogleCloudSyncResult } from "@/lib/google/account";

type Props={open:boolean;googleSession:GoogleAccountSession|null;googleConfigured:boolean;googleStatus:GoogleAccountStatus;googleError:string;lastSyncAt:number|null;lastResult:GoogleCloudSyncResult|null;creatorSession:CreatorMakeProfile|null;creatorStatus:CreatorMakeAccountStatus;creatorError:string;projectCount:number;onGoogleConnect:()=>Promise<boolean>;onGoogleSync:()=>Promise<unknown>;onGoogleDisconnect:()=>Promise<void>;onCreatorCreate:(input:{displayName:string;email:string;password:string})=>Promise<boolean>;onCreatorSignIn:(email:string,password:string)=>Promise<boolean>;onCreatorDisconnect:()=>void;onClose:()=>void};

const timeLabel=(value:number|null)=>value?new Date(value).toLocaleString():"Not synced yet";

export function AccountDialog(props:Props){
  const[mode,setMode]=useState<"sign-in"|"create">("sign-in"),[displayName,setDisplayName]=useState(""),[email,setEmail]=useState(""),[password,setPassword]=useState(""),[confirmPassword,setConfirmPassword]=useState(""),[formError,setFormError]=useState("");
  if(!props.open)return null;
  const googleBusy=props.googleStatus==="connecting"||props.googleStatus==="syncing",creatorBusy=props.creatorStatus==="working",busy=googleBusy||creatorBusy;
  const provider=props.creatorSession?"creatormake":props.googleSession?"google":null,activeName=props.creatorSession?.displayName??props.googleSession?.profile.name??"",activeEmail=props.creatorSession?.email??props.googleSession?.profile.email??"",activePicture=props.googleSession?.profile.picture;
  const submit=async(event:React.FormEvent)=>{event.preventDefault();setFormError("");if(mode==="create"&&password!==confirmPassword){setFormError("Passwords do not match.");return;}const success=mode==="create"?await props.onCreatorCreate({displayName,email,password}):await props.onCreatorSignIn(email,password);if(success){setPassword("");setConfirmPassword("");}};
  const switchMode=(next:"sign-in"|"create")=>{setMode(next);setFormError("");setPassword("");setConfirmPassword("");};
  return <div className="dialog-overlay account-overlay" onMouseDown={props.onClose}><section className="project-dialog account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-dialog-title" onMouseDown={(event)=>event.stopPropagation()}>
    <button className="dialog-close" aria-label="Close account dialog" onClick={props.onClose}><X size={17}/></button>
    {provider?<>
      <header><span className="account-kicker">CREATORMAKE ACCOUNT</span><h2 id="account-dialog-title">Welcome back, {activeName}.</h2><p>{provider==="google"?"Your local library is connected to your Google account backup.":"You are signed in with a CreatorMake account on this device."}</p></header>
      <section className="account-profile-card">
        {activePicture?<img src={activePicture} alt="" referrerPolicy="no-referrer"/>:<span className="creator-avatar">{activeName.slice(0,1).toUpperCase()}</span>}
        <div><strong>{activeName}</strong><small>{activeEmail}</small></div><span className={`account-provider-badge ${provider}`}>{provider==="google"?<Cloud size={13}/>:<ShieldCheck size={13}/>} {provider==="google"?"Google backup":"This device"}</span>
      </section>
      <section className="account-sync-grid"><div><small>LOCAL LIBRARY</small><strong>{props.projectCount} project{props.projectCount===1?"":"s"}</strong></div><div><small>{provider==="google"?"LAST BACKUP":"ACCOUNT STORAGE"}</small><strong>{provider==="google"?timeLabel(props.lastSyncAt):"Encrypted verifier · local"}</strong></div></section>
      {provider==="google"&&props.lastResult&&<p className="account-result">Google Drive has {props.lastResult.uploadedProjects} project{props.lastResult.uploadedProjects===1?"":"s"}. This sync added {props.lastResult.added} and updated {props.lastResult.updated} local project{props.lastResult.updated===1?"":"s"}.</p>}
      {(provider==="google"?props.googleError:props.creatorError)&&<output className="project-error">{provider==="google"?props.googleError:props.creatorError}</output>}
      <div className="account-actions">{provider==="google"&&<button className="primary" disabled={busy} onClick={()=>void props.onGoogleSync()}><RefreshCw size={14}/>{props.googleStatus==="syncing"?"Syncing projects…":"Sync now"}</button>}<button disabled={busy} onClick={()=>provider==="google"?void props.onGoogleDisconnect():props.onCreatorDisconnect()}><LogOut size={14}/> Sign out</button></div>
      {provider==="creatormake"&&<p className="account-device-note"><LockKeyhole size={14}/> This account is secured and stored only in this browser. Cross-device CreatorMake accounts require a hosted account service and are not enabled yet.</p>}
    </>:<>
      <header><span className="account-kicker">CREATORMAKE ACCOUNT</span><h2 id="account-dialog-title">Sign in to CreatorMake</h2><p>Use Google when it is available, or create a CreatorMake account for this device. Your existing local projects stay exactly where they are.</p></header>
      {props.googleConfigured?<button className="google-connect" disabled={busy} onClick={()=>void props.onGoogleConnect()}><span className="google-g">G</span><span>{props.googleStatus==="connecting"?"Opening Google account chooser…":"Continue with Google"}</span><LogIn size={14}/></button>:<div className="account-provider-unavailable"><span className="google-g">G</span><div><strong>Google sign-in is not connected yet</strong><small>The site owner must enable the Google provider. You can use a CreatorMake account below right now.</small></div></div>}
      <div className="account-divider"><span>OR USE A CREATORMAKE ACCOUNT</span></div>
      <div className="account-mode-switch" role="tablist" aria-label="CreatorMake account mode"><button role="tab" aria-selected={mode==="sign-in"} className={mode==="sign-in"?"active":""} onClick={()=>switchMode("sign-in")}>Sign in</button><button role="tab" aria-selected={mode==="create"} className={mode==="create"?"active":""} onClick={()=>switchMode("create")}>Create account</button></div>
      <form className="creator-account-form" onSubmit={(event)=>void submit(event)}>
        {mode==="create"&&<label><span>Display name</span><div><UserRound size={14}/><input value={displayName} onChange={(event)=>setDisplayName(event.target.value)} autoComplete="name" placeholder="Your name" required minLength={2} maxLength={60}/></div></label>}
        <label><span>Email</span><div><span className="field-at">@</span><input type="email" value={email} onChange={(event)=>setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" required/></div></label>
        <label><span>Password</span><div><LockKeyhole size={14}/><input type="password" value={password} onChange={(event)=>setPassword(event.target.value)} autoComplete={mode==="create"?"new-password":"current-password"} placeholder={mode==="create"?"At least 8 characters":"Your password"} required minLength={8} maxLength={128}/></div></label>
        {mode==="create"&&<label><span>Confirm password</span><div><LockKeyhole size={14}/><input type="password" value={confirmPassword} onChange={(event)=>setConfirmPassword(event.target.value)} autoComplete="new-password" placeholder="Repeat your password" required minLength={8} maxLength={128}/></div></label>}
        {(formError||props.creatorError||props.googleError)&&<output className="project-error">{formError||props.creatorError||props.googleError}</output>}
        <button className="creator-account-submit" type="submit" disabled={busy}>{creatorBusy?"Please wait…":mode==="create"?"Create CreatorMake account":"Sign in to CreatorMake"}<LogIn size={14}/></button>
      </form>
      <p className="account-device-note"><LockKeyhole size={14}/> CreatorMake passwords are hashed with PBKDF2 and a unique salt. This device-local account does not upload your password or projects.</p>
    </>}
  </section></div>;
}
