import * as THREE from 'three';

export interface SceneLightsRig {
  keyLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  rimLight: THREE.DirectionalLight;
  soffitWarmLight: THREE.PointLight;
  interiorWarmLight: THREE.PointLight;
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

/**
 * Creates a bespoke automotive & architectural courtyard IBL light-stage scene for PMREMGenerator.
 * Produces natural twilight sky ribbons and warm 3000K architectural soffit reflections across
 * clearcoat car paint, laminated glass, and forged alloy wheels without artificial neon color casts.
 */
function createArchitecturalCourtyardEnvironment(): THREE.Scene {
  const envScene = new THREE.Scene();
  envScene.background = new THREE.Color(0x16221c);

  // Smooth atmospheric twilight sky dome so reflections have zero hard cutoffs at any angle
  const domeGeo = new THREE.SphereGeometry(26, 32, 20);
  const posAttr = domeGeo.attributes.position;
  const colors = new Float32Array(posAttr.count * 3);
  const cZenith = new THREE.Color(0x52687a);
  const cHorizon = new THREE.Color(0x283630);
  const cGround = new THREE.Color(0x121815);
  const tempColor = new THREE.Color();

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i) / 26;
    if (y >= 0) {
      tempColor.lerpColors(cHorizon, cZenith, Math.pow(y, 0.65));
    } else {
      tempColor.lerpColors(cHorizon, cGround, Math.min(1, -y * 2.2));
    }
    colors[i * 3] = tempColor.r;
    colors[i * 3 + 1] = tempColor.g;
    colors[i * 3 + 2] = tempColor.b;
  }
  domeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const domeMat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(domeGeo, domeMat));

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);

  const addPanel = (
    colorHex: number,
    intensity: number,
    pos: [number, number, number],
    scale: [number, number, number],
    rot: [number, number, number] = [0, 0, 0]
  ) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(colorHex).multiplyScalar(intensity),
    });
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.position.set(...pos);
    mesh.scale.set(...scale);
    mesh.rotation.set(...rot);
    envScene.add(mesh);
  };

  // 1. Extended Overhead Twilight Sky Softbox Ribbon (creates long, continuous highlight along hood, roof & glass)
  addPanel(0xe6eef7, 3.2, [0, 13, 0], [22, 0.2, 24]);

  // 2. Warm 3000K Carport Soffit & Residence Architectural Strip (Right/Rear)
  addPanel(0xffe0b5, 3.8, [8, 5.5, -2], [0.2, 5.5, 18]);

  // 3. Soft Neutral Evening Horizon Fill Strip (Left/Front)
  addPanel(0xd8e2eb, 2.2, [-10, 4.5, 2], [0.2, 5.0, 18]);

  // 4. Front & Rear Low Specular Accent Strips (defines front & rear bumper bevels)
  addPanel(0xf2efe9, 1.9, [-2, 2.6, 14], [16, 2.8, 0.2]);
  addPanel(0xdce6f0, 1.6, [0, 3.5, -14], [18, 3.5, 0.2]);

  return envScene;
}

export function setupSceneLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  isSoftwareGl: boolean
): SceneLightsRig {
  // Architectural twilight horizon (#0D1D16) matching the ChargeShare editorial canvas
  const bgColor = new THREE.Color(0x0d1d16);
  scene.background = bgColor;
  // Restrained atmospheric falloff at the far perimeter (no heavy fog)
  scene.fog = new THREE.FogExp2(0x0d1d16, 0.01);

  // Automotive & Architectural IBL Environment Map via PMREMGenerator
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  pmremGenerator.compileCubemapShader();
  const envScene = createArchitecturalCourtyardEnvironment();
  const activeEnvRt = pmremGenerator.fromScene(envScene, 0.035);
  scene.environment = activeEnvRt.texture;
  scene.environmentIntensity = 1.15;
  pmremGenerator.dispose();

  // 1. Primary Dusk / Architectural Key Light (Directional)
  const keyLight = new THREE.DirectionalLight(0xfff4e6, 2.35);
  keyLight.position.set(8, 15, 11);
  keyLight.castShadow = !isSoftwareGl;
  if (!isSoftwareGl) {
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    const d = 10;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 42;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.normalBias = 0.015;
  }
  scene.add(keyLight);

  // 2. Natural Twilight Sky & Dark Basalt Ground Hemisphere Fill
  const hemiLight = new THREE.HemisphereLight(0xc8d6e2, 0x1e2220, 1.0);
  hemiLight.position.set(0, 25, 0);
  scene.add(hemiLight);

  // 3. Neutral Evening Horizon Rim Light to sculpt the fastback roofline
  const rimLight = new THREE.DirectionalLight(0xf0f4f8, 0.95);
  rimLight.position.set(-12, 8, -9);
  scene.add(rimLight);

  // 4. Warm 3000K Architectural Carport Soffit Downlight
  const soffitWarmLight = new THREE.PointLight(0xffd6a3, 3.0, 13, 1.6);
  soffitWarmLight.position.set(1.2, 3.25, -0.45);
  scene.add(soffitWarmLight);

  // 5. Warm 2800K Interior Living Room Illumination (behind glass curtain wall)
  const interiorWarmLight = new THREE.PointLight(0xffca88, 2.8, 11, 1.6);
  interiorWarmLight.position.set(2.4, 2.1, -3.3);
  scene.add(interiorWarmLight);

  // 6. Tightly-scoped ChargeShare Lime Indicator Light at Wallbox Bezel
  const chargerGlowLight = new THREE.PointLight(0xd8f36a, 0.28, 1.4, 2.2);
  chargerGlowLight.position.set(1.92, 1.62, 0.78);
  scene.add(chargerGlowLight);

  return {
    keyLight,
    hemiLight,
    rimLight,
    soffitWarmLight,
    interiorWarmLight,
    chargerGlowLight,
    dispose: () => {
      activeEnvRt.dispose();
    },
  };
}
