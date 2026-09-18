export function presetRange(spec, preset) {
  if (preset === "p1p99") return [spec.p1, spec.p99];
  if (preset === "p5p95") return [spec.p5, spec.p95];
  return [spec.min, spec.max];
}

export function clampWindow(low, high, spec) {
  let lo = Math.min(low, high);
  let hi = Math.max(low, high);
  lo = Math.min(Math.max(lo, spec.min), spec.max);
  hi = Math.min(Math.max(hi, spec.min), spec.max);
  if (hi <= lo) {
    hi = Math.min(spec.max, lo + Math.max((spec.max - spec.min) * 0.01, 1e-6));
  }
  return [lo, hi];
}

export function resolveWindow(suvWindows, { scope, preset, custom }, organName) {
  const perOrgan = scope === "organ";
  const spec = perOrgan
    ? (suvWindows.organs?.[organName] ?? suvWindows.global)
    : suvWindows.global;
  if (preset === "custom") {
    const range = custom?.[perOrgan ? organName : "global"];
    if (range) return clampWindow(range[0], range[1], spec);
    return presetRange(spec, "p1p99");
  }
  return presetRange(spec, preset);
}
