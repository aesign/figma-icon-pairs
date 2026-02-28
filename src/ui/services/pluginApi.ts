import { PLUGIN } from "@common/networkSides";
import {
  CreatePairRequest,
  EnvironmentInfo,
  LibraryCollectionInfo,
  LoadLibraryPairsRequest,
  LoadPairsRequest,
  MappingState,
  UpdatePairRequest,
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

export async function loadMappingState(): Promise<MappingState> {
  return UI_CHANNEL.request(PLUGIN, "loadMappingState", []);
}

export async function saveMappingState(state: MappingState): Promise<void> {
  await UI_CHANNEL.request(PLUGIN, "saveMappingState", [state]);
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
