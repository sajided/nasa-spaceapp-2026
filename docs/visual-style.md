# Visual style — cinematic realism

**Decided:** 2026-09-22 · **Phase:** 0 · **Satisfies:** TC-P0-10, PRD open question "Visual style"

The PRD left visual style open between Mission Control retro, blueprint wireframe and
cinematic realism. **Cinematic realism** is the chosen direction: PBR materials, image-based
lighting, filmic tone mapping, and volumetric exhaust in the launch chapters.

## What this means concretely

| Aspect | Decision |
| --- | --- |
| Shading | `MeshStandardMaterial` with metalness/roughness; no flat or toon shading |
| Lighting | One hard key (unfiltered sunlight), a cool low fill (earthshine), a rim to separate hull from space, plus an IBL environment |
| Tone mapping | `ACESFilmicToneMapping`, exposure `1.0` |
| Colour space | `SRGBColorSpace` output |
| Environment | Phase 0 uses Three's procedural `RoomEnvironment` (zero bytes). Phase 1 swaps in a real space HDRI within budget |
| UI chrome | Minimal — the render carries the frame. Clean grotesk for text, monospace for the mission clock and telemetry |

Tone mapping, colour space and exposure are fixed **now** because changing them later
re-grades every material in the project. They live in `src/core/renderer.ts`.

## Palette

Defined in `src/style/tokens.ts`; nothing else hard-codes a colour.

| Token | Value | Use |
| --- | --- | --- |
| `space` | `#05070C` | Background. Deliberately not pure black — pure black flattens the tone curve |
| `hull` | `#D9D7D0` | Saturn V hull white, warm and slightly off-white so PBR has something to work with |
| `hullDark` | `#1C1C1E` | The black roll-pattern panels on the S-IC |
| `exhaustCore` | `#FFEBC4` | Exhaust plume core |
| `exhaustTip` | `#FF6A1F` | Exhaust plume tip; also the UI accent |
| `sun` | `#FFF6E8` | Key light |
| `earthshine` | `#5B86C4` | Fill light bounced from Earth |

## Reference images

To be added before Phase 1 begins — NASA launch photography (AS11-S-6, the pad 39A
liftoff sequence) and the Apollo 11 onboard film of S-IC separation are the two
references that matter most, because they fix how hard the key light reads in vacuum
and how the separation debris catches it.

## The cost this choice carries

Realism is the most expensive of the three options against the PRD's budgets, and the
decision was taken with that understood. Two consequences are now tracked rather than
assumed away:

1. **It weakens the case for the procedural Saturn V.** The PRD argued for code-built
   primitives partly because they "match a stylized look" (PRD line 183). Under realism
   they will read as unfinished, so the Blender-split path (PRD line 185) is now the
   likely Phase 1 route. See `asset-budget.md` for what the spike found.

2. **PBR plus IBL is the main risk to the 30 fps phone target.** The Phase 0 baseline in
   `asset-budget.md` is the reference every later phase compares against; if it drifts,
   the quality-tier work scheduled for Phase 6 needs pulling forward.
