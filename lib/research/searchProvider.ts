import type { ResearchSource } from "@/lib/design-intelligence/types";
export type SearchProvider = { name: string; search: (query: string) => Promise<ResearchSource[]> };
