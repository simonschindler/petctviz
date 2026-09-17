# petctviz

A static browser-based 3D explorer for healthy PET/CT organ patch data. Renders
heart and liver patches as SUV-colored cubes with axis clipping, threshold
fade, hover inspection, and clinical metadata.

## Requirements

- Node 20+ and npm
- Python 3.11+ with [uv](https://docs.astral.sh/uv/)

## Setup

```bash
uv sync
npm install
npm run preprocess
```

`npm run preprocess` reads the source workbooks (default
`/Users/simon/data/joels_petct_data`, override with `PETCT_DATA_DIR`) and writes
`public/data/`. Generated data is not committed.

## Develop

```bash
npm run dev
```

## Test

```bash
uv run pytest -q
npm test
```

## Build

```bash
npm run build
npm run preview
```

`dist/` is a self-contained static site.

## Usage

- **Dataset** switches among scan 1/2 and patch size 3/5.
- **Subject** lists available subjects; missing subjects are shown disabled.
- **Colormap** switches between PET hot, viridis, and grayscale.
- **Heart / Liver** toggles each organ.
- **SUV threshold** fades cubes below the value; **Fade width** controls how
  gradual that fade is (0 = hard cutoff).
- **Clip X/Y/Z** cut the volume along each axis; **Reset clip** restores it.
- Hover a cube to see its organ, mm coordinates, and SUV mean/min/max.
