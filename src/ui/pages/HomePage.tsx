import { VariableGroupInfo, VariablePair } from "@common/types";
import sfDataset from "@common/sf.json";
import { Button } from "@ui/components/Button";
import { PairCard } from "@ui/components/PairCard";
import { SectionHeader } from "@ui/components/SectionHeader";
import { Input } from "@ui/components/Input";
import { EmptyState } from "@ui/components/EmptyState";
import styles from "@ui/styles/App.module.scss";
import { classes } from "@ui/utils/classes.util";
import { useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@ui/services/pluginApi";

type Props = {
  pairs: VariablePair[];
  loading: boolean;
  mappingComplete: boolean;
  selectionActive: boolean;
  isDevMode: boolean;
  readOnly: boolean;
  groupName: string | null;
  groups: VariableGroupInfo[];
  groupCounts: Record<string, number>;
  selectedGroupId: string | null;
  onGroupChange: (groupId: string | null) => void;
  onSearch: (value: string) => void;
  searchValue: string;
  onEdit: (pair: VariablePair) => void;
  onDelete: (pair: VariablePair) => void;
  onCreate: (initialSearch?: string) => void;
  onOpenSettings: () => void;
  canShowMoreMenu: boolean;
  showExportButton: boolean;
  showSettingsButton: boolean;
  onClearSelection: () => void;
};

export function HomePage({
  pairs,
  loading,
  mappingComplete,
  selectionActive,
  isDevMode,
  readOnly,
  groupName,
  groups,
  groupCounts,
  selectedGroupId,
  onGroupChange,
  onSearch,
  searchValue,
  onEdit,
  onDelete,
  onCreate,
  onOpenSettings,
  canShowMoreMenu,
  showExportButton,
  showSettingsButton,
  onClearSelection,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const [copying, setCopying] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const materialSvgs = useMemo(
    () =>
      import.meta.glob(
        "../../../node_modules/@material-design-icons/svg/round/*.svg",
        {
          as: "raw",
        }
      ),
    []
  );

  const copyText = async (value: string, success: string, failure: string) => {
    if (!value) {
      await notify(failure);
      return;
    }
    const attemptNative = async () => {
      try {
        if ((navigator as any)?.clipboard?.writeText) {
          await (navigator as any).clipboard.writeText(value);
          return true;
        }
      } catch (err) {
        console.warn("navigator clipboard failed", err);
      }
      return false;
    };

    const attemptLegacy = () => {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.left = "-9999px";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        const ok = document.execCommand("copy");
        document.body.removeChild(textarea);
        return ok;
      } catch (err) {
        console.warn("execCommand copy failed", err);
        return false;
      }
    };

    const ok = (await attemptNative()) || attemptLegacy();
    await notify(ok ? success : failure);
  };

  const loadMaterialSvg = async (name: string): Promise<string | null> => {
    const key =
      `../../../node_modules/@material-design-icons/svg/round/${name}.svg` as const;
    const altKey =
      `./node_modules/@material-design-icons/svg/round/${name}.svg` as const;
    const importer =
      (materialSvgs as Record<string, () => Promise<string>>)[key] ||
      (materialSvgs as Record<string, () => Promise<string>>)[altKey];
    if (!importer) return null;
    try {
      return await importer();
    } catch (err) {
      console.error("Material SVG import failed", err);
      return null;
    }
  };

  useEffect(() => {
    if (!mappingComplete) return;
    searchRef.current?.focus();
  }, [mappingComplete]);

  useEffect(() => {
    if (!isMoreOpen && !isFilterOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (moreMenuRef.current?.contains(target)) return;
      if (filterMenuRef.current?.contains(target)) return;
      setIsMoreOpen(false);
      setIsFilterOpen(false);
    };
    window.addEventListener("mousedown", onPointerDown);
    return () => window.removeEventListener("mousedown", onPointerDown);
  }, [isMoreOpen, isFilterOpen]);

  const filteredPairs = pairs ?? [];
  const sfNameByGlyph = useMemo(() => {
    const map = new Map<string, string>();
    const symbols = ((sfDataset as any)?.symbols ?? []) as Array<any>;
    for (const symbol of symbols) {
      if (typeof symbol?.symbol !== "string") continue;
      if (typeof symbol?.name !== "string") continue;
      map.set(symbol.symbol, symbol.name);
    }
    return map;
  }, []);
  const exportPairs = filteredPairs.map((pair) => ({
    id: pair.id,
    sf:
      sfNameByGlyph.get(
        pair.descriptionFields?.sfGlyph || pair.sfValue || ""
      ) || "",
    material:
      pair.descriptionFields?.materialName || pair.materialValue || "",
  }));

  const getSfDisplayName = (pair: VariablePair): string => {
    const glyph = pair.descriptionFields?.sfGlyph || pair.sfValue || "";
    const raw = pair.descriptionFields?.sfName || pair.name || "";
    return sfNameByGlyph.get(glyph) || raw.replace(/\s+/g, ".");
  };

  const handleExport = async () => {
    try {
      const payload = JSON.stringify(exportPairs, null, 2);
      const blob = new Blob([payload], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "icon-pairs-export.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      await notify(
        `Exported ${exportPairs.length} pair${exportPairs.length === 1 ? "" : "s"}`
      );
    } catch (err) {
      console.warn("export failed", err);
      await notify("Unable to export pairs");
    }
  };

  const exportLabel = `Export ${groupName ?? "current"} pairs`;
  const searchPlaceholder = selectionActive
    ? "Search pairs in selection..."
    : selectedGroupId?.includes("/")
    ? `Search ${groupName ?? selectedGroupId} pairs...`
    : "Search icon pairs...";
  const addPairLabel = selectedGroupId?.includes("/")
    ? `Add pair in ${groupName ?? selectedGroupId}`
    : "Add pair";

  return (
    <section className={styles.section}>
      <SectionHeader
        // title="Pairs"
        actions={
          <>
            <>
              {!isDevMode && !readOnly ? (
                <Button
                  variant="primary"
                  onClick={() => onCreate(searchValue)}
                  disabled={!mappingComplete}
                  icon="add"
                />
              ) : null}
              {canShowMoreMenu ? (
                <div className={styles.moreMenuWrap} ref={moreMenuRef}>
                  <Button
                    variant="secondary"
                    onClick={() => setIsMoreOpen((prev) => !prev)}
                    icon="more_horiz"
                    aria-expanded={isMoreOpen}
                    aria-haspopup="menu"
                  />
                  {isMoreOpen ? (
                    <div className={styles.moreMenu} role="menu">
                      <button
                        type="button"
                        className={styles.moreMenuItem}
                        onClick={() => {
                          setIsMoreOpen(false);
                          handleExport();
                        }}
                        disabled={loading || !mappingComplete}
                      >
                        {exportLabel}
                      </button>
                      <button
                        type="button"
                        className={styles.moreMenuItem}
                        onClick={() => {
                          setIsMoreOpen(false);
                          onOpenSettings();
                        }}
                      >
                        Settings
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : showExportButton ? (
                <Button
                  variant="secondary"
                  onClick={handleExport}
                  icon="download"
                  disabled={loading || !mappingComplete}
                />
              ) : showSettingsButton ? (
                <Button
                  variant="secondary"
                  onClick={onOpenSettings}
                  icon="settings"
                />
              ) : null}
            </>
          </>
        }
      >
        <div className={styles.homeFilters}>
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(event) => onSearch(event.target.value)}
            disabled={!mappingComplete}
            ref={searchRef}
          />
          <div className={styles.filterMenuWrap} ref={filterMenuRef}>
            <Button
              variant="secondary"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              icon="filter_list"
              aria-expanded={isFilterOpen}
              aria-haspopup="menu"
              disabled={!mappingComplete || groups.length === 0}
              className={classes(
                selectedGroupId?.includes("/") && styles.filterButtonActive,
                selectedGroupId?.includes("/") && styles.filterButtonNestedActive
              )}
            />
            {isFilterOpen ? (
              <div className={styles.moreMenu} role="menu">
                {groups.map((group) => (
                  <button
                    key={group.id}
                    type="button"
                    className={classes(
                      styles.moreMenuItem,
                      selectedGroupId === group.id && styles.moreMenuItemActive
                    )}
                    onClick={() => {
                      setIsFilterOpen(false);
                      onGroupChange(group.id);
                    }}
                  >
                    <span>{group.name}</span>
                    <span className={styles.moreMenuCount}>
                      {groupCounts[group.id] ?? 0}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </SectionHeader>
      {loading ? (
        <div className={styles.empty}>Loading pairs…</div>
      ) : !mappingComplete ? (
        <EmptyState
          title={
            readOnly
              ? "Select a design system"
              : isDevMode
              ? "Settings hidden in Dev Mode"
              : "Select collection and modes"
          }
          subtitle={
            readOnly
              ? "Open Settings to choose the design system library."
              : isDevMode
              ? "Open the plugin in Design mode to configure collection and modes."
              : "Open Settings to pick a collection and two modes to sync pairs."
          }
        />
      ) : filteredPairs.length === 0 ? (
        <EmptyState
          title={
            selectionActive
              ? "No pairs found in selection"
              : searchValue.trim()
              ? "No pairs match your search"
              : "No pairs for this collection"
          }
          subtitle={
            selectionActive
              ? "Clear the selection to view all pairs."
              : searchValue.trim()
              ? "Try another keyword."
              : isDevMode
              ? "Switch to Design mode to create pairs."
              : readOnly
              ? "Try another library collection."
              : "Create a pair to get started."
          }
        >
          {selectionActive ? (
            <Button variant="secondary" onClick={onClearSelection}>
              Clear selection
            </Button>
          ) : !isDevMode && !readOnly ? (
            <Button
              variant="primary"
              icon="add"
              onClick={() => onCreate(searchValue)}
              disabled={!mappingComplete}
            >
              {addPairLabel}
            </Button>
          ) : null}
        </EmptyState>
      ) : (
        <>
          <div className={styles.pairsHeader}>
            <div className={styles.pairHeader}>SF</div>
            <div className={styles.pairHeader}>Material</div>
          </div>
          <div className={styles.pairList}>
            {filteredPairs.map((pair) => (
              <PairCard
                key={pair.id}
                pair={pair}
                sfDisplayName={getSfDisplayName(pair)}
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={!isDevMode && !readOnly}
                onSfGlyphClick={async () => {
                  if (copying) return;
                  setCopying(true);
                  await copyText(
                    pair.descriptionFields?.sfGlyph || pair.sfValue || pair.name,
                    "Copied SF symbol to clipboard",
                    "Unable to copy SF symbol"
                  );
                  setCopying(false);
                }}
                onSfNameClick={async () => {
                  if (copying) return;
                  setCopying(true);
                  await copyText(
                    getSfDisplayName(pair),
                    "Copied SF name to clipboard",
                    "Unable to copy SF name"
                  );
                  setCopying(false);
                }}
                onMaterialNameClick={async () => {
                  if (copying) return;
                  setCopying(true);
                  await copyText(
                    pair.descriptionFields?.materialName || pair.materialValue || "",
                    "Copied Material name to clipboard",
                    "Unable to copy Material name"
                  );
                  setCopying(false);
                }}
                onMaterialGlyphClick={async () => {
                  if (copying) return;
                  setCopying(true);
                  const materialName =
                    pair.descriptionFields?.materialName || pair.materialValue || "";
                  const svg = await loadMaterialSvg(materialName);
                  if (!svg) {
                    await notify("Material SVG not found");
                    setCopying(false);
                    return;
                  }
                  await copyText(
                    String(svg),
                    "Copied Material SVG to clipboard",
                    "Unable to copy Material SVG"
                  );
                  setCopying(false);
                }}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
