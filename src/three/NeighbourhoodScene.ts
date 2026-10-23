import * as THREE from 'three';

export interface NeighbourhoodSceneHandle {
  rootGroup: THREE.Group;
  evGroup: THREE.Group;
  networkGroup: THREE.Group;
  clickableMeshes: THREE.Object3D[];
  updateAnimation: (elapsedTime: number, networkIntensity: number) => void;
  highlightNodeIndex: (index: number) => void;
  dispose: () => void;
}

/**
 * Generates a procedural architectural paver grid texture for the driveway & street
 */
function createPaverGridTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#18241E';
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#23362C';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 256; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Generates a soft radial contact shadow texture to ground the EV and pillars
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
    grad.addColorStop(0, 'rgba(6, 12, 9, 0.72)');
    grad.addColorStop(0.65, 'rgba(6, 12, 9, 0.28)');
    grad.addColorStop(1, 'rgba(6, 12, 9, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createNeighbourhoodScene(maxAnisotropy: number): NeighbourhoodSceneHandle {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ChargeShareWorld';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const clickableMeshes: THREE.Object3D[] = [];

  // 1. Ground Terrain & Driveway Paver Surface
  const paverTex = createPaverGridTexture(maxAnisotropy);
  textures.push(paverTex);

  const groundGeo = new THREE.PlaneGeometry(90, 90);
  geometries.push(groundGeo);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: paverTex,
    roughness: 0.88,
    metalness: 0.08,
  });
  materials.push(groundMat);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  rootGroup.add(groundMesh);

  // Main Neighbourhood Road Strip (Disjoint Y = 0.02 to prevent Z-fighting)
  const roadGeo = new THREE.PlaneGeometry(80, 4.6);
  geometries.push(roadGeo);
  const roadMat = new THREE.MeshStandardMaterial({
    color: 0x141a17,
    roughness: 0.9,
    metalness: 0.05,
  });
  materials.push(roadMat);
  const mainRoad = new THREE.Mesh(roadGeo, roadMat);
  mainRoad.rotation.x = -Math.PI / 2;
  mainRoad.position.set(0, 0.02, 4.8);
  mainRoad.receiveShadow = true;
  rootGroup.add(mainRoad);

  const crossRoad = new THREE.Mesh(roadGeo, roadMat);
  crossRoad.rotation.x = -Math.PI / 2;
  crossRoad.rotation.z = Math.PI / 2;
  crossRoad.position.set(-6.5, 0.022, 0);
  rootGroup.add(crossRoad);

  // 2. Hero Residence Architectural Backdrop (Framed strictly on the right side behind the charger)
  const bungalowGroup = new THREE.Group();
  rootGroup.add(bungalowGroup);

  const stuccoMat = new THREE.MeshStandardMaterial({
    color: 0x263f33,
    roughness: 0.78,
    metalness: 0.08,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x16261e,
    roughness: 0.55,
    metalness: 0.25,
  });
  const warmWindowMat = new THREE.MeshStandardMaterial({
    color: 0xf5d47a,
    emissive: 0xe8b948,
    emissiveIntensity: 0.65,
    roughness: 0.2,
  });
  materials.push(stuccoMat, darkTrimMat, warmWindowMat);

  // Main residence volume behind the right-side driveway
  const wallGeo = new THREE.BoxGeometry(4.6, 3.6, 3.2);
  geometries.push(wallGeo);
  const wallMesh = new THREE.Mesh(wallGeo, stuccoMat);
  wallMesh.position.set(2.8, 1.8, -3.5);
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  bungalowGroup.add(wallMesh);

  // Cantilevered Concrete Roof Canopy extending over right-side driveway
  const canopyGeo = new THREE.BoxGeometry(5.2, 0.26, 4.6);
  geometries.push(canopyGeo);
  const canopyMesh = new THREE.Mesh(canopyGeo, darkTrimMat);
  canopyMesh.position.set(2.6, 3.65, -2.7);
  canopyMesh.castShadow = true;
  bungalowGroup.add(canopyMesh);

  // Warm Clerestory Window on Residence (positioned to the right of the charger)
  const winGeo = new THREE.BoxGeometry(1.8, 1.0, 0.1);
  geometries.push(winGeo);
  const winMesh = new THREE.Mesh(winGeo, warmWindowMat);
  winMesh.position.set(3.4, 2.25, -1.85);
  bungalowGroup.add(winMesh);

  // Low Architectural Garden Wall on far right
  const gateGeo = new THREE.BoxGeometry(2.4, 1.35, 0.14);
  geometries.push(gateGeo);
  const gateMesh = new THREE.Mesh(gateGeo, darkTrimMat);
  gateMesh.position.set(4.6, 0.675, -1.2);
  bungalowGroup.add(gateMesh);

  // 3. Composite 12-Part Hero Electric SUV (Grounded at y = 0, framed on the right side)
  const evGroup = new THREE.Group();
  evGroup.position.set(0.15, 0, 0.55);
  evGroup.rotation.y = 0.22;
  rootGroup.add(evGroup);

  // Soft Radial Contact Shadow under SUV (y = 0.025)
  const shadowTex = createContactShadowTexture();
  textures.push(shadowTex);
  const shadowPlaneGeo = new THREE.PlaneGeometry(4.8, 2.6);
  geometries.push(shadowPlaneGeo);
  const shadowPlaneMat = new THREE.MeshBasicMaterial({
    map: shadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.75,
  });
  materials.push(shadowPlaneMat);
  const shadowPlane = new THREE.Mesh(shadowPlaneGeo, shadowPlaneMat);
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.set(0, 0.025, 0);
  evGroup.add(shadowPlane);

  // SUV Lower Sculpted Body (1)
  const carPaintMat = new THREE.MeshPhysicalMaterial({
    color: 0x1c4a35,
    roughness: 0.22,
    metalness: 0.72,
    clearcoat: 1.0,
    clearcoatRoughness: 0.08,
  });
  const cabinGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x0d1712,
    roughness: 0.12,
    metalness: 0.2,
    clearcoat: 0.9,
  });
  const wheelTireMat = new THREE.MeshStandardMaterial({
    color: 0x151816,
    roughness: 0.85,
    metalness: 0.1,
  });
  const wheelRimMat = new THREE.MeshStandardMaterial({
    color: 0xc8d1ca,
    roughness: 0.25,
    metalness: 0.88,
  });
  const drlLimeMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 1.8,
  });
  const tailRedMat = new THREE.MeshStandardMaterial({
    color: 0xe04f3e,
    emissive: 0xe04f3e,
    emissiveIntensity: 1.2,
  });
  materials.push(carPaintMat, cabinGlassMat, wheelTireMat, wheelRimMat, drlLimeMat, tailRedMat);

  const lowerHullGeo = new THREE.BoxGeometry(3.5, 0.68, 1.62);
  geometries.push(lowerHullGeo);
  const lowerHull = new THREE.Mesh(lowerHullGeo, carPaintMat);
  lowerHull.position.set(0, 0.66, 0);
  lowerHull.castShadow = true;
  lowerHull.receiveShadow = true;
  evGroup.add(lowerHull);
  clickableMeshes.push(lowerHull);

  // SUV Cabin Greenhouse (2)
  const cabinGeo = new THREE.BoxGeometry(2.05, 0.56, 1.38);
  geometries.push(cabinGeo);
  const cabinMesh = new THREE.Mesh(cabinGeo, cabinGlassMat);
  cabinMesh.position.set(-0.18, 1.24, 0);
  cabinMesh.castShadow = true;
  evGroup.add(cabinMesh);

  // SUV Roof Panel (3)
  const roofGeo = new THREE.BoxGeometry(1.92, 0.08, 1.32);
  geometries.push(roofGeo);
  const roofMesh = new THREE.Mesh(roofGeo, carPaintMat);
  roofMesh.position.set(-0.18, 1.53, 0);
  evGroup.add(roofMesh);

  // Front LED DRL Strip (4) & Rear Taillight Bar (5)
  const drlGeo = new THREE.BoxGeometry(0.06, 0.08, 1.42);
  geometries.push(drlGeo);
  const drlMesh = new THREE.Mesh(drlGeo, drlLimeMat);
  drlMesh.position.set(1.76, 0.82, 0);
  evGroup.add(drlMesh);

  const tailMesh = new THREE.Mesh(drlGeo, tailRedMat);
  tailMesh.position.set(-1.76, 0.88, 0);
  evGroup.add(tailMesh);

  // Illuminated Fender Charging Port on SUV (6)
  const portGeo = new THREE.CylinderGeometry(0.09, 0.09, 0.05, 20);
  geometries.push(portGeo);
  const portMesh = new THREE.Mesh(portGeo, drlLimeMat);
  portMesh.rotation.z = Math.PI / 2;
  portMesh.position.set(1.05, 0.86, 0.82);
  evGroup.add(portMesh);

  // 4 Multi-Part Wheels (7, 8, 9, 10)
  const tireGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.24, 24);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.25, 16);
  geometries.push(tireGeo, rimGeo);

  const wheelPositions: [number, number, number][] = [
    [1.12, 0.36, 0.78],
    [1.12, 0.36, -0.78],
    [-1.12, 0.36, 0.78],
    [-1.12, 0.36, -0.78],
  ];

  wheelPositions.forEach(([wx, wy, wz]) => {
    const wheelGroup = new THREE.Group();
    wheelGroup.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(tireGeo, wheelTireMat);
    tire.rotation.x = Math.PI / 2;
    const rim = new THREE.Mesh(rimGeo, wheelRimMat);
    rim.rotation.x = Math.PI / 2;
    wheelGroup.add(tire, rim);
    evGroup.add(wheelGroup);
  });

  // 4. Miniature Neighbourhood Homes, Charger Beacons & Animated Connection Network (Chapter 2 & 5)
  const networkGroup = new THREE.Group();
  rootGroup.add(networkGroup);

  const neighbourCoords: { x: number; z: number; h: number; label: string }[] = [
    { x: -9.5, z: -4.2, h: 2.8, label: 'Koramangala Stilt Bay' },
    { x: -11.0, z: 7.5, h: 3.4, label: 'Jayanagar Carport' },
    { x: 9.2, z: -5.5, h: 3.1, label: 'Koregaon Park Courtyard' },
    { x: 11.5, z: 6.8, h: 4.2, label: 'Bandra Society Visitor Bay' },
    { x: 1.8, z: 11.2, h: 2.9, label: 'Vasant Vihar Verandah' },
  ];

  const houseGeo = new THREE.BoxGeometry(3.6, 1, 3.0);
  const beaconPoleGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 12);
  const beaconHeadGeo = new THREE.SphereGeometry(0.22, 16, 16);
  geometries.push(houseGeo, beaconPoleGeo, beaconHeadGeo);

  const neighbourHouseMat = new THREE.MeshStandardMaterial({
    color: 0x263d31,
    roughness: 0.75,
    metalness: 0.15,
  });
  materials.push(neighbourHouseMat);

  const beaconMeshes: THREE.Mesh[] = [];
  const networkCurves: THREE.CatmullRomCurve3[] = [];
  const networkPulses: THREE.Mesh[] = [];

  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.85,
  });
  materials.push(lineMat);

  neighbourCoords.forEach((n, idx) => {
    // Neighbouring building volume
    const bldg = new THREE.Mesh(houseGeo, neighbourHouseMat);
    bldg.scale.y = n.h;
    bldg.position.set(n.x, n.h / 2, n.z);
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    networkGroup.add(bldg);

    // Charger Beacon Pin next to driveway
    const bx = n.x + (n.x < 0 ? 2.2 : -2.2);
    const bz = n.z + 1.2;

    const pole = new THREE.Mesh(beaconPoleGeo, darkTrimMat);
    pole.position.set(bx, 1.1, bz);
    networkGroup.add(pole);

    const bMat = new THREE.MeshStandardMaterial({
      color: idx === 0 ? 0xd8f36a : 0xf6f3e9,
      emissive: 0xd8f36a,
      emissiveIntensity: idx === 0 ? 1.8 : 0.9,
      roughness: 0.2,
    });
    materials.push(bMat);

    const head = new THREE.Mesh(beaconHeadGeo, bMat);
    head.position.set(bx, 2.3, bz);
    networkGroup.add(head);
    beaconMeshes.push(head);

    // Arcing Connection Path from Hero Charger (2.3, 0.2, -1.0) to Neighbour Charger
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.3, 0.25, -0.8),
      new THREE.Vector3((2.3 + bx) * 0.5, 1.35 + idx * 0.2, (-0.8 + bz) * 0.5),
      new THREE.Vector3(bx, 0.35, bz),
    ]);
    networkCurves.push(curve);

    const arcGeo = new THREE.TubeGeometry(curve, 32, 0.035, 8, false);
    geometries.push(arcGeo);
    const arcMesh = new THREE.Mesh(arcGeo, lineMat);
    networkGroup.add(arcMesh);

    const pulseMesh = new THREE.Mesh(beaconHeadGeo, drlLimeMat);
    pulseMesh.scale.setScalar(0.55);
    networkGroup.add(pulseMesh);
    networkPulses.push(pulseMesh);
  });

  // 5. InstancedMesh Tropical Neighbourhood Trees (24 instances)
  const treeCount = 24;
  const canopySphereGeo = new THREE.IcosahedronGeometry(0.95, 1);
  const trunkCylGeo = new THREE.CylinderGeometry(0.14, 0.2, 1.2, 8);
  geometries.push(canopySphereGeo, trunkCylGeo);

  const foliageMat = new THREE.MeshStandardMaterial({
    color: 0x26593f,
    roughness: 0.85,
    metalness: 0.05,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3b2d22,
    roughness: 0.9,
  });
  materials.push(foliageMat, trunkMat);

  const canopyInstanced = new THREE.InstancedMesh(canopySphereGeo, foliageMat, treeCount);
  const trunkInstanced = new THREE.InstancedMesh(trunkCylGeo, trunkMat, treeCount);

  const dummy = new THREE.Object3D();
  const tempColor = new THREE.Color();

  for (let i = 0; i < treeCount; i++) {
    const angle = (i / treeCount) * Math.PI * 2;
    const radius = 14 + (i % 3) * 4.5;
    const tx = Math.cos(angle) * radius;
    const tz = Math.sin(angle) * radius - 2;
    const scale = 0.85 + (i % 4) * 0.15;

    dummy.position.set(tx, 0.6 * scale, tz);
    dummy.scale.set(scale, scale, scale);
    dummy.updateMatrix();
    trunkInstanced.setMatrixAt(i, dummy.matrix);

    dummy.position.set(tx, 1.75 * scale, tz);
    dummy.scale.set(scale * 1.15, scale * 0.95, scale * 1.15);
    dummy.updateMatrix();
    canopyInstanced.setMatrixAt(i, dummy.matrix);

    tempColor.setHSL(0.38 + (i % 3) * 0.02, 0.45, 0.22 + (i % 2) * 0.05);
    canopyInstanced.setColorAt(i, tempColor);
  }

  trunkInstanced.instanceMatrix.needsUpdate = true;
  canopyInstanced.instanceMatrix.needsUpdate = true;
  if (canopyInstanced.instanceColor) canopyInstanced.instanceColor.needsUpdate = true;
  trunkInstanced.computeBoundingSphere();
  canopyInstanced.computeBoundingSphere();

  rootGroup.add(trunkInstanced, canopyInstanced);

  const _tempVec = new THREE.Vector3();

  const updateAnimation = (elapsedTime: number, networkIntensity: number) => {
    lineMat.opacity = THREE.MathUtils.clamp(0.25 + networkIntensity * 0.7, 0.2, 0.95);

    for (let i = 0; i < networkCurves.length; i++) {
      const t = (elapsedTime * 0.28 + i * 0.2) % 1;
      networkCurves[i].getPointAt(t, _tempVec);
      networkPulses[i].position.copy(_tempVec);
    }
  };

  const highlightNodeIndex = (index: number) => {
    beaconMeshes.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const active = i === index % beaconMeshes.length;
      mat.emissiveIntensity = active ? 2.2 : 0.8;
      mesh.scale.setScalar(active ? 1.35 : 1.0);
    });
  };

  return {
    rootGroup,
    evGroup,
    networkGroup,
    clickableMeshes,
    updateAnimation,
    highlightNodeIndex,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
