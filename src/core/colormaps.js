import { makeScale } from "./logic.js";

export const COLORMAPS = {
  pet: {
    label: "PET hot",
    stops: [
      [0.0, [0, 0, 0]],
      [0.25, [0.5, 0, 0]],
      [0.5, [1.0, 0.35, 0]],
      [0.75, [1.0, 0.85, 0.2]],
      [1.0, [1, 1, 1]],
    ],
  },
  viridis: {
    label: "Viridis",
    stops: [
      [0.0, [0.267, 0.005, 0.329]],
      [0.25, [0.23, 0.322, 0.546]],
      [0.5, [0.128, 0.567, 0.551]],
      [0.75, [0.369, 0.789, 0.383]],
      [1.0, [0.993, 0.906, 0.144]],
    ],
  },
  gray: {
    label: "Grayscale",
    stops: [
      [0.0, [0, 0, 0]],
      [1.0, [1, 1, 1]],
    ],
  },
};

export function sampleColormap(name, t) {
  const colormap = COLORMAPS[name] ?? COLORMAPS.pet;
  const stops = colormap.stops;
  const x = Math.min(1, Math.max(0, t));
  for (let i = 1; i < stops.length; i += 1) {
    const [position, color] = stops[i];
    if (x <= position) {
      const [prevPosition, prevColor] = stops[i - 1];
      const span = position - prevPosition;
      const f = span === 0 ? 0 : (x - prevPosition) / span;
      return [
        prevColor[0] + (color[0] - prevColor[0]) * f,
        prevColor[1] + (color[1] - prevColor[1]) * f,
        prevColor[2] + (color[2] - prevColor[2]) * f,
      ];
    }
  }
  return stops[stops.length - 1][1].slice();
}

export function makeColorFn(name, range, scaleMode = "linear") {
  const scale = makeScale(scaleMode, range);
  return (suv) => sampleColormap(name, scale.tOf(suv));
}
