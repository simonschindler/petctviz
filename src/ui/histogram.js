import { sampleColormap } from "../core/colormaps.js";
import { computeHistogram } from "../core/histogram.js";
import { makeScale } from "../core/logic.js";

const WIDTH = 210;
const PLOT_HEIGHT = 62;
const LABEL_HEIGHT = 18;
const HEIGHT = PLOT_HEIGHT + LABEL_HEIGHT;
const BINS = 40;

function rgb(color) {
  return `rgb(${Math.round(color[0] * 255)}, ${Math.round(color[1] * 255)}, ${Math.round(color[2] * 255)})`;
}

export function renderHistogram(container, { organs, scaleMode, colormapName, windowRange }) {
  const values = [];
  for (const organ of organs) {
    for (const value of organ.values) values.push(value);
  }
  if (values.length === 0) {
    container.innerHTML = "";
    return;
  }

  let min = Infinity;
  let max = -Infinity;
  for (const value of values) {
    if (value < min) min = value;
    if (value > max) max = value;
  }

  const axis = makeScale(scaleMode, [min, max]);
  const series = organs.map((organ) => ({
    counts: computeHistogram(Array.from(organ.values, (value) => axis.tOf(value)), BINS, [0, 1]),
    color: makeScale(scaleMode, organ.window),
  }));

  const totals = new Array(BINS).fill(0);
  for (const { counts } of series) {
    for (let i = 0; i < BINS; i += 1) totals[i] += counts[i];
  }
  const peak = Math.max(1, ...totals);
  const barWidth = WIDTH / BINS;

  let band = "";
  if (windowRange) {
    const x0 = Math.min(1, Math.max(0, axis.tOf(windowRange[0]))) * WIDTH;
    const x1 = Math.min(1, Math.max(0, axis.tOf(windowRange[1]))) * WIDTH;
    band =
      `<rect x="${x0.toFixed(1)}" y="0" width="${(x1 - x0).toFixed(1)}" height="${PLOT_HEIGHT}" fill="rgba(255,255,255,0.08)"/>` +
      `<line x1="${x0.toFixed(1)}" y1="0" x2="${x0.toFixed(1)}" y2="${PLOT_HEIGHT}" stroke="rgba(255,255,255,0.45)" stroke-dasharray="2 2"/>` +
      `<line x1="${x1.toFixed(1)}" y1="0" x2="${x1.toFixed(1)}" y2="${PLOT_HEIGHT}" stroke="rgba(255,255,255,0.45)" stroke-dasharray="2 2"/>`;
  }

  let bars = "";
  for (let i = 0; i < BINS; i += 1) {
    if (totals[i] === 0) continue;
    const x = i * barWidth;
    const value = axis.valueAt((i + 0.5) / BINS);
    let y = PLOT_HEIGHT;
    for (const item of series) {
      const count = item.counts[i];
      if (count === 0) continue;
      const height = (count / peak) * PLOT_HEIGHT;
      y -= height;
      const color = rgb(sampleColormap(colormapName, item.color.tOf(value)));
      bars += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${(barWidth - 0.5).toFixed(2)}" height="${height.toFixed(2)}" fill="${color}"/>`;
    }
  }

  const label = (x, anchor, text) =>
    `<text x="${x}" y="${HEIGHT - 4}" text-anchor="${anchor}" fill="#8a93a6" font-size="9">${text}</text>`;

  container.innerHTML = `
    <svg width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}" role="img" aria-label="SUV distribution">
      ${band}
      ${bars}
      ${label(0, "start", min.toFixed(1))}
      ${label(WIDTH / 2, "middle", "SUV")}
      ${label(WIDTH, "end", max.toFixed(1))}
    </svg>
  `;
}
