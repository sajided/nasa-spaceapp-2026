"use client";

import { useState } from "react";
import styles from "./visuals.module.css";
import museumStyles from "./MuseumOfCourage.module.css";

export default function MuseumOfCourage() {
  const [zoomed, setZoomed] = useState(false);

  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* Earth distant blue pearl */}
      <div className={museumStyles.distantEarthSphere}>
        <div className={museumStyles.earthSphereGlow} />
        <span className={museumStyles.sphereLabel}>Home</span>
      </div>

      {/* Zoom in/out control */}
      <button
        type="button"
        className={museumStyles.zoomBtn}
        onClick={() => setZoomed(!zoomed)}
      >
        {zoomed ? "Pan Out to Full Moon" : "Zoom into Tranquility Base"}
      </button>

      {/* The Moon */}
      <div
        className={`${museumStyles.moonContainer} ${
          zoomed ? museumStyles.moonZoomed : museumStyles.moonNormal
        }`}
      >
        <svg
          viewBox="0 0 200 200"
          className={museumStyles.moonSvg}
          role="img"
          aria-label="The Moon as a Museum of Human Courage"
        >
          <defs>
            <radialGradient id="museumMoonGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#f1f5f9" />
              <stop offset="45%" stopColor="#94a3b8" />
              <stop offset="75%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
          </defs>

          {/* Moon Sphere */}
          <circle cx="100" cy="100" r="92" fill="url(#museumMoonGrad)" />

          {/* Maria (Lunar Seas) */}
          {/* Sea of Serenity */}
          <ellipse cx="115" cy="65" rx="20" ry="16" fill="#334155" opacity="0.45" />
          {/* Sea of Tranquility */}
          <ellipse cx="125" cy="95" rx="26" ry="22" fill="#334155" opacity="0.5" />
          {/* Ocean of Storms */}
          <ellipse cx="55" cy="95" rx="32" ry="40" fill="#334155" opacity="0.4" />
          {/* Sea of Rains (Mare Imbrium) */}
          <ellipse cx="80" cy="55" rx="26" ry="22" fill="#334155" opacity="0.45" />
        </svg>

        {/* The Golden Beacon: Tranquility Base (Descent Stage) */}
        <div className={museumStyles.monumentBeacon}>
          <div className={museumStyles.beaconRings} />
          <div className={museumStyles.beaconCore} />
          <div className={museumStyles.beaconPointer}>
            <span className={museumStyles.pinStar}>★</span>
            <span className={museumStyles.pinTitle}>Tranquility Base</span>
            <span className={museumStyles.pinSub}>Apollo 11 Descent Stage</span>
          </div>
        </div>
      </div>

      <div className={styles.caption}>
        {zoomed
          ? "Tranquility Base: The golden Descent Stage sits silently and peacefully forever"
          : "The Moon: Not just empty rocks and dust, but a museum of human courage"}
      </div>
    </div>
  );
}

