# KONUZASTRO Tracker

**KONUZASTRO Tracker** is an astrophotography session planner and interactive 3D observatory built for [konuzastro.pl](https://konuzastro.pl). It brings together a real-time sky dome, a curated deep-sky catalog, framing simulation over all-sky surveys, multi-model weather and seeing forecasts, N.I.N.A. session exports, and plate-solved 3D star-field exploration in one browser app.

*(Note: the application UI and most source code comments are written in Polish.)*

---

## Table of Contents

1. [Key Features](#key-features)
2. [Tech Stack](#tech-stack)
3. [Installation](#installation)
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
8. [Licensing](#licensing)

---

## Key Features

* **Sky Dome (`Niebo`)** — stereographic projection (North up, East left) with WebGL2 stars, plate-solved user photos, and NSNS backgrounds (DR0.1 true color and DR0.2 continuum, OHS, and SHO). OHS and SHO support order-6 detail and share the same local tiles for fast switching. The dome also shows Milky Way contours, constellation lines and artwork, multi-level nebula outlines, target night tracks, Sun/Moon positions, and a custom horizon silhouette.
* **Object Catalog (`Katalog`)** — virtualized search and filtering across **20,500+ DSOs**, including **2,924 planetary nebulae** with PN G designations and aliases. Filter by catalog, object type, constellation, magnitude, angular size, and nightly visibility. Entries show HiPS thumbnails, AstroBin gallery images, and Wikipedia summaries. The [planetary nebula audit](docs/audits/pncat.md) documents sources and identification corrections.
* **Framing & Equipment (`Sprzęt`)** — telescope, camera, and reducer/flattener profiles with interactive sensor framing and rotation over a Web Worker HiPS mosaic (TAN gnomonic projection), plus compositing plate-solved user astrophotographs directly onto both the sky dome and the framing canvas.
* **Altitude, Night Phases & Weather** — target altitude and Moon separation curves, automatic darkest-window detection (handling summer white nights, polar day, and polar night), meridian transit timing, and multi-model forecasts from Open-Meteo (Auto, ECMWF IFS, DWD ICON, NOAA GFS, UK Met Office, CMC GEM) and MET Norway with atmospheric seeing estimates ($C_n^2$ profiles or 250 hPa jet-stream wind).
* **Session Planner (`Planer`)** — multi-target session ordering, automatic time-slot allocation (`autoSchedule`), a 7-night weather outlook, import of saved plans, and CSV exports for **N.I.N.A.** (Telescopius and Target Scheduler formats).
* **Custom Horizon (`Horyzont`)** — interactive 360° horizon obstruction editor with file import/export and panorama calibration.
* **3D Position & Photo 3D Observatory** — explores target distances across the **Milky Way** (linear up to 150,000 ly) and the **Local Universe** (logarithmic scale with morphological galaxy models). The selected object’s catalog distance from Earth appears in the header and next to its marker when the scene can place it. The scale switcher and layer controls sit below the scene. Uploading a photo (JPEG, PNG, WebP, TIFF, or FITS) solves its WCS locally via Skyshot, queries up to 1,000 brightest **Gaia DR3** field stars (Bailer-Jones distances) alongside deep extragalactic catalogs (`PGC`, `SDSS DR16Q` quasars, `ACO`/`ACOS` clusters), and flies smoothly into the unfolded 3D photograph with distance histograms and SIMBAD/NED/catalog/ML lookups.

---

## Tech Stack

* **Frontend:** React 19, TypeScript 6 (`strict`), Vite 8, Zustand (`localStorage` persistence), `astronomy-engine`, `three.js` (lazy-loaded 3D scenes), `@tanstack/react-virtual`, WebGL2, three Web Workers (`visibility.worker.ts`, `hips.worker.ts`, `photoMask.worker.ts`), and PWA caching (`vite-plugin-pwa` + Cache Storage + IndexedDB).
* **Styling:** Plain CSS in `src/styles/app.css` built around [konuzastro.pl](https://konuzastro.pl) color tokens (no Tailwind; loads self-hosted `Exo 2` and `Inter` variable `.woff2` fonts under `SIL OFL-1.1`).
* **Backend (`server/`):** Native Node.js 24 HTTP server (`node:http`, running `.ts` files directly without bundling), `sharp` for image decoding and HiPS tile transcoding, `fast-xml-parser` for NED VOTable responses, and `worker_threads` for off-thread black-border mask detection.
* **Optional Local Tools:**
  * **Skyshot (`scripts/skyshot-bridge`)** — Rust CLI wrapper around `skyshot-solver` created by [ashtree74](https://github.com/ashtree74) for local plate solving.
  * **Astro-Regressor (`astro-regressor-main`, `scripts/regressor/cut_distance.py`)** by **Kacper Kania ([@kacperkan](https://github.com/kacperkan))** — persistent Python worker (managed via `pixi`) estimating unverified cutout distances in the background when catalog measurements are absent.

---

## Installation

### Prerequisites

* **Required:** **Node.js 24+** — or **Docker** (with Docker Compose) if you prefer running in a container.
* **Optional** *(the app works without these)*:
  * **Local plate solving** (upload your own photos into the 3D Observatory): **Git**, **Rust 1.85+** (`cargo`) with a C compiler (`xcode-select --install` on macOS; `build-essential` on Linux), and **Python 3**.
  * **Background ML distance estimates:** **[Pixi](https://pixi.sh)** (manages the Python environment in `astro-regressor-main/`).

### Run Locally (Recommended)

```bash
git clone https://github.com/Konuz/Session-Planner.git
cd Session-Planner
npm run up
```

Then open **http://127.0.0.1:4173**.

* `npm run up` installs Node packages, builds the local Skyshot bridge if Rust (`cargo`) is installed, sets up the Pixi environment if `pixi` is installed, builds the frontend, and starts the server.
* For development with live reload at **http://localhost:5173**, run `npm run up:dev` instead (or `npm install && npm run dev` to skip automatic Skyshot/Pixi setup).

### Run with Docker

```bash
git clone https://github.com/Konuz/Session-Planner.git
cd Session-Planner
docker compose up
```

Then open **http://127.0.0.1:4173**. The image bundles Node 24, Rust (`tracker-skyshot`), and Pixi (`astro-regressor-main`), and mounts `./scripts/.cache` from your host.

### Optional Setup

* **Enable local plate solving (~842 MB Gaia DR3 star index):**
  Run once to download the star index needed for solving uploaded astrophotographs (or start with `npm run up -- --fetch-skyshot`):
  ```bash
  npm run setup:skyshot
  # or inside Docker:
  docker compose run --rm tracker npm run setup:skyshot
  ```
* **Enable AstroBin gallery photos:**
  Copy `.env.example` to `.env.local` and fill in `ASTROBIN_API_KEY` and `ASTROBIN_API_SECRET`. Without them, thumbnails fall back automatically to DSS2.
  ```bash
  cp .env.example .env.local
  ```
  *(PowerShell: `Copy-Item .env.example .env.local`)*
* **Manual ML distance regressor setup:**
  `npm run up` and Docker install the Pixi environment automatically when `pixi` is available. To install it manually:
  ```bash
  pixi install --manifest-path astro-regressor-main/pixi.toml
  ```
  *(On Intel macOS or ARM64 Linux, run `pixi workspace platform add osx-64 --manifest-path astro-regressor-main/pixi.toml` or `linux-aarch64` first.)*

---

## Production Deployment

For hosting on a server behind a domain name, run the Node.js server (`server/index.ts`) rather than static hosting or `npm run preview`—the server is required for `/api/photo/*`, `/api/astrobin-photo`, and `/api/hips/*`:

```bash
npm ci
npm run build
npm start
```

On Unix shells (`bash`/`zsh`), environment overrides can also be passed inline without editing files:

```bash
HOST=127.0.0.1 PORT=4173 ALLOWED_HOSTS=tracker.konuzastro.pl npm start
```

### Environment Variables (`server/index.ts`)

* `HOST` — bind address (default `127.0.0.1`).
* `PORT` — listen port (default `4173`).
* `ALLOWED_HOSTS` — **required behind a domain name** (comma-separated, e.g., `ALLOWED_HOSTS=tracker.konuzastro.pl`). Requests whose `Host` header is not an IP literal, `localhost`, or in `ALLOWED_HOSTS` receive `403` to block DNS rebinding.
* `ASTROBIN_API_KEY`, `ASTROBIN_API_SECRET` — server-only AstroBin credentials (never prefix with `VITE_`). Without them, `/api/astrobin-photo` returns `503` and the UI falls back to DSS2.
* `HIPS_CACHE_DIR` — disk cache directory for NSNS tiles (default `scripts/.cache/hips-proxy`).
* `SKYSHOT_BRIDGE`, `SKYSHOT_INDEX` — custom paths to the `tracker-skyshot` binary (`scripts/.cache/skyshot-build/release/tracker-skyshot` on Linux/macOS or `tracker-skyshot.exe` on Windows; ensure `chmod +x` if copied between Unix hosts) and astrometric index folder (default inside `scripts/.cache/`).
* `REGRESSOR_DIR`, `PIXI` — custom path to `astro-regressor-main` and the `pixi` executable (disables ML distance estimation cleanly when absent). Under non-interactive Unix services (`systemd`, `cron`, `pm2`), `~/.pixi/bin` is usually absent from `PATH`, so set `PIXI=/home/<user>/.pixi/bin/pixi` on Linux or `PIXI=/Users/<user>/.pixi/bin/pixi` on macOS.

### Files Needed on the Production Server

Over HTTP the server exposes only `dist/`, while Node.js reads the following paths alongside it at runtime:

1. **`dist/`** — built frontend bundle, Service Worker, and precompressed `.br`/`.gz` assets,
2. **`server/`** — HTTP entrypoint and API handlers,
3. **`src/lib/`** — shared TypeScript domain modules imported directly by the server (`catalog.ts`, `blackBorderMask.ts`, `distance.ts`, `ownPhoto.ts`, `photo.ts`, `perf.ts`),
4. **`public/data/catalog.json`** — catalog lookup loaded by `server/photo.ts`,
5. **`package.json`**, **`package-lock.json`**, and production **`node_modules/`** (`sharp`, `fast-xml-parser`),
6. **Skyshot executable & cached regressor results** — `scripts/.cache/regressor/*.json` pre-warmed results are tracked in Git; `scripts/.cache/skyshot-build/` is gitignored, so build `tracker-skyshot` locally via `npm run setup:skyshot` (if you extract `skyshot-data.tar` *before* running `npm run setup:skyshot`, `setup:skyshot` compiles the native binary without re-downloading the 842 MB star index),
7. **Large Release Archives** — download the astrometric index and the NSNS tile mirrors from [GitHub Release v0.1.0](https://github.com/Konuz/Session-Planner/releases/tag/v0.1.0). Extract both OHS/SHO archives in the order shown. The second archive contains the marker that tells the server the mirror is complete.
   ```bash
   mkdir -p scripts/.cache/hips-proxy
   tar -xf skyshot-data.tar -C scripts/.cache
   tar -xf hips-proxy-nsns-tc8.tar -C scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-rgb8.tar -C scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-ohs8-part1.tar -C scripts/.cache/hips-proxy
   tar -xf hips-proxy-nsns-ohs8-part2.tar -C scripts/.cache/hips-proxy
   ```
   *(PowerShell: use `mkdir -Force scripts/.cache/hips-proxy`.)*

### Optional: ML Distance Regressor Setup

To enable background distance estimation for photo cutouts missing catalog distances (`/api/photo/regressor`), prepare the [Pixi](https://pixi.sh) Python environment (`astro-regressor-main/.pixi/` is gitignored):

1. Pre-install the environment (targets `linux-64`, `osx-arm64`, and `win-64`; on Intel macOS `osx-64` or ARM64 Linux `linux-aarch64`, run `pixi workspace platform add osx-64 --manifest-path astro-regressor-main/pixi.toml` or `linux-aarch64` first):
   ```bash
   pixi install --manifest-path astro-regressor-main/pixi.toml
   ```
   *(Pre-installation avoids cold-start package installs exceeding the server's 5-minute startup timeout).*
2. Ensure `pixi` is on `PATH` (or set `PIXI` to `~/.pixi/bin/pixi` and `REGRESSOR_DIR` in `.env.local` or your service environment) and allow outbound HTTPS access to **GAVO TAP**, **ARI/ESA Gaia**, **SDSS SkyServer**, and **CDS VizieR**.
3. Verify the wrapper:
   ```bash
   pixi run --manifest-path astro-regressor-main/pixi.toml python -m unittest discover -s scripts/regressor
   pixi run --manifest-path astro-regressor-main/pixi.toml python scripts/regressor/cut_distance.py --ra 85.38 --dec -2.30 --radius 0.05 --type EN
   ```

### Running as a `systemd` Service (Linux)

```ini
[Unit]
Description=KONUZASTRO Tracker
After=network-online.target

[Service]
Type=simple
User=konuzastro
WorkingDirectory=/srv/konuzastro-tracker
EnvironmentFile=-/srv/konuzastro-tracker/.env.local
ExecStart=/usr/bin/env node --env-file-if-exists=.env.local server/index.ts
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

Further deployment notes (in Polish) are in [`docs/uruchomienie.md`](docs/uruchomienie.md).

---

## Scripts and Data Rebuild

| Command | Purpose |
| :--- | :--- |
| `npm run dev` | Runs the Vite dev server with live `/api/*` handlers. |
| `npm run build` | Type-checks (`tsc --noEmit`), bundles the app and Service Worker (`vite build`), and writes `.br`/`.gz` files (`scripts/compress-dist.ts`). |
| `npm start` | Launches the production Node.js server (`server/index.ts`), loading `.env.local` if present. |
| `npm run up` | Installs missing Node/Pixi/Skyshot-bridge artifacts and starts the production server in one command (`--build`, `--fetch-skyshot`). |
| `npm run up:dev` | Same one-command setup, launching the Vite dev server (`http://localhost:5173`) instead. |
| `npm test` | Runs Vitest tests (`src/**/*.test.ts`). |
| `npm run typecheck` | Runs `tsc --noEmit` across `src`, `server`, and `scripts`. |
| `npm run build:data` | Rebuilds `public/data/` and `src/lib/constellations.ts` from upstream catalogs cached in `scripts/.cache/` (single stage, e.g. `node scripts/build-data.ts sky`; stages: `catalog`, `sky`, `outlines`, `milkyway`, `hips`). |
| `npm run setup:skyshot` | Clones and compiles `tracker-skyshot` and fetches Gaia DR3 astrometric indexes into `scripts/.cache/`. |
| `node scripts/hips-mirror.ts` | Mirrors NSNS HiPS sets (`nsns-tc8`, `nsns-rgb8`, `nsns-ohs8`) to `HIPS_CACHE_DIR` and writes `mirror-complete.json`. OHS and SHO share `nsns-ohs8`. |

---

## Project Structure

* `src/` — frontend application:
  * `src/components/` — UI controls, `SkyDome`, `AltitudeChart`, `FramingPanel`, `space3d/` Universe scenes, and `observatory/` 3D Photo Observatory,
  * `src/views/` — top-level tabs (`SkyView`, `CatalogView`, `PlannerView`, `EquipmentView`, `HorizonView`),
  * `src/lib/` — domain math (ephemerides, night windows, projections, HEALPix/HiPS, seeing, catalog parser, N.I.N.A. exports) and unit/integration tests (`*.test.ts`),
  * `src/workers/` — Web Workers (`visibility.worker.ts`, `hips.worker.ts`, `photoMask.worker.ts`),
  * `src/state/` — Zustand store (`store.ts`) and data hooks (`data.ts`).
* `server/` — production HTTP server, NSNS HiPS proxy, AstroBin endpoint, Skyshot wrapper, SIMBAD/NED/Gaia loaders, and regressor queue.
* `public/` — static files copied to `dist/` (`public/data/` catalog, stars, outlines, Milky Way map, constellation artwork, plus `public/icons/` and `public/textures/`).
* `scripts/` — data rebuild pipeline (`build-data.ts` and helpers), `dist/` compressor, Rust `skyshot-bridge/`, Python `regressor/` wrapper, and local cache `scripts/.cache/`.
* `astro-regressor-main/` — standalone ML distance estimation library and benchmarks by **Kacper Kania (`@kacperkan`)**.
* `docs/` — production runbook (`uruchomienie.md`) and catalog identity verification table (`odleglosci/tozsamosc.json`).

---

## External Data Sources and Licenses

**KONUZASTRO Tracker** builds on open astronomical catalogs, all-sky surveys, and public weather/encyclopedic APIs. Note that several datasets below carry **ShareAlike (`CC BY-SA 4.0`, `FAL 1.3`)** or **NonCommercial (`CC BY-NC-SA 4.0`)** terms, while author branding and gallery images remain proprietary to **Michał Kania / KONUZASTRO**.

### 1. Deep-Sky Object (DSO) Catalog

`public/data/catalog.json` merges the following catalogs via `npm run build:data`:

| Dataset / Catalog | Authors / Source | License / Terms of Use |
| :--- | :--- | :--- |
| **OpenNGC** (`NGC.csv`, `addendum.csv`) | Mattia Verga ([github.com/mattiaverga/OpenNGC](https://github.com/mattiaverga/OpenNGC)) | **CC BY-SA 4.0** (Creative Commons Attribution-ShareAlike 4.0 International) |
| **Sharpless Catalogue of H II Regions (Sh2)** (`VII/20`) | S. Sharpless (1959), *ApJS* 4, 257 · CDS VizieR | **VizieR (CDS, Strasbourg)** scientific data — open academic access with author citation |
| **Lynds' Catalogue of Dark Nebulae (LDN)** (`VII/7A`) | B. T. Lynds (1962), *ApJS* 7, 1 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Lynds' Catalogue of Bright Nebulae (LBN)** (`VII/9`) | B. T. Lynds (1965), *ApJS* 12, 163 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **van den Bergh Catalogue of Reflection Nebulae (vdB)** (`VII/21`) | S. van den Bergh (1966), *AJ* 71, 990 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Barnard's Catalogue of 349 Dark Objects (B)** (`VII/220A`) | E. E. Barnard (1927), *Carnegie Inst. Washington Publ.* 247 · CDS VizieR | Public domain / **VizieR (CDS)** data |
| **Catalogue of Galactic Supernova Remnants (SNR)** (`VII/297`) | D. A. Green (2025), *J. Astrophys. Astron.* / Cavendish Laboratory · CDS VizieR | **VizieR (CDS)** data — cite D. A. Green |
| **Strasbourg-ESO Catalogue of Galactic Planetary Nebulae** (`V/84`) | A. Acker et al. (1992), ESO · CDS VizieR | **VizieR (CDS)** data — cite the catalog authors |
| **GUVPNcat / PNcat v1** | Gómez-Muñoz, Bianchi & Manchado (2023), [MAST](https://archive.stsci.edu/hlsp/guvpncat), based on [HASH](https://doi.org/10.1088/1742-6596/728/3/032008) | **CC BY 4.0** — confirmed planetary nebulae and PN G aliases |
| **Gaia DR3 Open & Globular Clusters** (`J/A+A/673/A114`) | E. L. Hunt, S. Reffert (2023), *A&A* 673, A114 · CDS VizieR | **VizieR (CDS)** / **CC BY 4.0** (*A&A* publication) |
| **Amateur-Discovered Planetary Nebulae** (`J/A+A/666/A152`) | P. Le Dû et al. (2022), *A&A* 666, A152 · CDS VizieR | **VizieR (CDS)** / **CC BY 4.0** (*A&A* publication) |
| **Cederblad Catalogue of Bright Diffuse Galactic Nebulae (Ced)** (`VII/231`) | S. Cederblad (1946), *Lund Medd. Astron. Obs.* Ser. II, 119 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **RCW / Gum Catalogue of Hα Emission Regions** (`VII/216`) | A. W. Rodgers, C. T. Campbell, J. B. Whiteoak (1960), *MNRAS* 121, 103 · CDS VizieR | **VizieR (CDS)** data — cite the catalog authors |
| **Atlas of Peculiar Galaxies (Arp)** (`VII/192`) | H. Arp (1966), *ApJS* 14, 1 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Hickson Compact Groups of Galaxies (HCG)** (`VII/213`) | P. Hickson (1982), *ApJ* 255, 382 · CDS VizieR | **VizieR (CDS)** data — cite the catalog author |
| **Wolf-Rayet Ring Nebulae (WR)** | J. A. Toalá et al. (2015), *A&A* 578, A66, Table 1 | Scientific publication data — cite the authors |
| **Dark Cloud Designation Cross-Identification** (`J/A+A/383/631`) | C. M. Dutra, E. Bica (2002), *A&A* 383, 631 · CDS VizieR | **VizieR (CDS)** data — cite the authors |
| **Manual Amateur Discoveries** (`Zie 1`, `StDr 56`, `Ou 4`, `HFG 2`, `Simeis 57`, `SDSO 1`) | SIMBAD, [planetarynebulae.net](https://www.planetarynebulae.net), P. Ogle et al. (2025, arXiv:2507.15834), M. Drechsler et al. (2023, *RNAAS* 7, 1) | Published literature and PN candidate parameters (attributed to source) |
| **Polish and English Wikipedia Article Titles** | **Wikidata** Query Service (`schema:about`, `P528`/`P972`) | **CC0 1.0 Universal** (Wikidata Public Domain) |

### 2. Object Distance Chain

Catalog and 3D Observatory distances come from a **SIMBAD**-cross-checked chain across **VizieR**, **SIMBAD TAP**, and **NED**:

* **Star Clusters:** E. L. Hunt, S. Reffert (2023), *A&A* 673, A114 (`J/A+A/673/A114`, Gaia DR3 cluster member parallaxes) — **CC BY 4.0** / CDS VizieR.
* **H II Regions and Emission Nebulae:**
  * L. D. Anderson et al. (2014), *ApJS* 212, 1 (`J/ApJS/212/1`, WISE H II Region Catalog) — **CC BY 3.0 / 4.0** (AAS) / CDS VizieR.
  * T. Foster, C. M. Brunt (2015), *AJ* 150, 147 (`J/AJ/150/147`, spectrophotometric distances and CO velocities) — CDS VizieR.
  * D. Russeil (2003), *A&A* 397, 133 (`J/A+A/397/133`, star-forming complex velocities) — CDS VizieR.
  * M. J. Reid et al. (2019), *ApJ* 885, 131 (Galactic rotation model A5 used for Monte Carlo kinematic distances).
  * C. A. L. Bailer-Jones et al. (2021), *AJ* 161, 147 (Gaia EDR3 distance to HD 227018 for Sh2-101).
* **Galaxies and Galaxy Groups:**
  * R. B. Tully et al. (2023), *ApJ* 944, 94 (`J/ApJ/944/94`, **Cosmicflows-4**) — **CC BY 4.0** (AAS) / CDS VizieR.
  * **SIMBAD Astronomical Database** (CDS, Strasbourg / IDIA mirror) — redshifts ($z$) and `mesDistance` records (requires citing Wenger et al. 2000, *A&AS* 143, 9).
  * **NASA/IPAC Extragalactic Database (NED)** (JPL / Caltech / NASA) — `DistancesOfObject` and `ObjectLookup` APIs.
* **Planetary Nebulae:** N. Chornay, N. A. Walton (2021), *A&A* 656, A110 (`J/A+A/656/A110`, Gaia EDR3 central-star parallaxes) — **CC BY 4.0** / CDS VizieR.
* **Supernova Remnants & Optical Components:**
  * S. Ranasinghe, D. Leahy (2022), *ApJ* 940, 63 (`J/ApJ/940/63`) — **CC BY 4.0** / CDS VizieR.
  * H. Zhao et al. (2020), *ApJ* 891, 137 (HB 9 / `SNR G160.9+02.6`) and E. M. Reynoso et al. (2017), *MNRAS* 464, 3029 (Puppis A / `SNR G260.4-03.4`).
* **Dark Nebulae:** C. Zucker et al. (2020), *A&A* 633, A51 (`J/A+A/633/A51`, 3D dust extinction breakpoints with Gaia DR2) — **CC BY 4.0** / CDS VizieR.
* **Individual Literature Distances:** P. Ogle et al. (2025, `arXiv:2507.15834` for `Zie 1`), E. R. Oudshoorn et al. (2021, *A&A* 650, A171 for `Simeis 57`).
* **Unverified Fallback (labeled in UI):** **Wikidata** (`P2583`) — **CC0 1.0 Universal**.

### 3. Stars, Constellations, Artwork, and the Milky Way

`public/data/sky.json`, `public/data/constellations3d.json`, `public/data/milkyway.png`, `public/data/art/*.webp`, and `src/lib/constellations.ts` draw from:

| Asset | Source / Authors | License |
| :--- | :--- | :--- |
| **Background stars to mag 6.5, star names, constellation label positions, Milky Way isophotes** (`stars.6.json`, `starnames.json`, `constellations.json`, `mw.json`) | **d3-celestial** — Olaf Frohn ([github.com/ofrohn/d3-celestial](https://github.com/ofrohn/d3-celestial)) | **3-Clause BSD License** (`BSD-3-Clause`) |
| **Modern constellation stick figures and definitions** (`skycultures/modern/index.json`) | **Stellarium** (`modern` skyculture) ([github.com/Stellarium/stellarium](https://github.com/Stellarium/stellarium)) | **CC BY-SA 4.0** |
| **Constellation figure artwork** (`public/data/art/<IAU>.webp`, converted to monochrome alpha-channel outlines) | **Stellarium** (`skycultures/modern/*.png`, Johan Meuris) | **Free Art License (FAL 1.3)** |
| **Polish IAU constellation names** (`src/lib/constellations.ts`) | Canonical 88 IAU constellation names in Polish | **CC0 1.0** (factual astronomical nomenclature) |
| **3D constellation line star positions and parallaxes** (`I/239/hip_main`) | **Hipparcos Catalogue** (ESA, 1997) via **CDS VizieR** | Public **ESA / CDS VizieR** data |

### 4. Bright and Dark Nebula Outlines

`public/data/outlines.json` provides multi-level nebula contours:

* **Bright Nebulae & Emission Regions:** **OpenNGC outlines** — Mattia Verga ([github.com/mattiaverga/OpenNGC/tree/v20260501/outlines](https://github.com/mattiaverga/OpenNGC/tree/v20260501/outlines)), drawn on DSS2 imagery in Aladin (CDS, Strasbourg) under **CC BY-SA 4.0** *(modified: levels 2–3 plus level 1 for outlines with radius $\ge 2^\circ$, matched region rings to catalog objects, simplified via Douglas-Peucker to $0.005^\circ$)*.
* **Dark Nebulae (`LDN`, `B`) & Dust Complexes (`scripts/data/dark-outlines.json`):** outlines segmented in-project from dust extinction/emission maps and Meta **SAM 3** mask fits over:
  * **Planck** (353 / 857 GHz, ESA / NASA SkyView),
  * **IRIS** (100 µm, Miville-Deschênes & Lagache 2005),
  * **Dobashi Dark Cloud Atlas** (Dobashi et al. 2005, *PASJ* 57, S1; Dobashi 2011, *PASJ* 63, S1),
  * **DSS2** (Digitized Sky Survey 2).
  *(Reference photographs used solely as local visual aids during contour extraction are not published or redistributed in this repository).*

### 5. All-Sky Photographic Surveys (HiPS)

Thumbnails, framing mosaics, and sky-dome photography stream from **HiPS (IVOA)** mirrors:

| Survey | Provider / Authors | License and Terms of Use |
| :--- | :--- | :--- |
| **DSS2 Color** (mirrors: ESA ESASky, STScI/MAST, CSIRO CASDA, CDS Alasky) | **STScI / NASA / ESA / POSS-II / UKSTU / AAO / Caltech / ROE** | Educational, research, and non-commercial use with attribution to **ESA/MAST/STScI** ([STScI DSS copyright](https://archive.stsci.edu/dss/copyright.html)) |
| **Pan-STARRS DR1 Color (i-r-g)** (mirrors: STScI/MAST, CDS Alasky) | **Pan-STARRS1 Science Consortium / IfA UH / STScI MAST** | **CC BY 4.0** / open MAST access |
| **Northern Sky Narrowband Survey (NSNS)** — DR0.1 true color (`tc8`), DR0.2 continuum without Hα (`rgb8`), and DR0.2 OHS/SHO (`ohs8`, up to order 6 or 6.4″/px) | **Stefan Ziegenbalg** ([www.simg.de](https://www.simg.de/nebulae3/)) | **CC BY-NC-SA 4.0**. Marked `clonable`; cached and JPEG-transcoded by `server/hipsProxy.ts` under the same license with on-screen credit. |

OHS maps [O III], Hα, and [S II] to red, green, and blue, respectively. SHO swaps red and blue to make [S II] structures more prominent. Both palettes are available on the sky dome and framing canvas and use the same `nsns-ohs8` mirror.

### 6. Astrometry, Field Stars, and Deep Catalogs (3D Observatory)

* **Local Plate Solver:** [**skyshot-solver**](https://github.com/ashtree74/skyshot-solver) (`ashtree74/skyshot-solver`, **Apache-2.0**, called via `scripts/skyshot-bridge`) using **Gaia DR3** star indexes.
* **Field Stars & Distances:**
  * **ESA Gaia DR3** (`gaia.dr3lite` / `gaiadr3.gaia_source`) — **ESA / Gaia DPAC** (**CC BY 4.0**).
  * **Gaia EDR3 Stellar Distances:** C. A. L. Bailer-Jones et al. (2021), *AJ* 161, 147 (`gedr3dist.main` / `gedr3dist.litewithdist`), queried via **GAVO TAP** with fallbacks to **XAO**, **ARI Heidelberg**, and **ESA Gaia Archive**.
* **Deep Overlay Catalogs (`server/photoCatalogObjects.ts` via CDS VizieR):**
  * **HYPERLEDA (`PGC`)** (`VII/237/pgc`) — Paturel et al. (2003), *A&A* 412, 45.
  * **SDSS DR16Q Quasars (`QSO`)** (`VII/289/dr16q`) — Lyke et al. (2020), *ApJS* 250, 8 (**CC BY 4.0**).
  * **Abell Galaxy Clusters (`ACO` / `ACOS`)** (`VII/110A`) — Abell, Corwin, Olowin (1989), *ApJS* 70, 1.
* **Galaxy Redshift Spectra (`scripts/regressor/cut_distance.py`):** **SDSS SkyServer** via `astroquery.sdss` (**CC BY 4.0**).

### 7. Weather, Geocoding, Descriptions, and Photos

Queried dynamically by the client (`src/lib/services.ts`) or server (`server/astrobin.ts`):

| Service | Provider & Underlying Models | License / Terms of Use |
| :--- | :--- | :--- |
| **Weather & Atmospheric Profiles** (`api.open-meteo.com`) | **Open-Meteo** (**ECMWF IFS**, **DWD ICON**, **NOAA GFS**, **UK Met Office**, **CMC GEM**) | **CC BY 4.0** (non-commercial Open-Meteo tier) |
| **Alternative Forecast** (`api.met.no`) | **MET Norway** (Locationforecast 2.0) | **CC BY 4.0** / **NLOD 2.0** |
| **Geocoding** (`geocoding-api.open-meteo.com`) | **Open-Meteo / GeoNames.org** | **CC BY 4.0** |
| **Object Descriptions** (`pl.wikipedia.org`, `en.wikipedia.org`) | **Wikipedia REST API** (Wikimedia Foundation) | **CC BY-SA 4.0** |
| **Author Gallery Photos** (`www.astrobin.com/api/v1/image/`) | **AstroBin API** (user `Konuz`) | Server-side API lookup; photo copyrights belong to **Michał Kania / KONUZASTRO** |

### 8. Celestial Body Textures and Graphics

* **Full Moon Reference (`public/icons/moon-phases/moon-full.webp`, `scripts/moon-full-reference.webp`):** **Galileo** spacecraft mosaic (**PIA00405**, *NASA / JPL / USGS*) — **Public Domain**.
* **3D Earth Texture (`public/textures/earth.webp`):** **NASA Blue Marble / Earth Observatory** — **Public Domain** *(bump, specular, and cloud layers are synthesized procedurally in `src/components/space3d/earthModel.ts`)*.
* **UI Icons & Brand Logo (`public/michal-kania-logo.jpg`, `public/icons/`):** original graphics by **Michał Kania / KONUZASTRO**.

---

## Licensing

* Application source code (`src/`, `server/`, `scripts/`) is licensed under the **MIT License** in [`LICENSE`](LICENSE).
* `astro-regressor-main/` is separately licensed under the **MIT License** in [`astro-regressor-main/LICENSE`](astro-regressor-main/LICENSE) (`Copyright (c) 2026 Kacper Kania`).
* Bundled and mirrored catalogs, artwork, tiles, fonts (`Exo 2`, `Inter` under `SIL OFL-1.1`), solver dependencies, and proprietary KONUZASTRO branding are governed by [`LICENSE-ASSETS`](LICENSE-ASSETS).
