# astro-regressor

Astronomical distance estimation and multi-catalog regression from sky coordinates $(\text{RA}, \text{Dec})$, astrometry, and photometry (default sample: **IC 434**, $\text{RA} = 85.25^\circ, \text{Dec} = -2.45^\circ$).

## How It Works

Different astronomical targets require different distance physics. Instead of applying one heuristic across the sky, `astro-regressor` routes each object to an appropriate estimator and reports when data are insufficient:

- **Galaxies and quasars** — matches **Cosmicflows-4** distance moduli (`J/ApJ/944/94`) and **SDSS DR17** spectroscopic redshifts ($z > 0.0005$), applying a heliocentric-to-CMB dipole correction below $z = 0.05$ under flat $\Lambda\text{CDM}$ (**Planck 2018**).
- **Single stars** — uses **Gaia DR3** Bailer-Jones photogeometric posteriors (`r_med_photogeo`) filtered to $\text{RUWE} < 1.4$ with the **Lindegren (2021)** 5p/6p parallax zero-point (`gaiadr3-zeropoint`, applied only inside its supported domain $6 < G < 21$), falling back to **Hipparcos-2** when needed.
- **Open clusters and H II regions** — locates the 1D log-distance KDE mode, selects kinematically coherent 5D phase-space members $(\alpha, \delta, \mu_{\alpha^*}, \mu_\delta, \varpi_{\text{corr}})$ via `HDBSCAN` or astrometric `UPMASK`, and fits a hierarchical parallax likelihood with intrinsic dispersion.
- **Dark nebulae and globules** — blocks nearest-star fallback so foreground field stars are never mistaken for cloud distances. Background stars censored in optical Gaia bands are recovered with **2MASS**/**AllWISE** `NICER` near-infrared extinction, and dust-breakpoint fits require an on/off-cloud jump with $\Delta\text{BIC} \ge 10$, $\Delta A_0 \ge 0.25\text{ mag}$, and confirmed foreground/background optical bracket ($N_{\text{fg,on}}, N_{\text{bg,on}} \ge 5$). Unverified sightlines match curated PPV/maser records (`CURATED_CLOUDS`) or explicitly abstain (`ABSTAIN (...)`).
- **Missing-band regression (`estimators.py`)** — estimates $\log_{10}(d)$ when parallax is unavailable using both a full-covariance **Extreme Deconvolution (XD)** Gaussian mixture model over measured catalog uncertainties and a missingness-tolerant subspace $k$-NN regressor with selective abstention (`AURC`).

## Quickstart

Install [Pixi](https://pixi.sh) (`curl -fsSL https://pixi.sh/install.sh | sh` on Linux/macOS) and the environment:

```bash
pixi install
```

*(Configured platforms in `pixi.toml` are `osx-arm64`, `linux-64`, and `win-64`; on Intel macOS or ARM64 Linux, add `osx-64` or `linux-aarch64` first via `pixi workspace platform add <platform>`.)*

Query an object's distance (`distance.py` via `tyro` CLI, `rich` tables, and `loguru` logs; running with no name prompts interactively and defaults to `IC434` on Enter):

```bash
pixi run distance
pixi run distance IC434
pixi run distance M45 --html-report reports/m45.html
pixi run distance Sirius
pixi run distance "NGC 4889"
pixi run distance --help
```

## Choosing `--max-cone-stars`

Leave `--max-cone-stars` at its default (`500`) for most targets, and raise it only when heavy extinction censors background stars behind opaque dark nebulae:

| Target Type | Suggested `--max-cone-stars` | Why |
|---|---|---|
| **Point stars** (`Sirius`, `Vega`) | `100`–`300` | Resolved within $15''$; extra stars only add query latency. |
| **Galaxies** (`M87`, `NGC 4889`) | default (`500`) | Handled via SDSS redshift and Cosmicflows-4; stellar cone unused. |
| **Open clusters / H II regions** (`IC 434`, `M45`) | default (`500`) | Provides sufficient stars for 5D `HDBSCAN` / `UPMASK` phase-space clustering. |
| **Opaque dark nebulae** (`LDN 1630`, `LDN 1622`) | `1000`–`1500` | Heavy dust extinguishes bright stars; a deeper cone captures faint background stars ($G > 18$) for the 3D extinction breakpoint. |

If a dark nebula returns `ABSTAIN (DUST_CENSORED_BACKGROUND)`, re-run with a deeper cone:

```bash
pixi run distance "LDN 1630" --max-cone-stars 1000
```

## Interactive HTML Reports

Every `pixi run distance` query writes a self-contained HTML report to `reports/<target_slug>.html` (or the path passed via `--html-report`):

- **Aladin Lite v3 sky viewer** — interactive sky map centered on the target with **DSS2 Optical**, **2MASS NIR**, **AllWISE MIR**, and **Pan-STARRS DR1** survey toggles, core/cone aperture overlays, and Gaia DR3 sources (cluster members in green, field stars in cyan).
- **Plotly diagnostic charts** — proper-motion vector point diagram ($\mu_{\alpha^*}, \mu_\delta$), sightline distance histogram with synthesized distance marker, 3D dust extinction profile $A_0(d)$ with step-function fit, Gaia Color–Magnitude Diagram ($\text{BP}-\text{RP}$ vs $M_G$), and calibrated parallax $\varpi_{\text{corr}}$ vs distance with measurement error bars.
- **Cross-matched summary tables** — independent distance estimators and multi-catalog astrometry, photometry, and stellar physics across 14 astronomical catalogs.

```bash
pixi run distance "IC 434"
open reports/ic_434.html      # macOS
xdg-open reports/ic_434.html  # Linux
```

## Evaluation, Notebook, and Methods

Run the offline evaluation and ablation suite (`evaluate.py` over `estimators.py` using `data/ic434_multicatalog.csv`, `data/ic434_uncertainties_starhorse.csv`, and `data/cosmicflows4_benchmarks.csv`), or add `--live-queries` to benchmark live catalog lookups:

```bash
pixi run evaluate
pixi run evaluate --live-queries
```

Open or execute the Polish exploratory notebook (`distance_estimation.ipynb`) in place:

```bash
pixi run lab
pixi run execute
```

For mathematical formulations and literature references, see [methods.pdf](methods.pdf) (compiled from [methods.typ](methods.typ) and [references.bib](references.bib)) and [research.md](research.md).

## Repository Layout

- `catalogs.py` — target name resolution (`MAST` + curated cloud registry), multi-catalog TAP/VizieR/IRSA/SDSS queries, Lindegren zero-point calibration, `NICER` extinction, error-propagation Jacobians, and CSV loading.
- `estimators.py` — 5D `HDBSCAN` / `UPMASK` cluster synthesis, hierarchical parallax MLE, differential 3D dust breakpoint fitting, extragalactic cosmology, full-covariance Extreme Deconvolution (XD), and subspace $k$-NN with selective abstention.
- `distance.py` — CLI entrypoint, terminal `rich` tables, and interactive Aladin Lite + Plotly HTML report generator.
- `evaluate.py` — invariant checks, multi-catalog estimator comparisons, cluster/CMB/$k$-NN/XD ablations, risk–coverage (`AURC`), and 15-step progressive catalog pruning.
- `distance_estimation.ipynb` — interactive Polish notebook for the IC 434 cross-match and progressive information-loss plots.
- `data/` — bundled IC 434 multi-catalog table, Gaia/2MASS/WISE/StarHorse error sidecar, and Cosmicflows-4 benchmark CSV.
- `methods.typ`, `methods.pdf`, `references.bib`, `research.md` — bilingual method specification, bibliography, and design notes.

## Author and License

Created by **Kacper Kania** ([@kacperkan](https://github.com/kacperkan)).

Released under the [MIT License](LICENSE). Citation metadata is available in [CITATION.cff](CITATION.cff).

Astronomical data products come from public archives including **ESA Gaia DR3**, **Bailer-Jones et al. (2021)**, **StarHorse** (`I/354/starhorse2021`), **Cosmicflows-4** (`J/ApJ/944/94`), **SDSS DR17**, **2MASS**, **AllWISE**, **CatWISE2020**, **APASS DR9**, **LAMOST DR9**, **Pan-STARRS1**, **Tycho-2**, **Hipparcos-2**, **STScI MAST**, and **CDS VizieR**.
