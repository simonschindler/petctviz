export function decodeSubject(buffer, options = {}) {
  const stride = options.stride ?? 7;
  const fixedOrgan = options.organId ?? 0;
  const flat = new Float32Array(buffer);
  const count = Math.floor(flat.length / stride);
  const positions = new Float32Array(count * 3);
  const suvMean = new Float32Array(count);
  const suvMin = new Float32Array(count);
  const suvMax = new Float32Array(count);
  const organId = new Uint8Array(count);
  const byOrgan = new Map();
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  for (let i = 0; i < count; i += 1) {
    const offset = i * stride;
    for (let axis = 0; axis < 3; axis += 1) {
      const value = flat[offset + axis];
      positions[i * 3 + axis] = value;
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
    let organ;
    if (stride >= 7) {
      suvMean[i] = flat[offset + 3];
      suvMin[i] = flat[offset + 4];
      suvMax[i] = flat[offset + 5];
      organ = flat[offset + 6] | 0;
    } else {
      const value = flat[offset + 3];
      suvMean[i] = value;
      suvMin[i] = value;
      suvMax[i] = value;
      organ = fixedOrgan;
    }
    organId[i] = organ;
    if (!byOrgan.has(organ)) byOrgan.set(organ, []);
    byOrgan.get(organ).push(i);
  }

  return { count, positions, suvMean, suvMin, suvMax, organId, byOrgan, bounds: { min, max } };
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`failed to load ${url}: ${response.status}`);
  return response.json();
}

export function loadManifest(baseUrl = "data") {
  return fetchJson(`${baseUrl}/manifest.json`);
}

export function loadClinical(baseUrl = "data") {
  return fetchJson(`${baseUrl}/clinical.json`);
}

export async function loadSubject(baseUrl, datasetId, subjectId, options) {
  const response = await fetch(`${baseUrl}/${datasetId}/${subjectId}.bin`);
  if (!response.ok) {
    throw new Error(`failed to load subject ${subjectId}: ${response.status}`);
  }
  const buffer = await response.arrayBuffer();
  return decodeSubject(buffer, options);
}
