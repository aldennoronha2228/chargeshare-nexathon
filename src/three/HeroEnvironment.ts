import * as THREE from 'three';
import { loadPbrSet, loadSceneryPrototype, placePrototype, pbrMaterial, ensureSecondUv } from './SceneAssets';
import { PAVING, RESIDENCE_FRONT_Z } from './sceneLayout';

export interface HeroEnvironmentHandle {
  group: THREE.Group;
  dispose: () => void;
}

export async function createHeroEnvironment(
  maxAnisotropy: number
): Promise<HeroEnvironmentHandle> {
  const group = new THREE.Group();
  group.name = 'ChargeShareHeroEnvironment';

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  // 1. Interlocking Concrete Paver Driveway Ground
  try {
    const pavingPbr = await loadPbrSet(
      '/textures/interlocking_concrete_pavers',
      maxAnisotropy,
      new THREE.Vector2(14, 18)
    );
    textures.push(pavingPbr.map, pavingPbr.normalMap, pavingPbr.roughnessMap, pavingPbr.aoMap);

    const groundGeo = new THREE.PlaneGeometry(
      PAVING.maxX - PAVING.minX,
      PAVING.maxZ - PAVING.minZ
    );
    ensureSecondUv(groundGeo);
    geometries.push(groundGeo);

    const groundMat = pbrMaterial(pavingPbr, {
      roughness: 0.85,
      metalness: 0.05,
    });
    materials.push(groundMat);

    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(
      (PAVING.minX + PAVING.maxX) / 2,
      0,
      (PAVING.minZ + PAVING.maxZ) / 2
    );
    groundMesh.receiveShadow = true;
    group.add(groundMesh);
  } catch (err) {
    console.warn('Failed loading paver textures, using procedural ground:', err);
    const fallbackGeo = new THREE.PlaneGeometry(30, 30);
    geometries.push(fallbackGeo);
    const fallbackMat = new THREE.MeshStandardMaterial({ color: 0x222624, roughness: 0.8 });
    materials.push(fallbackMat);
    const fallbackMesh = new THREE.Mesh(fallbackGeo, fallbackMat);
    fallbackMesh.rotation.x = -Math.PI / 2;
    fallbackMesh.receiveShadow = true;
    group.add(fallbackMesh);
  }

  // 2. White Parking Bay Lines on Driveway
  const lineMat = new THREE.MeshBasicMaterial({
    color: 0xe8edea,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  materials.push(lineMat);

  const createLine = (x1: number, z1: number, x2: number, z2: number, width = 0.09) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const lineGeo = new THREE.PlaneGeometry(width, length);
    geometries.push(lineGeo);
    const lineMesh = new THREE.Mesh(lineGeo, lineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.rotation.z = Math.atan2(x2 - x1, z2 - z1);
    lineMesh.position.set((x1 + x2) / 2, 0.005, (z1 + z2) / 2);
    group.add(lineMesh);
  };

  createLine(-2.3, 3.2, -0.6, -2.8);
  createLine(1.2, 3.6, 2.7, -2.5);

  // 3. Architectural Concrete Column / Pillar behind the Charger Post
  const columnWidth = 0.82;
  const columnDepth = 0.72;
  const columnHeight = 4.2;
  const colGeo = new THREE.BoxGeometry(columnWidth, columnHeight, columnDepth);
  ensureSecondUv(colGeo);
  geometries.push(colGeo);

  let columnMat: THREE.Material;
  try {
    const concretePbr = await loadPbrSet(
      '/textures/painted_concrete',
      maxAnisotropy,
      new THREE.Vector2(1, 3)
    );
    textures.push(concretePbr.map, concretePbr.normalMap, concretePbr.roughnessMap, concretePbr.aoMap);
    columnMat = pbrMaterial(concretePbr, {
      color: 0x8a8474,
      roughness: 0.75,
      metalness: 0.08,
    });
  } catch {
    columnMat = new THREE.MeshStandardMaterial({
      color: 0x7a7466,
      roughness: 0.8,
    });
  }
  materials.push(columnMat);

  const colMesh = new THREE.Mesh(colGeo, columnMat);
  colMesh.position.set(2.05, columnHeight / 2, 0.35);
  colMesh.castShadow = true;
  colMesh.receiveShadow = true;
  group.add(colMesh);

  // Recessed electrical utility hatch on pillar
  const hatchGeo = new THREE.PlaneGeometry(0.24, 0.32);
  geometries.push(hatchGeo);
  const hatchMat = new THREE.MeshStandardMaterial({
    color: 0x161a18,
    roughness: 0.5,
    metalness: 0.3,
  });
  materials.push(hatchMat);
  const hatchMesh = new THREE.Mesh(hatchGeo, hatchMat);
  hatchMesh.position.set(2.05 + columnWidth / 2 + 0.002, 0.9, 0.35);
  hatchMesh.rotation.y = Math.PI / 2;
  group.add(hatchMesh);

  // 4. Modern Architectural Facade / Window Glass Wall behind
  const wallWidth = 20;
  const wallHeight = 4.6;
  const facadeGroup = new THREE.Group();
  facadeGroup.position.set(0, 0, RESIDENCE_FRONT_Z);

  // Dark aluminum window mullions & frame
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x121614,
    metalness: 0.7,
    roughness: 0.3,
  });
  materials.push(frameMat);

  // Reflective tinted architectural window glass
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x182420,
    metalness: 0.2,
    roughness: 0.05,
    transmission: 0.7,
    transparent: true,
    opacity: 0.85,
    ior: 1.52,
    reflectivity: 0.9,
  });
  materials.push(glassMat);

  const glassGeo = new THREE.PlaneGeometry(wallWidth, wallHeight);
  geometries.push(glassGeo);
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(0, wallHeight / 2, 0);
  facadeGroup.add(glassMesh);

  // Window mullions (vertical columns)
  const mullionGeo = new THREE.BoxGeometry(0.12, wallHeight, 0.16);
  geometries.push(mullionGeo);
  for (let x = -7.5; x <= 7.5; x += 3.0) {
    const m = new THREE.Mesh(mullionGeo, frameMat);
    m.position.set(x, wallHeight / 2, 0.05);
    m.castShadow = true;
    facadeGroup.add(m);
  }

  // Horizontal window frame transoms
  const transomGeo = new THREE.BoxGeometry(wallWidth, 0.12, 0.16);
  geometries.push(transomGeo);
  const t1 = new THREE.Mesh(transomGeo, frameMat);
  t1.position.set(0, 2.4, 0.05);
  facadeGroup.add(t1);

  // Interior wooden panel / garage door wall behind glass
  try {
    const woodPbr = await loadPbrSet(
      '/textures/wooden_garage_door',
      maxAnisotropy,
      new THREE.Vector2(4, 2)
    );
    textures.push(woodPbr.map, woodPbr.normalMap, woodPbr.roughnessMap, woodPbr.aoMap);
    const woodMat = pbrMaterial(woodPbr, { roughness: 0.65 });
    materials.push(woodMat);

    const backWallGeo = new THREE.PlaneGeometry(wallWidth, wallHeight);
    geometries.push(backWallGeo);
    const backWall = new THREE.Mesh(backWallGeo, woodMat);
    backWall.position.set(0, wallHeight / 2, -1.8);
    facadeGroup.add(backWall);
  } catch {
    const backWallMat = new THREE.MeshStandardMaterial({ color: 0x2b1e16, roughness: 0.7 });
    materials.push(backWallMat);
    const backWallGeo = new THREE.PlaneGeometry(wallWidth, wallHeight);
    geometries.push(backWallGeo);
    const backWall = new THREE.Mesh(backWallGeo, backWallMat);
    backWall.position.set(0, wallHeight / 2, -1.8);
    facadeGroup.add(backWall);
  }

  group.add(facadeGroup);

  // 5. Planter ledge & Potted Greenery / Plants
  const ledgeGeo = new THREE.BoxGeometry(6.5, 0.45, 1.2);
  geometries.push(ledgeGeo);
  const ledgeMat = new THREE.MeshStandardMaterial({ color: 0x363a38, roughness: 0.7 });
  materials.push(ledgeMat);
  const ledge = new THREE.Mesh(ledgeGeo, ledgeMat);
  ledge.position.set(3.8, 0.22, RESIDENCE_FRONT_Z + 0.6);
  ledge.receiveShadow = true;
  group.add(ledge);

  // Terracotta Pot
  const potGeo = new THREE.CylinderGeometry(0.38, 0.28, 0.52, 20);
  geometries.push(potGeo);
  const potMat = new THREE.MeshStandardMaterial({ color: 0x945236, roughness: 0.85 });
  materials.push(potMat);
  const potMesh = new THREE.Mesh(potGeo, potMat);
  potMesh.position.set(3.4, 0.71, RESIDENCE_FRONT_Z + 0.6);
  potMesh.castShadow = true;
  group.add(potMesh);

  // Load and place 3D potted plants
  try {
    const [fernProto, shrubProto] = await Promise.all([
      loadSceneryPrototype('/models/plants/fern_02/fern_02_1k.gltf', 'Fern'),
      loadSceneryPrototype('/models/plants/shrub_02/shrub_02_1k.gltf', 'Shrub'),
    ]);

    // Plant inside terracotta pot
    placePrototype(shrubProto, 0.95, 3.4, RESIDENCE_FRONT_Z + 0.6, 0.4, group, 0.9);
    // Plant on ledge next to pot
    placePrototype(fernProto, 0.8, 4.4, RESIDENCE_FRONT_Z + 0.6, 1.2, group, 0.45);
    placePrototype(fernProto, 0.65, 2.5, RESIDENCE_FRONT_Z + 0.5, -0.6, group, 0);
  } catch (err) {
    console.warn('Scenery plants prototype load skipped:', err);
  }

  return {
    group,
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
