import { PLUGIN } from "@common/networkSides";
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
} from "@common/types";
import { UI_CHANNEL } from "@ui/app.network";

export async function fetchEnvironment(): Promise<EnvironmentInfo> {
  return UI_CHANNEL.request(PLUGIN, "getEnvironment", []);
}

export async function fetchLibraryCollections(): Promise<LibraryCollectionInfo[]> {
  return UI_CHANNEL.request(PLUGIN, "getLibraryCollections", []);
}

export async function fetchSelectionPairs(): Promise<{
  pairIds: string[];
  selectionCount: number;
}> {
  return UI_CHANNEL.request(PLUGIN, "getSelectionPairs", []);
}

export async function clearSelection(): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "clearSelection", []);
}

export async function notify(message: string): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "notify", [message]);
}

export async function fetchCollections(): Promise<VariableCollectionInfo[]> {
  return UI_CHANNEL.request(PLUGIN, "getCollections", []);
}

export async function loadSourceModeSettings(): Promise<SourceModeSettings | null> {
  return UI_CHANNEL.request(PLUGIN, "loadSourceModeSettings", []);
}

export async function saveSourceModeSettings(
  settings: SourceModeSettings
): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "saveSourceModeSettings", [settings]);
}

export async function loadUserGroupSelections(): Promise<
  Record<string, string | null>
> {
  return UI_CHANNEL.request(PLUGIN, "loadUserGroupSelections", []);
}

export async function loadReadOnlyLibrarySelection(): Promise<string | null> {
  return UI_CHANNEL.request(PLUGIN, "loadReadOnlyLibrarySelection", []);
}

export async function saveReadOnlyLibrarySelection(
  libraryCollectionKey: string | null
): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "saveReadOnlyLibrarySelection", [
    libraryCollectionKey,
  ]);
}

export async function saveUserGroupSelection(
  selection: UserGroupSelection
): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "saveUserGroupSelection", [selection]);
}

export async function fetchPairs(
  payload: LoadPairsRequest
): Promise<VariablePair[]> {
  return UI_CHANNEL.request(PLUGIN, "loadPairs", [payload]);
}

export async function fetchLibraryPairs(
  payload: LoadLibraryPairsRequest
): Promise<VariablePair[]> {
  return UI_CHANNEL.request(PLUGIN, "loadLibraryPairs", [payload]);
}

export async function createPair(
  payload: CreatePairRequest
): Promise<VariablePair> {
  return UI_CHANNEL.request(PLUGIN, "createPair", [payload]);
}

export async function updatePair(
  payload: UpdatePairRequest
): Promise<VariablePair> {
  return UI_CHANNEL.request(PLUGIN, "updatePair", [payload]);
}

export async function deletePair(variableId: string): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "deletePair", [variableId]);
}
