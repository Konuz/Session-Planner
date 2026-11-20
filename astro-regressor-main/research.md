# Design Notes & Literature Alignment

`astro-regressor` estimates distances across disparate astrophysical regimes—extragalactic systems, individual stars, open clusters, and opaque dark nebulae—while tracking catalog provenance, measurement uncertainties, and explicit abstention boundaries.

## 1. Failure Modes Addressed in Sightline Distance Estimation

Naive wide-cone heuristics break down systematically on molecular clouds, dark nebulae, and extragalactic fields:

1. **Nearest-star projection fallacy:** Matching a dark nebula or globule (`DarkNeb`, `MolCld`, `StarFormingReg`, `LDN`, `BARNARD`, `CB`) to the closest Gaia DR3 star within $15''$ assigns an unrelated foreground or background star's parallax to the cloud.
2. **Aperture dilution of compact globules:** Clipping search radii up to $0.15^\circ$ inflates compact globules such as `LDN 1551` ($r = 0.025^\circ$) and `Barnard 33` ($r = 0.05^\circ$) by $9\times\text{–}36\times$ in sky area, swamping on-cloud dust signatures with unrelated field stars.
3. **Double dust censoring:** Ordering Gaia cone queries by `phot_g_mean_mag ASC` with `TOP N` truncates the sample at bright magnitudes and discards reddened background stars. High column densities in dense `LDN` cores also strip Gaia BP/RP `azero_gspphot` / `ebpminrp_gspphot` estimates even when 2MASS/WISE near-infrared photometry exists.
4. **Unconstrained dust steps and multi-velocity confusion:** Picking the single largest median $A_0$ step across an entire cone fires on background clouds or overlapping velocity layers along complex sightlines (e.g., Orion `IC 434` / `LDN 1630` / `LDN 1622`) without proving physical association.
5. **Unbounded point predictions on missing features:** Standard $k$-NN regressors that zero-impute missing bands or fall back to uniform neighbor averages emit arbitrary point predictions even when given bare sky coordinates $(\text{RA}, \text{Dec})$ or disjoint feature subspaces ($O_{ij} = \emptyset$).

## 2. Implemented Architecture & Standards

### Target Classification, Provenance, and Aperture Handling (`catalogs.py`)

- `normalize_target_key` canonicalizes shorthand identifiers (`B68` $\to$ `BARNARD 68`, `B33` $\to$ `BARNARD 33`, `LDN`/`IC` prefixes) before name lookup.
- `EXTENDED_OTYPES`, `DARK_CLOUD_OTYPES`, and `EXTENDED_PREFIXES` force `is_extended = True` for diffuse nebulae, clusters, molecular clouds, and dark clouds, prohibiting `point_gaia` and `point_hip` fallback.
- `resolve_name` preserves compact globule radii down to $0.015^\circ$ (e.g., `LDN 1551` at $0.025^\circ$, `Barnard 33` at $0.05^\circ$) and attaches a SHA-256 query digest and UTC timestamp provenance record.
- `fetch_all_catalogs` filters $\text{RUWE} < 1.4$, orders Gaia DR3 sources by `parallax_over_error DESC` (preserving faint reddened background stars), fetches measurement uncertainties across Gaia, 2MASS, AllWISE, and StarHorse (`I/354/starhorse2021`), and logs per-catalog query status and row counts.

### Regime-Specific Distance Synthesis (`estimators.py`)

- **Extragalactic ($z \to d$ & Cosmicflows-4):** Matches **Cosmicflows-4** distance moduli (`J/ApJ/944/94/table2`, $d_{\text{Mpc}} = 10^{(\text{DM} - 25)/5}$) with angular ambiguity rejection alongside **SDSS DR17** redshifts ($z > 0.0005$). For $z_{\text{helio}} < 0.05$, `helio_to_cmb_z` applies the Planck CMB dipole transformation before flat $\Lambda\text{CDM}$ integration (`Planck18`).
- **Resolved stars:** Subtracts the published Lindegren et al. (2021) 5p/6p parallax zero-point via `gaiadr3-zeropoint==0.1.0` inside its supported domain ($6 < G < 21$, valid color and ecliptic latitude), while keeping unsupported rows explicitly labeled with raw parallax (`zp_applied=False`). Synthesizes Bailer-Jones photogeometric (`r_med_photogeo`), geometric, **StarHorse**, and **GSP-Phot** estimates, with **Hipparcos-2** fallback.
- **Open clusters and H II regions:** Uses the 1D log-distance KDE mode ($h = 0.12\text{ dex}$) to seed 5D tangent-plane phase-space clustering (`HDBSCAN` or astrometric `UPMASK`) followed by hierarchical parallax MLE ($\prod_i \mathcal{N}(\varpi_{\text{corr},i} \mid 1000/\theta_d, \sigma_{\varpi,i}^2 + \sigma_{\text{int}}^2)$). Uniform-field noise or kinematically incoherent cones explicitly abstain rather than silently falling back to MAD.
- **Dark nebulae and globules:** Rescues optically censored stars using **2MASS/WISE `NICER`** color excess (`compute_nicer_extinction`), subtracts off-cloud foreground extinction in `fit_extinction_breakpoint`, and gates automatic cloud distance overrides on $\Delta\text{BIC} \ge 10.0$, $\Delta A_0 \ge 0.25\text{ mag}$, $N_{\text{fg,on}} \ge 5$, $N_{\text{bg,on}} \ge 5$, optical limiting magnitude $d_{\max,\text{opt}} \ge d_c$, and single-component PPV confirmation (`ppv_components == 1`). Sightlines failing these gates fall back to curated PPV/maser catalog entries (`CURATED_CLOUDS`) when matched in $(\alpha, \delta, v_{\text{LSR}})$ or abstain (`UNRESOLVED_PPV_OVERLAP`, `DUST_CENSORED_BACKGROUND`, `UNPROVEN_ASSOCIATION_NEEDS_PPV_MASK`).

### Missingness-Tolerant Regression & Information Loss (`estimators.py`, `evaluate.py`)

- **Extreme Deconvolution (`predict_xd_gmm`, `xd_posterior`):** Fits a full-covariance 6-component latent Gaussian mixture via EM over joint normalized features and $\log_{10}(d)$, projecting analytically onto observed finite-error subspaces ($T_{ik} = R_i V_k R_i^\top + S_i$) with first-order propagated error covariance matrices (`feature_covariance`). Missing feature uncertainties exclude that dimension from XD evidence rather than synthesizing brightness-based noise.
- **Partial-subspace $k$-NN with selective abstention (`predict_knn_subspace`, `evaluate_knn_abstention`):** Computes inverse-variance weighted distances over mutually observed bands $O_{ij}$ with $w_g / \sqrt{|g|}$ group-cardinality scaling and neighbor parallax likelihood weighting, falling back to `prior_mu` when $O_{ij} = \emptyset$ and abstaining explicitly when non-coordinate coverage or epistemic uncertainty fails Risk–Coverage thresholds (`AURC`).
- **Shannon and Bayesian KL pruning (`run_progressive_ablation`, `gaussian_kl_bits`):** Quantifies information loss $\Delta I_s = \frac{1}{2}\log_2(\text{RMSE}_s^2 / \text{RMSE}_0^2)$ and Gaussian-approximation KL divergence $D_{\text{KL}}(P_{\text{post}} \parallel P_{\text{prior}})$ in bits across 15 progressive catalog-pruning steps down to bare $(\text{RA}, \text{Dec})$.

## 3. Modeling Assumptions and Verification Limits

- **Gaia parallax zero-point:** `gaiadr3-zeropoint==0.1.0` supports $6 < G < 21$ with 5-parameter solutions ($1.1 < \nu_{\text{eff}} < 1.9$) or 6-parameter solutions ($1.24 < \hat{\nu} < 1.72$); sources outside that domain retain raw parallax (`zp_applied=False`).
- **Astrometric `UPMASK` adaptation:** Adapts Krone-Martins & Moitinho (2014) from photometric/PC observables to astrometry using 99%-variance PCA, $\approx 25$ stars per $k$-means group, 25 seeded uncertainty-resampled outer draws from full $( \mu_{\alpha^*}, \mu_\delta, \varpi_{\text{corr}})$ error covariance, a $15 \times 15$ tangent-plane spatial KDE grid, and 200 uniform rectangular null realizations at $\mu + 1.5\sigma$.
- **XD covariance and target intervals:** Measurement uncertainties propagate through first-order feature Jacobians with reported Gaia astrometric correlations retained; unreported cross-survey correlations are treated as zero. Bailer-Jones `[r_lo_photogeo, r_hi_photogeo]` bounds are approximated as symmetric Gaussian $\log_{10}(d)$ errors.
- **Bundled benchmark scope:** `data/ic434_multicatalog.csv` combined with `data/ic434_uncertainties_starhorse.csv` supplies measured uncertainties for 48 of 51 features (with 375 StarHorse matches), while `data/cosmicflows4_benchmarks.csv` supplies Cosmicflows-4 rows for M87 and NGC 4889.
- **KL trajectory and CMB frame shift:** `gaussian_kl_bits` is a Gaussian approximation to mixture posterior gain rather than exact mixture KL, and no finite-sample monotonicity is enforced along pruning trajectories. Low-$z$ redshift adjustment is an observer-frame CMB dipole correction, not a peculiar-velocity model.

## 4. Primary References

1. **Bailer-Jones, C. A. L., et al. (2021)**, *AJ*, 161, 147 — Geometric and photogeometric distances to 1.47B Gaia EDR3 stars. DOI: `10.3847/1538-3881/abd806`
2. **Anders, F., et al. (2022)**, *A&A*, 658, A91 — StarHorse photo-astrometric distances and extinctions (`I/354/starhorse2021`). DOI: `10.1051/0004-6361/202142369`
3. **Bovy, J., Hogg, D. W., & Roweis, S. T. (2011)**, *Ann. Appl. Stat.*, 5(2B), 1657–1677 — Extreme deconvolution (`arXiv:0905.2979`). DOI: `10.1214/10-AOAS439`
4. **Cardelli, J. A., Clayton, G. C., & Mathis, J. S. (1989)**, *ApJ*, 345, 245 — Optical-to-NIR interstellar extinction law. DOI: `10.1086/167900`
5. **Chow, C. K. (1970)**, *IEEE Trans. Inf. Theory*, 16(1), 41–46 — Optimum recognition error and reject tradeoff. DOI: `10.1109/TIT.1970.1054406`
6. **Creevey, O. L., et al. (2023)**, *A&A*, 674, A26 — Gaia DR3 Apsis GSP-Phot methods. DOI: `10.1051/0004-6361/202243688`
7. **Dame, T. M., Hartmann, D., & Thaddeus, P. (2001)**, *ApJ*, 547, 792 — Milky Way $^{12}\text{CO}$ PPV survey. DOI: `10.1086/318388`
8. **Edenhofer, G., Zucker, C., Frank, P., et al. (2024)**, *A&A*, 685, A82 — Parsec-scale Galactic 3D dust map out to $1.25\text{ kpc}$. DOI: `10.1051/0004-6361/202347628`
9. **Geifman, Y., & El-Yaniv, R. (2017)**, *NeurIPS*, 30 — Selective prediction and Risk–Coverage curves (`arXiv:1705.08500`).
10. **Hunt, E. L., & Reffert, S. (2023)**, *A&A*, 673, A114 — Gaia DR3 open cluster census (`J/A+A/673/A114`). DOI: `10.1051/0004-6361/202346285`
11. **Krone-Martins, A., & Moitinho, A. (2014)**, *A&A*, 561, A57 — UPMASK unsupervised cluster membership (`arXiv:1309.4471`). DOI: `10.1051/0004-6361/201321143`
12. **Lindegren, L., et al. (2021)**, *A&A*, 649, A4 — Gaia EDR3 parallax bias versus magnitude, colour, and position. DOI: `10.1051/0004-6361/202039653`
13. **Lombardi, M., & Alves, J. (2001)**, *A&A*, 377, 1023 — Multi-band near-infrared dust mapping (`NICER`). DOI: `10.1051/0004-6361:20011099`
14. **Lombardi, M. (2009)**, *A&A*, 493, 735 — `NICEST` small-scale near-infrared color excess. DOI: `10.1051/0004-6361:200810519`
15. **Lynds, B. T. (1962)**, *ApJS*, 7, 1 — Catalogue of Dark Nebulae (`VII/7A`). DOI: `10.1086/190072`
16. **Reid, M. J., et al. (2019)**, *ApJ*, 885, 131 — VLBI maser parallaxes of high-mass star-forming regions (`J/ApJ/885/131`). DOI: `10.3847/1538-4357/ab4a11`
17. **Tully, R. B., et al. (2023)**, *ApJ*, 944, 94 — Cosmicflows-4 (`J/ApJ/944/94`). DOI: `10.3847/1538-4357/ac94d8`
18. **Yan, Q.-Z., et al. (2019)**, *ApJ*, 885, 19; **(2021)**, *ApJ*, 910, 131 — CO PPV + Gaia BEEP molecular cloud distances (`J/ApJ/910/131`). DOI: `10.3847/1538-4357/ac214f`
19. **Zucker, C., et al. (2019)**, *ApJ*, 879, 125; **(2020)**, *A&A*, 633, A51 — Local molecular cloud distances (`J/ApJ/879/125`, `J/A+A/633/A51`). DOI: `10.1051/0004-6361/201936145`
