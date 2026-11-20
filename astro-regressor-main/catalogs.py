import contextlib
import hashlib
import json
import logging
import os
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from io import StringIO

import astropy.units as u
import astroquery.exceptions as aq_exc
import numpy as np
import pandas as pd
import pyvo
import requests
from astropy import log as _astropy_log
from astropy.coordinates import SkyCoord, match_coordinates_sky
from astroquery.sdss import SDSS
from rich.console import Console
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    SpinnerColumn,
    TextColumn,
    TimeElapsedColumn,
)
from zero_point import zpt

_astropy_log.setLevel("ERROR")
for _lg in ("astroquery", "pyvo"):
    logging.getLogger(_lg).setLevel(logging.ERROR)

TAP_ERRORS = (
    requests.RequestException,
    pyvo.dal.DALAccessError,
    aq_exc.RemoteServiceError,
    aq_exc.TimeoutError,
    aq_exc.TableParseError,
    ValueError,
    KeyError,
    RuntimeError,
    OSError,
)
EXTENDED_OTYPES = {"HIIReg", "HII", "OpenCluster", "OpC", "Cl*", "Ass*", "Neb", "RfNeb", "RefNeb", "RNe", "GalNeb", "GNe", "EmissionNeb", "DarkNeb", "DNe", "Glb", "Globule", "MolCld", "MoC", "Cloud", "StarFormingReg", "SFR", "SNR", "PN"}
DARK_CLOUD_OTYPES = {"DarkNeb", "DNe", "Glb", "Globule", "MolCld", "MoC", "Cloud", "StarFormingReg", "SFR"}
EXTENDED_PREFIXES = ("LDN ", "BARNARD ", "CB ", "BHR ", "DC ", "SH2-", "IC ", "NGC ")
OPACITY_AV = {1: 0.8, 2: 1.5, 3: 2.5, 4: 4.0, 5: 6.5, 6: 10.0}
CURATED_ALIASES = {"LDN 57": "BARNARD 68", "NAME HORSEHEAD NEBULA": "BARNARD 33", "NAME OPHIUCHUS MOLECULAR CLOUD": "LDN 1688"}
_CLOUD_KEYS = ("ra", "dec", "canonical_name", "object_type", "radius_deg", "opacity_class", "v_lsr_kms", "v_lsr_range_kms", "ppv_components", "distance_pc", "lo_pc", "hi_pc", "mask_id", "citation")
CURATED_CLOUDS = {k: dict(zip(_CLOUD_KEYS, v)) for k, v in {
    "IC 434": (85.25, -2.45, "IC 434", "HIIReg", 0.35, 3, 9.8, (7.5, 12.0), 1, 390.0, 375.0, 405.0, "OrionB_IC434_tau353_v1", "Zucker+2020 (J/A+A/633/A51, doi:10.1051/0004-6361/201936145)"),
    "LDN 1630": (86.37, -0.98, "LDN 1630", "DarkNeb", 0.35, 5, 10.2, (8.0, 12.5), 2, 401.0, 381.0, 421.0, "LDN1630_VII7A_13CO_PPV_v1", "Zucker+2019/2020 (J/A+A/633/A51, doi:10.1051/0004-6361/201936145)"),
    "LDN 1622": (88.617, 1.803, "LDN 1622", "DarkNeb", 0.20, 6, 1.2, (-0.5, 2.8), 2, 412.0, 391.0, 433.0, "LDN1622_VII7A_13CO_PPV_v1", "Zucker+2019 (J/ApJ/879/125, doi:10.3847/1538-4357/ab2388)"),
    "LDN 183": (238.5508, -2.8283, "LDN 183", "MolCld", 0.25, 6, 2.4, (1.5, 3.3), 1, 109.0, 103.0, 115.0, "LDN183_VII7A_tau353_v1", "Zucker+2019 (J/ApJ/879/125, doi:10.3847/1538-4357/ab2388)"),
    "LDN 1688": (247.025, -24.542, "NAME Ophiuchus Molecular Cloud", "StarFormingReg", 0.45, 6, 3.5, (1.8, 5.2), 1, 139.0, 132.0, 146.0, "LDN1688_Oph_tau353_v1", "Zucker+2020 (J/A+A/633/A51); Reid+2019 VLBI"),
    "LDN 1495": (64.53, 27.62, "LDN 1495", "DarkNeb", 0.35, 5, 6.5, (5.0, 8.2), 2, 130.0, 123.0, 137.0, "LDN1495_Taurus_13CO_PPV_v1", "Zucker+2019/2020 (J/A+A/633/A51)"),
    "LDN 1551": (67.875, 18.2083, "LDN 1551", "DarkNeb", 0.025, 6, 6.7, (5.5, 7.9), 1, 145.0, 137.0, 153.0, "LDN1551_VII7A_v1", "Zucker+2019 (J/ApJ/879/125, doi:10.3847/1538-4357/ab2388)"),
    "BARNARD 68": (260.6592, -23.8261, "LDN 57 (Barnard 68)", "DarkNeb", 0.04, 6, 3.4, (2.8, 4.0), 1, 135.0, 125.0, 145.0, "B68_NICEST_v1", "Lombardi+2009 NICEST (doi:10.1051/0004-6361:200810519)"),
    "BARNARD 33": (85.2458, -2.4583, "NAME Horsehead Nebula", "DarkNeb", 0.05, 6, 10.6, (9.5, 11.5), 1, 400.0, 380.0, 420.0, "B33_Horsehead_PPV_v1", "Zucker+2020 (J/A+A/633/A51, doi:10.1051/0004-6361/201936145)"),
}.items()}
PARAM_GROUPS = [
    ("Tycho-2 / Hipparcos (BT, VT, Hp)", ["bt_mag", "vt_mag", "hp_mag"], 0.6), ("LAMOST DR9 + PS1 (z_spec, g, r, i)", ["lamost_z", "mag_ps_g", "mag_ps_r", "mag_ps_i"], 0.8),
    ("SDSS DR13 Optical (u, g, r, i, z)", ["sdss_u", "sdss_g", "sdss_r", "sdss_i", "sdss_z"], 0.8), ("Gaia Radial Velocity (v_rad)", ["radial_velocity"], 0.9),
    ("APASS DR9 Optical (V, B, g', r', i')", ["apass_vmag", "apass_bmag", "apass_g_mag", "apass_r_mag", "apass_i_mag"], 1.0), ("Gaia FLAME (log L, R, M)", ["log_lum_flame", "radius_flame", "mass_flame"], 2.2),
    ("CatWISE2020 (W1_pm, W2_pm, PM_IR)", ["w1mpro_pm", "w2mpro_pm", "cw_pmra", "cw_pmdec"], 1.1), ("Gaia GSP-Phot (Teff, logg, [M/H], A0, R)", ["teff_gspphot", "logg_gspphot", "mh_gspphot", "azero_gspphot", "ebpminrp_gspphot", "log_rad_gsp"], 2.4),
    ("Gaia XP Synthetic (V_JKC, B_JKC, r_SDSS)", ["v_jkc_mag", "b_jkc_mag", "i_jkc_mag", "r_sdss_mag"], 1.2), ("AllWISE Mid-IR (W1, W2, W3, W1-W2)", ["w1mpro", "w2mpro", "w3mpro", "w1_w2"], 1.2),
    ("2MASS Near-IR (J, H, Ks, J-Ks, G-Ks)", ["j_m", "h_m", "k_m", "j_k", "g_k"], 1.5), ("Gaia Proper Motion (pmra, pmdec, |pm|)", ["pmra", "pmdec", "pm_tot"], 1.6),
    ("Gaia Optical Color (BP-RP)", ["bp_rp"], 1.9), ("Gaia Apparent Magnitude (G)", ["phot_g_mean_mag"], 2.3), ("Sky Coordinates (RA, Dec)", ["ra", "dec"], 0.5),
]

def normalize_target_key(name: str) -> str:
    s = re.sub(r"\s+", " ", (name or "").strip())
    for pat, rep in ((r"^[Bb](?:arnard)?\s*(\d+)$", r"BARNARD \1"), (r"^[Ll](?:[Dd][Nn])?\s*(\d+)$", r"LDN \1"), (r"^[Ii][Cc]\s*(\d+)$", r"IC \1")):
        s = re.sub(pat, rep, s, flags=re.IGNORECASE)
    return CURATED_ALIASES.get(s.upper(), s.upper())

def is_extended_target(obj_type: str, name: str = "", canonical_name: str = "") -> bool:
    return (obj_type in EXTENDED_OTYPES) or normalize_target_key(name).startswith(EXTENDED_PREFIXES) or normalize_target_key(canonical_name).startswith(EXTENDED_PREFIXES)

def lookup_literature_distance(name: str, canonical_name: str = "", ra: float | None = None, dec: float | None = None, v_lsr_kms: float | None = None) -> dict | None:
    fmt_lit = lambda c: {**c, "mode": "literature", "method": f"Curated Cloud/PPV/Maser Import ({c['citation']}, mask={c['mask_id']}, v_LSR={c['v_lsr_kms']:+.1f} km/s)"}
    v_ok = lambda c: v_lsr_kms is None or abs(float(v_lsr_kms) - c["v_lsr_kms"]) <= 3.5
    for cand in (name, canonical_name):
        if (c := CURATED_CLOUDS.get(normalize_target_key(cand))) and v_ok(c):
            return fmt_lit(c)
    if ra is not None and dec is not None:
        sc_t = SkyCoord(ra=float(ra) * u.deg, dec=float(dec) * u.deg)
        for c in CURATED_CLOUDS.values():
            if float(sc_t.separation(SkyCoord(ra=c["ra"] * u.deg, dec=c["dec"] * u.deg)).deg) <= 0.12 and v_ok(c):
                return fmt_lit(c)
    return None

def resolve_name(name: str) -> dict:
    norm_key = normalize_target_key(name)
    prov = {"service": "MAST.Name.Lookup+VizieR_VII_7A_J_A+A_633_A51", "version": "2026.11-DR3", "timestamp_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ"), "query_sha256": hashlib.sha256(norm_key.encode()).hexdigest()[:12]}
    if (c := CURATED_CLOUDS.get(norm_key)) is not None:
        return {"ra": c["ra"], "dec": c["dec"], "input_name": name, "canonical_name": c["canonical_name"], "object_type": c["object_type"], "is_extended": True, "resolver": "Curated_VizieR_SIMBAD", "radius_deg": c["radius_deg"], "opacity_class": c["opacity_class"], "v_lsr_kms": c["v_lsr_kms"], "ppv_components": c["ppv_components"], "mask_id": c["mask_id"], "provenance": prov}
    q_str = norm_key.title() if norm_key.startswith("BARNARD ") else name
    resp = requests.post("https://mast.stsci.edu/api/v0/invoke", data={"request": json.dumps({"service": "Mast.Name.Lookup", "params": {"input": q_str, "format": "json"}})}, timeout=12)
    if not (resolved := resp.json().get("resolvedCoordinate", [])):
        raise ValueError(f"Unknown astronomical object: {name}")
    hit = resolved[0]
    canon, obj_type = str(hit.get("canonicalName") or name), str(hit.get("objectType") or "Unknown")
    rad = float(np.clip(float(hit["radius"]), 0.015, 0.45)) if hit.get("radius") is not None else None
    return {"ra": float(hit["ra"]), "dec": float(hit["decl"]), "input_name": name, "canonical_name": canon, "object_type": obj_type, "is_extended": is_extended_target(obj_type, name, canon), "resolver": str(hit.get("resolver") or "MAST"), "radius_deg": rad, "opacity_class": None, "v_lsr_kms": None, "ppv_components": 1, "mask_id": None, "provenance": prov}

def gaia_zeropoint_mas(df: pd.DataFrame) -> np.ndarray:
    g, nu, ps, beta, aps = [pd.to_numeric(df[c], errors="coerce").to_numpy(dtype=float) if c in df else np.full(len(df), np.nan) for c in ("phot_g_mean_mag", "nu_eff_used_in_astrometry", "pseudocolour", "ecl_lat", "astrometric_params_solved")]
    valid = (g > 6) & (g < 21) & np.isfinite(beta) & (np.abs(beta) <= 90) & (((aps == 31) & (nu > 1.1) & (nu < 1.9)) | ((aps == 95) & (ps > 1.24) & (ps < 1.72)))
    result = np.full(len(df), np.nan)
    if valid.any():
        zpt.load_tables()
        result[valid] = zpt.get_zpt(g[valid], nu[valid], ps[valid], beta[valid], aps[valid], _warnings=False)
    return result

def apply_gaia_calibration(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df["zp_offset_mas"] = gaia_zeropoint_mas(df)
    df["zp_applied"] = np.isfinite(df["zp_offset_mas"])
    df["parallax_corr"] = df["parallax"] - df["zp_offset_mas"].fillna(0.0)
    df["zp_status"] = np.where(df["zp_applied"], "Lindegren2021/gaiadr3-zeropoint-0.1.0", "unsupported_or_missing_inputs; raw_parallax")
    return df

def compute_nicer_extinction(df: pd.DataFrame, r_on_deg: float | None = None) -> np.ndarray:
    if len(df) == 0:
        return np.array([], dtype=float)
    j, h, k, w1 = [df[c].to_numpy(dtype=float) if c in df else np.full(len(df), np.nan) for c in ("j_m", "h_m", "k_m", "w1mpro")]
    jh, hk, kw1 = j - h, h - k, k - w1
    fg = (df["r_med_photogeo"].to_numpy(dtype=float) < 220.0) if "r_med_photogeo" in df else np.zeros(len(df), dtype=bool)
    jh0, hk0, kw0 = [float(np.nanmedian(c[fg])) if np.isfinite(c[fg]).sum() >= 5 else d0 for c, d0 in ((jh, 0.42), (hk, 0.11), (kw1, 0.05))]
    avs = ((jh - jh0) / 0.107, (hk - hk0) / 0.063, (kw1 - kw0) / 0.065)
    ws = [np.where(np.isfinite(a), 1.0 / (s ** 2), 0.0) for a, s in zip(avs, (0.045, 0.035, 0.050))]
    w_tot, num = sum(ws), sum(np.where(np.isfinite(a), w * a, 0.0) for a, w in zip(avs, ws))
    return np.clip(np.where(w_tot > 0.0, num / np.where(w_tot > 0.0, w_tot, 1.0), np.nan), 0.0, 35.0)

def feature_covariance(df: pd.DataFrame, columns: list[str]) -> np.ndarray:
    n = len(df)
    pmra = df["pmra"].to_numpy(dtype=float) if "pmra" in df else np.full(n, np.nan)
    pmdec = df["pmdec"].to_numpy(dtype=float) if "pmdec" in df else np.full(n, np.nan)
    total = np.hypot(pmra, pmdec)
    lum = df["lum_flame"].to_numpy(dtype=float) if "lum_flame" in df else np.full(n, np.nan)
    rad = df["radius_gspphot"].to_numpy(dtype=float) if "radius_gspphot" in df else np.full(n, np.nan)
    d_lum, d_rad, d_pmra, d_pmdec = np.full(n, np.nan), np.full(n, np.nan), np.full(n, np.nan), np.full(n, np.nan)
    ok_lum, ok_rad, ok_pm = lum > 1e-4, rad > 1e-2, np.isfinite(total) & (total > 0)
    d_lum[ok_lum] = 1.0 / (lum[ok_lum] * np.log(10))
    d_rad[ok_rad] = 1.0 / (rad[ok_rad] * np.log(10))
    d_pmra[ok_pm], d_pmdec[ok_pm] = pmra[ok_pm] / total[ok_pm], pmdec[ok_pm] / total[ok_pm]
    derived = {
        "j_k": {"j_m": 1, "k_m": -1}, "g_k": {"phot_g_mean_mag": 1, "k_m": -1},
        "w1_w2": {"w1mpro": 1, "w2mpro": -1}, "bp_rp": {"phot_bp_mean_mag": 1, "phot_rp_mean_mag": -1},
        "log_lum_flame": {"lum_flame": d_lum}, "log_rad_gsp": {"radius_gspphot": d_rad},
        "pm_tot": {"pmra": d_pmra, "pmdec": d_pmdec},
    }
    basis = list(dict.fromkeys([c for c in columns if c not in derived] + [c for terms in derived.values() for c in terms]))
    d = len(basis)
    errors = np.column_stack([df[f"{c}_error"].to_numpy(dtype=float) if f"{c}_error" in df else np.full(n, np.nan) for c in basis])
    dec_rad = np.deg2rad(df["dec"].to_numpy(dtype=float)) if "dec" in df else np.zeros(n)
    for j, col in enumerate(basis):
        if col in {"ra", "dec"}:
            scale = np.cos(dec_rad) if col == "ra" else 1.0
            errors[:, j] /= 3.6e6 * np.where(np.abs(scale) > 1e-6, scale, np.nan)
        if col.startswith("phot_") and col.endswith("_mag") and (ratio := col.removesuffix("_mag") + "_flux_over_error") in df:
            r_vals = df[ratio].to_numpy(dtype=float)
            ok_r = np.isfinite(r_vals) & (r_vals > 0)
            errors[ok_r, j] = 2.5 / np.log(10) / r_vals[ok_r]
            errors[~ok_r, j] = np.nan
    errors = np.where(np.isfinite(errors) & (errors >= 0), errors, np.nan)
    covariance = np.zeros((n, d, d))
    covariance[:, np.arange(d), np.arange(d)] = np.nan_to_num(errors) ** 2
    for a, left in enumerate(basis):
        for b, right in enumerate(basis[:a]):
            if name := next((c for c in (f"{left}_{right}_corr", f"{right}_{left}_corr") if c in df), None):
                corr = df[name].to_numpy(dtype=float)
                if np.any(np.abs(corr[np.isfinite(corr)]) > 1):
                    raise ValueError(f"Invalid measurement correlation: {name}")
                covariance[:, a, b] = covariance[:, b, a] = np.nan_to_num(corr * errors[:, a] * errors[:, b])
    jacobian, known = np.zeros((n, len(columns), d)), np.ones((n, len(columns)), dtype=bool)
    for j, col in enumerate(columns):
        for term, deriv in derived.get(col, {col: 1}).items():
            idx = basis.index(term)
            deriv_arr = np.broadcast_to(np.asarray(deriv, dtype=float), n)
            jacobian[:, j, idx] = np.nan_to_num(deriv_arr, nan=0.0, posinf=0.0, neginf=0.0)
            known[:, j] &= np.isfinite(errors[:, idx]) & np.isfinite(deriv_arr)
    jacobian = np.where(known[:, :, None], jacobian, 0.0)
    transformed, diag = jacobian @ covariance @ jacobian.swapaxes(1, 2), np.arange(len(columns))
    transformed[:, diag, diag] = np.where(known, transformed[:, diag, diag], np.nan)
    return transformed

def _derive_features(df: pd.DataFrame) -> pd.DataFrame:
    optional = {c for _, cols, _ in PARAM_GROUPS for c in cols} | {
        "j_m", "h_m", "k_m", "w1mpro", "w2mpro", "lum_flame", "radius_gspphot",
        "phot_bp_mean_mag", "phot_rp_mean_mag", "distance_gspphot", "distance_gspphot_lower",
        "distance_gspphot_upper", "r_lo_photogeo", "r_hi_photogeo", "sh_dist_pc", "sh_lo_pc", "sh_hi_pc",
    }
    col = lambda name: df[name].to_numpy(dtype=float) if name in df else np.full(len(df), np.nan)
    plx_vals = col("parallax_corr" if "parallax_corr" in df else "parallax")
    d_naive = np.full(len(df), np.nan)
    ok_plx = np.isfinite(plx_vals) & (plx_vals > 0.2)
    d_naive[ok_plx] = 1000.0 / plx_vals[ok_plx]
    lum, rad = col("lum_flame"), col("radius_gspphot")
    derived = {
        "d_naive_pc": d_naive,
        "pm_tot": np.hypot(col("pmra"), col("pmdec")),
        "j_k": col("j_m") - col("k_m"),
        "g_k": col("phot_g_mean_mag") - col("k_m"),
        "w1_w2": col("w1mpro") - col("w2mpro"),
        "log_lum_flame": np.log10(np.clip(lum, 1e-4, None)),
        "log_rad_gsp": np.log10(np.clip(rad, 1e-2, None)),
        "av_nicer": compute_nicer_extinction(df),
    }
    missing_cols = {c: np.nan for c in sorted(optional.difference(df.columns)) if c not in derived}
    base = df.drop(columns=[c for c in derived if c in df])
    return pd.concat([base, pd.DataFrame({**missing_cols, **derived}, index=df.index)], axis=1)

def load_multicatalog_dataset(csv_path: str = "data/ic434_multicatalog.csv", filter_ruwe: bool = True) -> pd.DataFrame:
    raw_df = pd.read_csv(csv_path, dtype={"source_id": "Int64"})
    required = {"source_id", "ra", "dec", "parallax", "parallax_error", "pmra", "pmdec", "phot_g_mean_mag", "r_med_photogeo"}
    if missing := required.difference(raw_df.columns):
        raise ValueError(f"{csv_path}: missing required columns: {', '.join(sorted(missing))}")
    sidecar_path = os.path.join(os.path.dirname(csv_path) or ".", "ic434_uncertainties_starhorse.csv")
    if os.path.exists(sidecar_path) and os.path.basename(csv_path) == "ic434_multicatalog.csv":
        sidecar = pd.read_csv(sidecar_path, dtype={"source_id": "Int64"}).drop_duplicates("source_id")
        raw_df = raw_df.merge(sidecar[[c for c in sidecar.columns if c == "source_id" or c not in raw_df.columns]], on="source_id", how="left")
    raw_df = apply_gaia_calibration(raw_df)
    ruwe_ok = (raw_df["ruwe"].isna() | (raw_df["ruwe"] < 1.4)) if (filter_ruwe and "ruwe" in raw_df) else True
    df = raw_df[raw_df["r_med_photogeo"].between(50.0001, 2199.9999) & ruwe_ok].copy().reset_index(drop=True)
    for c in [c for c in df.columns if c not in {"source_id", "ra", "dec", "l", "b", "ecl_lat", "zp_applied", "zp_status", "sh_provenance"} and pd.api.types.is_numeric_dtype(df[c]) and not c.endswith("_corr")]:
        vals = pd.to_numeric(df[c], errors="coerce")
        df[c] = np.where(vals < -90.0, np.nan, vals)
    df = _derive_features(df)
    genuine_sh = df.get("sh_provenance", pd.Series("unavailable", index=df.index)).eq("VizieR:I/354/starhorse2021")
    df.loc[~genuine_sh, ["sh_dist_pc", "sh_lo_pc", "sh_hi_pc"]] = np.nan
    df["sh_provenance"] = np.where(genuine_sh & df["sh_dist_pc"].notna(), "VizieR:I/354/starhorse2021", "unavailable")
    return df

def fetch_all_catalogs(ra: float, dec: float, cone_deg: float, max_stars: int, show_progress: bool = True) -> tuple[pd.DataFrame, dict[str, pd.DataFrame]]:
    with contextlib.redirect_stdout(StringIO()):
        from astroquery.gaia import Gaia
    c_fn = lambda r_c, d_c: f"1=CONTAINS(POINT('ICRS', {r_c}, {d_c}), CIRCLE('ICRS', {ra}, {dec}, {cone_deg}))"
    def q_gaia(sql):
        last_err = None
        for fn in (Gaia.launch_job, Gaia.launch_job_async):
            try:
                return fn(sql).get_results().to_pandas()
            except TAP_ERRORS as err:
                last_err = err
        raise last_err
    def q_irsa(sql):
        try:
            return pyvo.dal.TAPService("https://irsa.ipac.caltech.edu/TAP").search(sql).to_table().to_pandas()
        except TAP_ERRORS:
            fallback_sql = f"SELECT ra, dec, j_m, j_msigcom AS j_m_error, h_m, h_msigcom AS h_m_error, ks_m AS k_m, ks_msigcom AS k_m_error FROM gaiadr1.tmass_original_valid WHERE {c_fn('ra', 'dec')}" if "fp_psc" in sql else f"SELECT ra, dec, w1mpro, w1mpro_error, w2mpro, w2mpro_error, w3mpro, w3mpro_error, w4mpro, w4mpro_error FROM gaiadr1.allwise_original_valid WHERE {c_fn('ra', 'dec')}"
            return q_gaia(fallback_sql)
    q_sdss = lambda: (tbl.to_pandas() if (tbl := SDSS.query_region(SkyCoord(ra=ra * u.deg, dec=dec * u.deg), radius=min(cone_deg * 60.0, 2.9) * u.arcmin, specobj_fields=["ra", "dec", "z", "zErr", "class"])) is not None else pd.DataFrame())
    def q_vizier(sql):
        is_sh = "sh_dist_pc" in sql
        try:
            response = requests.post("https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync", data={"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": sql}, timeout=6)
            response.raise_for_status()
            if not response.text.lstrip().startswith("<"):
                frame = pd.read_csv(StringIO(response.text), dtype={"source_id": "Int64"})
                if ({"source_id", "sh_dist_pc", "sh_lo_pc", "sh_hi_pc"} if is_sh else {"ra", "dec", "dm_cf4", "e_dm"}).issubset(frame.columns):
                    return frame.drop_duplicates("source_id") if is_sh else frame
        except TAP_ERRORS:
            pass
        source, cols, max_rows = ("I/354/starhorse2021", "Source,RA_ICRS,DE_ICRS,dist16,dist50,dist84,AV50", "800") if is_sh else ("J/ApJ/944/94/table2", "PGC,RAJ2000,DEJ2000,Vcmb,DM,e_DM", "50")
        for mirror in ("https://vizier.cds.unistra.fr/viz-bin/asu-tsv", "https://vizier.cfa.harvard.edu/viz-bin/asu-tsv", "https://vizier.idia.ac.za/viz-bin/asu-tsv"):
            try:
                r = requests.get(mirror, params={"-source": source, "-c": f"{ra} {dec}", "-c.rd": f"{cone_deg}", "-out": cols, "-out.max": max_rows}, timeout=8)
                r.raise_for_status()
                lines = [ln for ln in r.text.splitlines() if ln.strip() and not ln.startswith("#")]
                if len(lines) < 4:
                    if f"#Name: {source}" not in r.text:
                        raise ValueError(f"Incomplete VizieR response from {mirror}")
                    return pd.DataFrame(columns=["source_id", "ra", "dec", "sh_dist_pc", "sh_lo_pc", "sh_hi_pc", "sh_av"] if is_sh else ["PGC", "ra", "dec", "v_cmb_kms", "dm_cf4", "e_dm"])
                raw = pd.read_csv(StringIO("\n".join([lines[0]] + [ln for ln in lines[3:] if not set(ln.strip()) <= {"-", "\t", " "}])), sep="\t", skipinitialspace=True)
                if is_sh:
                    return pd.DataFrame({"source_id": pd.to_numeric(raw["Source"], errors="coerce").astype("Int64"), "ra": pd.to_numeric(raw["RA_ICRS"], errors="coerce"), "dec": pd.to_numeric(raw["DE_ICRS"], errors="coerce"), "sh_dist_pc": pd.to_numeric(raw["dist50"], errors="coerce") * 1000.0, "sh_lo_pc": pd.to_numeric(raw["dist16"], errors="coerce") * 1000.0, "sh_hi_pc": pd.to_numeric(raw["dist84"], errors="coerce") * 1000.0, "sh_av": pd.to_numeric(raw["AV50"], errors="coerce")}).dropna(subset=["source_id", "sh_dist_pc"]).drop_duplicates("source_id")
                return pd.DataFrame({"PGC": pd.to_numeric(raw["PGC"], errors="coerce"), "ra": pd.to_numeric(raw["RAJ2000"], errors="coerce"), "dec": pd.to_numeric(raw["DEJ2000"], errors="coerce"), "v_cmb_kms": pd.to_numeric(raw["Vcmb"], errors="coerce"), "dm_cf4": pd.to_numeric(raw["DM"], errors="coerce"), "e_dm": pd.to_numeric(raw["e_DM"], errors="coerce")}).dropna(subset=["ra", "dec", "dm_cf4"])
            except TAP_ERRORS as err:
                last_err = err
        raise last_err
    cg, irsa_c = c_fn("g.ra", "g.dec"), f"CONTAINS(POINT('ICRS', ra, dec), CIRCLE('ICRS', {ra}, {dec}, {cone_deg})) = 1"
    gaia_queries = {
        "base": f"SELECT TOP {max_stars} g.source_id, g.ra, g.dec, g.ra_error, g.dec_error, g.l, g.b, g.ecl_lat, g.parallax, g.parallax_error, g.pmra, g.pmdec, g.pmra_error, g.pmdec_error, g.parallax_pmra_corr, g.parallax_pmdec_corr, g.pmra_pmdec_corr, g.radial_velocity, g.radial_velocity_error, g.ruwe, g.astrometric_params_solved, g.nu_eff_used_in_astrometry, g.pseudocolour, g.phot_g_mean_mag, g.phot_g_mean_flux_over_error, g.phot_bp_mean_mag, g.phot_bp_mean_flux_over_error, g.phot_rp_mean_mag, g.phot_rp_mean_flux_over_error, g.bp_rp, g.teff_gspphot, g.logg_gspphot, g.mh_gspphot, g.azero_gspphot, g.ebpminrp_gspphot, g.distance_gspphot, g.distance_gspphot_lower, g.distance_gspphot_upper, d.r_med_geo, d.r_lo_geo, d.r_hi_geo, d.r_med_photogeo, d.r_lo_photogeo, d.r_hi_photogeo, DISTANCE(POINT('ICRS', g.ra, g.dec), POINT('ICRS', {ra}, {dec})) * 3600.0 AS sep_arcsec FROM gaiadr3.gaia_source AS g JOIN external.gaiaedr3_distance AS d USING (source_id) WHERE {cg} AND g.parallax IS NOT NULL AND g.parallax_over_error > 1.5 AND (g.ruwe < 1.4 OR g.ruwe IS NULL) ORDER BY g.parallax_over_error DESC",
        "flame": f"SELECT TOP 2000 g.source_id, ap.radius_gspphot, ap.lum_flame, ap.radius_flame, ap.mass_flame, ap.age_flame, ap.distance_msc, ap.distance_msc_lower, ap.distance_msc_upper FROM gaiadr3.gaia_source AS g JOIN gaiadr3.astrophysical_parameters AS ap USING (source_id) WHERE {cg}",
        "gspc": f"SELECT TOP 2000 g.source_id, sp.v_jkc_mag, sp.b_jkc_mag, sp.i_jkc_mag, sp.g_sdss_mag, sp.r_sdss_mag, sp.i_sdss_mag FROM gaiadr3.gaia_source AS g JOIN gaiadr3.synthetic_photometry_gspc AS sp USING (source_id) WHERE {cg}",
        "catwise": f"SELECT TOP 2500 ra_icrs AS ra, de_icrs AS dec, w1mpro_pm, w2mpro_pm, pm_ra AS cw_pmra, pm_de AS cw_pmdec FROM external.catwise2020 WHERE {c_fn('ra_icrs', 'de_icrs')}",
        "apass": f"SELECT TOP 1500 raj2000 AS ra, dej2000 AS dec, vmag, bmag, b_v, g_mag, r_mag, i_mag FROM external.apassdr9 WHERE {c_fn('raj2000', 'dej2000')}",
        "sdss_phot": f"SELECT TOP 2500 ra, dec, u AS sdss_u, g AS sdss_g, r AS sdss_r, i AS sdss_i, z AS sdss_z FROM external.sdssdr13_photoprimary WHERE {c_fn('ra', 'dec')}",
        "lamost": f"SELECT TOP 1000 ra, dec, z AS lamost_z, mag_ps_g, mag_ps_r, mag_ps_i, mag_ps_z, mag_ps_y FROM external.lamost_dr9_lrs WHERE {c_fn('ra', 'dec')}",
        "tycho2": f"SELECT ra_deg AS ra, de_deg AS dec, bt_mag, vt_mag FROM public.tycho2 WHERE {c_fn('ra_deg', 'de_deg')}",
        "hipparcos2": f"SELECT hip, ra, dec, plx AS hip_plx, e_plx AS hip_e_plx, hp_mag, b_v AS hip_bv, DISTANCE(POINT('ICRS', ra, dec), POINT('ICRS', {ra}, {dec})) * 3600.0 AS sep_arcsec FROM public.hipparcos_newreduction WHERE {c_fn('ra', 'dec')} ORDER BY sep_arcsec ASC",
    }
    irsa_queries = {
        "tmass": f"SELECT ra, dec, j_m, j_msigcom AS j_m_error, h_m, h_msigcom AS h_m_error, k_m, k_msigcom AS k_m_error FROM fp_psc WHERE {irsa_c}",
        "allwise": f"SELECT ra, dec, w1mpro, w1sigmpro AS w1mpro_error, w2mpro, w2sigmpro AS w2mpro_error, w3mpro, w3sigmpro AS w3mpro_error, w4mpro, w4sigmpro AS w4mpro_error FROM allwise_p3as_psd WHERE {irsa_c}",
    }
    viz_queries = {
        "starhorse": f"SELECT TOP 1000 Source AS source_id, RA_ICRS AS ra, DE_ICRS AS dec, dist50 * 1000.0 AS sh_dist_pc, dist16 * 1000.0 AS sh_lo_pc, dist84 * 1000.0 AS sh_hi_pc, AV50 AS sh_av FROM \"I/354/starhorse2021\" WHERE {c_fn('RA_ICRS', 'DE_ICRS')}",
        "cosmicflows4": f"SELECT TOP 50 PGC, RAJ2000 AS ra, DEJ2000 AS dec, DM AS dm_cf4, e_DM AS e_dm, Vcmb AS v_cmb_kms FROM \"J/ApJ/944/94/table2\" WHERE {c_fn('RAJ2000', 'DEJ2000')}",
    }
    with ThreadPoolExecutor(max_workers=14) as ex:
        futs = {**{k: ex.submit(q_gaia, sql) for k, sql in gaia_queries.items()}, **{k: ex.submit(q_irsa, sql) for k, sql in irsa_queries.items()}, **{k: ex.submit(q_vizier, sql) for k, sql in viz_queries.items()}, "sdss_spec": ex.submit(q_sdss)}
        fut_to_key, tables, statuses = {f: k for k, f in futs.items()}, {}, []
        with Progress(SpinnerColumn("dots"), TextColumn("[bold cyan]{task.description}"), BarColumn(bar_width=28), MofNCompleteColumn(), TimeElapsedColumn(), transient=True, disable=not show_progress) as prog:
            task = prog.add_task(f"Querying 14 astronomical catalogs (r={cone_deg:.2f}°)", total=len(futs))
            for f in as_completed(fut_to_key):
                k, ex_err = fut_to_key[f], f.exception()
                tables[k] = f.result() if ex_err is None else pd.DataFrame()
                status = "error" if ex_err else "empty"
                if not ex_err and len(tables[k]):
                    status = "ok"
                statuses.append({"catalog": k, "status": status, "rows": len(tables[k]), "error": str(ex_err) if ex_err else "", "query_sha256": hashlib.sha256(({**gaia_queries, **irsa_queries, **viz_queries}.get(k, "SDSS.query_region")).encode()).hexdigest(), "timestamp_utc": datetime.now(UTC).isoformat()})
                prog.update(task, advance=1, description=f"Querying 14 catalogs [dim]({k})[/dim]")
    tables["provenance"] = pd.DataFrame([{"service": "Gaia_TAP_DR3+IRSA_TAP+SDSS_DR17+VizieR_TAP", "version": "GaiaDR3_BailerJones2021_StarHorse2021_CF4", "query_sha256": hashlib.sha256(gaia_queries["base"].encode()).hexdigest()[:12], "timestamp_utc": datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%SZ")}])
    tables["query_status"] = pd.DataFrame(statuses)
    if len(df := tables["base"]) == 0:
        return df, tables
    if "ruwe" in df:
        df = df[df["ruwe"].isna() | (df["ruwe"] < 1.4)].copy().reset_index(drop=True)
    df = apply_gaia_calibration(df)
    for aux in ("flame", "gspc", "starhorse"):
        if aux in tables and len(tables[aux]) > 0 and "source_id" in tables[aux]:
            df = df.merge(tables[aux].drop(columns=[c for c in ("ra", "dec") if c in tables[aux]]).drop_duplicates("source_id"), on="source_id", how="left", validate="one_to_one")
    for column in ("sh_dist_pc", "sh_lo_pc", "sh_hi_pc"):
        if column not in df:
            df[column] = np.nan
    df["sh_provenance"] = np.where(df["sh_dist_pc"].notna(), "VizieR:I/354/starhorse2021", "unavailable")
    base_sc = SkyCoord(ra=df["ra"].to_numpy() * u.deg, dec=df["dec"].to_numpy() * u.deg)
    ext_specs = [
        ("tmass", ["j_m", "j_m_error", "h_m", "h_m_error", "k_m", "k_m_error"], "", 2.0),
        ("allwise", ["w1mpro", "w1mpro_error", "w2mpro", "w2mpro_error", "w3mpro", "w3mpro_error", "w4mpro", "w4mpro_error"], "", 2.0),
        ("catwise", ["w1mpro_pm", "w2mpro_pm", "cw_pmra", "cw_pmdec"], "", 2.0),
        ("apass", ["vmag", "bmag", "b_v", "g_mag", "r_mag", "i_mag"], "apass_", 2.0),
        ("sdss_phot", ["sdss_u", "sdss_g", "sdss_r", "sdss_i", "sdss_z"], "", 2.0),
        ("lamost", ["lamost_z", "mag_ps_g", "mag_ps_r", "mag_ps_i", "mag_ps_z", "mag_ps_y"], "", 2.0),
        ("tycho2", ["bt_mag", "vt_mag"], "", 2.0),
        ("hipparcos2", ["hip_plx", "hip_e_plx", "hp_mag", "hip_bv"], "", 5.0),
    ]
    for tbl_k, cols, pref, max_sep in ext_specs:
        ref_df, df[[pref + c for c in cols]] = tables.get(tbl_k, pd.DataFrame()), np.nan
        if len(ref_df) > 0 and "ra" in ref_df:
            idx, sep2d, _ = match_coordinates_sky(base_sc, SkyCoord(ra=ref_df["ra"].to_numpy() * u.deg, dec=ref_df["dec"].to_numpy() * u.deg))
            ok = sep2d < (max_sep * u.arcsec)
            for c in [c for c in cols if c in ref_df]:
                vals = pd.to_numeric(ref_df[c], errors="coerce").to_numpy()[idx]
                df[pref + c] = np.where(ok & (vals >= -90.0), vals, np.nan)
    return _derive_features(df), tables


if __name__ == "__main__":
    sample = pd.DataFrame({"phot_g_mean_mag": [15.0], "astrometric_params_solved": [31], "nu_eff_used_in_astrometry": [1.5], "ecl_lat": [0.0], "j_m": [12.0], "h_m": [11.5], "k_m": [11.3], "w1mpro": [11.2]})
    assert np.isfinite(gaia_zeropoint_mas(sample)).all()
    assert np.isfinite(compute_nicer_extinction(sample)).all()
    Console().print("[bold green]catalogs.py offline smoke test OK[/bold green]")
