import React from 'react';
import { ShieldAlert, PlugZap, FileText, MessageSquareWarning, Clock, CheckCircle2 } from 'lucide-react';

export const SafetyAndFeatureShowcase: React.FC = () => {
  return (
    <section
      id="safety"
      aria-labelledby="safety-heading"
      className="relative z-10 scroll-mt-20 py-16 lg:py-24 border-b border-[#D8D5CA] bg-[#F6F3E9]"
    >
      <div className="max-w-[1360px] mx-auto px-4 sm:px-8">
        {/* Top Editorial Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pb-12 border-b border-[#D8D5CA]">
          <div className="lg:col-span-5 space-y-3">
            <h2
              id="safety-heading"
              className="font-display font-bold text-[#22251F] tracking-tight text-balance"
              style={{ fontSize: 'clamp(1.85rem, 3vw, 2.75rem)' }}
            >
              Practical ground rules for electrical and driveway trust.
            </h2>
          </div>
          <div className="lg:col-span-7 flex flex-col justify-end">
            <p className="text-base text-[#3D423A] leading-relaxed">
              Sharing a private EV charger involves high-load electrical equipment and access to residential
              property. ChargeShare structures every listing around transparent technical specifications,
              explicit driveway rules, and mutual accountability between neighbours.
            </p>
          </div>
        </div>

        {/* 6-Part Editorial Ledger Matrix */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 divide-y md:divide-y-0 md:gap-px bg-[#D8D5CA] border-b border-[#D8D5CA]">
          <div className="bg-[#F6F3E9] p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#173D2C]">
              <span>01 / ELECTRICAL READINESS</span>
              <PlugZap className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#22251F]">
              Safe installation & load assessment
            </h3>
            <p className="text-sm text-[#4A4F46] leading-relaxed">
              Hosts are responsible for ensuring their wallbox or 15A industrial socket runs on an
              appropriately rated circuit with dedicated MCB/RCCB protection, proper earthing, and
              sanctioned DISCOM load. Equipment and wiring must be inspected by a qualified electrician.
            </p>
          </div>

          <div className="bg-[#F6F3E9] p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#173D2C]">
              <span>02 / CONNECTOR CLARITY</span>
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#22251F]">
              Exact connector & cable specs
            </h3>
            <p className="text-sm text-[#4A4F46] leading-relaxed">
              Every listing specifies its exact connector standard (Type 2 AC, Bharat AC001, 15A 3-Pin, or
              CCS2 DC), maximum continuous kW output, tethered cable length in meters, and vehicle bay
              clearance before a driver requests a slot.
            </p>
          </div>

          <div className="bg-[#F6F3E9] p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#173D2C]">
              <span>03 / PROPERTY ACCESS</span>
              <Clock className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#22251F]">
              Operating hours & gate protocol
            </h3>
            <p className="text-sm text-[#4A4F46] leading-relaxed">
              Hosts define exact entry windows, security guard check-in instructions, and whether a first-time
              neighbour meet-up is required. Drivers only receive gate access details after a reservation
              window is confirmed.
            </p>
          </div>

          <div className="bg-[#F6F3E9] p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#173D2C]">
              <span>04 / TRANSPARENT PRICING</span>
              <FileText className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#22251F]">
              Upfront tariffs & cancellation rules
            </h3>
            <p className="text-sm text-[#4A4F46] leading-relaxed">
              Per-kWh rates and estimated session totals are shown prior to booking. Both drivers and hosts
              follow clear slot cancellation windows so driveways are never blocked unexpectedly.
            </p>
          </div>

          <div className="bg-[#F6F3E9] p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#173D2C]">
              <span>05 / ACCOUNTABILITY</span>
              <MessageSquareWarning className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#22251F]">
              Session ratings & issue reporting
            </h3>
            <p className="text-sm text-[#4A4F46] leading-relaxed">
              After a session, drivers and hosts rate punctuality, cable care, and bay accuracy. Listings or
              accounts reported for unsafe wiring, inaccurate specs, or missed slots can be flagged for
              marketplace review.
            </p>
          </div>

          <div className="bg-[#EDE8D8] p-6 sm:p-8 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-[#22251F]">
              <span>06 / MVP SCOPE NOTICE</span>
              <ShieldAlert className="w-4 h-4 text-[#173D2C]" />
            </div>
            <h3 className="text-lg font-bold font-display text-[#22251F]">
              What you should verify independently
            </h3>
            <p className="text-sm text-[#3D423A] leading-relaxed">
              This preview demonstrates peer-to-peer discovery and scheduling. ChargeShare does not provide
              third-party property insurance or physical on-site electrical certification in this MVP;
              hosts and drivers must verify site suitability and Society/RWA permissions directly.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
