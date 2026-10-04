import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { reparentLayers, validateLayerReparent } from "../lib/editor/operations.ts";
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
