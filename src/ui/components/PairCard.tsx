import { VariablePair } from "@common/types";
import styles from "./PairCard.module.scss";
import { Button } from "@ui/components/Button";
import { IconTile } from "@ui/components/IconTile";

type Props = {
  pair: VariablePair;
  onEdit: (pair: VariablePair) => void;
  onDelete: (pair: VariablePair) => void;
  showActions?: boolean;
};

export function PairCard({
  pair,
  onEdit,
  onDelete,
  showActions = true,
}: Props) {
  const meta = pair.descriptionFields;
  const sfName = meta?.sfName || "Unknown SF name";

  return (
    <div className={styles.pairCard}>
      <div className={styles.pairGlyphs}>
        <IconTile
          glyph={meta?.sfGlyph || pair.sfValue || ""}
          name={sfName}
          tone="sf"
          className={styles.divided}
          style={{ borderRight: "1px solid var(--figma-color-border)" }}
        />
        <IconTile
          glyph={meta?.materialName || pair.materialValue || ""}
          name={meta?.materialName || pair.materialValue || ""}
          tone="material"
        />
      </div>
      {/* <div className={styles.metaGrid}>
        <div>
          <div className={styles.metaLabel}>SF categories</div>
          <div className={styles.metaValue}>
            {meta?.sfCategories?.length ? meta.sfCategories.join(", ") : "—"}
          </div>
        </div>
        <div>
          <div className={styles.metaLabel}>SF search terms</div>
          <div className={styles.metaValue}>
            {meta?.sfSearchTerms?.length ? meta.sfSearchTerms.join(", ") : "—"}
          </div>
        </div>
        <div>
          <div className={styles.metaLabel}>Material categories</div>
          <div className={styles.metaValue}>
            {meta?.materialCategories?.length
              ? meta.materialCategories.join(", ")
              : "—"}
          </div>
        </div>
        <div>
          <div className={styles.metaLabel}>Material tags</div>
          <div className={styles.metaValue}>
            {meta?.materialTags?.length ? meta.materialTags.join(", ") : "—"}
          </div>
        </div>
      </div> */}
      {showActions ? (
        <div className={styles.cardActions}>
          <Button variant="secondary" onClick={() => onEdit(pair)} icon="edit" />
          <Button variant="danger" onClick={() => onDelete(pair)} icon="delete" />
        </div>
      ) : null}
    </div>
  );
}
