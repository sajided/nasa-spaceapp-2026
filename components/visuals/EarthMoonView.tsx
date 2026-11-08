import styles from "./visuals.module.css";
import viewStyles from "./EarthMoonView.module.css";

export default function EarthMoonView() {
  return (
    <div className={styles.canvas}>
      <div className={styles.stars} />

      {/* Earth */}
      <div className={viewStyles.earthWrapper}>
        <div className={viewStyles.earthGlow} />
        <svg
          viewBox="0 0 100 100"
          className={viewStyles.earthSvg}
          role="img"
          aria-label="Earth"
        >
          <defs>
            <radialGradient id="earthGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#6ee7b7" />
              <stop offset="30%" stopColor="#3b82f6" />
              <stop offset="70%" stopColor="#1d4ed8" />
              <stop offset="100%" stopColor="#0f172a" />
            </radialGradient>
            <radialGradient id="atmosphereGlow" cx="50%" cy="50%" r="50%">
              <stop offset="85%" stopColor="rgba(56, 189, 248, 0)" />
              <stop offset="100%" stopColor="rgba(56, 189, 248, 0.45)" />
            </radialGradient>
          </defs>
          {/* Base sphere */}
          <circle cx="50" cy="50" r="45" fill="url(#earthGrad)" />
          {/* Swirling continents / clouds */}
          <path
            d="M 30,30 Q 45,20 60,35 Q 70,50 55,65 Q 40,75 35,55 Z"
            fill="#10b981"
            opacity="0.75"
          />
          <path
            d="M 60,40 Q 75,35 85,50 Q 80,70 65,65 Q 60,55 60,40 Z"
            fill="#059669"
            opacity="0.65"
          />
          <path
            d="M 25,60 Q 35,55 45,68 Q 38,80 25,75 Z"
            fill="#34d399"
            opacity="0.6"
          />
          {/* White cloud swirls */}
          <path
            d="M 20,40 Q 50,30 80,48 Q 50,55 20,40 Z"
            fill="#ffffff"
            opacity="0.3"
          />
          {/* Atmospheric halo */}
          <circle cx="50" cy="50" r="45" fill="url(#atmosphereGlow)" />
        </svg>
        <span className={viewStyles.label}>Earth</span>
      </div>

      {/* Distance line */}
      <div className={viewStyles.distanceLine}>
        <span className={viewStyles.distanceText}>384,400 km</span>
      </div>

      {/* Moon */}
      <div className={viewStyles.moonWrapper}>
        <svg
          viewBox="0 0 100 100"
          className={viewStyles.moonSvg}
          role="img"
          aria-label="Moon"
        >
          <defs>
            <radialGradient id="moonGrad" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#e2e8f0" />
              <stop offset="50%" stopColor="#94a3b8" />
              <stop offset="85%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </radialGradient>
          </defs>
          {/* Base moon sphere */}
          <circle cx="50" cy="50" r="46" fill="url(#moonGrad)" />
          {/* Craters (Mare) */}
          <circle cx="38" cy="36" r="10" fill="#334155" opacity="0.45" />
          <circle cx="62" cy="42" r="14" fill="#334155" opacity="0.4" />
          <circle cx="48" cy="65" r="8" fill="#334155" opacity="0.35" />
          <circle cx="32" cy="62" r="5" fill="#334155" opacity="0.3" />
          <circle cx="68" cy="66" r="6" fill="#334155" opacity="0.3" />
        </svg>
        <span className={viewStyles.label}>The Moon (Quiet & Lonely)</span>
      </div>

      <div className={styles.caption}>Scene 1 · Deep Space View</div>
    </div>
  );
}

