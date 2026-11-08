"use client";

import { useMemo } from "react";
import styles from "./PlanetDialogueBubble.module.css";
import { Speaker } from "@/data/script";

interface PlanetCoords {
  x: number;
  y: number;
  visible: boolean;
}

interface PlanetDialogueBubbleProps {
  speaker: Speaker;
  text: string;
  emotion?: string;
  coords?: PlanetCoords;
}

export default function PlanetDialogueBubble({
  speaker,
  text,
  emotion,
  coords,
}: PlanetDialogueBubbleProps) {
  const isEarth = speaker === "earth";

  // Parse **bold** markdown tags
  const renderedText = useMemo(() => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }, [text]);

  // Compute screen position beside the planet
  const positionStyle = useMemo(() => {
    if (!coords || !coords.visible || typeof window === "undefined") {
      // Fallback side positions
      return isEarth
        ? { left: "10%", top: "45%" }
        : { right: "10%", top: "45%" };
    }

    const pad = 24;
    const bubbleWidth = 360;
    const bubbleHeight = 160;

    let posX = coords.x;
    const posY = coords.y - 120; // Float slightly above the center of the planet

    if (isEarth) {
      // Place to the right of Earth
      posX = coords.x + 80;
    } else {
      // Place to the left of Moon
      posX = coords.x - bubbleWidth - 80;
    }

    // Clamp inside viewport
    const maxX = window.innerWidth - bubbleWidth - pad;
    const maxY = window.innerHeight - bubbleHeight - pad;
    const clampedX = Math.max(pad, Math.min(posX, maxX));
    const clampedY = Math.max(pad + 60, Math.min(posY, maxY));

    return {
      left: `${clampedX}px`,
      top: `${clampedY}px`,
    };
  }, [coords, isEarth]);

  return (
    <div
      className={`${styles.bubbleWrapper} ${
        isEarth ? styles.earthWrapper : styles.moonWrapper
      }`}
      style={positionStyle}
    >
      <div className={styles.avatarPill}>
        <span className={styles.avatarIcon} role="img" aria-label={speaker}>
          {isEarth ? "🌍" : "🌕"}
        </span>
        <span className={styles.speakerName}>
          {isEarth ? "Earth" : "Moon"}
        </span>
        {emotion && <span className={styles.emotion}>*({emotion})*</span>}
      </div>

      <div className={styles.dialogueBox}>
        <p className={styles.dialogueText}>{renderedText}</p>
      </div>

      {/* Speech Pointer Arrow */}
      <div
        className={`${styles.speechPointer} ${
          isEarth ? styles.pointerLeft : styles.pointerRight
        }`}
      />
    </div>
  );
}
