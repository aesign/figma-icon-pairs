import {
  CreatePairRequest,
  LibraryCollectionInfo,
  MaterialIcon,
  SfSymbol,
  UpdatePairRequest,
  VariableCollectionInfo,
  VariablePair,
} from "@common/types";
import materialDataset from "@common/material.slim.json";
import sfDataset from "@common/sf.json";
import { useMappingState } from "@ui/hooks/useMappingState";
import { usePairs } from "@ui/hooks/usePairs";
import { CreatePage } from "@ui/pages/CreatePage";
import { HomePage } from "@ui/pages/HomePage";
import { SettingsPage } from "@ui/pages/SettingsPage";
import {
  fetchEnvironment,
  fetchLibraryCollections,
  fetchLibraryPairs,
  fetchCollections,
  fetchPairs,
  loadSourceModeSettings,
  saveSourceModeSettings,
  loadUserGroupSelections,
  saveUserGroupSelection,
  fetchSelectionPairs,
  clearSelection as clearSelectionApi,
  createPair as createPairApi,
  deletePair as deletePairApi,
  updatePair as updatePairApi,
} from "@ui/services/pluginApi";
import { formatError } from "@ui/utils/errors";
import { useIconSearch } from "@ui/hooks/useIconSearch";
import { useEffect, useMemo, useState } from "react";

import "@ui/styles/main.scss";
import styles from "@ui/styles/App.module.scss";

type Page = "home" | "settings" | "create";

function pickDefaultGroupId(
  collection: VariableCollectionInfo | null | undefined
): string | null {
  const groups = collection?.groups ?? [];
  if (groups.length === 0) return null;
  const firstTopLevel = groups.find((group) => !group.id.includes("/"));
  return firstTopLevel?.id ?? groups[0].id ?? null;
}

function pickGroupIdWithPreference(
  collection: VariableCollectionInfo | null | undefined,
  preferredGroupId: string | null | undefined
): string | null {
  const groups = collection?.groups ?? [];
  if (groups.length === 0) return null;
  if (
    preferredGroupId &&
    groups.some((group) => group.id === preferredGroupId)
  ) {
    return preferredGroupId;
  }
  return pickDefaultGroupId(collection);
}

function deriveGroupFromPairName(name: string): string | null {
  const parts = (name || "").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(0, -1).join("/");
}

function pairMatchesGroupFilter(pair: VariablePair, groupId: string): boolean {
  if (!groupId) return true;
  const isSubgroupFilter = groupId.includes("/");
  const effectiveGroupId = pair.groupId || deriveGroupFromPairName(pair.name || "");
  if (!effectiveGroupId) return false;

  if (isSubgroupFilter) {
    return (
      effectiveGroupId === groupId ||
      effectiveGroupId.startsWith(`${groupId}/`)
    );
  }

  // Top-level group filter matches only direct members, excluding subgroups.
  return effectiveGroupId === groupId;
}

function deriveSfFromPair(
  pair: VariablePair,
  sfSymbols: SfSymbol[]
): SfSymbol | null {
  const meta = pair.descriptionFields;
  const normalizeSfName = (value: string) =>
    value.trim().replace(/\s+/g, ".");
  if (meta) {
    const fromName = sfSymbols.find((item) => item.name === meta.sfName);
    if (fromName) return fromName;
    const fromGlyph = sfSymbols.find((item) => item.symbol === meta.sfGlyph);
    if (fromGlyph) return fromGlyph;
    if (meta.sfGlyph || pair.sfValue) {
      const glyph = meta.sfGlyph || pair.sfValue || "";
      const canonical = sfSymbols.find((item) => item.symbol === glyph);
      return {
        symbol: glyph,
        name: canonical?.name || normalizeSfName(meta.sfName || pair.name),
        categories: meta.sfCategories ?? [],
        searchTerms: meta.sfSearchTerms ?? [],
      };
    }
  }

  if (pair.sfValue) {
    return {
      symbol: pair.sfValue,
      name: pair.name,
      categories: [],
      searchTerms: [],
    };
  }

  return null;
}

function deriveMaterialFromPair(
  pair: VariablePair,
  materialIcons: MaterialIcon[]
): MaterialIcon | null {
  const meta = pair.descriptionFields;

  if (meta) {
    const fromName = materialIcons.find(
      (item) => item.name === meta.materialName
    );
    if (fromName) return fromName;
    if (meta.materialName || pair.materialValue) {
      return {
        name: meta.materialName || pair.materialValue || "",
        categories: meta.materialCategories ?? [],
        tags: meta.materialTags ?? [],
      };
    }
  }

  if (pair.materialValue) {
    return {
      name: pair.materialValue,
      categories: [],
      tags: [],
    };
  }

  return null;
}

function App() {
  const materialIcons = materialDataset as MaterialIcon[];
  const sfSymbols = (sfDataset as any).symbols as SfSymbol[];

  const { mapping, setMapping, mappingLoaded, error: mappingError } =
    useMappingState();
  const [activePage, setActivePage] = useState<Page>("home");
  const [status, setStatus] = useState<string | null>(null);
  const [selectedSf, setSelectedSf] = useState<SfSymbol | null>(null);
  const [selectedMaterial, setSelectedMaterial] =
    useState<MaterialIcon | null>(null);
  const [editingPair, setEditingPair] = useState<VariablePair | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<VariableCollectionInfo[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [isDevMode, setIsDevMode] = useState(false);
  const [canWrite, setCanWrite] = useState(true);
  const [libraryCollections, setLibraryCollections] = useState<LibraryCollectionInfo[]>(
    []
  );
  const [libraryPairs, setLibraryPairs] = useState<VariablePair[]>([]);
  const [libraryPairsLoading, setLibraryPairsLoading] = useState(false);
  const [selectionPairIds, setSelectionPairIds] = useState<string[] | null>(
    null
  );
  const [selectionFilterActive, setSelectionFilterActive] = useState(false);
  const [userGroupSelections, setUserGroupSelections] = useState<
    Record<string, string | null>
  >({});
  const [groupPairCounts, setGroupPairCounts] = useState<Record<string, number>>(
    {}
  );
  const readOnlyMode = isDevMode || !canWrite;

  const selectedCollection = useMemo(
    () =>
      collections.find((c) => c.id === mapping.collectionId) ?? null,
    [collections, mapping.collectionId]
  );
  const selectedGroupName = useMemo(() => {
    if (!selectedCollection || !mapping.groupId) return null;
    return (
      selectedCollection.groups.find((group) => group.id === mapping.groupId)
        ?.name ?? mapping.groupId
    );
  }, [selectedCollection, mapping.groupId]);
  const selectedSubgroupName = useMemo(() => {
    if (!mapping.groupId?.includes("/")) return null;
    const name = selectedGroupName ?? mapping.groupId;
    const tail = name.split("/").filter(Boolean).pop();
    return tail || name;
  }, [mapping.groupId, selectedGroupName]);
  const hasEnoughModes = (selectedCollection?.modes?.length ?? 0) >= 2;
  const mappingReady = useMemo(() => {
    if (readOnlyMode) return true;
    if (!selectedCollection) return false;
    const modeIds = selectedCollection.modes?.map((m) => m.modeId) ?? [];
    const sfSet = new Set(mapping.sfModeIds || []);
    const matSet = new Set(mapping.materialModeIds || []);
    if (modeIds.length < 2) return false;
    if (sfSet.size === 0 || matSet.size === 0) return false;
    for (const id of modeIds) {
      const sf = sfSet.has(id);
      const mat = matSet.has(id);
      if (sf === mat) return false; // either both or none -> invalid
    }
    return true;
  }, [readOnlyMode, mapping.sfModeIds, mapping.materialModeIds, selectedCollection]);
  const readOnlyReady = readOnlyMode && Boolean(mapping.libraryCollectionKey);
  const selectionLocked = Boolean(editingPair);

  const {
    pairs,
    visiblePairs,
    filteredPairs,
    pairSearch,
    setPairSearch,
    refresh: refreshPairs,
    loading: pairsLoading,
    error: pairsError,
  } = usePairs({
    collectionId: mapping.collectionId,
    groupId: mapping.groupId,
    sfModeIds: mapping.sfModeIds,
    materialModeIds: mapping.materialModeIds,
    mappingComplete: !readOnlyMode && mappingReady,
  });

  useEffect(() => {
    if (mappingError) setStatus(mappingError);
  }, [mappingError]);

  useEffect(() => {
    if (pairsError) setStatus(pairsError);
  }, [pairsError]);

  useEffect(() => {
    if (mappingLoaded && collectionsLoaded && !readOnlyMode && !mappingReady) {
      setActivePage("settings");
    }
  }, [mappingLoaded, collectionsLoaded, readOnlyMode, mappingReady]);

  useEffect(() => {
    const listener = (event: MessageEvent) => {
      const message = (event.data as any)?.pluginMessage;
      if (message?.type === "selectionPairs") {
        console.log(
          "[icon-pairs][ui] selectionPairs",
          message.selectionCount,
          message.pairIds
        );
        const ids = Array.isArray(message.pairIds)
          ? message.pairIds.filter((id: any) => typeof id === "string")
          : [];
        setSelectionPairIds(ids);
        setSelectionFilterActive(
          typeof message.selectionCount === "number"
            ? message.selectionCount > 0
            : ids.length > 0
        );
      }
    };
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, []);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const env = await fetchEnvironment();
        setCanWrite(env.canWrite);
        setIsDevMode(env.isDevMode);
        const nextReadOnlyMode = env.isDevMode || !env.canWrite;
        if (!nextReadOnlyMode) {
          const localResult = await fetchCollections();
          setCollections(localResult);
          const groupSelections = await loadUserGroupSelections();
          setUserGroupSelections(groupSelections);
          try {
            const sourceSettings = await loadSourceModeSettings();
            if (sourceSettings) {
              const sourceCollection = localResult.find(
                (collection) => collection.id === sourceSettings.collectionId
              );
              setMapping({
                collectionId: sourceSettings.collectionId,
                sfModeIds: sourceSettings.sfModeIds,
                materialModeIds: sourceSettings.materialModeIds,
                groupId: pickGroupIdWithPreference(
                  sourceCollection,
                  sourceSettings.collectionId
                    ? groupSelections[sourceSettings.collectionId]
                    : null
                ),
              });
            }
          } catch (err) {
            console.warn("Unable to load source mode settings", err);
          }
          try {
            const selectionInfo = await fetchSelectionPairs();
            setSelectionPairIds(selectionInfo.pairIds);
            setSelectionFilterActive(selectionInfo.selectionCount > 0);
          } catch (err) {
            console.warn("Unable to load selection pairs", err);
          }
        } else {
          const libraryResult = await fetchLibraryCollections();
          setLibraryCollections(libraryResult);
          if (
            libraryResult.length === 1 &&
            !mapping.libraryCollectionKey
          ) {
            setMapping({ libraryCollectionKey: libraryResult[0].key });
          }
        }
        setCollectionsLoaded(true);
      } catch (err) {
        setStatus(formatError(err));
      }
    };
    loadCollections();
  }, [mapping.libraryCollectionKey, setMapping]);

  useEffect(() => {
    if (readOnlyMode || !collectionsLoaded) return;
    if (!mapping.collectionId) return;
    const previous = userGroupSelections[mapping.collectionId];
    if ((previous ?? null) === (mapping.groupId ?? null)) return;
    setUserGroupSelections((prev) => ({
      ...prev,
      [mapping.collectionId as string]: mapping.groupId ?? null,
    }));
    saveUserGroupSelection({
      collectionId: mapping.collectionId,
      groupId: mapping.groupId ?? null,
    }).catch((err) => {
      console.warn("Unable to save user group selection", err);
    });
  }, [
    readOnlyMode,
    collectionsLoaded,
    mapping.collectionId,
    mapping.groupId,
    userGroupSelections,
  ]);

  useEffect(() => {
    if (readOnlyMode || !collectionsLoaded) return;
    saveSourceModeSettings({
      collectionId: mapping.collectionId,
      sfModeIds: mapping.sfModeIds,
      materialModeIds: mapping.materialModeIds,
    }).catch((err) => {
      console.warn("Unable to save source mode settings", err);
    });
  }, [
    readOnlyMode,
    collectionsLoaded,
    mapping.collectionId,
    mapping.sfModeIds,
    mapping.materialModeIds,
  ]);

  useEffect(() => {
    if (readOnlyMode) {
      setGroupPairCounts({});
      return;
    }
    if (
      !mapping.collectionId ||
      !mapping.sfModeIds.length ||
      !mapping.materialModeIds.length
    ) {
      setGroupPairCounts({});
      return;
    }
    let cancelled = false;
    const run = async () => {
      try {
        const allPairs = await fetchPairs({
          collectionId: mapping.collectionId as string,
          groupId: null,
          sfModeIds: mapping.sfModeIds,
          materialModeIds: mapping.materialModeIds,
        });
        if (cancelled) return;
        const groups = selectedCollection?.groups ?? [];
        const counts: Record<string, number> = {};
        for (const group of groups) counts[group.id] = 0;
        for (const pair of allPairs) {
          if (!pair.descriptionFields) continue;
          for (const group of groups) {
            if (pairMatchesGroupFilter(pair, group.id)) {
              counts[group.id] = (counts[group.id] ?? 0) + 1;
            }
          }
        }
        setGroupPairCounts(counts);
      } catch {
        if (!cancelled) setGroupPairCounts({});
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [
    readOnlyMode,
    mapping.collectionId,
    mapping.sfModeIds,
    mapping.materialModeIds,
    selectedCollection,
  ]);

  useEffect(() => {
    if (!readOnlyMode) return;
    const selectedKey = mapping.libraryCollectionKey;
    if (!selectedKey) {
      setLibraryPairs([]);
      return;
    }
    const loadLibraryData = async () => {
      setLibraryPairsLoading(true);
      try {
        const pairs = await fetchLibraryPairs({
          libraryCollectionKey: selectedKey,
        });
        setLibraryPairs(pairs);
      } catch (err) {
        setStatus(formatError(err));
      } finally {
        setLibraryPairsLoading(false);
      }
    };
    loadLibraryData();
  }, [readOnlyMode, mapping.libraryCollectionKey]);

  useEffect(() => {
    if (readOnlyMode) return;
    const exists = mapping.collectionId
      ? collections.some((c) => c.id === mapping.collectionId)
      : false;
    if (!exists && collections.length > 0) {
      const first = collections[0];
      const modes = first.modes ?? [];
      const sfDefault = modes[0]?.modeId ? [modes[0].modeId] : [];
      const materialDefault =
        modes.length > 1 ? modes.slice(1).map((m) => m.modeId) : [];
      setMapping({
        collectionId: first.id,
        groupId: pickGroupIdWithPreference(first, userGroupSelections[first.id]),
        sfModeIds: sfDefault,
        materialModeIds: materialDefault,
      });
    }
  }, [readOnlyMode, collections, mapping.collectionId, setMapping, userGroupSelections]);

  useEffect(() => {
    if (readOnlyMode) return;
    if (!selectedCollection) return;
    const groups = selectedCollection.groups ?? [];
    if (groups.length === 0) {
      if (mapping.groupId !== null) setMapping({ groupId: null });
      return;
    }
    const exists = Boolean(
      mapping.groupId && groups.some((group) => group.id === mapping.groupId)
    );
    if (exists) return;
    const defaultGroupId = pickGroupIdWithPreference(
      selectedCollection,
      userGroupSelections[selectedCollection.id]
    );
    if (defaultGroupId !== mapping.groupId) {
      setMapping({ groupId: defaultGroupId });
    }
  }, [
    readOnlyMode,
    selectedCollection,
    mapping.groupId,
    setMapping,
    userGroupSelections,
  ]);

  const availableCollections = useMemo(
    () =>
      collections.map((c) => ({
        ...c,
        modes: c.modes ?? [],
        groups: c.groups ?? [],
      })),
    [collections]
  );

  const onChangeMapping = (state: {
    collectionId?: string | null;
    groupId?: string | null;
    sfModeIds?: string[];
    materialModeIds?: string[];
  }) => {
    if (
      state.collectionId !== undefined &&
      state.collectionId !== mapping.collectionId
    ) {
      const nextCollection = collections.find(
        (c) => c.id === state.collectionId
      );
      const modes = nextCollection?.modes ?? [];
      const sfDefault = modes[0]?.modeId ? [modes[0].modeId] : [];
      const materialDefault =
        modes.length > 1 ? modes.slice(1).map((m) => m.modeId) : [];
      setMapping({
        collectionId: state.collectionId,
        groupId: pickGroupIdWithPreference(
          nextCollection,
          state.collectionId ? userGroupSelections[state.collectionId] : null
        ),
        sfModeIds: sfDefault,
        materialModeIds: materialDefault,
      });
      setSelectedSf(null);
      setSelectedMaterial(null);
      setEditingPair(null);
      setSearchQuery("");
      setPairSearch("");
      return;
    }
    setMapping({ ...mapping, ...state });
  };

  const clearSelectionFilter = async () => {
    try {
      await clearSelectionApi();
    } catch (err) {
      console.warn("Unable to clear selection", err);
    }
    setSelectionPairIds(null);
    setSelectionFilterActive(false);
  };

  const { sfResults, materialResults } = useIconSearch(sfSymbols, materialIcons, searchQuery);

  const usedSfValues = useMemo(() => {
    const map = new Map<string, string>();
    visiblePairs.forEach((pair) => {
      if (pair.sfValue) map.set(pair.sfValue, pair.id);
    });
    return map;
  }, [visiblePairs]);

  const usedMaterialNames = useMemo(() => {
    const map = new Map<string, string>();
    visiblePairs.forEach((pair) => {
      if (pair.materialValue) map.set(pair.materialValue, pair.id);
    });
    return map;
  }, [visiblePairs]);

  const selectionFilteredPairs = useMemo(() => {
    if (!selectionFilterActive) return filteredPairs;
    if (!selectionPairIds || selectionPairIds.length === 0) return [];
    const idSet = new Set(selectionPairIds);
    // When filtering by selection, ignore the text search to surface matches found in the document.
    const source = visiblePairs;
    return source.filter((pair) => idSet.has(pair.id));
  }, [selectionFilterActive, selectionPairIds, filteredPairs, visiblePairs]);

  const libraryFilteredPairs = useMemo(() => {
    if (!readOnlyMode) return [];
    if (!pairSearch.trim()) return libraryPairs;
    const query = pairSearch.toLowerCase();
    return libraryPairs.filter((pair) => {
      const meta = pair.descriptionFields;
      const text = [
        pair.name,
        pair.description,
        meta?.sfName,
        meta?.sfGlyph,
        meta?.materialName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return text.includes(query);
    });
  }, [readOnlyMode, pairSearch, libraryPairs]);

  const resetMapping = () => {
    setPairSearch("");
    setSelectedMaterial(null);
    setSelectedSf(null);
    setEditingPair(null);
    setMapping({
      collectionId: null,
      groupId: null,
      sfModeIds: [],
      materialModeIds: [],
      libraryCollectionKey: null,
    });
  };

  const startEdit = (pair: VariablePair) => {
    if (isDevMode) return;
    const sf = deriveSfFromPair(pair, sfSymbols);
    const material = deriveMaterialFromPair(pair, materialIcons);
    setSelectedSf(sf);
    setSelectedMaterial(material);
    setEditingPair(pair);
    setActivePage("create");
  };

  const cancelEdit = () => {
    setEditingPair(null);
    setSelectedSf(null);
    setSelectedMaterial(null);
  };

  const closeCreatePage = () => {
    cancelEdit();
    setActivePage("home");
  };

  const handleDelete = async (pair: VariablePair) => {
    if (isDevMode) return;
    const confirmed = confirm(
      `Delete the pair "${pair.name}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    try {
      await deletePairApi(pair.id);
      if (editingPair?.id === pair.id) {
        cancelEdit();
      }
      refreshPairs();
    } catch (err) {
      setStatus(formatError(err));
    }
  };

  const handleSubmit = async () => {
    if (
      !mapping.collectionId ||
      !mapping.sfModeIds.length ||
      !mapping.materialModeIds.length
    ) {
      setStatus("Assign modes to SF and Material before continuing.");
      return;
    }
    const sfChoice = selectedSf || (editingPair ? deriveSfFromPair(editingPair, sfSymbols) : null);
    const materialChoice =
      selectedMaterial ||
      (editingPair ? deriveMaterialFromPair(editingPair, materialIcons) : null);

    if (!sfChoice || !materialChoice) {
      setStatus("Choose an SF icon and a Material icon.");
      return;
    }

    const basePayload = {
      collectionId: mapping.collectionId,
      groupId: mapping.groupId ?? null,
      sfModeIds: mapping.sfModeIds,
      materialModeIds: mapping.materialModeIds,
      sf: sfChoice,
      material: materialChoice,
    };

    try {
      if (editingPair) {
        const payload: UpdatePairRequest = {
          ...basePayload,
          variableId: editingPair.id,
        };
        await updatePairApi(payload);
      } else {
        const payload: CreatePairRequest = basePayload;
        await createPairApi(payload);
      }
      await refreshPairs();
      setSelectedMaterial(null);
      setSelectedSf(null);
      setEditingPair(null);
      setStatus(null);
      setActivePage("home");
    } catch (err) {
      setStatus(formatError(err));
    }
  };

  return (
    <div className={styles.app}>
      {status ? <div className={styles.status}>{status}</div> : null}

      {activePage === "settings" && !readOnlyMode && (
        <SettingsPage
          collections={availableCollections}
          collectionId={mapping.collectionId}
          sfModeIds={mapping.sfModeIds}
          materialModeIds={mapping.materialModeIds}
          onChange={onChangeMapping}
          onReset={resetMapping}
          onReloadPairs={refreshPairs}
          onClose={() => setActivePage("home")}
          pairsLoading={pairsLoading}
          mappingComplete={mappingReady}
          selectedCollection={selectedCollection}
          hasEnoughModes={hasEnoughModes}
          selectionLocked={selectionLocked}
          readOnly={!canWrite}
          libraryCollections={libraryCollections}
          selectedLibraryCollectionKey={mapping.libraryCollectionKey}
          onLibraryCollectionChange={(key) =>
            setMapping({ libraryCollectionKey: key })
          }
        />
      )}

      {activePage === "home" && (
        <div className={styles.grid}>
          <HomePage
            pairs={readOnlyMode ? libraryFilteredPairs : selectionFilteredPairs}
            loading={readOnlyMode ? libraryPairsLoading : pairsLoading}
            mappingComplete={readOnlyMode ? readOnlyReady : mappingReady}
            selectionActive={readOnlyMode ? false : selectionFilterActive}
            isDevMode={isDevMode}
            readOnly={readOnlyMode}
            groupName={selectedGroupName}
            groups={selectedCollection?.groups ?? []}
            groupCounts={groupPairCounts}
            selectedGroupId={mapping.groupId}
            onGroupChange={(groupId) => setMapping({ groupId })}
            onSearch={setPairSearch}
            searchValue={pairSearch}
            onEdit={(pair) => {
              if (readOnlyMode) return;
              startEdit(pair);
            }}
            onDelete={(pair) => {
              if (readOnlyMode) return;
              handleDelete(pair);
            }}
            onCreate={(initialSearch) => {
              if (readOnlyMode) return;
              setSearchQuery(initialSearch ?? "");
              setActivePage("create");
            }}
            onOpenSettings={() => {
              if (readOnlyMode) return;
              setActivePage("settings");
            }}
            onClearSelection={clearSelectionFilter}
          />
        </div>
      )}

      {activePage === "create" && !readOnlyMode && (
        <CreatePage
          mappingComplete={mappingReady}
          hasEnoughModes={hasEnoughModes}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          sfResults={sfResults}
          materialResults={materialResults}
          sfMatchesCount={sfResults.length}
          materialMatchesCount={materialResults.length}
          usedSfValues={usedSfValues}
          usedMaterialNames={usedMaterialNames}
          selectedSf={selectedSf}
          selectedMaterial={selectedMaterial}
          onSelectSf={(sf) => setSelectedSf(sf)}
          onSelectMaterial={(icon) => setSelectedMaterial(icon)}
          onSubmit={handleSubmit}
          submitting={false}
          editingPair={editingPair}
          selectedSubgroupName={selectedSubgroupName}
          onCancelEdit={cancelEdit}
          onClose={closeCreatePage}
        />
      )}
    </div>
  );
}

export default App;
