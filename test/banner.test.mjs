import assert from "node:assert/strict";
import { test } from "node:test";
import { isNight, oilTop, sceneSVG, wavePath } from "../src/banner.js";

test("night picture follows the dark theme unless forced", () => {
  assert.equal(isNight({ themes: { darkMode: true } }, {}), true);
  assert.equal(isNight({ themes: { darkMode: false } }, {}), false);
  assert.equal(isNight({ themes: { darkMode: true } }, { illustration_theme: "day" }), false);
  assert.equal(isNight({}, { illustration_theme: "night" }), true);
});

test("the oil surface covers the whole tank at every step of its loop", () => {
  // The tank spans x 112–186; the waves move by one wave length (24) left (front) and right (back).
  const ends = (d) => {
    const xs = [...d.matchAll(/M(-?[\d.]+)|H(-?[\d.]+)/g)].map((m) => Number(m[1] ?? m[2]));
    const start = xs[0];
    const width = 7 * 24;
    return [start, start + width];
  };
  const [a, b] = ends(wavePath(64, 7, 30));
  for (const shift of [-24, 0, 24]) {
    assert.ok(a + shift <= 112, `left edge at shift ${shift}`);
    assert.ok(b + shift >= 186, `right edge at shift ${shift}`);
  }
});

test("oil level in scene units, never quite empty, clamped when over full", () => {
  assert.equal(oilTop(100), 18);
  assert.equal(oilTop(0), oilTop(2));
  assert.equal(oilTop(150), 18);
  assert.ok(Math.abs(oilTop(76) - (18 + 58 * 0.24)) < 1e-9);
});

test("the scene: reserve line only for a reserve inside the tank, bubbles only when animated, own clip id", () => {
  const s = sceneSVG({
    uid: "x1",
    percent: 76,
    reserveFrac: 0.1,
    pctLabel: "76 %",
    levelLabel: "2.264 L",
    animate: true,
  });
  assert.match(s, /class="ob-reserve"/);
  assert.match(s, /class="ob-bub"/);
  assert.match(s, /clip-path="url\(#ob-clip-x1\)"/);
  assert.match(s, />76 %</);
  const still = sceneSVG({ uid: "x2", percent: 76, reserveFrac: 0, pctLabel: "", levelLabel: "", animate: false });
  assert.doesNotMatch(still, /ob-reserve|ob-bub|class="ob-wave front anim"/);
});
