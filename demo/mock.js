// Fake `hass` for the demo page: the example setup (OilFox sensor plus the helpers the card reads) with an
// adjustable fill level. Later phases add recorder statistics here.

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
  capacity: CAPACITY,
  reserve: 300,
};

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
    },
    callWS: async () => [],
  };
}
