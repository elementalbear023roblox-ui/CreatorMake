import test from "node:test";
import assert from "node:assert/strict";
import { CORNER_TYPES, GEOMETRY_OPTIONS, canConvertToPath, cornerRectanglePath, geometryKindForElement, geometryNodesFromElement, geometryPresentation, pathNodesToSvg, usesVectorSurface } from "../lib/editor/geometry.ts";
import { createElement, createProject, createVectorElement, normalizeProject } from "../lib/editor/project.ts";
import { checkRobloxCompatibility } from "../lib/roblox/exporter.ts";

test("every advanced primitive produces editable finite vector geometry",()=>{
  for(const {kind,label} of GEOMETRY_OPTIONS){
    const element=createVectorElement(kind);
    const presentation=geometryPresentation(element);
    assert.equal(element.type,"vector",label);
    assert.equal(element.geometry.kind,kind,label);
    assert.ok(presentation.path.startsWith("M"),`${label} should create an SVG path`);
    assert.equal(/NaN|Infinity|undefined/.test(presentation.path),false,`${label} path should be finite`);
  }
});

test("advanced corner modes produce distinct saved paths",()=>{
  const element=createVectorElement("rounded-rectangle");
  const paths=new Set();
  for(const type of CORNER_TYPES){
    element.cornerTypes={tl:type,tr:"square",br:"square",bl:"square"};
    element.corners={tl:28,tr:0,br:0,bl:0};
    paths.add(cornerRectanglePath(element));
  }
  assert.equal(paths.size,CORNER_TYPES.length);
});

test("legacy projects gain geometry and corner metadata without losing objects",()=>{
  const project=createProject("Geometry migration"),legacy=structuredClone(project);
  delete legacy.elements[0].geometry;
  delete legacy.elements[0].cornerTypes;
  const normalized=normalizeProject(legacy);
  assert.equal(normalized.elements.length,project.elements.length);
  assert.equal(normalized.elements[0].geometry.kind,"rectangle");
  assert.equal(normalized.elements[0].cornerTypes.tl,"round");
});

test("surface geometry is authoritative for text, buttons, frames, and containers",()=>{
  for(const type of ["text","button","frame","container"]){
    const element=createElement(type);
    element.geometry={...element.geometry,kind:"plaque",inset:16};
    assert.equal(geometryKindForElement(element),"plaque",type);
    assert.equal(usesVectorSurface(element),true,type);
    assert.equal(canConvertToPath(element),true,type);
    assert.match(geometryPresentation(element).path,/^M /,type);
  }
});

test("unsupported geometry fails loudly instead of substituting a rectangle",()=>{
  const element=createVectorElement("plaque");element.geometry.kind="imaginary-fallback-shape";
  assert.throws(()=>geometryPresentation(element),/Unsupported geometry renderer: imaginary-fallback-shape/);
});

test("Roblox compatibility reports custom vectors and advanced corners truthfully",()=>{
  const vector=createVectorElement("cut-corner-rectangle");
  vector.cornerTypes.tl="chamfer";
  const issues=checkRobloxCompatibility([vector]);
  assert.ok(issues.some((issue)=>issue.feature==="Custom vector geometry"&&issue.level==="unsupported"));
  assert.ok(issues.some((issue)=>issue.feature==="Advanced corners"&&issue.level==="unsupported"));
});

test("path nodes render straight and cubic segments with optional closure",()=>{
  const nodes=[
    {id:"a",x:10,y:20,type:"symmetric",inX:-5,inY:0,outX:12,outY:-8},
    {id:"b",x:80,y:70,type:"smooth",inX:-10,inY:6,outX:0,outY:0},
    {id:"c",x:20,y:90,type:"corner",inX:0,inY:0,outX:0,outY:0},
  ];
  const open=pathNodesToSvg(nodes,false,200,100),closed=pathNodesToSvg(nodes,true,200,100);
  assert.match(open,/^M 20 20 C /);
  assert.match(open,/L 40 90$/);
  assert.equal(open.endsWith("Z"),false);
  assert.equal(closed.endsWith("Z"),true);
});

test("parametric geometry converts into editable path nodes",()=>{
  const circle=geometryNodesFromElement(createVectorElement("circle"));
  const star=geometryNodesFromElement(createVectorElement("star"));
  assert.equal(circle.length,4);
  assert.ok(circle.every((node)=>node.type==="symmetric"));
  assert.equal(star.length,10);
});

test("custom path nodes and closure survive project normalization",()=>{
  const project=createProject("Path persistence"),path=createVectorElement("custom-path");
  path.geometry.nodes=[{id:"node_saved",x:25,y:75,type:"corner",inX:0,inY:0,outX:0,outY:0},{id:"node_saved_2",x:80,y:20,type:"smooth",inX:-8,inY:2,outX:10,outY:-3}];
  path.geometry.closed=false;project.elements.push(path);
  const normalized=normalizeProject(structuredClone(project)),saved=normalized.elements.find((item)=>item.id===path.id);
  assert.equal(saved.geometry.nodes.length,2);
  assert.equal(saved.geometry.nodes[1].type,"smooth");
  assert.equal(saved.geometry.closed,false);
});
