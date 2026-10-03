import test from "node:test";
import assert from "node:assert/strict";
import { createRobloxImageAsset, publicRobloxPublishingConfig, readRobloxPublishingConfig, waitForRobloxAssetOperation } from "../scripts/roblox-open-cloud.mjs";

test("Roblox publishing configuration never exposes credentials",()=>{
  const config=readRobloxPublishingConfig({ROBLOX_OPEN_CLOUD_API_KEY:"secret-key",ROBLOX_CREATOR_TYPE:"group",ROBLOX_CREATOR_ID:"12345"}),publicConfig=publicRobloxPublishingConfig(config);
  assert.equal(config.configured,true);assert.equal(config.authMode,"api-key");assert.equal(publicConfig.creatorType,"group");assert.equal(publicConfig.creatorId,"12345");assert.ok(!JSON.stringify(publicConfig).includes("secret-key"));
});

test("Open Cloud image publishing sends original PNG multipart data and polls the operation",async()=>{
  const config=readRobloxPublishingConfig({ROBLOX_OPEN_CLOUD_API_KEY:"secret-key",ROBLOX_CREATOR_TYPE:"user",ROBLOX_CREATOR_ID:"987"}),calls=[];
  const fetchImpl=async(url,options={})=>{calls.push({url,options});if(options.method==="POST")return new Response(JSON.stringify({path:"operations/op-1"}),{status:200});return new Response(JSON.stringify({path:"operations/op-1",done:true,response:{assetId:"456789"}}),{status:200});};
  const png=new Uint8Array([137,80,78,71,13,10,26,10]),operation=await createRobloxImageAsset({pngBytes:png,filename:"button.png",displayName:"Buy Button",config,fetchImpl});
  assert.equal(operation.path,"operations/op-1");assert.equal(calls[0].options.headers["x-api-key"],"secret-key");assert.ok(calls[0].options.body instanceof FormData);assert.equal(calls[0].options.body.get("request").includes('"assetType":"Image"'),true);assert.equal((await calls[0].options.body.get("fileContent").arrayBuffer()).byteLength,png.byteLength);
  const result=await waitForRobloxAssetOperation(operation.path,{config,fetchImpl,sleep:async()=>{}});assert.equal(result.robloxAssetId,"rbxassetid://456789");assert.match(calls[1].url,/\/assets\/v1\/operations\/op-1$/);
});

