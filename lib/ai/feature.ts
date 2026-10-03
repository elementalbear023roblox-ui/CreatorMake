/**
 * Server-owned feature switch for the generation workflow.
 *
 * AI remains opt-in while the manual editor is under active development. The
 * browser only receives the resolved boolean; credentials and provider config
 * stay server-side.
 */
export function isCreatorMakeAIEnabled() {
  return process.env.CREATORMAKE_AI_ENABLED?.trim().toLowerCase() === "true";
}

export const AI_DISABLED_MESSAGE =
  "AI generation is temporarily disabled while CreatorMake's manual editor is under development.";
