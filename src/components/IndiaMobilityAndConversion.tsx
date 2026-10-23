import React from 'react';
import { ArrowRight, Zap, Building2, Home, Users, Download } from 'lucide-react';
import { downloadProjectZip } from '../utils/projectZipDownload';

interface IndiaMobilityAndConversionProps {
  onExploreChargers: () => void;
  onOpenHostModal: () => void;
  onOpenInfoModal: (topic: 'support' | 'terms') => void;
}

export const IndiaMobilityAndConversion: React.FC<IndiaMobilityAndConversionProps> = ({
  onExploreChargers,
  onOpenHostModal,
  onOpenInfoModal,
}) => {
  return (
    <>
      {/* J. India-Focused Brand Section */}
      <section
        id="india-mobility"
        aria-labelledby="india-mobility-heading"
        className="relative z-10 py-16 lg:py-24 border-b border-[#D8D5CA] bg-[#EDE8D8]"
      >
        <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-5">
              <div className="text-xs font-mono uppercase tracking-wider text-[#173D2C]">
                BUILT FOR INDIAN URBAN NEIGHBOURHOODS
              </div>
              <h2
                id="india-mobility-heading"
                className="font-display font-bold text-[#22251F] tracking-tight leading-[1.08] text-balance"
                style={{ fontSize: 'clamp(1.95rem, 3.3vw, 3rem)' }}
              >
                Designed around how Indian cities actually park and live.
              </h2>
              <p className="text-base text-[#3D423A] leading-relaxed">
                High-density residential neighbourhoods—from Indiranagar and Jayanagar to Koregaon Park,
                Bandra, and Vasant Vihar—mix independent ground-floor homes with multi-storey apartment blocks
                where retrofitting every parking slot takes months of RWA approvals.
              </p>
              <p className="text-base text-[#3D423A] leading-relaxed">
                ChargeShare bridges that gap at the street level: one well-sited driveway wallbox or
                society-approved visitor EV bay can serve four to six nearby EV households on a predictable
                weekly schedule.
              </p>
            </div>

            {/* Right 6 Cols: 3 Structural Urban Archetypes */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white border border-[#22251F] rounded p-5 space-y-2.5">
                <Home className="w-5 h-5 text-[#173D2C]" />
                <h3 className="text-base font-bold font-display text-[#22251F]">
                  Independent Bungalows & Row Houses
                </h3>
                <p className="text-xs text-[#4A4F46] leading-relaxed">
                  Ground-floor driveways and carports with direct street access can host daytime commuters
                  while the homeowner’s vehicle is away.
                </p>
              </div>

              <div className="bg-white border border-[#22251F] rounded p-5 space-y-2.5">
                <Building2 className="w-5 h-5 text-[#173D2C]" />
                <h3 className="text-base font-bold font-display text-[#22251F]">
                  Apartment Stilt & Visitor Bays
                </h3>
                <p className="text-xs text-[#4A4F46] leading-relaxed">
                  Residents with metered stilt chargers or RWA-designated community EV bays can share slots
                  with fellow residents and approved visitors.
                </p>
              </div>

              <div className="sm:col-span-2 bg-[#173D2C] text-[#F6F3E9] border border-[#22251F] rounded p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#D8F36A]">
                    <Users className="w-4 h-4" />
                    <span>ROUTINE COMMUNITY CHARGING</span>
                  </div>
                  <h3 className="text-base font-bold font-display text-white">
                    Built for repeat local relationships, not anonymous highway queues.
                  </h3>
                  <p className="text-xs text-[#C6D6CE]">
                    Most drivers need a dependable charger within a 5-minute walk of home or office once or
                    twice a week.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onExploreChargers}
                  className="px-4 py-2.5 text-xs font-semibold text-[#173D2C] bg-[#D8F36A] rounded hover:bg-[#c9e854] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Browse Sample Cities
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CHAPTER 5 — FINAL CONVERSION */}
      <section
        id="chapter-conversion"
        aria-label="Get started with ChargeShare"
        className="relative z-10 border-b border-[#22251F]"
      >
        <div className="grid grid-cols-1 lg:grid-cols-2">
          {/* Pathway 1: For Drivers (Warm Ivory High-Contrast Panel) */}
          <div className="bg-[#F6F3E9]/95 text-[#22251F] px-6 sm:px-12 lg:px-16 py-16 lg:py-24 border-b lg:border-b-0 lg:border-r border-[#22251F] flex flex-col justify-between space-y-8">
            <div className="space-y-4 max-w-lg">
              <div className="text-xs font-mono uppercase tracking-wider text-[#173D2C] font-semibold">
                CHAPTER 05 · FOR EV DRIVERS
              </div>
              <h2
                className="font-display font-bold text-[#22251F] tracking-tight text-balance"
                style={{ fontSize: 'clamp(2rem, 3.2vw, 3rem)' }}
              >
                Your next charge is closer than you think.
              </h2>
              <p className="text-base text-[#3D423A] leading-relaxed">
                Search private driveways and covered stilt bays in your locality, compare per-kWh rates,
                and reserve a guaranteed charging window before you leave home.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onExploreChargers}
                className="inline-flex items-center gap-2 px-7 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#F6F3E9] bg-[#173D2C] rounded hover:bg-[#112E21] transition-colors cursor-pointer"
              >
                EXPLORE CHARGERS
                <ArrowRight className="w-4 h-4 text-[#D8F36A]" />
              </button>
            </div>
          </div>

          {/* Pathway 2: For Hosts (Deep Forest + Electric Lime Panel) */}
          <div className="bg-[#173D2C]/95 text-[#F6F3E9] px-6 sm:px-12 lg:px-16 py-16 lg:py-24 flex flex-col justify-between space-y-8">
            <div className="space-y-4 max-w-lg">
              <div className="text-xs font-mono uppercase tracking-wider text-[#D8F36A] font-semibold">
                CHAPTER 05 · FOR CHARGER HOSTS
              </div>
              <h2
                className="font-display font-bold text-white tracking-tight text-balance"
                style={{ fontSize: 'clamp(2rem, 3.2vw, 3rem)' }}
              >
                Put your charger on the map.
              </h2>
              <p className="text-base text-[#D0DFD7] leading-relaxed">
                Put your idle 3.3 kW, 7.4 kW, or 11 kW home charger on the neighbourhood map. Set your own
                hours, approve every driver request, and earn from unused driveway capacity.
              </p>
            </div>
            <div>
              <button
                type="button"
                onClick={onOpenHostModal}
                className="inline-flex items-center gap-2 px-7 py-4 text-xs sm:text-sm font-bold uppercase tracking-wider text-[#173D2C] bg-[#D8F36A] border border-[#D8F36A] rounded hover:bg-[#c9e854] transition-colors cursor-pointer"
              >
                BECOME A HOST
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* L. Footer */}
      <footer className="relative z-10 bg-[#22251F] text-[#F6F3E9] pt-14 pb-24 px-4 sm:px-8">
        <div className="max-w-[1360px] mx-auto space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-[#383C34]">
            {/* Brand Column */}
            <div className="md:col-span-5 space-y-3">
              <a
                href="#"
                className="inline-flex items-center gap-2.5 text-xl font-bold tracking-tight text-white font-display"
              >
                <span className="w-7 h-7 rounded bg-[#D8F36A] text-[#173D2C] inline-flex items-center justify-center">
                  <Zap className="w-4 h-4 fill-current" />
                </span>
                ChargeShare
              </a>
              <p className="text-sm text-[#B8BDB3] max-w-sm leading-relaxed">
                Your driveway. Someone’s next charge. A peer-to-peer EV charging marketplace connecting
                Indian electric vehicle drivers with underutilized private charging equipment.
              </p>
            </div>

            {/* Marketplace Links */}
            <div className="md:col-span-4 space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider text-[#D8F36A]">
                Marketplace Navigation
              </div>
              <ul className="space-y-2 text-sm text-[#D8D5CA]">
                <li>
                  <a href="#chapter-connect" className="hover:text-white hover:underline underline-offset-4">
                    Find Chargers
                  </a>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={onOpenHostModal}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer"
                  >
                    Become a Host
                  </button>
                </li>
                <li>
                  <a href="#how-it-works" className="hover:text-white hover:underline underline-offset-4">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#safety" className="hover:text-white hover:underline underline-offset-4">
                    Safety
                  </a>
                </li>
              </ul>
            </div>

            {/* Support & Legal */}
            <div className="md:col-span-3 space-y-2.5">
              <div className="text-xs font-mono uppercase tracking-wider text-[#D8F36A]">
                Resources & Policies
              </div>
              <ul className="space-y-2 text-sm text-[#D8D5CA]">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('support')}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                  >
                    Help and Support
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenInfoModal('terms')}
                    className="hover:text-white hover:underline underline-offset-4 cursor-pointer text-left"
                  >
                    Terms and Privacy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={downloadProjectZip}
                    className="text-[#D8F36A] font-mono text-xs hover:text-white hover:underline underline-offset-4 inline-flex items-center gap-1.5 pt-1 cursor-pointer text-left"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Project Folder (.zip)</span>
                  </button>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-[#989E92]">
            <p>© {new Date().getFullYear()} ChargeShare India. All rights reserved.</p>
            <p>
              MVP Demonstration Environment · Sample listings, bookings, and proceeds are illustrative.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};
