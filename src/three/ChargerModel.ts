import * as THREE from 'three';

export type ChargerVisualState = 'charging' | 'standby' | 'reserved';

export interface ChargerModelHandle {
  group: THREE.Group;
  cableCurve: THREE.CatmullRomCurve3;
  clickableMeshes: THREE.Object3D[];
  setChargerState: (state: ChargerVisualState) => void;
  updateAnimation: (elapsedTime: number, delta: number) => void;
  dispose: () => void;
}

/**
 * Generates a high-contrast OLED screen texture for the 3D Wallbox Charger
 */
function createOledDisplayTexture(
  state: ChargerVisualState,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Deep charcoal screen background
    ctx.fillStyle = '#0B130F';
    ctx.fillRect(0, 0, 256, 320);

    // Subtle border
    ctx.strokeStyle = state === 'charging' ? '#D8F36A' : '#3C6E56';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, 240, 304);

    // Top status pill
    ctx.fillStyle =
      state === 'charging'
        ? '#D8F36A'
        : state === 'reserved'
        ? '#F5B942'
        : '#F6F3E9';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText(
      state === 'charging'
        ? 'ACTIVE DRAW'
        : state === 'reserved'
        ? 'SLOT RESERVED'
        : 'READY · OPEN',
      24,
      48
    );

    // Power output readout
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 54px sans-serif';
    ctx.fillText(state === 'charging' ? '7.4 kW' : '7.4 kW', 24, 125);

    // Tariff readout
    ctx.fillStyle = '#D8F36A';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('INR 14 / kWh', 24, 175);

    // Progress bar
    ctx.fillStyle = '#1B3B2B';
    ctx.fillRect(24, 210, 208, 18);
    ctx.fillStyle = state === 'charging' ? '#D8F36A' : '#659B80';
    ctx.fillRect(24, 210, state === 'charging' ? 168 : 72, 18);

    // Bottom technical label
    ctx.fillStyle = '#A9C2B5';
    ctx.font = '16px monospace';
    ctx.fillText('TYPE 2 AC · 12TH MAIN', 24, 275);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Builds the hero multi-part 3D EV Charger Pedestal, Wallbox, Sub-Meter, Holster,
 * and curved TubeGeometry charging cable with animated energy pulses.
 */
export function createChargerModel(maxAnisotropy: number): ChargerModelHandle {
  const group = new THREE.Group();
  group.name = 'ChargeShareHeroCharger';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const clickableMeshes: THREE.Object3D[] = [];

  // 1. Architectural Sandstone Pillar (Grounded at y = 0)
  const pillarGeo = new THREE.BoxGeometry(0.95, 3.2, 0.65);
  geometries.push(pillarGeo);
  const pillarMat = new THREE.MeshStandardMaterial({
    color: 0xe6dfd0,
    roughness: 0.82,
    metalness: 0.05,
  });
  materials.push(pillarMat);
  const pillarMesh = new THREE.Mesh(pillarGeo, pillarMat);
  pillarMesh.position.set(2.3, 1.6, -1.2);
  pillarMesh.castShadow = true;
  pillarMesh.receiveShadow = true;
  group.add(pillarMesh);

  // 2. Pillar Plinth Base (Grounded trim)
  const plinthGeo = new THREE.BoxGeometry(1.08, 0.24, 0.78);
  geometries.push(plinthGeo);
  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x22251f,
    roughness: 0.7,
    metalness: 0.15,
  });
  materials.push(plinthMat);
  const plinthMesh = new THREE.Mesh(plinthGeo, plinthMat);
  plinthMesh.position.set(2.3, 0.12, -1.2);
  group.add(plinthMesh);

  // 3. House Number Badge on Pillar ("12-B")
  const badgeGeo = new THREE.BoxGeometry(0.46, 0.22, 0.04);
  geometries.push(badgeGeo);
  const badgeMat = new THREE.MeshStandardMaterial({
    color: 0x173d2c,
    roughness: 0.4,
    metalness: 0.3,
  });
  materials.push(badgeMat);
  const badgeMesh = new THREE.Mesh(badgeGeo, badgeMat);
  badgeMesh.position.set(2.3, 2.82, -0.86);
  group.add(badgeMesh);

  // 4. Beveled Wallbox Outer Chassis (ExtrudeGeometry)
  const shape = new THREE.Shape();
  const w = 0.56;
  const h = 0.84;
  const r = 0.06;
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);

  const chassisGeo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.22,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.02,
    bevelThickness: 0.02,
  });
  geometries.push(chassisGeo);

  const chassisMat = new THREE.MeshPhysicalMaterial({
    color: 0x173d2c,
    roughness: 0.28,
    metalness: 0.65,
    clearcoat: 0.6,
    clearcoatRoughness: 0.2,
  });
  materials.push(chassisMat);

  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.position.set(2.3, 1.85, -0.86);
  chassisMesh.castShadow = true;
  group.add(chassisMesh);
  clickableMeshes.push(chassisMesh);

  // 5. OLED Display Screen Plane on Wallbox Front
  let currentOledTex = createOledDisplayTexture('charging', maxAnisotropy);
  textures.push(currentOledTex);

  const screenGeo = new THREE.PlaneGeometry(0.42, 0.52);
  geometries.push(screenGeo);
  const screenMat = new THREE.MeshBasicMaterial({
    map: currentOledTex,
  });
  materials.push(screenMat);

  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(2.3, 1.88, -0.615);
  group.add(screenMesh);
  clickableMeshes.push(screenMesh);

  // 6. Emissive Electric-Lime Status LED Bar at Top of Wallbox
  const ledBarGeo = new THREE.BoxGeometry(0.38, 0.045, 0.03);
  geometries.push(ledBarGeo);
  const ledBarMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  materials.push(ledBarMat);
  const ledBarMesh = new THREE.Mesh(ledBarGeo, ledBarMat);
  ledBarMesh.position.set(2.3, 2.21, -0.62);
  group.add(ledBarMesh);

  // 7. Connector Dock Socket & Armored Conduit Pipe
  const socketGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.08, 20);
  geometries.push(socketGeo);
  const socketMat = new THREE.MeshStandardMaterial({
    color: 0x22251f,
    roughness: 0.35,
    metalness: 0.8,
  });
  materials.push(socketMat);
  const socketMesh = new THREE.Mesh(socketGeo, socketMat);
  socketMesh.rotation.x = Math.PI / 2;
  socketMesh.position.set(2.3, 1.52, -0.62);
  group.add(socketMesh);

  const conduitGeo = new THREE.CylinderGeometry(0.025, 0.025, 1.45, 12);
  geometries.push(conduitGeo);
  const conduitMesh = new THREE.Mesh(conduitGeo, socketMat);
  conduitMesh.position.set(2.62, 0.9, -0.88);
  group.add(conduitMesh);

  // 8. Draped Charging Cable (CatmullRomCurve3 + TubeGeometry) from Wallbox to EV Fender Port
  const cableCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(2.3, 1.5, -0.6),
    new THREE.Vector3(2.25, 0.65, -0.35),
    new THREE.Vector3(1.65, 0.18, 0.15),
    new THREE.Vector3(0.95, 0.42, 0.55),
    new THREE.Vector3(0.48, 0.88, 0.72),
  ]);

  const cableGeo = new THREE.TubeGeometry(cableCurve, 44, 0.032, 12, false);
  geometries.push(cableGeo);
  const cableMat = new THREE.MeshStandardMaterial({
    color: 0x161915,
    roughness: 0.45,
    metalness: 0.2,
  });
  materials.push(cableMat);
  const cableMesh = new THREE.Mesh(cableGeo, cableMat);
  cableMesh.castShadow = true;
  group.add(cableMesh);

  // 9. Animated Energy Pulse Nodes Traveling Along the Cable
  const pulseGeo = new THREE.SphereGeometry(0.052, 12, 12);
  geometries.push(pulseGeo);
  const pulseMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 2.0,
    roughness: 0.15,
  });
  materials.push(pulseMat);

  const pulseNodes: THREE.Mesh[] = [];
  for (let i = 0; i < 4; i++) {
    const pMesh = new THREE.Mesh(pulseGeo, pulseMat);
    group.add(pMesh);
    pulseNodes.push(pMesh);
  }

  // 10. Ground Selection Halo Ring Around Charger Base
  const ringGeo = new THREE.RingGeometry(0.68, 0.78, 36);
  geometries.push(ringGeo);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xd8f36a,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });
  materials.push(ringMat);
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  ringMesh.position.set(2.3, 0.025, -1.1);
  group.add(ringMesh);

  let currentState: ChargerVisualState = 'charging';
  const _pulsePos = new THREE.Vector3();

  const setChargerState = (state: ChargerVisualState) => {
    currentState = state;
    const nextTex = createOledDisplayTexture(state, maxAnisotropy);
    textures.push(nextTex);
    screenMat.map = nextTex;
    screenMat.needsUpdate = true;

    if (state === 'charging') {
      ledBarMat.color.setHex(0xd8f36a);
      ledBarMat.emissive.setHex(0xd8f36a);
      ledBarMat.emissiveIntensity = 1.8;
      ringMat.color.setHex(0xd8f36a);
      pulseNodes.forEach((p) => (p.visible = true));
    } else if (state === 'reserved') {
      ledBarMat.color.setHex(0xf5b942);
      ledBarMat.emissive.setHex(0xf5b942);
      ledBarMat.emissiveIntensity = 1.4;
      ringMat.color.setHex(0xf5b942);
      pulseNodes.forEach((p) => (p.visible = false));
    } else {
      ledBarMat.color.setHex(0xf6f3e9);
      ledBarMat.emissive.setHex(0x88b39c);
      ledBarMat.emissiveIntensity = 0.7;
      ringMat.color.setHex(0x88b39c);
      pulseNodes.forEach((p) => (p.visible = false));
    }
  };

  const updateAnimation = (elapsedTime: number) => {
    if (currentState === 'charging') {
      for (let i = 0; i < pulseNodes.length; i++) {
        const t = (elapsedTime * 0.42 + i / pulseNodes.length) % 1;
        cableCurve.getPointAt(t, _pulsePos);
        pulseNodes[i].position.copy(_pulsePos);
      }
      ledBarMat.emissiveIntensity = 1.4 + Math.sin(elapsedTime * 3.5) * 0.4;
    }
  };

  return {
    group,
    cableCurve,
    clickableMeshes,
    setChargerState,
    updateAnimation,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
