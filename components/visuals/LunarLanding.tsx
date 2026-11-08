"use client";

import { useState } from "react";
import styles from "./visuals.module.css";
import landStyles from "./LunarLanding.module.css";

export default function LunarLanding() {
  const [liftoff, setLiftoff] = useState(true);

  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* Earth visible in the black sky above the lunar horizon */}
      <div className={landStyles.distantEarth}>
        <div className={landStyles.earthBall} />
        <span className={landStyles.earthText}>Earth in sky</span>
      </div>

      {/* Interactive Liftoff Button */}
      <button
        type="button"
        className={landStyles.liftoffBtn}
        onClick={() => setLiftoff(!liftoff)}
      >
        {liftoff ? "Reset to Landed Position" : "Trigger Ascent Liftoff"}
      </button>

      {/* Lunar Surface Ground */}
      <div className={landStyles.ground}>
        <div className={landStyles.craterA} />
        <div className={landStyles.craterB} />
        <div className={landStyles.footprints} />
      </div>

      {/* Lunar Module Container */}
      <div className={landStyles.landerStation}>
        {/* Ascent Stage (top half that shoots up) */}
        <div
          className={`${landStyles.ascentStage} ${
            liftoff ? landStyles.ascentLaunched : landStyles.ascentAttached
          }`}
        >
          <div className={landStyles.ascentCabin}>
            <div className={landStyles.windowL} />
            <div className={landStyles.windowR} />
          </div>
          {liftoff && (
            <div className={landStyles.ascentPlume}>
              <div className={landStyles.plumeCore} />
            </div>
          )}
          <span className={landStyles.ascentTag}>
            Ascent Stage {liftoff ? "(Blasting to orbit)" : ""}
          </span>
        </div>

        {/* Descent Stage (golden bottom half - stays forever) */}
        <div className={landStyles.descentStage}>
          {/* Gold insulated core body */}
          <div className={landStyles.descentBody}>
            <span className={landStyles.goldFoilTexture} />
          </div>

          {/* 4 Landing gear legs with footpads */}
          <div className={`${landStyles.landingLeg} ${landStyles.legLeft}`} />
          <div className={`${landStyles.landingLeg} ${landStyles.legRight}`} />
          <div className={`${landStyles.pad} ${landStyles.padLeft}`} />
          <div className={`${landStyles.pad} ${landStyles.padRight}`} />

          {/* Permanent Monument Label */}
          <div className={landStyles.monumentBadge}>
            <span className={landStyles.monumentStar}>✦</span>
            <span>Permanent Monument: Golden Descent Stage</span>
          </div>
        </div>
      </div>

      <div className={styles.caption}>
        {liftoff
          ? "T+ 124:22:00 · Ascent Stage launches. The golden Descent Stage remains forever."
          : "T+ 102:45:40 · Eagle safely landed at Tranquility Base"}
      </div>
    </div>
  );
}

