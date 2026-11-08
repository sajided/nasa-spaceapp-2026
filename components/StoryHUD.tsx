"use client";

import { useEffect } from "react";
import styles from "./StoryHUD.module.css";
import { StoryStep } from "@/data/script";
import Timeline from "@/components/Timeline";

interface StoryHUDProps {
  currentStep: StoryStep;
  currentIndex: number;
  totalSteps: number;
  onAdvance: () => void;
  onBack: () => void;
  onRestart: () => void;
}

export default function StoryHUD({
  currentStep,
  currentIndex,
  totalSteps,
  onAdvance,
  onBack,
  onRestart,
}: StoryHUDProps) {
  // Global spacebar and arrow navigation listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        onAdvance();
      } else if (e.code === "ArrowLeft" || e.code === "Backspace") {
        e.preventDefault();
        onBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onAdvance, onBack]);

  const progressPercent = ((currentIndex + 1) / totalSteps) * 100;
  const isFinalStep = currentIndex === totalSteps - 1;

  return (
    <div className={styles.hudOverlay}>
      {/* Top Header Bar */}
      <header className={styles.topHeader}>
        <div className={styles.titleGroup}>
          <span className={styles.mainTitle}>The Monuments We Left Behind</span>
          <span className={styles.sceneTitle}>{currentStep.sceneTitle}</span>
        </div>

        {currentStep.timeline && (
          <div className={styles.timelineWrapper}>
            <Timeline time={currentStep.timeline} />
          </div>
        )}
      </header>

      {/* Visual Cue Banner (optional, subtle developer / cinematic visual cue) */}
      {currentStep.visualCue && (
        <div className={styles.visualCue}>
          <span className={styles.cueIcon}>👁</span>
          <span className={styles.cueText}>{currentStep.visualCue}</span>
        </div>
      )}

      {/* Bottom Control Bar */}
      <footer className={styles.bottomBar}>
        {/* Progress track */}
        <div className={styles.progressContainer}>
          <div
            className={styles.progressBar}
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className={styles.controlsRow}>
          <button
            type="button"
            className={styles.navBtn}
            onClick={onBack}
            disabled={currentIndex === 0}
            aria-label="Previous step"
          >
            ← Back
          </button>

          <div className={styles.stepInfo}>
            <span className={styles.stepCount}>
              Step {currentIndex + 1} of {totalSteps}
            </span>
            <span className={styles.shortcutHint}>
              Click screen or press <kbd className={styles.kbd}>Space</kbd>
            </span>
          </div>

          {isFinalStep ? (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.restartBtn}`}
              onClick={onRestart}
            >
              ↻ Replay Story
            </button>
          ) : (
            <button
              type="button"
              className={`${styles.navBtn} ${styles.advanceBtn}`}
              onClick={onAdvance}
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
