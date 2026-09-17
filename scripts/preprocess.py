from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

import numpy as np
import pandas as pd

ORGAN_IDS = {"heart": 0, "liver": 1}
FLOAT_FIELDS = 7
MM_FIELDS = ["patch_center_x_mm", "patch_center_y_mm", "patch_center_z_mm"]
SUV_FIELDS = ["suv_mean", "suv_min", "suv_max"]
EXPECTED_SUBJECT_COUNT = 47

DATASETS = {
    "scan1_ps5": {
        "file": "Healthy_quadra_scan_1_patch_size_5.xlsx",
        "label": "Scan 1 · patch 5",
        "patchSize": 5,
        "prefix": "HTRA",
    },
    "scan1_ps3": {
        "file": "Healthy_quadra_scan_1_patch_size_3.xlsx",
        "label": "Scan 1 · patch 3",
        "patchSize": 3,
        "prefix": "HTRA",
    },
    "scan2_ps5": {
        "file": "Healthy_quadra_scan_2_patch_size_5.xlsx",
        "label": "Scan 2 · patch 5",
        "patchSize": 5,
        "prefix": "HTRB",
    },
    "scan2_ps3": {
        "file": "Healthy_quadra_scan_2_patch_size_3.xlsx",
        "label": "Scan 2 · patch 3",
        "patchSize": 3,
        "prefix": "HTRB",
    },
}


def natural_key(value: str) -> list:
    return [int(part) if part.isdigit() else part for part in re.split(r"(\d+)", value)]


def load_sheets(path) -> dict[str, pd.DataFrame]:
    return pd.read_excel(path, sheet_name=None, header=0)


def voxel_size_mm(df: pd.DataFrame) -> list[float]:
    sizes = []
    for axis in ("x", "y", "z"):
        voxel = df[f"patch_voxel_{axis}"].to_numpy(dtype=float)
        mm = df[f"patch_center_{axis}_mm"].to_numpy(dtype=float)
        if np.unique(voxel).size < 2:
            sizes.append(1.0)
            continue
        slope, _ = np.polyfit(voxel, mm, 1)
        sizes.append(round(float(slope), 5))
    return sizes


def subject_to_array(df: pd.DataFrame, organ_ids: dict[str, int] = ORGAN_IDS) -> np.ndarray:
    unknown = set(df["organ"]) - set(organ_ids)
    if unknown:
        raise ValueError(f"unknown organs: {sorted(unknown)}")
    array = np.empty((len(df), FLOAT_FIELDS), dtype=np.float32)
    for index, column in enumerate(MM_FIELDS):
        array[:, index] = df[column].to_numpy(dtype=np.float32)
    for index, column in enumerate(SUV_FIELDS):
        array[:, 3 + index] = df[column].to_numpy(dtype=np.float32)
    array[:, 6] = df["organ"].map(organ_ids).to_numpy(dtype=np.float32)
    return array


def build_clinical(csv_path) -> dict[str, dict]:
    df = pd.read_csv(csv_path, dtype=str)
    df = df.astype(object).where(pd.notna(df), None)
    return {row["Image_ID"]: row for row in df.to_dict(orient="records")}


def preprocess(data_dir, out_dir) -> dict:
    data_dir = Path(data_dir)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    manifest = {
        "organs": [
            {"id": organ_id, "name": name}
            for name, organ_id in sorted(ORGAN_IDS.items(), key=lambda item: item[1])
        ],
        "suvRange": [None, None],
        "datasets": {},
    }
    suv_min = float("inf")
    suv_max = float("-inf")

    for dataset_id, meta in DATASETS.items():
        path = data_dir / meta["file"]
        if not path.exists():
            raise FileNotFoundError(f"missing dataset file: {path}")

        sheets = load_sheets(path)
        present = sorted(
            (subject for subject, sheet in sheets.items() if not sheet.empty),
            key=natural_key,
        )
        expected = [f"{meta['prefix']}{i}" for i in range(1, EXPECTED_SUBJECT_COUNT + 1)]
        missing = [subject for subject in expected if subject not in present]

        dataset_dir = out_dir / dataset_id
        dataset_dir.mkdir(parents=True, exist_ok=True)

        voxel_size = None
        subject_files = {}
        for subject in present:
            df = sheets[subject]
            if voxel_size is None:
                voxel_size = voxel_size_mm(df)
            array = subject_to_array(df)
            payload = np.ascontiguousarray(array, dtype="<f4").tobytes()
            (dataset_dir / f"{subject}.bin").write_bytes(payload)
            subject_files[subject] = f"{dataset_id}/{subject}.bin"
            suv_min = min(suv_min, float(array[:, 3].min()))
            suv_max = max(suv_max, float(array[:, 3].max()))

        manifest["datasets"][dataset_id] = {
            "label": meta["label"],
            "patchSize": meta["patchSize"],
            "voxelSizeMm": voxel_size or [1.0, 1.0, 1.0],
            "subjects": present,
            "missing": missing,
            "subjectFiles": subject_files,
        }

    manifest["suvRange"] = [suv_min, suv_max]
    clinical = build_clinical(data_dir / "Quadra_clinical_data_anonym.csv")

    (out_dir / "manifest.json").write_text(json.dumps(manifest, indent=2))
    (out_dir / "clinical.json").write_text(json.dumps(clinical, indent=2))
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
    manifest = preprocess(args.data_dir, args.out_dir)
    print(f"wrote {len(manifest['datasets'])} datasets to {args.out_dir}")


if __name__ == "__main__":
    main()
