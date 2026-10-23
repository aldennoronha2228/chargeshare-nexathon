import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export interface SceneLightsRig {
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  chargerGlowLight: THREE.PointLight;
  dispose: () => void;
}

/**
 * Detects software WebGL (SwiftShader, llvmpipe, softpipe) from the GPU renderer string.
 * Used strictly for rendering cost budgets (antialiasing, shadow maps, frame pacing)
 * while preserving identical scene geometry, materials, and lighting intensities.
 */
export function detectSoftwareGl(): boolean {
  try {
    const probeCanvas = document.createElement('canvas');
    const gl = probeCanvas.getContext('webgl2') || probeCanvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export function setupSceneLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): SceneLightsRig {
  // Background & Horizon Fog Continuity (#10281D Deep Forest Night/Dusk)
  const bgColor = new THREE.Color(0x10281d);
  scene.background = bgColor;
  scene.fog = new THREE.FogExp2(0x10281d, 0.016);

  // Studio IBL Environment Map for metallic & clearcoat car paint reflections
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileEquirectangularShader();
  const envRt = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
  scene.environment = envRt.texture;
  pmremGenerator.dispose();

  // 1. Warm Golden-Hour Key Light (Directional)
  const keyLight = new THREE.DirectionalLight(0xfff1d0, 2.2);
  keyLight.position.set(14, 22, 16);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    const d = 18;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 60;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
  }
  scene.add(keyLight);

  // 2. Cool Forest/Sky Hemisphere Fill Light
  const hemiLight = new THREE.HemisphereLight(0xa6d8c0, 0x173d2c, 0.95);
  hemiLight.position.set(0, 30, 0);
  scene.add(hemiLight);

  // 3. Crisp Architectural Rim / Backlight
  const rimLight = new THREE.DirectionalLight(0xd8f36a, 0.85);
  rimLight.position.set(-16, 12, -14);
  scene.add(rimLight);

  // 4. Local Electric-Lime Point Light on the Wallbox & Car Port
  const chargerGlowLight = new THREE.PointLight(0xd8f36a, 1.8, 9, 2);
  chargerGlowLight.position.set(1.6, 2.1, -0.4);
  scene.add(chargerGlowLight);

  return {
    keyLight,
    hemiLight,
    rimLight,
    chargerGlowLight,
    dispose: () => {
      envRt.dispose();
    },
  };
}
