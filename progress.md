Original prompt: 战斗界面，地图会挡住顶部的信息条

## Current work

- Root cause: the fixed status header used z-20 while the map selector used z-30.
- Raised the status header to z-60 and reserved 3rem for it at mobile widths.
- TypeScript check passed.
- Status-header component tests passed (2/2).
- Production deploy completed successfully (GitHub Actions run 29339893283).
- Reproduced the combat screen at 678x800 after selecting the existing character.
- Visually inspected the screenshot: the 46px fixed status bar is unobstructed and the map panel begins below it.
- Realtime verification passed: WebSocket connected, subscribed to `game.14`, and received combat updates.
- Bundled web-game client completed one iteration; its screenshot was inspected.

## Related follow-up

- Installed and committed the Nginx compatibility redirect for cached relative RPG image URLs.
- The exact reported URL now resolves through Upyun with HTTP 200 and `image/png`.
- Separate observation: Upyun audio files need CORS headers for Web Audio fetches; this is unrelated to the layout fix.

## 2026-09-12 — Code, UI, and interaction improvements

- Request: 改进代码，UI，交互逻辑.
- Baseline: 36 test files / 278 tests pass. Working tree started clean.
- Focus: readable status/navigation; reliable map switching with pending/error feedback; repeatable death/revive flow; narrow-screen and keyboard verification.
- Local preview uses port 3015 because port 3001 belongs to other projects. Browser verification uses isolated API fixtures so existing characters are unaffected.

### Completed

- Extracted shared desktop/mobile navigation with keyboard selection, visible active state, and safe-area spacing; moved chat above the mobile navigation.
- Rebuilt the status header with character identity, labeled HP/MP, and per-level experience derived from the API's cumulative thresholds.
- Extracted the map picker into an accessible popover with chapter selection, constrained scrolling, pending feedback, failure retry, and focus restoration.
- Added independent travel/combat action locks; failed stops retain the last confirmed fighting state; stopping preserves selected skills; failed starts can be retried.
- Fixed repeat-death dialogs, successful-only revival dismissal, and stale arena resource displays/timers after revival or round changes.
- Added character-list failure recovery and refresh when reselecting the same character. Fixed dialog description registration during render and aligned dark styles with system appearance.

### Validation

- Final full suite: 41 files, 294 tests passed (`npm test -- --maxWorkers=1`). Earlier parallel runs hit unrelated inventory-test timeouts while the host was busy; the final complete run passed without increasing timeouts.
- ESLint and production build (including TypeScript) passed. Build used the public asset origin already documented in `.env.example`.
- Production-mode Playwright verified 320/375/390/768/1440 widths, all six tabs, keyboard Home/End/Escape, focus restoration, chat placement, map failure/retry/autostart/stop, revival failure/retry, repeated deaths, synchronized revived HP, initial list failure/retry, and same-character reselection.
- Browser scenarios use isolated HTTP/WebSocket fixtures. Their deliberate 503 responses test failure paths; an assumed skill image filename was removed from the fixture in favor of a supported emoji fallback.
- Bundled web-game client was run with a fixture preload and DOM-backed `render_game_to_text`; this existing game uses DOM panels and backend-driven combat rather than a canvas simulation. Screenshots were visually inspected.
- Browser verification files and screenshots: `/tmp/rpg-ui/`. No live account data was changed.
- Implementation and validation are complete. The user subsequently requested committing and pushing these improvements to the current remote branch.
