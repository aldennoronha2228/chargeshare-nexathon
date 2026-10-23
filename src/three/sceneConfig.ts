import type { ChargerVisualState } from './ChargerModel';

export interface AssetProvenance {
  id: string;
  name: string;
  url: string;
  source: string;
  license: string;
  attribution: string;
}

export const SCENE_ASSETS_PROVENANCE: AssetProvenance[] = [
  {
    id: 'vehicle-glb',
    name: 'Khronos CarConcept Electric Fastback',
    url: '/models/CarConcept.glb',
    source: 'Khronos Group glTF-Sample-Assets (Darmstadt Graphics Group GmbH)',
    license: 'CC BY 4.0 (Creative Commons Attribution 4.0 International)',
    attribution: 'Model and textures by Eric Chadwick / Darmstadt Graphics Group GmbH',
  },
  {
    id: 'botanical-glb',
    name: 'Architectural Courtyard Foliage (potted_plant_02)',
    url: '/models/DiffuseTransmissionPlant.glb',
    source: 'Polyhaven / Khronos Group glTF-Sample-Assets',
    license: 'CC0 1.0 Public Domain (Original by Rico Cilliers) / CC BY 4.0 (glTF by Eric Chadwick)',
    attribution: 'Rico Cilliers (Polyhaven) & Eric Chadwick (DGG)',
  },
  {
    id: 'hdri-env',
    name: 'Architectural Studio & Courtyard HDRI (ferndale_studio_04_1k)',
    url: '/textures/env_studio_1k.hdr',
    source: 'Polyhaven / Three.js Equirectangular Library',
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Polyhaven',
  },
  {
    id: 'pbr-pavers',
    name: 'Concrete Pavers 02 PBR Set (Diffuse, Normal, Roughness)',
    url: '/textures/pavers_diff.jpg',
    source: 'Polyhaven',
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Polyhaven',
  },
  {
    id: 'pbr-concrete',
    name: 'Architectural Concrete Wall 008 PBR Set (Diffuse, Normal, Roughness)',
    url: '/textures/concrete_diff.jpg',
    source: 'Polyhaven',
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Polyhaven',
  },
  {
    id: 'pbr-wood',
    name: 'Fine Grained Architectural Teak Wood PBR Set (Diffuse, Normal, Roughness)',
    url: '/textures/wood_diff.jpg',
    source: 'Polyhaven',
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Polyhaven',
  },
  {
    id: 'pbr-asphalt',
    name: 'Clean Asphalt Driveway & Street PBR Set (Diffuse, Normal, Roughness)',
    url: '/textures/asphalt_diff.jpg',
    source: 'Polyhaven',
    license: 'CC0 1.0 Universal (Public Domain)',
    attribution: 'Polyhaven',
  },
];

export interface VehiclePlacementConfig {
  /** World position of the vehicle root group on the driveway */
  position: [number, number, number];
  /** World Y rotation in radians (three-quarter front-left camera angle) */
  rotationY: number;
  /** Uniform scale multiplier for accurate real-world proportions */
  scale: number;
  /** Vertical offset in model space so lowest tire tread rests exactly at y = 0.0 */
  groundOffsetY: number;
  /** Local coordinates on the vehicle (front-left fender) where the Type-2 charge port sits */
  localChargePortPosition: [number, number, number];
}

export const HERO_VEHICLE_CONFIG: VehiclePlacementConfig = {
  position: [0.22, 0, -0.15],
  rotationY: -0.58,
  scale: 0.96,
  // In CarConcept.glb, WheelFrontRRim minY is -0.046; shifting by +0.046 grounds all 4 tires at y = 0
  groundOffsetY: 0.046,
  // Front-left fender behind the front-left wheel arch (+X is left side of CarConcept, +Z is front)
  localChargePortPosition: [0.98, 0.72, 0.92],
};

export interface ChargerPlacementConfig {
  /** Architectural concrete pier center position */
  pierPosition: [number, number, number];
  /** Wallbox enclosure center position */
  wallboxPosition: [number, number, number];
  /** Cable exit gland world position at bottom of wallbox */
  cableStartWorld: [number, number, number];
}

export const HERO_CHARGER_CONFIG: ChargerPlacementConfig = {
  pierPosition: [2.05, 1.55, 0.35],
  wallboxPosition: [1.92, 1.44, 0.62],
  cableStartWorld: [1.86, 1.08, 0.68],
};

/**
 * Computes the world-space position of the vehicle's charging port from HERO_VEHICLE_CONFIG
 * so the charging cable connects seamlessly without floating or clipping.
 */
export function computeWorldChargePortPosition(
  config: VehiclePlacementConfig = HERO_VEHICLE_CONFIG
): [number, number, number] {
  const [px, py, pz] = config.position;
  const [lx, ly, lz] = config.localChargePortPosition;
  const s = config.scale;
  const cosY = Math.cos(config.rotationY);
  const sinY = Math.sin(config.rotationY);

  const sx = lx * s;
  const sy = (ly + config.groundOffsetY) * s;
  const sz = lz * s;

  // Standard Three.js Y-axis rotation: x' = x*cos(theta) + z*sin(theta), z' = -x*sin(theta) + z*cos(theta)
  const wx = px + sx * cosY + sz * sinY;
  const wy = py + sy;
  const wz = pz - sx * sinY + sz * cosY;

  return [Number(wx.toFixed(4)), Number(wy.toFixed(4)), Number(wz.toFixed(4))];
}

/**
 * Generates the 5 control points for a natural catenary charging cable curve from the
 * wallbox gland to the vehicle's fender charge port, staying above the ground plane (y >= 0.18)
 * and outside the vehicle body hull.
 */
export function computeChargingCableControlPoints(
  chargerConfig: ChargerPlacementConfig = HERO_CHARGER_CONFIG,
  vehicleConfig: VehiclePlacementConfig = HERO_VEHICLE_CONFIG
): [number, number, number][] {
  const start = chargerConfig.cableStartWorld;
  const end = computeWorldChargePortPosition(vehicleConfig);

  const midX = (start[0] + end[0]) * 0.5;
  const midZ = (start[2] + end[2]) * 0.5;

  return [
    start,
    [start[0] - 0.04, 0.56, start[2] + 0.12],
    [midX + 0.08, 0.22, midZ + 0.22],
    [end[0] + 0.22, end[1] - 0.1, end[2] + 0.14],
    end,
  ];
}

export interface ChargerStatusVisualSpec {
  label: string;
  powerKw: string;
  tariffText: string;
  ledHex: number;
  ledCss: string;
  emissiveIntensity: number;
  pulseActive: boolean;
}

export function getChargerStatusVisualSpec(state: ChargerVisualState): ChargerStatusVisualSpec {
  switch (state) {
    case 'charging':
      return {
        label: 'CHARGING ACTIVE',
        powerKw: '7.4 kW AC',
        tariffText: '₹14.00 / kWh',
        ledHex: 0xd8f36a,
        ledCss: '#D8F36A',
        emissiveIntensity: 1.35,
        pulseActive: true,
      };
    case 'reserved':
      return {
        label: 'RESERVED · 18:30',
        powerKw: '7.4 kW AC',
        tariffText: '₹14.00 / kWh',
        ledHex: 0xe5b54f,
        ledCss: '#E5B54F',
        emissiveIntensity: 1.1,
        pulseActive: false,
      };
    case 'standby':
    default:
      return {
        label: 'AVAILABLE · READY',
        powerKw: '7.4 kW AC',
        tariffText: '₹14.00 / kWh',
        ledHex: 0x9ec4b0,
        ledCss: '#9EC4B0',
        emissiveIntensity: 0.75,
        pulseActive: false,
      };
  }
}
