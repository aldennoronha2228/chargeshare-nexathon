/**
 * ChargerDetailDrawer
 * Slide-in side panel showing full details of a selected ChargerListing.
 * Opens over the existing page without routing. Closes on Escape or backdrop click.
 */

import React, { useEffect, useRef, useState } from 'react';
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
import type { Review } from '../utils/reviews';
import { ChargerThumbPlate } from './EditorialIllustrations';

interface ChargerDetailDrawerProps {
  charger: ChargerListing | null;
  reviews: Review[];
  onClose: () => void;
  onBook: (charger: ChargerListing, request: { vehicleName: string; vehicleNumber: string; totalKwh: number; startTime: string; endTime: string }) => Promise<void>;
}

export const ChargerDetailDrawer: React.FC<ChargerDetailDrawerProps> = ({
  charger,
  reviews,
  onClose,
  onBook,
}) => {
  const [vehicleName, setVehicleName] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [totalKwh, setTotalKwh] = useState(20);
  const [bookingDate, setBookingDate] = useState(() => new Date(Date.now() + 86400000).toLocaleDateString('en-CA'));
  const [bookingPending, setBookingPending] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [bookingSent, setBookingSent] = useState(false);
  const drawerRef = useRef<HTMLElement>(null);
  const detailsScrollRef = useRef<HTMLDivElement>(null);

  // Trap focus / close on Escape
  useEffect(() => {
    if (!charger) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [charger, onClose]);

  useEffect(() => {
    setBookingSent(false);
    setBookingError('');
    setVehicleName('');
    setVehicleNumber('');
    drawerRef.current?.scrollTo({ top: 0 });
    detailsScrollRef.current?.scrollTo({ top: 0 });
  }, [charger?.id]);

  if (!charger) return null;

  const availableSlots = charger.slots.filter((s) => s.available);

  const submitBooking = async (event: React.FormEvent) => {
    event.preventDefault();
    setBookingError('');
    const match = availableSlots[0]?.window.match(/(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})/);
    if (!charger.providerId || !vehicleName.trim() || !bookingDate || !Number.isFinite(totalKwh) || totalKwh < 2 || totalKwh > 100) {
      setBookingError('Enter your vehicle, date, and an energy amount from 2 to 100 kWh.');
      return;
    }
    if (!match) {
      setBookingError('This provider has not set a bookable time window.');
      return;
    }
    const start = new Date(`${bookingDate}T${match[1]}:00`);
    let end = new Date(`${bookingDate}T${match[2]}:00`);
    if (end <= start) end = new Date(end.getTime() + 24 * 60 * 60 * 1000);
    if (start <= new Date()) {
      setBookingError('The provider window has already started today. Choose a later date.');
      return;
    }
    setBookingPending(true);
    try {
      await onBook(charger, {
        vehicleName: vehicleName.trim(),
        vehicleNumber: vehicleNumber.trim(),
        totalKwh,
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      });
      setBookingSent(true);
    } catch (error) {
      setBookingError(error instanceof Error ? error.message : 'Could not send the booking request.');
    } finally {
      setBookingPending(false);
    }
  };

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
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="fixed inset-y-0 right-0 z-50 flex h-dvh max-h-dvh w-full max-w-md flex-col overflow-x-hidden overflow-y-auto overscroll-contain border-l border-black bg-white text-[#111] shadow-2xl md:overflow-hidden"
      >
        {/* Header */}
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-[#292929] bg-[#080808] px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:p-5">
          <div className="min-w-0">
            <span
              className={`inline-block text-[10px] font-mono font-bold px-2 py-0.5 rounded mb-2 ${
                charger.availableNow
                  ? 'bg-white text-black'
                  : 'bg-[#282828] text-[#D0D0D0]'
              }`}
            >
              {charger.availableNow ? '● ACCEPTING REQUESTS' : '○ PAUSED BY HOST'}
            </span>
            <h2
              id="drawer-title"
              className="font-display text-lg font-bold leading-snug text-white"
            >
              {charger.title}
            </h2>
            <p className="mt-0.5 text-xs text-[#BDBDBD]">
              {charger.locality}, {charger.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close charger details"
            className="mt-1 shrink-0 rounded-lg border border-[#444] p-1.5 text-white transition-colors hover:border-white hover:bg-white/10 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable body */}
        <div ref={detailsScrollRef} className="min-h-0 flex-none md:flex-1 md:overflow-y-auto md:overscroll-contain">

          {/* Thumb illustration */}
          <div className="h-40 shrink-0 overflow-hidden bg-black">
            {charger.photoUrl ? <img src={charger.photoUrl} alt={`${charger.title} charger`} className="h-full w-full object-cover" /> : <ChargerThumbPlate
              theme={charger.visualTheme}
              powerKw={charger.powerKw}
              connector={charger.connector}
            />}
          </div>

          <div className="space-y-5 bg-[#F7F7F7] p-5">

            {/* Key specs row */}
            <div className="grid grid-cols-1 gap-2 text-xs min-[400px]:grid-cols-3">
              <SpecBadge
                icon={<Zap className="w-3.5 h-3.5" />}
                label="Power"
                value={`${charger.powerKw} kW`}
                highlight
              />
              <SpecBadge
                icon={<span className="font-mono font-bold text-[10px]">₹</span>}
                label="Price"
                value={`₹${charger.pricePerKwh}/${charger.pricingType === 'per_session' ? 'session' : 'kWh'}`}
              />
              <SpecBadge
                icon={<MapPin className="w-3.5 h-3.5" />}
                label="Distance"
                value={charger.distanceKm === null ? 'Unavailable' : `${charger.distanceKm} km`}
              />
            </div>

            {/* Connector + hardware */}
            <div className="space-y-2 rounded-xl border border-[#D5D5D5] bg-white p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#111]">
                <Cable className="w-3.5 h-3.5 text-black" />
                Connector &amp; Hardware
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-1.5 text-[#222] min-[400px]:grid-cols-2">
                <KV label="Standard" value={charger.connector} />
                <KV label="Cable" value={charger.cableLengthMeters === null ? 'Not provided' : `${charger.cableLengthMeters} m`} />
                <KV label="Charger" value={charger.hardwareModel || 'Not specified'} span />
                <KV label="Parking" value={charger.parkingType || 'Not specified'} span />
              </div>
            </div>

            {/* Host info */}
            <div className="space-y-2 rounded-xl border border-[#D5D5D5] bg-white p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#111]">
                <BadgeCheck className="w-3.5 h-3.5 text-black" />
                Host
              </div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-[#111]">{charger.hostName}</p>
                  <p className="text-[#777] text-[11px]">Provider listing</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Star className="w-3.5 h-3.5 fill-[#D7D7D7] text-[#D7D7D7]" />
                  <span className="font-mono font-bold text-[#111]">{charger.rating > 0 ? charger.rating.toFixed(1) : '—'}</span>
                  <span className="text-[#777]">({charger.reviewCount})</span>
                </div>
              </div>
              <p className="text-[#666] text-[11px]">{charger.reviewCount ? `${charger.reviewCount} reviews` : 'No reviews yet'}</p>
            </div>

            {/* Recent driver reviews */}
            <div className="space-y-3 rounded-xl border border-[#D5D5D5] bg-white p-3.5 text-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="font-semibold text-[#111]">Driver experiences</div>
                <span className="text-[11px] text-[#777]">{reviews.length} {reviews.length === 1 ? 'review' : 'reviews'}</span>
              </div>
              {reviews.length ? [...reviews]
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .slice(0, 3)
                .map((review) => {
                  const rating = Math.max(0, Math.min(5, Math.round(review.rating)));
                  return (
                    <article key={review.id} className="border-t border-[#E8E8E8] pt-2.5 first:border-0 first:pt-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-[#222]">{review.userName || 'ChargeShare driver'}</p>
                        <span className="shrink-0 font-semibold text-amber-600">{'★'.repeat(rating)}{'☆'.repeat(5 - rating)} <span className="text-[#555]">{rating}/5</span></span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap break-words leading-relaxed text-[#555]">{review.comment || 'No written comment.'}</p>
                      {review.response && <p className="mt-2 rounded-md bg-[#F5F5F5] p-2 text-[#555]"><span className="font-semibold text-[#222]">Provider response: </span>{review.response}</p>}
                    </article>
                  );
                }) : <p className="text-[11px] text-[#777]">No driver experiences yet. Book and charge here to be the first to leave a review.</p>}
            </div>

            {/* Operating hours + access */}
            <div className="space-y-2 rounded-xl border border-[#D5D5D5] bg-white p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#111]">
                <Clock className="w-3.5 h-3.5 text-black" />
                Hours &amp; Access
              </div>
              <p className="font-mono font-semibold text-black">{charger.operatingHours}</p>
              <p className="leading-relaxed text-[#333]">{charger.accessNotes}</p>
            </div>

            {/* Compatible vehicles */}
            <div className="space-y-2 rounded-xl border border-[#D5D5D5] bg-white p-3.5 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#111]">
                <Car className="w-3.5 h-3.5 text-black" />
                Compatible Vehicles
              </div>
              <div className="flex flex-wrap gap-1.5">
                {charger.compatibleVehicles.map((v) => (
                  <span
                    key={v}
                    className="rounded-lg border border-[#D5D5D5] bg-[#F1F1F1] px-2 py-0.5 text-[11px] text-[#222]"
                  >
                    {v}
                  </span>
                ))}
              </div>
            </div>

            {/* Available slots */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-semibold text-[#111]">
                <CalendarCheck className="w-3.5 h-3.5 text-black" />
                Available Time Slots ({availableSlots.length} of {charger.slots.length})
              </div>
              {charger.slots.length === 0 ? (
                <p className="italic text-[#929B93]">No slots listed for this charger.</p>
              ) : (
                <div className="space-y-1.5">
                  {charger.slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between px-3 py-2 rounded border ${
                        slot.available
                          ? 'bg-white border-[#D5D5D5]'
                          : 'bg-[#F0F0F0] border-[#D5D5D5] opacity-60'
                      }`}
                    >
                      <div>
                        <span className="font-medium text-[#111]">{slot.label}</span>
                        <span className="ml-2 font-mono text-[#777]">{slot.window}</span>
                      </div>
                      {slot.available ? (
                        <span className="rounded bg-black px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                          OPEN
                        </span>
                      ) : (
                        <span className="font-mono text-[10px] text-[#777]">TAKEN</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Coordinates */}
            <p className="font-mono text-[11px] text-[#777]">
              {charger.coordinates.lat}, {charger.coordinates.lng}
            </p>
          </div>
        </div>

        {/* Footer CTA */}
        <div className="shrink-0 border-t border-[#D5D5D5] bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:p-4">
          {bookingSent ? (
            <div role="status" className="rounded-lg border border-black bg-black p-3 text-center text-sm font-semibold text-white">Booking request sent to the provider.</div>
          ) : availableSlots.length > 0 ? (
            <form onSubmit={submitBooking} className="space-y-2">
              <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
                <label className="text-[10px] font-semibold text-[#333]">Vehicle<input required value={vehicleName} onChange={(event) => setVehicleName(event.target.value)} placeholder="Make and model" className="mt-1 w-full rounded-lg border border-[#CFCFCF] bg-white px-3 py-2.5 text-xs text-black placeholder:text-[#777] focus:border-black focus:outline-none focus:ring-1 focus:ring-black" /></label>
                <label className="text-[10px] font-semibold text-[#333]">Vehicle number<input value={vehicleNumber} onChange={(event) => setVehicleNumber(event.target.value)} placeholder="Optional" className="mt-1 w-full rounded-lg border border-[#CFCFCF] bg-white px-3 py-2.5 text-xs text-black placeholder:text-[#777] focus:border-black focus:outline-none focus:ring-1 focus:ring-black" /></label>
                <label className="text-[10px] font-semibold text-[#333]">Date<input required type="date" min={new Date().toLocaleDateString('en-CA')} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} className="mt-1 w-full [color-scheme:light] rounded-lg border border-[#CFCFCF] bg-white px-3 py-2.5 text-xs text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black" /></label>
                <label className="text-[10px] font-semibold text-[#333]">Energy needed (kWh)<input required type="number" min="2" max="100" value={totalKwh} onChange={(event) => setTotalKwh(Number(event.target.value))} className="mt-1 w-full rounded-lg border border-[#CFCFCF] bg-white px-3 py-2.5 text-xs text-black focus:border-black focus:outline-none focus:ring-1 focus:ring-black" /></label>
              </div>
              <p className="text-[11px] text-[#555]">Estimated total: <strong className="text-black">₹{charger.pricingType === 'per_session' ? charger.pricePerKwh : charger.pricePerKwh * totalKwh}</strong></p>
              {bookingError && <p role="alert" className="rounded-lg border border-[#7F3732] bg-[#321E1C] px-3 py-2 text-[11px] text-[#FFAAA3]">{bookingError}</p>}
              <button type="submit" disabled={bookingPending} className="flex w-full items-center justify-center gap-2 rounded-xl border border-black bg-black px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-[#242424] disabled:opacity-60 cursor-pointer">
                <CalendarCheck className="w-4 h-4" />
                {bookingPending ? 'Sending request…' : 'Request a booking'}
                {!bookingPending && <ChevronRight className="w-4 h-4" />}
              </button>
            </form>
          ) : (
            <div className="w-full rounded-xl border border-[#D5D5D5] bg-[#F3F3F3] px-4 py-3 text-center text-sm text-[#555]">
              No slots currently available — check back later
            </div>
          )}
          <p className="mt-2 text-center text-[10px] text-[#777]">
            Booking requests are sent to the provider for approval.
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
    className={`space-y-0.5 rounded-xl border p-2.5 text-center ${
      highlight
        ? 'bg-black border-black text-white'
        : 'bg-white border-[#D5D5D5] text-black'
    }`}
  >
    <div className={`flex justify-center ${highlight ? 'text-white' : 'text-black'}`}>
      {icon}
    </div>
    <div className="font-mono font-bold text-sm leading-none">{value}</div>
    <div className={`text-[10px] uppercase tracking-wide ${highlight ? 'text-[#D0D0D0]' : 'text-[#777]'}`}>
      {label}
    </div>
  </div>
);

const KV: React.FC<{ label: string; value: string; span?: boolean }> = ({
  label,
  value,
  span,
}) => (
  <div className={span ? 'min-[400px]:col-span-2' : ''}>
    <span className="mr-1 text-[#777]">{label}:</span>
    <span className="font-medium text-[#222]">{value}</span>
  </div>
);
