# KONUZASTRO Tracker

**KONUZASTRO Tracker** is a web-based astrophotography session planner and interactive 3D observatory built for [konuzastro.pl](https://konuzastro.pl) — designed as a fast, readable alternative to tools such as Telescopius, SkySafari, and Stellarium.

The application combines an interactive sky dome (WebGL2 + Canvas 2D), a database of over **19,000 deep-sky objects (DSOs)** with a multi-source distance pipeline, a framing simulator backed by HiPS sky surveys (DSS2, PanSTARRS, NSNS), weather and seeing forecasts, a night session planner with N.I.N.A. export, and a **3D Observatory** powered by a local plate solver (Skyshot) and Gaia DR3 star projection in 3D space.

*(Note: the application UI and source code comments are in Polish).*

---

## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [Quick Start (Development)](#quick-start-development)
4. [Production Deployment](#production-deployment)
5. [Scripts and Data Rebuild](#scripts-and-data-rebuild)
6. [Project Structure](#project-structure)
7. [External Data Sources and Licenses](#external-data-sources-and-licenses)
   - [Deep-Sky Object (DSO) Catalog](#1-deep-sky-object-dso-catalog)
   - [Object Distance Chain](#2-object-distance-chain)
   - [Stars, Constellations, Artwork, and the Milky Way](#3-stars-constellations-artwork-and-the-milky-way)
   - [Bright and Dark Nebula Outlines](#4-bright-and-dark-nebula-outlines)
   - [All-Sky Photographic Surveys (HiPS)](#5-all-sky-photographic-surveys-hips)
   - [Astrometry, Field Stars, and Deep Catalogs (3D Observatory)](#6-astrometry-field-stars-and-deep-catalogs-3d-observatory)
   - [Weather, Geocoding, Descriptions, and Photos](#7-weather-geocoding-descriptions-and-photos)
   - [Celestial Body Textures and Graphics](#8-celestial-body-textures-and-graphics)

---

## Key Features

* **Sky Dome (`Niebo`)** — stereographic projection (North up, East left), WebGL2-rendered stars and user plate-solved photos, narrowband NSNS background layers (DR0.1 true-color and DR0.2 without Hα), Milky Way band, constellation lines and translucent constellation artwork on hover, multi-level bright and dark nebula outlines, target transit path, Sun/Moon positions, and custom horizon profile.
* **Object Catalog (`Katalog`)** — fast filtering and search (virtualized list) across catalogs (`M`, `NGC`, `IC`, `Sh2`, `LBN`, `LDN`, `B`, `vdB`, `SNR`, and the `Other` group: classical open/globular clusters & amateur discoveries, `Ced`, `RCW`, `Gum`, `Arp`, `HCG`, `WR`), object types, constellations, magnitudes, angular sizes, and visibility on a selected night. Features color thumbnails from HiPS surveys (DSS2, NSNS), AstroBin gallery integration, and Wikipedia descriptions.
* **Framing and Equipment (`Sprzęt`)** — telescope, camera, and reducer/flattener profiles, rotation and panning of the sensor frame over a HiPS mosaic assembled in a Web Worker (TAN gnomonic projection), plus attaching and compositing custom plate-solved user photos onto both the sky dome and the framing panel.
* **Altitude Chart, Night Phases, and Weather** — object altitude and Moon angular separation curves, automatic darkest-window detection (handling white nights as well as polar day/night), meridian transit, and multi-model weather forecasts (Open-Meteo: Auto, ECMWF IFS, DWD ICON, NOAA GFS, UK Met Office, CMC GEM, and MET Norway) with seeing estimation from atmospheric vertical profiles ($C_n^2$: boundary layer + free atmosphere) or jet-stream winds.
* **Session Planner (`Planer`)** — multi-target night scheduling, automatic time-window allocation (`autoSchedule`), 7-night weather outlook summary, and CSV export compatible with **N.I.N.A.** (Telescopius format).
* **Custom Horizon (`Horyzont`)** — interactive 360° horizon obstruction editor with file import and export.
* **3D Position & Photo 3D Observatory** — 3D visualization of an object's position at the **Milky Way** scale (linear up to 150,000 ly) and the **Local Universe** scale (logarithmic with morphological models of Local Group galaxies). Uploading an astrophotograph (JPEG, PNG, WebP, TIFF, FITS) runs local plate solving to obtain WCS, fetches up to 1,000 brightest field stars from **Gaia DR3** (with Bailer-Jones distances) plus deep catalogs (`PGC`, `SDSS DR16Q` quasars, `Abell/ACO` galaxy clusters), and lets the camera smoothly dive from the Galaxy model straight into the unfolded 3D photograph with a distance histogram and source inspector (SIMBAD, NED, catalog, ML regressor).

---

## Tech Stack

* **Frontend:** React 19, TypeScript 6 (`strict`), Vite 8, Zustand (state + `localStorage`), `astronomy-engine` (ephemerides), `three.js` (lazy-loaded 3D scenes), `@tanstack/react-virtual`, WebGL2, Web Workers (`visibility.worker.ts`, `hips.worker.ts`), PWA (`vite-plugin-pwa` + Cache Storage + IndexedDB).
* **Styling:** plain CSS in `src/styles/app.css` using color tokens consistent with [konuzastro.pl](https://konuzastro.pl) (no Tailwind, no external web fonts).
* **Backend (`server/`):** native Node.js 24 HTTP server (`node:http`, executing `.ts` files directly without a bundler), `sharp` (image processing and HiPS tile transcoding), `fast-xml-parser` (NED VOTable responses), `worker_threads` (off-thread black-border mask detection).
* **Local Tools (optional on server):**
  * **Skyshot (`scripts/skyshot-bridge`)** — Rust bridge for the local `skyshot-solver` plate solver.
  * **Astro-Regressor (`astro-regressor-main`, `scripts/regressor/cut_distance.py`)** — persistent Python worker (managed via `pixi`) estimating unverified distances in the background when no catalog distance is available.

---

## Quick Start (Development)

### Requirements
* **Node.js 24** (native TypeScript execution and `--env-file-if-exists` support)
* Optional, for local photo plate solving (`/api/photo/solve`, `/api/photo/stars`): **Git**, **Rust (`cargo`)**, and **Python 3**
* Optional, for the ML distance regressor (`/api/photo/regressor`): **Pixi** and the `astro-regressor-main` environment

### Installation and Running

1. Install dependencies:
   ```powershell
   npm install
   ```
2. *(Optional)* Copy `.env.example` to `.env.local` and fill in your AstroBin API credentials (used strictly server-side to query the author's images):
   ```powershell
   Copy-Item .env.example .env.local
   ```
3. *(Optional)* Clone, build, and fetch star indexes for the local Skyshot plate solver (stored in `scripts/.cache/`):
   ```powershell
   npm run setup:skyshot
   ```
4. Start the Vite development server (defaults to `http://localhost:5173`, includes all `/api/*` middleware routes):
   ```powershell
   npm run dev
   ```

---

## Production Deployment

Static hosting alone or `npm run preview` does not expose the backend endpoints (`/api/photo/*`, `/api/astrobin-photo`, `/api/hips/*`). In production, the application must be served by the dedicated Node.js server (`server/index.ts`).

```powershell
npm ci
npm run build
npm start
```

### Environment Variables (`server/index.ts`)
* `HOST` — listen address (default `127.0.0.1`).
* `PORT` — listen port (default `4173`).
* `ALLOWED_HOSTS` — **required when serving under a domain name** (comma-separated list, e.g. `ALLOWED_HOSTS=tracker.konuzastro.pl`). Requests whose `Host` header is not an IP address, `localhost`, or listed in `ALLOWED_HOSTS` are rejected with `403` (DNS rebinding protection).
* `ASTROBIN_API_KEY`, `ASTROBIN_API_SECRET` — AstroBin API keys (never use a `VITE_` prefix). If omitted, the endpoint returns `503` and the UI falls back to DSS2.
* `HIPS_CACHE_DIR` — disk cache directory for NSNS tiles (default `scripts/.cache/hips-proxy`).
* `SKYSHOT_BRIDGE`, `SKYSHOT_INDEX` — paths to the `tracker-skyshot` executable and astrometric index directory (default inside `scripts/.cache/`).
* `REGRESSOR_DIR`, `PIXI` — path to `astro-regressor-main` and the `pixi` executable (if unavailable, the regressor is cleanly disabled).

### Files Required on a Production Server
The server exposes only the contents of `dist/` over HTTP, while the Node.js runtime itself requires the following alongside `dist/`:
1. **`dist/`** — built frontend bundle along with precompressed `.br` and `.gz` variants,
2. **`server/`** — HTTP server and API endpoint handlers,
3. **`src/lib/`** — shared domain modules imported directly by the server (`catalog.ts`, `blackBorderMask.ts`, `distance.ts`, `ownPhoto.ts`, `photo.ts`, `perf.ts`),
4. **`public/data/catalog.json`** — read directly by `server/photo.ts`,
5. **`package.json`**, **`package-lock.json`**, and **`node_modules/`** (runtime dependencies including `sharp` and `fast-xml-parser`),
6. **Skyshot Windows binary & regressor cache** (`scripts/.cache/skyshot-build/release/tracker-skyshot.exe` with runtime `.dll` files, plus `scripts/.cache/regressor/*.json`) — committed directly in this Git repository *(note: on Linux/macOS, compile the bridge for your target OS via `npm run setup:skyshot`)*,
7. **Large Data Archives from GitHub Releases (`v0.1.0`)** — due to Git file-size limits, the Skyshot astrometric index (`skyshot-data.tar`, ~842 MB) and complete NSNS HiPS survey mirrors (`hips-proxy-nsns-tc8.tar`, ~882 MB and `hips-proxy-nsns-rgb8.tar`, ~604 MB) are hosted in the repository's **Releases** section. After downloading them, extract into the project root:
   ```powershell
   tar -xf skyshot-data.tar -C scripts/.cache
   mkdir -Force scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-tc8.tar -C scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-rgb8.tar -C scripts/.cache/hips-proxy
   ```

Additional production setup notes (in Polish) are available in [`docs/uruchomienie.md`](docs/uruchomienie.md).

---

## Scripts and Data Rebuild

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Vite dev server with `/api/*` middleware. |
| `npm run build` | Runs `tsc --noEmit`, builds the client bundle and Service Worker (`vite build`), and generates `.br`/`.gz` files (`scripts/compress-dist.ts`). |
| `npm start` | Starts the production Node.js server (`server/index.ts`) loading `.env.local` if present. |
| `npm test` | Runs Vitest unit and integration tests (`src/**/*.test.ts`). |
| `npm run typecheck` | Runs TypeScript type checking (`tsc --noEmit`) across `src`, `server`, and `scripts`. |
| `npm run build:data` | Rebuilds `public/data/` and `src/lib/constellations.ts` from upstream sources (cached in `scripts/.cache/`). Supports individual stages: `node scripts/build-data.ts catalog\|sky\|outlines\|milkyway\|hips`. |
| `npm run setup:skyshot` | Clones and builds the Rust `tracker-skyshot` bridge and downloads Gaia DR3 astrometric indexes into `scripts/.cache/`. |
| `node scripts/hips-mirror.ts` | Pre-downloads complete local copies of NSNS HiPS tile sets (`nsns-tc8`, `nsns-rgb8`) into `HIPS_CACHE_DIR` (~0.9 GB JPEG per set) and writes `mirror-complete.json`. |

---

## Project Structure

* `src/` — client application source code:
  * `src/components/` — UI components, sky dome (`SkyDome`), altitude chart (`AltitudeChart`), framing simulator (`FramingPanel`), 3D scenes (`space3d/`), and 3D Photo Observatory (`observatory/`),
  * `src/views/` — top-level views (`SkyView`, `CatalogView`, `PlannerView`, `EquipmentView`, `HorizonView`),
  * `src/lib/` — pure calculation modules (astro mechanics, night phases, projections, HEALPix/HiPS, seeing, catalog parser, N.I.N.A. exporter) and `*.test.ts` suites,
  * `src/workers/` — Web Workers (`visibility.worker.ts`, `hips.worker.ts`),
  * `src/state/` — Zustand store (`store.ts`) and data hooks (`data.ts`).
* `server/` — production HTTP server, NSNS HiPS proxy, AstroBin API handler, Skyshot plate-solving bridge, SIMBAD/NED/Gaia loaders, and ML regressor job queue.
* `public/` — static assets copied into `dist/` (`public/data/` containing the catalog, stars, outlines, Milky Way map, and constellation art, plus `public/icons/` and `public/textures/`).
* `scripts/` — catalog/sky build pipeline (`build-data.ts` and helpers), `dist/` precompression, Rust `skyshot-bridge/`, Python `regressor/` wrapper, and local runtime cache `scripts/.cache/`.
* `docs/` — deployment documentation (`uruchomienie.md`) and catalog identity verification data (`odleglosci/tozsamosc.json`).

---

## External Data Sources and Licenses

**KONUZASTRO Tracker** relies on open astronomical catalogs, all-sky surveys, scientific databases, and public weather/encyclopedic APIs. Below is the complete list of external data sources along with their licenses and attribution requirements.

### 1. Deep-Sky Object (DSO) Catalog

`public/data/catalog.json` is built via `npm run build:data` by merging the following catalogs:

| Dataset / Catalog | Authors / Source | License / Terms of Use |
| :--- | :--- | :--- |
| **OpenNGC** (`NGC.csv`, `addendum.csv`) | Mattia Verga ([github.com/mattiaverga/OpenNGC](https://github.com/mattiaverga/OpenNGC)) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International) |
| **Sharpless Catalogue of H II Regions (Sh2)** (`VII/20`) | S. Sharpless (1959), *ApJS* 4, 257 · CDS VizieR | **VizieR (CDS, Strasbourg)** scientific data — open academic access with source attribution and author citation |
| **Lynds' Catalogue of Dark Nebulae (LDN)** (`VII/7A`) | B. T. Lynds (1962), *ApJS* 7, 1 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Lynds' Catalogue of Bright Nebulae (LBN)** (`VII/9`) | B. T. Lynds (1965), *ApJS* 12, 163 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **van den Bergh Catalogue of Reflection Nebulae (vdB)** (`VII/21`) | S. van den Bergh (1966), *AJ* 71, 990 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Barnard's Catalogue of 349 Dark Objects (B)** (`VII/220A`) | E. E. Barnard (1927), *Carnegie Inst. Washington Publ.* 247 · CDS VizieR | Public domain / **VizieR (CDS)** data |
| **Catalogue of Galactic Supernova Remnants (SNR)** (`VII/297`) | D. A. Green (2025), *J. Astrophys. Astron.* / Cavendish Laboratory · CDS VizieR | **VizieR (CDS)** data — cite D. A. Green |
| **Strasbourg-ESO Catalogue of Galactic Planetary Nebulae** (`V/84`) | A. Acker et al. (1992), ESO · CDS VizieR | **VizieR (CDS)** data — cite the catalog authors |
| **Gaia DR3 Open & Globular Clusters** (`J/A+A/673/A114`) | E. L. Hunt, S. Reffert (2023), *A&A* 673, A114 · CDS VizieR | **VizieR (CDS)** / **CC BY 4.0** (*A&A* publication) |
| **Amateur-Discovered Planetary Nebulae** (`J/A+A/666/A152`) | P. Le Dû et al. (2022), *A&A* 666, A152 · CDS VizieR | **VizieR (CDS)** / **CC BY 4.0** (*A&A* publication) |
| **Cederblad Catalogue of Bright Diffuse Galactic Nebulae (Ced)** (`VII/231`) | S. Cederblad (1946), *Lund Medd. Astron. Obs.* Ser. II, 119 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **RCW / Gum Catalogue of Hα Emission Regions** (`VII/216`) | A. W. Rodgers, C. T. Campbell, J. B. Whiteoak (1960), *MNRAS* 121, 103 · CDS VizieR | **VizieR (CDS)** data — cite the catalog authors |
| **Atlas of Peculiar Galaxies (Arp)** (`VII/192`) | H. Arp (1966), *ApJS* 14, 1 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Hickson Compact Groups of Galaxies (HCG)** (`VII/213`) | P. Hickson (1982), *ApJ* 255, 382 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Wolf-Rayet Ring Nebulae (WR)** | J. A. Toalá et al. (2015), *A&A* 578, A66, Table 1 | Scientific publication data — cite the authors |
| **Dark Cloud Designation Cross-Identification** (`J/A+A/383/631`) | C. M. Dutra, E. Bica (2002), *A&A* 383, 631 · CDS VizieR | **VizieR (CDS)** data — cite the authors |
| **Manual Amateur Discoveries** (`Zie 1`, `StDr 56`, `Ou 4`, `HFG 2`, `Simeis 57`, `SDSO 1`) | SIMBAD, [planetarynebulae.net](https://www.planetarynebulae.net), P. Ogle et al. (2025, arXiv:2507.15834), M. Drechsler et al. (2023, *RNAAS* 7, 1) | Factual astronomical parameters from published literature and PN candidate lists (attributed to source) |
| **Polish and English Wikipedia Article Titles** | **Wikidata** Query Service (`schema:about`, catalog properties `P528`/`P972`) | **CC0 1.0 Universal** (Wikidata Public Domain) |

### 2. Object Distance Chain

Distances in the catalog and the 3D Observatory inspector come from a **SIMBAD**-identity-checked pipeline of scientific catalogs (queried via **VizieR**, **SIMBAD TAP**, and **NED**):

* **Star Clusters:** E. L. Hunt, S. Reffert (2023), *A&A* 673, A114 (`J/A+A/673/A114`, Gaia DR3 cluster member parallaxes) — **CC BY 4.0** / CDS VizieR.
* **H II Regions and Emission Nebulae:**
  * L. D. Anderson et al. (2014), *ApJS* 212, 1 (`J/ApJS/212/1`, WISE H II Region Catalog — parallaxes and kinematic distances) — **CC BY 3.0 / 4.0** (AAS) / CDS VizieR.
  * T. Foster, C. M. Brunt (2015), *AJ* 150, 147 (`J/AJ/150/147`, spectrophotometric distances and CO velocities) — CDS VizieR.
  * D. Russeil (2003), *A&A* 397, 133 (`J/A+A/397/133`, star-forming complex radial velocities) — CDS VizieR.
  * M. J. Reid et al. (2019), *ApJ* 885, 131 (Galactic rotation curve model A5 used for Monte Carlo kinematic distance estimation).
  * C. A. L. Bailer-Jones et al. (2021), *AJ* 161, 147 (Gaia EDR3 geometric distance of ionizing star HD 227018 for Sh2-101).
* **Galaxies and Galaxy Groups:**
  * R. B. Tully et al. (2023), *ApJ* 944, 94 (`J/ApJ/944/94`, **Cosmicflows-4**) — **CC BY 4.0** (AAS) / CDS VizieR.
  * **SIMBAD Astronomical Database** (CDS, Strasbourg / IDIA mirror) — redshifts ($z$) and direct measurements from `mesDistance` (open CDS research access; requires citing Wenger et al. 2000, *A&AS* 143, 9).
  * **NASA/IPAC Extragalactic Database (NED)** (Jet Propulsion Laboratory, Caltech / NASA) — distance measurements (`DistancesOfObject`) and redshifts (`ObjectLookup`); NASA/IPAC public data with NED attribution.
* **Planetary Nebulae:** N. Chornay, N. A. Walton (2021), *A&A* 656, A110 (`J/A+A/656/A110`, Gaia EDR3 central star parallaxes) — **CC BY 4.0** / CDS VizieR.
* **Supernova Remnants and Optical Components:**
  * S. Ranasinghe, D. Leahy (2022), *ApJ* 940, 63 (`J/ApJ/940/63`) — **CC BY 4.0** / CDS VizieR.
  * H. Zhao et al. (2020), *ApJ* 891, 137 (HB 9 / `SNR G160.9+02.6`) and E. M. Reynoso et al. (2017), *MNRAS* 464, 3029 (Puppis A / `SNR G260.4-03.4`).
* **Dark Nebulae:** C. Zucker et al. (2020), *A&A* 633, A51 (`J/A+A/633/A51`, 3D dust extinction jump mapping with Gaia DR2) — **CC BY 4.0** / CDS VizieR.
* **Individual Literature Distances for Manual Objects:** P. Ogle et al. (2025, `arXiv:2507.15834` for `Zie 1`), E. R. Oudshoorn et al. (2021, *A&A* 650, A171 for `Simeis 57`).
* **Fallback Source (marked as "unverified" in UI):** **Wikidata** (property `P2583` — distance from Earth) — **CC0 1.0 Universal**.

### 3. Stars, Constellations, Artwork, and the Milky Way

`public/data/sky.json`, `public/data/constellations3d.json`, `public/data/milkyway.png`, `public/data/art/*.webp`, and `src/lib/constellations.ts` use:

| Asset | Source / Authors | License |
| :--- | :--- | :--- |
| **Background stars down to mag 6.5, star names, constellation label positions, and Milky Way isophotes** (`stars.6.json`, `starnames.json`, `constellations.json`, `mw.json`) | **d3-celestial** — Olaf Frohn ([github.com/ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial)) | **3-Clause BSD License** (`BSD-3-Clause`) |
| **Modern constellation stick figures and definitions** (`skycultures/modern/index.json`) | **Stellarium** (`modern` skyculture) ([github.com/Stellarium/stellarium](https://github.com/Stellarium/stellarium)) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0) |
| **Constellation figure artwork** (`public/data/art/<IAU>.webp`, converted to monochrome alpha-channel outlines) | **Stellarium** (`skycultures/modern/*.png`, Johan Meuris) | **Free Art License (FAL 1.3)** |
| **Polish IAU constellation names** (`po/stellarium-skycultures/pl.po`) | **Stellarium** translation team | **GNU GPL v2+** / **CC BY-SA 4.0** (per Stellarium repository) |
| **Additional constellation line star positions and parallaxes (3D)** (`I/239/hip_main`) | **Hipparcos Catalogue** (ESA, 1997) via **CDS VizieR** | Public **ESA / CDS VizieR** data |

### 4. Bright and Dark Nebula Outlines

`public/data/outlines.json` provides multi-level nebula contours:

* **Bright Nebulae and Large Emission Region Outlines:** **OpenNGC outlines** — Mattia Verga ([github.com/mattiaverga/OpenNGC/tree/v20260501/outlines](https://github.com/mattiaverga/OpenNGC/tree/v20260501/outlines)), drawn on DSS2 imagery in Aladin (CDS, Strasbourg). License: **CC BY-SA 4.0** *(modifications: selected levels 2 and 3 plus level 1 for outlines with radius $\ge 2^\circ$, matched region rings to catalog objects, and simplified polylines via Douglas-Peucker to $0.005^\circ$)*.
* **Dark Nebulae (`LDN`, `B`) and Selected Dust Complexes (`scripts/data/dark-outlines.json`):** contour coordinates derived in-project via hybrid segmentation and dust extinction/emission thresholding over public scientific surveys:
  * **Planck** (353 GHz / 857 GHz, ESA / Planck Collaboration via NASA SkyView) — public ESA/NASA data,
  * **IRIS** (100 µm, Miville-Deschênes & Lagache 2005, reprocessed IRAS maps) — open scientific data,
  * **Dobashi Dark Cloud Atlas** (K. Dobashi et al. 2005, *PASJ* 57, S1; K. Dobashi 2011, *PASJ* 63, S1 — DSS and 2MASS extinction maps) — open scientific data,
  * **DSS2** (Digitized Sky Survey 2).
  *(Reference photographs used solely as local visual aids during contour extraction are neither published nor included in this repository).*

### 5. All-Sky Photographic Surveys (HiPS)

Object thumbnails, framing view backgrounds, and photorealistic sky-dome layers use the **HiPS (Hierarchical Progressive Surveys, IVOA)** standard:

| Survey | Provider / Authors | License and Terms of Use |
| :--- | :--- | :--- |
| **DSS2 Color** (Digitized Sky Survey 2; mirrors: ESA ESASky, STScI/MAST, CSIRO CASDA, CDS Alasky) | **STScI / NASA / ESA / POSS-II / UKSTU / AAO / Caltech / Royal Observatory Edinburgh** | Open access for educational, research, and non-commercial use with attribution to **ESA/MAST/STScI** ([STScI DSS copyright](https://archive.stsci.edu/dss/copyright.html)) |
| **Pan-STARRS DR1 Color (i-r-g)** (mirrors: STScI/MAST, CDS Alasky) | **Pan-STARRS1 Science Consortium / IfA University of Hawaii / STScI MAST** | **CC BY 4.0** / open MAST scientific access with attribution to **Pan-STARRS1 / MAST** |
| **Northern Sky Narrowband Survey (NSNS)** — `DR0.1 true-color` (`tc8`) and `DR0.2 without Hα` (`rgb8`) | **Stefan Ziegenbalg** ([www.simg.de](https://www.simg.de/nebulae3/)) | **CC BY-NC-SA 4.0** (Creative Commons Attribution-NonCommercial-ShareAlike 4.0). Tiles marked `clonable` are fetched through `server/hipsProxy.ts`, transcoded to JPEG under the same **CC BY-NC-SA 4.0** license, and credited alongside every rendered image. |

### 6. Astrometry, Field Stars, and Deep Catalogs (3D Observatory)

During user photo solving and 3D Observatory scene construction, the server and helper tools use:

* **Local Plate Solver:** [**skyshot-solver**](https://github.com/ashtree74/skyshot-solver) (`ashtree74/skyshot-solver`, invoked via `scripts/skyshot-bridge`) with star indexes derived from **Gaia DR3**.
* **Field Stars and Photogeometric/Geometric Distances:**
  * **ESA Gaia DR3** (`gaia.dr3lite` / `gaiadr3.gaia_source`) — public data from the **European Space Agency (ESA)** and **Gaia DPAC**, released under **CC BY 4.0**.
  * **Gaia EDR3 Stellar Distances:** C. A. L. Bailer-Jones et al. (2021), *AJ* 161, 147 (`gedr3dist.main` / `gedr3dist.litewithdist`), queried via **GAVO Data Center** TAP (ZAH, Heidelberg University) with fallback to **XAO Data Center** (Xinjiang Astronomical Observatory), **ARI Heidelberg**, and **ESA Gaia Archive**.
* **Additional Deep Catalogs Projected onto Photos (`server/photoCatalogObjects.ts` via CDS VizieR):**
  * **HYPERLEDA I. Catalog of galaxies (`PGC`)** (`VII/237/pgc`) — G. Paturel et al. (2003), *A&A* 412, 45.
  * **SDSS Quasar Catalog DR16Q (`QSO`)** (`VII/289/dr16q`) — B. W. Lyke et al. (2020), *ApJS* 250, 8 — **Sloan Digital Sky Survey IV** (**CC BY 4.0**).
  * **Abell Galaxy Clusters (`ACO` / `ACOS`)** (`VII/110A`) — G. O. Abell, H. G. Corwin Jr., R. P. Olowin (1989), *ApJS* 70, 1.
* **Redshift Spectra in ML Regressor (`scripts/regressor/cut_distance.py`):**
  * **Sloan Digital Sky Survey (SDSS SkyServer)** via `astroquery.sdss` — public **SDSS** data (**CC BY 4.0**).

### 7. Weather, Geocoding, Descriptions, and Photos

Live services queried directly by the browser (`src/lib/services.ts`) or server (`server/astrobin.ts`):

| Service | Provider and Underlying Models | License / Terms of Use |
| :--- | :--- | :--- |
| **Weather Forecasts and Vertical Atmospheric Profiles** (`api.open-meteo.com`) | **Open-Meteo** (models: **ECMWF IFS**, **DWD ICON**, **NOAA GFS**, **UK Met Office**, **CMC GEM**) | **CC BY 4.0** (Open-Meteo API for non-commercial use; incorporates modified Copernicus/ECMWF, DWD, NOAA, UK Met Office, and Environment Canada data) |
| **Alternative Weather Forecast** (`api.met.no`) | **MET Norway** (Norwegian Meteorological Institute, Locationforecast 2.0) | **CC BY 4.0** / **NLOD 2.0** (Norwegian Licence for Open Government Data) |
| **Location Search / Geocoding** (`geocoding-api.open-meteo.com`) | **Open-Meteo Geocoding API** (backed by **GeoNames.org**) | **CC BY 4.0** (Open-Meteo / GeoNames) |
| **Astronomical Object Descriptions** (`pl.wikipedia.org`, `en.wikipedia.org`) | **Wikipedia REST API** (Wikimedia Foundation and Wikipedia contributors) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International) |
| **Author's Gallery Images** (`www.astrobin.com/api/v1/image/`) | **AstroBin API** (queries images of user `Konuz`) | Accessed via official AstroBin API using the author's credentials; image copyrights belong to **Michał Kania / KONUZASTRO** |

### 8. Celestial Body Textures and Graphics

* **Full Moon Reference Image** (`public/icons/moon-phases/moon-full.webp`, `scripts/moon-full-reference.webp`): **Galileo** spacecraft photograph (**PIA00405**, *NASA / JPL / USGS*) — **Public Domain** (*NASA/JPL-Caltech/USGS public domain*).
* **3D Earth Surface Texture** (`public/textures/earth.webp`): Earth map based on **NASA Blue Marble / Earth Observatory** imagery — **Public Domain** (*NASA public domain*; bump, ocean specular, and fBm cloud layers are generated procedurally at runtime in `src/components/space3d/earthModel.ts`).
* **UI Icons and Logo** (`public/michal-kania-logo.jpg`, `public/icons/`): original assets by **Michał Kania / KONUZASTRO**.
