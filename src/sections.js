// HTML of the range section (scenarios on one time axis) and the 12-month comparison (litres, heating degree days,
// litres per degree day, summer base load, and a row per month with Δ badges).
import { daysUntil } from "./forecast.js";
import { svgIcon } from "./icons.js";
import { esc, fmtL, fmtMonthYear, fmtNum, locale } from "./shared.js";

const title = (icon, text, note = "") =>
  `<div class="section-title">${svgIcon(icon)}<span>${esc(text)}</span>${note ? `<span class="note">${esc(note)}</span>` : ""}</div>`;

/** Δ badge: more is red, less is green; `neutral` (degree days) is blue. */
export const badge = (cur, prev, neutral = false) => {
  if (cur === null || prev === null || !prev) return "";
  const q = Math.round(((cur - prev) / prev) * 100);
  const tone = neutral || q === 0 ? "neutral" : q > 0 ? "up" : "down";
  return `<span class="badge ${tone}">${q > 0 ? "+" : ""}${q} %</span>`;
};

export function rangeSection(scen, { t, lang, tz, now, reserve }) {
  if (!scen.length) return "";
  const main = scen[0];
  const solid = scen.filter((s) => !s.dim);
  const ends = scen.map((s) => s.emptyAt).filter(Boolean);
  const end = new Date(Math.max(...ends.map((d) => d.getTime()), now.getTime() + 365 * 864e5) + 45 * 864e5);
  const span = end - now;
  const pos = (d) => ((d.getTime() - now.getTime()) / span) * 100;
  const monthW = ((30.44 * 864e5) / span) * 100;
  const earliest = solid.filter((s) => s.reserveAt).reduce((a, b) => (a && a.reserveAt <= b.reserveAt ? a : b), null);
  const head = main.emptyAt
    ? `<span class="v num">${fmtNum(daysUntil(main.emptyAt, now), lang)}<small>${esc(t("range_days", { d: fmtMonthYear(main.emptyAt, lang, tz) }))}</small></span>`
    : `<span class="v">&gt; 6<small>${esc(t("range_years"))}</small></span>`;
  const sub = earliest
    ? t(earliest.reserveAt <= now ? "order_now" : "order_by", {
        d: fmtMonthYear(earliest.reserveAt, lang, tz),
        s: t(`sc_${earliest.id}`),
        l: fmtL(reserve, lang),
      })
    : "";
  const rows = scen
    .map((s) => {
      if (!s.emptyAt) return "";
      const w = Math.min(100, pos(s.emptyAt));
      const rp = s.reserveAt ? Math.max(0, Math.min(100, (pos(s.reserveAt) / w) * 100)) : 100;
      const tip = s.reserveAt ? t("reserve_on", { d: fmtMonthYear(s.reserveAt, lang, tz) }) : "";
      return `<div class="rrow${s.main ? " main" : ""}${s.dim ? " dim" : ""}" title="${esc(tip)}">
        <span class="rl">${esc(t(`sc_${s.id}`))}</span>
        <span class="rtrack" style="--mw:${monthW.toFixed(3)}%"><span class="ticks"></span><span class="rbar" style="width:${w.toFixed(2)}%;--rp:${rp.toFixed(1)}%"></span><span class="today"></span></span>
        <span class="rv num">${esc(fmtMonthYear(s.emptyAt, lang, tz))}</span></div>`;
    })
    .join("");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) =>
    f === 0
      ? t("today_short")
      : new Date(now.getTime() + span * f).toLocaleDateString(locale(lang), {
          month: "short",
          year: "2-digit",
          timeZone: tz,
        }),
  );
  return `<section>
    ${title("calendar", t("range"), t("range_note"))}
    <div class="panel">
      <div class="readout">${head}<span class="k">${esc(sub)}</span></div>
      <div class="range">${rows}
        <div class="raxis"><span></span><div>${ticks.map((x) => `<span>${esc(x)}</span>`).join("")}</div><span></span></div>
      </div>
      <div class="legend"><span><i class="sw bar" style="--sw:var(--ooc-oil)"></i>${esc(t("lg_above_reserve"))}</span><span><i class="sw bar" style="--sw:color-mix(in srgb, var(--ooc-warn) 55%, transparent)"></i>${esc(t("lg_reserve", { l: fmtL(reserve, lang) }))}</span><span><i class="sw line" style="--sw:var(--ooc-text)"></i>${esc(t("today_short"))}</span></div>
      <div class="hint">${esc(t("hint_range"))}</div>
    </div>
  </section>`;
}

const monthName = (r, lang) =>
  new Date(Date.UTC(r.y, r.m, 15)).toLocaleDateString(locale(lang), { month: "short", timeZone: "UTC" });

export function compareSection(months, { t, lang }) {
  const both = months.filter((r) => r.used !== null && r.prev !== null);
  const head = title("chart", t("compare"), t("compare_note"));
  if (!both.length) return `<section>${head}<div class="empty">${esc(t("compare_none"))}</div></section>`;
  const sum = (rows, k) => rows.reduce((s, r) => s + r[k], 0);
  const cur = sum(both, "used");
  const prev = sum(both, "prev");
  const withHdd = both.filter((r) => r.hdd !== null && r.prevHdd !== null);
  const hc = sum(withHdd, "hdd");
  const hp = sum(withHdd, "prevHdd");
  const kc = withHdd.length && hc > 0 ? sum(withHdd, "used") / hc : null;
  const kp = withHdd.length && hp > 0 ? sum(withHdd, "prev") / hp : null;
  const summer = both.filter((r) => [5, 6, 7].includes(r.m));
  const kpi = (k, v, b, p) =>
    `<div class="kpi"><span class="k">${esc(k)}</span><span class="v num">${v} ${b}</span><span class="p num">${esc(p)}</span></div>`;
  const kpis = [
    kpi(
      t(both.length === months.length ? "k_used" : "k_used_n", { n: both.length }),
      esc(fmtL(cur, lang)),
      badge(cur, prev),
      t("prev_is", { l: fmtL(prev, lang) }),
    ),
  ];
  if (withHdd.length) {
    kpis.push(kpi(t("k_hdd"), `≈ ${fmtNum(hc, lang)}`, badge(hc, hp, true), t("k_hdd_prev", { v: fmtNum(hp, lang) })));
    kpis.push(
      kpi(t("k_norm"), `${fmtNum(kc, lang, 2)} L/Kd`, badge(kc, kp), t("k_norm_prev", { v: fmtNum(kp, lang, 2) })),
    );
  }
  if (summer.length)
    kpis.push(
      kpi(
        t("k_summer"),
        esc(fmtL(sum(summer, "used"), lang)),
        badge(sum(summer, "used"), sum(summer, "prev")),
        t("k_summer_prev", { l: fmtL(sum(summer, "prev"), lang) }),
      ),
    );
  const max = Math.max(...months.flatMap((r) => [r.used ?? 0, r.prev ?? 0]), 1);
  const bar = (v, cls) =>
    v === null || v <= 0
      ? `<i class="${cls} none"></i>`
      : `<i class="${cls}" style="width:${((v / max) * 100).toFixed(1)}%"></i>`;
  const rows = months
    .map(
      (r) => `<div class="crow">
        <span>${esc(monthName(r, lang))}${r.current ? ` <small class="muted">${esc(t("upto_day", { d: r.upTo }))}</small>` : ""}</span>
        <span class="cbars">${bar(r.used, "cur")}${bar(r.prev, "prev")}</span>
        <span class="n">${r.used === null ? "–" : fmtNum(r.used, lang)}</span>
        <span class="n prev">${r.prev === null ? "–" : fmtNum(r.prev, lang)}</span>
        <span class="b">${badge(r.used, r.prev)}</span></div>`,
    )
    .join("");
  return `<section>
    ${head}
    <div class="kpis">${kpis.join("")}</div>
    <div class="cmp">
      <div class="crow head"><span>${esc(t("c_month"))}</span><span></span><span class="n">${esc(t("c_now"))}</span><span class="n">${esc(t("c_prev"))}</span><span class="b">Δ</span></div>
      ${rows}
      <div class="crow total"><span>${esc(t("c_sum"))}</span><span></span><span class="n">${fmtNum(cur, lang)}</span><span class="n prev">${fmtNum(prev, lang)}</span><span class="b">${badge(cur, prev)}</span></div>
    </div>
    <div class="hint">${esc(t(both.length === months.length ? "hint_compare" : "hint_compare_partial", { n: both.length }))}</div>
  </section>`;
}
