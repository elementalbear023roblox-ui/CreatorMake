import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject, duplicateProject, exportProjectData, normalizeProject } from "../lib/editor/project.ts";

test("blank and commission projects both start with a truly empty canvas",()=>{
  const blank=createProject("Blank","blank"),commission=createProject("Client Shop","commission");
  assert.equal(blank.projectKind,"blank");assert.equal(commission.projectKind,"commission");assert.equal(blank.elements.length,0);assert.equal(commission.elements.length,0);assert.equal(blank.assets.length,0);assert.equal(commission.assets.length,0);assert.equal(commission.commissionBrief.clientLabel,"");assert.ok(commission.commissionBrief.targetDevices.includes("Phone"));
});

test("commission metadata and canonical Roblox fonts survive save/load normalization",()=>{
  const project=createProject("Client HUD","commission"),title=createElement("text");Object.assign(title,{fontId:"builder-sans",fontFamily:"Builder Sans",fontWeight:800,fontStyle:"italic"});project.elements.push(title);Object.assign(project.commissionBrief,{clientLabel:"Client A",gameName:"Racing",requestedStyle:"Clean neon",notes:"Increase the close button"});
  const normalized=normalizeProject(structuredClone(project));
  assert.equal(normalized.schemaVersion,10);assert.deepEqual(normalized.commissionBrief,project.commissionBrief);assert.equal(normalized.elements[0].fontFamily,"Builder Sans");assert.equal(normalized.elements[0].fontWeight,800);assert.equal(normalized.elements[0].fontStyle,"normal");
  const exported=exportProjectData(normalized);assert.equal(exported.project.projectKind,"commission");assert.equal(exported.project.commissionBrief.notes,"Increase the close button");
});

test("project duplication copies commission resources but creates a new identity",()=>{
  const project=createProject("Shop V1","commission");project.commissionBrief.colorPalette="#6d28d9, #22d3ee";project.references.push({id:"reference",name:"@Logo",dataUrl:"data:image/png;base64,AA==",role:"Brand Identity",influence:100,createdAt:1,notes:"",regions:[]});
  const copy=duplicateProject(project);assert.notEqual(copy.id,project.id);assert.equal(copy.name,"Shop V1 Copy");assert.equal(copy.projectKind,"commission");assert.equal(copy.commissionBrief.colorPalette,project.commissionBrief.colorPalette);assert.deepEqual(copy.references,project.references);assert.notEqual(copy.references,project.references);
});
