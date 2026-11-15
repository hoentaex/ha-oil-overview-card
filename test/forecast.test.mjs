// Tests run in America/New_York (see package.json) while the "server" is in Europe/Berlin.
import assert from "node:assert/strict";
import { test } from "node:test";
import { lastMonths, monthlyProfile } from "../src/data.js";
import { completeProfile, runDown, scenarios } from "../src/forecast.js";
import { badge, compareSection } from "../src/sections.js";
import { translator } from "../src/shared.js";
import { dayStart, zoned } from "../src/tz.js";

const TZ = "Europe/Berlin";
const now = new Date(zoned(2026, 10, 15, 18, TZ));

/** Two years of days ending today: 10 L/day Nov–Mar, 1 L/day otherwise. */
const history = (years = 2) => {
  const out = [];
  for (let i = 365 * years; i >= 0; i--) {
    const start = dayStart(now, TZ, -i);
    const key = start.toLocaleDateString("sv-SE", { timeZone: TZ });
    const m = Number(key.slice(5, 7)) - 1;
    out.push({ start, key, used: [10, 11, 0, 1, 2].includes(m) ? 10 : 1, delivered: 0 });
  }
  return out;
};

test("monthly profile: litres per day per calendar month; months without history are null", () => {
  const p = monthlyProfile(history(), TZ, now);
  assert.equal(p[0], 10);
  assert.equal(p[6], 1);
  const short = monthlyProfile(history().slice(-60), TZ, now);
  assert.equal(short[6], null);
  assert.equal(completeProfile([null, 4, null, 2, null, null, null, null, null, null, null, null])[0], 3);
});

test("runDown: winter empties the tank faster than summer; reserve date before empty date", () => {
  const p = monthlyProfile(history(), TZ, now);
  const r = runDown(500, (m) => p[m], { reserve: 300, now, tz: TZ });
  // 15 Nov → 30 Nov at 10 L/day: 150 L; 300 L reserve reached on 5 Dec, empty on 4 Jan.
  assert.equal(r.reserveAt.toLocaleDateString("sv-SE", { timeZone: TZ }), "2026-12-05");
  assert.equal(r.emptyAt.toLocaleDateString("sv-SE", { timeZone: TZ }), "2027-01-04");
  assert.ok(r.points.length > 2);
});

test("scenarios: mean first, cold winter earlier, OilFox from days reach; none without a level", () => {
  const sc = scenarios(history(), { level: 2264, reserve: 300, tz: TZ, now, daysReach: 437 });
  const ids = sc.map((s) => s.id);
  assert.deepEqual(ids, ["mean", "last12", "prev12", "cold", "linear", "oilfox"]);
  const by = Object.fromEntries(sc.map((s) => [s.id, s]));
  assert.ok(by.cold.emptyAt < by.mean.emptyAt);
  assert.equal(Math.round((by.oilfox.emptyAt - now) / 864e5), 437);
  assert.deepEqual(scenarios(history(), { level: null, reserve: 300, tz: TZ, now }), []);
  assert.deepEqual(
    scenarios(history().slice(-100), { level: 2264, reserve: 300, tz: TZ, now }).map((s) => s.id),
    ["mean", "cold", "linear"],
  );
});

test("lastMonths: the running month is compared up to today's day in both years", () => {
  const months = lastMonths(history(), TZ, now);
  const nov = months.at(-1);
  assert.equal(nov.upTo, 15);
  assert.equal(nov.used, 150);
  assert.equal(nov.prev, 150);
});

test("comparison: badges red for more, green for less, blue for degree days; message without a previous year", () => {
  assert.match(badge(110, 100), /up">\+10 %/);
  assert.match(badge(90, 100), /down">-10 %/);
  assert.match(badge(90, 100, true), /neutral/);
  assert.equal(badge(null, 100), "");
  const t = translator("de");
  const html = compareSection(lastMonths(history(1).slice(-200), TZ, now), { t, lang: "de" });
  assert.match(html, /mehr als ein Jahr/);
});
