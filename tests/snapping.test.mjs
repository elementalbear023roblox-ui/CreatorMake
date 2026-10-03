import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "../lib/editor/project.ts";
import { computeMoveSnap, DEFAULT_SNAP_SETTINGS, rectFromElement } from "../lib/editor/snapping.ts";

const item=(id,x,y,width=40,height=40,parentId=null)=>Object.assign(createElement("rectangle"),{id,x,y,width,height,parentId,name:id,hidden:false});
const screen={left:0,top:0,right:960,bottom:600,width:960,height:600,cx:480,cy:300};
const run=(moving,elements,patch={})=>computeMoveSnap({movingBounds:rectFromElement(moving),dx:0,dy:0,elements,movingIds:new Set([moving.id]),parentId:moving.parentId,parentBounds:null,screen,zoom:1,mode:"smart",gridSize:8,pixelSnap:"off",settings:DEFAULT_SNAP_SETTINGS,...patch});

test("Smart movement combines left alignment with a repeated 16px vertical gap",()=>{
  const a=item("a",100,100,50,40),b=item("b",100,156,50,40),moving=item("moving",95,202,50,40);
  const result=run(moving,[a,b,moving],{dx:4.2,dy:8});
  assert.equal(moving.x+result.dx,100);
  assert.equal(moving.y+result.dy,212);
  assert.ok(result.measurements.some((measurement)=>measurement.value===16));
});

test("Free mode preserves fractional movement without correction",()=>{
  const target=item("target",100,100),moving=item("moving",94,94);
  const result=run(moving,[target,moving],{dx:1.25,dy:2.5,mode:"free"});
  assert.equal(result.dx,1.25);assert.equal(result.dy,2.5);assert.deepEqual(result.guides,[]);
});

test("inserting between objects snaps to two equal 20px gaps",()=>{
  const a=item("a",100,100),b=item("b",100,220),moving=item("moving",100,155);
  const result=run(moving,[a,b,moving]);
  assert.equal(moving.y+result.dy,160);
  assert.ok(result.measurements.some((measurement)=>measurement.value===20));
});

test("horizontal repeated spacing snaps to 24px",()=>{
  const a=item("a",100,100),b=item("b",164,100),moving=item("moving",224,100);
  const result=run(moving,[a,b,moving]);
  assert.equal(moving.x+result.dx,228);
  assert.ok(result.measurements.some((measurement)=>measurement.value===24));
});

test("parent equal padding is recognized",()=>{
  const parent=item("parent",50,50,300,200),reference=item("reference",70,90),moving=item("moving",67,150,40,40,"parent");
  reference.parentId="parent";
  const result=run(moving,[parent,reference,moving],{parentId:"parent",parentBounds:rectFromElement(parent)});
  assert.equal(moving.x+result.dx,70);
});

test("threshold is zoom independent and latch releases with hysteresis",()=>{
  const target=item("target",100,100),moving=item("moving",96,100);
  const zoomed=run(moving,[target,moving],{zoom:2});assert.equal(zoomed.dx,0);
  const snapped=run(moving,[target,moving]);assert.equal(moving.x+snapped.dx,100);
  const held=run(moving,[target,moving],{dx:12,latch:snapped.latch});assert.equal(moving.x+held.dx,100);
});

test("candidate search remains bounded with 500 objects and locked objects remain targets",()=>{
  const moving=item("moving",96,100),locked=item("locked",100,100);locked.locked=true;
  const elements=[locked,moving,...Array.from({length:500},(_,index)=>item("far"+index,2000+index*50,2000))];
  const start=performance.now(),result=run(moving,elements),elapsed=performance.now()-start;
  assert.equal(moving.x+result.dx,100);assert.ok(elapsed<100,`bounded search took ${elapsed}ms`);
});
