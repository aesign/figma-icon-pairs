export type SfSymbol = {
  symbol: string;
  name: string;
  categories: string[];
  searchTerms: string[];
  availableFrom?: string;
  restriction?: string;
};

export type MaterialIcon = {
  name: string;
  categories: string[];
  tags: string[];
};

export type VariableGroupInfo = {
  id: string;
  name: string;
};

export type VariableCollectionInfo = {
  id: string;
  name: string;
  defaultModeId: string;
  modes: Array<{ modeId: string; name: string }>;
  groups: VariableGroupInfo[];
};

export type LibraryCollectionInfo = {
  key: string;
  name: string;
  libraryName: string;
};

export type IconPairDescription = {
  sfName: string;
  sfGlyph: string;
  sfCategories: string[];
  sfSearchTerms: string[];
  materialName: string;
  materialCategories: string[];
  materialTags: string[];
};

export type VariablePair = {
  id: string;
  name: string;
  description: string;
  collectionId: string;
  groupId?: string | null;
  descriptionFields: IconPairDescription | null;
  sfValue: string | null;
  materialValue: string | null;
};

export type LoadPairsRequest = {
  collectionId: string;
  groupId?: string | null;
  sfModeIds: string[];
  materialModeIds: string[];
};

export type LoadLibraryPairsRequest = {
  libraryCollectionKey: string;
};

export type CreatePairRequest = {
  collectionId: string;
  groupId?: string | null;
  sfModeIds: string[];
  materialModeIds: string[];
  sf: SfSymbol;
  material: MaterialIcon;
};

export type UpdatePairRequest = CreatePairRequest & {
  variableId: string;
};

export type MappingState = {
  collectionId: string | null;
  groupId: string | null;
  sfModeIds: string[];
  materialModeIds: string[];
  libraryCollectionKey: string | null;
};

export type EnvironmentInfo = {
  isDevMode: boolean;
  canWrite: boolean;
};

export type SourceModeSettings = {
  collectionId: string | null;
  sfModeIds: string[];
  materialModeIds: string[];
};

export type UserGroupSelection = {
  collectionId: string;
  groupId: string | null;
};
