# Apollo 11 Interactive Journey — Test Cases

Companion to [apollo-11-prd.md](apollo-11-prd.md). Version 1.0 — 2026-09-22.

Test cases are grouped by development phase (0–6). Each phase's suite must pass before that phase's exit criteria are considered met. Phase suites are cumulative: from Phase 2 onward, all earlier phase suites run as regression.

## How to use this document

| Field | Meaning |
| --- | --- |
| ID | `TC-P<phase>-<nn>`. Stable — never renumber; retire with `(retired)` instead. |
| Type | Functional, Visual, Interaction, Performance, Accessibility, Accuracy, Compatibility, Regression |
| Priority | P0 = blocks phase exit. P1 = must fix before launch. P2 = fix if time allows. |
| Traces | PRD requirement (FR-n), separation event (SEP-n), chapter (CH-n), or metric being verified |
| Result | Pass / Fail / Blocked / N-A, with build number and date |

**Verdict rule:** a phase exits when every P0 case passes and no P1 case is failing without a written waiver.

### Conventions used in the steps

- **"Scroll to X"** means drive the scroll container to the position where the master timeline reports the progress value for X — by mouse wheel in manual runs, by the debug slider (Phase 0) when precision is needed.
- **"Reverse"** means scroll backward through the same range at roughly the same speed.
- **"Scrub"** means move forward and backward repeatedly across an event boundary, at least 5 times, including stopping mid-event.
- **Reference devices:** *Laptop* = mid-range laptop, integrated GPU, Chrome. *Phone* = recent mid-range Android and a recent iPhone, Chrome and Safari respectively.

### Reusable procedures

**RP-1 — Separation integrity check.** For any separation event *n*: scroll forward through the event, then reverse past it, then scrub it 5 times. After each pass verify (a) the spent part is in the correct parent (scene root after, original parent before), (b) its world position and rotation match the reference screenshot within a visually indistinguishable margin, (c) no duplicate or orphaned part exists in the scene graph, (d) console is free of errors, (e) part count in the scene graph matches the expected count for that timeline position.

**RP-2 — Four-beat rhythm check.** For any separation event: confirm the four beats play in order — engine glow fades, joint flashes with a brief pause, spent piece drifts back and tumbles with randomized rotation, next engine ignites and camera eases forward — and that the SLOW-MO badge is visible for the duration of the event and hidden outside it.

**RP-3 — Frame rate sample.** Record a 30-second capture of the range under test with the browser performance panel. Report median fps, 1% low fps, and the count of frames over 33 ms. Run on Laptop and Phone.

**RP-4 — Scene graph dump.** With a debug key, log the scene graph as a flat list of `name → parent → world position`. Used as the evidence artifact for RP-1.

---

## Phase 0 — Setup and foundations

*Exit: scrolling up and down moves the cube smoothly and reversibly.*

### TC-P0-01 — Project builds and serves
**Type:** Functional · **Priority:** P0 · **Traces:** Architecture (Vite)
**Steps:** Clean clone, install dependencies, run dev server; then run production build and serve the output.
**Expected:** Dev server starts with no errors; production build completes; both render the scene identically; no console errors or warnings in either.

### TC-P0-02 — Scene renders with camera and lights
**Type:** Visual · **Priority:** P0
**Steps:** Load the page.
**Expected:** Three.js canvas fills the viewport, test cube visible and lit, render loop running continuously (frame counter advances).

### TC-P0-03 — Scroll drives timeline progress forward
**Type:** Interaction · **Priority:** P0 · **Traces:** FR-1
**Steps:** Scroll from the top of the page to the bottom in one continuous motion.
**Expected:** Timeline progress advances monotonically from 0 to 1; cube motion tracks scroll position with no visible lag or snap; progress readout matches scroll percentage within 1%.

### TC-P0-04 — Scroll drives timeline progress backward
**Type:** Interaction · **Priority:** P0 · **Traces:** FR-1
**Steps:** Scroll to the bottom, then scroll back to the top.
**Expected:** Progress decreases monotonically to 0; cube returns to its exact starting transform; no drift after 3 full forward/backward cycles.

### TC-P0-05 — Debug slider matches scroll
**Type:** Functional · **Priority:** P0
**Steps:** Set the debug slider to 0.25, 0.5, 0.75. Then scroll to the same three positions.
**Expected:** Scene state is identical whichever input set the progress value; the slider reflects scroll-driven changes and vice versa.

### TC-P0-06 — Chapter sub-timeline pattern
**Type:** Functional · **Priority:** P0
**Steps:** Create two stub chapter sub-timelines with known durations and add them to the master timeline in order. Query the master timeline for each chapter's start and end progress.
**Expected:** Chapter boundaries are where the sum of durations puts them; a chapter can be run in isolation in a test harness without the master timeline; adding, removing, or reordering a chapter does not require editing another chapter's code.

### TC-P0-07 — Rapid input does not break sync
**Type:** Interaction · **Priority:** P1
**Steps:** Flick-scroll hard in both directions, use keyboard Page Up/Down, and drag the scrollbar thumb to random positions 20 times.
**Expected:** No stuck state, no progress value outside 0–1, no NaN in any animated property, console clean.

### TC-P0-08 — Resize and orientation
**Type:** Compatibility · **Priority:** P1
**Steps:** Resize the window from 360 px wide to full desktop width; rotate a phone between portrait and landscape.
**Expected:** Canvas and camera aspect update without stretching; scroll progress is preserved across the resize.

### TC-P0-09 — Baseline performance
**Type:** Performance · **Priority:** P1 · **Traces:** 60 fps / 30 fps metrics
**Steps:** RP-3 on the skeleton scene.
**Expected:** Laptop 60 fps sustained, Phone 60 fps (headroom is expected at this stage; record the number as the baseline for later comparison).

### TC-P0-10 — Visual style decision recorded
**Type:** Functional · **Priority:** P1 · **Traces:** Open question
**Steps:** Check the repository for the style decision.
**Expected:** One of Mission Control retro / blueprint wireframe / cinematic realism is chosen and written down with reference images; the test cube uses the chosen palette.

---

## Phase 1 — Launch prototype

*Exit: a viewer can scroll from pad to orbit and back with all four separations correct. Go/no-go checkpoint.*

### TC-P1-01 — Stack is built as named groups
**Type:** Functional · **Priority:** P0 · **Traces:** Scene graph
**Steps:** RP-4 on the intro state.
**Expected:** A parent `Group` contains exactly these named children: S-IC, interstage, S-II, S-IVB, IU, SLA, LM, SM, CM, LES. Names match the PRD spelling exactly. No unnamed or duplicate groups.

### TC-P1-02 — Stack proportions
**Type:** Accuracy · **Priority:** P1
**Steps:** Compare the rendered silhouette against a scaled Saturn V reference diagram.
**Expected:** Relative stage heights are within 10% of the real vehicle; the stack reads as recognisably Saturn V at the intro camera distance.

### TC-P1-03 — Liftoff from the pad
**Type:** Visual · **Priority:** P0 · **Traces:** CH-1
**Steps:** Scroll from progress 0 through the liftoff range.
**Expected:** Hold-down release then upward motion with believable acceleration; launch tower and pad remain in place and fall away below; no interpenetration between rocket and tower.

### TC-P1-04 — Exhaust, smoke and camera shake
**Type:** Visual · **Priority:** P1 · **Traces:** FR-12
**Steps:** Observe the liftoff range at 0.5× scroll speed.
**Expected:** Engine glow present at the F-1 bells only, smoke billows from the flame trench and disperses, camera shake is strongest at liftoff and decays with altitude, and shake never pushes the vehicle out of frame.

### TC-P1-05 — Separation function is reusable
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2
**Steps:** Inspect the implementation of the four separations.
**Expected:** All four call one shared function parameterised by part name, direction, flash type and timing; adding a fifth separation requires only a configuration entry, not new animation code.

### TC-P1-06 — SEP-1 S-IC separation
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-1
**Steps:** RP-1 and RP-2 on the S-IC separation.
**Expected:** F-1 glow fades, retro-rockets flash at the joint, S-IC drifts back and tumbles, S-II ullage then J-2 ignition follows, camera eases forward. Reverse restores S-IC to the stack parent at its original local transform.

### TC-P1-07 — SEP-2 Interstage ring jettison
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-2
**Steps:** RP-1 and RP-2 on the interstage jettison.
**Expected:** Fires roughly 30 s of mission time after SEP-1 and clearly separately from it; the ring slides down past the J-2 engines without clipping them; reverse restores it.

### TC-P1-08 — SEP-3 Launch Escape Tower jettison
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-3
**Steps:** RP-1 and RP-2 on the LES jettison.
**Expected:** The LES fires its own motor and pulls away upward and to the side, taking the boost protective cover with it as one unit; the CM windows are revealed afterwards; reverse restores both LES and cover together.

### TC-P1-09 — SEP-4 S-II separation
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-4
**Steps:** RP-1 and RP-2 on the S-II separation.
**Expected:** J-2 cluster glow fades, joint flashes, S-II falls back and tumbles, S-IVB single J-2 ignites; reverse restores it.

### TC-P1-10 — Separation order under fast scroll
**Type:** Interaction · **Priority:** P0 · **Traces:** FR-1, FR-2
**Steps:** Flick-scroll through the whole launch range in under one second, then reverse the same way. Repeat 5 times.
**Expected:** All four separations resolve in order; no part is left attached that should be gone, and none is missing that should be present; RP-4 dump at the end matches the dump from a slow scroll to the same position.

### TC-P1-11 — Stopping mid-separation
**Type:** Interaction · **Priority:** P0
**Steps:** Stop scrolling exactly during beat 2 (the flash) of each separation and hold for 10 seconds. Then continue forward; on a second run, reverse instead.
**Expected:** The scene holds a coherent frozen frame — no looping flash, no part drifting on its own while scroll is idle; continuing either direction resumes correctly.

### TC-P1-12 — Re-attach stores the original parent
**Type:** Functional · **Priority:** P0 · **Traces:** Risk "reverse scroll breaks separated stages"
**Steps:** Inspect the separation state for each of SEP-1 to SEP-4 after a forward pass; then reverse fully to progress 0 and RP-4.
**Expected:** Each separated part recorded its original parent before `scene.attach()`; after full reverse the scene graph dump is byte-identical to the initial dump.

### TC-P1-13 — Repeated scrubbing does not accumulate error
**Type:** Regression · **Priority:** P0
**Steps:** Scrub each separation boundary 20 times, then return to progress 0.
**Expected:** Positions and rotations match the initial state; no growth in object count; memory use returns to within 10% of baseline after garbage collection.

### TC-P1-14 — Camera path through staging
**Type:** Visual · **Priority:** P1
**Steps:** Scroll the whole launch range at reading pace.
**Expected:** The camera eases between viewpoints — never cuts; the separating part stays in frame for the whole four-beat sequence; no camera clipping through geometry; no roll that makes the horizon spin unintentionally.

### TC-P1-15 — SLOW-MO badge
**Type:** Visual · **Priority:** P1 · **Traces:** Separation rhythm
**Steps:** Watch the badge across all four separations, forward and reverse.
**Expected:** Appears at beat 1, disappears after beat 4, in both directions; never appears outside a separation.

### TC-P1-16 — No physics drift when idle
**Type:** Functional · **Priority:** P0
**Steps:** Hold scroll still for 60 seconds at five different positions, including just after a separation.
**Expected:** Nothing animated by the timeline moves. Only intentionally idle-animated elements (particles, glow flicker) change.

### TC-P1-17 — Launch-range performance
**Type:** Performance · **Priority:** P0 · **Traces:** 60 fps / 30 fps metrics
**Steps:** RP-3 across the launch range including all four separations.
**Expected:** Laptop median 60 fps with no frame over 33 ms during separations; Phone 30 fps or better. Draw calls under 150 at every sampled frame.

### TC-P1-18 — Go/no-go review
**Type:** Functional · **Priority:** P0
**Steps:** Run TC-P1-01 through TC-P1-17 on a fresh build, on Laptop and both Phones.
**Expected:** All P0 cases pass. If reverse-scroll integrity (TC-P1-12, TC-P1-13) fails on any device, the phase does not exit and the approach is reconsidered per the PRD risk table.

---

## Phase 2 — To the Moon

*Exit: continuous scroll from liftoff to lunar orbit.*

### TC-P2-01 — Earth sphere and texture
**Type:** Visual · **Priority:** P0 · **Traces:** CH-3
**Steps:** Scroll into the Earth orbit chapter.
**Expected:** Earth renders with the NASA texture, correct axial orientation, terminator lighting consistent with the scene's sun direction; no visible texture seam or pole pinching at the camera distances used.

### TC-P2-02 — Parking orbit
**Type:** Visual · **Priority:** P0 · **Traces:** CH-3
**Steps:** Scroll through the parking orbit range.
**Expected:** The stack follows a smooth curved path around Earth at a consistent altitude; motion reads as orbit, not as a straight drift.

### TC-P2-03 — TLI burn
**Type:** Visual · **Priority:** P0 · **Traces:** CH-3
**Steps:** Scroll through the TLI range, then reverse.
**Expected:** S-IVB J-2 relights with visible glow, path bends away from Earth, burn ends cleanly; reversing extinguishes the glow and returns the vehicle to the parking orbit path.

### TC-P2-04 — SEP-5 SLA panels open
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-5
**Steps:** RP-1 and RP-2 on the SLA panel opening.
**Expected:** Four panels hinge outward like petals and then release; each panel is individually named in the scene graph; reverse folds them back to the closed position with no gap or overlap.

### TC-P2-05 — SEP-6 CSM separates and turns around
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-6
**Steps:** RP-1 and RP-2 on the CSM separation, watching the turnaround closely.
**Expected:** CSM moves clear, rotates a full 180°, and returns facing the LM; the rotation eases rather than snapping; reverse plays the turnaround backwards without the model ending up mirrored or off-axis.

### TC-P2-06 — Docking alignment
**Type:** Visual · **Priority:** P0 · **Traces:** CH-4
**Steps:** Scroll slowly through the docking moment; pause at contact.
**Expected:** Probe and drogue meet on the same axis with no interpenetration; contact is visually unambiguous; after docking, CSM and LM move as one unit.

### TC-P2-07 — SEP-7 LM extraction and S-IVB discard
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-7
**Steps:** RP-1 and RP-2 on the extraction.
**Expected:** The docked CSM pulls the LM free of the S-IVB, then the S-IVB drifts away; the LM becomes a child of the CSM group (or equivalent) and travels with it for the rest of the coast; reverse re-inserts the LM into the S-IVB and restores parentage.

### TC-P2-08 — Translunar coast trajectory line
**Type:** Visual · **Priority:** P0 · **Traces:** CH-5
**Steps:** Scroll through the coast range forward and backward.
**Expected:** The line draws itself progressively with scroll and un-draws on reverse; the spacecraft marker sits on the line's leading end at every position; the line is legible against both Earth and black space.

### TC-P2-09 — Sense of distance and duration
**Type:** Visual · **Priority:** P1 · **Traces:** CH-5
**Steps:** Scroll the coast at reading pace.
**Expected:** Earth shrinks and the Moon grows over the range; the three-day duration is conveyed (via clock, caption or pacing) without the section feeling dead; the scroll distance for this chapter is not the longest in the page.

### TC-P2-10 — Moon sphere and lunar orbit insertion
**Type:** Visual · **Priority:** P0 · **Traces:** CH-6
**Steps:** Scroll through LOI, then reverse.
**Expected:** Moon renders with texture and correct lighting; the SPS braking burn fires behind the Moon as described; the path closes into a lunar orbit; reverse undoes the capture cleanly.

### TC-P2-11 — Chapter boundaries and easing
**Type:** Interaction · **Priority:** P1 · **Traces:** FR-1
**Steps:** Scroll across each boundary between chapters 2→3, 3→4, 4→5, 5→6 in both directions.
**Expected:** Camera eases between chapters with no cut, jump or visible snap; no double-playing of a chapter's opening beat when crossing a boundary back and forth.

### TC-P2-12 — Full-range continuity
**Type:** Regression · **Priority:** P0
**Steps:** Scroll from progress 0 to the end of chapter 6 and back, three times, at varying speeds.
**Expected:** All seven separations to date resolve correctly each pass; RP-4 dump at progress 0 matches the original; console clean.

### TC-P2-13 — Scale transitions
**Type:** Visual · **Priority:** P1
**Steps:** Watch the transitions from vehicle scale to Earth scale to Earth–Moon scale.
**Expected:** No z-fighting, no clipping of near or far geometry, no sudden pop as camera near/far planes change; the spacecraft remains visible (never shrinks below a legible size) at every position.

### TC-P2-14 — Phase 2 performance
**Type:** Performance · **Priority:** P0
**Steps:** RP-3 across chapters 3–6.
**Expected:** Laptop 60 fps, Phone 30 fps or better; draw calls under 150; no memory growth over three full passes.

---

## Phase 3 — Landing and moonwalk

*Exit: descent and landing feel tense and clear to a first-time viewer.*

### TC-P3-01 — SEP-8 LM undocking
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-8
**Steps:** RP-1 and RP-2 on the undocking.
**Expected:** Eagle and Columbia separate cleanly and each continues on its own path; both remain in the scene and both are tracked by the camera long enough to read what happened; reverse redocks them with correct alignment.

### TC-P3-02 — Powered descent
**Type:** Visual · **Priority:** P0 · **Traces:** CH-7
**Steps:** Scroll through the descent range.
**Expected:** The LM pitches over from a horizontal attitude toward vertical, descent engine glow is continuous, altitude visibly decreases relative to the surface.

### TC-P3-03 — 1202 alarm beat
**Type:** Visual · **Priority:** P0 · **Traces:** CH-7
**Steps:** Scroll to the 1202 alarm moment, then reverse past it.
**Expected:** The alarm is presented as a readable on-screen beat (caption and/or DSKY-style readout), timed to the correct point in the descent, and is explained in plain language; it clears on reverse.

### TC-P3-04 — Low-fuel callouts
**Type:** Visual · **Priority:** P1 · **Traces:** CH-7, FR-10
**Steps:** Scroll the final descent.
**Expected:** Fuel countdown callouts appear in sequence and build tension; the final callout lands just before touchdown; values are consistent with the flight record.

### TC-P3-05 — Lunar surface terrain
**Type:** Visual · **Priority:** P0
**Steps:** Approach the surface from orbit down to touchdown.
**Expected:** Terrain resolves progressively with no obvious LOD pop; craters read at both approach and surface distances; the horizon curvature is plausible for the Moon.

### TC-P3-06 — Touchdown dust
**Type:** Visual · **Priority:** P1 · **Traces:** FR-12
**Steps:** Watch the final 50 m of descent.
**Expected:** Dust blows radially outward and flat (no atmospheric billowing), starts before contact and settles after; the LM does not sink into or hover above the terrain.

### TC-P3-07 — "The Eagle has landed" moment
**Type:** Visual · **Priority:** P0 · **Traces:** CH-7
**Steps:** Scroll through touchdown.
**Expected:** Engine cuts, dust settles, motion stops, and the moment is marked by a caption; the pacing gives the beat room rather than scrolling straight past it.

### TC-P3-08 — Surface camera and astronaut figure
**Type:** Visual · **Priority:** P0 · **Traces:** CH-8
**Steps:** Scroll through the moonwalk chapter.
**Expected:** Camera moves to surface level; astronaut figure descends the ladder and steps onto the surface; footprints or equivalent contact cue; figure scale is correct relative to the LM.

### TC-P3-09 — Flag and experiments
**Type:** Visual · **Priority:** P1 · **Traces:** CH-8
**Steps:** Scroll the moonwalk range forward and reverse.
**Expected:** Flag is planted and the experiments (e.g. seismometer, laser reflector) are placed in order; the flag does not wave as if in wind; reverse removes them in reverse order without leaving duplicates.

### TC-P3-10 — NASA LM model integration
**Type:** Functional · **Priority:** P1 · **Traces:** Asset plan
**Steps:** If the NASA LM GLB is used, load the close-up and check the model swap boundary.
**Expected:** The GLB loads Draco-compressed, under its budgeted size; swap between procedural and detailed LM is not visible to the viewer; the ascent/descent stage split in the model matches the scene graph names needed for SEP-9.

### TC-P3-11 — First-time-viewer comprehension
**Type:** Functional · **Priority:** P0 · **Traces:** Audience goal
**Steps:** Show chapters 7–8 to at least 3 people unfamiliar with the mission. Ask afterward: what just happened, what fell away, and why was it tense?
**Expected:** At least 2 of 3 correctly describe the undocking, the descent and the landing without prompting.

### TC-P3-12 — Reverse scroll through the landing
**Type:** Regression · **Priority:** P0
**Steps:** RP-1 across the whole chapter 7–8 range; then a full pass from progress 0 to the end of chapter 8 and back.
**Expected:** LM lifts back off, dust un-settles, undocking reverses into a redock, and the scene graph returns to its state at the start of chapter 7; all eight separations to date still correct.

### TC-P3-13 — Phase 3 performance
**Type:** Performance · **Priority:** P0
**Steps:** RP-3 across chapters 7–8, including the dust effect and surface terrain.
**Expected:** Laptop 60 fps, Phone 30 fps or better; dust particle count scales with the quality tier hook (even if the tiers are only stubbed at this phase).

---

## Phase 4 — Return home

*Exit: the full mission plays end to end, forward and backward.*

### TC-P4-01 — SEP-9 Ascent stage leaves descent stage
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-9
**Steps:** RP-1 and RP-2 on the ascent stage liftoff.
**Expected:** Ascent stage lifts off; the descent stage remains on the surface for the rest of the mission and is still visible if the camera returns; reverse lands the ascent stage back on the descent stage in exact alignment.

### TC-P4-02 — Rendezvous and redocking
**Type:** Visual · **Priority:** P0 · **Traces:** CH-9
**Steps:** Scroll through rendezvous to redocking, then reverse.
**Expected:** Ascent stage closes on Columbia along a readable path; docking alignment is clean as in TC-P2-06; after docking they move as one; reverse separates them correctly.

### TC-P4-03 — SEP-10 Ascent stage jettison
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-10
**Steps:** RP-1 and RP-2 on the jettison.
**Expected:** Occurs after the crew-transfer beat, not before; the ascent stage drifts away and tumbles; reverse re-docks it.

### TC-P4-04 — Trans-Earth injection
**Type:** Visual · **Priority:** P0 · **Traces:** CH-10
**Steps:** Scroll the TEI burn.
**Expected:** SPS engine glow, path bends away from the Moon toward Earth, trajectory line continues drawing; Moon shrinks and Earth grows over the return coast.

### TC-P4-05 — SEP-11 Service Module jettison
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-11
**Steps:** RP-1 and RP-2 on the SM jettison.
**Expected:** Happens before reentry; the SM drifts away and tumbles, revealing the CM heat shield; the CM then orients blunt-end-forward; reverse reattaches the SM.

### TC-P4-06 — Reentry plasma
**Type:** Visual · **Priority:** P1 · **Traces:** FR-12
**Steps:** Scroll through reentry.
**Expected:** Plasma builds as altitude drops and fades as the capsule slows; the glow trails behind the heat shield, not ahead of it; bloom is applied to the plasma without washing out the capsule silhouette.

### TC-P4-07 — SEP-12 Parachute sequence
**Type:** Functional · **Priority:** P0 · **Traces:** FR-2, SEP-12
**Steps:** RP-1 and RP-2 on the parachute sequence.
**Expected:** Three sub-events in order — forward heat shield (apex cover) jettison, two drogues, then three main parachutes; exactly three mains deploy and inflate in sequence; descent visibly slows at each stage; reverse retracts them in reverse order with no parachute left attached at an earlier position.

### TC-P4-08 — Splashdown
**Type:** Visual · **Priority:** P0 · **Traces:** CH-10
**Steps:** Scroll to the end of the timeline.
**Expected:** Capsule meets the water with a splash, parachutes release, the capsule settles floating; the timeline ends at exactly progress 1 with no overshoot into empty scroll.

### TC-P4-09 — Only the Command Module remains
**Type:** Functional · **Priority:** P0 · **Traces:** Vision, FR-4
**Steps:** RP-4 at the final position.
**Expected:** The only piece of the original stack still in the "active vehicle" role is the CM. Every other named part has been separated and its final state accounted for (discarded, on the Moon, or in orbit).

### TC-P4-10 — Full mission forward pass
**Type:** Regression · **Priority:** P0 · **Traces:** FR-1, FR-2
**Steps:** Scroll from progress 0 to 1 in one continuous session at reading pace, on Laptop and Phone.
**Expected:** All 10 chapters and all 12 separations play in order; no missing, duplicated or stuck part; console clean end to end.

### TC-P4-11 — Full mission reverse pass
**Type:** Regression · **Priority:** P0 · **Traces:** FR-1
**Steps:** From progress 1, scroll back to 0 in one continuous session.
**Expected:** Every separation reverses; the final RP-4 dump matches the initial dump exactly; the rocket stands complete on the pad again.

### TC-P4-12 — Random-access consistency
**Type:** Regression · **Priority:** P0
**Steps:** Jump the debug slider to 20 random progress values in random order; at each, capture RP-4 and a screenshot. Then reach the same 20 values by continuous scroll and compare.
**Expected:** Scene state at a given progress value is identical regardless of the path taken to reach it.

### TC-P4-13 — Long-session stability
**Type:** Performance · **Priority:** P1
**Steps:** Scroll the full mission forward and backward continuously for 15 minutes.
**Expected:** No memory growth beyond 20% of the post-load baseline; no fps degradation over time; no accumulation of objects in the scene graph.

### TC-P4-14 — Phase 4 performance
**Type:** Performance · **Priority:** P0
**Steps:** RP-3 across chapters 9–10, including plasma and parachutes.
**Expected:** Laptop 60 fps, Phone 30 fps or better.

---

## Phase 5 — UI and polish

*Exit: feature-complete; all Must and Should requirements met.*

### TC-P5-01 — Mission clock tracks the timeline
**Type:** Functional · **Priority:** P0 · **Traces:** FR-3
**Steps:** Scroll to each chapter start and compare the clock reading against the PRD chapter table; scroll backward and check it counts down.
**Expected:** MET matches the chapter table at every chapter start; format is consistent (T+HHH:MM:SS); it never jumps backward while scrolling forward or vice versa; it is legible over both bright and dark scene backgrounds.

### TC-P5-02 — Mission clock at the extremes
**Type:** Functional · **Priority:** P1 · **Traces:** FR-3
**Steps:** Check the clock at progress 0 and progress 1.
**Expected:** Reads T+0:00:00 at the start and approximately T+195:18 at splashdown; the three-digit hour field does not truncate or reflow the layout.

### TC-P5-03 — Stack silhouette greys out pieces
**Type:** Functional · **Priority:** P0 · **Traces:** FR-4
**Steps:** After each of the 12 separations, check the silhouette; then reverse each and check again.
**Expected:** The corresponding piece greys exactly when it separates and re-lights exactly when it re-attaches on reverse; at splashdown only the Command Module is lit; the greyed/lit distinction is visible to a viewer with colour-vision deficiency (not conveyed by hue alone).

### TC-P5-04 — Stage rail jumps to any chapter
**Type:** Interaction · **Priority:** P0 · **Traces:** FR-5
**Steps:** From chapter 1, jump to each of chapters 2–10 in turn. Then jump backward from 10 to 1. Then jump from 10 directly to 2.
**Expected:** Camera eases to the target rather than cutting; the scene graph at the destination matches a continuous-scroll arrival at the same point (compare RP-4); scroll position, clock and silhouette all agree afterwards; a jump that crosses multiple separations resolves all of them.

### TC-P5-05 — Stage rail current-chapter indicator
**Type:** Visual · **Priority:** P1 · **Traces:** FR-5
**Steps:** Scroll continuously through all chapters.
**Expected:** The rail highlights the current chapter and updates at chapter boundaries, in both directions.

### TC-P5-06 — Interrupting a stage-rail transition
**Type:** Interaction · **Priority:** P0 · **Traces:** FR-5
**Steps:** Start a jump from chapter 1 to chapter 9, then scroll manually mid-transition; on a second run, click a different chapter mid-transition.
**Expected:** Control passes cleanly to the new input with no fight between the easing and the scroll, no stuck camera, and a correct final scene state.

### TC-P5-07 — Caption cards
**Type:** Functional · **Priority:** P0 · **Traces:** FR-6
**Steps:** Visit all 10 chapters.
**Expected:** Every chapter has a card with title, a 1–2 sentence explanation, and a date; cards appear and dismiss with the chapter in both scroll directions; text is real HTML, selectable, and never overlaps the subject of the shot.

### TC-P5-08 — Exploded view
**Type:** Interaction · **Priority:** P0 · **Traces:** FR-7
**Steps:** On the intro, activate the exploded-view button; count the labels; collapse it again.
**Expected:** All 9 stack parts separate and each carries a readable label; labels do not overlap each other at any supported viewport width; collapsing returns the stack to its exact intro state; the button is reachable and operable by keyboard.

### TC-P5-09 — Hold to launch countdown
**Type:** Interaction · **Priority:** P1 · **Traces:** FR-8
**Steps:** Load the page, hold the button through the countdown; on a second run, release early; on a third, try scrolling before the countdown completes.
**Expected:** Countdown runs only while held and resets or pauses on early release; scroll is locked until it completes and unlocked after; the control works with mouse, touch and keyboard (hold via Space/Enter); there is a visible way to skip or bypass it on a repeat visit.

### TC-P5-10 — Mini trajectory map
**Type:** Functional · **Priority:** P1 · **Traces:** FR-9
**Steps:** Scroll from chapter 3 to 10, watching the map; then reverse.
**Expected:** The map appears from chapter 3 onward and not before; the position dot tracks the spacecraft's progress along the path and moves backward on reverse; the map stays legible at 360 px width.

### TC-P5-11 — Data cards
**Type:** Functional · **Priority:** P1 · **Traces:** FR-10
**Steps:** Visit each key moment that has a data card.
**Expected:** Velocity, altitude and fuel values appear at the intended moments, are internally consistent with the scene (altitude decreasing during descent, etc.), and are sourced from the flight record; cards do not obscure the caption card.

### TC-P5-12 — Mission audio
**Type:** Functional · **Priority:** P1 · **Traces:** FR-11
**Steps:** Load the page and scroll to the landing and first-step moments without touching audio controls; then unmute and repeat.
**Expected:** Audio is muted by default and never autoplays; the mute control is discoverable and keyboard-operable; when unmuted, clips play at the right moments and do not replay repeatedly when scrubbing; audio stops or fades when scrolled past.

### TC-P5-13 — Particle effects pass
**Type:** Visual · **Priority:** P1 · **Traces:** FR-12
**Steps:** Review exhaust, smoke, separation flashes and reentry plasma across the whole mission.
**Expected:** Each effect is present where the PRD calls for it, scales with the quality tier, and is absent where it would be physically wrong (no smoke in vacuum).

### TC-P5-14 — Bloom post-processing
**Type:** Visual · **Priority:** P1
**Steps:** Compare bloom on and off across launch, TLI, reentry and the lunar surface.
**Expected:** Bloom enhances engine glow and plasma without blooming the Moon's surface, UI text or caption cards; the UI layer is not affected by the post-processing pass at all.

### TC-P5-15 — Easing and pacing pass
**Type:** Visual · **Priority:** P1 · **Traces:** Risk "scroll length feels too long"
**Steps:** Scroll the full mission at reading pace and record the scroll distance and time spent per chapter.
**Expected:** No chapter feels dead or rushed; the coast chapters are not the longest scrolls; total scroll length is tuned and recorded; two reviewers agree the pacing holds from pad to splashdown.

### TC-P5-16 — Fact-check: chapter names and dates
**Type:** Accuracy · **Priority:** P0 · **Traces:** Accuracy NFR
**Steps:** Check every chapter title, spacecraft name, hardware name and calendar date against the NASA Apollo 11 Flight Journal and the mission report.
**Expected:** Every name and date matches a cited source; spelling of Columbia, Eagle, S-IC, S-II, S-IVB, SLA, LES is correct throughout; the check is recorded with source links.

### TC-P5-17 — Fact-check: MET values
**Type:** Accuracy · **Priority:** P0 · **Traces:** Accuracy NFR
**Steps:** Check all MET values — the 10 chapter times and every separation time — against the Flight Journal.
**Expected:** Each value matches the source or is documented as a deliberate rounding; the PRD's approximate values are replaced with checked ones.

### TC-P5-18 — Stylisation is labelled
**Type:** Accuracy · **Priority:** P1 · **Traces:** Accuracy NFR
**Steps:** Look for disclosure of stylised trajectories, compressed timescales and slow motion.
**Expected:** Slow motion carries the SLOW-MO badge; stylised trajectories and non-linear time are stated somewhere the viewer will see, e.g. the intro or an About screen.

### TC-P5-19 — UI at 360 px
**Type:** Compatibility · **Priority:** P0 · **Traces:** Responsiveness NFR
**Steps:** At 360 px width, check clock, silhouette, stage rail, caption card, trajectory map and data cards together at their busiest moment.
**Expected:** Captions move below the scene; nothing overlaps or is clipped; no horizontal scrollbar; all controls remain tappable at a minimum 44 px target.

### TC-P5-20 — UI state after a stage-rail jump
**Type:** Regression · **Priority:** P0 · **Traces:** FR-3, FR-4, FR-5
**Steps:** Jump between non-adjacent chapters 10 times in random order, checking clock, silhouette and map after each.
**Expected:** All three UI elements agree with the 3D scene at every destination; no stale caption card from the previous chapter remains.

### TC-P5-21 — All Must and Should requirements present
**Type:** Functional · **Priority:** P0 · **Traces:** FR-1 to FR-12
**Steps:** Walk the functional requirements table and demonstrate each one in the build.
**Expected:** FR-1 to FR-7 (Must) and FR-8 to FR-12 (Should) are all demonstrable, or a Should is explicitly deferred with a written decision.

---

## Phase 6 — Optimize, test and launch

*Exit: all success metrics met; public launch.*

### TC-P6-01 — Total page weight
**Type:** Performance · **Priority:** P0 · **Traces:** Under 5 MB
**Steps:** Load the deployed build with an empty cache; sum all transferred bytes in the network panel through the full mission scroll.
**Expected:** Total transferred under 5 MB. Record the breakdown by asset type.

### TC-P6-02 — First meaningful paint on 4G
**Type:** Performance · **Priority:** P0 · **Traces:** Under 3 s on 4G
**Steps:** Throttle to a 4G profile with an empty cache; measure FMP/LCP three times and take the median.
**Expected:** Under 3 seconds. Record the number.

### TC-P6-03 — Draco compression applied
**Type:** Performance · **Priority:** P0
**Steps:** Inspect every shipped GLB.
**Expected:** All are Draco-compressed and within their size budget (LM ~700 KB or less, etc.); the decoder is loaded once and does not block first paint.

### TC-P6-04 — Texture sizing
**Type:** Performance · **Priority:** P0
**Steps:** List every shipped texture with its dimensions and format.
**Expected:** No texture is larger than its on-screen need; Earth and Moon textures are sized for the maximum camera zoom used, not larger; compressed formats used where supported.

### TC-P6-05 — Lazy loading of later chapters
**Type:** Performance · **Priority:** P0 · **Traces:** Performance NFR
**Steps:** Load the page and watch the network panel without scrolling; then scroll through the mission.
**Expected:** Only chapter 1 assets load up front; later assets load in the background ahead of need; no visible stall, pop-in or missing model when reaching a chapter at normal scroll speed.

### TC-P6-06 — Fast scroll outruns loading
**Type:** Performance · **Priority:** P0
**Steps:** On a throttled connection, immediately flick-scroll to splashdown right after first paint.
**Expected:** The page shows a graceful loading state for not-yet-loaded chapters rather than a broken or empty scene, and resolves correctly once the assets arrive.

### TC-P6-07 — Quality tier detection
**Type:** Performance · **Priority:** P0 · **Traces:** Performance NFR
**Steps:** Load on a high-end laptop, a mid-range laptop and a low-end phone; log the detected tier.
**Expected:** Tier is detected at startup and matches the device class; low tier drops bloom and reduces particle counts; the mission is still fully understandable at the lowest tier.

### TC-P6-08 — Device pixel ratio cap
**Type:** Performance · **Priority:** P0
**Steps:** Load on a display with DPR 3.
**Expected:** The renderer caps at DPR 2; the canvas backing store size confirms it.

### TC-P6-09 — Draw call budget
**Type:** Performance · **Priority:** P0
**Steps:** Sample renderer info at 20 positions across the mission, including all separations.
**Expected:** Draw calls stay under ~150 per frame at every sample.

### TC-P6-10 — Frame rate on a mid-range laptop
**Type:** Performance · **Priority:** P0 · **Traces:** 60 fps target
**Steps:** RP-3 across the full mission on the reference laptop.
**Expected:** 60 fps sustained; no dropped-frame cluster longer than 100 ms at any separation.

### TC-P6-11 — Frame rate on a recent phone
**Type:** Performance · **Priority:** P0 · **Traces:** 30 fps target
**Steps:** RP-3 across the full mission on Android Chrome and iOS Safari.
**Expected:** 30 fps or better throughout; no thermal throttling collapse over a 10-minute session; no crash or context loss.

### TC-P6-12 — WebGL context loss recovery
**Type:** Compatibility · **Priority:** P1
**Steps:** Force a context loss (extension or background the tab on mobile for several minutes), then return.
**Expected:** The scene restores or shows a clear reload prompt; no blank canvas with no explanation.

### TC-P6-13 — prefers-reduced-motion
**Type:** Accessibility · **Priority:** P0 · **Traces:** Accessibility NFR
**Steps:** Enable reduced motion at the OS level and scroll the full mission.
**Expected:** No camera shake, no flashes; chapters cross-fade gently; every separation is still communicated (via captions, silhouette and a simple state change) so nothing is lost; the setting is honoured without a reload.

### TC-P6-14 — Flash rate safety
**Type:** Accessibility · **Priority:** P0 · **Traces:** Seizure safety
**Steps:** Record each separation and the reentry plasma at 60 fps and count luminance flashes per second; check the largest flashing area against WCAG 2.3.1 thresholds.
**Expected:** No sequence exceeds 3 flashes per second at any scroll speed, including the fastest possible flick-scroll through consecutive separations.

### TC-P6-15 — Keyboard navigation
**Type:** Accessibility · **Priority:** P0 · **Traces:** Accessibility NFR
**Steps:** Using only the keyboard: reach and operate the hold-to-launch button, every stage rail item, the exploded-view toggle, and the audio mute; scroll the mission with arrow keys, Page Up/Down, Home and End.
**Expected:** Every control is reachable in a logical tab order with a visible focus ring; no keyboard trap; the whole mission can be traversed without a pointer.

### TC-P6-16 — Screen reader
**Type:** Accessibility · **Priority:** P0 · **Traces:** Accessibility NFR
**Steps:** With VoiceOver and with NVDA, traverse the page start to finish.
**Expected:** Every caption is announced as real text; chapter changes are announced via a live region; the stage rail items announce their chapter name and current state; the canvas has a meaningful text alternative; decorative UI is not announced as noise.

### TC-P6-17 — Lighthouse accessibility score
**Type:** Accessibility · **Priority:** P0 · **Traces:** Score 90 or higher
**Steps:** Run Lighthouse on the deployed build, mobile and desktop profiles.
**Expected:** Accessibility score 90 or higher on both; record the report.

### TC-P6-18 — Colour contrast
**Type:** Accessibility · **Priority:** P1
**Steps:** Measure contrast for clock, captions, labels, data cards and stage rail against the scene behind them at their worst-case background.
**Expected:** 4.5:1 for body text and 3:1 for large text, at every chapter — including the bright lunar surface and the Earth-lit frames.

### TC-P6-19 — Browser matrix
**Type:** Compatibility · **Priority:** P0
**Steps:** Run the full-mission forward and reverse passes (TC-P4-10, TC-P4-11) on current Chrome, Safari and Firefox on desktop, and Chrome on Android and Safari on iOS.
**Expected:** Identical behaviour and correct separations everywhere; document any platform-specific visual differences that are accepted.

### TC-P6-20 — Touch and trackpad scrolling
**Type:** Interaction · **Priority:** P0 · **Traces:** Responsiveness NFR
**Steps:** Scroll with a mouse wheel, a trackpad (including momentum), and touch (including flick and drag) through several separations.
**Expected:** All three feel equally smooth; momentum scrolling does not overshoot a chapter or skip a separation; touch scroll does not trigger pull-to-refresh or rubber-band into a broken state.

### TC-P6-21 — Viewport range
**Type:** Compatibility · **Priority:** P0 · **Traces:** Responsiveness NFR
**Steps:** Test at 360, 390, 768, 1024, 1440 and 1920 px wide, portrait and landscape where applicable.
**Expected:** Layout holds at every size; the subject stays framed; no horizontal scroll; no clipped UI.

### TC-P6-22 — Deployment and cold load
**Type:** Functional · **Priority:** P0
**Steps:** Deploy to the static host; load the public URL with an empty cache from a different network.
**Expected:** All assets resolve over HTTPS with no mixed content or 404s; correct caching headers; the page works with no backend.

### TC-P6-23 — Asset credits and licensing
**Type:** Functional · **Priority:** P0 · **Traces:** Licensing
**Steps:** List every shipped asset with its source and licence; check the About screen.
**Expected:** Every non-NASA asset's licence permits this use and is credited; NASA assets are acknowledged; credits are reachable from the page.

### TC-P6-24 — Completion rate instrumentation
**Type:** Functional · **Priority:** P1 · **Traces:** 40% reach splashdown
**Steps:** Verify the analytics events for "started scrolling" and "reached splashdown" fire exactly once each per session, and that the ratio can be read from the dashboard.
**Expected:** Events fire correctly and are not double-counted by scroll jitter or reverse scrolling; the metric is measurable at launch.

### TC-P6-25 — Launch readiness review
**Type:** Functional · **Priority:** P0
**Steps:** Confirm every success metric from the PRD has a recorded measurement and every P0 case across all phases passes on the deploy candidate.
**Expected:** Sign-off recorded with build hash, date and measured values for all six success metrics.

---

## Cross-cutting regression suite

Run before every phase exit from Phase 2 onward, and before every deploy.

| ID | Case | Traces |
| --- | --- | --- |
| RG-01 | Full forward pass, progress 0 → 1, all chapters and separations implemented so far correct | FR-1, FR-2 |
| RG-02 | Full reverse pass, progress 1 → 0, scene graph dump matches the initial dump | FR-1, risk |
| RG-03 | Fast flick-scroll forward and reverse, 5 cycles, no lost or duplicated parts | FR-2 |
| RG-04 | Random-access consistency across 20 progress values | FR-1 |
| RG-05 | Stop-mid-separation hold for each implemented separation | FR-2 |
| RG-06 | Console free of errors and warnings over a full pass | — |
| RG-07 | Memory returns to baseline after three full passes | Performance |
| RG-08 | Frame rate targets on Laptop and Phone | Metrics |
| RG-09 | UI elements (clock, silhouette, rail, map) agree with the 3D scene at 10 sampled positions | FR-3, FR-4, FR-5, FR-9 |
| RG-10 | Reduced-motion pass still communicates every separation | Accessibility |

## Traceability matrix

| Requirement | Primary cases |
| --- | --- |
| FR-1 Scroll drives master timeline both ways | TC-P0-03, TC-P0-04, TC-P2-11, TC-P4-10, TC-P4-11, TC-P4-12, RG-01, RG-02 |
| FR-2 All 12 separations, four-beat rhythm | TC-P1-05 to TC-P1-13, TC-P2-04, TC-P2-05, TC-P2-07, TC-P3-01, TC-P4-01, TC-P4-03, TC-P4-05, TC-P4-07 |
| FR-3 Mission clock | TC-P5-01, TC-P5-02, TC-P5-20, RG-09 |
| FR-4 Stack silhouette | TC-P5-03, TC-P4-09, TC-P5-20, RG-09 |
| FR-5 Stage rail | TC-P5-04, TC-P5-05, TC-P5-06, TC-P5-20 |
| FR-6 Caption cards | TC-P5-07, TC-P6-16 |
| FR-7 Exploded view, 9 labels | TC-P5-08 |
| FR-8 Hold to launch | TC-P5-09 |
| FR-9 Mini trajectory map | TC-P5-10, RG-09 |
| FR-10 Data cards | TC-P3-04, TC-P5-11 |
| FR-11 Mission audio | TC-P5-12 |
| FR-12 Particle effects | TC-P1-04, TC-P3-06, TC-P4-06, TC-P5-13 |
| FR-13 Detailed LM / CM models | TC-P3-10 |
| FR-14 Language toggle | Not covered in v1 (Could) |
| 60 fps laptop | TC-P1-17, TC-P2-14, TC-P3-13, TC-P4-14, TC-P6-10 |
| 30 fps phone | TC-P6-11 |
| FMP under 3 s on 4G | TC-P6-02 |
| Page weight under 5 MB | TC-P6-01, TC-P6-03, TC-P6-04 |
| 40% reach splashdown | TC-P6-24 |
| Lighthouse a11y 90+ | TC-P6-17 |

## Defect reporting template

```
ID:          BUG-<nn>
Test case:   TC-P<phase>-<nn>
Build:       <hash / date>
Device:      <device, OS, browser, version>
Severity:    Blocker / Major / Minor / Cosmetic
Steps:       <exact scroll positions or slider values>
Expected:    <from the test case>
Actual:      <what happened>
Evidence:    <screenshot, RP-4 dump, performance capture, console log>
```
