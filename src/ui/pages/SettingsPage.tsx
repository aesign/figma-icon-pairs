import { LibraryCollectionInfo, VariableCollectionInfo } from "@common/types";
import { Button } from "@ui/components/Button";
import { SectionHeader } from "@ui/components/SectionHeader";
import { Select } from "@ui/components/Select";
import styles from "@ui/styles/App.module.scss";

type Props = {
  collections: VariableCollectionInfo[];
  collectionId: string | null;
  sfModeIds: string[];
  materialModeIds: string[];
  onChange: (state: {
    collectionId?: string | null;
    sfModeIds?: string[];
    materialModeIds?: string[];
  }) => void;
  onReset: () => void;
  onReloadPairs: () => void;
  onClose: () => void;
  pairsLoading: boolean;
  mappingComplete: boolean;
  selectedCollection: VariableCollectionInfo | null;
  hasEnoughModes: boolean;
  selectionLocked: boolean;
  readOnly: boolean;
  libraryCollections: LibraryCollectionInfo[];
  selectedLibraryCollectionKey: string | null;
  onLibraryCollectionChange: (key: string | null) => void;
  onRestoreDefaultLibraryCollection: () => void;
};

export function SettingsPage({
  collections,
  collectionId,
  sfModeIds,
  materialModeIds,
  onChange,
  onReset,
  onReloadPairs,
  onClose,
  pairsLoading,
  mappingComplete,
  selectedCollection,
  hasEnoughModes,
  selectionLocked,
  readOnly,
  libraryCollections,
  selectedLibraryCollectionKey,
  onLibraryCollectionChange,
  onRestoreDefaultLibraryCollection,
}: Props) {
  const currentModes = selectedCollection?.modes ?? [];
  const showMappingBlocker = selectedCollection ? !hasEnoughModes : false;
  const sfSet = new Set(sfModeIds);
  const matSet = new Set(materialModeIds);

  const assignMode = (modeId: string, target: "sf" | "material") => {
    if (selectionLocked) return;
    const nextSf = new Set(sfModeIds);
    const nextMat = new Set(materialModeIds);
    nextSf.delete(modeId);
    nextMat.delete(modeId);
    if (target === "sf") nextSf.add(modeId);
    else nextMat.add(modeId);
    onChange({
      sfModeIds: Array.from(nextSf),
      materialModeIds: Array.from(nextMat),
    });
  };

  return (
    <section className={styles.section}>
      <SectionHeader
        title="Settings"
        actions={
          <>
            <Button variant="ghost" icon="close" onClick={onClose} />
          </>
        }
      />
      <div className={styles.selectorGrid}>
        {readOnly ? (
          <div>
            <div className={styles.label}>Design system library</div>
            <Select
              value={selectedLibraryCollectionKey ?? ""}
              onChange={(event) =>
                onLibraryCollectionChange(event.target.value || null)
              }
            >
              <option value="">Select a library collection</option>
              {libraryCollections.map((collection) => (
                <option key={collection.key} value={collection.key}>
                  {collection.libraryName} / {collection.name}
                </option>
              ))}
            </Select>
            <div style={{ marginTop: 8 }}>
              <Button
                variant="secondary"
                onClick={onRestoreDefaultLibraryCollection}
              >
                Restore Default
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div>
              <div className={styles.label}>
                Collection
              </div>
              <Select
                value={collectionId ?? ""}
                onChange={(event) => {
                  onChange({ collectionId: event.target.value || null });
                }}
                disabled={selectionLocked}
              >
                <option value="">Select a collection</option>
                {collections.map((collection) => (
                  <option key={collection.id} value={collection.id}>
                    {collection.name}
                  </option>
                ))}
              </Select>
            </div>
          </>
        )}
      </div>
      {!readOnly ? (
        <div className={styles.modeAssignment}>
          <div className={styles.label}>Assign each mode</div>
          <div className={styles.modeRows}>
            {currentModes.map((mode) => {
              const owner = sfSet.has(mode.modeId)
                ? "sf"
                : matSet.has(mode.modeId)
                ? "material"
                : "none";
              return (
                <div key={mode.modeId} className={styles.modeRow}>
                  <div className={styles.modeName}>{mode.name}</div>
                  <label className={styles.modeChoice}>
                    <input
                      type="radio"
                      name={`mode-${mode.modeId}`}
                      checked={owner === "sf"}
                      onChange={() => assignMode(mode.modeId, "sf")}
                      disabled={selectionLocked}
                    />
                    SF
                  </label>
                  <label className={styles.modeChoice}>
                    <input
                      type="radio"
                      name={`mode-${mode.modeId}`}
                      checked={owner === "material"}
                      onChange={() => assignMode(mode.modeId, "material")}
                      disabled={selectionLocked}
                    />
                    Material
                  </label>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
      {!readOnly && showMappingBlocker ? (
        <div className={styles.banner}>
          The selected collection needs at least two modes. Add more modes or pick a different collection.
        </div>
      ) : null}
    </section>
  );
}
