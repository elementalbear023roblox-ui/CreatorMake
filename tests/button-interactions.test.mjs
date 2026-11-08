import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject, duplicateProject, exportProjectData, importProjectData, normalizeProject } from "../lib/editor/project.ts";
import { createRobloxExport } from "../lib/roblox/exporter.ts";
import { DEFAULT_ROBLOX_EXPORT_OPTIONS } from "../lib/roblox/types.ts";

test("new buttons enable interactive backgrounds while migrated projects stay static",()=>{
  const button=createElement("button");
  assert.equal(button.buttonInteraction.enabled,true);
  assert.equal(button.buttonInteraction.hoverDuration,.15);
  assert.equal(button.buttonInteraction.pressedDuration,.1);
  const legacy=createProject("Legacy");legacy.schemaVersion=20;legacy.elements=[structuredClone(button)];delete legacy.elements[0].buttonInteraction;
  const migrated=normalizeProject(legacy);
  assert.equal(migrated.schemaVersion,21);
  assert.equal(migrated.elements[0].buttonInteraction.enabled,false);
});

test("Roblox export uses one shared interaction controller and preserves Activated handlers",()=>{
  const project=createProject("Interactive");project.elements=[createElement("button"),createElement("button")];
  const output=createRobloxExport(project,{...DEFAULT_ROBLOX_EXPORT_OPTIONS,visualMode:"NATIVE"});
  const controllers=output.manifest.nodes.filter((node)=>node.attributes?.CreatorMakeRole==="SharedButtonInteractionController");
  assert.equal(controllers.length,1);
  assert.equal(controllers[0].className,"LocalScript");
  assert.match(String(controllers[0].properties.Source),/button\.Activated:Connect/);
  assert.match(String(controllers[0].properties.Source),/Enum\.UserInputType\.Touch/);
  assert.match(String(controllers[0].properties.Source),/GetPropertyChangedSignal\("Visible"\)/);
  assert.match(String(controllers[0].properties.Source),/suppressHover=true;apply\(button,"Normal"/);
  assert.equal(output.manifest.nodes.filter((node)=>node.attributes?.CreatorMakeInteractiveBackground===true).length,2);
});

test("project duplication and portable .creatormake packages are independent",async()=>{
  const project=createProject("Shared Project");project.elements=[createElement("button")];
  const duplicate=duplicateProject(project);duplicate.elements[0].text="Changed copy";
  assert.notEqual(duplicate.id,project.id);assert.equal(project.elements[0].text,"Button");
  const packaged=exportProjectData(project);assert.equal(packaged.format,"creatormake-project");assert.equal(packaged.schemaVersion,21);
  const imported=await importProjectData(packaged);
  assert.notEqual(imported.id,project.id);assert.equal(imported.elements[0].buttonInteraction.enabled,true);assert.equal(imported.elements[0].text,"Button");
  const newerPackage=structuredClone(packaged);newerPackage.project.schemaVersion=22;
  const migrated=await importProjectData(newerPackage);
  assert.equal(migrated.schemaVersion,21);assert.equal(migrated.elements[0].text,"Button");
});
