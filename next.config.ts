import type { NextConfig } from "next";
import { resolve } from "node:path";

const isNetlifyBuild=process.env.CREATORMAKE_NETLIFY_BUILD==="true"||process.env.NETLIFY==="true";
const nextConfig: NextConfig = isNetlifyBuild
  ? {
      turbopack: {
        root: process.cwd(),
        resolveAlias: {
          "cloudflare:workers": "./lib/netlify/cloudflare-workers.ts",
        },
      },
      webpack(config) {
        config.resolve.alias["cloudflare:workers"] = resolve(process.cwd(), "lib/netlify/cloudflare-workers.ts");
        return config;
      },
    }
  : {};

export default nextConfig;
