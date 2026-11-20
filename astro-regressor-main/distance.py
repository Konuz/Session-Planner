import html
import json
import os
import re
import sys
import warnings
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass

import astropy.units as u
import numpy as np
import pandas as pd
import tyro
from astropy.coordinates import SkyCoord
from estimators import (
    fetch_all_catalogs,
    fit_extinction_breakpoint,
    fmt_val,
    is_extended_target,
    lookup_literature_distance,
    resolve_name,
    synthesize_target_distance,
)
from loguru import logger
from rich.columns import Columns
from rich.console import Console
from rich.panel import Panel
from rich.prompt import Prompt
from rich.table import Table
from tyro.conf import Positional

console = Console()


@dataclass
class Config:
    name: Positional[str | None] = None
    default_name: str = "IC434"
    point_radius_arcsec: float = 15.0
    region_radius_deg: float = 0.35
    max_cone_stars: int = 500
    html_report: str | None = None


def write_html_report(out_path: str, target_name: str, meta: dict, primary: dict, df: pd.DataFrame, cluster_members: pd.DataFrame, ext_break: dict | None, est_rows: list[tuple], prop_rows: list[tuple], r_on_deg: float, cone_deg: float):
    os.makedirs(os.path.dirname(os.path.abspath(out_path)) or ".", exist_ok=True)
    mem_ids = set(cluster_members["source_id"].dropna().astype(int)) if len(cluster_members) > 0 and "source_id" in cluster_members else set()
    stars = []
    for _, r in df.iterrows():
        sid = int(r["source_id"]) if pd.notna(r.get("source_id")) else 0
        d_val = float(r["r_med_photogeo"]) if pd.notna(r.get("r_med_photogeo")) else None
        g_val = float(r["phot_g_mean_mag"]) if pd.notna(r.get("phot_g_mean_mag")) else None
        stars.append({
            "id": str(sid), "ra": round(float(r["ra"]), 6), "dec": round(float(r["dec"]), 6),
            "sep": round(float(r.get("sep_arcsec", 0.0)), 1), "d": round(d_val, 1) if d_val is not None else None,
            "d_lo": round(float(r["r_lo_photogeo"]), 1) if pd.notna(r.get("r_lo_photogeo")) else None,
            "d_hi": round(float(r["r_hi_photogeo"]), 1) if pd.notna(r.get("r_hi_photogeo")) else None,
            "plx": round(float(r.get("parallax_corr", r.get("parallax", np.nan))), 3) if pd.notna(r.get("parallax")) else None,
            "plx_err": round(float(r["parallax_error"]), 3) if pd.notna(r.get("parallax_error")) else None,
            "pmra": round(float(r["pmra"]), 2) if pd.notna(r.get("pmra")) else None,
            "pmdec": round(float(r["pmdec"]), 2) if pd.notna(r.get("pmdec")) else None,
            "g": round(g_val, 2) if g_val is not None else None,
            "bprp": round(float(r["bp_rp"]), 2) if pd.notna(r.get("bp_rp")) else None,
            "mg": round(g_val - 5.0 * np.log10(d_val / 10.0), 2) if (g_val is not None and d_val is not None and d_val > 0) else None,
            "a0": round(float(r["azero_gspphot"]) if pd.notna(r.get("azero_gspphot")) else float(r.get("av_nicer", np.nan)), 2) if (pd.notna(r.get("azero_gspphot")) or pd.notna(r.get("av_nicer"))) else None,
            "teff": round(float(r["teff_gspphot"]), 0) if pd.notna(r.get("teff_gspphot")) else None,
            "member": sid in mem_ids,
        })
    clean_tag = lambda s: re.sub(r"\[/?[^\]]+\]", "", str(s))
    est_html = "".join(f"<tr><td>{html.escape(r[0])}</td><td class='num'>{html.escape(r[1])}</td><td class='num'>{html.escape(r[2])}</td><td class='num'>{html.escape(r[3])}</td><td class='num'>{html.escape(r[4])}</td><td class='dim'>{html.escape(r[5])}</td></tr>" for r in est_rows)
    prop_html = "".join(f"<tr><td>{html.escape(r[0])}</td><td>{html.escape(clean_tag(r[1]))}</td><td class='num'>{html.escape(r[2])}</td></tr>" for r in prop_rows)
    d_pc, lo_pc, hi_pc = primary.get("distance_pc", np.nan), primary.get("lo_pc", np.nan), primary.get("hi_pc", np.nan)
    d_banner = f"{d_pc:,.1f} pc <span class='ci'>(16–84% CI: {lo_pc:,.1f} – {hi_pc:,.1f} pc | {d_pc * 3.26156:,.0f} ly)</span>" if np.isfinite(d_pc) else f"ABSTAIN <span class='ci'>({html.escape(str(primary.get('abstain_reason', 'Unverified')))})</span>"
    payload = json.dumps({"target": target_name, "canonical": meta["canonical_name"], "ra": meta["ra"], "dec": meta["dec"], "r_on_deg": r_on_deg, "cone_deg": cone_deg, "d_pc": float(d_pc) if np.isfinite(d_pc) else None, "lo_pc": float(lo_pc) if np.isfinite(lo_pc) else None, "hi_pc": float(hi_pc) if np.isfinite(hi_pc) else None, "ext": ext_break, "stars": stars}).replace("</", "<\\/")
    doc = f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{html.escape(target_name)} ({html.escape(meta['canonical_name'])}) — Astro-Regressor Report</title>
<script src="https://cdn.plot.ly/plotly-2.35.2.min.js"></script>
<script src="https://aladin.cds.unistra.fr/AladinLite/api/v3/latest/aladin.js" charset="utf-8"></script>
<style>
:root {{ --bg:#0b0f19; --card:#131a2a; --border:#23304c; --text:#e2e8f0; --muted:#94a3b8; --accent:#38bdf8; --green:#4ade80; --amber:#fbbf24; }}
* {{ box-sizing:border-box; }} body {{ margin:0; padding:24px; background:var(--bg); color:var(--text); font-family:ui-sans-serif,system-ui,-apple-system,sans-serif; line-height:1.45; }}
.wrap {{ max-width:1440px; margin:0 auto; display:flex; flex-direction:column; gap:20px; }}
.hero {{ background:linear-gradient(135deg,#131a2a 0%,#0f172a 100%); border:1px solid var(--border); border-radius:12px; padding:20px 24px; display:flex; flex-wrap:wrap; justify-content:space-between; align-items:center; gap:16px; }}
.hero h1 {{ margin:0; font-size:1.55rem; color:#fff; }} .hero .sub {{ color:var(--muted); font-size:0.92rem; margin-top:4px; }}
.dist-box {{ text-align:right; }} .dist-val {{ font-size:1.65rem; font-weight:700; color:var(--green); }} .dist-val .ci {{ font-size:0.95rem; font-weight:400; color:var(--accent); }}
.grid-2 {{ display:grid; grid-template-columns:1.15fr 1fr; gap:20px; }} .grid-plots {{ display:grid; grid-template-columns:1fr 1fr; gap:20px; }}
.card {{ background:var(--card); border:1px solid var(--border); border-radius:12px; padding:16px 18px; overflow:hidden; }}
.card h2 {{ margin:0 0 12px 0; font-size:1.02rem; color:var(--accent); display:flex; justify-content:space-between; align-items:center; }}
.toolbar {{ display:flex; gap:8px; flex-wrap:wrap; }}
button.btn {{ background:#1e293b; color:var(--text); border:1px solid var(--border); border-radius:6px; padding:4px 10px; font-size:0.8rem; cursor:pointer; }}
button.btn:hover, button.btn.active {{ border-color:var(--accent); color:var(--accent); }}
#aladin-div {{ width:100%; height:440px; border-radius:8px; overflow:hidden; border:1px solid var(--border); }}
.plot-box {{ width:100%; height:350px; }}
table {{ width:100%; border-collapse:collapse; font-size:0.86rem; }}
th, td {{ padding:8px 10px; border-bottom:1px solid #1e293b; text-align:left; }}
th {{ color:var(--accent); font-weight:600; background:#0f172a; }}
td.num {{ text-align:right; font-variant-numeric:tabular-nums; font-weight:500; }} td.dim {{ color:var(--muted); font-size:0.8rem; }}
@media(max-width:1024px) {{ .grid-2, .grid-plots {{ grid-template-columns:1fr; }} .dist-box {{ text-align:left; }} }}
</style></head><body><div class="wrap">
<div class="hero">
  <div>
    <h1>{html.escape(target_name)} → {html.escape(meta['canonical_name'])} <span style="color:var(--amber);font-size:0.95rem;">[{html.escape(meta['object_type'])}]</span></h1>
    <div class="sub">ICRS J2000: RA = {meta['ra']:.5f}°, Dec = {meta['dec']:+.5f}° | Resolver: {html.escape(meta['resolver'])} | Cone r = {cone_deg:.2f}° (r<sub>on</sub> = {r_on_deg:.3f}°, N = {len(df)} Gaia DR3 stars)</div>
  </div>
  <div class="dist-box">
    <div class="dist-val">{d_banner}</div>
    <div class="sub">{html.escape(primary['method'])}</div>
  </div>
</div>
<div class="grid-2">
  <div class="card">
    <h2><span>Interactive Sky Survey Viewer (Aladin Lite v3 + Gaia DR3 Overlay)</span>
      <span class="toolbar">
        <button class="btn active" onclick="setSurvey('P/DSS2/color',this)">DSS2 Optical</button>
        <button class="btn" onclick="setSurvey('P/2MASS/color',this)">2MASS NIR</button>
        <button class="btn" onclick="setSurvey('P/allWISE/color',this)">AllWISE MIR</button>
        <button class="btn" onclick="setSurvey('P/PanSTARRS/DR1/color-z-zg-g',this)">Pan-STARRS</button>
      </span>
    </h2>
    <div id="aladin-div"></div>
  </div>
  <div class="card"><h2>Proper Motion Vector Point Diagram (μ<sub>α*</sub>, μ<sub>δ</sub>)</h2><div id="plot-pm" class="plot-box" style="height:440px;"></div></div>
</div>
<div class="grid-plots">
  <div class="card"><h2>Distance Posterior & Sightline Star Distribution</h2><div id="plot-dist" class="plot-box"></div></div>
  <div class="card"><h2>3D Dust Extinction Profile A<sub>0</sub>(d) & Breakpoint Fit</h2><div id="plot-ext" class="plot-box"></div></div>
  <div class="card"><h2>Gaia Color–Magnitude Diagram (BP−RP vs M<sub>G</sub> / G)</h2><div id="plot-cmd" class="plot-box"></div></div>
  <div class="card"><h2>Parallax vs Photogeometric Distance Diagnostic</h2><div id="plot-plx" class="plot-box"></div></div>
</div>
<div class="card"><h2>Multi-Catalog Independent Distance Estimators</h2>
  <table><thead><tr><th>Catalog / Estimator</th><th style="text-align:right">Distance [pc]</th><th style="text-align:right">16–84% CI [pc]</th><th style="text-align:right">Distance [ly]</th><th style="text-align:right">Modulus μ [mag]</th><th>Notes / Coverage</th></tr></thead><tbody>{est_html}</tbody></table>
</div>
<div class="card"><h2>Cross-Matched 14-Catalog Astrometry, Photometry & Stellar Physics</h2>
  <table><thead><tr><th>Catalog / Domain</th><th>Measured Parameters (Target / Regional Median)</th><th style="text-align:right">Cone Coverage</th></tr></thead><tbody>{prop_html}</tbody></table>
</div>
<div style="text-align:center;color:var(--muted);font-size:0.8rem;padding:4px 0;">astro-regressor · <a href="https://github.com/kacperkan" style="color:var(--accent);text-decoration:none;">Kacper Kania (@kacperkan)</a></div>
</div>
<script>
const DATA = {payload};
let aladinInstance = null;
function setSurvey(id, btn) {{
  if (aladinInstance) aladinInstance.setImageSurvey(id);
  document.querySelectorAll('.toolbar .btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
}}
window.addEventListener('DOMContentLoaded', () => {{
  if (window.A && A.init) {{
    A.init.then(() => {{
      aladinInstance = A.aladin('#aladin-div', {{ survey: 'P/DSS2/color', fov: Math.max(DATA.cone_deg * 2.4, 0.25), target: `${{DATA.ra}} ${{DATA.dec}}`, showReticle: true, showLayersControl: true, showGotoControl: true }});
      const memCat = A.catalog({{ name: 'Cluster / Selected Members', sourceSize: 11, color: '#4ade80', shape: 'circle', onClick: 'showTable' }});
      const fldCat = A.catalog({{ name: 'Field Sightline Stars', sourceSize: 7, color: '#38bdf8', shape: 'plus', onClick: 'showTable' }});
      DATA.stars.forEach(s => {{
        const src = A.source(s.ra, s.dec, {{ Gaia_ID: s.id, d_pc: s.d, G_mag: s.g, BP_RP: s.bprp, pmRA: s.pmra, pmDec: s.pmdec, A0_mag: s.a0, Member: s.member ? 'Yes' : 'No' }});
        (s.member ? memCat : fldCat).addSources([src]);
      }});
      aladinInstance.addCatalog(fldCat);
      aladinInstance.addCatalog(memCat);
      const ov = A.graphicOverlay({{ color: '#fbbf24', lineWidth: 2, name: 'Cone & Core Radii' }});
      aladinInstance.addOverlay(ov);
      ov.add(A.circle(DATA.ra, DATA.dec, DATA.r_on_deg, {{ color: '#4ade80', lineWidth: 2 }}));
      ov.add(A.circle(DATA.ra, DATA.dec, DATA.cone_deg, {{ color: '#38bdf8', lineWidth: 1 }}));
    }});
  }}
  const mem = DATA.stars.filter(s => s.member), fld = DATA.stars.filter(s => !s.member);
  const darkLayout = (xlab, ylab, extra={{}}) => Object.assign({{ paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#0b0f19', font:{{color:'#cbd5e1',size:11}}, margin:{{l:52,r:20,t:15,b:45}}, xaxis:{{title:xlab,gridcolor:'#1e293b',zerolinecolor:'#334155'}}, yaxis:{{title:ylab,gridcolor:'#1e293b',zerolinecolor:'#334155'}}, legend:{{orientation:'h',y:1.12,x:0}} }}, extra);
  Plotly.newPlot('plot-pm', [
    {{ x:fld.map(s=>s.pmra), y:fld.map(s=>s.pmdec), text:fld.map(s=>`Gaia ${{s.id}}<br>d=${{s.d}} pc`), mode:'markers', name:'Field Stars', marker:{{color:'#38bdf8',size:6,opacity:0.55}} }},
    {{ x:mem.map(s=>s.pmra), y:mem.map(s=>s.pmdec), text:mem.map(s=>`Gaia ${{s.id}}<br>d=${{s.d}} pc`), mode:'markers', name:'Members', marker:{{color:'#4ade80',size:8,line:{{color:'#0b0f19',width:1}}}} }}
  ], darkLayout('μ_α* [mas/yr]', 'μ_δ [mas/yr]'), {{responsive:true}});
  const dShapes = DATA.d_pc ? [{{type:'line',x0:DATA.d_pc,x1:DATA.d_pc,y0:0,y1:1,yref:'paper',line:{{color:'#4ade80',width:2.5,dash:'dash'}}}}] : [];
  Plotly.newPlot('plot-dist', [
    {{ x:fld.map(s=>s.d).filter(Boolean), type:'histogram', name:'Field Sightline', opacity:0.55, marker:{{color:'#38bdf8'}}, nbinsx:35 }},
    {{ x:mem.map(s=>s.d).filter(Boolean), type:'histogram', name:'Selected Members', opacity:0.85, marker:{{color:'#4ade80'}}, nbinsx:25 }}
  ], darkLayout('Photogeometric Distance r_med_photogeo [pc]', 'Star Count', {{barmode:'overlay', shapes:dShapes}}), {{responsive:true}});
  const extTraces = [
    {{ x:fld.map(s=>s.d), y:fld.map(s=>s.a0), mode:'markers', name:'Field A_0 / NICER', marker:{{color:'#38bdf8',size:6,opacity:0.55}} }},
    {{ x:mem.map(s=>s.d), y:mem.map(s=>s.a0), mode:'markers', name:'Member A_0 / NICER', marker:{{color:'#4ade80',size:8}} }}
  ];
  if (DATA.ext && DATA.ext.d_cloud_pc) {{
    const dc = DATA.ext.d_cloud_pc, afg = DATA.ext.a0_fg, abg = DATA.ext.a0_bg;
    extTraces.push({{ x:[50, dc, dc, 1800], y:[afg, afg, abg, abg], mode:'lines', name:`Step Fit (d=${{dc.toFixed(0)}} pc, ΔBIC=${{DATA.ext.delta_bic}})`, line:{{color:'#fbbf24',width:2.5}} }});
  }}
  Plotly.newPlot('plot-ext', extTraces, darkLayout('Distance [pc]', 'Extinction A_0 [mag]'), {{responsive:true}});
  Plotly.newPlot('plot-cmd', [
    {{ x:fld.map(s=>s.bprp), y:fld.map(s=>s.mg ?? s.g), mode:'markers', name:'Field', marker:{{color:'#38bdf8',size:6,opacity:0.55}} }},
    {{ x:mem.map(s=>s.bprp), y:mem.map(s=>s.mg ?? s.g), mode:'markers', name:'Members', marker:{{color:'#4ade80',size:8}} }}
  ], darkLayout('Gaia Color BP − RP [mag]', 'Absolute Magnitude M_G [mag]', {{yaxis:{{title:'Absolute Magnitude M_G [mag]',autorange:'reversed',gridcolor:'#1e293b'}}}}), {{responsive:true}});
  const gridD = Array.from({{length:100}}, (_,i)=>40 + i*20);
  Plotly.newPlot('plot-plx', [
    {{ x:fld.map(s=>s.d), y:fld.map(s=>s.plx), error_y:{{type:'data',array:fld.map(s=>s.plx_err),visible:true,color:'#1e293b'}}, mode:'markers', name:'Field ϖ_corr', marker:{{color:'#38bdf8',size:5,opacity:0.5}} }},
    {{ x:mem.map(s=>s.d), y:mem.map(s=>s.plx), error_y:{{type:'data',array:mem.map(s=>s.plx_err),visible:true,color:'#166534'}}, mode:'markers', name:'Member ϖ_corr', marker:{{color:'#4ade80',size:7}} }},
    {{ x:gridD, y:gridD.map(d=>1000/d), mode:'lines', name:'ϖ = 1000 / d', line:{{color:'#fbbf24',width:2,dash:'dot'}} }}
  ], darkLayout('Photogeometric Distance [pc]', 'Calibrated Parallax ϖ_corr [mas]'), {{responsive:true}});
}});
</script></body></html>"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(doc)


def main():
    warnings.filterwarnings("ignore")
    logger.remove()
    logger.add(sys.stderr, format="<cyan>{time:HH:mm:ss}</cyan> | <level>{level: <7}</level> | {message}", level="INFO")
    cfg = tyro.cli(Config)
    target_name = (cfg.name or "").strip() or Prompt.ask("[bold cyan]Object name[/bold cyan]", default=cfg.default_name).strip() or cfg.default_name

    logger.info(f"Resolving object '{target_name}' via MAST/SIMBAD/VizieR...")
    with console.status(f"[bold cyan]Resolving '{target_name}' via MAST / SIMBAD / VizieR...", spinner="dots"):
        meta = resolve_name(target_name)
    ra, dec, obj_type = meta["ra"], meta["dec"], meta["object_type"]
    is_extended = bool(meta.get("is_extended", is_extended_target(obj_type, target_name, meta["canonical_name"])))
    r_on_deg = float(np.clip(meta["radius_deg"], 0.015, 0.45)) if meta["radius_deg"] else cfg.region_radius_deg
    cone_deg = float(np.clip(max(r_on_deg * 2.0, 0.15), 0.15, 0.45)) if meta["radius_deg"] else cfg.region_radius_deg

    logger.info(f"Querying 14 astronomical catalogs in cone r={cone_deg:.2f}° (r_on={r_on_deg:.3f}°) around ({ra:.4f}°, {dec:.4f}°)...")
    df, tables = fetch_all_catalogs(ra, dec, cone_deg, cfg.max_cone_stars)
    for row in tables.get("query_status", pd.DataFrame()).to_dict("records"):
        if row["status"] != "ok":
            logger.warning("{}: {} {}", row["catalog"], row["status"], row["error"])

    sc = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs")
    gal, ecl = sc.galactic, sc.barycentrictrueecliptic
    hip_tbl = tables.get("hipparcos2", pd.DataFrame())
    lit_match = lookup_literature_distance(target_name, meta["canonical_name"], ra, dec, meta.get("v_lsr_kms"))
    with console.status("[bold green]Synthesizing multi-catalog distance & differential 3D dust breakpoint...", spinner="dots"), ThreadPoolExecutor(max_workers=2) as ex:
        f_prim = ex.submit(synthesize_target_distance, meta, df, tables, cone_deg, cfg.point_radius_arcsec)
        f_ext = ex.submit(fit_extinction_breakpoint, df, r_on_deg, meta.get("opacity_class"), int(meta.get("ppv_components", 1))) if len(df) > 0 else None
        primary, point_row, cluster_members = f_prim.result()
        ext_break = f_ext.result() if f_ext is not None else None

    d_pc, lo_pc, hi_pc = primary["distance_pc"], primary["lo_pc"], primary["hi_pc"]
    has_d = bool(np.isfinite(d_pc) and d_pc > 0)
    d_ly, lo_ly, hi_ly = (d_pc * 3.26156378, lo_pc * 3.26156378, hi_pc * 3.26156378) if has_d else (np.nan, np.nan, np.nan)
    dist_mod = 5.0 * np.log10(d_pc / 10.0) if has_d else np.nan
    implied_plx_mas = 1000.0 / d_pc if has_d else np.nan
    if has_d:
        gal_cart = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, distance=d_pc * u.pc, frame="icrs").galactic.cartesian
        xyz_str = f"X = {gal_cart.x.value:+.1f} pc, Y = {gal_cart.y.value:+.1f} pc, Z = {gal_cart.z.value:+.1f} pc"
    else:
        xyz_str = f"[bold yellow]ABSTAIN ({primary.get('abstain_reason', 'UNPROVEN_ASSOCIATION')})[/bold yellow]"

    prov_ver = meta.get("provenance", {}).get("version", "2026.11-DR3")
    coord_table = Table.grid(padding=(0, 2))
    coord_table.add_column(style="bold cyan", justify="right")
    coord_table.add_column()
    for lbl, val in [
        ("Input / Canonical:", f"[bold white]{target_name}[/bold white] → [bold yellow]{meta['canonical_name']}[/bold yellow]"),
        ("Object Type / Resolver:", f"[magenta]{obj_type}[/magenta] ({'Extended' if is_extended else 'Point'}, via {meta['resolver']} [{prov_ver}], r_on={r_on_deg:.3f}°, cone={cone_deg:.2f}°)"),
        ("ICRS (J2000):", f"RA = [bold]{ra:.6f}°[/bold], Dec = [bold]{dec:+.6f}°[/bold]  ({sc.to_string('hmsdms', precision=2)})"),
        ("Galactic (l, b):", f"l = [bold]{gal.l.deg:.5f}°[/bold], b = [bold]{gal.b.deg:+.5f}°[/bold]"),
        ("Ecliptic (λ, β):", f"λ = {ecl.lon.deg:.5f}°, β = {ecl.lat.deg:+.5f}°"),
        ("3D Galactic (X, Y, Z):", xyz_str),
    ]:
        coord_table.add_row(lbl, val)

    dist_table = Table.grid(padding=(0, 2))
    dist_table.add_column(style="bold green", justify="right")
    dist_table.add_column()
    dist_table.add_row("Primary Method:", f"[bold]{primary['method']}[/bold]")
    if primary["mode"] == "extragalactic":
        if primary.get("distance_kind") == "distance_modulus":
            dist_table.add_row("CF4 Primary Distance:", f"{primary['d_cf4_mpc']:.2f} Mpc (DM={primary['dm_cf4']:.3f} mag)")
        if np.isfinite(primary["d_comov_mpc"]):
            dist_table.add_row("Redshift Comoving d_C:", f"{primary['d_comov_mpc']:.2f} Mpc")
            dist_table.add_row("Redshift Luminosity d_L:", f"{primary['d_lum_mpc']:.2f} Mpc | Angular Diameter d_A = {primary['d_ang_mpc']:.2f} Mpc")
            dist_table.add_row("Lookback Time / z:", f"{primary['t_lookback_gyr']:.3f} Gyr (z = {primary['z']:.5f})")
            dist_table.add_row("Redshift Distance Modulus:", f"{5 * np.log10(primary['d_lum_mpc'] * 1e5):.3f} mag")
    elif has_d:
        dist_table.add_row("Distance (parsecs):", f"[bold bright_green]{d_pc:,.2f} pc[/bold bright_green]  (16–84% CI: [cyan]{lo_pc:,.2f} – {hi_pc:,.2f} pc[/cyan])")
        dist_table.add_row("Distance (light-years):", f"[bold bright_green]{d_ly:,.1f} ly[/bold bright_green]  (16–84% CI: [cyan]{lo_ly:,.1f} – {hi_ly:,.1f} ly[/cyan] | {d_pc / 1000.0:.4f} kpc)")
        dist_table.add_row("Distance Modulus (m-M):", f"[bold]{dist_mod:.3f} mag[/bold]  |  Implied Parallax ϖ = [bold]{implied_plx_mas:.3f} mas[/bold]")
    else:
        dist_table.add_row("Abstention Status:", f"[bold yellow]Refused 3D point estimate — {primary.get('abstain_reason', 'Requires versioned PPV mask & optical range confirmation')}[/bold yellow]")

    console.print()
    console.print(Columns([
        Panel(coord_table, title="[bold cyan]Astrophysical Target & Coordinates[/bold cyan]", border_style="cyan"),
        Panel(dist_table, title="[bold green]Distance Synthesis[/bold green]", border_style="green"),
    ], equal=True, expand=True))

    est_table = Table(title="Multi-Catalog Independent Distance Estimators", header_style="bold magenta", expand=True)
    for col_name, kw in [("Catalog / Estimator", {"style": "cyan"}), ("Distance [pc]", {"justify": "right", "style": "bold green"}), ("16–84% CI [pc]", {"justify": "right"}), ("Distance [ly]", {"justify": "right"}), ("Modulus μ [mag]", {"justify": "right"}), ("Notes / Coverage", {"style": "dim"})]:
        est_table.add_column(col_name, **kw)

    est_rows, prop_rows = [], []
    def add_est(label, d_s, ci_s, ly_s, mod_s, note_s):
        est_rows.append((label, d_s, ci_s, ly_s, mod_s, note_s))
        est_table.add_row(label, d_s, ci_s, ly_s, mod_s, note_s)

    ref_df = pd.DataFrame([point_row]) if point_row is not None else cluster_members
    if len(ref_df) > 0:
        for label, col, lo_c, hi_c, note in [
            ("Bailer-Jones Photogeometric (r_med_photogeo)", "r_med_photogeo", "r_lo_photogeo", "r_hi_photogeo", "Gaia DR3 ϖ + G + BP-RP prior"),
            ("Bailer-Jones Geometric (r_med_geo)", "r_med_geo", "r_lo_geo", "r_hi_geo", "Gaia DR3 ϖ + 3D Galactic prior"),
            ("StarHorse Bayesian Spectrophotometric (sh_dist_pc)", "sh_dist_pc", "sh_lo_pc", "sh_hi_pc", "Anders+2022 PARSEC isochrone + multi-band SED"),
            ("Gaia DR3 GSP-Phot Isochrone (distance_gspphot)", "distance_gspphot", "distance_gspphot_lower", "distance_gspphot_upper", "BP/RP spectra + isochrone fit"),
            ("Gaia DR3 MSC Multiple-Star (distance_msc)", "distance_msc", "distance_msc_lower", "distance_msc_upper", "Unresolved binary model"),
        ]:
            valid = ref_df[col].dropna() if col in ref_df else pd.Series(dtype=float)
            if len(valid) > 0:
                val = float(valid.median())
                lo_v = float(ref_df[lo_c].dropna().median()) if lo_c in ref_df and len(ref_df[lo_c].dropna()) > 0 else np.nan
                hi_v = float(ref_df[hi_c].dropna().median()) if hi_c in ref_df and len(ref_df[hi_c].dropna()) > 0 else np.nan
                add_est(label, f"{val:,.1f}", f"{lo_v:,.1f} – {hi_v:,.1f}" if not np.isnan(lo_v) else "—", f"{val * 3.26156:,.0f}", f"{5 * np.log10(val / 10.0):.2f}", f"{note} (n={len(valid)})")

        plx_col = "parallax_corr" if "parallax_corr" in ref_df else "parallax"
        plx_valid = ref_df[ref_df[plx_col] > 0.1]
        if len(plx_valid) > 0:
            plx_med, plx_err = float(plx_valid[plx_col].median()), float(plx_valid["parallax_error"].median())
            d_inv, d_inv_lo, d_inv_hi = 1000.0 / plx_med, 1000.0 / (plx_med + plx_err), 1000.0 / max(0.05, plx_med - plx_err)
            add_est("Gaia DR3 Parallax (ZP only where supported)", f"{d_inv:,.1f}", f"{d_inv_lo:,.1f} – {d_inv_hi:,.1f}", f"{d_inv * 3.26156:,.0f}", f"{5 * np.log10(d_inv / 10.0):.2f}", f"ϖ = {plx_med:.3f} ± {plx_err:.3f} mas; published ZP applied to {int(ref_df.get('zp_applied', pd.Series(False, index=ref_df.index)).sum())}/{len(ref_df)} rows")

    if ext_break is not None and is_extended:
        dc = ext_break["d_cloud_pc"]
        opt_tag = "opt_ok=True" if ext_break["optical_range_confirmed"] else "opt_ok=False"
        add_est("3D Dust Extinction Breakpoint (On/Off ΔA_0 + NICER)", f"{dc:,.1f}", f"{dc * 0.92:,.1f} – {dc * 1.08:,.1f}", f"{dc * 3.26156:,.0f}", f"{5 * np.log10(dc / 10.0):.2f}", f"ΔA_0=+{ext_break['delta_a0']:.2f} mag, ΔBIC={ext_break['delta_bic']:.1f}, fg/bg={ext_break['n_fg_on']}/{ext_break['n_bg_on']}, {opt_tag}")

    if lit_match is not None:
        dl, l_lo, l_hi = lit_match["distance_pc"], lit_match["lo_pc"], lit_match["hi_pc"]
        add_est("Curated Cloud / PPV / Maser Registry", f"{dl:,.1f}", f"{l_lo:,.1f} – {l_hi:,.1f}", f"{dl * 3.26156:,.0f}", f"{5 * np.log10(dl / 10.0):.2f}", f"{lit_match['citation']}, mask={lit_match['mask_id']}")

    if len(hip_tbl) > 0:
        hip_pos = hip_tbl[hip_tbl["hip_plx"] > 0.1]
        if len(hip_pos) > 0:
            h0 = hip_pos.iloc[0]
            d_hip, d_hip_lo, d_hip_hi = 1000.0 / float(h0["hip_plx"]), 1000.0 / (float(h0["hip_plx"]) + float(h0["hip_e_plx"])), 1000.0 / max(0.05, float(h0["hip_plx"]) - float(h0["hip_e_plx"]))
            add_est(f"Hipparcos-2 Cone Reference (HIP {int(h0['hip'])}, sep={h0['sep_arcsec']:.1f}'')", f"{d_hip:,.1f}", f"{d_hip_lo:,.1f} – {d_hip_hi:,.1f}", f"{d_hip * 3.26156:,.0f}", f"{5 * np.log10(d_hip / 10.0):.2f}", f"ϖ_Hip = {h0['hip_plx']:.2f} ± {h0['hip_e_plx']:.2f} mas, Hp={h0['hp_mag']:.2f}")

    if primary["mode"] == "extragalactic" and np.isfinite(primary.get("d_cf4_mpc", np.nan)):
        d_cf4_pc, dm_v = primary["d_cf4_mpc"] * 1e6, primary.get("dm_cf4", np.nan)
        ci_cf4 = f"{primary['lo_pc']:,.0f} – {primary['hi_pc']:,.0f}" if np.isfinite(primary.get("lo_pc", np.nan)) and np.isfinite(primary.get("hi_pc", np.nan)) else "—"
        mod_cf4 = f"{dm_v:.2f}" if np.isfinite(dm_v) else f"{5 * np.log10(d_cf4_pc / 10.0):.2f}"
        note_cf4 = f"d_CF4={primary['d_cf4_mpc']:.2f} Mpc" + (f", DM={dm_v:.3f} mag" if np.isfinite(dm_v) else "")
        add_est("Cosmicflows-4 Distance Modulus (J/ApJ/944/94)", f"{d_cf4_pc:,.0f}", ci_cf4, f"{d_cf4_pc * 3.26156:,.0f}", mod_cf4, note_cf4)

    if primary["mode"] == "extragalactic" and np.isfinite(primary["d_comov_mpc"]):
        add_est("SDSS Spectroscopic Cosmological (Planck18 CMB)", f"{primary['d_comov_mpc'] * 1e6:,.0f}", f"{primary['lo_pc']:,.0f} – {primary['hi_pc']:,.0f}" if primary.get("distance_kind") != "distance_modulus" else "—", f"{primary['d_comov_mpc'] * 3.26156e6:,.0f}", f"{5 * np.log10(primary['d_lum_mpc'] * 1e5):.2f}", f"d_C={primary['d_comov_mpc']:.2f} Mpc, d_L={primary['d_lum_mpc']:.2f} Mpc")

    console.print(est_table)

    if len(ref_df) > 0:
        prop_table = Table(title="Cross-Matched 14-Catalog Astrometry, Photometry & Stellar Physics", header_style="bold cyan", expand=True)
        prop_table.add_column("Catalog / Domain", style="bold yellow")
        prop_table.add_column("Measured Parameters (Target / Regional Median)", style="white")
        prop_table.add_column("Cone Coverage", justify="right", style="cyan")

        med = lambda col: float(ref_df[col].dropna().median()) if col in ref_df and len(ref_df[col].dropna()) > 0 else np.nan
        def cov(cols):
            if len(df) == 0:
                return "0/0"
            n_ok = int((~df[[c for c in cols if c in df]].isna().all(axis=1)).sum())
            return f"{n_ok}/{len(df)} ({n_ok / len(df) * 100:.0f}%)"

        pmra_v, pmdec_v = med("pmra"), med("pmdec")
        pm_tot_v = float(np.hypot(pmra_v, pmdec_v)) if not np.isnan(pmra_v) else np.nan
        v_tan = 4.74047 * pm_tot_v * (d_pc / 1000.0) if (not np.isnan(pm_tot_v) and has_d) else np.nan
        g_mag = med("phot_g_mean_mag")
        abs_g = g_mag - dist_mod if (not np.isnan(g_mag) and has_d) else np.nan

        for cat_lbl, summary_txt, cov_cols in [
            ("1. Gaia DR3 Kinematics", f"μ_α* = {fmt_val(pmra_v, '+.2f', ' mas/yr')}, μ_δ = {fmt_val(pmdec_v, '+.2f', ' mas/yr')}, |μ| = {fmt_val(pm_tot_v, '.2f', ' mas/yr')}, v_tan = {fmt_val(v_tan, '.1f', ' km/s')}, v_rad = {fmt_val(med('radial_velocity'), '+.1f', ' km/s')}, RUWE = {fmt_val(med('ruwe'), '.2f')}", ["pmra", "pmdec"]),
            ("2. Gaia DR3 Optical", f"G = {fmt_val(g_mag, '.2f', ' mag')}, BP = {fmt_val(med('phot_bp_mean_mag'), '.2f', ' mag')}, RP = {fmt_val(med('phot_rp_mean_mag'), '.2f', ' mag')}, BP-RP = {fmt_val(med('bp_rp'), '.2f', ' mag')}, M_G = {fmt_val(abs_g, '+.2f', ' mag')}", ["phot_g_mean_mag", "bp_rp"]),
            ("3. Gaia DR3 GSP-Phot + NICER", f"T_eff = {fmt_val(med('teff_gspphot'), '.0f', ' K')}, log g = {fmt_val(med('logg_gspphot'), '.2f', ' dex')}, [M/H] = {fmt_val(med('mh_gspphot'), '+.2f', ' dex')}, A_0 = {fmt_val(med('azero_gspphot'), '.2f', ' mag')}, A_V(NICER) = {fmt_val(med('av_nicer'), '.2f', ' mag')}", ["teff_gspphot", "azero_gspphot"]),
            ("4. Gaia DR3 FLAME", f"L = {fmt_val(med('lum_flame'), '.2f', ' L☉')}, R = {fmt_val(med('radius_flame'), '.2f', ' R☉')} (R_GSP = {fmt_val(med('radius_gspphot'), '.2f', ' R☉')}), M = {fmt_val(med('mass_flame'), '.2f', ' M☉')}, Age = {fmt_val(med('age_flame'), '.2f', ' Gyr')}", ["lum_flame", "mass_flame"]),
            ("5. Gaia XP Synthetic", f"B_JKC = {fmt_val(med('b_jkc_mag'), '.2f')}, V_JKC = {fmt_val(med('v_jkc_mag'), '.2f')}, I_JKC = {fmt_val(med('i_jkc_mag'), '.2f')} | g_SDSS = {fmt_val(med('g_sdss_mag'), '.2f')}, r_SDSS = {fmt_val(med('r_sdss_mag'), '.2f')}, i_SDSS = {fmt_val(med('i_sdss_mag'), '.2f')}", ["v_jkc_mag", "r_sdss_mag"]),
            ("6. 2MASS Near-IR", f"J = {fmt_val(med('j_m'), '.2f', ' mag')}, H = {fmt_val(med('h_m'), '.2f', ' mag')}, Ks = {fmt_val(med('k_m'), '.2f', ' mag')}, J-Ks = {fmt_val(med('j_m') - med('k_m'), '.2f', ' mag')}", ["j_m", "h_m", "k_m"]),
            ("7. AllWISE & CatWISE2020", f"W1 = {fmt_val(med('w1mpro'), '.2f')}, W2 = {fmt_val(med('w2mpro'), '.2f')}, W3 = {fmt_val(med('w3mpro'), '.2f')}, W4 = {fmt_val(med('w4mpro'), '.2f')} | W1_PM = {fmt_val(med('w1mpro_pm'), '.2f')}, μ_IR = ({fmt_val(med('cw_pmra'), '+.1f')}, {fmt_val(med('cw_pmdec'), '+.1f')}) mas/yr", ["w1mpro", "w1mpro_pm"]),
            ("8. APASS DR9 Optical", f"V = {fmt_val(med('apass_vmag'), '.2f')}, B = {fmt_val(med('apass_bmag'), '.2f')}, B-V = {fmt_val(med('apass_b_v'), '.2f')}, g' = {fmt_val(med('apass_g_mag'), '.2f')}, r' = {fmt_val(med('apass_r_mag'), '.2f')}, i' = {fmt_val(med('apass_i_mag'), '.2f')}", ["apass_vmag", "apass_r_mag"]),
            ("9. SDSS DR13 & LAMOST DR9", f"u = {fmt_val(med('sdss_u'), '.2f')}, g = {fmt_val(med('sdss_g'), '.2f')}, r = {fmt_val(med('sdss_r'), '.2f')}, i = {fmt_val(med('sdss_i'), '.2f')}, z = {fmt_val(med('sdss_z'), '.2f')} | LAMOST z_spec = {fmt_val(med('lamost_z'), '+.5f')}, r_PS1 = {fmt_val(med('mag_ps_r'), '.2f')}", ["sdss_r", "lamost_z", "mag_ps_r"]),
            ("10. Tycho-2 & Hipparcos-2", f"B_T = {fmt_val(med('bt_mag'), '.2f')}, V_T = {fmt_val(med('vt_mag'), '.2f')}, H_p = {fmt_val(med('hp_mag'), '.2f')}, (B-V)_Hip = {fmt_val(med('hip_bv'), '.2f')}", ["vt_mag", "hp_mag"]),
        ]:
            prop_rows.append((cat_lbl, summary_txt, cov(cov_cols)))
            prop_table.add_row(cat_lbl, summary_txt, cov(cov_cols))
        console.print(prop_table)

    if len(df) > 0:
        near_table = Table(title=f"Nearest / Brightest Cross-Matched Gaia DR3 + Bailer-Jones Sources around {target_name}", header_style="bold blue", expand=True)
        for col_name, kw in [("Gaia source_id", {"style": "cyan"}), ("Sep ['']", {"justify": "right"}), ("G [mag]", {"justify": "right"}), ("BP-RP", {"justify": "right"}), ("Ks (2MASS)", {"justify": "right"}), ("ϖ_corr [mas]", {"justify": "right"}), ("μ (RA, Dec) [mas/yr]", {"justify": "right"}), ("T_eff [K]", {"justify": "right"}), ("r_med_photogeo [pc] (16–84%)", {"justify": "right", "style": "bold green"})]:
            near_table.add_column(col_name, **kw)

        for _, r in df.head(8).iterrows():
            near_table.add_row(
                str(int(r["source_id"])), f"{r['sep_arcsec']:.1f}", fmt_val(r["phot_g_mean_mag"], ".2f"),
                fmt_val(r["bp_rp"], ".2f"), fmt_val(r.get("k_m", np.nan), ".2f"),
                f"{r.get('parallax_corr', r['parallax']):.2f} ± {r['parallax_error']:.2f}",
                f"{fmt_val(r['pmra'], '+.1f')}, {fmt_val(r['pmdec'], '+.1f')}",
                fmt_val(r["teff_gspphot"], ".0f"), f"{r['r_med_photogeo']:.1f} ({r['r_lo_photogeo']:.1f}–{r['r_hi_photogeo']:.1f})",
            )
        console.print(near_table)

    slug = re.sub(r"[^a-z0-9]+", "_", target_name.lower()).strip("_") or "target"
    report_path = cfg.html_report if cfg.html_report is not None else os.path.join("reports", f"{slug}.html")
    if report_path.strip():
        write_html_report(report_path, target_name, meta, primary, df, cluster_members, ext_break, est_rows, prop_rows, r_on_deg, cone_deg)
        logger.info(f"Interactive HTML report (Aladin Lite v3 sky viewer + Plotly diagnostics) saved to '{report_path}'")


if __name__ == "__main__":
    main()
