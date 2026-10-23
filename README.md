# ChargeShare — Peer-to-Peer EV Charging Marketplace (3D Web Experience)

ChargeShare is an interactive 3D web experience and marketplace for discovering, booking, and hosting private residential EV chargers across India.

## Tech Stack
- **Frontend**: React 19, TypeScript, Tailwind CSS v4
- **3D Engine**: Three.js (`WebGLRenderer`, `RoomEnvironment` IBL, procedural `CanvasTexture` telemetry & terrain, scroll-interpolated camera keyframes)
- **Icons**: Lucide React
- **Build Tool**: Vite
- **Unit Testing**: Node.js built-in test runner (`node:test` via `tsx`)

## Project Structure
```text
chargeshare/
├── index.html                           # Entry HTML with SEO, OpenGraph & Schema.org JSON-LD
├── metadata.json                        # Application metadata
├── package.json                         # Scripts and dependencies
├── tsconfig.json                        # TypeScript configuration
├── vite.config.ts                       # Vite bundler configuration
├── .env.example                         # Environment variable template
├── README.md                            # Setup and architecture documentation
└── src/
    ├── main.tsx                         # React DOM entry point
    ├── App.tsx                          # Root 7-chapter 3D narrative & marketplace controller
    ├── index.css                        # Tailwind CSS v4 & typography tokens
    ├── data/
    │   └── demoChargers.ts              # Realistic Indian EV charger listings & sample host data
    ├── utils/
    │   ├── marketplaceLogic.ts          # Pure functions for earnings calculation, filtering, validation & scroll chapters
    │   └── marketplaceLogic.test.ts     # Unit tests (run with `npx tsx --test src/utils/marketplaceLogic.test.ts`)
    ├── three/
    │   ├── SceneLighting.ts             # IBL environment, directional shadow rig, hemisphere fill & software-GL detection
    │   ├── ChargerModel.ts              # Articulated 10-part 3D Wallbox, OLED CanvasTexture, cable & energy pulses
    │   ├── NeighbourhoodScene.ts        # Miniature Indian residential block, clearcoat Electric SUV, trees & network arcs
    │   └── ScrollSceneController.ts     # 7-chapter camera keyframes, pointer parallax & exponential damping
    └── components/
        ├── Navbar.tsx                   # Persistent top navigation & announcement strip
        ├── HeroScene.tsx                # Chapter 01 (Discover) 3D WebGL stage, raycast interactions & bottom 3D control dock
        ├── StoryChapters.tsx            # Chapter 02 (Connect) & Chapter 04 (Book & Charge) 3D-synced sections
        ├── DiscoverySection.tsx         # Chapter 03 (Find Your Charger) interactive map, filters & slot booking drawer
        ├── InteractiveRoleShowcase.tsx  # Dual-perspective Driver EV range planner & Host request simulator
        ├── EarningsCalculatorSection.tsx# Chapter 05 (Share Your Charger) live INR host proceeds calculator
        ├── SafetyAndFeatureShowcase.tsx # Chapter 06 (Trust & Safety) verification & marketplace capabilities
        ├── IndiaMobilityAndConversion.tsx# Chapter 07 (Final Conversion) dual pathways & footer
        ├── InteractiveModals.tsx        # Host listing onboarding modal, Sign-in/Reservations modal & Policy modal
        └── EditorialIllustrations.tsx   # Procedural SVG architectural fallback poster & hardware diagrams
```

## Quick Start (Local Development)

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Start the development server** (runs on `http://localhost:3000`):
   ```bash
   npm run dev
   ```

3. **Run unit tests**:
   ```bash
   npx tsx --test src/utils/marketplaceLogic.test.ts
   ```

4. **Type-check and build for production**:
   ```bash
   npm run lint
   npm run build
   ```
