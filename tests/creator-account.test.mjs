import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCreatorMakeAccountKey, createCreatorMakeCredentialRecord, importCreatorMakeAccountKey, parseCreatorMakeAccountBundle, parseCreatorMakeAccountKey, validateCreatorMakeAccountInput, verifyCreatorMakePassword } from "../lib/accounts/creator-account.ts";
import { createProject, loadProject } from "../lib/editor/project.ts";

test("CreatorMake accounts validate normalized identity without accepting weak passwords",()=>{
  assert.deepEqual(validateCreatorMakeAccountInput({displayName:"  Barrett  ",email:"  USER@Example.COM ",password:"correct horse"}),{displayName:"Barrett",email:"user@example.com",password:"correct horse"});
  assert.throws(()=>validateCreatorMakeAccountInput({displayName:"B",email:"invalid",password:"short"}),/display name/);
});

test("CreatorMake account credentials use salted PBKDF2 and never retain plaintext",async()=>{
  const password="a genuinely strong password";
  const first=await createCreatorMakeCredentialRecord({displayName:"Creator",email:"creator@example.com",password});
  const second=await createCreatorMakeCredentialRecord({displayName:"Creator Two",email:"two@example.com",password});
  assert.equal(await verifyCreatorMakePassword(first,password),true);
  assert.equal(await verifyCreatorMakePassword(first,"wrong password"),false);
  assert.notEqual(first.salt,second.salt);
  assert.notEqual(first.passwordHash,second.passwordHash);
  assert.doesNotMatch(JSON.stringify(first),new RegExp(password));
  assert.ok(first.iterations>=200_000);
});

test("portable account keys verify the same password on another device without plaintext",async()=>{
  const password="portable but still secret",record=await createCreatorMakeCredentialRecord({displayName:"Portable Creator",email:"portable@example.com",password}),serialized=JSON.stringify(createCreatorMakeAccountKey(record)),restored=parseCreatorMakeAccountKey(serialized);
  assert.equal(await verifyCreatorMakePassword(restored,password),true);
  assert.doesNotMatch(serialized,new RegExp(password));
  assert.throws(()=>parseCreatorMakeAccountKey('{"format":"unknown"}'),/Choose a CreatorMake account file/);
});

test("multi-device account bundles carry a project library without exposing the password",async()=>{
  const password="projects travel securely",record=await createCreatorMakeCredentialRecord({displayName:"Project Creator",email:"projects@example.com",password}),projectLibrary={format:"creatormake-cloud-library",formatVersion:1,exportedAt:new Date().toISOString(),activeProjectId:null,projects:[],recoveries:[]},serialized=JSON.stringify(createCreatorMakeAccountKey(record,projectLibrary)),bundle=parseCreatorMakeAccountBundle(serialized);
  assert.equal(bundle.projectLibrary?.format,"creatormake-cloud-library");
  assert.deepEqual(bundle.projectLibrary?.projects,[]);
  assert.equal(await verifyCreatorMakePassword(bundle.account,password),true);
  assert.doesNotMatch(serialized,new RegExp(password));
});

test("importing an account bundle merges its projects into the second device",async()=>{
  const record=await createCreatorMakeCredentialRecord({displayName:"Remote Creator",email:"remote@example.com",password:"remote project password"}),project=createProject("Cross-device project");
  project.id="cross_device_project_fixture";project.updatedAt=Date.now()+10_000;
  const key=createCreatorMakeAccountKey(record,{format:"creatormake-cloud-library",formatVersion:1,exportedAt:new Date().toISOString(),activeProjectId:project.id,projects:[project],recoveries:[]}),result=await importCreatorMakeAccountKey(key),loaded=await loadProject(project.id);
  assert.equal(result.merge?.added,1);
  assert.equal(result.projectsInBundle,1);
  assert.equal(loaded?.name,"Cross-device project");
});

test("customer account dialog never exposes OAuth administrator configuration",async()=>{
  const source=await readFile(new URL("../components/editor/AccountDialog.tsx",import.meta.url),"utf8");
  assert.match(source,/Continue with Google/);
  assert.match(source,/Create CreatorMake account/);
  assert.match(source,/Sign in to CreatorMake/);
  assert.match(source,/Show password/);
  assert.match(source,/Import account \+ projects/);
  assert.match(source,/Download account \+ projects/);
  assert.match(source,/merge its projects/);
  assert.match(source,/never stores a readable password/);
  assert.doesNotMatch(source,/OAuth web client ID|Configure this browser|administrator setting/);
});
