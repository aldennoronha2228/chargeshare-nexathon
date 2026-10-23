import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createContactShadowTexture, ensureSecondUv } from './SceneAssets';
import { CHARGE_PORT_LOCAL, HERO_VEHICLE } from './sceneLayout';

/**
 * Hero vehicle.
 *
 * Asset: `public/models/CarConcept.glb`
 *   Khronos Group glTF Sample Assets - "Car Concept".
 *   Licence: CC BY 4.0 International.
 *   Attribution: (c) 2024 Darmstadt Graphics Group GmbH, asset by Eric Chadwick.
 *   Processed with RapidPipeline 3D Processor.
 *
 * The published model ships a generic concept-car body with no manufacturer
 * branding beyond a plain interior steering emblem, so no third-party marque is
 * implied. Body proportions are authored to real-world metres: 4.36 m long,
 * 2.72 m wide (mirrors included), 1.31 m tall, 2.80 m wheelbase, tyres resting
 * on y = 0 in model space.
 */

export interface VehicleModelHandle {
  group: THREE.Group;
  chargePortAnchor: THREE.Object3D;
  clickableMeshes: THREE.Object3D[];
  dispose: () => void;
}

/** Paint masters inside CarConcept.glb that drive the visible bodywork. */
const PAINT_BODY = 'Paint 1 Carmine';
const PAINT_TRIM = 'Paint 2 Carmine';

/** ChargeShare deep-forest metallic with a clearcoat varnish layer. */
const BODY_COLOR = 0x1d4a34;
const TRIM_COLOR = 0x101c16;

function applyChargeSharePaint(material: THREE.Material) {
  const std = material as THREE.MeshPhysicalMaterial & THREE.MeshStandardMaterial;
  const name = material.name;

  if (name.includes(PAINT_BODY)) {
    std.color.setHex(BODY_COLOR);
    std.metalness = 0.88;
    std.roughness = 0.26;
    if ('clearcoat' in std) {
      std.clearcoat = 1.0;
      std.clearcoatRoughness = 0.05;
    }
    std.envMapIntensity = 1.25;
    std.needsUpdate = true;
  } else if (name.includes(PAINT_TRIM)) {
    std.color.setHex(TRIM_COLOR);
    std.metalness = 0.8;
    std.roughness = 0.34;
    if ('clearcoat' in std) {
      std.clearcoat = 0.85;
      std.clearcoatRoughness = 0.12;
    }
    std.envMapIntensity = 1.15;
    std.needsUpdate = true;
  } else if (std.envMapIntensity !== undefined) {
    std.envMapIntensity = std.name.includes('Glass') ? 1.1 : 0.9;
  }
}

export async function loadVehicleModel(
  url: string,
  maxAnisotropy: number
): Promise<VehicleModelHandle> {
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene;

  const group = new THREE.Group();
  group.name = 'ChargeShareHeroVehicle';
  group.position.copy(HERO_VEHICLE.position);
  group.rotation.y = HERO_VEHICLE.yaw;

  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();

  root.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    ensureSecondUv(mesh.geometry);
    geometries.add(mesh.geometry);

    const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of list) {
      const std = material as THREE.MeshStandardMaterial;
      applyChargeSharePaint(std);
      for (const key of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap', 'emissiveMap'] as const) {
        const tex = (std as unknown as Record<string, THREE.Texture | null>)[key];
        if (tex) {
          tex.anisotropy = maxAnisotropy;
          textures.add(tex);
        }
      }
      materials.add(std);
    }
  });

  group.add(root);

  // Vehicle silhouette measured in world space, used for the click proxy and contact shadow.
  const bounds = new THREE.Box3().setFromObject(root);
  const size = bounds.getSize(new THREE.Vector3());
  const centre = bounds.getCenter(new THREE.Vector3());

  // Invisible pick volume: one cheap proxy instead of raycasting 213k triangles.
  const proxyGeometry = new THREE.BoxGeometry(size.x * 0.98, size.y, size.z * 0.98);
  const proxyMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const proxy = new THREE.Mesh(proxyGeometry, proxyMaterial);
  proxy.position.set(centre.x, size.y / 2, centre.z);
  proxy.name = 'VehiclePickProxy';
  group.add(proxy);

  // Soft contact patch so the tyres stay visually planted on the paving.
  const shadowTexture = createContactShadowTexture();
  const shadowGeometry = new THREE.PlaneGeometry(size.z * 1.06, size.x * 1.12);
  const shadowMaterial = new THREE.MeshBasicMaterial({
    map: shadowTexture,
    transparent: true,
    depthWrite: false,
    opacity: 0.42,
    color: 0x0a1410,
  });
  const shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
  shadow.rotation.x = -Math.PI / 2;
  shadow.rotation.z = Math.PI / 2;
  shadow.position.set(centre.x, 0.018, centre.z);
  shadow.renderOrder = 1;
  group.add(shadow);

  // Charge port anchor: an empty node the charging cable can be routed to.
  const chargePortAnchor = new THREE.Object3D();
  chargePortAnchor.name = 'ChargePortAnchor';
  chargePortAnchor.position.copy(CHARGE_PORT_LOCAL);
  group.add(chargePortAnchor);

  return {
    group,
    chargePortAnchor,
    clickableMeshes: [proxy],
    dispose: () => {
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
      proxyGeometry.dispose();
      proxyMaterial.dispose();
      shadowGeometry.dispose();
      shadowMaterial.dispose();
      shadowTexture.dispose();
    },
  };
}
