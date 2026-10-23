import * as THREE from 'three';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

/**
 * Lighting rig for the ChargeShare hero stage.
 *
 * The rig is intentionally small and physically motivated: one warm golden-hour
 * key that drives the contact shadows, a cool sky/ground hemisphere that stands
 * in for the missing bounce GI, a cold back light to separate the car body from
 * the residence, and a short-range lime accent on the charge point so the
 * charging interaction is where the eye lands.
 *
 * Image based lighting is supplied separately by `loadSkyEnvironment`, which
 * replaces the previous `RoomEnvironment` studio probe with a real outdoor HDRI
 * so the car paint reflects the actual sky and ground instead of a grey box.
 */

export interface SceneLightsRig {
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  chargerGlowLight: THREE.PointLight;
  dispose: () => void;
}

export interface SkyEnvironmentHandle {
  /** False when the HDRI failed to load and the neutral fallback is active. */
  isHdri: boolean;
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

/**
 * Builds the four-light rig. Lights are returned, **not** added to the scene, so the
 * caller controls the lifetime and can drop them together with the renderer.
 */
export function createSceneLights(isSoftwareGl: boolean): SceneLightsRig {
  // 1. Warm sun key light. Low late-afternoon elevation from the right-rear of the
  //    camera so the vehicle flank catches a long specular streak and the vehicle
  //    casts a readable shadow across the paving toward the foreground.
  const keyLight = new THREE.DirectionalLight(0xffe9c4, 2.35);
  keyLight.position.set(11.5, 9.5, 13.5);
  keyLight.target.position.set(-0.3, 0.7, 0.4);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    // The frustum has to cover the residence, the whole vehicle and the charge post.
    const d = 17;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1.5;
    keyLight.shadow.camera.far = 64;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.normalBias = 0.028;
    keyLight.shadow.radius = 3;
  }

  // 2. Sky/ground hemisphere. Cheap stand-in for the sky-to-paving bounce that an
  //    offline renderer would solve properly.
  const hemiLight = new THREE.HemisphereLight(0xbcd4e6, 0x494036, 0.42);
  hemiLight.position.set(0, 30, 0);

  // 3. Cold back light along the negative Z shoulder: separates the roof line and
  //    the rear haunch from the residence behind it.
  const rimLight = new THREE.DirectionalLight(0xc4dbff, 1.05);
  rimLight.position.set(-14, 10, -13);

  // 4. Short-range lime accent co-located with the charge post head, so the wallbox
  //    and the plugged connector read as the light source of the composition.
  const chargerGlowLight = new THREE.PointLight(0xd8f36a, 1.1, 6, 2);
  chargerGlowLight.position.set(2.05, 1.35, 0.55);

  return {
    keyLight,
    hemiLight,
    rimLight,
    chargerGlowLight,
    dispose: () => {
      keyLight.shadow.map?.dispose();
      keyLight.dispose();
      hemiLight.dispose();
      rimLight.dispose();
      chargerGlowLight.dispose();
    },
  };
}

export function setupSceneLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): SceneLightsRig {
  const lights = createSceneLights(isSoftwareGl);
  scene.add(lights.keyLight);
  scene.add(lights.hemiLight);
  scene.add(lights.rimLight);
  scene.add(lights.chargerGlowLight);
  return lights;
}

/**
 * Loads the outdoor HDRI, converts it to a PMREM cube map for image based lighting
 * and also uses it as the visible sky. Falls back to a flat overcast tone (with no
 * environment map) if the file is missing, so the scene still renders coherently.
 *
 * Asset: `public/hdri/qwantani_sunset_puresky_2k.hdr` (Poly Haven, CC0 1.0).
 */
export async function loadSkyEnvironment(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  url: string
): Promise<SkyEnvironmentHandle> {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  let hdrTexture: THREE.Texture | null = null;
  let envTarget: THREE.WebGLRenderTarget | null = null;

  try {
    hdrTexture = await new RGBELoader().loadAsync(url);
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    hdrTexture.minFilter = THREE.LinearFilter;
    hdrTexture.magFilter = THREE.LinearFilter;

    envTarget = pmrem.fromEquirectangular(hdrTexture);
    scene.environment = envTarget.texture;
    scene.environmentIntensity = 1.0;
    scene.background = hdrTexture;
    scene.backgroundIntensity = 0.92;

    // Warm haze tied to the sky colour: gives the residence real aerial depth
    // without a heavy fog that would flatten the paving.
    scene.fog = new THREE.FogExp2(0xc3ab8e, 0.0062);

    return {
      isHdri: true,
      dispose: () => {
        envTarget?.dispose();
        hdrTexture?.dispose();
        pmrem.dispose();
      },
    };
  } catch {
    const fallback = new THREE.Color(0x9fb4bd);
    scene.background = fallback;
    scene.backgroundIntensity = 1;
    scene.environment = null;
    scene.fog = new THREE.FogExp2(0x8fa3a8, 0.008);
    pmrem.dispose();
    return { isHdri: false, dispose: () => {} };
  }
}
