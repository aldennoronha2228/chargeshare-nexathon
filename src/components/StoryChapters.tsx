import React, { useState } from 'react';
import { ArrowRight, MapPin, CalendarCheck, Zap } from 'lucide-react';
import type { ChargerVisualState } from '../three/ChargerModel';
import type { ChargerListing } from '../data/demoChargers';

interface ChapterConnectSectionProps {
  chargers: ChargerListing[];
  selectedChargerIndex: number;
  onSelectNode: (index: number, charger: ChargerListing) => void;
  onExploreClick: () => void;
}

/**
 * CHAPTER 2 — CONNECT
 * Framed so the central/right 3D viewport remains open, allowing the user to watch
 * the 3D camera pull back into the miniature neighbourhood block with animated electric-lime paths.
 */
export const ChapterConnectSection: React.FC<ChapterConnectSectionProps> = ({
  chargers,
  selectedChargerIndex,
  onSelectNode,
  onExploreClick,
}) => {
  const activeCharger = chargers[selectedChargerIndex] ?? chargers[0] ?? null;

  return (
    <section
      id="chapter-connect"
      aria-labelledby="chapter-connect-heading"
      className="relative z-10 min-h-[88vh] flex flex-col justify-start md:justify-center px-4 sm:px-8 pt-12 sm:pt-16 pb-28 md:py-24 pointer-events-none"
    >
      <div className="max-w-[1360px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left 5 Columns: Editorial Narrative directly on 3D Background with mobile scrim */}
        <div className="md:col-span-5 py-4 px-4 sm:px-0 sm:py-2 bg-[#0A1B14]/85 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none rounded-xl sm:rounded-none border border-[#26503B]/60 sm:border-0 text-[#F6F3E9] space-y-5 pointer-events-auto shadow-2xl sm:shadow-none">
          <h2
            id="chapter-connect-heading"
            className="font-display font-bold text-white tracking-tight leading-[1.06] text-balance"
            style={{ fontSize: 'clamp(1.75rem, 3.1vw, 2.85rem)' }}
          >
            Thousands of private chargers. One connected neighbourhood grid.
          </h2>

          <p className="text-sm sm:text-base text-[#D0DFD7] leading-relaxed">
            As you look across any Indian residential neighbourhood, scores of 3.3 kW and 7.4 kW home
            wallboxes sit idle for up to 20 hours a day. ChargeShare turns individual driveways and
            apartment stilt bays into reservable community infrastructure—without waiting for new
            commercial land or street transformers.
          </p>

          {/* Interactive 3D Neighbourhood Node Selector */}
          <div className="pt-3 border-t border-[#26503B] space-y-2.5">
            <div className="text-xs font-semibold text-[#D8F36A] flex items-center justify-between">
              <span>Select a neighbourhood charger to preview in 3D:</span>
              <span className="sm:hidden text-[10px] text-[#A6C0B2]">Swipe →</span>
            </div>
            <div className="flex flex-nowrap overflow-x-auto gap-2 pb-1.5 scrollbar-none sm:flex-wrap -mx-1 px-1">
              {chargers.slice(0, 5).map((c, idx) => {
                const isSelected = idx === selectedChargerIndex;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onSelectNode(idx, c)}
                    className={`px-3 py-1.5 text-xs font-mono rounded border transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
                      isSelected
                        ? 'bg-[#D8F36A] text-[#173D2C] border-[#D8F36A] font-bold'
                        : 'bg-transparent text-[#E2ECE7] border-[#36654E] hover:border-[#D8F36A]'
                    }`}
                  >
                    0{idx + 1}. {c.locality.split(',')[0]} ({c.powerKw}kW)
                  </button>
                );
              })}
            </div>
          </div>

          {/* Highlighted Node Readout */}
          {activeCharger ? (
            <div className="py-3 border-t border-b border-[#26503B] flex items-center justify-between gap-4 text-xs">
              <div className="min-w-0">
                <div className="truncate font-bold text-white font-display">{activeCharger.title}</div>
                <div className="truncate text-[#B5C7BD]">
                  {activeCharger.locality}, {activeCharger.city} · {activeCharger.connector}
                </div>
              </div>
              <div className="text-right font-mono shrink-0">
                <div className="text-base font-bold text-[#D8F36A]">
                  ₹{activeCharger.pricePerKwh}/{activeCharger.pricingType === 'per_session' ? 'session' : 'kWh'}
                </div>
                <div className="text-[11px] text-[#C6D6CE]">
                  {activeCharger.distanceKm === null ? 'Distance unavailable' : `${activeCharger.distanceKm} km away`}
                </div>
              </div>
            </div>
          ) : (
            <p className="border-y border-[#26503B] py-3 text-xs text-[#B5C7BD]">
              No public charger listings are available yet. Check back after a provider publishes a bay.
            </p>
          )}

          <button
            type="button"
            onClick={onExploreClick}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#173D2C] bg-[#D8F36A] rounded hover:bg-[#c9e854] transition-colors cursor-pointer w-full sm:w-auto min-h-[44px]"
          >
            See How Booking Works
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right 7 Columns left open so the pulled-back 3D Neighbourhood & Animated Lime Lines are visible */}
        <div className="md:col-span-7 hidden md:block" aria-hidden="true" />
      </div>
    </section>
  );
};

interface ChapterBookAndChargeSectionProps {
  chargerState: ChargerVisualState;
  onSelectStepState: (state: ChargerVisualState) => void;
  onExploreChargers: () => void;
}

/**
 * CHAPTER 3 — BOOK AND CHARGE
 * Interactive 3-step sequence synced with the 3D Charger and Driveway scene, directly on the 3D background without an enclosing box.
 */
export const ChapterBookAndChargeSection: React.FC<ChapterBookAndChargeSectionProps> = ({
  chargerState,
  onSelectStepState,
  onExploreChargers,
}) => {
  const [activeStep, setActiveStep] = useState<number>(3);

  const steps = [
    {
      num: '01',
      title: 'Find a suitable charger.',
      desc: 'Filter nearby residential driveways and apartment stilt bays by connector type (Type 2 AC, 15A Socket, Bharat AC001, CCS2), power rating, cable length, and per-kWh tariff.',
      state: 'standby' as ChargerVisualState,
      badge: '3D State: Standby · Pin Visible',
      icon: MapPin,
    },
    {
      num: '02',
      title: 'Reserve an available slot.',
      desc: 'Pick a daytime or overnight window that fits your routine. Once the host confirms your slot, the bay is locked for your vehicle and gate entry notes are shared.',
      state: 'reserved' as ChargerVisualState,
      badge: '3D State: Reserved · Bay Locked',
      icon: CalendarCheck,
    },
    {
      num: '03',
      title: 'Arrive and charge.',
      desc: 'Pull into the private driveway, plug in the Type 2 connector, and draw power. You pay for the energy delivered according to the host’s transparent per-kWh rate.',
      state: 'charging' as ChargerVisualState,
      badge: '3D State: Active 7.4 kW Current Flow',
      icon: Zap,
    },
  ];

  const handleStepClick = (stepIndex: number, state: ChargerVisualState) => {
    setActiveStep(stepIndex);
    onSelectStepState(state);
  };

  return (
    <section
      id="how-it-works"
      aria-labelledby="chapter-book-heading"
      className="scroll-mt-20 relative z-10 min-h-[88vh] flex flex-col justify-start md:justify-center px-4 sm:px-8 pt-12 sm:pt-16 pb-36 md:pt-12 md:pb-36 pointer-events-none"
    >
      <div className="max-w-[1360px] mx-auto w-full grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* Left 5 Columns: 3-Step Interactive Sequence directly over the dark 3D atmosphere with mobile scrim */}
        <div className="md:col-span-5 text-[#F6F3E9] py-4 px-4 sm:px-0 sm:py-1 bg-[#0A1B14]/85 sm:bg-transparent backdrop-blur-md sm:backdrop-blur-none rounded-xl sm:rounded-none border border-[#26503B]/60 sm:border-0 space-y-4 pointer-events-auto shadow-2xl sm:shadow-none">
          <div className="space-y-2">
            <h2
              id="chapter-book-heading"
              className="font-display font-bold text-white tracking-tight text-balance"
              style={{ fontSize: 'clamp(1.75rem, 2.8vw, 2.5rem)' }}
            >
              From street search to active charge in three steps.
            </h2>
            <p className="text-xs sm:text-sm text-[#D0DFD7]">
              Select any step below to inspect the corresponding state on the 3D driveway wallbox.
            </p>
          </div>

          <div className="divide-y divide-[#26503B] border-t border-b border-[#26503B]">
            {steps.map((s, idx) => {
              const stepNum = idx + 1;
              const isSelected = activeStep === stepNum;
              const IconComp = s.icon;
              return (
                <button
                  key={s.num}
                  type="button"
                  onClick={() => handleStepClick(stepNum, s.state)}
                  className={`w-full text-left py-3 px-3 transition-colors cursor-pointer flex items-start gap-3.5 min-h-[52px] ${
                    isSelected
                      ? 'border-l-2 border-[#D8F36A] pl-4 bg-[#173D2C]/40 sm:bg-transparent'
                      : 'opacity-75 hover:opacity-100 active:bg-[#173D2C]/30'
                  }`}
                >
                  <span
                    className={`font-mono text-base font-bold tabular-nums shrink-0 mt-0.5 ${
                      isSelected ? 'text-[#D8F36A]' : 'text-[#88A897]'
                    }`}
                  >
                    {s.num}.
                  </span>
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm sm:text-base font-bold font-display text-white">
                        {s.title}
                      </h3>
                      <IconComp
                        className={`w-4 h-4 shrink-0 ${
                          isSelected ? 'text-[#D8F36A]' : 'text-[#88A897]'
                        }`}
                      />
                    </div>
                    <p className="text-xs leading-relaxed text-[#D0DFD7]">
                      {s.desc}
                    </p>
                    <div
                      className={`pt-0.5 text-[11px] font-mono ${
                        isSelected ? 'text-[#D8F36A]' : 'text-[#9CB8A9]'
                      }`}
                    >
                      {s.badge}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="pt-1 flex flex-col sm:flex-row sm:items-center gap-3">
            <button
              type="button"
              onClick={onExploreChargers}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 text-xs font-bold uppercase tracking-wider text-[#173D2C] bg-[#D8F36A] rounded hover:bg-[#c9e854] transition-colors cursor-pointer w-full sm:w-auto min-h-[44px]"
            >
              Inspect Neighbourhood Grid
              <ArrowRight className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-[#C6D6CE]">
              3D Mode: <strong className="uppercase text-[#D8F36A]">{chargerState}</strong>
            </span>
          </div>
        </div>

        {/* Right 7 Columns left open so the zoomed-in 3D Wallbox & EV Charging Port remain unobstructed */}
        <div className="md:col-span-7 hidden md:block" aria-hidden="true" />
      </div>
    </section>
  );
};
