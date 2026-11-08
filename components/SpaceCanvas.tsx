"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { StoryStep } from "@/data/script";

interface PlanetCoords {
  x: number;
  y: number;
  visible: boolean;
}

interface SpaceCanvasProps {
  currentStep: StoryStep;
  onPositionsUpdate: (coords: { earth: PlanetCoords; moon: PlanetCoords }) => void;
  onAdvance: () => void;
}

export default function SpaceCanvas({
  currentStep,
  onPositionsUpdate,
  onAdvance,
}: SpaceCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const stepRef = useRef<StoryStep>(currentStep);

  useEffect(() => {
    stepRef.current = currentStep;
  }, [currentStep]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050814);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 24);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 2.2);
    sunLight.position.set(25, 15, 20);
    scene.add(sunLight);

    // Distant soft blue fill
    const fillLight = new THREE.DirectionalLight(0x38bdf8, 0.5);
    fillLight.position.set(-25, -10, -10);
    scene.add(fillLight);

    // --- Starfield ---
    const starCount = 1400;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starPositions[i] = (Math.random() - 0.5) * 350;
      starPositions[i + 1] = (Math.random() - 0.5) * 350;
      starPositions[i + 2] = (Math.random() - 0.5) * 350;
    }
    starGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3)
    );
    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const starPoints = new THREE.Points(starGeometry, starMaterial);
    scene.add(starPoints);

    // --- 1. Low-Poly Earth ---
    const earthGroup = new THREE.Group();
    earthGroup.position.set(-7, 0, 0);

    // Ocean base (faceted low-poly icosahedron)
    const earthGeo = new THREE.IcosahedronGeometry(3.5, 2);
    const earthMat = new THREE.MeshStandardMaterial({
      color: 0x1d4ed8,
      flatShading: true,
      roughness: 0.8,
    });
    const earthOcean = new THREE.Mesh(earthGeo, earthMat);
    earthGroup.add(earthOcean);

    // Continents layer (faceted green patches)
    const continentGeo = new THREE.IcosahedronGeometry(3.54, 1);
    const continentMat = new THREE.MeshStandardMaterial({
      color: 0x10b981,
      flatShading: true,
      roughness: 0.9,
    });
    const earthContinents = new THREE.Mesh(continentGeo, continentMat);
    earthGroup.add(earthContinents);

    // Atmosphere halo
    const atmoGeo = new THREE.IcosahedronGeometry(3.7, 1);
    const atmoMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.12,
    });
    const earthAtmo = new THREE.Mesh(atmoGeo, atmoMat);
    earthGroup.add(earthAtmo);

    scene.add(earthGroup);

    // --- 2. Low-Poly Moon ---
    const moonGroup = new THREE.Group();
    moonGroup.position.set(7, 0, 0);

    // Lunar body
    const moonGeo = new THREE.IcosahedronGeometry(2.0, 2);
    const moonMat = new THREE.MeshStandardMaterial({
      color: 0xa8b2c1,
      flatShading: true,
      roughness: 0.95,
    });
    const moonBody = new THREE.Mesh(moonGeo, moonMat);
    moonGroup.add(moonBody);

    // Craters (darker low-poly facets)
    const craterGeo = new THREE.DodecahedronGeometry(0.5, 0);
    const craterMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      flatShading: true,
      roughness: 1.0,
    });
    const crater1 = new THREE.Mesh(craterGeo, craterMat);
    crater1.position.set(0.8, 0.9, 1.4);
    crater1.scale.set(1.2, 0.3, 1.2);
    moonGroup.add(crater1);

    const crater2 = new THREE.Mesh(craterGeo, craterMat);
    crater2.position.set(-0.9, -0.6, 1.5);
    crater2.scale.set(1.4, 0.3, 1.4);
    moonGroup.add(crater2);

    // Golden monument beacon at Tranquility Base
    const beaconGroup = new THREE.Group();
    beaconGroup.position.set(0.6, 0.3, 1.85);

    const beaconCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.18, 0),
      new THREE.MeshBasicMaterial({ color: 0xfbbf24 })
    );
    beaconGroup.add(beaconCore);

    const beaconRing = new THREE.Mesh(
      new THREE.RingGeometry(0.25, 0.35, 12),
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

    // --- 3. Low-Poly Saturn V Rocket Stack ---
    const rocketGroup = new THREE.Group();
    rocketGroup.position.set(-6.5, -2, 0);

    // S-IC Stage
    const sicGeo = new THREE.CylinderGeometry(0.45, 0.48, 2.0, 8);
    const sicMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      flatShading: true,
    });
    const s1cStage = new THREE.Mesh(sicGeo, sicMat);
    s1cStage.position.y = -1.0;
    rocketGroup.add(s1cStage);

    // Rocket Thruster Flame
    const flameGeo = new THREE.ConeGeometry(0.35, 1.2, 6);
    const flameMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      wireframe: false,
    });
    const thrusterFlame = new THREE.Mesh(flameGeo, flameMat);
    thrusterFlame.position.y = -2.5;
    thrusterFlame.rotation.x = Math.PI;
    rocketGroup.add(thrusterFlame);

    // S-II Stage
    const siiGeo = new THREE.CylinderGeometry(0.42, 0.45, 1.4, 8);
    const siiMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      flatShading: true,
    });
    const s2Stage = new THREE.Mesh(siiGeo, siiMat);
    s2Stage.position.y = 0.7;
    rocketGroup.add(s2Stage);

    // S-IVB Third Stage
    const s4bGeo = new THREE.CylinderGeometry(0.38, 0.42, 1.0, 8);
    const s4bMat = new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      flatShading: true,
    });
    const s4bStage = new THREE.Mesh(s4bGeo, s4bMat);
    s4bStage.position.y = 1.9;
    rocketGroup.add(s4bStage);

    // CSM (Command & Service Module)
    const csmGeo = new THREE.CylinderGeometry(0.3, 0.35, 0.8, 8);
    const csmMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      flatShading: true,
    });
    const csmCraft = new THREE.Mesh(csmGeo, csmMat);
    csmCraft.position.y = 2.8;
    rocketGroup.add(csmCraft);

    // Command module cone
    const cmdConeGeo = new THREE.ConeGeometry(0.3, 0.45, 8);
    const cmdConeMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      flatShading: true,
    });
    const cmdCone = new THREE.Mesh(cmdConeGeo, cmdConeMat);
    cmdCone.position.y = 3.4;
    rocketGroup.add(cmdCone);

    // LES Escape Tower
    const lesGeo = new THREE.CylinderGeometry(0.04, 0.08, 0.9, 4);
    const lesMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      flatShading: true,
    });
    const lesTower = new THREE.Mesh(lesGeo, lesMat);
    lesTower.position.y = 4.1;
    rocketGroup.add(lesTower);

    scene.add(rocketGroup);
    rocketGroup.visible = false;

    // --- 4. Deep Space Spacecraft Group (CSM + Eagle + S-IVB) ---
    const spaceCraftGroup = new THREE.Group();
    spaceCraftGroup.position.set(0, 0, 0);

    // Free Command Service Module
    const freeCsm = new THREE.Group();
    const csmBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 1.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true })
    );
    const csmHead = new THREE.Mesh(
      new THREE.ConeGeometry(0.4, 0.6, 8),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, flatShading: true })
    );
    csmHead.position.y = 0.8;
    freeCsm.add(csmBody);
    freeCsm.add(csmHead);
    spaceCraftGroup.add(freeCsm);

    // Free Lunar Module (Eagle)
    const freeEagle = new THREE.Group();
    // Golden descent stage
    const lmGoldDescent = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.55, 0.45, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.85,
        roughness: 0.25,
        flatShading: true,
      })
    );
    // Silver ascent stage
    const lmSilverAscent = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.35, 0),
      new THREE.MeshStandardMaterial({ color: 0x64748b, flatShading: true })
    );
    lmSilverAscent.position.y = 0.45;
    freeEagle.add(lmGoldDescent);
    freeEagle.add(lmSilverAscent);
    freeEagle.position.set(1.5, 0, 0);
    spaceCraftGroup.add(freeEagle);

    // Jettisoned S-IVB "Garage"
    const freeS4b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.65, 0.65, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, flatShading: true })
    );
    freeS4b.position.set(4.5, 1.5, -2);
    spaceCraftGroup.add(freeS4b);

    scene.add(spaceCraftGroup);
    spaceCraftGroup.visible = false;

    // --- 5. Lunar Surface Scene (Ground + Descent Stage + Ascent Liftoff) ---
    const lunarSurfaceGroup = new THREE.Group();
    lunarSurfaceGroup.position.set(0, -5, 0);

    // Ground plane with craters
    const groundGeo = new THREE.PlaneGeometry(35, 35, 16, 16);
    groundGeo.rotateX(-Math.PI / 2);
    // Displace vertices slightly for low-poly lunar terrain
    const posAttr = groundGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const dist = Math.sqrt(vx * vx + vz * vz);
      posAttr.setY(i, Math.sin(dist * 0.4) * 0.4 - Math.cos(vx * 0.5) * 0.2);
    }
    groundGeo.computeVertexNormals();

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      flatShading: true,
      roughness: 1.0,
    });
    const lunarGround = new THREE.Mesh(groundGeo, groundMat);
    lunarSurfaceGroup.add(lunarGround);

    // Permanent Descent Stage (Golden Octagonal Base on surface)
    const descentBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.1, 0.6, 8),
      new THREE.MeshStandardMaterial({
        color: 0xf59e0b,
        metalness: 0.9,
        roughness: 0.2,
        flatShading: true,
      })
    );
    descentBase.position.set(0, 0.35, 0);
    lunarSurfaceGroup.add(descentBase);

    // 4 Landing Struts
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI) / 2 + Math.PI / 4;
      const leg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.05, 0.05, 1.0, 4),
        new THREE.MeshStandardMaterial({ color: 0xd97706, flatShading: true })
      );
      leg.position.set(Math.cos(angle) * 1.1, 0.2, Math.sin(angle) * 1.1);
      leg.rotation.z = Math.cos(angle) * 0.4;
      leg.rotation.x = Math.sin(angle) * 0.4;
      lunarSurfaceGroup.add(leg);
    }

    // Ascent Stage (Sits on descent stage, then launches)
    const ascentCraft = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65, 0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, flatShading: true })
    );
    ascentCraft.position.set(0, 1.05, 0);
    lunarSurfaceGroup.add(ascentCraft);

    // Ascent liftoff thruster fire
    const ascentFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.2, 0.8, 6),
      new THREE.MeshBasicMaterial({ color: 0xf59e0b })
    );
    ascentFlame.position.set(0, 0.45, 0);
    ascentFlame.rotation.x = Math.PI;
    ascentCraft.add(ascentFlame);
    ascentFlame.visible = false;

    scene.add(lunarSurfaceGroup);
    lunarSurfaceGroup.visible = false;

    // --- Animation & Camera State Management ---
    let frameId: number;
    const targetCamPos = new THREE.Vector3(0, 1, 24);
    const targetLookAt = new THREE.Vector3(0, 0, 0);
    const currentLookAt = new THREE.Vector3(0, 0, 0);

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      const step = stepRef.current;
      const action = step.action;

      // Rotate Earth and Moon gently
      earthGroup.rotation.y += 0.002;
      moonGroup.rotation.y += 0.0015;

      // Pulse beacon ring
      beaconRing.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2);

      // --- Scene State Configuration ---
      if (action === "lonely_space") {
        // Scene 1: Earth and Moon in deep space
        earthGroup.visible = true;
        moonGroup.visible = true;
        earthGroup.position.set(-7, 0, 0);
        moonGroup.position.set(7, 0, 0);
        rocketGroup.visible = false;
        spaceCraftGroup.visible = false;
        lunarSurfaceGroup.visible = false;

        targetCamPos.set(0, 1, 24);
        targetLookAt.set(0, 0, 0);
      } else if (
        action === "launch" ||
        action === "drop_sic" ||
        action === "drop_les" ||
        action === "drop_sii"
      ) {
        // Scene 2: Saturn V Launch from Earth
        earthGroup.visible = true;
        moonGroup.visible = true;
        rocketGroup.visible = true;
        spaceCraftGroup.visible = false;
        lunarSurfaceGroup.visible = false;

        earthGroup.position.set(-6, -6, -2);
        moonGroup.position.set(16, 8, -10);

        if (action === "launch") {
          rocketGroup.position.set(-4, -1, 4);
          rocketGroup.rotation.z = -0.15;
          s1cStage.position.set(0, -1, 0);
          lesTower.position.set(0, 4.1, 0);
          s2Stage.position.set(0, 0.7, 0);
          thrusterFlame.visible = true;
          thrusterFlame.scale.set(
            1 + Math.random() * 0.2,
            1 + Math.random() * 0.3,
            1 + Math.random() * 0.2
          );
        } else if (action === "drop_sic") {
          // S-IC disconnects and falls back
          s1cStage.position.y -= 0.03;
          s1cStage.position.x -= 0.015;
          s1cStage.rotation.z += 0.01;
          thrusterFlame.visible = false;
        } else if (action === "drop_les") {
          // LES jettisons off
          lesTower.position.y += 0.06;
          lesTower.position.x += 0.03;
          lesTower.rotation.z -= 0.02;
        } else if (action === "drop_sii") {
          // S-II separates
          s2Stage.position.y -= 0.035;
          s2Stage.position.x += 0.02;
        }

        targetCamPos.set(-2, 1, 14);
        targetLookAt.set(rocketGroup.position.x, rocketGroup.position.y + 1, 0);
      } else if (action === "transposition" || action === "drop_s4b") {
        // Scene 3: Dance in Deep Space
        earthGroup.visible = true;
        moonGroup.visible = true;
        earthGroup.position.set(-18, -4, -15);
        moonGroup.position.set(18, 4, -15);
        rocketGroup.visible = false;
        spaceCraftGroup.visible = true;
        lunarSurfaceGroup.visible = false;

        if (action === "transposition") {
          freeCsm.position.set(-0.8, 0, 0);
          freeCsm.rotation.z = Math.PI; // Flipped 180° towards LM
          freeEagle.position.set(0.8, 0, 0);
          freeS4b.position.set(4, 1, -2);
        } else {
          // S-IVB drifting away toward solar orbit
          freeS4b.position.x += 0.02;
          freeS4b.position.y += 0.01;
          freeS4b.rotation.y += 0.01;
        }

        targetCamPos.set(0, 0.5, 10);
        targetLookAt.set(0, 0, 0);
      } else if (action === "orbit_undock") {
        // Scene 4: Orbiting Moon & Eagle Separation
        earthGroup.visible = true;
        earthGroup.position.set(-25, 10, -25);
        moonGroup.visible = true;
        moonGroup.position.set(0, 0, -2);
        moonGroup.scale.setScalar(2.2);

        rocketGroup.visible = false;
        spaceCraftGroup.visible = true;
        lunarSurfaceGroup.visible = false;

        // Eagle descending towards moon
        freeCsm.position.set(-3, 2, 3);
        freeEagle.position.set(1, 0, 3);
        freeEagle.rotation.z = -0.35;
        freeS4b.visible = false;

        targetCamPos.set(0, 1, 12);
        targetLookAt.set(0, 0, 0);
      } else if (action === "landed" || action === "ascent_liftoff") {
        // Scene 5: Lunar Surface & Monument
        earthGroup.visible = true;
        earthGroup.position.set(8, 12, -20);
        earthGroup.scale.setScalar(0.7);

        moonGroup.visible = false;
        rocketGroup.visible = false;
        spaceCraftGroup.visible = false;
        lunarSurfaceGroup.visible = true;

        if (action === "landed") {
          ascentCraft.position.set(0, 1.05, 0);
          ascentFlame.visible = false;
          targetCamPos.set(0, 1.5, 7);
          targetLookAt.set(0, 0.8, 0);
        } else {
          // Ascent liftoff
          ascentFlame.visible = true;
          ascentCraft.position.y += 0.04;
          targetCamPos.set(0, 1.8, 8);
          targetLookAt.set(0, 0.5, 0); // Keeps focus on the golden Descent Stage
        }
      } else if (action === "ascent_crash" || action === "service_burn") {
        // Scene 6: Final Goodbyes (Moon crash, then splashdown near Earth)
        if (action === "ascent_crash") {
          earthGroup.visible = true;
          earthGroup.position.set(-18, 6, -18);
          moonGroup.visible = true;
          moonGroup.position.set(2, 0, 0);
          moonGroup.scale.setScalar(1.8);
          lunarSurfaceGroup.visible = false;
          spaceCraftGroup.visible = true;
          freeCsm.position.set(-6, 2, 2);
          freeEagle.position.set(1, 0.5, 1);
          freeEagle.scale.setScalar(0.5);

          targetCamPos.set(0, 1, 14);
          targetLookAt.set(0, 0, 0);
        } else {
          // Service module burn near Earth
          earthGroup.visible = true;
          earthGroup.position.set(0, -5, 0);
          earthGroup.scale.setScalar(2.5);
          moonGroup.visible = false;
          lunarSurfaceGroup.visible = false;
          spaceCraftGroup.visible = true;
          freeCsm.position.set(-1, -0.5, 3);
          freeEagle.visible = false;

          targetCamPos.set(0, 0, 10);
          targetLookAt.set(0, -1, 0);
        }
      } else if (action === "monument_wide") {
        // Scene 7: A Museum of Courage (Wide peaceful Moon shot)
        earthGroup.visible = true;
        earthGroup.position.set(-18, 8, -20);
        earthGroup.scale.setScalar(0.7);

        moonGroup.visible = true;
        moonGroup.position.set(0, 0, 0);
        moonGroup.scale.setScalar(1.9);

        rocketGroup.visible = false;
        spaceCraftGroup.visible = false;
        lunarSurfaceGroup.visible = false;

        targetCamPos.set(0, 0.5, 13);
        targetLookAt.set(0, 0, 0);
      }

      // Smooth camera interpolation
      camera.position.lerp(targetCamPos, 0.05);
      currentLookAt.lerp(targetLookAt, 0.05);
      camera.lookAt(currentLookAt);

      renderer.render(scene, camera);

      // --- Project 3D Coordinates of Earth and Moon to 2D Screen Space ---
      const projectCoords = (obj: THREE.Object3D): PlanetCoords => {
        if (!obj.visible) return { x: 0, y: 0, visible: false };
        const v = new THREE.Vector3();
        obj.getWorldPosition(v);
        v.project(camera);
        // Is object in front of camera?
        const visible = v.z < 1;
        const x = (v.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(v.y * 0.5) + 0.5) * window.innerHeight;
        return { x, y, visible };
      };

      const earthScreen = projectCoords(earthGroup);
      const moonScreen = projectCoords(moonGroup);
      onPositionsUpdate({ earth: earthScreen, moon: moonScreen });
    };

    animate();

    // --- Resize Handler ---
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // --- Cleanup ---
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [onPositionsUpdate]);

  // Click on canvas advances the story
  const handleClick = (e: React.MouseEvent) => {
    // Only advance if clicked directly on canvas (not on interactive UI overlay buttons)
    if ((e.target as HTMLElement).tagName === "CANVAS") {
      onAdvance();
    }
  };

  return (
    <div
      ref={mountRef}
      onClick={handleClick}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 1,
        overflow: "hidden",
        cursor: "pointer",
      }}
    />
  );
}
