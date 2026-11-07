from concurrent.futures import ThreadPoolExecutor, as_completed
import os
import astropy.units as u, numpy as np, pandas as pd
from astropy.coordinates import SkyCoord
from astropy.cosmology import Planck18 as cosmo
from loguru import logger
from rich.console import Console
from rich.progress import BarColumn, MofNCompleteColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from scipy.optimize import minimize
from scipy.special import logsumexp
from scipy.stats import gaussian_kde
from sklearn.cluster import HDBSCAN, KMeans
from sklearn.decomposition import PCA
from catalogs import CURATED_ALIASES, CURATED_CLOUDS, DARK_CLOUD_OTYPES, EXTENDED_OTYPES, EXTENDED_PREFIXES, OPACITY_AV, PARAM_GROUPS, apply_gaia_calibration, compute_nicer_extinction, feature_covariance, fetch_all_catalogs, gaia_zeropoint_mas, is_extended_target, load_multicatalog_dataset, lookup_literature_distance, normalize_target_key, resolve_name

def fmt_val(val, fmt=".2f", suffix=""):
    return "[dim]—[/dim]" if (val is None or (isinstance(val, (float, np.floating)) and np.isnan(val))) else f"{val:{fmt}}{suffix}"

def helio_to_cmb_z(z_helio: float, ra_deg: float, dec_deg: float) -> float:
    sc, dip = SkyCoord(ra=ra_deg * u.deg, dec=dec_deg * u.deg, frame="icrs"), SkyCoord(l=264.021 * u.deg, b=48.253 * u.deg, frame="galactic").icrs
    return float((1.0 + z_helio) * (1.0 + 369.82 * float(np.cos(sc.separation(dip).radian)) / 299792.458) - 1.0)

def fit_extinction_breakpoint(df: pd.DataFrame, r_on_deg: float | None = None, opacity_class: int | None = None, ppv_components: int = 1) -> dict | None:
    if len(df) == 0 or "r_med_photogeo" not in df:
        return None
    sub = df[df["r_med_photogeo"].between(60, 2000)].copy()
    has_a, has_e = sub.get("azero_gspphot", pd.Series(dtype=float)).notna(), sub.get("ebpminrp_gspphot", pd.Series(dtype=float)).notna()
    opt_valid = (has_a | has_e).reindex(sub.index, fill_value=False).to_numpy(dtype=bool)
    a0 = np.where(opt_valid, np.where(has_a, sub.get("azero_gspphot", np.nan), 3.1 * sub.get("ebpminrp_gspphot", np.nan)).astype(float), compute_nicer_extinction(sub, r_on_deg))
    if len(sub := sub[valid_ext := np.isfinite(a0)].copy()) < 10:
        return None
    a0, opt_valid, d = a0[valid_ext], opt_valid[valid_ext], sub["r_med_photogeo"].to_numpy(dtype=float)
    sep = sub["sep_arcsec"].to_numpy(dtype=float) if "sep_arcsec" in sub else np.zeros(len(sub))
    r_cut = float(r_on_deg * 3600.0) if (r_on_deg is not None and np.nanmin(sep) < r_on_deg * 3600.0 < np.nanmax(sep) * 0.9) else float(np.nanpercentile(sep, 65))
    on_mask = (sep <= r_cut) if (np.nanmax(sep) - np.nanmin(sep)) > 10.0 else np.ones(len(sub), dtype=bool)
    on_mask = np.ones(len(sub), dtype=bool) if (on_mask.sum() < 10 or (~on_mask).sum() < 3) else on_mask
    a0_off_base = float(np.nanmedian(a0[~on_mask & (d < 350.0)])) if (~on_mask & (d < 350.0)).sum() >= 3 else 0.0
    d_on, a0_on, opt_on = d[on_mask], np.maximum(0.0, a0[on_mask] - 0.35 * a0_off_base), opt_valid[on_mask]
    grid = np.linspace(max(100.0, float(np.percentile(d_on, 10))), min(1200.0, float(np.percentile(d_on, 90))), 160)
    if len(grid := grid[valid_g := ((fg_mat := d_on[None, :] < grid[:, None]).sum(axis=1) >= 5) & ((len(d_on) - fg_mat.sum(axis=1)) >= 5)]) == 0:
        return None
    fg_mat = fg_mat[valid_g]
    m_fg, m_bg = np.nanmedian(np.where(fg_mat, a0_on[None, :], np.nan), axis=1), np.nanmedian(np.where(~fg_mat, a0_on[None, :], np.nan), axis=1)
    jumps, sig_a0 = np.maximum(0.0, m_bg - m_fg), np.maximum(0.15, 0.20 * a0_on)
    ll_1 = -0.5 * np.sum(np.log(2.0 * np.pi * sig_a0[None, :] ** 2) + ((a0_on[None, :] - np.where(fg_mat, m_fg[:, None], (m_fg + jumps)[:, None])) / sig_a0[None, :]) ** 2, axis=1)
    ll_0, bi = float(-0.5 * np.sum(np.log(2.0 * np.pi * sig_a0 ** 2) + ((a0_on - float(np.nanmedian(a0_on))) / sig_a0) ** 2)), int(np.argmax(ll_1))
    d_c, a_fg, a_bg, dj, delta_bic = float(grid[bi]), float(m_fg[bi]), float(m_bg[bi]), float(jumps[bi]), float(2.0 * (ll_1[bi] - ll_0) - 2.0 * np.log(len(d_on)))
    n_fg_opt, n_bg_opt = int((fg_mat[bi] & opt_on).sum()), int((~fg_mat[bi] & opt_on & (a0_on > a_fg + 0.12)).sum())
    d_max_opt = float(10.0 * (10.0 ** ((20.7 - 6.5 - 0.789 * max(dj, OPACITY_AV.get(int(opacity_class), 1.5) if opacity_class is not None else dj)) / 5.0)))
    opt_ok = bool((n_fg_opt >= 5) and (n_bg_opt >= 5) and (d_max_opt >= d_c) and (delta_bic >= 10.0) and (dj >= 0.25))
    return {"d_cloud_pc": d_c, "a0_fg": a_fg, "a0_bg": a_bg, "delta_a0": dj, "delta_bic": round(delta_bic, 2), "n_stars": len(sub), "n_on": int(len(d_on)), "n_fg_on": n_fg_opt, "n_bg_on": n_bg_opt, "n_nicer_rescued": int((~opt_valid).sum()), "d_max_opt_pc": round(d_max_opt, 1), "optical_range_confirmed": opt_ok, "ppv_overlap_flag": bool(ppv_components > 1)}

def upmask_spatial_stat(positions, grid):
    p = np.asarray(positions, dtype=float)
    p = p[None] if p.ndim == 2 else p
    q75, q25 = np.percentile(p, [75, 25], axis=1)
    bw = 1.06 * np.minimum(np.std(p, axis=1, ddof=1), (q75 - q25) / 1.34) * (p.shape[1] ** (-0.2))
    valid_bw = np.all(bw > 0, axis=1)
    density = np.exp(-0.5 * np.sum(((grid[None, :, None, :] - p[:, None, :, :]) / np.where(valid_bw[:, None], bw, 1.0)[:, None, None, :]) ** 2, axis=3)).mean(axis=2)
    stat = np.where(valid_bw & ((std := density.std(axis=1)) > 0), (density.max(axis=1) - density.mean(axis=1)) / np.where(std > 0, std, 1.0), np.nan)
    return float(stat[0]) if positions.ndim == 2 else stat

def upmask_membership(df, plx_col):
    values, errors = df[["pmra", "pmdec", plx_col]].to_numpy(dtype=float), df[["pmra_error", "pmdec_error", "parallax_error"]].to_numpy(dtype=float)
    noise = np.zeros((len(df), 3, 3))
    noise[:, np.arange(3), np.arange(3)] = errors ** 2
    for a, b, col in ((0, 1, "pmra_pmdec_corr"), (0, 2, "parallax_pmra_corr"), (1, 2, "parallax_pmdec_corr")):
        if col in df:
            noise[:, a, b] = noise[:, b, a] = df[col].fillna(0).to_numpy() * errors[:, a] * errors[:, b]
    if not np.isfinite(noise).all() or np.min(np.linalg.eigvalsh(noise)) < -1e-10:
        raise ValueError("UPMASK requires finite positive-semidefinite measured astrometric covariance")
    coords = SkyCoord(df["ra"].to_numpy() * u.deg, df["dec"].to_numpy() * u.deg)
    xyz = np.mean(coords.cartesian.xyz, axis=1)
    offsets = coords.transform_to(SkyCoord(x=xyz[0], y=xyz[1], z=xyz[2], representation_type="cartesian").icrs.skyoffset_frame())
    positions = np.column_stack((offsets.lon.deg, offsets.lat.deg))
    if np.any((upper := positions.max(axis=0)) <= (lower := positions.min(axis=0))):
        raise ValueError("UPMASK requires nondegenerate sky footprint")
    grid = np.column_stack([ax.ravel() for ax in np.meshgrid(*[np.linspace(a, b, 15) for a, b in zip(lower, upper)])])
    rng, null_rng, null_thresholds, votes = np.random.default_rng(42), np.random.default_rng(43), {}, np.zeros(len(df))
    eigvals, eigvecs = np.linalg.eigh(noise)
    factors, n_outer = eigvecs * np.sqrt(np.maximum(eigvals, 0))[:, None, :], 25
    for _ in range(n_outer):
        sampled, active = values + np.einsum("nij,nj->ni", factors, rng.normal(size=values.shape)), np.arange(len(df))
        while len(active) >= 5 and np.any((spread := sampled[active].std(axis=0)) > 1e-8):
            projected = PCA(n_components=0.99, svd_solver="full").fit_transform((sampled[active] - sampled[active].mean(axis=0)) / np.maximum(spread, 1e-8))
            labels = KMeans(n_clusters=max(1, len(active) // 25), n_init=1, random_state=int(rng.integers(2 ** 31))).fit_predict(projected)
            retained = []
            for label in np.unique(labels):
                if (n := len(group := active[labels == label])) >= 5:
                    if n not in null_thresholds:
                        null = upmask_spatial_stat(null_rng.uniform(lower, upper, (200, n, 2)), grid)
                        null_thresholds[n] = float(np.nanmean(null) + 1.5 * np.nanstd(null))
                    if upmask_spatial_stat(positions[group], grid) >= null_thresholds[n]:
                        retained.extend(group)
            if len(retained := np.array(retained, dtype=int)) == len(active) or len(np.unique(labels)) == 1:
                break
            active = retained
        if len(active) >= 5 and np.any(sampled[active].std(axis=0) > 1e-8):
            votes[active] += 1
    return votes / n_outer

def kde_peaks(log_d: np.ndarray, min_stars: int = 8) -> list[float]:
    """Lokalne maksima KDE log10(d) z co najmniej min_stars gwiazdami w ±0,08 dex, od najbliższego."""
    if np.ptp(log_d) <= 1e-10:
        return [float(log_d[0])]
    grid = np.linspace(log_d.min(), log_d.max(), 500)
    dens = gaussian_kde(log_d, bw_method=0.12)(grid)
    idx = [i for i in range(1, len(grid) - 1) if dens[i] >= dens[i - 1] and dens[i] > dens[i + 1]]
    peaks = [float(grid[i]) for i in idx if (np.abs(log_d - grid[i]) < 0.08).sum() >= min_stars]
    return sorted(peaks) or [float(grid[np.argmax(dens)])]

# Dyspersja prędkości poprzecznej grupy: gromady i asocjacje ≤ kilka km/s, populacja pola przy tej samej odległości
# kilkanaście–kilkadziesiąt km/s (pilotaż: IC 1990 i LBN 774 dostały grupy tła 1139 i 846–1167 pc).
MAX_GROUP_VT_KMS = 5.0

def synthesize_region_distance(df: pd.DataFrame, cone_deg: float, use_5d: bool = True, use_hier_plx: bool = True, use_zp_corr: bool = True, cluster_mode: str = "hdbscan", prefer_nearest: bool = False) -> tuple[dict, pd.DataFrame]:
    max_vt = MAX_GROUP_VT_KMS if prefer_nearest else None
    if prefer_nearest and cluster_mode == "hdbscan" and len(df) and "r_med_photogeo" in df:
        sub = df[df["r_med_photogeo"].between(40, 3000)]
        if len(sub) >= 5:
            for peak in kde_peaks(np.log10(sub["r_med_photogeo"].to_numpy(dtype=float))):
                result, members = _synthesize_region_distance(df, cone_deg, use_5d, use_hier_plx, use_zp_corr, cluster_mode, peak_override=peak, max_vt_kms=max_vt)
                if result["mode"] != "abstain":
                    return result, members
    return _synthesize_region_distance(df, cone_deg, use_5d, use_hier_plx, use_zp_corr, cluster_mode, max_vt_kms=max_vt)

def _synthesize_region_distance(df: pd.DataFrame, cone_deg: float, use_5d: bool = True, use_hier_plx: bool = True, use_zp_corr: bool = True, cluster_mode: str = "hdbscan", peak_override: float | None = None, max_vt_kms: float | None = None) -> tuple[dict, pd.DataFrame]:
    if cluster_mode not in {"hdbscan", "upmask", "mad"}:
        raise ValueError(f"Unknown cluster_mode: {cluster_mode}")
    if len(df) == 0 or "r_med_photogeo" not in df or df["r_med_photogeo"].dropna().empty:
        raise ValueError("Empty cone: no valid Gaia r_med_photogeo sources in sightline")
    if len(sub := df[df["r_med_photogeo"].between(40, 3000)].copy()) < 5:
        d = df["r_med_photogeo"].dropna().to_numpy(dtype=float)
        return {"mode": "region_kde", "method": f"Gaia DR3 Fallback Median ({len(d)} stars in r={cone_deg:.2f}°)", "distance_pc": float(np.median(d)), "lo_pc": float(np.percentile(d, 16)), "hi_pc": float(np.percentile(d, 84))}, df.assign(membership_probability=1.0)
    log_d = np.log10(sub["r_med_photogeo"].to_numpy(dtype=float))
    grid = np.linspace(log_d.min(), log_d.max(), 500)
    peak = peak_override if peak_override is not None else float(grid[np.argmax(gaussian_kde(log_d, bw_method=0.12)(grid))]) if np.ptp(log_d) > 1e-10 else float(log_d[0])
    kde_mask, plx_col = np.abs(log_d - peak) < 0.08, ("parallax_corr" if use_zp_corr and "parallax_corr" in sub else "parallax")
    probability, reason = kde_mask.astype(float), "NO_SUPPORTED_CLUSTER"
    if use_5d:
        feat = sub[["ra", "dec", "pmra", "pmdec", plx_col]].to_numpy(dtype=float)
        cand, probability = np.isfinite(feat).all(axis=1) & kde_mask, np.zeros(len(sub))
        if cand.sum() >= 5:
            med = np.median(feat[cand], axis=0)
            standardized = (feat - med) / np.maximum(1.4826 * np.median(np.abs(feat[cand] - med), axis=0), [0.05, 0.05, 0.5, 0.5, 0.15])
            mad_inlier = cand & (np.sqrt(np.mean(standardized ** 2, axis=1)) < 2.5)
            if cluster_mode == "mad":
                probability = mad_inlier.astype(float)
            elif cluster_mode == "hdbscan" and mad_inlier.sum() >= 5:
                model = HDBSCAN(min_cluster_size=5, min_samples=3).fit(standardized[mad_inlier])
                labels, counts = np.unique(model.labels_[model.labels_ >= 0], return_counts=True)
                if len(labels):
                    sel_idx = np.where(mad_inlier)[0][model.labels_ == (sel := labels[np.argmax(counts)])]
                    if float(np.hypot(np.std(sub.iloc[sel_idx]["pmra"]), np.std(sub.iloc[sel_idx]["pmdec"]))) <= 3.5:
                        probability[mad_inlier] = np.where(model.labels_ == sel, np.maximum(model.probabilities_, 0.5), 0.0)
                    else:
                        reason = "NO_KINEMATICALLY_COHERENT_CLUSTER"
            elif cluster_mode == "upmask":
                err_cols = ["pmra_error", "pmdec_error", "parallax_error"]
                usable = cand & (np.isfinite(sub[err_cols]).all(axis=1).to_numpy() & (sub[err_cols] >= 0).all(axis=1).to_numpy()) if set(err_cols).issubset(sub.columns) else np.zeros(len(sub), dtype=bool)
                if usable.sum() >= 5:
                    probs = upmask_membership(sub[usable], plx_col)
                    if (sel_u := probs >= 0.5).sum() >= 3 and float(np.hypot(np.std(sub.loc[usable, "pmra"].to_numpy()[sel_u]), np.std(sub.loc[usable, "pmdec"].to_numpy()[sel_u]))) <= 3.5:
                        probability[usable] = probs
                    else:
                        reason = "NO_SPATIALLY_CONCENTRATED_CLUSTER"
                else:
                    reason = "MISSING_UPMASK_MEASUREMENT_ERRORS"
    if len(members := sub.assign(membership_probability=probability)[probability >= 0.5].copy()) < 3:
        return {"mode": "abstain", "method": f"ABSTAIN ({cluster_mode.upper()}: {reason})", "distance_pc": np.nan, "lo_pc": np.nan, "hi_pc": np.nan, "abstain_reason": reason}, members
    mem_d = members["r_med_photogeo"].to_numpy(dtype=float)
    distance = float(np.median(mem_d))
    if use_hier_plx:
        plx, errors = members[plx_col].to_numpy(dtype=float), members["parallax_error"].to_numpy(dtype=float)
        if (valid := np.isfinite(plx) & np.isfinite(errors) & (errors > 0)).sum() < 3:
            raise ValueError("Parallax fit requires at least three finite measured uncertainties")
        plx, errors = plx[valid], errors[valid]
        result = minimize(lambda p: 0.5 * np.sum(np.log(2 * np.pi * (v := errors ** 2 + np.exp(2 * p[1]))) + (plx - 1000 / p[0]) ** 2 / v), [distance, np.log(0.05)], method="L-BFGS-B", bounds=[(10, 10000), (-12, 5)])
        if not result.success:
            raise ValueError(f"Parallax fit failed: {result.message}")
        distance = float(result.x[0])
    sigma_vt = None
    if max_vt_kms is not None:
        mad = lambda x: 1.4826 * float(np.median(np.abs(x - np.median(x))))
        sigma_vt = 4.74 * float(np.hypot(mad(members["pmra"].to_numpy(dtype=float)), mad(members["pmdec"].to_numpy(dtype=float)))) / np.sqrt(2) * distance / 1000.0
        if not np.isfinite(sigma_vt) or sigma_vt > max_vt_kms:
            return {"mode": "abstain", "method": f"ABSTAIN (FIELD_POPULATION_KINEMATICS: sigma_vt={sigma_vt:.1f} km/s)", "distance_pc": np.nan, "lo_pc": np.nan, "hi_pc": np.nan, "abstain_reason": "FIELD_POPULATION_KINEMATICS", "sigma_vt_kms": sigma_vt}, members
    n_corr = int(members["zp_applied"].sum()) if use_zp_corr and "zp_applied" in members else 0
    return {"mode": "region_kde", "method": f"{cluster_mode.upper() if use_5d else 'KDE'} + {'Parallax MLE' if use_hier_plx else 'Median'} ({len(members)}/{len(sub)} members; ZP applied {n_corr}/{len(members)})", "distance_pc": distance, "lo_pc": float(np.percentile(mem_d, 16)), "hi_pc": float(np.percentile(mem_d, 84)), **({"sigma_vt_kms": sigma_vt} if sigma_vt is not None else {})}, members

GALAXY_OTYPES = {"G", "Galaxy", "GiG", "GiP", "GiC", "BiC", "IG", "PaG", "SBG", "SyG", "Sy1", "Sy2", "Seyfert", "Seyfert1", "Seyfert2", "AGN", "LIN", "LINER", "QSO", "EmG", "EmissionG", "H2G", "LSB", "LSB_G", "bCG", "rG", "GinPair", "GinGroup", "GinCl", "PartofG", "BClG", "BlueCompG", "StarburstG", "RadioG", "HIIG", "GroupG", "GrG", "CGG", "ClG", "PairG", "IGroupG", "G?", "AG?"}

def synthesize_target_distance(meta: dict, df: pd.DataFrame, tables: dict[str, pd.DataFrame], cone_deg: float, point_radius_arcsec: float = 15.0, use_cmb_z: bool = True, use_registry: bool = True, prefer_nearest: bool = False) -> tuple[dict, pd.Series | None, pd.DataFrame]:
    ra, dec, obj_type, canon, inp_name = meta["ra"], meta["dec"], meta["object_type"], meta.get("canonical_name", ""), meta.get("input_name", meta.get("canonical_name", ""))
    is_extended = bool(meta.get("is_extended", is_extended_target(obj_type, inp_name, canon)))
    is_dark_cloud = (obj_type in DARK_CLOUD_OTYPES) or normalize_target_key(inp_name).startswith(("LDN ", "BARNARD ", "CB ")) or normalize_target_key(canon).startswith(("LDN ", "BARNARD ", "CB "))
    is_galaxy = obj_type in GALAXY_OTYPES and obj_type not in EXTENDED_OTYPES
    sdss_spec, hip_tbl, cf4 = tables.get("sdss_spec", pd.DataFrame()), tables.get("hipparcos2", pd.DataFrame()), tables.get("cosmicflows4", pd.DataFrame())
    target_sc = SkyCoord(ra * u.deg, dec * u.deg)
    if is_galaxy and len(sdss_spec) and {"ra", "dec", "z", "zErr"}.issubset(sdss_spec.columns):
        sdss_spec = sdss_spec[np.isfinite(sdss_spec[["ra", "dec", "z", "zErr"]]).all(axis=1)].copy()
        sdss_spec = sdss_spec.assign(separation=SkyCoord(sdss_spec["ra"].to_numpy() * u.deg, sdss_spec["dec"].to_numpy() * u.deg).separation(target_sc).arcsec).sort_values("separation")
        sdss_spec = sdss_spec[(sdss_spec["separation"] <= point_radius_arcsec) & (sdss_spec["zErr"] >= 0)]
    else:
        sdss_spec = pd.DataFrame()
    primary, point_row, cluster_members, cf4_hit = None, None, df, None
    if is_galaxy and len(cf4) and {"ra", "dec", "dm_cf4"}.issubset(cf4.columns):
        cf4 = cf4.assign(**{c: pd.to_numeric(cf4[c], errors="coerce") for c in ("ra", "dec", "dm_cf4", "e_dm") if c in cf4})
        cf4 = cf4[np.isfinite(cf4[["ra", "dec", "dm_cf4"]].to_numpy(dtype=float)).all(axis=1)].copy()
        if len(matched := cf4[SkyCoord(cf4["ra"].to_numpy() * u.deg, cf4["dec"].to_numpy() * u.deg).separation(target_sc).arcsec <= point_radius_arcsec]) == 1:
            cf4_hit = {**(r := matched.iloc[0].to_dict()), "d_cf4_mpc": float(10 ** ((r["dm_cf4"] - 25) / 5))}
    if is_galaxy and len(sdss_spec) > 0 and len(valid_z := sdss_spec[sdss_spec["z"] > 0.0005]) > 0:
        z_helio, z_err, z_cmb = float(valid_z.iloc[0]["z"]), float(valid_z.iloc[0]["zErr"]), helio_to_cmb_z(float(valid_z.iloc[0]["z"]), ra, dec)
        z_eff = max(1e-4, (z_cmb if z_helio < 0.05 else z_helio) if use_cmb_z else z_helio)
        d_comov, d_lum, d_ang = [float(fn(z_eff).to_value(u.Mpc)) for fn in (cosmo.comoving_distance, cosmo.luminosity_distance, cosmo.angular_diameter_distance)]
        cf4_tag = f", CF4={cf4_hit['d_cf4_mpc']:.1f} Mpc [DM={cf4_hit['dm_cf4']:.2f}]" if cf4_hit else ""
        primary = {"mode": "extragalactic", "method": f"SDSS DR17 Redshift (z_helio={z_helio:.5f}, z_CMB={z_cmb:.5f} ± {z_err:.5f}, Planck18{cf4_tag})", "distance_pc": d_comov * 1e6, "lo_pc": d_comov * 1e6 * max(0.95, 1.0 - z_err / max(z_eff, 1e-5)), "hi_pc": d_comov * 1e6 * (1.0 + z_err / max(z_eff, 1e-5)), "d_comov_mpc": d_comov, "d_lum_mpc": d_lum, "d_ang_mpc": d_ang, "z": z_eff, "t_lookback_gyr": float(cosmo.lookback_time(z_eff).to_value(u.Gyr)), "d_cf4_mpc": cf4_hit["d_cf4_mpc"] if cf4_hit else np.nan}
    if is_galaxy and cf4_hit is not None:
        dm, error = cf4_hit["dm_cf4"], (float(e) if pd.notna(e := cf4_hit.get("e_dm", np.nan)) and e >= 0 else np.nan)
        primary = primary or {c: np.nan for c in ("d_comov_mpc", "d_lum_mpc", "d_ang_mpc", "z", "t_lookback_gyr")}
        primary.update({"mode": "extragalactic", "method": f"Cosmicflows-4 matched distance modulus (DM={dm:.3f}); Planck18 redshift cross-check when available", "distance_kind": "distance_modulus", "distance_pc": cf4_hit["d_cf4_mpc"] * 1e6, "lo_pc": float(10 ** ((dm - error + 5) / 5)), "hi_pc": float(10 ** ((dm + error + 5) / 5)), "d_cf4_mpc": cf4_hit["d_cf4_mpc"], "dm_cf4": dm, "cf4_provenance": "matched cosmicflows4 table; live schema verification pending"})
    if primary is None and is_galaxy:
        primary = {"mode": "abstain", "method": "ABSTAIN (NO_MATCHED_EXTRAGALACTIC_DISTANCE)", "distance_pc": np.nan, "lo_pc": np.nan, "hi_pc": np.nan, "abstain_reason": "NO_MATCHED_EXTRAGALACTIC_DISTANCE"}
    if primary is None and not is_extended:
        if len(near_gaia := (df[df["sep_arcsec"] <= point_radius_arcsec].sort_values("sep_arcsec") if len(df) > 0 and "sep_arcsec" in df else pd.DataFrame())) > 0:
            point_row = near_gaia.iloc[0]
            primary = {"mode": "point_gaia", "method": f"Gaia DR3 + Bailer-Jones Photogeometric (source_id={int(point_row['source_id'])}, sep={point_row['sep_arcsec']:.2f}'')", "distance_pc": float(point_row["r_med_photogeo"]), "lo_pc": float(point_row["r_lo_photogeo"]), "hi_pc": float(point_row["r_hi_photogeo"])}
        elif len(hip_tbl) > 0 and float((hrow := hip_tbl.iloc[0])["sep_arcsec"]) <= point_radius_arcsec * 2.0 and (plx := float(hrow["hip_plx"])) > 0.1:
            e_plx = float(hrow["hip_e_plx"])
            primary = {"mode": "point_hip", "method": f"Hipparcos-2 Astrometry (HIP {int(hrow['hip'])}, sep={hrow['sep_arcsec']:.2f}'')", "distance_pc": 1000.0 / plx, "lo_pc": 1000.0 / (plx + e_plx), "hi_pc": 1000.0 / max(0.05, plx - e_plx)}
    if primary is None and not is_dark_cloud and len(df) > 0:
        primary, cluster_members = synthesize_region_distance(df, cone_deg, prefer_nearest=prefer_nearest)
    if primary is None and is_dark_cloud:
        ext = fit_extinction_breakpoint(df, r_on_deg=meta.get("radius_deg"), opacity_class=meta.get("opacity_class"), ppv_components=int(meta.get("ppv_components", 1)))
        if ext is not None and ext["optical_range_confirmed"] and not ext["ppv_overlap_flag"]:
            primary, cluster_members = synthesize_region_distance(df, cone_deg)
            primary.update({"mode": "region_kde", "distance_pc": ext["d_cloud_pc"], "lo_pc": ext["d_cloud_pc"] * 0.93, "hi_pc": ext["d_cloud_pc"] * 1.07, "method": f"Validated On-Cloud 3D Dust Breakpoint (ΔA0=+{ext['delta_a0']:.2f} mag, ΔBIC={ext['delta_bic']:.1f}, n_on={ext['n_on']})"})
        elif use_registry and (lit := lookup_literature_distance(inp_name, canon, ra, dec, meta.get("v_lsr_kms"))) is not None:
            primary = lit
        else:
            reason = "UNRESOLVED_PPV_OVERLAP" if (ext and ext["ppv_overlap_flag"]) else ("DUST_CENSORED_BACKGROUND" if (ext and not ext["optical_range_confirmed"]) else "UNPROVEN_ASSOCIATION_NEEDS_PPV_MASK")
            primary = {"mode": "abstain", "method": f"ABSTAIN ({reason})", "distance_pc": np.nan, "lo_pc": np.nan, "hi_pc": np.nan, "abstain_reason": reason}
    return primary or {"mode": "abstain", "method": "ABSTAIN (EMPTY_SIGHTLINE)", "distance_pc": np.nan, "lo_pc": np.nan, "hi_pc": np.nan, "abstain_reason": "EMPTY_SIGHTLINE"}, point_row, cluster_members

def prepare_regression_state(df: pd.DataFrame, seed: int = 42, train_frac: float = 0.65) -> dict:
    perm = np.random.default_rng(seed).permutation(len(df))
    train_idx, test_idx = perm[:(n_tr := int(train_frac * len(df)))], perm[n_tr:]
    y_all, all_cols = np.log10(df["r_med_photogeo"].to_numpy(dtype=float)), [c for _, cols, _ in PARAM_GROUPS for c in cols]
    X_raw = df[all_cols].to_numpy(dtype=float)
    scale = np.nanstd(X_raw[train_idx], axis=0) + 1e-8
    X_norm, covariance = (X_raw - np.nanmean(X_raw[train_idx], axis=0)) / scale, feature_covariance(df, all_cols) / (scale[None, :, None] * scale[None, None, :])
    errors, y_error = np.sqrt(np.diagonal(covariance, axis1=1, axis2=2)), (np.log10(df["r_hi_photogeo"].where(df["r_hi_photogeo"] > 0)) - np.log10(df["r_lo_photogeo"].where(df["r_lo_photogeo"] > 0))).to_numpy() / 2
    logger.info("Measurement errors available for {}/{} feature observations; unknown errors unweighted for k-NN, omitted for XD", np.isfinite(errors).sum(), errors.size)
    return {"df": df, "train_idx": train_idx, "test_idx": test_idx, "y_all": y_all, "prior_mu": float(np.mean(y_all[train_idx])), "prior_std": float(np.std(y_all[train_idx])), "all_cols": all_cols, "col_weights_card": {c: w / np.sqrt(len(cols)) for _, cols, w in PARAM_GROUPS for c in cols}, "col_weights_raw": {c: w for _, cols, w in PARAM_GROUPS for c in cols}, "col_weights_unif": {c: 1.0 for c in all_cols}, "col_idx_map": {c: i for i, c in enumerate(all_cols)}, "X_norm": X_norm, "X_err": np.where(np.isfinite(X_norm), errors, np.nan), "X_cov": covariance, "y_err": np.where(y_error >= 0, y_error, np.nan), "uncertainty_model": "catalog errors; log-distance intervals approximated Gaussian; unreported cross-covariance unknown"}

def gaussian_kl_bits(mean, std, prior_mean, prior_std):
    return (np.log(prior_std / std) + (std ** 2 + (mean - prior_mean) ** 2) / (2 * prior_std ** 2) - 0.5) / np.log(2)

def predict_knn_subspace(state: dict, active_cols: list[str], k: int = 12, use_inv_var: bool = True, use_plx_ll: bool = True, use_zp_corr: bool = True, weight_mode: str = "cardinality", imputation: str = "subspace") -> tuple[float, float, float, np.ndarray, np.ndarray, float]:
    df, train_idx, test_idx, y_all, idxs = state["df"], state["train_idx"], state["test_idx"], state["y_all"], [state["col_idx_map"][c] for c in active_cols]
    w_map = state["col_weights_card"] if weight_mode == "cardinality" else (state["col_weights_raw"] if weight_mode == "raw_group" else state["col_weights_unif"])
    w_vec = np.array([w_map[c] for c in active_cols], dtype=float)
    X_tr, X_te, S_tr, S_te = state["X_norm"][train_idx][:, idxs], state["X_norm"][test_idx][:, idxs], state["X_err"][train_idx][:, idxs], state["X_err"][test_idx][:, idxs]
    if imputation == "zero_impute":
        dist2 = ((w_vec[None, None, :] ** 2) * ((np.nan_to_num(X_te, nan=0.0)[:, None, :] - np.nan_to_num(X_tr, nan=0.0)[None, :, :]) ** 2)).sum(axis=2) / np.sum(w_vec ** 2)
    else:
        valid, pair_var = ~np.isnan(diff := X_te[:, None, :] - X_tr[None, :, :]), S_te[:, None, :] ** 2 + S_tr[None, :, :] ** 2
        precision = np.divide(1.0, 1.0 + pair_var, out=np.ones_like(diff), where=np.isfinite(pair_var)) if use_inv_var else 1.0
        w_avail = (w_eff2 := (w_vec[None, None, :] ** 2) * np.where(valid, precision, 0.0)).sum(axis=2)
        dist2 = np.where(w_avail > 0.0, (w_eff2 * (np.where(valid, diff, 0.0) ** 2)).sum(axis=2) / np.where(w_avail > 0.0, w_avail, 1.0), np.inf)
    d_k = np.sqrt(np.take_along_axis(dist2, nbrs := np.argpartition(dist2, kth=min(k, len(train_idx) - 1), axis=1)[:, :k], axis=1))
    if use_plx_ll:
        plx_tr, e_plx_tr = df["parallax_corr" if (use_zp_corr and "parallax_corr" in df) else "parallax"].to_numpy(dtype=float)[train_idx], df["parallax_error"].to_numpy(dtype=float)[train_idx]
        plx_ll = np.exp(-0.5 * ((plx_tr[nbrs] - 1000.0 / (10.0 ** y_all[train_idx][nbrs])) / np.maximum(e_plx_tr[nbrs], 0.05)) ** 2) / (1.0 + (e_plx_tr[nbrs] / np.maximum(0.1, np.abs(plx_tr[nbrs]))) ** 2)
        weights = np.where(np.isfinite(d_k), (0.5 + 0.5 * plx_ll) / (d_k + 0.08) ** 2, 0.0)
    else:
        weights = np.where(np.isfinite(d_k), 1.0 / (d_k + 0.08) ** 2, 0.0)
    norm_w, y_nbrs = np.where((w_sum := weights.sum(axis=1, keepdims=True)) > 0.0, weights / np.where(w_sum > 0.0, w_sum, 1.0), 0.0), y_all[train_idx][nbrs]
    pred_logd = np.where(w_sum[:, 0] > 0.0, (norm_w * y_nbrs).sum(axis=1), state["prior_mu"])
    pred_std = np.where(w_sum[:, 0] > 0.0, np.sqrt((norm_w * (y_nbrs - pred_logd[:, None]) ** 2).sum(axis=1) + 1e-6), state["prior_std"])
    delta = y_all[test_idx] - pred_logd
    return float(np.mean(np.abs(delta))), float(np.sqrt(np.mean(delta ** 2))), float(np.median(np.abs(10.0 ** (-delta) - 1.0)) * 100.0), pred_logd, pred_std, float(np.mean(gaussian_kl_bits(pred_logd, pred_std, state["prior_mu"], state["prior_std"])))

def xd_posterior(values, noise, weights, means, covariances):
    (n, d), k = values.shape, len(weights)
    moments, posterior_cov, log_prob = np.empty((n, k, d)), np.empty((n, k, d, d)), np.empty((n, k))
    for i in range(n):
        obs = np.flatnonzero(np.isfinite(values[i]) & np.isfinite(np.diag(noise[i])))
        for j, cov in enumerate(covariances):
            if len(obs) == 0:
                log_prob[i, j], moments[i, j], posterior_cov[i, j] = np.log(weights[j]), means[j], cov
            else:
                total, delta = cov[np.ix_(obs, obs)] + noise[i][np.ix_(obs, obs)], values[i, obs] - means[j, obs]
                factor = np.linalg.cholesky(total)
                solved = np.linalg.solve(factor.T, np.linalg.solve(factor, delta))
                moments[i, j], posterior_cov[i, j] = means[j] + cov[:, obs] @ solved, cov - np.linalg.solve(total, cov[obs]).T @ cov[obs]
                log_prob[i, j] = np.log(weights[j]) - 0.5 * (len(obs) * np.log(2 * np.pi) + 2 * np.log(np.diag(factor)).sum() + delta @ solved)
    normalization = logsumexp(log_prob, axis=1)
    return np.exp(log_prob - normalization[:, None]), moments, posterior_cov, float(normalization.sum())

def predict_xd_gmm(state: dict, active_cols: list[str], n_components: int = 6, max_iter: int = 25) -> tuple[float, float, float, np.ndarray, np.ndarray, float]:
    if n_components < 1 or max_iter < 1:
        raise ValueError("XD requires positive n_components and max_iter")
    train, test, y = state["train_idx"], state["test_idx"], state["y_all"]
    idxs = [j for j in (state["col_idx_map"][c] for c in active_cols) if np.any(np.isfinite(state["X_norm"][train, j]) & np.isfinite(state["X_err"][train, j]))]
    values, errors = np.column_stack((state["X_norm"][:, idxs], y)), np.column_stack((state["X_err"][:, idxs], state["y_err"]))
    if not np.isfinite((values := np.where(np.isfinite(values) & np.isfinite(errors), values, np.nan))[train, -1]).any():
        raise ValueError("XD requires training distances with measured uncertainty intervals")
    d, k = values.shape[1], min(n_components, len(train))
    noise = np.zeros((len(y), d, d))
    noise[:, np.arange(d), np.arange(d)] = errors ** 2
    if "X_cov" in state:
        noise[:, :-1, :-1] = state["X_cov"][:, idxs][:, :, idxs]
    filled = np.where(np.isfinite(values[train]), values[train], np.nanmean(values[train], axis=0))
    means = np.array([filled[group].mean(axis=0) for group in np.array_split(np.argsort(y[train]), k)])
    covariances, weights = np.repeat((np.atleast_2d(np.cov(filled, rowvar=False)) + np.eye(d) * 1e-6)[None], k, axis=0), np.full(k, 1.0 / k)
    responsibilities, moments, conditional_cov, likelihood = xd_posterior(values[train], noise[train], weights, means, covariances)
    history, converged = [likelihood], False
    for _ in range(max_iter):
        if np.any((counts := responsibilities.sum(axis=0)) <= np.finfo(float).tiny):
            raise ValueError("XD component collapsed; reduce n_components")
        next_weights, next_means = counts / len(train), np.einsum("nk,nkd->kd", responsibilities, moments) / counts[:, None]
        offsets = moments - next_means[None]
        next_cov = np.einsum("nk,nkde->kde", responsibilities, conditional_cov + offsets[:, :, :, None] * offsets[:, :, None, :]) / counts[:, None, None]
        eigvals, eigvecs = np.linalg.eigh((next_cov + next_cov.swapaxes(1, 2)) / 2)
        next_cov = (eigvecs * np.maximum(eigvals, 1e-8)[:, None, :]) @ eigvecs.swapaxes(1, 2)
        next_r, next_moments, next_cond_cov, next_ll = xd_posterior(values[train], noise[train], next_weights, next_means, next_cov)
        if (improvement := next_ll - likelihood) < -1e-7 * (1 + abs(likelihood)):
            raise ArithmeticError("XD observed-data likelihood decreased")
        weights, means, covariances, responsibilities, moments, conditional_cov, likelihood = next_weights, next_means, next_cov, next_r, next_moments, next_cond_cov, next_ll
        history.append(likelihood)
        if abs(improvement) < 1e-6 * (1 + abs(likelihood)):
            converged = True
            break
    probs, post_means, post_cov, _ = xd_posterior(np.column_stack((values[test, :-1], np.full(len(test), np.nan))), noise[test], weights, means, covariances)
    prediction = np.sum(probs * post_means[:, :, -1], axis=1)
    std = np.sqrt(np.maximum(np.sum(probs * (post_cov[:, :, -1, -1] + (post_means[:, :, -1] - prediction[:, None]) ** 2), axis=1), 1e-12))
    delta = y[test] - prediction
    state["xd_diagnostics"] = {"weights": weights, "means": means, "covariances": covariances, "converged": converged, "iterations": len(history) - 1, "log_likelihood": history, "features": [state["all_cols"][j] for j in idxs], "uncertainty_model": state["uncertainty_model"]}
    logger.info("XD: {} measured-error features, {} iterations, converged={}", len(idxs), len(history) - 1, converged)
    return float(np.mean(np.abs(delta))), float(np.sqrt(np.mean(delta ** 2))), float(np.median(np.abs(10 ** (-delta) - 1)) * 100), prediction, std, float(np.mean(gaussian_kl_bits(prediction, std, state["prior_mu"], state["prior_std"])))

def evaluate_knn_abstention(state: dict, active_cols: list[str] | None = None, k: int = 12, sigma_max: float = 0.19) -> tuple[np.ndarray, pd.DataFrame, float]:
    cols, test_idx, train_idx, y_te = (active_cols if active_cols is not None else state["all_cols"]), state["test_idx"], state["train_idx"], state["y_all"][state["test_idx"]]
    _, _, _, pred_logd, pred_std, _ = predict_knn_subspace(state, cols, k=k)
    if len(non_coord := [c for c in cols if c not in {"ra", "dec"}]) == 0:
        w_non_coord, n_eff = np.zeros(len(test_idx)), np.zeros(len(test_idx))
    else:
        nc_idxs, w_nc = [state["col_idx_map"][c] for c in non_coord], np.array([state["col_weights_card"][c] for c in non_coord], dtype=float)
        w_mat = ((~np.isnan(state["X_norm"][test_idx][:, nc_idxs][:, None, :] - state["X_norm"][train_idx][:, nc_idxs][None, :, :])) * (w_nc[None, None, :] ** 2)).sum(axis=2)
        w_non_coord, n_eff = w_mat.max(axis=1), (w_mat > 0.0).sum(axis=1).astype(float)
    abstain_mask, abs_err = (w_non_coord <= 0.0) | (n_eff < 3.0) | (pred_std > sigma_max), np.abs(y_te - pred_logd)
    order, rows, covs, risks = np.argsort(np.where(w_non_coord > 0.0, pred_std, np.inf)), [], [], []
    for target_cov in (1.0, 0.9, 0.8, 0.7, 0.5):
        sel = order[:max(1, int(round(target_cov * len(test_idx))))]
        sel, act_cov = sel[w_non_coord[sel] > 0.0], len(sel[w_non_coord[sel] > 0.0]) / len(test_idx)
        sel_mae, sel_rmse = (float(np.mean(abs_err[sel])), float(np.sqrt(np.mean(abs_err[sel] ** 2)))) if len(sel) > 0 else (np.nan, np.nan)
        sel_rel = float(np.median(np.abs(10.0 ** pred_logd[sel] - 10.0 ** y_te[sel]) / (10.0 ** y_te[sel])) * 100.0) if len(sel) > 0 else np.nan
        covs.append(act_cov)
        risks.append(sel_mae if np.isfinite(sel_mae) else float(np.mean(abs_err)))
        rows.append({"Target_Coverage": f"{target_cov * 100:.0f}%", "Actual_Coverage_%": round(act_cov * 100.0, 1), "Abstained_%": round((1.0 - act_cov) * 100.0, 1), "Selective_MAE_dex": round(sel_mae, 4) if np.isfinite(sel_mae) else np.nan, "Selective_RMSE_dex": round(sel_rmse, 4) if np.isfinite(sel_rmse) else np.nan, "Selective_Med_Rel_%": round(sel_rel, 2) if np.isfinite(sel_rel) else np.nan})
    return abstain_mask, pd.DataFrame(rows), float(np.trapezoid(risks[::-1], covs[::-1])) if len(covs) > 1 else float(risks[0])

def run_progressive_ablation(state: dict, k: int = 12, **kwargs) -> tuple[pd.DataFrame, pd.DataFrame]:
    df, test_idx, y_all, all_cols = state["df"], state["test_idx"], state["y_all"], state["all_cols"]
    _, base_rmse, _, base_pred, _, _ = predict_knn_subspace(state, all_cols, k=k, **kwargs)
    group_stats = [None] * len(PARAM_GROUPS)
    with Progress(SpinnerColumn("dots"), TextColumn("[bold cyan]{task.description}"), BarColumn(bar_width=28), MofNCompleteColumn(), TimeElapsedColumn(), transient=True) as prog:
        task_imp = prog.add_task("Leave-one-group-out importance", total=len(PARAM_GROUPS))
        with ThreadPoolExecutor(max_workers=8) as ex:
            futs = {ex.submit(predict_knn_subspace, state, [c for c in all_cols if c not in cols] if len(cols) < len(all_cols) else all_cols, k, **kwargs): (i, name, cols) for i, (name, cols, _) in enumerate(PARAM_GROUPS)}
            for f in as_completed(futs):
                i, name, cols = futs[f]
                _, _, _, pred_wo, _, _ = f.result()
                absent_pct, present = float(df[cols].isna().all(axis=1).mean() * 100.0), (~df.loc[test_idx, cols].isna().all(axis=1)).to_numpy()
                gain = float(max(0.0, np.mean(np.abs(y_all[test_idx][present] - pred_wo[present])) - np.mean(np.abs(y_all[test_idx][present] - base_pred[present])))) if present.sum() > 0 else 0.0
                group_stats[i] = {"Parameter_Group": name, "Cols": cols, "Absent_%": round(absent_pct, 1), "Absence_Tier": 0 if absent_pct >= 50 else (1 if absent_pct >= 15 else (2 if absent_pct >= 1 else 3)), "Marginal_Importance_dex": round(gain, 4)}
                prog.update(task_imp, advance=1, description=f"Leave-one-group-out [dim]({name})[/dim]")
        stats_df = pd.DataFrame(group_stats)
        ordered_df = pd.concat([stats_df[stats_df["Parameter_Group"] != "Sky Coordinates (RA, Dec)"].sort_values(by=["Absence_Tier", "Marginal_Importance_dex", "Absent_%"], ascending=[True, True, False]), stats_df[stats_df["Parameter_Group"] == "Sky Coordinates (RA, Dec)"]], ignore_index=True)
        task_abl, records = prog.add_task("15-step progressive catalog pruning", total=len(ordered_df)), list(ordered_df.to_dict("records"))
        rows = [None] * len(records)
        with ThreadPoolExecutor(max_workers=8) as ex:
            futs = {ex.submit(predict_knn_subspace, state, [c for g in records[s:] for c in g["Cols"]], k, **kwargs): (s, len(records[s:]), "None (Full 15-group / 12-catalog vector)" if s == 0 else records[s - 1]["Parameter_Group"], 0.0 if s == 0 else records[s - 1]["Absent_%"]) for s in range(len(records))}
            for f in as_completed(futs):
                s, n_rem, last_name, last_absent = futs[f]
                mae, rmse, med_rel, _, _, kl_mean = f.result()
                rows[s] = {"Step": s, "Groups_Remaining": n_rem, "Removed_Parameter_Group": last_name, "Removed_Absent_%": last_absent, "MAE_dex": round(mae, 4), "RMSE_dex": round(rmse, 4), "Median_Rel_Error_%": round(med_rel, 2), "Info_Lost_bits": round(float(max(0.0, 0.5 * np.log2((rmse ** 2) / (base_rmse ** 2)))), 3), "KL_Info_Gain_bits": kl_mean}
                prog.update(task_abl, advance=1, description=f"Progressive pruning [dim](step {s}/14)[/dim]")
    return (result := pd.DataFrame(rows)).assign(KL_Change_bits=result["KL_Info_Gain_bits"].diff()), ordered_df

if __name__ == "__main__":
    if os.path.exists("data/ic434_multicatalog.csv"):
        df_ic = load_multicatalog_dataset("data/ic434_multicatalog.csv")
        reg, mem = synthesize_region_distance(df_ic, 0.35)
        ext, st = fit_extinction_breakpoint(df_ic), prepare_regression_state(df_ic)
        mae, rmse, rel, _, _, kl = predict_knn_subspace(st, st["all_cols"])
        abst, _, aurc = evaluate_knn_abstention(st)
        Console().print(f"[bold green]estimators.py smoke test OK[/bold green] | IC 434 cluster d={reg['distance_pc']:.1f} pc (n={len(mem)}) | cloud d={ext['d_cloud_pc']:.1f} pc (ΔBIC={ext['delta_bic']:.1f}) | k-NN MAE={mae:.4f} dex ({rel:.1f}%), AURC={aurc:.4f} dex")
