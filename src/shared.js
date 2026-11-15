// Shared helpers: i18n (de / en), number and date formatting, config defaults and section names.

export const SECTIONS = ["header", "tank", "consumption", "footer"];
export const VIEWS = ["days", "months", "level"];

export const DEFAULTS = {
  name: "",
  subtitle: "",
  level_entity: "",
  percent_entity: "",
  capacity: null,
  reserve: 300,
  last_measurement_entity: "",
  next_measurement_entity: "",
  days_reach_entity: "",
  refill_date_entity: "",
  refill_amount_entity: "",
  outdoor_temp_entity: "",
  heating_base_temp: 15,
  refill_threshold: 100,
  default_view: "days",
  animations: true,
};

const STRINGS = {
  de: {
    title: "Heizöl",
    tank: "Tank",
    of_capacity: "von ≈ {cap} Tankinhalt",
    of_capacity_exact: "von {cap} Tankinhalt",
    space: "Platz für Lieferung",
    reserve: "Reserve",
    reserve_left: "Bis zur Reserve ({res})",
    reserve_short: "Reserve ({res})",
    reached: "erreicht",
    last_refill: "Letzte Befüllung",
    measured: "gemessen {when}",
    next: "nächste Messung {when}",
    today: "heute {time}",
    yesterday: "gestern {time}",
    tomorrow: "morgen {time}",
    reach_until: "reicht bis {date}",
    reach_short: "bis {date}",
    days: "{n} Tage",
    st_ok: "Füllstand OK",
    st_low: "Reserve erreicht",
    st_empty: "Tank fast leer",
    st_unknown: "Kein Füllstand",
    unavailable: "Der Füllstand-Sensor {id} ist nicht verfügbar.",
    no_level: "Bitte level_entity (Füllstand in Litern) konfigurieren.",
    full: "{pct} % voll",
    consumption: "Verbrauch",
    v_days: "30 Tage",
    v_months: "Monate",
    v_level: "Füllstand",
    loading: "Lade Verlauf …",
    no_history: "Für {id} gibt es noch keine Langzeitstatistik.",
    per_day_avg7: "L/Tag Ø 7 Tage",
    days_sum: "{n} Tage: {l}",
    per_hdd: "{v} L je Heizgradtag",
    avg7_is: "Ø 7 Tage {v} L",
    no_reading_on: "keine Messung · {day}",
    litres_on: "L · {day}",
    today_short: "heute",
    lg_per_reading: "je Messung",
    lg_avg7: "Ø 7 Tage",
    lg_temp: "Außentemp. {lo}–{hi} °C",
    hint_days:
      "Ein Balken je Messung. Fehlt eine Messung, landet der Verbrauch am Folgetag; die Linie gleicht das aus.",
    litres_in_year: "L in {y}",
    prev_ytd: "Vorjahr bis heute: {l}",
    no_prev_ytd: "Vorjahr: Verlauf reicht nicht bis Januar zurück",
    so_far: "bis heute",
    no_prev: "kein Vorjahreswert",
    prev_is: "Vorjahr {l}",
    litres_in: "L · {m}",
    lg_months: "Monat",
    lg_prev_month: "Vorjahresmonat",
    hint_months: "Verbrauch ohne Lieferungen. Der laufende Monat ist heller.",
    level_since: "L · Verlauf seit {d}",
    last_delivery_is: "Letzte Lieferung {d} · +{l}",
    no_delivery: "Keine Lieferung erfasst",
    delivery_is: "Lieferung +{l}",
    used_is: "Verbrauch {l}",
    since: "seit {d}",
    lg_level: "Füllstand",
    lg_delivery: "Lieferung",
    lg_reserve: "Reserve {l}",
    hint_level: "Ein Anstieg um mehr als {l} gilt als Lieferung, kleinere Anstiege als Messrauschen.",
  },
  en: {
    title: "Heating oil",
    tank: "Tank",
    of_capacity: "of ≈ {cap} capacity",
    of_capacity_exact: "of {cap} capacity",
    space: "Room for delivery",
    reserve: "Reserve",
    reserve_left: "Until reserve ({res})",
    reserve_short: "Reserve ({res})",
    reached: "reached",
    last_refill: "Last delivery",
    measured: "measured {when}",
    next: "next reading {when}",
    today: "today {time}",
    yesterday: "yesterday {time}",
    tomorrow: "tomorrow {time}",
    reach_until: "lasts until {date}",
    reach_short: "until {date}",
    days: "{n} days",
    st_ok: "Level OK",
    st_low: "Reserve reached",
    st_empty: "Tank almost empty",
    st_unknown: "No level",
    unavailable: "The level sensor {id} is unavailable.",
    no_level: "Please configure level_entity (fill level in litres).",
    full: "{pct} % full",
    consumption: "Consumption",
    v_days: "30 days",
    v_months: "Months",
    v_level: "Level",
    loading: "Loading history …",
    no_history: "There are no long-term statistics for {id} yet.",
    per_day_avg7: "L/day 7-day mean",
    days_sum: "{n} days: {l}",
    per_hdd: "{v} L per heating degree day",
    avg7_is: "7-day mean {v} L",
    no_reading_on: "no reading · {day}",
    litres_on: "L · {day}",
    today_short: "today",
    lg_per_reading: "per reading",
    lg_avg7: "7-day mean",
    lg_temp: "outdoor {lo}–{hi} °C",
    hint_days: "One bar per reading. When a reading is missing, the next day carries both; the line evens that out.",
    litres_in_year: "L in {y}",
    prev_ytd: "Last year to date: {l}",
    no_prev_ytd: "Last year: history does not reach back to January",
    so_far: "so far",
    no_prev: "no value a year earlier",
    prev_is: "a year earlier {l}",
    litres_in: "L · {m}",
    lg_months: "month",
    lg_prev_month: "a year earlier",
    hint_months: "Consumption without deliveries. The running month is lighter.",
    level_since: "L · history since {d}",
    last_delivery_is: "Last delivery {d} · +{l}",
    no_delivery: "No delivery recorded",
    delivery_is: "Delivery +{l}",
    used_is: "Used {l}",
    since: "since {d}",
    lg_level: "level",
    lg_delivery: "delivery",
    lg_reserve: "reserve {l}",
    hint_level: "A rise of more than {l} counts as a delivery, smaller rises as measurement noise.",
  },
};

/** Card language: the `language` option, else Home Assistant's, else English. */
export const langOf = (hass, config) => {
  const lang = String(config?.language || hass?.locale?.language || hass?.language || "en").slice(0, 2);
  return lang in STRINGS ? lang : "en";
};

/** t(key, { name: value }) with {name} placeholders. */
export const translator =
  (lang) =>
  (key, vars = {}) =>
    String(STRINGS[lang]?.[key] ?? STRINGS.en[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? "");

export const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );

export const locale = (lang) => (lang === "de" ? "de-DE" : "en-GB");

/** Number in the card's language (de: decimal comma, thousands dot), or "–" when it is not a finite number. */
export const fmtNum = (value, lang, digits = 0) => {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return "–";
  return n.toLocaleString(locale(lang), { minimumFractionDigits: digits, maximumFractionDigits: digits });
};

/** Litres: "2.264 L". */
export const fmtL = (value, lang, digits = 0) => {
  const s = fmtNum(value, lang, digits);
  return s === "–" ? s : `${s} L`;
};

/** "Jan. 2028" / "Jan 2028" in the server's time zone. */
export const fmtMonthYear = (date, lang, tz) =>
  date.toLocaleDateString(locale(lang), { month: "short", year: "numeric", timeZone: tz });

/** "28.01.2026" / "28/01/2026". */
export const fmtDate = (date, lang, tz) =>
  date.toLocaleDateString(locale(lang), { day: "2-digit", month: "2-digit", year: "numeric", timeZone: tz });

export const fmtTime = (date, lang, tz) =>
  date.toLocaleTimeString(locale(lang), { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: tz });
