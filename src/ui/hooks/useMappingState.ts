import { useEffect, useMemo, useState } from "react";
import { MappingState } from "@common/types";
import { loadMappingState, saveMappingState } from "@ui/services/pluginApi";
import { formatError } from "@ui/utils/errors";

type UseMappingStateResult = {
  mapping: MappingState;
  setMapping: (state: Partial<MappingState>) => void;
  mappingComplete: boolean;
  mappingLoaded: boolean;
  error: string | null;
};

const EMPTY_MAPPING: MappingState = {
  collectionId: null,
  groupId: null,
  sfModeIds: [],
  materialModeIds: [],
};

export function useMappingState(): UseMappingStateResult {
  const [mapping, setMappingState] = useState<MappingState>(EMPTY_MAPPING);
  const [mappingLoaded, setMappingLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const state = await loadMappingState();
        setMappingState(state ?? EMPTY_MAPPING);
      } catch (err) {
        setError(formatError(err));
      } finally {
        setMappingLoaded(true);
      }
    };
    load();
  }, []);

  useEffect(() => {
    if (!mappingLoaded) return;
    saveMappingState(mapping).catch((err) => setError(formatError(err)));
  }, [mapping, mappingLoaded]);

  const mappingComplete = useMemo(() => {
    return (
      Boolean(mapping.collectionId) &&
      Array.isArray(mapping.sfModeIds) &&
      Array.isArray(mapping.materialModeIds) &&
      mapping.sfModeIds.length > 0 &&
      mapping.materialModeIds.length > 0
    );
  }, [mapping]);

  const setMapping = (state: Partial<MappingState>) => {
    setMappingState((prev) => ({ ...prev, ...state }));
  };

  return { mapping, setMapping, mappingComplete, mappingLoaded, error };
}
