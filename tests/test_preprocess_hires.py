import json

import h5py
import numpy as np
import pytest

from scripts.preprocess_hires import (
    load_voxels,
    preprocess_hires,
    subject_array,
    voxel_spacing,
)


def write_fake_h5ad(path, subjects, per=4):
    with h5py.File(path, "w") as handle:
        handle.create_dataset(
            "obs/patient_id/categories", data=np.array([s.encode() for s in subjects])
        )
        codes = np.repeat(np.arange(len(subjects)), per).astype("int32")
        handle.create_dataset("obs/patient_id/codes", data=codes)
        x = (np.arange(per) * 1.5).astype("float32")
        y = np.repeat(np.arange(len(subjects)) * 10.0, per).astype("float32")
        spatial = np.stack(
            [np.tile(x, len(subjects)), y, np.zeros(len(subjects) * per, "float32")], axis=1
        )
        handle.create_dataset("obsm/spatial", data=spatial)
        handle.create_dataset(
            "X", data=np.arange(len(subjects) * per, dtype="float32").reshape(-1, 1)
        )


def test_voxel_spacing():
    spatial = np.array([[0, 0, 0], [1.5, 0, 0], [1.5, 2.0, 0], [0, 0, 3.0]], dtype="float32")
    assert voxel_spacing(spatial) == [1.5, 2.0, 3.0]


def test_subject_array(tmp_path):
    path = tmp_path / "x.h5ad"
    write_fake_h5ad(path, ["HTRA1", "HTRA2"], per=3)
    patients, codes, spatial, suv = load_voxels(path)
    array = subject_array(spatial, suv, codes, patients.index("HTRA2"))
    assert array.shape == (3, 4)
    assert array.dtype == np.float32
    assert array[0, 3] == pytest.approx(3.0)
    assert array[0, 0] == pytest.approx(0.0)
    assert array[1, 0] == pytest.approx(1.5)


def test_preprocess_hires_merges_manifest(tmp_path):
    data_dir = tmp_path / "data"
    data_dir.mkdir()
    out_dir = tmp_path / "out"
    out_dir.mkdir()
    write_fake_h5ad(data_dir / "Healthy_Test_Retest_First_Scan.h5ad", ["HTRA1", "HTRA2"], per=2)
    write_fake_h5ad(data_dir / "Healthy_Test_Retest_Second_Scan.h5ad", ["HTRB1"], per=2)
    (out_dir / "manifest.json").write_text(
        json.dumps({"organs": [], "suvRange": [0, 1], "datasets": {}})
    )

    manifest = preprocess_hires(data_dir, out_dir)

    dataset = manifest["datasets"]["scan1_vox"]
    assert dataset["subjects"] == ["HTRA1", "HTRA2"]
    assert dataset["strideFloats"] == 4
    assert dataset["mode"] == "voxel"
    assert dataset["patchSize"] == 1
    assert dataset["voxelSizeMm"] == [1.5, 1.0, 1.0]
    assert "HTRA3" in dataset["missing"]
    assert (out_dir / "scan1_vox" / "HTRA1.bin").exists()
    assert len((out_dir / "scan1_vox" / "HTRA1.bin").read_bytes()) == 2 * 4 * 4
    assert "scan2_vox" in manifest["datasets"]
    assert manifest["suvRange"] == [0, 1]
