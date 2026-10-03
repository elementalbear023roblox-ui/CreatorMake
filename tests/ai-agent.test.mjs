import test from "node:test";
import assert from "node:assert/strict";
import { createElement, createProject } from "../lib/editor/project.ts";
import { buildCreatorMakeContext } from "../lib/ai/context-builder.ts";
import { multimodalContent } from "../lib/ai/reference-analyzer.ts";
import { CREATORMAKE_TOOLS } from "../lib/ai/tool-registry.ts";
import { createToolState, executeCreatorMakeTool } from "../lib/ai/tool-executor.ts";
import { OpenAIProvider } from "../lib/ai/providers/openai.ts";

test("context builder sends selected hierarchy without unrelated project state",()=>{
  const project=createProject("Context test"),root=createElement("frame"),child=createElement("button"),unrelated=createElement("text");root.id="selected-root";child.id="selected-child";child.parentId=root.id;unrelated.id="unrelated";project.elements=[root,child,unrelated];project.selectedIds=[root.id];
  const context=buildCreatorMakeContext(project,"Refine");
  assert.deepEqual(context.elements.map((item)=>item.id),["selected-root","selected-child"]);
  assert.equal(context.preserve.text,true);assert.equal(context.activeFrame.id,"selected-root");
});

test("multiple references and current canvas are literal multimodal image inputs",()=>{
  const references=[{id:"a",name:"@Layout",dataUrl:"data:image/png;base64,AAA",role:"Layout",influence:100,notes:"proportions",regions:[]},{id:"b",name:"@Colors",dataUrl:"data:image/png;base64,BBB",role:"Colors",influence:80,notes:"palette",regions:[]}];
  const content=multimodalContent("Create inventory",references,"data:image/png;base64,CANVAS","original");
  const images=content.filter((item)=>item.type==="input_image");assert.equal(images.length,3);assert.ok(images.every((item)=>item.detail==="original"));
});

test("CreatorMake tools are strict and mutate only validated editable project state",()=>{
  for(const tool of CREATORMAKE_TOOLS){assert.equal(tool.parameters.additionalProperties,false);assert.ok(Array.isArray(tool.parameters.required));}
  const project=createProject("Tool test"),beforeText=project.elements.find((item)=>item.type==="text").text,state=createToolState(project);
  const grid=executeCreatorMakeTool(state,"create_grid",{name:"InventoryGrid",parentId:null,x:80,y:90,width:600,height:420,count:12,columns:4,gap:10,childType:"frame",labelPrefix:"Slot",fill:"#222831"});
  assert.equal(grid.ids.length,13);assert.equal(state.project.elements.filter((item)=>item.name.startsWith("Slot")).length,12);
  assert.throws(()=>executeCreatorMakeTool(state,"create_grid",{name:"Bad",unknown:true}),/missing required field|unknown field/);
  executeCreatorMakeTool(state,"system_apply_preset",{ids:[grid.ids[0]],presetId:"windows-98",recursive:true});
  assert.equal(state.project.elements.find((item)=>item.type==="text").text,beforeText);
  assert.equal(state.project.elements.filter((item)=>item.name.startsWith("Slot")).length,12);
});

test("OpenAI provider reports not configured and never invents a connection",async()=>{
  const previous=process.env.OPENAI_API_KEY;delete process.env.OPENAI_API_KEY;try{const provider=new OpenAIProvider(),status=provider.status(),tested=await provider.test();assert.equal(status.configured,false);assert.equal(status.connected,false);assert.equal(tested.configured,false);assert.match(tested.message,/OPENAI_API_KEY is not configured/);}finally{if(previous)process.env.OPENAI_API_KEY=previous;}
});

test("OpenAI provider sends server-side Responses API structured multimodal requests",async()=>{
  const previousKey=process.env.OPENAI_API_KEY,previousModel=process.env.CREATORMAKE_AI_MODEL,previousFetch=globalThis.fetch;let captured;
  process.env.OPENAI_API_KEY="server-only-test-key";process.env.CREATORMAKE_AI_MODEL="configured-model";
  globalThis.fetch=async(url,options)=>{captured={url,options,body:JSON.parse(options.body)};return new Response(JSON.stringify({id:"resp_test",model:"configured-model",status:"completed",output_text:'{"answer":"ok"}'}),{status:200,headers:{"content-type":"application/json"}});};
  try{const provider=new OpenAIProvider(),value=await provider.structured({name:"test_output",schema:{type:"object",additionalProperties:false,properties:{answer:{type:"string"}},required:["answer"]},instructions:"Return structured data.",input:[{role:"user",content:[{type:"input_text",text:"Inspect"},{type:"input_image",image_url:"data:image/png;base64,AAA",detail:"high"}]}],quality:"PRECISE"});assert.deepEqual(value,{answer:"ok"});assert.equal(captured.url,"https://api.openai.com/v1/responses");assert.equal(captured.body.model,"configured-model");assert.equal(captured.body.reasoning.effort,"high");assert.equal(captured.body.text.format.type,"json_schema");assert.equal(captured.body.input[0].content[1].type,"input_image");assert.match(captured.options.headers.Authorization,/^Bearer server-only-test-key$/);}finally{globalThis.fetch=previousFetch;if(previousKey)process.env.OPENAI_API_KEY=previousKey;else delete process.env.OPENAI_API_KEY;if(previousModel)process.env.CREATORMAKE_AI_MODEL=previousModel;else delete process.env.CREATORMAKE_AI_MODEL;}
});
