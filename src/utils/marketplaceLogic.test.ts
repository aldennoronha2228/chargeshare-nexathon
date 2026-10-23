import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHostEarnings,
  filterChargers,
  validateReservationForm,
  validateHostListingForm,
  getChapterFromScrollRatio,
} from './marketplaceLogic';
import { DEMO_CHARGERS } from '../data/demoChargers';

test('getChapterFromScrollRatio maps document scroll progress to all 7 story chapters', () => {
  assert.equal(getChapterFromScrollRatio(0), 'discover');
  assert.equal(getChapterFromScrollRatio(0.18), 'connect');
  assert.equal(getChapterFromScrollRatio(0.35), 'find');
  assert.equal(getChapterFromScrollRatio(0.55), 'book');
  assert.equal(getChapterFromScrollRatio(0.70), 'share');
  assert.equal(getChapterFromScrollRatio(0.85), 'safety');
  assert.equal(getChapterFromScrollRatio(0.96), 'conversion');
});

test('calculateHostEarnings computes weekly, monthly, and net host proceeds accurately', () => {
  // 6 sessions/week * 25 kWh * ₹15/kWh = ₹2,250 weekly gross
  // Monthly gross = 2250 * 52 / 12 = ₹9,750
  // 12% commission = ₹1,170 -> Monthly host proceeds = ₹8,580
  const res = calculateHostEarnings({
    sessionsPerWeek: 6,
    kwhPerSession: 25,
    pricePerKwhInr: 15,
    commissionPercent: 12,
  });

  assert.equal(res.weeklyKwhDelivered, 150);
  assert.equal(res.weeklyGrossInr, 2250);
  assert.equal(res.monthlyGrossInr, 9750);
  assert.equal(res.monthlyHostProceedsInr, 8580);
  assert.equal(res.monthlyCommissionInr, 1170);
});

test('calculateHostEarnings clamps negative or extreme values safely', () => {
  const zeroRes = calculateHostEarnings({
    sessionsPerWeek: -4,
    kwhPerSession: 20,
    pricePerKwhInr: 14,
    commissionPercent: 10,
  });
  assert.equal(zeroRes.weeklyGrossInr, 0);
  assert.equal(zeroRes.monthlyHostProceedsInr, 0);
});

test('filterChargers filters by city, connector, price, power, and search query', () => {
  const blrChargers = filterChargers(DEMO_CHARGERS, {
    searchQuery: '',
    city: 'Bengaluru',
    connector: 'All Connectors',
    maxPricePerKwh: 25,
    minPowerKw: 0,
    maxDistanceKm: 10,
    availableNowOnly: false,
  });
  assert.equal(blrChargers.length, 3);

  const indiranagarOnly = filterChargers(DEMO_CHARGERS, {
    searchQuery: 'Indiranagar',
    city: 'All Cities',
    connector: 'Type 2 AC',
    maxPricePerKwh: 15,
    minPowerKw: 7,
    maxDistanceKm: 5,
    availableNowOnly: true,
  });
  assert.equal(indiranagarOnly.length, 1);
  assert.equal(indiranagarOnly[0].id, 'cs-blr-101');
});

test('validateReservationForm enforces Indian mobile number and required fields', () => {
  const invalid = validateReservationForm({
    driverName: 'A',
    vehicleModel: '',
    contactPhone: '12345',
    slotId: '',
    estimatedKwh: 0,
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.driverName);
  assert.ok(invalid.errors.vehicleModel);
  assert.ok(invalid.errors.contactPhone);
  assert.ok(invalid.errors.slotId);

  const valid = validateReservationForm({
    driverName: 'Riya Sen',
    vehicleModel: 'Tata Nexon EV',
    contactPhone: '9845012345',
    slotId: 's1',
    estimatedKwh: 24,
  });
  assert.equal(valid.valid, true);
  assert.equal(Object.keys(valid.errors).length, 0);
});

test('validateHostListingForm validates host submission inputs', () => {
  const validHost = validateHostListingForm({
    hostName: 'Kiran Rao',
    phone: '+91 98201 54321',
    city: 'Pune',
    locality: 'Baner Balewadi High Street',
    connector: 'Type 2 AC',
    powerKw: 7.4,
    pricePerKwh: 15,
    parkingType: 'Covered Stilt Bay',
  });
  assert.equal(validHost.valid, true);
});
