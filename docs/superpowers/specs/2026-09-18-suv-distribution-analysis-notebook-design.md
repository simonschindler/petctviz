# SUV Distribution Analysis Notebook — Design Spec

Date: 2026-09-18
Status: ready to delegate
Owner of implementation: a separate session (this spec is self-contained)

## Purpose

Create a [marimo](https://marimo.io) notebook that independently re-derives the
SUV distribution analysis for the healthy PET/CT patch dataset, reading the
**original Excel workbooks directly** (not the app's derived binaries), and
documents every finding with LaTeX typesetting. The notebook exists to justify
and guide a follow-up change to the viewer's color mapping (SUV color window /
percentile clipping); that viewer change is **out of scope here**.

## Background

The viewer colors each patch by `suv_mean` over the global range
`[0.14951, 39.154]` taken from `manifest.json`. In practice the coloring looks
flat under both linear and logarithmic scales. A prior ad-hoc analysis (reading
the derived `public/data/*/*.bin`) found the data is heavily right-skewed:
median ≈ 3.46, ~78% of patches < 4, p99 ≈ 9.76, and a rare maximum of 39.15.
This notebook must reproduce those findings from the workbooks and quantify how
much of the colormap the bulk occupies, including test-retest, patch-size, and
clinical context.

## Goals

1. Read the four `.xlsx` workbooks and the clinical `.csv` directly and verify
   dataset/subject structure.
2. Characterize the global, per-dataset, per-organ, and per-subject SUV
   (`suv_mean`) distribution with tables and figures.
3. Quantify the color-scale problem: compute the normalized colormap position
   `t` under linear and log mappings for key percentiles, and show the width of
   the central mass band in `t`.
4. Compare scan 1 vs scan 2 (test-retest) and patch size 3 vs 5.
5. Join the clinical CSV and report relevant associations.
6. Document every finding in LaTeX (rendered math in marimo markdown cells).

## Non-goals

- No changes to the application (`src/`, `scripts/`, `index.html`, tests).
- No new build tooling, no exported report artifact, no CI changes.
- No SUV rescaling or cleaning — the notebook must analyze the values as
  provided. Any normalization is only a *display* transform (`t`).
- No viewer implementation.

## Data sources

Directory: `/Users/simon/data/joels_petct_data` (override with the
`PETCT_DATA_DIR` environment variable).

| File | Sheets | Rows/sheet (approx) |
|------|--------|---------------------|
| `Healthy_quadra_scan_1_patch_size_5.xlsx` | 47 (`HTRA1`–`HTRA47`) | ~1,880 |
| `Healthy_quadra_scan_1_patch_size_3.xlsx` | 47 (`HTRA1`–`HTRA47`) | ~10,570 |
| `Healthy_quadra_scan_2_patch_size_5.xlsx` | 46 (`HTRB1`–`HTRB47`, missing `HTRB8`) | ~1,950 |
| `Healthy_quadra_scan_2_patch_size_3.xlsx` | 46 (same missing subject) | ~10,570 |
| `Quadra_clinical_data_anonym.csv` | 94 rows (`HTRA1`–`HTRA47`, `HTRB1`–`HTRB47`), 105 columns | — |

Each sheet row is one cubic patch with columns:
`patient_id, organ, patch_center_x_mm, patch_center_y_mm, patch_center_z_mm,
patch_voxel_z, patch_voxel_y, patch_voxel_x, suv_mean, suv_min, suv_max`.

Organs present: `heart`, `liver`. Values must be read verbatim; there is no
preprocessing step in between.

## Environment & placement

- Notebook path: `notebooks/suv_analysis.py` (marimo `.py` format, created with
  `uv run marimo new notebooks/suv_analysis.py` or by hand).
- Add to `pyproject.toml` under `[dependency-groups] dev`:
  - `marimo`
  - `matplotlib`
  (`pandas`, `numpy`, `openpyxl` already exist in `[project] dependencies`.)
- Run interactively: `uv run marimo edit notebooks/suv_analysis.py`
- Headless execution check: `uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html`
  (write only to a temp path; do not commit exported output).
- Matplotlib must use the `Agg` backend so it runs headless.
- Notebook must run top-to-bottom with no errors, no network access, and no
  writes outside a temp directory.

## Statistical definitions (must be rendered in LaTeX)

Let $v$ denote `suv_mean` and let $v_{\min}, v_{\max}$ be the global extents.
Define the linear and logarithmic normalized colormap positions

$$
t_{\mathrm{lin}}(v) = \frac{v - v_{\min}}{v_{\max} - v_{\min}},
\qquad
t_{\mathrm{log}}(v) = \frac{\ln(1+v) - \ln(1+v_{\min})}{\ln(1+v_{\max}) - \ln(1+v_{\min})}.
$$

Percentiles use NumPy's default (linear interpolation). Report the interquartile
range (IQR) $[q_{25}, q_{75}]$ and the central mass band $[q_5, q_{95}]$, and
report the width of each band in $t$ units for both mappings, since the width of
the band in $t$ is exactly the fraction of the colormap it consumes.

For test-retest, use paired per-subject, per-organ medians $x_i$ (scan 1) and
$y_i$ (scan 2), report the differences $d_i = x_i - y_i$, the Pearson
correlation $r$, and a Bland–Altman plot with limits of agreement
$\bar d \pm 1.96\, s_d$.

## Notebook structure

Each numbered section is one or more marimo cells and must end with a markdown
cell containing a LaTeX-rendered "Finding" statement.

1. **Title & abstract** (markdown, LaTeX). State the question, the data, and a
   one-paragraph summary of the dynamic-range finding.
2. **Data loading & integrity.** Load all four workbooks with
   `pandas.read_excel(path, sheet_name=None, header=0)` and the CSV. Assert and
   display: dataset → number of sheets, subjects present, and missing subjects.
   Expected: scan 1 = 47 subjects, none missing; scan 2 = 46 subjects, `HTRB8`
   missing; total patches ≈ 1,327,429. Confirm columns and that `organ ∈
   {heart, liver}`.
3. **Global SUV distribution.** Percentile table (min, p0.1, p1, p5, p25, p50,
   p75, p90, p95, p99, p99.9, max) and fractions below 2, below 4, above 10.
   Figures: histogram with log-scaled y-axis and percentile markers; empirical
   CDF (ECDF) with p5/p50/p95/p99 annotated.
4. **Per-dataset distribution.** Same percentile table grouped by dataset;
   overlaid ECDFs. Note the ps3 datasets have ≈5.6× more patches than ps5.
5. **Per-organ distribution.** Heart vs liver percentile table; overlaid
   histograms (log-y) or ECDFs. Establish that liver is nearly uniform while
   heart has a heavy tail.
6. **Per-subject distribution.** For each subject and organ, compute min,
   median, p95, max. Figure: histogram/box of per-subject organ medians and of
   per-subject liver spans. Show two example subjects (e.g. `HTRA1`, `HTRA5`).
7. **Color-scale diagnosis (core section).** Compute the `t` table above.
   Figure: a PET-hot colormap strip with a histogram of `t_lin` and `t_log`
   beneath it, shading the IQR and p5–p95 bands, annotated with the band widths
   in `t`. Conclude quantitatively how small a fraction of the colormap the
   central mass occupies.
8. **Test-retest (scan 1 vs scan 2).** Pair subjects by numeric index
   (`HTRAi` ↔ `HTRBi`, skipping `HTRB8`). Per subject/organ medians: scatter
   scan1 vs scan2 with identity line; Bland–Altman with limits of agreement;
   report $r$ and $\bar d \pm 1.96 s_d$.
9. **Patch size (3 vs 5).** Compare distributions within the same scan:
   overlaid ECDFs and a spread comparison (e.g. IQR and standard deviation of
   `suv_mean`), demonstrating that larger patches average more voxels and thus
   compress the distribution.
10. **Clinical linkage.** Join the CSV on `Image_ID`. Report cohort
    composition, age/sex distributions, and organ uptake pattern columns
    (`LV_uptake_pattern`, `Non_LV_pattern`, `Liver_pattern`). Test the
    association of per-subject organ median SUV with age (scatter + Pearson
    $r$). Note explicitly which clinical columns are empty for this cohort.
11. **Conclusions.** LaTeX prose: the flat coloring is intrinsic to healthy
    organ SUV dynamic range and an outlier-driven global range; recommend a
    viewer color window with a percentile-clipped default (e.g. p1–p99),
    optionally per-organ. Reference the equations from section 7.
12. **Appendix.** The exact commands to run and re-export the notebook, and the
    `PETCT_DATA_DIR` override.

## Expected values (acceptance checks)

The notebook must reproduce the following within tolerance (percentiles ±0.02,
counts exact, `t` values ±0.005). These were derived from the source values and
must match when reading the workbooks directly.

Global (all datasets, `suv_mean`):

| v_min | p1 | p5 | p25 | p50 | p75 | p95 | p99 | p99.9 | v_max |
|-------|----|----|-----|-----|-----|-----|-----|-------|-------|
| 0.14951 | 1.361 | 2.296 | 3.024 | 3.462 | 3.932 | 4.853 | 9.762 | 19.742 | 39.154 |

Fractions: `< 2` ≈ 2.7%, `< 4` ≈ 77.82%, `> 10` ≈ 0.946%.

Per dataset (n, p50, p99, max):

| dataset | n | p50 | p99 | max |
|---------|---|-----|-----|-----|
| scan1_ps5 | 99,501 | 3.52 | 9.36 | 24.454 |
| scan1_ps3 | 562,082 | 3.47 | 9.74 | 29.202 |
| scan2_ps5 | 99,919 | 3.49 | 9.34 | 29.655 |
| scan2_ps3 | 565,927 | 3.44 | 9.95 | 39.154 |

Per organ (n, min, p50, p95, p99, max):

| organ | n | min | p50 | p95 | p99 | max |
|-------|---|-----|-----|-----|-----|-----|
| heart | 320,940 | 0.288 | 2.99 | 8.97 | 16.01 | 39.154 |
| liver | 1,006,489 | 0.150 | 3.55 | 4.56 | 4.97 | 16.912 |

Per-subject liver span (`max - min`, scan1_ps5): median 2.88, p90 4.13, max 14.58.

Colormap positions:

| percentile | v | t_lin | t_log |
|------------|-----|-------|-------|
| p1 | 1.361 | 0.0311 | 0.2026 |
| p5 | 2.296 | 0.0550 | 0.2964 |
| p25 | 3.024 | 0.0737 | 0.3526 |
| p50 | 3.462 | 0.0849 | 0.3817 |
| p75 | 3.932 | 0.0970 | 0.4099 |
| p95 | 4.853 | 0.1206 | 0.4580 |
| p99 | 9.762 | 0.2464 | 0.6294 |

Band widths in `t`: IQR — linear 0.0233, log 0.0573; p5–p95 — linear 0.0656,
log 0.1616. In other words, under a linear scale the central 90% of patches
occupy ≈6.6% of the colormap; under log, ≈16.2%.

## Documentation requirements

- Every section ends with a markdown "Finding" cell using LaTeX math where
  relevant (`$...$` inline, `$$...$$` display).
- Section 7 must include the explicit equations for `t_lin` and `t_log` and
  reference them when stating the band-width result.
- Section 8 must state the Bland–Altman limits-of-agreement formula in LaTeX.
- Section 11 must be a self-contained LaTeX-rendered conclusion a reader can
  act on without reading the code.
- All figures must have titles, axis labels, units (SUV is dimensionless;
  coordinates are mm), and a caption in the following markdown cell.

## Reproducibility & determinism

- Deterministic: no randomness; sorted iteration order; NumPy default
  percentiles; fixed figure sizes.
- No network access. Data path from `PETCT_DATA_DIR` with the default above.
- No writes to the repo; temp exports only.
- The notebook must not import from `src/` or `scripts/`; it is independent.

## Acceptance criteria (definition of done)

1. `notebooks/suv_analysis.py` exists and is a valid marimo notebook.
2. `uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html`
   completes with no errors, warnings, or tracebacks.
3. Every expected value in the acceptance table above is reproduced within
   tolerance, and the notebook displays a pass/fail assertion for each group.
4. All 12 sections are present with the required figures and LaTeX findings.
5. `pyproject.toml` gains `marimo` and `matplotlib` in the dev dependency group;
   `uv sync` succeeds.
6. No application file is modified; `git status` shows only the notebook and
   `pyproject.toml`/`uv.lock`.

## Delegation notes

- This spec is self-contained; implement it in a fresh session without needing
  the viewer code.
- Read the workbooks directly; do not read `public/data/` binaries. If a value
  differs from the expected table, investigate the reading logic before
  adjusting any expected value, and report the discrepancy rather than
  silently changing the table.
- Keep the notebook in the marimo `.py` cell format; do not convert to `.ipynb`.
- Prefer small, single-purpose cells with clear outputs.

## Out of scope / follow-up

The viewer color-mapping update (window/level controls, percentile-clipped
default, optional per-organ range, and how it interacts with the existing
log/linear scale) will be designed separately after this notebook is reviewed.
