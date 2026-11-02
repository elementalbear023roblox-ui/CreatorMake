import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { CREATORMAKE_PLUGIN_VERSION, CREATORMAKE_PRODUCTION_ORIGIN, CREATORMAKE_PROTOCOL_VERSION } from "../lib/creatormake-version.js";
import { createRobloxPluginModel, creatorMakePluginFilename } from "../lib/roblox/plugin.ts";

const origin = process.env.CREATORMAKE_WEB_ORIGIN ?? CREATORMAKE_PRODUCTION_ORIGIN;
const outputPath = resolve(process.argv[2] ?? `artifacts/${creatorMakePluginFilename(origin)}`);
const publicOutputPath = resolve(`public/downloads/${creatorMakePluginFilename(origin)}`);

const model = createRobloxPluginModel(origin);
await Promise.all([
  mkdir(dirname(outputPath), { recursive: true }),
  mkdir(dirname(publicOutputPath), { recursive: true }),
]);
await Promise.all([
  writeFile(outputPath, model, "utf8"),
  writeFile(publicOutputPath, model, "utf8"),
]);

console.log(JSON.stringify({ outputPath, publicOutputPath, bytes: Buffer.byteLength(model), origin, pluginVersion: CREATORMAKE_PLUGIN_VERSION, protocolVersion: CREATORMAKE_PROTOCOL_VERSION }));
