# AGENTS.md — OneMusic

Guidance for AI agents (and humans) working on this repo. Read this first.

## What it is
OneMusic is a mobile-first web app that streams a user's **OneDrive** music via the
**Microsoft Graph** API. Sign in with a Microsoft account, point it at a folder, and
play/stream/download your audio from any device (phone or desktop). It's an Apple
Music–flavoured single-page app deployed to **GitHub Pages**.

- Live: https://a-vigneshramamoorthy-code.github.io/OneMusic/
- Repo: `A-VigneshRamamoorthy-Code/OneMusic`, deploys from `main` → `docs/`.

## Tech stack
- **React 18 + TypeScript (strict)** + **Vite 5**.
- **styled-components v6** for all styling (no CSS files, no Tailwind).
- **@azure/msal-browser** for Microsoft sign-in (redirect flow).
- Microsoft **Graph v1.0** REST (no SDK) for OneDrive.
- No test framework is set up. "Validation" = typecheck + build + Playwright (see below).

## Commands
- Dev server: `npm run dev` (Vite; runs at `/OneMusic/` base). For Playwright use
  `npm run dev -- --host 127.0.0.1 --port 3000` → http://127.0.0.1:3000/OneMusic/
- Typecheck: `npm run typecheck` (`tsc --noEmit`) — MUST pass; tsconfig is strict
  (`noUnusedLocals`/`noUnusedParameters`), so no unused vars/imports.
- Build: `npm run build` (`tsc --noEmit && vite build`) → outputs to `docs/`.
- After building, `touch docs/.nojekyll` (the build empties `docs/`, wiping it).

## Architecture / conventions
- **Every component lives in `src/components/<Name>/`** split into:
  `<Name>.types.ts` (props) · `<Name>.style.ts` (styled-components) · `<Name>.tsx`
  (markup) · `index.ts` (barrel). Import via the barrel (`from '../MiniPlayer'`).
- **All stateful logic is in hooks** under `src/hooks/`:
  - `useAuth` — MSAL sign-in (redirect), silent token (`ensureAccessToken`).
  - `useLibrary` — folder sync (streaming scan), search/view filtering, album groups,
    ordered playlist, and the localStorage track-list cache.
  - `usePlayer` — the `<audio>` element, play/next/prev/seek/volume, URL resolution.
  - `useDownloads` — offline downloads (IndexedDB) + downloaded-track metadata.
  - `useMediaSession` — lock-screen / background transport controls (iOS).
  - `useNowPlayingSheet` — the full-screen player's open/close + drag-to-dismiss.
  - `useTheme` — accent theme (see Theming).
- **Pure logic** in `src/lib/`: `graph.ts` (Graph calls), `offline.ts` (IndexedDB
  blobs), `trackCache.ts` (localStorage track list), `albumArt.ts` (generated art).
- **Utils** in `src/utils/` (`format`, `tracks`, `errors`); constants in
  `src/config/` (`constants.ts`, `themes.ts`); shared types in `src/types/index.ts`.
- **App.tsx is the composition root**: owns `status`, `isLoading`, `activeTrackId`,
  and `page` ('library' | 'settings'); wires the hooks together.
- **Styling:** styled-components with **transient props** (`$active`, `$open`,
  `$playing`, `$dockPad`, …) so they don't leak to the DOM. Variant styles use the
  `css` helper. **No ThemeProvider** — design tokens are CSS custom properties in
  `src/styles/GlobalStyle.ts` (light + `@media (prefers-color-scheme: dark)`).
  Components reference `var(--brand)`, `var(--heading)`, etc. directly.
- Keep comments minimal — only where they add non-obvious clarity.

## Auth / config (src/config/constants.ts)
- `DEFAULT_CLIENT_ID = 61ca244b-acb8-4bba-b3bf-9829b60d9981`.
- `DEFAULT_TENANT_ID = 'common'` — MUST stay `common`. The org tenant
  `3ff6bc31-…` has no SharePoint/OneDrive (SPO) license, so `/me/drive` fails there.
  Personal Microsoft accounts need `common`.
- Redirect flow (not popup). Scopes: `User.Read Files.Read.All offline_access`.
- Overridable via query params: `?clientId=…&tenant=…&redirectUri=…`.

## CRITICAL gotchas (do not regress these)
1. **Stream, don't blob-download, for playback.** `usePlayer.resolvePlaybackUrl`
   gets `@microsoft.graph.downloadUrl` (via `lib/graph.getStreamUrl`) and sets it as
   the `<audio>` src → instant, range-request streaming. Offline tracks use their
   local blob. There's a blob-download fallback if streaming fails.
2. **`@microsoft.graph.downloadUrl` is omitted when `$select` is used.** GET the
   driveItem WITHOUT `$select` to obtain it. (Using `$select` here previously broke
   all streaming — only downloaded songs played.)
3. **Never route `<audio>` through the Web Audio API / an AudioContext.** iOS
   suspends the context on screen lock, which KILLS background/lock-screen playback
   (and can break track switching). Volume is plain `audio.volume` (a no-op on iOS,
   where hardware buttons control volume; works on desktop/Android). Background
   playback relies on the Media Session API (`useMediaSession`) + plain `<audio>`.
4. **PWA icon must be PNG.** iOS ignores an SVG `apple-touch-icon`. Real PNGs live in
   `public/` (`apple-touch-icon.png` 180, `icon-192.png`, `icon-512.png`) +
   `manifest.webmanifest`; `index.html` references them. Regenerate from
   `public/favicon.svg` (a canvas render → PNG works).
5. **Safe areas.** `index.html` sets `viewport-fit=cover`. The app shell pads with
   `env(safe-area-inset-top/bottom)` so content clears the notch/Dynamic Island and
   home indicator; the Dock also pads the bottom inset.
6. **Album-art breathing animates ONLY the playing track** (`playing={isActive &&
   isPlaying}` in `TrackRow`; the mini-player and now-playing pass `isPlaying`). The
   equalizer/waveform generated art *styles* are static (they just look like
   visualizers).

## UI notes
- **Dock** (`components/TabBar` inside `components/Dock`): one frosted bar of equal,
  evenly-spaced icons — **Home (= songs/library view)**, Albums, Offline, Settings,
  Search. A highlight pill (`S.Indicator`) **slides** to the active tab; it's
  positioned **imperatively** (set `el.style.transform/width` in a `useLayoutEffect`)
  so the CSS transition reliably animates. `activeTab: DockTab` = the view mode or
  `'settings'`. Tapping Search swaps the icons for a search field + Close.
- **Settings is an inline page**, not a modal — shown in `<Main>` when
  `page === 'settings'` (folder Sync, Refresh, accent ThemePicker, Sign out). Home /
  a view icon returns to the library. It auto-opens on first sign-in when there's no
  cached library.
- **Now Playing** (`components/NowPlaying`) is a full-screen, drag-to-dismiss sheet.
- **Theming** (`useTheme` + `config/themes.ts`): accent presets applied as CSS vars
  on `:root` (light+dark ramps), persisted to localStorage; updates the
  `theme-color` meta. The body background glow uses `color-mix(... var(--brand) ...)`
  so it follows the accent. Default accent keeps the exact Apple-Music red.
- **Library cache:** the synced track list (metadata) is saved to localStorage per
  folder (`lib/trackCache.ts`) and loaded on sign-in/reload, so it shows instantly.

## Deploy flow (CI)
- Deployment is automated: **pushing to `main` triggers
  `.github/workflows/deploy.yml`**, which runs `npm ci` + `npm run build` and
  deploys `docs/` to **GitHub Pages** via `actions/deploy-pages` (Pages source =
  "GitHub Actions", not the legacy branch builder).
- `docs/` is **gitignored** — it's a build artifact produced in CI. Don't commit it.
- To ship: commit source changes as author **"Vignesh Ramamoorthy"** with trailer
  `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`, then
  `git push origin main`. Watch the run in the repo's Actions tab; poll the live URL
  for the new `index-<hash>.js` bundle.
- You can still build locally to verify (`npm run build` → `docs/`), but you no
  longer need to commit `docs/` or `touch .nojekyll`.
- **Visibility:** the account is on **GitHub Free**, where **Pages requires a public
  repo**. Keep OneMusic public, or Pages/the deploy will stop working. (Making it
  private needs GitHub Pro/Team/Enterprise; alternatively host from a private repo on
  Netlify/Vercel/Cloudflare Pages.) The `origin` remote embeds the username
  (`https://A-VigneshRamamoorthy-Code@github.com/...`) so git uses the
  `repo`+`workflow`-scoped token (editing workflow files needs the `workflow` scope).

## Validating without a Microsoft account (demo seed)
Real OneDrive audio/sign-in can't be exercised in CI/agents. To validate the
signed-in UI, temporarily seed a fake account + tracks:
- Add a `src/__demo.ts` exporting `isDemoMode()` (`?demo=1`), `demoAccount`
  (cast to `MsalAccount`), and `demoTracks`.
- Gate initial state on `isDemoMode()` in `useAuth` (account/authState),
  `useLibrary` (tracks), and `App` (isLoading) with `// TEMP-DEMO` markers.
- Run the dev server and drive it with Playwright at 390px (mobile) + 1280px.
- **Remove all `// TEMP-DEMO` wiring and delete `src/__demo.ts` before building/
  deploying.** (grep for `TEMP-DEMO`/`__demo`/`isDemoMode`.)
- Real audio won't play in demo (fake ids); to test "is playing" UI, dispatch a
  `play` event on the `<audio>` element.

## Environment (this machine)
- macOS with Homebrew + `gh` available; git author is "Vignesh Ramamoorthy".
- Playwright MCP browser tools are used for UI validation.
