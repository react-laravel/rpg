Original prompt: 战斗界面，地图会挡住顶部的信息条

## Current work

- Root cause: the fixed status header used z-20 while the map selector used z-30.
- Raised the status header to z-60 and reserved 3rem for it at mobile widths.
- TypeScript check passed.
- Status-header component tests passed (2/2).
- Reproduce the combat layout at the screenshot viewport after production deploy.
- Verify the change with the bundled Playwright web-game client and inspect its screenshot.

## Related follow-up

- Complete the Nginx compatibility redirect for cached relative RPG image URLs.
