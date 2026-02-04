import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { VariablePair } from "@common/types";
import { fetchPairs } from "@ui/services/pluginApi";
import { formatError } from "@ui/utils/errors";

function buildPairSearchText(pair: VariablePair): string {
  const meta = pair.descriptionFields;
  const tokens = [
    pair.name,
    pair.description,
    meta?.sfName,
    meta?.sfGlyph,
    meta?.sfCategories.join(" "),
    meta?.sfSearchTerms.join(" "),
    meta?.materialName,
    meta?.materialCategories.join(" "),
    meta?.materialTags.join(" "),
  ];
  return tokens.filter(Boolean).join(" ");
}

type UsePairsArgs = {
  collectionId: string | null;
  groupId: string | null;
  sfModeIds: string[];
  materialModeIds: string[];
  mappingComplete: boolean;
};

type UsePairsResult = {
  pairs: VariablePair[];
  visiblePairs: VariablePair[];
  filteredPairs: VariablePair[];
  pairSearch: string;
  setPairSearch: (value: string) => void;
  refresh: () => Promise<void>;
  loading: boolean;
  error: string | null;
};

export function usePairs({
  collectionId,
  groupId,
  sfModeIds,
  materialModeIds,
  mappingComplete,
}: UsePairsArgs): UsePairsResult {
  const [pairs, setPairs] = useState<VariablePair[]>([]);
  const [pairSearch, setPairSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    if (
      !mappingComplete ||
      !collectionId ||
      !sfModeIds.length ||
      !materialModeIds.length
    ) {
      setPairs([]);
      return;
    }
    setLoading(true);
    try {
      const loaded = await fetchPairs({
        collectionId,
        groupId: groupId ?? null,
        sfModeIds,
        materialModeIds,
      });
      setPairs(loaded);
      setError(null);
    } catch (err) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [collectionId, groupId, sfModeIds, materialModeIds, mappingComplete]);

  const visiblePairs = useMemo(
    () => pairs.filter((pair) => pair.descriptionFields),
    [pairs]
  );

  const buildPairCorpus = useMemo(() => {
    return visiblePairs.map((pair) => ({
      ...pair,
      searchText: buildPairSearchText(pair),
    }));
  }, [visiblePairs]);

  const filteredPairs = useMemo(() => {
    if (!pairSearch.trim()) return buildPairCorpus;
    const fuse = new Fuse(buildPairCorpus, {
      keys: ["name", "searchText"],
      threshold: 0.38,
    });
    return fuse.search(pairSearch).map((res) => res.item);
  }, [pairSearch, buildPairCorpus]);

  return {
    pairs,
    visiblePairs,
    filteredPairs,
    pairSearch,
    setPairSearch,
    refresh,
    loading,
    error,
  };
}
