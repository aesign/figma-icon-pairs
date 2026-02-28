import { useCallback, useMemo, useState } from "react";
import { MappingState } from "@common/types";

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
  libraryCollectionKey: "bfa1827c219b14613541995a265ff542ea795e05",
};

export function useMappingState(): UseMappingStateResult {
  const [mapping, setMappingState] = useState<MappingState>(EMPTY_MAPPING);
  const mappingLoaded = true;
  const error: string | null = null;

  const mappingComplete = useMemo(() => {
    return (
      Boolean(mapping.collectionId) &&
      Array.isArray(mapping.sfModeIds) &&
      Array.isArray(mapping.materialModeIds) &&
      mapping.sfModeIds.length > 0 &&
      mapping.materialModeIds.length > 0
    );
  }, [mapping]);

  const setMapping = useCallback((state: Partial<MappingState>) => {
    setMappingState((prev) => ({ ...prev, ...state }));
  }, []);

  return { mapping, setMapping, mappingComplete, mappingLoaded, error };
}
