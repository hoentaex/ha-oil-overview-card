// Range forecast: the tank is run down day by day with litres per day taken from a monthly profile, so winter
// empties it fast and summer hardly at all. Several profiles give the scenarios; nothing here looks at prices.
import { monthlyProfile } from "./data.js";
import { dayStart, parts } from "./tz.js";

const MAX_DAYS = 365 * 6;
const WINTER = new Set([10, 11, 0, 1, 2]); // Nov–Mar

/** Fills months without history with the mean of the known ones; null when no month is known. */
export function completeProfile(profile) {
  const known = profile.filter((v) => v !== null);
  if (!known.length) return null;
  const mean = known.reduce((s, v) => s + v, 0) / known.length;
  return profile.map((v) => (v === null ? mean : v));
}

/**
 * Runs the tank down from `level` (litres, now) with `perDay(month)` litres a day. Returns the day the reserve is
 * reached, the day it is empty, and one point a month (plus the last) for drawing. null dates when the tank lasts
 * longer than six years (or never empties).
 */
export function runDown(level, perDay, { reserve = 0, now = new Date(), tz } = {}) {
  let l = level;
  let d = dayStart(now, tz, 0);
  let reserveAt = level <= reserve ? now : null;
  const points = [{ t: now.getTime(), v: level }];
  for (let i = 0; i < MAX_DAYS && l > 0; i++) {
    const m = parts(d.getTime(), tz).m;
    const rate = Math.max(0, perDay(m));
    l -= rate;
    d = dayStart(d, tz, 1);
    if (!reserveAt && l <= reserve) reserveAt = d;
    if (parts(d.getTime(), tz).d === 1 || l <= 0) points.push({ t: d.getTime(), v: Math.max(0, l) });
  }
  return { reserveAt, emptyAt: l <= 0 ? d : null, points };
}

/** Litres per day for each calendar month from the days within [from, to). */
const profileBetween = (days, tz, from, to) =>
  monthlyProfile(
    days.filter((d) => d.start >= from && d.start < to),
    tz,
    to,
  );

/**
 * The scenarios for the range section. The first one ("mean": all years averaged per calendar month) also drives
 * the header pill and the forecast line. Profiles that lack a month (history too short) are left out, except the
 * mean, whose gaps are filled with the average of the known months.
 */
export function scenarios(days, { level, reserve, tz, now = new Date(), daysReach = null }) {
  if (level === null || !days.length) return [];
  const opts = { reserve, now, tz };
  const out = [];
  const mean = completeProfile(monthlyProfile(days, tz, now));
  if (!mean) return [];
  out.push({ id: "mean", main: true, ...runDown(level, (m) => mean[m], opts) });

  const yearAgo = dayStart(now, tz, -365);
  const last12 = profileBetween(days, tz, yearAgo, dayStart(now, tz, 0));
  if (last12.every((v) => v !== null)) out.push({ id: "last12", ...runDown(level, (m) => last12[m], opts) });
  const prev12 = profileBetween(days, tz, dayStart(now, tz, -730), yearAgo);
  if (prev12.every((v) => v !== null)) out.push({ id: "prev12", ...runDown(level, (m) => prev12[m], opts) });

  out.push({ id: "cold", ...runDown(level, (m) => mean[m] * (WINTER.has(m) ? 1.25 : 1), opts) });

  const recent = days.slice(-30).filter((d) => d.used !== null);
  const rate = recent.length ? recent.reduce((s, d) => s + d.used, 0) / recent.length : 0;
  if (rate > 0) out.push({ id: "linear", dim: true, ...runDown(level, () => rate, opts) });
  if (daysReach !== null && daysReach > 0) {
    const emptyAt = new Date(now.getTime() + daysReach * 864e5);
    const reserveAt = new Date(now.getTime() + Math.max(0, (level - reserve) / level) * daysReach * 864e5);
    out.push({ id: "oilfox", dim: true, reserveAt, emptyAt, points: [] });
  }
  return out;
}

/** Days from `now` to `date`, rounded. */
export const daysUntil = (date, now = new Date()) => Math.round((date.getTime() - now.getTime()) / 864e5);
