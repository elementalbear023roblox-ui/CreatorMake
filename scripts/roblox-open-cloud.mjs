const ASSETS_ORIGIN = "https://apis.roblox.com/assets/v1";
const ASSET_PERMISSIONS_URL = "https://apis.roblox.com/asset-permissions-api/v1/assets/permissions";

const numericId = (value) => typeof value === "string" && /^\d+$/.test(value) ? value : null;
const safeDisplayName = (value) => `CreatorMake - ${String(value || "UI Asset")}`.slice(0, 50);

export function readRobloxPublishingConfig(environment = process.env) {
  const apiKey = environment.ROBLOX_OPEN_CLOUD_API_KEY?.trim() || null;
  const accessToken = environment.ROBLOX_OPEN_CLOUD_OAUTH_ACCESS_TOKEN?.trim() || null;
  const creatorType = environment.ROBLOX_CREATOR_TYPE?.trim().toLowerCase() || null;
  const creatorId = numericId(environment.ROBLOX_CREATOR_ID?.trim());
  const authMode = accessToken ? "oauth" : apiKey ? "api-key" : "not-configured";
  const configured = authMode !== "not-configured" && (creatorType === "user" || creatorType === "group") && creatorId !== null;
  return {
    configured,
    authMode,
    creatorType,
    creatorId,
    apiKey,
    accessToken,
    missing: [
      ...(authMode === "not-configured" ? ["ROBLOX_OPEN_CLOUD_API_KEY"] : []),
      ...((creatorType !== "user" && creatorType !== "group") ? ["ROBLOX_CREATOR_TYPE=user|group"] : []),
      ...(creatorId === null ? ["ROBLOX_CREATOR_ID"] : []),
    ],
  };
}

export function publicRobloxPublishingConfig(config) {
  return {
    configured: config.configured,
    authMode: config.authMode,
    creatorType: config.creatorType,
    creatorId: config.creatorId,
    assetAccess: "current-experience",
    missing: config.missing,
    oauth: {
      status: config.authMode === "oauth" ? "configured" : "future-hosted-flow",
      scopes: ["asset:read", "asset:write", "asset-permissions:write"],
    },
  };
}

const authHeaders = (config) => {
  if (config.authMode === "oauth" && config.accessToken) return { Authorization: `Bearer ${config.accessToken}` };
  if (config.authMode === "api-key" && config.apiKey) return { "x-api-key": config.apiKey };
  throw new Error("Roblox Open Cloud publishing is not configured.");
};

async function jsonResponse(response, label) {
  const text = await response.text();
  let value = null;
  try { value = text ? JSON.parse(text) : {}; } catch { /* handled below */ }
  if (!response.ok) {
    const detail = value?.message || value?.error?.message || value?.error || text || response.statusText;
    throw new Error(`${label} failed with HTTP ${response.status}: ${String(detail).slice(0, 1_000)}`);
  }
  if (!value || typeof value !== "object") throw new Error(`${label} returned invalid JSON.`);
  return value;
}

export async function grantRobloxImageUseToUniverse({ assetId, universeId, config, fetchImpl = fetch }) {
  if (!config?.configured) throw new Error("Roblox Open Cloud publishing is not configured.");
  const normalizedAssetId = numericId(String(assetId ?? ""));
  const numericAssetId = normalizedAssetId ? Number(normalizedAssetId) : NaN;
  if (!normalizedAssetId || !Number.isSafeInteger(numericAssetId)) throw new Error("A valid Roblox asset ID is required before sharing an image.");
  const normalizedUniverseId = numericId(String(universeId ?? ""));
  if (!normalizedUniverseId) throw new Error("The open Roblox Studio experience does not have a usable universe ID.");
  const response = await fetchImpl(ASSET_PERMISSIONS_URL, {
    method: "PATCH",
    headers: { ...authHeaders(config), "content-type": "application/json" },
    body: JSON.stringify({
      subjectType: "Universe",
      subjectId: normalizedUniverseId,
      action: "Use",
      requests: [{ assetId: numericAssetId, grantToDependencies: false }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  const result = await jsonResponse(response, "Roblox asset permission grant");
  const succeeded = Array.isArray(result.successAssetIds) && result.successAssetIds.some((value) => String(value) === normalizedAssetId);
  const failure = Array.isArray(result.errors) ? result.errors.find((item) => String(item?.assetId ?? "") === normalizedAssetId) : null;
  if (failure || !succeeded) {
    const detail = failure?.code ? ` (${failure.code})` : "";
    throw new Error(`Roblox did not grant experience ${normalizedUniverseId} Use permission to image ${normalizedAssetId}${detail}.`);
  }
  return { assetId: normalizedAssetId, subjectType: "Universe", subjectId: normalizedUniverseId, action: "Use", response: result };
}

export async function createRobloxImageAsset({ pngBytes, filename, displayName, config, fetchImpl = fetch }) {
  if (!config.configured) throw new Error(`Roblox Open Cloud publishing is not configured: ${config.missing.join(", ")}.`);
  if (!(pngBytes instanceof Uint8Array) || pngBytes.byteLength === 0) throw new Error("Rendered PNG bytes are missing.");
  const creator = config.creatorType === "group" ? { groupId: config.creatorId } : { userId: config.creatorId };
  const request = {
    assetType: "Image",
    displayName: safeDisplayName(displayName),
    description: "Generated by CreatorMake",
    creationContext: { creator },
  };
  const form = new FormData();
  form.append("request", JSON.stringify(request));
  form.append("fileContent", new Blob([pngBytes], { type: "image/png" }), filename || "creatormake.png");
  const response = await fetchImpl(`${ASSETS_ORIGIN}/assets`, {
    method: "POST",
    headers: authHeaders(config),
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const operation = await jsonResponse(response, "Roblox asset creation");
  if (typeof operation.path !== "string" || !/^operations\/[a-zA-Z0-9._-]+$/.test(operation.path)) {
    throw new Error("Roblox asset creation did not return a valid operation path.");
  }
  return operation;
}

export async function waitForRobloxAssetOperation(operationPath, { config, fetchImpl = fetch, timeoutMs = 120_000, pollIntervalMs = 1_000, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)) } = {}) {
  if (!config?.configured) throw new Error("Roblox Open Cloud publishing is not configured.");
  if (typeof operationPath !== "string" || !/^operations\/[a-zA-Z0-9._-]+$/.test(operationPath)) throw new Error("Invalid Roblox operation path.");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const response = await fetchImpl(`${ASSETS_ORIGIN}/${operationPath}`, {
      headers: authHeaders(config),
      signal: AbortSignal.timeout(15_000),
    });
    const operation = await jsonResponse(response, "Roblox asset operation");
    if (operation.error) throw new Error(`Roblox asset operation failed: ${JSON.stringify(operation.error).slice(0, 1_000)}`);
    if (operation.done === true) {
      const assetId = numericId(String(operation.response?.assetId ?? ""));
      if (!assetId) throw new Error("Roblox completed the operation without returning a usable asset ID.");
      return { assetId, robloxAssetId: `rbxassetid://${assetId}`, operation };
    }
    await sleep(pollIntervalMs);
  }
  throw new Error(`Roblox asset operation timed out after ${Math.ceil(timeoutMs / 1_000)} seconds.`);
}
