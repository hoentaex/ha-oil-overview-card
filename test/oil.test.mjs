// Tests run in America/New_York (see package.json) while the "server" is in Europe/Berlin.
import assert from "node:assert/strict";
import { test } from "node:test";
import { capacityOf, readTank, statusOf } from "../src/oil.js";
import { fmtL, fmtNum, translator } from "../src/shared.js";
import { fillHeight, tankHTML } from "../src/tank.js";

const st = (state, attributes = {}) => ({ state: String(state), attributes });

test("capacity: configured value wins, else derived from level and percent (example: 2264 L at 76 %)", () => {
  assert.deepEqual(capacityOf(2264, 76, 3000), { litres: 3000, derived: false });
  assert.deepEqual(capacityOf(2264, 76, null), { litres: 2980, derived: true });
  assert.equal(capacityOf(2264, null, null), null);
  assert.equal(capacityOf(0, 0, ""), null);
});

test("readTank: room for a delivery, litres above the reserve, last delivery from input_datetime's timestamp", () => {
  const hass = {
    states: {
      "sensor.level": st(2264),
      "sensor.pct": st(76),
      "input_datetime.refill": st("2026-01-28 16:00:00", { timestamp: Date.UTC(2026, 0, 28, 15) / 1000 }),
      "input_number.amount": st(2386),
    },
  };
  const tank = readTank(hass, {
    level_entity: "sensor.level",
    percent_entity: "sensor.pct",
    reserve: 300,
    refill_date_entity: "input_datetime.refill",
    refill_amount_entity: "input_number.amount",
  });
  assert.equal(tank.capacity, 2980);
  assert.equal(tank.space, 716);
  assert.equal(tank.aboveReserve, 1964);
  assert.equal(tank.refillDate.toISOString(), "2026-01-28T15:00:00.000Z");
  assert.equal(tank.refillAmount, 2386);
});

test("readTank: an unavailable level gives null, not 0", () => {
  const tank = readTank(
    { states: { "sensor.level": st("unavailable") } },
    { level_entity: "sensor.level", reserve: 300 },
  );
  assert.equal(tank.level, null);
  assert.equal(tank.space, null);
  assert.equal(statusOf(tank), "unknown");
});

test("status: ok above the reserve, low at or below it, empty under 5 %", () => {
  const base = { reserve: 300, capacity: 2980 };
  assert.equal(statusOf({ ...base, level: 2264, percent: 76 }), "ok");
  assert.equal(statusOf({ ...base, level: 300, percent: 10 }), "low");
  assert.equal(statusOf({ ...base, level: 100, percent: 3.4 }), "empty");
});

test("formatting: German thousands dot, English comma", () => {
  assert.equal(fmtL(2264, "de"), "2.264 L");
  assert.equal(fmtL(2264, "en"), "2,264 L");
  assert.equal(fmtNum(null, "de"), "–");
  assert.equal(translator("de")("reach_until", { date: "Jan. 2028" }), "reicht bis Jan. 2028");
});

test("tank graphic: reserve line at its height, no bubbles without animation, a sliver of oil when empty", () => {
  const html = tankHTML({ percent: 76, reserve: 298, capacity: 2980, label: "76 %", reserveLabel: "Reserve" });
  assert.match(html, /bottom:10\.0%/);
  assert.match(html, /class="bubble"/);
  assert.doesNotMatch(
    tankHTML({ percent: 76, reserve: 0, capacity: 2980, label: "", reserveLabel: "", animate: false }),
    /class="bubble"|class="reserve"/,
  );
  assert.equal(fillHeight(0), 1.5);
  assert.equal(fillHeight(null), 0);
});
