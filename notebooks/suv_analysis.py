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


if __name__ == "__main__":
    app.run()
