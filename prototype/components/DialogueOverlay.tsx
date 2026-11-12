"use client";

import { useMemo } from "react";
import styles from "./DialogueOverlay.module.css";
import { StoryStep } from "@/data/script";
import Timeline from "@/components/Timeline";

interface DialogueOverlayProps {
  currentStep: StoryStep;
  currentIndex: number;
  totalSteps: number;
  onAdvance: () => void;
  onBack: () => void;
  onRestart: () => void;
}

export default function DialogueOverlay({
  currentStep,
  currentIndex,
  totalSteps,
  onAdvance,
  onBack,
  onRestart,
}: DialogueOverlayProps) {
  const isEarth = currentStep.speaker === "earth";
  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;
  const isFinalStep = currentIndex === totalSteps - 1;

  // Format **bold** markdown tags in dialogue
  const formattedText = useMemo(() => {
    const parts = currentStep.text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  }, [currentStep.text]);

  return (
    <div className={styles.overlayContainer}>
      {/* Top Header Bar */}
      <header className={styles.topBar}>
        <div className={styles.titleInfo}>
          <h1 className={styles.mainTitle}>The Monuments We Left Behind</h1>
          <span className={styles.sceneBadge}>{currentStep.sceneTitle}</span>
        </div>

        {currentStep.timeline && (
          <div className={styles.timelineBox}>
            <Timeline time={currentStep.timeline} />
          </div>
        )}
      </header>

      {/* Visual Cue Banner */}
      {currentStep.visualCue && (
        <div className={styles.visualCueBanner}>
          <span className={styles.cueIcon}>👁</span>
          <span className={styles.cueText}>{currentStep.visualCue}</span>
        </div>
      )}

      {/* Spatial Dialogue Bubble: Anchored beside the speaking planet */}
      <div
        className={`${styles.spatialBubble} ${
          isEarth ? styles.earthBubblePosition : styles.moonBubblePosition
        }`}
        key={currentStep.id}
      >
        <div className={styles.speakerPill}>
          <span className={styles.avatarIcon} role="img" aria-label={currentStep.speaker}>
            {isEarth ? "🌍" : "🌕"}
          </span>
          <span className={styles.speakerName}>
            {isEarth ? "Earth" : "Moon"}
          </span>
          {currentStep.emotion && (
            <span className={styles.emotionTag}>*({currentStep.emotion})*</span>
          )}
        </div>

        <div className={styles.bubbleCard}>
          <p className={styles.bubbleText}>{formattedText}</p>
        </div>

        {/* Directional speech arrow pointing toward planet */}
        <div
          className={`${styles.speechTail} ${
            isEarth ? styles.tailToLeft : styles.tailToRight
          }`}
        />
      </div>

      {/* Bottom Navigation & Progress Bar */}
      <footer className={styles.bottomBar}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={styles.controlsRow}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            disabled={currentIndex === 0}
            aria-label="Previous step"
          >
            ← Back
          </button>

          <div className={styles.centerInfo}>
            <span className={styles.stepCounter}>
              Step {currentIndex + 1} of {totalSteps}
            </span>
            <span className={styles.clickHint}>
              Click screen or press <kbd className={styles.kbd}>Space</kbd>
            </span>
          </div>

          {isFinalStep ? (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.restartBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                onRestart();
              }}
            >
              ↻ Replay Story
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.advanceBtn}`}
              onClick={(e) => {
                e.stopPropagation();
                onAdvance();
              }}
              aria-label="Next step"
            >
              Next →
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

