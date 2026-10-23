import type { ChargerListing, ConnectorType, IndianCity } from '../data/demoChargers';

export interface EarningsInput {
  sessionsPerWeek: number;
  kwhPerSession: number;
  pricePerKwhInr: number;
  commissionPercent: number;
}

export interface EarningsBreakdown {
  weeklyKwhDelivered: number;
  weeklyGrossInr: number;
  monthlyGrossInr: number;
  monthlyCommissionInr: number;
  monthlyHostProceedsInr: number;
  annualHostProceedsInr: number;
}

/**
 * Pure calculation following the exact formula from specification:
 * Weekly gross booking value = sessions per week * kWh per session * price per kWh
 * Monthly gross booking value = weekly gross booking value * 52 / 12
 * Illustrative monthly host proceeds = monthly gross booking value * (1 - commission rate)
 */
export function calculateHostEarnings(input: EarningsInput): EarningsBreakdown {
  const sessions = Math.max(0, Number.isFinite(input.sessionsPerWeek) ? input.sessionsPerWeek : 0);
  const kwh = Math.max(0, Number.isFinite(input.kwhPerSession) ? input.kwhPerSession : 0);
  const price = Math.max(0, Number.isFinite(input.pricePerKwhInr) ? input.pricePerKwhInr : 0);
  const commRate = Math.min(100, Math.max(0, Number.isFinite(input.commissionPercent) ? input.commissionPercent : 0)) / 100;

  const weeklyKwhDelivered = sessions * kwh;
  const weeklyGrossInr = weeklyKwhDelivered * price;
  const monthlyGrossInr = (weeklyGrossInr * 52) / 12;
  const monthlyHostProceedsInr = monthlyGrossInr * (1 - commRate);
  const monthlyCommissionInr = monthlyGrossInr - monthlyHostProceedsInr;
  const annualHostProceedsInr = monthlyHostProceedsInr * 12;

  return {
    weeklyKwhDelivered: Math.round(weeklyKwhDelivered * 10) / 10,
    weeklyGrossInr: Math.round(weeklyGrossInr),
    monthlyGrossInr: Math.round(monthlyGrossInr),
    monthlyCommissionInr: Math.round(monthlyCommissionInr),
    monthlyHostProceedsInr: Math.round(monthlyHostProceedsInr),
    annualHostProceedsInr: Math.round(annualHostProceedsInr),
  };
}

export interface ChargerFilterCriteria {
  searchQuery: string;
  city: IndianCity;
  connector: ConnectorType | 'All Connectors';
  maxPricePerKwh: number;
  minPowerKw: number;
  maxDistanceKm: number;
  availableNowOnly: boolean;
}

export function filterChargers(
  chargers: ChargerListing[],
  criteria: ChargerFilterCriteria
): ChargerListing[] {
  const q = criteria.searchQuery.trim().toLowerCase();

  return chargers.filter((charger) => {
    if (criteria.city !== 'All Cities' && charger.city !== criteria.city) {
      return false;
    }

    if (
      criteria.connector !== 'All Connectors' &&
      charger.connector !== criteria.connector
    ) {
      return false;
    }

    if (charger.pricePerKwh > criteria.maxPricePerKwh) {
      return false;
    }

    if (charger.powerKw < criteria.minPowerKw) {
      return false;
    }

    if (charger.distanceKm > criteria.maxDistanceKm) {
      return false;
    }

    if (criteria.availableNowOnly && !charger.availableNow) {
      return false;
    }

    if (q.length > 0) {
      const searchableText = [
        charger.title,
        charger.locality,
        charger.city,
        charger.addressCue,
        charger.connector,
        charger.hostName,
        ...charger.compatibleVehicles,
      ]
        .join(' ')
        .toLowerCase();

      if (!searchableText.includes(q)) {
        return false;
      }
    }

    return true;
  });
}

export interface ReservationFormInput {
  driverName: string;
  vehicleModel: string;
  contactPhone: string;
  slotId: string;
  estimatedKwh: number;
}

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export function validateReservationForm(input: ReservationFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.driverName || input.driverName.trim().length < 2) {
    errors.driverName = 'Please enter your full name (at least 2 characters).';
  }

  if (!input.vehicleModel || input.vehicleModel.trim().length < 2) {
    errors.vehicleModel = 'Please specify your EV make and model (e.g., Tata Nexon EV).';
  }

  const cleanedPhone = (input.contactPhone || '').replace(/[\s\-+]/g, '');
  if (!/^(91)?[6-9]\d{9}$/.test(cleanedPhone)) {
    errors.contactPhone = 'Enter a valid 10-digit Indian mobile number starting with 6–9.';
  }

  if (!input.slotId || input.slotId.trim().length === 0) {
    errors.slotId = 'Please select an available charging time slot.';
  }

  if (!Number.isFinite(input.estimatedKwh) || input.estimatedKwh < 2 || input.estimatedKwh > 100) {
    errors.estimatedKwh = 'Enter an estimated energy requirement between 2 kWh and 100 kWh.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface HostListingFormInput {
  hostName: string;
  phone: string;
  city: Exclude<IndianCity, 'All Cities'>;
  locality: string;
  connector: ConnectorType;
  powerKw: number;
  pricePerKwh: number;
  parkingType: string;
}

export function validateHostListingForm(input: HostListingFormInput): ValidationResult {
  const errors: Record<string, string> = {};

  if (!input.hostName || input.hostName.trim().length < 2) {
    errors.hostName = 'Please enter the host or property contact name.';
  }

  const cleanedPhone = (input.phone || '').replace(/[\s\-+]/g, '');
  if (!/^(91)?[6-9]\d{9}$/.test(cleanedPhone)) {
    errors.phone = 'Enter a valid 10-digit Indian mobile number.';
  }

  if (!input.locality || input.locality.trim().length < 3) {
    errors.locality = 'Enter your neighbourhood or street locality (e.g., Indiranagar, Baner).';
  }

  if (!Number.isFinite(input.powerKw) || input.powerKw < 2 || input.powerKw > 50) {
    errors.powerKw = 'Charger power rating must be between 2 kW and 50 kW.';
  }

  if (!Number.isFinite(input.pricePerKwh) || input.pricePerKwh < 5 || input.pricePerKwh > 40) {
    errors.pricePerKwh = 'Set a price between ₹5/kWh and ₹40/kWh.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export type ChapterKey =
  | 'discover'
  | 'connect'
  | 'find'
  | 'book'
  | 'share'
  | 'safety'
  | 'conversion';

/**
 * Pure mapping from normalized document scroll progress [0..1] to the 7 narrative chapters.
 */
export function getChapterFromScrollRatio(scrollRatio: number): ChapterKey {
  const r = Math.max(0, Math.min(1, Number.isFinite(scrollRatio) ? scrollRatio : 0));
  if (r < 0.13) return 'discover';
  if (r < 0.27) return 'connect';
  if (r < 0.48) return 'find';
  if (r < 0.63) return 'book';
  if (r < 0.78) return 'share';
  if (r < 0.91) return 'safety';
  return 'conversion';
}

