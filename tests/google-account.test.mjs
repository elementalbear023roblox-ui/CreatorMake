import test from "node:test";
import assert from "node:assert/strict";
import { createProject, exportProjectLibrary, loadProject, mergeProjectLibrary, saveProject } from "../lib/editor/project.ts";
import { isGoogleClientId } from "../lib/google/account.ts";

test("Google OAuth client IDs are validated without treating them as secrets",()=>{
  assert.equal(isGoogleClientId("123456789-example.apps.googleusercontent.com"),true);
  assert.equal(isGoogleClientId("not-a-google-client"),false);
});

test("Google library backup merges newer projects without deleting local projects",async()=>{
  const local=createProject("Google Local Library");
  await saveProject(local,{createRecovery:false});
  const backup=await exportProjectLibrary();
  const remote=structuredClone(backup),target=remote.projects.find((project)=>project.id===local.id);
  assert.ok(target);
  target.name="Google Remote Revision";
  target.updatedAt=local.updatedAt+10_000;
  remote.projects.push({...createProject("Cloud-only Project"),updatedAt:local.updatedAt+20_000});
  const result=await mergeProjectLibrary(remote);
  assert.equal(result.updated,1);
  assert.equal(result.added,1);
  assert.equal((await loadProject(local.id))?.name,"Google Remote Revision");
  const merged=await exportProjectLibrary();
  assert.ok(merged.projects.some((project)=>project.id===local.id));
  assert.ok(merged.projects.some((project)=>project.name==="Cloud-only Project"));
});
