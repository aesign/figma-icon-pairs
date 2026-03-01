import { Networker } from "monorepo-networker";
import {
  CreatePairRequest,
  EnvironmentInfo,
  LibraryCollectionInfo,
  LoadLibraryPairsRequest,
  LoadPairsRequest,
  SourceModeSettings,
  UpdatePairRequest,
  UserGroupSelection,
  VariableCollectionInfo,
  VariablePair,
} from "./types";

export const UI = Networker.createSide("UI-side").listens<{
  ping(): "pong";
  notify(message: string): void;
}>();

export const PLUGIN = Networker.createSide("Plugin-side").listens<{
  ping(): "pong";
  getCollections(): Promise<VariableCollectionInfo[]>;
  getEnvironment(): Promise<EnvironmentInfo>;
  getLibraryCollections(): Promise<LibraryCollectionInfo[]>;
  getSelectionPairs(): Promise<{ pairIds: string[]; selectionCount: number }>;
  clearSelection(): Promise<void>;
  notify(message: string): Promise<void>;
  loadSourceModeSettings(): Promise<SourceModeSettings | null>;
  saveSourceModeSettings(settings: SourceModeSettings): Promise<void>;
  loadUserGroupSelections(): Promise<Record<string, string | null>>;
  saveUserGroupSelection(selection: UserGroupSelection): Promise<void>;
  loadReadOnlyLibrarySelection(): Promise<string | null>;
  saveReadOnlyLibrarySelection(libraryCollectionKey: string | null): Promise<void>;
  loadPairs(payload: LoadPairsRequest): Promise<VariablePair[]>;
  loadLibraryPairs(payload: LoadLibraryPairsRequest): Promise<VariablePair[]>;
  createPair(payload: CreatePairRequest): Promise<VariablePair>;
  updatePair(payload: UpdatePairRequest): Promise<VariablePair>;
  deletePair(variableId: string): Promise<void>;
}>();
