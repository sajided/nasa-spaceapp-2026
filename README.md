# 🌙 The Moon Project

**An interactive 3D picture book that follows Apollo 11 and every piece of the ship it left behind.**

*NASA International Space Apps Challenge · Challenge: **Abandoned but not Forgotten** · Team **Spaced Outcats***

| | |
| --- | --- |
| ▶️ **Live demo** | <https://the-moon-project-steel.vercel.app/> |
| 🎬 **30-second video** (global judging) | <https://youtu.be/WLAF4dQr1Pc> (source: `moon-global-film/`) |
| 🎤 **Pitch film** (local judging) | <https://youtu.be/nwNQ9yOKnEs> (source: `moon-pitch-film/`) |
| 🧑‍🚀 **Space Apps project page** | <https://www.spaceappschallenge.org/2026/find-a-team/spaced-out-cats/> |
| 💻 **Code** | <https://github.com/sajided/nasa-spaceapp-2026> |

---

## The problem

To reach the Moon, Apollo 11 had to **let go of almost everything it launched with**. Of a
2,938-tonne rocket, only the 5-tonne Command Module *Columbia* came home. The rest is still out
there: three stages on the floor of the Atlantic, a third stage circling the Sun, a lander standing
at Tranquility Base, a mirror that scientists still bounce lasers off today.

These are humanity's first monuments on another world, and most children have never heard of
them. They know the rocket and the footprint. They don't know about the machines that made the
trip possible and were left behind.

## Our solution

**The Moon Project** is a scroll-driven 3D story for children aged 6–9, narrated by two friendly
characters: **the Earth** and **a lonely Moon**. They watch Apollo 11 make its journey and talk
about each piece as it falls away.

Children don't just watch. They **take part**:

- 🔘 **"Let go!":** the child presses the button that drops each stage, and feels the rocket get lighter.
- ⚖️ **The weight meter:** the ship's real mass in tonnes, and in elephants, falls from 2,938 t to 5 t.
- 📒 **The Monument Album:** 14 collectible cards, one for each piece left behind, saying what it did and where it rests today.
- 🗺️ **Resting Places map:** the Atlantic, the Pacific, orbit around the Sun, and the Moon's surface.
- 📻 **Real 1969 voices:** at liftoff, landing and the first step the story steps aside and NASA's original recordings play, with word-by-word captions.
- 📷 **The real photograph:** at the end the cartoon Moon fades into a real Lunar Reconnaissance Orbiter photo of the Apollo 11 site. Everything the child just collected is really there.
- 💭 **"What would you leave?":** the story ends by asking the child what they would leave on the Moon.

Older visitors and teachers can switch to the **classic mission replay** (`?story=0`): the
whole flight from Pad 39A to Pacific splashdown, timed to the real mission clock, with all twelve
separations.

## Why it fits "Abandoned but not Forgotten"

| The challenge asks | The Moon Project |
| --- | --- |
| Tell the story of hardware left behind | Every jettisoned part is a character beat and a collectible card, from the S-IC in the Atlantic to the descent stage on the Moon |
| Use NASA data | Mission timing, masses, 3D models, imagery, photography and audio all come from NASA sources (listed below) |
| Make it engaging and accessible | Ages 6–9, narrated, big tap targets for tablets, text never below 20 px, works without sound, keyboard and screen-reader friendly |
| Show why it still matters | The **"Not forgotten!"** line on each card: the F-1 engines raised from the sea in 2013, the retroreflector still used for laser ranging, the descent stage still standing |

## The fourteen monuments

| Card | Left at | Rests today |
| --- | --- | --- |
| First Stage (S-IC) | T+ 2:42 | Atlantic Ocean. Its F-1 engines were recovered in 2013 |
| Interstage ring | T+ 3:12 | Atlantic Ocean |
| Launch Escape System | T+ 3:18 | Atlantic Ocean. It was never needed |
| Second Stage (S-II) | T+ 9:09 | Atlantic Ocean |
| Third Stage (S-IVB) | T+ 4:17:03 | Orbit around the Sun |
| Flag | Moonwalk | Moon surface. The ascent blast knocked it over |
| Retroreflector (LRRR) | Moonwalk | Moon surface. It is still used for laser ranging |
| Seismometer (PSEP) | Moonwalk | Moon surface. It sent the first moonquake reports |
| Footprints | Moonwalk | Moon surface |
| Plaque & goodwill disk | Moonwalk | Moon surface, with messages from 73 countries |
| Descent Stage | T+ 124:22 | Tranquility Base |
| Ascent Stage | T+ 130:09:31 | Unknown. It may still be in lunar orbit (Meador, 2021) |
| Service Module | T+ 194:49:12 | Burned up in Earth's atmosphere |
| Command Module *Columbia* | Splashdown | Smithsonian National Air and Space Museum |

---

## 🛰️ NASA data and resources used

Every NASA asset the app ships was downloaded and processed by a script in `scripts/`, so it can
be rebuilt from the original source.

### Imagery and 3D models

| Resource | What we used | Where it appears | How |
| --- | --- | --- | --- |
| [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) | **Earth (A)** equirectangular map | The Earth in every space scene | `scripts/prepare-textures.mjs` downsizes it to `public/textures/earth.webp` |
| [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources) | **Moon – Lunar Color** map | The Moon, from the prologue to the epilogue | `scripts/prepare-textures.mjs` → `public/textures/moon.webp` |
| [NASA 3D Resources: Saturn V](https://science.nasa.gov/3d-resources/saturn-v/) ([GLB](https://assets.science.nasa.gov/content/dam/science/cds/3d/resources/model/saturn-v/Saturn%20V.glb)) | One **F-1 engine** mesh, instanced five times | The S-IC engines at liftoff | `scripts/prepare-engines.mjs` extracts it → `public/models/f1-engine.glb` |
| [LROC: "High Noon at Tranquility Base"](https://www.lroc.asu.edu/images/65) (NASA/GSFC/Arizona State University, also [NASA Photojournal PIA12925](https://photojournal.jpl.nasa.gov/catalog/PIA12925)) | LRO Narrow Angle Camera photo of the Apollo 11 site | The epilogue reveal | `public/images/lro-apollo11.webp` |

### Mission audio

From [NASA Historical Sounds](https://www.nasa.gov/historical-sounds/). The script
`scripts/prepare-mission-audio.mjs` cuts each clip and times its caption word by word.

| Recording | Moment |
| --- | --- |
| [Apollo 11 countdown & liftoff](https://www.nasa.gov/wp-content/uploads/2015/01/590320main_ringtone_apollo11_countdown.mp3) (Jack King, NASA Launch Control) | "Ignition sequence start… Liftoff! We have a liftoff…" |
| [The Eagle Has Landed (extended)](https://www.nasa.gov/wp-content/uploads/2015/01/590333main_ringtone_eagleHasLanded_extended.mp3) | Touchdown at Tranquility Base |
| [That's one small step](https://www.nasa.gov/wp-content/uploads/2015/01/590331main_ringtone_smallStep.mp3) | Neil Armstrong's first step |

### Mission data and fact-checking

| Source | Used for |
| --- | --- |
| [Apollo 11 Flight Journal](https://www.nasa.gov/history/afj/ap11fj/) (NASA History) | The mission clock: every event in `src/data/mission.ts` is placed by real Mission Elapsed Time |
| [Apollo 11 Lunar Surface Journal](https://www.nasa.gov/history/alsj/a11/a11.html) (NASA History) | The moonwalk: the flag, LRRR, PSEP, the plaque and the goodwill disk |
| [Saturn V Launch Vehicle Flight Evaluation Report AS-506](https://ibiblio.org/apollo/Documents/lvfea-AS506-Apollo11.pdf) (MSFC, MPR-SAT-FE-69-9) | Stage masses and separation times for the weight meter (`src/data/mass.ts`) |
| [Lunar Reconnaissance Orbiter Camera](https://www.lroc.asu.edu/) | Where the hardware rests today |
| J. Meador, "Long-term orbit stability of the Apollo 11 'Eagle' lunar module ascent stage", *Planetary and Space Science*, 2021 | The ascent stage's "still in orbit?" card |

The full script, the line-by-line fact check and the corrections made to the first draft are in
[`docs/story.md`](docs/story.md).

### What is real, and what is made up

We tell children this on the in-app **About** screen, and we hold ourselves to it:

- **Real:** the order and timing of every event, what each piece of the ship was, where it rests
  today, the masses (rounded), the LRO photograph and the 📻 radio voices.
- **Made up:** the Earth and the Moon talking, and their feelings. Their voices are AI-generated
  (ElevenLabs) and the rocket sounds are synthesized. The 3D scenes are stylised and not to
  scale between scenes.

NASA imagery and audio are public domain. NASA does not endorse this project.

---

## How it works

```
scroll / swipe / ▶  ──▶  master timeline  ──▶  state objects  ──▶  reconciler  ──▶  Three.js
                         (anime.js, MET)       (plain JS)          (idempotent)
```

- **Mission time is the unit.** Events are placed by real Mission Elapsed Time, and the scroll is
  stretched around separations and compressed elsewhere. Six seconds of S-IC separation get 4% of
  the page; seventy-one hours of coast get 13%.
- **The scene is a pure function of progress.** anime.js animates plain state, and a reconciler
  makes the Three.js scene match each frame. Scrolling backwards through a separation re-attaches
  the stage exactly. Nothing depends on "this event fired".
- **Separations are data.** All twelve run through one function (`src/core/separation.ts`) from
  rows in `src/data/separations.ts`.
- **Two scales, one camera.** The 110 m rocket and the 384,400 km Earth–Moon trip share one depth
  range: the system frame is in units of 1,000 km. The cut between them happens when the rocket is
  about twenty pixels tall, so it is invisible.
- **Light enough for a school tablet.** One NASA F-1 mesh, two 2048 px textures and procedural
  geometry for everything else. The launch peaks well under a 150-draw-call ceiling, checked by
  the test suite.

**Stack:** TypeScript · [Three.js](https://threejs.org/) · [anime.js](https://animejs.com/) ·
[Vite](https://vite.dev/) · [Playwright](https://playwright.dev/) for 22 end-to-end spec files.

## Run it

```bash
npm install
npm run dev               # http://localhost:5173
npm run build             # typecheck + production build
npm run preview           # serve the build on :4173
npm run test:e2e          # build, then run the Playwright suite
npm run size              # check dist/ against docs/asset-budget.md
```

Rebuild the NASA assets from source:

```bash
npm run prepare:textures        # NASA 3D Resources → Earth and Moon textures
npm run prepare:engines         # NASA Saturn V model → one F-1 engine
npm run prepare:mission-audio   # NASA Historical Sounds → captioned clips (needs ffmpeg)
```

URL switches:

- `?story=0`: the classic mission replay for older visitors.
- `?debug=1`: the debug panel and the `window.__apollo` test API. It skips the start screen; add `&start=1` to bring it back.

## Project layout

| Path | What |
| --- | --- |
| `src/chapters/` | One module per chapter, from the prologue to the epilogue |
| `src/scene/` | The Saturn V, the Lunar Module, the pad and Cape Kennedy, the Earth–Moon system, the lunar surface, re-entry |
| `src/data/` | Mission timing, masses, separations, the descent profile, moonwalk routes, the story script, camera viewpoints |
| `src/ui/story/` | Speech bubbles, the album, the map, "Let go!", the weight meter, controls, the start screen and the About screen |
| `scripts/` | The NASA asset pipelines, voice generation and the size check |
| `tests/e2e/` | Playwright specs, named after the cases in `testcase.md` |
| `docs/` | The story script and fact check, visual style, asset budget |

More detail: [`apollo-11-prd.md`](apollo-11-prd.md) (product definition),
[`testcase.md`](testcase.md) (test plan), [`docs/story.md`](docs/story.md) (script and sources).

## What's next

- **Mars:** the same story for the hardware left on Mars, including landers, heat shields, parachutes and retired rovers.
- **More languages**, recorded by native speakers.
- **Classroom mode:** a teacher's guide and printable album cards.
- **Real-device performance** passes on low-end school tablets.

## Credits

Team **Spaced Outcats**.

NASA imagery, 3D models and audio: public domain, credited above. LRO image: NASA/GSFC/Arizona
State University. Character voices: ElevenLabs. Film credits: `moon-global-film/CREDITS` and
`moon-pitch-film/CREDITS`.

*Made for the NASA International Space Apps Challenge. Not endorsed by NASA.*
