// Calendar arithmetic in an IANA time zone (the Home Assistant server's, `hass.config.time_zone`) with Intl only.
// Without a zone (undefined) the browser's local time is used.

const formatters = new Map();
const formatter = (tz) => {
  if (!formatters.has(tz))
    formatters.set(
      tz,
      new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hourCycle: "h23",
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      }),
    );
  return formatters.get(tz);
};

/** The server's time zone from hass, or undefined (browser time) when it is missing or unknown to Intl. */
export function tzOf(hass) {
  const tz = hass?.config?.time_zone;
  if (!tz) return undefined;
  try {
    formatter(tz);
    return tz;
  } catch {
    return undefined;
  }
}

/** Wall-clock parts of instant `t` (ms) in `tz`: { y, m (0-11), d, h, mi, s, wd (0 = Sunday) }. */
export function parts(t, tz) {
  if (!tz) {
    const x = new Date(t);
    return {
      y: x.getFullYear(),
      m: x.getMonth(),
      d: x.getDate(),
      h: x.getHours(),
      mi: x.getMinutes(),
      s: x.getSeconds(),
      wd: x.getDay(),
    };
  }
  const p = Object.fromEntries(
    formatter(tz)
      .formatToParts(new Date(t))
      .map((x) => [x.type, Number(x.value)]),
  );
  const y = p.year;
  const m = p.month - 1;
  const d = p.day;
  return { y, m, d, h: p.hour, mi: p.minute, s: p.second, wd: new Date(Date.UTC(y, m, d)).getUTCDay() };
}

const offset = (t, tz) => {
  const p = parts(t, tz);
  return Date.UTC(p.y, p.m, p.d, p.h, p.mi, p.s) - Math.floor(t / 1000) * 1000;
};

/**
 * Instant (Date) of the wall-clock time y-m-d h:00 in `tz`. Day and month overflow like Date.UTC
 * (d = 32 is the next month). A time skipped by the clock change resolves to the instant after the gap.
 */
export function zoned(y, m, d, h = 0, tz = undefined) {
  if (!tz) return new Date(y, m, d, h);
  const guess = Date.UTC(y, m, d, h);
  let t = guess - offset(guess, tz);
  const o2 = offset(t, tz);
  if (guess - o2 !== t) t = Math.max(t, guess - o2);
  return new Date(t);
}

/** Midnight of the calendar day of `date` in `tz`, plus `n` days. */
export function dayStart(date, tz, n = 0) {
  const p = parts(date.getTime(), tz);
  return zoned(p.y, p.m, p.d + n, 0, tz);
}
