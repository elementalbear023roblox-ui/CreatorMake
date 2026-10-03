import type { EditorElement, EditorProject, ElementType } from "@/lib/editor/types";
import type { ReferenceRole } from "@/lib/design-intelligence/types";

export type GenerationEngine = "LOCAL"|"FAST"|"BALANCED"|"PRECISE";
export type ExternalQuality = Exclude<GenerationEngine,"LOCAL">;
export type ReferenceDetail = "auto"|"high"|"original";
export type IntentAction = "CREATE"|"REFINE"|"RESTYLE"|"FIX"|"MODIFY"|"REBUILD"|"EXPAND"|"REARRANGE"|"REPLICATE"|"COMPONENTIZE"|"RESPONSIVE_CONVERSION"|"SPATIAL_TRANSFORMATION";
export type AIPlatform = "GENERIC"|"WEB"|"ROBLOX"|"MOBILE"|"DESKTOP";

export type IntentResult = {
  action:IntentAction;targetIds:string[];interfaceType:string|null;platform:AIPlatform;
  instructionIntent:string;literalUICopy:Array<{target:string;text:string}>;requirements:string[];
  preserve:string[];styleRequests:string[];requiresReferences:boolean;requiresResearch:boolean;
};
export type ContentPlanNode = {key:string;name:string;type:ElementType;purpose:string;parentKey:string|null;count:number;literalText:string|null};
export type ContentPlan = {interfaceType:string;summary:string;nodes:ContentPlanNode[];exactCounts:Array<{subject:string;count:number}>};
export type GeometryPlanNode = {key:string;x:number;y:number;width:number;height:number;layout:"none"|"horizontal"|"vertical"|"grid";columns:number;gap:number;padding:number;anchor:string;constraints:string};
export type GeometryPlan = {canvasWidth:number;canvasHeight:number;strategy:string;nodes:GeometryPlanNode[]};
export type CreatorMakeAIPlan = {
  id:string;prompt:string;mode:string;style:string;platform:string;quality:ExternalQuality;provider:"openai";model:string;createdAt:number;
  intent:IntentResult;content:ContentPlan;geometry:GeometryPlan;referenceIds:string[];presetIds:string[];
  preserve:string[];expectedCreates:number;expectedModifies:number;toolCategories:string[];warnings:string[];
};

export type CompactElement = Pick<EditorElement,"id"|"type"|"name"|"parentId"|"x"|"y"|"width"|"height"|"rotation"|"fill"|"borderColor"|"borderWidth"|"cornerRadius"|"text"|"textColor"|"fontFamily"|"fontSize"|"fontWeight"|"layoutMode"|"gap"|"gridColumns"|"padding"|"shadow"|"hidden"|"locked">;
export type CreatorMakeContext = {
  project:{id:string;name:string};screen:EditorProject["screen"];selection:string[];activeFrame:CompactElement|null;
  elements:CompactElement[];hierarchy:Array<{id:string;parentId:string|null;children:string[]}>;
  activePresetIds:string[];generationMode:string;preserve:{layout:boolean;text:boolean;size:boolean;hierarchy:boolean};
};
export type AIReferenceInput = {id:string;name:string;dataUrl:string;role:ReferenceRole;influence:number;notes:string;regions:Array<{name:string;role:ReferenceRole;x:number;y:number;width:number;height:number}>};
export type AIPlanRequest = {prompt:string;mode:string;style:string;platform:string;quality:ExternalQuality;referenceDetail:ReferenceDetail;project:EditorProject;canvasImage:string|null};
export type AIGenerateRequest = AIPlanRequest & {plan:CreatorMakeAIPlan};
export type AIProgressEvent = {type:"intent.complete"|"reference-analysis.complete"|"plan.complete"|"tool.executed"|"validation.complete"|"repair.started"|"generation.complete";message:string;data?:unknown};
export type ValidationIssue = {code:string;elementId:string|null;message:string;repaired:boolean};
export type AIValidationResult = {passed:boolean;repaired:number;issues:ValidationIssue[]};
export type VisualReview = {promptCompliance:string[];geometryIssues:string[];alignmentIssues:string[];spacingIssues:string[];styleIssues:string[];textIssues:string[];referenceIssues:string[];needsRepair:boolean};
export type AIDebugSummary = {provider:"openai";model:string;quality:ExternalQuality;intent:IntentAction;contentPlanner:"AI";geometryPlanner:"AI + deterministic geometry";preset:string;toolCalls:number;repairPasses:number;validation:"PASS"|"REVIEW";externalAI:"CONNECTED"};
export type AIGenerationResult = {elements:EditorElement[];selectedIds:string[];operations:string[];validation:AIValidationResult;visualReviews:VisualReview[];debug:AIDebugSummary;needsAnotherPass:boolean};
export type AIProviderStatus = {provider:"openai";configured:boolean;connected:boolean;model:string;message:string};

