use anyhow::{Context, Result, ensure};
use serde_json::{Value, json};
use skyshot::{Engine, Wcs, solve::SolveConfig};
use std::{env, fs, path::Path};

fn separation(a: [f64; 2], b: [f64; 2]) -> f64 {
    let da = (a[1] - b[1]).to_radians() / 2.0;
    let dr = (a[0] - b[0]).to_radians() / 2.0;
    2.0 * (da.sin().powi(2) + a[1].to_radians().cos() * b[1].to_radians().cos() * dr.sin().powi(2)).clamp(0.0, 1.0).sqrt().asin()
}

/// Środek kadru i promień okręgu opisanego na jego narożnikach (radiany).
fn field(wcs: &Wcs, width: f64, height: f64) -> ([f64; 2], f64) {
    let center = wcs.pixel_to_sky(width / 2.0, height / 2.0);
    let radius = [[0.0, 0.0], [width, 0.0], [width, height], [0.0, height]].iter()
        .map(|p| separation(center, wcs.pixel_to_sky(p[0], p[1]))).fold(0.0_f64, f64::max);
    (center, radius)
}

/// Rzut gwiazd przez zapisany WCS: plik `{wcs, width, height, stars: [[ra, dec], ...]}`.
/// Te same `sky_to_pixel` i promień pola co dla wycinków w `solve`.
fn project(request: &Path) -> Result<()> {
    let body: Value = serde_json::from_slice(&fs::read(request)?)?;
    let wcs: Wcs = serde_json::from_value(body["wcs"].clone()).context("Niepoprawny WCS")?;
    let width = body["width"].as_f64().context("Brak szerokości")?;
    let height = body["height"].as_f64().context("Brak wysokości")?;
    let (center, radius) = field(&wcs, width, height);
    let empty = vec![];
    let pixels: Vec<Value> = body["stars"].as_array().unwrap_or(&empty).iter().map(|star| {
        let (Some(ra), Some(dec)) = (star[0].as_f64(), star[1].as_f64()) else { return Value::Null };
        // Nie ekstrapolujemy wielomianu SIP daleko poza pole pomiaru.
        if separation(center, [ra, dec]) > radius * 1.05 { return Value::Null; }
        match wcs.sky_to_pixel(ra, dec) {
            Some([x, y]) if x.is_finite() && y.is_finite() => json!([x, y]),
            _ => Value::Null,
        }
    }).collect();
    println!("{}", json!({"raDeg": center[0], "decDeg": center[1], "radiusDeg": radius.to_degrees(), "pixels": pixels}));
    Ok(())
}

fn run() -> Result<()> {
    let args: Vec<String> = env::args().collect();
    ensure!(args.len() >= 3, "preview image output | solve image index catalog [matches] | project request");
    if args[1] == "project" { return project(Path::new(&args[2])); }
    ensure!(args.len() >= 4, "preview image output | solve image index catalog [matches] | project request");
    if args[1] == "preview" {
        fs::write(&args[3], skyshot::image_io::load(Path::new(&args[2]))?.preview()?)?;
        return Ok(());
    }
    ensure!((args.len() == 5 || args.len() == 6) && args[1] == "solve", "solve image index catalog [matches]");
    let cfg = SolveConfig { deadline_ms: 20_000.0, keep_matches: true, min_margin_nats: 5.0, ..Default::default() };
    let output = Engine::open(&args[3])?.solve_path(&args[2], &cfg)?;
    let solution = &output.solution;
    ensure!(solution.status == "solved", "Nie udało się jednoznacznie rozwiązać zdjęcia: {}", solution.status);
    let wcs = solution.wcs.as_ref().context("Brak rozwiązania WCS")?;
    let catalog: Value = serde_json::from_slice(&fs::read(&args[4])?)?;
    let rows = catalog["rows"].as_array().context("Niepoprawny katalog")?;
    let width = solution.width as f64;
    let height = solution.height as f64;
    let (center, field_radius) = field(wcs, width, height);
    let mut objects = vec![];
    for row in rows {
        let kind = row[4].as_str().unwrap_or("");
        if !["G", "GG", "EN", "RN", "DN", "PN", "SNR", "OC", "GC", "CN"].contains(&kind) { continue; }
        let (Some(ra), Some(dec)) = (row[5].as_f64(), row[6].as_f64()) else { continue; };
        let angular_radius = (row[7].as_f64().unwrap_or(0.0) / 120.0).to_radians();
        // Nie ekstrapolujemy wielomianu SIP daleko poza pole pomiaru.
        if separation(center, [ra, dec]) > field_radius + angular_radius { continue; }
        let Some([x, y]) = wcs.sky_to_pixel(ra, dec) else { continue; };
        let mut radius = 10.0_f64;
        for i in 0..16 {
            let bearing = i as f64 * std::f64::consts::TAU / 16.0;
            let d = dec.to_radians();
            let next_d = (d.sin() * angular_radius.cos() + d.cos() * angular_radius.sin() * bearing.cos()).clamp(-1.0, 1.0).asin();
            let next_r = ra + (bearing.sin() * angular_radius.sin() * d.cos()).atan2(angular_radius.cos() - d.sin() * next_d.sin()).to_degrees();
            if let Some([px, py]) = wcs.sky_to_pixel(next_r, next_d.to_degrees()) {
                radius = radius.max((px - x).hypot(py - y));
            }
        }
        radius = radius.min(width.max(height) * 2.0);
        let dx = x - x.clamp(0.0, width);
        let dy = y - y.clamp(0.0, height);
        if x.is_finite() && y.is_finite() && dx.hypot(dy) <= radius {
            objects.push(json!({"id": row[0], "x": x, "y": y, "radius": radius}));
        }
    }
    // Diagnostyka (tylko narzędzia weryfikacji): wykryte gwiazdy z pozycjami katalogu D80.
    if let Some(path) = args.get(5) {
        let matches: Vec<_> = solution.matches.iter().map(|m| json!([m.x, m.y, m.ra, m.dec, m.residual_px])).collect();
        fs::write(path, serde_json::to_vec(&matches)?)?;
    }
    let edge: Vec<_> = solution.matches.iter().filter(|m| m.x < width * 0.2 || m.x > width * 0.8 || m.y < height * 0.2 || m.y > height * 0.8).collect();
    let edge_rms = if edge.is_empty() { None } else { Some((edge.iter().map(|m| m.residual_px.powi(2)).sum::<f64>() / edge.len() as f64).sqrt()) };
    println!("{}", json!({"width": solution.width, "height": solution.height, "raDeg": solution.ra, "decDeg": solution.dec,
        "rmsPx": solution.rms_px, "matches": solution.n_matches, "edgeMatches": edge.len(), "edgeRmsPx": edge_rms,
        "totalMs": output.timings.total_ms, "wcs": wcs, "objects": objects}));
    Ok(())
}

fn main() {
    if let Err(error) = run() { eprintln!("{error:#}"); std::process::exit(1); }
}
