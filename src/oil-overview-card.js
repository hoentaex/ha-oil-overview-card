/*
 * Oil Overview Card for Home Assistant
 * https://github.com/hoentaex/ha-oil-overview-card
 *
 * Heating oil tank, consumption, range and price in one card. Built for an OilFox level sensor, works with any
 * sensor that reports the fill level in litres.
 *
 * Layout and look follow the cards of juju35 (https://github.com/juju35). MIT licence.
 */
import { daysView, H, levelView, monthsView, W } from "./charts.js";
import { Cache, deriveDays, fetchDaily, lastDays, lastMonths, tempsByDay, yearToDate } from "./data.js";
import { scenarios } from "./forecast.js";
import { compareSection, rangeSection } from "./sections.js";
import { svgIcon } from "./icons.js";
import { readTank, STATUS_COLOR, statusOf } from "./oil.js";
import {
  DEFAULTS,
  esc,
  fmtDate,
  fmtL,
  fmtMonthYear,
  fmtNum,
  fmtTime,
  langOf,
  SECTIONS,
  translator,
  VIEWS,
} from "./shared.js";
import { STYLE } from "./styles.js";
import { miniTankHTML, tankHTML } from "./tank.js";
import { parts, tzOf } from "./tz.js";

const VERSION = __VERSION__;

/** "heute 17:18" / "gestern 17:18" / "morgen 17:21" / "28.01.2026" relative to `now`, in the server's time zone. */
export function relWhen(date, now, lang, tz, t) {
  const day = (d) => {
    const p = parts(d.getTime(), tz);
    return Date.UTC(p.y, p.m, p.d) / 864e5;
  };
  const diff = day(date) - day(now);
  const time = fmtTime(date, lang, tz);
  if (diff === 0) return t("today", { time });
  if (diff === -1) return t("yesterday", { time });
  if (diff === 1) return t("tomorrow", { time });
  return fmtDate(date, lang, tz);
}

/**
 * Header pill: the forecast's empty date (or, before the history is loaded, the days-reach sensor) while the tank
 * is above the reserve; else the tank status.
 */
export function pillOf(tank, status, now, lang, tz, t, emptyAt = null) {
  const reach = tank.daysReach !== null && tank.daysReach > 0 ? new Date(now.getTime() + tank.daysReach * 864e5) : null;
  const until = emptyAt || reach;
  if (status === "ok" && until) {
    return { text: t("reach_until", { date: fmtMonthYear(until, lang, tz) }), short: fmtMonthYear(until, lang, tz) };
  }
  const text = t(`st_${status}`);
  return { text, short: text };
}

class OilCardBase extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._sig = "";
  }

  setConfig(config) {
    if (!config || typeof config !== "object") throw new Error("Invalid configuration");
    const sections = Array.isArray(config.sections) ? config.sections.filter((s) => SECTIONS.includes(s)) : SECTIONS;
    this._config = { ...DEFAULTS, ...config, sections };
    this._sig = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    const sig = this._signature();
    if (sig !== this._sig) {
      this._sig = sig;
      this._render();
    }
  }

  get hass() {
    return this._hass;
  }

  /** Re-render only when one of the configured entities (or the language) changed. */
  _signature() {
    const c = this._config || {};
    const ids = Object.entries(c)
      .filter(([k, v]) => typeof v === "string" && /_entity$/.test(k) && v)
      .map(([, v]) => v);
    const st = this._hass?.states || {};
    return [langOf(this._hass, c), ...ids.map((id) => `${id}=${st[id]?.state}@${st[id]?.last_updated ?? ""}`)].join(
      "|",
    );
  }

  _ctx() {
    const lang = langOf(this._hass, this._config);
    const tz = tzOf(this._hass);
    const t = translator(lang);
    const tank = readTank(this._hass, this._config);
    const status = statusOf(tank);
    const now = new Date();
    return { lang, tz, t, tank, status, now, color: STATUS_COLOR[status], animate: this._config.animations !== false };
  }
}

export class OilOverviewCard extends OilCardBase {
  static getStubConfig(hass) {
    const ids = Object.keys(hass?.states || {});
    const find = (re) => ids.find((id) => re.test(id)) || "";
    return {
      type: "custom:oil-overview-card",
      level_entity: find(/^sensor\..*(filllevelquantity|fill_level|fuellstand|heizol.*stand)/i),
      percent_entity: find(/^sensor\..*filllevelpercent/i),
      last_measurement_entity: find(/^sensor\..*lastmeasurement/i),
    };
  }

  getCardSize() {
    return 9;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  constructor() {
    super();
    this._cache = new Cache();
    this._data = null;
    this._view = null;
    this._token = 0;
  }

  setConfig(config) {
    super.setConfig(config);
    if (!VIEWS.includes(this._view)) this._view = VIEWS.includes(config.default_view) ? config.default_view : "days";
    this._cache.clear();
    this._data = null;
    this._levelSig = "";
  }

  _render() {
    if (!this._config || !this._hass) return;
    const x = this._ctx();
    const { t, tank } = x;
    const config = this._config;
    const show = (s) => config.sections.includes(s);
    let body = "";
    if (!config.level_entity) body = `<div class="empty">${svgIcon("alert")}<span>${esc(t("no_level"))}</span></div>`;
    else if (tank.level === null)
      body = `<div class="empty">${svgIcon("alert")}<span>${esc(t("unavailable", { id: config.level_entity }))}</span></div>`;
    else {
      body = (show("tank") ? this._tankSection(x) : "") + (show("consumption") ? this._consumptionSection(x) : "");
      if (this._data?.days.length > 1) {
        const ctx = { ...x, reserve: x.tank.reserve };
        if (show("range")) body += rangeSection(this._scen || [], ctx);
        if (show("compare")) {
          const base = Number(config.heating_base_temp) || 15;
          body += compareSection(lastMonths(this._data.days, x.tz, x.now, { temps: this._data.temps, base }), ctx);
        }
      }
    }
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card>
      ${show("header") ? this._header(x) : ""}
      <div class="content">${body}</div>
    </ha-card>`;
    this._mountChart();
    this._maybeLoad();
  }

  // ---------- data ----------

  /** (Re)load the statistics on first use and whenever the level got a new reading. */
  _maybeLoad() {
    if (!this._config.level_entity || !this._config.sections.includes("consumption")) return;
    const s = this._hass.states[this._config.level_entity];
    const sig = `${s?.state}@${s?.last_updated ?? ""}`;
    if (sig === this._levelSig) return;
    if (this._levelSig) this._cache.clear();
    this._levelSig = sig;
    this._load();
  }

  async _load() {
    const token = ++this._token;
    const tz = tzOf(this._hass);
    try {
      const raw = await fetchDaily(this._hass, this._cache, this._config, tz);
      if (token !== this._token) return;
      const days = deriveDays(raw.level, tz, Number(this._config.refill_threshold) || 100);
      this._data = { days, temps: tempsByDay(raw.temp, tz), error: null };
      const tank = readTank(this._hass, this._config);
      this._scen = scenarios(days, { level: tank.level, reserve: tank.reserve, tz, daysReach: tank.daysReach });
    } catch (err) {
      if (token !== this._token) return;
      this._data = { days: [], temps: new Map(), error: String(err?.message || err) };
      this._scen = [];
    }
    this._render();
  }

  // ---------- consumption ----------

  _consumptionSection({ t }) {
    const btn = (v) =>
      `<button type="button" data-view="${v}" aria-pressed="${this._view === v}">${esc(t(`v_${v}`))}</button>`;
    return `<section class="consumption">
      <div class="section-title">${svgIcon("bars")}<span>${esc(t("consumption"))}</span><span class="note" id="note"></span></div>
      <div class="panel">
        <div class="seg" role="group">${VIEWS.map(btn).join("")}</div>
        <div class="readout" id="readout"></div>
        <div class="plot" id="plot"></div>
        <div class="axis" id="axis"></div>
        <div class="legend" id="legend"></div>
        <div class="hint" id="hint"></div>
      </div>
    </section>`;
  }

  /** Fills the chart panel for the selected view and wires up the buttons and scrubbing. */
  _mountChart() {
    const root = this.shadowRoot;
    const plot = root?.getElementById("plot");
    if (!plot) return;
    const x = this._ctx();
    const { t, lang, tz, tank, now } = x;
    const $ = (id) => root.getElementById(id);
    for (const b of root.querySelectorAll(".seg button")) {
      b.setAttribute("aria-pressed", String(b.dataset.view === this._view));
      b.onclick = () => {
        this._view = b.dataset.view;
        this._mountChart();
      };
    }
    const empty = (msg) => {
      $("readout").innerHTML = `<span class="v">–</span><span class="k">${esc(msg)}</span>`;
      plot.innerHTML = "";
      for (const id of ["axis", "legend", "hint", "note"]) $(id).innerHTML = "";
    };
    if (!this._data) return empty(t("loading"));
    if (this._data.error || this._data.days.length < 2)
      return empty(t("no_history", { id: this._config.level_entity }));
    const { days, temps } = this._data;
    const base = Number(this._config.heating_base_temp) || 15;
    let view;
    if (this._view === "months")
      view = monthsView(lastMonths(days, tz, now), { t, lang, ytd: yearToDate(days, tz, now) });
    else if (this._view === "level")
      view = levelView(days, {
        t,
        lang,
        tz,
        capacity: tank.capacity,
        reserve: tank.reserve,
        now,
        forecast: this._scen?.[0]?.points || [],
      });
    else view = daysView(lastDays(days, temps, tz, now, 30), { t, lang, tz, base });
    if (this._view === "level") view.hint = t("hint_level", { l: `${Number(this._config.refill_threshold) || 100} L` });

    plot.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${view.svg}</svg>
      <div class="hl" hidden></div><div class="hdot" hidden></div>`;
    $("readout").innerHTML = view.rest;
    $("note").textContent = view.note;
    $("axis").innerHTML = view.axis.map((a) => `<span>${esc(a)}</span>`).join("");
    $("legend").innerHTML = view.legend
      .map(([kind, color, txt]) => `<span><i class="sw ${kind}" style="--sw:${color}"></i>${esc(txt)}</span>`)
      .join("");
    $("hint").textContent = view.hint;

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
      if (view.yOf) {
        dot.hidden = false;
        dot.style.left = `${(px * 100).toFixed(2)}%`;
        dot.style.top = `${((view.yOf(i) / H) * 100).toFixed(2)}%`;
      }
      $("readout").innerHTML = view.at(i);
    };
    plot.onpointermove = pick;
    plot.onpointerdown = pick;
    plot.onpointerleave = () => {
      hl.hidden = true;
      dot.hidden = true;
      $("readout").innerHTML = view.rest;
    };
  }

  _header({ t, tank, status, color, lang, tz, now }) {
    const c = this._config;
    const pill = pillOf(tank, status, now, lang, tz, t, this._scen?.[0]?.emptyAt ?? null);
    const subParts = [];
    if (tank.lastMeasurement) subParts.push(t("measured", { when: relWhen(tank.lastMeasurement, now, lang, tz, t) }));
    if (tank.nextMeasurement && tank.nextMeasurement > now)
      subParts.push(t("next", { when: relWhen(tank.nextMeasurement, now, lang, tz, t) }));
    const sub = c.subtitle || subParts.join(" · ");
    return `<div class="header">
      <div class="logo" style="--c:${color}">${svgIcon("drop")}</div>
      <div class="titles"><div class="name">${esc(c.name || t("title"))}</div>${sub ? `<div class="sub">${esc(sub)}</div>` : ""}</div>
      <span class="pill" style="--c:${color}" title="${esc(pill.text)}"><span class="dot"></span><span>${esc(pill.text)}</span></span>
    </div>`;
  }

  _tankSection({ t, tank, lang, tz, animate }) {
    const facts = [];
    if (tank.space !== null) facts.push([t("space"), fmtL(tank.space, lang)]);
    if (tank.reserve > 0 && tank.aboveReserve !== null)
      facts.push(
        tank.aboveReserve > 0
          ? [t("reserve_left", { res: fmtL(tank.reserve, lang) }), fmtL(tank.aboveReserve, lang)]
          : [t("reserve_short", { res: fmtL(tank.reserve, lang) }), t("reached"), "warn"],
      );
    if (tank.refillDate) {
      const amount = tank.refillAmount ? ` · +${fmtL(tank.refillAmount, lang)}` : "";
      facts.push([t("last_refill"), `${fmtDate(tank.refillDate, lang, tz)}${amount}`]);
    }
    const capLine = tank.capacity
      ? t(tank.capacityDerived ? "of_capacity" : "of_capacity_exact", { cap: fmtL(tank.capacity, lang) })
      : "";
    const pctLabel = tank.percent === null ? "" : `${fmtNum(tank.percent, lang)} %`;
    return `<section>
      <div class="section-title">${svgIcon("tank")}<span>${esc(t("tank"))}</span></div>
      <div class="tank">
        ${tankHTML({ percent: tank.percent, reserve: tank.reserve, capacity: tank.capacity, label: pctLabel, reserveLabel: esc(t("reserve")), animate })}
        <div>
          <div class="big">${fmtNum(tank.level, lang)}<small>L</small></div>
          ${capLine ? `<div class="of">${esc(capLine)}</div>` : ""}
          ${facts.length ? `<div class="facts">${facts.map(([k, v, cls]) => `<div><span>${esc(k)}</span><b${cls ? ` class="${cls}"` : ""}>${esc(v)}</b></div>`).join("")}</div>` : ""}
        </div>
      </div>
    </section>`;
  }
}

export class OilOverviewMiniCard extends OilCardBase {
  static getStubConfig(hass) {
    return { ...OilOverviewCard.getStubConfig(hass), type: "custom:oil-overview-mini-card" };
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 3, rows: 1 };
  }

  _render() {
    if (!this._config || !this._hass) return;
    const { t, tank, status, color, lang, tz, now, animate } = this._ctx();
    const pill = pillOf(tank, status, now, lang, tz, t);
    const detail =
      tank.level === null
        ? esc(t("st_unknown"))
        : [
            `<b>${fmtL(tank.level, lang)}</b>`,
            tank.percent === null ? "" : `${fmtNum(tank.percent, lang)} %`,
            tank.space === null ? "" : `${esc(t("space"))} ${fmtL(tank.space, lang)}`,
          ]
            .filter(Boolean)
            .join(" · ");
    this.shadowRoot.innerHTML = `<style>${STYLE}</style><ha-card>
      <div class="mini">
        ${miniTankHTML({ percent: tank.percent, animate })}
        <div class="mmain">
          <div class="mtop"><span class="name">${esc(this._config.name || t("title"))}</span>
            <span class="pill" style="--c:${color}" title="${esc(pill.text)}"><span class="dot"></span><span>${esc(pill.short)}</span></span></div>
          <div class="mdetail">${detail}</div>
        </div>
      </div>
    </ha-card>`;
  }
}

if (!customElements.get("oil-overview-card")) customElements.define("oil-overview-card", OilOverviewCard);
if (!customElements.get("oil-overview-mini-card")) customElements.define("oil-overview-mini-card", OilOverviewMiniCard);

window.customCards = window.customCards || [];
for (const [type, name, description] of [
  ["oil-overview-card", "Oil Overview Card", "Heating oil tank, consumption, range and price."],
  ["oil-overview-mini-card", "Oil Overview Mini Card", "Heating oil tank in one row."],
]) {
  if (!window.customCards.some((c) => c.type === type))
    window.customCards.push({
      type,
      name,
      description,
      preview: true,
      documentationURL: "https://github.com/hoentaex/ha-oil-overview-card",
    });
}

console.info(
  `%c OIL-OVERVIEW-CARD %c v${VERSION} `,
  "color:#1b130a;background:#f0a04b;font-weight:700",
  "color:#f0a04b",
);
