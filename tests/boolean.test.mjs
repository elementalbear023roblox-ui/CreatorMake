import test from "node:test";
import assert from "node:assert/strict";
import { applyBooleanBuild, buildBooleanSelection, elementToBooleanGeometry, flattenBoolean, rebuildBooleanElement, releaseBoolean } from "../lib/editor/boolean.ts";
import { createProject, createVectorElement } from "../lib/editor/project.ts";

function overlappingRectangles(){
  const project=createProject("Boolean test"),a=createVectorElement("rectangle"),b=createVectorElement("rectangle",1);
  Object.assign(a,{id:"rect_a",name:"A",x:0,y:0,width:100,height:100,parentId:null});
  Object.assign(b,{id:"rect_b",name:"B",x:50,y:0,width:100,height:100,parentId:null});
  project.elements=[a,b];project.selectedIds=[a.id,b.id];return{project,a,b};
}

test("real Boolean operations create deterministic vector silhouettes",()=>{
  const expected={union:{x:0,width:150},subtract:{x:0,width:50},intersect:{x:50,width:50},exclude:{x:0,width:150}};
  for(const operation of ["union","subtract","intersect","exclude"]){
    const {project}=overlappingRectangles(),build=buildBooleanSelection(project,operation),result=build.elements[0];
    assert.equal(result.type,"vector");
    assert.equal(result.geometry.kind,"custom-path");
    assert.equal(Math.round(result.x),expected[operation].x);
    assert.equal(Math.round(result.width),expected[operation].width);
    assert.equal(result.booleanOperation,operation);
    assert.equal(result.booleanOperands.length,2);
    assert.ok(elementToBooleanGeometry(result).length>0);
  }
});

test("divide returns separately editable non-overlapping regions",()=>{
  const {project}=overlappingRectangles(),build=buildBooleanSelection(project,"divide");
  assert.equal(build.elements.length,3);
  assert.ok(build.elements.every((item)=>item.booleanOperation===null&&item.geometry.kind==="custom-path"));
  assert.deepEqual(build.elements.map((item)=>Math.round(item.width)),[50,50,50]);
  applyBooleanBuild(project,build);
  assert.equal(project.elements.length,3);
  assert.equal(project.selectedIds.length,3);
});

test("Boolean groups can change operation, flatten, release, save, and undo through one project mutation",()=>{
  const {project}=overlappingRectangles(),build=buildBooleanSelection(project,"union");
  applyBooleanBuild(project,build);
  const group=project.elements[0],rebuilt=rebuildBooleanElement(group,"exclude");
  assert.equal(rebuilt.id,group.id);
  assert.equal(rebuilt.booleanOperation,"exclude");
  project.elements[0]=rebuilt;
  const releaseCopy=structuredClone(project);releaseBoolean(releaseCopy,rebuilt.id);
  assert.deepEqual(new Set(releaseCopy.elements.map((item)=>item.id)),new Set(["rect_a","rect_b"]));
  flattenBoolean(project,rebuilt.id);
  assert.equal(project.elements[0].booleanOperation,null);
  assert.equal(project.elements[0].booleanOperands.length,0);
});

test("curves are flattened into finite polygon geometry before clipping",()=>{
  const circle=createVectorElement("circle");circle.x=10;circle.y=15;circle.rotation=17;
  const geometry=elementToBooleanGeometry(circle),points=geometry.flat(2);
  assert.ok(points.length>=30);
  assert.equal(points.some((point)=>point.some((value)=>!Number.isFinite(value))),false);
});
