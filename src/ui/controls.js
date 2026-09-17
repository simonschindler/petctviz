import { COLORMAPS } from "../core/colormaps.js";
import { makeScale } from "../core/logic.js";

export function initControls(manifest, emit) {
  const datasetSelect = document.getElementById("dataset");
  const subjectSelect = document.getElementById("subject");
  const colormapSelect = document.getElementById("colormap");
  const scaleSelect = document.getElementById("scale");
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

  for (const input of Object.values(clipInputs)) input.disabled = true;
  clipReset.disabled = true;

  let suvRange = [0, 1];
  let scaleMode = scaleSelect.value;
  let scale = makeScale(scaleMode, suvRange);
  let currentThreshold = suvRange[0];
  let currentFadeWidth = 0;

  const thresholdFromSlider = () => scale.valueAt(Number(thresholdInput.value));
  const fadeFromSlider = () => scale.valueAt(Number(fadeInput.value)) - suvRange[0];
  const syncThresholdDisplay = () => {
    thresholdValue.textContent = thresholdFromSlider().toFixed(2);
    fadeValue.textContent = fadeFromSlider().toFixed(2);
  };
  const positionSliders = () => {
    thresholdInput.value = String(scale.tOf(currentThreshold));
    fadeInput.value = String(scale.tOf(currentFadeWidth + suvRange[0]));
  };

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
  scaleSelect.addEventListener("change", () => emit("scale", scaleSelect.value));
  organBoxes.forEach((box, organId) => {
    box.addEventListener("change", () => emit("organ", { organId, visible: box.checked }));
  });

  const emitThreshold = () => {
    currentThreshold = thresholdFromSlider();
    currentFadeWidth = fadeFromSlider();
    syncThresholdDisplay();
    emit("threshold", { threshold: currentThreshold, fadeWidth: currentFadeWidth });
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
        input.disabled = false;
      });
      clipReset.disabled = false;
    },
    setSuvRange(range, mode = scaleMode) {
      suvRange = range;
      scaleMode = mode;
      scale = makeScale(scaleMode, suvRange);
      currentThreshold = suvRange[0];
      currentFadeWidth = 0;
      for (const input of [thresholdInput, fadeInput]) {
        input.min = "0";
        input.max = "1";
        input.step = "0.001";
      }
      positionSliders();
      syncThresholdDisplay();
    },
    setScale(mode) {
      scaleMode = mode;
      scale = makeScale(scaleMode, suvRange);
      positionSliders();
      syncThresholdDisplay();
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
