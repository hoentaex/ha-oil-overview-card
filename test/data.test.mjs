// Tests run in America/New_York (see package.json) while the "server" is in Europe/Berlin.
import assert from "node:assert/strict";
import { test } from "node:test";
import { daysView, hdd } from "../src/charts.js";
import { Cache, deriveDays, fetchDaily, lastDays, lastMonths, tempsByDay, yearToDate } from "../src/data.js";
import { translator } from "../src/shared.js";
import { zoned } from "../src/tz.js";

const TZ = "Europe/Berlin";
const day = (y, m, d) => zoned(y, m - 1, d, 0, TZ).getTime();
const row = (y, m, d, min, max = min) => ({ start: day(y, m, d), min, max, mean: (min + max) / 2 });

test("deriveDays: one reading a day, used = drop since yesterday", () => {
  const days = deriveDays([row(2026, 11, 13, 2282, 2292), row(2026, 11, 14, 2282), row(2026, 11, 15, 2264, 2282)], TZ);
  assert.deepEqual(
    days.map((d) => [d.key, d.end, d.used, d.delivered]),
    [
      ["2026-11-13", 2282, null, 0],
      ["2026-11-14", 2282, 0, 0],
      ["2026-11-15", 2264, 18, 0],
    ],
  );
});

test("deriveDays: the example delivery (590 → 2976 L on 28 Jan 2026) is a delivery, not negative consumption", () => {
  const days = deriveDays([row(2026, 1, 27, 590, 601), row(2026, 1, 28, 590, 2976), row(2026, 1, 29, 2959, 2976)], TZ);
  assert.equal(days[1].delivered, 2386);
  assert.equal(days[1].used, 0);
  assert.equal(days[1].end, 2976);
  assert.equal(days[2].used, 17);
});

test("deriveDays: a small rise is noise, the level stays and is not counted twice", () => {
  const days = deriveDays([row(2026, 3, 1, 1000), row(2026, 3, 2, 1000, 1003), row(2026, 3, 3, 995, 1003)], TZ);
  assert.deepEqual(
    days.map((d) => [d.end, d.used]),
    [
      [1000, null],
      [1000, 0],
      [995, 5],
    ],
  );
});

test("lastDays: 30 calendar days in the server's zone, a missing day is null, 7-day mean over the days with a value", () => {
  const rows = [];
  for (let d = 1; d <= 15; d++) if (d !== 10) rows.push(row(2026, 11, d, 2400 - d * 6));
  rows.unshift(row(2026, 10, 31, 2400));
  const days = deriveDays(rows, TZ);
  const out = lastDays(days, new Map(), TZ, new Date(day(2026, 11, 15) + 18 * 3600e3), 30);
  assert.equal(out.length, 30);
  assert.equal(out.at(-1).key, "2026-11-15");
  assert.equal(out.find((d) => d.key === "2026-11-10").used, null);
  assert.equal(out.find((d) => d.key === "2026-11-11").used, 12);
  assert.equal(out.at(-1).avg7, 42 / 6);
});

test("lastMonths and yearToDate: months with the previous year, YTD only when the history reaches January", () => {
  // Every day from 1 Jan 2025 to 15 Nov 2026: 2 L a day in 2025, 3 L a day in 2026 (starting high enough).
  const rows = [];
  let level = 5000;
  for (
    let t = day(2025, 1, 1);
    t <= day(2026, 11, 15);
    t = zoned(2025, 0, 1, 0, TZ).getTime() + rows.length * 864e5 + 864e5
  ) {
    const y = new Date(t).getUTCFullYear();
    rows.push({ start: t, min: level, max: level, mean: level });
    level -= y === 2025 ? 2 : 3;
    if (rows.length > 700) break;
  }
  const days = deriveDays(rows, TZ);
  const now = new Date(day(2026, 11, 15) + 12 * 3600e3);
  const months = lastMonths(days, TZ, now);
  assert.equal(months.length, 12);
  assert.equal(months.at(-1).key, "2026-11");
  assert.equal(months.at(-1).current, true);
  assert.equal(months.at(-1).used, 45);
  assert.equal(months.at(-1).prev, 30);
  const ytd = yearToDate(days, TZ, now);
  assert.equal(ytd.year, 2026);
  assert.ok(ytd.prev !== null);
  assert.equal(yearToDate(days.slice(30), TZ, now).prev, null);
  // A month the history only partly covers is null, not a too-small number.
  assert.equal(lastMonths(days.slice(-20), TZ, now)[10].used, null);
});

test("fetchDaily asks the recorder once per day for level and temperature, daily min / max / mean", async () => {
  const calls = [];
  const hass = {
    callWS: async (msg) => {
      calls.push(msg);
      return { "sensor.level": [row(2026, 11, 15, 2264)], "sensor.temp": [{ start: day(2026, 11, 15), mean: 1.4 }] };
    },
  };
  const cache = new Cache();
  const cfg = { level_entity: "sensor.level", outdoor_temp_entity: "sensor.temp" };
  const now = new Date(day(2026, 11, 15) + 18 * 3600e3);
  const a = await fetchDaily(hass, cache, cfg, TZ, now);
  await fetchDaily(hass, cache, cfg, TZ, now);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].period, "day");
  assert.deepEqual(calls[0].statistic_ids, ["sensor.level", "sensor.temp"]);
  assert.equal(tempsByDay(a.temp, TZ).get("2026-11-15"), 1.4);
});

test("days view: litres per heating degree day in the resting readout", () => {
  const rows = [
    { start: new Date(day(2026, 11, 14)), used: 10, temp: 5, avg7: 10 },
    { start: new Date(day(2026, 11, 15)), used: 6, temp: 9, avg7: 8 },
  ];
  const v = daysView(rows, { t: translator("de"), lang: "de", tz: TZ, base: 15 });
  assert.equal(hdd(5, 15) + hdd(9, 15), 16);
  assert.match(v.rest, /1,00 L je Heizgradtag/);
  assert.match(v.at(0), /Sa\. 14\.11\./);
});
