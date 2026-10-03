import { researchStyle } from "@/lib/research/styleResearcher";
import type { ResearchRequest } from "@/lib/design-intelligence/types";

export async function POST(request: Request) {
  try { const input = await request.json() as ResearchRequest; if (!input.prompt?.trim()) return Response.json({ error:"A prompt is required." },{ status:400 }); return Response.json(await researchStyle(input)); }
  catch { return Response.json({ error:"Research request could not be processed." },{ status:400 }); }
}
