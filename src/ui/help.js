const GAP = 8;

export function computeTooltipPosition(anchor, tip, viewport) {
  let left = anchor.right + GAP;
  if (left + tip.width > viewport.width - GAP) {
    left = anchor.left - tip.width - GAP;
  }
  if (left < GAP) left = GAP;
  let top = anchor.top;
  if (top + tip.height > viewport.height - GAP) {
    top = viewport.height - tip.height - GAP;
  }
  if (top < GAP) top = GAP;
  return { left, top };
}

export function initHelp(root = document) {
  const targets = root.querySelectorAll("[data-help]");
  if (targets.length === 0) return { hide: () => {} };

  const tooltip = document.createElement("div");
  tooltip.id = "help-tooltip";
  tooltip.hidden = true;
  document.body.append(tooltip);

  const hide = () => {
    tooltip.hidden = true;
  };

  const show = (icon) => {
    tooltip.textContent = icon.dataset.help;
    tooltip.hidden = false;
    const position = computeTooltipPosition(
      icon.getBoundingClientRect(),
      tooltip.getBoundingClientRect(),
      { width: window.innerWidth, height: window.innerHeight },
    );
    tooltip.style.left = `${position.left}px`;
    tooltip.style.top = `${position.top}px`;
  };

  for (const target of targets) {
    const icon = document.createElement("span");
    icon.className = "help";
    icon.textContent = "?";
    icon.tabIndex = 0;
    icon.setAttribute("role", "img");
    icon.setAttribute("aria-label", target.dataset.help);
    icon.dataset.help = target.dataset.help;
    icon.addEventListener("pointerenter", () => show(icon));
    icon.addEventListener("pointerleave", hide);
    icon.addEventListener("focus", () => show(icon));
    icon.addEventListener("blur", hide);
    icon.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    target.append(icon);
  }

  window.addEventListener("scroll", hide, true);
  return { hide };
}
