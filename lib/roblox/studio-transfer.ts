import type { RobloxManifest } from "./types.ts";

export const STUDIO_FILE_FORMAT = "creatormake-studio-import";
export const STUDIO_FILE_VERSION = 1;
export const STUDIO_FILE_MAX_BYTES = 8 * 1024 * 1024;

export const STUDIO_GUI_CLASSES = [
  "Frame", "ScrollingFrame", "CanvasGroup", "TextLabel", "TextButton",
  "TextBox", "ImageLabel", "ImageButton", "ViewportFrame", "VideoFrame",
] as const;

export const STUDIO_UI_CLASSES = [
  "UIAspectRatioConstraint", "UICorner", "UIDragDetector", "UIFlexItem",
  "UIGradient", "UIGridLayout", "UIListLayout", "UIPadding", "UIPageLayout",
  "UIScale", "UISizeConstraint", "UIStroke", "UITableLayout", "UITextSizeConstraint",
] as const;

export function createStudioTransferFile(manifest: RobloxManifest): string {
  if (manifest.nodes.some((node) => node.className === "LocalScript")) {
    throw new Error("This project includes enabled button scripts. Use Studio Sync or Lua export to include them.");
  }
  const assets = manifest.assets ?? [];
  const isPublished = (id?: string) => /^rbxassetid:\/\/[1-9]\d*$/.test(id ?? "");
  if (assets.some((asset) => !isPublished(asset.robloxAssetId))) {
    throw new Error("Studio JSON requires permanent Roblox asset IDs for generated images. Map or publish those assets first, or use Studio Sync for a preview.");
  }
  const file = {
    format: STUDIO_FILE_FORMAT,
    formatVersion: STUDIO_FILE_VERSION,
    manifest: {
      ...manifest,
      assets: assets.map(({ sourceId, visualHash, robloxAssetId }) => ({
        sourceId, visualHash, robloxAssetId,
      })),
    },
  };
  const content = JSON.stringify(file);
  if (new TextEncoder().encode(content).byteLength > STUDIO_FILE_MAX_BYTES) {
    throw new Error("This GUI exceeds the Studio JSON size limit. Send it using Studio Sync.");
  }
  return content;
}
