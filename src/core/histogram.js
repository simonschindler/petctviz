export function computeHistogram(values, binCount, range) {
  const counts = new Array(binCount).fill(0);
  const [low, high] = range;
  if (!(high > low) || binCount <= 0) return counts;
  const width = (high - low) / binCount;
  for (const value of values) {
    let index = Math.floor((value - low) / width);
    if (index === binCount) index = binCount - 1;
    if (index >= 0 && index < binCount) counts[index] += 1;
  }
  return counts;
}
