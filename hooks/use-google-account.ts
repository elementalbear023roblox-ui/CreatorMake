"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getGoogleClientId, getLastGoogleSync, loadGoogleSession, saveGoogleClientId, signInWithGoogle, signOutGoogle, syncGoogleProjectLibrary, type GoogleAccountSession, type GoogleCloudSyncResult } from "@/lib/google/account";

export type GoogleAccountStatus="signed-out"|"connecting"|"syncing"|"synced"|"error";

export function useGoogleAccount({beforeSync,onLibraryMerged}:{beforeSync:()=>Promise<unknown>;onLibraryMerged:()=>Promise<unknown>}){
  const[session,setSession]=useState<GoogleAccountSession|null>(()=>loadGoogleSession());
  const[clientId,setClientIdState]=useState(()=>getGoogleClientId());
  const[status,setStatus]=useState<GoogleAccountStatus>(()=>loadGoogleSession()?"synced":"signed-out");
  const[error,setError]=useState("");
  const[lastSyncAt,setLastSyncAt]=useState<number|null>(()=>getLastGoogleSync());
  const[lastResult,setLastResult]=useState<GoogleCloudSyncResult|null>(null);
  const syncing=useRef(false),timer=useRef<number|null>(null),sessionRef=useRef(session);
  useEffect(()=>{sessionRef.current=session;},[session]);

  const runSync=useCallback(async(activeSession=sessionRef.current)=>{
    if(!activeSession||syncing.current)return null;
    syncing.current=true;setStatus("syncing");setError("");
    try{
      await beforeSync();
      const result=await syncGoogleProjectLibrary(activeSession);
      setLastResult(result);setLastSyncAt(result.syncedAt);setStatus("synced");
      if(result.added||result.updated)await onLibraryMerged();
      return result;
    }catch(problem){const message=problem instanceof Error?problem.message:"CreatorMake could not sync with Google Drive.";setError(message);setStatus("error");return null;}
    finally{syncing.current=false;}
  },[beforeSync,onLibraryMerged]);

  const connect=useCallback(async(value=clientId)=>{
    setStatus("connecting");setError("");
    try{const normalized=saveGoogleClientId(value),next=await signInWithGoogle(normalized);setClientIdState(normalized);setSession(next);sessionRef.current=next;await runSync(next);return true;}
    catch(problem){setError(problem instanceof Error?problem.message:"Google sign-in failed.");setStatus("error");return false;}
  },[clientId,runSync]);

  const disconnect=useCallback(async()=>{const active=sessionRef.current;setSession(null);sessionRef.current=null;setStatus("signed-out");setError("");await signOutGoogle(active);},[]);
  const changeClientId=useCallback((value:string)=>{setClientIdState(value);setError("");},[]);

  useEffect(()=>{
    const schedule=()=>{if(!sessionRef.current||syncing.current)return;if(timer.current!==null)window.clearTimeout(timer.current);timer.current=window.setTimeout(()=>{timer.current=null;void runSync();},2500);};
    window.addEventListener("creatormake:project-library-change",schedule);
    return()=>{window.removeEventListener("creatormake:project-library-change",schedule);if(timer.current!==null)window.clearTimeout(timer.current);};
  },[runSync]);

  return{session,clientId,status,error,lastSyncAt,lastResult,connect,disconnect,syncNow:()=>runSync(),setClientId:changeClientId};
}
