import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { createRobloxExport } from "../lib/roblox/exporter.ts";
import { createRobloxPluginModel, createRobloxPluginSource } from "../lib/roblox/plugin.ts";
import { diffRobloxManifests } from "../lib/roblox/sync.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";
import { CREATORMAKE_APP_VERSION, CREATORMAKE_BRIDGE_VERSION, CREATORMAKE_PLUGIN_VERSION, CREATORMAKE_PROTOCOL_VERSION } from "../lib/creatormake-version.js";

const projectWithButton=()=>{const frame=createElement("frame");Object.assign(frame,{id:"frame-stable",name:"Shop",parentId:null});const button=createElement("button");Object.assign(button,{id:"button-stable",name:"BuyButton",parentId:frame.id,fill:"#7457ff",text:"BUY"});return{screen:{width:960,height:600},elements:[frame,button]};};

test("manifest deltas update the same stable CreatorMakeId without recreating it",()=>{
  const before=projectWithButton(),after=structuredClone(before);after.elements[1].fill="#ff3355";
  const first=createRobloxExport(before,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"ShopGui"}).manifest,second=createRobloxExport(after,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"ShopGui"}).manifest,operations=diffRobloxManifests(first,second);
  assert.ok(operations.some((operation)=>operation.type==="update"&&operation.sourceId==="button-stable"));
  assert.ok(!operations.some((operation)=>operation.type==="create"||operation.type==="delete"));
  assert.equal(second.nodes.find((node)=>node.sourceId==="button-stable").parentSourceId,"frame-stable");
  assert.equal(second.nodes.find((node)=>node.sourceId==="button-stable").properties.BackgroundColor3.kind,"Color3");
});

test("manifest deltas never treat a different project as delete authority",()=>{
  const garage={...projectWithButton(),id:"garage_123",name:"Garage UI",updatedAt:1},shop={...projectWithButton(),id:"shop_456",name:"Shop UI",updatedAt:2};
  const garageManifest=createRobloxExport(garage,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"GarageUI"}).manifest;
  const shopManifest=createRobloxExport(shop,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE",screenGuiName:"ShopUI"}).manifest;
  const operations=diffRobloxManifests(garageManifest,shopManifest);
  assert.equal(garageManifest.guiId,"garage_123:screen");
  assert.equal(shopManifest.guiId,"shop_456:screen");
  assert.ok(operations.every((operation)=>operation.type==="create"));
  assert.ok(!operations.some((operation)=>operation.type==="delete"));
});

test("generated Studio plugin validates local health and retains deduplicated EditableImage previews without asset upload APIs",()=>{
  const source=createRobloxPluginSource("https://creator.example");
  assert.match(source,/HttpService:RequestAsync/);assert.match(source,/CreatorMakeId/);assert.match(source,/http:\/\/127\.0\.0\.1:32145/);assert.match(source,/request\("GET","\/health"\)/);assert.match(source,/health\.status~="ok"/);assert.match(source,/CreatorMake: Connected/);assert.match(source,/toolbar:CreateButton\("CreatorMake", "Connect to the local CreatorMake editor", ""\)/);
  assert.ok(!source.includes("LIVE SYNC"));assert.ok(!source.includes("publisherToken"));assert.doesNotMatch(source,/rbxassetid:\/\/\d+/);
  assert.doesNotMatch(source,/CreateAssetAsync|CreateAssetVersionAsync/);assert.match(source,/AssetService:CreateEditableImage/);assert.match(source,/WritePixelsBuffer/);assert.match(source,/Content\.fromObject\(image\)/);assert.match(source,/instance\.ImageContent=content/);assert.match(source,/EncodingService:Base64Decode/);assert.match(source,/\/asset-pixels/);
  assert.match(source,/imageScopes = \{\}/);assert.match(source,/sharedImagesByHash = \{\}/);assert.match(source,/releaseImageScope/);assert.match(source,/releaseAllPreviewImages/);assert.match(source,/plugin\.Unloading/);
  assert.match(source,new RegExp(`CREATORMAKE_APP_VERSION = "${CREATORMAKE_APP_VERSION.replaceAll(".","\\.")}"`));assert.match(source,new RegExp(`EXPECTED_BRIDGE_VERSION = "${CREATORMAKE_BRIDGE_VERSION.replaceAll(".","\\.")}"`));assert.match(source,new RegExp(`PLUGIN_VERSION = ${CREATORMAKE_PLUGIN_VERSION}`));assert.match(source,new RegExp(`SUPPORTED_PROTOCOL_VERSION = ${CREATORMAKE_PROTOCOL_VERSION}`));assert.match(source,/\/plugin\/heartbeat/);assert.match(source,/\/sync\/claim/);assert.match(source,/\/sync\/progress/);assert.match(source,/\/sync\/result/);assert.match(source,/pixelFormat~="RGBA8"/);assert.match(source,/RGBA8_STRAIGHT_ALPHA/);assert.match(source,/width>1024/);assert.match(source,/pendingScreenGui and pendingScreenGui\.Parent==nil/);
  assert.match(source,/RETRY CONNECTION/);assert.match(source,/TEST BASIC FRAME IMPORT/);assert.match(source,/HTTP_PERMISSION_REQUIRED/);assert.match(source,/PLUGIN_UPDATE_REQUIRED/);assert.match(source,/MANIFEST_INSTANCES_MISSING/);
  assert.match(source,/request\("GET","\/basic-test"\)/);
  assert.match(source,/manifest\.visualMode~="PIXEL_ACCURATE"/);assert.match(source,/node\.attributes/);assert.match(source,/CreatorMakeVisualMode/);assert.match(source,/PREVIEW READY/);assert.match(source,/PREVIEW CURRENT CREATORMAKE PROJECT/);assert.match(source,/AutoButtonColor=false/);assert.match(source,/verifyTextArchitecture/);assert.match(source,/textArchitecture=result\.textArchitecture/);assert.match(source,/nativeText:IsA\("TextLabel"\)/);assert.match(source,/role=="EditableText" or role=="EditableTextBox" or role=="ButtonText"/);
  assert.match(source,/CreatorMakeCaptionLayoutSpace=="LOCAL_CHILD"/);assert.match(source,/CAPTION_LAYOUT_MISSING/);assert.match(source,/CreatorMakeCaptionValidationResult/);assert.match(source,/PASS_WITH_TOLERANCE/);assert.match(source,/CreatorMakeStandaloneTextRotationApplied/);assert.match(source,/angleError>\.25/);assert.match(source,/Import will continue/);assert.match(source,/\[CreatorMake Caption\]/);
  assert.match(source,/mode=="FIT_GEOMETRY"/);assert.match(source,/CreatorMakeCalculatedFitTextSize/);assert.match(source,/CreatorMakeCaptionSafeWidth/);assert.match(source,/CreatorMakeGeometryCenterlineAngle/);assert.match(source,/Design\/Calculated\/Exported TextSize/);
  assert.match(source,/IMPORT CURRENT CREATORMAKE PROJECT/);assert.match(source,/REPAIR CREATORMAKE GUIS/);assert.match(source,/REPAIR CHECK PASSED/);assert.match(source,/\/project\/current\/manifest/);assert.match(source,/manifest\.kind=="preset-library"/);assert.match(source,/manifest\.kind~="project"/);assert.match(source,/PROJECT_MANIFEST/);assert.match(source,/PROJECT_SYNC_PROGRESS/);assert.match(source,/PROJECT_SYNC_RESULT/);assert.match(source,/projectObjects\[owner\]/);
  assert.match(source,/CreatorMakeGlobalScale/);assert.match(source,/ViewportSize/);assert.match(source,/math\.min\(viewportSize\.X\/referenceWidth,viewportSize\.Y\/referenceHeight\)/);
  assert.match(source,/TEXT EXPORT DEBUG\\nName:/);
  assert.doesNotMatch(source,/TEXT EXPORT DEBUG\r?\nName:/);
  const model=createRobloxPluginModel("https://creator.example");assert.match(model,/CreatorMake Studio Sync/);assert.match(model,/<!\[CDATA\[/);
});

test("generated Studio plugin separates PlayerGui preview from managed StarterGui deployment",()=>{
  const source=createRobloxPluginSource("https://creator.example");
  assert.match(source,/game:GetService\("Players"\)/);
  assert.match(source,/game:GetService\("RunService"\)/);
  assert.match(source,/game:GetService\("StarterGui"\)/);
  assert.match(source,/PlayerGui/);
  assert.match(source,/install-starter-gui/);
  assert.match(source,/CreatorMakeManaged/);
  assert.match(source,/CreatorMakeProjectId/);
  assert.match(source,/CreatorMakeDeployTarget/);
  assert.match(source,/StarterGui — Current Project/);
  assert.match(source,/Preview Only/);
  assert.match(source,/Studio is currently running/);
  assert.match(source,/ResetOnSpawn/);
  assert.match(source,/legacy CreatorMake preview/i);
  assert.match(source,/MULTIPLAYER_VISIBILITY_BLOCKED/);
  assert.doesNotMatch(source,/localAssetImport=starterGuiImport and not publishedAssets/);
  assert.match(source,/applyManifest\(manifest,deployTarget\)/);
  assert.match(source,/CreatorMakeMultiPlayerReady/);
  assert.match(source,/STARTERGUI READY/);
  assert.match(source,/localAssetImport=result\.localAssetImport/);
  assert.match(source,/multiPlayerReady=result\.multiPlayerReady/);
  assert.match(source,/experienceCreatorId=game\.CreatorId/);
  assert.match(source,/experienceCreatorType=game\.CreatorType\.Name/);
  assert.match(source,/unsafeVisualsForScreenGui/);
  assert.match(source,/CreatorMakeExpectsVisualChild/);
  assert.match(source,/delegatesVisualToChild/);
});

test("Studio plugin keeps managed ScreenGuis, image references, and viewport bindings project-scoped",()=>{
  const source=createRobloxPluginSource("https://creator.example");
  assert.match(source,/managedScopeKey\(manifest, deployTarget\)/);
  assert.match(source,/tostring\(deployTarget\)\.\.":"\.\.manifestProjectId\(manifest\)/);
  assert.match(source,/item:GetAttribute\("CreatorMakeProjectId"\)==projectId/);
  assert.match(source,/screenGui:SetAttribute\("CreatorMakeGuiId",manifest\.guiId\)/);
  assert.match(source,/screenGui\.Enabled=previousScreenGui and previousScreenGui\.Enabled or settings\.enabled~=false/);
  assert.match(source,/local previous=imageScopes\[candidate\.scopeKey\]/);
  assert.match(source,/sharedImagesByHash\[asset\.visualHash\]/);
  assert.match(source,/local previousScreenGui=findManagedScreenGui\(parent,manifest,deployTarget\)/);
  assert.match(source,/local legacyProjectId=item:GetAttribute\("CreatorMakeProjectId"\)/);
  assert.match(source,/local legacyGuiId=item:GetAttribute\("CreatorMakeGuiId"\)/);
  assert.match(source,/legacyProjectId==nil and legacyGuiId==nil/);
  assert.match(source,/if previousScreenGui and previousScreenGui~=screenGui then previousScreenGui:Destroy\(\) end/);
  assert.match(source,/if not scaleOk then screenGui:Destroy\(\);error\(binding\) end/);
  assert.match(source,/viewportBindings\[scopeKey\]/);
  assert.match(source,/installedCreatorMakeProjects/);
  assert.match(source,/UPDATE GUI/);
  assert.match(source,/IMPORT GUI/);
  assert.doesNotMatch(source,/item:IsA\("ScreenGui"\).*item:Destroy\(\)/);
});
