// Scrubbing over a chart: a vertical line (and for line charts a dot) follows the pointer, the readout above the
// chart shows the value under it and returns to its resting text when the pointer leaves.
import { H, W } from "./charts.js";

export function scrub(plot, view, readout) {
  const hl = plot.querySelector(".hl");
  const dot = plot.querySelector(".hdot");
  const pick = (ev) => {
    const r = plot.getBoundingClientRect();
    const fx = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    let i;
    if (view.xOf) {
      const target = fx * W;
      i = 0;
      for (let k = 1; k < view.n; k++) if (Math.abs(view.xOf(k) - target) < Math.abs(view.xOf(i) - target)) i = k;
    } else i = Math.min(view.n - 1, Math.floor(fx * view.n));
    const px = view.xOf ? view.xOf(i) / W : (i + 0.5) / view.n;
    hl.hidden = false;
    hl.style.left = `${(px * 100).toFixed(2)}%`;
    if (view.yOf && dot) {
      dot.hidden = false;
      dot.style.left = `${(px * 100).toFixed(2)}%`;
      dot.style.top = `${((view.yOf(i) / (view.h || H)) * 100).toFixed(2)}%`;
    }
    readout.innerHTML = view.at(i);
  };
  plot.onpointermove = pick;
  plot.onpointerdown = pick;
  plot.onpointerleave = () => {
    hl.hidden = true;
    if (dot) dot.hidden = true;
    readout.innerHTML = view.rest;
  };
}
