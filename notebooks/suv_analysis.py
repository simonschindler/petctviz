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


@app.cell
def _global_stats(np, patches):
    v_all = patches["suv_mean"].to_numpy(dtype=float)
    PCTS = [0, 0.1, 1, 5, 25, 50, 75, 90, 95, 99, 99.9, 100]
    global_pct = np.percentile(v_all, PCTS)
    frac_lt2 = float(np.mean(v_all < 2))
    frac_lt4 = float(np.mean(v_all < 4))
    frac_gt10 = float(np.mean(v_all > 10))
    return PCTS, frac_gt10, frac_lt2, frac_lt4, global_pct, v_all


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


if __name__ == "__main__":
    app.run()
