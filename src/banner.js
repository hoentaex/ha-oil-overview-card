// Illustrated header ("banner") in the style of juju35's cards: the title, the range pill and the subtitle on a cellar
// wall at the left, the tank drawn big at the right (oil level with a moving surface, bubbles, the reserve line and
// the OilFox sensor on top), standing on a 10 px floor strip. Night picture with Home Assistant's dark theme.

/** Night picture: forced by illustration_theme, else Home Assistant's dark theme alone. */
export const isNight = (hass, config) => {
  if (config.illustration_theme === "night") return true;
  if (config.illustration_theme === "day") return false;
  return !!hass?.themes?.darkMode;
};

// The tank in the 200 × 80 scene: its box, and the oil surface as a wave of WAVE_LEN wide periods.
const TANK = { x: 112, y: 18, w: 74, h: 58, r: 12 };
const WAVE_LEN = 24;

/**
 * The surface path: from `x0`, `periods` wave lengths, closed down to the tank's bottom. It is wider than the tank by
 * at least one wave length on the side it moves towards, and the animation moves it by exactly one wave length, so
 * the oil always covers the whole tank width and the loop has no jump.
 */
export const wavePath = (x0, periods, top, amp = 2.4) => {
  let d = `M${x0} ${top.toFixed(2)} q${WAVE_LEN / 4} ${-amp} ${WAVE_LEN / 2} 0 t${WAVE_LEN / 2} 0`;
  for (let i = 1; i < periods; i++) d += ` t${WAVE_LEN / 2} 0 t${WAVE_LEN / 2} 0`;
  return `${d} V${TANK.y + TANK.h + 2} H${x0}Z`;
};

/** Oil top in scene units for a fill in % (never quite empty, so a nearly empty tank still shows its surface). */
export const oilTop = (percent) => {
  const p = percent === null || percent === undefined ? 0 : Math.max(2, Math.min(100, percent));
  return TANK.y + TANK.h * (1 - p / 100);
};

const BRICKS = (() => {
  let s = "";
  [14, 30, 46, 62].forEach((y, row) => {
    s += `<line x1="0" y1="${y}" x2="200" y2="${y}"/>`;
    for (let k = 0; k < 6; k++) {
      const x = (row % 2 ? 16 : 0) + k * 34;
      s += `<line x1="${x}" y1="${y}" x2="${x}" y2="${y + 16}"/>`;
    }
  });
  return s;
})();

/**
 * The scene: cellar wall, fill pipe, the tank with its oil, bubbles and reserve line, the OilFox on top, and the level
 * as a readout left of the tank. `uid` keeps the clip path apart from other cards in the same shadow root.
 */
export function sceneSVG({ uid, percent, reserveFrac, pctLabel, levelLabel, animate }) {
  const top = oilTop(percent);
  const { x, y, w, h, r } = TANK;
  const reserveY = reserveFrac > 0 && reserveFrac < 1 ? y + h * (1 - reserveFrac) : null;
  const bubbles = animate
    ? [
        [128, 1.4, 0],
        [150, 1.1, 1.1],
        [168, 1.6, 2],
      ]
        .map(
          ([cx, rr, delay]) =>
            `<circle class="ob-bub" cx="${cx}" cy="${y + h - 4}" r="${rr}" style="animation-delay:${delay}s"/>`,
        )
        .join("")
    : "";
  return `<svg class="scene" viewBox="0 0 200 80" preserveAspectRatio="xMaxYMax meet" aria-hidden="true">
    <defs>
      <linearGradient id="ob-oil-${uid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f0b45a"/><stop offset="1" stop-color="#b8661f"/></linearGradient>
      <clipPath id="ob-clip-${uid}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/></clipPath>
    </defs>
    <g class="ob-brick">${BRICKS}</g>
    <path class="ob-pipe" d="M${x} 30H96V22"/><rect class="ob-cap" x="92" y="18" width="8" height="5" rx="1.5"/>
    <ellipse class="ob-shadow" cx="${x + w / 2}" cy="79.6" rx="38" ry="2"/>
    <rect class="ob-foot" x="${x + 10}" y="${y + h - 2}" width="6" height="8"/><rect class="ob-foot" x="${x + w - 16}" y="${y + h - 2}" width="6" height="8"/>
    <rect class="ob-inside" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>
    <g clip-path="url(#ob-clip-${uid})">
      <path class="ob-wave back${animate ? " anim" : ""}" fill="url(#ob-oil-${uid})" d="${wavePath(64, 7, top - 0.8, 1.8)}"/>
      <path class="ob-wave front${animate ? " anim" : ""}" fill="url(#ob-oil-${uid})" d="${wavePath(64, 7, top)}"/>
      ${bubbles}
    </g>
    ${reserveY === null ? "" : `<line class="ob-reserve" x1="${x + 3}" y1="${reserveY.toFixed(2)}" x2="${x + w - 3}" y2="${reserveY.toFixed(2)}"/>`}
    <rect class="ob-tank" x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"/>
    <rect class="ob-fox" x="141" y="11" width="16" height="7" rx="2"/><circle class="ob-led" cx="145" cy="14.5" r="1.2"/>
    <path class="ob-wifi" d="M146 7Q149 4.5 152 7"/><path class="ob-wifi w2" d="M143.5 4.5Q149 0 154.5 4.5"/>
    ${pctLabel ? `<text class="ob-rd" x="106" y="50" text-anchor="end">${pctLabel}</text>` : ""}
    ${levelLabel ? `<text class="ob-rd2" x="106" y="59" text-anchor="end">${levelLabel}</text>` : ""}
  </svg>`;
}

/**
 * The status pill in the banner: right after the title when the title and the whole pill fit on that row, else on its
 * own line under the subtitle; when even that runs into the floor strip, its dot alone. Measured after each render.
 */
export function fitPill(root) {
  for (const t of root?.querySelectorAll?.(".banner .titles") || []) {
    t.classList.remove("below", "dotonly");
    const name = t.querySelector(".name");
    const pill = t.querySelector(".pill");
    if (!name || !pill || !t.clientWidth) continue;
    if (name.scrollWidth + 8 + pill.scrollWidth <= t.clientWidth + 0.5) continue;
    t.classList.add("below");
    const floor = t.closest(".banner").getBoundingClientRect().bottom - 10 + 0.5;
    if (pill.getBoundingClientRect().bottom > floor) t.classList.add("dotonly");
  }
}

export const BANNER_STYLE = `
.banner { position: relative; overflow: hidden; height: 90px; --g: 10px; --sw: min(200px, 54cqw);
          background: #efe9e1; color: #2b2118; --sky-muted: #6a5a4a; }
.banner.night { background: #2a2623; color: #fff; --sky-muted: rgba(255,255,255,.75); }
.banner .scene { position: absolute; right: 0; bottom: var(--g); height: calc(100% - var(--g)); width: var(--sw); overflow: visible;
                 -webkit-mask-image: linear-gradient(90deg, rgba(0,0,0,.35) 0, rgba(0,0,0,.35) 12%, #000 42%);
                 mask-image: linear-gradient(90deg, rgba(0,0,0,.35) 0, rgba(0,0,0,.35) 12%, #000 42%); }
.banner .floor { position: absolute; left: 0; right: 0; bottom: 0; height: var(--g);
                 background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.55) 0 1px, transparent 1px 16px), linear-gradient(90deg, #b9ada0, #9a8d80);
                 box-shadow: inset 0 2px 0 #d2c8bd; }
.banner.night .floor { background-image: repeating-linear-gradient(90deg, rgba(255,255,255,.18) 0 1px, transparent 1px 16px), linear-gradient(90deg, #3d3732, #2e2925);
                       box-shadow: inset 0 2px 0 #4a433d; }
.banner .head { position: absolute; z-index: 1; left: 0; top: 0; bottom: var(--g); right: calc(var(--sw) - 60px); display: flex; align-items: center;
                gap: 10px; padding: 8px 8px 8px 14px; min-width: 0; }
.banner .logo { background: rgba(255,255,255,.62); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--c) 28%, transparent);
                color: color-mix(in srgb, var(--c) 80%, #2b2118); }
.banner .logo .icon { width: 24px; height: 24px; }
.banner.night .logo { background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.14); color: color-mix(in srgb, var(--c) 75%, #fff); }
.banner .titles { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; justify-content: center; align-self: stretch; }
.banner .trow { display: flex; align-items: center; gap: 8px; min-width: 0; }
.banner .name { flex: 0 1 auto; min-width: 0; }
.banner .sub { font-size: 13px; color: var(--sky-muted); }
.banner .pill { flex: none; max-width: 100%; padding: 1px 8px; font-size: 11px; line-height: 16px; gap: 4px;
                background: color-mix(in srgb, var(--c) 18%, rgba(255,255,255,.78)); color: color-mix(in srgb, var(--c) 45%, #2b2118); }
.banner.night .pill { background: color-mix(in srgb, var(--c) 30%, rgba(20,14,8,.55)); color: color-mix(in srgb, var(--c) 35%, #fff); }
.banner .titles.below .trow { display: contents; }
.banner .titles.below .pill { order: 9; align-self: flex-start; margin-top: 3px; }
.banner .titles.dotonly .pill { padding: 4px; } .banner .titles.dotonly .pill > span:last-child { display: none; }
.banner .zoom { position: absolute; z-index: 2; top: 5px; right: 5px; margin: 0; width: 24px; height: 24px; border-radius: 50%; color: #5a4a3a;
                background: rgba(255,255,255,.55); box-shadow: inset 0 0 0 1px rgba(255,255,255,.7); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); }
.banner .zoom .icon { width: 15px; height: 15px; }
.banner .zoom:hover { background: rgba(255,255,255,.75); color: #2b2118; }
.banner.night .zoom { color: #fff; background: rgba(255,255,255,.12); box-shadow: inset 0 0 0 1px rgba(255,255,255,.2); }
.banner.night .zoom:hover { background: rgba(255,255,255,.22); }
.banner:has(> .zoom) .scene { right: 34px; }
.banner:has(> .zoom) .head { right: calc(var(--sw) - 24px); }
.banner:has(> .zoom) .ob-rd, .banner:has(> .zoom) .ob-rd2 { display: none; }
.banner + .content { padding-top: 14px; }
@container (max-width: 280px) { .banner .scene { display: none; } .banner .head, .banner:has(> .zoom) .head { right: 30px; } }
@container (max-width: 200px) { .banner .pill { padding: 4px; } .banner .pill > span:last-child { display: none; } }
/* The scene */
.ob-brick line { stroke: #e2d9cd; stroke-width: .7; } .night .ob-brick line { stroke: #37312c; }
.ob-pipe { fill: none; stroke: #a69684; stroke-width: 3; stroke-linecap: round; } .night .ob-pipe { stroke: #5c5148; }
.ob-cap, .ob-foot { fill: #8f7f6d; } .night .ob-cap, .night .ob-foot { fill: #5c5148; }
.ob-shadow { fill: #000; opacity: .14; } .night .ob-shadow { opacity: .35; }
.ob-inside { fill: #faf7f2; } .night .ob-inside { fill: #35302b; }
.ob-tank { fill: none; stroke: #b8a998; stroke-width: 1.4; } .night .ob-tank { stroke: #6b5f53; }
.ob-wave.back { opacity: .55; }
.ob-wave.front.anim { animation: ob-wave-l 6s linear infinite; }
.ob-wave.back.anim { animation: ob-wave-r 9s linear infinite; }
@keyframes ob-wave-l { from { transform: translateX(0); } to { transform: translateX(-${WAVE_LEN}px); } }
@keyframes ob-wave-r { from { transform: translateX(0); } to { transform: translateX(${WAVE_LEN}px); } }
.ob-bub { fill: rgba(255,240,210,.75); opacity: 0; animation: ob-bub 3.4s ease-in infinite; }
@keyframes ob-bub { 0% { transform: translateY(0); opacity: 0; } 15% { opacity: 1; } 90% { opacity: .8; } 100% { transform: translateY(-30px); opacity: 0; } }
.ob-reserve { stroke: #e05a4f; stroke-width: 1; stroke-dasharray: 3 2; }
.ob-fox { fill: #fff; stroke: #c4b8aa; } .night .ob-fox { fill: #3a3430; stroke: #5c5148; }
.ob-led { fill: #43c463; animation: ob-blink 1.2s steps(2) infinite; }
.ob-wifi { fill: none; stroke: #43a047; stroke-width: 1.2; stroke-linecap: round; animation: ob-blink 1.6s ease-in-out infinite; }
.ob-wifi.w2 { animation-delay: .3s; }
@keyframes ob-blink { 50% { opacity: .3; } }
.ob-rd { font: 700 13px var(--paper-font-body1_-_font-family, Roboto, sans-serif); fill: #c46a10; } .night .ob-rd { fill: #ffb062; }
.ob-rd2 { font: 500 6.4px var(--paper-font-body1_-_font-family, Roboto, sans-serif); fill: #6a5a4a; } .night .ob-rd2 { fill: rgba(255,255,255,.75); }
@media (prefers-reduced-motion: reduce) { .banner * { animation: none !important; } }
/* The mini card under its banner: space and litres above the reserve */
.mfacts { display: flex; flex-wrap: wrap; gap: 4px 16px; padding: 10px 16px 12px; font-size: 13px; color: var(--ooc-sub); font-variant-numeric: tabular-nums; }
.mfacts b { font-weight: 500; color: var(--ooc-text); }
/* The tank section without its picture, now drawn in the banner */
.tank.flat { grid-template-columns: minmax(0, 1fr); }
`;
