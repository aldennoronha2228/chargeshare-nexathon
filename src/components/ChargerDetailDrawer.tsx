/**
 * ChargerDetailDrawer
 * Slide-in side panel showing full details of a selected ChargerListing.
 * Opens over the existing page without routing. Closes on Escape or backdrop click.
 */

import React, { useEffect } from 'react';
import {
  X,
  Star,
  Zap,
  MapPin,
  Clock,
  Cable,
  Car,
  BadgeCheck,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';
import type { ChargerListing } from '../data/demoChargers';
import { ChargerThumbPlate } from './EditorialIllustrations';

interface ChargerDetailDrawerProps {
  charger: ChargerListing | null;
  onClose: () => void;
  onBook: (charger: ChargerListing) => void;
}

export const ChargerDetailDrawer: React.FC<ChargerDetailDrawerProps> = ({
  charger,
  onClose,
  onBook,
}) => {
  // Trap focus / close on Escape
  useEffect(() => {
    if (!charger) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [charger, onClose]);

  if (!charger) return null;

  const availableSlots = charger.slots.filter((s) => s.available);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-40 bg-black/50"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-[#F6F3E9] border-l-2 border-[#22251F] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-5 border-b border-[#D8D5CA] shrink-0">
          <div className="min-w-0">
            <span
              className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded mb-2 ${
                charger.availableNow
                  ? 'bg-[#D8F36A] text-[#173D2C]'
                  : 'bg-[#EDE8D8] text-[#565A52]'
              }`}
            >
              {charger.availableNow ? '● AVAILABLE NOW' : '○ NEXT SLOT LATER'}
            </span>
            <h2
              id="drawer-title"
              className="text-lg font-bold font-display text-[#22251F] leading-snug"
            >
              {charger.title}
            </h2>
            <p className="text-xs text-[#565A52] mt-0.5">
              {charger.locality}, {charger.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close charger details"
            className="p-1.5 rounded border border-[#D8D5CA] text-[#22251F] hover:bg-[#EDE8D8] cursor-pointer shrink-0 mt-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* Thumb illustration */}
          <div className="h-40 bg-[#173D2C] overflow-hidden shrink-0">
            <ChargerThumbPlate
              theme={charger.visualTheme}
              powerKw={charger.powerKw}
              connector={charger.connector}
            />
          </div>

          <div className="p-5 space-y-5">

            {/* Key specs row */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <SpecBadge
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Power"
                value={`${charger.powerKw} kW`}
                highlight
              />
              <SpecBadge
                icon={<span className="font-mono font-bold text-[10px]">₹</span>}
                label="Price"
                value={`₹${charger.pricePerKwh}/kWh`}
              />
              <SpecBadge
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Distance"
                value={`${charger.distanceKm} km`}
              />
            </div>

            {/* Connector + hardware */}
            <div className="p-3.5 bg-white border border-[#D8D5CA] rounded space-y-2 text-xs">
              <div className="font-semibold text-[#22251F] flex items-center gap-1.5">
                <Cable className="w-3.5 h-3.5 text-[#173D2C]" />
                Connector &amp; Hardware
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[#3D423A]">
                <KV label="Standard" value={charger.connector} />
                <KV label="Cable" value={`${charger.cableLengthMeters} m`} />
                <KV label="Model" value={charger.hardwareModel} span />
                <KV label="Parking" value={charger.parkingType} span />
              </div>
            </div>

            {/* Host info */}
            <div className="p-3.5 bg-white border border-[#D8D5CA] rounded space-y-2 text-xs">
              <div className="font-semibold text-[#22251F] flex items-center gap-1.5">
                <BadgeCheck className="w-3.5 h-3.5 text-[#173D2C]" />
                Host
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#22251F]">{charger.hostName}</p>
                  <p className="text-[#888] text-[11px]">{charger.hostTenure}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-[#F0A500] text-[#F0A500]" />
                  <span className="font-mono font-bold text-[#22251F]">{charger.rating.toFixed(1)}</span>
                  <span className="text-[#888]">({charger.reviewCount})</span>
                </div>
              </div>
              <p className="text-[#565A52] text-[11px]">{charger.completedSessions} completed sessions</p>
            </div>

            {/* Operating hours + access */}
            <div className="p-3.5 bg-white border border-[#D8D5CA] rounded space-y-2 text-xs">
              <div className="font-semibold text-[#22251F] flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-[#173D2C]" />
                Hours &amp; Access
              </div>
              <p className="font-mono text-[#173D2C] font-semibold">{charger.operatingHours}</p>
              <p className="text-[#3D423A] leading-relaxed">{charger.accessNotes}</p>
            </div>

            {/* Compatible vehicles */}
            <div className="p-3.5 bg-white border border-[#D8D5CA] rounded space-y-2 text-xs">
              <div className="font-semibold text-[#22251F] flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-[#173D2C]" />
                Compatible Vehicles
              </div>
              <div className="flex flex-wrap gap-1.5">
                {charger.compatibleVehicles.map((v) => (
                  <span
                    key={v}
                    className="px-2 py-0.5 bg-[#EDE8D8] border border-[#D8D5CA] rounded text-[#3D423A] text-[11px]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* Available slots */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-[#22251F] flex items-center gap-1.5">
                <CalendarCheck className="w-3.5 h-3.5 text-[#173D2C]" />
                Available Time Slots ({availableSlots.length} of {charger.slots.length})
              </div>
              {charger.slots.length === 0 ? (
                <p className="text-[#888] italic">No slots listed for this charger.</p>
              ) : (
                <div className="space-y-1.5">
                  {charger.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between px-3 py-2 rounded border ${
                        slot.available
                          ? 'bg-white border-[#D8D5CA]'
                          : 'bg-[#F5F2EA] border-[#D8D5CA] opacity-60'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-[#22251F]">{slot.label}</span>
                        <span className="text-[#888] ml-2 font-mono">{slot.window}</span>
                      </div>
                      {slot.available ? (
                        <span className="text-[10px] font-mono font-bold text-[#173D2C] bg-[#D8F36A] px-1.5 py-0.5 rounded">
                          OPEN
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono text-[#888]">TAKEN</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coordinates */}
            <p className="text-[11px] font-mono text-[#888]">
              {charger.coordinates.lat}, {charger.coordinates.lng}
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-[#D8D5CA] bg-[#F6F3E9] shrink-0">
          {availableSlots.length > 0 ? (
            <button
              type="button"
              onClick={() => onBook(charger)}
              className="w-full py-3 px-4 flex items-center justify-center gap-2 text-sm font-bold text-[#173D2C] bg-[#D8F36A] border border-[#173D2C] rounded hover:bg-[#c9e854] transition-colors cursor-pointer"
            >
              <CalendarCheck className="w-4 h-4" />
              Reserve a Slot (Demo)
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <div className="w-full py-3 px-4 text-center text-sm text-[#565A52] bg-[#EDE8D8] border border-[#D8D5CA] rounded">
              No slots currently available — check back later
            </div>
          )}
          <p className="text-[10px] text-[#888] text-center mt-2">
            Demo only · No real booking or payment is processed
          </p>
        </div>
      </aside>
    </>
  );
};

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

const SpecBadge: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  highlight?: boolean;
}> = ({ icon, label, value, highlight }) => (
  <div
    className={`rounded border p-2.5 text-center space-y-0.5 ${
      highlight
        ? 'bg-[#173D2C] border-[#173D2C] text-[#F6F3E9]'
        : 'bg-white border-[#D8D5CA] text-[#22251F]'
    }`}
  >
    <div className={`flex justify-center ${highlight ? 'text-[#D8F36A]' : 'text-[#173D2C]'}`}>
      {icon}
    </div>
    <div className="font-mono font-bold text-sm leading-none">{value}</div>
    <div className={`text-[10px] uppercase tracking-wide ${highlight ? 'text-[#B5D85A]' : 'text-[#888]'}`}>
      {label}
    </div>
  </div>
);

const KV: React.FC<{ label: string; value: string; span?: boolean }> = ({
  label,
  value,
  span,
}) => (
  <div className={span ? 'col-span-2' : ''}>
    <span className="text-[#888] mr-1">{label}:</span>
    <span className="text-[#22251F] font-medium">{value}</span>
  </div>
);
