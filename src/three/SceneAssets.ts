import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Shared asset helpers for the ChargeShare hero stage.
 *
 * All environment artwork shipped in `public/` is licensed for commercial use:
 *  - Poly Haven HDRI / PBR texture / model sets -> CC0 1.0 Universal (public domain).
 *  - Khronos `CarConcept.glb` -> CC BY 4.0 International (see VehicleModel.ts).
 */

/** Soft radial contact-shadow sprite used to ground large objects against the paving. */
export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(128, 128, 4, 128, 128, 126);
    grad.addColorStop(0, 'rgba(0,0,0,0.68)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.42)');
    grad.addColorStop(0.72, 'rgba(0,0,0,0.14)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export interface PbrSet {
  map: THREE.Texture;
  normalMap: THREE.Texture;
  roughnessMap: THREE.Texture;
  aoMap: THREE.Texture;
  dispose: () => void;
}

const textureLoader = new THREE.TextureLoader();

/**
 * Loads a Poly Haven 1k PBR set (`diff` / `nor` / `rough` / `ao` JPGs) and prepares it
 * for tiling. One HTTP request per map; the caller ``clones`` the set for other tile rates.
 */
export async function loadPbrSet(
  baseUrl: string,
  maxAnisotropy: number,
  repeat: THREE.Vector2
): Promise<PbrSet> {
  const load = async (file: string, srgb: boolean) => {
    const tex = await textureLoader.loadAsync(`${baseUrl}/${file}`);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = maxAnisotropy;
    tex.repeat.copy(repeat);
    tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    return tex;
  };

  const [map, normalMap, roughnessMap, aoMap] = await Promise.all([
    load('diff.jpg', true),
    load('nor.jpg', false),
    load('rough.jpg', false),
    load('ao.jpg', false),
  ]);

  return {
    map,
    normalMap,
    roughnessMap,
    aoMap,
    dispose: () => {
      map.dispose();
      normalMap.dispose();
      roughnessMap.dispose();
      aoMap.dispose();
    },
  };
}

/**
 * Shares the decoded image data of a set (three keys GPU uploads by ``Texture.source``)
 * while giving the clone its own tiling rate.
 */
export function retilePbrSet(set: PbrSet, repeat: THREE.Vector2): PbrSet {
  const clone = (tex: THREE.Texture) => {
    const next = tex.clone();
    next.repeat.copy(repeat);
    next.needsUpdate = true;
    return next;
  };
  return {
    map: clone(set.map),
    normalMap: clone(set.normalMap),
    roughnessMap: clone(set.roughnessMap),
    aoMap: clone(set.aoMap),
    dispose: () => {
      /* clones share the parent's GPU source - the parent set owns disposal */
    },
  };
}

/** Builds a physically based material from a PBR set. */
export function pbrMaterial(
  set: PbrSet,
  overrides: Partial<THREE.MeshStandardMaterialParameters> = {}
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    map: set.map,
    normalMap: set.normalMap,
    roughnessMap: set.roughnessMap,
    aoMap: set.aoMap,
    aoMapIntensity: 0.85,
    normalScale: new THREE.Vector2(0.85, 0.85),
    roughness: 1,
    metalness: 0,
    ...overrides,
  });
}

/** Duplicates a UV channel so ambient occlusion maps always have a second set to sample. */
export function ensureSecondUv(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
  const uv = geometry.getAttribute('uv');
  if (uv && !geometry.getAttribute('uv1')) {
    geometry.setAttribute('uv1', uv.clone());
  }
  return geometry;
}

export interface SceneryPrototype {
  /** Prefab scene graph; call ``clonePrototype`` for each placement. */
  object: THREE.Object3D;
  /** Native bounding-box height in metres (measured from the loaded model). */
  height: number;
  nativeMinY: number;
  name: string;
}

const gltfLoader = new GLTFLoader();

/**
 * Loads a Poly Haven plant GLTF, enables shadow casting/receiving and measures its footprint.
 * Materials and geometries are shared by every clone, so a single download serves the whole scene.
 */
export async function loadSceneryPrototype(url: string, name: string): Promise<SceneryPrototype> {
  const gltf = await gltfLoader.loadAsync(url);
  const object = gltf.scene;

  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      const std = material as THREE.MeshStandardMaterial;
      if (typeof std.envMapIntensity === 'number') std.envMapIntensity = 0.85;
    }
  });

  const box = new THREE.Box3().setFromObject(object);
  return {
    object,
    height: Math.max(box.max.y - box.min.y, 0.01),
    nativeMinY: box.min.y,
    name,
  };
}

/** Places a clone of a prototype, scaled to a target height and dropped onto the ground plane. */
export function placePrototype(
  proto: SceneryPrototype,
  targetHeight: number,
  x: number,
  z: number,
  yaw: number,
  target: THREE.Group,
  groundY = 0
): THREE.Object3D {
  const instance = proto.object.clone(true);
  const scale = targetHeight / proto.height;
  instance.scale.setScalar(scale);
  instance.position.set(x, groundY - proto.nativeMinY * scale, z);
  instance.rotation.y = yaw;
  target.add(instance);
  return instance;
}
