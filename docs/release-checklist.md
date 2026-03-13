# GravityJS Animations Release Verification Matrix

This checklist captures the **minimum** verification required before publishing a new GravityJS Animations release.

## 1. Automated checks (required)

- `npm test`
  Runs the full build (`npm run build`), Vitest suite, and type-level checks via `tsc`.
- `npm run format:check`
  Ensures ESLint passes on `src` and `tests` without mutating files.

All automated checks must pass before proceeding.

## 2. Manual / integration checks

| Area | Goal | How to verify |
| --- | --- | --- |
| **Browser / CDN (UMD)** | Confirm the UMD build works when loaded from a CDN and exposes `window.GravityJS`. | Open a minimal HTML page (for example based on the README quick-start) that loads `https://unpkg.com/gravityjs-animations/dist/gravityjs.umd.js`, initialises components via `GravityJS.initComponents()`, and confirm UI components behave as expected in at least one modern Chromium-based browser and one Firefox version. |
| **TypeScript imports + types** | Confirm `gravityjs-animations` resolves correctly as a TypeScript module and that public APIs have the expected types. | Run `npm run test:types` and ensure the type-check-only project (e.g. `tests/types/entrypoint-types.ts`) compiles without errors and that editors/IDE tooling show types for the default and named exports as documented in the README. |
| **React integration** | Validate that GravityJS Animations works in a React environment using the documented integration pattern. | In a small React example (e.g. Vite or CRA) that mirrors the **React** snippet in the README Framework Integration section, import `initComponents` from `gravityjs-animations`, call it in an effect, and render a few `data-gravity-*` elements. Confirm the app builds and the physics behaviours work in the browser. |
| **Vue integration** | Validate that GravityJS works in a Vue 3 environment. | In a small Vue 3 example that mirrors the **Vue 3** snippet in the README, call `initComponents` on mount and teardown on unmount, then render `data-gravity-*` elements. Confirm the app builds and animations behave correctly. |
| **Angular integration** | Validate that GravityJS works in an Angular environment. | In a small Angular example that mirrors the **Angular** snippet in the README, call `initComponents` in `ngOnInit` and teardown in `ngOnDestroy`, then render `data-gravity-*` elements. Confirm the app builds and animations behave correctly. |

## 3. Release admin

After all checks above pass:

- Update `CHANGELOG.md` with the new version entry and a summary of changes.
- Ensure README examples remain accurate (CDN URL, import paths, and framework snippets).
- Tag the release in git and publish to npm.
