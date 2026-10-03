import type { SearchProvider } from "./searchProvider";

export const wikipediaSearch: SearchProvider = { name: "Wikipedia", async search(query) {
  const url = new URL("https://en.wikipedia.org/w/api.php"); url.searchParams.set("action","query"); url.searchParams.set("list","search"); url.searchParams.set("srsearch",query); url.searchParams.set("srlimit","5"); url.searchParams.set("format","json"); url.searchParams.set("origin","*");
  const response = await fetch(url,{ headers:{ "accept":"application/json", "user-agent":"CreatorMake-Research/1.0" } }); if (!response.ok) throw new Error("Search provider unavailable");
  const data = await response.json() as { query?: { search?: { pageid:number; title:string; snippet:string }[] } };
  return (data.query?.search ?? []).map((item) => ({ id:`wikipedia_${item.pageid}`, title:item.title, url:`https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g,"_"))}`, provider:"Wikipedia", excerpt:item.snippet.replace(/<[^>]+>/g,"").slice(0,260), excluded:false }));
} };
