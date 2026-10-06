import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { fitFramesToContents, reparentLayers, validateLayerReparent, wrapSelectionInFrame } from "../lib/editor/operations.ts";
import { resolveTextRotation } from "../lib/editor/visual-transform.ts";
import { createRobloxExport } from "../lib/roblox/exporter.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

const element=(type,id,parentId,x,y,zIndex)=>Object.assign(createElement(type),{id,name:id,parentId,x,y,zIndex,width:120,height:48,fill:"transparent",borderColor:"transparent",shadow:"none",textShadows:[]});
const fixture=()=>{const main=element("frame","MainFrame",null,100,80,10),top=element("frame","TopBar","MainFrame",120,100,9),title=element("text","Title","TopBar",140,112,8),content=element("frame","Content","MainFrame",120,190,7),scroll=element("scrolling-frame","Scroll","Content",140,210,6),card1=element("frame","Card1","Scroll",160,230,5),card2=element("frame","Card2","Scroll",160,294,4),card3=element("frame","Card3","Scroll",160,358,3);return{schemaVersion:9,id:"hierarchy",name:"Hierarchy",updatedAt:1,screen:{width:960,height:600},assets:[],selectedIds:["Card3"],elements:[main,top,title,content,scroll,card1,card2,card3]};};

test("drag reparent preserves world position and Studio hierarchy",()=>{
  const project=fixture(),card=project.elements.find((item)=>item.id==="Card3"),before={x:card.x,y:card.y,rotation:card.rotation,scaleX:card.scaleX,scaleY:card.scaleY};
  const result=reparentLayers(project,{draggedIds:["Card3"],targetId:"Content",position:"inside"});
  assert.equal(result.ok,true);assert.equal(card.parentId,"Content");assert.deepEqual({x:card.x,y:card.y,rotation:card.rotation,scaleX:card.scaleX,scaleY:card.scaleY},before);
  const exported=createRobloxExport(project,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE"},[]),node=exported.manifest.nodes.find((item)=>item.sourceId==="Card3");
  assert.equal(node.parentSourceId,"Content");assert.match(exported.hierarchy,/Content \[Frame\][\s\S]+Card3 \[Frame\]/);
});

test("multiple selected roots reparent together and preserve relative arrangement",()=>{
  const project=fixture(),one=project.elements.find((item)=>item.id==="Card1"),two=project.elements.find((item)=>item.id==="Card2"),delta=two.y-one.y;
  const result=reparentLayers(project,{draggedIds:["Card1","Card2"],targetId:"Content",position:"inside"});
  assert.equal(result.ok,true);assert.deepEqual(result.movedIds,["Card1","Card2"]);assert.equal(one.parentId,"Content");assert.equal(two.parentId,"Content");assert.equal(two.y-one.y,delta);assert.deepEqual(project.selectedIds,["Card1","Card2"]);
});

test("cycles, locked layers, and invalid text parents are rejected",()=>{
  const project=fixture();
  assert.equal(validateLayerReparent(project,{draggedIds:["Content"],targetId:"Card3",position:"inside"}).ok,false);
  project.elements.find((item)=>item.id==="Card3").locked=true;assert.match(validateLayerReparent(project,{draggedIds:["Card3"],targetId:"Content",position:"inside"}).reason,/Unlock/);
  project.elements.find((item)=>item.id==="Card3").locked=false;assert.match(validateLayerReparent(project,{draggedIds:["Card3"],targetId:"Title",position:"inside"}).reason,/cannot contain/);
});

test("optional keep-local-position mode is explicit and default remains preserve-visual",()=>{
  const project=fixture(),card=project.elements.find((item)=>item.id==="Card3"),oldParent=project.elements.find((item)=>item.id==="Scroll"),newParent=project.elements.find((item)=>item.id==="TopBar"),local={x:card.x-oldParent.x,y:card.y-oldParent.y};
  const result=reparentLayers(project,{draggedIds:["Card3"],targetId:"TopBar",position:"inside",keepLocalPosition:true});
  assert.equal(result.ok,true);assert.equal(card.x,newParent.x+local.x);assert.equal(card.y,newParent.y+local.y);
});

test("preserve-world reparenting also preserves effective world rotation",()=>{
  const project=fixture(),main=project.elements.find((item)=>item.id==="MainFrame"),content=project.elements.find((item)=>item.id==="Content"),scroll=project.elements.find((item)=>item.id==="Scroll"),top=project.elements.find((item)=>item.id==="TopBar"),card=project.elements.find((item)=>item.id==="Card3");
  main.rotation=3;content.rotation=-7;scroll.rotation=5;top.rotation=10;card.rotation=2;card.followObjectAngle=true;card.textOrientation="follow-shape";card.textRotation=.75;card.captionOffsetX=4;card.captionOffsetY=-2;card.captionInsets={top:1,right:2,bottom:3,left:4};card.textSizingMode="fit-geometry";card.fitMinTextSize=9;card.fitMaxTextSize=37;card.fitMinHorizontalPadding=13;card.fitMinVerticalPadding=7;card.sharedCaptionSize=true;card.sharedCaptionGroup="menu";card.geometry={...card.geometry,kind:"custom-path",pathData:"M 0 12 L 120 0 L 120 36 L 0 48 Z",nodes:[],closed:true};
  const beforeWorld=main.rotation+content.rotation+scroll.rotation+card.rotation;
  const beforeCaption=resolveTextRotation(card,project.elements);
  const result=reparentLayers(project,{draggedIds:[card.id],targetId:top.id,position:"inside"});
  const afterCaption=resolveTextRotation(card,project.elements);
  assert.equal(result.ok,true);assert.equal(card.parentId,top.id);assert.equal(main.rotation+top.rotation+card.rotation,beforeWorld);assert.equal(card.followObjectAngle,true);assert.equal(card.textOrientation,"follow-shape");assert.equal(card.textRotation,.75);assert.equal(card.captionOffsetX,4);assert.equal(card.captionOffsetY,-2);assert.deepEqual(card.captionInsets,{top:1,right:2,bottom:3,left:4});assert.equal(card.textSizingMode,"fit-geometry");assert.equal(card.fitMinTextSize,9);assert.equal(card.fitMaxTextSize,37);assert.equal(card.fitMinHorizontalPadding,13);assert.equal(card.fitMinVerticalPadding,7);assert.equal(card.sharedCaptionSize,true);assert.equal(card.sharedCaptionGroup,"menu");assert.ok(Math.abs(beforeCaption.finalTextWorldRotation-afterCaption.finalTextWorldRotation)<1e-9);assert.deepEqual(afterCaption.captionCenter,beforeCaption.captionCenter);
});

test("Wrap in Frame preserves world positions and Fit Contents applies explicit padding",()=>{
  const project=fixture(),one=project.elements.find((item)=>item.id==="Card1"),two=project.elements.find((item)=>item.id==="Card2"),before=[{x:one.x,y:one.y},{x:two.x,y:two.y}];project.selectedIds=[one.id,two.id];
  wrapSelectionInFrame(project,0);const frame=project.elements.find((item)=>item.id===project.selectedIds[0]);assert.equal(frame.type,"frame");assert.equal(frame.parentId,"Scroll");assert.deepEqual([{x:one.x,y:one.y},{x:two.x,y:two.y}],before);assert.equal(one.parentId,frame.id);assert.equal(two.parentId,frame.id);assert.deepEqual({x:frame.x,y:frame.y,width:frame.width,height:frame.height},{x:160,y:230,width:120,height:112});
  one.x=176;one.y=246;two.x=306;two.y=310;project.selectedIds=[frame.id];fitFramesToContents(project,16);assert.deepEqual({x:frame.x,y:frame.y,width:frame.width,height:frame.height},{x:160,y:230,width:282,height:144});assert.deepEqual([{x:one.x,y:one.y},{x:two.x,y:two.y}],[{x:176,y:246},{x:306,y:310}]);
});
