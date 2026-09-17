# petctviz — 3D Explorer for Healthy PET/CT Patch Data

Date: 2026-09-17

## Overview

A static, browser-based 3D explorer for the healthy PET/CT patch dataset. The
user selects a dataset and subject, then views the heart and liver as
SUV-colored cubes in 3D. Cubes can be sliced with axis-aligned clipping planes,
low-uptake cubes can be faded out via an adjustable SUV threshold, and the
selected subject's clinical metadata is shown alongside. There is no backend at
runtime; all data is preprocessed into static assets.

Primary purpose: explore individual scans in 3D.

## Data

Source files under `/Users/simon/data/joels_petct_data`:

- `Healthy_quadra_scan_1_patch_size_5.xlsx` — 47 sheets (`HTRA1`–`HTRA47`), ~1,882 rows/sheet
- `Healthy_quadra_scan_1_patch_size_3.xlsx` — 47 sheets (`HTRA1`–`HTRA47`), ~10,574 rows/sheet
- `Healthy_quadra_scan_2_patch_size_5.xlsx` — 46 sheets (`HTRB1`–`HTRB46`)
- `Healthy_quadra_scan_2_patch_size_3.xlsx` — 46 sheets
- `Quadra_clinical_data_anonym.csv` — 94 rows (47 `HTRA*` + 47 `HTRB*`), 105 columns, all `Cohort = Healthy-testretest`

Each row of every sheet is one cubic patch with columns:

`patient_id, organ, patch_center_x_mm, patch_center_y_mm, patch_center_z_mm,
patch_voxel_z, patch_voxel_y, patch_voxel_x, suv_mean, suv_min, suv_max`

Key observations:

- Organs present: `heart`, `liver` only.
- Patches are organ-masked points, not a full rectangular grid.
- `patch_size` is a voxel stride in voxel units. The voxel grid is
  anisotropic: x/y voxel size ~1.52344 mm, z voxel size 2.0 mm (derived by
  linear fit of voxel index vs. mm across all datasets). So `ps5` boxes are
  7.617 × 7.617 × 10.0 mm and `ps3` boxes are 4.570 × 4.570 × 6.0 mm —
  cubes in voxel space, anisotropic boxes in physical space.
- SUV mean range across the dataset: ~0.19 to ~24.45.

## Decisions

- Primary purpose: explore individual scans in 3D.
- Interactions: slice/clip plane, clinical metadata panel, SUV threshold with
  adjustable transparency/fade.
- Stack: static site with preprocessed data.
- Datasets: all four xlsx files are exposed via a selector (switch only, no
  side-by-side comparison).
- SUV colormap: selectable in the UI (PET hot scale, viridis, grayscale).
- Clip plane control: axis sliders (X/Y/Z).
- CT: not needed; the app is SUV-only.

## Architecture

Vite + vanilla ES modules + Three.js. `npm run build` emits a static `dist/`
that can be hosted anywhere.

### Preprocessing — `scripts/preprocess.py`

Run with `uv run` (pandas + openpyxl). Reads the four xlsx files and the CSV
once and writes static assets. Output is deterministic and idempotent.

Emitted files:

- `public/data/manifest.json`
  - `datasets`: map of dataset id to metadata
    - dataset ids: `scan1_ps5`, `scan1_ps3`, `scan2_ps5`, `scan2_ps3`
    - per dataset: `label`, `patchSize`, `voxelSizeMm` (per-axis
      `[x, y, z]`), `subjects` (available subject ids), `missing`
      (expected-but-absent subject ids), `organs`, and a per-subject index
      for lazy loading.
  - `organs`: global organ list with stable ids.
  - `suvRange`: global `[min, max]` used for a stable color scale.
- `public/data/clinical.json`
  - keyed by `Image_ID`; each record has a curated set of key fields plus the
    full original row.
- `public/data/<dataset>/<subject>.bin`
  - packed little-endian `Float32Array`, 7 floats per patch:
    `[x_mm, y_mm, z_mm, suv_mean, suv_min, suv_max, organ_id]`
  - ~75 KB per subject.

Cube edge lengths are computed from the dataset's `patchSize` and per-axis
`voxelSizeMm` (edge = `patchSize` × voxel size on each axis), so the boxes
reflect the true physical extent of each patch.

### Frontend modules

- `src/data/loader.js` — fetch manifest, clinical data, and per-subject binary;
  decode into typed arrays; cache decoded subjects.
- `src/scene/viewer.js` — Three.js scene, one `InstancedMesh` of boxes per
  organ, `instanceColor` for SUV, per-instance opacity for fade, orbit
  controls, and axis-aligned clipping planes.
- `src/ui/controls.js` — dataset and subject selectors, organ toggles, SUV
  colormap select, threshold and fade controls, X/Y/Z clip sliders, color
  legend.
- `src/ui/clinical.js` — metadata panel for the selected subject.
- `src/ui/tooltip.js` — raycast hover showing SUV mean/min/max and mm coords.

### Rendering

- One `InstancedMesh` per organ, positioned at patch centers, scaled to the
  per-axis patch extent (`patchSize × voxelSizeMm`).
- Color: SUV mapped through the selected colormap over the global SUV range,
  with a legend. Scale is stable across subjects.
- Fade: a threshold value plus a fade width. Cubes below the threshold ramp
  toward transparent; at maximum fade they are effectively hidden.
- Clipping: three axis-aligned clipping planes driven by sliders bounded by the
  subject's patch bounds.

## Interaction behavior

- Dataset selector switches among `scan1_ps5`, `scan1_ps3`, `scan2_ps5`,
  `scan2_ps3`.
- Subject selector lists available subjects for the dataset; missing subjects
  are marked unavailable.
- Organ toggles show/hide heart and liver independently.
- SUV colormap select switches between PET hot, viridis, and grayscale.
- Threshold and fade controls fade out low-uptake cubes.
- X/Y/Z clip sliders cut the volume.
- Hover raycasts an instance and shows a tooltip with SUV mean/min/max and mm
  coordinates.

## Error handling

- Missing or failed subject binary: show an inline message and keep the previous
  view usable.
- Empty organ selection: render nothing but keep controls responsive.
- Clinical row absent for a subject: panel shows "no data".
- Malformed preprocessing input: fail loudly with the offending file/sheet name.

## Testing

- pytest for the preprocessor:
  - row counts per dataset match the source sheets
  - value ranges are sane (SUV within expected bounds)
  - binary round-trips to the same values
  - missing subjects are reported rather than raising
- Browser smoke check via `npm run dev` covering load, threshold fade, clip, and
  subject switching.
- Optional Playwright tests for the same interactions if browser automation is
  wanted.

## Layout

Single page. Full-height 3D canvas on the left; scrollable control and clinical
panel on the right; color legend overlaid on the canvas.

## Out of scope

- CT/anatomical overlay (no image volumes in the data).
- Side-by-side test-retest or patch-size comparison.
- Cohort-level aggregate statistics and survival/clinical analysis.
- Any server-side component.
