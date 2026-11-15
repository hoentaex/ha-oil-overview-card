import assert from "node:assert/strict";
import { test } from "node:test";

globalThis.HTMLElement ??= class {};
const { detectConfig, editorSchema, fromFormData, toFormData } = await import("../src/editor.js");

const st = (state, attributes = {}) => ({ state: String(state), attributes });

test("detectConfig finds the example OilFox device, the Wolf outdoor temperature and the helpers", () => {
  const hass = {
    states: {
      "sensor.oilfox_of0000000000_filllevelquantity": st(2264, { unit_of_measurement: "L" }),
      "sensor.oilfox_of0000000000_filllevelpercent": st(76),
      "sensor.oilfox_of0000000000_lastmeasurement": st("2026-11-15T16:18:24+00:00"),
      "sensor.oilfox_of0000000000_nextmeasurement": st("2026-11-16T16:21:34+00:00"),
      "sensor.oilfox_of0000000000_daysreach": st(437),
      "sensor.wolf_aussentemperatur": st(6, { unit_of_measurement: "°C", device_class: "temperature" }),
      "input_datetime.heizol_letzte_befullung": st("2026-01-28 16:00:00"),
      "input_number.heizol_letzte_liefermenge": st(2386),
      "sensor.heizol_tagespreis": st(169.34),
      "input_number.heizol_preis": st(98.6),
      "sensor.olverbrauch_daily": st(18, { unit_of_measurement: "L" }),
    },
  };
  assert.deepEqual(detectConfig(hass), {
    level_entity: "sensor.oilfox_of0000000000_filllevelquantity",
    percent_entity: "sensor.oilfox_of0000000000_filllevelpercent",
    last_measurement_entity: "sensor.oilfox_of0000000000_lastmeasurement",
    next_measurement_entity: "sensor.oilfox_of0000000000_nextmeasurement",
    days_reach_entity: "sensor.oilfox_of0000000000_daysreach",
    refill_date_entity: "input_datetime.heizol_letzte_befullung",
    refill_amount_entity: "input_number.heizol_letzte_liefermenge",
    price_entity: "sensor.heizol_tagespreis",
    paid_price_entity: "input_number.heizol_preis",
    outdoor_temp_entity: "sensor.wolf_aussentemperatur",
  });
});

test("form data round trip: defaults dropped, price unit as number, sections in card order", () => {
  const cfg = {
    level_entity: "sensor.l",
    capacity: 2980,
    reserve: 300,
    price_per_litres: 1,
    sections: ["price", "tank"],
  };
  const back = fromFormData(toFormData(cfg));
  assert.deepEqual(back, {
    level_entity: "sensor.l",
    capacity: 2980,
    price_per_litres: 1,
    sections: ["tank", "price"],
  });
  assert.equal(toFormData({}, true).popup, true);
  assert.deepEqual(fromFormData(toFormData({}, true), true), {});
});

test("schema: the popup switch only in the mini card's editor", () => {
  const flat = (s) => s.flatMap((x) => (x.schema ? flat(x.schema) : [x.name]));
  assert.ok(!flat(editorSchema("de")).includes("popup"));
  assert.ok(flat(editorSchema("de", { mini: true })).includes("popup"));
});
