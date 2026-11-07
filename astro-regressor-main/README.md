# astro-regressor

Astronomical distance estimation and imputation from sky coordinates $(\text{RA}, \text{Dec})$, astrometry, and photometry (default sample: **IC 434**, $\text{RA}=85.25^\circ, \text{Dec}=-2.45^\circ$).

install
```bash
pixi install
```

query object distance (`tyro` CLI + `rich` tables + `loguru` + interactive HTML report in `reports/<target>.html` with **Aladin Lite v3** sky viewer & **Plotly** diagnostics; prompts when omitted, Enter = `IC434`)
```bash
pixi run distance
pixi run distance IC434
pixi run distance M45 --html-report reports/m45.html
pixi run distance Sirius
pixi run distance "NGC 4889"
pixi run distance --help
```

run evaluation & ablation study (`evaluate.py` over `estimators.py` on `data/ic434_multicatalog.csv`)
```bash
pixi run evaluate
pixi run evaluate --live-queries
```

### CLI options & `--max-cone-stars` guidance

| Target Type | Suggested `--max-cone-stars` | Why |
|---|---|---|
| **Point stars** (`Sirius`, `Vega`) | `100`–`300` | Resolved within $15''$; extra stars only add query latency. |
| **Galaxies** (`M87`, `NGC 4889`) | default (`500`) | Handled via SDSS redshift / Cosmicflows-4; stellar cone unused. |
| **Open clusters / H II regions** (`IC 434`, `M45`) | default (`500`) | Provides sufficient stars for 5D `HDBSCAN`/`UPMASK` phase-space clustering. |
| **Opaque dark nebulae** (`LDN 1630`, `LDN 1622`) | `1000`–`1500` | Heavy dust extinguishes bright stars; deeper cone needed to capture faint background stars ($G > 18$) for 3D extinction breakpoint. |

Rule of thumb: leave at default (`500`). Only bump to `1000`–`1500` if a dark nebula reports `ABSTAIN (DUST_CENSORED_BACKGROUND)`.

```bash
pixi run distance "LDN 1630" --max-cone-stars 1000
```

### Interactive HTML reports & visualization

Every query saves a self-contained HTML report to `reports/<target_slug>.html` (or path via `--html-report`):

- **Aladin Lite v3 viewer**: Interactive pan/zoom sky map at object coordinates. Switch between **DSS2 Optical**, **2MASS NIR**, **AllWISE MIR**, and **Pan-STARRS DR1** surveys. Overlays aperture circles and Gaia DR3 stars (cluster members in green, field stars in cyan).
- **Plotly diagnostics**:
  - Proper motion vector point diagram ($\mu_{\alpha^*}, \mu_\delta$)
  - Sightline distance histogram & synthesized distance marker
  - 3D dust extinction profile $A_0(d)$ with step-function breakpoint fit
  - Gaia Color–Magnitude Diagram ($\text{BP}-\text{RP}$ vs $M_G$)
  - Calibrated parallax $\varpi_{\text{corr}}$ vs distance with measurement error bars
- Multi-catalog estimator and cross-matched parameter tables.

```bash
pixi run distance "IC 434"
open reports/ic_434.html
```

run notebook
```bash
pixi run lab
```

execute notebook in-place
```bash
pixi run execute
```

