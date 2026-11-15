// Long-term statistics of the fill level (and the outdoor temperature) and what the card derives from them:
// consumption per day and month, deliveries, the level over time.
//
// The level only falls, except when oil is delivered. A rise of more than `refill_threshold` litres within a day
// is a delivery; smaller rises are measurement noise and are ignored (the level is taken as unchanged).
import { dayStart, parts } from "./tz.js";

const MIN = 60e3;
export const HISTORY_DAYS = 800;

const ms = (t) => (typeof t === "number" ? t : Date.parse(t));
const val = (v) => (v === null || v === undefined || !Number.isFinite(Number(v)) ? null : Number(v));

/** Small promise cache: in-flight requests are shared, failures are not kept. */
export class Cache {
  constructor(now = () => Date.now()) {
    this._map = new Map();
    this._now = now;
  }

  get(key, expires, load) {
    const hit = this._map.get(key);
    if (hit && hit.expires > this._now()) return hit.promise;
    const promise = Promise.resolve()
      .then(load)
      .catch((err) => {
        if (this._map.get(key)?.promise === promise) this._map.delete(key);
        throw err;
      });
    this._map.set(key, { promise, expires });
    return promise;
  }

  clear() {
    this._map.clear();
  }
}

export const statsRequest = (ids, start, end, period = "day", types = ["min", "max", "mean"]) => ({
  type: "recorder/statistics_during_period",
  start_time: start.toISOString(),
  end_time: end.toISOString(),
  statistic_ids: ids,
  period,
  types,
});

/** Calendar-day key "2026-11-15" of instant `t` in `tz`. */
export const dayKey = (t, tz) => {
  const p = parts(ms(t), tz);
  return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
};

/** Calendar-month key "2026-11" of instant `t` in `tz`. */
export const monthKey = (t, tz) => dayKey(t, tz).slice(0, 7);

/**
 * Daily statistics of the level and the outdoor temperature over the last HISTORY_DAYS days.
 * Cached for 30 minutes; the card also drops the cache when the level changes (one new reading a day).
 */
export function fetchDaily(hass, cache, config, tz, now = new Date()) {
  const ids = [config.level_entity, config.outdoor_temp_entity].filter(Boolean);
  const start = dayStart(now, tz, -HISTORY_DAYS);
  const key = `daily|${ids.join(",")}|${dayKey(now, tz)}`;
  return cache.get(key, Date.now() + 30 * MIN, async () => {
    const res = await hass.callWS(statsRequest(ids, start, new Date(now.getTime() + 60 * MIN)));
    return {
      level: res?.[config.level_entity] || [],
      temp: config.outdoor_temp_entity ? res?.[config.outdoor_temp_entity] || [] : [],
    };
  });
}

/**
 * Days from the level's daily statistics: [{ start, key, end, used, delivered }] in time order.
 * `end` is the level at the end of the day (it never rises except by a delivery), `used` the litres burnt that
 * day (null for the first row), `delivered` the litres of a delivery that day (0 if none).
 */
export function deriveDays(rows, tz, threshold = 100) {
  const out = [];
  let prev = null;
  const sorted = [...(rows || [])].sort((a, b) => ms(a.start) - ms(b.start));
  for (const row of sorted) {
    const lo = val(row.min ?? row.mean);
    const hi = val(row.max ?? row.mean);
    if (lo === null || hi === null) continue;
    const start = new Date(ms(row.start));
    let end;
    let used = null;
    let delivered = 0;
    if (prev === null) end = lo;
    else if (hi - Math.min(prev, lo) > threshold) {
      // Delivery: what was burnt before it (down to the day's low), then the tank stands at the day's high.
      used = Math.max(0, prev - lo);
      delivered = Math.round(hi - Math.min(prev, lo));
      end = hi;
    } else {
      end = Math.min(prev, lo);
      used = prev - end;
    }
    out.push({ start, key: dayKey(start, tz), end, used, delivered });
    prev = end;
  }
  return out;
}

/** Daily mean temperatures by day key. */
export const tempsByDay = (rows, tz) => {
  const m = new Map();
  for (const r of rows || []) {
    const v = val(r.mean);
    if (v !== null) m.set(dayKey(r.start, tz), v);
  }
  return m;
};

/** The last `n` calendar days up to today: [{ start, key, used, temp, avg7 }] (null where nothing was recorded). */
export function lastDays(days, temps, tz, now = new Date(), n = 30) {
  const byKey = new Map(days.map((d) => [d.key, d]));
  const out = [];
  for (let i = n - 1 + 6; i >= 0; i--) {
    const start = dayStart(now, tz, -i);
    const key = dayKey(start, tz);
    out.push({ start, key, used: byKey.get(key)?.used ?? null, temp: temps.get(key) ?? null });
  }
  // 7-day mean over the days that have a value (the six extra leading days only feed the first means).
  out.forEach((d, i) => {
    const w = out.slice(Math.max(0, i - 6), i + 1).filter((x) => x.used !== null);
    d.avg7 = w.length ? w.reduce((s, x) => s + x.used, 0) / w.length : null;
  });
  return out.slice(6);
}

/** Litres per calendar month: Map "2026-11" → { used, days } (days = days with a value). */
export function byMonth(days, tz) {
  const m = new Map();
  for (const d of days) {
    if (d.used === null) continue;
    const k = monthKey(d.start, tz);
    const e = m.get(k) || { used: 0, days: 0 };
    e.used += d.used;
    e.days += 1;
    m.set(k, e);
  }
  return m;
}

/** The last 12 calendar months (oldest first) with this year's and the previous year's litres. */
export function lastMonths(days, tz, now = new Date()) {
  const m = byMonth(days, tz);
  const p = parts(now.getTime(), tz);
  const out = [];
  for (let i = 11; i >= 0; i--) {
    const y = p.m - i < 0 ? p.y - 1 : p.y;
    const mo = (((p.m - i) % 12) + 12) % 12;
    const key = `${y}-${String(mo + 1).padStart(2, "0")}`;
    const prevKey = `${y - 1}-${String(mo + 1).padStart(2, "0")}`;
    out.push({
      y,
      m: mo,
      key,
      used: m.get(key)?.used ?? null,
      prev: m.get(prevKey)?.used ?? null,
      current: i === 0,
    });
  }
  return out;
}

/** Deliveries: [{ start, litres }] newest last. */
export const deliveries = (days) =>
  days.filter((d) => d.delivered > 0).map((d) => ({ start: d.start, litres: d.delivered }));

/**
 * Litres this calendar year up to now, and the previous year up to the same day. `prev` is null when the
 * history does not reach back to the start of the previous year (a partial year would mislead).
 */
export function yearToDate(days, tz, now = new Date()) {
  const p = parts(now.getTime(), tz);
  const md = `${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
  let cur = 0;
  let prev = 0;
  for (const d of days) {
    if (d.used === null) continue;
    const y = Number(d.key.slice(0, 4));
    if (y === p.y) cur += d.used;
    else if (y === p.y - 1 && d.key.slice(5) <= md) prev += d.used;
  }
  const reaches = days.length && days[0].key <= `${p.y - 1}-01-07`;
  return { year: p.y, cur, prev: reaches ? prev : null };
}
