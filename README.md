# Crash Auto Bet

Chrome side-panel UI for configuring BC.GAME Crash auto-bet strategies.

This version focuses on strategy configuration UI plus a **live Crash Histories** feed.

- Strategies / Settings: configuration only (Start/Stop is simulated)
- Strategy skills are organized as **strategy packs** under `src/strategy-packs/`
- Histories: reads completed rounds from an open `bc.game/game/crash` tab via a content script
- It does **not** place bets or call undocumented BC.GAME APIs

## Develop

```bash
npm install
npm run dev
```

## Build extension

```bash
npm run build
```

Then open Chrome → Extensions → Load unpacked → select the `dist` folder.

After updating, reload the extension and refresh the Crash tab once. The side panel is enabled only on BC.GAME Crash pages.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — type-check + production build to `dist`
- `npm run lint` — ESLint
