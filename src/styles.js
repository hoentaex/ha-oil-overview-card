// Styles of both cards. Colors come from the HA theme; the accent colors are --ooc-* variables with defaults.
// Colored text is mixed with the theme's text color so it stays readable on light and dark themes.

export const STYLE = `
:host {
  display: block;
  --ooc-oil: var(--ooc-oil-color, #f0a04b);
  --ooc-good: var(--ooc-good-color, #5fd08a);
  --ooc-warn: var(--ooc-warn-color, #ff8f8f);
  --ooc-bad: var(--ooc-bad-color, #ff6b6b);
  --ooc-temp: var(--ooc-temp-color, #6ea8ff);
  --ooc-text: var(--primary-text-color, #212121);
  --ooc-sub: var(--secondary-text-color, #727272);
  --ooc-card: var(--ha-card-background, var(--card-background-color, #fff));
  --ooc-tile: var(--secondary-background-color, rgba(127, 127, 127, 0.08));
  --ooc-line: var(--divider-color, rgba(127, 127, 127, 0.25));
  --ooc-accent: var(--primary-color, #03a9f4);
}
ha-card { overflow: hidden; container-type: inline-size; color: var(--ooc-text); }
button { font: inherit; color: inherit; }
button:focus-visible { outline: 2px solid var(--ooc-accent); outline-offset: 2px; }
.icon { width: 18px; height: 18px; fill: currentColor; flex: none; }
.num { font-variant-numeric: tabular-nums; }
.muted { color: var(--ooc-sub); }

/* header */
.header { display: flex; align-items: center; gap: 12px; padding: 16px 16px 12px; }
.logo { width: 40px; height: 40px; border-radius: 50%; flex: none; display: grid; place-items: center; color: var(--c); background: color-mix(in srgb, var(--c) 16%, transparent); }
.logo .icon { width: 22px; height: 22px; }
.titles { flex: 1 1 0; min-width: 72px; }
.name { font-size: 16px; font-weight: 500; line-height: 1.25; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.sub { font-size: 12px; color: var(--ooc-sub); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pill { flex: 0 1 auto; min-width: 0; max-width: 55%; overflow: hidden; display: inline-flex; align-items: center; gap: 6px; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 500; white-space: nowrap; background: color-mix(in srgb, var(--c) 15%, transparent); color: color-mix(in srgb, var(--c) 62%, var(--ooc-text)); }
.pill > span:last-child { overflow: hidden; text-overflow: ellipsis; }
.dot { width: 7px; height: 7px; border-radius: 50%; background: var(--c); flex: none; display: inline-block; }

.content { padding: 4px 16px 16px; display: flex; flex-direction: column; gap: 20px; }
.section-title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 500; text-transform: uppercase; letter-spacing: .04em; color: var(--ooc-sub); margin-bottom: 10px; }
.section-title .icon { width: 16px; height: 16px; }
.section-title .note { margin-left: auto; text-transform: none; letter-spacing: 0; font-weight: 400; font-size: 12px; }
.empty { font-size: 13px; color: var(--ooc-sub); padding: 4px 0; display: flex; gap: 8px; align-items: flex-start; }
.empty .icon { color: var(--ooc-warn); }

/* tank */
.tank { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 18px; align-items: center; }
.tankbox { position: relative; height: 150px; border-radius: 22px; border: 2px solid var(--ooc-line); overflow: hidden; background: var(--ooc-tile); }
.oil { --oil-top: color-mix(in srgb, var(--ooc-oil) 88%, var(--ooc-tile)); --oil-bot: color-mix(in srgb, var(--ooc-oil) 52%, #3a2008);
       position: absolute; left: 0; right: 0; bottom: 0; background: linear-gradient(180deg, var(--oil-top), var(--oil-bot)); transition: height .8s ease; }
.oil::after { content: ""; position: absolute; inset: 0 auto 0 10%; width: 14%; pointer-events: none;
              background: linear-gradient(90deg, transparent, color-mix(in srgb, #fff 16%, transparent), transparent); }
.wave { position: absolute; left: 0; bottom: calc(100% - 1px); width: 200%; height: 9px; display: block; }
.wave path { fill: var(--oil-top); }
.wave.back { opacity: .45; height: 11px; }
.anim .wave.front { animation: ooc-wave 11s linear infinite; }
.anim .wave.back { animation: ooc-wave 17s linear infinite reverse; }
@keyframes ooc-wave { from { transform: translateX(0); } to { transform: translateX(-50%); } }
.bubble { position: absolute; bottom: 4%; width: var(--s); height: var(--s); left: var(--x); border-radius: 50%; opacity: 0;
          background: radial-gradient(circle at 35% 30%, color-mix(in srgb, #fff 70%, transparent) 0 25%, color-mix(in srgb, #fff 12%, transparent) 60%);
          box-shadow: inset 0 0 0 .8px color-mix(in srgb, #fff 45%, transparent);
          animation: ooc-rise var(--d) cubic-bezier(.45,.05,.55,.95) var(--delay) infinite; }
@keyframes ooc-rise {
  0% { bottom: 3%; opacity: 0; transform: translateX(0) scale(.7); }
  12% { opacity: .85; }
  50% { transform: translateX(3px) scale(.9); }
  85% { opacity: .75; }
  100% { bottom: 92%; opacity: 0; transform: translateX(-2px) scale(1); }
}
@media (prefers-reduced-motion: reduce) { .wave { animation: none !important; } .bubble { display: none; } }
.reserve { position: absolute; left: 0; right: 0; border-top: 1.5px dashed var(--ooc-warn); z-index: 1; }
.reserve span { position: absolute; right: 16px; top: 3px; font-size: 9px; color: var(--ooc-warn); }
.pct { position: absolute; inset: 0; display: grid; place-items: center; font-size: 20px; font-weight: 600; z-index: 2;
       text-shadow: 0 1px 2px color-mix(in srgb, var(--ooc-card) 70%, transparent); font-variant-numeric: tabular-nums; }
.big { font-size: 32px; font-weight: 500; line-height: 1.1; letter-spacing: -.01em; font-variant-numeric: tabular-nums; }
.big small { font-size: 16px; color: var(--ooc-sub); font-weight: 400; margin-left: 4px; }
.of { font-size: 13px; color: var(--ooc-sub); margin-top: 2px; }
.facts { display: grid; gap: 6px; margin-top: 12px; font-size: 13px; }
.facts div { display: flex; justify-content: space-between; gap: 10px; }
.facts span { color: var(--ooc-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.facts b.warn { color: color-mix(in srgb, var(--ooc-warn) 62%, var(--ooc-text)); }
.facts b { font-weight: 500; white-space: nowrap; font-variant-numeric: tabular-nums; }
@container (max-width: 360px) { .tank { grid-template-columns: 72px minmax(0, 1fr); gap: 12px; } .tankbox { height: 130px; } .big { font-size: 26px; } }

/* consumption panel */
.panel { border-radius: 12px; padding: 14px 16px; background: var(--ooc-tile); display: flex; flex-direction: column; gap: 10px; }
.seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 14px; background: color-mix(in srgb, var(--ooc-text) 5%, transparent); }
.seg button { font-size: 13px; font-weight: 500; border: 0; border-radius: 10px; min-height: 36px; cursor: pointer; padding: 0 6px; background: transparent; }
.seg button:hover:not([aria-pressed="true"]) { background: color-mix(in srgb, var(--ooc-text) 8%, transparent); }
.seg button[aria-pressed="true"] { background: var(--ooc-oil); color: #1b130a; }
/* Always exactly two lines (value, then details) so nothing jumps while scrubbing. */
.readout { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; height: 50px; min-width: 0; }
.readout > span { max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.readout .v { font-size: 24px; font-weight: 500; line-height: 1.2; }
.readout .v small { font-size: 13px; color: var(--ooc-sub); font-weight: 400; margin-left: 4px; }
.readout .k { font-size: 12px; color: var(--ooc-sub); }
.plot { position: relative; height: 150px; touch-action: pan-y; cursor: crosshair; }
.plot svg { display: block; width: 100%; height: 100%; overflow: visible; }
.plot .grid { stroke: var(--ooc-line); stroke-width: 1; vector-effect: non-scaling-stroke; }
.plot .bar { fill: color-mix(in srgb, var(--ooc-oil) 38%, transparent); }
.plot .bar.cur { fill: var(--ooc-oil); }
.plot .bar.cur.partial { fill-opacity: .55; }
.plot .bar.prev { fill: color-mix(in srgb, var(--ooc-sub) 40%, transparent); }
.plot polyline { fill: none; stroke-width: 1.5; stroke-linejoin: round; stroke-linecap: round; vector-effect: non-scaling-stroke; }
.plot .avg, .plot .lvl { stroke: var(--ooc-oil); }
.plot .temp { stroke: var(--ooc-temp); stroke-dasharray: 3 3; }
.plot .area { fill: color-mix(in srgb, var(--ooc-oil) 18%, transparent); }
.plot .refill { stroke: var(--ooc-good); stroke-width: 3; vector-effect: non-scaling-stroke; }
.plot .resband { fill: color-mix(in srgb, var(--ooc-warn) 10%, transparent); }
.plot .resline { stroke: var(--ooc-warn); stroke-width: 1; stroke-dasharray: 4 3; vector-effect: non-scaling-stroke; }
.plot .hl { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--ooc-sub); pointer-events: none; }
.plot .hdot { position: absolute; width: 10px; height: 10px; margin: -5px 0 0 -5px; border-radius: 50%; box-sizing: border-box; pointer-events: none; background: var(--ooc-card); border: 2.5px solid var(--ooc-text); }
.axis { display: flex; justify-content: space-between; font-size: 11px; color: var(--ooc-sub); font-variant-numeric: tabular-nums; min-height: 14px; }
.legend { display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 12px; color: var(--ooc-sub); }
.legend span { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; flex: none; }
.sw.bar { width: 12px; height: 12px; border-radius: 3px; background: var(--sw); }
.sw.line { width: 16px; height: 2px; border-radius: 1px; background: var(--sw); }
.sw.dash { width: 16px; height: 0; border-top: 2px dashed var(--sw); }
.hint { font-size: 12px; color: var(--ooc-sub); line-height: 1.45; }

/* mini card */
.mini { display: flex; align-items: center; gap: 14px; padding: 12px 16px; min-width: 0; }
.mtank { width: 30px; height: 46px; border-radius: 9px; border: 2px solid var(--ooc-line); position: relative; overflow: hidden; flex: none; background: var(--ooc-tile); }
.mtank .wave { height: 5px; }
.mmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
.mtop { display: flex; align-items: center; gap: 8px; min-width: 0; }
.mtop .name { flex: 0 1 auto; min-width: 0; }
.mtop .pill { flex: none; max-width: 70%; }
.mdetail { font-size: 13px; color: var(--ooc-sub); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-variant-numeric: tabular-nums; }
.mdetail b { font-weight: 500; color: var(--ooc-text); }
@container (max-width: 300px) { .mini .pill { display: none; } }
`;
