// Visual editor (ha-form) for both cards, and the config of new cards (getStubConfig) from the states.
import { DEFAULTS, langOf, SECTIONS, VIEWS } from "./shared.js";

const LABELS = {
  de: {
    name: "Name",
    subtitle: "Untertitel (leer: Messzeitpunkte)",
    g_tank: "Tank",
    g_delivery: "Lieferungen",
    g_history: "Verlauf und Wetter",
    g_price: "Preis",
    g_display: "Darstellung",
    level_entity: "Füllstand (Liter)",
    percent_entity: "Füllstand (%)",
    capacity: "Tankinhalt",
    reserve: "Reserve (Nachbestellen)",
    last_measurement_entity: "Letzte Messung",
    next_measurement_entity: "Nächste Messung",
    days_reach_entity: "Reichweite des Sensors (Tage)",
    refill_date_entity: "Letzte Befüllung (Datum)",
    refill_amount_entity: "Letzte Liefermenge",
    refill_threshold: "Anstieg, ab dem eine Lieferung erkannt wird",
    outdoor_temp_entity: "Außentemperatur",
    heating_base_temp: "Heizgrenze für Heizgradtage",
    price_entity: "Aktueller Heizölpreis",
    paid_price_entity: "Preis der letzten Lieferung",
    price_per_litres: "Preis gilt für",
    per_100: "100 Liter",
    per_1: "1 Liter",
    sections: "Abschnitte",
    default_view: "Verbrauch beim Öffnen",
    language: "Sprache",
    lang_auto: "Automatisch",
    animations: "Animation (Öl, Bläschen)",
    illustration: "Illustrierter Kopf (Tank im Keller)",
    illustration_theme: "Bild im Kopf",
    theme_auto: "Wie das Theme",
    theme_day: "Tag",
    theme_night: "Nacht",
    popup: "Große Karte als Popup (sonst aufklappen)",
    h_capacity: "Leer = aus Litern und Prozent berechnet (ungenau bei niedrigem Stand)",
    h_level: "Der Verlauf kommt aus der Langzeitstatistik dieses Sensors",
    h_days_reach: "Nur als Vergleich in der Reichweite und solange der Verlauf lädt",
    h_temp: "Für Heizgradtage und den witterungsbereinigten Vergleich",
    h_price: "Ein Sensor mit Langzeitstatistik (state_class: measurement) ergibt den Preisverlauf",
    s_header: "Kopf",
    s_tank: "Tank",
    s_consumption: "Verbrauch",
    s_range: "Reichweite",
    s_price: "Heizölpreis",
    s_compare: "12 Monate im Vergleich",
    s_footer: "Fußzeile",
    v_days: "30 Tage",
    v_months: "Monate",
    v_level: "Füllstand",
  },
  en: {
    name: "Name",
    subtitle: "Subtitle (empty: reading times)",
    g_tank: "Tank",
    g_delivery: "Deliveries",
    g_history: "History and weather",
    g_price: "Price",
    g_display: "Display",
    level_entity: "Fill level (litres)",
    percent_entity: "Fill level (%)",
    capacity: "Tank capacity",
    reserve: "Reserve (reorder)",
    last_measurement_entity: "Last reading",
    next_measurement_entity: "Next reading",
    days_reach_entity: "Sensor's own range (days)",
    refill_date_entity: "Last delivery (date)",
    refill_amount_entity: "Last delivery amount",
    refill_threshold: "Rise that counts as a delivery",
    outdoor_temp_entity: "Outdoor temperature",
    heating_base_temp: "Heating limit for degree days",
    price_entity: "Current heating oil price",
    paid_price_entity: "Price of the last delivery",
    price_per_litres: "Price is per",
    per_100: "100 litres",
    per_1: "1 litre",
    sections: "Sections",
    default_view: "Consumption view at start",
    language: "Language",
    lang_auto: "Automatic",
    animations: "Animation (oil, bubbles)",
    illustration: "Illustrated header (tank in the cellar)",
    illustration_theme: "Header picture",
    theme_auto: "Follow the theme",
    theme_day: "Day",
    theme_night: "Night",
    popup: "Main card as a popup (else expand)",
    h_capacity: "Empty = derived from litres and percent (inaccurate at low levels)",
    h_level: "The history comes from this sensor's long-term statistics",
    h_days_reach: "Only for comparison in the range and while the history loads",
    h_temp: "For heating degree days and the weather-adjusted comparison",
    h_price: "A sensor with long-term statistics (state_class: measurement) gives the price history",
    s_header: "Header",
    s_tank: "Tank",
    s_consumption: "Consumption",
    s_range: "Range",
    s_price: "Heating oil price",
    s_compare: "12 months compared",
    s_footer: "Footer",
    v_days: "30 days",
    v_months: "Months",
    v_level: "Level",
  },
};

const ent = (name, domain = ["sensor"]) => ({ name, selector: { entity: { domain } } });
const num = (name, min, max, step, unit) => ({
  name,
  selector: { number: { min, max, step, mode: "box", unit_of_measurement: unit } },
});
const grid = (...schema) => ({ type: "grid", name: "", schema });
const group = (title, schema, expanded = false) => ({
  type: "expandable",
  name: "",
  title,
  flatten: true,
  expanded,
  schema,
});
const select = (name, options) => ({ name, selector: { select: { mode: "dropdown", options } } });

export const editorSchema = (lang, { mini = false } = {}) => {
  const L = LABELS[lang] || LABELS.en;
  return [
    grid({ name: "name", selector: { text: {} } }, { name: "subtitle", selector: { text: {} } }),
    group(
      L.g_tank,
      [
        ent("level_entity", ["sensor", "input_number", "number"]),
        ent("percent_entity", ["sensor", "input_number", "number"]),
        grid(num("capacity", 0, 100000, 10, "L"), num("reserve", 0, 10000, 10, "L")),
        grid(ent("last_measurement_entity"), ent("next_measurement_entity")),
        ent("days_reach_entity"),
      ],
      true,
    ),
    group(L.g_delivery, [
      grid(
        ent("refill_date_entity", ["input_datetime", "sensor"]),
        ent("refill_amount_entity", ["input_number", "sensor", "number"]),
      ),
      num("refill_threshold", 10, 2000, 10, "L"),
    ]),
    group(L.g_history, [ent("outdoor_temp_entity"), num("heating_base_temp", 0, 25, 0.5, "°C")]),
    group(L.g_price, [
      ent("price_entity", ["sensor", "input_number", "number"]),
      ent("paid_price_entity", ["input_number", "sensor", "number"]),
      select("price_per_litres", [
        { value: "100", label: L.per_100 },
        { value: "1", label: L.per_1 },
      ]),
    ]),
    group(L.g_display, [
      {
        name: "sections",
        selector: {
          select: { multiple: true, mode: "list", options: SECTIONS.map((s) => ({ value: s, label: L[`s_${s}`] })) },
        },
      },
      grid(
        select(
          "default_view",
          VIEWS.map((v) => ({ value: v, label: L[`v_${v}`] })),
        ),
        select("language", [
          { value: "", label: L.lang_auto },
          { value: "de", label: "Deutsch" },
          { value: "en", label: "English" },
        ]),
      ),
      grid(
        { name: "animations", selector: { boolean: {} } },
        ...(mini ? [{ name: "popup", selector: { boolean: {} } }] : []),
        { name: "illustration", selector: { boolean: {} } },
        select("illustration_theme", [
          { value: "", label: L.theme_auto },
          { value: "day", label: L.theme_day },
          { value: "night", label: L.theme_night },
        ]),
      ),
    ]),
  ];
};

const HELPERS = {
  capacity: "h_capacity",
  level_entity: "h_level",
  days_reach_entity: "h_days_reach",
  outdoor_temp_entity: "h_temp",
  price_entity: "h_price",
};
export const helperFor = (lang, name) => (HELPERS[name] ? (LABELS[lang] || LABELS.en)[HELPERS[name]] : undefined);

// Defaults shown in the form (and dropped again from the YAML when left as they are).
const formDefaults = (mini) => ({
  ...DEFAULTS,
  popup: mini,
  sections: SECTIONS,
  language: "",
  illustration: true,
  illustration_theme: "",
  price_per_litres: "100",
});

/** Card config → form data with the defaults filled in. */
export const toFormData = (config, mini = false) => {
  const data = { ...formDefaults(mini), ...config };
  data.price_per_litres = String(data.price_per_litres);
  return data;
};

/** Form data → minimal card config: empty values and defaults dropped. */
export const fromFormData = (data, mini = false) => {
  const defaults = { ...formDefaults(mini), price_per_litres: "100" };
  const config = {};
  for (const [k, v] of Object.entries(data)) {
    const empty = v === "" || v === undefined || v === null || (Array.isArray(v) && !v.length);
    if (empty) continue;
    if (k in defaults && JSON.stringify(v) === JSON.stringify(defaults[k])) continue;
    config[k] = k === "price_per_litres" ? Number(v) : v;
  }
  if (Array.isArray(config.sections)) config.sections = SECTIONS.filter((s) => config.sections.includes(s));
  return config;
};

class EditorBase extends HTMLElement {
  static get mini() {
    return false;
  }

  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _lang() {
    return this._config?.language || langOf(this._hass);
  }

  _render() {
    if (!this._hass || !this._config) return;
    const mini = this.constructor.mini;
    const lang = this._lang();
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (s) => (LABELS[this._lang()] || LABELS.en)[s.name] ?? s.name;
      this._form.computeHelper = (s) => helperFor(this._lang(), s.name);
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const { type } = this._config;
        const config = { type, ...fromFormData({ ...ev.detail.value, type: undefined }, mini) };
        this._config = config;
        this.dispatchEvent(new CustomEvent("config-changed", { detail: { config }, bubbles: true, composed: true }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    const data = toFormData(this._config, mini);
    const key = JSON.stringify(data);
    if (key !== this._dataKey) {
      this._dataKey = key;
      this._form.data = data;
    }
    if (lang !== this._schemaLang) {
      this._schemaLang = lang;
      this._form.schema = editorSchema(lang, { mini });
    }
  }
}

export class OilOverviewCardEditor extends EditorBase {}
export class OilOverviewMiniCardEditor extends EditorBase {
  static get mini() {
    return true;
  }
}
// Guarded so the module also loads outside a browser (tests).
if (typeof customElements !== "undefined") {
  if (!customElements.get("oil-overview-card-editor"))
    customElements.define("oil-overview-card-editor", OilOverviewCardEditor);
  if (!customElements.get("oil-overview-mini-card-editor"))
    customElements.define("oil-overview-mini-card-editor", OilOverviewMiniCardEditor);
}

/**
 * Config for a new card from the states: an OilFox device (fillLevelQuantity & co.) or any sensor in litres with
 * a fill-level name, the outdoor temperature, and helpers named like the ones in the README.
 */
export function detectConfig(hass) {
  const states = hass?.states || {};
  const ids = Object.keys(states);
  const find = (re, pred = () => true) => ids.find((id) => re.test(id) && pred(states[id])) || "";
  const unit = (u) => (s) => s.attributes?.unit_of_measurement === u;
  const config = {};
  const set = (k, v) => {
    if (v) config[k] = v;
  };
  set(
    "level_entity",
    find(/^sensor\..*filllevelquantity$/i) ||
      find(/^sensor\..*(fuellstand|fullstand|fill_level|oil_level|olstand)/i, unit("L")),
  );
  set("percent_entity", find(/^sensor\..*filllevelpercent$/i));
  set("last_measurement_entity", find(/^sensor\..*lastmeasurement$/i));
  set("next_measurement_entity", find(/^sensor\..*nextmeasurement$/i));
  set("days_reach_entity", find(/^sensor\..*daysreach$/i));
  set("refill_date_entity", find(/^input_datetime\..*(befull|refill|liefer)/i));
  set("refill_amount_entity", find(/^input_number\..*(liefermenge|refill_amount|delivery)/i));
  set("price_entity", find(/^sensor\..*(heiz.?l.*preis|oil.*price|tagespreis)/i));
  set("paid_price_entity", find(/^input_number\..*(heiz.?l.*preis|oil.*price)/i));
  set(
    "outdoor_temp_entity",
    find(
      /^sensor\..*(aussentemperatur|outdoor_temperature|outside_temperature)$/i,
      (s) => s.attributes?.device_class === "temperature" || unit("°C")(s),
    ),
  );
  return config;
}
