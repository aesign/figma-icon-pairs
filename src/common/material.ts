import { MaterialIcon } from "./types";

export const MATERIAL_UNSUPPORTED_FAMILIES = [
  "Material Icons",
  "Material Icons Outlined",
  "Material Icons Round",
  "Material Icons Sharp",
  "Material Icons Two Tone",
] as const;

export function isRoundedMaterial(icon: MaterialIcon): boolean {
  if (!Array.isArray(icon.unsupported_families)) return false;
  if (icon.unsupported_families.length !== MATERIAL_UNSUPPORTED_FAMILIES.length) {
    return false;
  }

  return MATERIAL_UNSUPPORTED_FAMILIES.every(
    (value, index) => icon.unsupported_families[index] === value
  );
}

export function filterRoundedMaterialIcons(icons: MaterialIcon[]): MaterialIcon[] {
  const deduped = new Map<string, MaterialIcon>();

  for (const icon of icons) {
    if (!isRoundedMaterial(icon)) continue;
    if (!deduped.has(icon.name)) {
      deduped.set(icon.name, icon);
    }
  }

  return Array.from(deduped.values());
}
