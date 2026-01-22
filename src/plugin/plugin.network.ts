import { buildPairDescription, parsePairDescription } from "@common/description";
import { PLUGIN, UI } from "@common/networkSides";
import {
  CreatePairRequest,
  LoadPairsRequest,
  MappingState,
  UpdatePairRequest,
  VariableCollectionInfo,
  VariableGroupInfo,
  VariablePair,
} from "@common/types";

const GROUP_PLUGIN_DATA_KEY = "variableGroupId";
const MAPPING_STATE_KEY = "mappingState";

export const PLUGIN_CHANNEL = PLUGIN.channelBuilder()
  .emitsTo(UI, (message) => {
    figma.ui.postMessage(message);
  })
  .receivesFrom(UI, (next) => {
    const listener: MessageEventHandler = (event) => next(event);
    figma.ui.on("message", listener);
    return () => figma.ui.off("message", listener);
  })
  .startListening();

// ---------- Helpers

function normalizeGroup(raw: any): VariableGroupInfo | null {
  if (typeof raw === "string") {
    return { id: raw, name: raw };
  }
  if (!raw) return null;
  const id =
    raw.id ??
    raw.groupId ??
    raw.key ??
    raw.modeId ??
    (typeof raw.name === "string" ? raw.name : null);
  const name =
    raw.name ??
    raw.label ??
    raw.title ??
    raw.groupName ??
    (typeof raw.id === "string" ? raw.id : null);
  if (!id) return null;
  return { id: String(id), name: String(name ?? id) };
}

async function listCollections(): Promise<VariableCollectionInfo[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  return collections.map((collection) => {
    const groupsRaw =
      (collection as any).variableGroups ??
      (collection as any).groups ??
      (collection as any).variableGroupIds ??
      [];
    const groups: VariableGroupInfo[] = Array.isArray(groupsRaw)
      ? groupsRaw
          .map(normalizeGroup)
          .filter((group): group is VariableGroupInfo => Boolean(group))
      : [];

    return {
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((mode) => ({
        modeId: mode.modeId,
        name: mode.name,
      })),
      defaultModeId: collection.defaultModeId,
      groups,
    };
  });
}

function ensureModes(
  collection: VariableCollection,
  sfModeId: string,
  materialModeId: string
) {
  const modeIds = new Set(collection.modes.map((mode) => mode.modeId));
  if (!modeIds.has(sfModeId) || !modeIds.has(materialModeId)) {
    throw new Error("Selected modes do not belong to the collection.");
  }
  if (sfModeId === materialModeId) {
    throw new Error("SF and Material modes must be different.");
  }
}

function readVariableGroupId(variable: Variable): string | null {
  const propValue = (variable as any).variableGroupId ?? null;
  const pluginDataValue = variable.getPluginData?.(GROUP_PLUGIN_DATA_KEY);
  return (pluginDataValue || propValue || null) as string | null;
}

function applyVariableGroup(variable: Variable, groupId?: string | null) {
  if (!groupId) return;
  const setter =
    (variable as any).setVariableGroupId ??
    (variable as any).setGroupId ??
    (variable as any).assignVariableGroup;
  if (typeof setter === "function") {
    try {
      setter.call(variable, groupId);
    } catch (err) {
      console.warn("Unable to set variable group via setter", err);
    }
  } else if ("variableGroupId" in (variable as any)) {
    try {
      (variable as any).variableGroupId = groupId;
    } catch (err) {
      console.warn("Unable to assign variableGroupId directly", err);
    }
  }

  try {
    variable.setPluginData(GROUP_PLUGIN_DATA_KEY, groupId);
  } catch (err) {
    console.warn("Unable to store group id in plugin data", err);
  }
}

function serializePair(
  variable: Variable,
  sfModeId: string,
  materialModeId: string
): VariablePair {
  const values = variable.valuesByMode ?? {};
  const sfValue =
    typeof values[sfModeId] === "string" ? (values[sfModeId] as string) : null;
  const materialValue =
    typeof values[materialModeId] === "string"
      ? (values[materialModeId] as string)
      : null;

  return {
    id: variable.id,
    name: variable.name,
    collectionId: variable.variableCollectionId,
    groupId: readVariableGroupId(variable),
    description: variable.description ?? "",
    descriptionFields: parsePairDescription(variable.description ?? ""),
    sfValue,
    materialValue,
  };
}

async function ensureCollection(collectionId: string): Promise<VariableCollection> {
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    collectionId
  );
  if (!collection) {
    throw new Error("Collection not found.");
  }
  return collection;
}

// ---------- Message handlers

PLUGIN_CHANNEL.registerMessageHandler("ping", () => {
  return "pong";
});

PLUGIN_CHANNEL.registerMessageHandler("getCollections", async () => {
  return listCollections();
});

PLUGIN_CHANNEL.registerMessageHandler("loadMappingState", async () => {
  const state = await figma.clientStorage.getAsync(MAPPING_STATE_KEY);
  if (!state) {
    return {
      collectionId: null,
      groupId: null,
      sfModeId: null,
      materialModeId: null,
    } satisfies MappingState;
  }
  return state as MappingState;
});

PLUGIN_CHANNEL.registerMessageHandler(
  "saveMappingState",
  async (state: MappingState) => {
    await figma.clientStorage.setAsync(MAPPING_STATE_KEY, state);
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "loadPairs",
  async (payload: LoadPairsRequest) => {
    const collection = await ensureCollection(payload.collectionId);
    ensureModes(collection, payload.sfModeId, payload.materialModeId);

    const variables = await figma.variables.getLocalVariablesAsync("STRING");
    const filtered = variables.filter((variable) => {
      if (variable.variableCollectionId !== payload.collectionId) return false;
      if (payload.groupId) {
        return readVariableGroupId(variable) === payload.groupId;
      }
      return true;
    });

    return filtered.map((variable) =>
      serializePair(variable, payload.sfModeId, payload.materialModeId)
    );
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "createPair",
  async (payload: CreatePairRequest) => {
    console.log("createPair payload", payload);
    if (figma.editorType !== "figma") {
      throw new Error("Variables are only supported in Figma files.");
    }
    const collection = await ensureCollection(payload.collectionId);
    ensureModes(collection, payload.sfModeId, payload.materialModeId);

    const variable = figma.variables.createVariable(
      payload.sf.symbol,
      collection,
      "STRING"
    );
    console.log("createPair variable created", variable.id);
    applyVariableGroup(variable, payload.groupId ?? null);
    variable.scopes = ["TEXT_CONTENT"];
    variable.setValueForMode(payload.sfModeId, payload.sf.symbol);
    variable.setValueForMode(payload.materialModeId, payload.material.name);
    variable.description = buildPairDescription(payload.sf, payload.material);

    console.log("createPair variable configured", {
      id: variable.id,
      name: variable.name,
    });
    return serializePair(variable, payload.sfModeId, payload.materialModeId);
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "updatePair",
  async (payload: UpdatePairRequest) => {
    const variable = await figma.variables.getVariableByIdAsync(
      payload.variableId
    );
    if (!variable) throw new Error("Variable not found.");
    if (variable.resolvedType !== "STRING") {
      throw new Error("Only STRING variables can be updated.");
    }
    if (variable.variableCollectionId !== payload.collectionId) {
      throw new Error("Cannot move variable to a different collection.");
    }

    const collection = await ensureCollection(payload.collectionId);
    ensureModes(collection, payload.sfModeId, payload.materialModeId);

    const currentGroupId = readVariableGroupId(variable);
    const targetGroup = payload.groupId ?? currentGroupId ?? null;
    if ((targetGroup ?? null) !== (currentGroupId ?? null)) {
      throw new Error("Group cannot be changed for an existing pair.");
    }

    variable.name = payload.sf.symbol;
    variable.setValueForMode(payload.sfModeId, payload.sf.symbol);
    variable.setValueForMode(payload.materialModeId, payload.material.name);
    variable.description = buildPairDescription(payload.sf, payload.material);
    variable.scopes = ["TEXT_CONTENT"];

    return serializePair(variable, payload.sfModeId, payload.materialModeId);
  }
);

PLUGIN_CHANNEL.registerMessageHandler("deletePair", async (variableId) => {
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) return;
  variable.remove();
});
