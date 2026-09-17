import { sampleColormap } from "../core/colormaps.js";

export function renderLegend(container, colormapName, range) {
  const stops = [];
  for (let i = 0; i <= 20; i += 1) {
    const t = i / 20;
    const [r, g, b] = sampleColormap(colormapName, t);
    const color = `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
    stops.push(`${color} ${Math.round(t * 100)}%`);
  }
  container.innerHTML = `
    <div>SUV mean</div>
    <div class="bar" style="background: linear-gradient(90deg, ${stops.join(", ")});"></div>
    <div class="labels"><span>${range[0].toFixed(2)}</span><span>${range[1].toFixed(2)}</span></div>
  `;
}
