# CreatorMake

CreatorMake is a visual UI editor with a deterministic Local Generator, optional
server-side OpenAI generation, and local Roblox Studio synchronization.

## CreatorMake AI

Fast AI, Balanced AI, and Precise AI use the OpenAI Responses API exclusively
from server routes. Configure `OPENAI_API_KEY` in the shell, process, or secret
manager that starts the development server, and optionally set
`CREATORMAKE_AI_MODEL`. Generation is intentionally hidden and blocked unless
`CREATORMAKE_AI_ENABLED=true`; the default is `false` while the manual editor
is being developed. `.env.example` documents the variable names only; never
put credentials in CreatorMake project JSON or browser code.

Without a server-side key, CreatorMake reports **Not configured** and does not
silently substitute the Local Generator. Use **Settings → AI → Test Connection**
to verify the provider before generating. `npm run dev` also starts the local
Roblox Studio Sync service on `http://127.0.0.1:32145`.

## Roblox export modes

**Adaptive** is the default export mode. CreatorMake classifies each visible
layer as Native, Hybrid, or Rasterized. Native-safe layers remain editable
Roblox UI objects; unsupported geometry is cropped to a transparent PNG and
placed inside a separate scale-based Frame or ImageButton while preserving the
CreatorMake parent hierarchy. Hybrid text and buttons keep editable native text
when the font and effects have an exact Roblox equivalent. The manifest's
`imageManifest` records bounds, dimensions, aspect ratio, hierarchy,
interaction, class, and visual hash for every generated image.

**Pixel Accurate** remains available as the all-raster regression-safe mode,
and **Native** remains available for users who prefer editable approximations.
The local Studio plugin and sync server must use protocol v7 or newer for
Adaptive image previews. Build the current plugin with `npm run plugin:build`;
the result is written to `artifacts/CreatorMake-Studio-Local.rbxmx`.

The current plugin version is v10. Restart Studio (or reload local plugins)
after replacing the `.rbxmx` file so `/health` can report the new version.
Preview imports are isolated in the local player's `PlayerGui`; permanent
deployments create or update only CreatorMake-managed `ScreenGui` instances in
`StarterGui`, so every player receives the UI without duplicating unrelated
GUIs.

CreatorMake's **Scroll** tool inserts an editable 20-card inventory scaffold.
Its preview scrolls with mouse, trackpad, or touch. Native, Adaptive, and Pixel
Accurate exports keep a real `ScrollingFrame` plus `UIPadding` and
`UIGridLayout`/`UIListLayout`; card and button visuals remain separate assets
instead of being flattened into the scrolling background.

## Project library

CreatorMake projects are stored locally in the browser's IndexedDB database,
not as large `localStorage` values. The Projects dialog includes thumbnails,
created/edited metadata, duplicate, archive, delete, recovery, and file backup
actions. Autosave is debounced and the top bar reports **Unsaved changes**,
**Saving**, **Saved**, or **Save failed** from the actual IndexedDB transaction.
Press Ctrl/Cmd+S to force a save. Backups use the versioned `.creatormake`
JSON envelope and never contain API keys, Roblox tokens, or bundled font files.

Legacy browser projects are normalized to schema 6 on first open.
The one-time migration copies old full-project `localStorage` records into
IndexedDB and removes those large legacy records only after the database
transaction succeeds. Browser storage is origin-scoped, so the Vercel domain
has its own project library; export a `.creatormake` backup before changing
domains or clearing site data.

## Production deployment

CreatorMake is authored as a Next.js App Router application and uses Vinext for
the full local/server build. The public Vercel site uses the verified static
browser build generated directly into the repository's `site/` directory:

```text
Build command: npm run build:site
Publish directory: site
Live URL: https://creatormake-site.vercel.app/
```

`site/index.html` is the deployable entry point; never create a nested upload
folder beneath `site/`. Pushing an updated `main` branch deploys this directory
through the existing Vercel project. `npm run dev` remains the CreatorMake
development command and starts Studio Sync automatically. `npm run bridge`
starts only the localhost companion for the hosted production editor.

Server-only deployment variables are documented in `.env.example`. Configure
`OPENAI_API_KEY` and set `CREATORMAKE_AI_ENABLED=true` only if public AI tools
should be available. Do not create `NEXT_PUBLIC_` copies of secrets. Browser-only
editing, IndexedDB projects, previews, fonts, and `.creatormake` backup work
without AI credentials.

### Hosted site → local Roblox Studio bridge

The Vercel site does not host or replace Studio Sync. The intentional topology
is: hosted browser editor → `http://127.0.0.1:32145` → CreatorMake Studio plugin.
Run `npm run dev` during local development, or `npm run bridge` when using the
hosted editor. The production origin is built into the restricted bridge
allowlist. Additional exact origins can be supplied as a comma-separated list:

```text
CREATORMAKE_TRUSTED_ORIGINS=https://www.example.com
```

The bridge keeps its loopback defaults and rejects other browser origins; never
use a wildcard. CreatorMake treats a failed localhost health request as Studio
Sync offline and keeps the editor/project library usable. Browsers regard
loopback as a potentially trustworthy local endpoint, but enterprise policies
can still block public-to-local requests. Test `/health` in the target browser
and use the visible retry/setup flow—do not proxy Studio credentials through
Vercel or weaken browser security headers.

Before a release, run `npm run test:core`, `npm run build`, and `npm run build:site`,
serve `site/`, then verify reload,
IndexedDB project persistence, font readiness, `.creatormake` export/import,
and the graceful Studio Sync offline state.

## Vinext foundation

A clean full-stack starter running on [vinext](https://github.com/cloudflare/vinext), with optional Cloudflare D1 and Drizzle support.

## Prerequisites

- Node.js `>=22.13.0`
- Portable: Windows, macOS, or Linux; no Bash required
- Managed Linux: managed Linux runtime with Bash, `flock`, `curl`, `sha256sum`, and GNU `timeout`
- Git is required only for publishing

## Sites Lifecycle

The Sites initializer copies the shared starter and selects managed-linux only when `SITES_MANAGED_LINUX_CONTAINER=1`; otherwise it selects portable. It saves the selection only in ignored `.sites-runtime/execution-profile.json`. Both profiles copy/configure first, then use the plugin's separate `install-dependencies.mjs` step to measure installation independently. Edit source under `app/` and follow the Sites skill for installation, preview, builds, and publishing.

Run `node <plugin-root>/scripts/configure-execution-profile.mjs` only when the profile is unknown for the current checkout and environment. Profile changes do not alter tracked source or require reinstalling otherwise-valid dependencies; restart an existing preview to use the new selection. Do not commit or upload `.sites-runtime/`.

This starter does not use `wrangler.jsonc`.

`install:ci` runs `npm ci` once against the shared lockfile, disables parent-workspace discovery, and includes required dev/optional dependencies despite production/omit settings. Sharp defaults to prebuilt binaries unless explicitly configured otherwise. Do not overlap installers.

- **Portable:** Preserve host HOME, npm cache, registry, proxy, temporary paths, retry/concurrency settings, and lifecycle-script policy. Use `--prefer-offline --no-audit --no-fund`.
- **Managed Linux:** Use the existing project-local HOME/cache/tmp setup and Linux install lock, tarball preflight, and timeout. Restore the image-seeded npm cache only when its lockfile hash matches; retain network fallback. Builds keep their existing timeout. These helpers are not invoked by the portable profile.

`scripts/sites-env.mjs` preserves the caller's HOME, npm cache, proxy, XDG, and temporary-directory configuration while defaulting Wrangler and Miniflare state to the checkout. If npm reports an unwritable cache, select a writable path with `npm_config_cache` for that install. The `dev` and `start` scripts also keep Wrangler logs inside the checkout. Generated `.sites-runtime/` and `.wrangler/` directories are disposable and ignored by Git.

On portable, `npm run dev` uses `vinext dev` with HMR, starting at port 5173. Vinext records the running server in ignored `.vinext/` state, rejects an ordinary duplicate launch, and recovers stale state after a stopped process; exactly simultaneous starts can race. Pass `--port <port>` or `--hostname <host>` after `npm run dev --` when needed; keep portable previews on loopback.

For browser QA on managed Linux, use `sites-preview start`. The project's dev script runs Vite and accepts the supervisor's `--host 0.0.0.0 --port 4173 --strictPort` arguments. The internal browser uses `http://terminal.local:4173/`; it is not a user-facing URL. The supervisor owns the preview lifecycle. The ignored local profile survives the supervisor's cleared process environment.

The portable profile simulates ChatGPT sign-in only for loopback development requests. Visit `/signin-with-chatgpt?return_to=/` to sign in as `local_seedy` (`seedy@sites.test`, display name `Seedy`) and `/signout-with-chatgpt?return_to=/` to sign out. The development cookie preserves that identity across server restarts. Mock auth is disabled in the managed-linux profile and is not included in production builds; hosted authentication remains dispatch-owned.

The Worker uses `vinext/server/fetch-handler`, including Vinext's config-aware image handling. After building, `npm start` runs that Worker locally through Wrangler on `127.0.0.1`, sharing `.wrangler/state` with dev preview and local D1 migrations; it does not deploy the site or simulate sign-in. Use the URL printed by the server. Pass `npm start -- --port <port>` to select a different built-preview port.

Local previews use Miniflare's placeholder `Request.cf` metadata without a network lookup. Set `CLOUDFLARE_CF_FETCH_ENABLED=true` to opt into fetching preview metadata; this setting does not change hosted request metadata.

Local tool usage metrics are disabled by default. Set `WRANGLER_SEND_METRICS=true` to opt in.

## Included Shape

- edit site code under `app/`
- `app/chatgpt-auth.ts` provides optional dispatch-owned ChatGPT sign-in helpers
- `.openai/hosting.json` declares optional Sites D1 and R2 bindings
- `vite.config.ts` simulates declared bindings for local development
- `db/index.ts` reads the D1 binding from the Cloudflare Worker environment
- `db/schema.ts` starts intentionally empty
- `@cloudflare/workers-types` provides Worker types; `cloudflare-env.d.ts` declares optional `DB`/`BUCKET` bindings—update these declarations if binding names change
- `examples/d1/` contains an optional D1 example surface
- `drizzle.config.ts` supports local migration generation when needed

## Workspace Auth Headers

Signed-in visitors receive both `oai-authenticated-user-id` and `oai-authenticated-user-email`. Private Sites require every visitor to sign in; public Sites may also have anonymous visitors, for whom neither header is present.

The user ID is stable for the same user on the same Site and different across Sites. Use it as the durable user key; use email and name for display or contact purposes.

SIWC-authenticated workspace sites may also receive `oai-authenticated-user-full-name` when the user's SIWC profile has a non-empty `name` claim. The full-name value is percent-encoded UTF-8 and is accompanied by `oai-authenticated-user-full-name-encoding: percent-encoded-utf-8`.

Treat the full name as optional and fall back to email when it is absent:

```tsx
import { headers } from "next/headers";

export default async function Home() {
  const requestHeaders = await headers();
  const userId = requestHeaders.get("oai-authenticated-user-id");
  const email = requestHeaders.get("oai-authenticated-user-email");
  const encodedFullName = requestHeaders.get("oai-authenticated-user-full-name");
  const fullName =
    encodedFullName &&
    requestHeaders.get("oai-authenticated-user-full-name-encoding") ===
      "percent-encoded-utf-8"
      ? decodeURIComponent(encodedFullName)
      : null;

  const displayName = fullName ?? email;
  // ...
}
```

## Optional Dispatch-Owned ChatGPT Sign-In

Import the ready-to-use helpers from `app/chatgpt-auth.ts` when the site needs optional or required ChatGPT sign-in:

- Use `getChatGPTUser()` for optional signed-in UI.
- Use the returned `userId` as the stable user key for user-owned records; do not use email as a durable identifier.
- Use `requireChatGPTUser(returnTo)` for server-rendered pages that should send anonymous visitors through Sign in with ChatGPT.
- In a Server Component, start sign-in with `<a href={chatGPTSignInPath(returnTo)} target="_top">`. The auth helper module is server-only; do not import it into a Client Component.
- Do not use `fetch`, XHR, a client-side router, or a framework link that can prefetch the sign-in route. SIWC must start as a top-level navigation.
- Never request the AuthAPI authorization endpoint directly. The dispatch-owned `/signin-with-chatgpt` route must start the SIWC flow.
- Use `chatGPTSignOutPath(returnTo)` for browser sign-out links or actions.
- Pass a same-origin relative `returnTo` path for the destination after sign-in or sign-out. The helper validates and safely encodes it.
- Mark protected pages with `export const dynamic = "force-dynamic"` because they depend on per-request identity headers.

Dispatch owns `/signin-with-chatgpt`, `/signout-with-chatgpt`, `/callback`, the OAuth cookies, and identity header injection. Do not implement app routes for those reserved paths. Routes that do not import and call the helper remain anonymous-compatible.

SIWC establishes identity only; it does not prove workspace membership. Use the Sites hosting platform's access policy controls for workspace-wide restrictions, or enforce explicit server-side membership or allowlist checks.

Use SIWC for account pages, user-specific dashboards, saved records, and write actions tied to the current ChatGPT user. Leave public content anonymous.

## Local D1 migrations

For a D1-backed local preview, generate SQL with `npm run db:generate`. Build once through the Sites skill's build entrypoint (or `npm run build` for standalone use) to generate `dist/server/wrangler.json`, rebuilding if bindings change. From the project root, apply each pending migration in order:

```sh
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_example.sql
```

Replace the filename with the pending migration and `DB` with your D1 binding name if different. Use `.wrangler/state`, not `.wrangler/state/v3`; Wrangler adds the versioned directories. Do not replay migrations already applied locally. This updates only the preview database; publishing applies production migrations separately.

## Diagnostic Commands

- `npm run install:ci`: perform the one locked dependency install
- `npm run dev`: start the Vite/Vinext development server
- `npm run build`: build the deployable Sites artifact
- `npm run test:core`: run editor, geometry, Roblox export, sync, and AI tests
- `npm run plugin:build`: rebuild the local Roblox Studio plugin model
- `npm run start`: preview the built Worker locally with D1/R2 support
- `npm run db:generate`: generate Drizzle migrations after schema changes

When using the Sites plugin, follow its skill instructions for installation, builds, and publishing. These npm commands remain available for standalone use.

The portable build runs Vinext directly without a host `timeout` command. The managed-linux build uses `scripts/build-verified.sh` and its existing `SITES_BUILD_TIMEOUT` setting.

## Learn More

- [vinext Documentation](https://github.com/cloudflare/vinext)
- [Drizzle D1 Guide](https://orm.drizzle.team/docs/get-started/d1-new)
