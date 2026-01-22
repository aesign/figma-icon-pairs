import { VariableCollectionInfo } from "@common/types";
import { Button } from "@ui/components/Button";
import { SectionHeader } from "@ui/components/SectionHeader";
import { Select } from "@ui/components/Select";
import styles from "@ui/styles/App.module.scss";

type Props = {
  collections: VariableCollectionInfo[];
  collectionId: string | null;
  groupId: string | null;
  sfModeId: string | null;
  materialModeId: string | null;
  onChange: (state: {
    collectionId?: string | null;
    groupId?: string | null;
    sfModeId?: string | null;
    materialModeId?: string | null;
  }) => void;
  onReset: () => void;
  onReloadPairs: () => void;
  onClose: () => void;
  pairsLoading: boolean;
  mappingComplete: boolean;
  selectedCollection: VariableCollectionInfo | null;
  hasEnoughModes: boolean;
  selectionLocked: boolean;
};

export function SettingsPage({
  collections,
  collectionId,
  groupId,
  sfModeId,
  materialModeId,
  onChange,
  onReset,
  onReloadPairs,
  onClose,
  pairsLoading,
  mappingComplete,
  selectedCollection,
  hasEnoughModes,
  selectionLocked,
}: Props) {
  const currentModes = selectedCollection?.modes ?? [];
  const showMappingBlocker = selectedCollection ? !hasEnoughModes : false;

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
        <div>
          <div className={styles.label}>Collection</div>
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
        <div>
          <div className={styles.label}>Group (optional)</div>
          <Select
            value={groupId ?? ""}
            onChange={(event) => {
              onChange({ groupId: event.target.value || null });
            }}
            disabled={
              selectionLocked ||
              !selectedCollection ||
              !selectedCollection.groups.length
            }
          >
            <option value="">All groups</option>
            {(selectedCollection?.groups ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className={styles.label}>Mode for SF</div>
          <Select
            value={sfModeId ?? ""}
            onChange={(event) => onChange({ sfModeId: event.target.value || null })}
            disabled={!selectedCollection || selectionLocked}
          >
            <option value="">Select a mode</option>
            {currentModes.map((mode) => (
              <option key={mode.modeId} value={mode.modeId}>
                {mode.name}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <div className={styles.label}>Mode for Material</div>
          <Select
            value={materialModeId ?? ""}
            onChange={(event) =>
              onChange({ materialModeId: event.target.value || null })
            }
            disabled={!selectedCollection || selectionLocked}
          >
            <option value="">Select a mode</option>
            {currentModes
              .filter((mode) => mode.modeId !== sfModeId)
              .map((mode) => (
                <option key={mode.modeId} value={mode.modeId}>
                  {mode.name}
                </option>
              ))}
          </Select>
        </div>
      </div>
      {showMappingBlocker ? (
        <div className={styles.banner}>
          The selected collection needs at least two modes. Add more modes or pick a different collection.
        </div>
      ) : null}
    </section>
  );
}
