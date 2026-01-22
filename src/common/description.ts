import { IconPairDescription, MaterialIcon, SfSymbol } from "./types";

const METADATA_KEYS = [
  "SFS",
  "SFG",
  "SFC",
  "SFT",
  "MS",
  "MSC",
  "MST",
] as const;

type MetadataKey = (typeof METADATA_KEYS)[number];

function joinList(values: string[]): string {
  return values.filter(Boolean).join(", ");
}

function splitList(value: string): string[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function buildPairDescription(
  sf: Pick<SfSymbol, "name" | "symbol" | "categories" | "searchTerms">,
  material: Pick<MaterialIcon, "name" | "categories" | "tags">
): string {
  const parts: Record<MetadataKey, string> = {
    SFS: sf.name,
    SFG: sf.symbol,
    SFC: joinList(sf.categories),
    SFT: joinList(sf.searchTerms),
    MS: material.name,
    MSC: joinList(material.categories),
    MST: joinList(material.tags),
  };

  return METADATA_KEYS.map((key) => `${key}: ${parts[key] ?? ""}`).join("\n");
}

export function parsePairDescription(
  description: string
): IconPairDescription | null {
  const lines = description.split(/\r?\n/);
  const fields: Record<MetadataKey, string> = {
    SFS: "",
    SFG: "",
    SFC: "",
    SFT: "",
    MS: "",
    MSC: "",
    MST: "",
  };

  for (const line of lines) {
    const match = line.match(/^([A-Z]{2,3}):\s*(.*)$/);
    if (!match) continue;
    const key = match[1] as MetadataKey;
    if (METADATA_KEYS.includes(key)) {
      fields[key] = match[2] ?? "";
    }
  }

  if (!fields.SFS && !fields.MS) {
    return null;
  }

  return {
    sfName: fields.SFS,
    sfGlyph: fields.SFG,
    sfCategories: splitList(fields.SFC),
    sfSearchTerms: splitList(fields.SFT),
    materialName: fields.MS,
    materialCategories: splitList(fields.MSC),
    materialTags: splitList(fields.MST),
  };
}
