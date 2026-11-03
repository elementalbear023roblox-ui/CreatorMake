"use client";

import { useCallback, useState } from "react";
import { createCreatorMakeAccount, exportCreatorMakeAccountKey, importCreatorMakeAccountKey, loadCreatorMakeSession, signInCreatorMakeAccount, signOutCreatorMakeAccount, type CreatorMakeAccountInput, type CreatorMakeProfile } from "@/lib/accounts/creator-account";

export type CreatorMakeAccountStatus="signed-out"|"working"|"signed-in"|"error";

export function useCreatorMakeAccount(){
  const[session,setSession]=useState<CreatorMakeProfile|null>(()=>loadCreatorMakeSession());
  const[status,setStatus]=useState<CreatorMakeAccountStatus>(()=>loadCreatorMakeSession()?"signed-in":"signed-out");
  const[error,setError]=useState("");
  const create=useCallback(async(input:CreatorMakeAccountInput)=>{setStatus("working");setError("");try{const profile=await createCreatorMakeAccount(input);setSession(profile);setStatus("signed-in");return true;}catch(problem){setError(problem instanceof Error?problem.message:"CreatorMake could not create the account.");setStatus("error");return false;}},[]);
  const signIn=useCallback(async(email:string,password:string)=>{setStatus("working");setError("");try{const profile=await signInCreatorMakeAccount(email,password);setSession(profile);setStatus("signed-in");return true;}catch(problem){setError(problem instanceof Error?problem.message:"CreatorMake could not sign in.");setStatus("error");return false;}},[]);
  const importAccount=useCallback(async(value:unknown)=>{setStatus("working");setError("");try{const result=await importCreatorMakeAccountKey(value);setStatus(session?"signed-in":"signed-out");return result;}catch(problem){setError(problem instanceof Error?problem.message:"CreatorMake could not import this account and its projects.");setStatus("error");return null;}},[session]);
  const exportAccount=useCallback(async()=>{if(!session)throw new Error("Sign in before downloading your account and projects.");setStatus("working");setError("");try{const result=await exportCreatorMakeAccountKey(session.id);setStatus("signed-in");return result;}catch(problem){setError(problem instanceof Error?problem.message:"CreatorMake could not prepare your account and projects.");setStatus("error");throw problem;}},[session]);
  const signOut=useCallback(()=>{signOutCreatorMakeAccount();setSession(null);setStatus("signed-out");setError("");},[]);
  return{session,status,error,create,signIn,signOut,importAccount,exportAccount};
}
