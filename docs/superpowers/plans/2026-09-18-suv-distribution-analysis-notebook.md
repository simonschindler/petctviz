# SUV Distribution Analysis Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a self-contained marimo notebook that re-derives the healthy PET/CT SUV distribution analysis directly from the four source `.xlsx` workbooks and the clinical CSV, proving that the viewer's flat coloring comes from the data's dynamic range.

**Architecture:** A single marimo `.py` notebook (`notebooks/suv_analysis.py`) with small, single-purpose cells. One loading cell reads all four workbooks into a concatenated pandas DataFrame (`patches`); every later section consumes `patches` and renders a table/figure plus a LaTeX "Finding" markdown cell. A final acceptance cell asserts every expected value from the spec and renders a pass/fail table.

**Tech Stack:** Python 3.11+ via `uv`; marimo 0.24.x; pandas, numpy, openpyxl (already present); matplotlib with the `Agg` backend.

**Spec:** `docs/superpowers/specs/2026-09-18-suv-distribution-analysis-notebook-design.md`

## Global Constraints

- Notebook path is exactly `notebooks/suv_analysis.py`, marimo `.py` format. Do not convert to `.ipynb`.
- Data directory defaults to `/Users/simon/data/joels_petct_data`, overridable with `PETCT_DATA_DIR`.
- The notebook must not import from `src/` or `scripts/`; it reads the workbooks directly, never `public/data/*.bin`.
- No network access, no writes outside a temp directory. Matplotlib must use the `Agg` backend.
- No SUV rescaling or cleaning: values are analyzed verbatim. Normalization is only the display transform `t`.
- Dataset ids are exactly: `scan1_ps5`, `scan1_ps3`, `scan2_ps5`, `scan2_ps3`.
- Organs are exactly `heart`, `liver`.
- Percentiles use NumPy defaults; iteration order is sorted; no randomness; fixed figure sizes.
- No application file may be modified. `git status` at the end shows only `notebooks/suv_analysis.py`, `pyproject.toml`, and `uv.lock`.
- Do not add code comments unless a step explicitly includes them.

## Notebook construction convention

Tasks 2–11 append cells to the existing notebook. In every such task, insert the new
cells **immediately before** this final block, keeping the block last:

```python
if __name__ == "__main__":
    app.run()
```

Every cell must list, as function parameters, exactly the variables it consumes from
earlier cells, and must return (or render as its last expression) what later cells need.
Markdown findings render by ending the cell body with `mo.md(...)`. Figures render by
ending the cell body with the figure variable.

**Unique names (important).** marimo raises `MultipleDefinitionError` when the same name
is assigned in two different cells, even if it is only a loop or temporary local.
Prefix every non-returned local variable with `_` (marimo treats underscore-prefixed
names as cell-local); keep only the variables other cells consume unprefixed. The code
below already follows this convention — do not drop the underscores.

The verification command for every task is the headless export:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

**Expected:** exit code 0 and no output containing `Error`, `failed to execute`, or
`Traceback`. The export reads ~1.3M rows and may take a few minutes.

---

### Task 1: Dev dependencies and notebook scaffold with data loading (Sections 1–2)

**Files:**
- Modify: `pyproject.toml`
- Create: `notebooks/suv_analysis.py`
- Modify (generated): `uv.lock`

**Interfaces:**
- Consumes: nothing.
- Produces (notebook cells):
  - imports cell exports `Path`, `mo`, `natural_key`, `np`, `os`, `pd`, `plt`
  - config cell exports `DATA_DIR`, `DATASETS`, `EXPECTED_SUBJECTS`
  - load cell exports `missing_subjects`, `patches`, `sheet_counts`
  - integrity cell exports `columns_ok`, `organs_ok`, `total`

- [ ] **Step 1: Add marimo and matplotlib to the dev dependency group**

Run:

```bash
uv add --dev marimo matplotlib
```

Expected: `pyproject.toml` gains `marimo` and `matplotlib` in `[dependency-groups] dev`, and `uv.lock` is updated.

- [ ] **Step 2: Verify the tools import**

Run:

```bash
uv run python -c "import marimo, matplotlib; matplotlib.use('Agg'); print('ok')"
```

Expected: prints `ok`.

- [ ] **Step 3: Create `notebooks/suv_analysis.py` with the scaffold, title, loading, and integrity cells**

```python
import marimo

__generated_with = "0.24.2"
app = marimo.App(width="medium")


@app.cell
def _imports():
    import os
    import re as _re
    from pathlib import Path

    import marimo as mo
    import matplotlib as _matplotlib

    _matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    import numpy as np
    import pandas as pd

    def natural_key(value):
        return [int(part) if part.isdigit() else part for part in _re.split(r"(\d+)", str(value))]

    return Path, mo, natural_key, np, os, pd, plt


@app.cell
def _title(mo):
    mo.md(r"""
    # SUV Distribution Analysis of Healthy PET/CT Patches

    **Question.** The viewer colors every patch by `suv_mean` over the global
    range $[v_{\min}, v_{\max}] = [0.14951, 39.154]$, and the result looks flat.
    Is the flatness intrinsic to the healthy organ SUV distribution?

    **Data.** Four Excel workbooks (scan 1/2 × patch size 3/5) of cubic organ
    patches plus a clinical CSV, read directly from `PETCT_DATA_DIR`.

    **Summary.** `suv_mean` is strongly right-skewed. The median is about 3.46
    and roughly 78% of patches fall below 4, while the maximum is 39.15. Under a
    linear colormap the central 90% of patches occupy only about 6.6% of the
    color range; under the logarithmic mapping about 16.2%. The flat appearance
    is a property of the data and the outlier-driven global range, not of the
    viewer's rendering.
    """)
    return


@app.cell
def _config(Path, os):
    DATA_DIR = Path(os.environ.get("PETCT_DATA_DIR", "/Users/simon/data/joels_petct_data"))
    DATASETS = {
        "scan1_ps5": {
            "file": "Healthy_quadra_scan_1_patch_size_5.xlsx",
            "scan": 1,
            "patch_size": 5,
            "prefix": "HTRA",
        },
        "scan1_ps3": {
            "file": "Healthy_quadra_scan_1_patch_size_3.xlsx",
            "scan": 1,
            "patch_size": 3,
            "prefix": "HTRA",
        },
        "scan2_ps5": {
            "file": "Healthy_quadra_scan_2_patch_size_5.xlsx",
            "scan": 2,
            "patch_size": 5,
            "prefix": "HTRB",
        },
        "scan2_ps3": {
            "file": "Healthy_quadra_scan_2_patch_size_3.xlsx",
            "scan": 2,
            "patch_size": 3,
            "prefix": "HTRB",
        },
    }
    EXPECTED_SUBJECTS = 47
    return DATA_DIR, DATASETS, EXPECTED_SUBJECTS


@app.cell
def _load(DATA_DIR, DATASETS, EXPECTED_SUBJECTS, natural_key, pd):
    _frames = []
    sheet_counts = {}
    missing_subjects = {}
    for _dataset_id, _meta in DATASETS.items():
        _sheets = pd.read_excel(DATA_DIR / _meta["file"], sheet_name=None, header=0)
        _present = sorted(
            (_subject for _subject, _sheet in _sheets.items() if not _sheet.empty),
            key=natural_key,
        )
        sheet_counts[_dataset_id] = len(_present)
        _expected = [f"{_meta['prefix']}{i}" for i in range(1, EXPECTED_SUBJECTS + 1)]
        missing_subjects[_dataset_id] = [_subject for _subject in _expected if _subject not in _present]
        for _subject in _present:
            _frame = _sheets[_subject].copy()
            _frame["dataset"] = _dataset_id
            _frame["scan"] = _meta["scan"]
            _frame["patch_size"] = _meta["patch_size"]
            _frame["subject"] = _subject
            _frames.append(_frame)
    patches = pd.concat(_frames, ignore_index=True)
    return missing_subjects, patches, sheet_counts


@app.cell
def _integrity(DATASETS, mo, missing_subjects, patches, pd, sheet_counts):
    _expected_columns = [
        "patient_id",
        "organ",
        "patch_center_x_mm",
        "patch_center_y_mm",
        "patch_center_z_mm",
        "patch_voxel_z",
        "patch_voxel_y",
        "patch_voxel_x",
        "suv_mean",
        "suv_min",
        "suv_max",
    ]
    columns_ok = list(patches.columns[:11]) == _expected_columns
    organs_ok = set(patches["organ"].unique()) == {"heart", "liver"}
    _rows = []
    for _dataset_id in DATASETS:
        _rows.append(
            {
                "dataset": _dataset_id,
                "sheets": sheet_counts[_dataset_id],
                "missing": ", ".join(missing_subjects[_dataset_id]) or "none",
                "patches": int((patches["dataset"] == _dataset_id).sum()),
            }
        )
    _summary = pd.DataFrame(_rows)
    total = int(len(patches))
    mo.vstack(
        [
            mo.md(
                f"Columns as specified: **{columns_ok}** · "
                f"Organs: **{sorted(patches['organ'].unique())}** "
                f"(expected heart/liver: **{organs_ok}**) · "
                f"Total patches: **{total:,}**"
            ),
            _summary,
        ]
    )
    return columns_ok, organs_ok, total


@app.cell
def _finding_integrity(mo, missing_subjects, sheet_counts, total):
    mo.md(
        f"**Finding (data integrity).** Scan 1 has 47 subjects and no missing "
        f"sheets in both patch sizes; scan 2 has 46 subjects with `HTRB8` absent "
        f"in both patch sizes (missing: `{missing_subjects['scan2_ps5']}`). The "
        f"workbooks contribute **{total:,}** patches in total. All columns match "
        f"the specification and `organ` takes only the values heart and liver."
    )
    return


if __name__ == "__main__":
    app.run()
```

- [ ] **Step 4: Run the headless export to verify the notebook executes**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no `Error` / `failed to execute` / `Traceback`. Open the HTML and confirm the summary table lists `scan1_ps5` 99,501; `scan1_ps3` 562,082; `scan2_ps5` 99,919; `scan2_ps3` 565,927, and total 1,327,429.

- [ ] **Step 5: Commit**

```bash
git add pyproject.toml uv.lock notebooks/suv_analysis.py
git commit -m "feat: add SUV analysis notebook scaffold and data loading"
```

---

### Task 2: Global SUV distribution (Section 3)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches` from Task 1.
- Produces: `PCTS`, `frac_gt10`, `frac_lt2`, `frac_lt4`, `global_pct`, `v_all`.

- [ ] **Step 1: Append the global stats cell before the main guard**

```python
@app.cell
def _global_stats(np, patches):
    v_all = patches["suv_mean"].to_numpy(dtype=float)
    PCTS = [0, 0.1, 1, 5, 25, 50, 75, 90, 95, 99, 99.9, 100]
    global_pct = np.percentile(v_all, PCTS)
    frac_lt2 = float(np.mean(v_all < 2))
    frac_lt4 = float(np.mean(v_all < 4))
    frac_gt10 = float(np.mean(v_all > 10))
    return PCTS, frac_gt10, frac_lt2, frac_lt4, global_pct, v_all
```

- [ ] **Step 2: Append the percentile and fraction table cell**

```python
@app.cell
def _global_table(PCTS, frac_gt10, frac_lt2, frac_lt4, global_pct, mo, pd):
    _percentile_table = pd.DataFrame({"percentile": PCTS, "suv_mean": global_pct})
    _fraction_table = pd.DataFrame(
        {
            "criterion": ["suv_mean < 2", "suv_mean < 4", "suv_mean > 10"],
            "fraction": [frac_lt2, frac_lt4, frac_gt10],
            "percent": [100 * frac_lt2, 100 * frac_lt4, 100 * frac_gt10],
        }
    )
    mo.vstack([mo.md("### Global percentiles"), _percentile_table, mo.md("### Tail fractions"), _fraction_table])
    return
```

- [ ] **Step 3: Append the histogram + ECDF figure cell**

```python
@app.cell
def _(global_pct, np, plt, v_all):
    fig_global, _axes_global = plt.subplots(1, 2, figsize=(13, 4.5))

    _axes_global[0].hist(v_all, bins=np.linspace(0, 40, 201), color="#2c7fb8")
    _axes_global[0].set_yscale("log")
    _axes_global[0].set_title("Global SUV distribution")
    _axes_global[0].set_xlabel("SUV (dimensionless)")
    _axes_global[0].set_ylabel("patch count (log scale)")
    for _value, _label in [
        (global_pct[2], "p1"),
        (global_pct[3], "p5"),
        (global_pct[5], "p50"),
        (global_pct[8], "p95"),
        (global_pct[9], "p99"),
    ]:
        _axes_global[0].axvline(_value, color="crimson", ls="--", lw=1)
        _axes_global[0].text(_value, _axes_global[0].get_ylim()[1], _label, rotation=90, va="top", fontsize=8)

    _sorted_v = np.sort(v_all)
    _ecdf = np.arange(1, len(_sorted_v) + 1) / len(_sorted_v)
    _axes_global[1].plot(_sorted_v, _ecdf, color="#2c7fb8")
    _axes_global[1].set_xscale("log")
    _axes_global[1].set_title("Empirical CDF")
    _axes_global[1].set_xlabel("SUV (log scale, dimensionless)")
    _axes_global[1].set_ylabel("fraction of patches")
    for _value, _label in [
        (global_pct[3], "p5"),
        (global_pct[5], "p50"),
        (global_pct[8], "p95"),
        (global_pct[9], "p99"),
    ]:
        _axes_global[1].axvline(_value, color="crimson", ls="--", lw=1)
        _axes_global[1].text(_value, 0.02, _label, fontsize=8)

    fig_global.tight_layout()
    fig_global
    return (fig_global,)
```

- [ ] **Step 4: Append the finding cell**

```python
@app.cell
def _finding_global(frac_gt10, frac_lt2, frac_lt4, global_pct, mo):
    mo.md(
        f"**Finding (global distribution).** The global `suv_mean` distribution is "
        f"strongly right-skewed: median $v_{{50}}$ = **{global_pct[5]:.3f}**, "
        f"$v_{{95}}$ = **{global_pct[8]:.3f}**, $v_{{99}}$ = **{global_pct[9]:.3f}**, "
        f"$v_{{\\max}}$ = **{global_pct[11]:.3f}**. Only "
        f"**{100 * frac_lt2:.2f}%** of patches have $v < 2$, "
        f"**{100 * frac_lt4:.2f}%** have $v < 4$, and "
        f"**{100 * frac_gt10:.3f}%** have $v > 10$. The bulk sits in a narrow band "
        f"near the median while a rare tail extends to {global_pct[11]:.2f}."
    )
    return
```

- [ ] **Step 5: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. The percentile table shows p50 ≈ 3.462, p99 ≈ 9.762, max 39.154; fractions ≈ 2.70%, 77.82%, 0.946%.

- [ ] **Step 6: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add global SUV distribution section"
```

---

### Task 3: Per-dataset distribution (Section 4)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches`.
- Produces: `dataset_table` with columns `dataset`, `n`, `p50`, `p99`, `max`.

- [ ] **Step 1: Append the per-dataset table cell**

```python
@app.cell
def _per_dataset(np, patches, pd):
    _rows = []
    for _dataset_id in sorted(patches["dataset"].unique()):
        _values = patches.loc[patches["dataset"] == _dataset_id, "suv_mean"].to_numpy(dtype=float)
        _rows.append(
            {
                "dataset": _dataset_id,
                "n": len(_values),
                "p50": float(np.percentile(_values, 50)),
                "p99": float(np.percentile(_values, 99)),
                "max": float(_values.max()),
            }
        )
    dataset_table = pd.DataFrame(_rows)
    dataset_table
    return (dataset_table,)
```

- [ ] **Step 2: Append the overlaid ECDF figure cell**

```python
@app.cell
def _(np, patches, plt):
    fig_dataset, _ax_dataset = plt.subplots(figsize=(7.5, 4.5))
    for _dataset_id in sorted(patches["dataset"].unique()):
        _values = np.sort(patches.loc[patches["dataset"] == _dataset_id, "suv_mean"].to_numpy(dtype=float))
        _ecdf = np.arange(1, len(_values) + 1) / len(_values)
        _ax_dataset.plot(_values, _ecdf, lw=1.2, label=_dataset_id)
    _ax_dataset.set_xscale("log")
    _ax_dataset.set_title("ECDF of SUV by dataset")
    _ax_dataset.set_xlabel("SUV (log scale, dimensionless)")
    _ax_dataset.set_ylabel("fraction of patches")
    _ax_dataset.legend(title="dataset")
    fig_dataset.tight_layout()
    fig_dataset
    return (fig_dataset,)
```

- [ ] **Step 3: Append the finding cell**

```python
@app.cell
def _(dataset_table, mo):
    _counts = dict(zip(dataset_table["dataset"], dataset_table["n"]))
    _ratio = _counts["scan1_ps3"] / _counts["scan1_ps5"]
    mo.md(
        f"**Finding (per dataset).** The four datasets have nearly identical "
        f"distributions ($\\mathrm{{p}}_{{50}} \\approx 3.5$, "
        f"$\\mathrm{{p}}_{{99}} \\approx 9.3$–$10.0$). The patch-size-3 datasets "
        f"contain about **{_ratio:.1f}×** more patches than the patch-size-5 "
        f"datasets because a smaller cube fits more positions. The largest single "
        f"value (**{dataset_table['max'].max():.3f}**) occurs in scan 2, patch size 3."
    )
    return
```

- [ ] **Step 4: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. Table shows the four datasets with the counts from Task 1; the ratio text reads ≈5.6×.

- [ ] **Step 5: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add per-dataset SUV distribution section"
```

---

### Task 4: Per-organ distribution (Section 5)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches`.
- Produces: `organ_table` with columns `organ`, `n`, `min`, `p50`, `p95`, `p99`, `max`.

- [ ] **Step 1: Append the per-organ table cell**

```python
@app.cell
def _per_organ(np, patches, pd):
    _rows = []
    for _organ in sorted(patches["organ"].unique()):
        _values = patches.loc[patches["organ"] == _organ, "suv_mean"].to_numpy(dtype=float)
        _rows.append(
            {
                "organ": _organ,
                "n": len(_values),
                "min": float(_values.min()),
                "p50": float(np.percentile(_values, 50)),
                "p95": float(np.percentile(_values, 95)),
                "p99": float(np.percentile(_values, 99)),
                "max": float(_values.max()),
            }
        )
    organ_table = pd.DataFrame(_rows)
    organ_table
    return (organ_table,)
```

- [ ] **Step 2: Append the overlaid histogram figure cell**

```python
@app.cell
def _(np, patches, plt):
    fig_organ, _ax_organ = plt.subplots(figsize=(8, 4.5))
    _bins_organ = np.linspace(0, 20, 201)
    for _organ in sorted(patches["organ"].unique()):
        _values = patches.loc[patches["organ"] == _organ, "suv_mean"].to_numpy(dtype=float)
        _ax_organ.hist(_values, bins=_bins_organ, histtype="step", lw=1.5, label=_organ)
    _ax_organ.set_yscale("log")
    _ax_organ.set_title("SUV distribution by organ")
    _ax_organ.set_xlabel("SUV (dimensionless)")
    _ax_organ.set_ylabel("patch count (log scale)")
    _ax_organ.legend(title="organ")
    fig_organ.tight_layout()
    fig_organ
    return (fig_organ,)
```

- [ ] **Step 3: Append the finding cell**

```python
@app.cell
def _(mo, organ_table):
    _table = organ_table.set_index("organ")
    _heart = _table.loc["heart"]
    _liver = _table.loc["liver"]
    mo.md(
        f"**Finding (per organ).** Liver SUV is tightly concentrated and nearly "
        f"uniform: $\\mathrm{{p}}_{{50}}$ = **{_liver['p50']:.2f}**, "
        f"$\\mathrm{{p}}_{{95}}$ = **{_liver['p95']:.2f}**, "
        f"$\\mathrm{{p}}_{{99}}$ = **{_liver['p99']:.2f}** (max {_liver['max']:.2f}). "
        f"Heart SUV has a much heavier right tail: $\\mathrm{{p}}_{{50}}$ = "
        f"**{_heart['p50']:.2f}**, $\\mathrm{{p}}_{{95}}$ = **{_heart['p95']:.2f}**, "
        f"$\\mathrm{{p}}_{{99}}$ = **{_heart['p99']:.2f}**, max = "
        f"**{_heart['max']:.2f}**. The global range is driven by the heart tail, "
        f"while the liver occupies only the bottom few SUV units."
    )
    return
```

- [ ] **Step 4: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. Table shows heart n=320,940, p50≈2.99, p95≈8.97, p99≈16.01, max 39.154; liver n=1,006,489, p50≈3.55, p95≈4.56, p99≈4.97, max≈16.912.

- [ ] **Step 5: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add per-organ SUV distribution section"
```

---

### Task 5: Per-subject distribution (Section 6)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches`.
- Produces: `scan1` (scan 1, patch 5 subset) and `subject_table` with columns `subject`, `organ`, `n`, `min`, `median`, `p95`, `max`, `span`.

- [ ] **Step 1: Append the per-subject table cell**

```python
@app.cell
def _per_subject(np, patches, pd):
    scan1 = patches[patches["dataset"] == "scan1_ps5"]
    _rows = []
    for (_subject, _organ), _group in scan1.groupby(["subject", "organ"], sort=True):
        _values = _group["suv_mean"].to_numpy(dtype=float)
        _rows.append(
            {
                "subject": _subject,
                "organ": _organ,
                "n": len(_values),
                "min": float(_values.min()),
                "median": float(np.median(_values)),
                "p95": float(np.percentile(_values, 95)),
                "max": float(_values.max()),
            }
        )
    subject_table = pd.DataFrame(_rows)
    subject_table["span"] = subject_table["max"] - subject_table["min"]
    subject_table
    return scan1, subject_table
```

- [ ] **Step 2: Append the per-subject figure cell**

```python
@app.cell
def _(np, plt, scan1, subject_table):
    fig_subject, _axes_subject = plt.subplots(1, 3, figsize=(15, 4.5))

    _liver_medians = subject_table.loc[subject_table["organ"] == "liver", "median"]
    _axes_subject[0].hist(_liver_medians, bins=15, color="#2c7fb8")
    _axes_subject[0].set_title("Per-subject liver median SUV")
    _axes_subject[0].set_xlabel("median SUV (dimensionless)")
    _axes_subject[0].set_ylabel("subject count")

    _liver_spans = subject_table.loc[subject_table["organ"] == "liver", "span"]
    _axes_subject[1].hist(_liver_spans, bins=15, color="#d95f02")
    _axes_subject[1].set_title("Per-subject liver span (max - min)")
    _axes_subject[1].set_xlabel("span (SUV units)")
    _axes_subject[1].set_ylabel("subject count")

    for _subject, _color in [("HTRA1", "#1b9e77"), ("HTRA5", "#7570b3")]:
        _values = scan1.loc[scan1["subject"] == _subject, "suv_mean"].to_numpy(dtype=float)
        _axes_subject[2].hist(_values, bins=np.linspace(0, 20, 201), histtype="step", lw=1.5, label=_subject, color=_color)
    _axes_subject[2].set_yscale("log")
    _axes_subject[2].set_title("Example subjects (all organs)")
    _axes_subject[2].set_xlabel("SUV (dimensionless)")
    _axes_subject[2].set_ylabel("patch count (log scale)")
    _axes_subject[2].legend(title="subject")

    fig_subject.tight_layout()
    fig_subject
    return (fig_subject,)
```

- [ ] **Step 3: Append the finding cell**

```python
@app.cell
def _(mo, np, subject_table):
    _liver_span = subject_table.loc[subject_table["organ"] == "liver", "span"].to_numpy(dtype=float)
    mo.md(
        f"**Finding (per subject).** Even within one subject and organ the SUV "
        f"varies: the per-subject liver span ($\\max - \\min$, scan 1, patch 5) has "
        f"median **{np.median(_liver_span):.2f}**, p90 "
        f"**{np.percentile(_liver_span, 90):.2f}**, and maximum "
        f"**{_liver_span.max():.2f}** SUV units. Per-subject medians are stable "
        f"across subjects, so the global spread is not driven by "
        f"subject-to-subject baseline shifts."
    )
    return
```

- [ ] **Step 4: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. The finding reports liver span median ≈2.88, p90 ≈4.13, max ≈14.58.

- [ ] **Step 5: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add per-subject SUV distribution section"
```

---

### Task 6: Color-scale diagnosis (Section 7)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches`.
- Produces: `VMIN`, `VMAX`, `band_iqr_lin`, `band_iqr_log`, `band_90_lin`, `band_90_log`, `t_table` with columns `percentile`, `v`, `t_lin`, `t_log`.

- [ ] **Step 1: Append the `t` table cell**

```python
@app.cell
def _colorscale(np, patches, pd):
    VMIN = float(patches["suv_mean"].min())
    VMAX = float(patches["suv_mean"].max())

    _percentiles = [1, 5, 25, 50, 75, 95, 99]
    _q = np.percentile(patches["suv_mean"], _percentiles)
    _t_lin = (_q - VMIN) / (VMAX - VMIN)
    _t_log = (np.log1p(_q) - np.log1p(VMIN)) / (np.log1p(VMAX) - np.log1p(VMIN))
    t_table = pd.DataFrame(
        {"percentile": _percentiles, "v": _q, "t_lin": _t_lin, "t_log": _t_log}
    )

    _q25, _q75 = np.percentile(patches["suv_mean"], [25, 75])
    _p5, _p95 = np.percentile(patches["suv_mean"], [5, 95])
    band_iqr_lin = float((_q75 - _q25) / (VMAX - VMIN))
    band_iqr_log = float((np.log1p(_q75) - np.log1p(_q25)) / (np.log1p(VMAX) - np.log1p(VMIN)))
    band_90_lin = float((_p95 - _p5) / (VMAX - VMIN))
    band_90_log = float((np.log1p(_p95) - np.log1p(_p5)) / (np.log1p(VMAX) - np.log1p(VMIN)))
    return VMAX, VMIN, band_90_lin, band_90_log, band_iqr_lin, band_iqr_log, t_table
```

- [ ] **Step 2: Append the equations markdown cell**

```python
@app.cell
def _colorscale_equations(mo):
    mo.md(r"""
    ### Normalized colormap position

    Let $v$ denote `suv_mean` and let $v_{\min}, v_{\max}$ be the global extents.
    The linear and logarithmic normalized colormap positions are

    $$t_{\mathrm{lin}}(v) = \frac{v - v_{\min}}{v_{\max} - v_{\min}},
    \qquad
    t_{\mathrm{log}}(v) = \frac{\ln(1+v) - \ln(1+v_{\min})}{\ln(1+v_{\max}) - \ln(1+v_{\min})}.$$

    The width of a percentile band measured in $t$ is exactly the fraction of the
    colormap that band consumes.
    """)
    return
```

- [ ] **Step 3: Append the `t` table display cell**

```python
@app.cell
def _(mo, t_table):
    mo.vstack([mo.md("### Colormap position by percentile"), t_table])
    return
```

- [ ] **Step 4: Append the colormap strip + histogram figure cell**

```python
@app.cell
def _(VMAX, VMIN, np, patches, plt, t_table):
    _values = patches["suv_mean"].to_numpy(dtype=float)
    _t_lin_all = (_values - VMIN) / (VMAX - VMIN)
    _t_log_all = (np.log1p(_values) - np.log1p(VMIN)) / (np.log1p(VMAX) - np.log1p(VMIN))
    _tt = t_table.set_index("percentile")

    fig_colormap = plt.figure(figsize=(12, 7))
    _grid = fig_colormap.add_gridspec(3, 1, height_ratios=[0.6, 2.2, 2.2], hspace=0.6)

    _ax_strip = fig_colormap.add_subplot(_grid[0])
    _ax_strip.imshow(np.linspace(0, 1, 512).reshape(1, -1), aspect="auto", cmap="hot")
    _ax_strip.set_yticks([])
    _ax_strip.set_xlabel("colormap position t")
    _ax_strip.set_title("PET-hot colormap")

    _ax_lin = fig_colormap.add_subplot(_grid[1])
    _ax_lin.hist(_t_lin_all, bins=np.linspace(0, 1, 201), color="#2c7fb8")
    _ax_lin.axvspan(_tt.loc[25, "t_lin"], _tt.loc[75, "t_lin"], color="orange", alpha=0.35, label="IQR")
    _ax_lin.axvspan(_tt.loc[5, "t_lin"], _tt.loc[95, "t_lin"], color="red", alpha=0.15, label="p5–p95")
    _ax_lin.set_title(
        f"Linear mapping: IQR width {_tt.loc[75, 't_lin'] - _tt.loc[25, 't_lin']:.4f}, "
        f"p5–p95 width {_tt.loc[95, 't_lin'] - _tt.loc[5, 't_lin']:.4f}"
    )
    _ax_lin.set_xlabel("t_lin")
    _ax_lin.set_ylabel("patch count")
    _ax_lin.legend()

    _ax_log = fig_colormap.add_subplot(_grid[2])
    _ax_log.hist(_t_log_all, bins=np.linspace(0, 1, 201), color="#1b9e77")
    _ax_log.axvspan(_tt.loc[25, "t_log"], _tt.loc[75, "t_log"], color="orange", alpha=0.35, label="IQR")
    _ax_log.axvspan(_tt.loc[5, "t_log"], _tt.loc[95, "t_log"], color="red", alpha=0.15, label="p5–p95")
    _ax_log.set_title(
        f"Log mapping: IQR width {_tt.loc[75, 't_log'] - _tt.loc[25, 't_log']:.4f}, "
        f"p5–p95 width {_tt.loc[95, 't_log'] - _tt.loc[5, 't_log']:.4f}"
    )
    _ax_log.set_xlabel("t_log")
    _ax_log.set_ylabel("patch count")
    _ax_log.legend()

    fig_colormap
    return (fig_colormap,)
```

- [ ] **Step 5: Append the finding cell**

```python
@app.cell
def _finding_colorscale(VMAX, VMIN, band_90_lin, band_90_log, band_iqr_lin, band_iqr_log, mo):
    mo.md(
        f"**Finding (color scale).** With $v_{{\\min}} = {VMIN:.5f}$ and "
        f"$v_{{\\max}} = {VMAX:.3f}$, the central 50% of patches (IQR) occupy only "
        f"**{100 * band_iqr_lin:.2f}%** of the colormap under $t_{{\\mathrm{{lin}}}}$ "
        f"and **{100 * band_iqr_log:.2f}%** under $t_{{\\mathrm{{log}}}}$. The "
        f"central 90% (p5–p95) occupies **{100 * band_90_lin:.2f}%** linear and "
        f"**{100 * band_90_log:.2f}%** log. The remaining ~90% of the colormap is "
        f"reserved for a rare tail, which is why the bulk renders flat."
    )
    return
```

- [ ] **Step 6: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. The `t` table matches p1 0.0311/0.2026 … p99 0.2464/0.6294; the figure titles report IQR widths 0.0233/0.0573 and p5–p95 widths 0.0656/0.1616.

- [ ] **Step 7: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add color-scale diagnosis section with t mapping"
```

---

### Task 7: Test-retest scan 1 vs scan 2 (Section 8)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches`.
- Produces: `dbar`, `loa_lower`, `loa_upper`, `paired` (columns `subject_index`, `organ`, `scan1`, `scan2`, `diff`), `r`, `r_by_organ` (`{"heart": float, "liver": float}`), `sd`.

- [ ] **Step 1: Append the pairing and statistics cell**

```python
@app.cell
def _test_retest(np, patches):
    _ps5 = patches[patches["patch_size"] == 5].copy()
    _ps5["subject_index"] = _ps5["subject"].str.extract(r"(\d+)").astype(int)
    paired = (
        _ps5.groupby(["subject_index", "organ", "scan"])["suv_mean"]
        .median()
        .unstack("scan")
        .dropna()
        .reset_index()
        .rename(columns={1: "scan1", 2: "scan2"})
    )
    paired["diff"] = paired["scan1"] - paired["scan2"]
    r = float(np.corrcoef(paired["scan1"], paired["scan2"])[0, 1])
    r_by_organ = {
        _organ: float(np.corrcoef(_group["scan1"], _group["scan2"])[0, 1])
        for _organ, _group in paired.groupby("organ")
    }
    dbar = float(paired["diff"].mean())
    sd = float(paired["diff"].std(ddof=1))
    loa_lower = dbar - 1.96 * sd
    loa_upper = dbar + 1.96 * sd
    return dbar, loa_lower, loa_upper, paired, r, r_by_organ, sd
```

- [ ] **Step 2: Append the scatter + Bland–Altman figure cell**

```python
@app.cell
def _(dbar, loa_lower, loa_upper, paired, plt):
    fig_testretest, _axes_testretest = plt.subplots(1, 2, figsize=(12, 4.5))

    _axes_testretest[0].scatter(paired["scan1"], paired["scan2"], s=18, alpha=0.7)
    _lims = [
        min(paired["scan1"].min(), paired["scan2"].min()),
        max(paired["scan1"].max(), paired["scan2"].max()),
    ]
    _axes_testretest[0].plot(_lims, _lims, "k--", lw=1)
    _axes_testretest[0].set_title("Scan 1 vs scan 2 per-subject organ median")
    _axes_testretest[0].set_xlabel("scan 1 median SUV")
    _axes_testretest[0].set_ylabel("scan 2 median SUV")

    _axes_testretest[1].scatter((paired["scan1"] + paired["scan2"]) / 2, paired["diff"], s=18, alpha=0.7)
    _axes_testretest[1].axhline(dbar, color="k", lw=1)
    _axes_testretest[1].axhline(loa_upper, color="crimson", ls="--", lw=1)
    _axes_testretest[1].axhline(loa_lower, color="crimson", ls="--", lw=1)
    _axes_testretest[1].set_title("Bland–Altman (scan 1 - scan 2)")
    _axes_testretest[1].set_xlabel("mean of scans (SUV)")
    _axes_testretest[1].set_ylabel("difference (SUV)")

    fig_testretest.tight_layout()
    fig_testretest
    return (fig_testretest,)
```

- [ ] **Step 3: Append the finding cell**

```python
@app.cell
def _finding_testretest(dbar, loa_lower, loa_upper, mo, r, r_by_organ, sd):
    mo.md(rf"""
    **Finding (test–retest).** Pairing subjects by numeric index
    (`HTRAi` ↔ `HTRBi`, skipping the missing `HTRB8`) and comparing per-subject,
    per-organ medians (46 subjects × 2 organs = 92 pairs), the pooled Pearson
    correlation is $r = {r:.3f}$. The pooled value mixes two organs with
    different spread: liver test–retest is strong
    ($r = {r_by_organ['liver']:.3f}$) while heart is weak
    ($r = {r_by_organ['heart']:.3f}$). The mean difference is
    $\bar d = {dbar:.3f}$ SUV units with $s_d = {sd:.3f}$, so the 95% limits of
    agreement $\bar d \pm 1.96\,s_d$ are
    $[{loa_lower:.3f},\ {loa_upper:.3f}]$. Test–retest reproducibility is
    therefore organ-dependent: the liver is stable while heart uptake is noisy
    between scans.
    """)
    return
```

- [ ] **Step 4: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. `paired` has 92 rows (46 subjects × 2 organs; the missing `HTRB8` drops out), the pooled $r \approx 0.40$ (liver $r \approx 0.83$, heart $r \approx 0.16$), and the Bland–Altman limits straddle 0.

- [ ] **Step 5: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add test-retest comparison section"
```

---

### Task 8: Patch size comparison (Section 9)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `patches`.
- Produces: `patchsize_table` with columns `scan`, `patch_size`, `n`, `p50`, `iqr`, `std`.

- [ ] **Step 1: Append the spread table cell**

```python
@app.cell
def _patch_size(np, patches, pd):
    _rows = []
    for (_scan, _patch_size), _group in patches.groupby(["scan", "patch_size"], sort=True):
        _values = _group["suv_mean"].to_numpy(dtype=float)
        _q25, _q75 = np.percentile(_values, [25, 75])
        _rows.append(
            {
                "scan": int(_scan),
                "patch_size": int(_patch_size),
                "n": len(_values),
                "p50": float(np.percentile(_values, 50)),
                "iqr": float(_q75 - _q25),
                "std": float(_values.std(ddof=1)),
            }
        )
    patchsize_table = pd.DataFrame(_rows)
    patchsize_table
    return (patchsize_table,)
```

- [ ] **Step 2: Append the overlaid ECDF figure cell**

```python
@app.cell
def _(np, patches, plt):
    fig_patchsize, _axes_patchsize = plt.subplots(1, 2, figsize=(12, 4.5), sharey=True)
    for _scan, _ax in zip([1, 2], _axes_patchsize):
        _subset = patches[patches["scan"] == _scan]
        for _patch_size in sorted(_subset["patch_size"].unique()):
            _values = np.sort(_subset.loc[_subset["patch_size"] == _patch_size, "suv_mean"].to_numpy(dtype=float))
            _ecdf = np.arange(1, len(_values) + 1) / len(_values)
            _ax.plot(_values, _ecdf, lw=1.2, label=f"patch {_patch_size}")
        _ax.set_xscale("log")
        _ax.set_title(f"Scan {_scan}: ECDF by patch size")
        _ax.set_xlabel("SUV (log scale, dimensionless)")
        _ax.set_ylabel("fraction of patches")
        _ax.legend(title="patch size")
    fig_patchsize.tight_layout()
    fig_patchsize
    return (fig_patchsize,)
```

- [ ] **Step 3: Append the finding cell**

```python
@app.cell
def _(mo, patchsize_table):
    _t = patchsize_table.set_index(["scan", "patch_size"])
    mo.md(
        f"**Finding (patch size).** Within each scan the patch-5 distribution is "
        f"narrower than the patch-3 distribution: scan 1 $\\mathrm{{IQR}}$ "
        f"{_t.loc[(1, 5), 'iqr']:.3f} vs {_t.loc[(1, 3), 'iqr']:.3f}, "
        f"$\\sigma$ {_t.loc[(1, 5), 'std']:.3f} vs {_t.loc[(1, 3), 'std']:.3f}; "
        f"scan 2 $\\mathrm{{IQR}}$ "
        f"{_t.loc[(2, 5), 'iqr']:.3f} vs {_t.loc[(2, 3), 'iqr']:.3f}. Larger patches "
        f"average more voxels, so extreme voxel values are smoothed and the "
        f"distribution compresses. The flat-coloring problem is therefore slightly "
        f"worse for patch size 3."
    )
    return
```

- [ ] **Step 4: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. For each scan the patch-5 IQR and std are smaller than the patch-3 values.

- [ ] **Step 5: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add patch-size comparison section"
```

---

### Task 9: Clinical linkage (Section 10)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `DATA_DIR`, `patches`.
- Produces: `age_corr` (`{"heart": float, "liver": float}`), `clinical`, `empty_columns`, `joined`.

- [ ] **Step 1: Append the clinical join cell**

```python
@app.cell
def _clinical(DATA_DIR, np, patches, pd):
    clinical = pd.read_csv(DATA_DIR / "Quadra_clinical_data_anonym.csv", dtype=str)
    _scan1_patches = patches[patches["dataset"] == "scan1_ps5"]
    _subject_medians = (
        _scan1_patches.groupby(["subject", "organ"])["suv_mean"]
        .median()
        .unstack("organ")
        .reset_index()
    )
    joined = clinical.merge(_subject_medians, left_on="Image_ID", right_on="subject", how="inner")
    joined["age"] = pd.to_numeric(joined["age"], errors="coerce")
    joined["sex"] = pd.to_numeric(joined["sex"], errors="coerce")
    empty_columns = [column for column in clinical.columns if clinical[column].isna().all()]
    age_corr = {}
    for _organ in ["heart", "liver"]:
        _valid = joined[["age", _organ]].dropna()
        age_corr[_organ] = float(np.corrcoef(_valid["age"], _valid[_organ])[0, 1])
    return age_corr, clinical, empty_columns, joined
```

- [ ] **Step 2: Append the cohort composition cell**

```python
@app.cell
def _(clinical, empty_columns, joined, mo, pd):
    _composition = pd.DataFrame(
        {
            "metric": [
                "cohort rows",
                "joined subjects",
                "cohort",
                "age mean",
                "age range",
                "sex counts",
                "empty columns",
            ],
            "value": [
                str(len(clinical)),
                str(len(joined)),
                ", ".join(sorted(clinical["Cohort"].dropna().unique())),
                f"{joined['age'].mean():.1f}",
                f"{joined['age'].min():.0f}–{joined['age'].max():.0f}",
                str(joined["sex"].value_counts().to_dict()),
                str(len(empty_columns)),
            ],
        }
    )
    _pattern = pd.DataFrame(
        {
            "pattern column": ["LV_uptake_pattern", "Non_LV_pattern", "Liver_pattern"],
            "value counts": [
                str(clinical["LV_uptake_pattern"].value_counts(dropna=False).to_dict()),
                str(clinical["Non_LV_pattern"].value_counts(dropna=False).to_dict()),
                str(clinical["Liver_pattern"].value_counts(dropna=False).to_dict()),
            ],
        }
    )
    _empty_md = mo.md(
        "**Empty clinical columns (all null for this cohort):** " + ", ".join(empty_columns)
    )
    mo.vstack(
        [mo.md("### Cohort composition"), _composition, mo.md("### Uptake patterns"), _pattern, _empty_md]
    )
    return
```

- [ ] **Step 3: Append the age association figure cell**

```python
@app.cell
def _(age_corr, joined, plt):
    fig_clinical, _axes_clinical = plt.subplots(1, 2, figsize=(12, 4.5))
    for _organ, _ax in zip(["heart", "liver"], _axes_clinical):
        _valid = joined[["age", _organ]].dropna()
        _ax.scatter(_valid["age"], _valid[_organ], s=18, alpha=0.7)
        _ax.set_title(f"{_organ.capitalize()} median SUV vs age (r = {age_corr[_organ]:.3f})")
        _ax.set_xlabel("age (years)")
        _ax.set_ylabel(f"per-subject {_organ} median SUV")
    fig_clinical.tight_layout()
    fig_clinical
    return (fig_clinical,)
```

- [ ] **Step 4: Append the finding cell**

```python
@app.cell
def _(age_corr, empty_columns, joined, mo):
    mo.md(
        f"**Finding (clinical linkage).** The clinical CSV holds **{len(joined)}** "
        f"subjects matching the scan-1 IDs. Age is available for all of them; the "
        f"association between per-subject organ median SUV and age is weak "
        f"(heart $r$ = {age_corr['heart']:.3f}, liver $r$ = {age_corr['liver']:.3f}). "
        f"Uptake-pattern columns (`LV_uptake_pattern`, `Non_LV_pattern`, "
        f"`Liver_pattern`) are populated for most subjects. **{len(empty_columns)}** "
        f"clinical columns are entirely empty for this healthy cohort (named in "
        f"the composition cell above), so any analysis depending on them is not "
        f"possible here."
    )
    return
```

- [ ] **Step 5: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. `joined` has 47 rows, the cohort is `Healthy-testretest`, and both age correlations are printed.

- [ ] **Step 6: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add clinical linkage section"
```

---

### Task 10: Conclusions and appendix (Sections 11–12)

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: nothing (static markdown).
- Produces: nothing.

- [ ] **Step 1: Append the conclusions markdown cell**

```python
@app.cell
def _conclusions(mo):
    mo.md(r"""
    ## Conclusions

    The flat appearance of the viewer's SUV coloring is **intrinsic to the data
    and the global range**, not a rendering defect.

    1. `suv_mean` is strongly right-skewed: median ≈ 3.46, ~78% below 4, while a
       rare tail reaches 39.15. The global range
       $[v_{\min}, v_{\max}] = [0.14951, 39.154]$ is set almost entirely by the
       heart tail.
    2. Under the linear colormap the central 90% of patches occupy only ≈6.6% of
       the color range; under the logarithmic mapping ≈16.2%. This is exactly the
       band width computed in section 7 via $t_{\mathrm{lin}}$ and
       $t_{\mathrm{log}}$.
    3. Liver is nearly uniform; heart carries the heavy tail. Per-subject medians
       are stable across subjects, and liver test–retest is strong
       ($r \approx 0.83$) while heart is noisy ($r \approx 0.16$), so part of the
       heart spread is measurement noise.

    **Recommendation.** Give the viewer an explicit SUV color window with a
    percentile-clipped default (for example p1–p99, or p5–p95 for the most
    aggressive contrast), optionally set per organ. With a p1–p99 window the
    central 90% would occupy a far larger fraction of the colormap, resolving the
    flat rendering without discarding the tail. Viewer implementation is out of
    scope for this notebook.
    """)
    return
```

- [ ] **Step 2: Append the appendix markdown cell**

```python
@app.cell
def _appendix(mo):
    mo.md(r"""
    ## Appendix — reproduce this notebook

    Install dev dependencies: `uv sync`

    Run interactively: `uv run marimo edit notebooks/suv_analysis.py`

    Headless execution check (writes only to `/tmp`):
    `uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html`

    The data directory defaults to `/Users/simon/data/joels_petct_data` and can be
    overridden with the `PETCT_DATA_DIR` environment variable:
    `PETCT_DATA_DIR=/path/to/data uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html`
    """)
    return
```

- [ ] **Step 3: Run the headless export and verify**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. The HTML contains a "Conclusions" heading and an "Appendix" heading.

- [ ] **Step 4: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "docs: add conclusions and appendix to SUV analysis notebook"
```

---

### Task 11: Acceptance assertions and final verification

**Files:**
- Modify: `notebooks/suv_analysis.py`

**Interfaces:**
- Consumes: `VMIN`, `VMAX`, `band_90_lin`, `band_90_log`, `band_iqr_lin`, `band_iqr_log`, `columns_ok`, `dataset_table`, `frac_gt10`, `frac_lt2`, `frac_lt4`, `global_pct`, `np`, `organs_ok`, `organ_table`, `subject_table`, `t_table`, `total`.
- Produces: `result` (DataFrame with columns `group`, `check`, `actual`, `expected`, `pass`).

- [ ] **Step 1: Append the acceptance checks cell**

```python
@app.cell
def _acceptance(
    VMIN,
    VMAX,
    band_90_lin,
    band_90_log,
    band_iqr_lin,
    band_iqr_log,
    columns_ok,
    dataset_table,
    frac_gt10,
    frac_lt2,
    frac_lt4,
    global_pct,
    mo,
    np,
    organs_ok,
    organ_table,
    pd,
    subject_table,
    t_table,
    total,
):
    _checks = []

    def _add(group, name, actual, expected, tol):
        _checks.append(
            {
                "group": group,
                "check": name,
                "actual": round(float(actual), 5),
                "expected": expected,
                "pass": abs(float(actual) - expected) <= tol,
            }
        )

    _add("integrity", "total patches", total, 1327429, 0)
    _add("integrity", "columns ok", int(columns_ok), 1, 0)
    _add("integrity", "organs ok", int(organs_ok), 1, 0)

    _add("global", "v_min", global_pct[0], 0.14951, 0.02)
    _add("global", "p1", global_pct[2], 1.361, 0.02)
    _add("global", "p5", global_pct[3], 2.296, 0.02)
    _add("global", "p25", global_pct[4], 3.024, 0.02)
    _add("global", "p50", global_pct[5], 3.462, 0.02)
    _add("global", "p75", global_pct[6], 3.932, 0.02)
    _add("global", "p95", global_pct[8], 4.853, 0.02)
    _add("global", "p99", global_pct[9], 9.762, 0.02)
    _add("global", "p99.9", global_pct[10], 19.742, 0.02)
    _add("global", "v_max", global_pct[11], 39.154, 0.02)
    _add("global", "frac<2", frac_lt2, 0.027, 0.002)
    _add("global", "frac<4", frac_lt4, 0.7782, 0.002)
    _add("global", "frac>10", frac_gt10, 0.00946, 0.001)

    _ds = dataset_table.set_index("dataset")
    for _dataset_id, _n, _p50, _p99, _vmax in [
        ("scan1_ps5", 99501, 3.52, 9.36, 24.454),
        ("scan1_ps3", 562082, 3.47, 9.74, 29.202),
        ("scan2_ps5", 99919, 3.49, 9.34, 29.655),
        ("scan2_ps3", 565927, 3.44, 9.95, 39.154),
    ]:
        _add("dataset", f"{_dataset_id} n", _ds.loc[_dataset_id, "n"], _n, 0)
        _add("dataset", f"{_dataset_id} p50", _ds.loc[_dataset_id, "p50"], _p50, 0.02)
        _add("dataset", f"{_dataset_id} p99", _ds.loc[_dataset_id, "p99"], _p99, 0.02)
        _add("dataset", f"{_dataset_id} max", _ds.loc[_dataset_id, "max"], _vmax, 0.02)

    _og = organ_table.set_index("organ")
    for _organ, _n, _vmin, _p50, _p95, _p99, _vmax in [
        ("heart", 320940, 0.288, 2.99, 8.97, 16.01, 39.154),
        ("liver", 1006489, 0.150, 3.55, 4.56, 4.97, 16.912),
    ]:
        _add("organ", f"{_organ} n", _og.loc[_organ, "n"], _n, 0)
        _add("organ", f"{_organ} min", _og.loc[_organ, "min"], _vmin, 0.02)
        _add("organ", f"{_organ} p50", _og.loc[_organ, "p50"], _p50, 0.02)
        _add("organ", f"{_organ} p95", _og.loc[_organ, "p95"], _p95, 0.02)
        _add("organ", f"{_organ} p99", _og.loc[_organ, "p99"], _p99, 0.02)
        _add("organ", f"{_organ} max", _og.loc[_organ, "max"], _vmax, 0.02)

    _tt = t_table.set_index("percentile")
    for _pct, _t_lin_expected, _t_log_expected in [
        (1, 0.0311, 0.2026),
        (5, 0.0550, 0.2964),
        (25, 0.0737, 0.3526),
        (50, 0.0849, 0.3817),
        (75, 0.0970, 0.4099),
        (95, 0.1206, 0.4580),
        (99, 0.2464, 0.6294),
    ]:
        _add("colormap", f"p{_pct} t_lin", _tt.loc[_pct, "t_lin"], _t_lin_expected, 0.005)
        _add("colormap", f"p{_pct} t_log", _tt.loc[_pct, "t_log"], _t_log_expected, 0.005)
    _add("colormap", "IQR width lin", band_iqr_lin, 0.0233, 0.005)
    _add("colormap", "IQR width log", band_iqr_log, 0.0573, 0.005)
    _add("colormap", "p5-p95 width lin", band_90_lin, 0.0656, 0.005)
    _add("colormap", "p5-p95 width log", band_90_log, 0.1616, 0.005)

    _liver_span = subject_table.loc[subject_table["organ"] == "liver", "span"].to_numpy(dtype=float)
    _add("subject", "liver span median", np.median(_liver_span), 2.88, 0.02)
    _add("subject", "liver span p90", np.percentile(_liver_span, 90), 4.13, 0.02)
    _add("subject", "liver span max", _liver_span.max(), 14.58, 0.02)

    result = pd.DataFrame(_checks)
    _failed = int((~result["pass"]).sum())
    _header = mo.md(
        f"## Acceptance checks\n\n**{len(result) - _failed} / {len(result)} passed**"
        + ("" if _failed == 0 else f" — **{_failed} FAILED**")
    )
    mo.vstack([_header, result])
    return (result,)
```

- [ ] **Step 2: Run the headless export and verify every group passes**

Run:

```bash
uv run marimo export html notebooks/suv_analysis.py -o /tmp/suv_analysis.html
```

Expected: exit 0, no errors. Then read the rendered pass count from the HTML
(the cell source is also embedded in the HTML, so search for the rendered
"passed" header, not for the literal word `FAILED`):

```bash
grep -o "[0-9][0-9]* / [0-9][0-9]* passed" /tmp/suv_analysis.html
```

Expected: the same number on both sides (for example `65 / 65 passed`). If any
group fails, investigate the reading logic before changing any expected value,
and report the discrepancy (per the spec's delegation notes).

- [ ] **Step 3: Confirm no application files were modified**

Run:

```bash
git status --short
```

Expected: only `notebooks/suv_analysis.py`, `pyproject.toml`, and `uv.lock` appear (plus any pre-existing untracked files). No `src/`, `scripts/`, `index.html`, or `tests/` changes.

- [ ] **Step 4: Commit**

```bash
git add notebooks/suv_analysis.py
git commit -m "feat: add acceptance checks to SUV analysis notebook"
```

---

## Self-Review

**Spec coverage:**
- Goals 1–2 (read workbooks, verify structure) → Task 1.
- Goal 2 global/per-dataset/per-organ/per-subject → Tasks 2–5.
- Goal 3 (`t` mapping, band widths) → Task 6.
- Goal 4 (test-retest, patch size) → Tasks 7–8.
- Goal 5 (clinical join) → Task 9.
- Goal 6 (LaTeX findings, conclusions) → findings in Tasks 1–9, conclusions in Task 10.
- Notebook structure sections 1–12 → Tasks 1–10 (section 11 conclusions, section 12 appendix).
- Environment/placement (path, dev deps, Agg, headless) → Task 1, re-verified each task.
- Acceptance criteria 1–5 → Tasks 1, 10, 11.
- Acceptance criterion 6 (only notebook + pyproject/uv.lock changed) → Task 11 Step 3.
- Expected values table → asserted in Task 11.

**Placeholder scan:** no TBD/TODO; every step contains runnable code or a concrete command.

**Type consistency:** `global_pct` index map is fixed by `PCTS = [0, 0.1, 1, 5, 25, 50, 75, 90, 95, 99, 99.9, 100]` (p1→2, p5→3, p25→4, p50→5, p75→6, p90→7, p95→8, p99→9, p99.9→10, max→11) and is used consistently in Tasks 2, 6, and 11. `dataset_table`, `organ_table`, `subject_table`, `t_table`, and `patchsize_table` column names match between producers (Tasks 3–8) and consumers (Tasks 9, 11).
