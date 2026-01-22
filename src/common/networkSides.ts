import { Networker } from "monorepo-networker";
import {
  CreatePairRequest,
  LoadPairsRequest,
  MappingState,
  UpdatePairRequest,
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
  loadMappingState(): Promise<MappingState>;
  saveMappingState(state: MappingState): Promise<void>;
  loadPairs(payload: LoadPairsRequest): Promise<VariablePair[]>;
  createPair(payload: CreatePairRequest): Promise<VariablePair>;
  updatePair(payload: UpdatePairRequest): Promise<VariablePair>;
  deletePair(variableId: string): Promise<void>;
}>();
