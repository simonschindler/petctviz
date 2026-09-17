import { sampleColormap } from "../core/colormaps.js";
import { makeScale } from "../core/logic.js";

export function renderLegend(container, colormapName, range, scaleMode = "linear") {
  const scale = makeScale(scaleMode, range);
  const gradient = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const [r, g, b] = sampleColormap(colormapName, t);
    const color = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    gradient.push(`${color} ${Math.round(t * 100)}%`);
  }
  const ticks = [0, 0.25, 0.5, 0.75, 1]
    .map((t) => {
      const value = scale.valueAt(t);
      return `<span>${value < 1 ? value.toFixed(2) : value.toFixed(1)}</span>`;
    })
    .join("");
  container.innerHTML = `
    <div>SUV mean · ${scaleMode === "log" ? "log" : "linear"}</div>
    <div class="bar" style="background: linear-gradient(90deg, ${gradient.join(", ")});"></div>
    <div class="ticks">${ticks}</div>
  `;
}
