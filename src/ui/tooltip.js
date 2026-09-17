export function formatPatch(subject, index, organNames) {
  const count = subject?.count ?? subject?.suvMean?.length;
  if (!subject || index === null || index === undefined || index >= count) return null;
  const offset = index * 3;
  const x = subject.positions[offset].toFixed(1);
  const y = subject.positions[offset + 1].toFixed(1);
  const z = subject.positions[offset + 2].toFixed(1);
  const organ = organNames[subject.organId[index]] ?? "organ";
  return [
    `${organ} (${x}, ${y}, ${z}) mm`,
    `SUV mean ${subject.suvMean[index].toFixed(2)}`,
    `min ${subject.suvMin[index].toFixed(2)} · max ${subject.suvMax[index].toFixed(2)}`,
  ].join("\n");
}

export function attachTooltip(canvas, tooltipEl, viewer, getSubject) {
  canvas.addEventListener("pointermove", (event) => {
    const subject = getSubject();
    if (!subject) {
      tooltipEl.hidden = true;
      return;
    }
    const index = viewer.pick(event.clientX, event.clientY);
    const text = formatPatch(subject, index, getSubject().organNames ?? {});
    if (!text) {
      tooltipEl.hidden = true;
      return;
    }
    tooltipEl.hidden = false;
    tooltipEl.textContent = text;
    tooltipEl.style.left = `${event.clientX + 12}px`;
    tooltipEl.style.top = `${event.clientY + 12}px`;
  });

  canvas.addEventListener("pointerleave", () => {
    tooltipEl.hidden = true;
  });
}
