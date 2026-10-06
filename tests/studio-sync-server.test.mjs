import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { startStudioSyncServer } from "../scripts/studio-sync-server.mjs";
import { CREATORMAKE_APP_VERSION, CREATORMAKE_BRIDGE_VERSION, CREATORMAKE_PLUGIN_VERSION, CREATORMAKE_PRODUCTION_ORIGIN, CREATORMAKE_PROTOCOL_VERSION } from "../lib/creatormake-version.js";

const asProjectManifest=(value)=>{const nodes=value.nodes??[],projectObjectIds=[...new Set(nodes.filter((node)=>node.sourceId!=="__creatormake_viewport").map((node)=>String(node.attributes?.CreatorMakeSourceElementId??node.attributes?.CreatorMakeLayoutSourceId??node.attributes?.CreatorMakeSourceId??node.attributes?.CreatorMakeLogicalParentId??node.sourceId).split("::")[0]))];return{...value,kind:"project",messageType:"PROJECT_MANIFEST",projectId:`project-${value.screenGuiName}`,projectName:value.screenGuiName,manifestVersion:`${value.screenGuiName}:1`,projectObjectIds,exportDiagnostics:{projectObjectCount:projectObjectIds.length,exportedProjectObjectCount:projectObjectIds.length,exportNodeCount:nodes.length,presetsExported:0,presetDefinitionsIncluded:false}};};
const syncRequest=(manifest,mode="preview")=>({messageType:"PROJECT_SYNC_REQUEST",kind:"project",projectId:manifest.projectId,manifestVersion:manifest.manifestVersion,mode});

test("local Studio Sync serves health and the current Roblox manifest", async (context) => {
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-health-")),{ server, url } = await startStudioSyncServer({ port: 0, quiet: true, outputDir });
  context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});

  const healthResponse = await fetch(`${url}/health`);
  assert.equal(healthResponse.status, 200);
  const initialHealth=await healthResponse.json();
  assert.equal(initialHealth.ok,true);assert.equal(initialHealth.status,"ok");assert.equal(initialHealth.app,"CreatorMake");assert.equal(initialHealth.service,"CreatorMake Studio Sync");assert.equal(initialHealth.appVersion,CREATORMAKE_APP_VERSION);assert.equal(initialHealth.bridgeVersion,CREATORMAKE_BRIDGE_VERSION);assert.equal(initialHealth.protocolVersion,CREATORMAKE_PROTOCOL_VERSION);assert.equal(initialHealth.connectionState,"WAITING_FOR_STUDIO");assert.equal(initialHealth.pluginOnline,false);assert.equal(initialHealth.pluginVersionRequired,CREATORMAKE_PLUGIN_VERSION);assert.deepEqual(initialHealth.plugins,[]);assert.equal(initialHealth.manifestReady,false);assert.equal(initialHealth.currentProjectId,null);assert.equal(initialHealth.currentProjectName,null);assert.equal(initialHealth.currentManifestEndpoint,"/project/current/manifest");assert.equal(initialHealth.diagnostics.syncServer,"running");assert.equal(initialHealth.diagnostics.manifest,"not-staged");assert.equal(initialHealth.diagnostics.assetUpload,"not-configured");assert.equal(initialHealth.diagnostics.deployTarget,"StarterGui — Every Player");assert.equal(initialHealth.diagnostics.runtime,"Client");assert.equal(initialHealth.sync,null);

  const productionHealth=await fetch(`${url}/health`,{headers:{origin:CREATORMAKE_PRODUCTION_ORIGIN}});assert.equal(productionHealth.status,200);assert.equal(productionHealth.headers.get("access-control-allow-origin"),CREATORMAKE_PRODUCTION_ORIGIN);
  const privateNetworkPreflight=await fetch(`${url}/health`,{method:"OPTIONS",headers:{origin:CREATORMAKE_PRODUCTION_ORIGIN,"access-control-request-method":"GET","access-control-request-private-network":"true"}});assert.equal(privateNetworkPreflight.status,204);assert.equal(privateNetworkPreflight.headers.get("access-control-allow-origin"),CREATORMAKE_PRODUCTION_ORIGIN);assert.equal(privateNetworkPreflight.headers.get("access-control-allow-private-network"),"true");
  const previewOrigin="http://127.0.0.1:4174";
  const previewHealth=await fetch(`${url}/health`,{headers:{origin:previewOrigin}});assert.equal(previewHealth.status,200);assert.equal(previewHealth.headers.get("access-control-allow-origin"),previewOrigin);
  const previewPreflight=await fetch(`${url}/health`,{method:"OPTIONS",headers:{origin:previewOrigin,"access-control-request-method":"GET","access-control-request-private-network":"true"}});assert.equal(previewPreflight.status,204);assert.equal(previewPreflight.headers.get("access-control-allow-origin"),previewOrigin);assert.equal(previewPreflight.headers.get("access-control-allow-private-network"),"true");
  const arbitraryLoopbackHealth=await fetch(`${url}/health`,{headers:{origin:"http://localhost:61234"}});assert.equal(arbitraryLoopbackHealth.status,200);assert.equal(arbitraryLoopbackHealth.headers.get("access-control-allow-origin"),"http://localhost:61234");
  const blockedOrigin=await fetch(`${url}/health`,{headers:{origin:"https://untrusted.example"}});assert.equal(blockedOrigin.status,200);assert.equal(blockedOrigin.headers.get("access-control-allow-origin"),null);

  const missingResponse = await fetch(`${url}/project/current/manifest`);
  assert.equal(missingResponse.status, 503);
  assert.match((await missingResponse.json()).error,/No CreatorMake project is currently available/);

  const basicTestResponse = await fetch(`${url}/basic-test`);
  assert.equal(basicTestResponse.status, 200);
  const basicTestManifest = await basicTestResponse.json();
  assert.equal(basicTestManifest.protocolVersion, CREATORMAKE_PROTOCOL_VERSION);
  assert.equal(basicTestManifest.screenGuiName, "CreatorMakeConnectionTest");
  assert.equal(basicTestManifest.nodes.length, 1);
  assert.equal(basicTestManifest.nodes[0].className, "Frame");
  assert.equal(basicTestManifest.importDiagnostics.readyForImport, true);

  const outdated=await fetch(`${url}/plugin/heartbeat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({instanceId:"outdated-studio-instance",pluginVersion:CREATORMAKE_PLUGIN_VERSION-2,protocolVersion:CREATORMAKE_PROTOCOL_VERSION-1,status:"idle"})});assert.equal(outdated.status,200);const outdatedResult=await outdated.json();assert.equal(outdatedResult.accepted,false);assert.equal(outdatedResult.connectionState,"PLUGIN_OUTDATED");assert.equal(outdatedResult.protocolVersion,CREATORMAKE_PROTOCOL_VERSION);
  const oldBuild=await fetch(`${url}/plugin/heartbeat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({instanceId:"old-build-instance",pluginVersion:CREATORMAKE_PLUGIN_VERSION-1,protocolVersion:CREATORMAKE_PROTOCOL_VERSION,status:"idle"})});const oldBuildResult=await oldBuild.json();assert.equal(oldBuildResult.accepted,false);assert.equal(oldBuildResult.connectionState,"PLUGIN_OUTDATED");assert.equal(oldBuildResult.pluginVersionRequired,CREATORMAKE_PLUGIN_VERSION);
  const mismatchHealth=await(await fetch(`${url}/health`)).json();assert.equal(mismatchHealth.connectionState,"PLUGIN_OUTDATED");assert.equal(mismatchHealth.pluginOnline,false);assert.equal(mismatchHealth.diagnostics.pluginVersion,CREATORMAKE_PLUGIN_VERSION-1);

  const manifest = asProjectManifest({
    schema: "creatormake.roblox-manifest",
    version: 1,
    screenGuiName: "TestGui",
    referenceResolution: { width: 1280, height: 720 },
    sizingMode: "AUTO",
    nodes: [{ sourceId: "button-1", name: "Buy", className: "TextButton", parentSourceId: null, properties: {}, decorators: [] }],
  });
  const presetPayload={...manifest,kind:"preset-library",messageType:"PRESET_LIST"};const presetRejected=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(presetPayload)});assert.equal(presetRejected.status,400);assert.match((await presetRejected.json()).error,/preset library instead of project manifest/);
  const blockedWrite=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json",origin:"https://untrusted.example"},body:JSON.stringify(manifest)});assert.equal(blockedWrite.status,403);
  const publishResponse = await fetch(`${url}/project/current/manifest`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: CREATORMAKE_PRODUCTION_ORIGIN },
    body: JSON.stringify(manifest),
  });
  assert.equal(publishResponse.status, 200);
  assert.equal((await publishResponse.json()).nodes, 1);

  const manifestResponse = await fetch(`${url}/project/current/manifest`);
  assert.equal(manifestResponse.status, 200);
  assert.deepEqual(await manifestResponse.json(), {...manifest,protocolVersion:CREATORMAKE_PROTOCOL_VERSION,schemaVersion:1,importDiagnostics:{schemaVersion:"valid",project:"valid",instances:"valid",assets:"valid",unmappedAssets:0,previewOnlyAssets:0,needsPublish:0,previewReady:true,readyForImport:true,reason:"READY"}});

  const wrongProject=await fetch(`${url}/sync/request`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({...syncRequest(manifest),projectId:"all"})});assert.equal(wrongProject.status,409);
  const queuedResponse=await fetch(`${url}/sync/request`,{method:"POST",headers:{"content-type":"application/json",origin:"http://127.0.0.1:5173"},body:JSON.stringify(syncRequest(manifest))});
  assert.equal(queuedResponse.status,202);const queued=await queuedResponse.json();assert.equal(queued.sync.status,"pending");assert.equal(queued.sync.mode,"preview");assert.equal(queued.sync.plan.nodes,1);
  const plugin={instanceId:"studio-test-instance",appVersion:CREATORMAKE_APP_VERSION,pluginVersion:CREATORMAKE_PLUGIN_VERSION,protocolVersion:CREATORMAKE_PROTOCOL_VERSION,status:"idle",placeId:123};
  const heartbeat=await fetch(`${url}/plugin/heartbeat`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(plugin)});assert.equal(heartbeat.status,200);assert.equal((await heartbeat.json()).accepted,true);
  const claim=await fetch(`${url}/sync/claim`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(plugin)});assert.equal(claim.status,200);const claimed=await claim.json();assert.equal(claimed.status,"claimed");assert.equal(claimed.jobId,queued.sync.id);
  const result=await fetch(`${url}/sync/result`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({messageType:"PROJECT_SYNC_RESULT",jobId:queued.sync.id,instanceId:plugin.instanceId,status:"completed",message:"PREVIEW READY",result:{created:0,reused:0,nodes:1}})});assert.equal(result.status,200);
  const connectedHealth=await(await fetch(`${url}/health`)).json();assert.equal(connectedHealth.pluginOnline,true);assert.equal(connectedHealth.sync.status,"completed");assert.equal(connectedHealth.sync.result.nodes,1);
  const installResponse=await fetch(`${url}/sync/request`,{method:"POST",headers:{"content-type":"application/json",origin:"http://127.0.0.1:5173"},body:JSON.stringify(syncRequest(manifest,"install-starter-gui"))});
  assert.equal(installResponse.status,202);const install=await installResponse.json();assert.equal(install.sync.mode,"install-starter-gui");assert.match(install.sync.message,/StarterGui/);
  const cleared=await fetch(`${url}/project/current/manifest`,{method:"DELETE"});assert.equal(cleared.status,200);assert.equal((await cleared.json()).currentProjectId,null);assert.equal((await(await fetch(`${url}/health`)).json()).manifestReady,false);
});

test("local Studio Sync rejects legacy combined text rasters and accepts split native text",async(context)=>{
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-text-architecture-")),{server,url}=await startStudioSyncServer({port:0,quiet:true,outputDir});
  context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});
  const root={sourceId:"title",name:"Text",className:"Frame",parentSourceId:null,properties:{BackgroundTransparency:1},attributes:{CreatorMakeElementType:"text"},decorators:[]};
  const legacy=asProjectManifest({schema:"creatormake.roblox-manifest",version:2,screenGuiName:"LegacyTextGui",referenceResolution:{width:960,height:600},sizingMode:"OFFSET",visualMode:"PIXEL_ACCURATE",nodes:[root,{sourceId:"title::visual",name:"_Visual",className:"ImageLabel",parentSourceId:"title",properties:{Image:""},attributes:{CreatorMakeRole:"Visual",CreatorMakeVisualPart:"full"},decorators:[]}],assets:[]});
  const rejected=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(legacy)});assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/TEXT_EXPORT_ARCHITECTURE_OUTDATED|LEGACY_TEXT_RASTER_REJECTED/);
  const split={...legacy,textExportArchitecture:3,nodes:[root,{sourceId:"title::background",name:"_Background",className:"ImageLabel",parentSourceId:"title",properties:{Image:""},attributes:{CreatorMakeRole:"Background",CreatorMakeVisualPart:"background"},decorators:[]},{sourceId:"title::text",name:"TextLabel",className:"TextLabel",parentSourceId:"title",properties:{BackgroundTransparency:1,Text:"New text",Active:false,Selectable:false},attributes:{CreatorMakeRole:"EditableText"},decorators:[]}]};
  const accepted=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(split)});assert.equal(accepted.status,200);
  const stored=await(await fetch(`${url}/project/current/manifest`)).json(),text=stored.nodes.find((node)=>node.sourceId==="title::text");assert.equal(stored.textExportArchitecture,3);assert.equal(text.className,"TextLabel");assert.equal(text.properties.Text,"New text");
});

test("local Studio Sync rejects legacy PixelText glyph assets",async(context)=>{
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-pixel-text-")),{server,url}=await startStudioSyncServer({port:0,quiet:true,outputDir});context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});
  const root={sourceId:"title",name:"Title",className:"Frame",parentSourceId:null,properties:{},attributes:{CreatorMakeElementType:"text"},decorators:[]},manifest=asProjectManifest({schema:"creatormake.roblox-manifest",version:2,textExportArchitecture:3,screenGuiName:"PixelTextGui",referenceResolution:{width:960,height:600},sizingMode:"OFFSET",visualMode:"PIXEL_ACCURATE",nodes:[root,{sourceId:"title::pixel-text",name:"_PixelText",className:"ImageLabel",parentSourceId:"title",properties:{Image:""},attributes:{CreatorMakeRole:"PixelText",CreatorMakeVisualPart:"text"},decorators:[]}],assets:[]});
  const response=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(manifest)});assert.equal(response.status,400);assert.match(await response.text(),/PIXEL_TEXT_REJECTED/);
});

test("local Studio Sync identifies the exact malformed manifest object and field",async(context)=>{
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-invalid-object-")),{server,url}=await startStudioSyncServer({port:0,quiet:true,outputDir});
  context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});
  const malformed=asProjectManifest({schema:"creatormake.roblox-manifest",version:2,screenGuiName:"InvalidGui",referenceResolution:{width:960,height:600},sizingMode:"OFFSET",visualMode:"NATIVE",nodes:[{sourceId:"root-frame",name:"Root",className:"Frame",parentSourceId:null,properties:{},attributes:{CreatorMakeElementType:"frame"},decorators:[]},{sourceId:"broken-child",name:"Broken",className:"ViewportFrame",parentSourceId:"root-frame",properties:{},attributes:{CreatorMakeElementType:"image"},decorators:[]}],assets:[]});
  const response=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(malformed)}),result=await response.json();
  assert.equal(response.status,400);assert.match(result.error,/Object: broken-child/);assert.match(result.error,/Type: image/);assert.match(result.error,/Field: className/);assert.match(result.error,/unsupported Roblox GUI class ViewportFrame/);
});

test("local Studio Sync writes rendered PNGs and strips embedded data from the plugin manifest",async(context)=>{
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-rendered-")),{server,url}=await startStudioSyncServer({port:0,quiet:true,outputDir});
  context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});
  const sourcePng=await sharp({create:{width:1,height:1,channels:4,background:{r:12,g:34,b:56,alpha:128/255}}}).png().toBuffer();
  const manifest=asProjectManifest({schema:"creatormake.roblox-manifest",version:2,screenGuiName:"PixelGui",referenceResolution:{width:960,height:600},sizingMode:"AUTO",visualMode:"PIXEL_ACCURATE",renderScale:2,nodes:[{sourceId:"text-1",name:"Title",className:"ImageLabel",parentSourceId:null,properties:{Image:""},attributes:{CreatorMakeSourceId:"text-1",CreatorMakeVisualHash:"v123",CreatorMakeAssetStatus:"needs-mapping"},decorators:[]}],assets:[{sourceId:"text-1",elementName:"Title",role:"text",visualHash:"v123",layoutHash:"l123",width:1,height:1,layoutWidth:1,layoutHeight:1,renderPixelWidth:1,renderPixelHeight:1,requestedScale:2,scale:1,mimeType:"image/png",format:"png",layoutBounds:{x:0,y:0,width:1,height:1},visualBounds:{x:0,y:0,width:1,height:1},bounds:{x:0,y:0,width:1,height:1},pixelEncoding:"RGBA8_STRAIGHT_ALPHA",pixelSamples:[{label:"50%,50%",normalizedX:.5,normalizedY:.5,pixelX:0,pixelY:0,rgba:[12,34,56,128]}],status:"needs-mapping",dirty:false,dataUrl:`data:image/png;base64,${sourcePng.toString("base64")}`}]} );
  const publish=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json",origin:"http://127.0.0.1:5173"},body:JSON.stringify(manifest)}),result=await publish.json();
  assert.equal(publish.status,200);assert.equal(result.assets,1);assert.equal(result.mappedAssets,0);assert.ok(result.renderedAssets[0].localPath);assert.equal(result.renderedAssets[0].dataUrl,undefined);
  const stored=await(await fetch(`${url}/project/current/manifest`)).json();assert.equal(stored.assets[0].status,"needs-publish");assert.equal(stored.assets[0].dataUrl,undefined);assert.equal(stored.importDiagnostics.previewReady,true);assert.equal(stored.importDiagnostics.readyForImport,true);assert.equal(stored.importDiagnostics.reason,"STUDIO_PREVIEW_READY");
  const image=await fetch(`${url}${stored.assets[0].localUrl}`);assert.equal(image.status,200);assert.equal(image.headers.get("content-type"),"image/png");assert.ok((await image.arrayBuffer()).byteLength>20);
  const pixels=await(await fetch(`${url}/asset-pixels?sourceId=text-1&visualHash=v123&offset=0`)).json();assert.equal(pixels.width,1);assert.equal(pixels.height,1);assert.equal(pixels.sourceWidth,1);assert.equal(pixels.sourceHeight,1);assert.equal(pixels.sizingStrategy,"direct");assert.equal(pixels.pixelFormat,"RGBA8");assert.equal(pixels.rgbaEncoding,"RGBA8_STRAIGHT_ALPHA");assert.equal(pixels.channels,4);assert.equal(pixels.alpha.preserved,true);assert.equal(pixels.alpha.opaquePixels+pixels.alpha.transparentPixels+pixels.alpha.partialPixels,1);assert.equal(pixels.totalBytes,4);assert.deepEqual([...Buffer.from(pixels.dataBase64,"base64")],[12,34,56,128]);assert.equal(pixels.verification.sampleMatch,true);assert.equal(pixels.verification.maxChannelDifference,0);assert.equal(pixels.verification.averageChannelDifference,0);assert.equal(pixels.done,true);
  const mapping=await fetch(`${url}/asset-mappings`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({screenGuiName:"PixelGui",mappings:[{sourceId:"text-1",visualHash:"v123",robloxAssetId:"rbxassetid://987654321"}]})});assert.equal(mapping.status,200);assert.equal((await mapping.json()).mappedAssets,1);
  const mapped=await(await fetch(`${url}/project/current/manifest`)).json();assert.equal(mapped.assets[0].robloxAssetId,"rbxassetid://987654321");assert.equal(mapped.nodes[0].properties.Image,"rbxassetid://987654321");assert.equal(mapped.nodes[0].attributes.CreatorMakeAssetStatus,"mapped");
  const restage=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json",origin:"http://127.0.0.1:5173"},body:JSON.stringify(manifest)});assert.equal(restage.status,200);assert.equal((await restage.json()).mappedAssets,1);
  const duplicateVisual=structuredClone(manifest);duplicateVisual.assets[0].sourceId="text-2";duplicateVisual.nodes[0].sourceId="text-2";duplicateVisual.nodes[0].attributes.CreatorMakeSourceId="text-2";
  const duplicateStage=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json",origin:"http://127.0.0.1:5173"},body:JSON.stringify(asProjectManifest(duplicateVisual))});assert.equal(duplicateStage.status,200);assert.equal((await duplicateStage.json()).mappedAssets,1);
});

test("pixel transport fits oversized renders within the Roblox EditableImage limit without dropping RGBA alpha",async(context)=>{
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-sized-")),{server,url}=await startStudioSyncServer({port:0,quiet:true,outputDir});
  context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});
  const png=await sharp({create:{width:1500,height:300,channels:4,background:{r:20,g:40,b:60,alpha:.5}}}).png().toBuffer();
  const manifest={schema:"creatormake.roblox-manifest",version:2,screenGuiName:"SizedGui",referenceResolution:{width:960,height:600},sizingMode:"AUTO",visualMode:"PIXEL_ACCURATE",renderScale:2,nodes:[{sourceId:"wide-1",name:"Wide",className:"ImageLabel",parentSourceId:null,properties:{Image:""},attributes:{CreatorMakeSourceId:"wide-1",CreatorMakeVisualHash:"widehash",CreatorMakeAssetStatus:"needs-mapping"},decorators:[]}],assets:[{sourceId:"wide-1",elementName:"Wide",role:"frame",visualHash:"widehash",layoutHash:"layout",width:1500,height:300,scale:2,mimeType:"image/png",format:"png",bounds:{x:0,y:0,width:750,height:150},status:"needs-mapping",dirty:false,dataUrl:`data:image/png;base64,${png.toString("base64")}`}]};
  Object.assign(manifest,asProjectManifest(manifest));
  const staged=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(manifest)});assert.equal(staged.status,200);
  const localInstall=await fetch(`${url}/sync/request`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(syncRequest(manifest,"install-starter-gui"))}),localInstallResult=await localInstall.json();
  assert.equal(localInstall.status,202);assert.equal(localInstallResult.sync.mode,"install-starter-gui");assert.equal(localInstallResult.sync.plan.totalAssets,1);assert.equal(localInstallResult.sync.plan.publishedAssets,0);assert.match(localInstallResult.sync.message,/StarterGui/);
  const pixels=await(await fetch(`${url}/asset-pixels?sourceId=wide-1&visualHash=widehash&offset=0`)).json();
  assert.equal(pixels.sourceWidth,1500);assert.equal(pixels.sourceHeight,300);assert.equal(pixels.width,1024);assert.equal(pixels.height,205);assert.equal(pixels.sizingStrategy,"fit-within-1024");assert.equal(pixels.totalBytes,1024*205*4);assert.equal(pixels.alpha.preserved,true);assert.ok(pixels.alpha.partialPixels>0);
});

test("explicit Open Cloud publishing uploads each dirty visual hash once, persists the real ID, and queues permanent Studio apply",async(context)=>{
  const outputDir=await mkdtemp(join(tmpdir(),"creatormake-publish-")),calls=[];
  const openCloudFetch=async(url,options={})=>{calls.push({url,options});if(options.method==="POST")return new Response(JSON.stringify({path:"operations/publish-one"}),{status:200});return new Response(JSON.stringify({path:"operations/publish-one",done:true,response:{assetId:"24681012"}}),{status:200});};
  const {server,url}=await startStudioSyncServer({port:0,quiet:true,outputDir,openCloudFetch,publishingSleep:async()=>{},publishingEnvironment:{ROBLOX_OPEN_CLOUD_API_KEY:"server-secret",ROBLOX_CREATOR_TYPE:"group",ROBLOX_CREATOR_ID:"1234"}});
  context.after(async()=>{await new Promise((resolve)=>server.close(resolve));await rm(outputDir,{recursive:true,force:true});});
  const png="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
  const asset=(sourceId)=>({sourceId,elementName:`Visual ${sourceId}`,role:"text",visualHash:"shared-hash",layoutHash:`layout-${sourceId}`,width:1,height:1,scale:1,mimeType:"image/png",format:"png",bounds:{x:0,y:0,width:1,height:1},status:"needs-publish",dirty:false,dataUrl:png});
  const node=(sourceId)=>({sourceId,name:sourceId,className:"ImageLabel",parentSourceId:null,properties:{Image:""},attributes:{CreatorMakeSourceId:sourceId,CreatorMakeVisualHash:"shared-hash",CreatorMakeAssetStatus:"needs-publish"},decorators:[]});
  const manifest={schema:"creatormake.roblox-manifest",version:2,screenGuiName:"PublishGui",referenceResolution:{width:960,height:600},sizingMode:"AUTO",visualMode:"PIXEL_ACCURATE",nodes:[node("one"),node("two")],assets:[asset("one"),asset("two")]};
  Object.assign(manifest,asProjectManifest(manifest));
  const staged=await fetch(`${url}/project/current/manifest`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(manifest)});assert.equal(staged.status,200);
  const before=await(await fetch(`${url}/publishing/status`)).json();assert.equal(before.config.configured,true);assert.equal(before.needsPublish,1);assert.equal(before.previewOnlyAssets,2);assert.ok(!JSON.stringify(before).includes("server-secret"));
  const started=await fetch(`${url}/publish`,{method:"POST",headers:{"content-type":"application/json"},body:"{}"});assert.equal(started.status,202);
  let status;for(let attempt=0;attempt<50;attempt+=1){status=await(await fetch(`${url}/publishing/status`)).json();if(status.job?.status==="completed"||status.job?.status==="failed")break;await new Promise((resolve)=>setTimeout(resolve,5));}
  assert.equal(status.job.status,"completed");assert.equal(status.job.published,1);assert.equal(status.job.reused,1);assert.equal(calls.filter((call)=>call.options.method==="POST").length,1);assert.equal(calls[0].options.headers["x-api-key"],"server-secret");
  const fileContent=calls[0].options.body.get("fileContent");assert.equal(fileContent.type,"image/png");assert.ok((await fileContent.arrayBuffer()).byteLength>20);
  const published=await(await fetch(`${url}/project/current/manifest`)).json();assert.equal(published.assets[0].robloxAssetId,"rbxassetid://24681012");assert.equal(published.assets[1].robloxAssetId,"rbxassetid://24681012");assert.equal(published.nodes[0].properties.Image,"rbxassetid://24681012");
  const health=await(await fetch(`${url}/health`)).json();assert.equal(health.sync.mode,"install-starter-gui");assert.equal(health.sync.status,"pending");assert.equal(health.publishing.needsPublish,0);assert.equal(health.diagnostics.deployTarget,"StarterGui — Every Player");assert.equal(health.diagnostics.managedScreenGui,"PublishGui");assert.equal(health.diagnostics.runtime,"Client");assert.equal(health.diagnostics.multiPlayerReady,true);
});
