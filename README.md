# IndoNav (AR Navigation Starter)

IndoNav is a JavaScript navigation starter app built with **Node.js + Express + MySQL**, with:

- OpenStreetMap rendering through Leaflet
- Real-time browser geolocation
- Custom map markers saved in MySQL
- Custom AR objects saved in MySQL
- Route calculation (OSRM API)
- Text-to-coordinate geocoding (Nominatim API)
- 3D AR object preview panel using Three.js

## Tech stack

- Backend: Node.js, Express, MySQL (`mysql2`)
- Frontend: Vanilla JS, Leaflet, Three.js
- External map/location services: OpenStreetMap, OSRM, Nominatim

## Project structure

```text
indonav/
├─ db/
│  └─ schema.sql
├─ public/
│  ├─ css/style.css
│  ├─ js/app.js
│  └─ index.html
├─ src/
│  ├─ db/database.js
│  ├─ routes/api.js
│  ├─ utils/validation.js
│  └─ app.js
├─ .env.example
├─ .gitignore
├─ LICENSE
├─ package.json
├─ README.md
└─ server.js
```

## Prerequisites

- Node.js 20+ (tested with Node 22)
- MySQL or MariaDB running locally
- Credentials you provided:
  - user: `root`
  - password: `root`

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create your environment file:

   ```bash
   copy .env.example .env
   ```

3. Start development server:

   ```bash
   npm run dev
   ```

4. Open:

   - `http://localhost:3000`

The app auto-creates database/tables on startup:

- `indonav.markers`
- `indonav.ar_objects`

## API overview

- `GET /api/health`
- `GET /api/markers`
- `POST /api/markers`
- `GET /api/ar-objects`
- `POST /api/ar-objects`
- `GET /api/geocode?query=...`
- `GET /api/route?startLat=...&startLng=...&endLat=...&endLng=...`

## Notes

- Browser geolocation requires HTTPS in production (localhost works for development).
- OSRM/Nominatim are public demo services; for production, run/subscribe to dedicated providers.
