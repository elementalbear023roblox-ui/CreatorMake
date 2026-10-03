export type LiteralCopyRole = "title" | "button" | "exact";

export type ParsedDesignIntent = {
  task: "create" | "refine" | "rebuild" | "edit";
  layoutType: "shop" | "inventory" | "spatial" | "window" | "unspecified";
  platform: "Roblox" | "Desktop" | "Web" | "Generic";
  style: string[];
  literalCopy: Array<{ role: LiteralCopyRole; text: string }>;
  contentRequirements: string[];
  preservationRules: string[];
  forbiddenChanges: string[];
};

const cleanCopy = (value: string) => value.trim().replace(/^["']|["']$/g, "").replace(/[.?!]+$/, "").trim();

function addCopy(items: ParsedDesignIntent["literalCopy"], role: LiteralCopyRole, value?: string) {
  const text = value ? cleanCopy(value) : "";
  if (text && !items.some((item) => item.role === role && item.text.toLowerCase() === text.toLowerCase())) items.push({ role, text });
}

/**
 * Keeps user instructions and visible design copy in separate channels.
 * Only explicit copy grammar is accepted; an imperative prompt is never used as fallback text.
 */
export function parseDesignIntent(prompt: string): ParsedDesignIntent {
  const normalized = prompt.trim();
  const lower = normalized.toLowerCase();
  const literalCopy: ParsedDesignIntent["literalCopy"] = [];

  const titlePatterns = [
    /\b(?:window|shop|panel|screen|interface)\s+(?:is\s+)?titled\s+["']([^"']+)["']/i,
    /\b(?:window|shop|panel|screen|interface)\s+(?:is\s+)?titled\s+([^,.!?]+)(?:[,.!?]|$)/i,
    /\btitle\s+(?:should\s+say|text\s*(?:is|=|:)|is|=|:)\s*["']([^"']+)["']/i,
    /\btitle\s+(?:should\s+say|text\s*(?:is|=|:)|is|=|:)\s*([^,.!?]+)(?:[,.!?]|$)/i,
  ];
  for (const pattern of titlePatterns) {
    const match = normalized.match(pattern);
    if (match) { addCopy(literalCopy, "title", match[1]); break; }
  }

  const buttonPatterns = [
    /\bbutton\s+text\s*(?:is|=|:)?\s*["']([^"']+)["']/i,
    /\bbutton\s+(?:should\s+)?say\s+["']([^"']+)["']/i,
  ];
  for (const pattern of buttonPatterns) {
    const match = normalized.match(pattern);
    if (match) { addCopy(literalCopy, "button", match[1]); break; }
  }

  const exact = normalized.match(/\b(?:use|include|show|display|write)\s+(?:the\s+)?exact\s+text\s+["']([^"']+)["']/i);
  if (exact) addCopy(literalCopy, "exact", exact[1]);

  const styleTerms = ["colorful", "bright", "cartoon", "dark", "premium", "exclusive", "windows 98", "retro", "horror", "cyberpunk", "sci-fi", "simulator"];
  const contentTerms = ["featured product", "product cards", "category tabs", "currency price badges", "close button", "codes section", "sale banner", "side tabs"];
  const preservationRules = Array.from(normalized.matchAll(/\b(?:keep|preserve|retain)\s+([^,.!?]+)/gi), (match) => match[1].trim());
  const forbiddenChanges = Array.from(normalized.matchAll(/\b(?:do not|don't|never)\s+([^,.!?]+)/gi), (match) => match[1].trim());

  return {
    task: /\b(rebuild|recreate)\b/.test(lower) ? "rebuild" : /\b(cleaner|polish|revamp|refine|improve)\b/.test(lower) ? "refine" : /\b(change|edit|adjust|update)\b/.test(lower) ? "edit" : "create",
    layoutType: /\b(shop|store)\b/.test(lower) ? "shop" : /\binventory\b/.test(lower) ? "inventory" : /\b(spatial|holog|three[- ]panel)\b/.test(lower) ? "spatial" : /\b(window|panel|screen|interface|gui|ui)\b/.test(lower) ? "window" : "unspecified",
    platform: /\broblox\b/.test(lower) ? "Roblox" : /\bwindows|desktop\b/.test(lower) ? "Desktop" : /\bweb|website\b/.test(lower) ? "Web" : "Generic",
    style: styleTerms.filter((term) => lower.includes(term)),
    literalCopy,
    contentRequirements: contentTerms.filter((term) => lower.includes(term)),
    preservationRules,
    forbiddenChanges,
  };
}

export function copyForRole(intent: ParsedDesignIntent, role: LiteralCopyRole, fallback: string) {
  return intent.literalCopy.find((item) => item.role === role)?.text ?? fallback;
}
