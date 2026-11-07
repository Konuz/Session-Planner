# astro-regressor — repo guide

Astronomical distance estimation and regression from sky coordinates $(\text{RA}, \text{Dec})$, astrometry, and photometry (default sample: `IC 434`).

## Simplicity rules

Keep the codebase flat, procedural, and framework-free.

Minimize:

1. Branches. Prefer straight-line code. Push variation into data (dataclass fields, array/table ops), not control flow. Avoid config flags that spawn `if` ladders.
2. Files. Do not split one concept across many modules. A self-contained 300-line file beats five 60-line files wired together. New file only for a genuinely separate concern.
3. Methods. Do not add helpers speculatively; inline until a helper earns itself (rule of 3). Prefer fewer, cohesive procedural functions over many thin ones.

## Layout

- Flat tree, max ~2 directories deep. No deeper nesting.
- Never vendor third-party code. Depend on it via `pixi.toml`.

## Config and entrypoints

- Config: one `@dataclass Config` inside script, parsed with `tyro.cli(Config)`. No argparse, Hydra/OmegaConf, or external config files.
- Output & logging: `rich` for terminal output/tables and `loguru` for logging.
- Entrypoint: `def main()` + `if __name__ == "__main__":`. Loops stay straight-line and procedural. No Trainer class, callbacks, registries, or factories.
- Every module self-contained with `__main__` smoke-test block runnable standalone.

## Style

- Run Python and Jupyter exclusively via `pixi run`.
- Do not write comments or docstrings in code (exceptions: shebangs and required linter pragmas).
- Keep dependency list short.

## Anti-rot

- Never version same artifact in git: no `foo_v2.py` beside `foo.py`. Supersede in place; delete old version.
- Delete one-off scripts after use.
- File over ~400 LOC = smell. Justify or split it.
