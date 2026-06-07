# PromptCloud - Complete Style Guide & Theme Documentation

## Table of Contents
1. [Color Palette](#color-palette)
2. [Typography](#typography)
3. [Layout & Spacing](#layout--spacing)
4. [Glass Morphism System](#glass-morphism-system)
5. [Component Styles](#component-styles)
6. [Background System](#background-system)
7. [Animation & Transitions](#animation--transitions)
8. [Responsive Breakpoints](#responsive-breakpoints)
9. [CSS Variables](#css-variables)
10. [Tailwind Configuration](#tailwind-configuration)

---

## Color Palette

### Primary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Deep Space | `#0a0618` | Primary background, base layer |
| Cosmic Purple | `#5b1fa8` | Primary gradient start, accents |
| Nebula Violet | `#2a0a6e` | Gradient mid-tone, secondary accents |
| Starlight | `#e0e0ff` | Primary text, headings |
| Cloud White | `#ffffff` | High-emphasis text, icons |

### Secondary Colors
| Name | Hex | Usage |
|------|-----|-------|
| Orb Purple | `#3b0f8a` | Secondary gradient orbs |
| Button Gradient Start | `#7c3aed` | CTA buttons gradient start |
| Button Gradient End | `#a855f7` | CTA buttons gradient end |
| Success Green | `#22c55e` | Success states, confirmations |
| Error Red | `#ef4444` | Error states, validation |
| Warning Amber | `#f59e0b` | Warnings, alerts |

### Glass Morphism Colors
| Name | RGBA | Usage |
|------|------|-------|
| Card Glass | `rgba(255,255,255,0.055)` | Card backgrounds |
| Card Border | `rgba(255,255,255,0.13)` | Card borders |
| Input Glass | `rgba(255,255,255,0.06)` | Input fields background |
| Input Border | `rgba(255,255,255,0.1)` | Input fields border |
| Input Focus Ring | `rgba(130,80,255,0.12)` | Input focus state |
| Button Highlight | `rgba(255,255,255,0.09)` | Button top shine |
| Nav Button Border | `rgba(255,255,255,0.25)` | Navbar Sign In button |

### Background Variations
| Name | Hex | Usage |
|------|-----|-------|
| Page Background | `#0a0618` | Auth pages, deep backgrounds |
| Alt Background | `#0a0a0f` | Layout fallback |
| Surface Dark | `#13131f` | Elevated surfaces |
| Surface Light | `#1e1e2e` | Cards, panels |

---

## Typography

### Font Stack
```css
font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
```

### Type Scale
| Element | Size | Weight | Line Height | Letter Spacing |
|---------|------|--------|-------------|----------------|
| H1 (Hero) | 48px / 3rem | 700 | 1.1 | -0.02em |
| H2 (Section) | 36px / 2.25rem | 600 | 1.2 | -0.01em |
| H3 (Card Title) | 24px / 1.5rem | 600 | 1.3 | 0 |
| H4 (Subsection) | 20px / 1.25rem | 500 | 1.4 | 0 |
| Body Large | 18px / 1.125rem | 400 | 1.6 | 0 |
| Body | 16px / 1rem | 400 | 1.5 | 0 |
| Body Small | 14px / 0.875rem | 400 | 1.5 | 0 |
| Caption | 12px / 0.75rem | 400 | 1.4 | 0.01em |
| Label | 11px / 0.6875rem | 500 | 1.2 | 0.05em |

### Text Colors
| Context | Color |
|---------|-------|
| Primary text | `#e0e0ff` |
| Secondary text | `rgba(224,224,255,0.7)` |
| Muted text | `rgba(224,224,255,0.5)` |
| Placeholder | `rgba(224,224,255,0.35)` |
| Link default | `#a78bfa` |
| Link hover | `#c4b5fd` |

---

## Layout & Spacing

### Page Structure
```
html, body {
  width: 100%;
  min-width: 100vw;
  min-height: 100vh;
  margin: 0;
  padding: 0;
  overflow-x: hidden;
}
```

### Spacing Scale (Tailwind)
| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 4px | Tight gaps |
| space-2 | 8px | Icon gaps |
| space-3 | 12px | Small padding |
| space-4 | 16px | Standard padding |
| space-6 | 24px | Card padding |
| space-8 | 32px | Section gaps |
| space-12 | 48px | Large sections |
| space-16 | 64px | Hero spacing |

### Container
| Breakpoint | Max Width |
|------------|-----------|
| Default | 100% |
| sm (640px) | 100% |
| md (768px) | 720px |
| lg (1024px) | 960px |
| xl (1280px) | 1200px |
| 2xl (1536px) | 1400px |

### Z-Index Hierarchy
| Layer | Z-Index | Element |
|-------|---------|---------|
| Background | -1 | Gradient orbs |
| Base | 0 | Page content |
| Elevated | 10 | Cards |
| Sticky | 50 | Navbar |
| Modal | 100 | Overlays |
| Toast | 200 | Notifications |

---

## Glass Morphism System

### Core Specification
All glass elements share these base properties:

```css
/* Base Glass */
background: rgba(255, 255, 255, 0.055);
backdrop-filter: blur(40px) saturate(140%);
-webkit-backdrop-filter: blur(40px) saturate(140%);
border: 1px solid rgba(255, 255, 255, 0.13);
border-radius: 16px;

/* Critical: No overflow hidden on parent */
/* The blur effect needs to sample pixels outside the element */
```

### Glass Card
```css
.glass-card {
  background: rgba(255, 255, 255, 0.055);
  backdrop-filter: blur(40px) saturate(140%);
  -webkit-backdrop-filter: blur(40px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.13);
  border-radius: 16px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
```

### Top Shine Line (Optional Enhancement)
```css
.glass-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 16px;
  right: 16px;
  height: 1px;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
}
```

### Glass Input
```css
.glass-input {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  color: #e0e0ff;
  font-size: 16px;
  transition: all 0.2s ease;
}

.glass-input::placeholder {
  color: rgba(224, 224, 255, 0.35);
}

.glass-input:focus {
  outline: none;
  border-color: rgba(130, 80, 255, 0.4);
  box-shadow: 0 0 0 3px rgba(130, 80, 255, 0.12);
  background: rgba(255, 255, 255, 0.08);
}
```

### Glass Button (Primary CTA)
```css
.glass-button {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border: none;
  border-radius: 12px;
  padding: 12px 24px;
  color: white;
  font-weight: 600;
  font-size: 16px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: all 0.2s ease;
}

/* Top inner highlight */
.glass-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.09),
    transparent
  );
  border-radius: 12px 12px 0 0;
  pointer-events: none;
}

.glass-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
}

.glass-button:active {
  transform: translateY(0);
}
```

### Custom Checkbox
```css
.custom-checkbox {
  width: 16px;
  height: 16px;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.05);
  appearance: none;
  cursor: pointer;
  position: relative;
  transition: all 0.15s ease;
}

.custom-checkbox:checked {
  background: linear-gradient(135deg, #7c3aed, #a855f7);
  border-color: transparent;
}

.custom-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}
```

---

## Component Styles

### Logo Component
```css
.logo-container {
  width: 40px;
  height: 40px;
  border-radius: 22px;
  background: rgba(124, 58, 237, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

/* Top highlight for glass effect */
.logo-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 50%;
  background: linear-gradient(
    180deg,
    rgba(255, 255, 255, 0.12),
    transparent
  );
  border-radius: 22px 22px 0 0;
}

.logo-icon {
  color: white;
  width: 20px;
  height: 20px;
}
```

### Navbar Sign In Button
```css
.nav-signin {
  border: 1px solid rgba(255, 255, 255, 0.25);
  padding: 6px 16px;
  border-radius: 8px;
  color: white;
  font-size: 14px;
  font-weight: 500;
  background: transparent;
  transition: all 0.2s ease;
}

.nav-signin:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.4);
}
```

### Feature Cards
```css
.feature-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 32px;
  transition: all 0.3s ease;
}

.feature-card:hover {
  background: rgba(255, 255, 255, 0.055);
  border-color: rgba(255, 255, 255, 0.13);
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}
```

---

## Background System

### Auth Pages Background
```css
.auth-page {
  background-color: #0a0618;
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

/* Primary gradient orb - top left */
.auth-page::before {
  content: '';
  position: absolute;
  top: -20%;
  left: -10%;
  width: 70vw;
  height: 70vw;
  background: radial-gradient(
    circle,
    #5b1fa8 0%,
    #2a0a6e 40%,
    transparent 70%
  );
  opacity: 0.6;
  pointer-events: none;
}

/* Secondary orb - bottom right */
.auth-page::after {
  content: '';
  position: absolute;
  bottom: -30%;
  right: -20%;
  width: 60vw;
  height: 60vw;
  background: radial-gradient(
    circle,
    #3b0f8a 0%,
    transparent 60%
  );
  opacity: 0.4;
  pointer-events: none;
}
```

### Dot Grid Pattern
```css
.dot-grid {
  background-image: radial-gradient(
    circle,
    rgba(255, 255, 255, 0.08) 1px,
    transparent 1px
  );
  background-size: 18px 18px;
}
```

### Home Page (Hero) Background
```css
.hero-section {
  background: #0a0618;
  position: relative;
}

.hero-gradient {
  background: radial-gradient(
    ellipse at top left,
    #5b1fa8 0%,
    #2a0a6e 30%,
    #0a0618 70%
  );
}
```

---

## Animation & Transitions

### Standard Transitions
```css
/* Quick interactions */
.transition-fast {
  transition: all 0.15s ease;
}

/* Standard interactions */
.transition-base {
  transition: all 0.2s ease;
}

/* Smooth reveals */
.transition-smooth {
  transition: all 0.3s ease;
}

/* Page transitions */
.transition-slow {
  transition: all 0.5s ease;
}
```

### Keyframe Animations
```css
/* Fade in up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Pulse glow */
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(124, 58, 237, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(124, 58, 237, 0.5);
  }
}

/* Shimmer */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}
```

### Hover Effects
```css
/* Lift effect */
.hover-lift:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.3);
}

/* Glow effect */
.hover-glow:hover {
  box-shadow: 0 0 24px rgba(124, 58, 237, 0.4);
}

/* Scale effect */
.hover-scale:hover {
  transform: scale(1.02);
}
```

---

## Responsive Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| sm | 640px | Large phones |
| md | 768px | Tablets |
| lg | 1024px | Small laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

### Responsive Patterns
```css
/* Mobile-first approach */
.container {
  padding: 16px;
}

@media (min-width: 768px) {
  .container {
    padding: 24px;
  }
}

@media (min-width: 1024px) {
  .container {
    padding: 32px;
    max-width: 1200px;
    margin: 0 auto;
  }
}
```

---

## CSS Variables

### Global Variables
```css
:root {
  /* Colors */
  --background: #0a0a0f;
  --foreground: #e0e0ff;
  --primary: #7c3aed;
  --primary-hover: #a855f7;
  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;
  
  /* Glass */
  --glass-bg: rgba(255, 255, 255, 0.055);
  --glass-border: rgba(255, 255, 255, 0.13);
  --glass-input-bg: rgba(255, 255, 255, 0.06);
  --glass-input-border: rgba(255, 255, 255, 0.1);
  
  /* Spacing */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 24px;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.15);
  --shadow-md: 0 4px 24px rgba(0, 0, 0, 0.2);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.3);
  --shadow-glow: 0 0 24px rgba(124, 58, 237, 0.4);
  
  /* Transitions */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-smooth: 0.3s ease;
}
```

---

## Tailwind Configuration

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0a0f',
        foreground: '#e0e0ff',
        primary: {
          DEFAULT: '#7c3aed',
          hover: '#a855f7',
        },
        cosmic: {
          purple: '#5b1fa8',
          violet: '#2a0a6e',
          orb: '#3b0f8a',
        },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      borderRadius: {
        'glass': '16px',
      },
      backdropBlur: {
        'glass': '40px',
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.5s ease-out',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(124, 58, 237, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(124, 58, 237, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
```

### postcss.config.mjs
```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

---

## Implementation Notes

### Critical Rules
1. **Never use `overflow: hidden` on parent elements containing glass cards** — it kills the backdrop blur effect
2. **Always include `-webkit-backdrop-filter`** for Safari support
3. **Use `rgba()` with low alpha values** for glass backgrounds — never solid colors
4. **Maintain consistent border radius** — 16px for cards, 12px for inputs/buttons, 8px for small elements
5. **Always use the local `next` binary** — `npm run dev` or `pnpm next dev`, never `npx next dev`

### Performance Tips
- Use `will-change: transform` on animated elements
- Limit backdrop-filter to 2-3 elements per viewport
- Use `transform: translateZ(0)` to force GPU acceleration
- Prefer `opacity` and `transform` for animations

### Accessibility
- Maintain minimum 4.5:1 contrast ratio for text
- Use `prefers-reduced-motion` media query for animations
- Ensure focus states are visible (use the purple focus ring)
- Never rely on color alone for information

---

## File Locations

| File | Path |
|------|------|
| Global Styles | `src/app/globals.css` |
| Tailwind Config | `tailwind.config.js` |
| PostCSS Config | `postcss.config.mjs` |
| Layout Component | `src/app/layout.tsx` |
| Logo Component | `src/app/components/Logo.tsx` |
| Navbar | `src/app/components/Navbar.tsx` |
| This Style Guide | `STYLE_GUIDE.md` |
