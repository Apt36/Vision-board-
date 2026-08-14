# Matt OS

A personal operating system — a mobile-first PWA whose job is to make sure every important part of life gets its turn, without requiring manual management every day.

> Work is important. But work is not the project. **You are the project.**

## What it does

- **Today screen** — date, work schedule, day type (work/off), a capacity score, dynamically generated priorities, an "avoid today" list, the Life Radar, and a steering note.
- **"What should I do?"** — a rules engine that reads the actual stored data (schedule, time of day, sleep, energy, meals, neglected domains, weekly priorities) and returns a concise, situation-aware recommendation. If you're exhausted after an 11–7 shift, the correct answer is *Eat. Shower. Connect. Sleep.* — and that's what it says.
- **Capacity system** — baseline from the work schedule (off day ≈ high, 11–7 ≈ low/medium, 9–5 ≈ low), adjusted by sleep, energy, and back-to-back demanding days. It exists to prevent overload, not to punish.
- **Daily check-in** — under 60 seconds, autosaving, reloads today's entry if it exists. Sleep, energy, meals, exercise, steps, weight, French, reading, career, connection, creative, notes.
- **Life Radar** — recent attention (not performance) per domain over the last 7 days, normalized to each domain's expected weekly effort. Neglected domains feed directly into daily priorities and the steering note.
- **Weekly reset** — week stats plus 3–5 protected priorities that shape daily recommendations.
- **Goals & Projects** — full CRUD, including **maintenance mode** (Accora Brain ships in it): capture ideas/bugs, occasional sessions, never daily prioritization.
- **Sections** — Body (weight trend, workday meal average for the weight-gain goal), Career (applications, interviews, real estate licence), French (streak, minutes, practice mix), Money (direction, not budgeting), Creative (footage/clips/ideas/published), Mind (reading, reflection, therapy log), Routines (editable core anchors).
- **Settings** — editable work schedule (drives everything), custom domains, JSON export/import, reset.

## Stack

React 18 + TypeScript + Vite, no backend. State lives in `localStorage` behind a small store (`src/store.ts`) consumed via `useSyncExternalStore`. All calculations are pure functions in `src/logic/` — capacity, attention/radar, recommendations, week stats — cleanly separated from the UI in `src/screens/`.

PWA via `vite-plugin-pwa` (offline precache, installable, standalone display, generated icons).

## Run

```bash
npm install
npm run dev       # local dev
npm run build     # type-check + production build
npm run preview   # serve the build
node scripts/smoke.mjs  # browser smoke test (needs a Chromium binary; edit the path at the top)
```

## Install on iPhone

Open the deployed URL in Safari → Share → **Add to Home Screen**. It runs standalone, offline, with all data on-device.
