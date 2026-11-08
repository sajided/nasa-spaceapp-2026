"use client";

import { useState } from "react";
import styles from "./visuals.module.css";
import danceStyles from "./DeepSpaceDance.module.css";

export default function DeepSpaceDance() {
  const [docked, setDocked] = useState(true);

  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* Distant Sun */}
      <div className={danceStyles.sunWrapper}>
        <div className={danceStyles.sunCore} />
        <div className={danceStyles.sunHalo} />
        <span className={danceStyles.sunLabel}>Sun (Solar Orbit)</span>
      </div>

      {/* Interactive Toggle for the Docking Maneuver */}
      <button
        type="button"
        className={danceStyles.danceToggle}
        onClick={() => setDocked(!docked)}
      >
        {docked ? "Show Undocked Maneuver" : "Show Docked Position"}
      </button>

      {/* S-IVB Third Stage (Empty Garage floating away) */}
      <div
        className={`${danceStyles.s4bStage} ${
          docked ? danceStyles.s4bDiscarded : danceStyles.s4bNear
        }`}
      >
        <div className={danceStyles.garageOpen}>
          <div className={danceStyles.petalLeft} />
          <div className={danceStyles.petalRight} />
        </div>
        <div className={danceStyles.s4bCylinder} />
        <span className={danceStyles.craftLabel}>
          S-IVB &quot;Garage&quot; (Sent to orbit the Sun)
        </span>
      </div>

      {/* Spacecraft Dance: CSM & Lunar Module */}
      <div
        className={`${danceStyles.csmLmMating} ${
          docked ? danceStyles.matingDocked : danceStyles.matingSeparate
        }`}
      >
        {/* Command & Service Module */}
        <div className={danceStyles.csmShip}>
          <div className={danceStyles.cmdCapsule} />
          <div className={danceStyles.smBody} />
          <div className={danceStyles.spsEngine} />
          <span className={danceStyles.craftLabel}>Columbia (CSM)</span>
        </div>

        {/* Lunar Module (Eagle) */}
        <div className={danceStyles.lunarModule}>
          <div className={danceStyles.lmAscentStage} />
          <div className={danceStyles.lmDescentBase} />
          <span className={danceStyles.craftLabel}>Eagle (LM)</span>
        </div>
      </div>

      <div className={styles.caption}>
        {docked
          ? "Translunar Injection complete: CSM docked nose-to-nose with Eagle"
          : "Transposition maneuver: CSM flips 180° to extract Eagle from S-IVB"}
      </div>
    </div>
  );
}

