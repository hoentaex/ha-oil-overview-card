// Shared helpers: i18n (de / en), number and date formatting, config defaults and section names.

export const SECTIONS = ["header", "tank", "footer"];

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
