import { VariablePair } from "@common/types";
import { Button } from "@ui/components/Button";
import { PairCard } from "@ui/components/PairCard";
import { SectionHeader } from "@ui/components/SectionHeader";
import { Input } from "@ui/components/Input";
import { EmptyState } from "@ui/components/EmptyState";
import styles from "@ui/styles/App.module.scss";
import { useEffect, useMemo, useRef, useState } from "react";
import { notify } from "@ui/services/pluginApi";

type Props = {
  pairs: VariablePair[];
  loading: boolean;
  mappingComplete: boolean;
  selectionActive: boolean;
  isDevMode: boolean;
  onSearch: (value: string) => void;
  searchValue: string;
  onEdit: (pair: VariablePair) => void;
  onDelete: (pair: VariablePair) => void;
  onCreate: (initialSearch?: string) => void;
  onOpenSettings: () => void;
  onClearSelection: () => void;
};

export function HomePage({
  pairs,
  loading,
  mappingComplete,
  selectionActive,
  isDevMode,
  onSearch,
  searchValue,
  onEdit,
  onDelete,
  onCreate,
  onOpenSettings,
  onClearSelection,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);
  const [copying, setCopying] = useState(false);
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

  const filteredPairs = pairs ?? [];

  return (
    <section className={styles.section}>
      <SectionHeader
        // title="Pairs"
        actions={
          <>
            {!isDevMode ? (
              <>
                <Button
                  variant="primary"
                  onClick={() => onCreate(searchValue)}
                  disabled={!mappingComplete}
                  icon="add"
                />
                <Button
                  variant="secondary"
                  onClick={onOpenSettings}
                  icon="settings"
                />
              </>
            ) : null}
          </>
        }
      >
        <Input
          placeholder={selectionActive ? "Search pairs in selection..." : "Search all pairs..."}
          value={searchValue}
          onChange={(event) => onSearch(event.target.value)}
          disabled={!mappingComplete}
          ref={searchRef}
        />
      </SectionHeader>
      {loading ? (
        <div className={styles.empty}>Loading pairs…</div>
      ) : !mappingComplete ? (
        <EmptyState
          title={
            isDevMode
              ? "Settings hidden in Dev Mode"
              : "Select collection and modes"
          }
          subtitle={
            isDevMode
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
              : "Create a pair to get started."
          }
        >
          {selectionActive ? (
            <Button variant="secondary" onClick={onClearSelection}>
              Clear selection
            </Button>
          ) : !isDevMode ? (
            <Button
              variant="primary"
              icon="add"
              onClick={() => onCreate(searchValue)}
              disabled={!mappingComplete}
            >
              Add pair
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
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={!isDevMode}
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
                    pair.descriptionFields?.sfName || pair.name,
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
