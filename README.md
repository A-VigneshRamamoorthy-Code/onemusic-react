# OneMusic

OneMusic is a polished, mobile-friendly React + Vite web app that signs in to Microsoft and streams audio files directly from OneDrive using Microsoft Graph. The interface follows an Apple Music–inspired design (pink-red accent, generated album art, full-screen now-playing).

## Run locally

- `npm install`
- `npm run dev`

## Connect OneDrive

The app is preconfigured with the requested Microsoft Entra app registration client ID and tenant, so opening it locally is enough to start the sign-in flow:

- `http://localhost:3000/OneMusic/`
- Or the deployed GitHub Pages URL.

If you need to use a different app registration, you can still override the defaults with query parameters such as `?clientId=YOUR_APP_ID&tenant=common`.

The app requests the delegated scopes `User.Read`, `Files.Read.All`, and `offline_access` and uses silent token refresh when possible. It signs in with the Microsoft **redirect** flow (not a popup) so it works reliably on GitHub Pages, and uses the `common` authority so personal Microsoft accounts resolve to their own OneDrive.

## Choose a folder and sync

Scanning an entire OneDrive can be slow, so after signing in you pick which folder to scan:

- A fixed `My files /` prefix (the OneDrive root) is shown, and you type the rest of the path, e.g. `Music/Melody`.
- Press **Sync** (or Enter) to scan just that folder and its subfolders for audio files.
- Tracks stream into the list **as they are discovered**, so you can start playing before the scan finishes.
- Leave the field blank to scan the whole OneDrive (slower).
- After a successful sync the folder panel collapses; reopen it any time with the **folder** button in the header. **Refresh** re-syncs the current folder.

## Player

- Each track gets a unique, procedurally generated album-art tile (vinyl, equalizer, waveform, sunburst, or note-mesh), so a missing cover never looks empty.
- A persistent **now-playing bar** sits at the bottom; tap it to open a **full-screen player** with large album art, scrubber, and transport controls.
- The **Media Session API** is wired up (metadata, artwork, play/pause/next/previous/seek), so playback continues when an iPhone is locked and shows on the lock screen / Control Center.

## Design

- Apple Music–inspired palette built on the design-system tokens (`--brand` etc.), with automatic light/dark mode.
- Mobile-first, responsive layout; motion respects `prefers-reduced-motion`.

