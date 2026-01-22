import { filterRoundedMaterialIcons, MATERIAL_UNSUPPORTED_FAMILIES } from "@common/material";
import {
  CreatePairRequest,
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

  const { mapping, setMapping, mappingComplete, mappingLoaded, error: mappingError } =
    useMappingState();
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
    sfModeId: mapping.sfModeId,
    materialModeId: mapping.materialModeId,
    mappingComplete,
  });

  const [activePage, setActivePage] = useState<Page>("home");
  const [status, setStatus] = useState<string | null>(null);
  const [selectedSf, setSelectedSf] = useState<SfSymbol | null>(null);
  const [selectedMaterial, setSelectedMaterial] =
    useState<MaterialIcon | null>(null);
  const [editingPair, setEditingPair] = useState<VariablePair | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [collections, setCollections] = useState<VariableCollectionInfo[]>([]);
  const [isDevMode, setIsDevMode] = useState(false);

  useEffect(() => {
    if (mappingError) setStatus(mappingError);
  }, [mappingError]);

  useEffect(() => {
    if (pairsError) setStatus(pairsError);
  }, [pairsError]);

  useEffect(() => {
    if (mappingLoaded && !mappingComplete) {
      if (!isDevMode) {
        setActivePage("settings");
      }
    }
  }, [mappingLoaded, mappingComplete, isDevMode]);

  useEffect(() => {
    if (isDevMode) {
      setActivePage("home");
    }
  }, [isDevMode]);

  useEffect(() => {
    const loadCollections = async () => {
      try {
        const { fetchCollections } = await import("@ui/services/pluginApi");
        const env = await fetchEnvironment();
        setIsDevMode(env.isDevMode);
        const result = await fetchCollections();
        setCollections(result);
      } catch (err) {
        setStatus(formatError(err));
      }
    };
    loadCollections();
  }, []);

  const selectedCollection = useMemo(
    () => collections.find((c) => c.id === mapping.collectionId) ?? null,
    [collections, mapping.collectionId]
  );
  const hasEnoughModes = (selectedCollection?.modes.length ?? 0) >= 2;
  const selectionLocked = Boolean(editingPair);

  const onChangeMapping = (state: {
    collectionId?: string | null;
    groupId?: string | null;
    sfModeId?: string | null;
    materialModeId?: string | null;
  }) => {
    const updated = { ...mapping, ...state };
    if (state.collectionId !== undefined && state.collectionId !== mapping.collectionId) {
      setMapping({
        collectionId: state.collectionId,
        groupId: null,
        sfModeId: null,
        materialModeId: null,
      });
      setSelectedSf(null);
      setSelectedMaterial(null);
      setEditingPair(null);
      setSearchQuery("");
      setPairSearch("");
      return;
    }
    setMapping(updated);
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

  const resetMapping = () => {
    setPairSearch("");
    setSelectedMaterial(null);
    setSelectedSf(null);
    setEditingPair(null);
    setMapping({
      collectionId: null,
      groupId: null,
      sfModeId: null,
      materialModeId: null,
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
    if (!mapping.collectionId || !mapping.sfModeId || !mapping.materialModeId) {
      setStatus("Select a collection and two modes before continuing.");
      return;
    }
    if (mapping.sfModeId === mapping.materialModeId) {
      setStatus("Select two different modes for SF and Material.");
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
      sfModeId: mapping.sfModeId,
      materialModeId: mapping.materialModeId,
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

      {activePage === "settings" && !isDevMode && (
        <SettingsPage
          collections={collections}
          collectionId={mapping.collectionId}
          groupId={mapping.groupId}
          sfModeId={mapping.sfModeId}
          materialModeId={mapping.materialModeId}
          onChange={onChangeMapping}
          onReset={resetMapping}
          onReloadPairs={refreshPairs}
          onClose={() => setActivePage("home")}
          pairsLoading={pairsLoading}
          mappingComplete={mappingComplete}
          selectedCollection={selectedCollection}
          hasEnoughModes={hasEnoughModes}
          selectionLocked={selectionLocked}
        />
      )}

      {activePage === "home" && (
        <div className={styles.grid}>
          <HomePage
            pairs={filteredPairs}
            loading={pairsLoading}
            mappingComplete={mappingComplete}
            isDevMode={isDevMode}
            onSearch={setPairSearch}
            searchValue={pairSearch}
            onEdit={(pair) => {
              if (isDevMode) return;
              startEdit(pair);
            }}
            onDelete={(pair) => {
              if (isDevMode) return;
              handleDelete(pair);
            }}
            onCreate={(initialSearch) => {
              if (isDevMode) return;
              setSearchQuery(initialSearch ?? "");
              setActivePage("create");
            }}
            onOpenSettings={() => {
              if (isDevMode) return;
              setActivePage("settings");
            }}
          />
        </div>
      )}

      {activePage === "create" && !isDevMode && (
        <CreatePage
          mappingComplete={mappingComplete}
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
