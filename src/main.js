import { loadClinical, loadManifest, loadSubject } from "./data/loader.js";
import { makeColorFn } from "./core/colormaps.js";
import { curatedClinical } from "./core/logic.js";
import { resolveWindow } from "./core/window.js";
import { Viewer } from "./scene/viewer.js";
import { initControls } from "./ui/controls.js";
import { initHelp } from "./ui/help.js";
import { renderHistogram } from "./ui/histogram.js";
import { renderLegend } from "./ui/legend.js";
import { attachTooltip } from "./ui/tooltip.js";

const DATA_BASE = "data";
const ORGAN_IDS = { heart: 0, liver: 1 };
const DEFAULTS = {
  datasetId: "scan1_ps3",
  colormap: "viridis",
  scale: "log",
  organVisible: { 0: false, 1: true },
  colorWindow: { scope: "organ", preset: "p5p95", target: "liver" },
};

const status = document.getElementById("status");
const legend = document.getElementById("legend");
const histogram = document.getElementById("histogram");

async function start() {
  initHelp();
  const manifest = await loadManifest(DATA_BASE);
  const clinical = await loadClinical(DATA_BASE);
  const viewer = new Viewer(document.getElementById("scene"));

  const tooltipEl = document.getElementById("tooltip");
  const ORGAN_NAMES = { 0: "heart", 1: "liver" };
  let currentSubject = null;
  attachTooltip(document.getElementById("scene"), tooltipEl, viewer, () => currentSubject);

  const state = {
    datasetId: DEFAULTS.datasetId,
    subjectId: null,
    colormap: DEFAULTS.colormap,
    scale: DEFAULTS.scale,
    threshold: manifest.suvRange[0],
    fadeWidth: 0,
    organVisible: { ...DEFAULTS.organVisible },
    colorWindow: {
      scope: DEFAULTS.colorWindow.scope,
      preset: DEFAULTS.colorWindow.preset,
      custom: {},
    },
  };

  const controls = initControls(manifest, DEFAULTS, (type, payload) => {
    handle(type, payload);
  });

  function edgeFor(datasetId) {
    const dataset = manifest.datasets[datasetId];
    return dataset.voxelSizeMm.map((size) => size * dataset.patchSize);
  }

  function colorFnFor() {
    const fns = {};
    for (const [organId, name] of Object.entries(ORGAN_NAMES)) {
      fns[organId] = makeColorFn(
        state.colormap,
        resolveWindow(manifest.suvWindows, state.colorWindow, name),
        state.scale,
      );
    }
    return (suv, organId) => (fns[organId] ?? fns[0])(suv);
  }

  function legendEntries() {
    if (state.colorWindow.scope === "organ") {
      return [
        { label: "Heart", range: resolveWindow(manifest.suvWindows, state.colorWindow, "heart") },
        { label: "Liver", range: resolveWindow(manifest.suvWindows, state.colorWindow, "liver") },
      ];
    }
    return [
      { label: "SUV mean", range: resolveWindow(manifest.suvWindows, state.colorWindow, "heart") },
    ];
  }

  function applyColorFn() {
    viewer.setColorFn(colorFnFor());
    renderLegend(legend, state.colormap, legendEntries(), state.scale);
    updateHistogram();
  }

  function updateHistogram() {
    const organs = [];
    if (currentSubject) {
      for (const [organId, name] of Object.entries(ORGAN_NAMES)) {
        if (!state.organVisible[organId]) continue;
        const id = Number(organId);
        const values = [];
        for (let i = 0; i < currentSubject.count; i += 1) {
          if (currentSubject.organId[i] === id) values.push(currentSubject.suvMean[i]);
        }
        organs.push({
          values,
          window: resolveWindow(manifest.suvWindows, state.colorWindow, name),
        });
      }
    }
    const windowRange =
      state.colorWindow.scope === "global"
        ? resolveWindow(manifest.suvWindows, state.colorWindow, "heart")
        : null;
    renderHistogram(histogram, {
      organs,
      scaleMode: state.scale,
      colormapName: state.colormap,
      windowRange,
    });
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
      viewer.setColorFn(colorFnFor());
      viewer.setThreshold(state.threshold, state.fadeWidth);
      controls.setBounds(subject.bounds);
      status.textContent = `${state.subjectId} · ${subject.count} patches`;
      updateHistogram();
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
    } else if (type === "window") {
      state.colorWindow = payload;
      applyColorFn();
    } else if (type === "organ") {
      state.organVisible[payload.organId] = payload.visible;
      viewer.setOrganVisible(payload.organId, payload.visible);
      updateHistogram();
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

  controls.setSuvWindows(manifest.suvWindows);
  controls.setSuvRange(manifest.suvRange, state.scale);
  applyColorFn();
  selectDataset(
    manifest.datasets[state.datasetId] ? state.datasetId : Object.keys(manifest.datasets)[0],
  );
}

start().catch((error) => {
  status.textContent = "failed to initialise";
  console.error(error);
});
