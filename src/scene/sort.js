export function distanceSquared(positions, index, origin) {
  const offset = index * 3;
  const dx = positions[offset] - origin.x;
  const dy = positions[offset + 1] - origin.y;
  const dz = positions[offset + 2] - origin.z;
  return dx * dx + dy * dy + dz * dz;
}

export function sortBackToFront(order, positions, origin) {
  order.sort(
    (a, b) => distanceSquared(positions, b, origin) - distanceSquared(positions, a, origin),
  );
  return order;
}
