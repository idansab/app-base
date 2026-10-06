# מה יש פה — Design Spec
## Nature. Daylight. Adventure.

---

## 1. Color Palette

### Primary Colors (Nature-Inspired)

**Green Family** — Vibrant, alive, trusting
- `Primary (Vibrant)`: `142 72% 42%` → #2EBD6F (brighter, more saturated than current)
- `Primary (Light)`: `142 75% 85%` → #C8F0DC (for accents, badges)
- `Primary (Muted)`: `142 45% 55%` → #529870 (for secondary interactions)

**Earth/Clay Tones** — Warmth, grounding, nature
- `Clay`: `28 60% 54%` → #CE8560 (for highlights, warming accents)
- `Sand`: `38 65% 72%` → #F5D9B5 (for backgrounds, light accents)
- `Soil`: `22 40% 35%` → #664D37 (for text on light, depth)

**Sky/Water Accents** — Openness, exploration
- `Sky`: `199 89% 54%` → #0BA3E0 (secondary accent, info, highlights)
- `Water`: `199 70% 50%` → #1A9BD1 (for hover states, active)

**Neutrals** — Breathing room, clarity
- `Background (Light)`: `210 40% 98%` → #F2F7FC (warm white, not freezing)
- `Background (Dark)`: `222 24% 8%` → #0F1419 (keep existing)
- `Card (Light)`: `0 0% 100%` → #FFFFFF (clean, but warm filter applied)
- `Text Primary`: `222 24% 13%` → #1A2235 (warm dark, not pure black)
- `Text Secondary`: `215 16% 47%` → #6B7A8F (accessible, readable)
- `Border`: `210 30% 88%` → #D4E4F0 (warm light gray, not cool)

### Semantic Colors

- `Destructive`: `0 72% 51%` → #E63946 (red, clear danger)
- `Success`: Keep primary green
- `Warning`: `38 92% 50%` → #FDB913 (warm gold, not orange)
- `Info`: Sky blue (from palette)

---

## 2. Typography

### Font Stack (Keep Rubik, but warm it up)

- **Display**: Rubik Bold 600, 32–48px, +1px letter-spacing
  - For: Titles, "מה יש פה" header
  - Feeling: Friendly, approachable, not tech-heavy

- **Heading**: Rubik SemiBold 600, 20–28px
  - For: Section titles, place names
  - Feeling: Clear, warm, readable

- **Body**: Rubik Regular 400, 16px, 1.5 line-height
  - For: Descriptions, body copy
  - Feeling: Warm, generous, easy to read

- **Small**: Rubik Regular 400, 14px, 1.4 line-height
  - For: Metadata, labels, helpers

- **Mono**: System monospace, 12–14px
  - For: Distances (e.g., "3.2 ק״מ"), ratings

### Color Application

- Primary text (headings, CTAs): `--text-primary` (warm dark)
- Secondary text (metadata): `--text-secondary` (warm gray)
- On primary: Always white, high contrast
- On cards: Primary text by default

---

## 3. Spacing System

**Base**: 8px (Multiply by 1, 2, 3, 4, 6, 8 for most layouts)

### Scales

| Unit | Value | Use Case |
|------|-------|----------|
| `xs` | 4px | Micro-spacing (icon padding, tight gaps) |
| `sm` | 8px | Button inner padding, tight list gaps |
| `md` | 16px | Section gaps, card padding |
| `lg` | 24px | Vertical section spacing, modal header |
| `xl` | 32px | Major section breaks, page padding |
| `2xl` | 48px | Hero spacing, large gaps |

### Application

- **Cards**: `p-md` (16px) inner, `gap-md` (16px) between fields
- **Modals**: `p-lg` (24px) inner
- **Lists**: `gap-sm` (8px) between items; `gap-md` (16px) between groups
- **Hero sections**: `py-2xl` (48px top/bottom)
- **Page edges**: `px-md` (16px) on mobile, `px-xl` (32px) on desktop

---

## 4. Border Radius

**Scale** (keep consistent):

- `sm`: `4px` (small buttons, minor inputs)
- `md`: `8px` (cards, dropdowns, smaller surfaces)
- `lg`: `12px` (medium containers, modals)
- `xl`: `16px` (large cards, featured surfaces)
- `full`: `9999px` (pills, avatars, icons)

### Current Tailwind Config
Already set to `1rem` (16px) as `lg`. Keep this, but add specificity:
- `rounded-sm` → 4px
- `rounded-md` → 8px  
- `rounded-lg` → 12px (was using 16px, reduce for tighter feel)
- `rounded-2xl` → 16px (for major surfaces)
- `rounded-3xl` → 24px (for hero modals)

---

## 5. Motion & Animation

### Principles

1. **Delight over function** — Every interaction should feel like a small discovery
2. **Staggered reveals** — Lists, grids load with cascading delays
3. **Spring physics** — Use spring instead of linear (stiffness: 300, damping: 30)
4. **Playful micro-interactions** — Hover states bounce, clicks ripple

### Specific Animations

#### Entrance (Page/Modal Load)
```
Spring animation
Initial: opacity 0, scale 0.95, y: 20
Animate: opacity 1, scale 1, y: -50 (for modals)
Transition: spring { stiffness: 300, damping: 30 }
Duration: 0.4–0.5s
```

#### List/Grid Stagger
```
Parent: staggerChildren 0.08s (50ms per item)
Child: 
  Initial: opacity 0, y: 12
  Animate: opacity 1, y: 0
  Duration: 0.3s
```

#### Hover States (Interactive Elements)
```
Buttons: scale 1.02 on hover (subtle lift)
Cards: translateY -4px + shadow increase (lift off page)
Icons: rotate 5–10° on hover (playful)
```

#### Click Feedback
```
Scale 0.98 on active (press down)
Ripple effect origin from click coordinates (only on primary CTAs)
```

#### Success/Feedback
```
Pulse animation on success badges (infinite loop, opacity 0.5–1)
Bounce for new notifications/toasts
```

---

## 6. Shadows & Elevation

**Layering strategy** — More shadow = more elevated, more important

| Level | Shadow | Use Case |
|-------|--------|----------|
| **Base** | None | Flat backgrounds, borders only |
| **L1** | `0 1px 2px rgba(0,0,0,0.05)` | Subtle lift, borders |
| **L2** | `0 4px 6px rgba(0,0,0,0.1)` | Cards, dropdowns, nav |
| **L3** | `0 10px 15px rgba(0,0,0,0.1)` | Modals, popovers, elevated cards |
| **L4** | `0 20px 25px rgba(0,0,0,0.15)` | Floating action buttons, critical overlays |

### Application

- **PlaceCard**: L2 shadow + hover → L3
- **Modal backdrop**: L3 + backdrop blur
- **Location picker modal**: L4 (top layer)
- **Button on hover**: L2

---

## 7. Component Patterns

### Cards (Place Discovery)

```
Container: rounded-2xl (16px), bg-white, L2 shadow, p-md (16px)
Image: rounded-lg (12px), h-48, object-cover
Title: heading (20px, warm dark), text-right (RTL)
Metadata: flex gap-sm, text-secondary (small)
CTA: Primary button, spring hover
```

**Feeling**: Inviting, clickable, discoverable

### Modals (Place Details, Location Picker)

```
Backdrop: fixed inset-0, bg-black/40, backdrop-blur-sm, z-40
Modal: fixed top-1/2 left-1/2, transform -translate-x-1/2 -translate-y-1/2
  bg-white/95, backdrop-blur-lg, rounded-3xl (24px), 
  border 1px white/30, L4 shadow, max-w-2xl
Animation: Spring entrance (scale 0.95 → 1, y: 20 → -50)
```

**Feeling**: Premium, centered, glassy, non-intrusive

### Buttons

**Primary**:
- bg-primary (vibrant green), text-white
- rounded-lg (12px), px-lg (24px), py-md (16px)
- Hover: scale 1.02, shadow L3
- Active: scale 0.98

**Secondary**:
- bg-sand (warm light), text-primary
- rounded-lg, px-lg, py-md
- Hover: bg-primary (light), shadow L2

**Tertiary** (text-only):
- text-primary, no background
- Hover: underline + scale 1.02

**Icon Button**:
- rounded-full, p-sm (8px)
- Hover: bg-sand, rotate 5°

---

## 8. Lists & Grids

### Place Discovery Grid

```
Desktop: grid-cols-3, gap-md (16px)
Tablet: grid-cols-2
Mobile: grid-cols-1

Item animation: Stagger 0.08s per card
Hover: Card lifts (translateY -4px), shadow L3
```

### Categories (Horizontal Scroll)

```
Chips: rounded-full, px-md (16px), py-sm (8px)
Selected: bg-primary (vibrant), text-white
Unselected: bg-sand, text-primary
Hover: All → shadow L1, scale 1.05
Spacing: gap-sm (8px)
Animation: Spring transition between states
```

---

## 9. Icons & Decoration

### Icon Strategy

- **System icons** (Lucide): Use green-primary on light, white on dark
- **Icon size**: 20px (small), 24px (standard), 32px (large)
- **Color**: Match text hierarchy (primary text → primary icon)

### Decoration

- **Gradient accents** (optional): Linear from primary-light to primary (for stat cards)
- **Dot patterns** (subtle): Used in headers, max 1–2 per surface
- **Nature SVG** (optional): Leaf/trail icons for navigation, hiking routes

---

## 10. Dark Mode

Keep existing dark palette, but warm the backgrounds:

```css
.dark {
  --background: 222 24% 12%; /* Slightly less blue */
  --card: 222 22% 15%;
  --border: 222 18% 25%;
  /* Primary green, text stay same */
  /* Shadows: increase opacity 20% for readability */
}
```

---

## 11. RTL (Hebrew) Considerations

- Text always `text-right`
- Flex direction `flex-row-reverse` for icon + text
- Modals centered (already correct)
- Padding symmetry (left/right swaps are automatic with Tailwind RTL support)

---

## 12. Surfaces Specification

### Home / Discovery Page

**Header**:
- Title: "מה יש פה" (Display, 32px, warm dark)
- Search bar: rounded-lg, border-1 warm-border, placeholder gray
- Location button: Primary green, rounded-full, icon-only

**Category Tabs**:
- Horizontal scroll, chips (rounded-full)
- Selected: bg-primary (vibrant), text-white
- Unselected: bg-sand, text-primary
- Stagger animation on load

**Place Cards Grid**:
- 3 columns (desktop), 2 (tablet), 1 (mobile)
- Card: rounded-2xl, L2 shadow, p-md
- Image: rounded-lg, h-48
- Stagger entrance 0.08s per item
- Hover: Lift (translateY -4px) + L3 shadow

**Empty State**:
- Centered, icon (Lucide, 48px, clay color)
- Text: heading + description (secondary)
- CTA: Primary button

### Place Detail Modal

**Structure**:
- Backdrop: Black/40 + blur
- Modal: Centered, rounded-3xl, L4 shadow, glassy
- Header: Sticky, border-b, place name (right-aligned)
- Close button: Icon, rounded-full, hover bg-sand

**Content**:
- Hero image: rounded-2xl, h-64
- Stats grid: 2 cols, cards with gradients (primary-light to primary)
- Details: Icons + text (structured list)
- Description: Generous line-height (1.5), text-secondary
- CTA buttons: Flexed, primary + secondary + share

**Animation**:
- Entrance: Spring scale 0.95 → 1, y: 20 → -50
- Stats cards: Stagger 0.1s opacity + y
- Exit: Reverse

### Location Picker Modal

**Structure**:
- Same backdrop + modal as Place Detail
- Header: "בחר מיקום ומרחק" (right-aligned)
- Current location button: Border primary, spring on hover
- Search input: rounded-lg, border warm-border
- Distance slider: accent-primary
- Unlimited toggle: Primary green when active
- Action buttons: Flex layout, primary + secondary

**Animation**:
- Entrance: Same spring as Place Detail
- Slider: Smooth transition on value change (0.2s)
- Toggle: Spring scale on click

---

## 13. Accessibility

- **Contrast**: All text meets WCAG AA (4.5:1 minimum)
- **Focus states**: All interactive elements have `ring-primary`, `ring-2`, `ring-offset-2`
- **Motion**: Respect `prefers-reduced-motion` (disable spring animations)
- **Icons**: Pair with text labels for primary actions
- **Buttons**: Min 48px height for touch targets
- **Color**: Don't rely on color alone (use text + icons)

---

## 14. Browser & Viewport Support

- **Desktop**: 1200px+ (3 col grid)
- **Tablet**: 768–1200px (2 col grid)
- **Mobile**: <768px (1 col, full width - 16px gutter)

All modals remain centered + fixed width on all breakpoints.

---

## 15. Implementation Checklist

### Phase 1: Token Update (Tailwind + CSS)
- [ ] Update `index.css` color variables (greens, earth, sky, neutrals)
- [ ] Update `tailwind.config.js` radius scale (sm/md/lg/2xl/3xl)
- [ ] Add shadow utility layers (L1–L4)
- [ ] Verify dark mode overrides

### Phase 2: Component Refinement
- [ ] PlaceCard: Radius, shadow, hover state
- [ ] PlaceDetailsSheet modal: Verify rounded-3xl, L4 shadow, backdrop blur
- [ ] LocationPicker modal: Same treatment
- [ ] Button variants (primary, secondary, tertiary)
- [ ] Category chips: Radius, hover spring

### Phase 3: Animation System
- [ ] Motion library (Framer Motion): Stagger lists, spring modals
- [ ] Hover states: All cards, buttons, links
- [ ] Success feedback: Toasts, badges
- [ ] Micro-interactions: Ripples, bounces

### Phase 4: Verification
- [ ] Test light + dark mode
- [ ] Test RTL (Hebrew)
- [ ] Test mobile responsiveness
- [ ] Accessibility audit (contrast, focus states)
- [ ] Motion audit (prefers-reduced-motion)

---

## 16. Reference Products

This spec draws inspiration from:
- **Linear** — Minimalist, warm neutrals, delightful micro-interactions
- **Aesop** — Nature-inspired palette, generous spacing, premium feel
- **Vercel** — Spring physics, centered modals, clear hierarchy

But tuned for **Israeli weekender culture**: Bright, cheerful, adventure-ready, warm.

---

## Color Tokens (Copy to `index.css`)

```css
:root {
  /* Greens */
  --primary: 142 72% 42%;        /* Vibrant #2EBD6F */
  --primary-light: 142 75% 85%;  /* #C8F0DC */
  --primary-muted: 142 45% 55%;  /* #529870 */
  
  /* Earth Tones */
  --clay: 28 60% 54%;            /* #CE8560 */
  --sand: 38 65% 72%;            /* #F5D9B5 */
  --soil: 22 40% 35%;            /* #664D37 */
  
  /* Sky/Water */
  --sky: 199 89% 54%;            /* #0BA3E0 */
  --water: 199 70% 50%;          /* #1A9BD1 */
  
  /* Neutrals */
  --background: 210 40% 98%;     /* #F2F7FC */
  --card: 0 0% 100%;             /* #FFFFFF */
  --text-primary: 222 24% 13%;   /* #1A2235 */
  --text-secondary: 215 16% 47%; /* #6B7A8F */
  --border: 210 30% 88%;         /* #D4E4F0 */
  
  /* Semantic */
  --destructive: 0 72% 51%;      /* #E63946 */
  --warning: 38 92% 50%;         /* #FDB913 */
  --info: var(--sky);
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.1);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.1);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.15);
}

.dark {
  --background: 222 24% 12%;
  --card: 222 22% 15%;
  --text-primary: 210 30% 96%;
  --text-secondary: 215 16% 65%;
  --border: 222 18% 25%;
  /* Shadows: increase opacity */
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.1);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.2);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.2);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.25);
}
```

---

**Status**: Ready for Phase 4 (Preview + Business Mockups)
