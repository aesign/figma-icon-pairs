import { PLUGIN } from "@common/networkSides";
import {
  CreatePairRequest,
  LoadPairsRequest,
  MappingState,
  UpdatePairRequest,
  VariableCollectionInfo,
  VariablePair,
} from "@common/types";
import { UI_CHANNEL } from "@ui/app.network";

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
