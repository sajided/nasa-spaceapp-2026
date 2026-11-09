# Asset budget and measured baselines

**PRD targets:** total page weight under 5 MB · first meaningful paint under 3 s on 4G ·
60 fps mid-range laptop · 30 fps recent phone · draw calls under ~150 per frame.

## Per-asset budgets

Set in Phase 0 so realism cannot quietly consume the total. These are ceilings, not goals.

| Asset class | Ceiling | Notes |
| --- | --- | --- |
| JS bundle (gzip) | 250 KB | Three.js dominates; measured at 155 KB in Phase 0 |
| Environment map (HDRI) | 400 KB | 1k resolution, compressed; Phase 0 uses the zero-byte procedural `RoomEnvironment` |
| Any single texture | 512 KB | KTX2 / Basis preferred over PNG or JPG |
| Earth texture | 800 KB | Sized for maximum camera zoom, not larger |
| Moon texture | 800 KB | As above |
| Any single GLB | 700 KB | Draco-compressed |
| Audio | 700 KB | Story-mode voice-over: ~59 lines, AAC mono 32 kbps, one file per line, fetched only as each line plays and only if listed in `public/audio/manifest.json`. Raised from 300 KB for story mode (2026-11-09) |
| Story-mode images | 300 KB | The LRO photograph of Tranquility Base, loaded when the epilogue begins |
| **Total transferred** | **5 MB** | Measured across a full mission scroll with an empty cache |

## Measured baseline

Phase 3 build of 2026-09-23. Eight chapters: the Saturn V, NASA's F-1 engine instanced five
times, the pad and tower, the Earth–Moon system with both NASA textures, the trajectory
line and a starfield, and now the procedural LM, the lunar surface, the touchdown dust and
the moonwalk cast.

| Measurement | Phase 0 | Phase 1 | Phase 2 | Phase 3 |
| --- | --- | --- | --- | --- |
| JS bundle, raw | 593 KB | 675 KB | 686 KB | 729 KB |
| JS bundle, gzip | 155 KB | 178 KB | 181 KB | 196 KB |
| F-1 engine GLB | — | 153 KB | 153 KB | 153 KB |
| Earth texture | — | — | 365 KB | 365 KB |
| Moon texture | — | — | 202 KB | 202 KB |
| **Total transferred** | 157 KB | 259 KB | 830 KB | **845 KB** of the 5 MB budget |
| Peak draw calls | 2 | 62 | 61, on the pad | **70**, on the pad |
| Draw calls on the Moon | — | — | — | 25 in descent, 58 at the flag |
| Triangles, worst case | 60 | 2,154 | 3,138 | 82,206, at the flag |

Phase 3 costs 15 KB, all of it code. Everything it adds is built at load time:
- The crater field is a seeded 512² tile, baked once.
- The LM, the astronauts, the flag and the experiments are procedural.
- The dust is a shader over a seeded point cloud.

The new pad peak is the LM's dozen meshes riding inside the adapter.

The triangle count is dominated by the terrain: one disc of about 38,000 vertices,
curved to the Moon's radius, serving every altitude from orbit to a boot. That is the
number to watch on phones. The dust is the first effect to scale with the quality tier:
4,000 particles high, 2,000 medium, 800 low (`src/core/quality.ts`).

The shadow map is 2048² and redraws only while the lunar sun is up. It is the other
phone-side risk; a low tier could reasonably drop it to 1024².

**Frame rate on real hardware is still not captured.** The automated suite runs under
software WebGL and reports a flat 60 fps, which says nothing about the PRD's 60/30 fps
targets. Those come from procedure RP-3 in `testcase.md`. The phone target has now gone
three phases unmeasured. Phase 3 adds the heaviest load yet — the terrain shader, the
shadow map and the dust — so this is the phase where an RP-3 pass matters most.

| Device | Median fps | 1% low | Frames > 33 ms | Date |
| --- | --- | --- | --- | --- |
| Reference laptop | _pending_ | | | |
| Reference Android | _pending_ | | | |
| Reference iPhone | _pending_ | | | |

## Planet textures

Both come from the repository the PRD cites, and both ship far too large to use raw.
`scripts/prepare-textures.mjs` downloads, caches and downsizes them to 2048x1024 WebP.

| Body | Source | Raw | Shipped |
| --- | --- | --- | --- |
| Earth | `Images and Textures/Earth (A)/Earth (A).jpg` | 1,366 KB | 365 KB |
| Moon | `Images and Textures/Moon - Lunar Color/…jpg` | 4,466 KB | 202 KB |

**Not "Earth (B)".** That file is a *photograph of a globe* — a lit disc with its own
baked-in terminator — rather than an equirectangular map. Wrapped onto a sphere it gives a
planet lit from a direction unrelated to the scene's sun, and no amount of adjusting the
light fixes it. It cost an hour to diagnose because the symptom looks exactly like a
lighting bug.

Earth (A) is a true equirectangular map, but it is false-colour topography and bathymetry
rather than photography. It is geographically correct, it is NASA imagery, and it reads
clearly at every distance the mission uses — but it is not photoreal, which sits awkwardly
against the cinematic-realism decision. Flagged for the Phase 5 polish pass.

**NASA's SVS is unreachable** from this machine — every request to `svs.gsfc.nasa.gov`
fails at the connection, so the CGI Moon Kit is not an option here.

## Asset spike — NASA Saturn V GLB (corrected)

**Question (PRD risk, line 329):** is the downloaded Saturn V a single merged mesh?

**Source:** <https://science.nasa.gov/3d-resources/saturn-v/> →
`assets.science.nasa.gov/.../Saturn%20V.glb`, 905 KB, glTF binary v2, not Draco-compressed.

**Verdict: for the stack, yes — the risk materialises.**

The Phase 0 spike reported "separable, 22 meshes". That was true at the file level and
misleading in substance. Breaking the 22 meshes down by what they actually are:

| Part group | Meshes | Triangles | Share |
| --- | --- | --- | --- |
| Body — the **entire 110 m vehicle in one mesh** | 1 | 2,280 | 7% |
| F-1 engines | 5 | 29,790 | 86% |
| S-IC fins | 4 | 1,656 | 5% |
| RCS quads, retro fairings, fittings | 12 | 1,088 | 2% |

The body mesh spans the full height of the vehicle. Its nine primitives are paint-scheme
splits, not stage splits — the main hull primitive alone covers 107 of the 110 m — so
they cannot be regrouped into stages. Extracting S-IC, S-II, S-IVB and the rest means
cutting a continuous mesh in Blender at each station and capping the exposed faces, and
what comes out is still a 2,280-triangle hull.

**What this changed.** Phase 1 builds the ten named stage groups procedurally, where
segment counts are chosen for close-ups and the named scene graph exists by construction,
and takes from NASA only what the model is actually good for: the engines. All five F-1s
share geometry, so `scripts/prepare-engines.mjs` extracts one and the app renders five as
an `InstancedMesh` — 5,958 triangles and one draw call instead of 29,790 across five.

| Approach | Triangles | Draw calls | Blender | Named groups |
| --- | --- | --- | --- | --- |
| Cut the NASA body | 2,280 hull | ~52 unmerged | 3 days, manual | hand-named, error-prone |
| Procedural + NASA engines | ours to choose | ~25 | none | by construction |

**Licensing.** NASA 3D Resources are public domain. The credit line goes on the About
screen in Phase 6 (TC-P6-23).

## Story mode (2026-11-09)

Story mode adds "The Monuments We Left Behind": the prologue and epilogue chapters and the
children's HTML layer (`src/ui/story/`). Almost everything it draws is built at load time:

- The Earth and Moon portraits are inline SVG.
- The Resting Places map is inline SVG.
- The landing-site glow is a 128² canvas gradient.
- The laser is a cylinder mesh.
- No web font is loaded; the rounded type is the system's `ui-rounded`.

| Added | Size | Loaded |
| --- | --- | --- |
| Story-layer code (`src/ui/story/`, `src/core/narration.ts`, data) | measure with `npm run size` | with the bundle |
| `public/images/lro-apollo11.webp` | 14 KB | when the epilogue starts |
| `public/audio/manifest.json` | < 1 KB | when sound is turned on |
| Voice recordings | 0 KB so far; ~600 KB expected | one line at a time, while it plays |

The LRO image is "High Noon at Tranquility Base" (LROC NAC, 2009, NASA/GSFC/Arizona State
University, public domain). It was taken via Wikimedia Commons, because `lroc.asu.edu`'s
originals are far larger than the page needs.
