import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject } from "../lib/editor/project.ts";
import { alignSelection, distributeSelection, repeatGridSelection, stackSelection } from "../lib/editor/operations.ts";
import { GEOMETRY_EPSILON, gapBetween, logicalBounds, normalizeDesignValue } from "../lib/editor/geometry-math.ts";
import { computeMoveSnap, DEFAULT_SNAP_SETTINGS, rectFromElement } from "../lib/editor/snapping.ts";

const item=(id,x,y,width=20,height=20)=>Object.assign(createElement("rectangle"),{id,x,y,width,height});
const projectWith=(items)=>{const project=createProject("Precision");project.elements=items;project.selectedIds=items.map((entry)=>entry.id);return project;};

test("canonical logical bounds and alignments preserve fractional design-space values",()=>{
  const items=[item("a",10.25,4.5,20.5,12.25),item("b",80.75,40.25,11.5,7.75)],project=projectWith(items);
  assert.deepEqual(logicalBounds(items),{left:10.25,top:4.5,right:92.25,bottom:48,width:82,height:43.5,cx:51.25,cy:26.25});
  alignSelection(project,"hcenter","canvas");
  assert.equal(items[0].x,469.75);assert.equal(items[1].x,474.25);
});

for(const gap of [16,16.5,0,-10])test(`exact distribution preserves ${gap}px gaps`,()=>{
  const items=[item("a",0,0,10.25),item("b",70,0,20.5),item("c",170,0,15.75)],project=projectWith(items);
  distributeSelection(project,"horizontal",gap);
  assert.equal(gapBetween(items[0],items[1]),gap);assert.equal(gapBetween(items[1],items[2]),gap);
});

test("stacking around the key object is deterministic for negative and fractional spacing",()=>{
  const items=[item("a",0,10,10.5),item("b",40,20,20.25),item("key",100,30,30.75)],project=projectWith(items);project.selectedIds=["a","b","key"];
  stackSelection(project,"horizontal",-3.5,"center");
  assert.equal(gapBetween(items[0],items[1]),-3.5);assert.equal(gapBetween(items[1],items[2]),-3.5);assert.equal(items[2].x,100);
});

test("repeat grid derives every coordinate from its source without cumulative drift",()=>{
  const source=item("source",0.1,0.2,10.2,8.4),project=projectWith([source]);
  repeatGridSelection(project,{columns:50,rows:20,gapX:0.3,gapY:0.4});
  assert.equal(project.elements.length,1000);
  const last=project.elements.at(-1);assert.equal(last.x,normalizeDesignValue(0.1+49*10.5));assert.equal(last.y,normalizeDesignValue(0.2+19*8.8));
});

test("smart snapping is zoom invariant in design space and remains bounded for 1000 objects",()=>{
  const moving=item("moving",94,100,40,40),target=item("target",100,100,40,40),far=Array.from({length:1000},(_,index)=>item(`far-${index}`,2000+index*30,2000)),screen={left:0,top:0,right:960,bottom:600,width:960,height:600,cx:480,cy:300},run=(zoom,dx=0)=>computeMoveSnap({movingBounds:rectFromElement(moving),dx,dy:0,elements:[target,moving,...far],movingIds:new Set([moving.id]),parentId:null,parentBounds:null,screen,zoom,mode:"smart",gridSize:8,pixelSnap:"off",settings:DEFAULT_SNAP_SETTINGS});
  const start=performance.now(),atOne=run(1),atTwo=run(2,3),elapsed=performance.now()-start;
  assert.ok(Math.abs(moving.x+atOne.dx-100)<=GEOMETRY_EPSILON);assert.ok(Math.abs(moving.x+atTwo.dx-100)<=GEOMETRY_EPSILON);assert.ok(elapsed<150,`1000-object snap audit took ${elapsed}ms`);
});
