"use client";

import { useState, useCallback } from "react";
import { storySteps } from "@/data/script";
import SpaceCanvas from "@/components/SpaceCanvas";
import PlanetDialogueBubble from "@/components/PlanetDialogueBubble";
import StoryHUD from "@/components/StoryHUD";

interface PlanetCoords {
  x: number;
  y: number;
  visible: boolean;
}

export default function Home() {
  const [stepIndex, setStepIndex] = useState(0);
  const [planetCoords, setPlanetCoords] = useState<{
    earth: PlanetCoords;
    moon: PlanetCoords;
  }>({
    earth: { x: 0, y: 0, visible: true },
    moon: { x: 0, y: 0, visible: true },
  });

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

  const handlePositionsUpdate = useCallback(
    (coords: { earth: PlanetCoords; moon: PlanetCoords }) => {
      setPlanetCoords(coords);
    },
    []
  );

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
      }}
    >
      {/* 3D Immersive WebGL Canvas */}
      <SpaceCanvas
        currentStep={currentStep}
        onPositionsUpdate={handlePositionsUpdate}
        onAdvance={handleAdvance}
      />

      {/* Spatial Dialogue Bubble floating beside the speaking planet */}
      <PlanetDialogueBubble
        key={currentStep.id}
        speaker={currentStep.speaker}
        text={currentStep.text}
        emotion={currentStep.emotion}
        coords={
          currentStep.speaker === "earth"
            ? planetCoords.earth
            : planetCoords.moon
        }
      />

      {/* Immersive HUD Overlay & Controls */}
      <StoryHUD
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
