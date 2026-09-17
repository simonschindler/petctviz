import { loadClinical, loadManifest, loadSubject } from "./data/loader.js";
import { makeColorFn } from "./core/colormaps.js";
import { curatedClinical } from "./core/logic.js";
import { Viewer } from "./scene/viewer.js";
import { initControls } from "./ui/controls.js";
import { renderLegend } from "./ui/legend.js";
import { attachTooltip } from "./ui/tooltip.js";

const DATA_BASE = "data";
const ORGAN_IDS = { heart: 0, liver: 1 };

const status = document.getElementById("status");
const legend = document.getElementById("legend");

async function start() {
  const manifest = await loadManifest(DATA_BASE);
  const clinical = await loadClinical(DATA_BASE);
  const viewer = new Viewer(document.getElementById("scene"));

  const tooltipEl = document.getElementById("tooltip");
  const ORGAN_NAMES = { 0: "heart", 1: "liver" };
  let currentSubject = null;
  attachTooltip(document.getElementById("scene"), tooltipEl, viewer, () => currentSubject);

  const state = {
    datasetId: Object.keys(manifest.datasets)[0],
    subjectId: null,
    colormap: "pet",
    scale: "log",
    threshold: manifest.suvRange[0],
    fadeWidth: 0,
    organVisible: { 0: true, 1: true },
  };

  const controls = initControls(manifest, (type, payload) => {
    handle(type, payload);
  });

  function edgeFor(datasetId) {
    const dataset = manifest.datasets[datasetId];
    return dataset.voxelSizeMm.map((size) => size * dataset.patchSize);
  }

  function applyColorFn() {
    viewer.setColorFn(makeColorFn(state.colormap, manifest.suvRange, state.scale));
    renderLegend(legend, state.colormap, manifest.suvRange, state.scale);
  }

  async function showSubject() {
    if (!state.subjectId) return;
    status.textContent = `loading ${state.subjectId}…`;
    try {
      const subject = await loadSubject(DATA_BASE, state.datasetId, state.subjectId);
      subject.organNames = ORGAN_NAMES;
      currentSubject = subject;
      viewer.setSubject(subject, edgeFor(state.datasetId));
      viewer.resetClip();
      for (const [organId, visible] of Object.entries(state.organVisible)) {
        viewer.setOrganVisible(Number(organId), visible);
      }
      viewer.setColorFn(makeColorFn(state.colormap, manifest.suvRange, state.scale));
      viewer.setThreshold(state.threshold, state.fadeWidth);
      controls.setBounds(subject.bounds);
      status.textContent = `${state.subjectId} · ${subject.count} patches`;
    } catch (error) {
      status.textContent = `could not load ${state.subjectId}`;
      console.error(error);
    }
  }

  function selectDataset(datasetId) {
    state.datasetId = datasetId;
    const dataset = manifest.datasets[datasetId];
    controls.setSubjects(dataset.subjects, dataset.missing);
    state.subjectId = dataset.subjects[0] ?? null;
    controls.setClinical(curatedClinical(clinical[state.subjectId] ?? null));
    showSubject();
  }

  function handle(type, payload) {
    if (type === "dataset") {
      selectDataset(payload);
    } else if (type === "subject") {
      state.subjectId = payload;
      controls.setClinical(curatedClinical(clinical[payload] ?? null));
      showSubject();
    } else if (type === "colormap") {
      state.colormap = payload;
      applyColorFn();
    } else if (type === "scale") {
      state.scale = payload;
      controls.setScale(payload);
      applyColorFn();
    } else if (type === "organ") {
      state.organVisible[payload.organId] = payload.visible;
      viewer.setOrganVisible(payload.organId, payload.visible);
    } else if (type === "threshold") {
      state.threshold = payload.threshold;
      state.fadeWidth = payload.fadeWidth;
      viewer.setThreshold(payload.threshold, payload.fadeWidth);
    } else if (type === "clip") {
      viewer.setClip(payload.axis, payload.value);
    } else if (type === "resetClip") {
      viewer.resetClip();
      if (viewer.subject) controls.setBounds(viewer.subject.bounds);
    }
  }

  controls.setSuvRange(manifest.suvRange, state.scale);
  applyColorFn();
  selectDataset(state.datasetId);
}

start().catch((error) => {
  status.textContent = "failed to initialise";
  console.error(error);
});
