import { filterRoundedMaterialIcons, MATERIAL_UNSUPPORTED_FAMILIES } from "@common/material";
import {
  CreatePairRequest,
  LibraryCollectionInfo,
  MaterialIcon,
  SfSymbol,
  UpdatePairRequest,
  VariableCollectionInfo,
  VariablePair,
} from "@common/types";
import materialDataset from "@common/material.json";
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
  loadSourceModeSettings,
  saveSourceModeSettings,
  fetchSelectionPairs,
  clearSelection as clearSelectionApi,
  createPair as createPairApi,
  deletePair as deletePairApi,
  updatePair as updatePairApi,
} from "@ui/services/pluginApi";
import { formatError } from "@ui/utils/errors";
import Fuse from "fuse.js";
import { useEffect, useMemo, useState } from "react";

import "@ui/styles/main.scss";
import styles from "@ui/styles/App.module.scss";

type Page = "home" | "settings" | "create";

function deriveSfFromPair(
  pair: VariablePair,
  sfSymbols: SfSymbol[]
): SfSymbol | null {
  const meta = pair.descriptionFields;
  if (meta) {
    const fromName = sfSymbols.find((item) => item.name === meta.sfName);
    if (fromName) return fromName;
    const fromGlyph = sfSymbols.find((item) => item.symbol === meta.sfGlyph);
    if (fromGlyph) return fromGlyph;
    if (meta.sfGlyph || pair.sfValue) {
      return {
        symbol: meta.sfGlyph || pair.sfValue || "",
        name: meta.sfName || pair.name,
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
        version: 0,
        popularity: 0,
        codepoint: "",
        unsupported_families: Array.from(MATERIAL_UNSUPPORTED_FAMILIES),
        categories: meta.materialCategories ?? [],
        tags: meta.materialTags ?? [],
        sizes_px: [],
      };
    }
  }

  if (pair.materialValue) {
    return {
      name: pair.materialValue,
      version: 0,
      popularity: 0,
      codepoint: "",
      unsupported_families: Array.from(MATERIAL_UNSUPPORTED_FAMILIES),
      categories: [],
      tags: [],
      sizes_px: [],
    };
  }

  return null;
}

function App() {
  const materialIcons = useMemo<MaterialIcon[]>(
    () => filterRoundedMaterialIcons((materialDataset as any).icons),
    []
  );
  const sfSymbols = useMemo<SfSymbol[]>(
    () => (sfDataset as any).symbols,
    []
  );

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
  const readOnlyMode = isDevMode || !canWrite;

  const selectedCollection = useMemo(
    () =>
      collections.find((c) => c.id === mapping.collectionId) ?? null,
    [collections, mapping.collectionId]
  );
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
          try {
            const sourceSettings = await loadSourceModeSettings();
            if (sourceSettings) {
              setMapping({
                collectionId: sourceSettings.collectionId,
                sfModeIds: sourceSettings.sfModeIds,
                materialModeIds: sourceSettings.materialModeIds,
                groupId: null,
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
        groupId: null,
        sfModeIds: sfDefault,
        materialModeIds: materialDefault,
      });
    }
  }, [readOnlyMode, collections, mapping.collectionId, setMapping]);

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
        groupId: null,
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

  const materialIndex = useMemo(
    () =>
      new Fuse(materialIcons, {
        keys: [
          { name: "name", weight: 0.55 },
          { name: "categories", weight: 0.2 },
          { name: "tags", weight: 0.25 },
        ],
        threshold: 0.35,
      }),
    [materialIcons]
  );

  const sfIndex = useMemo(
    () =>
      new Fuse(sfSymbols, {
        keys: [
          { name: "name", weight: 0.5 },
          { name: "symbol", weight: 0.3 },
          { name: "categories", weight: 0.1 },
          { name: "searchTerms", weight: 0.1 },
        ],
        threshold: 0.35,
      }),
    [sfSymbols]
  );

  const sfMatches = useMemo(() => {
    if (!searchQuery.trim()) return sfSymbols;
    return sfIndex.search(searchQuery).map((res) => res.item);
  }, [searchQuery, sfIndex, sfSymbols]);

  const materialMatches = useMemo(() => {
    if (!searchQuery.trim()) return materialIcons;
    return materialIndex.search(searchQuery).map((res) => res.item);
  }, [searchQuery, materialIcons, materialIndex]);

  const sfResults = sfMatches;
  const materialResults = materialMatches;

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
          groupId={mapping.groupId}
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
          sfMatchesCount={sfMatches.length}
          materialMatchesCount={materialMatches.length}
          usedSfValues={usedSfValues}
          usedMaterialNames={usedMaterialNames}
          selectedSf={selectedSf}
          selectedMaterial={selectedMaterial}
          onSelectSf={(sf) => setSelectedSf(sf)}
          onSelectMaterial={(icon) => setSelectedMaterial(icon)}
          onSubmit={handleSubmit}
          submitting={false}
          editingPair={editingPair}
          onCancelEdit={cancelEdit}
          onClose={closeCreatePage}
        />
      )}
    </div>
  );
}

export default App;
