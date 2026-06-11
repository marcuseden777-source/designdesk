# Editorial Modern Design Specification - 2026-06-10

## 1. Design Philosophy
The "Editorial Modern" aesthetic transforms the interior design application from a utility into a curated, immersive showcase. It emphasizes high-impact imagery, dynamic layering, and intentional asymmetry to create a premium, magazine-like experience.

## 2. Design System

### Typography
- **Headers**: Serif, high-contrast (e.g., *Playfair Display*). Used for titles and key structural headings.
- **UI Controls**: Sans-serif, functional (e.g., *Montserrat*). Used for buttons, labels, and metadata.

### Color Palette
- **Primary**: Deep Charcoal (`#1a1a1a`) - Text, core architecture.
- **Surface**: Warm Off-White (`#fdfcf8`) - Backgrounds, surfaces.
- **Accent**: Muted Terracotta (`#b85c38`) - Primary CTAs, active states.

### Layout Logic
- **Asymmetry**: Move away from rigid vertical stacks to layered, asymmetrical grids.
- **Bleed-off**: Cards and images should bleed off the screen edges to create an expansive feel.
- **Layering**: Use offset containers to create visual depth between images and data.

## 3. Component Specs

### Cards (Projects/Materials)
- **Structure**: Offset layering. Edge-to-edge image container. Info-overlay (30-40% opacity, warm off-white) holding metadata.
- **Geometry**: Sharp or subtle 2px rounded corners.
- **Interaction**: Image scale (1.02x) + elevated shadow on hover.

### Buttons (Primary/CTA)
- **Primary**: Terracotta background, white text, capitalized, sharp edges.
- **Secondary**: Outlined (1px Charcoal border), transparent background. Hover: 2px border, color inversion.

### Inputs
- **Style**: No box containers. Simple 1px Charcoal border-bottom.
- **Focus**: 2px border-bottom, label shifts to Terracotta.

## 4. Responsive Strategy

### Mobile-First
- **Scrolling**: Prioritize vertical storytelling.
- **Fixed Elements**: Pinned metadata as semi-transparent bottom sheet.

### Web Expansion
- **Grid**: Dynamic asymmetrical masonry grid for project showcases.
- **Layering**: Increased use of offset layering and overlapping containers on large screens.
