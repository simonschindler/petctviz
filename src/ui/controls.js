import { COLORMAPS } from "../core/colormaps.js";

export function initControls(manifest, emit) {
  const datasetSelect = document.getElementById("dataset");
  const subjectSelect = document.getElementById("subject");
  const colormapSelect = document.getElementById("colormap");
  const organBoxes = [document.getElementById("organ-0"), document.getElementById("organ-1")];
  const thresholdInput = document.getElementById("threshold");
  const thresholdValue = document.getElementById("threshold-value");
  const fadeInput = document.getElementById("fade");
  const fadeValue = document.getElementById("fade-value");
  const clipInputs = {
    x: document.getElementById("clip-x"),
    y: document.getElementById("clip-y"),
    z: document.getElementById("clip-z"),
  };
  const clipReset = document.getElementById("clip-reset");

  for (const [id, colormap] of Object.entries(COLORMAPS)) {
    const option = document.createElement("option");
    option.value = id;
    option.textContent = colormap.label;
    colormapSelect.append(option);
  }

  for (const datasetId of Object.keys(manifest.datasets)) {
    const option = document.createElement("option");
    option.value = datasetId;
    option.textContent = manifest.datasets[datasetId].label;
    datasetSelect.append(option);
  }

  datasetSelect.addEventListener("change", () => emit("dataset", datasetSelect.value));
  subjectSelect.addEventListener("change", () => emit("subject", subjectSelect.value));
  colormapSelect.addEventListener("change", () => emit("colormap", colormapSelect.value));
  organBoxes.forEach((box, organId) => {
    box.addEventListener("change", () => emit("organ", { organId, visible: box.checked }));
  });

  const emitThreshold = () => {
    const threshold = Number(thresholdInput.value);
    const fadeWidth = Number(fadeInput.value);
    thresholdValue.textContent = threshold.toFixed(2);
    fadeValue.textContent = fadeWidth.toFixed(2);
    emit("threshold", { threshold, fadeWidth });
  };
  thresholdInput.addEventListener("input", emitThreshold);
  fadeInput.addEventListener("input", emitThreshold);

  for (const [axis, input] of Object.entries(clipInputs)) {
    input.addEventListener("input", () => emit("clip", { axis, value: Number(input.value) }));
  }
  clipReset.addEventListener("click", () => emit("resetClip"));

  return {
    values: { datasetSelect, subjectSelect, colormapSelect, clipInputs },
    setSubjects(subjects, missing) {
      subjectSelect.innerHTML = "";
      for (const subject of subjects) {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = subject;
        subjectSelect.append(option);
      }
      for (const subject of missing) {
        const option = document.createElement("option");
        option.value = subject;
        option.textContent = `${subject} (unavailable)`;
        option.disabled = true;
        subjectSelect.append(option);
      }
    },
    setBounds(bounds) {
      ["x", "y", "z"].forEach((axis, index) => {
        const input = clipInputs[axis];
        input.min = String(bounds.min[index]);
        input.max = String(bounds.max[index]);
        input.step = String((bounds.max[index] - bounds.min[index]) / 200 || 1);
        input.value = String(bounds.max[index]);
      });
    },
    setSuvRange(range) {
      const span = range[1] - range[0] || 1;
      thresholdInput.min = String(range[0]);
      thresholdInput.max = String(range[1]);
      thresholdInput.step = String(span / 200);
      thresholdInput.value = String(range[0]);
      fadeInput.min = "0";
      fadeInput.max = String(span);
      fadeInput.step = String(span / 200);
      fadeInput.value = "0";
      thresholdValue.textContent = range[0].toFixed(2);
      fadeValue.textContent = "0.00";
    },
    setClinical(rows) {
      const table = document.getElementById("clinical-table");
      table.innerHTML = "";
      if (rows.length === 0) {
        table.innerHTML = '<tr><td colspan="2">no data</td></tr>';
        return;
      }
      for (const row of rows) {
        const tr = document.createElement("tr");
        const label = document.createElement("td");
        label.textContent = row.label;
        const value = document.createElement("td");
        value.textContent = row.value === null ? "—" : String(row.value);
        tr.append(label, value);
        table.append(tr);
      }
    },
  };
}
