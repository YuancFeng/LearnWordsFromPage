# AGENTS.md

## Cursor Cloud specific instructions

**Project**: LingoRecall AI — a Chrome extension (Manifest V3) for AI-powered vocabulary learning. No backend server; everything runs client-side.

**Tech stack**: TypeScript, React 19, Vite 6, Tailwind CSS, npm

### Key commands

See `package.json` scripts and `README.md` for full details:
- `npm run dev` — Vite dev server on port 3000 (serves popup.html / options.html with HMR)
- `npm run build` — Full production build to `dist/` (popup + content script + background)
- `npm test` — Vitest unit/integration tests (511 tests, all offline with fake-indexeddb + jsdom)
- `npx tsc --noEmit` — TypeScript type checking (no ESLint/Prettier configured)

### Build & extension loading

The build produces 4 separate Vite builds (popup, content IIFE, background-main IIFE, sw-wrapper IIFE) all output to `dist/`. To test as a real Chrome extension, load `dist/` as an unpacked extension at `chrome://extensions/` with Developer Mode enabled.

### Testing notes

- All unit tests run fully offline — Chrome APIs are mocked, IndexedDB uses `fake-indexeddb`.
- No lint tool (ESLint/Prettier) is configured; use `npx tsc --noEmit` for type checking.
- End-to-end extension testing requires loading the built extension into Chrome.
- The core word-analysis feature requires an AI provider (Gemini API key is simplest), but this is **not** needed for unit tests or UI development.

### Dev server caveats

- `npm run dev` serves only popup.html and options.html via Vite HMR. Content scripts and background scripts are NOT served in dev mode — they require a full `npm run build`.
- The Vite dev server binds to `0.0.0.0:3000` (configured in `vite.config.ts`).
