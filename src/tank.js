// The tank graphic: an opaque oil fill with a slow, heavy surface (two waves drifting against each other) and a few
// small bubbles rising lazily. All motion is CSS and stops with prefers-reduced-motion or `animations: false`.

const WAVE_BACK = "M0 6 Q25 3 50 6 T100 6 T150 6 T200 6 V12 H0Z";
const WAVE_FRONT = "M0 6 Q25 9 50 6 T100 6 T150 6 T200 6 V12 H0Z";

// x position (%), size (px), rise time (s), start offset (s): fixed so the picture does not change on re-render.
const BUBBLES = [
  [18, 5, 11, -2],
  [42, 3, 14, -7],
  [63, 6, 12.5, -4],
  [30, 3.5, 16, -11],
  [76, 4, 13, -9],
];
const MINI_BUBBLES = [
  [35, 3, 10, -3],
  [62, 2.5, 13, -8],
];

const wave = (cls, d) =>
  `<svg class="wave ${cls}" viewBox="0 0 200 12" preserveAspectRatio="none"><path d="${d}"></path></svg>`;

const bubbles = (list) =>
  list
    .map(([x, s, d, delay]) => `<i class="bubble" style="--x:${x}%;--s:${s}px;--d:${d}s;--delay:${delay}s"></i>`)
    .join("");

/** Fill height in % (0–100), never quite 0 so a nearly empty tank still shows its surface. */
export const fillHeight = (percent) => (percent === null ? 0 : Math.max(1.5, Math.min(100, percent)));

/** The big tank of the card: fill, waves, bubbles, reserve line and percent label. */
export function tankHTML({ percent, reserve, capacity, label, reserveLabel, animate = true }) {
  const h = fillHeight(percent);
  const res = capacity && reserve > 0 && reserve < capacity ? (reserve / capacity) * 100 : null;
  return `<div class="tankbox${animate ? " anim" : ""}" aria-hidden="true">
    <div class="oil" style="height:${h.toFixed(1)}%">
      ${wave("back", WAVE_BACK)}${wave("front", WAVE_FRONT)}${animate ? bubbles(BUBBLES) : ""}
    </div>
    ${res === null ? "" : `<div class="reserve" style="bottom:${res.toFixed(1)}%"><span>${reserveLabel}</span></div>`}
    <div class="pct">${label}</div>
  </div>`;
}

/** The small tank of the mini card. */
export function miniTankHTML({ percent, animate = true }) {
  return `<div class="mtank${animate ? " anim" : ""}" aria-hidden="true">
    <div class="oil" style="height:${fillHeight(percent).toFixed(1)}%">${wave("front", WAVE_FRONT)}${animate ? bubbles(MINI_BUBBLES) : ""}</div>
  </div>`;
}
