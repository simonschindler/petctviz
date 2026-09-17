export const CLINICAL_FIELDS = [
  ["Cohort", "Cohort"],
  ["age", "Age"],
  ["sex", "Sex"],
  ["BMI", "BMI"],
  ["LV_uptake_pattern", "LV uptake pattern"],
  ["Non_LV_pattern", "Non-LV pattern"],
  ["Liver_pattern", "Liver pattern"],
  ["FINAL heart (auto)", "Heart (auto)"],
  ["FINAL liver (auto)", "Liver (auto)"],
  ["path_ns_group", "Path NS group"],
];

export function normalizeSuv(value, range) {
  const [low, high] = range;
  if (high <= low) return 0;
  return Math.min(1, Math.max(0, (value - low) / (high - low)));
}

export function computeOpacity(suv, threshold, fadeWidth) {
  if (fadeWidth <= 0) return suv >= threshold ? 1 : 0;
  const t = (suv - (threshold - fadeWidth)) / fadeWidth;
  return Math.min(1, Math.max(0, t));
}

export function curatedClinical(record) {
  if (!record) return [];
  return CLINICAL_FIELDS.map(([key, label]) => ({
    label,
    value: record[key] === undefined ? null : record[key],
  }));
}
