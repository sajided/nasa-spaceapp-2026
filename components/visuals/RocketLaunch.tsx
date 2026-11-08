"use client";

import { useState } from "react";
import styles from "./visuals.module.css";
import launchStyles from "./RocketLaunch.module.css";

type StageMode = "launch" | "sic" | "les" | "sii";

export default function RocketLaunch() {
  const [activeStep, setActiveStep] = useState<StageMode>("launch");

  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* Earth curve at bottom for launch perspective */}
      <div className={launchStyles.earthHorizon} />

      {/* Interactive stage controls */}
      <div className={launchStyles.stageControls}>
        <button
          className={`${launchStyles.stepBtn} ${activeStep === "launch" ? launchStyles.activeBtn : ""}`}
          onClick={() => setActiveStep("launch")}
          type="button"
        >
          T+ 00:00 Liftoff
        </button>
        <button
          className={`${launchStyles.stepBtn} ${activeStep === "sic" ? launchStyles.activeBtn : ""}`}
          onClick={() => setActiveStep("sic")}
          type="button"
        >
          T+ 02:44 S-IC Drop
        </button>
        <button
          className={`${launchStyles.stepBtn} ${activeStep === "les" ? launchStyles.activeBtn : ""}`}
          onClick={() => setActiveStep("les")}
          type="button"
        >
          T+ 03:18 LES Jettison
        </button>
        <button
          className={`${launchStyles.stepBtn} ${activeStep === "sii" ? launchStyles.activeBtn : ""}`}
          onClick={() => setActiveStep("sii")}
          type="button"
        >
          T+ 09:12 S-II Drop
        </button>
      </div>

      {/* Saturn V Stack Diagram */}
      <div className={launchStyles.rocketContainer}>
        {/* Launch Escape System (LES) */}
        <div
          className={`${launchStyles.stage} ${launchStyles.lesStage} ${
            activeStep === "les" || activeStep === "sii" ? launchStyles.detachedLes : ""
          }`}
        >
          <div className={launchStyles.escapeTower} />
          <span className={launchStyles.stageTag}>LES (Escape Tower)</span>
        </div>

        {/* Command & Service Module (CSM) */}
        <div className={`${launchStyles.stage} ${launchStyles.csmStage}`}>
          <div className={launchStyles.csmCone} />
          <div className={launchStyles.serviceCylinder} />
          <span className={launchStyles.stageTag}>Command & Service Module</span>
        </div>

        {/* S-IVB (Third stage) */}
        <div className={`${launchStyles.stage} ${launchStyles.s4bStage}`}>
          <div className={launchStyles.s4bBody} />
          <span className={launchStyles.stageTag}>S-IVB (Third Stage)</span>
        </div>

        {/* S-II (Second stage) */}
        <div
          className={`${launchStyles.stage} ${launchStyles.s2Stage} ${
            activeStep === "sii" ? launchStyles.detachedSii : ""
          }`}
        >
          <div className={launchStyles.s2Body} />
          <span className={launchStyles.stageTag}>S-II (Second Stage)</span>
        </div>

        {/* S-IC (First stage) */}
        <div
          className={`${launchStyles.stage} ${launchStyles.s1cStage} ${
            activeStep === "sic" || activeStep === "les" || activeStep === "sii"
              ? launchStyles.detachedSic
              : ""
          }`}
        >
          <div className={launchStyles.s1cBody} />
          {/* F-1 Thruster Flame (active during launch) */}
          {activeStep === "launch" && (
            <div className={launchStyles.rocketFlame}>
              <div className={launchStyles.flameInner} />
            </div>
          )}
          <span className={launchStyles.stageTag}>S-IC (Huge First Stage)</span>
        </div>
      </div>

      <div className={styles.caption}>
        {activeStep === "launch" && "Saturn V: Full 111-meter stack at liftoff"}
        {activeStep === "sic" && "S-IC separation: First stage drops into Atlantic Ocean"}
        {activeStep === "les" && "LES jettisoned: Astronauts see sunlight through windows"}
        {activeStep === "sii" && "S-II separation: Second stage burns up in atmosphere"}
      </div>
    </div>
  );
}

