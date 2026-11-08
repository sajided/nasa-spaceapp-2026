"use client";

import { useState } from "react";
import styles from "./visuals.module.css";
import orbitStyles from "./MoonOrbit.module.css";

export default function MoonOrbit() {
  const [separated, setSeparated] = useState(true);

  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* The Moon Globe */}
      <div className={orbitStyles.moonGlobe}>
        <div className={orbitStyles.crater1} />
        <div className={orbitStyles.crater2} />
        <div className={orbitStyles.crater3} />
        <span className={orbitStyles.moonFarSideTag}>Far Side of the Moon</span>
      </div>

      {/* Orbit Trajectory Path */}
      <div className={orbitStyles.orbitPath} />

      {/* Interactive Toggle */}
      <button
        type="button"
        className={orbitStyles.orbitToggle}
        onClick={() => setSeparated(!separated)}
      >
        {separated ? "Reset to Undivided Orbit" : "Show Eagle Separation"}
      </button>

      {/* Command Module (Columbia) in orbit */}
      <div className={orbitStyles.csmOrbiting}>
        <div className={orbitStyles.csmShape} />
        <span className={orbitStyles.craftTag}>CSM &apos;Columbia&apos; (in orbit)</span>
      </div>

      {/* Lunar Module (Eagle) separating and descending */}
      <div
        className={`${orbitStyles.eagleCraft} ${
          separated ? orbitStyles.eagleDescending : orbitStyles.eagleAttached
        }`}
      >
        <div className={orbitStyles.eagleShape} />
        <div className={orbitStyles.descentArrow} />
        <span className={orbitStyles.craftTag}>
          LM &apos;Eagle&apos; (Descending to surface)
        </span>
      </div>

      <div className={styles.caption}>
        {separated
          ? "T+ 100:12:00 · Eagle separates over the far side and begins descent"
          : "T+ 100:00:00 · Combined spacecraft orbiting the Moon"}
      </div>
    </div>
  );
}

