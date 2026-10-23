import * as THREE from 'three';
import {
  HERO_CHARGER_CONFIG,
  HERO_VEHICLE_CONFIG,
  computeChargingCableControlPoints,
  computeWorldChargePortPosition,
  getChargerStatusVisualSpec,
} from './sceneConfig';

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
 * Generates a high-DPI, restrained industrial OLED interface texture for the EV Wallbox
 */
function createOledDisplayTexture(
  state: ChargerVisualState,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const spec = getChargerStatusVisualSpec(state);
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 640;
  const ctx = canvas.getContext('2d');

  if (ctx) {
    // Deep smoked glass OLED black background
    ctx.fillStyle = '#070C0A';
    ctx.fillRect(0, 0, 512, 640);

    // Subtle glass inner hairline frame
    ctx.strokeStyle = '#1E3329';
    ctx.lineWidth = 3;
    ctx.strokeRect(20, 20, 472, 600);

    // Top bar: status dot + restrained uppercase label
    ctx.fillStyle = spec.ledCss;
    ctx.beginPath();
    ctx.arc(54, 66, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = spec.ledCss;
    ctx.font = '600 22px Inter, system-ui, sans-serif';
    ctx.fillText(spec.label, 76, 74);

    // Divider line
    ctx.fillStyle = '#182A21';
    ctx.fillRect(42, 102, 428, 2);

    // Primary metric: Power Output
    ctx.fillStyle = '#8FA89B';
    ctx.font = '500 18px monospace';
    ctx.fillText('OUTPUT POWER', 42, 148);

    ctx.fillStyle = '#F6F3E9';
    ctx.font = '700 76px Inter, system-ui, sans-serif';
    ctx.fillText(state === 'charging' ? '7.4' : '0.0', 42, 230);

    ctx.fillStyle = '#9EC4B0';
    ctx.font = '500 32px Inter, system-ui, sans-serif';
    ctx.fillText('kW AC', 205, 228);

    // Secondary electrical telemetry row
    ctx.fillStyle = '#7E998B';
    ctx.font = '500 19px monospace';
    ctx.fillText(
      state === 'charging' ? '230V · 32A · 18.4 kWh DELIVERED' : '230V · 32A MAX · TYPE 2 AC',
      42,
      276
    );

    // Tariff section
    ctx.fillStyle = '#101C16';
    ctx.fillRect(42, 312, 428, 92);
    ctx.strokeStyle = '#223B2F';
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 312, 428, 92);

    ctx.fillStyle = '#8FA89B';
    ctx.font = '500 16px monospace';
    ctx.fillText('HOST NEIGHBOURHOOD TARIFF', 62, 344);

    ctx.fillStyle = '#D8F36A';
    ctx.font = '700 34px Inter, system-ui, sans-serif';
    ctx.fillText(spec.tariffText, 62, 384);

    // State of charge / session bar
    ctx.fillStyle = '#8FA89B';
    ctx.font = '500 16px monospace';
    ctx.fillText(state === 'charging' ? 'VEHICLE SOC · 78%' : 'CONNECTOR READY', 42, 448);

    ctx.fillStyle = '#15261E';
    ctx.fillRect(42, 466, 428, 16);
    ctx.fillStyle = spec.ledCss;
    ctx.fillRect(42, 466, state === 'charging' ? 334 : state === 'reserved' ? 180 : 96, 16);

    // Bottom RFID / Smart Meter verification footer
    ctx.strokeStyle = '#284235';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(256, 554, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 554, 14, -0.7, 0.7);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 554, 8, -0.7, 0.7);
    ctx.stroke();

    ctx.fillStyle = '#6D877A';
    ctx.font = '500 15px monospace';
    ctx.fillText('CHARGESHARE SMART METER · BAY 12B', 110, 602);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.needsUpdate = true;
  return texture;
}

/**
 * Generates an architectural brushed bronze & slate address plaque texture ("12B")
 */
function createAddressPlaqueTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#141B18';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#5C6B63';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = '#E8E3D5';
    ctx.font = '700 44px Inter, system-ui, sans-serif';
    ctx.fillText('12B', 32, 68);
    ctx.fillStyle = '#9BB0A5';
    ctx.font = '500 18px monospace';
    ctx.fillText('12TH MAIN · BAY 1', 32, 102);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft ambient occlusion contact shadow texture for the charger pier base
 */
function createPierContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(4, 9, 7, 0.82)');
    grad.addColorStop(0.6, 'rgba(4, 9, 7, 0.35)');
    grad.addColorStop(1, 'rgba(4, 9, 7, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Builds the realistic manufactured EV charging station installed beside the residential
 * parking space, complete with board-formed concrete pier, heatsink fins, tempered glass
 * interface, Type-2 holster, galvanized conduit, and catenary cable connected to the vehicle port.
 */
export function createChargerModel(maxAnisotropy: number): ChargerModelHandle {
  const group = new THREE.Group();
  group.name = 'ChargeShareHeroCharger';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const clickableMeshes: THREE.Object3D[] = [];

  const texLoader = new THREE.TextureLoader();
  const loadPbrTex = (url: string, isColor: boolean, repeatX = 1, repeatY = 2) => {
    const t = texLoader.load(url);
    t.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeatX, repeatY);
    t.anisotropy = maxAnisotropy;
    textures.push(t);
    return t;
  };

  const [pierX, pierY, pierZ] = HERO_CHARGER_CONFIG.pierPosition;
  const [wbX, wbY, wbZ] = HERO_CHARGER_CONFIG.wallboxPosition;

  // 1. Board-Formed Architectural Concrete Mounting Pier (Grounded at y = 0)
  const concreteDiff = loadPbrTex('/textures/concrete_diff.jpg', true, 1, 2);
  const concreteNor = loadPbrTex('/textures/concrete_nor.jpg', false, 1, 2);
  const concreteRough = loadPbrTex('/textures/concrete_rough.jpg', false, 1, 2);

  const pierGeo = new THREE.BoxGeometry(0.76, 3.1, 0.54);
  geometries.push(pierGeo);
  const pierMat = new THREE.MeshStandardMaterial({
    color: 0xb8b4ac,
    map: concreteDiff,
    normalMap: concreteNor,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: concreteRough,
    roughness: 0.86,
    metalness: 0.04,
  });
  materials.push(pierMat);

  const pierMesh = new THREE.Mesh(pierGeo, pierMat);
  pierMesh.position.set(pierX, pierY, pierZ);
  pierMesh.castShadow = true;
  pierMesh.receiveShadow = true;
  group.add(pierMesh);

  // Recessed Dark Bronze Architectural Shadow-Gap Reveal on Pier
  const revealGeo = new THREE.BoxGeometry(0.78, 3.12, 0.06);
  geometries.push(revealGeo);
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x1b211e,
    roughness: 0.34,
    metalness: 0.84,
  });
  const brushedSteelMat = new THREE.MeshStandardMaterial({
    color: 0xb8c2bd,
    roughness: 0.26,
    metalness: 0.9,
  });
  materials.push(darkMetalMat, brushedSteelMat);

  const revealMesh = new THREE.Mesh(revealGeo, darkMetalMat);
  revealMesh.position.set(pierX, pierY, pierZ + 0.08);
  group.add(revealMesh);

  // 2. Heavy Steel Mounting Plinth & 4 Instanced Anchor Bolts + Ground Contact Shadow
  const plinthGeo = new THREE.BoxGeometry(0.88, 0.12, 0.66);
  const boltGeo = new THREE.CylinderGeometry(0.018, 0.018, 0.15, 8);
  geometries.push(plinthGeo, boltGeo);

  const plinthMesh = new THREE.Mesh(plinthGeo, darkMetalMat);
  plinthMesh.position.set(pierX, 0.06, pierZ);
  plinthMesh.receiveShadow = true;
  group.add(plinthMesh);

  const boltOffsets: [number, number][] = [
    [-0.38, -0.26],
    [0.38, -0.26],
    [-0.38, 0.26],
    [0.38, 0.26],
  ];
  const boltsInstanced = new THREE.InstancedMesh(boltGeo, brushedSteelMat, boltOffsets.length);
  const _dummy = new THREE.Object3D();
  boltOffsets.forEach(([bx, bz], idx) => {
    _dummy.position.set(pierX + bx, 0.08, pierZ + bz);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    boltsInstanced.setMatrixAt(idx, _dummy.matrix);
  });
  boltsInstanced.instanceMatrix.needsUpdate = true;
  boltsInstanced.computeBoundingSphere();
  group.add(boltsInstanced);

  // Contact shadow under pier
  const pierShadowTex = createPierContactShadowTexture();
  textures.push(pierShadowTex);
  const pierShadowGeo = new THREE.PlaneGeometry(1.65, 1.35);
  geometries.push(pierShadowGeo);
  const pierShadowMat = new THREE.MeshBasicMaterial({
    map: pierShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.82,
  });
  materials.push(pierShadowMat);
  const pierShadowMesh = new THREE.Mesh(pierShadowGeo, pierShadowMat);
  pierShadowMesh.rotation.x = -Math.PI / 2;
  pierShadowMesh.position.set(pierX, 0.012, pierZ);
  group.add(pierShadowMesh);

  // 3. Architectural Residence Plaque ("12B · 12TH MAIN")
  const plaqueTex = createAddressPlaqueTexture(maxAnisotropy);
  textures.push(plaqueTex);
  const plaqueGeo = new THREE.BoxGeometry(0.42, 0.21, 0.025);
  geometries.push(plaqueGeo);
  const plaqueMat = new THREE.MeshStandardMaterial({
    map: plaqueTex,
    roughness: 0.35,
    metalness: 0.4,
  });
  materials.push(plaqueMat);
  const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
  plaqueMesh.position.set(pierX - 0.06, 2.38, pierZ + 0.28);
  group.add(plaqueMesh);

  // 4. Manufactured EV Wallbox Unit (Rear Die-Cast Heatsink + Instanced Fin Array)
  const wallboxGroup = new THREE.Group();
  wallboxGroup.position.set(wbX, wbY, wbZ);
  // Slight angle toward the driveway camera & vehicle for ergonomic access
  wallboxGroup.rotation.y = -0.18;
  group.add(wallboxGroup);

  const heatsinkBackGeo = new THREE.BoxGeometry(0.44, 0.68, 0.09);
  const finGeo = new THREE.BoxGeometry(0.46, 0.64, 0.008);
  geometries.push(heatsinkBackGeo, finGeo);

  const heatsinkBack = new THREE.Mesh(heatsinkBackGeo, darkMetalMat);
  heatsinkBack.position.set(0, 0, -0.05);
  wallboxGroup.add(heatsinkBack);

  const finsInstanced = new THREE.InstancedMesh(finGeo, darkMetalMat, 7);
  for (let i = -3; i <= 3; i++) {
    _dummy.position.set(0, 0, -0.08 + i * 0.01);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    finsInstanced.setMatrixAt(i + 3, _dummy.matrix);
  }
  finsInstanced.instanceMatrix.needsUpdate = true;
  finsInstanced.computeBoundingSphere();
  wallboxGroup.add(finsInstanced);

  // 5. Sculpted Front Polycarbonate & Anodized Aluminum Enclosure (ExtrudeGeometry)
  const shape = new THREE.Shape();
  const w = 0.42;
  const h = 0.66;
  const r = 0.055;
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
    depth: 0.11,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.016,
    bevelThickness: 0.018,
  });
  geometries.push(chassisGeo);

  const chassisMat = new THREE.MeshPhysicalMaterial({
    color: 0x202b26,
    roughness: 0.26,
    metalness: 0.58,
    clearcoat: 0.55,
    clearcoatRoughness: 0.18,
  });
  materials.push(chassisMat);

  const chassisMesh = new THREE.Mesh(chassisGeo, chassisMat);
  chassisMesh.position.set(0, 0, -0.01);
  chassisMesh.castShadow = true;
  chassisMesh.receiveShadow = true;
  wallboxGroup.add(chassisMesh);
  clickableMeshes.push(chassisMesh);

  // Brushed Aluminum Perimeter Bezel Trim Frame
  const bezelGeo = new THREE.BoxGeometry(0.39, 0.58, 0.02);
  geometries.push(bezelGeo);
  const bezelMesh = new THREE.Mesh(bezelGeo, brushedSteelMat);
  bezelMesh.position.set(0, 0.01, 0.11);
  wallboxGroup.add(bezelMesh);

  // 6. Flush Tempered Glass Front Panel & Pre-Cached High-Contrast OLED Displays
  const oledTextureCache: Record<ChargerVisualState, THREE.CanvasTexture> = {
    charging: createOledDisplayTexture('charging', maxAnisotropy),
    standby: createOledDisplayTexture('standby', maxAnisotropy),
    reserved: createOledDisplayTexture('reserved', maxAnisotropy),
  };
  textures.push(
    oledTextureCache.charging,
    oledTextureCache.standby,
    oledTextureCache.reserved
  );

  const screenGeo = new THREE.PlaneGeometry(0.36, 0.46);
  geometries.push(screenGeo);
  const screenMat = new THREE.MeshPhysicalMaterial({
    map: oledTextureCache.charging,
    roughness: 0.08,
    metalness: 0.1,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    emissive: 0xffffff,
    emissiveMap: oledTextureCache.charging,
    emissiveIntensity: 0.68,
  });
  materials.push(screenMat);

  const screenMesh = new THREE.Mesh(screenGeo, screenMat);
  screenMesh.position.set(0, 0.02, 0.122);
  wallboxGroup.add(screenMesh);
  clickableMeshes.push(screenMesh);

  // 7. Restrained 6mm ChargeShare Lime Status Light Pipe at Upper Bezel
  const ledBarGeo = new THREE.BoxGeometry(0.32, 0.014, 0.016);
  geometries.push(ledBarGeo);
  const ledBarMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 1.35,
    roughness: 0.2,
  });
  materials.push(ledBarMat);
  const ledBarMesh = new THREE.Mesh(ledBarGeo, ledBarMat);
  ledBarMesh.position.set(0, 0.275, 0.122);
  wallboxGroup.add(ledBarMesh);

  // 8. Industrial Type-2 Dock Socket, Strain-Relief Gland & Armored Steel Conduit
  const holsterGeo = new THREE.CylinderGeometry(0.052, 0.058, 0.065, 20);
  const glandGeo = new THREE.CylinderGeometry(0.028, 0.036, 0.09, 12);
  const conduitGeo = new THREE.CylinderGeometry(0.018, 0.018, 1.18, 12);
  const clampGeo = new THREE.BoxGeometry(0.06, 0.025, 0.045);
  geometries.push(holsterGeo, glandGeo, conduitGeo, clampGeo);

  const rubberMat = new THREE.MeshStandardMaterial({
    color: 0x141715,
    roughness: 0.62,
    metalness: 0.08,
  });
  materials.push(rubberMat);

  const holsterMesh = new THREE.Mesh(holsterGeo, darkMetalMat);
  holsterMesh.rotation.x = Math.PI / 2;
  holsterMesh.position.set(0, -0.24, 0.115);
  wallboxGroup.add(holsterMesh);

  // Bottom Cable Exit Strain-Relief Gland
  const glandMesh = new THREE.Mesh(glandGeo, rubberMat);
  glandMesh.position.set(-0.04, -0.36, 0.06);
  wallboxGroup.add(glandMesh);

  // Armored Steel Supply Conduit Pipe running down the side of the concrete pier
  const conduitMesh = new THREE.Mesh(conduitGeo, brushedSteelMat);
  conduitMesh.position.set(pierX + 0.26, 0.65, pierZ + 0.22);
  group.add(conduitMesh);

  const clampYCoords = [0.32, 0.72, 1.12];
  const clampsInstanced = new THREE.InstancedMesh(clampGeo, darkMetalMat, clampYCoords.length);
  clampYCoords.forEach((cy, idx) => {
    _dummy.position.set(pierX + 0.26, cy, pierZ + 0.22);
    _dummy.rotation.set(0, 0, 0);
    _dummy.scale.setScalar(1);
    _dummy.updateMatrix();
    clampsInstanced.setMatrixAt(idx, _dummy.matrix);
  });
  clampsInstanced.instanceMatrix.needsUpdate = true;
  clampsInstanced.computeBoundingSphere();
  group.add(clampsInstanced);

  // Sub-meter / RCCB Weatherproof Breaker Box below Wallbox on Pier
  const breakerBoxGeo = new THREE.BoxGeometry(0.24, 0.3, 0.11);
  geometries.push(breakerBoxGeo);
  const breakerBox = new THREE.Mesh(breakerBoxGeo, darkMetalMat);
  breakerBox.position.set(pierX + 0.16, 0.78, pierZ + 0.24);
  group.add(breakerBox);

  // 9. Realistic Catenary EPDM Rubber Charging Cable & Type-2 Vehicle Connector Plug
  const controlPts = computeChargingCableControlPoints(HERO_CHARGER_CONFIG, HERO_VEHICLE_CONFIG).map(
    ([x, y, z]) => new THREE.Vector3(x, y, z)
  );
  const cableCurve = new THREE.CatmullRomCurve3(controlPts);

  const cableGeo = new THREE.TubeGeometry(cableCurve, 48, 0.019, 12, false);
  geometries.push(cableGeo);
  const cableMesh = new THREE.Mesh(cableGeo, rubberMat);
  cableMesh.castShadow = true;
  cableMesh.receiveShadow = true;
  group.add(cableMesh);

  // Ergonomic Type-2 Connector Handle + Charge Port Housing at the Vehicle End
  const portWorld = computeWorldChargePortPosition(HERO_VEHICLE_CONFIG);
  const connectorGroup = new THREE.Group();
  connectorGroup.position.set(portWorld[0], portWorld[1], portWorld[2]);
  // Orient handle perpendicular to the vehicle's front-left fender
  connectorGroup.rotation.y = HERO_VEHICLE_CONFIG.rotationY + Math.PI / 2;
  group.add(connectorGroup);

  // Flush Vehicle Charge Port Socket Bezel on Fender
  const socketFlangeGeo = new THREE.CylinderGeometry(0.068, 0.068, 0.024, 20);
  const plugBarrelGeo = new THREE.CylinderGeometry(0.036, 0.042, 0.13, 16);
  const plugGripGeo = new THREE.CylinderGeometry(0.028, 0.034, 0.14, 14);
  const statusCollarGeo = new THREE.TorusGeometry(0.038, 0.0045, 10, 20);
  geometries.push(socketFlangeGeo, plugBarrelGeo, plugGripGeo, statusCollarGeo);

  const socketFlange = new THREE.Mesh(socketFlangeGeo, darkMetalMat);
  socketFlange.rotation.x = Math.PI / 2;
  socketFlange.position.set(0, 0, -0.01);
  connectorGroup.add(socketFlange);

  // Open Charge Port Flap Door hinged beside the socket
  const portFlapGeo = new THREE.BoxGeometry(0.11, 0.09, 0.012);
  geometries.push(portFlapGeo);
  const portFlap = new THREE.Mesh(portFlapGeo, darkMetalMat);
  portFlap.position.set(-0.085, 0.01, 0.04);
  portFlap.rotation.y = -0.65;
  connectorGroup.add(portFlap);

  // Type-2 Plug Barrel inserted into Socket
  const plugBarrel = new THREE.Mesh(plugBarrelGeo, rubberMat);
  plugBarrel.rotation.x = Math.PI / 2;
  plugBarrel.position.set(0, 0, 0.055);
  connectorGroup.add(plugBarrel);

  // Subtle Lime Status Collar Ring on Type-2 Connector
  const statusCollar = new THREE.Mesh(statusCollarGeo, ledBarMat);
  statusCollar.position.set(0, 0, 0.095);
  connectorGroup.add(statusCollar);

  // Angled Ergonomic Handle Grip
  const plugGrip = new THREE.Mesh(plugGripGeo, darkMetalMat);
  plugGrip.rotation.x = Math.PI / 2 + 0.38;
  plugGrip.position.set(0, -0.028, 0.145);
  connectorGroup.add(plugGrip);
  clickableMeshes.push(plugGrip);

  let currentState: ChargerVisualState = 'charging';

  const setChargerState = (state: ChargerVisualState) => {
    currentState = state;
    const spec = getChargerStatusVisualSpec(state);
    const nextTex = oledTextureCache[state] || oledTextureCache.charging;
    if (screenMat.map !== nextTex) {
      screenMat.map = nextTex;
      screenMat.emissiveMap = nextTex;
      screenMat.needsUpdate = true;
    }

    ledBarMat.color.setHex(spec.ledHex);
    ledBarMat.emissive.setHex(spec.ledHex);
    ledBarMat.emissiveIntensity = spec.emissiveIntensity;
  };

  const updateAnimation = (elapsedTime: number) => {
    if (currentState === 'charging') {
      // Restrained, realistic breathing indicator on the status light pipe (like a real wallbox)
      ledBarMat.emissiveIntensity = 1.2 + Math.sin(elapsedTime * 2.4) * 0.25;
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
