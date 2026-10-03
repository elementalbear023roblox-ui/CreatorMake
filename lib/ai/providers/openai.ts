import type { AIProvider, StructuredRequest } from "../provider";
import type { AIProviderStatus, ExternalQuality } from "../types";

const API_URL="https://api.openai.com/v1/responses";
const effort:Record<ExternalQuality,"low"|"medium"|"high">={FAST:"low",BALANCED:"medium",PRECISE:"high"};
let lastConnection=false;

export type OpenAIResponse={id:string;model:string;status:string;output_text?:string;output?:Array<{type:string;content?:Array<{type:string;text?:string}>;call_id?:string;name?:string;arguments?:string;[key:string]:unknown}>;error?:{message?:string}};

function configuration(){return {apiKey:process.env.OPENAI_API_KEY?.trim()??"",model:process.env.CREATORMAKE_AI_MODEL?.trim()||"gpt-5.6-sol"};}
function outputText(response:OpenAIResponse){if(response.output_text)return response.output_text;return (response.output??[]).flatMap((item)=>item.content??[]).filter((item)=>item.type==="output_text").map((item)=>item.text??"").join("");}

export class OpenAIProvider implements AIProvider{
  status():AIProviderStatus{const {apiKey,model}=configuration();return {provider:"openai",configured:Boolean(apiKey),connected:Boolean(apiKey)&&lastConnection,model,message:!apiKey?"OPENAI_API_KEY is not configured on the CreatorMake server.":lastConnection?"OpenAI Responses API connection verified.":"Configured on the server; run Test Connection to verify access."};}
  async test(signal?:AbortSignal):Promise<AIProviderStatus>{const config=configuration();if(!config.apiKey)return this.status();await this.request({model:config.model,input:"Return exactly OK.",reasoning:{effort:"low"},max_output_tokens:64,store:false},signal);lastConnection=true;return this.status();}
  async structured<T>(request:StructuredRequest):Promise<T>{const config=configuration();if(!config.apiKey)throw new AIProviderError("NOT_CONFIGURED","OpenAI is not configured. Set OPENAI_API_KEY in the server environment and restart CreatorMake.",503);const response=await this.request({model:config.model,instructions:request.instructions,input:request.input,reasoning:{effort:effort[request.quality]},text:{format:{type:"json_schema",name:request.name,strict:true,schema:request.schema}},store:false},request.signal);lastConnection=true;const text=outputText(response);if(!text)throw new AIProviderError("EMPTY_RESPONSE","OpenAI returned no structured output.",502);try{return JSON.parse(text) as T;}catch{throw new AIProviderError("INVALID_RESPONSE","OpenAI returned invalid structured JSON.",502);}}
  async request(body:Record<string,unknown>,signal?:AbortSignal):Promise<OpenAIResponse>{const {apiKey}=configuration();if(!apiKey)throw new AIProviderError("NOT_CONFIGURED","OpenAI is not configured. Set OPENAI_API_KEY in the server environment and restart CreatorMake.",503);let response:Response;try{response=await fetch(API_URL,{method:"POST",headers:{Authorization:`Bearer ${apiKey}`,"Content-Type":"application/json"},body:JSON.stringify(body),signal});}catch(error){lastConnection=false;if(error instanceof Error&&error.name==="AbortError")throw error;throw new AIProviderError("CONNECT_FAILED","CreatorMake could not reach the OpenAI Responses API.",502);}const payload=await response.json().catch(()=>null) as OpenAIResponse|null;if(!response.ok){lastConnection=false;throw new AIProviderError("PROVIDER_ERROR",payload?.error?.message||`OpenAI returned HTTP ${response.status}.`,response.status);}return payload as OpenAIResponse;}
  getModel(){return configuration().model;}
}

export class AIProviderError extends Error{code:string;status:number;constructor(code:string,message:string,status:number){super(message);this.name="AIProviderError";this.code=code;this.status=status;}}
export const openAIProvider=new OpenAIProvider();
export { outputText, effort };
