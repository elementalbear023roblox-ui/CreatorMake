import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject } from "../lib/editor/project.ts";
import { resolveTextRotation } from "../lib/editor/visual-transform.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";
import { assertRenderedLayoutFidelity, createRobloxExport, validateTextRotationFidelity } from "../lib/roblox/exporter.ts";
import { planPixelAccurateAssets, renderElementSvg, visualHash } from "../lib/roblox/render-assets.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const fixture=()=>{
  const panel=createElement("frame");Object.assign(panel,{id:"panel",name:"StarPanel",x:180,y:120,width:600,height:360,shadow:"none",geometry:{...panel.geometry,kind:"star"}});
  const button=createElement("button");Object.assign(button,{id:"button",name:"PlayButton",parentId:"panel",x:240,y:390,width:220,height:60,text:"PLAY",fontFamily:"Roboto",autoFit:true,shadow:"none",textShadows:[],geometry:{...button.geometry,kind:"plaque"}});
  const nativeText=createElement("text");Object.assign(nativeText,{id:"native-text",name:"EditableTitle",parentId:"panel",x:240,y:160,width:320,height:54,text:"SHOP",fontFamily:"Roboto",fill:"transparent",borderColor:"transparent",shadow:"none",textShadows:[],clipContent:false,corners:{tl:0,tr:0,br:0,bl:0}});
  const rasterText=createElement("text");Object.assign(rasterText,{id:"raster-text",name:"EffectTitle",parentId:"panel",x:240,y:230,width:320,height:54,text:"LIMITED",fontFamily:"Inter",fill:"transparent",borderColor:"transparent",shadow:"none",textShadows:["0 2px 5px #000000"],clipContent:false,corners:{tl:0,tr:0,br:0,bl:0}});
  return{screen:{width:960,height:600},elements:[panel,button,nativeText,rasterText]};
};
const options={...DEFAULT_ROBLOX_EXPORT_OPTIONS,screenGuiName:"AdaptiveGui",visualMode:"ADAPTIVE"};
const logicalTopLeft=(node)=>{
  const position=node.properties.Position,size=node.properties.Size,anchor=node.properties.AnchorPoint;
  return{x:position.xOffset-size.xOffset*anchor.x,y:position.yOffset-size.yOffset*anchor.y};
};

test("adaptive classification keeps exact-native layers editable and rasterizes unsupported geometry",()=>{
  const project=fixture(),[panel,button,nativeText,rasterText]=project.elements;
  assert.equal(classifyRobloxElement(panel).classification,"HYBRID");
  assert.equal(classifyRobloxElement(button).classification,"HYBRID");
  assert.equal(classifyRobloxElement(button).rasterPart,"background");
  assert.equal(classifyRobloxElement(nativeText).classification,"NATIVE");
  assert.equal(classifyRobloxElement(rasterText).classification,"NATIVE");
  const assets=planPixelAccurateAssets(project,options);
  assert.deepEqual(assets.map((asset)=>asset.sourceId),["panel","button::background"]);
  assert.equal(assets.find((asset)=>asset.sourceId==="button::background").visualPart,"background");
  const changed=structuredClone(button);changed.text="START";
  assert.equal(visualHash(button,"background"),visualHash(changed,"background"),"editable button copy must not invalidate its background PNG");
  assert.notEqual(visualHash(button,"full"),visualHash(changed,"full"));
});

test("adaptive manifest keeps original local coordinates under one global scale",()=>{
  const project=fixture(),assets=planPixelAccurateAssets(project,options).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${5000+index}`})),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(result.manifest.visualMode,"ADAPTIVE");assert.equal(result.manifest.sizingMode,"OFFSET");assert.equal(result.manifest.viewportScaleMode,"FIT");
  assert.equal(byId.get("panel").className,"Frame");assert.equal(byId.get("panel").properties.BackgroundTransparency,1);assert.equal(byId.get("panel").attributes.CreatorMakeExportClassification,"HYBRID");
  assert.equal(byId.get("panel::visual").className,"ImageLabel");assert.equal(byId.get("panel::visual").parentSourceId,"panel");assert.equal(byId.get("panel::visual").attributes.CreatorMakeSourceId,"panel");
  assert.equal(byId.get("button").className,"ImageButton");assert.equal(byId.get("button").properties.Active,true);assert.equal(byId.get("button").properties.AutoButtonColor,false);
  const caption=resolveTextRotation(project.elements.find((element)=>element.id==="button"),project.elements),captionSize={kind:"UDim2",xScale:0,xOffset:Number(caption.captionVisualSize.width.toFixed(4)),yScale:0,yOffset:Number(caption.captionVisualSize.height.toFixed(4))};assert.equal(byId.get("button::background").name,"_Background");assert.equal(byId.get("button::text").className,"TextLabel");assert.equal(byId.get("button::text").properties.Text,"PLAY");assert.equal(byId.get("button::text").properties.TextSize,15);assert.equal(byId.get("button::text").properties.TextScaled,false);assert.deepEqual(byId.get("button::text").properties.AnchorPoint,{kind:"Vector2",x:.5,y:.5});assert.deepEqual(byId.get("button::text").properties.Position,{kind:"UDim2",xScale:0,xOffset:110,yScale:0,yOffset:30});assert.deepEqual(byId.get("button::text").properties.Size,captionSize);assert.equal(byId.get("button::text").attributes.CreatorMakeCaptionUsesShapeSafeRegion,true);assert.equal(byId.get("button::text").decorators.length,0);
  assert.equal(byId.get("native-text").className,"TextLabel");assert.equal(byId.get("native-text").parentSourceId,"panel");
  assert.equal(byId.get("raster-text").className,"TextLabel");assert.equal(byId.get("raster-text").properties.Text,"LIMITED");assert.equal(byId.get("raster-text::pixel-text"),undefined);
  assert.deepEqual(logicalTopLeft(byId.get("button")),{x:60,y:270});
  assert.deepEqual(byId.get("button").properties.Size,{kind:"UDim2",xScale:0,xOffset:220,yScale:0,yOffset:60});
  assert.equal(result.manifest.nodes.flatMap((node)=>node.decorators).filter((decorator)=>decorator.className==="UIScale").length,1);
  for(const id of ["panel","button"]){assert.equal(byId.get(id).decorators.filter((item)=>item.className==="UIAspectRatioConstraint").length,1);}
  assert.equal(result.manifest.imageManifest.length,2);const record=result.manifest.imageManifest.find((item)=>item.sourceId==="button::background");
  assert.equal(record.sourceElementId,"button");assert.equal(record.classification,"HYBRID");assert.equal(record.visualPart,"background");assert.equal(record.parentId,"panel");assert.equal(record.intendedRobloxClass,"ImageButton");assert.equal(record.interactionEnabled,true);assert.match(record.assetFilename,/playbutton-background-v[0-9a-f]+\.png/);
  assert.deepEqual(record.sourceDimensions,{width:220,height:60});assert.ok(record.croppedPixelDimensions.width>0);assert.ok(Math.abs(record.aspectRatio-220/60)<1e-7);
  assert.match(result.hierarchy,/StarPanel \[Frame\][\s\S]+_Visual \[ImageLabel\][\s\S]+PlayButton \[ImageButton\][\s\S]+_Background \[ImageLabel\][\s\S]+Text \[TextLabel\]/);
});

test("smart text export keeps exact transparent text native and pixelates visible/custom treatments",()=>{
  const exact=createElement("text");Object.assign(exact,{id:"exact",fontFamily:"Roboto",fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none",textShadows:[],clipContent:false,text:"COINS"});
  const plaque=structuredClone(exact);Object.assign(plaque,{id:"plaque",fill:"#ff0055"});
  const custom=structuredClone(exact);Object.assign(custom,{id:"custom",fontFamily:"Inter"});
  assert.equal(classifyRobloxElement(exact).classification,"NATIVE");
  assert.equal(classifyRobloxElement(exact).intendedRobloxClass,"TextLabel");
  assert.equal(classifyRobloxElement(plaque).classification,"HYBRID");
  assert.equal(classifyRobloxElement(custom).classification,"NATIVE");
  custom.dynamicText=true;
  assert.equal(classifyRobloxElement(custom).classification,"NATIVE","dynamic text must remain editable even when its font needs an explicit compatibility substitution");
  const project={screen:{width:960,height:600},elements:[exact],assets:[]},result=createRobloxExport(project,options,[]),node=result.manifest.nodes.find((item)=>item.sourceId==="exact");
  assert.equal(node.className,"TextLabel");assert.equal(node.properties.BackgroundTransparency,1);assert.equal(node.attributes.CreatorMakeFontExact,true);
});

test("image objects require a real Roblox asset ID before adaptive native export",()=>{
  const image=createElement("image");Object.assign(image,{id:"image",shadow:"none"});
  assert.equal(classifyRobloxElement(image).classification,"RASTERIZED");
  image.roblox.imageAssetId="rbxassetid://123456";
  assert.equal(classifyRobloxElement(image).classification,"NATIVE");
  assert.equal(classifyRobloxElement(image).intendedRobloxClass,"ImageLabel");
  const button=createElement("image-button");button.roblox.imageAssetId="rbxassetid://987654";
  assert.equal(classifyRobloxElement(button).intendedRobloxClass,"ImageButton");
});

test("AUTO keeps simple frames native and renders complex frames through the premium pipeline",()=>{
  const simple=createElement("frame");Object.assign(simple,{id:"simple",shadow:"none"});
  const complex=createElement("frame");Object.assign(complex,{id:"complex",shadow:"0 8px 24px rgba(0,0,0,.45)"});
  const project=createProject("Policy");project.elements=[simple,complex];
  assert.equal(classifyRobloxElement(simple).classification,"NATIVE");
  assert.equal(classifyRobloxElement(complex).classification,"HYBRID");
  assert.deepEqual(planPixelAccurateAssets(project,options).map((asset)=>asset.sourceId),["complex"]);
});

test("ORIGINAL forces native objects and reports visual limitations instead of rendering PNGs",()=>{
  const frame=createElement("frame");Object.assign(frame,{id:"original",robloxExportMode:"ORIGINAL",shadow:"0 8px 24px rgba(0,0,0,.45)",geometry:{...frame.geometry,kind:"trapezoid",skew:10}});
  const project=createProject("Original");project.elements=[frame];
  const decision=classifyRobloxElement(frame);
  assert.equal(decision.classification,"NATIVE");assert.equal(decision.requestedMode,"ORIGINAL");assert.ok(decision.nativeLimitations.length>0);
  assert.equal(planPixelAccurateAssets(project,options).length,0);
  const result=createRobloxExport(project,options,[]),node=result.manifest.nodes.find((item)=>item.sourceId==="original");
  assert.equal(node.className,"Frame");assert.equal(result.manifest.nodes.find((item)=>item.sourceId==="original::visual"),undefined);
});

test("explicit Button IMAGE flattens caption and surface into one premium clickable ImageButton",()=>{
  const frame=createElement("frame");Object.assign(frame,{id:"image-frame",robloxExportMode:"IMAGE",shadow:"none"});
  const button=createElement("button");Object.assign(button,{id:"image-button",name:"CarColor",robloxExportMode:"IMAGE",text:"Car Color",width:400,height:70,shadow:"none",textShadows:[],borderWidth:0,geometry:{...button.geometry,kind:"trapezoid",skew:10}});
  const project=createProject("Image");project.elements=[frame,button];
  const finalOptions={...options,renderScale:8,effectsQuality:"ULTRA",imageResampling:"BEST_QUALITY"},plans=planPixelAccurateAssets(project,finalOptions);assert.deepEqual(plans.map((asset)=>asset.sourceId),["image-frame","image-button"]);
  const decision=classifyRobloxElement(button);assert.equal(decision.rasterPart,"full");assert.equal(decision.nativeText,false);assert.equal(decision.resolvedLabel,"Flattened Premium ImageButton");
  const buttonPlan=plans.find((asset)=>asset.sourceId==="image-button");assert.equal(buttonPlan.visualPart,"full");assert.equal(buttonPlan.layoutWidth,400);assert.equal(buttonPlan.layoutHeight,70);assert.ok(buttonPlan.internalRenderPixelWidth>=2400);assert.ok(buttonPlan.internalRenderPixelHeight>=420);
  const mapped=plans.map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${7000+index}`})),result=createRobloxExport(project,finalOptions,mapped),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get("image-frame").className,"Frame");assert.equal(byId.get("image-frame::visual").className,"ImageLabel");
  const exportedButton=byId.get("image-button");assert.equal(exportedButton.className,"ImageButton");assert.equal(exportedButton.properties.Active,true);assert.equal(exportedButton.properties.Selectable,true);assert.equal(exportedButton.properties.Image,"rbxassetid://7001");assert.deepEqual(exportedButton.properties.Size,{kind:"UDim2",xScale:0,xOffset:400,yScale:0,yOffset:70});assert.equal(exportedButton.attributes.CreatorMakeCaptionBaked,true);assert.equal(exportedButton.attributes.CreatorMakeLogicalHitbox,true);assert.equal(byId.get("image-button::text"),undefined);
  assert.equal(exportedButton.attributes.CreatorMakeVisualArchitecture,"FLATTENED_IMAGE_BUTTON");assert.equal(byId.get("image-button::visual"),undefined);assert.match(renderElementSvg(button,1,"full"),/Car Color/);assert.equal(result.layoutFidelityIssues.length,0);
  const captionDiagnostic=result.textRotationDiagnostics.find((row)=>row.sourceId===button.id);assert.equal(captionDiagnostic.textBaked,true);assert.equal(captionDiagnostic.hasNativeText,false);assert.equal(captionDiagnostic.captionValidation,"NOT_APPLICABLE");assert.equal(captionDiagnostic.validationResult,"PASS");assert.equal(result.textFidelityIssues.length,0);
  const changed=structuredClone(button);changed.text="Vehicle Color";assert.notEqual(visualHash(button,"full"),visualHash(changed,"full"),"baked caption changes must invalidate the full visual");
  const auto=structuredClone(button);auto.robloxExportMode="AUTO";assert.equal(classifyRobloxElement(auto).nativeText,true,"AUTO must keep the existing native-caption architecture");
});

test("dynamic Button IMAGE reports that runtime caption changes need another export strategy",()=>{
  const button=createElement("button");Object.assign(button,{robloxExportMode:"IMAGE",dynamicText:true});const decision=classifyRobloxElement(button);
  assert.equal(decision.nativeText,false);assert.match(decision.reasons.join(" "),/runtime text changes require Auto or Original/i);
});

test("flattened Image button overflow generates a non-interactive visual child while preserving the logical hitbox",()=>{
  const button=createElement("button");Object.assign(button,{id:"overflow-image-button",name:"CarColor",robloxExportMode:"IMAGE",text:"Car Color",x:80,y:60,width:400,height:70,shadow:"0 0 20px 0 rgba(0,0,0,.65)"});
  const project=createProject("Overflow Image Button");project.elements=[button];const assets=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node])),root=byId.get(button.id),visual=byId.get(`${button.id}::visual`);
  assert.equal(root.className,"ImageButton");assert.equal(root.attributes.CreatorMakeVisualArchitecture,"WRAPPER_WITH_VISUAL");assert.equal(root.attributes.CreatorMakeNeedsVisualWrapper,true);assert.equal(root.properties.ImageTransparency,1);assert.deepEqual(root.properties.Size,{kind:"UDim2",xScale:0,xOffset:400,yScale:0,yOffset:70});
  assert.equal(visual.className,"ImageLabel");assert.equal(visual.properties.Active,false);assert.equal(visual.properties.Selectable,false);assert.equal(visual.attributes.CreatorMakeCaptionBaked,true);assert.equal(result.layoutFidelityIssues.length,0);assert.equal(result.layoutDiagnostics[0].validation,"PASS");
});

test("legacy background-only button metadata is re-resolved instead of crashing the project",()=>{
  const button=createElement("button");Object.assign(button,{id:"legacy-garage-button",name:"Accessories",robloxExportMode:"AUTO",text:"Accessories",width:400,height:70,shadow:"0 0 18px 0 rgba(0,0,0,.5)"});
  const project=createProject("Legacy Garage");project.elements=[button];const legacyAssets=planPixelAccurateAssets(project,options);assert.equal(legacyAssets[0].visualPart,"background");button.robloxExportMode="IMAGE";
  const result=createRobloxExport(project,options,legacyAssets),root=result.manifest.nodes.find((node)=>node.sourceId===button.id),visual=result.manifest.nodes.find((node)=>node.sourceId===`${button.id}::visual`);
  assert.deepEqual(result.assets.map((asset)=>asset.visualPart),["full"]);assert.equal(root.attributes.CreatorMakeTextBaked,true);assert.equal(visual.attributes.CreatorMakeRole,"Visual");assert.equal(result.layoutFidelityIssues.length,0);
});

test("Garage Image buttons resolve and validate per object without a global fidelity failure",()=>{
  const names=["CarColor","Accessories","RimColor","LicensePlate","PlateDesign","ExitGarage"],project=createProject("Garage");project.elements=names.map((name,index)=>{const button=createElement("button",index);Object.assign(button,{id:name,name,robloxExportMode:"IMAGE",text:name==="ExitGarage"?"EXIT GARAGE":name.replace(/([a-z])([A-Z])/g,"$1 $2"),x:80,y:50+index*84,width:name==="ExitGarage"?360:400,height:70,shadow:index%2?"0 0 16px 0 rgba(0,0,0,.5)":"none"});return button;});
  const result=createRobloxExport(project,options,planPixelAccurateAssets(project,options));assert.equal(result.layoutFidelityIssues.length,0);assert.deepEqual(result.layoutDiagnostics.map((row)=>[row.name,row.exportAs,row.validation]),names.map((name)=>[name,"IMAGE","PASS"]));
  assert.ok(result.manifest.nodes.filter((node)=>node.attributes?.CreatorMakeRole==="FlattenedImageButton").every((node)=>node.className==="ImageButton"&&node.attributes.CreatorMakeCaptionBaked===true));
  assert.deepEqual(result.textRotationDiagnostics.map((row)=>[row.name,row.exportAs,row.resolvedArchitecture,row.textBaked,row.hasNativeText,row.captionValidation,row.validationResult]),names.map((name)=>[name,"IMAGE",result.manifest.nodes.find((node)=>node.sourceId===name).attributes.CreatorMakeVisualArchitecture,true,false,"NOT_APPLICABLE","PASS"]));
  assert.deepEqual(result.textFidelitySummary,{exact:0,withinTolerance:0,warnings:0,errors:0,notApplicable:6});
});

test("native caption differences use tolerance levels and never block project rendering",()=>{
  const button=createElement("button");Object.assign(button,{id:"tolerance-button",name:"CarColor",robloxExportMode:"AUTO",text:"Car Color",width:400,height:70,fontFamily:"Roboto",shadow:"none",textShadows:[],geometry:{...button.geometry,kind:"trapezoid",skew:10},textOrientation:"follow-shape",followObjectAngle:true});
  const project=createProject("Caption Tolerance");project.elements=[button];const exported=createRobloxExport(project,options,planPixelAccurateAssets(project,options)),nodes=structuredClone(exported.manifest.nodes),text=nodes.find((node)=>node.sourceId===`${button.id}::text`);
  assert.equal(text.className,"TextLabel");text.properties.Rotation+=.75;
  const tolerated=validateTextRotationFidelity(project,nodes),row=tolerated.diagnostics[0];assert.equal(row.hasNativeText,true);assert.equal(row.textBaked,false);assert.equal(row.captionValidation,"NATIVE");assert.equal(row.angleError,.75);assert.equal(row.centerError,0);assert.equal(row.validationResult,"PASS_WITH_TOLERANCE");assert.deepEqual(tolerated.summary,{exact:0,withinTolerance:1,warnings:0,errors:0,notApplicable:0});assert.deepEqual(tolerated.problems,[]);
  text.properties.Rotation+=29.25;text.properties.Position.xOffset+=80;
  const major=validateTextRotationFidelity(project,nodes),majorRow=major.diagnostics[0];assert.equal(majorRow.validationResult,"ERROR");assert.ok(majorRow.angleError>=30);assert.equal(majorRow.centerError,80);assert.equal(major.summary.errors,1);assert.doesNotThrow(()=>createRobloxExport(project,options,planPixelAccurateAssets(project,options)));
});

test("architecture-aware assertion gives an actionable error only when a required overflow visual is missing",()=>{
  const button=createElement("button");Object.assign(button,{id:"broken-wrapper",name:"CarColor",robloxExportMode:"IMAGE",width:400,height:70,shadow:"0 0 20px 0 rgba(0,0,0,.5)"});const project=createProject("Broken Wrapper");project.elements=[button];const assets=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,assets),withoutVisual=result.manifest.nodes.filter((node)=>node.sourceId!==`${button.id}::visual`);
  assert.throws(()=>assertRenderedLayoutFidelity(project,withoutVisual,assets),/CarColor: resolved architecture requires a visual wrapper[\s\S]*ImageButton logical root -> _Visual ImageLabel/);
});

test("IMAGE rasterizes standalone text without losing the editable source value",()=>{
  const label=createElement("text");Object.assign(label,{id:"image-text",robloxExportMode:"IMAGE",text:"EXIT GARAGE",fill:"transparent",borderColor:"transparent",shadow:"none"});
  const project=createProject("Text Image");project.elements=[label];
  const [asset]=planPixelAccurateAssets(project,options);assert.equal(asset.sourceId,"image-text::pixel-text");assert.equal(asset.sourceElementId,"image-text");assert.equal(asset.visualPart,"full");
  const result=createRobloxExport(project,options,[{...asset,status:"mapped",robloxAssetId:"rbxassetid://8000"}]),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get("image-text::visual").className,"ImageLabel");assert.equal(byId.get("image-text::text"),undefined);assert.equal(project.elements[0].text,"EXIT GARAGE");
});

test("project defaults apply until an object explicitly overrides them",()=>{
  const inherited=createElement("frame");Object.assign(inherited,{id:"inherited",shadow:"none"});
  const overridden=createElement("frame");Object.assign(overridden,{id:"overridden",robloxExportMode:"ORIGINAL",shadow:"none"});
  const project=createProject("Defaults");project.exportOptions.defaultRobloxExportMode="IMAGE";project.elements=[inherited,overridden];
  assert.equal(classifyRobloxElement(inherited,project.exportOptions.defaultRobloxExportMode).requestedMode,"IMAGE");
  assert.equal(classifyRobloxElement(overridden,project.exportOptions.defaultRobloxExportMode).requestedMode,"ORIGINAL");
  assert.deepEqual(planPixelAccurateAssets(project,options).map((asset)=>asset.sourceId),["inherited"]);
});

test("IMAGE preserves a native scrolling container around its premium visual",()=>{
  const scroll=createElement("scrolling-frame");Object.assign(scroll,{id:"scroll",robloxExportMode:"IMAGE",shadow:"none"});
  const project=createProject("Scroll");project.elements=[scroll];
  const [asset]=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,[{...asset,status:"mapped",robloxAssetId:"rbxassetid://9000"}]),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get("scroll").className,"Frame");assert.equal(byId.get("scroll::scroll-area").className,"ScrollingFrame");assert.equal(byId.get("scroll::scroll-area").properties.Active,true);assert.ok(byId.get("scroll::visual"));
});
