#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const repoRoot = process.cwd();
const sfJsonPath = path.join(repoRoot, "src/common/sf.json");
const overridesPath = path.join(repoRoot, "scripts/sf-glyph-overrides.json");
const sfDatPath = path.join(repoRoot, "src/common/sf.dat");
const args = new Set(process.argv.slice(2));
const checkOnly = args.has("--check");
const allowMissingGlyphs = args.has("--allow-missing-glyphs");
const sourceArg = process.argv.slice(2).find((arg) => arg.startsWith("--source="));
const defaultBundleBase = "/Users/aesign/Downloads/Resources";
const bundleBase =
  (sourceArg ? sourceArg.replace("--source=", "") : "") ||
  process.env.SF_RESOURCES_DIR ||
  defaultBundleBase;
const localizedSuffixes = new Set([
  "ar",
  "he",
  "hi",
  "ja",
  "ko",
  "th",
  "zh",
  "my",
  "km",
  "bn",
  "mr",
  "gu",
  "pa",
  "kn",
  "ml",
  "mni",
  "or",
  "sat",
  "si",
  "ta",
  "te",
  "el",
  "ru",
]);

function readPlistJson(fileName) {
  const filePath = path.join(bundleBase, fileName);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing source file: ${filePath}`);
  }
  const output = execFileSync("plutil", ["-convert", "json", "-o", "-", filePath], {
    encoding: "utf8",
  });
  return JSON.parse(output);
}

function normalizeYear(value) {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

function buildLocaleFallbackNames(name) {
  const results = new Set();
  const localeSuffixes = [".rtl", ".ar", ".he", ".hi", ".ja", ".ko", ".th", ".zh", ".my", ".km"];
  let changed = true;
  const queue = [name];
  while (queue.length && changed) {
    changed = false;
    const current = queue.shift();
    for (const suffix of localeSuffixes) {
      if (current.endsWith(suffix)) {
        const next = current.slice(0, -suffix.length);
        if (!results.has(next)) {
          results.add(next);
          queue.push(next);
          changed = true;
        }
      }
    }
  }
  return Array.from(results);
}

function buildDirectionalFallbackNames(name) {
  const results = new Set();
  const swapPairs = [
    [".forward.", ".right."],
    [".backward.", ".left."],
  ];
  for (const [from, to] of swapPairs) {
    if (name.includes(from)) {
      results.add(name.replace(from, to));
    }
  }
  return Array.from(results);
}

function titleFromKey(key) {
  if (key === "all") return "All";
  if (key === "whatsnew") return "What’s New";
  if (key === "multicolor") return "Multicolor";
  if (key === "variablecolor") return "Variable Color";
  return key
    .replace(/and/g, " and ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function readJsonFile(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function readSfDatGlyphMap(filePath) {
  if (!fs.existsSync(filePath)) return new Map();
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/);
  if (lines.length < 2) return new Map();
  const glyphs = Array.from(lines[0] || "");
  const names = lines
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean);
  const size = Math.min(glyphs.length, names.length);
  const map = new Map();
  for (let i = 0; i < size; i++) {
    if (!map.has(names[i])) {
      map.set(names[i], glyphs[i]);
    }
  }
  if (glyphs.length !== names.length) {
    console.warn(
      `[sf:update] sf.dat mismatch: glyphs=${glyphs.length}, names=${names.length}, using first ${size}`
    );
  } else {
    console.log(`[sf:update] sf.dat mapping loaded: ${size}`);
  }
  return map;
}

function isLocalizedVariant(name) {
  const match = name.match(/\.([a-zA-Z-]+)$/);
  if (!match) return false;
  return localizedSuffixes.has(match[1]);
}

const existing = readJsonFile(sfJsonPath, { categories: [], symbols: [] });
const overrides = readJsonFile(overridesPath, {});
const sfDatGlyphByName = readSfDatGlyphMap(sfDatPath);

const categoriesRaw = readPlistJson("categories.plist");
const order = readPlistJson("symbol_order.plist");
const filteredOrder = order.filter((name) => !isLocalizedVariant(name));
const symbolCategories = readPlistJson("symbol_categories.plist");
const symbolSearch = readPlistJson("symbol_search.plist");
const availability = readPlistJson("name_availability.plist");
const restrictions = readPlistJson("symbol_restrictions.strings");
const aliases = readPlistJson("name_aliases.strings");
const reverseAliases = new Map();
for (const [legacyName, canonicalName] of Object.entries(aliases || {})) {
  if (!reverseAliases.has(canonicalName)) {
    reverseAliases.set(canonicalName, []);
  }
  reverseAliases.get(canonicalName).push(legacyName);
}

const existingByName = new Map(existing.symbols.map((item) => [item.name, item]));
const existingCategoryByName = new Map(existing.categories.map((item) => [item.name, item]));

const categories = categoriesRaw.map((entry) => {
  const prior = existingCategoryByName.get(entry.key);
  return {
    name: entry.key,
    title: prior?.title || titleFromKey(entry.key),
    symbol: entry.icon,
  };
});

const missingGlyphs = [];
const symbols = [];

for (const name of filteredOrder) {
  const forwardAliasName = typeof aliases?.[name] === "string" ? aliases[name] : null;
  const reverseAliasNames = reverseAliases.get(name) || [];
  const localeFallbacks = buildLocaleFallbackNames(name);
  const directionalFallbacks = [
    ...buildDirectionalFallbackNames(name),
    ...localeFallbacks.flatMap((candidate) => buildDirectionalFallbackNames(candidate)),
  ];
  const localeFallbackPrior =
    localeFallbacks
      .map((candidate) => existingByName.get(candidate))
      .find(Boolean) ||
    localeFallbacks
      .map((candidate) => (typeof aliases?.[candidate] === "string" ? existingByName.get(aliases[candidate]) : null))
      .find(Boolean) ||
    localeFallbacks
      .flatMap((candidate) => reverseAliases.get(candidate) || [])
      .map((candidate) => existingByName.get(candidate))
      .find(Boolean) ||
    directionalFallbacks
      .map((candidate) => existingByName.get(candidate))
      .find(Boolean) ||
    null;

  const prior =
    existingByName.get(name) ||
    (forwardAliasName ? existingByName.get(forwardAliasName) : null) ||
    reverseAliasNames.map((candidate) => existingByName.get(candidate)).find(Boolean) ||
    localeFallbackPrior ||
    null;
  const datGlyph =
    sfDatGlyphByName.get(name) ||
    (forwardAliasName ? sfDatGlyphByName.get(forwardAliasName) : null) ||
    reverseAliasNames.map((candidate) => sfDatGlyphByName.get(candidate)).find(Boolean) ||
    localeFallbacks.map((candidate) => sfDatGlyphByName.get(candidate)).find(Boolean) ||
    directionalFallbacks.map((candidate) => sfDatGlyphByName.get(candidate)).find(Boolean) ||
    null;
  const overrideGlyph = overrides[name];
  const glyph =
    typeof overrideGlyph === "string"
      ? overrideGlyph
      : prior?.symbol || datGlyph;

  if (!glyph) {
    missingGlyphs.push(name);
  }

  symbols.push({
    symbol: glyph || "",
    name,
    categories: Array.isArray(symbolCategories[name]) ? symbolCategories[name] : [],
    searchTerms: Array.isArray(symbolSearch[name]) ? symbolSearch[name] : [],
    availableFrom: normalizeYear(availability?.symbols?.[name]),
    restriction: restrictions?.[name] ?? null,
  });
}

const next = { categories, symbols };

const added = symbols.filter((s) => !existingByName.has(s.name)).map((s) => s.name);
const removed = existing.symbols
  .filter((s) => !symbols.some((n) => n.name === s.name))
  .map((s) => s.name);

console.log(`[sf:update] symbols: ${symbols.length}`);
console.log(`[sf:update] categories: ${categories.length}`);
console.log(`[sf:update] localized filtered out: ${order.length - filteredOrder.length}`);
console.log(`[sf:update] added: ${added.length}`);
console.log(`[sf:update] removed: ${removed.length}`);
if (added.length) {
  console.log(`[sf:update] added names: ${added.slice(0, 20).join(", ")}${added.length > 20 ? " ..." : ""}`);
}
if (removed.length) {
  console.log(
    `[sf:update] removed names: ${removed.slice(0, 20).join(", ")}${removed.length > 20 ? " ..." : ""}`
  );
}

if (missingGlyphs.length) {
  console.log(`[sf:update] missing glyphs: ${missingGlyphs.length}`);
  console.log(
    `[sf:update] missing glyph names: ${missingGlyphs.slice(0, 30).join(", ")}${
      missingGlyphs.length > 30 ? " ..." : ""
    }`
  );
  console.log(`[sf:update] fill them in scripts/sf-glyph-overrides.json`);
  if (!allowMissingGlyphs) {
    process.exitCode = 2;
  }
}

if (!checkOnly && (allowMissingGlyphs || missingGlyphs.length === 0)) {
  fs.writeFileSync(sfJsonPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`[sf:update] wrote ${path.relative(repoRoot, sfJsonPath)}`);
} else if (checkOnly) {
  console.log("[sf:update] check mode: no file write");
} else {
  console.log("[sf:update] skipped write because of missing glyphs");
}
