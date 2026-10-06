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

test("generated Studio plugin validates local health and retains deduplicated EditableImage previews without asset upload APIs",()=>{
  const source=createRobloxPluginSource("https://creator.example");
  assert.match(source,/HttpService:RequestAsync/);assert.match(source,/CreatorMakeId/);assert.match(source,/http:\/\/127\.0\.0\.1:32145/);assert.match(source,/request\("GET","\/health"\)/);assert.match(source,/health\.status~="ok"/);assert.match(source,/CreatorMake: Connected/);assert.match(source,/toolbar:CreateButton\("CreatorMake", "Connect to the local CreatorMake editor", ""\)/);
  assert.ok(!source.includes("LIVE SYNC"));assert.ok(!source.includes("publisherToken"));assert.doesNotMatch(source,/rbxassetid:\/\/\d+/);
  assert.doesNotMatch(source,/CreateAssetAsync|CreateAssetVersionAsync/);assert.match(source,/AssetService:CreateEditableImage/);assert.match(source,/WritePixelsBuffer/);assert.match(source,/Content\.fromObject\(image\)/);assert.match(source,/instance\.ImageContent=content/);assert.match(source,/EncodingService:Base64Decode/);assert.match(source,/\/asset-pixels/);
  assert.match(source,/previewImages = \{\}/);assert.match(source,/previewByHash = \{\}/);assert.match(source,/releasePreviewSource/);assert.match(source,/releaseAllPreviewImages/);assert.match(source,/plugin\.Unloading/);
  assert.match(source,new RegExp(`CREATORMAKE_APP_VERSION = "${CREATORMAKE_APP_VERSION.replaceAll(".","\\.")}"`));assert.match(source,new RegExp(`EXPECTED_BRIDGE_VERSION = "${CREATORMAKE_BRIDGE_VERSION.replaceAll(".","\\.")}"`));assert.match(source,new RegExp(`PLUGIN_VERSION = ${CREATORMAKE_PLUGIN_VERSION}`));assert.match(source,new RegExp(`SUPPORTED_PROTOCOL_VERSION = ${CREATORMAKE_PROTOCOL_VERSION}`));assert.match(source,/\/plugin\/heartbeat/);assert.match(source,/\/sync\/claim/);assert.match(source,/\/sync\/progress/);assert.match(source,/\/sync\/result/);assert.match(source,/pixelFormat~="RGBA8"/);assert.match(source,/RGBA8_STRAIGHT_ALPHA/);assert.match(source,/width>1024/);assert.match(source,/instance\.Parent==nil/);
  assert.match(source,/RETRY CONNECTION/);assert.match(source,/TEST BASIC FRAME IMPORT/);assert.match(source,/HTTP_PERMISSION_REQUIRED/);assert.match(source,/PLUGIN_UPDATE_REQUIRED/);assert.match(source,/MANIFEST_INSTANCES_MISSING/);
  assert.match(source,/request\("GET","\/basic-test"\)/);
  assert.match(source,/manifest\.visualMode~="PIXEL_ACCURATE"/);assert.match(source,/node\.attributes/);assert.match(source,/CreatorMakeVisualMode/);assert.match(source,/PREVIEW READY/);assert.match(source,/PREVIEW CURRENT CREATORMAKE PROJECT/);assert.match(source,/AutoButtonColor=false/);assert.match(source,/verifyTextArchitecture/);assert.match(source,/textArchitecture=result\.textArchitecture/);assert.match(source,/nativeText:IsA\("TextLabel"\)/);assert.match(source,/role=="EditableText" or role=="EditableTextBox" or role=="ButtonText"/);
  assert.match(source,/CreatorMakeCaptionLayoutSpace=="LOCAL_CHILD"/);assert.match(source,/CAPTION_LAYOUT_MISSING/);assert.match(source,/CAPTION_CENTER_INVALID/);assert.match(source,/CAPTION_ANGLE_INVALID/);assert.match(source,/CAPTION_AXIS_LOST/);assert.match(source,/CreatorMakeStandaloneTextRotationApplied/);assert.match(source,/angleError<=0\.25 and centerError<=1/);assert.match(source,/\[CreatorMake Caption\]/);
  assert.match(source,/mode=="FIT_GEOMETRY"/);assert.match(source,/CreatorMakeCalculatedFitTextSize/);assert.match(source,/CreatorMakeCaptionSafeWidth/);assert.match(source,/CreatorMakeGeometryCenterlineAngle/);assert.match(source,/Design\/Calculated\/Exported TextSize/);
  assert.match(source,/IMPORT CURRENT CREATORMAKE PROJECT/);assert.match(source,/\/project\/current\/manifest/);assert.match(source,/manifest\.kind=="preset-library"/);assert.match(source,/manifest\.kind~="project"/);assert.match(source,/PROJECT_MANIFEST/);assert.match(source,/PROJECT_SYNC_PROGRESS/);assert.match(source,/PROJECT_SYNC_RESULT/);assert.match(source,/projectObjects\[owner\]/);
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
  assert.match(source,/localAssetImport=starterGuiImport and not publishedAssets/);
  assert.match(source,/applyManifest\(manifest,starterGuiImport and "StarterGui" or "PlayerGuiPreview"\)/);
  assert.match(source,/CreatorMakeMultiPlayerReady/);
  assert.match(source,/STARTERGUI IMPORT READY/);
  assert.match(source,/localAssetImport=result\.localAssetImport/);
  assert.match(source,/multiPlayerReady=result\.multiPlayerReady/);
  assert.doesNotMatch(source,/STARTERGUI_ASSET_NOT_PUBLISHED/);
});
