"use client";

import { useState, useCallback, useEffect } from "react";
import { storySteps } from "@/data/script";
import Canvas3D from "@/components/Canvas3D";
import DialogueOverlay from "@/components/DialogueOverlay";

export default function Home() {
  const [stepIndex, setStepIndex] = useState(0);

  const currentStep = storySteps[stepIndex];

  const handleAdvance = useCallback(() => {
    setStepIndex((prev) => (prev < storySteps.length - 1 ? prev + 1 : prev));
  }, []);

  const handleBack = useCallback(() => {
    setStepIndex((prev) => (prev > 0 ? prev - 1 : 0));
  }, []);

  const handleRestart = useCallback(() => {
    setStepIndex(0);
  }, []);

  // Universal click & keyboard listener: click anywhere on screen or press Spacebar to advance
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      // If user clicked directly on a button or inside a button, let the button handle it
      const target = e.target as HTMLElement | null;
      if (target?.closest("button")) {
        return;
      }
      handleAdvance();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (e.code === "Space" || e.code === "ArrowRight") {
        e.preventDefault();
        handleAdvance();
      } else if (e.code === "ArrowLeft" || e.code === "Backspace") {
        e.preventDefault();
        handleBack();
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleAdvance, handleBack]);

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        backgroundColor: "#050814",
        userSelect: "none",
        cursor: "pointer",
      }}
    >
      {/* 3D WebGL Canvas with Low-Poly Models & Staging */}
      <Canvas3D currentStep={currentStep} />

      {/* Speech Bubbles beside Earth/Moon & Story HUD */}
      <DialogueOverlay
        currentStep={currentStep}
        currentIndex={stepIndex}
        totalSteps={storySteps.length}
        onAdvance={handleAdvance}
        onBack={handleBack}
        onRestart={handleRestart}
      />
    </main>
  );
}
