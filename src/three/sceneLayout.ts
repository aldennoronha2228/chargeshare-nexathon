import * as THREE from 'three';

/**
 * Single source of truth for the hero stage layout.
 *
 * World axes: +Y is up, the camera looks down -Z, so the residence sits at -Z
 * (background) and the visitor stands on the paving around +Z (foreground).
 * The `CarConcept` vehicle is authored with its nose along local +Z and its
 * left flank along local +X, so a negative yaw presents the front-left
 * three-quarter view to the camera.
 */

/** Local-space anchor of the front-left fender charge port (car front = +Z, car left = +X). */
export const CHARGE_PORT_LOCAL = new THREE.Vector3(1.09, 0.74, 1.0);

export const HERO_VEHICLE = {
  position: new THREE.Vector3(-0.55, 0, 0.2),
  yaw: -0.52,
};

export const HERO_CHARGE_POST = {
  position: new THREE.Vector3(2.05, 0, 0.55),
  /** Overall height of the finished charge point, used to keep it clear of the vehicle silhouette. */
  height: 1.66,
};

/** Paving apron the vehicle, charge point and residence all sit on. */
export const PAVING = {
  minX: -5.4,
  maxX: 8.8,
  minZ: -6.4,
  maxZ: 12.0,
};

/** Front plane of the hero residence (its facade faces +Z). */
export const RESIDENCE_FRONT_Z = -6.4;

const _up = new THREE.Vector3(0, 1, 0);
const _portWorld = new THREE.Vector3();

/** World-space position of the vehicle's charge port, derived from the hero layout. */
export function getChargePortWorldPosition(target: THREE.Vector3 = _portWorld): THREE.Vector3 {
  return target
    .copy(CHARGE_PORT_LOCAL)
    .applyAxisAngle(_up, HERO_VEHICLE.yaw)
    .add(HERO_VEHICLE.position);
}
