# The Monuments We Left Behind — Apollo 11

An interactive 3D story for children aged 6–9, made for the NASA Space Apps Challenge
("Abandoned but not forgotten"). The Earth and the Moon follow Apollo 11 and every piece of
the ship it let go of: the stages in the Atlantic, the S-IVB circling the Sun, the Descent
Stage still standing at Tranquility Base. Underneath is a scroll-driven, cinematic replay of
the whole mission.

- [`docs/story.md`](docs/story.md): the script, fact check and sources.
- [`apollo-11-prd.md`](apollo-11-prd.md): the product definition (see "Story mode").
- [`testcase.md`](testcase.md): the test plan.

**Status: Phases 0–4 built, plus story mode.** The full mission runs from Pad 39A to the
Pacific with all twelve separations. Story mode is the default: the prologue, the epilogue,
dialogue, the Monument Album, the weight meter, "Let go!" and the playback controls.
`?story=0` gives the classic replay that the mission specs run against.

Content still to come:
- Voice recordings. Until they exist, the browser's own text-to-speech reads each line (a different voice for the Earth and the Moon), or the page reads as text where the browser has no English voice.
- Final fact sign-off. Items are marked † in the script.

## Running it

```bash
npm install
npm run dev          # http://localhost:5173 — debug panel on by default
npm run build        # typecheck + production build
npm run preview      # serve the build on :4173
npm run test:e2e     # builds, then runs the whole suite (~6 min)
npm run prepare:engines   # re-extract the F-1 engine from NASA's model
npm run prepare:textures  # re-download and downsize the Earth and Moon maps
npm run prepare:audio     # recordings/<lineId>.wav → public/audio (needs ffmpeg)
npm run size         # check dist/ against the budgets in docs/asset-budget.md
```

URL switches:
- `?story=0`: classic mode, the mission replay without the children's layer.
- `?debug=1`: skips the start screen. Add `&start=1` to bring it back.

Append `?debug=1` to a production build to enable the debug panel and `window.__apollo`.
Both are stripped from a normal production load. With debug on, **D** logs the RP-4 scene
dump to the console, and `?quality=low|medium|high` sets the particle tier (a stub until
Phase 6 detects it).

> **npm cache note.** `~/.npm/_cacache` on this machine contains root-owned entries that
> make `npm install` fail with EACCES. `.npmrc` points npm at a project-local cache to work
> around it. To fix it properly: `sudo chown -R 501:20 "$HOME/.npm"`, then delete `.npmrc`.

## How it works

```
scroll / slider  ──▶  master timeline  ──▶  state objects  ──▶  reconciler  ──▶  Three.js
                      (anime.js)            (plain JS)          (idempotent)
```

**Scene state is a pure function of timeline progress.** anime.js animates plain JS state
objects, never Three.js objects. Once a frame, the reconciler (`src/core/reconcile.ts`)
reads those objects and makes the scene match: it decides parenting by comparing desired
against current, and rewrites each transform wholesale from data.

Nothing is driven by "this event fired" — which is the point. The PRD's biggest risk is
reverse scrolling through separations, and a callback that calls `scene.attach()` once
going forward and never un-fires strands a stage at the scene root. Deriving the scene
from progress instead means the same progress gives the same scene whether it was reached
by slow scroll, flick-scroll, the debug slider or a test seek.

Scroll is the single source of truth. The debug slider and `__apollo.seek()` set *scroll
position* and let the value flow back through the same path, because the scroll observer
re-seeks the linked timeline on every scroll frame and would clobber a direct seek anyway.

## Layout

| Path | What |
| --- | --- |
| `src/core/` | renderer, stage, render loop, timeline, progress, reconciler, clip planes, quality tier |
| `src/chapters/` | one module per chapter plus the ordered registry |
| `src/scene/` | the Saturn V, the LM, the pad, the F-1 engines, the Earth–Moon system, the lunar surface, the moonwalk cast, the effects |
| `src/data/` | vehicle dimensions and docking geometry, mission timing, the descent profile, moonwalk routes, callouts, separation specs, viewpoints |
| `src/ui/` | HTML overlays: the SLOW-MO badge and the callout card |
| `src/ui/story/` | story mode: speech bubbles and portraits, album, Resting Places map, "Let go!", weight meter, controls, start screen, epilogue beats, about panel |
| `public/audio/`, `public/images/` | voice-over (with `manifest.json`) and the LRO photograph |
| `scripts/` | the F-1 extraction pipeline and the size-budget check |
| `src/style/` | palette tokens and environment lighting |
| `src/debug/` | debug panel and the `window.__apollo` test API |
| `tests/e2e/` | Playwright specs, named for the `testcase.md` cases they cover |
| `docs/` | visual style decision, asset budget and baselines |

## What is built

| Chapter | Covers | Separations |
| --- | --- | --- |
| 0 Prologue *(story mode)* | Scene 1: Earth and the lonely Moon; then the pad | — |
| 1 Launch | T-8 s to T+2:35 | — |
| 2 Staging | T+2:42 to orbit | S-IC · interstage · escape tower · S-II |
| 3 Earth orbit and TLI | Parking orbit, the burn for the Moon | — |
| 4 Transposition and docking | The CSM turns around and extracts the LM | SLA panels · CSM · LM extraction |
| 5 Translunar coast | Seventy-one hours, three beats | — |
| 6 Lunar orbit insertion | The braking burn behind the Moon | — |
| 7 Descent | Undocking to "The Eagle has landed" | LM undock |
| 8 Moonwalk | Hatch open to hatch closed | — |
| 9 Ascent | Liftoff, rendezvous, redocking | Descent stage left behind · ascent stage jettison |
| 10 Return | TEI to splashdown | Service Module · apex cover |
| 11 Epilogue *(story mode)* | Scene 7: the warm Moon, the real LRO photo, the laser, the map, "what would you leave?" | — |

### Separations are data, and a part can have more than two homes

All seven run through one function (`src/core/separation.ts`); the rows in
`src/data/separations.ts` are what differ. Nothing fires a callback: a separation is a
tween on a plain `attachment` index, and the reconciler turns its crossing into a
re-parent by comparing the parent a part wants against the one it has.

A part carries an **ordered list** of places it can live, not a home and an away. That is
what lets the Lunar Module be extracted *into the CSM* rather than adrift — a destination
that is neither of the two a boolean could express — and it is what Phase 4's ascent
stage, which docks and is then jettisoned, will need.

### Two scales, one depth range

The vehicle is 110 m; the Earth–Moon distance is 384,400 km. Rather than a logarithmic
depth buffer or a second render pass, the system frame is measured in units of 1,000 km,
which puts both frames inside `near 0.05 / far 3000`:

```
              vehicle frame (metres)     system frame (1,000 km)
  subject     110-unit stack             Earth r 6.371, Moon r 1.737
  camera      50–4,000 units             10–900 units
```

Only one frame is visible at a time, so they cannot interpenetrate. The switch is a hard
cut taken where the stack is about twenty pixels tall and the marker is sized to match —
the marker is scaled from camera distance so it holds a constant screen size, which is
what makes the cut invisible.

**The floating origin now has a stated boundary.** The vehicle holds the origin in the
vehicle frame, where every separation happens; in the system frame, where none do, the
marker moves along a fixed trajectory and the bodies stay put. `lod.spec.ts` asserts that
every one of the seven separations happens at vehicle scale.

### Mission time is the unit

Events place themselves by MET (`src/data/mission.ts`), and a piecewise map stretches
scroll around separations and compresses it everywhere else. The extremes are worth
seeing together: six seconds of S-IC separation take 4% of the page, and the seventy-one
hours of translunar coast take 13%. That ratio is what the SLOW-MO badge announces.

## Verification

127 assertions across 17 spec files, about three and a half minutes.

Phase 0 and Phase 1 cases run as regression, retargeted where Phase 2 legitimately
changed the answer — jettisoned parts now report `vehicle-frame` rather than the scene
root, progress 1 is lunar orbit rather than orbital insertion, and the adapter panels
start on the SLA rather than the stack.

| Case | Covered by |
| --- | --- |
| TC-P2-01 Earth sphere and texture | `system.spec.ts` — textures load before ready, no failed requests |
| TC-P2-02 Parking orbit | `system.spec.ts` — altitude constant, path curves rather than drifting |
| TC-P2-03 TLI burn | `system.spec.ts` — engine cold, lit, then out; reverses correctly |
| TC-P2-04 SEP-5 adapter panels | `separations.spec.ts` — four named panels, RP-1 each, reverse closes them |
| TC-P2-05 SEP-6 CSM turnaround | `separations.spec.ts` — modules share the CSM parent, rotation reverses |
| TC-P2-07 SEP-7 LM extraction | `separations.spec.ts` — the LM's parent goes `stack` → `CSM` and back |
| TC-P2-08 Trajectory line | `lod.spec.ts` — the marker advances monotonically toward the Moon |
| TC-P2-09 Coast pacing | the coast is the shortest of the six chapters by weight |
| TC-P2-10 Moon and LOI | `system.spec.ts` — closed orbit above the surface, burn fires |
| TC-P2-12 Full-range continuity | `reattach.spec.ts` — full reverse restores the dump exactly |
| TC-P2-13 Scale transitions | `lod.spec.ts` — never both frames, switches where intended, separations always at vehicle scale |
| TC-P2-14 Performance | `launch-perf.spec.ts` — 61 draw calls peak against a 150 ceiling |

## Five things later phases should not rediscover

**anime.js composition will silently freeze a part.** Its default `composition: 'replace'`
means creating a second animation on the same property of the same target cancels the
first. Chapters are separate nested timelines animating shared state objects, so the
default makes an earlier chapter's tween die the moment a later chapter touches the same
property — the part freezes at a stale value while everything around it keeps moving, and
which value you get depends on the route taken. `composition: 'none'` in the shared tween
defaults (`src/core/timeline.ts`) is what prevents it. This cost half a day to find.

**Every tween declares an explicit `[from, to]` pair.** A tween that omits its start value
resolves it at *build* time, and a chapter cannot see where the previous chapter left a
value. Stating both ends keeps a chapter's output dependent only on its own local progress.
For the camera, `ctx.cameraTo()` threads the `from` through for you.

**A chapter boundary must be an exact fraction, not a decimal.** Chapter bounds come from
integer weights, so a boundary at 10/30 is not 0.333 — and an anchor written as the
decimal lands a fraction of a millisecond on the wrong side, where the guard below
correctly rejects it.

**A shared object animated by more than one chapter is a bug waiting to happen.** Three
chapters wanted to move the spacecraft marker, and a chapter's tweens write their *start*
value whenever that chapter renders at its own time zero — so once the viewer had reached
lunar orbit, scrolling back to the pad left the marker parked at the Moon. Anything that
spans chapters should be derived from progress in one place, the way
`data/orbits.ts#spacecraftAt` is, not tweened in several.

**An event must not straddle a chapter boundary.** A tween placed outside its own chapter
gets a negative position, which anime accepts — and then renders *partially advanced*
whenever that chapter sits at its own time zero. The symptom is a value that is correct on
first arrival and subtly wrong on every revisit, which reads like a determinism bug in the
reconciler rather than a chapter reaching past its slot. `msAt()` in
`src/core/timeline.ts` now throws instead, and the chapter's built duration is checked
against its allotted duration.

## Open questions still outstanding

From the PRD: mission audio in v1 or later; target languages; hosting and domain. Visual
style is settled — see `docs/visual-style.md`.

Still outstanding, and now the most valuable thing to do: **real-hardware frame rates**.
The suite runs under software WebGL and cannot speak to the PRD's 60 fps laptop / 30 fps
phone targets. Procedure RP-3 on real devices, recorded in `docs/asset-budget.md`.
