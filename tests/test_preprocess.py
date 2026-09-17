import numpy as np
import pandas as pd
import pytest

from scripts.preprocess import (
    ORGAN_IDS,
    load_sheets,
    natural_key,
    preprocess,
    subject_to_array,
    voxel_size_mm,
)


def make_sheet(patient, organs=("heart", "liver")):
    rows = []
    for oi, organ in enumerate(organs):
        for z in (10, 12):
            for y in (20, 21):
                for x in (30, 35):
                    rows.append(
                        {
                            "patient_id": patient,
                            "organ": organ,
                            "patch_center_x_mm": x * 1.52344,
                            "patch_center_y_mm": y * 1.52344,
                            "patch_center_z_mm": z * 2.0,
                            "patch_voxel_z": z,
                            "patch_voxel_y": y,
                            "patch_voxel_x": x,
                            "suv_mean": 1.0 + oi,
                            "suv_min": 0.5,
                            "suv_max": 2.0,
                        }
                    )
    return pd.DataFrame(rows)


def write_xlsx(path, subjects):
    with pd.ExcelWriter(path) as writer:
        for subject in subjects:
            make_sheet(subject).to_excel(writer, sheet_name=subject, index=False)


def write_all_datasets(data_dir, subjects_a, subjects_b):
    write_xlsx(data_dir / "Healthy_quadra_scan_1_patch_size_5.xlsx", subjects_a)
    write_xlsx(data_dir / "Healthy_quadra_scan_1_patch_size_3.xlsx", subjects_a)
    write_xlsx(data_dir / "Healthy_quadra_scan_2_patch_size_5.xlsx", subjects_b)
    write_xlsx(data_dir / "Healthy_quadra_scan_2_patch_size_3.xlsx", subjects_b)
    (data_dir / "Quadra_clinical_data_anonym.csv").write_text(
        "Image_ID,Cohort,age\nHTRA1,Healthy-testretest,50\n"
    )


def test_natural_key_sorts_numerically():
    assert sorted(["HTRA10", "HTRA2", "HTRA1"], key=natural_key) == [
        "HTRA1",
        "HTRA2",
        "HTRA10",
    ]


def test_load_sheets_reads_all(tmp_path):
    path = tmp_path / "d.xlsx"
    write_xlsx(path, ["HTRA1", "HTRA2"])
    sheets = load_sheets(path)
    assert set(sheets) == {"HTRA1", "HTRA2"}
    assert len(sheets["HTRA1"]) == 16


def test_voxel_size_mm_recovers_spacing(tmp_path):
    path = tmp_path / "d.xlsx"
    write_xlsx(path, ["HTRA1"])
    df = load_sheets(path)["HTRA1"]
    sx, sy, sz = voxel_size_mm(df)
    assert sx == pytest.approx(1.52344, abs=1e-4)
    assert sy == pytest.approx(1.52344, abs=1e-4)
    assert sz == pytest.approx(2.0, abs=1e-4)


def test_subject_to_array_layout(tmp_path):
    path = tmp_path / "d.xlsx"
    write_xlsx(path, ["HTRA1"])
    df = load_sheets(path)["HTRA1"]
    arr = subject_to_array(df, ORGAN_IDS)
    assert arr.shape == (16, 7)
    assert arr.dtype == np.float32
    assert set(arr[:, 6].tolist()) == {0.0, 1.0}
    assert arr[0, 3] == pytest.approx(1.0)


def test_subject_to_array_rejects_unknown_organ(tmp_path):
    path = tmp_path / "d.xlsx"
    write_xlsx(path, ["HTRA1"])
    df = load_sheets(path)["HTRA1"].copy()
    df.loc[0, "organ"] = "brain"
    with pytest.raises(ValueError):
        subject_to_array(df, ORGAN_IDS)


def test_preprocess_writes_binaries_and_manifest(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    write_all_datasets(data_dir, ["HTRA1", "HTRA2"], ["HTRB1"])
    out_dir = tmp_path / "out"

    manifest = preprocess(data_dir, out_dir)

    assert (out_dir / "manifest.json").exists()
    assert (out_dir / "clinical.json").exists()
    assert (out_dir / "scan1_ps5" / "HTRA1.bin").exists()

    ds = manifest["datasets"]["scan1_ps5"]
    assert ds["subjects"] == ["HTRA1", "HTRA2"]
    assert ds["missing"] == [f"HTRA{i}" for i in range(3, 48)]
    assert ds["voxelSizeMm"][2] == pytest.approx(2.0, abs=1e-4)

    raw = (out_dir / "scan1_ps5" / "HTRA1.bin").read_bytes()
    assert len(raw) == 16 * 7 * 4
    assert manifest["organs"] == [{"id": 0, "name": "heart"}, {"id": 1, "name": "liver"}]
    assert manifest["suvRange"][0] > 0


def test_preprocess_treats_empty_sheet_as_missing(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    write_all_datasets(data_dir, ["HTRA1"], ["HTRB1"])
    path = data_dir / "Healthy_quadra_scan_1_patch_size_5.xlsx"
    with pd.ExcelWriter(path) as writer:
        make_sheet("HTRA1").to_excel(writer, sheet_name="HTRA1", index=False)
        pd.DataFrame().to_excel(writer, sheet_name="HTRA2", index=False)
    out_dir = tmp_path / "out"

    manifest = preprocess(data_dir, out_dir)

    dataset = manifest["datasets"]["scan1_ps5"]
    assert dataset["subjects"] == ["HTRA1"]
    assert "HTRA2" in dataset["missing"]
    assert not (out_dir / "scan1_ps5" / "HTRA2.bin").exists()
