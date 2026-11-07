"""Odległość wycinka zdjęcia z astro-regressor: pozycja i promień wycinka zamiast nazwy (bez resolvera MAST i bez
rejestru CURATED_CLOUDS). Wynik to jeden obiekt JSON na stdout; wszystko inne idzie na stderr.

Uruchamianie (serwer, server/regressor.ts):
  pixi run --manifest-path astro-regressor-main/pixi.toml python scripts/regressor/cut_distance.py --ra 85.38 --dec -2.30 --radius 0.05 --type EN

status: ok (wartość), abstain (model odmówił; wynik trwały) albo error (awaria usługi lub programu; do ponowienia).
"""
import argparse, contextlib, json, math, os, sys

ROOT = os.environ.get("REGRESSOR_DIR") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "astro-regressor-main")
sys.path.insert(0, os.path.abspath(ROOT))

# Typ aplikacji → typ obiektu regresora. Mgławice ciemne, planetarne, pozostałości po supernowych i „inne” pomijamy:
# populacja gwiazd w stożku nic o nich nie mówi, a skok ekstynkcji ma w regresorze stałą niepewność ±7 %.
OTYPES = {"EN": "HII", "RN": "RNe", "CN": "Cl*", "OC": "OpC", "GC": "Cl*", "G": "G", "GG": "GrG"}
NEBULAE = {"EN", "RN", "CN"}


def finite(x):
    return x is not None and isinstance(x, (int, float)) and math.isfinite(x)


def run(ra, dec, radius, app_type):
    from catalogs import fetch_all_catalogs
    from estimators import synthesize_target_distance

    galaxy = app_type in ("G", "GG")
    r_on = min(max(radius, 0.015), 0.45)
    cone = min(max(r_on * 2.0, 0.15), 0.45)
    name = f"POS {ra:.5f} {dec:+.5f}"
    meta = {"ra": ra, "dec": dec, "object_type": OTYPES[app_type], "canonical_name": name, "input_name": name, "is_extended": not galaxy,
            "radius_deg": r_on, "opacity_class": None, "v_lsr_kms": None, "ppv_components": 1}
    df, tables = fetch_all_catalogs(ra, dec, cone, 500, show_progress=False)
    status = {row["catalog"]: row for row in tables.get("query_status").to_dict("records")} if "query_status" in tables else {}
    # Awaria usługi to nie odmowa modelu: pusty stożek z błędem zapytania nie może trafić do pamięci jako wynik.
    needed = ("sdss_spec", "cosmicflows4") if galaxy else ("base",)
    failed = [k for k in needed if status.get(k, {}).get("status") == "error"]
    if failed:
        return {"status": "error", "message": "; ".join(f"{k}: {status[k]['error'][:160]}" for k in failed)}
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
