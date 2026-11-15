// Bundles src/ into the single HACS file dist/ha-oil-overview-card.js (version stamped in).
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { build } from "esbuild";

const root = fileURLToPath(new URL("..", import.meta.url));
const pkg = JSON.parse(readFileSync(`${root}package.json`, "utf8"));
const outfile = `${root}dist/ha-oil-overview-card.js`;
await build({
  entryPoints: [`${root}src/oil-overview-card.js`],
  bundle: true,
  format: "esm",
  target: "es2021",
  outfile,
  define: { __VERSION__: JSON.stringify(pkg.version) },
  legalComments: "inline",
  loader: { ".webp": "dataurl" },
  logLevel: "warning",
});
const size = readFileSync(outfile).length;
console.log(`Built dist/ha-oil-overview-card.js v${pkg.version} (${(size / 1024).toFixed(1)} KB)`);
