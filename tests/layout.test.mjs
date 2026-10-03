import test from "node:test";
import assert from "node:assert/strict";
import { applyAutoLayout } from "../lib/editor/layout.ts";
import { createElement } from "../lib/editor/project.ts";
import { applySharedPerspective, calculateSelectionResize, resizeElementWithConstraints } from "../lib/editor/transforms.ts";

test("horizontal auto layout responds to hug-content text changes",()=>{
  const row=createElement("frame");Object.assign(row,{id:"row",x:100,y:80,width:520,height:80,layoutMode:"horizontal",gap:12,layoutPadding:{top:16,right:16,bottom:16,left:16},crossAlign:"center"});
  const buy=createElement("button");Object.assign(buy,{id:"buy",parentId:row.id,text:"BUY",sizingX:"hug",sizingY:"fill"});
  const cancel=createElement("button");Object.assign(cancel,{id:"cancel",parentId:row.id,text:"CANCEL",sizingX:"hug",sizingY:"fill"});
  const project={elements:[row,buy,cancel]};applyAutoLayout(project);
  const before=buy.width;assert.equal(buy.x,116);assert.equal(cancel.x,buy.x+buy.width+12);assert.equal(buy.height,48);
  buy.text="PURCHASE ITEM";applyAutoLayout(project);
  assert.ok(buy.width>before);assert.equal(cancel.x,buy.x+buy.width+12);
});

test("grid auto layout creates deterministic three-column geometry",()=>{
  const grid=createElement("container");Object.assign(grid,{id:"grid",x:40,y:40,width:600,height:260,layoutMode:"grid",gridColumns:3,columnGap:12,rowGap:10,layoutPadding:{top:10,right:10,bottom:10,left:10}});
  const cards=Array.from({length:6},(_,index)=>{const card=createElement("container",index);Object.assign(card,{id:`card-${index}`,parentId:grid.id,width:100,height:90,sizingX:"fill"});return card;});
  const project={elements:[grid,...cards]};applyAutoLayout(project);
  assert.equal(cards[0].x,50);assert.equal(cards[3].x,50);assert.equal(cards[3].y,150);assert.ok(cards[0].width>180);
});

test("horizontal auto layout wraps into measured rows",()=>{
  const row=createElement("frame");Object.assign(row,{id:"wrap",x:0,y:0,width:250,height:140,layoutMode:"horizontal",layoutWrap:true,gap:10,rowGap:8,layoutPadding:{top:10,right:10,bottom:10,left:10}});
  const children=Array.from({length:3},(_,index)=>{const child=createElement("button",index);Object.assign(child,{id:`wrap-${index}`,parentId:row.id,width:100,height:40,sizingX:"fixed",sizingY:"fixed",textBoxMode:"fixed"});return child;});
  applyAutoLayout({elements:[row,...children]});
  assert.deepEqual(children.map((item)=>[item.x,item.y]),[[10,10],[120,10],[10,58]]);
});

test("frame resizing applies left-right and scale constraints recursively",()=>{
  const frame=createElement("frame");Object.assign(frame,{id:"frame",x:0,y:0,width:200,height:100});
  const child=createElement("container");Object.assign(child,{id:"child",parentId:frame.id,x:20,y:10,width:100,height:50,constraints:{horizontal:"left-right",vertical:"scale"}});
  const before={elements:[structuredClone(frame),structuredClone(child)]},draft={elements:[frame,child]};
  resizeElementWithConstraints(draft,before,"frame",{x:10,y:20,width:300,height:200});
  assert.deepEqual({x:child.x,y:child.y,width:child.width,height:child.height},{x:30,y:40,width:200,height:100});
});

test("shift and alt multi-resize preserve the common ratio from center",()=>{
  const bounds={left:0,top:0,right:200,bottom:100,width:200,height:100,cx:100,cy:50};
  const patches=calculateSelectionResize(bounds,[{id:"a",x:0,y:0,width:50,height:50},{id:"b",x:150,y:50,width:50,height:50}],"se",100,10,true,true);
  const nextBounds={left:Math.min(...patches.map((item)=>item.x)),top:Math.min(...patches.map((item)=>item.y)),right:Math.max(...patches.map((item)=>item.x+item.width)),bottom:Math.max(...patches.map((item)=>item.y+item.height))};
  assert.equal(nextBounds.right-nextBounds.left,300);assert.equal(nextBounds.bottom-nextBounds.top,150);assert.equal((nextBounds.left+nextBounds.right)/2,100);assert.equal((nextBounds.top+nextBounds.bottom)/2,50);
});

test("multi-selection perspective rotates object centers around a common origin",()=>{
  const left=createElement("container"),right=createElement("text");Object.assign(left,{id:"left",x:0,y:0,width:100,height:80});Object.assign(right,{id:"right",x:200,y:0,width:100,height:80});const project={elements:[left,right],selectedIds:[left.id,right.id]};
  assert.equal(applySharedPerspective(project,{rotateY:30,perspective:800}),true);assert.ok(left.translateZ>0);assert.ok(right.translateZ<0);assert.notEqual(left.x,0);assert.notEqual(right.x,200);
});
