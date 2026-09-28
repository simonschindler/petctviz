from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import h5py
import numpy as np

HIRES_DATASETS = {
    "scan1_vox": {
        "file": "Healthy_Test_Retest_First_Scan.h5ad",
        "label": "Scan 1 · heart voxels",
        "prefix": "HTRA",
    },
    "scan2_vox": {
        "file": "Healthy_Test_Retest_Second_Scan.h5ad",
        "label": "Scan 2 · heart voxels",
        "prefix": "HTRB",
    },
}
EXPECTED_SUBJECTS = 47
FIELDS = 4


def natural_key(value: str) -> list:
    import re

    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", str(value))]


def load_voxels(path):
    with h5py.File(path, "r") as handle:
        patients = [name.decode() for name in handle["obs/patient_id/categories"][:]]
        codes = handle["obs/patient_id/codes"][:]
        spatial = handle["obsm/spatial"][:]
        suv = handle["X"][:, 0]
    return patients, codes, spatial, suv


def voxel_spacing(spatial) -> list[float]:
    sizes = []
    for axis in range(3):
        unique = np.unique(np.round(spatial[:, axis], 5))
        diffs = np.diff(unique)
        diffs = diffs[diffs > 1e-6]
        sizes.append(round(float(diffs.min()), 6) if diffs.size else 1.0)
    return sizes


def subject_array(spatial, suv, codes, index) -> np.ndarray:
    mask = codes == index
    array = np.empty((int(mask.sum()), FIELDS), dtype=np.float32)
    array[:, 0:3] = spatial[mask]
    array[:, 3] = suv[mask]
    return array


def add_hires_dataset(manifest, path, dataset_id, label, prefix, out_dir) -> None:
    patients, codes, spatial, suv = load_voxels(path)
    present = sorted(patients, key=natural_key)
    first = subject_array(spatial, suv, codes, patients.index(present[0]))
    spacing = voxel_spacing(first[:, 0:3])

    dataset_dir = Path(out_dir) / dataset_id
    dataset_dir.mkdir(parents=True, exist_ok=True)

    subject_files = {}
    for subject in present:
        array = subject_array(spatial, suv, codes, patients.index(subject))
        payload = np.ascontiguousarray(array, dtype="<f4").tobytes()
        (dataset_dir / f"{subject}.bin").write_bytes(payload)
        subject_files[subject] = f"{dataset_id}/{subject}.bin"

    expected = [f"{prefix}{i}" for i in range(1, EXPECTED_SUBJECTS + 1)]
    manifest["datasets"][dataset_id] = {
        "label": label,
        "patchSize": 1,
        "voxelSizeMm": spacing,
        "strideFloats": FIELDS,
        "mode": "voxel",
        "subjects": present,
        "missing": [subject for subject in expected if subject not in present],
        "subjectFiles": subject_files,
    }


def preprocess_hires(data_dir, out_dir, manifest_path=None) -> dict:
    data_dir = Path(data_dir)
    out_dir = Path(out_dir)
    manifest_path = Path(manifest_path) if manifest_path else out_dir / "manifest.json"
    manifest = json.loads(manifest_path.read_text())

    for dataset_id, meta in HIRES_DATASETS.items():
        path = data_dir / meta["file"]
        if not path.exists():
            raise FileNotFoundError(f"missing hires file: {path}")
        add_hires_dataset(manifest, path, dataset_id, meta["label"], meta["prefix"], out_dir)

    manifest_path.write_text(json.dumps(manifest, indent=2))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--data-dir",
        default=os.environ.get("PETCT_DATA_DIR", "/Users/simon/data/joels_petct_data"),
    )
    parser.add_argument(
        "--out-dir",
        default=os.environ.get("PETCT_OUT_DIR", "public/data"),
    )
    args = parser.parse_args()
    manifest = preprocess_hires(args.data_dir, args.out_dir)
    print(f"added {len(HIRES_DATASETS)} hires datasets to {args.out_dir}")
    print("datasets:", ", ".join(manifest["datasets"].keys()))


if __name__ == "__main__":
    main()
