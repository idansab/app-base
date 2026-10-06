# "מה יש פה?" - mayhishpo

A standalone web application for discovering local places in Israel with location-based search, community content, and admin management.

## Quick Start (Standalone Mode)

### Prerequisites
- Node.js 16+ installed
- npm or yarn

### Installation

```bash
# 1. Install dependencies
npm install

# 2. Start the backend API server (port 3001)
npm run server

# 3. In another terminal, start the frontend dev server (port 5173)
npm run dev
```

Open http://localhost:5173 in your browser.

### Production Build

```bash
# Build the frontend
npm run build

# Start server with built frontend
npm run server
```

Then open http://localhost:3001 in your browser.

## Architecture

### Backend (Standalone API Server)

- **Framework:** Express.js
- **Port:** 3001
- **Data Storage:** JSON files in `data/` directory
- **Endpoints:**
  - `GET /api/places` - List places with filtering
  - `POST /api/places` - Create place (admin)
  - `PATCH /api/places/:id` - Update place (admin)
  - `DELETE /api/places/:id` - Delete place (admin)
  - `GET/POST /api/favorites` - Manage favorites
  - `POST/GET/DELETE /api/tips` - Manage tips
  - `POST /api/geocode` - Geocode address

### Frontend (React + Vite + Tailwind)

- **Port:** 5173 (dev) / Served by backend in production
- **Features:**
  - Location-based place discovery with distance slider
  - Place cards with ratings, images, and tags
  - Favorites management
  - Admin panel for content management
  - Content studio for quick publishing
  - Offline-ready with local caching
  - Full RTL support for Hebrew

## Features

### Public Pages
- **Discover (Home):** Browse all places with location filter and distance slider
- **Favorites:** Save and manage favorite places
- **Trips:** Pre-built travel routes and custom trip planning
- **Surprise:** Random place discovery

### Admin Pages
- **Content Studio:** Quick publishing of tips and reports
- **Place Management:** Full CRUD operations for places with:
  - Automatic geocoding from address
  - Image URLs and descriptions
  - Opening hours and phone numbers
  - Ratings and price levels
  - Tags and categories

## Development

### Project Structure
```
├── src/
│   ├── components/     # React components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom React hooks
│   ├── lib/           # Utilities and contexts
│   └── index.css      # Global styles (Tailwind)
├── server.js          # Express API server
├── vite.config.js     # Vite configuration
└── tailwind.config.js # Tailwind CSS configuration
```

### Available Scripts

- `npm run dev` - Start frontend dev server
- `npm run server` - Start backend API server
- `npm run build` - Build frontend for production
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking
- `npm run preview` - Preview production build locally

### Adding New Places

1. Navigate to `/admin` in the browser
2. Click "ניהול מקומות" (Manage Places)
3. Click "הוסף מקום" (Add Place) button
4. Fill in the form:
   - Enter address and click "זהי כתובת" to auto-geocode
   - Add image URL (uses picsum.photos by default)
   - Set ratings, hours, category, tags
5. Click "שמור" (Save)

### Using the Content Studio

1. Navigate to `/admin` in the browser
2. Click "סטודיו תוכן" (Content Studio) tab
3. Write a quick tip or field report
4. Click "פרסום" (Publish) - publishes immediately

## Customization

### Change API Base URL
Edit the `API_BASE` variable in pages to point to your backend.

### Update Place Categories
Edit `CATEGORIES` array in component files.

### Customize Colors
Edit `tailwind.config.js` to change the primary color scheme (currently green-600).

## Data Storage

Place data is persisted to JSON files in the `data/` directory:
- `data/places.json` - All places
- `data/tips.json` - Community tips
- `data/reports.json` - Field reports
- `data/favorites.json` - User favorites

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge). Requires:
- JavaScript enabled
- Geolocation permission for location-based features

## License

MIT
