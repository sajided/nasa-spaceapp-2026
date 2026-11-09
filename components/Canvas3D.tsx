"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { StoryStep } from "@/data/script";

interface Canvas3DProps {
  currentStep: StoryStep;
}

export default function Canvas3D({ currentStep }: Canvas3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<StoryStep>(currentStep);

  // Keep stepRef in sync with props without causing re-renders
  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- 1. Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // --- 2. Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.0);
    sunLight.position.set(20, 15, 20);
    scene.add(sunLight);

    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    fillLight.position.set(-20, -10, -10);
    scene.add(fillLight);

    // --- 3. Starfield ---
    const starCount = 1500;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 400;
      starPositions[i + 1] = (Math.random() - 0.5) * 400;
      starPositions[i + 2] = (Math.random() - 0.5) * 400;
    }
    starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.9,
      transparent: true,
      opacity: 0.85,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // --- 4. Low-Poly Earth ---
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-7, 0, 0);

    // Ocean base: faceted icosahedron
    const earthOcean = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.6, 2),
      new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        flatShading: true,
        roughness: 0.75,
      })
    );
    earthGroup.add(earthOcean);

    // Green continents: faceted landmasses
    const earthContinents = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.64, 1),
      new THREE.MeshStandardMaterial({
        color: 0x10b981,
        flatShading: true,
        roughness: 0.85,
      })
    );
    earthGroup.add(earthContinents);

    // Subtle atmospheric halo
    const earthAtmosphere = new THREE.Mesh(
      new THREE.IcosahedronGeometry(3.8, 1),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        wireframe: true,
        transparent: true,
        opacity: 0.15,
      })
    );
    earthGroup.add(earthAtmosphere);
    scene.add(earthGroup);

    // --- 5. Low-Poly Moon ---
    const moonGroup = new THREE.Group();
    moonGroup.position.set(7, 0, 0);

    // Lunar body: faceted icosahedron
    const moonBody = new THREE.Mesh(
      new THREE.IcosahedronGeometry(2.0, 2),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        flatShading: true,
        roughness: 0.95,
      })
    );
    moonGroup.add(moonBody);

    // Craters: darker gray facets
    const craterGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const craterMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      flatShading: true,
      roughness: 1.0,
    });

    const crater1 = new THREE.Mesh(craterGeo, craterMat);
    crater1.position.set(0.9, 0.8, 1.4);
    crater1.scale.set(1.2, 0.3, 1.2);
    moonGroup.add(crater1);

    const crater2 = new THREE.Mesh(craterGeo, craterMat);
    crater2.position.set(-0.8, -0.6, 1.5);
    crater2.scale.set(1.3, 0.3, 1.3);
    moonGroup.add(crater2);

    // Golden monument beacon at Tranquility Base
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0.7, 0.4, 1.8);

    const beaconCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    beaconGroup.add(beaconCore);

    const beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.38, 12),
      new THREE.MeshBasicMaterial({
        color: 0xf59e0b,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
    );
    beaconRing.lookAt(0, 0, 1);
    beaconGroup.add(beaconRing);

    moonGroup.add(beaconGroup);
    scene.add(moonGroup);

    // --- 6. Low-Poly Saturn V Rocket ---
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(-5, -2, 4);

    // S-IC First Stage
    const s1cStage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.48, 0.52, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
    );
    s1cStage.position.y = -1.1;
    rocketGroup.add(s1cStage);

    // Thruster flame
    const rocketFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.35, 1.4, 6),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    rocketFlame.position.y = -2.8;
    rocketFlame.rotation.x = Math.PI;
    rocketGroup.add(rocketFlame);

    // S-II Second Stage
    const s2Stage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.48, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, flatShading: true })
    );
    s2Stage.position.y = 0.75;
    rocketGroup.add(s2Stage);

    // S-IVB Third Stage
    const s4bStage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.44, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, flatShading: true })
    );
    s4bStage.position.y = 2.05;
    rocketGroup.add(s4bStage);

    // CSM Capsule & Engine
    const csmCylinder = new THREE.Mesh(
      new THREE.CylinderGeometry(0.32, 0.38, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true })
    );
    csmCylinder.position.y = 3.05;
    rocketGroup.add(csmCylinder);

    const csmCone = new THREE.Mesh(
      new THREE.ConeGeometry(0.32, 0.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, flatShading: true })
    );
    cmdConePosition: csmCone.position.y = 3.75;
    rocketGroup.add(csmCone);

    // LES Escape Tower
    const lesTower = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.08, 1.0, 4),
      new THREE.MeshStandardMaterial({ color: 0xef4444, flatShading: true })
    );
    lesTower.position.y = 4.5;
    rocketGroup.add(lesTower);

    scene.add(rocketGroup);
    rocketGroup.visible = false;

    // --- 7. Deep Space Apollo Ships (CSM + LM + S-IVB) ---
    const spaceCraftGroup = new THREE.Group();

    // Command Service Module
    const csmGroup = new THREE.Group();
    const csmSm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.42, 1.1, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true })
    );
    const csmCm = new THREE.Mesh(
      new THREE.ConeGeometry(0.42, 0.65, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, flatShading: true })
    );
    csmCm.position.y = 0.85;
    csmGroup.add(csmSm);
    csmGroup.add(csmCm);
    spaceCraftGroup.add(csmGroup);

    // Lunar Module (Eagle)
    const eagleGroup = new THREE.Group();
    const descentGold = new THREE.Mesh(
      new THREE.CylinderGeometry(0.55, 0.6, 0.5, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
        flatShading: true,
      })
    );
    const ascentSilver = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true })
    );
    ascentSilver.position.y = 0.55;
    eagleGroup.add(descentGold);
    eagleGroup.add(ascentSilver);
    eagleGroup.position.set(1.8, 0, 0);
    spaceCraftGroup.add(eagleGroup);

    // Discarded S-IVB "Garage"
    const discardedS4b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0xf8fafc, flatShading: true })
    );
    discardedS4b.position.set(5, 2, -3);
    spaceCraftGroup.add(discardedS4b);

    scene.add(spaceCraftGroup);
    spaceCraftGroup.visible = false;

    // --- 8. Lunar Surface Scene ---
    const surfaceGroup = new THREE.Group();
    surfaceGroup.position.set(0, -4, 0);

    // Ground plane
    const groundGeo = new THREE.PlaneGeometry(35, 35, 14, 14);
    groundGeo.rotateX(-Math.PI / 2);
    const gPos = groundGeo.attributes.position;
    for (let i = 0; i < gPos.count; i++) {
      const vx = gPos.getX(i);
      const vz = gPos.getZ(i);
      const dist = Math.sqrt(vx * vx + vz * vz);
      gPos.setY(i, Math.sin(dist * 0.45) * 0.35 - Math.cos(vx * 0.4) * 0.2);
    }
    groundGeo.computeVertexNormals();

    const groundMesh = new THREE.Mesh(
      groundGeo,
      new THREE.MeshStandardMaterial({
        color: 0x475569,
        flatShading: true,
        roughness: 1.0,
      })
    );
    surfaceGroup.add(groundMesh);

    // Permanent Descent Stage (Golden Launchpad left on moon)
    const permanentDescent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.65, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
        flatShading: true,
      })
    );
    permanentDescent.position.set(0, 0.4, 0);
    surfaceGroup.add(permanentDescent);

    // 4 Landing Struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const strut = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.1, 4),
        new THREE.MeshStandardMaterial({ color: 0xd97706, flatShading: true })
      );
      strut.position.set(Math.cos(angle) * 1.15, 0.22, Math.sin(angle) * 1.15);
      strut.rotation.z = Math.cos(angle) * 0.4;
      strut.rotation.x = Math.sin(angle) * 0.4;
      surfaceGroup.add(strut);
    }

    // Ascent Stage (Lifts off leaving descent stage)
    const surfaceAscent = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.7, 0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true })
    );
    surfaceAscent.position.set(0, 1.15, 0);

    const ascentFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.8, 6),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    ascentFlame.position.set(0, -0.6, 0);
    ascentFlame.rotation.x = Math.PI;
    surfaceAscent.add(ascentFlame);
    ascentFlame.visible = false;

    surfaceGroup.add(surfaceAscent);
    scene.add(surfaceGroup);
    surfaceGroup.visible = false;

    // --- 9. Splashdown Scene (Ocean + CM + Parachutes) ---
    const splashdownGroup = new THREE.Group();
    splashdownGroup.position.set(0, -3, 0);

    const oceanMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30, 8, 8),
      new THREE.MeshStandardMaterial({
        color: 0x1d4ed8,
        flatShading: true,
        roughness: 0.5,
      })
    );
    oceanMesh.rotateX(-Math.PI / 2);
    splashdownGroup.add(oceanMesh);

    // Splashed Command Module
    const splashedCm = new THREE.Mesh(
      new THREE.ConeGeometry(0.5, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, flatShading: true })
    );
    splashedCm.position.set(0, 0.2, 0);
    splashdownGroup.add(splashedCm);

    // 3 Parachutes
    for (let i = -1; i <= 1; i++) {
      const chute = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 6, 4, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xf97316, flatShading: true })
      );
      chute.position.set(i * 0.7, 1.6, 0);
      splashdownGroup.add(chute);
    }

    scene.add(splashdownGroup);
    splashdownGroup.visible = false;

    // --- 10. Animation Loop ---
    let animId: number;
    const targetCamPos = new THREE.Vector3(0, 1, 24);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const currentLookAt = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const step = stepRef.current;
      const action = step.action;

      // Rotate planets gently
      earthGroup.rotation.y += 0.002;
      moonGroup.rotation.y += 0.0015;

      // Pulse beacon at Tranquility Base
      beaconRing.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.25);

      // --- Scene State Configuration ---
      if (action === "lonely_space") {
        // Scene 1: The Lonely Moon
        earthGroup.visible = true;
        moonGroup.visible = true;
        earthGroup.position.set(-7, 0, 0);
        earthGroup.scale.setScalar(1.0);
        moonGroup.position.set(7, 0, 0);
        moonGroup.scale.setScalar(1.0);

        rocketGroup.visible = false;
        spaceCraftGroup.visible = false;
        surfaceGroup.visible = false;
        splashdownGroup.visible = false;

        targetCamPos.set(0, 1, 24);
        targetLookAt.set(0, 0, 0);
      } else if (
        action === "launch" ||
        action === "drop_sic" ||
        action === "drop_les" ||
        action === "drop_sii"
      ) {
        // Scene 2: Leaving Earth (Saturn V Launch & Staging)
        earthGroup.visible = true;
        moonGroup.visible = true;
        earthGroup.position.set(-6, -6, -3);
        earthGroup.scale.setScalar(1.2);
        moonGroup.position.set(15, 8, -12);
        moonGroup.scale.setScalar(0.7);

        rocketGroup.visible = true;
        spaceCraftGroup.visible = false;
        surfaceGroup.visible = false;
        splashdownGroup.visible = false;

        if (action === "launch") {
          rocketGroup.position.set(-4, -1, 4);
          rocketGroup.rotation.z = -0.15;
          s1cStage.position.set(0, -1.1, 0);
          lesTower.position.set(0, 4.5, 0);
          s2Stage.position.set(0, 0.75, 0);
          rocketFlame.visible = true;
          rocketFlame.scale.set(
            1 + Math.random() * 0.2,
            1 + Math.random() * 0.3,
            1 + Math.random() * 0.2
          );
        } else if (action === "drop_sic") {
          // S-IC disconnects and falls away
          s1cStage.position.y -= 0.04;
          s1cStage.position.x -= 0.02;
          s1cStage.rotation.z += 0.01;
          rocketFlame.visible = false;
        } else if (action === "drop_les") {
          // LES jettisons
          lesTower.position.y += 0.08;
          lesTower.position.x += 0.035;
          lesTower.rotation.z -= 0.02;
        } else if (action === "drop_sii") {
          // S-II detaches
          s2Stage.position.y -= 0.045;
          s2Stage.position.x += 0.025;
        }

        targetCamPos.set(-2, 1, 14);
        targetLookAt.set(rocketGroup.position.x, rocketGroup.position.y + 1, 0);
      } else if (action === "transposition" || action === "drop_s4b") {
        // Scene 3: The Dance in Deep Space
        earthGroup.visible = true;
        moonGroup.visible = true;
        earthGroup.position.set(-18, -4, -15);
        earthGroup.scale.setScalar(0.8);
        moonGroup.position.set(18, 4, -15);
        moonGroup.scale.setScalar(0.8);

        rocketGroup.visible = false;
        spaceCraftGroup.visible = true;
        surfaceGroup.visible = false;
        splashdownGroup.visible = false;

        if (action === "transposition") {
          csmGroup.position.set(-0.8, 0, 0);
          csmGroup.rotation.z = Math.PI; // Turns 180° to dock nose-to-nose
          eagleGroup.position.set(0.8, 0, 0);
          discardedS4b.position.set(4, 1, -2);
        } else {
          // S-IVB drifting into solar orbit
          discardedS4b.position.x += 0.025;
          discardedS4b.position.y += 0.015;
          discardedS4b.rotation.y += 0.01;
        }

        targetCamPos.set(0, 0.5, 10);
        targetLookAt.set(0, 0, 0);
      } else if (action === "orbit_undock") {
        // Scene 4: Arrival & Separation in Lunar Orbit
        earthGroup.visible = true;
        earthGroup.position.set(-24, 10, -25);
        moonGroup.visible = true;
        moonGroup.position.set(0, 0, -2);
        moonGroup.scale.setScalar(2.2);

        rocketGroup.visible = false;
        spaceCraftGroup.visible = true;
        surfaceGroup.visible = false;
        splashdownGroup.visible = false;

        csmGroup.position.set(-3, 2, 3);
        eagleGroup.position.set(1.2, 0, 3);
        eagleGroup.rotation.z = -0.35;
        discardedS4b.visible = false;

        targetCamPos.set(0, 1, 12);
        targetLookAt.set(0, 0, 0);
      } else if (action === "landed" || action === "ascent_liftoff") {
        // Scene 5: The Lunar Surface
        earthGroup.visible = true;
        earthGroup.position.set(8, 12, -20);
        earthGroup.scale.setScalar(0.7);

        moonGroup.visible = false;
        rocketGroup.visible = false;
        spaceCraftGroup.visible = false;
        surfaceGroup.visible = true;
        splashdownGroup.visible = false;

        if (action === "landed") {
          surfaceAscent.position.set(0, 1.15, 0);
          ascentFlame.visible = false;
          targetCamPos.set(0, 1.6, 7);
          targetLookAt.set(0, 0.8, 0);
        } else {
          // Ascent stage launches up, leaving golden descent stage
          ascentFlame.visible = true;
          surfaceAscent.position.y += 0.04;
          targetCamPos.set(0, 2.0, 8);
          targetLookAt.set(0, 0.5, 0); // Focus stays on permanent monument
        }
      } else if (action === "ascent_crash" || action === "service_burn") {
        // Scene 6: Final Goodbyes
        if (action === "ascent_crash") {
          earthGroup.visible = true;
          earthGroup.position.set(-18, 6, -18);
          moonGroup.visible = true;
          moonGroup.position.set(2, 0, 0);
          moonGroup.scale.setScalar(1.8);
          surfaceGroup.visible = false;
          spaceCraftGroup.visible = true;
          splashdownGroup.visible = false;

          csmGroup.position.set(-6, 2, 2);
          eagleGroup.position.set(1.2, 0.4, 1);
          eagleGroup.scale.setScalar(0.4);

          targetCamPos.set(0, 1, 14);
          targetLookAt.set(0, 0, 0);
        } else {
          // Near Earth: splashdown
          earthGroup.visible = true;
          earthGroup.position.set(0, -6, 0);
          earthGroup.scale.setScalar(2.6);
          moonGroup.visible = false;
          surfaceGroup.visible = false;
          spaceCraftGroup.visible = false;
          splashdownGroup.visible = true;

          targetCamPos.set(0, 0.5, 9);
          targetLookAt.set(0, -1, 0);
        }
      } else if (action === "monument_wide") {
        // Scene 7: A Museum of Courage (Serene wide Moon view)
        earthGroup.visible = true;
        earthGroup.position.set(-18, 8, -20);
        earthGroup.scale.setScalar(0.7);

        moonGroup.visible = true;
        moonGroup.position.set(0, 0, 0);
        moonGroup.scale.setScalar(1.9);

        rocketGroup.visible = false;
        spaceCraftGroup.visible = false;
        surfaceGroup.visible = false;
        splashdownGroup.visible = false;

        targetCamPos.set(0, 0.5, 13);
        targetLookAt.set(0, 0, 0);
      }

      // Smooth camera interpolation
      camera.position.lerp(targetCamPos, 0.05);
      currentLookAt.lerp(targetLookAt, 0.05);
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);
    };

    animate();

    // --- 11. Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- 12. Cleanup ---
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // Run setup once on mount; animations read stepRef.current

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
        overflow: "hidden",
      }}
    />
  );
}

