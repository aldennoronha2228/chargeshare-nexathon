---
name: Warm Editorial Mobility
colors:
  surface: '#fcf9f2'
  surface-dim: '#dcdad3'
  surface-bright: '#fcf9f2'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3ec'
  surface-container: '#f1eee7'
  surface-container-high: '#ebe8e1'
  surface-container-highest: '#e5e2db'
  on-surface: '#1c1c18'
  on-surface-variant: '#414944'
  inverse-surface: '#31312c'
  inverse-on-surface: '#f3f0e9'
  outline: '#717974'
  outline-variant: '#c1c8c2'
  surface-tint: '#3d6754'
  primary: '#00271a'
  on-primary: '#ffffff'
  primary-container: '#133e2e'
  on-primary-container: '#7ea994'
  inverse-primary: '#a4d0ba'
  secondary: '#546500'
  on-secondary: '#ffffff'
  secondary-container: '#caee34'
  on-secondary-container: '#576a00'
  tertiary: '#04271c'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c3d31'
  on-tertiary-container: '#85a898'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#bfedd5'
  primary-fixed-dim: '#a4d0ba'
  on-primary-fixed: '#002115'
  on-primary-fixed-variant: '#254e3d'
  secondary-fixed: '#cdf137'
  secondary-fixed-dim: '#b2d40f'
  on-secondary-fixed: '#171e00'
  on-secondary-fixed-variant: '#3e4c00'
  tertiary-fixed: '#c6ebd9'
  tertiary-fixed-dim: '#abcebe'
  on-tertiary-fixed: '#002116'
  on-tertiary-fixed-variant: '#2d4d40'
  background: '#fcf9f2'
  on-background: '#1c1c18'
  surface-variant: '#e5e2db'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '800'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '800'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 26px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 22px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes an authentic, tactile eco-mobility platform for neighborhood EV charging sharing. Rejecting the cliché trope of futuristic neon-on-black telemetry dashboards, it adopts an organic, human-first editorial aesthetic. The UI draws influence from architectural monographs and sustainable Nordic lifestyle periodicals: crisp daylight lighting, generous negative space, earthy material honesty, and deliberate typographic rhythm.

The experience evokes quiet confidence, communal hospitality, and environmental stewardship. Interfaces feel grounded, warm, and distinctly consumer-grade rather than commercial fleet software. A hyper-focused neon-lime accent provides high-energy contrast exclusively for critical primary decisions and live states, functioning as an electrical spark against an earthy landscape.

## Colors

The palette balances pastoral grounding with synthetic energy:

- **Primary (`#133E2E`)**: Rich pine forest green. Used for structural typography, prominent display titles, deep container headers, and authoritative iconography. It anchors the interface without the sterility of pure black.
- **Secondary (`#CEF238`)**: Electric lime spark. Reserved strictly for conversion actions (booking, starting a session, primary call-to-actions), active hardware states, and interactive accents. It provides vibrant legibility against both deep pine and soft stone.
- **Tertiary (`#4A6B5D`)**: Sage moss. Supports secondary navigation, subtle meta tags, badge fills, and structural divider rules.
- **Neutral (`#F4F1EA`)**: Warm linen/cream canvas. Acts as the primary base page backdrop, avoiding the clinical glare of `#FFFFFF`. Layered containers utilize `#EBE6DC` for subtle physical depth, while pure `#FFFFFF` is used sparingly for foreground card content to maintain punchy contrast.
- **Body Text**: Mapped to `#1A2E26`, ensuring high-contrast legibility while preserving the organic green-tinted undertone.

## Typography

The typographic hierarchy combines the sculptural geometry of Plus Jakarta Sans with the technical utility of Inter:

- **Headlines & Titles**: Styled with Plus Jakarta Sans using tight negative tracking (`-0.02em` to `-0.03em`) and heavier weights (600 to 800). This provides an authoritative editorial presence resembling print publications.
- **Body & Numerical Readouts**: Handled by Inter to guarantee absolute clarity for battery percentages, charging rates (kW/hr), pricing tables, and address details.
- **Labels & Micro-copy**: Employs uppercase tracking (`label-caps`) for charger port types (CCS, NACS, J1772), host verification tags, and operational states.

## Layout & Spacing

The layout is built on a responsive 12-column fluid grid on desktop, 8 columns on tablet, and a 4-column structure on mobile devices:

- **Canvas Limits**: Max container width is fixed at `1280px` to maintain comfortable eye-scanning lines reminiscent of open magazines.
- **Padding Cadence**: Internal card structures use `space-md` (16px) on mobile and `space-lg` (24px) on desktop to create breathing room between data groups.
- **Section Breaks**: Generous vertical rhythm (`space-xl` or larger) separates booking timelines, interactive host cards, and payment summaries, avoiding cluttered dashboard density.

## Elevation & Depth

This design system avoids heavy drop shadows and artificial skeuomorphic bevels, creating physical depth through warm architectural planes and subtle tactile borders:

- **Surface Layering**:
  - Base: `#F4F1EA` (Canvas)
  - Recessed/Grouped: `#EBE6DC` (Secondary card wrappers, calendar blocks)
  - Elevated/Interactive: `#FFFFFF` (Primary action cards, modal panels)
- **Border Treatment**: Clean, structural outlines using `#133E2E` at 8%–12% opacity (`rgba(19, 62, 46, 0.08)`) create separation between cards without visual weight.
- **Ambient Shadows**: Shadows are utilized minimally. Elevated modals and floating sticky booking rails feature a warm, ambient cast: `0px 12px 32px -4px rgba(19, 62, 46, 0.08)`. The green undertone anchors the shadow naturally to the linen background.

## Shapes

The shape system adopts a rounded geometry (Level 2). This provides an organic, approachable feel that aligns with domestic charging spaces:

- Standard controls, chips, and input textboxes feature `0.5rem` (8px) corner radii.
- Content cards, host profile cards, and map view preview overlays use `1rem` (16px) corner radii.
- Large modal dialogs and bottom sheets on mobile scale to `1.5rem` (24px) top-corner curvature.
- Badges and status pills strictly retain full pill curvature (`9999px`) to distinguish meta labels from interactive containers.

## Components

### Buttons
- **Primary Action (The Spark)**: Background `#CEF238` with text `#133E2E` (Weight: 700). Hover shifts background brightness subtly downwards (`#BFDE30`), accompanied by a 1px downward translation.
- **Secondary (Forest Base)**: Background `#133E2E` with text `#F4F1EA`. Ideal for secondary confirmations and filters.
- **Tertiary / Outline**: Ghost style with 1px border (`rgba(19, 62, 46, 0.2)`), transparent background, and `#133E2E` text.

### Cards & Tile Containers
- Crafted with a `#FFFFFF` face sitting atop `#EBE6DC` backsplashes or the `#F4F1EA` canvas.
- Framed by a subtle 1px border (`rgba(19, 62, 46, 0.08)`).
- Padding scales from `16px` (compact mobile card) to `24px` (desktop charger overview).

### Chips & Filters
- **Default State**: Surface `#EBE6DC`, text `#1A2E26`, pill-shaped radius.
- **Active / Selected State**: Surface `#133E2E`, text `#F4F1EA`, paired with a small `#CEF238` indicator dot for active amenity/speed filters (e.g., "50 kW+", "Driveway", "Solar Powered").

### Input Fields
- Background is flat `#FFFFFF`, enclosed by a 1.5px solid border in `rgba(19, 62, 46, 0.15)`.
- Focused state transitions the border to solid `#133E2E` with a subtle outline ring (`rgba(206, 242, 56, 0.5)`).
- Labels sit above inputs in `Plus Jakarta Sans` 600 weight, `#133E2E`.

### Checkboxes & Radio Buttons
- Square inputs adopt a 4px rounded radius; radio buttons are fully circular.
- Border in unselected state is 1.5px `#4A6B5D`.
- Selected state fills with `#133E2E` featuring a crisp `#CEF238` checkmark or center pip.

### EV-Specific Domain Components
- **Charging Progress Bar**: A track in `#EBE6DC` with an animated fill in `#133E2E`, capped by an energetic `#CEF238` pulse head indicating live power delivery.
- **Power Rating Pill**: A `#133E2E` dark pill with high-contrast `#CEF238` text denoting kW delivery rate and hardware connector icons.