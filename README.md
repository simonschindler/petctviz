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
