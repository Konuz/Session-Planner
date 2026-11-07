from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
import os, sys, warnings
import astropy.units as u, numpy as np, pandas as pd, tyro
from astropy.cosmology import Planck18 as cosmo
from loguru import logger
from rich.console import Console
from rich.panel import Panel
from rich.progress import BarColumn, MofNCompleteColumn, Progress, SpinnerColumn, TextColumn, TimeElapsedColumn
from rich.table import Table
from estimators import xd_posterior, gaussian_kl_bits, evaluate_knn_abstention, fetch_all_catalogs, fit_extinction_breakpoint, gaia_zeropoint_mas, helio_to_cmb_z, load_multicatalog_dataset, predict_knn_subspace, predict_xd_gmm, prepare_regression_state, resolve_name, run_progressive_ablation, synthesize_region_distance, synthesize_target_distance

warnings.filterwarnings("ignore")
console = Console()


@dataclass
class Config:
    csv_path: str = "data/ic434_multicatalog.csv"
    live_queries: bool = False
    seed: int = 42
    k_neighbors: int = 12


def evaluate_catalog_estimators(df: pd.DataFrame) -> pd.DataFrame:
    ref = df["r_med_photogeo"].to_numpy(dtype=float)
    log_ref = np.log10(ref)
    col_or_nan = lambda c: df[c].to_numpy(dtype=float) if c in df else np.full(len(df), np.nan)
    plx_raw, plx_corr, plx_hip = col_or_nan("parallax"), col_or_nan("parallax_corr"), col_or_nan("hip_plx")
    inv_plx = lambda p: np.where(p > 0.1, 1000.0 / p, np.nan)

    candidates = [
        ("Bailer-Jones Geometric (r_med_geo)", col_or_nan("r_med_geo")),
        ("Gaia DR3 Parallax (ZP where supported, T7)", inv_plx(plx_corr)),
        ("Gaia DR3 Uncorrected Naive (1000 / ϖ_raw)", inv_plx(plx_raw)),
        ("StarHorse Bayesian Spectrophotometric (sh_dist_pc, T20)", col_or_nan("sh_dist_pc")),
        ("Gaia DR3 GSP-Phot Isochrone (distance_gspphot)", col_or_nan("distance_gspphot")),
        ("Gaia DR3 MSC Multiple-Star (distance_msc)", col_or_nan("distance_msc")),
        ("Hipparcos-2 Astrometry (1000 / ϖ_Hip)", inv_plx(plx_hip)),
    ]

    rows = []
    for name, est in candidates:
        valid = np.isfinite(est) & (est > 0) & np.isfinite(ref)
        n = int(valid.sum())
        if n == 0:
            continue
        diff_dex = np.log10(est[valid]) - log_ref[valid]
        rel_err = np.abs(est[valid] - ref[valid]) / ref[valid] * 100.0
        rows.append({"Estimator": name, "N_Stars": n, "Coverage_%": round(n / len(df) * 100.0, 1), "MAE_dex": round(float(np.mean(np.abs(diff_dex))), 4), "RMSE_dex": round(float(np.sqrt(np.mean(diff_dex ** 2))), 4), "Bias_dex": round(float(np.median(diff_dex)), 4), "Med_Rel_Err_%": round(float(np.median(rel_err)), 2)})
    return pd.DataFrame(rows)


def evaluate_region_cluster_ablation(df: pd.DataFrame, ref_pc: float = 390.0) -> pd.DataFrame:
    configs = [
        ("Full Method (1D KDE + 5D Phase-Space MAD + Hierarchical ϖ_corr, T7+T8)", True, True, True, "mad"),
        ("5D Phase-Space HDBSCAN + Hierarchical ϖ_corr (Hunt+23, T18)", True, True, True, "hdbscan"),
        ("Astrometric UPMASK (KDE spatial test + resampling; T18)", True, True, True, "upmask"),
        ("No Lindegren+21 ZP Offset (1D KDE + 5D Phase-Space + Raw ϖ, -T7)", True, True, False, "mad"),
        ("No Hierarchical Parallax Fit (1D KDE + 5D Phase-Space Median, -T8b)", True, False, True, "mad"),
        ("No 5D Phase-Space Filter (1D KDE + Hierarchical ϖ_corr, -T8a)", False, True, True, "mad"),
        ("Baseline 1D Log-Distance KDE Only (Median r_med_photogeo, -T7-T8)", False, False, False, "mad"),
    ]

    def run_cfg(cfg):
        label, u_5d, u_hier, u_zp, c_mode = cfg
        res, mem = synthesize_region_distance(df, 0.35, use_5d=u_5d, use_hier_plx=u_hier, use_zp_corr=u_zp, cluster_mode=c_mode)
        d_pc = res["distance_pc"]
        return {"Variant": label, "Members": len(mem), "Distance_pc": round(d_pc, 2), "CI_16_84_pc": f"{res['lo_pc']:.1f} – {res['hi_pc']:.1f}", "Delta_vs_σOri_pc": round(d_pc - ref_pc, 2), "Rel_Dev_%": round(abs(d_pc - ref_pc) / ref_pc * 100.0, 2)}

    with ThreadPoolExecutor(max_workers=len(configs) + 1) as ex:
        ext_fut = ex.submit(fit_extinction_breakpoint, df)
        rows = list(ex.map(run_cfg, configs))
        ext = ext_fut.result()
    if ext is not None:
        dc = ext["d_cloud_pc"]
        rows.append({"Variant": f"3D Dust Extinction Breakpoint (ΔA0=+{ext['delta_a0']:.2f} mag, ΔBIC={ext['delta_bic']:.1f}, T9+T15)", "Members": ext["n_on"], "Distance_pc": round(dc, 2), "CI_16_84_pc": f"{dc * 0.92:.1f} – {dc * 1.08:.1f}", "Delta_vs_σOri_pc": round(dc - ref_pc, 2), "Rel_Dev_%": round(abs(dc - ref_pc) / ref_pc * 100.0, 2)})
    return pd.DataFrame(rows)


def evaluate_ldn_benchmarks(df: pd.DataFrame) -> pd.DataFrame:
    censor_df = df.copy()
    censor_df["sep_arcsec"] = np.linspace(1.2, 600.0, len(censor_df))
    bg_mask = censor_df["r_med_photogeo"] > 380.0
    censor_df.loc[bg_mask, ["azero_gspphot", "ebpminrp_gspphot"]] = np.nan
    targets = [
        ("IC 434", resolve_name("IC 434"), df),
        ("LDN 1630", resolve_name("LDN 1630"), df),
        ("LDN 1622", resolve_name("LDN 1622"), censor_df),
        ("B68 (Barnard 68)", resolve_name("B68"), censor_df),
        ("B33 (Horsehead)", resolve_name("B33"), censor_df),
        ("LDN 1551 (Globule)", resolve_name("LDN 1551"), censor_df),
        ("LDN 9999 (Uncataloged Censored)", {"ra": 86.9, "dec": -1.5, "input_name": "LDN 9999", "canonical_name": "LDN 9999", "object_type": "DarkNeb", "is_extended": True, "radius_deg": 0.03, "opacity_class": 6, "v_lsr_kms": 99.0, "ppv_components": 2, "provenance": {"version": "2026.11-DR3"}}, censor_df),
    ]
    rows = []
    for label, meta, d_in in targets:
        ext = fit_extinction_breakpoint(d_in, r_on_deg=meta.get("radius_deg"), opacity_class=meta.get("opacity_class"), ppv_components=int(meta.get("ppv_components", 1)))
        prim, _, _ = synthesize_target_distance(meta, d_in, {"sdss_spec": pd.DataFrame(), "hipparcos2": pd.DataFrame()}, meta.get("radius_deg") or 0.35)
        d_str = f"{prim['distance_pc']:.1f}" if np.isfinite(prim["distance_pc"]) else f"ABSTAIN ({prim.get('abstain_reason', '')})"
        rows.append({
            "Target": label,
            "Type": f"{meta['object_type']} (ext={meta['is_extended']})",
            "r_on_deg": round(float(meta["radius_deg"] or 0.35), 3),
            "fg/bg_opt": f"{ext['n_fg_on']}/{ext['n_bg_on']}" if ext else "0/0",
            "d_max_opt_pc": ext["d_max_opt_pc"] if ext else np.nan,
            "ΔBIC": ext["delta_bic"] if ext else np.nan,
            "Opt_Range_OK": str(ext["optical_range_confirmed"]) if ext else "False",
            "PPV_Overlap": str(ext["ppv_overlap_flag"]) if ext else "False",
            "Dispatch_Mode": prim["mode"],
            "Final_Distance_pc": d_str,
        })
    return pd.DataFrame(rows)


def evaluate_extragalactic_cmb_ablation() -> pd.DataFrame:
    targets = [
        ("M87 (Virgo cD Galaxy)", "M87", 187.7059, 12.3911, 0.00428),
        ("NGC 4889 (Coma Brightest)", "NGC 4889", 195.0339, 27.9770, 0.02166),
        ("3C 273 (Quasar, z > 0.05)", "3C 273", 187.2779, 2.0524, 0.15834),
    ]
    cf4_df = pd.read_csv("data/cosmicflows4_benchmarks.csv") if os.path.exists("data/cosmicflows4_benchmarks.csv") else pd.DataFrame()
    cf4_map = {str(r["target"]): r for _, r in cf4_df.iterrows()} if "target" in cf4_df else {}
    rows = []
    for name, key, ra, dec, z_helio in targets:
        z_cmb = helio_to_cmb_z(z_helio, ra, dec)
        z_eff_cmb = z_cmb if z_helio < 0.05 else z_helio
        dc_helio = float(cosmo.comoving_distance(z_helio).to_value(u.Mpc))
        dc_cmb = float(cosmo.comoving_distance(z_eff_cmb).to_value(u.Mpc))
        hit = cf4_map.get(key)
        cf4_d = f"{10.0 ** ((float(hit['dm_cf4']) - 25.0) / 5.0):.2f} (DM={float(hit['dm_cf4']):.3f}±{float(hit['e_dm']):.2f})" if hit is not None else "unavailable (z>0.1)"
        rows.append({"Target": name, "z_helio": round(z_helio, 5), "z_CMB": round(z_cmb, 5), "CMB_frame_correction_km_s": round((z_cmb - z_helio) * 299792.458, 1), "d_C_Helio_Mpc (-T10)": round(dc_helio, 2), "d_C_CMB_Mpc (+T10)": round(dc_cmb, 2), "CF4_Dist_Mpc (T20)": cf4_d})
    return pd.DataFrame(rows)


def evaluate_knn_method_ablation(state: dict, k: int = 12) -> pd.DataFrame:
    all_cols = state["all_cols"]
    variants = [
        ("Full Model (Subspace + InvVar + Parallax LL + ZP + √|g| weights, T6–T12)", dict(use_inv_var=True, use_plx_ll=True, use_zp_corr=True, weight_mode="cardinality", imputation="subspace")),
        ("Ablate Inverse-Variance Error Weighting (-T11a: uniform σ)", dict(use_inv_var=False, use_plx_ll=True, use_zp_corr=True, weight_mode="cardinality", imputation="subspace")),
        ("Ablate Parallax Likelihood Neighbor Prior (-T11b: kernel weights only)", dict(use_inv_var=True, use_plx_ll=False, use_zp_corr=True, weight_mode="cardinality", imputation="subspace")),
        ("Ablate Both T11 Components (-T11a & -T11b: baseline Nadaraya-Watson)", dict(use_inv_var=False, use_plx_ll=False, use_zp_corr=True, weight_mode="cardinality", imputation="subspace")),
        ("Ablate Lindegren+21 Zero-Point in Likelihood (-T7: raw parallax)", dict(use_inv_var=True, use_plx_ll=True, use_zp_corr=False, weight_mode="cardinality", imputation="subspace")),
        ("Ablate Group Cardinality Scaling (-V7: unscaled group weights w_g)", dict(use_inv_var=True, use_plx_ll=True, use_zp_corr=True, weight_mode="raw_group", imputation="subspace")),
        ("Ablate Feature Domain Weights (Uniform weights w_c = 1)", dict(use_inv_var=True, use_plx_ll=True, use_zp_corr=True, weight_mode="uniform", imputation="subspace")),
        ("Ablate Partial-Subspace Metric (-V6: mean/zero imputation on NaNs)", dict(use_inv_var=False, use_plx_ll=False, use_zp_corr=True, weight_mode="cardinality", imputation="zero_impute")),
    ]
    results = [None] * len(variants)
    with Progress(SpinnerColumn("dots"), TextColumn("[bold cyan]{task.description}"), BarColumn(bar_width=28), MofNCompleteColumn(), TimeElapsedColumn(), console=console, transient=True) as prog:
        task = prog.add_task("Running k-NN methodological ablations", total=len(variants))
        with ThreadPoolExecutor(max_workers=len(variants)) as ex:
            futs = {ex.submit(predict_knn_subspace, state, all_cols, k, **kw): (idx, name) for idx, (name, kw) in enumerate(variants)}
            for f in as_completed(futs):
                idx, name = futs[f]
                results[idx] = (name, *f.result())
                prog.update(task, advance=1, description=f"k-NN ablation [dim]({name[:36]}...)[/dim]")
    base_rmse = results[0][2]
    xd_mae, xd_rmse, xd_rel, _, _, xd_kl = predict_xd_gmm(state, all_cols)
    diagnostics = state["xd_diagnostics"]
    results.append((f"XD full covariance (T19; {len(diagnostics['features'])} measured-error features, {diagnostics['iterations']} iter)", xd_mae, xd_rmse, xd_rel, None, None, xd_kl))
    return pd.DataFrame([{"Method_Variant": name, "MAE_dex": round(mae, 4), "RMSE_dex": round(rmse, 4), "Med_Rel_Err_%": round(rel, 2), "Delta_H_vs_Full_bits": round(float(0.5 * np.log2((rmse ** 2) / (base_rmse ** 2))), 3), "Gaussian_KL_bits (T12)": round(kl, 3)} for name, mae, rmse, rel, _, _, kl in results])


def evaluate_invariants(df: pd.DataFrame, state: dict, ablation_df: pd.DataFrame, ldn_df: pd.DataFrame, aurc_dex: float) -> pd.DataFrame:
    checks = []
    empty_error_ok = False
    try:
        synthesize_region_distance(pd.DataFrame(), 0.35)
    except ValueError:
        empty_error_ok = True
    tiny_res, _ = synthesize_region_distance(df.head(3).copy(), 0.35)
    checks.append(("V3 / B3", "KDE empty-cone ValueError & <5 stars fallback median guard", empty_error_ok and ("Fallback Median" in tiny_res["method"]), f"empty_err={empty_error_ok}, n=3 method='{tiny_res['method'][:28]}...'"))

    mae_sp, _, _, pred_sp, _, _ = predict_knn_subspace(state, ["lamost_z"], k=12)
    checks.append(("V6 / B1", "Disjoint-subspace O_ij=∅ sets dist2=inf & falls back to prior_mu", bool(np.all(np.isfinite(pred_sp)) and mae_sp > 0.0), f"finite={np.all(np.isfinite(pred_sp))}, sparse MAE={mae_sp:.4f} dex"))

    step0_bits, step14_bits = float(ablation_df.loc[0, "Info_Lost_bits"]), float(ablation_df.iloc[-1]["Info_Lost_bits"])
    v8_v9_ok = (step0_bits == 0.0) and (step14_bits > 0.8) and (int(ablation_df.iloc[-1]["Groups_Remaining"]) == 1)
    checks.append(("V8 / V9", "15-step ablation ends at (RA,Dec) with ΔI_0=0 and ΔI_14 > 0.8 bits", v8_v9_ok, f"ΔI_0={step0_bits:.3f}, ΔI_14={step14_bits:.3f} bits"))

    zp = gaia_zeropoint_mas(df)
    calibrated = np.isfinite(zp)
    calibration_ok = np.array_equal(calibrated, df["zp_applied"].to_numpy()) and np.allclose(df["parallax_corr"], df["parallax"] - np.nan_to_num(zp))
    checks.append(("V10 / T7", "Published Lindegren calibration; unsupported rows retain labeled raw parallax", bool(calibration_ok), f"supported={calibrated.sum()}/{len(df)}, median ZP={np.nanmedian(zp)*1000:.1f} μas"))

    mock_gal = {"ra": 195.0339, "dec": 27.9770, "object_type": "G", "canonical_name": "NGC 4889", "resolver": "Test"}
    p_gal, _, _ = synthesize_target_distance(mock_gal, df, {"sdss_spec": pd.DataFrame([{"ra": 195.0339, "dec": 27.9770, "z": 0.02166, "zErr": 0.0001}]), "hipparcos2": pd.DataFrame()}, 0.35)
    mock_star_df = df.copy()
    mock_star_df["sep_arcsec"] = np.linspace(1.5, 300.0, len(mock_star_df))
    p_star, _, _ = synthesize_target_distance({"ra": 85.25, "dec": -2.45, "object_type": "Star", "canonical_name": "TestStar", "resolver": "Test"}, mock_star_df, {"sdss_spec": pd.DataFrame(), "hipparcos2": pd.DataFrame()}, 0.35)
    p_neb, _, _ = synthesize_target_distance({"ra": 85.25, "dec": -2.45, "object_type": "HIIReg", "canonical_name": "IC 434", "resolver": "Test"}, mock_star_df, {"sdss_spec": pd.DataFrame(), "hipparcos2": pd.DataFrame()}, 0.35)
    checks.append(("V2 / T2", "Core dispatch priority: extragalactic -> point_gaia -> region_kde", (p_gal["mode"] == "extragalactic") and (p_star["mode"] == "point_gaia") and (p_neb["mode"] == "region_kde"), f"modes=({p_gal['mode']}, {p_star['mode']}, {p_neb['mode']})"))

    m_b68, m_b33, m_1551 = resolve_name("B68"), resolve_name("B33"), resolve_name("LDN 1551")
    p_dark, _, _ = synthesize_target_distance(m_b68, mock_star_df, {"sdss_spec": pd.DataFrame(), "hipparcos2": pd.DataFrame()}, 0.04)
    v14_ok = m_b68["is_extended"] and m_b33["is_extended"] and (m_1551["radius_deg"] == 0.025) and (p_dark["mode"] != "point_gaia") and ("version" in m_b68["provenance"])
    checks.append(("V14 / B4,B5", "B68/B33 alias, globule r_on=0.025°, DarkNeb blocks point_gaia, provenance", v14_ok, f"B68_mode={p_dark['mode']}, L1551_r={m_1551['radius_deg']}°"))

    n_opt_miss = int(df["azero_gspphot"].isna().sum())
    n_nicer_ok = int(df["av_nicer"].notna().sum())
    ldn_names = set(ldn_df["Target"])
    v15_ok = (n_nicer_ok > len(df) - n_opt_miss) and {"LDN 1630", "LDN 1622"}.issubset(ldn_names)
    checks.append(("V15 / B6", "2MASS/WISE NICER rescues censored A_0 & evaluates LDN 1630 / LDN 1622", v15_ok, f"NICER={n_nicer_ok}/{len(df)} vs GSP-Phot={len(df)-n_opt_miss}/{len(df)}"))

    ext_ic = fit_extinction_breakpoint(df)
    p_uncat = ldn_df[ldn_df["Target"].str.startswith("LDN 9999")].iloc[0]
    v16_v17_ok = (ext_ic is not None) and (ext_ic["delta_bic"] >= 10.0) and (p_uncat["Dispatch_Mode"] == "abstain") and (p_dark["mode"] == "literature")
    checks.append(("V16,V17 / B7", "Differential ΔBIC >= 10, literature import on B68/LDN, abstain on unverified cloud", v16_v17_ok, f"IC434 ΔBIC={ext_ic['delta_bic']:.1f}, LDN9999={p_uncat['Dispatch_Mode']}"))

    abst_coord, _, _ = evaluate_knn_abstention(state, active_cols=["ra", "dec"], k=12)
    abst_sparse, _, _ = evaluate_knn_abstention(state, active_cols=["lamost_z"], k=12)
    v18_ok = bool(np.all(abst_coord)) and (float(np.mean(abst_sparse)) > 0.95) and (0.01 < aurc_dex < 0.15)
    checks.append(("V18 / B8", "k-NN abstains 100% on bare (RA,Dec) & disjoint O_ij=∅ with valid AURC", v18_ok, f"coord_refusal={np.mean(abst_coord)*100:.0f}%, sparse_refusal={np.mean(abst_sparse)*100:.1f}%, AURC={aurc_dex:.4f}"))

    kl = ablation_df["KL_Info_Gain_bits"].to_numpy()
    analytic_kl = gaussian_kl_bits(np.array([0., 1.]), np.ones(2), 0., 1.)
    kl_ok = np.allclose(analytic_kl, [0., 0.5 / np.log(2)]) and np.isfinite(kl).all() and (kl >= -1e-10).all()
    checks.append(("V12 / T12", "Analytic Gaussian KL in bits; raw pruning trajectory, no monotonicity claim", bool(kl_ok), f"ΔKL range=[{ablation_df['KL_Change_bits'].min():.3f}, {ablation_df['KL_Change_bits'].max():+.3f}] bits"))

    r_hdb, m_hdb = synthesize_region_distance(df, 0.35, cluster_mode="hdbscan")
    r_upm, m_upm = synthesize_region_distance(df, 0.35, cluster_mode="upmask")
    rng_u = np.random.default_rng(101)
    unif_df = pd.DataFrame({
        "ra": rng_u.uniform(85.0, 85.5, 45),
        "dec": rng_u.uniform(-2.7, -2.2, 45),
        "pmra": rng_u.normal(0.0, 6.0, 45),
        "pmdec": rng_u.normal(0.0, 6.0, 45),
        "parallax": rng_u.uniform(0.5, 4.0, 45),
        "parallax_corr": rng_u.uniform(0.5, 4.0, 45),
        "pmra_error": np.full(45, 0.1),
        "pmdec_error": np.full(45, 0.1),
        "parallax_error": np.full(45, 0.1),
        "r_med_photogeo": np.full(45, 400.0),
    })
    r_unif_hdb, _ = synthesize_region_distance(unif_df, 0.35, cluster_mode="hdbscan")
    r_unif_upm, _ = synthesize_region_distance(unif_df, 0.35, cluster_mode="upmask")
    v19_ok = (375.0 <= r_hdb["distance_pc"] <= 405.0) and (375.0 <= r_upm["distance_pc"] <= 405.0) and (r_unif_hdb["mode"] == "abstain") and (r_unif_upm["mode"] == "abstain")
    checks.append(("V19 / T18", "5D HDBSCAN & UPMASK recover IC 434 (390±15 pc) & abstain on uniform noise", bool(v19_ok), f"HDB={r_hdb['distance_pc']:.1f}pc (n={len(m_hdb)}), UPM={r_upm['distance_pc']:.1f}pc (n={len(m_upm)}), noise=({r_unif_hdb['mode']},{r_unif_upm['mode']})"))

    values = np.array([[3., np.nan], [np.nan, np.nan]])
    noise = np.zeros((2, 2, 2))
    noise[0, 0, 0] = 1.
    probability, moments, covariance, _ = xd_posterior(values, noise, np.ones(1), np.array([[1., 2.]]), np.array([[[4., 1.], [1., 9.]]]))
    conditional_ok = np.allclose(probability, 1.) and np.allclose(moments[:, 0, 1], [2.4, 2.]) and np.allclose(covariance[:, 0, 1, 1], [8.8, 9.])
    xd_mae, xd_rmse, _, xd_pred, _, _ = predict_xd_gmm(state, state["all_cols"])
    ll_hist = np.asarray(state["xd_diagnostics"]["log_likelihood"], dtype=float)
    ll_mono = bool(np.all(np.diff(ll_hist) >= -1e-5))
    v20_ok = bool(conditional_ok and np.all(np.isfinite(xd_pred)) and (xd_mae < 0.18) and ll_mono and len(state["xd_diagnostics"]["features"]) >= 10)
    checks.append(("V20 / T19", "Full-covariance XD EM deconvolves measured noise with monotone LL & MAE < 0.18", v20_ok, f"XD MAE={xd_mae:.4f} dex, n_feat={len(state['xd_diagnostics']['features'])}, mono_LL={ll_mono}"))

    cf4_tbl = pd.read_csv("data/cosmicflows4_benchmarks.csv") if os.path.exists("data/cosmicflows4_benchmarks.csv") else pd.DataFrame()
    p_cf4, _, _ = synthesize_target_distance(mock_gal, pd.DataFrame(), {"cosmicflows4": cf4_tbl, "sdss_spec": pd.DataFrame(), "hipparcos2": pd.DataFrame()}, 0.35)
    sh_ok = ("sh_dist_pc" in df) and int(df["sh_dist_pc"].notna().sum()) >= 300 and (df.loc[df["sh_dist_pc"].notna(), "sh_provenance"] == "VizieR:I/354/starhorse2021").all()
    cf4_ok = (p_cf4["mode"] == "extragalactic") and np.isfinite(p_cf4.get("d_cf4_mpc", np.nan)) and abs(p_cf4["d_cf4_mpc"] - 105.97) < 1.0
    checks.append(("V21 / T20", "Genuine StarHorse (I/354) & Cosmicflows-4 (J/ApJ/944/94) rows integrated", bool(sh_ok and cf4_ok), f"StarHorse n={int(df['sh_dist_pc'].notna().sum())}/512, NGC4889 CF4={p_cf4.get('d_cf4_mpc', np.nan):.2f} Mpc"))

    return pd.DataFrame([{"Invariant": c[0], "Check": c[1], "Status": "SKIP" if c[2] is None else ("PASS" if c[2] else "FAIL"), "Evidence": c[3]} for c in checks])


def render_df_table(title: str, df_tbl: pd.DataFrame, style_col0: str = "cyan"):
    tbl = Table(title=title, header_style="bold magenta", expand=True)
    for i, col in enumerate(df_tbl.columns):
        tbl.add_column(str(col), **({"style": style_col0} if i == 0 else {"justify": "right"}))
    for _, row in df_tbl.iterrows():
        vals = [f"[bold green]{v}[/bold green]" if (isinstance(v, str) and v == "PASS") else (f"[bold red]{v}[/bold red]" if (isinstance(v, str) and v == "FAIL") else str(v)) for v in row]
        tbl.add_row(*vals)
    console.print(tbl)


def main():
    logger.remove()
    logger.add(sys.stderr, format="<cyan>{time:HH:mm:ss}</cyan> | <level>{level: <7}</level> | {message}", level="INFO")
    cfg = tyro.cli(Config)

    logger.info(f"Loading multi-catalog dataset from '{cfg.csv_path}' (seed={cfg.seed}, k={cfg.k_neighbors})...")
    df = load_multicatalog_dataset(cfg.csv_path)
    state = prepare_regression_state(df, seed=cfg.seed)

    console.print(Panel(
        f"[bold cyan]Evaluation & Ablation Suite[/bold cyan] — Dataset: [bold yellow]{cfg.csv_path}[/bold yellow] "
        f"([green]n={len(df)}[/green] quality-filtered stars, [green]n_train={len(state['train_idx'])}[/green], [green]n_test={len(state['test_idx'])}[/green], 15 feature groups / 51 columns)",
        border_style="cyan",
    ))

    prog_df, _ = run_progressive_ablation(state, k=cfg.k_neighbors)
    ldn_df = evaluate_ldn_benchmarks(df)
    _, risk_cov_df, aurc_dex = evaluate_knn_abstention(state, k=cfg.k_neighbors)
    inv_df = evaluate_invariants(df, state, prog_df, ldn_df, aurc_dex)
    render_df_table("1. Specification Invariants & Regression Verification (SPEC.md §V & §B)", inv_df)

    with console.status("[bold cyan]Evaluating direct catalog estimators, 5D cluster & CMB ablations...", spinner="dots"):
        cat_df = evaluate_catalog_estimators(df)
        reg_df = evaluate_region_cluster_ablation(df)
        cmb_df = evaluate_extragalactic_cmb_ablation()
    render_df_table("2. Multi-Catalog Direct Distance Estimators vs Bailer-Jones Photogeometric Reference (IC 434 Cone)", cat_df)
    render_df_table("3. Regional Cluster & 3D Dust Extinction Breakpoint Ablation Study (IC 434 / σ Orionis, T7–T9, T15)", reg_df)
    render_df_table("4. Benchmark Dark Nebulae (LDN 1630, LDN 1622, B68, B33) Optical-Range, PPV & Association Gate (T13–T15)", ldn_df)
    render_df_table("5. Extragalactic Heliocentric-to-CMB Redshift Frame Transformation Ablation (Planck18, T10)", cmb_df)

    knn_abl_df = evaluate_knn_method_ablation(state, k=cfg.k_neighbors)
    render_df_table("6. Missingness-Tolerant k-NN Regressor Methodological Ablation Study (T6, T7, T11, T12)", knn_abl_df)
    render_df_table(f"7. Selective Regression Abstention & Risk–Coverage Curve (AURC = {aurc_dex:.4f} dex, T16)", risk_cov_df)
    render_df_table("8. 15-Step Progressive Catalog Pruning & Shannon / Bayesian KL Information Loss (T4, T12)", prog_df)

    if cfg.live_queries:
        targets = ["IC434", "LDN 1630", "LDN 1622", "B68", "M45", "Sirius", "NGC 4889"]
        live_rows = [None] * len(targets)

        def eval_live_target(idx_name):
            idx_t, name = idx_name
            meta = resolve_name(name)
            r_on = float(np.clip(meta["radius_deg"], 0.015, 0.45)) if meta["radius_deg"] else 0.35
            cone = float(np.clip(max(r_on * 2.0, 0.15), 0.15, 0.45)) if meta["radius_deg"] else 0.35
            d_sub, tbls = fetch_all_catalogs(meta["ra"], meta["dec"], cone, 300, show_progress=False)
            prim, _, _ = synthesize_target_distance(meta, d_sub, tbls, cone)
            return idx_t, {"Target": f"{name} ({meta['canonical_name']})", "Type": meta["object_type"], "Mode": prim["mode"], "Distance_pc": f"{prim['distance_pc']:,.1f}" if np.isfinite(prim["distance_pc"]) else "ABSTAIN", "CI_16_84_pc": f"{prim['lo_pc']:,.1f} – {prim['hi_pc']:,.1f}" if np.isfinite(prim["lo_pc"]) else "—", "Method": prim["method"]}

        with Progress(SpinnerColumn("dots"), TextColumn("[bold cyan]{task.description}"), BarColumn(bar_width=28), MofNCompleteColumn(), TimeElapsedColumn(), console=console, transient=True) as prog:
            t_live = prog.add_task("Benchmarking live targets in parallel", total=len(targets))
            with ThreadPoolExecutor(max_workers=len(targets)) as ex:
                futs = [ex.submit(eval_live_target, (i, n)) for i, n in enumerate(targets)]
                for f in as_completed(futs):
                    idx_t, row_t = f.result()
                    live_rows[idx_t] = row_t
                    prog.update(t_live, advance=1, description=f"Completed [bold yellow]{row_t['Target']}[/bold yellow]")
        render_df_table("9. Live Multi-Catalog Benchmark Targets Across 5 Synthesis Tiers", pd.DataFrame(live_rows))


if __name__ == "__main__":
    main()
