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

## Deploy

A multi-stage `Dockerfile` (Node build → nginx serve) and a
`docker-compose.yml` are included, so the app can be deployed as-is on
[Coolify](https://coolify.io).

- **Coolify:** create a resource from this Git repository, select
  **Docker Compose**, and set the exposed port to **80**. The bundled proxy
  routes to it; no host ports are published.
- **Locally:**

```bash
docker build -t petctviz .
docker run --rm -p 8080:80 petctviz
# open http://localhost:8080
```

The image serves the static build plus the pre-generated `public/data/`, which
is committed to the repository so the build is self-contained. To regenerate
that data from the source workbooks, run `npm run preprocess` before building.

## Usage

- **Dataset** switches among scan 1/2 and patch size 3/5.
- **Subject** lists available subjects; missing subjects are shown disabled.
- **Colormap** switches between PET hot, viridis, and grayscale.
- **SUV scale** switches between logarithmic (the default) and linear. It
  applies to the color ramp and to the spacing of the threshold and fade
  sliders, so low SUV values get finer control.
- **Color window** sets the SUV range mapped to the colormap. Scope can be
  **Global** or **Per organ**; presets are **p1–p99** (default), **p5–p95**,
  **Full range**, or **Custom** via the Min/Max sliders.
- **Heart / Liver** toggles each organ.
- **SUV threshold** fades cubes below the value; **Fade width** controls how
  gradual that fade is (0 = hard cutoff).
- **Clip X/Y/Z** cut the volume along each axis; **Reset clip** restores it.
- Hover a cube to see its organ, mm coordinates, and SUV mean/min/max.
- Hover the **?** next to any control for a description of what it does.
