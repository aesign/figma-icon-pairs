import { useMemo } from "react";
import Fuse from "fuse.js";
import { MaterialIcon, SfSymbol } from "@common/types";
import { useDebounce } from "@ui/hooks/useDebounce";

type UseIconSearchResult = {
  sfResults: SfSymbol[];
  materialResults: MaterialIcon[];
};

export function useIconSearch(
  sfSymbols: SfSymbol[],
  materialIcons: MaterialIcon[],
  searchQuery: string
): UseIconSearchResult {
  const debouncedQuery = useDebounce(searchQuery, 150);

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

  const sfResults = useMemo(() => {
    if (!debouncedQuery.trim()) return sfSymbols;
    return sfIndex.search(debouncedQuery).map((res) => res.item);
  }, [debouncedQuery, sfIndex, sfSymbols]);

  const materialResults = useMemo(() => {
    if (!debouncedQuery.trim()) return materialIcons;
    return materialIndex.search(debouncedQuery).map((res) => res.item);
  }, [debouncedQuery, materialIcons, materialIndex]);

  return { sfResults, materialResults };
}
