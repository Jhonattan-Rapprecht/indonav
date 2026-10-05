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
- Frontend: Vanilla JS, Tailwind CSS v4 (compiled locally), Leaflet, Three.js
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

## Dashboard

- Responsive spatial workspace with live saved-item counts, a map, route planner,
  and filterable marker/AR-object collection.
- Click the map to select coordinates, then use **Create marker** or the **+** in
  Spatial Studio to open the creation dialog.
- Use **My location** before building a driving route. Layer checkboxes control
  marker and AR-object visibility; the expand button fits the map to saved items.
- Select an AR object on the map or in the collection for an animated 3D preview.
  This is a preview, not a camera-based AR session.
- Requests display busy states and inline notifications; motion respects the
  operating system's reduced-motion preference.
- Use the moon/sun button in the top-right toolbar (beside the avatar) to switch
  between white and dark themes. The theme follows your system preference until
  you choose one, then remembers it in your browser and syncs it across tabs.
  Dark mode styles the dashboard, dialogs, map controls, and map tiles without
  changing the map provider or reloading your workspace.

### Frontend build

`npm start` and `npm run dev` build the frontend assets automatically.
After editing `styles/dashboard.css`, the HTML, or JavaScript, run `npm run build`.
Tailwind generates `public/css/style.css`; edit the source stylesheet, not the
generated output. Three.js is copied from the installed package into the ignored
`public/vendor` directory, avoiding the obsolete CDN script.

## Service notes

- Map tiles use OpenStreetMap's canonical HTTPS endpoint and browser caching.
- The page explicitly sends its origin as the referrer for cross-origin tile requests,
  including when opened through a VS Code development tunnel. Do not disable referrers
  with browser privacy extensions: OpenStreetMap requires them for web apps.
- Browser geolocation requires HTTPS in production (localhost works for development).
- OSRM/Nominatim are public demo services; for production, run/subscribe to dedicated providers.
