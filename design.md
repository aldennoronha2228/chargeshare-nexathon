---
name: Monochrome Editorial Modernist
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0edec'
  surface-container-high: '#ebe7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1c1b1b'
  on-surface-variant: '#444748'
  inverse-surface: '#313030'
  inverse-on-surface: '#f3f0ef'
  outline: '#747878'
  outline-variant: '#c4c7c7'
  surface-tint: '#5f5e5e'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1c1b1b'
  on-primary-container: '#858383'
  inverse-primary: '#c9c6c5'
  secondary: '#5e5f5c'
  on-secondary: '#ffffff'
  secondary-container: '#e0e0dc'
  on-secondary-container: '#626360'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1c18'
  on-tertiary-container: '#85847e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e1'
  primary-fixed-dim: '#c9c6c5'
  on-primary-fixed: '#1c1b1b'
  on-primary-fixed-variant: '#474646'
  secondary-fixed: '#e3e2df'
  secondary-fixed-dim: '#c7c7c3'
  on-secondary-fixed: '#1b1c1a'
  on-secondary-fixed-variant: '#464744'
  tertiary-fixed: '#e4e2db'
  tertiary-fixed-dim: '#c8c6c0'
  on-tertiary-fixed: '#1b1c18'
  on-tertiary-fixed-variant: '#474742'
  background: '#fcf9f8'
  on-background: '#1c1b1b'
  surface-variant: '#e5e2e1'
typography:
  headline-hero:
    fontFamily: Space Grotesk
    fontSize: 5.5rem
    fontWeight: '700'
    lineHeight: 5rem
    letterSpacing: -0.04em
  headline-hero-mobile:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3rem
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 3rem
    fontWeight: '700'
    lineHeight: 3.25rem
    letterSpacing: -0.03em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '700'
    lineHeight: 2.25rem
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 2rem
    fontWeight: '600'
    lineHeight: 2.375rem
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 1.375rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 1.125rem
    fontWeight: '400'
    lineHeight: 1.75rem
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 0.9375rem
    fontWeight: '400'
    lineHeight: 1.5rem
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.375rem
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Space Grotesk
    fontSize: 0.6875rem
    fontWeight: '600'
    lineHeight: 0.875rem
    letterSpacing: 0.14em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 0.8125rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.04em
  code-num:
    fontFamily: Space Grotesk
    fontSize: 0.875rem
    fontWeight: '500'
    lineHeight: 1.125rem
    letterSpacing: 0.02em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-desktop: 2.5rem
  margin: 1.25rem
  margin-desktop: 4rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
  space-2xl: 4rem
  space-3xl: 6rem
---

## Brand & Style

This design system synthesizes high-end architectural fashion editorial aesthetics with utilitarian precision technology. Drawing visual inspiration from brutalist clarity, Swiss typography, and restrained luxury, it treats software interface surfaces like high-gauge editorial paper and precision-milled hardware. 

The emotional signature is quiet confidence, surgical exactness, and timeless sophistication. Rather than relying on synthetic glows, vivid gradients, or decorative clutter, the interface achieves visual hierarchy strictly through scale contrasts, razor-sharp architectural layout lines, tactile warm-stone background layers, and authoritative typography. It addresses users who value discerning taste, premium craft, and immediate clarity.

## Colors

The palette is intentionally disciplined, anchored in high-contrast optical blacks, pure architectural whites, and warm ash stone neutrals:

- **Primary Tone (`#0D0D0D`)**: Deep pitch black with zero muddy tint, applied to dominant typographic headlines, primary buttons, structural dividing rules, and high-impact hero fields.
- **Secondary Canvas (`#F5F4F0`)**: An understated, warm gallery ash that evokes high-grammage uncoated paper. It acts as the hero background surface to soften raw screen fatigue.
- **Tertiary Surface & Borders (`#E3E1DA` / `#ECEBE6`)**: Refined architectural stone tone used for crisp 1px structural dividing lines, subtle secondary container backgrounds, and inactive elements.
- **Micro Accents & Supporting Neutrals**: Deep graphite (`#222222`) for body text, muted warm slate (`#787670`) for secondary metadata and tracking labels, and optical white (`#FFFFFF`) for inverted hero elements, active states, and crisp contrast badges.

## Typography

Typography establishes the architectural framework of the interface. We apply a sharp dichotomy between:
1. **Oversized, Tight Geometric Display**: Set in `Space Grotesk` with tight negative tracking, bold structural cuts, and compressed line-heights. Display headlines anchor sections with magazine masthead authority.
2. **Spacious Tracked Micro-Labels**: Set in uppercase `Space Grotesk` with expanded tracking (`0.14em`). Used for categorization tags, technical parameters, status headers, and collection indicators.
3. **Neutral Analytical Body**: Set in `Inter` for optimal reading clarity at functional sizes, providing a low-friction counterbalance to the expressive headline forms.

## Layout & Spacing

The layout is built upon an intentional 12-column Swiss grid system that emphasizes asymmetric column balancing, disciplined vertical cadence, and architectural breathing room.

- **Desktop (1024px+)**: 12-column fluid grid, `4rem` outer canvas padding, `2.5rem` gutters. Blocks alternate between full-bleed contrasting zones (e.g., solid pitch black ribbons shifting to warm stone canvases) and tight modular cells.
- **Tablet (768px – 1023px)**: 8-column grid with `2rem` margins and `1.5rem` gutters.
- **Mobile (<768px)**: 4-column grid with `1.25rem` canvas margins and `1rem` gutters. Stacks vertically while preserving intentional white space around key editorial headlines.

Vertical rhythm relies on generous intervals (`space-2xl` and `space-3xl`) between distinct thematic sections, separated by hairline rules (`1px solid #E3E1DA` or `1px solid #222222` in dark zones).

## Elevation & Depth

This system intentionally rejects floating multi-tier drop shadows, skeuomorphic glows, and glassmorphic blurs in favor of architectural, flat planar layering:

- **Tonal Plane Transition**: Hierarchy is achieved by alternating foundational surface values: `#F5F4F0` (Gallery Canvas), `#FFFFFF` (Elevated Tile/Card), `#EAE8E2` (Recessed Sub-panel), and `#0D0D0D` (Inverted Monolith Section).
- **Hairline Framing**: Surface containers and card boundaries are established with razor-thin, uniform 1px structural outlines (`#E3E1DA` in light mode, `#222222` in dark mode).
- **Hard Hover Displacement**: When interactive cards or buttons are engaged, depth is conveyed through sharp visual state shifts—such as full tonal inversion (white background transitioning immediately to deep black) or subtle 1px border value shifts—rather than blurred elevation shadows.

## Shapes

The shape vocabulary emphasizes architectural precision, crisp edges, and bespoke tailoring:

- **Standard Elements (Corners `4px` / `roundedness: 1`)**: Buttons, cards, and input fields utilize an understated 4px corner radius. This softens the transition without drifting into playful or generic rounded territory.
- **Pill Badges (`9999px`)**: Micro-status badges, category filters, and live telemetry pills use fully rounded capsule shapes to provide deliberate geometry contrast against rectangular cards.
- **Hairlines**: Dividing rules, section bounds, and grid outlines maintain an absolute 1px thickness across all display densities.

## Components

### Buttons
- **Primary Action**: Crisp rectangular solid black (`#0D0D0D`) background, stark white text, 4px border radius. Padding: `14px 28px`. Typography: `label-caps`. Hover states invert to white background with a sharp 1px black outline.
- **Secondary / Ghost Action**: Transparent fill with a 1px solid `#0D0D0D` border, deep black text. Hover state shifts background to `#0D0D0D` with white text.
- **Inline Link Action**: Minimalist text button with an arrow glyph (`→`), underlined by a crisp 1px rule placed 4px below baseline.

### Cards & Modular Containers
- **Product & Telemetry Cards**: Built over pure white or warm ash backing with a strict 1px border in `#E3E1DA`. Internal padding: `space-lg` (`1.5rem`). No diffuse drop shadows. Image containers maintain an editorial 4:5 or 16:10 aspect ratio with subtle zoom on hover.
- **Inverted Dark Sections**: Monolithic dark blocks (`#0D0D0D`) featuring bone-white typography (`#FFFFFF`), muted metadata (`#787670`), and 1px borders in `#222222`.

### Badges & Status Chips
- **Category & Filter Pills**: Pill capsules (`rounded-full`) with 1px border in `#0D0D0D` or `#E3E1DA`. Label set in uppercase `label-caps`.
- **Live Status Badges**: Compact pill badge featuring a solid 6px dot indicator (green or white) alongside clean uppercase status text.

### Input Fields & Controls
- **Form Inputs**: Architectural bottom-border style (1px solid `#0D0D0D`) or crisp 4px rounded rectangles with `#E3E1DA` borders. Focus states trigger a razor-sharp 1px `#0D0D0D` border with zero glow ring.
- **Checkboxes & Radios**: Custom square and circular form factors with 1px black borders. Active selections are filled with a solid `#0D0D0D` center.

### Data Tables & Technical Metrics
- Strict tabular figures using `Space Grotesk` with hairline borders separating metrics rows. Headers formatted in uppercase `label-caps` with wide letter spacing.