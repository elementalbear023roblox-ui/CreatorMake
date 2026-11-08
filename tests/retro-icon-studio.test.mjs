import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRetroIconElement, RETRO_ICON_CAMERA_PRESETS, RETRO_ICON_GEOMETRY_STANDARDS, RETRO_ICON_LIBRARY, RETRO_ICON_MATERIAL_PRESETS, RETRO_ICON_REQUIRED_23, retroGearProfile, validateRetroIconLibrary } from "../lib/editor/retro-icons.ts";
import { createProject, normalizeProject } from "../lib/editor/project.ts";
import { normalizeThreeDSettings, threeDGeometryKey, tightThreeDRenderBounds } from "../lib/editor/three-d.ts";
import { classifyRobloxElement } from "../lib/roblox/classification.ts";
import { applyColorKeyPixels, colorKeyAlpha } from "../lib/editor/color-key.ts";
import * as THREE from "three";
import { buildExtremeRetroIcon, EXTREME_ICON_MINIMUM_MESHES, EXTREME_RETRO_ICON_KINDS } from "../lib/editor/extreme-retro-icons.ts";

test("the premium retro CGI collection contains all 23 requested models plus compatible legacy icons",()=>{
  assert.equal(RETRO_ICON_LIBRARY.length,27);
  assert.equal(RETRO_ICON_REQUIRED_23.length,23);
  assert.ok(RETRO_ICON_REQUIRED_23.every((kind)=>RETRO_ICON_LIBRARY.some((item)=>item.kind===kind)));
  assert.equal(new Set(RETRO_ICON_LIBRARY.map((item)=>item.silhouette)).size,RETRO_ICON_LIBRARY.length);
  assert.ok(RETRO_ICON_MATERIAL_PRESETS.length>=8);
  assert.deepEqual(RETRO_ICON_CAMERA_PRESETS.slice(0,6).map((item)=>item.id),["front","rear","left","right","top","three-quarter"]);
  assert.deepEqual(validateRetroIconLibrary(),[]);
});

test("mathematical icon standards enforce dice, wheel, preview, and export invariants",()=>{
  assert.ok(RETRO_ICON_GEOMETRY_STANDARDS.diceOpposites.every(([a,b])=>a+b===7));
  assert.equal(RETRO_ICON_GEOMETRY_STANDARDS.prizeWheelSegments*RETRO_ICON_GEOMETRY_STANDARDS.prizeWheelDegrees,360);
  assert.deepEqual(RETRO_ICON_GEOMETRY_STANDARDS.smallPreviewSizes,[32,48,64,128]);
  assert.deepEqual(RETRO_ICON_GEOMETRY_STANDARDS.exportSizes,[64,128,256,512,1024,2048,4096,8192]);
  const dice=createRetroIconElement({kind:"dice",style:"classic-cgi"}),inverse=createRetroIconElement({kind:"inverted-dice",style:"classic-cgi"});
  assert.deepEqual([dice.threeD.rotationX,dice.threeD.rotationY,dice.threeD.rotationZ,dice.threeD.depth,dice.threeD.bevel],[inverse.threeD.rotationX,inverse.threeD.rotationY,inverse.threeD.rotationZ,inverse.threeD.depth,inverse.threeD.bevel]);
});

test("all 23 reconstructed models have finite, named, material-addressable geometry",()=>{
  assert.deepEqual(EXTREME_RETRO_ICON_KINDS,RETRO_ICON_REQUIRED_23);
  for(const kind of EXTREME_RETRO_ICON_KINDS){
    const element=createRetroIconElement({kind,style:"classic-cgi"}),model=buildExtremeRetroIcon(THREE,element.threeD);
    assert.ok(model,`${kind} must resolve to the reconstructed model pipeline`);
    assert.equal(model.userData.reconstructionVersion,2);
    const meshes=[];model.traverse((object)=>{if(object.isMesh)meshes.push(object);});
    assert.ok(meshes.length>=(EXTREME_ICON_MINIMUM_MESHES[kind]??1),`${kind} must meet its detail floor`);
    assert.equal(new Set(meshes.map((mesh)=>mesh.name)).size,meshes.length,`${kind} parts must be uniquely named`);
    for(const mesh of meshes){
      const position=mesh.geometry.getAttribute("position");assert.ok(position&&position.count>=3,`${kind}/${mesh.name} needs vertices`);
      assert.ok(Array.from(position.array).every(Number.isFinite),`${kind}/${mesh.name} cannot contain NaN or infinity`);
      mesh.geometry.computeBoundingBox();assert.ok(mesh.geometry.boundingBox&&!mesh.geometry.boundingBox.isEmpty(),`${kind}/${mesh.name} needs non-empty bounds`);
      assert.ok(Array.isArray(mesh.userData.iconMaterialRoles)&&mesh.userData.iconMaterialRoles.length>=1,`${kind}/${mesh.name} needs material roles`);
    }
    const bounds=new THREE.Box3().setFromObject(model),size=new THREE.Vector3();bounds.getSize(size);
    assert.ok(size.x>.1&&size.y>.1&&size.z>.01,`${kind} needs a real three-dimensional silhouette`);
  }
});

test("gear profile produces four deliberate corners per tooth without overlap",()=>{
  for(const teeth of [6,12,18,24]){const points=retroGearProfile(teeth,.28);assert.equal(points.length,teeth*4);assert.equal(new Set(points.map((point)=>`${point.x.toFixed(5)},${point.y.toFixed(5)}`)).size,points.length);}
});

test("each icon is a real saved 3D object with tight alpha-aware image export",()=>{
  for(const {kind} of RETRO_ICON_LIBRARY){const element=createRetroIconElement({kind,style:"classic-cgi"});assert.equal(element.type,"three-d");assert.equal(element.threeD.primitive,"retro-icon");assert.equal(element.threeD.iconKind,kind);assert.equal(element.threeD.automaticBounds,true);assert.equal(element.threeD.boundsPadding,10);assert.equal(element.robloxExportMode,"IMAGE");const decision=classifyRobloxElement(element);assert.equal(decision.intendedRobloxClass,"ImageLabel");assert.equal(decision.classification,"RASTERIZED");}
});

test("icon-specific geometry, expanded kinds, per-color alpha, and screen settings survive project migration",()=>{
  const project=createProject("Retro CGI icons"),gear=createRetroIconElement({kind:"gear",style:"pixelated-cgi",settings:{gearTeeth:17,toothDepth:.41,holeSize:.27,colorOpacity:0,sideColorOpacity:46,accentColorOpacity:72,colorKeyEnabled:true,colorKeyColor:"#7457ff",colorKeyTolerance:21,colorKeySoftness:7}}),clock=createRetroIconElement({kind:"clock",style:"classic-cgi",settings:{clockHour:4.5,clockMinute:37,rimThickness:.26}}),monitor=createRetroIconElement({kind:"monitor",style:"classic-cgi",settings:{iconScreenContent:"warning",screenColor:"#102938",screenColorOpacity:25}}),ticket=createRetroIconElement({kind:"golden-ticket",style:"classic-cgi"});project.elements=[gear,clock,monitor,ticket];const restored=normalizeProject(structuredClone(project));assert.deepEqual(restored.elements.map((item)=>({kind:item.threeD.iconKind,style:item.threeD.iconStyle})),[{kind:"gear",style:"pixelated-cgi"},{kind:"clock",style:"classic-cgi"},{kind:"monitor",style:"classic-cgi"},{kind:"golden-ticket",style:"classic-cgi"}]);assert.equal(restored.elements[0].threeD.gearTeeth,17);assert.equal(restored.elements[0].threeD.colorOpacity,0);assert.equal(restored.elements[0].threeD.sideColorOpacity,46);assert.equal(restored.elements[0].threeD.accentColorOpacity,72);assert.equal(restored.elements[0].threeD.colorKeyEnabled,true);assert.equal(restored.elements[0].threeD.colorKeyColor,"#7457ff");assert.equal(restored.elements[0].threeD.colorKeyTolerance,21);assert.equal(restored.elements[1].threeD.clockMinute,37);assert.equal(restored.elements[2].threeD.iconScreenContent,"warning");assert.equal(restored.elements[2].threeD.screenColorOpacity,25);
});

test("color-to-transparency removes the target, feathers nearby shades, and preserves unrelated pixels",()=>{
  assert.equal(colorKeyAlpha(255,0,255,255,{color:"#ff00ff",tolerance:0,softness:0}),0);
  assert.equal(colorKeyAlpha(0,255,0,255,{color:"#ff00ff",tolerance:5,softness:5}),255);
  const pixels=new Uint8ClampedArray([255,0,255,255,245,4,245,255,0,255,0,255]);
  applyColorKeyPixels(pixels,{color:"#ff00ff",tolerance:1,softness:8});
  assert.equal(pixels[3],0);assert.ok(pixels[7]>0&&pixels[7]<255);assert.equal(pixels[11],255);
});

test("geometry keys invalidate for every visible icon construction change",()=>{
  const base=normalizeThreeDSettings(createRetroIconElement({kind:"gear",style:"classic-cgi"}).threeD),key=threeDGeometryKey(base);for(const patch of [{gearTeeth:9},{toothDepth:.5},{holeSize:.55},{iconStyle:"pixelated-cgi"},{iconKind:"clock"},{clockHour:2},{clockMinute:42},{rimThickness:.34},{iconKind:"monitor",iconScreenContent:"error"}])assert.notEqual(threeDGeometryKey(normalizeThreeDSettings({...base,...patch})),key);
});

test("the renderer keeps exactly ten design pixels around projected geometry",()=>{
  const crop=tightThreeDRenderBounds({left:21.2,top:30.7,right:201.1,bottom:221.4},10,0);assert.deepEqual(crop,{left:11,top:20,right:212,bottom:232,width:201,height:212,padding:10,effectPadding:0});
});

test("the visible editor exposes the Icon Studio, alpha export, small-size QA, and complete composite models",async()=>{
  const studio=await readFile(new URL("../components/editor/RetroIconStudio.tsx",import.meta.url),"utf8"),surface=await readFile(new URL("../components/editor/ThreeDObjectSurface.tsx",import.meta.url),"utf8"),library=await readFile(new URL("../components/editor/RetroLibraryPanel.tsx",import.meta.url),"utf8");assert.match(library,/3D Icons/);assert.match(library,/Open 3D Icon Studio/);assert.match(studio,/SMALL-SIZE CHECK/);assert.match(studio,/MULTI-ANGLE QA/);assert.match(studio,/Auto rotate/);assert.match(studio,/Reset view/);assert.match(studio,/3D icon zoom/);assert.match(studio,/safe render budget/);assert.match(studio,/Search 3D icons/);assert.match(studio,/color transparency/);assert.match(studio,/color transparent/);assert.match(studio,/Make transparent/);assert.match(studio,/ADVANCED CHROMA KEY/);assert.match(studio,/Color key tolerance/);assert.match(studio,/PNG alpha/);assert.match(studio,/WebP alpha/);assert.match(studio,/Insert into canvas/);assert.match(surface,/buildRetroIconModel/);assert.match(surface,/retroGearProfile/);assert.match(surface,/iconScreenContent/);assert.match(surface,/windows-flag/);assert.match(surface,/pixelText\("GOLDEN"/);assert.match(surface,/pixelText\("SHOWTIME!"/);assert.match(surface,/golden-key/);assert.match(surface,/roleOpacity/);assert.match(surface,/HemisphereLight/);assert.match(surface,/fabricRole/);assert.match(surface,/rubberRole/);assert.match(surface,/MeshPhysicalMaterial/);assert.match(surface,/clearcoatRoughness/);assert.match(surface,/iridescenceThicknessMinimum/);assert.match(surface,/ring=\(outer/);assert.match(surface,/wedge\.absarc/);assert.match(surface,/puzzle\.bezierCurveTo/);assert.match(surface,/material\.depthWrite=material\.opacity>=\.999/);assert.match(surface,/applyColorKeyPixels/);assert.match(surface,/iconMeshCount/);assert.match(surface,/materialSlots=Math\.max/);assert.match(surface,/getImageData\(x,y,1,1\)\.data\[3\]>8/);
});
