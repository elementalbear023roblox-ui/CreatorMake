import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { createElement, createVectorElement } from "../lib/editor/project.ts";
import { calculateAlphaCropBounds } from "../lib/editor/canvas-rasterizer.ts";
import { geometryPresentation } from "../lib/editor/geometry.ts";
import { assertRenderedLayoutFidelity, calculateCreatorMakeFitScale, createRobloxExport } from "../lib/roblox/exporter.ts";
import { ensurePixelExportFont, layoutHash, planPixelAccurateAssets, renderElementSvg, visualBoundsForElement, visualHash } from "../lib/roblox/render-assets.ts";
import { diffRobloxManifests } from "../lib/roblox/sync.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const projectFixture=()=>{
  const frame=createElement("frame");Object.assign(frame,{id:"frame-1",name:"MainFrame",x:125,y:118,width:768,height:572,gradientType:"freeform",shadow:"none"});
  const title=createElement("text");Object.assign(title,{id:"text-1",name:"Title",parentId:frame.id,x:25,y:78,width:500,height:110,text:"Frame Name",fontFamily:"Inter",fontSize:54,fill:"#33205f",gradientType:"freeform",shadow:"none",textShadows:[],geometry:{...title.geometry,kind:"trapezoid",skew:14}});
  const button=createElement("button");Object.assign(button,{id:"button-1",name:"Close",parentId:frame.id,x:845,y:88,width:120,height:110,text:"×",fontSize:64,gradientType:"linear",shadow:"none",textShadows:[]});
  const shape=createVectorElement("plaque");Object.assign(shape,{id:"shape-1",name:"Accent",parentId:frame.id,x:180,y:620,width:180,height:54,shadow:"none"});
  return{screen:{width:1920,height:1080},elements:[frame,title,button,shape]};
};
const options={...DEFAULT_ROBLOX_EXPORT_OPTIONS,screenGuiName:"PixelGui",visualMode:"PIXEL_ACCURATE"};

test("visual and layout hashes isolate movement while baked transforms invalidate the raster",()=>{
  const button=createElement("button"),moved=structuredClone(button),rotated=structuredClone(button),styled=structuredClone(button);
  Object.assign(moved,{x:button.x+40,y:button.y+20,anchorX:.5,parentId:"new-parent",zIndex:99});
  rotated.rotation=12;
  styled.gradientType="radial";
  assert.equal(visualHash(moved),visualHash(button));
  assert.notEqual(layoutHash(moved),layoutHash(button));
  assert.notEqual(visualHash(rotated),visualHash(button));
  assert.notEqual(visualHash(styled),visualHash(button));
});

test("split text transforms stay on the shared Roblox container",()=>{
  const project=projectFixture(),title=project.elements.find((element)=>element.id==="text-1"),before=visualHash(title);title.rotation=-8;
  const assets=planPixelAccurateAssets(project,options).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${9000+index}`})),result=createRobloxExport(project,options,assets),titleNode=result.manifest.nodes.find((node)=>node.sourceId==="text-1");
  assert.notEqual(visualHash(title),before);assert.equal(titleNode.properties.Rotation,-8);assert.equal(titleNode.className,"Frame");assert.ok(result.manifest.nodes.find((node)=>node.sourceId==="text-1::background"));assert.ok(result.manifest.nodes.find((node)=>node.sourceId==="text-1::text"));
});

test("Pixel Accurate export maps frames, text, buttons, and shapes to rendered Roblox images",()=>{
  const project=projectFixture(),assets=planPixelAccurateAssets(project,options).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${1000+index}`}));
  const result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  const viewport=byId.get("__creatormake_viewport"),frame=byId.get("frame-1"),visual=byId.get("frame-1::visual"),title=byId.get("text-1"),titleBackground=byId.get("text-1::background"),titleText=byId.get("text-1::text"),button=byId.get("button-1"),buttonBackground=byId.get("button-1::background"),buttonText=byId.get("button-1::text"),shape=byId.get("shape-1"),shapeVisual=byId.get("shape-1::visual");
  assert.equal(result.manifest.version,2);assert.equal(result.manifest.visualMode,"PIXEL_ACCURATE");
  assert.deepEqual(result.manifest.referenceResolution,{width:1920,height:1080});assert.equal(result.manifest.viewportScaleMode,"FIT");assert.equal(result.manifest.sizingMode,"OFFSET");
  assert.equal(viewport.className,"Frame");assert.deepEqual(viewport.properties.Size,{kind:"UDim2",xScale:0,xOffset:1920,yScale:0,yOffset:1080});assert.deepEqual(viewport.properties.Position,{kind:"UDim2",xScale:.5,xOffset:0,yScale:.5,yOffset:0});assert.equal(viewport.decorators.filter((item)=>item.className==="UIScale").length,1);
  assert.equal(frame.className,"Frame");assert.equal(frame.parentSourceId,"__creatormake_viewport");assert.equal(frame.properties.BackgroundTransparency,1);assert.equal(frame.decorators[0].className,"UIAspectRatioConstraint");
  assert.equal(visual.className,"ImageLabel");assert.equal(visual.name,"_Visual");assert.equal(visual.parentSourceId,"frame-1");assert.equal(visual.properties.Active,false);assert.equal(visual.attributes.CreatorMakeSourceId,"frame-1");
  assert.equal(title.className,"Frame");assert.deepEqual(title.properties.Size,{kind:"UDim2",xScale:0,xOffset:500,yScale:0,yOffset:110});assert.deepEqual(title.properties.Position,{kind:"UDim2",xScale:0,xOffset:-100,yScale:0,yOffset:-40});assert.equal(titleBackground.className,"ImageLabel");assert.equal(titleBackground.properties.Image,"rbxassetid://1001");assert.equal(titleText.className,"TextLabel");assert.equal(titleText.properties.Text,"Frame Name");
  assert.equal(title.attributes.CreatorMakeGeometryType,"trapezoid");assert.equal(title.attributes.CreatorMakeRenderStrategy,"Canonical Vector");
  assert.equal(button.className,"ImageButton");assert.equal(button.properties.Active,true);assert.equal(button.properties.AutoButtonColor,false);assert.ok(!("Text" in button.properties));assert.deepEqual(button.properties.Size,{kind:"UDim2",xScale:0,xOffset:120,yScale:0,yOffset:110});assert.deepEqual(button.properties.Position,{kind:"UDim2",xScale:0,xOffset:720,yScale:0,yOffset:-30});assert.equal(buttonBackground.className,"ImageLabel");assert.equal(buttonText.className,"TextLabel");assert.equal(buttonText.properties.Active,false);
  assert.equal(title.properties.Size.xOffset/frame.properties.Size.xOffset,500/768);assert.equal(button.properties.Size.xOffset/frame.properties.Size.xOffset,120/768);assert.equal(title.properties.Size.yOffset/frame.properties.Size.yOffset,110/572);assert.equal(button.properties.Size.yOffset/frame.properties.Size.yOffset,110/572);
  assert.deepEqual(result.layoutDiagnostics.filter((row)=>["frame-1","text-1","button-1"].includes(row.sourceId)).map((row)=>({id:row.sourceId,creator:row.creatorMake,roblox:row.robloxDesign})),[
    {id:"frame-1",creator:{parent:null,x:125,y:118,width:768,height:572},roblox:{parent:null,x:125,y:118,width:768,height:572}},
    {id:"text-1",creator:{parent:"frame-1",x:-100,y:-40,width:500,height:110},roblox:{parent:"frame-1",x:-100,y:-40,width:500,height:110}},
    {id:"button-1",creator:{parent:"frame-1",x:720,y:-30,width:120,height:110},roblox:{parent:"frame-1",x:720,y:-30,width:120,height:110}},
  ]);
  for(const asset of assets){assert.equal(asset.layoutWidth,project.elements.find((element)=>element.id===(asset.sourceElementId??asset.sourceId)).width);assert.equal(asset.layoutHeight,project.elements.find((element)=>element.id===(asset.sourceElementId??asset.sourceId)).height);assert.ok(asset.renderPixelWidth<=1024);assert.ok(asset.renderPixelHeight<=1024);}
  assert.equal(shape.className,"Frame");assert.equal(shapeVisual.className,"ImageLabel");assert.match(result.hierarchy,/MainFrame \[Frame\][\s\S]+_Visual \[ImageLabel\]/);assert.match(result.lua,/CreatorMakeRole/);assert.match(result.lua,/bindCreatorMakeCamera/);assert.match(result.lua,/creatorMakeViewportConnection:Disconnect/);
});

test("Pixel Accurate export keeps a 20-card inventory semantic and scrollable",()=>{
  const scrolling=createElement("scrolling-frame");
  Object.assign(scrolling,{id:"inventory-scroll",name:"Inventory Scroll",x:120,y:80,width:600,height:360,fill:"#171b2b",shadow:"none",borderWidth:0,clipContent:true,layoutMode:"grid",gridColumns:4,rowGap:12,columnGap:12,layoutPadding:{top:16,right:16,bottom:16,left:16},canvasSizeX:600,canvasSizeY:640,automaticCanvasSize:"None",canvasPositionX:0,canvasPositionY:0,scrollingDirection:"Y",scrollBarThickness:8,scrollBarImageColor:"#7457ff",scrollBarImageTransparency:0,elasticBehavior:"WhenScrollable",scrollingEnabled:true,verticalScrollBarPosition:"Right",scrollBarInset:"ScrollBar",roblox:{className:"ScrollingFrame",layout:"grid"}});
  const cards=Array.from({length:20},(_,index)=>{const card=createElement("button",index+1),column=index%4,row=Math.floor(index/4);Object.assign(card,{id:`inventory-card-${index+1}`,name:`Inventory Card ${index+1}`,parentId:scrolling.id,x:scrolling.x+16+column*139,y:scrolling.y+16+row*112,width:127,height:100,text:`ITEM ${index+1}`,shadow:"none",borderWidth:0});return card;});
  const project={id:"scrolling-project",screen:{width:960,height:600},elements:[scrolling,...cards]},assets=planPixelAccurateAssets(project,options).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${12000+index}`})),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  const wrapper=byId.get(scrolling.id),scrollArea=byId.get(`${scrolling.id}::scroll-area`),visual=byId.get(`${scrolling.id}::visual`);
  assert.equal(wrapper.className,"Frame");
  assert.equal(visual.className,"ImageLabel");
  assert.equal(scrollArea.className,"ScrollingFrame");
  assert.equal(scrollArea.parentSourceId,scrolling.id);
  assert.deepEqual(scrollArea.properties.CanvasSize,{kind:"UDim2",xScale:0,xOffset:600,yScale:0,yOffset:640});
  assert.deepEqual(scrollArea.properties.CanvasPosition,{kind:"Vector2",x:0,y:0});
  assert.equal(scrollArea.properties.ScrollingDirection.item,"Y");
  assert.equal(scrollArea.properties.ScrollingEnabled,true);
  assert.equal(scrollArea.properties.ScrollBarThickness,8);
  assert.equal(scrollArea.properties.ClipsDescendants,true);
  const padding=scrollArea.decorators.find((item)=>item.className==="UIPadding"),grid=scrollArea.decorators.find((item)=>item.className==="UIGridLayout");
  assert.ok(padding,"semantic scrolling content must export UIPadding");
  assert.ok(grid,"semantic scrolling content must export UIGridLayout");
  assert.deepEqual(grid.properties.CellSize,{kind:"UDim2",xScale:0,xOffset:127,yScale:0,yOffset:100});
  assert.equal(grid.properties.FillDirectionMaxCells,4);
  const exportedCards=cards.map((card)=>byId.get(card.id));
  assert.equal(exportedCards.length,20);
  assert.ok(exportedCards.every((card)=>card.className==="ImageButton"&&card.parentSourceId===scrollArea.sourceId));
  assert.equal(result.manifest.imageManifest.filter((entry)=>entry.parentId===scrolling.id).length,20,"cards stay independently rendered and are never flattened into the scrolling surface");
  assert.match(result.hierarchy,/Inventory Scroll \[Frame\][\s\S]+_ScrollArea \[ScrollingFrame\][\s\S]+UIPadding \[UIPadding\][\s\S]+UIGridLayout \[UIGridLayout\]/);
});

test("Native and Adaptive modes preserve ScrollingFrame semantics",()=>{
  const scrolling=createElement("scrolling-frame"),card=createElement("button");Object.assign(scrolling,{id:"mode-scroll",name:"Mode Scroll",x:40,y:30,width:420,height:260,canvasSizeX:420,canvasSizeY:520,layoutMode:"vertical",layoutPadding:{top:14,right:14,bottom:14,left:14}});Object.assign(card,{id:"mode-card",parentId:scrolling.id,x:54,y:44,width:180,height:70,shadow:"none"});const project={id:"mode-project",screen:{width:960,height:600},elements:[scrolling,card]};
  const native=createRobloxExport(project,{...options,visualMode:"NATIVE"}),nativeScroll=native.manifest.nodes.find((node)=>node.sourceId===scrolling.id);
  assert.equal(nativeScroll.className,"ScrollingFrame");assert.ok(nativeScroll.decorators.some((item)=>item.className==="UIPadding"));assert.ok(nativeScroll.decorators.some((item)=>item.className==="UIListLayout"));
  const adaptiveAssets=planPixelAccurateAssets(project,{...options,visualMode:"ADAPTIVE"}).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${13000+index}`})),adaptive=createRobloxExport(project,{...options,visualMode:"ADAPTIVE"},adaptiveAssets),byId=new Map(adaptive.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get(`${scrolling.id}::scroll-area`).className,"ScrollingFrame");assert.equal(byId.get(card.id).parentSourceId,`${scrolling.id}::scroll-area`);
});

test("layout-only changes update Roblox position without changing rendered image",()=>{
  const before=projectFixture(),assets=planPixelAccurateAssets(before,options).map((asset,index)=>({...asset,status:"mapped",robloxAssetId:`rbxassetid://${2000+index}`})),after=structuredClone(before);
  after.elements.find((element)=>element.id==="button-1").x+=25;
  const nextAssets=planPixelAccurateAssets(after,options,Object.fromEntries(assets.map((asset)=>[`${asset.sourceId}:${asset.visualHash}`,asset.robloxAssetId])),assets).map((asset)=>({...asset,status:"mapped"}));
  const first=createRobloxExport(before,options,assets).manifest,second=createRobloxExport(after,options,nextAssets).manifest,operations=diffRobloxManifests(first,second),buttonUpdate=operations.find((operation)=>operation.type==="update"&&operation.sourceId==="button-1");
  assert.equal(first.nodes.find((node)=>node.sourceId==="button-1::background").properties.Image,second.nodes.find((node)=>node.sourceId==="button-1::background").properties.Image);
  assert.ok(buttonUpdate);assert.ok(buttonUpdate.properties.includes("Position"));assert.ok(!buttonUpdate.properties.includes("Image"));
  assert.equal(assets.find((asset)=>asset.sourceId==="button-1::background").visualHash,nextAssets.find((asset)=>asset.sourceId==="button-1::background").visualHash);
});

test("per-object SVG rendering excludes children and preserves the text object's complete owned plaque",()=>{
  const project=projectFixture(),frame=project.elements[0],title=project.elements.find((element)=>element.id==="text-1");
  const frameSvg=renderElementSvg(frame,2),titleSvg=renderElementSvg(title,2),geometry=geometryPresentation(title);
  assert.match(frameSvg,/image\/svg\+xml|<svg/);assert.ok(!frameSvg.includes("Frame Name"));
  assert.ok(titleSvg.includes("Frame Name"));assert.ok(titleSvg.includes("background:"));assert.ok(titleSvg.includes(title.fill));assert.match(titleSvg,/clip-path/);
  assert.equal(geometry.path,"M 90 0 L 410 0 L 500 110 L 0 110 Z");
  assert.ok(titleSvg.includes(`d="${geometry.path}"`));
  assert.equal(geometry.path.includes("Q "),false,"the text plaque must not fall back to rounded-rectangle corner curves");
});

test("canonical editor and Pixel Accurate plaque masks are pixel-identical",async()=>{
  const title=projectFixture().elements.find((element)=>element.id==="text-1"),canonical=geometryPresentation(title),exportSvg=renderElementSvg(title,2),match=exportSvg.match(/<clipPath[^>]*><path d="([^"]+)"[^>]*fill-rule="([^"]+)"/);
  assert.ok(match,"Pixel Accurate SVG must expose its canonical clip path");
  const renderMask=async(path,fillRule)=>sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="500" height="110" viewBox="0 0 500 110"><path d="${path}" fill="#fff" fill-rule="${fillRule}"/></svg>`)).ensureAlpha().raw().toBuffer();
  const editorMask=await renderMask(canonical.path,canonical.fillRule),exportMask=await renderMask(match[1],match[2]);let differentPixels=0,totalError=0,maxError=0;
  for(let index=3;index<editorMask.length;index+=4){const difference=Math.abs(editorMask[index]-exportMask[index]);if(difference)differentPixels++;totalError+=difference;maxError=Math.max(maxError,difference);}
  assert.deepEqual({differentPixels,meanChannelError:totalError/(editorMask.length/4),maxChannelError:maxError},{differentPixels:0,meanChannelError:0,maxChannelError:0});
  assert.equal(editorMask[3],0,"the angled plaque corner must remain transparent");
  assert.equal(editorMask[(55*500+250)*4+3],255,"the plaque center must remain opaque");
});

test("render quality changes sampling only, never normalized geometry",()=>{
  const title=projectFixture().elements.find((element)=>element.id==="text-1"),path=geometryPresentation(title).path;
  for(const quality of [1,2,4]){const svg=renderElementSvg(title,quality);assert.ok(svg.includes(`d="${path}"`));assert.ok(svg.includes('viewBox="0 0 500 110"'));}
});

test("visual bounds include baked scale, skew, and edge effects without changing layout bounds",()=>{
  const plaque=projectFixture().elements.find((element)=>element.id==="text-1");Object.assign(plaque,{scaleX:1.2,scaleY:.8,skewX:12,textStrokeWidth:4,shadow:"6px 8px 10px 2px rgba(0,0,0,.5)"});
  const bounds=visualBoundsForElement(plaque),asset=planPixelAccurateAssets({screen:{width:1920,height:1080},elements:[plaque]},options)[0];
  assert.ok(bounds.x<0);assert.ok(bounds.y<0);assert.ok(bounds.width>plaque.width);assert.ok(bounds.height>plaque.height*.8);
  assert.deepEqual(asset.layoutBounds,{x:0,y:0,width:500,height:110});assert.deepEqual(asset.visualBounds,bounds);
});

test("one FIT scale preserves the entire composition at common Studio viewports",()=>{
  const main={width:768,height:572},title={width:500,height:110},close={width:120,height:110};
  for(const [width,height] of [[1920,1080],[1600,900],[1366,768],[1280,720],[2560,1440]]){
    const scale=calculateCreatorMakeFitScale(1920,1080,width,height);
    if(width===1920&&height===1080)assert.equal(scale,1);
    assert.ok(Math.abs((title.width*scale)/(main.width*scale)-title.width/main.width)<1e-12);
    assert.ok(Math.abs((title.height*scale)/(main.height*scale)-title.height/main.height)<1e-12);
    assert.ok(Math.abs((close.width*scale)/(main.width*scale)-close.width/main.width)<1e-12);
    assert.ok(Math.abs((close.height*scale)/(main.height*scale)-close.height/main.height)<1e-12);
  }
});

test("regression A: negative custom path expansion changes only the inner visual",()=>{
  const path=createVectorElement("custom-path");Object.assign(path,{id:"overflow-path",name:"Overflow Path",x:300,y:140,width:200,height:100,borderWidth:0,shadow:"none",geometry:{...path.geometry,kind:"custom-path",pathData:"M -20 0 L 100 0 L 100 100 L -20 100 Z",nodes:[],closed:true}});
  const project={screen:{width:960,height:600},elements:[path]},assets=planPixelAccurateAssets(project,options),asset=assets[0],result=createRobloxExport(project,options,assets),container=result.manifest.nodes.find((node)=>node.sourceId===path.id),visual=result.manifest.nodes.find((node)=>node.sourceId===`${path.id}::visual`);
  assert.deepEqual(container.properties.Position,{kind:"UDim2",xScale:0,xOffset:300,yScale:0,yOffset:140});
  assert.deepEqual(container.properties.Size,{kind:"UDim2",xScale:0,xOffset:200,yScale:0,yOffset:100});
  assert.deepEqual(asset.visualBounds,{x:-40,y:0,width:240,height:100});assert.equal(visual.properties.Position.xOffset,-40);assert.equal(visual.properties.Size.xOffset,240);
});

test("regression B: 2x quality changes raster pixels but never container dimensions",()=>{
  const shape=createElement("rectangle");Object.assign(shape,{id:"quality-box",x:80,y:90,width:400,height:100,borderWidth:0,shadow:"none",rotation:0,scaleX:1,scaleY:1});
  const project={screen:{width:960,height:600},elements:[shape]},assets=planPixelAccurateAssets(project,{...options,renderScale:2}),node=createRobloxExport(project,{...options,renderScale:2},assets).manifest.nodes.find((item)=>item.sourceId===shape.id);
  assert.equal(assets[0].renderPixelWidth,800);assert.equal(assets[0].renderPixelHeight,200);assert.equal(node.properties.Size.xOffset,400);assert.equal(node.properties.Size.yOffset,100);
});

test("regression C: unavailable runtime fonts block while nearest registered variants remain exportable",async()=>{
  const text=createElement("text");Object.assign(text,{fontId:"orbitron",fontFamily:"Orbitron",fontWeight:400,fontStyle:"normal",text:"Frame Name"});
  const base={loadDescriptor:async()=>1,hasLoadedFace:()=>true,rasterStyle:async()=>"@font-face{font-family:'Orbitron'}"};
  await assert.rejects(()=>ensurePixelExportFont(text,{...base,load:async()=>"failed"}),/FONT_RENDER_BLOCKED: Font failed to load: Orbitron/);
  await assert.rejects(()=>ensurePixelExportFont(text,{...base,load:async()=>"loaded",hasLoadedFace:()=>false}),/FONT_RENDER_BLOCKED: Font fallback detected: Orbitron/);
  const order=[];const ready=await ensurePixelExportFont(text,{load:async()=>{order.push("load");return"loaded";},loadDescriptor:async()=>{order.push("descriptor");return 1;},hasLoadedFace:()=>{order.push("verify");return true;},rasterStyle:async()=>{order.push("embed");return"@font-face{font-family:'Orbitron'}";}});
  assert.deepEqual(order,["load","descriptor","verify","embed"]);assert.equal(ready.embedded,true);
  const nearest=createElement("text");Object.assign(nearest,{fontId:"fredoka",fontFamily:"Fredoka",fontWeight:700,fontStyle:"italic",text:"SHOP"});
  const variants=[];const resolved=await ensurePixelExportFont(nearest,{load:async(_font,weight,style)=>{variants.push([weight,style]);return"loaded";},loadDescriptor:async()=>1,hasLoadedFace:()=>true,rasterStyle:async()=>"@font-face{font-family:'Fredoka'}"});
  assert.deepEqual(variants,[[400,"normal"]]);assert.equal(resolved.requestedWeight,700);assert.equal(resolved.requestedStyle,"italic");assert.equal(resolved.loadedWeight,400);assert.equal(resolved.loadedStyle,"normal");
});

test("regression D: plaque silhouette stays canonical while its layout box stays authoritative",()=>{
  const plaque=createElement("text");Object.assign(plaque,{id:"plaque-regression",x:20,y:-30,width:510,height:110,fill:"#6d28d9",shadow:"none",textShadows:[],geometry:{...plaque.geometry,kind:"plaque",inset:18}});
  const project={screen:{width:960,height:600},elements:[plaque]},assets=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,assets),node=result.manifest.nodes.find((item)=>item.sourceId===plaque.id),path=geometryPresentation(plaque).path;
  assert.deepEqual(node.properties.Position,{kind:"UDim2",xScale:0,xOffset:20,yScale:0,yOffset:-30});assert.deepEqual(node.properties.Size,{kind:"UDim2",xScale:0,xOffset:510,yScale:0,yOffset:110});
  assert.equal(node.decorators[0].properties.AspectRatio,Number((510/110).toFixed(6)));assert.equal(path,"M 91.8 0 L 418.2 0 L 510 55 L 418.2 110 L 91.8 110 L 0 55 Z");
});

test("regression E: a 20px shadow expands only the visual surface",()=>{
  const frame=createElement("frame");Object.assign(frame,{id:"shadow-frame",x:120,y:75,width:300,height:100,borderWidth:0,shadow:"0 0 20px 0 rgba(0,0,0,.5)"});
  const project={screen:{width:960,height:600},elements:[frame]},assets=planPixelAccurateAssets(project,options),asset=assets[0],result=createRobloxExport(project,options,assets),container=result.manifest.nodes.find((node)=>node.sourceId===frame.id),visual=result.manifest.nodes.find((node)=>node.sourceId===`${frame.id}::visual`);
  assert.deepEqual(container.properties.Size,{kind:"UDim2",xScale:0,xOffset:300,yScale:0,yOffset:100});assert.deepEqual(asset.visualBounds,{x:-20,y:-20,width:340,height:140});assert.equal(visual.properties.Position.xOffset,-20);assert.equal(visual.properties.Position.yOffset,-20);assert.equal(visual.properties.Size.xOffset,340);assert.equal(visual.properties.Size.yOffset,140);
});

test("regression F: exact slanted-title overflow changes only the inner visual rectangle",()=>{
  const title=createElement("text");Object.assign(title,{id:"slanted-title",name:"Title Plaque",x:85,y:58,width:500,height:100,fill:"#6d28d9",shadow:"none",textShadows:[]});
  const project={screen:{width:960,height:600},elements:[title]},planned=planPixelAccurateAssets(project,{...options,renderScale:2})[0],visualBounds={x:-70,y:-12,width:588,height:120},asset={...planned,visualBounds,bounds:visualBounds,width:1176,height:240,renderPixelWidth:1176,renderPixelHeight:240,scale:2,status:"needs-publish"},result=createRobloxExport(project,{...options,renderScale:2},[asset]),container=result.manifest.nodes.find((node)=>node.sourceId===title.id),visual=result.manifest.nodes.find((node)=>node.sourceId===`${title.id}::background`);
  assert.equal(container.className,"Frame");assert.deepEqual(container.properties.Position,{kind:"UDim2",xScale:0,xOffset:85,yScale:0,yOffset:58});assert.deepEqual(container.properties.Size,{kind:"UDim2",xScale:0,xOffset:500,yScale:0,yOffset:100});assert.equal(container.properties.ClipsDescendants,false);
  assert.deepEqual(visual.properties.Position,{kind:"UDim2",xScale:0,xOffset:-70,yScale:0,yOffset:-12});assert.deepEqual(visual.properties.Size,{kind:"UDim2",xScale:0,xOffset:588,yScale:0,yOffset:120});assert.equal(visual.properties.ScaleType.item,"Stretch");assert.equal(container.decorators[0].properties.AspectRatio,5);
  assert.equal(asset.renderPixelWidth,1176);assert.equal(asset.renderPixelHeight,240);
});

test("regression G: explicit descendant clipping never clips the owner's expanded visual",()=>{
  const parent=createElement("container"),child=createElement("text");Object.assign(parent,{id:"clip-parent",x:100,y:80,width:300,height:100,clipContent:true,shadow:"0 0 20px 0 rgba(0,0,0,.5)"});Object.assign(child,{id:"clip-child",parentId:parent.id,x:120,y:90,width:120,height:40,shadow:"none",textShadows:[]});
  const project={screen:{width:960,height:600},elements:[parent,child]},assets=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,assets),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node])),container=byId.get(parent.id),visual=byId.get(`${parent.id}::visual`),clip=byId.get(`${parent.id}::content`),childNode=byId.get(child.id);
  assert.equal(container.properties.ClipsDescendants,false);assert.equal(visual.parentSourceId,parent.id);assert.equal(visual.properties.Position.xOffset,-20);assert.equal(visual.properties.Position.yOffset,-20);
  assert.equal(clip.className,"Frame");assert.equal(clip.properties.ClipsDescendants,true);assert.equal(clip.parentSourceId,parent.id);assert.equal(childNode.parentSourceId,clip.sourceId);assert.deepEqual(childNode.properties.Position,{kind:"UDim2",xScale:0,xOffset:20,yScale:0,yOffset:10});
});

test("regression H: alpha bounds retain transparent safety pixels on every raster edge",()=>{
  const width=20,height=12,data=new Uint8ClampedArray(width*height*4);for(let y=3;y<=8;y++)for(let x=4;x<=14;x++)data[(y*width+x)*4+3]=255;
  const bounds=calculateAlphaCropBounds(width,height,data,2,3);
  assert.deepEqual(bounds.visible,{x:4,y:3,width:11,height:6});assert.deepEqual(bounds.crop,{x:0,y:0,width:20,height:12});assert.deepEqual(bounds.touchesCropEdge,{left:false,right:false,top:false,bottom:false});assert.equal(bounds.passed,true);
  const edgeData=new Uint8ClampedArray(width*height*4);edgeData[3]=255;const edge=calculateAlphaCropBounds(width,height,edgeData,2,3);assert.equal(edge.passed,false);assert.equal(edge.touchesSourceEdge.left,true);assert.equal(edge.touchesSourceEdge.top,true);
});

test("development assertion rejects any raster or visual bounds substituted into layout",()=>{
  const project=projectFixture(),assets=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,assets),nodes=structuredClone(result.manifest.nodes),title=nodes.find((node)=>node.sourceId==="text-1");
  title.properties.Size.xOffset=assets.find((asset)=>asset.sourceElementId==="text-1").renderPixelWidth;
  assert.throws(()=>assertRenderedLayoutFidelity(project,nodes,assets),/ROBLOX_LAYOUT_FIDELITY_FAILURE:[\s\S]*Title: Roblox width/);
});

test("hidden parents fall back to viewport coordinates without subtracting hidden bounds",()=>{
  const parent=createElement("frame"),child=createElement("text");Object.assign(parent,{id:"hidden-parent",x:200,y:100,width:400,height:300,hidden:true});Object.assign(child,{id:"visible-child",parentId:parent.id,x:260,y:140,width:180,height:50,shadow:"none",textShadows:[]});
  const project={screen:{width:960,height:600},elements:[parent,child]},assets=planPixelAccurateAssets(project,options),result=createRobloxExport(project,options,assets),node=result.manifest.nodes.find((item)=>item.sourceId===child.id);
  assert.equal(node.parentSourceId,"__creatormake_viewport");assert.deepEqual(node.properties.Position,{kind:"UDim2",xScale:0,xOffset:260,yScale:0,yOffset:140});
});

test("pixel layout containers with no owned pixels stay in the hierarchy without a fake image",()=>{
  const group=createElement("container"),child=createElement("button");Object.assign(group,{id:"layout-group",x:100,y:80,width:500,height:300,fill:"transparent",borderColor:"transparent",borderWidth:0,shadow:"none"});Object.assign(child,{id:"visible-button",parentId:group.id,x:140,y:120,width:160,height:48,shadow:"none",textShadows:[]});
  const project={screen:{width:960,height:600},elements:[group,child]},childAsset=planPixelAccurateAssets(project,options).find((asset)=>asset.sourceElementId===child.id),result=createRobloxExport(project,options,[childAsset]),byId=new Map(result.manifest.nodes.map((node)=>[node.sourceId,node]));
  assert.equal(byId.get(group.id).className,"Frame");assert.equal(byId.get(group.id).properties.ClipsDescendants,false);assert.equal(byId.get(`${group.id}::visual`),undefined);assert.equal(byId.get(`${group.id}::content`).properties.ClipsDescendants,true);assert.equal(byId.get(child.id).parentSourceId,`${group.id}::content`);assert.deepEqual(byId.get(child.id).properties.Position,{kind:"UDim2",xScale:0,xOffset:40,yScale:0,yOffset:40});
});
