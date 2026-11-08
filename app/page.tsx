import { storyScenes } from "@/data/script";
import Scene from "@/components/Scene";
import Timeline from "@/components/Timeline";
import DialogueBubble from "@/components/DialogueBubble";

// Visual components
import EarthMoonView from "@/components/visuals/EarthMoonView";
import RocketLaunch from "@/components/visuals/RocketLaunch";
import DeepSpaceDance from "@/components/visuals/DeepSpaceDance";
import MoonOrbit from "@/components/visuals/MoonOrbit";
import LunarLanding from "@/components/visuals/LunarLanding";
import ReturnHome from "@/components/visuals/ReturnHome";
import MuseumOfCourage from "@/components/visuals/MuseumOfCourage";

import styles from "./page.module.css";

export default function Home() {
  // Mapping each scene ID to its corresponding visual component
  const sceneVisuals: Record<number, React.ReactNode> = {
    1: <EarthMoonView />,
    2: <RocketLaunch />,
    3: <DeepSpaceDance />,
    4: <MoonOrbit />,
    5: <LunarLanding />,
    6: <ReturnHome />,
    7: <MuseumOfCourage />,
  };

  return (
    <main className={styles.mainContainer}>
      {/* Hero Header */}
      <header className={styles.hero}>
        <div className={styles.heroBadge}>Interactive Apollo 11 Story</div>
        <h1 className={styles.heroTitle}>The Monuments We Left Behind</h1>
        <p className={styles.heroSubtitle}>
          A conversation across the cosmos between Earth and the Moon about the pieces
          we dropped, the stages we sacrificed, and the eternal monuments left behind.
        </p>
        <div className={styles.scrollIndicator}>
          <span>Scroll to begin the voyage</span>
          <span className={styles.arrowDown}>↓</span>
        </div>
      </header>

      {/* Story Scenes */}
      <div className={styles.storyFlow}>
        {storyScenes.map((scene) => (
          <Scene
            key={scene.id}
            id={`scene-${scene.id}`}
            title={scene.title}
            subtitle={scene.subtitle}
            visualCue={scene.visualCue}
            visual={sceneVisuals[scene.id]}
          >
            {scene.sections.map((section) => (
              <div key={section.id} className={styles.sectionBlock}>
                {section.timeline && (
                  <div className={styles.timelineRow}>
                    <Timeline time={section.timeline} />
                  </div>
                )}

                <div className={styles.dialogueList}>
                  {section.dialogue.map((item, idx) => (
                    <DialogueBubble
                      key={`${section.id}-${idx}`}
                      speaker={item.speaker}
                      text={item.text}
                      emotion={item.emotion}
                    />
                  ))}
                </div>
              </div>
            ))}
          </Scene>
        ))}
      </div>

      {/* Epilogue / Footer */}
      <footer className={styles.epilogue}>
        <div className={styles.epilogueQuote}>
          <p>
            &ldquo;I guess I am not just empty rocks and dust anymore. I am a museum of
            human courage.&rdquo;
          </p>
          <span className={styles.quoteSpeaker}>— The Moon</span>
        </div>
        <div className={styles.footnote}>
          <p>The Monuments We Left Behind · Built with Next.js</p>
        </div>
      </footer>
    </main>
  );
}
