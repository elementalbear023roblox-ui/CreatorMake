import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createCreatorMakeAccountKey, createCreatorMakeCredentialRecord, parseCreatorMakeAccountKey, validateCreatorMakeAccountInput, verifyCreatorMakePassword } from "../lib/accounts/creator-account.ts";

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
  assert.throws(()=>parseCreatorMakeAccountKey('{"format":"unknown"}'),/Choose a CreatorMake account key/);
});

test("customer account dialog never exposes OAuth administrator configuration",async()=>{
  const source=await readFile(new URL("../components/editor/AccountDialog.tsx",import.meta.url),"utf8");
  assert.match(source,/Continue with Google/);
  assert.match(source,/Create CreatorMake account/);
  assert.match(source,/Sign in to CreatorMake/);
  assert.match(source,/Show password/);
  assert.match(source,/Import account key/);
  assert.match(source,/never stores a readable password/);
  assert.doesNotMatch(source,/OAuth web client ID|Configure this browser|administrator setting/);
});
