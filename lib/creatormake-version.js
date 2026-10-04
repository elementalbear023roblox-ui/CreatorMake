/**
 * Canonical CreatorMake application and sync compatibility versions.
 *
 * The web application, localhost bridge, plugin generator, and diagnostics all
 * import this module. Change versions here instead of copying values elsewhere.
 */
export const CREATORMAKE_VERSION = Object.freeze({
  app: "1.1.2",
  bridge: "1.1.2",
  plugin: 14,
  protocol: 8,
  productionOrigin: "https://creatormake-site.vercel.app",
  bridgeOrigin: "http://127.0.0.1:32145",
});

export const CREATORMAKE_APP_VERSION = CREATORMAKE_VERSION.app;
export const CREATORMAKE_BRIDGE_VERSION = CREATORMAKE_VERSION.bridge;
export const CREATORMAKE_PLUGIN_VERSION = CREATORMAKE_VERSION.plugin;
export const CREATORMAKE_PROTOCOL_VERSION = CREATORMAKE_VERSION.protocol;
export const CREATORMAKE_PRODUCTION_ORIGIN = CREATORMAKE_VERSION.productionOrigin;
export const CREATORMAKE_BRIDGE_ORIGIN = CREATORMAKE_VERSION.bridgeOrigin;
