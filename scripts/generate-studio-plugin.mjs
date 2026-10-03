import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CREATORMAKE_PLUGIN_VERSION, CREATORMAKE_PRODUCTION_ORIGIN, CREATORMAKE_PROTOCOL_VERSION } from "../lib/creatormake-version.js";
import { createRobloxPluginModel, creatorMakePluginFilename } from "../lib/roblox/plugin.ts";

const origin = process.env.CREATORMAKE_WEB_ORIGIN ?? CREATORMAKE_PRODUCTION_ORIGIN;
const outputPath = resolve(process.argv[2] ?? `artifacts/${creatorMakePluginFilename(origin)}`);

await mkdir(dirname(outputPath), { recursive: true });
const model = createRobloxPluginModel(origin);
await writeFile(outputPath, model, "utf8");

console.log(JSON.stringify({ outputPath, bytes: Buffer.byteLength(model), origin, pluginVersion: CREATORMAKE_PLUGIN_VERSION, protocolVersion: CREATORMAKE_PROTOCOL_VERSION }));
