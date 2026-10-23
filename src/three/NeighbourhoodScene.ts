import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { HERO_VEHICLE_CONFIG } from './sceneConfig';

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
 * Generates a realistic multi-layered automotive chassis + 4-wheel ambient occlusion contact shadow texture
 */
function createAutomotiveContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 512);

    // Core chassis underbody ambient occlusion
    const chassisGrad = ctx.createRadialGradient(256, 256, 40, 256, 256, 235);
    chassisGrad.addColorStop(0, 'rgba(3, 7, 5, 0.88)');
    chassisGrad.addColorStop(0.55, 'rgba(4, 9, 7, 0.56)');
    chassisGrad.addColorStop(0.82, 'rgba(4, 9, 7, 0.16)');
    chassisGrad.addColorStop(1, 'rgba(4, 9, 7, 0.0)');
    ctx.fillStyle = chassisGrad;
    ctx.fillRect(0, 0, 512, 512);

    // 4 concentrated tire contact patch shadows
    const wheelPatches: [number, number][] = [
      [125, 135],
      [387, 135],
      [125, 375],
      [387, 375],
    ];
    wheelPatches.forEach(([wx, wy]) => {
      const wGrad = ctx.createRadialGradient(wx, wy, 4, wx, wy, 48);
      wGrad.addColorStop(0, 'rgba(2, 5, 4, 0.92)');
      wGrad.addColorStop(0.5, 'rgba(2, 5, 4, 0.45)');
      wGrad.addColorStop(1, 'rgba(2, 5, 4, 0.0)');
      ctx.fillStyle = wGrad;
      ctx.beginPath();
      ctx.arc(wx, wy, 48, 0, Math.PI * 2);
      ctx.fill();
    });
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Generates a realistic Indian Green-Plate Electric Vehicle registration plate (HSRP)
 * to replace the sample Khronos logo plate on CarConcept.glb
 */
function createIndianEvLicensePlateTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Official Indian EV Commercial/Private Green HSRP background
    ctx.fillStyle = '#0F5C2E';
    ctx.fillRect(0, 0, 512, 128);

    // Dark anodized aluminum plate frame
    ctx.strokeStyle = '#1B221F';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 118);

    // Left IND band
    ctx.fillStyle = '#0A4421';
    ctx.fillRect(14, 14, 62, 100);
    ctx.fillStyle = '#E8F2EC';
    ctx.font = '700 20px Inter, system-ui, sans-serif';
    ctx.fillText('IND', 26, 86);

    // Registration Number
    ctx.fillStyle = '#F4F7F5';
    ctx.font = '700 56px Inter, system-ui, sans-serif';
    ctx.fillText('KA 01 EV 4820', 94, 84);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createNeighbourhoodScene(
  maxAnisotropy: number,
  onVehicleLoaded?: () => void
): NeighbourhoodSceneHandle {
  const rootGroup = new THREE.Group();
  rootGroup.name = 'ChargeShareWorld';

  let disposed = false;
  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];
  const clickableMeshes: THREE.Object3D[] = [];

  const texLoader = new THREE.TextureLoader();
  const loadTiledTexture = (
    url: string,
    isColor: boolean,
    repeatX: number,
    repeatY: number
  ): THREE.Texture => {
    const tex = texLoader.load(url);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = maxAnisotropy;
    textures.push(tex);
    return tex;
  };

  // ============================================================================
  // 1. REALISTIC PBR DRIVEWAY PAVERS, CURBS, DRAINAGE GRATE & ASPHALT STREET
  // ============================================================================
  const paversDiff = loadTiledTexture('/textures/pavers_diff.jpg', true, 16, 16);
  const paversNor = loadTiledTexture('/textures/pavers_nor.jpg', false, 16, 16);

  const groundGeo = new THREE.PlaneGeometry(76, 76, 64, 64);
  geometries.push(groundGeo);
  const groundMat = new THREE.MeshStandardMaterial({
    color: 0x707a75,
    map: paversDiff,
    normalMap: paversNor,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 0.88,
    metalness: 0.04,
    envMapIntensity: 0.26,
  });
  materials.push(groundMat);

  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.position.y = 0;
  groundMesh.receiveShadow = true;
  rootGroup.add(groundMesh);

  // Outer Residential Street in Clean Asphalt PBR (placed at z = 12.5 so hero courtyard is uninterrupted)
  const asphaltDiff = loadTiledTexture('/textures/asphalt_diff.jpg', true, 16, 3);
  const asphaltNor = loadTiledTexture('/textures/asphalt_nor.jpg', false, 16, 3);

  const streetGeo = new THREE.PlaneGeometry(76, 6.5);
  geometries.push(streetGeo);
  const streetMat = new THREE.MeshStandardMaterial({
    color: 0x565d5a,
    map: asphaltDiff,
    normalMap: asphaltNor,
    normalScale: new THREE.Vector2(0.8, 0.8),
    roughness: 0.92,
    metalness: 0.03,
    envMapIntensity: 0.22,
  });
  materials.push(streetMat);

  const streetMesh = new THREE.Mesh(streetGeo, streetMat);
  streetMesh.rotation.x = -Math.PI / 2;
  streetMesh.position.set(0, 0.008, 12.5);
  streetMesh.receiveShadow = true;
  rootGroup.add(streetMesh);

  // Chamfered Granite Curb Stones & Parking Bay Markings
  const graniteCurbMat = new THREE.MeshStandardMaterial({
    color: 0x3b423f,
    normalMap: paversNor,
    roughness: 0.72,
    metalness: 0.08,
  });
  const bayLineMat = new THREE.MeshStandardMaterial({
    color: 0x7b8c82,
    roughness: 0.65,
    metalness: 0.05,
    transparent: true,
    opacity: 0.48,
  });
  materials.push(graniteCurbMat, bayLineMat);

  // Subtle Painted Parking Bay Corner Brackets & Wheel Stop Block behind the car
  const baySideLineGeo = new THREE.PlaneGeometry(0.05, 4.4);
  const wheelStopGeo = new THREE.BoxGeometry(1.55, 0.085, 0.15);
  geometries.push(baySideLineGeo, wheelStopGeo);

  const bayLineGroup = new THREE.Group();
  bayLineGroup.position.set(HERO_VEHICLE_CONFIG.position[0], 0.006, HERO_VEHICLE_CONFIG.position[2]);
  bayLineGroup.rotation.y = HERO_VEHICLE_CONFIG.rotationY;
  rootGroup.add(bayLineGroup);

  [-1.22, 1.22].forEach((bx) => {
    const lineMesh = new THREE.Mesh(baySideLineGeo, bayLineMat);
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.position.set(bx, 0, 0.1);
    bayLineGroup.add(lineMesh);
  });

  // Heavy rubber/concrete wheel chock stop block behind rear tires
  const wheelStop = new THREE.Mesh(wheelStopGeo, graniteCurbMat);
  wheelStop.position.set(0, 0.042, -1.68);
  wheelStop.castShadow = true;
  wheelStop.receiveShadow = true;
  bayLineGroup.add(wheelStop);

  // ============================================================================
  // 2. CONTEMPORARY INDIAN URBAN RESIDENTIAL ARCHITECTURE (CONCRETE, TEAK, GLASS)
  // ============================================================================
  const residenceGroup = new THREE.Group();
  residenceGroup.name = 'ContemporaryResidence';
  rootGroup.add(residenceGroup);

  const concreteDiff = loadTiledTexture('/textures/concrete_diff.jpg', true, 3, 2);
  const concreteNor = loadTiledTexture('/textures/concrete_nor.jpg', false, 3, 2);
  const concreteRough = loadTiledTexture('/textures/concrete_rough.jpg', false, 3, 2);

  const woodDiff = loadTiledTexture('/textures/wood_diff.jpg', true, 2, 1);
  const woodNor = loadTiledTexture('/textures/wood_nor.jpg', false, 2, 1);
  const woodRough = loadTiledTexture('/textures/wood_rough.jpg', false, 2, 1);

  const archConcreteMat = new THREE.MeshStandardMaterial({
    color: 0xaba79f,
    map: concreteDiff,
    normalMap: concreteNor,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughnessMap: concreteRough,
    roughness: 0.84,
    metalness: 0.05,
  });
  const darkConcreteMat = new THREE.MeshStandardMaterial({
    color: 0x454a47,
    map: concreteDiff,
    normalMap: concreteNor,
    roughnessMap: concreteRough,
    roughness: 0.78,
    metalness: 0.08,
  });
  const teakWoodMat = new THREE.MeshStandardMaterial({
    color: 0xb87e4b,
    map: woodDiff,
    normalMap: woodNor,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: woodRough,
    roughness: 0.54,
    metalness: 0.04,
  });
  const bronzeMullionMat = new THREE.MeshStandardMaterial({
    color: 0x1b201e,
    roughness: 0.32,
    metalness: 0.84,
  });
  const archGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x121d18,
    roughness: 0.06,
    metalness: 0.12,
    clearcoat: 1.0,
    clearcoatRoughness: 0.03,
    transparent: true,
    opacity: 0.42,
    envMapIntensity: 1.8,
  });
  const warmCoveLightMat = new THREE.MeshStandardMaterial({
    color: 0xffe4b8,
    emissive: 0xffc878,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  const interiorWallMat = new THREE.MeshStandardMaterial({
    color: 0xe6dac6,
    map: concreteDiff,
    roughness: 0.72,
    metalness: 0.02,
  });
  materials.push(
    archConcreteMat,
    darkConcreteMat,
    teakWoodMat,
    bronzeMullionMat,
    archGlassMat,
    warmCoveLightMat,
    interiorWallMat
  );

  // A. Ground-Floor Architectural Living Room Interior Box (Creates real 3D depth behind glass)
  const interiorBackWallGeo = new THREE.BoxGeometry(7.2, 3.4, 0.25);
  const interiorSideWallGeo = new THREE.BoxGeometry(0.32, 3.4, 2.8);
  const interiorFloorGeo = new THREE.BoxGeometry(7.2, 0.18, 3.2);
  geometries.push(interiorBackWallGeo, interiorSideWallGeo, interiorFloorGeo);

  const interiorBackWall = new THREE.Mesh(interiorBackWallGeo, interiorWallMat);
  interiorBackWall.position.set(2.4, 1.7, -4.4);
  interiorBackWall.receiveShadow = true;
  residenceGroup.add(interiorBackWall);

  // Warm timber acoustic slat wall + architectural shelving inside living room
  const featurePanelGeo = new THREE.BoxGeometry(3.4, 2.8, 0.06);
  const shelfGeo = new THREE.BoxGeometry(2.8, 0.05, 0.32);
  geometries.push(featurePanelGeo, shelfGeo);
  const featurePanel = new THREE.Mesh(featurePanelGeo, teakWoodMat);
  featurePanel.position.set(1.8, 1.65, -4.22);
  residenceGroup.add(featurePanel);

  [0.95, 1.55, 2.15].forEach((sy) => {
    const shelf = new THREE.Mesh(shelfGeo, bronzeMullionMat);
    shelf.position.set(1.8, sy, -4.05);
    residenceGroup.add(shelf);
  });

  // Interior Warm Indirect Ceiling Cove Strip
  const interiorCoveGeo = new THREE.BoxGeometry(6.2, 0.05, 0.14);
  geometries.push(interiorCoveGeo);
  const interiorCove = new THREE.Mesh(interiorCoveGeo, warmCoveLightMat);
  interiorCove.position.set(2.4, 3.25, -3.85);
  residenceGroup.add(interiorCove);

  const leftShearWall = new THREE.Mesh(interiorSideWallGeo, archConcreteMat);
  leftShearWall.position.set(-1.1, 1.7, -3.1);
  leftShearWall.castShadow = true;
  leftShearWall.receiveShadow = true;
  residenceGroup.add(leftShearWall);

  const rightShearWall = new THREE.Mesh(interiorSideWallGeo, archConcreteMat);
  rightShearWall.position.set(5.9, 1.7, -3.1);
  rightShearWall.castShadow = true;
  rightShearWall.receiveShadow = true;
  residenceGroup.add(rightShearWall);

  const plinthDeck = new THREE.Mesh(interiorFloorGeo, darkConcreteMat);
  plinthDeck.position.set(2.4, 0.09, -3.0);
  plinthDeck.receiveShadow = true;
  residenceGroup.add(plinthDeck);

  // B. Floor-to-Ceiling Low-Iron Glass Curtain Wall & Dark Bronze Aluminum Mullions (z = -2.1)
  const glassPaneGeo = new THREE.PlaneGeometry(6.8, 3.2);
  const vMullionGeo = new THREE.BoxGeometry(0.055, 3.3, 0.09);
  const hTransomGeo = new THREE.BoxGeometry(6.9, 0.06, 0.09);
  geometries.push(glassPaneGeo, vMullionGeo, hTransomGeo);

  const glassCurtain = new THREE.Mesh(glassPaneGeo, archGlassMat);
  glassCurtain.position.set(2.4, 1.72, -2.1);
  residenceGroup.add(glassCurtain);

  [-0.95, 0.72, 2.4, 4.08, 5.75].forEach((mx) => {
    const mullion = new THREE.Mesh(vMullionGeo, bronzeMullionMat);
    mullion.position.set(mx, 1.72, -2.1);
    mullion.castShadow = true;
    residenceGroup.add(mullion);
  });

  [0.18, 2.55, 3.32].forEach((ty) => {
    const transom = new THREE.Mesh(hTransomGeo, bronzeMullionMat);
    transom.position.set(2.4, ty, -2.1);
    residenceGroup.add(transom);
  });

  // C. Cantilevered Architectural Concrete Carport Canopy + Burmese Teak Slatted Soffit
  const canopySlabGeo = new THREE.BoxGeometry(7.6, 0.34, 4.8);
  const canopyFasciaGeo = new THREE.BoxGeometry(7.66, 0.38, 0.06);
  const teakSlatGeo = new THREE.BoxGeometry(7.2, 0.035, 0.11);
  const soffitLedGeo = new THREE.BoxGeometry(1.65, 0.02, 0.065);
  geometries.push(canopySlabGeo, canopyFasciaGeo, teakSlatGeo, soffitLedGeo);

  const canopySlab = new THREE.Mesh(canopySlabGeo, archConcreteMat);
  canopySlab.position.set(2.2, 3.52, -1.35);
  canopySlab.castShadow = true;
  canopySlab.receiveShadow = true;
  residenceGroup.add(canopySlab);

  // Dark bronze drip-edge fascia trim on cantilevered slab
  const canopyFascia = new THREE.Mesh(canopyFasciaGeo, bronzeMullionMat);
  canopyFascia.position.set(2.2, 3.52, 1.06);
  residenceGroup.add(canopyFascia);

  // 22 Burmese Teak Timber Slats lining the underside of the carport soffit (y = 3.33)
  for (let i = 0; i < 22; i++) {
    const slat = new THREE.Mesh(teakSlatGeo, teakWoodMat);
    slat.position.set(2.2, 3.33, -3.45 + i * 0.2);
    residenceGroup.add(slat);
  }

  // 3 Recessed Warm 3000K Architectural Linear Light Bars in the Carport Soffit
  [-0.2, 1.85, 3.9].forEach((lx) => {
    const ledStrip = new THREE.Mesh(soffitLedGeo, warmCoveLightMat);
    ledStrip.position.set(lx, 3.32, -0.55);
    residenceGroup.add(ledStrip);
  });

  // D. Second-Floor Architectural Residence Volume, Balcony Glass & Vertical Teak Louver Screen
  const upperVolumeGeo = new THREE.BoxGeometry(7.0, 2.7, 3.4);
  const upperRoofOverhangGeo = new THREE.BoxGeometry(7.5, 0.24, 4.1);
  const verticalLouverGeo = new THREE.BoxGeometry(0.045, 2.55, 0.16);
  const balconyGlassGeo = new THREE.BoxGeometry(4.4, 0.95, 0.03);
  geometries.push(upperVolumeGeo, upperRoofOverhangGeo, verticalLouverGeo, balconyGlassGeo);

  const upperVolume = new THREE.Mesh(upperVolumeGeo, archConcreteMat);
  upperVolume.position.set(2.4, 5.04, -3.15);
  upperVolume.castShadow = true;
  upperVolume.receiveShadow = true;
  residenceGroup.add(upperVolume);

  const upperRoof = new THREE.Mesh(upperRoofOverhangGeo, darkConcreteMat);
  upperRoof.position.set(2.4, 6.48, -2.95);
  upperRoof.castShadow = true;
  residenceGroup.add(upperRoof);

  // 20 Vertical Teak Privacy Louver Blades on Upper Facade
  for (let i = 0; i < 20; i++) {
    const blade = new THREE.Mesh(verticalLouverGeo, teakWoodMat);
    blade.position.set(-0.75 + i * 0.15, 5.02, -1.38);
    blade.rotation.y = 0.28;
    blade.castShadow = true;
    residenceGroup.add(blade);
  }

  // Frameless Glass Terrace Balustrade on Upper Cantilever
  const balconyGlass = new THREE.Mesh(balconyGlassGeo, archGlassMat);
  balconyGlass.position.set(3.2, 4.16, 0.85);
  residenceGroup.add(balconyGlass);

  // E. Perimeter Architectural Compound Wall & Bollard Lights
  const compoundWallGeo = new THREE.BoxGeometry(16.0, 1.75, 0.28);
  const bollardBodyGeo = new THREE.CylinderGeometry(0.055, 0.055, 0.68, 16);
  const bollardLensGeo = new THREE.CylinderGeometry(0.052, 0.052, 0.08, 16);
  geometries.push(compoundWallGeo, bollardBodyGeo, bollardLensGeo);

  const backCompoundWall = new THREE.Mesh(compoundWallGeo, darkConcreteMat);
  backCompoundWall.position.set(-8.5, 0.875, -4.45);
  backCompoundWall.castShadow = true;
  backCompoundWall.receiveShadow = true;
  residenceGroup.add(backCompoundWall);

  // Architectural Driveway Bollard Lights
  const bollardCoords: [number, number][] = [
    [-1.45, -1.85],
    [3.85, 0.95],
    [3.85, -1.15],
  ];
  bollardCoords.forEach(([bx, bz]) => {
    const bBody = new THREE.Mesh(bollardBodyGeo, bronzeMullionMat);
    bBody.position.set(bx, 0.34, bz);
    bBody.castShadow = true;
    residenceGroup.add(bBody);

    const bLens = new THREE.Mesh(bollardLensGeo, warmCoveLightMat);
    bLens.position.set(bx, 0.64, bz);
    residenceGroup.add(bLens);
  });

  // ============================================================================
  // 3. ARCHITECTURAL PLANTER BEDS & REAL 3D BOTANICAL FOLIAGE (GLTF)
  // ============================================================================
  const planterWallGeo = new THREE.BoxGeometry(3.2, 0.42, 0.95);
  const planterSoilGeo = new THREE.BoxGeometry(3.04, 0.36, 0.79);
  const rearLeftPlanterGeo = new THREE.BoxGeometry(2.6, 0.42, 0.95);
  const rearLeftSoilGeo = new THREE.BoxGeometry(2.44, 0.36, 0.79);
  geometries.push(planterWallGeo, planterSoilGeo, rearLeftPlanterGeo, rearLeftSoilGeo);

  const soilMat = new THREE.MeshStandardMaterial({
    color: 0x1b1612,
    roughness: 0.95,
    metalness: 0.0,
  });
  materials.push(soilMat);

  // Planter 1: Along residence glass facade right
  const planterRight = new THREE.Mesh(planterWallGeo, darkConcreteMat);
  planterRight.position.set(4.35, 0.21, -1.42);
  planterRight.castShadow = true;
  planterRight.receiveShadow = true;
  residenceGroup.add(planterRight);

  const soilRight = new THREE.Mesh(planterSoilGeo, soilMat);
  soilRight.position.set(4.35, 0.22, -1.42);
  residenceGroup.add(soilRight);

  // Load real 3D Botanical Foliage asset (/models/DiffuseTransmissionPlant.glb — CC0 / CC BY 4.0)
  const botanicalGroup = new THREE.Group();
  botanicalGroup.name = 'BotanicalFoliage';
  rootGroup.add(botanicalGroup);

  const gltfLoader = new GLTFLoader();
  gltfLoader.load(
    '/models/DiffuseTransmissionPlant.glb',
    (gltf) => {
      if (disposed) return;
      let potMesh: THREE.Mesh | null = null;
      let leavesMesh: THREE.Mesh | null = null;
      let dirtMesh: THREE.Mesh | null = null;

      gltf.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          if (m.name === 'pot') potMesh = m;
          else if (m.name === 'leaves') leavesMesh = m;
          else if (m.name === 'dirt') dirtMesh = m;
        }
      });

      if (leavesMesh) {
        const srcLeaves = leavesMesh as THREE.Mesh;
        srcLeaves.castShadow = true;
        srcLeaves.receiveShadow = true;
        if (srcLeaves.material) {
          const lMat = srcLeaves.material as THREE.MeshStandardMaterial;
          lMat.roughness = 0.46;
          lMat.metalness = 0.04;
          lMat.side = THREE.DoubleSide;
          materials.push(lMat);
        }

        // Place full ceramic potted plants beside the residence shear wall & terrace
        if (potMesh && dirtMesh) {
          const pottedUnit = new THREE.Group();
          const pClone = (potMesh as THREE.Mesh).clone();
          const dClone = (dirtMesh as THREE.Mesh).clone();
          const lClone = srcLeaves.clone();
          pClone.castShadow = true;
          pClone.receiveShadow = true;
          pottedUnit.add(pClone, dClone, lClone);

          const potPlacements: { pos: [number, number, number]; scale: number; rotY: number }[] = [
            { pos: [2.85, 0.18, -1.65], scale: 1.45, rotY: 1.8 },
            { pos: [3.45, 0.39, -1.42], scale: 1.55, rotY: 2.9 },
          ];
          potPlacements.forEach(({ pos, scale, rotY }) => {
            const inst = pottedUnit.clone(true);
            inst.position.set(...pos);
            inst.scale.setScalar(scale);
            inst.rotation.y = rotY;
            botanicalGroup.add(inst);
          });
        }

        // Populate architectural planter beds on the right & upper terrace with layered organic botanical clusters
        const bushPlacements: { pos: [number, number, number]; scale: [number, number, number]; rotY: number }[] = [
          { pos: [3.85, 0.02, -1.45], scale: [1.9, 1.75, 1.9], rotY: 0.2 },
          { pos: [4.45, 0.05, -1.38], scale: [2.2, 2.1, 2.2], rotY: 1.4 },
          { pos: [5.05, 0.02, -1.46], scale: [1.85, 1.7, 1.85], rotY: 2.5 },
          // Upper balcony planter greenery
          { pos: [1.8, 3.65, 0.55], scale: [1.55, 1.35, 1.55], rotY: 0.9 },
          { pos: [3.1, 3.65, 0.55], scale: [1.65, 1.45, 1.65], rotY: 2.3 },
          { pos: [4.3, 3.65, 0.55], scale: [1.5, 1.35, 1.5], rotY: 3.8 },
        ];

        bushPlacements.forEach(({ pos, scale, rotY }) => {
          const foliageCluster = srcLeaves.clone();
          foliageCluster.position.set(...pos);
          foliageCluster.scale.set(...scale);
          foliageCluster.rotation.y = rotY;
          botanicalGroup.add(foliageCluster);
        });
      }
    },
    undefined,
    () => {
      // Non-fatal if plant GLB fails to load
    }
  );

  // ============================================================================
  // 4. HERO ELECTRIC VEHICLE ASSET (/models/CarConcept.glb — Khronos CC BY 4.0)
  // ============================================================================
  const evGroup = new THREE.Group();
  evGroup.name = 'HeroElectricVehicle';
  evGroup.position.set(...HERO_VEHICLE_CONFIG.position);
  evGroup.rotation.y = HERO_VEHICLE_CONFIG.rotationY;
  rootGroup.add(evGroup);

  // Multi-Layered Automotive Underbody & Tire Contact Shadow Plane (y = 0.014)
  const carShadowTex = createAutomotiveContactShadowTexture();
  textures.push(carShadowTex);
  const carShadowGeo = new THREE.PlaneGeometry(3.0, 4.7);
  geometries.push(carShadowGeo);
  const carShadowMat = new THREE.MeshBasicMaterial({
    map: carShadowTex,
    transparent: true,
    depthWrite: false,
    opacity: 0.88,
  });
  materials.push(carShadowMat);
  const carShadowPlane = new THREE.Mesh(carShadowGeo, carShadowMat);
  carShadowPlane.rotation.x = -Math.PI / 2;
  carShadowPlane.position.set(0, 0.014, 0.16);
  evGroup.add(carShadowPlane);

  // Custom Indian EV Green HSRP Plate Texture
  const evPlateTex = createIndianEvLicensePlateTexture(maxAnisotropy);
  textures.push(evPlateTex);
  const evPlateMat = new THREE.MeshStandardMaterial({
    map: evPlateTex,
    roughness: 0.32,
    metalness: 0.18,
  });
  materials.push(evPlateMat);

  // Load the 97-mesh Khronos CarConcept GLB
  gltfLoader.load(
    '/models/CarConcept.glb',
    (gltf) => {
      if (disposed) return;
      const carModel = gltf.scene;
      carModel.scale.setScalar(HERO_VEHICLE_CONFIG.scale);
      carModel.position.y = HERO_VEHICLE_CONFIG.groundOffsetY * HERO_VEHICLE_CONFIG.scale;

      carModel.traverse((child) => {
        // Hide any steering emblem mesh so there are zero third-party badges
        if (child.name === 'InteriorSteeringEmblem') {
          child.visible = false;
          return;
        }

        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          clickableMeshes.push(mesh);

          const mat = mesh.material as THREE.MeshPhysicalMaterial;
          if (!mat) return;

          const matName = mat.name || '';

          if (matName.startsWith('Paint 1')) {
            // Mirror-smooth Liquid Titanium-Silver Automotive Clearcoat Paint
            // Remove the coarse sample normalMap so body panels have studio-grade specular reflections
            mat.normalMap = null;
            mat.color.setHex(0xb8c4be);
            mat.metalness = 0.85;
            mat.roughness = 0.15;
            if ('clearcoat' in mat) {
              mat.clearcoat = 1.0;
              mat.clearcoatRoughness = 0.03;
            }
            mat.envMapIntensity = 1.75;
            mat.needsUpdate = true;
          } else if (matName.startsWith('Paint 2') || matName.startsWith('Panel')) {
            // Satin Dark Anthracite Aero Trim & Rocker Panels
            mat.normalMap = null;
            mat.color.setHex(0x1b211f);
            mat.metalness = 0.7;
            mat.roughness = 0.24;
            if ('clearcoat' in mat) {
              mat.clearcoat = 0.75;
              mat.clearcoatRoughness = 0.1;
            }
            mat.envMapIntensity = 1.4;
            mat.needsUpdate = true;
          } else if (matName.startsWith('Interior')) {
            // Replace bright red sample racing seats with luxury dark espresso / saddle leather
            mat.color.setHex(matName.includes('3') ? 0x261f1a : 0x161a18);
            mat.roughness = 0.58;
            mat.metalness = 0.05;
            mat.needsUpdate = true;
          } else if (matName === 'Glass') {
            // Acoustic Tinted Automotive Laminated Glass
            if ('transmission' in mat) {
              mat.transmission = 0;
            }
            mat.color.setHex(0x0d1612);
            mat.metalness = 0.15;
            mat.roughness = 0.04;
            if ('clearcoat' in mat) {
              mat.clearcoat = 1.0;
              mat.clearcoatRoughness = 0.02;
            }
            mat.transparent = true;
            mat.opacity = 0.84;
            mat.envMapIntensity = 2.2;
            mat.needsUpdate = true;
          } else if (matName === 'Rim2') {
            // Forged Machined Brushed Aluminum Wheel Spokes
            mat.emissiveMap = null;
            mat.emissive.setHex(0x000000);
            mat.color.setHex(0xd8e0dd);
            mat.metalness = 0.92;
            mat.roughness = 0.18;
            mat.envMapIntensity = 1.7;
            mat.needsUpdate = true;
          } else if (matName === 'Rim1') {
            // Dark Gunmetal Inner Wheel Barrel
            mat.emissiveMap = null;
            mat.emissive.setHex(0x000000);
            mat.color.setHex(0x222826);
            mat.metalness = 0.85;
            mat.roughness = 0.3;
            mat.needsUpdate = true;
          } else if (matName === 'Brake') {
            // Performance Anodized Warm-Lime Calipers
            mat.color.setHex(0xc4df58);
            mat.metalness = 0.65;
            mat.roughness = 0.28;
            mat.needsUpdate = true;
          } else if (matName === 'Disc') {
            // Ventilated Steel Brake Rotors
            mat.color.setHex(0x9da6a2);
            mat.metalness = 0.9;
            mat.roughness = 0.24;
            mat.needsUpdate = true;
          } else if (matName === 'Tireside' || matName === 'Tiretread') {
            // Satin Vulcanized Rubber Tires (preserving molded sidewall & tread normal maps)
            mat.color.setHex(0x171a19);
            mat.roughness = 0.68;
            mat.metalness = 0.06;
            mat.needsUpdate = true;
          } else if (matName === 'License' || mesh.name === 'License Plate') {
            // Replace sample Khronos plate with Indian EV Green HSRP Plate
            mesh.material = evPlateMat;
          } else if (matName === 'Headlight') {
            mat.emissive.setHex(0xf2f7ff);
            mat.emissiveIntensity = 2.4;
            mat.needsUpdate = true;
          } else if (matName === 'Brakelight') {
            mat.emissive.setHex(0xd92626);
            mat.emissiveIntensity = 1.8;
            mat.needsUpdate = true;
          }
        }
      });

      evGroup.add(carModel);
      onVehicleLoaded?.();
    },
    undefined,
    () => {
      onVehicleLoaded?.();
    }
  );

  // ============================================================================
  // 5. ARCHITECTURAL NEIGHBOURHOOD HOST NODES (FOR SCROLL CHAPTER 2 "CONNECT")
  // ============================================================================
  const networkGroup = new THREE.Group();
  networkGroup.name = 'NeighbourhoodHostNetwork';
  rootGroup.add(networkGroup);

  const neighbourCoords: { x: number; z: number; h: number; label: string }[] = [
    { x: -10.5, z: -5.2, h: 3.2, label: 'Koramangala Stilt Bay' },
    { x: -12.0, z: 7.2, h: 3.6, label: 'Jayanagar Carport' },
    { x: 10.2, z: -6.2, h: 3.4, label: 'Koregaon Park Courtyard' },
    { x: 11.8, z: 6.4, h: 4.1, label: 'Bandra Society Visitor Bay' },
    { x: 1.6, z: 11.5, h: 3.1, label: 'Vasant Vihar Verandah' },
  ];

  const pavilionWallGeo = new THREE.BoxGeometry(3.8, 1, 2.8);
  const pavilionRoofGeo = new THREE.BoxGeometry(4.3, 0.22, 3.4);
  const bollardPinGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.4, 16);
  const bollardCapGeo = new THREE.SphereGeometry(0.14, 16, 16);
  geometries.push(pavilionWallGeo, pavilionRoofGeo, bollardPinGeo, bollardCapGeo);

  const beaconMeshes: THREE.Mesh[] = [];
  const networkCurves: THREE.CatmullRomCurve3[] = [];
  const networkPulses: THREE.Mesh[] = [];

  const lineMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 0.95,
    transparent: true,
    opacity: 0.08,
  });
  const pulseDotMat = new THREE.MeshStandardMaterial({
    color: 0xd8f36a,
    emissive: 0xd8f36a,
    emissiveIntensity: 1.4,
  });
  materials.push(lineMat, pulseDotMat);

  neighbourCoords.forEach((n, idx) => {
    // Distant architectural concrete & timber courtyard silhouette
    const nPavilion = new THREE.Group();
    nPavilion.position.set(n.x, 0, n.z);
    networkGroup.add(nPavilion);

    const wall = new THREE.Mesh(pavilionWallGeo, darkConcreteMat);
    wall.scale.y = n.h;
    wall.position.y = n.h * 0.5;
    wall.castShadow = true;
    wall.receiveShadow = true;
    nPavilion.add(wall);

    const roof = new THREE.Mesh(pavilionRoofGeo, archConcreteMat);
    roof.position.y = n.h + 0.11;
    nPavilion.add(roof);

    // Host charger bollard marker next to neighbour driveway
    const bx = n.x + (n.x < 0 ? 2.1 : -2.1);
    const bz = n.z + 1.1;

    const pole = new THREE.Mesh(bollardPinGeo, bronzeMullionMat);
    pole.position.set(bx, 0.7, bz);
    networkGroup.add(pole);

    const bMat = new THREE.MeshStandardMaterial({
      color: idx === 0 ? 0xd8f36a : 0xe8e4d8,
      emissive: 0xd8f36a,
      emissiveIntensity: idx === 0 ? 1.5 : 0.7,
      roughness: 0.25,
    });
    materials.push(bMat);

    const head = new THREE.Mesh(bollardCapGeo, bMat);
    head.position.set(bx, 1.48, bz);
    networkGroup.add(head);
    beaconMeshes.push(head);

    // Subtle ground-skimming connection arc active only during Chapter 2 ("Connect")
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.02, 0.18, 0.62),
      new THREE.Vector3((2.02 + bx) * 0.5, 0.75 + idx * 0.12, (0.62 + bz) * 0.5),
      new THREE.Vector3(bx, 0.22, bz),
    ]);
    networkCurves.push(curve);

    const arcGeo = new THREE.TubeGeometry(curve, 32, 0.022, 8, false);
    geometries.push(arcGeo);
    const arcMesh = new THREE.Mesh(arcGeo, lineMat);
    networkGroup.add(arcMesh);

    const pulseMesh = new THREE.Mesh(bollardCapGeo, pulseDotMat);
    pulseMesh.scale.setScalar(0.42);
    networkGroup.add(pulseMesh);
    networkPulses.push(pulseMesh);
  });

  const _tempVec = new THREE.Vector3();

  const updateAnimation = (elapsedTime: number, networkIntensity: number) => {
    // Keep network lines completely hidden in the Hero ('discover') view so the automotive courtyard is pure and uncluttered
    const activeOpacity = THREE.MathUtils.clamp((networkIntensity - 0.42) * 1.35, 0, 0.78);
    lineMat.opacity = activeOpacity;
    lineMat.visible = activeOpacity > 0.02;

    for (let i = 0; i < networkCurves.length; i++) {
      networkPulses[i].visible = activeOpacity > 0.05;
      if (networkPulses[i].visible) {
        const t = (elapsedTime * 0.26 + i * 0.2) % 1;
        networkCurves[i].getPointAt(t, _tempVec);
        networkPulses[i].position.copy(_tempVec);
      }
    }
  };

  const highlightNodeIndex = (index: number) => {
    beaconMeshes.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshStandardMaterial;
      const active = i === index % beaconMeshes.length;
      mat.emissiveIntensity = active ? 2.0 : 0.65;
      mesh.scale.setScalar(active ? 1.28 : 1.0);
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
      disposed = true;
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
