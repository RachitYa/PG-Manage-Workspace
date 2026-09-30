---
name: Serene Stay Management
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#3e484f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#6e7880'
  outline-variant: '#bdc8d0'
  surface-tint: '#006689'
  primary: '#006386'
  on-primary: '#ffffff'
  primary-container: '#007da8'
  on-primary-container: '#fbfcff'
  inverse-primary: '#78d1ff'
  secondary: '#4a626d'
  on-secondary: '#ffffff'
  secondary-container: '#cde6f4'
  on-secondary-container: '#506873'
  tertiary: '#4c5f66'
  on-tertiary: '#ffffff'
  tertiary-container: '#65777f'
  on-tertiary-container: '#fafdff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#c3e8ff'
  primary-fixed-dim: '#78d1ff'
  on-primary-fixed: '#001e2c'
  on-primary-fixed-variant: '#004c68'
  secondary-fixed: '#cde6f4'
  secondary-fixed-dim: '#b1cad7'
  on-secondary-fixed: '#051e28'
  on-secondary-fixed-variant: '#334a55'
  tertiary-fixed: '#d2e6ef'
  tertiary-fixed-dim: '#b6cad2'
  on-tertiary-fixed: '#0b1e24'
  on-tertiary-fixed-variant: '#374951'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  headline-lg:
    fontFamily: Manrope
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 30px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  gutter: 16px
  margin-mobile: 20px
  container-max-width: 1200px
---

## Brand & Style

The design system is centered on the "Serene" philosophy—transforming the often stressful process of PG (Paying Guest) and co-living management into a calm, frictionless experience. The target audience includes modern urban professionals and students who value efficiency, transparency, and a premium lifestyle.

The aesthetic leans heavily into **Minimalism** with a **Tactile** touch. It avoids the harshness of traditional management software by using soft color transitions, ample white space, and subtle depth. The UI should feel like a high-end hospitality app rather than a utility tool, evoking a sense of trust, cleanliness, and modern comfort.

**Key Visual Principles:**
- **Clarity over Density:** Information is layered and spaced to prevent cognitive overload.
- **Soft Precision:** Every corner is rounded, but the grid remains disciplined and aligned.
- **Premium Interaction:** Use of micro-interactions and high-quality line iconography to provide a sophisticated mobile-first feel.

## Colors

The palette is anchored by a vibrant yet soothing **Sky Blue** primary color, directly inspired by the reference imagery. This color is used for active states, primary actions, and brand reinforcement.

- **Primary (#0099CC):** Used for CTA buttons, active selection borders, and key icons.
- **Secondary (#78909C):** A muted blue-grey used for secondary text and supportive UI elements to maintain high legibility without the harshness of pure black.
- **Tertiary (#E1F5FE):** A very soft wash used for background containers, card highlights, and subtle hover states.
- **Neutral (#F8F9FA):** The foundation of the UI, providing a clean canvas that emphasizes the content.

The system defaults to a **Light Mode** to maintain a fresh, airy "daytime" feel, though the tokens are structured to support a future dark mode with deep navy backgrounds.

## Typography

This design system utilizes **Manrope** for its core structural elements. Its geometric but slightly condensed nature provides a modern, high-tech look that remains highly legible on mobile screens. 

For labels and interactive micro-copy, **Plus Jakarta Sans** is employed. Its wider apertures and rounded terminals add a friendly, welcoming touch to buttons and tags.

**Hierarchy Guidance:**
- **Headlines:** Use tight letter-spacing for large headlines to create a "display" feel.
- **Body:** Standard spacing for maximum readability during long-form content like rental agreements.
- **Labels:** Used for tags, amenities, and category markers (e.g., "Available", "Maintenance").

## Layout & Spacing

The layout philosophy follows a **Fluid Grid** model with a base unit of **4px**. This ensures all elements align to a consistent rhythm, creating a sense of professional polish.

- **Mobile:** A 4-column grid with 20px side margins and 16px gutters. This provides enough room for card-based layouts (like the amenities grid) to feel breathable.
- **Desktop:** A 12-column centered grid with a max-width of 1200px. 
- **Spacing Logic:** Vertical rhythm should prioritize larger gaps between distinct sections (e.g., 32px) and tighter gaps between related items (e.g., 8px between an icon and its label).

When displaying amenity grids (as seen in the reference), use a flexible 3-column wrap on mobile to ensure touch targets remain large and accessible.

## Elevation & Depth

To achieve a "premium mobile" feel, this design system moves away from heavy shadows in favor of **Tonal Layering** and **Soft Ambient Occlusion**.

- **Level 0 (Base):** Neutral background (#F8F9FA).
- **Level 1 (Cards/Sheets):** White surfaces with a very subtle 1px border (#E0E0E0) or a low-opacity shadow (4px blur, 2% opacity black).
- **Level 2 (Interactive/Active):** Elements that are selected or being interacted with gain a primary-colored border (1.5px) and a soft tinted shadow that matches the primary color (8px blur, 10% opacity primary color).
- **Backdrop Blurs:** Use a 12px blur for modals and bottom sheets to maintain context of the underlying screen while focusing the user's attention.

## Shapes

The shape language is consistently **Rounded**. This choice mirrors the "Serene" brand personality, avoiding sharp corners that can feel aggressive or overly corporate.

- **Standard Elements (Buttons, Inputs):** 0.5rem (8px) radius.
- **Large Elements (Cards, Modals):** 1rem (16px) radius.
- **Extra Large (Hero sections, Bottom Sheets):** 1.5rem (24px) radius on top corners.
- **Icon Containers:** Use a "Squircle" or soft-square approach (8px-12px) to frame high-quality line icons, as seen in the reference grid.

## Components

### Buttons & Chips
- **Primary Button:** Solid primary color with white text. Height: 48px for mobile. 
- **Secondary/Outlined:** 1.5px primary color border with transparent background.
- **Chips (Amenities):** As shown in the reference, these are white cards with thin grey borders that turn primary-blue when active. Icons should be centered and consistently sized (24px).

### Input Fields
- Use a light grey background (#F1F3F4) with no border in the default state. 
- Upon focus, the background turns white and gains a 1.5px primary blue border.
- Placeholder text should use the secondary color at 50% opacity.

### Lists & Cards
- **Property Cards:** Use a 16px corner radius. Images should have a subtle inner shadow to ensure text overlays are readable.
- **List Items:** Separated by 1px light grey lines, with 16px vertical padding to ensure comfortable tap targets.

### Iconography
- Icons must be **Linear** with a 1.5pt or 2pt stroke weight.
- Use a consistent bounding box for all icons to ensure visual alignment in grids.
- Active icons can use a "duotone" style where the primary color is used for the stroke and a 10% opacity primary color is used for a fill.