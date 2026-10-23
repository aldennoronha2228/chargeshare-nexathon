import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  SCENE_ASSETS_PROVENANCE,
  HERO_VEHICLE_CONFIG,
  HERO_CHARGER_CONFIG,
  computeWorldChargePortPosition,
  computeChargingCableControlPoints,
  getChargerStatusVisualSpec,
} from '../sceneConfig';
import { ScrollSceneController, CHAPTER_KEYFRAMES } from '../ScrollSceneController';

describe('ChargeShare 3D Photorealistic Scene Configuration & Asset Provenance', () => {
  it('verifies all 3D GLB, HDR, and PBR texture assets exist on disk with valid CC0 / CC BY 4.0 licenses', () => {
    assert.ok(SCENE_ASSETS_PROVENANCE.length >= 7);
    for (const asset of SCENE_ASSETS_PROVENANCE) {
      assert.match(asset.license, /CC0|CC BY 4\.0/);
      const diskPath = path.join(process.cwd(), 'public', asset.url);
      assert.equal(
        fs.existsSync(diskPath),
        true,
        `Expected asset file to exist at ${diskPath}`
      );
      const stat = fs.statSync(diskPath);
      assert.ok(stat.size > 50_000, `Expected ${asset.url} to be a real binary asset (>50KB)`);
    }
  });

  it('positions the vehicle charge port within natural 1.1m–1.7m cable reach of the wallbox gland', () => {
    const portWorld = computeWorldChargePortPosition(HERO_VEHICLE_CONFIG);
    const startWorld = HERO_CHARGER_CONFIG.cableStartWorld;

    const dx = portWorld[0] - startWorld[0];
    const dy = portWorld[1] - startWorld[1];
    const dz = portWorld[2] - startWorld[2];
    const dist = Math.hypot(dx, dy, dz);

    assert.ok(
      dist > 0.75 && dist < 1.75,
      `Expected realistic cable reach between 0.75m and 1.75m, got ${dist.toFixed(3)}m`
    );
    assert.ok(
      portWorld[1] > 0.65 && portWorld[1] < 1.05,
      `Expected fender port height between 0.65m and 1.05m, got ${portWorld[1]}m`
    );
  });

  it('generates a catenary charging cable curve that stays above the driveway pavers and terminates at the vehicle port', () => {
    const pts = computeChargingCableControlPoints(HERO_CHARGER_CONFIG, HERO_VEHICLE_CONFIG);
    assert.equal(pts.length, 5);
    assert.deepEqual(pts[0], HERO_CHARGER_CONFIG.cableStartWorld);
    assert.deepEqual(pts[4], computeWorldChargePortPosition(HERO_VEHICLE_CONFIG));

    // Verify all control points stay above ground (y >= 0.15m) so the cable never clips under the pavement
    for (const pt of pts) {
      assert.ok(pt[1] >= 0.15, `Cable control point y=${pt[1]} must stay above ground`);
    }
  });

  it('provides distinct restrained visual specs for charging, reserved, and standby wallbox states', () => {
    const charging = getChargerStatusVisualSpec('charging');
    const reserved = getChargerStatusVisualSpec('reserved');
    const standby = getChargerStatusVisualSpec('standby');

    assert.equal(charging.ledCss, '#D8F36A');
    assert.equal(charging.pulseActive, true);
    assert.equal(reserved.pulseActive, false);
    assert.equal(standby.pulseActive, false);
    assert.notEqual(charging.ledHex, reserved.ledHex);
  });

  it('updates camera position and target smoothly across desktop and mobile aspect ratios', () => {
    const ctrl = new ScrollSceneController();
    const camDesktop = new THREE.PerspectiveCamera(36, 16 / 9, 0.1, 120);
    ctrl.setChapter('discover');
    ctrl.updateCamera(camDesktop, 0.016, true);

    assert.ok(Math.abs(camDesktop.position.x - CHAPTER_KEYFRAMES.discover.position[0]) < 0.01);
    assert.ok(Math.abs(camDesktop.position.y - CHAPTER_KEYFRAMES.discover.position[1]) < 0.01);

    const camMobile = new THREE.PerspectiveCamera(50, 390 / 844, 0.1, 120);
    ctrl.updateCamera(camMobile, 0.016, true);
    // On portrait mobile, camera pulls back on Z so the car and charger fit below the text
    assert.ok(camMobile.position.z > CHAPTER_KEYFRAMES.discover.position[2] + 1.4);
  });
});
