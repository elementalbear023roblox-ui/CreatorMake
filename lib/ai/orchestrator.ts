import { buildCreatorMakeContext } from "./context-builder";
import { contentPlannerInstructions, contentPlanSchema } from "./content-planner";
import { geometryPlannerInstructions, geometryPlanSchema } from "./geometry-planner";
import { intentInstructions, intentSchema } from "./intent-parser";
import { multimodalContent, referenceInputs } from "./reference-analyzer";
import { deterministicRepair } from "./repair";
import { renderProjectSvgDataUrl } from "./screenshot-validator";
import { createToolState, executeCreatorMakeTool } from "./tool-executor";
import { toOpenAITool, toolsForTask } from "./tool-registry";
import { validateAIProject } from "./validator";
import { visualReviewInstructions, visualReviewSchema } from "./visual-analyzer";
import { effort, openAIProvider } from "./providers/openai";
import { presetsForRequest } from "@/lib/design-intelligence/planner";
import type { AIGenerateRequest, AIGenerationResult, AIPlanRequest, AIProgressEvent, ContentPlan, CreatorMakeAIPlan, GeometryPlan, IntentResult, VisualReview } from "./types";

const DESIGN_AGENT_INSTRUCTIONS=`You are CreatorMake Design Agent. Construct and modify interfaces only through the provided CreatorMake tools. The user's prompt determines WHAT to create. System Presets determine HOW requested objects are styled. Never substitute a preset demo or template for the requested interface. Never turn instruction text into visible UI copy unless it appears in approved literalUICopy. Inspect the design before modifying it. Preserve unrelated properties on modifications. Respect exact counts and spatial instructions. Prefer structured hierarchy and deterministic grids. Do not output HTML, screenshots, JavaScript, or hidden chain-of-thought. Finish by calling validation_run.`;
const budgets={FAST:30,BALANCED:100,PRECISE:250} as const;
const repairLimits={FAST:0,BALANCED:1,PRECISE:2} as const;
const planId=()=>`ai_plan_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`;
const message=(content:Array<Record<string,unknown>>)=>[{role:"user",content}];
const contextText=(value:unknown)=>({type:"input_text",text:JSON.stringify(value)});

export async function createExternalAIPlan(request:AIPlanRequest,signal?:AbortSignal,onEvent?:(event:AIProgressEvent)=>void):Promise<CreatorMakeAIPlan>{
  const context=buildCreatorMakeContext(request.project,request.mode),references=referenceInputs(request.project),images=multimodalContent(`USER REQUEST: ${request.prompt}`,references,request.canvasImage,request.referenceDetail);
  console.info("[CreatorMake AI]",JSON.stringify({provider:"openai",mode:request.quality,model:openAIProvider.getModel(),stage:"plan"}));
  const intent=await openAIProvider.structured<IntentResult>({name:"creatormake_intent",schema:intentSchema,instructions:intentInstructions,input:message([...images,contextText({creatorMakeContext:context,selectedStyle:request.style,platform:request.platform})]),quality:request.quality,signal});onEvent?.({type:"intent.complete",message:`Intent classified as ${intent.action}.`,data:intent});
  if(references.length)onEvent?.({type:"reference-analysis.complete",message:`${references.length} reference image(s) sent as multimodal input.`});
  const content=await openAIProvider.structured<ContentPlan>({name:"creatormake_content_plan",schema:contentPlanSchema,instructions:contentPlannerInstructions,input:message([...images,contextText({request:request.prompt,intent,currentHierarchy:context.hierarchy,currentElements:context.elements})]),quality:request.quality,signal});
  const geometry=await openAIProvider.structured<GeometryPlan>({name:"creatormake_geometry_plan",schema:geometryPlanSchema,instructions:geometryPlannerInstructions,input:message([contextText({request:request.prompt,intent,content,currentCanvas:context.screen,currentSelection:context.selection})]),quality:request.quality,signal});
  const presets=presetsForRequest(request.prompt,request.style).map((preset)=>preset.id);
  const expectedCreates=content.nodes.reduce((total,node)=>total+node.count,0),expectedModifies=/CREATE/.test(intent.action)?0:context.elements.length;
  const plan:CreatorMakeAIPlan={id:planId(),prompt:request.prompt,mode:request.mode,style:request.style,platform:request.platform,quality:request.quality,provider:"openai",model:openAIProvider.getModel(),createdAt:Date.now(),intent,content,geometry,referenceIds:references.map((reference)=>reference.id),presetIds:presets,preserve:intent.preserve,expectedCreates,expectedModifies,toolCategories:["inspection","create","transform","style","text","layout","hierarchy","system","validation"],warnings:[]};
  onEvent?.({type:"plan.complete",message:"Content and geometry plans completed.",data:plan});return plan;
}

async function runToolLoop(request:AIGenerateRequest,state:ReturnType<typeof createToolState>,prompt:string,remainingBudget:number,signal?:AbortSignal,onEvent?:(event:AIProgressEvent)=>void){
  const context=buildCreatorMakeContext(state.project,request.mode),references=referenceInputs(request.project),selectedTools=toolsForTask(request.plan.intent.action,request.plan.intent.platform),tools=selectedTools.map(toOpenAITool);let input:Array<Record<string,unknown>>=message([...multimodalContent(`USER REQUEST: ${request.prompt}`,references,request.canvasImage,request.referenceDetail),contextText({approvedPlan:request.plan,creatorMakeContext:context,task:prompt})]);let calls=0,finished=false;
  while(calls<remainingBudget&&!finished){
    const response=await openAIProvider.request({model:request.plan.model,instructions:DESIGN_AGENT_INSTRUCTIONS,input,tools,tool_choice:"auto",parallel_tool_calls:true,reasoning:{effort:effort[request.quality]},store:false},signal);
    const functionCalls=(response.output??[]).filter((item)=>item.type==="function_call"&&item.call_id&&item.name);
    if(!functionCalls.length){finished=true;break;}
    const outputs:Array<Record<string,unknown>>=[];
    for(const call of functionCalls){if(calls>=remainingBudget)break;calls++;let value:unknown;try{value=JSON.parse(call.arguments??"{}");const result=executeCreatorMakeTool(state,call.name!,value);outputs.push({type:"function_call_output",call_id:call.call_id,output:JSON.stringify(result)});onEvent?.({type:"tool.executed",message:state.operations.at(-1)??call.name!,data:{tool:call.name,result}});}catch(error){const result={success:false,error:error instanceof Error?error.message:"Tool failed."};outputs.push({type:"function_call_output",call_id:call.call_id,output:JSON.stringify(result)});state.operations.push(`${call.name}: ERROR ${result.error}`);onEvent?.({type:"tool.executed",message:state.operations.at(-1)!});}}
    input=[...input,...(response.output??[]),...outputs];
  }
  return {calls,finished};
}

function enforceLiteralCopy(request:AIGenerateRequest,state:ReturnType<typeof createToolState>){const originalTexts=new Set(request.project.elements.map((item)=>item.text).filter(Boolean)),allowed=new Set([...originalTexts,...request.plan.intent.literalUICopy.map((item)=>item.text),...request.plan.content.nodes.map((item)=>item.literalText).filter((text):text is string=>Boolean(text))]);let repaired=0;for(const item of state.project.elements){if(state.createdIds.includes(item.id)&&(item.type==="text"||item.type==="button")&&item.text&&!allowed.has(item.text)){state.operations.push(`text.guard: removed unapproved visible copy from ${item.name}`);item.text="";repaired++;}}return repaired;}

export async function generateWithExternalAI(request:AIGenerateRequest,signal?:AbortSignal,onEvent?:(event:AIProgressEvent)=>void):Promise<AIGenerationResult>{
  if(request.plan.provider!=="openai"||request.plan.prompt!==request.prompt)throw new Error("Approved AI plan does not match this generation request.");
  console.info("[CreatorMake AI]",JSON.stringify({provider:"openai",mode:request.quality,model:request.plan.model,stage:"execute"}));
  const state=createToolState(request.project),before=JSON.stringify(state.project.elements),budget=budgets[request.quality];let toolCalls=0,repairPasses=0,needsAnotherPass=false;
  const initial=await runToolLoop(request,state,"Execute the approved plan with CreatorMake tools. Inspect first, preserve unrelated state, apply geometry before style, then validate.",budget,signal,onEvent);toolCalls+=initial.calls;if(!initial.finished||toolCalls>=budget)needsAnotherPass=true;
  if(JSON.stringify(state.project.elements)===before)throw new Error("OpenAI completed without mutating any CreatorMake objects. No local fallback was used.");
  const literalRepairs=enforceLiteralCopy(request,state);let validation=validateAIProject(state.project,request.plan.content);if(request.quality==="PRECISE"&&!validation.passed){const repaired=deterministicRepair(state.project);validation={...validateAIProject(state.project,request.plan.content),repaired:repaired.repaired+literalRepairs};}else validation={...validation,repaired:literalRepairs};onEvent?.({type:"validation.complete",message:validation.passed?"Deterministic validation passed.":`${validation.issues.length} validation issue(s) remain.`,data:validation});
  const visualReviews:VisualReview[]=[];
  for(let pass=0;pass<repairLimits[request.quality];pass++){
    const screenshot=renderProjectSvgDataUrl(state.project),review=await openAIProvider.structured<VisualReview>({name:"creatormake_visual_review",schema:visualReviewSchema,instructions:visualReviewInstructions,input:message([...multimodalContent(`Review generated CreatorMake result for: ${request.prompt}`,referenceInputs(request.project),screenshot,request.referenceDetail),contextText({approvedPlan:request.plan,finalHierarchy:state.project.elements.map((item)=>({id:item.id,name:item.name,type:item.type,parentId:item.parentId,x:item.x,y:item.y,width:item.width,height:item.height,text:item.text}))})]),quality:request.quality,signal});visualReviews.push(review);if(!review.needsRepair)break;repairPasses++;onEvent?.({type:"repair.started",message:`Visual repair pass ${repairPasses} started.`,data:review});const remaining=budget-toolCalls;if(remaining<=0){needsAnotherPass=true;break;}const repair=await runToolLoop(request,state,`Repair only these review findings while preserving correct work: ${JSON.stringify(review)}`,remaining,signal,onEvent);toolCalls+=repair.calls;validation=validateAIProject(state.project,request.plan.content);
  }
  const selectedIds=state.createdIds.length?[...new Set(state.createdIds)]:[...request.project.selectedIds];const debug={provider:"openai" as const,model:request.plan.model,quality:request.quality,intent:request.plan.intent.action,contentPlanner:"AI" as const,geometryPlanner:"AI + deterministic geometry" as const,preset:request.plan.presetIds.join(", ")||"None",toolCalls,repairPasses,validation:validation.passed?"PASS" as const:"REVIEW" as const,externalAI:"CONNECTED" as const};onEvent?.({type:"generation.complete",message:"External AI generation finished.",data:debug});return {elements:state.project.elements,selectedIds,operations:state.operations,validation,visualReviews,debug,needsAnotherPass};
}
