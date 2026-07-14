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
