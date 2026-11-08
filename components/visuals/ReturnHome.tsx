"use client";

import { useState } from "react";
import styles from "./visuals.module.css";
import returnStyles from "./ReturnHome.module.css";

type Phase = "ascentCrash" | "serviceBurn";

export default function ReturnHome() {
  const [phase, setPhase] = useState<Phase>("ascentCrash");

  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* Switch between the two stages of goodbyes */}
      <div className={returnStyles.controls}>
        <button
          type="button"
          className={`${returnStyles.phaseBtn} ${
            phase === "ascentCrash" ? returnStyles.activeBtn : ""
          }`}
          onClick={() => setPhase("ascentCrash")}
        >
          T+ 130:09 Ascent Stage Crash
        </button>
        <button
          type="button"
          className={`${returnStyles.phaseBtn} ${
            phase === "serviceBurn" ? returnStyles.activeBtn : ""
          }`}
          onClick={() => setPhase("serviceBurn")}
        >
          T+ 194:49 Service Module Burn
        </button>
      </div>

      {phase === "ascentCrash" ? (
        /* Phase 1: Ascent stage crashed on the Moon */
        <div className={returnStyles.moonImpactContainer}>
          <div className={returnStyles.lunarSurface}>
            <div className={returnStyles.crashSite}>
              <span className={returnStyles.impactFlash} />
              <div className={returnStyles.debris} />
              <span className={returnStyles.impactTag}>
                Empty Ascent Stage crashed into Moon
              </span>
            </div>
          </div>
          <div className={returnStyles.csmDeparting}>
            <div className={returnStyles.csmMini} />
            <span className={returnStyles.departTag}>
              Columbia heading to Earth with moon rocks
            </span>
          </div>
        </div>
      ) : (
        /* Phase 2: Service module burns up, Command module splashes into ocean */
        <div className={returnStyles.earthReentryContainer}>
          {/* Earth atmosphere and ocean */}
          <div className={returnStyles.earthOcean}>
            <div className={returnStyles.atmosphereFrictionLayer} />
            <span className={returnStyles.oceanLabel}>Pacific Ocean Splashdown</span>
          </div>

          {/* Service Module burning up */}
          <div className={returnStyles.burningSm}>
            <div className={returnStyles.smPiece} />
            <div className={returnStyles.fireTrail} />
            <span className={returnStyles.burnTag}>
              Service Module (Burned up at 40,000 km/h)
            </span>
          </div>

          {/* Command module descending with parachutes */}
          <div className={returnStyles.splashdownModule}>
            {/* Parachutes */}
            <div className={returnStyles.chutes}>
              <div className={returnStyles.chute1} />
              <div className={returnStyles.chute2} />
              <div className={returnStyles.chute3} />
            </div>
            {/* Command capsule with charred heat shield */}
            <div className={returnStyles.heatShieldCone} />
            <span className={returnStyles.splashTag}>
              Tiny Command Module (Safe Splashdown)
            </span>
          </div>
        </div>
      )}

      <div className={styles.caption}>
        {phase === "ascentCrash"
          ? "T+ 130:09:31 · Ascent stage pulled down by lunar gravity and crashed"
          : "T+ 194:49:12 · Service module burns up; Command module splashes into ocean"}
      </div>
    </div>
  );
}

