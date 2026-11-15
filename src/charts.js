// The three consumption views as SVG (600 × 150, stretched to the card's width) plus what the readout above the
// chart shows at rest and while scrubbing. Lines are 1.5 px (non-scaling) as in the sibling cards.
import { esc, fmtL, fmtNum, locale } from "./shared.js";

export const W = 600;
export const H = 150;

const line = (pts, cls, extra = "") =>
  `<polyline class="${cls}" points="${pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ")}" ${extra}/>`;
const grid = (ys) =>
  ys.map((y) => `<line class="grid" x1="0" x2="${W}" y1="${y.toFixed(1)}" y2="${y.toFixed(1)}"/>`).join("");
const niceMax = (v, step) => Math.max(step, Math.ceil((v || 0) / step) * step);

const dayLabel = (d, lang, tz) =>
  d
    .toLocaleDateString(locale(lang), { weekday: "short", day: "2-digit", month: "2-digit", timeZone: tz })
    .replace(",", "");
const shortDate = (d, lang, tz) =>
  d.toLocaleDateString(locale(lang), { day: "2-digit", month: "2-digit", timeZone: tz });
const monthLabel = (y, m, lang) =>
  new Date(Date.UTC(y, m, 15)).toLocaleDateString(locale(lang), { month: "short", year: "2-digit", timeZone: "UTC" });

const readout = (main, unit, sub) =>
  `<span class="v num">${main}<small>${esc(unit)}</small></span><span class="k num">${sub}</span>`;

/** Heating degree days of a daily mean temperature (base = heating limit, e.g. 15 °C). */
export const hdd = (temp, base) => (temp === null ? 0 : Math.max(0, base - temp));

/** 30 days: one bar per day (litres), the 7-day mean as line, the outdoor temperature dashed. */
export function daysView(rows, { t, lang, tz, base = 15 }) {
  const n = rows.length;
  const bw = W / n;
  const yMax = niceMax(Math.max(...rows.map((r) => r.used ?? 0)), 5);
  const y = (v) => H - (v / yMax) * (H - 8);
  const temps = rows.map((r) => r.temp).filter((v) => v !== null);
  const tLo = temps.length ? Math.floor(Math.min(...temps) / 5) * 5 : 0;
  const tHi = temps.length ? Math.max(tLo + 5, Math.ceil(Math.max(...temps) / 5) * 5) : 20;
  const yt = (v) => H - 6 - ((v - tLo) / (tHi - tLo)) * (H - 16);
  const bars = rows
    .map((r, i) =>
      r.used === null || r.used <= 0
        ? ""
        : `<rect class="bar" x="${(i * bw + bw * 0.18).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" y="${y(r.used).toFixed(1)}" height="${(H - y(r.used)).toFixed(1)}" rx="2"/>`,
    )
    .join("");
  const avg = rows.map((r, i) => (r.avg7 === null ? null : [(i + 0.5) * bw, y(r.avg7)])).filter(Boolean);
  const tl = rows.map((r, i) => (r.temp === null ? null : [(i + 0.5) * bw, yt(r.temp)])).filter(Boolean);
  const svg =
    grid([y(yMax / 2), y(yMax)]) +
    bars +
    (tl.length > 1 ? line(tl, "temp") : "") +
    (avg.length > 1 ? line(avg, "avg") : "");

  const used = rows.filter((r) => r.used !== null);
  const sum = used.reduce((s, r) => s + r.used, 0);
  const deg = rows.reduce((s, r) => s + hdd(r.temp, base), 0);
  const last = [...rows].reverse().find((r) => r.avg7 !== null);
  const rest = readout(
    fmtNum(last?.avg7, lang, 1),
    t("per_day_avg7"),
    esc(
      [
        t("days_sum", { n, l: fmtL(sum, lang) }),
        temps.length && deg > 0 ? t("per_hdd", { v: fmtNum(sum / deg, lang, 2) }) : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  );
  const at = (i) => {
    const r = rows[i];
    const when = dayLabel(r.start, lang, tz);
    const sub = [
      r.avg7 === null ? "" : t("avg7_is", { v: fmtNum(r.avg7, lang, 1) }),
      r.temp === null ? "" : `${fmtNum(r.temp, lang, 1)} °C`,
    ]
      .filter(Boolean)
      .join(" · ");
    return r.used === null
      ? readout("–", t("no_reading_on", { day: when }), esc(sub))
      : readout(fmtNum(r.used, lang), t("litres_on", { day: when }), esc(sub));
  };
  const step = Math.round(n / 3);
  return {
    svg,
    n,
    at,
    rest,
    note: `${shortDate(rows[0].start, lang, tz)}–${shortDate(rows[n - 1].start, lang, tz)}`,
    axis: [...new Set([0, step, 2 * step, n - 1].map((i) => Math.min(n - 1, i)))].map((i) =>
      i === n - 1 ? t("today_short") : shortDate(rows[i].start, lang, tz),
    ),
    legend: [
      ["bar", "color-mix(in srgb, var(--ooc-oil) 38%, transparent)", t("lg_per_reading")],
      ["line", "var(--ooc-oil)", t("lg_avg7")],
      ...(temps.length ? [["dash", "var(--ooc-temp)", t("lg_temp", { lo: tLo, hi: tHi })]] : []),
    ],
    hint: t("hint_days"),
  };
}

/** 12 months: this year's litres next to the same month a year earlier; the running month is lighter. */
export function monthsView(rows, { t, lang, ytd }) {
  const n = rows.length;
  const bw = W / n;
  const yMax = niceMax(Math.max(...rows.flatMap((r) => [r.used ?? 0, r.prev ?? 0])), 100);
  const y = (v) => H - (v / yMax) * (H - 8);
  let svg = grid([y(yMax / 2), y(yMax)]);
  rows.forEach((r, i) => {
    if (r.prev !== null && r.prev > 0)
      svg += `<rect class="bar prev" x="${(i * bw + bw * 0.14).toFixed(1)}" width="${(bw * 0.32).toFixed(1)}" y="${y(r.prev).toFixed(1)}" height="${(H - y(r.prev)).toFixed(1)}" rx="2"/>`;
    if (r.used !== null && r.used > 0)
      svg += `<rect class="bar cur${r.current ? " partial" : ""}" x="${(i * bw + bw * 0.5).toFixed(1)}" width="${(bw * 0.36).toFixed(1)}" y="${y(r.used).toFixed(1)}" height="${(H - y(r.used)).toFixed(1)}" rx="2"/>`;
  });
  const label = (r) => monthLabel(r.y, r.m, lang);
  const rest = readout(
    fmtNum(ytd.cur, lang),
    t("litres_in_year", { y: ytd.year }),
    esc(ytd.prev === null ? t("no_prev_ytd") : t("prev_ytd", { l: fmtL(ytd.prev, lang) })),
  );
  const at = (i) => {
    const r = rows[i];
    const name = label(r) + (r.current ? ` ${t("so_far")}` : "");
    const pct = r.used !== null && r.prev ? Math.round(((r.used - r.prev) / r.prev) * 100) : null;
    const sub =
      r.prev === null
        ? t("no_prev")
        : `${t("prev_is", { l: fmtL(r.prev, lang) })}${pct === null || r.current ? "" : ` · ${pct > 0 ? "+" : ""}${pct} %`}`;
    return readout(r.used === null ? "–" : fmtNum(r.used, lang), t("litres_in", { m: name }), esc(sub));
  };
  return {
    svg,
    n,
    at,
    rest,
    note: `${label(rows[0])} – ${label(rows[n - 1])}`,
    axis: rows.map((r, i) => (i % 2 ? "" : label(r))),
    legend: [
      ["bar", "var(--ooc-oil)", t("lg_months")],
      ["bar", "color-mix(in srgb, var(--ooc-sub) 40%, transparent)", t("lg_prev_month")],
    ],
    hint: t("hint_months"),
  };
}

/** The level over all recorded days, deliveries as green strokes, the reserve as a red band. */
export function levelView(days, { t, lang, tz, capacity, reserve, now, forecast = [] }) {
  const n = days.length;
  const t0 = days[0].start.getTime();
  const t1 = Math.max(now.getTime(), days[n - 1].start.getTime() + 864e5, ...forecast.map((p) => p.t));
  const top = niceMax(Math.max(capacity || 0, ...days.map((d) => d.end)), 500);
  const x = (tm) => ((tm - t0) / (t1 - t0)) * W;
  const y = (v) => H - (v / top) * (H - 4);
  const pts = days.map((d) => [x(d.start.getTime() + 864e5), y(d.end)]);
  let svg = grid([y(top / 2), y(top)]);
  if (reserve > 0)
    svg += `<rect class="resband" x="0" y="${y(reserve).toFixed(1)}" width="${W}" height="${(H - y(reserve)).toFixed(1)}"/><line class="resline" x1="0" x2="${W}" y1="${y(reserve).toFixed(1)}" y2="${y(reserve).toFixed(1)}"/>`;
  svg += `<polygon class="area" points="${pts[0][0].toFixed(1)},${H} ${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")} ${pts[n - 1][0].toFixed(1)},${H}"/>`;
  svg += line(pts, "lvl");
  if (forecast.length > 1)
    svg += line([[pts[n - 1][0], pts[n - 1][1]], ...forecast.slice(1).map((p) => [x(p.t), y(p.v)])], "fc");
  for (const d of days.filter((d) => d.delivered > 0)) {
    const xx = x(d.start.getTime() + 864e5).toFixed(1);
    svg += `<line class="refill" x1="${xx}" x2="${xx}" y1="${y(d.end - d.delivered).toFixed(1)}" y2="${y(d.end).toFixed(1)}"/>`;
  }
  const lastDelivery = [...days].reverse().find((d) => d.delivered > 0);
  const rest = readout(
    fmtNum(days[n - 1].end, lang),
    t("level_since", {
      d: days[0].start.toLocaleDateString(locale(lang), { month: "short", year: "numeric", timeZone: tz }),
    }),
    esc(
      lastDelivery
        ? t("last_delivery_is", {
            d: lastDelivery.start.toLocaleDateString(locale(lang), { dateStyle: "medium", timeZone: tz }),
            l: fmtL(lastDelivery.delivered, lang),
          })
        : t("no_delivery"),
    ),
  );
  const at = (i) => {
    const d = days[i];
    const sub =
      d.delivered > 0 ? t("delivery_is", { l: fmtL(d.delivered, lang) }) : t("used_is", { l: fmtL(d.used ?? 0, lang) });
    return readout(fmtNum(d.end, lang), t("litres_on", { day: dayLabel(d.start, lang, tz) }), esc(sub));
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    new Date(t0 + f * (t1 - t0)).toLocaleDateString(locale(lang), { month: "short", year: "2-digit", timeZone: tz }),
  );
  return {
    svg,
    n,
    at,
    rest,
    xOf: (i) => pts[i][0],
    yOf: (i) => pts[i][1],
    note: t("since", { d: ticks[0] }),
    axis: ticks,
    legend: [
      ["line", "var(--ooc-oil)", t("lg_level")],
      ...(forecast.length > 1 ? [["dash", "var(--ooc-oil)", t("lg_forecast")]] : []),
      ["bar", "var(--ooc-good)", t("lg_delivery")],
      ["dash", "var(--ooc-warn)", t("lg_reserve", { l: fmtL(reserve, lang) })],
    ],
    hint: t("hint_level"),
  };
}

export const PH = 130;

/**
 * Price: weekly means as a line (no forecast), the two-year mean dashed, deliveries as dots on the line.
 * `weeks` [{ start, mean }], `current` the sensor's price now, `paid` the price of the last delivery.
 */
export function priceView(weeks, { t, lang, tz, current, paid, deliveries = [], week }) {
  const n = weeks.length;
  const vals = weeks.map((w) => w.mean);
  const lo = Math.floor((Math.min(...vals) - 2) / 5) * 5;
  const hi = Math.ceil((Math.max(...vals) + 2) / 5) * 5;
  const x = (i) => (n === 1 ? W / 2 : 4 + (i / (n - 1)) * (W - 8));
  const y = (v) => PH - 4 - ((v - lo) / (hi - lo || 1)) * (PH - 12);
  const mean = vals.reduce((s, v) => s + v, 0) / n;
  const pts = weeks.map((w, i) => [x(i), y(w.mean)]);
  const gridVals = [lo, (lo + hi) / 2, hi];
  let svg = gridVals
    .map((v) => `<line class="grid" x1="0" x2="${W}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/>`)
    .join("");
  svg += `<line class="meanline" x1="0" x2="${W}" y1="${y(mean).toFixed(1)}" y2="${y(mean).toFixed(1)}"/>`;
  svg += `<polygon class="parea" points="${x(0).toFixed(1)},${PH} ${pts.map(([a, b]) => `${a.toFixed(1)},${b.toFixed(1)}`).join(" ")} ${x(n - 1).toFixed(1)},${PH}"/>`;
  svg += line(pts, "price");
  const weekOf = (d) => weeks.findIndex((w, i) => d >= w.start && (i === n - 1 || d < weeks[i + 1].start));
  const marks = deliveries.map((d) => ({ i: weekOf(d.start), litres: d.litres })).filter((m) => m.i >= 0);
  const kw = (d) => {
    const k = week(d, tz);
    return t("kw", { w: k.week, y: String(k.year).slice(2) });
  };
  const min = weeks.reduce((a, b) => (b.mean < a.mean ? b : a));
  const max = weeks.reduce((a, b) => (b.mean > a.mean ? b : a));
  const now = current ?? vals[n - 1];
  const vsPaid = paid ? Math.round(((now - paid) / paid) * 100) : null;
  const rest = readout(
    fmtNum(now, lang, 2),
    t(current !== null && current !== undefined ? "price_now" : "price_week", { w: kw(weeks[n - 1].start) }),
    esc(
      [
        t("price_lo_hi", {
          lo: fmtNum(min.mean, lang, 2),
          lw: kw(min.start),
          hi: fmtNum(max.mean, lang, 2),
          hw: kw(max.start),
        }),
        vsPaid === null ? "" : t("vs_paid", { p: `${vsPaid > 0 ? "+" : ""}${vsPaid}` }),
      ]
        .filter(Boolean)
        .join(" · "),
    ),
  );
  const at = (i) => {
    const m = marks.find((k) => k.i === i);
    // The paid price is known only for the last delivery.
    const last = marks.length && m === marks[marks.length - 1];
    const sub = m
      ? paid && last
        ? t("delivery_week", { l: fmtL(m.litres, lang), c: fmtNum((m.litres * paid) / 100, lang) })
        : t("delivery_week_np", { l: fmtL(m.litres, lang) })
      : t("price_mean", { n, v: fmtNum(mean, lang, 2) });
    return readout(fmtNum(weeks[i].mean, lang, 2), t("price_week", { w: kw(weeks[i].start) }), esc(sub));
  };
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    weeks[Math.round(f * (n - 1))].start.toLocaleDateString(locale(lang), {
      month: "short",
      year: "2-digit",
      timeZone: tz,
    }),
  );
  return {
    svg,
    n,
    h: PH,
    at,
    rest,
    marks,
    xOf: (i) => pts[i][0],
    yOf: (i) => pts[i][1],
    axis: ticks,
    legend: [
      ["line", "var(--ooc-temp)", t("lg_week_mean")],
      ...(marks.length ? [["bar", "var(--ooc-good)", t("lg_delivery")]] : []),
      ["dash", "var(--ooc-sub)", t("lg_mean_weeks", { n })],
    ],
  };
}
