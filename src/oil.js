// Reading the tank from the states: level, capacity, room for a delivery, reserve, last delivery, measurement times.

const num = (hass, id) => {
  const s = id ? hass?.states?.[id] : undefined;
  if (!s) return null;
  const n = Number.parseFloat(s.state);
  return Number.isFinite(n) ? n : null;
};

const time = (hass, id) => {
  const s = id ? hass?.states?.[id] : undefined;
  if (!s || ["unknown", "unavailable", ""].includes(s.state)) return null;
  // input_datetime keeps local wall-clock time in its state; its `timestamp` attribute is the real instant.
  const ts = s.attributes?.timestamp;
  if (typeof ts === "number" && id.startsWith("input_datetime.")) return new Date(ts * 1000);
  const t = Date.parse(s.state);
  return Number.isFinite(t) ? new Date(t) : null;
};

/**
 * Tank capacity in litres: the `capacity` option, else derived from level and percent (2264 L at 76 % ≈ 2980 L,
 * rounded to 10 L). null when neither is known.
 */
export function capacityOf(level, percent, configured) {
  const c = Number(configured);
  if (configured !== null && configured !== undefined && configured !== "" && Number.isFinite(c) && c > 0) {
    return { litres: c, derived: false };
  }
  if (level > 0 && percent > 0 && percent <= 100)
    return { litres: Math.round(level / (percent / 100) / 10) * 10, derived: true };
  return null;
}

/** Everything the tank section shows, from the states. `level` is null when the sensor is missing or unavailable. */
export function readTank(hass, config) {
  const level = num(hass, config.level_entity);
  const pctState = num(hass, config.percent_entity);
  const cap = capacityOf(level, pctState, config.capacity);
  const capacity = cap?.litres ?? null;
  const percent = pctState ?? (level !== null && capacity ? (level / capacity) * 100 : null);
  const reserve = Math.max(0, Number(config.reserve) || 0);
  return {
    level,
    percent: percent === null ? null : Math.max(0, Math.min(100, percent)),
    capacity,
    capacityDerived: cap?.derived ?? false,
    space: level !== null && capacity ? Math.max(0, capacity - level) : null,
    reserve,
    aboveReserve: level !== null ? level - reserve : null,
    lastMeasurement: time(hass, config.last_measurement_entity),
    nextMeasurement: time(hass, config.next_measurement_entity),
    daysReach: num(hass, config.days_reach_entity),
    refillDate: time(hass, config.refill_date_entity),
    refillAmount: num(hass, config.refill_amount_entity),
  };
}

/** Status of the tank for the pill and the logo: ok / low (at or below the reserve) / empty (below 5 %) / unknown. */
export function statusOf(tank) {
  if (tank.level === null) return "unknown";
  if (tank.percent !== null && tank.percent < 5) return "empty";
  if (tank.reserve > 0 && tank.level <= tank.reserve) return "low";
  return "ok";
}

export const STATUS_COLOR = {
  ok: "var(--ooc-good)",
  low: "var(--ooc-warn)",
  empty: "var(--ooc-bad)",
  unknown: "var(--ooc-sub)",
};
