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

## 2026-09-12 — Skill casting animation improvements

- Active goal: 技能释放动画改进.
- Current checkout is clean at 961cb12. Review found premature effect removal on hit, sound-duration-driven early settlement, frame-based canvas motion, fixed 400x300 buffers, and target coordinates that ignore the centered monster grid.
- Requirements: distinct cast/travel/impact/tail phases; actual monster/caster anchors at all screen sizes; deterministic elapsed-time rendering and bounded pixel density; once-only hit/completion with interruption cleanup; coverage for current active skill keys and existing legacy effects; reduced-motion behavior; browser proof of visual phases and HP timing in real battle components.
- The backend currently selects one active skill per round. Preserve that contract; do not invent extra casts or change combat outcomes.

## 2026-09-19 — Mage equipment catalogue and matching set art prompts

- Request: remove warrior/ranger equipment now that only the mage remains. User explicitly chose permanent removal of owned legacy gear, and requested complete mage sets with matching art prompts, without collection bonuses. Images will be generated by the user in ChatGPT.
- Paired API work is in `/Users/sam/Code/DogeOW/rpg-api`: removed 89 physical/class-specific definitions; retained 54 mage/shared items; added seven eight-piece sets at levels 1, 15, 25, 45, 65, 85 and 100. Total catalogue: 110 items. Set names: 学徒、月华、星辉、奥术、天空、禁地、永恒.
- Two new migrations remove old instances, equipment/socket references and discoveries (clamping HP/MP without reviving dead characters), then add the mage sets. Set insertion uses icon identity and auto-generated database IDs so existing dynamic gems are not overwritten. No live database or deployment was changed.
- Preserved the in-progress item-presentation/export tooling. Full prompts are generated from the same source definitions into `docs/mage-sets-prompts.md`; refreshed `output/item-art/catalogue.json`. Each set shares its palette, materials, emblem, gemstone and lighting, with individual silhouettes and stable filenames. No images were generated.
- Frontend uses mage-appropriate labels and fallback icons, displays collection descriptions in inventory/compendium details, and fits details to narrow screens. Fixed compendium fetch side effects during render and the empty image source fallback encountered during browser validation.
- Validation: API full suite 45 tests / 1197 assertions passed; frontend full suite 45 files / 327 tests passed; TypeScript and targeted ESLint passed. Existing JSDOM canvas warnings remain unrelated to this catalogue change. Four focused backend tests cover cleanup, data preservation, repeatable insertion, complete sets, API compendium/drop data, actual loot creation and equipping.
- Bundled web-game client executed with isolated API fixtures and DOM-backed `render_game_to_text`. Browser checks passed at 320/768/1440 pixels for category counts, sky/forbidden detail dialogs and inventory descriptions, without horizontal overflow or console errors. Screenshots inspected. Evidence: `/tmp/rpg-mage-validation/`. Fixtures intentionally use fallback icons while artwork is pending.
- Remaining delivery steps: deploy both repositories and run the new migrations when requested; user generates the 56 set images using the provided prompts and reference workflow, then assets can be installed. Changes are not committed or pushed.

### Follow-up — Distinct equipment construction, not palette variants

- User supplied two generated robes with the same high collar/cape/bell sleeves/flared skirt and a Legend of Mir-style inventory reference showing substantially different silhouettes.
- Replaced the shared eight-piece shape templates with 56 individually authored construction prompts in the API's `mage-set-designs.php`. Garments now use seven different cuts: short wrap tunic, straight narrow-sleeve changshan, asymmetric half-cloak, boxy sleeveless ritual vest, feather mantle, hooded poncho/shroud and a fitted split coat with separate long panels. Matching weapons/headwear/accessories echo each collection through their own shapes.
- Updated clothing names, preserved all IDs, asset keys, levels and stats, and regenerated the full prompt file and art catalogue. Added `docs/mage-outfits-prompts.md` with just the seven garment prompts for easier initial generation.
- Export instructions now separate cross-set silhouette variation from within-set material consistency, and require checking the generated silhouettes before generating accessories. No new images generated or visually validated in this follow-up.
- Validation: four focused API tests passed (501 assertions); export audit confirmed 56 distinct full prompts and seven garment prompts, all aligned with source definitions and unchanged gameplay data. No deployment or database writes.

## 2026-09-19 — Complete pixel RPG asset rollout

- Final approved direction: seven pixel-art elements (metal, wood, water, fire, earth, wind, thunder), with eight equipment slots per set. User subsequently authorized pixel monsters/maps, renaming and reassignment, and pushing both repositories after validation; close the completion-check automation after delivery.
- Generated with built-in image_gen: 7 equipment sheets, 4 common-item sheets, 8 monster sheets and 8 map sheets. All 27 source sheets and their prompts are retained under `output/pixel-rpg/`; paths are repository-relative for rebuilding.
- Split and normalized 274 assets: 110 items at 64×64 (56 set pieces + 54 shared items), 123 monsters at 96×96, 41 maps at 256×256. Individual PNGs total 1,343,066 bytes. Pixel alpha is binary with at least two pixels of padding; all files pass size/checksum/nonempty/alpha/boundary checks. Full contact sheets were visually reviewed.
- Canonical gear series: 磐石（土）、青藤（木）、沧澜（水）、烈阳（火）、鎏金（金）、流风（风）、雷霆（雷）. Legacy set keys and item stats/levels are retained. No set bonuses added.
- Eight world chapters now have thematic names and three suitable monsters per map. Stable IDs preserve character positions and discoveries. A chapter-based equipment level cap fixes the previously unreachable high-level gear while preserving monster combat stats and the character-level gate.
- Frontend uses an all-assets-ready manifest to switch legacy CDN/numbered/new URLs to local PNGs, disables image resampling for pixel art, and keeps pixel backgrounds crisp. Fixed narrow monster details and uses full-body square sprite frames in combat.
- API migrations back up affected tables before retiring old equipment, create the new sets, and update world names/art/distribution. PostgreSQL item sequences are advanced past explicit historical IDs; legacy numbered item icons remain keyed by definition ID after removal. Deployment enters maintenance and stops old workers around the backup/migration window, with failure cleanup.
- Validation: 49 API tests / 1504 assertions pass; 330 frontend tests pass on the final implementation; TypeScript, ESLint and production build pass. Real API fixtures are exported from an isolated in-memory database; browser checks cover 274 HTTP image responses, 320/768/1440 widths, map changes, both compendiums, gear details and inventory, with no console errors or horizontal overflow. The bundled web-game client and screenshots were inspected.
- Upgrade rehearsals passed on SQLite and a disposable PostgreSQL server (127.0.0.1:55439, now stopped), covering backup contents, permanent retirement cleanup, retained mage items, IDs/location/discoveries, full world/set counts and PostgreSQL sequence advancement. Evidence: `output/pixel-rpg/upgrade-*-rehearsal.json` and `output/pixel-rpg/validation/`.
- Implementation and local verification are complete, including the corrected narrow monster dialog and full-body sprite frames. Delivery proceeds frontend first, then API, with GitHub Actions, remote file checksums and clean-tree checks. Publish results are recorded in ignored `output/pixel-rpg/delivery.local.json` so recording the release does not trigger a second deployment. Close heartbeat `rpg` once both repositories are delivered. No live database changes were executed locally.

## 2026-09-19 — Pixel skill icon follow-up

- User requested redesigning the skill icons to match the approved pixel artwork. The current mage seed defines 10 effect keys (9 active spells and 1 key passive), shared across 37 skill-tree nodes.
- Generated one five-column, two-row sheet with built-in image_gen; split into 10 transparent 64×64 PNGs. Fireball, ice arrow, frost nova, lightning, chain lightning, shield, meteor, arcane missile, elemental cataclysm and arcane resonance have distinct silhouettes and palettes. Retained the source sheet and concise actual prompt in `output/pixel-rpg/`.
- Extended the existing asset builder, manifest and gallery with a skills category. Old canonical/CDN skill URLs resolve to the local pixel images. SkillIcon keeps the full glyph visible, accepts cached query-string URLs, and scopes load failures to their source so switching spells recovers correctly.
- No backend or gameplay changes. The existing 274 asset checksums are unchanged; the 10 skill PNGs total 10,296 bytes. All 284 images pass checksum, dimensions and alpha/padding checks.
- Validation: 335 frontend tests passed; TypeScript, ESLint and production build passed. Actual skill API fixtures from isolated SQLite cover all 37 nodes and the 9 active battle-bar icons at 320/768/1440 widths, including toggling skills, pixel rendering, image loading and no overflow/console errors. Bundled web-game client run and screenshots were inspected. Evidence: `output/pixel-rpg/validation/skills/`.
- Delivery follows the existing user authorization to push completed pixel work. Publish verification is tracked in ignored `output/pixel-rpg/delivery.local.json`; the previous completion automation remains closed.

## 2026-09-19 — Compact battle statistics

- User requested reducing the tall statistics area below the battle map. All six metrics now place the label and value on the same line, use shorter per-minute units, and share a compact borderless layout. The arena's own width controls the layout: two rows in narrow panels, one row from 44rem. Full numerical values remain available in accessible labels and hover text.
- Browser measurements at 320/390/639px: 112px to 51px (54% shorter); at 640px: 78px to 51px (35%); at 768/1024/1440px: 78px to 33px (58%). Existing statistics calculations and update timing are unchanged.
- Validation: 10 existing farm-statistics/combat tests passed; TypeScript, ESLint and production build passed. Production-mode Playwright checked seven viewport widths, loading/zero/large values, label/value alignment, all six cells, and horizontal overflow. No browser console errors. The bundled web-game client also passed; narrow/wide screenshots and state output were inspected. Evidence: `output/farm-stats-compact/`. API fixtures are isolated and no live account data was changed.
- Frontend delivery continues under the user's existing push authorization. No API changes are needed; the previous completion automation remains closed.

## 2026-09-19 — Level-first compendium and numeric battle resources

- User requested level-first item ordering and removal of the visible HP/生命/魔法 labels in the battle arena. The API now orders active items by required level, then type, then ID for stable ties. Category filters preserve that order. Discovered and undiscovered items share the same ordering.
- Monster HP and player HP/MP values are centered above their existing resource bars. Accessible names and player hover text retain resource meanings; visible labels are removed.
- Validation: 8 existing battle component tests and 5 mage catalogue API tests (504 assertions) pass; TypeScript, ESLint, Pint and production build pass. Actual controller responses exported from an isolated in-memory database verify all 110 item sort keys. Browser checks at 320/390/768/1440px confirm sorted all/category views, numeric-only arena displays, unclipped sample HP/MP, no horizontal overflow or console errors. Screenshots and the bundled web-game client's screenshot/text state were inspected. Evidence: `/tmp/rpg-order-labels/`.
- Both repositories will be committed and pushed under existing authorization; delivery is recorded in ignored `output/pixel-rpg/delivery.local.json`.
