import * as THREE from 'three';
import { HERO_CHARGE_POST, getChargePortWorldPosition } from './sceneLayout';
import { createContactShadowTexture } from './SceneAssets';

/**
 * Manufactured, photography-grade ChargeShare EV charge post.
 *
 * A bolted, powder-coated base pad carries a slim dark grey-green column,
 * which in turn supports a clear-coated deep-forest head enclosure with a
 * recessed bezel, a 288x320 OLED status panel (one CanvasTexture per state),
 * a restrained lime status LED, a cable gland and a side holster. A matte
 * rubberised Type 2 cable sags out of the gland and rises into the vehicle.
 *
 * The cable's car-side endpoint is DERIVED at construction: the world-space
 * port is read from `getChargePortWorldPosition()` and converted into this
 * group's local space, so the connector always meets the vehicle's actual
 * front-left fender port rather than a hard-coded position.
 */

export type ChargerVisualState = 'charging' | 'standby' | 'reserved';

export interface ChargerModelHandle {
  group: THREE.Group;
  clickableMeshes: THREE.Object3D[];
  setChargerState: (state: ChargerVisualState) => void;
  updateAnimation: (elapsedTime: number, delta: number) => void;
  dispose: () => void;
}

const LIME = 0xd8f36a;
const AMBER = 0xf5b942;
const MUTED = 0x8fa79a;

const SCREEN_W = 288;
const SCREEN_H = 320;

/** Rounded-rectangle `THREE.Shape` shared by every chamfered enclosure part. */
function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w = width / 2;
  const h = height / 2;
  const r = Math.min(radius, w, h);
  shape.moveTo(-w + r, -h);
  shape.lineTo(w - r, -h);
  shape.quadraticCurveTo(w, -h, w, -h + r);
  shape.lineTo(w, h - r);
  shape.quadraticCurveTo(w, h, w - r, h);
  shape.lineTo(-w + r, h);
  shape.quadraticCurveTo(-w, h, -w, h - r);
  shape.lineTo(-w, -h + r);
  shape.quadraticCurveTo(-w, -h, -w + r, -h);
  return shape;
}

/** Paints the restrained OLED status panel for one charger state onto a 288x320 canvas. */
function createDisplayTexture(state: ChargerVisualState, maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = SCREEN_W;
  canvas.height = SCREEN_H;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    const accent = state === 'charging' ? '#D8F36A' : state === 'reserved' ? '#F5B942' : '#8FA79A';
    const statusText = state === 'charging' ? 'CHARGING' : state === 'reserved' ? 'RESERVED' : 'STANDBY';
    const powerText = state === 'charging' ? '7.4' : state === 'reserved' ? '0.0' : '--';
    const tariffText =
      state === 'charging' ? 'INR 14.00 / kWh' : state === 'reserved' ? 'TARIFF HELD' : 'INR 14.00 / kWh';
    const progress = state === 'charging' ? 0.72 : state === 'reserved' ? 0.1 : 0;

    ctx.fillStyle = '#080E0B';
    ctx.fillRect(0, 0, SCREEN_W, SCREEN_H);

    // Recessed screen border
    ctx.strokeStyle = '#16241C';
    ctx.lineWidth = 2;
    ctx.strokeRect(12, 12, SCREEN_W - 24, SCREEN_H - 24);

    // Status word plus a small indicator dot
    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(30, 51, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(statusText, 48, 51);

    // Large power figure with the unit set beside it
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#F4F8F5';
    ctx.font = 'bold 78px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(powerText, 24, 158);
    const powerWidth = ctx.measureText(powerText).width;
    ctx.fillStyle = accent;
    ctx.font = 'bold 24px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText('kW', 32 + powerWidth, 158);

    // Tariff line
    ctx.fillStyle = state === 'standby' ? '#7E8C84' : accent;
    ctx.font = 'bold 20px "Helvetica Neue", Arial, sans-serif';
    ctx.fillText(tariffText, 24, 202);

    // Slim progress bar
    ctx.fillStyle = '#15221B';
    ctx.fillRect(24, 232, 240, 12);
    ctx.strokeStyle = '#22332A';
    ctx.lineWidth = 1;
    ctx.strokeRect(24.5, 232.5, 239, 11);
    if (progress > 0) {
      ctx.fillStyle = accent;
      ctx.fillRect(24, 232, 240 * progress, 12);
    }

    // Monospace equipment label
    ctx.fillStyle = '#6C7E74';
    ctx.font = '13px "SFMono-Regular", Consolas, monospace';
    ctx.fillText('TYPE 2 AC · SN 0417', 24, 278);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the hero charge post: footing, column, head enclosure, bezel, OLED panel,
 * lime status LED, gland, holster, draped cable, Type 2 connector, contact shadow,
 * selection halo and cable pulse nodes.
 */
export function createChargerModel(maxAnisotropy: number): ChargerModelHandle {
  const group = new THREE.Group();
  group.name = 'ChargeShareCharger';
  group.position.copy(HERO_CHARGE_POST.position);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const clickableMeshes: THREE.Object3D[] = [];

  // --- Materials -----------------------------------------------------------

  const footingMat = new THREE.MeshStandardMaterial({ color: 0x1d211f, roughness: 0.6, metalness: 0.45 });
  materials.push(footingMat);

  const columnMat = new THREE.MeshStandardMaterial({ color: 0x2b3330, roughness: 0.5, metalness: 0.6 });
  materials.push(columnMat);

  const headMat = new THREE.MeshPhysicalMaterial({
    color: 0x173d2c,
    roughness: 0.28,
    metalness: 0.65,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  materials.push(headMat);

  const bezelMat = new THREE.MeshStandardMaterial({ color: 0x14181a, roughness: 0.55, metalness: 0.1 });
  materials.push(bezelMat);

  const ledMat = new THREE.MeshStandardMaterial({
    color: LIME,
    emissive: LIME,
    emissiveIntensity: 1.4,
    roughness: 0.3,
    metalness: 0.2,
  });
  materials.push(ledMat);

  const darkPlasticMat = new THREE.MeshStandardMaterial({ color: 0x1b1f1d, roughness: 0.7, metalness: 0.05 });
  materials.push(darkPlasticMat);

  const boltMat = new THREE.MeshStandardMaterial({ color: 0x4a4f4c, roughness: 0.4, metalness: 0.8 });
  materials.push(boltMat);

  const cableMat = new THREE.MeshStandardMaterial({ color: 0x161915, roughness: 0.55, metalness: 0.05 });
  materials.push(cableMat);

  const pulseMat = new THREE.MeshStandardMaterial({
    color: LIME,
    emissive: LIME,
    emissiveIntensity: 2.0,
    roughness: 0.2,
  });
  materials.push(pulseMat);

  const connectorMat = new THREE.MeshStandardMaterial({ color: 0x23282a, roughness: 0.45, metalness: 0.15 });
  materials.push(connectorMat);

  const connectorAccentMat = new THREE.MeshStandardMaterial({
    color: LIME,
    emissive: LIME,
    emissiveIntensity: 0.8,
    roughness: 0.4,
  });
  materials.push(connectorAccentMat);

  const screenMat = new THREE.MeshBasicMaterial();
  materials.push(screenMat);

  const ringMat = new THREE.MeshBasicMaterial({
    color: LIME,
    transparent: true,
    opacity: 0.5,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.push(ringMat);

  // --- 1. Footing: shallow bolted mounting pad -----------------------------

  const footingShape = roundedRectShape(0.32, 0.28, 0.05);
  const footingGeo = new THREE.ExtrudeGeometry(footingShape, {
    depth: 0.03,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.01,
    bevelThickness: 0.006,
  });
  geometries.push(footingGeo);
  const footingMesh = new THREE.Mesh(footingGeo, footingMat);
  footingMesh.rotation.x = -Math.PI / 2;
  footingMesh.position.y = 0.006;
  footingMesh.castShadow = true;
  footingMesh.receiveShadow = true;
  group.add(footingMesh);

  const boltGeo = new THREE.CylinderGeometry(0.016, 0.018, 0.012, 12);
  geometries.push(boltGeo);
  const boltOffsets: [number, number][] = [
    [-0.1, 0.09],
    [0.1, 0.09],
  ];
  for (const [bx, bz] of boltOffsets) {
    const bolt = new THREE.Mesh(boltGeo, boltMat);
    bolt.position.set(bx, 0.048, bz);
    bolt.castShadow = true;
    group.add(bolt);
  }

  // --- 2. Column: chamfered extruded profile -------------------------------

  const columnShape = roundedRectShape(0.174, 0.154, 0.03);
  const columnGeo = new THREE.ExtrudeGeometry(columnShape, {
    depth: 1.18,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.008,
    bevelThickness: 0.01,
  });
  geometries.push(columnGeo);
  const columnMesh = new THREE.Mesh(columnGeo, columnMat);
  columnMesh.rotation.x = -Math.PI / 2;
  columnMesh.position.y = 0.05;
  columnMesh.castShadow = true;
  columnMesh.receiveShadow = true;
  group.add(columnMesh);

  // --- 3. Head enclosure + recessed bezel ---------------------------------

  const headShape = roundedRectShape(0.316, 0.396, 0.04);
  const headGeo = new THREE.ExtrudeGeometry(headShape, {
    depth: 0.136,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
  geometries.push(headGeo);
  const headMesh = new THREE.Mesh(headGeo, headMat);
  headMesh.position.set(0, 1.45, -0.068);
  headMesh.castShadow = true;
  headMesh.receiveShadow = true;
  group.add(headMesh);
  clickableMeshes.push(headMesh);

  const bezelShape = roundedRectShape(0.28, 0.34, 0.03);
  const bezelGeo = new THREE.ExtrudeGeometry(bezelShape, {
    depth: 0.012,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.006,
    bevelThickness: 0.006,
  });
  geometries.push(bezelGeo);
  const bezelMesh = new THREE.Mesh(bezelGeo, bezelMat);
  bezelMesh.position.set(0, 1.45, 0.072);
  bezelMesh.castShadow = true;
  group.add(bezelMesh);

  // --- 4. OLED display panel ----------------------------------------------

  const screenGeo = new THREE.PlaneGeometry(0.23, 0.2556);
  geometries.push(screenGeo);
  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 1.44, 0.091);
  group.add(screenMesh);
  clickableMeshes.push(screenMesh);

  // --- 5. Lime charging indicator -----------------------------------------

  const ledGeo = new THREE.BoxGeometry(0.18, 0.014, 0.012);
  geometries.push(ledGeo);
  const ledMesh = new THREE.Mesh(ledGeo, ledMat);
  ledMesh.position.set(0, 1.596, 0.094);
  group.add(ledMesh);

  // --- 6. Cable gland + side holster --------------------------------------

  const glandGeo = new THREE.CylinderGeometry(0.03, 0.034, 0.06, 16);
  geometries.push(glandGeo);
  const glandMesh = new THREE.Mesh(glandGeo, darkPlasticMat);
  glandMesh.position.set(-0.1, 1.215, 0.02);
  glandMesh.castShadow = true;
  group.add(glandMesh);

  const flangeGeo = new THREE.CylinderGeometry(0.042, 0.042, 0.014, 16);
  geometries.push(flangeGeo);
  const flangeMesh = new THREE.Mesh(flangeGeo, darkPlasticMat);
  flangeMesh.position.set(-0.1, 1.245, 0.02);
  group.add(flangeMesh);

  const holsterPlateGeo = new THREE.BoxGeometry(0.022, 0.18, 0.08);
  geometries.push(holsterPlateGeo);
  const holsterPlate = new THREE.Mesh(holsterPlateGeo, darkPlasticMat);
  holsterPlate.position.set(0.106, 0.72, 0);
  holsterPlate.castShadow = true;
  group.add(holsterPlate);

  const prongGeo = new THREE.BoxGeometry(0.06, 0.022, 0.035);
  geometries.push(prongGeo);
  const prongOffsets = [0.06, -0.06];
  for (const dy of prongOffsets) {
    const prong = new THREE.Mesh(prongGeo, darkPlasticMat);
    prong.position.set(0.135, 0.72 + dy, 0);
    group.add(prong);
  }

  // --- 7. Charging cable (derived car-side endpoint) -----------------------

  const portLocal = getChargePortWorldPosition(new THREE.Vector3()).sub(HERO_CHARGE_POST.position);

  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.1, 1.185, 0.02),
    new THREE.Vector3(-0.34, 0.86, 0.24),
    new THREE.Vector3(-0.95, 0.2, 0.53),
    new THREE.Vector3(-1.62, 0.4, 0.82),
    new THREE.Vector3(-2.05, 0.7, 1.02),
    portLocal.clone(),
  ]);

  const cableGeo = new THREE.TubeGeometry(cableCurve, 72, 0.027, 12, false);
  geometries.push(cableGeo);
  const cableMesh = new THREE.Mesh(cableGeo, cableMat);
  cableMesh.castShadow = true;
  group.add(cableMesh);

  // --- 8. Type 2 connector seated at the derived port ----------------------

  const connectorLength = 0.2;
  const endTangent = cableCurve.getTangentAt(1).normalize();
  const connectorGroup = new THREE.Group();
  connectorGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), endTangent);
  connectorGroup.position.copy(portLocal).addScaledVector(endTangent, -connectorLength);
  group.add(connectorGroup);

  const reliefGeo = new THREE.CylinderGeometry(0.045, 0.03, 0.05, 18);
  geometries.push(reliefGeo);
  const reliefMesh = new THREE.Mesh(reliefGeo, connectorMat);
  reliefMesh.position.y = 0.025;
  reliefMesh.castShadow = true;
  connectorGroup.add(reliefMesh);

  const collarGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.06, 20);
  geometries.push(collarGeo);
  const collarMesh = new THREE.Mesh(collarGeo, connectorMat);
  collarMesh.position.y = 0.08;
  connectorGroup.add(collarMesh);

  const connBodyGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.08, 20);
  geometries.push(connBodyGeo);
  const connBodyMesh = new THREE.Mesh(connBodyGeo, connectorMat);
  connBodyMesh.position.y = 0.14;
  connectorGroup.add(connBodyMesh);

  const noseGeo = new THREE.CylinderGeometry(0.036, 0.045, 0.02, 20);
  geometries.push(noseGeo);
  const noseMesh = new THREE.Mesh(noseGeo, connectorMat);
  noseMesh.position.y = 0.19;
  connectorGroup.add(noseMesh);

  const accentGeo = new THREE.CylinderGeometry(0.049, 0.049, 0.008, 20);
  geometries.push(accentGeo);
  const accentMesh = new THREE.Mesh(accentGeo, connectorAccentMat);
  accentMesh.position.y = 0.105;
  connectorGroup.add(accentMesh);

  // --- 9. Contact shadow ---------------------------------------------------

  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const shadowGeo = new THREE.PlaneGeometry(0.85, 0.85);
  geometries.push(shadowGeo);
  const shadowMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    color: 0x0a1410,
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
  });
  materials.push(shadowMat);
  const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.y = 0.008;
  shadowMesh.renderOrder = 1;
  group.add(shadowMesh);

  // --- 10. Ground selection halo ------------------------------------------

  const ringGeo = new THREE.RingGeometry(0.3, 0.355, 56);
  geometries.push(ringGeo);
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.y = 0.012;
  ringMesh.renderOrder = 2;
  group.add(ringMesh);

  // --- 11. Cable pulse nodes ----------------------------------------------

  const pulseGeo = new THREE.SphereGeometry(0.04, 14, 14);
  geometries.push(pulseGeo);
  const pulseNodes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const node = new THREE.Mesh(pulseGeo, pulseMat);
    node.visible = false;
    group.add(node);
    pulseNodes.push(node);
  }

  // --- State + animation ---------------------------------------------------

  let currentState: ChargerVisualState = 'standby';
  let pulsePhase = 0;
  const _pulsePos = new THREE.Vector3();

  const applyState = (state: ChargerVisualState) => {
    currentState = state;

    const nextTex = createDisplayTexture(state, maxAnisotropy);
    textures.push(nextTex);
    screenMat.map = nextTex;
    screenMat.needsUpdate = true;

    if (state === 'charging') {
      ledMat.color.setHex(LIME);
      ledMat.emissive.setHex(LIME);
      ledMat.emissiveIntensity = 1.4;
      ringMat.color.setHex(LIME);
    } else if (state === 'reserved') {
      ledMat.color.setHex(AMBER);
      ledMat.emissive.setHex(AMBER);
      ledMat.emissiveIntensity = 1.1;
      ringMat.color.setHex(AMBER);
    } else {
      ledMat.color.setHex(MUTED);
      ledMat.emissive.setHex(0x5f7a6c);
      ledMat.emissiveIntensity = 0.35;
      ringMat.color.setHex(MUTED);
    }

    const showPulses = state === 'charging';
    for (const node of pulseNodes) node.visible = showPulses;
  };

  applyState(currentState);

  const updateAnimation = (elapsedTime: number, delta: number) => {
    if (currentState !== 'charging') return;

    pulsePhase = (pulsePhase + delta * 0.35) % 1;
    for (let i = 0; i < pulseNodes.length; i++) {
      const t = (pulsePhase + i / pulseNodes.length) % 1;
      cableCurve.getPointAt(t, _pulsePos);
      pulseNodes[i].position.copy(_pulsePos);
    }

    ledMat.emissiveIntensity = 1.4 + Math.sin(elapsedTime * 3.5) * 0.4;
  };

  return {
    group,
    clickableMeshes,
    setChargerState: applyState,
    updateAnimation,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
