# Jewelry Factory System — Design System & UI Guidelines

This document outlines the design system, theming architecture, and UI/UX guidelines for the Jewelry Factory System (PO Tracker) frontend. The design is tailored for a modern, high-fidelity ERP application with a focus on rich aesthetics, premium feel, and dynamic interactions.

## 1. Theming Architecture

The application supports multiple themes using CSS variables (`oklch` color space for smooth gradients and perceptual uniformity). Themes are toggled via CSS classes on the `<body>` element.

### Available Themes
1. **Modern Dark (Default)**: A sleek, deep grayish-blue (`oklch` hue 250) interface with vibrant blue-indigo brand accents.
2. **Dark Gold (`.theme-dark-gold`)**: An "Executive" theme featuring warm, rich gold accents against a deep dark background.
3. **Royal White (`.theme-royal-white`)**: A crisp light mode prioritizing high contrast, using Royal Blue and Gold highlights for a premium enterprise feel.

## 2. Color Palette (Modern Dark Default)

### Core UI Colors
* **Brand (Blue-Indigo)**: `--color-brand-500` (Main accent color)
* **Surfaces**: `--color-surface-0` through `--color-surface-900` (Deep grayish-blue for depth and elevation)
* **Text**: High contrast white/off-white (`--color-text-primary`) down to muted tones (`--color-text-quaternary`) for hierarchy.
* **Borders**: Subtle light borders (`--color-border-light`) for glassmorphism and clean separation.

### Semantic Colors
* **Success**: Green (`--color-success-500`)
* **Danger/Error**: Red (`--color-danger-500`)
* **Warning**: Amber/Yellow (`--color-warning-500`)
* **Info**: Blue (`--color-info-500`)

### Factory Production Process Stages
Specific colors are assigned to production stages to provide immediate visual context across tables and charts:
* **Casting**: Soft Slate Blue (`--color-proc-casting`)
* **Grinding**: Soft Amethyst Violet (`--color-proc-grinding`)
* **Polishing**: Vibrant Mint Green (`--color-proc-polishing`)
* **Plating**: Rich Gold Plating (`--color-proc-plating`)
* **QC**: Alert Orange (`--color-proc-qc`)
* **Packing**: Forest Green (`--color-proc-packing`)

### Chart & Data Visualization
Chart series use a 6-color sequential palette:
1. Warm Amber (`--color-chart-1`)
2. Emerald (`--color-chart-2`)
3. Violet (`--color-chart-3`)
4. Pink (`--color-chart-4`)
5. Rose Red (`--color-chart-5`)
6. Cyan (`--color-chart-6`)

*(Note: Customer Groups like N008, N044, MLT are mapped directly to these chart colors for consistency across analytics).*

## 3. Typography

The application utilizes Google Fonts for a modern, readable typography stack:
* **Logo/Branding**: `Cinzel` (Serif, elegant and premium)
* **Display & Headings**: `Roboto` (Clean, geometric sans-serif)
* **Body Text**: `Roboto` (Highly readable for data-dense tables)
* **Additional/Fallback**: `Outfit`, `Kanit`, `Inter`.

## 4. UI Components & Micro-interactions

### Inputs (Floating Labels)
Forms use a Material Design-inspired "Floating Label" pattern.
* Inputs have a transparent background with a rounded border (`12px` radius).
* On focus, the border highlights in the brand color (`--color-brand-500`) and the label scales down and floats to the top edge.

### Modals & Galleries (e.g., PhotoGalleryModal)
* **Glassmorphism**: Modals use surface colors with subtle borders (`1px solid var(--color-border-light)`) and soft rounded corners (`10px`).
* **Interactive Viewports**: Image galleries feature symmetrical magnifier frames and zoomable viewports with dynamic background contrasts (`--color-surface-2`).

### Animations & Dynamics
Micro-animations are used extensively to make the interface feel responsive and alive:
* **`fadeInUp`**: Used for staging lists and cards entering the viewport.
* **`skeletonShimmer`**: Smooth loading states for data fetching.
* **`pulseGlow`**: Used on active indicators (like the Sidebar active dot) to draw attention softly.
* **`accentShimmer`**: A continuous shimmer effect on brand accent lines.
* **Staggered Delays**: CSS utility classes (`.stagger-1` through `.stagger-5`) are used to cascade animations smoothly on list items.

## 5. Layout & Navigation (Sidebar)

* **Scroll Dynamics**: The sidebar uses scroll-aware fade gradients (`.scroll-fade-container`) to indicate overflow elegantly without harsh cutoffs.
* **Hero Backgrounds**: Subtle background images (`.sidebar-hero-bg`) with heavy desaturation and low opacity (`0.08`) provide texture without compromising readability.
* **Custom Scrollbars**: Slimmer, highly customized scrollbars (`.custom-scrollbar`, `.content-scrollbar`) that match the dark theme aesthetics instead of native browser styles.

## 6. Print Styles (High Fidelity ERP)

The application includes a robust A4 Print Stylesheet (`@media print`):
* Automatically inverts the theme to a crisp black-and-white (`#ffffff` background, `#000000` text) to save ink and ensure legibility on paper.
* Hides all interactive UI elements (sidebars, buttons, toast notifications).
* Uses `page-break-inside: avoid` on table rows (`<tr>`) to prevent data splitting across pages.
* Enforces `Kanit`/`Inter` fonts for optimal print clarity.
