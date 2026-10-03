import type { AIProviderStatus, ExternalQuality } from "./types";

export type StructuredRequest = {name:string;schema:object;instructions:string;input:Array<Record<string,unknown>>;quality:ExternalQuality;signal?:AbortSignal};
export interface AIProvider {
  status():AIProviderStatus;
  test(signal?:AbortSignal):Promise<AIProviderStatus>;
  structured<T>(request:StructuredRequest):Promise<T>;
}
