"use client";

import { ReactNode } from "react";
import { useInView } from "@/hooks/useInView";
import styles from "./Scene.module.css";

interface SceneProps {
  id: string;
  title: string;
  subtitle?: string;
  visualCue?: string;
  visual: ReactNode;
  children: ReactNode;
}

export default function Scene({
  id,
  title,
  subtitle,
  visualCue,
  visual,
  children,
}: SceneProps) {
  const { ref, isInView } = useInView({ threshold: 0.15 });

  return (
    <section
      id={id}
      ref={ref}
      className={`${styles.sceneSection} ${isInView ? styles.inView : ""}`}
    >
      <div className={styles.stickyVisualContainer}>
        <div className={styles.visualWrapper}>{visual}</div>
        {visualCue && (
          <div className={styles.visualCueBanner}>
            <span className={styles.visualCueIcon}>👁</span>
            <span className={styles.visualCueText}>{visualCue}</span>
          </div>
        )}
      </div>

      <div className={styles.storyContent}>
        <header className={styles.sceneHeader}>
          <h2 className={styles.title}>{title}</h2>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </header>

        <div className={styles.dialogueStream}>{children}</div>
      </div>
    </section>
  );
}

