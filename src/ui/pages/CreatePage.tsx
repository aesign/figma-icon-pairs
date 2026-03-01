import { MaterialIcon, SfSymbol, VariablePair } from "@common/types";
import { Button } from "@ui/components/Button";
import { Input } from "@ui/components/Input";
import { SectionHeader } from "@ui/components/SectionHeader";
import { IconTile } from "@ui/components/IconTile";
import { EmptyState } from "@ui/components/EmptyState";
import { classes } from "@ui/utils/classes.util";
import cardStyles from "@ui/components/ResultCard.module.scss";
import styles from "@ui/styles/App.module.scss";
import { useEffect, useRef } from "react";

type Props = {
  mappingComplete: boolean;
  hasEnoughModes: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sfResults: SfSymbol[];
  materialResults: MaterialIcon[];
  sfMatchesCount: number;
  materialMatchesCount: number;
  usedSfValues: Map<string, string>;
  usedMaterialNames: Map<string, string>;
  selectedSf: SfSymbol | null;
  selectedMaterial: MaterialIcon | null;
  onSelectSf: (sf: SfSymbol) => void;
  onSelectMaterial: (icon: MaterialIcon) => void;
  onSubmit: () => void;
  submitting: boolean;
  editingPair: VariablePair | null;
  selectedSubgroupName: string | null;
  onCancelEdit: () => void;
  onClose: () => void;
  readOnly?: boolean;
};

export function CreatePage({
  mappingComplete,
  hasEnoughModes,
  searchQuery,
  onSearchChange,
  sfResults,
  materialResults,
  sfMatchesCount,
  materialMatchesCount,
  usedSfValues,
  usedMaterialNames,
  selectedSf,
  selectedMaterial,
  onSelectSf,
  onSelectMaterial,
  onSubmit,
  submitting,
  editingPair,
  selectedSubgroupName,
  onCancelEdit,
  onClose,
  readOnly = false,
}: Props) {
  const noResults =
    sfResults.length === 0 && materialResults.length === 0;
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mappingComplete || !hasEnoughModes) return;
    searchRef.current?.focus();
  }, [mappingComplete, hasEnoughModes]);

  const ctaLabelBase = editingPair ? "Update pair" : "Create pair";
  const ctaLabel = selectedSubgroupName
    ? `${ctaLabelBase} in ${selectedSubgroupName}`
    : ctaLabelBase;

  return (
    <section className={styles.section}>
      <SectionHeader
        // title={editingPair ? "Update pair" : "Create a new pair"}
        children={<Input
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          disabled={!readOnly && (!mappingComplete || !hasEnoughModes)}
          ref={searchRef}
        />}
        actions={
          <Button variant="ghost" icon="close" onClick={onClose} />
        }
      />
      {!mappingComplete ? (
        <div className={styles.banner}>
          Configure collection and modes in Settings to create pairs.
        </div>
      ) : null}
      <div className={styles.resultsGrid}>
        {noResults ? (
          <div className={classes(styles.resultListEmpty, styles.resultsGridEmpty)}>
            <EmptyState
              title="No results"
              subtitle="Try another keyword."
            />
          </div>
        ) : (
          <>
            <div className={styles.resultsColumn}>
              <div className={styles.resultsHeader}>
                <span className={styles.label}>SF</span>
                <span className={styles.counter}>({sfMatchesCount})</span>
              </div>
              <div className={styles.summaryChips}>
                <span
                  className={classes(
                    styles.chip,
                    selectedSf && styles.chipSelected
                  )}
                >
                  <span
                    className={classes(
                      styles.chipGlyphSf,
                      !selectedSf && styles.chipText
                    )}
                  >
                    {selectedSf ? selectedSf.symbol : "No SF icon"}
                  </span>
                  <span className={styles.chipText}>
                    {selectedSf ? selectedSf.name : ""}
                  </span>
                </span>
              </div>
              <div
                className={classes(styles.resultList, styles.resultListSf)}
              >
                {sfResults.map((symbol) => (
                  <button
                    key={symbol.name}
                    className={classes(
                      cardStyles.resultCard,
                      selectedSf?.name === symbol.name && cardStyles.selected
                    )}
                    type="button"
                    onClick={() => onSelectSf(symbol)}
                  >
                    <IconTile
                      glyph={symbol.symbol}
                      name={symbol.name}
                      tone="sf"
                      badge={
                        usedSfValues.has(symbol.symbol) &&
                          usedSfValues.get(symbol.symbol) !== editingPair?.id
                          ? "Used"
                          : null
                      }
                      selected={selectedSf?.name === symbol.name}
                      interactive
                    />
                  </button>
                ))}
              </div>
            </div>
            <div className={styles.resultsColumn}>
              <div className={styles.resultsHeader}>
                <span className={styles.label}>Material</span>
                <span className={styles.counter}>({materialMatchesCount})</span>
              </div>
              <div className={styles.summaryChips}>
                <span
                  className={classes(
                    styles.chip,
                    selectedMaterial && styles.chipSelected
                  )}
                >
                  <span
                    className={classes(
                      styles.chipGlyphMaterial,
                      !selectedMaterial && styles.chipText
                    )}
                  >
                    {selectedMaterial ? selectedMaterial.name : "No Material icon"}
                  </span>
                  <span className={styles.chipText}>
                    {selectedMaterial ? selectedMaterial.name : ""}
                  </span>
                </span>
              </div>
              <div
                className={classes(
                  styles.resultList,
                  styles.resultListMaterial
                )}
              >
                {materialResults.map((icon) => (
                  <button
                    key={icon.name}
                    className={classes(
                      cardStyles.resultCard,
                      selectedMaterial?.name === icon.name && cardStyles.selected
                    )}
                    type="button"
                    onClick={() => onSelectMaterial(icon)}
                  >
                    <IconTile
                      glyph={icon.name}
                      name={icon.name}
                      tone="material"
                      badge={
                        usedMaterialNames.has(icon.name) &&
                          usedMaterialNames.get(icon.name) !== editingPair?.id
                          ? "Used"
                          : null
                      }
                      selected={selectedMaterial?.name === icon.name}
                      interactive
                    />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
      {!readOnly && (
        <div className={styles.summaryRow}>
          <Button
            style={{ width: "100%" }}
            onClick={onSubmit}
            disabled={
              submitting ||
              !mappingComplete ||
              !hasEnoughModes ||
              !selectedSf ||
              !selectedMaterial
            }
          >
            {ctaLabel}
          </Button>
        </div>
      )}
    </section>
  );
}
