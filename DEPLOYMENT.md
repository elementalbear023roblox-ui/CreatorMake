# CreatorMake deployment

CreatorMake is developed from the source code in this repository.

The production-ready static web build is generated directly into `site/`. Its entry point is `site/index.html`, with compiled files stored under `site/assets/`. Vercel is configured to serve this `site/` directory; do not place another deployment folder inside it.

After a CreatorMake change is verified, rebuild `site/` and include the updated production files in the repository. Pushing the updated `main` branch triggers the connected Vercel deployment.

Live production site: [https://creatormake-site.vercel.app/](https://creatormake-site.vercel.app/)

## Runtime architecture

- Development frontend: `http://127.0.0.1:5173`, started with `npm run dev`.
- Local bridge: `http://127.0.0.1:32145`, started automatically with development or independently with `npm run bridge`.
- Production frontend: `https://creatormake-site.vercel.app/`, served from `site/`.
- Studio plugin: `CreatorMake-Studio-Local.rbxmx`, which communicates only with the loopback bridge.

The canonical app, bridge, plugin, and protocol versions live in `lib/creatormake-version.js`. The bridge allows the exact production origin and the intended local development origins; it does not use wildcard CORS.
