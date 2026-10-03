/**
 * Native Next/Netlify builds do not have Cloudflare Worker bindings. Keeping a
 * deliberately empty environment makes optional D1-backed routes return their
 * existing 503 configuration response while the browser-to-local Studio bridge
 * continues to operate on 127.0.0.1:32145.
 */
export const env:{DB?:D1Database}={};
