# Research Report: Addressing 3D Positioning, Dust Censoring, PPV Masks & Abstention in `astro-regressor`

## 1. Context & Diagnosis of the External Pilot Findings

The three notifications come from an external evaluation/pilot workflow that tested `astro-regressor` on **3D spatial positioning of interstellar clouds, Lynds Dark Nebulae (`LDN`), Bok globules, and multi-component star-forming complexes**.

Below is the exact mapping from each notification statement to the root cause in `distance.py`, `estimators.py`, and `distance_estimation.ipynb`, verified against live catalog queries and the repository dataset (`data/ic434_multicatalog.csv`).

| Notification Finding | Exact Location in `astro-regressor` | Verified Root Cause |
|---|---|---|
| **1. Cannot determine exact 3D position $(X,Y,Z)$; more data needed** | `distance.py:68` (`SkyCoord(..., distance=d_pc * u.pc).galactic.cartesian`) | Sky coordinates $(\alpha,\delta)$ / $(l,b)$ are exact, but radial distance $d_{\text{pc}}$ relies on wide-cone stellar heuristics that lack physical association proof for dark clouds, globules, or multi-velocity sightlines. |
| **2a. Unresolved globules (*Nierozdzielone globule*)** | `estimators.py:92–99` (`resolve_name`), `distance.py:48` (`np.clip`), `distance.py:55` & `estimators.py:167` (`is_extended`) | Live verification shows `Mast.Name.Lookup` returns `object_type='DarkNeb', radius_deg=None` for `LDN 1630`, `LDN 1622`, `LDN 1495`, and `Barnard 68` (`LDN 57`), `'StarFormingReg'` for `LDN 1688`, and raises `ValueError` on short aliases `B68` and `B33`. Because `'DarkNeb'` and `'StarFormingReg'` are missing from `is_extended`, `is_extended` evaluates to `False`. Furthermore, `np.clip(radius_deg, 0.15, 0.45)` inflates compact globules like `LDN 1551` ($r=0.025^\circ = 1.5'$) and `Barnard 33` ($r=0.05^\circ = 3.0'$) to $0.15^\circ$ ($9'$), diluting on-cloud stars with $9\times\text{–}36\times$ larger sky area of unrelated field stars. |
| **2b. Dust censoring of background stars (*Cenzurowanie gwiazd za pyłem*)** | `estimators.py:115` (`ORDER BY g.phot_g_mean_mag ASC`), `estimators.py:66–89` (`fit_extinction_breakpoint`) | **Double censoring:** (1) *SQL truncation:* `SELECT TOP {max_stars} ... ORDER BY g.phot_g_mean_mag ASC` keeps only the brightest stars. In `data/ic434_multicatalog.csv` ($N=700$), the sample is hard-truncated at $G_{\max} = 17.55\text{ mag}$ (median $G = 16.40\text{ mag}$), discarding all faint reddened background stars in $17.55 < G \le 21.0\text{ mag}$. (2) *Optical/pipeline censoring:* Dense LDN cores ($A_V \sim 5\text{–}25\text{ mag}$) extinguish background stars below Gaia's $G \approx 21\text{ mag}$ limit or strip Apsis `azero_gspphot` / `ebpminrp_gspphot` (missing in $136/700 = 19.4\%$ of stars even in the bright $G \le 17.55$ IC 434 sample, while 2MASS $J,H,K_s$ is present in $693/700 = 99.0\%$). |
| **2c. Missing spatial cutout (*Brak odpowiedniego wycinka*)** | `estimators.py:113` (`CIRCLE('ICRS', ra, dec, cone_deg)`) | Queries a blind circular cone instead of a versioned 2D cloud polygon/ellipse mask or dust optical-depth contour ($\tau_{353}$ / $A_V$ / Herschel $N(\text{H}_2)$) paired with an off-cloud control ring. |
| **2d. Unknown service version (*Nieznana wersja usługi*)** | `estimators.py:92–145` (`resolve_name`, `fetch_all_catalogs`) | Live queries hit MAST (`Mast.Name.Lookup`), Gaia TAP, IRSA TAP, and SDSS without recording catalog/service versions, table DOIs, query timestamps, or handling CDS IPv6 connect timeouts (`simbad.cds.unistra.fr` / `vizier.cds.unistra.fr` vs IPv4 mirror `vizier.cfa.harvard.edu`). |
| **2e. Regressor lacks independent ground truth & abstention (*Niezależne przypisania prawdy, jawna walidacja odmów*)** | `estimators.py:204–257` (`prepare_regression_state`, `predict_knn_subspace`) | `y_all = np.log10(df["r_med_photogeo"])` trains and evaluates the $k$-NN regressor on single-star Bailer-Jones distances within the same cone rather than independent object ground truth. Moreover, `predict_knn_subspace` **never abstains**: when `w_avail == 0` ($O_{ij}=\emptyset$), `dist2 = np.inf`, `weights = 0`, and line 250 (`np.where(w_sum > 0.0, ..., 1.0 / k)`) silently falls back to uniform $1/k$ averaging over arbitrary training stars; at Step 14 of ablation (only `ra, dec`), it still emits a point prediction. |
| **3a. "Nearest star" fallacy (*Najbliższa gwiazda*)** | `estimators.py:181–190` (`synthesize_target_distance`) | When `not is_extended` (triggered on all `DarkNeb` / `LDN` objects), `synthesize_target_distance` selects `near_gaia.iloc[0]` within `15"` (or Hipparcos within `30"`), assigning a random projected foreground/background star's parallax as the distance of the dark nebula. |
| **3b. "Largest jump" fallacy (*Największy skok*)** | `estimators.py:66–89` (`fit_extinction_breakpoint`) | Minimizes $\sum_i |A_{0,i} - \hat{A}_0(d_i)| - 0.1\,\Delta A_0\,N$, rewarding the single largest median $A_0$ step across the whole cone. Along sightlines with overlapping clouds, H II regions, clusters, or multiple velocity layers (e.g. Orion `IC 434` / `LDN 1630` / `LDN 1622`), the largest jump in a wide cone does not prove physical association with the target component. |
| **3c. Versioned masks, PPV cubes & optical range for two LDNs (*Wersjonowane maski/kostki PPV i potwierdzenie optycznego zakresu dla dwóch wybranych LDN*)** | Missing in current architecture | Disentangling cloud components/fragments or single velocity layers requires Position–Position–Velocity $(\alpha,\delta,v_{\text{LSR}})$ CO spectral cubes, versioned 2D cloud footprints, verification that Gaia optical stars bracket the extinction of the target LDNs, and curated literature import / manual curation when automatic proof of association fails. |

---

## 2. Primary-Source Literature Standards

1. **Bayesian 3D Dust Extinction Tomography with On-Cloud Templates:**
   - **Zucker et al. (2019, *ApJ*, 879, 125, DOI: `10.3847/1538-4357/ab2388`; VizieR `J/ApJ/879/125`)** and **Zucker et al. (2020, *A&A*, 633, A51, DOI: `10.1051/0004-6361/201936145`; VizieR `J/A+A/633/A51`)** model the line-of-sight reddening profile toward a molecular cloud not by taking an unweighted 1D cone median jump, but by fitting a spatial template proportional to the Planck $353\text{ GHz}$ optical depth $\tau_{353}(\alpha_i, \delta_i)$, marginalizing over each star's full distance-extinction posterior $P(d_i, A_{V,i} \mid \hat{\mathbf{m}}_i, \varpi_i, \sigma_{\varpi,i})$ and an explicit foreground/background outlier mixture fraction $f_{\text{out}}$.
   - **Edenhofer et al. (2024, *A&A*, 685, A82, DOI: `10.1051/0004-6361/202347628`)** reconstruct a parsec-scale 3D Galactic differential dust extinction cube out to $1.25\text{ kpc}$ using 54 million stars with Gaia DR3 XP spectrophotometric distances and extinctions (Zhang, Green & Rix 2023, *MNRAS*, 524, 1855, DOI: `10.1093/mnras/stad1941`), resolving local clouds in 3D $(X,Y,Z)$ without parametric single-step assumptions.

2. **CO Position–Position–Velocity (PPV) Decomposition & Background-Eliminated Extinction-Parallax (BEEP):**
   - **Dame, Hartmann & Thaddeus (2001, *ApJ*, 547, 792, DOI: `10.1086/318388`)** and **Yan et al. (2019, *ApJ*, 885, 19, DOI: `10.3847/1538-4357/ab458e`; 2021a, *A&A*, 646, A16, DOI: `10.1051/0004-6361/202039768`; 2021b, *ApJ*, 910, 131, DOI: `10.3847/1538-4357/ac214f`; VizieR `J/ApJ/910/131`)** show that molecular clouds identified in 3D PPV cubes $(\alpha, \delta, v_{\text{LSR}})$ via $^{12}\text{CO}/^{13}\text{CO}/\text{C}^{18}\text{O}$ line emission (e.g., MWISP, CfA CO, SEDIGISM) must first be isolated in velocity space.
   - Yan et al.'s **BEEP** method subtracts the smooth Galactic extinction gradient using an **off-cloud control sample** around the CO contour before fitting the Bayesian monotonic jump in **on-cloud** stars, and rejects sightlines where background stars are censored by high optical depth or confused with overlapping velocity components.

3. **Near-Infrared Color Excess (`NICER` / `NICEST`) for Dust-Censored Dark Nebulae & Globules:**
   - **Lombardi & Alves (2001, *A&A*, 377, 1023, DOI: `10.1051/0004-6361:20011099`)** and **Lombardi (2009, *A&A*, 493, 735, DOI: `10.1051/0004-6361:200810519`)** derive optimal multi-band near-infrared extinction estimators (`NICER` and sub-pixel inhomogeneity-corrected `NICEST`) from 2MASS $(J-H, H-K_s)$ colors. Because $A_K \approx 0.112\,A_V$ (Cardelli, Clayton & Mathis 1989, *ApJ*, 345, 245, DOI: `10.1086/167900`), NIR photometry penetrates $\sim 9\times$ deeper in visual extinction than optical Gaia $G$/BP/RP spectra, recovering reddened background stars behind Lynds Dark Nebulae (Lynds 1962, *ApJS*, 7, 1, DOI: `10.1086/190072`; VizieR `VII/7A`, opacity classes $1\text{–}6$).

4. **Independent Ground-Truth Benchmarks (VLBI Maser Parallaxes & 6D Associations):**
   - **Reid et al. (2019, *ApJ*, 885, 131, DOI: `10.3847/1538-4357/ab4a11`; VizieR `J/ApJ/885/131`)** provide $\sim 200$ VLBI trigonometric maser parallaxes and LSR velocities $(\varpi_{\text{VLBI}}, \mu_\alpha^*, \mu_\delta, v_{\text{LSR}})$ directly tied to high-mass star-forming cores, independent of Gaia optical extinction.
   - **Hunt & Reffert (2023, *A&A*, 673, A114, DOI: `10.1051/0004-6361/202346285`; VizieR `J/A+A/673/A114`)** provide HDBSCAN-validated 5D/6D open cluster and young stellar association memberships.

5. **Selective Prediction & Explicit Abstention Validation:**
   - **Chow (1970, *IEEE Trans. Inf. Theory*, 16, 41, DOI: `10.1109/TIT.1970.1054406`)** and **Geifman & El-Yaniv (2017, *NeurIPS*, 30, arXiv:`1705.08500`)** formalize prediction with a reject/abstention option $(f, g)$, where $g(x) \in \{0, 1\}$ gates whether the model emits a prediction $f(x)$ or abstains, evaluated via the **Risk–Coverage curve** and **Area Under the Risk–Coverage Curve (AURC)**.

---

## 3. Architecture & Technical Remediation Plan

All proposed changes preserve the repository constraints in `AGENTS.md` and `SPEC.md` (flat procedural scripts, $\le 400\text{ LOC}$ per file, `pixi run` execution, `@dataclass Config` with `tyro.cli`, `rich` tables, `loguru` logging).

### 3.1 Fix 1 — Extended-Object Taxonomy, Unresolved Globules & Resolver Provenance (`estimators.py`)

1. **Complete extended-object classification (`EXTENDED_OTYPES`):**
   Update the extended-object check in `distance.py` and `estimators.py` so dark nebulae, globules, molecular clouds, and star-forming regions are **never** misrouted to the `point_gaia` / `point_hip` ("nearest star") branch:
   ```python
   EXTENDED_OTYPES = {
       "HIIReg", "HII", "OpenCluster", "OpC", "Cl*", "Ass*", "Association",
       "Neb", "RfNeb", "RNe", "DarkNeb", "DNe", "Glb", "Globule",
       "MolCld", "MoC", "Cloud", "StarFormingReg", "SFR", "SNR", "PN",
   }
   EXTENDED_NAME_PREFIXES = ("LDN ", "L ", "BARNARD ", "B ", "CB ", "BHR ", "DC ", "SH2-", "IC ", "NGC ")
   ```
   If `obj_type in EXTENDED_OTYPES` or the normalized target name starts with an `EXTENDED_NAME_PREFIXES` token (even when the resolver returns `object_type="Unknown"`), force `is_extended = True` and **prohibit** `point_gaia` / `point_hip` fallback.

2. **Catalog alias normalization & multi-resolver fallback:**
   Normalize shorthand dark-nebula identifiers before querying (`r"^B\s*(\d+)$" -> "Barnard \1"`, `r"^L\s*(\d+)$" -> "LDN \1"`), so `B68` and `B33` resolve cleanly to `Barnard 68` (`LDN 57`) and `Barnard 33` (`Horsehead Nebula`). If MAST `Mast.Name.Lookup` lacks `radius_deg`, query VizieR (`https://vizier.cfa.harvard.edu/viz-bin/asu-tsv` over IPv4) against `VII/7A` (Lynds 1962 area/axes + opacity class) and SIMBAD `galdim_majaxis`.

3. **Unclip small globule radii & separate on-cloud vs control apertures:**
   Remove the lower bound `0.15°` in `np.clip(meta["radius_deg"], 0.15, 0.45)`. Instead, define:
   - **On-cloud aperture radius:** $r_{\text{on}} = \text{clip}(r_{\text{cat}},\, 0.015^\circ,\, 0.45^\circ)$ (preserving compact globules such as `LDN 1551` at $0.025^\circ$ and `B33` at $0.05^\circ$),
   - **Off-cloud control annulus:** $r_{\text{off,in}} = 1.25\,r_{\text{on}}$, $r_{\text{off,out}} = \max(0.15^\circ,\, 2.5\,r_{\text{on}})$.

4. **Versioned service & catalog provenance receipt:**
   Attach a `provenance` dictionary to every live query and CLI/evaluation run recording:
   - Resolver endpoint, HTTP status, and resolved `canonical_name` / `object_type`,
   - Exact TAP endpoint URLs and table identifiers (`gaiadr3.gaia_source`, `external.gaiaedr3_distance`, `gaiadr3.astrophysical_parameters`, `fp_psc`, `allwise_p3as_psd`, `VII/7A`, `J/ApJ/879/125`, `J/A+A/633/A51`, `J/ApJ/910/131`),
   - Query UTC timestamp, ADQL SHA-256 digest, and returned row counts per table.

---

### 3.2 Fix 2 — De-Censoring Gaia Queries, NIR Extinction (`NICER`) & Optical Range Confirmation

1. **Remove bright-star SQL censoring (`ORDER BY g.phot_g_mean_mag ASC`):**
   In `fetch_all_catalogs()` (`estimators.py:115`), ordering by `phot_g_mean_mag ASC` with `TOP 500` truncates the IC 434 sightline at $G = 17.55\text{ mag}$, censoring faint reddened background stars. Replace with a two-stratum query or `ORDER BY g.random_index ASC` with `g.parallax_over_error > 1.5` down to $G \le 21.0\text{ mag}$ (and increase default `max_cone_stars` or prioritize on-cloud stars within $r_{\text{on}}$).

2. **Hybrid Optical + Near-IR (`NICER`) extinction per star:**
   When `azero_gspphot` and `ebpminrp_gspphot` are `NaN` due to dust censoring of Gaia BP/RP spectra ($G \gtrsim 19\text{ mag}$), compute near-infrared extinction $A_{0,\text{NIR}}$ from 2MASS $(J-H, H-K_s)$ and AllWISE $(K_s - W1)$ via the `NICER` minimum-variance linear estimator (Lombardi & Alves 2001):
   $$E(J-H)_i = (J - H)_i - \langle J - H \rangle_{\text{off}}, \qquad E(H-K_s)_i = (H - K_s)_i - \langle H - K_s \rangle_{\text{off}}$$
   $$A_{V,i}^{\text{NICER}} = \frac{w_{JH}\,(E(J-H)_i / k_{JH}) + w_{HK}\,(E(H-K_s)_i / k_{HK})}{w_{JH} + w_{HK}}, \qquad k_{JH} = 0.107,\; k_{HK} = 0.063$$
   where $\langle J-H \rangle_{\text{off}}, \langle H-K_s \rangle_{\text{off}}$ are measured from unreddened foreground/off-cloud stars ($d < 150\text{ pc}$) and $w_{JH}, w_{HK}$ are inverse total variances $(\sigma_{\text{phot},i}^2 + \sigma_{\text{intr}}^2)^{-1}$.

3. **Explicit optical dynamic-range confirmation gate (*Potwierdzenie optycznego zakresu dla wybranych LDN*):**
   For any dark nebula / LDN target (specifically verifiable on two benchmark LDNs such as **`LDN 1630`** and **`LDN 1622`** in Orion, or any user-supplied LDN pair), compute a structured **Optical Range Diagnostic**:
   - **Lynds opacity class / column depth:** Fetch Lynds (1962, `VII/7A`) opacity class $\text{Op} \in \{1..6\}$ (where $\text{Op}=6$ corresponds to $A_V \gtrsim 5\text{–}20\text{ mag}$) or 90th-percentile on-cloud $A_V^{\text{NICER}}$.
   - **Limiting background distance at cloud extinction $A_G \approx 0.789\,A_V$:**
     $$d_{\max,\text{opt}}(A_V) = 10 \times 10^{(G_{\text{lim}} - M_{G,\text{M0V}} - 0.789\,A_V)/5}\text{ pc} \quad (G_{\text{lim}} \approx 20.7\text{ mag})$$
   - **Foreground/background bracket check:** Require at least $N_{\text{fg,on}} \ge 5$ stars inside $\mathcal{M}_{\text{on}}$ with $d + \sigma_d < d_c$ and $N_{\text{bg,on}} \ge 5$ stars inside $\mathcal{M}_{\text{on}}$ with $d - \sigma_d > d_c$ and $A_0 > A_{0,\text{fg}} + 2\sigma_{A_0}$.
   - If $N_{\text{bg,on}} < 5$ (opaque core censoring Gaia optical stars) or $d_{\max,\text{opt}}(A_V) \le d_c$, flag `optical_range_confirmed = False` and abstain from optical breakpoint claims rather than fitting off-cloud stars.

---

### 3.3 Fix 3 — Versioned 2D Masks, PPV Cube Velocity Slicing & Bayesian Multi-Jump Tomography

1. **Versioned 2D cloud masks (`data/masks/`):**
   Support loading a versioned FITS/JSON spatial mask for any target cloud:
   - Schema: `{"target": "LDN 1630", "version": "v1", "sha256": "...", "source": "Planck_tau353 / Lynds_VII_7A / MWISP_13CO", "v_lsr_kms": [8.0, 12.5], "polygon_icrs_deg": [[ra1, dec1], ...]}` or a 2D WCS FITS cutout with threshold $\tau_{\text{th}}$.
   - Partition cone stars into **on-cloud** ($\mathbf{r}_i \in \mathcal{M}_{\text{on}}$) and **off-cloud control** ($\mathbf{r}_i \in \mathcal{M}_{\text{off}}$) using `astropy.coordinates` / polygon-in-sky containment.

2. **PPV cube velocity-component slicing (`kostki PPV`):**
   When a 3D Position–Position–Velocity spectral FITS cube $T_{\text{mb}}(\alpha, \delta, v_{\text{LSR}})$ (e.g., $^{12}\text{CO}$ or $^{13}\text{CO}$) is provided or queried:
   - Identify distinct velocity peaks $\{v_1, \dots, v_K\}$ along the sightline spectrum $\bar{T}(v_{\text{LSR}})$ via 1D peak finding above $3\sigma_{\text{rms}}$.
   - Integrate channel maps $W_k(\alpha, \delta) = \int_{v_k - \Delta v}^{v_k + \Delta v} T_{\text{mb}}(\alpha, \delta, v)\,\mathrm{d}v$ for each velocity component $k$.
   - Construct the **unconfused single-component mask**:
     $$\mathcal{M}_k^{\text{clean}} = \left\{(\alpha,\delta) : W_k(\alpha,\delta) \ge 5\sigma_{W,k} \;\land\; \sum_{j \ne k} W_j(\alpha,\delta) < 2\sigma_{W,j}\right\}$$
   - If $\mathcal{M}_k^{\text{clean}}$ contains fewer than $N_{\min}$ foreground/background stars (severe line-of-sight component overlap), mark the component as `UNRESOLVED_PPV_OVERLAP` and require literature import / manual evaluation.

3. **Bayesian differential on/off-cloud breakpoint model (replacing `- 0.1 * jumps * len(a0)`):**
   Replace the ad-hoc jump reward in `fit_extinction_breakpoint()` with a proper Bayesian / likelihood-ratio step model (Zucker et al. 2019; Yan et al. 2019):
   - Subtract the smooth off-cloud baseline $\hat{A}_{0,\text{off}}(d)$ estimated from $\mathcal{M}_{\text{off}}$:
     $$\Delta A_{0,i} = A_{0,i}^{\text{on}} - \hat{A}_{0,\text{off}}(d_i)$$
   - For each candidate cloud distance $d_c$, compute the distance-uncertainty-weightedforeground probability of star $i$:
     $$p_{\text{fg},i}(d_c) = \Phi\!\left(\frac{d_c - d_i}{\sigma_{d,i}}\right), \qquad \mu_i(d_c, \delta A_{\text{fg}}, \Delta A_{\text{cloud}}) = p_{\text{fg},i}(d_c)\,\delta A_{\text{fg}} + (1 - p_{\text{fg},i}(d_c))(\delta A_{\text{fg}} + \Delta A_{\text{cloud}})$$
   - Evaluate the Gaussian/Huber mixture log-likelihood $\ln \mathcal{L}_1(d_c, \delta A_{\text{fg}}, \Delta A_{\text{cloud}})$ against the **no-jump null model** $\mathcal{H}_0: \Delta A_{\text{cloud}} = 0$ ($\ln \mathcal{L}_0$):
     $$\Delta \text{BIC} = 2\left(\max_{d_c, \Delta A > 0} \ln \mathcal{L}_1 - \ln \mathcal{L}_0\right) - k_{\text{params}} \ln N_{\text{on}}$$
   - Accept the dust breakpoint only if $\Delta \text{BIC} \ge 10.0$, $\Delta A_{\text{cloud}} \ge 0.25\text{ mag}$, $N_{\text{fg,on}} \ge 5$, and $N_{\text{bg,on}} \ge 5$.

---

### 3.4 Fix 4 — Physical Association Gate & Curated Literature Import (`distance.py`, `estimators.py`)

When the target is a cloud component, an H II region / cluster complex, a single velocity slice, or a dark globule, **"nearest star" (`point_gaia`) and "largest jump" (`fit_extinction_breakpoint`) do not prove physical association**. Replace the unconditional 3-tier dispatch (`V2`) with a **5-tier Association-Verified Dispatch**:

1. **Tier 1 — Extragalactic ($z_{\text{CMB}} > 0.0005$):** Flat $\Lambda$CDM (`Planck18`) with heliocentric-to-CMB dipole transformation.
2. **Tier 2 — True Point Source (`not is_extended` and verified stellar/compact `object_type`):** Gaia DR3 Bailer-Jones `r_med_photogeo` ($\text{RUWE} < 1.4$, Lindegren+2021 ZP) or Hipparcos-2. *Never entered for `DarkNeb`, `MolCld`, `HIIReg`, `StarFormingReg`, or `LDN`/`Barnard` targets.*
3. **Tier 3 — Curated Literature / Maser / YSO Association Import (`data/literature_distances.csv` + VizieR):**
   Match target identifier, coordinates, and $v_{\text{LSR}}$ against curated primary catalogs:
   - Zucker et al. (2019, 2020; `J/ApJ/879/125`, `J/A+A/633/A51`) molecular cloud compendium (e.g., `LDN 1630` / Orion B at $d \approx 401 \pm 20\text{ pc}$, `LDN 1622` at $d \approx 412 \pm 21\text{ pc}$, `LDN 183` at $d \approx 109 \pm 6\text{ pc}$, `LDN 1688` at $d \approx 139 \pm 7\text{ pc}$, `LDN 1495` at $d \approx 130 \pm 7\text{ pc}$, `LDN 1551` at $d \approx 145 \pm 8\text{ pc}$),
   - Reid et al. (2019; `J/ApJ/885/131`) VLBI maser parallaxes matched in $(\alpha, \delta, v_{\text{LSR}})$,
   - Yan et al. (2019, 2021; `J/ApJ/910/131`) CO PPV + Gaia BEEP molecular cloud distances.
4. **Tier 4 — Validated Extended Synthesis (On/Off-Cloud Differential Breakpoint or 5D/6D Cluster):**
   - For open clusters / stellar associations (`OpC`, `Cl*`, `Ass*`): 5D/6D phase-space membership + hierarchical parallax likelihood, requiring $\ge 5$ kinematically coherent members with proper-motion dispersion $\sigma_\mu < 1.5\text{ mas/yr}$.
   - For dark/molecular clouds and H II regions (`DarkNeb`, `MolCld`, `HIIReg`, `Neb`): On/off-cloud differential extinction jump requiring `optical_range_confirmed == True` ($N_{\text{fg,on}} \ge 5$, $N_{\text{bg,on}} \ge 5$) and $\Delta \text{BIC} \ge 10.0$ (plus velocity consistency $|v_{\text{rad,YSO}} - v_{\text{LSR,CO}}| < 5\text{ km/s}$ when radial velocities are available).
5. **Tier 5 — Explicit Abstention (`ABSTAIN_NEEDS_MANUAL_OR_IMPORT`):**
   If an extended/cloud target lacks a curated Tier-3 match and fails Tier-4 validation (due to unresolved globule size, background dust censoring, multi-velocity PPV confusion, or $\Delta\text{BIC} < 10$), **explicitly abstain** from reporting a synthetic 3D $(X,Y,Z)$ position and emit a structured diagnostic stating which requirement failed (`UNRESOLVED_GLOBULE`, `DUST_CENSORED_BACKGROUND`, `MISSING_PPV_MASK`, or `UNPROVEN_ASSOCIATION`).

---

### 3.5 Fix 5 — Regressor Ground Truth, Explicit Abstention Gate & Risk–Coverage Validation (`estimators.py`, `evaluate.py`)

As the external pilot noted, missing cutouts, dust censoring, and unverified service versions do not automatically become a valid supervised regression task without:

1. **Independent ground-truth assignments (*Niezależne przypisania prawdy*):**
   - Separate internal self-consistency checks (predicting held-out `r_med_photogeo` from photometry) from **external ground-truth validation**:
     - For stars: validate spectrophotometric $k$-NN predictions against cluster members whose systemic distance is fixed independently via hierarchical cluster parallax (Hunt & Reffert 2023) or eclipsing binary / VLBI benchmarks.
     - For clouds: never train a stellar feature regressor to output cloud distances; evaluate cloud distance estimators against the independent Zucker et al. (2020) / Yan et al. (2021) / Reid et al. (2019) benchmark table.

2. **Explicit abstention gate in `predict_knn_subspace()` (*Jawna walidacja odmów*):**
   Remove the silent uniform fallback `np.where(w_sum > 0.0, ..., 1.0 / k)` in `estimators.py:250`. Define three explicit non-abstention conditions for every test star $i$:
   - **Minimum subspace weight coverage:** $w_{\text{avail},i} = \max_{j \in \mathcal{N}_k(i)} \sum_{c \in O_{ij}} \tilde{w}_c^2 \ge w_{\min}$ (requiring at least one non-coordinate photometric/spectroscopic distance indicator in $O_{ij}$; bare $(\text{RA}, \text{Dec})$ must abstain),
   - **Minimum effective neighbor count:** $N_{\text{eff},i} = \frac{(\sum_{j=1}^k \alpha_{ij})^2}{\sum_{j=1}^k \alpha_{ij}^2} \ge 3.0$,
   - **Maximum epistemic uncertainty / minimum information gain:** $\hat{\sigma}_i \le \sigma_{\max}$ (e.g., $0.25\text{ dex}$) and $D_{\text{KL}}(P_{\text{post},i} \parallel P_{\text{prior}}) \ge 0.15\text{ bits}$.
   When any condition fails, set `abstain_mask[i] = True` and `pred_logd[i] = np.nan` rather than fabricating a point estimate.

3. **Abstention validation metrics in `evaluate.py`:**
   Add an explicit **Abstention & Selective Risk Table** to `evaluate.py` reporting (Geifman & El-Yaniv 2017):
   - **Coverage** $\phi(\tau) = \frac{1}{N_{\text{test}}} \sum_i \mathbb{I}[\hat{\sigma}_i \le \tau \land w_{\text{avail},i} \ge w_{\min}]$,
   - **Selective Risk (MAE / RMSE on accepted predictions)** vs coverage at thresholds $\phi \in \{1.0, 0.9, 0.8, 0.7, 0.5\}$,
   - **Area Under the Risk–Coverage Curve (`AURC`)**,
   - **Refusal Recall on Censored / Coordinates-Only Inputs:** Verify $100\%$ abstention rate when only $(\text{RA}, \text{Dec})$ or disjoint feature sets ($O_{ij} = \emptyset$) are provided.

---

## 4. Implementation Checklist (Mapping to `SPEC.md` Tasks)

| Proposed Task | Target Files | Observable Acceptance Criterion |
|---|---|---|
| **T13: Extended taxonomy, alias resolver & service provenance** | `estimators.py`, `distance.py` | `B68`, `B33`, `LDN 1630`, `LDN 1622`, `LDN 1688` resolve with `is_extended=True`; `point_gaia` ("nearest star") never triggers on `DarkNeb` / `LDN`; provenance dict logged. |
| **T14: Curated literature & PPV/mask registry (`data/literature_distances.csv`)** | `estimators.py`, `distance.py` | Known clouds (`LDN 1630`, `LDN 1622`, `LDN 183`, `LDN 1688`, `LDN 1495`, `LDN 1551`, `B68`, `B33`, `IC 434`) report curated literature / PPV / maser distances with DOI citations and optional 2D mask / PPV velocity range $[v_{\min}, v_{\max}]$. |
| **T15: De-censored Gaia sampling, `NICER` NIR extinction & LDN optical-range gate** | `estimators.py`, `evaluate.py` | Remove `ORDER BY phot_g_mean_mag ASC` bright-only bias; compute 2MASS/WISE `NICER` $A_V$ when `azero_gspphot` is `NaN`; report `optical_range_confirmed` ($N_{\text{fg,on}} \ge 5, N_{\text{bg,on}} \ge 5, \Delta\text{BIC} \ge 10$) on two benchmark LDNs (`LDN 1630`, `LDN 1622`). |
| **T16: Explicit abstention gate & Risk–Coverage validation** | `estimators.py`, `evaluate.py` | `predict_knn_subspace` returns explicit `abstain_mask`; coordinates-only (`RA, Dec`) and disjoint-subspace ($O_{ij}=\emptyset$) inputs abstain ($100\%$ refusal recall); `evaluate.py` prints Selective Risk vs Coverage & `AURC`. |

---

## 5. Primary References

1. **Bailer-Jones, C. A. L., et al. (2021)**, *AJ*, 161, 147 — Geometric and photogeometric distances to 1.47B Gaia EDR3 stars. DOI: `10.3847/1538-3881/abd806`
2. **Cardelli, J. A., Clayton, G. C., & Mathis, J. S. (1989)**, *ApJ*, 345, 245 — Optical-to-NIR interstellar extinction law ($R_V$ and $A_K / A_V$). DOI: `10.1086/167900`
3. **Chow, C. K. (1970)**, *IEEE Trans. Inf. Theory*, 16(1), 41–46 — Optimum recognition error and reject tradeoff. DOI: `10.1109/TIT.1970.1054406`
4. **Creevey, O. L., et al. (2023)**, *A&A*, 674, A26 — Gaia DR3 Apsis GSP-Phot methods and magnitude/extinction selection limits. DOI: `10.1051/0004-6361/202243688`
5. **Dame, T. M., Hartmann, D., & Thaddeus, P. (2001)**, *ApJ*, 547, 792 — Milky Way $^{12}\text{CO}$ Position–Position–Velocity survey. DOI: `10.1086/318388`
6. **Edenhofer, G., Zucker, C., Frank, P., et al. (2024)**, *A&A*, 685, A82 — Parsec-scale Galactic 3D dust map out to $1.25\text{ kpc}$ from Gaia XP. DOI: `10.1051/0004-6361/202347628`
7. **Geifman, Y., & El-Yaniv, R. (2017)**, *NeurIPS*, 30 — Selective classification, risk–coverage curves, and abstention validation. arXiv:`1705.08500`
8. **Hunt, E. L., & Reffert, S. (2023)**, *A&A*, 673, A114 — Gaia DR3 all-sky open cluster and moving group census (`J/A+A/673/A114`). DOI: `10.1051/0004-6361/202346285`
9. **Lombardi, M., & Alves, J. (2001)**, *A&A*, 377, 1023 — Multi-band near-infrared dust column density mapping (`NICER`). DOI: `10.1051/0004-6361:20011099`
10. **Lombardi, M. (2009)**, *A&A*, 493, 735 — `NICEST`: Near-infrared color excess tailored for small-scale cloud substructures and globules. DOI: `10.1051/0004-6361:200810519`
11. **Lynds, B. T. (1962)**, *ApJS*, 7, 1 — Catalogue of Dark Nebulae (`LDN`, VizieR `VII/7A`). DOI: `10.1086/190072`
12. **Reid, M. J., Menten, K. M., Brunthaler, A., et al. (2019)**, *ApJ*, 885, 131 — Trigonometric VLBI maser parallaxes of star-forming regions (`J/ApJ/885/131`). DOI: `10.3847/1538-4357/ab4a11`
13. **Yan, Q.-Z., Zhang, B., Xu, Y., et al. (2019)**, *ApJ*, 885, 19 — Molecular cloud distances from MWISP CO PPV cubes and Gaia DR2 (`BEEP`). DOI: `10.3847/1538-4357/ab458e`
14. **Yan, Q.-Z., Yang, J., Su, Y., et al. (2021)**, *ApJ*, 910, 131 — Improved molecular cloud distances from CO PPV global search (`BEEP-II`, VizieR `J/ApJ/910/131`). DOI: `10.3847/1538-4357/ac214f`
15. **Zucker, C., Speagle, J. S., Schlafly, E. F., et al. (2019)**, *ApJ*, 879, 125 — Accurate distances to local molecular clouds with Gaia DR2 (`J/ApJ/879/125`). DOI: `10.3847/1538-4357/ab2388`
16. **Zucker, C., Speagle, J. S., Schlafly, E. F., et al. (2020)**, *A&A*, 633, A51 — Compendium of distances to molecular clouds in the Star Formation Handbook (`J/A+A/633/A51`). DOI: `10.1051/0004-6361/201936145`

## 6. Literature-method repair evidence

Current contract: `SPEC.md`; earlier implementation plans above remain historical, not verification evidence.

- Gaia calibration: author source https://gitlab.com/icc-ub/public/gaiadr3_zeropoint/-/raw/master/zero_point/zpt.py, linked by https://www.cosmos.esa.int/web/gaia/edr3-code. Dependency `gaiadr3-zeropoint==0.1.0`; supported domains `6<G<21`, five-parameter `1.1<nu_eff<1.9`, six-parameter `1.24<pseudocolour<1.72`. Wrapper agrees exactly with dependency on representative 5p/6p inputs; unsupported/missing inputs remain unavailable, raw parallax explicitly labeled.
- Original UPMASK: https://arxiv.org/html/1309.4471v1, §2.3. KDE spatial statistic `(max-density - mean-density)/std-density`, threshold uniform-field mean plus one standard deviation, 2000 null realizations; iterative group rejection and uncertainty-resampled outer membership votes. Implementation adapts non-spatial observables to astrometry, uses 99%-variance PCA, ~25 stars/group, 100 seeded outer repetitions and a 25×25 spatial grid. These numerical choices require reference/control verification; they are not claimed identical to author R defaults. Circular cone versus rectangular null-field footprint remains a verification concern.
- XD: https://arxiv.org/abs/0905.2979. Joint feature/log-distance full-covariance EM uses observed-dimension projection and conditional latent first/second moments. Measurement errors propagate through first-order feature Jacobians; supplied feature correlations retained. Unreported correlations remain an explicit independence approximation. Target interval converted to approximate Gaussian log-distance error; missing feature errors exclude those dimensions rather than inventing noise. Trusted-reference/noise-recovery checks remain pending.
- Bundled CSV has parallax errors and distance intervals, but no measured proper-motion/photometric errors. Original CSV preserved. This dataset cannot demonstrate uncertainty-resampled UPMASK or feature-based XD recovery; XD may learn only marginal log-distance distribution when no feature errors exist.
- VizieR ReadMe/TAP schema requests for `I/354` and `J/ApJ/944/94` failed or timed out. Existing query identifiers/columns remain unverified; no live StarHorse/CF4 integration claim. Query status records failures explicitly. Removed hardcoded CF4 galaxies and synthetic Gaia/Bailer-Jones values labeled StarHorse; normalized CF4 table consumer supports coordinate matching, ambiguity rejection and distance-modulus conversion, but still needs schema-verified live rows.
- Gaussian KL is an approximation to posterior information, not exact mixture KL. Report signed pruning changes; no finite-sample monotonicity guarantee.
