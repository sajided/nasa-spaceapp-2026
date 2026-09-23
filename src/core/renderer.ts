import {
  ACESFilmicToneMapping,
  PerspectiveCamera,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three';

/**
 * Renderer configuration for the cinematic-realism visual style.
 *
 * These three settings (colour space, tone mapping, exposure) have to be fixed
 * before any material is authored — changing them later re-grades every surface
 * in the project. See docs/visual-style.md.
 */
export const EXPOSURE = 1.0;

/** PRD non-functional requirement: cap device pixel ratio at 2. */
export const MAX_PIXEL_RATIO = 2;

/**
 * Default clip planes, shared by both frames (see core/frames.ts). The lunar
 * surface overrides both while it is drawn, and `farFor` stretches far when
 * the camera pulls back past it.
 */
export const CAMERA_NEAR = 0.1;
export const CAMERA_FAR = 2000;

/**
 * Far plane for a camera this far from its subject.
 *
 * The `handoff` viewpoint in data/cameras.ts is four kilometres from the stack
 * by design — far enough that the rocket is a few pixels tall when the scale
 * switches. The fixed 2,000 m far plane clipped it at exactly that moment,
 * leaving an empty frame (TC-P2-13). Raising the default instead would reveal
 * the edge of the 4 km pad ground during the ascent shots, so far only grows
 * when the subject itself would otherwise be cut.
 */
export function farFor(subjectDistance: number): number {
  return Math.max(CAMERA_FAR, subjectDistance * 1.25);
}

export interface RendererBundle {
  renderer: WebGLRenderer;
  camera: PerspectiveCamera;
  resize: () => void;
  dispose: () => void;
}

export function createRenderer(canvas: HTMLCanvasElement): RendererBundle {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: 'high-performance',
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = EXPOSURE;

  const camera = new PerspectiveCamera(50, 1, CAMERA_NEAR, CAMERA_FAR);
  camera.position.set(0, 1.5, 8);
  camera.lookAt(0, 0, 0);

  const resize = (): void => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    // Re-read DPR on every resize: dragging a window between a retina and a
    // non-retina display changes it without reloading the page.
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  resize();
  window.addEventListener('resize', resize);
  window.addEventListener('orientationchange', resize);

  const dispose = (): void => {
    window.removeEventListener('resize', resize);
    window.removeEventListener('orientationchange', resize);
    renderer.dispose();
  };

  return { renderer, camera, resize, dispose };
}
