# Graph Report - base-ma-app  (2026-10-07)

## Corpus Check
- 200 files · ~89,475 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .jsonc 7, (none) 1, .css 1)

## Summary
- 631 nodes · 1129 edges · 76 communities (23 shown, 53 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 33 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- package.json / Radix UI Component Library
- react / lucide-react
- dependencies / body-parser
- App.jsx / AuthenticatedApp()
- cn() / utils.js
- Button / PendingPlaces.jsx
- base44Client.js / server.js
- Home Component / Admin Dashboard
- devDependencies / autoprefixer
- Nature/Daylight/Adventure Design System / Index CSS - Design System
- components.json / aliases
- compilerOptions / jsconfig.json
- Image-helpers.js / buildTransformUrl()
- tailwind.config.js / React + Vite + Tailwind Frontend
- App.jsx Main Entry / Authentication System
- manifest.json / background_color
- PlaceCard Component / Motion Library (framer-motion / motion/react)
- scripts / build
- Home Page / LocationPicker Component
- eslint.config.js / @eslint/js
- app-params.js / getAppParams()
- vite.config.js / ref_path
- AGENTS.md / Base44 Platform
- ESLint Configuration / ESLint React Plugin
- migrate-categories.js / categoryMap
- seed-places.js / newPlaces
- localClient.js / localApi

## God Nodes (most connected - your core abstractions)
1. `react` - 67 edges
2. `lucide-react` - 41 edges
3. `cn()` - 32 edges
4. `Button` - 25 edges
5. `AuthenticatedApp()` - 21 edges
6. `Nature/Daylight/Adventure Design System` - 19 edges
7. `Home Component` - 19 edges
8. `EmptyState()` - 17 edges
9. `motion` - 16 edges
10. `base44` - 16 edges

## Surprising Connections (you probably didn't know these)
- `LocationPicker Component` --conceptually_related_to--> `Modal (Place Details, Location Picker) Pattern`  [INFERRED]
  src/components/LocationPicker.jsx → design-spec.md
- `Feature: Location-Based Place Discovery with Distance Slider` --conceptually_related_to--> `LocationPicker Component`  [INFERRED]
  README.md → src/components/LocationPicker.jsx
- `PlaceCard Component` --conceptually_related_to--> `Place Card Component Pattern`  [INFERRED]
  src/components/PlaceCard.jsx → design-spec.md
- `Feature: Favorites Management` --conceptually_related_to--> `PlaceCard Component`  [INFERRED]
  README.md → src/components/PlaceCard.jsx
- `Place Discovery Grid Layout` --conceptually_related_to--> `PlaceCard Component`  [INFERRED]
  design-spec.md → src/components/PlaceCard.jsx

## Import Cycles
- None detected.

## Communities (76 total, 53 thin omitted)

### Community 0 - "package.json / Radix UI Component Library"
Cohesion: 0.03
Nodes (71): Radix UI Component Library, React, name, private, type, version, autoprefixer, baseline-browser-mapping (+63 more)

### Community 1 - "react / lucide-react"
Cohesion: 0.07
Nodes (31): Haversine Distance Calculation, Geolocation Service, lucide-react, motion, react, AddPlaceForm(), LocationPicker(), CATEGORY_MAP (+23 more)

### Community 2 - "dependencies / body-parser"
Cohesion: 0.03
Nodes (69): dependencies, body-parser, canvas-confetti, class-variance-authority, clsx, cmdk, cors, date-fns (+61 more)

### Community 3 - "App.jsx / AuthenticatedApp()"
Cohesion: 0.09
Nodes (30): react-dom, react-router-dom, sonner, @tanstack/react-query, App(), AuthenticatedApp(), AppLayout(), BottomNav() (+22 more)

### Community 4 - "cn() / utils.js"
Cohesion: 0.09
Nodes (28): class-variance-authority, clsx, tailwind-merge, TipImage(), AddReportForm(), AddTipForm(), MySubmissions(), SubmissionRow() (+20 more)

### Community 5 - "Button / PendingPlaces.jsx"
Cohesion: 0.18
Nodes (24): base44, PendingCommunityList(), PendingPlaces(), PendingReports(), PendingTips(), EmptyState(), PendingCommunityList(), AppHeader() (+16 more)

### Community 6 - "base44Client.js / server.js"
Cohesion: 0.06
Nodes (24): Admin Server Port 4000, adminPath, __dirname, __filename, server, API Server Port 3001, Dev Server Port 5173, Express API Server (+16 more)

### Community 7 - "Home Component / Admin Dashboard"
Cohesion: 0.13
Nodes (19): Favorites API Endpoints, GET /api/places Endpoint, PlaceDetailsSheet Component, Admin Dashboard Interface, Favorites System, Image Upload Functionality, Location-based Filtering, Places Management System (+11 more)

### Community 8 - "devDependencies / autoprefixer"
Cohesion: 0.11
Nodes (19): devDependencies, autoprefixer, baseline-browser-mapping, eslint, @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-react-refresh (+11 more)

### Community 9 - "Nature/Daylight/Adventure Design System / Index CSS - Design System"
Cohesion: 0.14
Nodes (18): Accessibility Guidelines (WCAG AA, Focus States, Motion), Button Variants (Primary, Secondary, Tertiary, Icon), Color Palette: Earth/Clay Tones (Clay, Sand, Soil), Color Palette: Green Family (Primary), Color Palette: Neutrals (Background, Text, Border), Color Palette: Sky/Water Accents, Dark Mode Theme Support, CSS Custom Properties / Variables (+10 more)

### Community 10 - "components.json / aliases"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 11 - "compilerOptions / jsconfig.json"
Cohesion: 0.12
Nodes (16): compilerOptions, allowSyntheticDefaultImports, baseUrl, checkJs, esModuleInterop, jsx, lib, module (+8 more)

### Community 12 - "Image-helpers.js / buildTransformUrl()"
Cohesion: 0.18
Nodes (8): buildSrcSet(), buildTransformUrl(), clamp01(), clampDim(), DEFAULT_TRANSFORM_WIDTH, DEVICE_PIXEL_RATIOS, IMAGE_LOAD_MODE, WIX_MEDIA_HOSTS

### Community 13 - "tailwind.config.js / React + Vite + Tailwind Frontend"
Cohesion: 0.18
Nodes (8): Express.js API Server (Port 3001), Base MA App - What is Here?, Border Radius Scale (sm/md/lg/2xl/3xl), Feature: Admin Panel for Content Management, React + Vite + Tailwind Frontend, Nature/Daylight Design System, Radix UI Components, Tailwind CSS

### Community 14 - "App.jsx Main Entry / Authentication System"
Cohesion: 0.22
Nodes (10): AuthContext - Authentication Management, Authentication System, AppLayout Component, Protected Routes Pattern, React Query Client, React Query (TanStack), React Router, React Router (Page Navigation) (+2 more)

### Community 15 - "manifest.json / background_color"
Cohesion: 0.20
Nodes (9): background_color, description, display, icons, name, orientation, short_name, start_url (+1 more)

### Community 16 - "PlaceCard Component / Motion Library (framer-motion / motion/react)"
Cohesion: 0.22
Nodes (9): Category Chips Pattern, Category System (coffee_food, trips, nightlife, shopping, culture), PlaceCard Component, Feature: Favorites Management, Lucide React Icon Library, Motion Library (framer-motion / motion/react), Motion & Animation Principles (Spring Physics), Place Card Component Pattern (+1 more)

### Community 17 - "scripts / build"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, lint:fix, preview, server, start (+1 more)

### Community 18 - "Home Page / LocationPicker Component"
Cohesion: 0.32
Nodes (8): LocationPicker Component, Feature: Location-Based Place Discovery with Distance Slider, Geo Utilities (haversineKm, geocodeAddress, formatDistance), Modal (Place Details, Location Picker) Pattern, Home Page, PlaceDetailsSheet Modal Component, Home Page: Search, Filter, Sort, Display Places, useUserLocation Hook

### Community 19 - "eslint.config.js / @eslint/js"
Cohesion: 0.33
Nodes (5): @eslint/js, eslint-plugin-react, eslint-plugin-react-hooks, eslint-plugin-unused-imports, globals

### Community 20 - "app-params.js / getAppParams()"
Cohesion: 0.47
Nodes (4): appParams, clearStoredAccessToken(), getAppParams(), isClearAccessTokenRequested()

### Community 21 - "vite.config.js / ref_path"
Cohesion: 0.40
Nodes (3): vite, @vitejs/plugin-react, Vite Build Tool

### Community 23 - "ESLint Configuration / ESLint React Plugin"
Cohesion: 0.67
Nodes (3): ESLint Configuration, ESLint React Plugin, ESLint React Hooks Plugin

## Knowledge Gaps
- **265 isolated node(s):** `__filename`, `__dirname`, `adminPath`, `server`, `$schema` (+260 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 349 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **53 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `react / lucide-react` to `package.json / Radix UI Component Library`, `App.jsx / AuthenticatedApp()`, `cn() / utils.js`, `Button / PendingPlaces.jsx`?**
  _High betweenness centrality (0.179) - this node is a cross-community bridge._
- **What connects `__filename`, `__dirname`, `adminPath` to the rest of the system?**
  _265 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `package.json / Radix UI Component Library` be split into smaller, more focused modules?**
  _Cohesion score 0.027777777777777776 - nodes in this community are weakly interconnected._
- **Why does `dependencies` connect `dependencies / body-parser` to `package.json / Radix UI Component Library`?**
  _High betweenness centrality (0.159) - this node is a cross-community bridge._
- **Should `react / lucide-react` be split into smaller, more focused modules?**
  _Cohesion score 0.07283702213279677 - nodes in this community are weakly interconnected._
- **Why does `lucide-react` connect `react / lucide-react` to `package.json / Radix UI Component Library`, `App.jsx / AuthenticatedApp()`, `cn() / utils.js`, `Button / PendingPlaces.jsx`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **Should `dependencies / body-parser` be split into smaller, more focused modules?**
  _Cohesion score 0.028985507246376812 - nodes in this community are weakly interconnected._