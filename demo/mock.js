// Fake `hass` for the demo page: the example setup (OilFox sensor plus the helpers the card reads) with an
// adjustable fill level, and daily long-term statistics of the level and the outdoor temperature since April 2025.
//
// The history is simulated backwards from today's 2264 L (deterministic): a seasonal temperature, consumption of
// 0.4 L/day for hot water plus 0.68 L per heating degree day, one OilFox reading a day (rounded to whole litres,
// about one in 16 missing) and the delivery of 2386 L on 28 Jan 2026. Numbers are close to the real year.
import { dayStart, parts, zoned } from "../src/tz.js";

export const TZ = "Europe/Berlin";
export const CAPACITY = 2980;

export const CONFIG = {
  level_entity: "sensor.oilfox_of0000000000_filllevelquantity",
  percent_entity: "sensor.oilfox_of0000000000_filllevelpercent",
  last_measurement_entity: "sensor.oilfox_of0000000000_lastmeasurement",
  next_measurement_entity: "sensor.oilfox_of0000000000_nextmeasurement",
  days_reach_entity: "sensor.oilfox_of0000000000_daysreach",
  refill_date_entity: "input_datetime.heizol_letzte_befullung",
  refill_amount_entity: "input_number.heizol_letzte_liefermenge",
  outdoor_temp_entity: "sensor.wolf_aussentemperatur",
  capacity: CAPACITY,
  reserve: 300,
};

const LEVEL_TODAY = 2264;
const FIRST = { y: 2025, m: 3, d: 1 }; // 1 April 2025, when the example statistics start
const DELIVERY = { key: "2026-01-28", litres: 2386 };

// Small seeded PRNG (mulberry32) so the demo shows the same history on every load.
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const keyOf = (t) => {
  const p = parts(t, TZ);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
};

let history = null;
/** [{ start, key, temp, level (end of day), low, high }] oldest first, today last. */
export function simulate(now = new Date()) {
  if (history && history.today === keyOf(now.getTime())) return history.days;
  const rand = rng(20250401);
  const first = zoned(FIRST.y, FIRST.m, FIRST.d, 0, TZ);
  const days = [];
  for (let d = first; d <= now; d = dayStart(d, TZ, 1)) {
    const p = parts(d.getTime(), TZ);
    const doy = (Date.UTC(p.y, p.m, p.d) - Date.UTC(p.y, 0, 1)) / 864e5;
    const temp = 9.6 - 9.4 * Math.cos((2 * Math.PI * (doy - 18)) / 365) + (rand() - 0.5) * 7;
    const used = 0.4 + 0.68 * Math.max(0, 15 - temp) * (0.85 + rand() * 0.3);
    days.push({ start: d, key: keyOf(d.getTime()), temp: Math.round(temp * 10) / 10, used, miss: rand() < 0.06 });
  }
  // Backwards from today: the level at the end of each day.
  let level = LEVEL_TODAY;
  for (let i = days.length - 1; i >= 0; i--) {
    const day = days[i];
    day.true = level;
    if (day.key === DELIVERY.key) {
      day.before = level - DELIVERY.litres + day.used * 0.3;
      level = day.before + day.used * 0.7;
    } else level += day.used;
  }
  // OilFox: whole litres, a missing reading keeps yesterday's value.
  let shown = null;
  for (const day of days) {
    const reading = Math.round(day.true);
    const prev = shown ?? reading;
    if (day.key === DELIVERY.key) {
      day.low = Math.round(day.before);
      day.high = reading;
      shown = reading;
    } else {
      shown = day.miss && day.key !== keyOf(now.getTime()) ? prev : reading;
      day.low = Math.min(prev, shown);
      day.high = Math.max(prev, shown);
    }
    day.level = shown;
  }
  history = { today: keyOf(now.getTime()), days };
  return days;
}

/** recorder/statistics_during_period for the level and the temperature, period "day". */
function statistics(msg) {
  const start = Date.parse(msg.start_time);
  const end = Date.parse(msg.end_time);
  const days = simulate().filter((d) => d.start.getTime() >= start && d.start.getTime() < end);
  const out = {};
  for (const id of msg.statistic_ids) {
    if (id === CONFIG.level_entity)
      out[id] = days.map((d) => ({
        start: d.start.getTime(),
        end: d.start.getTime() + 864e5,
        min: d.low,
        max: d.high,
        mean: (d.low + d.high) / 2,
      }));
    else if (id === CONFIG.outdoor_temp_entity)
      out[id] = days.map((d) => ({
        start: d.start.getTime(),
        end: d.start.getTime() + 864e5,
        mean: d.temp,
        min: d.temp - 4,
        max: d.temp + 4,
      }));
  }
  return out;
}

const st = (state, attributes = {}) => ({ state: String(state), attributes, last_updated: "2026-11-15T16:18:30Z" });

/** hass with the tank at `level` litres. `unavailable` turns the level sensor off. */
export function makeHass({ lang = "de", level = 2264, unavailable = false } = {}) {
  const now = Date.now();
  const last = new Date(now - 2.5 * 3600e3);
  const next = new Date(last.getTime() + 24 * 3600e3);
  const pct = Math.round((level / CAPACITY) * 100);
  // OilFox's own range: the level divided by the recent daily consumption (≈ 5.2 L/day).
  const reach = Math.max(0, Math.round(level / 5.18));
  const refill = new Date(Date.UTC(2026, 0, 28, 15, 0));
  return {
    language: lang,
    locale: { language: lang },
    config: { time_zone: TZ },
    states: {
      [CONFIG.level_entity]: st(unavailable ? "unavailable" : level, {
        unit_of_measurement: "L",
        state_class: "measurement",
      }),
      [CONFIG.percent_entity]: st(unavailable ? "unavailable" : pct, { unit_of_measurement: "%" }),
      [CONFIG.last_measurement_entity]: st(last.toISOString(), { device_class: "timestamp" }),
      [CONFIG.next_measurement_entity]: st(next.toISOString(), { device_class: "timestamp" }),
      [CONFIG.days_reach_entity]: st(reach, { unit_of_measurement: "d" }),
      [CONFIG.refill_date_entity]: st("2026-01-28 16:00:00", {
        has_date: true,
        has_time: true,
        timestamp: refill.getTime() / 1000,
      }),
      [CONFIG.refill_amount_entity]: st(2386, { unit_of_measurement: "L" }),
      [CONFIG.outdoor_temp_entity]: st(simulate().at(-1).temp, { unit_of_measurement: "°C" }),
    },
    callWS: async (msg) => {
      await new Promise((r) => setTimeout(r, 150));
      if (msg.type === "recorder/statistics_during_period") return statistics(msg);
      throw new Error(`demo: ${msg.type} not mocked`);
    },
  };
}
