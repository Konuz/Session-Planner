"""Odległość wycinka zdjęcia z astro-regressor: pozycja i promień wycinka zamiast nazwy (bez resolvera MAST i bez
rejestru CURATED_CLOUDS). Wynik to jeden obiekt JSON na stdout; wszystko inne idzie na stderr.

Uruchamianie (serwer, server/regressor.ts):
  pixi run --manifest-path astro-regressor-main/pixi.toml python scripts/regressor/cut_distance.py --ra 85.38 --dec -2.30 --radius 0.05 --type EN

status: ok (wartość), abstain (model odmówił; wynik trwały) albo error (awaria usługi lub programu; do ponowienia).
"""
import argparse, contextlib, json, math, os, sys
from io import StringIO

ROOT = os.environ.get("REGRESSOR_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "astro-regressor-main")
sys.path.insert(0, os.path.abspath(ROOT))

# Typ aplikacji → typ obiektu regresora. Mgławice ciemne, planetarne, pozostałości po supernowych i „inne” pomijamy:
# populacja gwiazd w stożku nic o nich nie mówi, a skok ekstynkcji ma w regresorze stałą niepewność ±7 %.
OTYPES = {"EN": "HII", "RN": "RNe", "CN": "Cl*", "OC": "OpC", "GC": "Cl*", "G": "G", "GG": "GrG"}
NEBULAE = {"EN", "RN", "CN"}
GAVO = "https://dc.zah.uni-heidelberg.de/tap/sync"
GAIA_ARCHIVES = (
    ("https://gaia.ari.uni-heidelberg.de/tap/sync", "gaiaedr3_complements.distances"),
    ("https://gea.esac.esa.int/tap-server/tap/sync", "external.gaiaedr3_distance"),
)
STELLAR_COLUMNS = ("source_id", "ra", "dec", "parallax", "parallax_error", "pmra", "pmdec",
                   "phot_g_mean_mag", "astrometric_params_solved", "pseudocolour")
CALIBRATION_COLUMNS = ("source_id", "ecl_lat", "nu_eff_used_in_astrometry")


def tap_csv(url, query, columns):
    import pandas as pd
    import requests

    response = requests.post(url, data={"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": query},
                             timeout=(5, 12))
    response.raise_for_status()
    table = pd.read_csv(StringIO(response.text), dtype={"source_id": "int64"})
    if not set(columns).issubset(table.columns):
        raise ValueError("Nieoczekiwane kolumny odpowiedzi TAP")
    return table


def fetch_stellar_cone(ra, dec, cone):
    import requests
    from catalogs import apply_gaia_calibration

    columns = (*STELLAR_COLUMNS, "r_med_photogeo")
    region = f"1=CONTAINS(POINT('ICRS', g.ra,g.dec),CIRCLE('ICRS',{ra},{dec},{cone}))"
    quality = "AND g.parallax_error > 0 AND g.parallax/g.parallax_error > 1.5 AND (g.ruwe < 1.4 OR g.ruwe IS NULL)"
    order = "ORDER BY snr DESC, source_id ASC"
    select = ", ".join(f"g.{c} AS {c}" for c in STELLAR_COLUMNS)
    try:
        stars = tap_csv(GAVO, f"SELECT TOP 500 {select}, g.r_med_photogeo, g.parallax/g.parallax_error AS snr "
                             f"FROM gedr3dist.litewithdist AS g WHERE {region} {quality} {order}", columns)
    except (requests.RequestException, ValueError):
        stars = None

    if stars is not None and stars.empty:
        return stars

    codes = []
    for url, distance_table in GAIA_ARCHIVES:
        # Jedna próba na usługę. Po 429 kolejne źródło, bez ponawiania w okresie Retry-After.
        try:
            if stars is None:
                astrometry = tap_csv(url, f"SELECT TOP 1000 {select}, g.ecl_lat, g.nu_eff_used_in_astrometry, "
                                          f"g.parallax/g.parallax_error AS snr FROM gaiadr3.gaia_source AS g "
                                          f"WHERE {region} {quality} {order}", (*STELLAR_COLUMNS, *CALIBRATION_COLUMNS[1:]))
                if astrometry.empty:
                    return astrometry
                ids = ",".join(str(source_id) for source_id in astrometry["source_id"])
                distances = tap_csv(url, f"SELECT source_id, r_med_photogeo FROM {distance_table} "
                                         f"WHERE source_id IN ({ids})", ("source_id", "r_med_photogeo"))
                full = astrometry.merge(distances, on="source_id", validate="one_to_one").head(500)
            else:
                ids = ",".join(str(source_id) for source_id in stars["source_id"])
                calibration = tap_csv(url, f"SELECT {', '.join(CALIBRATION_COLUMNS)} "
                                           f"FROM gaiadr3.gaia_source WHERE source_id IN ({ids})", CALIBRATION_COLUMNS)
                full = stars.merge(calibration, on="source_id", validate="one_to_one")
                if len(full) != len(stars):
                    raise ValueError("Niepełne dane do korekty paralaksy")
            return apply_gaia_calibration(full)
        except (requests.RequestException, ValueError) as error:
            status = error.response.status_code if isinstance(error, requests.HTTPError) and error.response is not None else None
            codes.append(str(status) if status is not None else type(error).__name__)
    raise RuntimeError(f"Gaia chwilowo niedostępna ({', '.join(codes)})")


def finite(x):
    return x is not None and isinstance(x, (int, float)) and math.isfinite(x)


def run(ra, dec, radius, app_type):
    from estimators import synthesize_target_distance

    galaxy = app_type in ("G", "GG")
    r_on = min(max(radius, 0.015), 0.45)
    cone = min(max(r_on * 2.0, 0.15), 0.45)
    name = f"POS {ra:.5f} {dec:+.5f}"
    meta = {"ra": ra, "dec": dec, "object_type": OTYPES[app_type], "canonical_name": name, "input_name": name, "is_extended": not galaxy,
            "radius_deg": r_on, "opacity_class": None, "v_lsr_kms": None, "ppv_components": 1}
    if galaxy:
        from catalogs import fetch_all_catalogs

        df, tables = fetch_all_catalogs(ra, dec, cone, 500, show_progress=False)
        status = {row["catalog"]: row for row in tables["query_status"].to_dict("records")}
        failed = [k for k in ("sdss_spec", "cosmicflows4") if status.get(k, {}).get("status") == "error"]
        if failed:
            return {"status": "error", "message": "; ".join(f"{k}: {status[k]['error'][:160]}" for k in failed)}
    else:
        df, tables = fetch_stellar_cone(ra, dec, cone), {}
    primary, _, members = synthesize_target_distance(meta, df, tables, cone, use_registry=False, prefer_nearest=app_type in NEBULAE)
    mode, method = primary.get("mode"), str(primary.get("method", ""))
    d, lo, hi = primary.get("distance_pc"), primary.get("lo_pc"), primary.get("hi_pc")
    base = {"cone_deg": round(cone, 3), "stars": int(len(df)), "regressor_method": method}
    if mode == "abstain" or not finite(d):
        return {**base, "status": "abstain", "reason": primary.get("abstain_reason") or method}
    if mode == "region_kde":
        if method.startswith("Gaia DR3 Fallback Median"):
            return {**base, "status": "abstain", "reason": "TOO_FEW_STARS"}
        n = int((members["membership_probability"] >= 0.5).sum()) if "membership_probability" in members else len(members)
        return {**base, "status": "ok", "kind": "group", "members": n, "distance_pc": d, "lo_pc": lo, "hi_pc": hi, "sigma_vt_kms": primary.get("sigma_vt_kms")}
    if mode == "extragalactic":
        if finite(primary.get("dm_cf4")):
            return {**base, "status": "ok", "kind": "cf4", "distance_pc": d, "lo_pc": lo, "hi_pc": hi}
        # z heliocentryczne z widma SDSS; odległość liczy aplikacja tak jak dla katalogu (CMB, H0 = 70, σ 300 km/s).
        import re
        z = re.search(r"z_helio=([0-9.]+)", method)
        if z:
            return {**base, "status": "ok", "kind": "sdss_z", "z_helio": float(z.group(1))}
    return {**base, "status": "abstain", "reason": f"UNSUPPORTED_MODE {mode}"}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ra", type=float, required=True)
    parser.add_argument("--dec", type=float, required=True)
    parser.add_argument("--radius", type=float, required=True)
    parser.add_argument("--type", choices=sorted(OTYPES), required=True)
    args = parser.parse_args()
    out = sys.stdout
    with contextlib.redirect_stdout(sys.stderr):
        try:
            result = run(args.ra, args.dec, args.radius, args.type)
        except Exception as error:  # noqa: BLE001 — każdy błąd programu to wynik „error” do ponowienia
            result = {"status": "error", "message": f"{type(error).__name__}: {error}"[:400]}
    out.write(json.dumps(result, default=float) + "\n")
    out.flush()


if __name__ == "__main__":
    main()
