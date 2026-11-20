"""Odległość wycinka zdjęcia z astro-regressor: pozycja i promień wycinka zamiast nazwy (bez resolvera MAST i bez
rejestru CURATED_CLOUDS). Wynik to jeden obiekt JSON na stdout; wszystko inne idzie na stderr.

Uruchamianie jednego wycinka (ręcznie):
  pixi run --manifest-path astro-regressor-main/pixi.toml python scripts/regressor/cut_distance.py --ra 85.38 --dec -2.30 --radius 0.05 --type EN
Stały proces dla serwera (server/regressor.ts): ten sam wrapper z jedynym argumentem --serve (opis w serve()).

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
VIZIER_TAP = "https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync"
VIZIER_MIRRORS = ("https://vizier.cds.unistra.fr/viz-bin/asu-tsv", "https://vizier.cfa.harvard.edu/viz-bin/asu-tsv",
                  "https://vizier.idia.ac.za/viz-bin/asu-tsv")
CF4_COLUMNS = ("PGC", "ra", "dec", "v_cmb_kms", "dm_cf4", "e_dm")


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
    if stars is not None:
        return apply_gaia_calibration(stars)
    raise RuntimeError(f"Gaia chwilowo niedostępna ({', '.join(codes)})")


def fetch_sdss_spectra(ra, dec, cone):
    import astropy.units as u
    import pandas as pd
    from astropy.coordinates import SkyCoord
    from astroquery.sdss import SDSS

    table = SDSS.query_region(SkyCoord(ra=ra * u.deg, dec=dec * u.deg), radius=min(cone * 60.0, 2.9) * u.arcmin,
                              specobj_fields=["ra", "dec", "z", "zErr", "class"])
    return table.to_pandas() if table is not None else pd.DataFrame()


def fetch_cf4(ra, dec, cone):
    """Cosmicflows-4 w stożku: TAP VizieR, a gdy zawiedzie, lustra asu-tsv (jak q_vizier w catalogs.py)."""
    import pandas as pd
    import requests

    query = (f"SELECT TOP 50 PGC, RAJ2000 AS ra, DEJ2000 AS dec, DM AS dm_cf4, e_DM AS e_dm, Vcmb AS v_cmb_kms "
             f"FROM \"J/ApJ/944/94/table2\" WHERE 1=CONTAINS(POINT('ICRS', RAJ2000, DEJ2000), CIRCLE('ICRS', {ra}, {dec}, {cone}))")
    try:
        response = requests.post(VIZIER_TAP, data={"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "csv", "QUERY": query}, timeout=6)
        response.raise_for_status()
        if not response.text.lstrip().startswith("<"):
            table = pd.read_csv(StringIO(response.text))
            if {"ra", "dec", "dm_cf4", "e_dm"}.issubset(table.columns):
                return table
    except (requests.RequestException, ValueError):
        pass
    error = None
    for mirror in VIZIER_MIRRORS:
        try:
            response = requests.get(mirror, params={"-source": "J/ApJ/944/94/table2", "-c": f"{ra} {dec}", "-c.rd": f"{cone}",
                                                    "-out": "PGC,RAJ2000,DEJ2000,Vcmb,DM,e_DM", "-out.max": "50"}, timeout=8)
            response.raise_for_status()
            lines = [line for line in response.text.splitlines() if line.strip() and not line.startswith("#")]
            if len(lines) < 4:
                # Pusty stożek: VizieR podaje opis tabeli bez wierszy. Krótka odpowiedź bez opisu to awaria lustra; jako
                # pusta tabela stałaby się trwałą odmową w pamięci podręcznej serwera.
                if "#Name: J/ApJ/944/94/table2" not in response.text:
                    raise ValueError("Niepełna odpowiedź VizieR")
                return pd.DataFrame(columns=CF4_COLUMNS)
            rows = [line for line in lines[3:] if not set(line.strip()) <= {"-", "\t", " "}]
            raw = pd.read_csv(StringIO("\n".join([lines[0], *rows])), sep="\t", skipinitialspace=True)
            number = lambda column: pd.to_numeric(raw[column], errors="coerce")
            return pd.DataFrame({"PGC": number("PGC"), "ra": number("RAJ2000"), "dec": number("DEJ2000"), "v_cmb_kms": number("Vcmb"),
                                 "dm_cf4": number("DM"), "e_dm": number("e_DM")}).dropna(subset=["ra", "dec", "dm_cf4"])
        except (requests.RequestException, ValueError, KeyError) as mirror_error:
            error = mirror_error
    raise error


def fetch_galaxy_tables(ra, dec, cone):
    """Tylko tabele, z których regresor liczy odległość galaktyki: widma SDSS i Cosmicflows-4, równolegle. Pełne
    fetch_all_catalogs pytało jeszcze o 12 katalogów gwiazd i fotometrii (pomiar 2026-11-14: 200–400 s zamiast 8–11 s),
    a synthesize_target_distance dla galaktyk ich nie czyta. Zwraca tabele i listę awarii („katalog: błąd”)."""
    from concurrent.futures import ThreadPoolExecutor

    with ThreadPoolExecutor(max_workers=2) as pool:
        futures = {"sdss_spec": pool.submit(fetch_sdss_spectra, ra, dec, cone), "cosmicflows4": pool.submit(fetch_cf4, ra, dec, cone)}
    failed = [f"{key}: {str(future.exception())[:160]}" for key, future in futures.items() if future.exception() is not None]
    return {key: future.result() for key, future in futures.items() if future.exception() is None}, failed


def finite(x):
    return x is not None and isinstance(x, (int, float)) and math.isfinite(x)


def clean_num(x):
    return float(x) if finite(x) else None


def angular_sep_deg(ra1, dec1, ra2, dec2):
    import numpy as np

    r = math.pi / 180.0
    da = (ra2 - ra1) * r
    dd = (dec2 - dec1) * r
    s = np.sin(dd / 2.0) ** 2 + math.cos(dec1 * r) * np.cos(dec2 * r) * np.sin(da / 2.0) ** 2
    return 2.0 * np.arcsin(np.minimum(1.0, np.sqrt(np.maximum(0.0, s)))) / r


def group_extragalactic_fallback(tables, ra, dec, r_on):
    import numpy as np
    import pandas as pd

    group_deg = min(max(r_on, 0.05), 0.25)
    cf4 = tables.get("cosmicflows4")
    if cf4 is not None and len(cf4) > 0 and {"ra", "dec", "dm_cf4"}.issubset(cf4.columns):
        rows = cf4.assign(
            ra=pd.to_numeric(cf4["ra"], errors="coerce"),
            dec=pd.to_numeric(cf4["dec"], errors="coerce"),
            dm_cf4=pd.to_numeric(cf4["dm_cf4"], errors="coerce"),
            e_dm=pd.to_numeric(cf4["e_dm"], errors="coerce") if "e_dm" in cf4 else np.nan,
        ).dropna(subset=["ra", "dec", "dm_cf4"])
        if len(rows) > 0:
            sep = angular_sep_deg(ra, dec, rows["ra"].to_numpy(dtype=float), rows["dec"].to_numpy(dtype=float))
            matched = rows[sep <= group_deg]
            if len(matched) > 0:
                dms = matched["dm_cf4"].to_numpy(dtype=float)
                med = float(np.median(dms))
                if len(dms) >= 3:
                    keep = np.abs(dms - med) <= 1.0
                    if keep.sum() >= 2:
                        matched = matched[keep]
                        dms = matched["dm_cf4"].to_numpy(dtype=float)
                        med = float(np.median(dms))
                d_pc = (10.0 ** ((med - 25.0) / 5.0)) * 1e6
                errs = matched["e_dm"].to_numpy(dtype=float)
                valid_errs = errs[np.isfinite(errs) & (errs > 0)]
                if len(dms) >= 2:
                    lo_dm = min(float(np.percentile(dms, 16)), med)
                    hi_dm = max(float(np.percentile(dms, 84)), med)
                    if len(valid_errs) > 0:
                        e_med = float(np.median(valid_errs)) / math.sqrt(len(valid_errs))
                        lo_dm = min(lo_dm, med - e_med)
                        hi_dm = max(hi_dm, med + e_med)
                    lo_pc = (10.0 ** ((lo_dm - 25.0) / 5.0)) * 1e6
                    hi_pc = (10.0 ** ((hi_dm - 25.0) / 5.0)) * 1e6
                elif len(valid_errs) > 0:
                    e = float(valid_errs[0])
                    lo_pc = (10.0 ** ((med - e - 25.0) / 5.0)) * 1e6
                    hi_pc = (10.0 ** ((med + e - 25.0) / 5.0)) * 1e6
                else:
                    lo_pc, hi_pc = None, None
                return {"status": "ok", "kind": "cf4", "members": int(len(matched)), "distance_pc": clean_num(d_pc), "lo_pc": clean_num(lo_pc), "hi_pc": clean_num(hi_pc)}
    sdss = tables.get("sdss_spec")
    if sdss is not None and len(sdss) > 0 and {"ra", "dec", "z", "zErr"}.issubset(sdss.columns):
        rows = sdss.assign(
            ra=pd.to_numeric(sdss["ra"], errors="coerce"),
            dec=pd.to_numeric(sdss["dec"], errors="coerce"),
            z=pd.to_numeric(sdss["z"], errors="coerce"),
            zErr=pd.to_numeric(sdss["zErr"], errors="coerce"),
        ).dropna(subset=["ra", "dec", "z", "zErr"])
        if len(rows) > 0:
            sep = angular_sep_deg(ra, dec, rows["ra"].to_numpy(dtype=float), rows["dec"].to_numpy(dtype=float))
            valid = rows[(sep <= group_deg) & (rows["z"] > 0.0005) & (rows["zErr"] >= 0)]
            if len(valid) > 0:
                return {"status": "ok", "kind": "sdss_z", "z_helio": float(np.median(valid["z"].to_numpy(dtype=float)))}
    return None


def run(ra, dec, radius, app_type):
    from estimators import synthesize_target_distance

    galaxy = app_type in ("G", "GG")
    r_on = min(max(radius, 0.015), 0.45)
    cone = min(max(r_on * 2.0, 0.15), 0.45)
    name = f"POS {ra:.5f} {dec:+.5f}"
    meta = {"ra": ra, "dec": dec, "object_type": OTYPES[app_type], "canonical_name": name, "input_name": name, "is_extended": not galaxy,
            "radius_deg": r_on, "opacity_class": None, "v_lsr_kms": None, "ppv_components": 1}
    if galaxy:
        import pandas as pd

        tables, failed = fetch_galaxy_tables(ra, dec, cone)
        if failed:
            return {"status": "error", "message": "; ".join(failed)}
        df = pd.DataFrame()
    else:
        df, tables = fetch_stellar_cone(ra, dec, cone), {}
        if app_type == "GC" and len(df) > 0 and "parallax" in df.columns:
            df = df[df["parallax"] < 0.8]
    point_radius_arcsec = min(max(r_on * 3600.0, 90.0), 900.0) if app_type == "GG" else 15.0
    primary, _, members = synthesize_target_distance(meta, df, tables, cone, point_radius_arcsec=point_radius_arcsec, use_registry=False, prefer_nearest=app_type in NEBULAE)
    mode, method = primary.get("mode"), str(primary.get("method", ""))
    d, lo, hi = clean_num(primary.get("distance_pc")), clean_num(primary.get("lo_pc")), clean_num(primary.get("hi_pc"))
    base = {"cone_deg": round(cone, 3), "stars": int(len(df)), "regressor_method": method}
    if app_type == "GG" and (mode == "abstain" or (tables.get("cosmicflows4") is not None and len(tables["cosmicflows4"]) > 1)):
        gg = group_extragalactic_fallback(tables, ra, dec, r_on)
        if gg is not None:
            return {**base, **gg}
    if mode == "abstain" or d is None or d <= 0:
        return {**base, "status": "abstain", "reason": primary.get("abstain_reason") or method}
    if mode == "region_kde":
        if method.startswith("Gaia DR3 Fallback Median"):
            return {**base, "status": "abstain", "reason": "TOO_FEW_STARS"}
        n = int((members["membership_probability"] >= 0.5).sum()) if "membership_probability" in members else len(members)
        svt = clean_num(primary.get("sigma_vt_kms"))
        if app_type == "GC" and (d < 1800.0 or n < 20 or svt is None or svt > 45.0 or lo is None or hi is None or (hi - lo) / (2.0 * d) > 0.25):
            return {**base, "status": "abstain", "reason": "GC_BEYOND_GAIA_CONE"}
        return {**base, "status": "ok", "kind": "group", "members": n, "distance_pc": d, "lo_pc": lo, "hi_pc": hi, "sigma_vt_kms": svt}
    if mode == "extragalactic":
        if finite(primary.get("dm_cf4")):
            return {**base, "status": "ok", "kind": "cf4", "distance_pc": d, "lo_pc": lo, "hi_pc": hi}
        # z heliocentryczne z widma SDSS; odległość liczy aplikacja tak jak dla katalogu (CMB, H0 = 70, σ 300 km/s).
        import re
        z = re.search(r"z_helio=([0-9.]+)", method)
        if z:
            return {**base, "status": "ok", "kind": "sdss_z", "z_helio": float(z.group(1))}
    return {**base, "status": "abstain", "reason": f"UNSUPPORTED_MODE {mode}"}


def safe_run(ra, dec, radius, app_type):
    try:
        return run(ra, dec, radius, app_type)
    except Exception as error:  # noqa: BLE001 — każdy błąd programu to wynik „error” do ponowienia
        return {"status": "error", "message": f"{type(error).__name__}: {error}"[:400]}


def send(out, message):
    out.write(json.dumps(message, default=float, allow_nan=False) + "\n")
    out.flush()


def serve():
    """Stały proces: importy raz, potem zadania po jednym. Wiersz stdin {"id", "ra", "dec", "radius", "type"} daje wiersz
    stdout {"id", "result"}; pierwszy wiersz {"ready": true} pada po importach, więc ich czas (na HDD pod obciążeniem do
    kilku minut) nie wlicza się do limitu zadania. Koniec stdin kończy proces. Deskryptor 1 idzie na stderr, żeby nic
    (także z bibliotek C) nie mieszało się z odpowiedziami."""
    out = os.fdopen(os.dup(1), "w", encoding="utf-8", newline="\n")
    os.dup2(2, 1)
    sys.stdout = sys.stderr
    import catalogs, estimators  # noqa: F401 — ciężkie importy przed pierwszym zadaniem

    send(out, {"ready": True})
    for line in sys.stdin:
        if line.strip():
            job = json.loads(line)
            send(out, {"id": job["id"], "result": safe_run(job["ra"], job["dec"], job["radius"], job["type"])})


def main():
    if sys.argv[1:] == ["--serve"]:
        return serve()
    parser = argparse.ArgumentParser()
    parser.add_argument("--ra", type=float, required=True)
    parser.add_argument("--dec", type=float, required=True)
    parser.add_argument("--radius", type=float, required=True)
    parser.add_argument("--type", choices=sorted(OTYPES), required=True)
    args = parser.parse_args()
    out = sys.stdout
    with contextlib.redirect_stdout(sys.stderr):
        result = safe_run(args.ra, args.dec, args.radius, args.type)
    send(out, result)


if __name__ == "__main__":
    main()
