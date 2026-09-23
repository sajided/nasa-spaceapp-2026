# Phase 3 test run — Landing and moonwalk

Chapters 7–8 and SEP-8, tested against [`testcase.md`](../../testcase.md) TC-P3-01 to
TC-P3-13 on 2026-09-23. The cumulative Phase 0–2 suites ran as regression, as testcase.md
requires from Phase 2 onward.

**Build:** Phase 3 working tree, 2026-09-23. The project is not a git repository, so there
is no hash; the Playwright run logs are the record.
**Automated environment:** Playwright, headless Chromium, SwiftShader WebGL, 1280×800,
against both `vite preview` and `vite dev`.

## Verdict

**Not yet exit-ready.** Every automated P0 and P1 case passes, but three P0 cases can only
be run by people or on real devices and have not been:

| Case | Why it is open |
| --- | --- |
| TC-P3-11 | First-time-viewer comprehension needs three people who do not know the mission. |
| TC-P3-13 (fps half) | RP-3 frame rate on the reference laptop and phones. SwiftShader holds 60 fps and says nothing about real GPUs. |
| TC-P3-05 (real-GPU half) | Terrain pop and horizon were reviewed frame by frame in headless captures; a real-GPU pass at 0.5× scroll is still owed. |

Under the verdict rule (all P0 pass, no failing P1 without a waiver), the phase exits once
those three are recorded.

## Results

`auto` means asserted by the suite; `review` means checked by eye from captured frames;
`manual` means it needs a person or a device.

| ID | Pri | Result | How | Evidence |
| --- | --- | --- | --- | --- |
| TC-P3-01 SEP-8 undocking | P0 | **Pass** | auto | `separations.spec` (RP-1: attach/detach, reverse, 5 scrubs, in shot), `separation-order.spec`, `slowmo.spec`, `landing.spec` (parent handover without movement, both vehicles in shot, exact redock) |
| TC-P3-02 Powered descent | P0 | **Pass** | auto | `landing.spec`: engine above 0.5 at 15 samples from PDI to touchdown, altitude strictly falling, attitude π/2 → 0, monotone across every profile key |
| TC-P3-03 1202 alarm | P0 | **Pass** | auto | `landing.spec`: DSKY card with the plain-language explanation, at 5–15 km altitude, clears on reverse |
| TC-P3-04 Low-fuel callouts | P1 | **Pass** | auto | `landing.spec`: 60 then 30 seconds, in order, the last ending before contact; no callout windows overlap |
| TC-P3-05 Lunar surface terrain | P0 | **Pass (review)**, real GPU pending | review | One continuous mesh, so there is no LOD switch to pop. Frames reviewed at undock, DOI, PDI, 1202, high gate, P66, dust, touchdown, first step, flag and EASEP. |
| TC-P3-06 Touchdown dust | P1 | **Pass** | auto | `landing.spec`: dust above 0.5 at 2.5 m altitude, 0 by engine stop + 10 s, sheet ceiling 0.5 m, footpad clearance within 2 cm at four moments after touchdown |
| TC-P3-07 "The Eagle has landed" | P0 | **Pass** | auto | `landing.spec`: engine at 0, the caption shows, Eagle and the surface static through the hold, the hold gets more scroll than a third of an average descent minute |
| TC-P3-08 Surface camera and figure | P0 | **Pass** | auto | `moonwalk.spec`: camera 0.5–3 m above the regolith at the first step; ladder then boots on the ground; first footprint at the first step and not before; astronaut 1.7–2.1 m, LM/astronaut ratio 3–4.2 |
| TC-P3-09 Flag and experiments | P1 | **Pass** | auto | `moonwalk.spec`: flag → PSEP → LRRR forward, reverse order backward, each cast member exactly once at five moments, flag transform identical across 50 minutes, items on the ground |
| TC-P3-10 NASA LM model | P1 | **N-A** | — | NASA GLB deferred to FR-13 (Could). Using it needs a Blender split into two stages. The procedural LM already carries `LM-descent-stage` / `LM-ascent-stage`, and `LM-ascent-stage` is a registered part ready for SEP-9. |
| TC-P3-11 Comprehension | P0 | **Blocked** | manual | Needs three people unfamiliar with the mission. |
| TC-P3-12 Reverse through the landing | P0 | **Pass** | auto | `landing.spec`: a 12-step pass through chapters 7–8 and back restores the chapter 7 start (dump, surface report, dust, no NaN); a full 0 → end → 0 pass restores the initial dump; console clean |
| TC-P3-13 Phase 3 performance | P0 | **Pass (budget)**, fps pending | auto + manual | Draw calls under 150 everywhere (`perf.spec`, `launch-perf.spec`); dust count follows `?quality=` high 4000 / medium 2000 / low 800; clip planes checked. Real-device RP-3 pending. |

### Cross-cutting regression (RG)

| ID | Result | Notes |
| --- | --- | --- |
| RG-01 Forward pass | Pass | `separation-order`, `landing` full pass |
| RG-02 Reverse pass, dump matches | Pass | `reattach.spec` TC-P1-12, now through all eight separations |
| RG-03 Flick-scroll, 5 cycles | Pass | `separation-order.spec` |
| RG-04 Random access, 20 values | Pass | `determinism.spec` |
| RG-05 Stop mid-separation | Pass | `separation-order.spec` TC-P1-11, including SEP-8 |
| RG-06 Console clean | Pass | Every spec that collects console output, dev and preview |
| RG-07 Memory after 3 passes | Pass | `reattach.spec` TC-P1-13 (heap within 1.5× under SwiftShader) |
| RG-08 Frame rate | Pending | Real devices; see TC-P3-13 |
| RG-09 UI agrees with the scene | N-A | Clock, silhouette, rail and map arrive in Phase 5 |
| RG-10 Reduced motion | N-A | Phase 6 |

## Defects found and fixed during the phase

Two were in earlier phases' code. They were found because SEP-8 depends on the docked
geometry, and the old screenshot baselines had been recorded with the defects in place.

**BUG-01 · TC-P2-06 / TC-P2-07 · Major.** The CM nose sat 3 m inside the LM at docking.
At SEP-7 the LM then jumped about 13 m and flipped onto the SM's engine bell, because its
attachment inside the CSM ignored the CSM's 180° turn.
*Fix:* every docked position now derives from shared constants in `src/data/vehicle.ts`:
`CM_APEX`, `LM_DOCK_HEIGHT`, `CSM_DOCK_Y`, `LM_IN_CSM_Y`, `LM_FLIGHT_Y`. The LM's CSM
attachment carries its own 180° turn.
*Guarded by:* `landing.spec` "the CM apex meets the LM tunnel with no overlap". The docked
and SEP-5 to SEP-7 baselines were regenerated and reviewed.

**BUG-02 · TC-P2-13 · Major.** At both scale-switch handoffs the spacecraft was past the
2,000 m far plane, so the frame was empty at exactly the moment the switch relies on it
being visible.
*Fix:* `src/core/clip.ts` stretches far only when the camera is further from the vehicle
than the default reaches. The Phase 1 baselines are untouched; raising the default instead
exposed the edge of the pad ground during the ascent shots.
*Guarded by:* `lod.spec` "the spacecraft is still drawn at the scale-switch viewpoint".

**BUG-03 · found in Phase 3 code · Minor.** The reconciler writes a part's opacity onto
every material under it, which forced the LM's descent plume and RCS puffs opaque, and the
terrain then painted over them.
*Fix:* effect materials opt out with `ownsOpacity()` in `src/core/reconcile.ts`.

## Test-suite changes

- **New:** `landing.spec.ts` (20 tests) and `moonwalk.spec.ts` (9 tests).
- **Extended:** chapter 7–8 positions in `idle.spec`; six new baselines in `visual.spec`
  (`12-undock` to `17-flag`) plus SEP-8's flash and drift from the separation loop; the
  handoff check in `lod.spec`.
- **Adapted to the eight-chapter page:**
  - `met.spec` now ends at hatch close.
  - The lunar-orbit baseline is taken at LOI-2 rather than at progress 1.
  - `reattach` and `separation-order` check each part's *final* parent, because the LM
    separates twice.
  - Flash checks are relative to each separation's declared `flashPeak`, because undocking
    is a glint, not a pyrotechnic flash.
- **Helpers:** `SEPS` gains `home` and `flashPeak`; `FINAL_PARENT` added.

Totals: 127 tests at the start of the phase, 169 at the end.

## Manual checks still to run

1. **TC-P3-11:** show chapters 7–8 to three people who do not know the mission. Afterwards
   ask what happened, what fell away, and why it was tense. Pass if at least 2 of 3 describe
   the undocking, descent and landing unprompted.
2. **RP-3** on the reference laptop, Android and iPhone across chapters 7–8. Record the
   results in `docs/asset-budget.md`.
3. **TC-P3-05 on a real GPU:** scroll chapter 7 at half speed and look for terrain pop,
   shimmer on the sliding crater field, and horizon shape. Headless captures cannot show
   shimmer.
4. **RP-1 by hand:** with `?debug=1`, press **D** to log the RP-4 dump. Scrub SEP-8,
   touchdown and the flag five times each.

## Working values to verify in TC-P5-17

Every new MET in `src/data/mission.ts` is a working value from the Flight Journal and the
Lunar Surface Journal: undocking, the separation burn, DOI, PDI, the 1202 and 1201 alarms,
high gate, P66, the fuel calls, contact light, hatch open and close, the first step, the
flag and the EASEP deployments. The downrange distances in `src/data/descent.ts` are
stylised.
