import React from 'react';

/**
 * Editorial architectural illustration plates designed specifically for ChargeShare.
 * Crafted with ChargeShare's palette (#173D2C Forest, #D8F36A Electric Lime, #F6F3E9 Warm Ivory,
 * #22251F Charcoal, warm terracotta/sandstone tones) so every visual slot is 100% self-contained,
 * sharp at any DPI, and immune to external image failures.
 */

export const HeroDrivewayIllustration: React.FC<{ className?: string }> = ({ className = '' }) => (
  <svg
    viewBox="0 0 800 580"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`w-full h-full object-cover ${className}`}
    role="img"
    aria-label="Editorial architectural illustration of an electric SUV charging at a private Indian residential driveway with a wall-mounted 7.4kW Type 2 charger"
  >
    <defs>
      <linearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#123123" />
        <stop offset="58%" stopColor="#1B4633" />
        <stop offset="100%" stopColor="#26543E" />
      </linearGradient>
      <linearGradient id="sunlightBeam" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#D8F36A" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#D8F36A" stopOpacity="0" />
      </linearGradient>
      <linearGradient id="carBody" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#2A5C43" />
        <stop offset="55%" stopColor="#173D2C" />
        <stop offset="100%" stopColor="#0E261B" />
      </linearGradient>
      <linearGradient id="wallTexture" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#EBE5D5" />
        <stop offset="100%" stopColor="#D8D0BC" />
      </linearGradient>
    </defs>

    {/* Background Deep Forest Evening Sky */}
    <rect width="800" height="580" fill="url(#skyWarm)" />

    {/* Architectural Grid Lines in Sky (Subtle Editorial Motif) */}
    <line x1="0" y1="110" x2="800" y2="110" stroke="#D8F36A" strokeOpacity="0.08" strokeWidth="1" />
    <line x1="540" y1="0" x2="540" y2="420" stroke="#D8F36A" strokeOpacity="0.08" strokeWidth="1" />

    {/* Golden Hour Sun / Canopy Glow */}
    <circle cx="150" cy="120" r="180" fill="url(#sunlightBeam)" />

    {/* Background Tropical Neem & Gulmohar Foliage Silhouette */}
    <path
      d="M-20 240 C40 160, 140 150, 210 210 C260 150, 360 165, 410 230 L410 380 L-20 380 Z"
      fill="#0F291E"
    />
    <path
      d="M80 180 C140 110, 250 115, 310 185 C370 135, 450 160, 480 220 L480 360 L80 360 Z"
      fill="#163829"
    />

    {/* Modern Indian Bungalow / Residence Architecture (Right & Center-Right) */}
    {/* Upper Cantilevered Concrete Slab */}
    <rect x="330" y="76" width="470" height="28" fill="#E5DEC9" />
    <rect x="330" y="104" width="470" height="12" fill="#C4BCA6" />

    {/* Residence Main Stucco Wall & Warm Timber Louvers */}
    <rect x="370" y="116" width="430" height="284" fill="url(#wallTexture)" />

    {/* Architectural Clerestory Window with Warm Interior Glow */}
    <rect x="410" y="146" width="190" height="96" fill="#1F2421" stroke="#B8B09A" strokeWidth="3" />
    <rect x="418" y="154" width="82" height="80" fill="#F3D078" fillOpacity="0.35" />
    <rect x="508" y="154" width="84" height="80" fill="#F3D078" fillOpacity="0.22" />
    {/* Teak Louver Screen */}
    <g stroke="#8C583A" strokeWidth="4">
      <line x1="422" y1="154" x2="422" y2="234" />
      <line x1="434" y1="154" x2="434" y2="234" />
      <line x1="446" y1="154" x2="446" y2="234" />
      <line x1="458" y1="154" x2="458" y2="234" />
      <line x1="470" y1="154" x2="470" y2="234" />
    </g>

    {/* Boundary Compound Wall & Gate Pillar (Left-Center) */}
    <rect x="0" y="275" width="370" height="125" fill="#D5CEBA" />
    <line x1="0" y1="295" x2="370" y2="295" stroke="#BFB69F" strokeWidth="2" />
    {/* Architectural Gate Slats */}
    <g fill="#22251F">
      <rect x="28" y="245" width="240" height="145" rx="2" fill="#1A211D" />
      <line x1="28" y1="268" x2="268" y2="268" stroke="#37423B" strokeWidth="3" />
      <line x1="28" y1="292" x2="268" y2="292" stroke="#37423B" strokeWidth="3" />
      <line x1="28" y1="316" x2="268" y2="316" stroke="#37423B" strokeWidth="3" />
      <line x1="28" y1="340" x2="268" y2="340" stroke="#37423B" strokeWidth="3" />
      <line x1="28" y1="364" x2="268" y2="364" stroke="#37423B" strokeWidth="3" />
    </g>

    {/* Dedicated Textured Sandstone Charger Pillar */}
    <rect x="636" y="116" width="96" height="290" fill="#CFC7B2" stroke="#B5AC95" strokeWidth="2" />
    {/* House Number Plate on Pillar */}
    <rect x="656" y="142" width="56" height="24" rx="2" fill="#173D2C" />
    <text x="684" y="158" textAnchor="middle" fill="#F6F3E9" fontSize="11" fontFamily="JetBrains Mono, monospace" fontWeight="600">
      12-B
    </text>

    {/* Wall-Mounted Smart 7.4kW AC Wallbox Charger on Pillar */}
    <rect x="654" y="210" width="60" height="86" rx="8" fill="#1A1E1B" stroke="#22251F" strokeWidth="3" />
    <rect x="662" y="220" width="44" height="52" rx="4" fill="#252B26" />
    {/* Active Charging LED Status Bar (Electric Lime) */}
    <rect x="668" y="228" width="32" height="6" rx="3" fill="#D8F36A" />
    {/* Digital kWh Sub-meter Readout on Wallbox */}
    <rect x="668" y="242" width="32" height="18" rx="2" fill="#111613" />
    <text x="684" y="254" textAnchor="middle" fill="#D8F36A" fontSize="9" fontFamily="JetBrains Mono, monospace">
      7.4kW
    </text>
    {/* Holstered Connector Socket */}
    <circle cx="684" cy="283" r="6" fill="#D8F36A" />

    {/* Paved Driveway Forecourt */}
    <polygon points="0,400 800,400 800,580 0,580" fill="#252924" />
    {/* Driveway Stone Paver Grid Perspective Lines */}
    <line x1="0" y1="445" x2="800" y2="445" stroke="#333831" strokeWidth="1.5" />
    <line x1="0" y1="505" x2="800" y2="505" stroke="#333831" strokeWidth="1.5" />
    <line x1="220" y1="400" x2="110" y2="580" stroke="#333831" strokeWidth="1.5" />
    <line x1="450" y1="400" x2="410" y2="580" stroke="#333831" strokeWidth="1.5" />
    <line x1="670" y1="400" x2="720" y2="580" stroke="#333831" strokeWidth="1.5" />

    {/* Car Ground Shadow */}
    <ellipse cx="345" cy="458" rx="235" ry="24" fill="#111411" />

    {/* Contemporary Electric SUV Parked in Driveway */}
    {/* Rear/Side Sculpted Body */}
    <path
      d="M115 385 L145 316 C158 292, 185 280, 224 278 L420 278 C462 278, 495 294, 526 328 L576 346 C594 352, 604 368, 604 390 L604 422 C604 432, 595 438, 582 438 L128 438 C114 438, 108 428, 108 412 L115 385 Z"
      fill="url(#carBody)"
      stroke="#3D7A5B"
      strokeWidth="2"
    />
    {/* Cabin Greenhouse Windows */}
    <path
      d="M174 326 L226 290 L414 290 C446 290, 474 302, 498 328 L174 326 Z"
      fill="#101C16"
      stroke="#5A8F73"
      strokeWidth="1.5"
    />
    {/* B-Pillar and C-Pillar Dividers */}
    <line x1="305" y1="290" x2="298" y2="327" stroke="#2A5C43" strokeWidth="5" />
    <line x1="412" y1="290" x2="422" y2="328" stroke="#2A5C43" strokeWidth="5" />

    {/* EV Front DRL LED Signature & Rear Taillight Bar */}
    <rect x="572" y="362" width="30" height="8" rx="3" fill="#D8F36A" />
    <rect x="112" y="352" width="18" height="10" rx="2" fill="#E05A47" />
    {/* Lower Rocker Cladding */}
    <rect x="185" y="416" width="320" height="14" fill="#141815" />

    {/* Front Fender Charging Port Flap & Plugged-in Type 2 Connector */}
    <rect x="512" y="352" width="24" height="24" rx="4" fill="#0E2017" stroke="#D8F36A" strokeWidth="2" />
    <circle cx="524" cy="364" r="6" fill="#D8F36A" />

    {/* Tactile Coiled/Draped Charging Cable from Wallbox (684,283) to Car Port (524,364) */}
    <path
      d="M684 286 C684 375, 625 415, 585 395 C555 380, 545 364, 526 364"
      stroke="#111512"
      strokeWidth="8"
      strokeLinecap="round"
      fill="none"
    />
    <path
      d="M684 286 C684 375, 625 415, 585 395 C555 380, 545 364, 526 364"
      stroke="#D8F36A"
      strokeWidth="2"
      strokeDasharray="6 8"
      strokeLinecap="round"
      fill="none"
    />

    {/* Left Rear Wheel */}
    <g transform="translate(195, 430)">
      <circle r="44" fill="#141715" stroke="#2E3530" strokeWidth="4" />
      <circle r="28" fill="#232925" stroke="#8C968E" strokeWidth="2" />
      <circle r="9" fill="#D8F36A" />
      <line x1="-24" y1="0" x2="24" y2="0" stroke="#8C968E" strokeWidth="3" />
      <line x1="0" y1="-24" x2="0" y2="24" stroke="#8C968E" strokeWidth="3" />
    </g>

    {/* Right Front Wheel */}
    <g transform="translate(505, 430)">
      <circle r="44" fill="#141715" stroke="#2E3530" strokeWidth="4" />
      <circle r="28" fill="#232925" stroke="#8C968E" strokeWidth="2" />
      <circle r="9" fill="#D8F36A" />
      <line x1="-24" y1="0" x2="24" y2="0" stroke="#8C968E" strokeWidth="3" />
      <line x1="0" y1="-24" x2="0" y2="24" stroke="#8C968E" strokeWidth="3" />
    </g>
  </svg>
);

export const ChargerThumbPlate: React.FC<{
  theme: 'driveway-canopy' | 'stilt-pillar' | 'courtyard-bay' | 'bungalow-gate';
  powerKw: number;
  connector: string;
}> = ({ theme, powerKw, connector }) => {
  const bgMap = {
    'driveway-canopy': '#173D2C',
    'stilt-pillar': '#22251F',
    'courtyard-bay': '#1F4B37',
    'bungalow-gate': '#2B332C',
  };

  return (
    <svg
      viewBox="0 0 360 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full object-cover"
      role="img"
      aria-label={`${connector} ${powerKw} kW residential charger illustration`}
    >
      <rect width="360" height="200" fill={bgMap[theme]} />
      {/* Subtle architectural grid lines */}
      <line x1="0" y1="148" x2="360" y2="148" stroke="#F6F3E9" strokeOpacity="0.14" strokeWidth="1" />
      <line x1="240" y1="0" x2="240" y2="200" stroke="#F6F3E9" strokeOpacity="0.12" strokeWidth="1" />

      {/* Architectural Pillar & Mounted Wallbox */}
      <rect x="248" y="20" width="76" height="130" fill="#E6E0CE" />
      <rect x="266" y="48" width="40" height="58" rx="5" fill="#173D2C" stroke="#22251F" strokeWidth="2" />
      <rect x="274" y="57" width="24" height="4" rx="2" fill="#D8F36A" />
      <rect x="274" y="67" width="24" height="14" rx="2" fill="#0F261C" />
      <circle cx="286" cy="92" r="4" fill="#D8F36A" />

      {/* Simplified EV Side Profile */}
      <path
        d="M36 132 L58 98 C66 88, 82 84, 106 84 L182 84 C198 84, 212 92, 224 108 L242 118 L242 142 L36 142 Z"
        fill="#F6F3E9"
        fillOpacity="0.92"
      />
      <circle cx="76" cy="142" r="16" fill="#22251F" stroke="#D8F36A" strokeWidth="2" />
      <circle cx="198" cy="142" r="16" fill="#22251F" stroke="#D8F36A" strokeWidth="2" />

      {/* Charging Cable Arc */}
      <path
        d="M286 96 C286 132, 252 136, 218 118"
        stroke="#D8F36A"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Top Left Technical Readout Tag (Unboxed architectural typography) */}
      <text x="18" y="32" fill="#D8F36A" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
        {powerKw.toFixed(1)} kW · {connector}
      </text>
    </svg>
  );
};

export const IdleCapacityDiagram: React.FC = () => (
  <svg
    viewBox="0 0 640 320"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-full h-auto"
    role="img"
    aria-label="24-hour timeline showing private residential charger usage versus unused daytime and evening capacity"
  >
    <rect width="640" height="320" rx="4" fill="#173D2C" />
    {/* Header inside diagram */}
    <text x="28" y="42" fill="#F6F3E9" fontSize="15" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="600">
      Typical Residential Wallbox Duty Cycle (24-Hour Window)
    </text>
    <text x="28" y="64" fill="#D8D5CA" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif">
      Most private home chargers actively draw power for only one overnight session every few days.
    </text>

    {/* 24-Hour Ruler */}
    <g transform="translate(28, 96)">
      <rect x="0" y="0" width="584" height="58" rx="3" fill="#0F291E" stroke="#31614A" strokeWidth="1" />
      {/* Owner Overnight Use (00:00 to 04:30) */}
      <rect x="6" y="6" width="108" height="46" rx="2" fill="#376B52" />
      <text x="60" y="33" textAnchor="middle" fill="#F6F3E9" fontSize="11" fontFamily="JetBrains Mono, monospace">
        Owner Charge
      </text>

      {/* Shareable Window (08:00 to 21:30) */}
      <rect x="190" y="6" width="330" height="46" rx="2" fill="#D8F36A" />
      <text x="355" y="28" textAnchor="middle" fill="#173D2C" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="700">
        IDLE DRIVEWAY CAPACITY (08:30 – 21:30)
      </text>
      <text x="355" y="44" textAnchor="middle" fill="#173D2C" fontSize="10" fontFamily="Plus Jakarta Sans, sans-serif" fontWeight="600">
        Reservable by verified neighbourhood drivers on ChargeShare
      </text>

      {/* Time Ticks */}
      <g fill="#D8D5CA" fontSize="10" fontFamily="JetBrains Mono, monospace">
        <text x="0" y="78">00:00</text>
        <text x="146" y="78">06:00</text>
        <text x="292" y="78">12:00</text>
        <text x="438" y="78">18:00</text>
        <text x="554" y="78">24:00</text>
      </g>
    </g>

    {/* Bottom Comparison Row */}
    <line x1="28" y1="204" x2="612" y2="204" stroke="#2D5A44" strokeWidth="1" />

    <g transform="translate(28, 224)">
      <text x="0" y="18" fill="#D8F36A" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
        01. EXISTING CONDUIT & METER
      </text>
      <text x="0" y="40" fill="#F6F3E9" fontSize="13" fontFamily="Plus Jakarta Sans, sans-serif">
        Sanctioned domestic load & RCCB protection already installed at home.
      </text>
      <text x="0" y="60" fill="#B5C7BD" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif">
        Zero civil digging or new transformer delays required.
      </text>
    </g>

    <g transform="translate(332, 224)">
      <text x="0" y="18" fill="#D8F36A" fontSize="12" fontFamily="JetBrains Mono, monospace" fontWeight="600">
        02. SCHEDULED NEIGHBOUR ACCESS
      </text>
      <text x="0" y="40" fill="#F6F3E9" fontSize="13" fontFamily="Plus Jakarta Sans, sans-serif">
        Hosts approve exact time windows and charge per kWh delivered.
      </text>
      <text x="0" y="60" fill="#B5C7BD" fontSize="12" fontFamily="Plus Jakarta Sans, sans-serif">
        Turns an idle wallbox into predictable neighbourhood infrastructure.
      </text>
    </g>
  </svg>
);
