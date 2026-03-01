/**
 * Generates src/common/material.slim.json from the full material.json.
 *
 * Filters to only the "Material Symbols Rounded" icons (those where all five
 * legacy Material Icons families are listed as unsupported) and strips every
 * field that is not used by the UI (version, popularity, codepoint,
 * unsupported_families, sizes_px).
 *
 * Run via:  node scripts/slim-material-json.mjs
 * Or as part of the build:  npm run slim-material
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { join, dirname } from "path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "src", "common", "material.json");
const dest = join(root, "src", "common", "material.slim.json");

const LEGACY_FAMILIES = [
  "Material Icons",
  "Material Icons Outlined",
  "Material Icons Round",
  "Material Icons Sharp",
  "Material Icons Two Tone",
];

function isRounded(icon) {
  const uf = icon.unsupported_families;
  if (!Array.isArray(uf) || uf.length !== LEGACY_FAMILIES.length) return false;
  return LEGACY_FAMILIES.every((f, i) => uf[i] === f);
}

const full = JSON.parse(readFileSync(src, "utf8"));
const seen = new Set();
const slim = [];

for (const icon of full.icons) {
  if (!isRounded(icon) || seen.has(icon.name)) continue;
  seen.add(icon.name);
  slim.push({ name: icon.name, categories: icon.categories, tags: icon.tags });
}

writeFileSync(dest, JSON.stringify(slim), "utf8");
console.log(`slim-material-json: wrote ${slim.length} icons → ${dest}`);
