import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const cli=fileURLToPath(new URL("../node_modules/next/dist/bin/next",import.meta.url));
const result=spawnSync(process.execPath,[cli,"build",...process.argv.slice(2)],{stdio:"inherit",env:{...process.env,CREATORMAKE_NETLIFY_BUILD:"true"}});
if(result.error)throw result.error;
process.exit(result.status??1);
