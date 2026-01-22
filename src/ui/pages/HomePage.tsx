import { VariablePair } from "@common/types";
import { Button } from "@ui/components/Button";
import { PairCard } from "@ui/components/PairCard";
import { SectionHeader } from "@ui/components/SectionHeader";
import { Input } from "@ui/components/Input";
import { EmptyState } from "@ui/components/EmptyState";
import styles from "@ui/styles/App.module.scss";
import { useEffect, useRef } from "react";

type Props = {
  pairs: VariablePair[];
  loading: boolean;
  mappingComplete: boolean;
  isDevMode: boolean;
  onSearch: (value: string) => void;
  searchValue: string;
  onEdit: (pair: VariablePair) => void;
  onDelete: (pair: VariablePair) => void;
  onCreate: (initialSearch?: string) => void;
  onOpenSettings: () => void;
};

export function HomePage({
  pairs,
  loading,
  mappingComplete,
  isDevMode,
  onSearch,
  searchValue,
  onEdit,
  onDelete,
  onCreate,
  onOpenSettings,
}: Props) {
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!mappingComplete) return;
    searchRef.current?.focus();
  }, [mappingComplete]);

  return (
    <section className={styles.section}>
      <SectionHeader
        // title="Pairs"
        actions={
          !isDevMode ? (
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
          ) : null
        }
      >
        <Input
          placeholder="Search pairs..."
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
      ) : pairs.length === 0 ? (
        <EmptyState
          title={
            searchValue.trim()
              ? "No pairs match your search"
              : "No pairs for this collection"
          }
          subtitle={
            searchValue.trim()
              ? "Try another keyword."
              : isDevMode
              ? "Switch to Design mode to create pairs."
              : "Create a pair to get started."
          }
        >
          {!isDevMode ? (
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
            {pairs.map((pair) => (
              <PairCard
                key={pair.id}
                pair={pair}
                onEdit={onEdit}
                onDelete={onDelete}
                showActions={!isDevMode}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
