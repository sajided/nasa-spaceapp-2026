# Phase 4 test run — Return home

Chapters 9–10 and SEP-9 to SEP-12, tested against [`testcase.md`](../../testcase.md)
TC-P4-01 to TC-P4-14 on 2026-09-23. The Phase 0–3 suites and RG-01..08 ran as regression.

**Build:** Phase 4 working tree, 2026-09-23. The project is not a git repository; the
Playwright run logs are the record.
**Automated environment:** Playwright, headless Chromium, SwiftShader WebGL, 1280×800,
against both `vite preview` and `vite dev`.

## Verdict

**The mission plays end to end, forward and backward, and every automated P0 case passes.**
That is the PRD's Phase 4 exit. Formal exit under the verdict rule is still waiting on
measurements that need real hardware:

| Case | Why it is open |
| --- | --- |
| TC-P4-14 (fps) | RP-3 on the reference laptop and phones across chapters 9–10. SwiftShader holds 60 fps and says nothing about real GPUs. |
| TC-P4-10 (phone half) | The forward pass at reading pace on a phone. |
| TC-P4-13 (full length) | The 15-minute run. The six-cycle version passes in the suite; the full run is `LONG_SESSION=1` and has not been run. It is P1. |

Phase 3's open manual checks carry over unchanged: TC-P3-11 comprehension, RP-3, and the
real-GPU terrain pass.

## Results

| ID | Pri | Result | Evidence |
| --- | --- | --- | --- |
| TC-P4-01 SEP-9 ascent stage liftoff | P0 | **Pass** | RP-1/RP-2 from the separation loop. `return.spec` checks: descent stage in `surface-site` from liftoff to the end; neither stage moves at the handover (< 0.1 m); footpads on the site ground (< 1 cm) up to 8 million m downrange; descent stage in view on the look back. |
| TC-P4-02 Rendezvous and redocking | P0 | **Pass** | Columbia–Eagle distance falls at every one of 9 samples from TPI to contact. Apex-to-tunnel gap is between −0.05 and 0.7 m. The docked offset is constant to the jettison. Reverse separates them. |
| TC-P4-03 SEP-10 jettison | P0 | **Pass** | The crew-transfer callout window ends before the SEP-10 window opens; the stage is still docked during it. RP-1/RP-2 from the loop. |
| TC-P4-04 Trans-Earth injection | P0 | **Pass** | Marker glow (`spsBurn`) > 0.5 in the burn. The marker is in lunar orbit before it and > 10,000 km out 12 h after. The return line is drawn. The Moon's apparent size shrinks and the Earth's grows across the coast. |
| TC-P4-05 SEP-11 SM jettison | P0 | **Pass** | SM detached and CM in its flight frame before entry interface. CM attitude π (apex down) before, 0 (heat shield down) by entry. Reverse reattaches both. |
| TC-P4-06 Reentry plasma | P1 | **Pass**; bloom **N-A** until Phase 5 | Plasma rises from entry to peak (> 0.9) and falls to 0 before the drogues. The wake's visible bounds sit above the heat shield. Bloom is Phase 5 work (EffectComposer); recorded here rather than waived. |
| TC-P4-07 SEP-12 parachutes | P0 | **Pass** | Apex cover → drogues → mains strictly in order. The mains open one at a time, and exactly three are open and attached. Descent rate: free fall 142 m/s → drogues 80 m/s → mains 8.9 m/s. Reverse repacks every chute and the cover onto the CM. |
| TC-P4-08 Splashdown | P0 | **Pass** | At maximum scroll, progress is exactly 1 and MET is the end anchor. Splash > 0.5 at impact. Mains released. The heat shield sits a draft under the waterline (±0.3 m). The capsule is still when idle. |
| TC-P4-09 Only the CM remains | P0 | **Pass** | RP-4 at the end matches the `FINAL_STATE` table in `tests/e2e/helpers.ts` for all 23 separating parts. `CM` is the only part with the active role; every other part is discarded, on the Moon, or an empty container. |
| TC-P4-10 Full forward pass | P0 | **Pass** (automated); phone pending | 61 steps from 0 to 1: object count constant, no duplicates, no NaN, every final parent as expected, console clean. |
| TC-P4-11 Full reverse pass | P0 | **Pass** | The same 61 steps back: the final dump equals the initial dump; the rocket is whole on the pad. Also `reattach.spec` TC-P1-12. |
| TC-P4-12 Random access | P0 | **Pass** | 20 seeded positions reached by slider jump and by continuous scroll give identical RP-4 dumps, and screenshots within 0.5% of pixels. |
| TC-P4-13 Long session | P1 | **Pass (6 cycles)**; 15 min pending | `long-session.spec`: dump unchanged, heap < 1.2× baseline, pace ≥ 0.8× baseline. |
| TC-P4-14 Phase 4 performance | P0 | **Pass (budget)**; fps pending | Draw calls stay far under 150: about 58 on the surface at the start of chapter 9, 11 or fewer from the rendezvous on (the peak is still 70, on the pad). Triangles: 39,000 on the ocean, 77,000 over the Moon. |

### Cross-cutting regression (RG)

| ID | Result | Notes |
| --- | --- | --- |
| RG-01/02 Forward and reverse passes | Pass | `return.spec` TC-P4-10/11, `reattach.spec` |
| RG-03 Flick-scroll | Pass | `separation-order.spec`, all 12 separations |
| RG-04 Random access | Pass | TC-P4-12 (20 values, with screenshots) and `determinism.spec` |
| RG-05 Stop mid-separation | Pass | `separation-order.spec` TC-P1-11, all 12 |
| RG-06 Console clean | Pass | Dev and preview |
| RG-07 Memory | Pass | TC-P1-13 and TC-P4-13 |
| RG-08 Frame rate | Pending | Real devices |
| RG-09 / RG-10 | N-A | UI in Phase 5; reduced motion in Phase 6 |

## Defects found and fixed during the phase

**BUG-04 · TC-P2-10 / TC-P2-03 · Major, in Phase 2's code.** The outbound coast ended
138,000 km from the Moon, so the marker jumped that far at LOI. Two causes:
- The trajectory was rotated about Z to tilt it, which swung its far end off the
  Earth–Moon axis.
- The TLI burn was a straight blend from the far side of the parking orbit, so the marker
  passed through the Earth.

*Fix* (`src/data/orbits.ts`):
- The tilt is now about the Earth–Moon line.
- The parking orbit is phased so TLI happens facing the Moon.
- Every path segment starts where the last one ends.

A scripted check confirmed it: at TLI, LOI, TEI and entry the marker moves at most 8 km
per second of mission time, and it never passes inside the Earth. The Phase 2 orbit
baselines were regenerated and reviewed.

**BUG-05 · found in Phase 4 · Minor.** The Earth map (20 km per texel, false-colour
topography) smeared into streaks when seen obliquely from 400 km.
*Fix:* the backdrop is procedural ocean under cloud, which matches the Pacific the CM
came down over.

**BUG-06 · found in Phase 4 · Minor.** Heavy shader programs compiled the first time
their chapter came into view. That caused a hitch mid-scroll, and under parallel test
load it produced scroll-test timeouts.
*Fix:* `renderer.compileAsync` warms every program after first paint and before the page
reports ready.

**Also changed deliberately:** Phase 1's full-strength separation flash is a 13 m sphere.
It is held at 0.35 for SEP-9 on the surface and 0.3 for SEP-12's apex cover.

## Test-suite changes

- **New:** `return.spec.ts` (20 tests) and `long-session.spec.ts` (1).
- **Visual baselines:**
  - Ten new ones: `18-ascent` to `27-splashdown`.
  - SEP-9..12 flash and drift, from the separation loop.
  - Regenerated and reviewed: the Phase 2 orbit shots (BUG-04) and `15-touchdown`. With
    ascent keys after touchdown, the landing spline now arrives at zero velocity.
- **Helpers:**
  - `ATTACHMENT_PARENTS` gives the parent per attachment index. It is checked against the
    page by a new debug call.
  - `SEPS` derives from/to from that table.
  - `FINAL_STATE` (TC-P4-09) replaces `FINAL_PARENT`.
- **Adapted:** `met.spec` ends at splashdown; TC-P2-10 checks at LOI-2; `idle.spec` adds
  five chapter 9–10 positions.

## Working values to verify in TC-P5-17

The new METs in `src/data/mission.ts`:
- ascent liftoff and insertion
- CSI and TPI
- the redock and the ascent-stage jettison
- TEI
- MCC-5
- SM jettison
- entry interface
- the drogue and main deploys
- splashdown

`src/data/reentry.ts` is stylised above entry interface: SM jettison is placed at 400 km so
the Earth fills the shot, where the real one was about 3,000 km out.
