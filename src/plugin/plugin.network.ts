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

const log = (...args: any[]) => {
  try {
    console.log("[icon-pairs][plugin]", ...args);
  } catch {
    // ignore logging errors
  }
};

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
  log("ping");
  return "pong";
});

PLUGIN_CHANNEL.registerMessageHandler("getEnvironment", async () => {
  const isDevMode =
    figma.editorType === "dev" ||
    (figma as any).mode === "dev" ||
    (figma as any).mode === "code" ||
    (figma as any).isInDevMode === true ||
    (figma as any).devMode === true;
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const isLibraryFile = localCollections.length > 0;
  log("getEnvironment", { editorType: figma.editorType, isDevMode });
  return { isDevMode, isLibraryFile };
});

function extractIds(binding: any): string[] {
  log("extractIds:raw", binding);
  if (!binding) return [];
  if (typeof binding === "string") {
    if (binding.startsWith("VariableID:") || binding.startsWith("VariableCollectionId:")) {
      return [binding];
    }
    log("extractIds:string_ignored", binding);
    return [];
  }
  if (Array.isArray(binding)) {
    const results = binding.flatMap((item) => extractIds(item));
    log("extractIds:array", results);
    return results;
  }
  if (typeof binding === "object" && binding !== null) {
    if (typeof binding.id === "string") {
      log("extractIds:object.id", binding.id);
      return [binding.id];
    }
    if (typeof (binding as any).variableId === "string") {
      log("extractIds:object.variableId", (binding as any).variableId);
      return [(binding as any).variableId];
    }
    if (typeof (binding as any).value === "string") {
      log("extractIds:object.value", (binding as any).value);
      return [(binding as any).value];
    }
    log("extractIds:object.unhandledKeys", Object.keys(binding));
  }
  return [];
}

function collectSelectionInfo(): { pairIds: string[]; selectionCount: number } {
  const ids = new Set<string>();

  const visit = (node: SceneNode) => {
    log("visit:node", { type: node.type, name: (node as any).name });
    if ("children" in node) {
      for (const child of node.children) {
        visit(child);
      }
    }

    if (node.type === "TEXT") {
      const bound = (node as any).boundVariables;
      log("text", node);
      log("text:boundVariables", bound);
      const characters = bound?.characters;
      const varIds = extractIds(characters);
      log("text:charactersVarIds", varIds);
      varIds.forEach((id) => ids.add(id));
    }

    if ("componentProperties" in node) {
     log("instanceNode", node);
      const props =
        ((node as any).componentProperties as Record<
          string,
          { type?: string; value?: any }
        >) ?? {};
      const boundProps =
        ((node as any).boundVariables?.componentProperties as Record<
          string,
          any
        >) ?? {};
      const propRefs =
        ((node as any).componentPropertyReferences as Record<string, any>) ??
        {};

      Object.entries(props).forEach(([propName, prop]) => {
        const bound = boundProps[propName];
        const ref = propRefs[propName];
        const inlineBound =
          (prop as any)?.boundVariables?.value ??
          (prop as any)?.boundVariables ??
          undefined;
        log("instance:componentProperty", {
          node: (node as any).name,
          name: propName,
          type: prop?.type,
          value: prop?.value,
          bound,
          ref,
          inlineBound,
        });

        const isTextProp =
          prop?.type === "TEXT" || prop?.type === "STRING" || prop?.type === "TEXT_LITERAL";

        if (isTextProp) {
          const fromBound = extractIds(bound);
          const fromValue = extractIds(prop?.value);
          const fromRef = extractIds(ref);
          const fromInline = extractIds(inlineBound);
          const all = [...fromBound, ...fromValue, ...fromRef, ...fromInline];
          log("instance:componentPropertyVarIds", {
            name: propName,
            ids: all,
          });
          all.forEach((id) => ids.add(id));
        }
      });
    }
  };

  for (const node of figma.currentPage.selection) {
    visit(node);
  }

  return { pairIds: Array.from(ids), selectionCount: figma.currentPage.selection.length };
}

function notifySelectionPairs() {
  const info = collectSelectionInfo();
  log(
    "selectionchange",
    `nodes=${info.selectionCount}`,
    `pairIds=${info.pairIds.join(",") || "none"}`
  );
  try {
    figma.ui.postMessage({ type: "selectionPairs", ...info });
  } catch (err) {
    console.warn("Failed to post selection pairs", err);
  }
}

export function startSelectionWatcher() {
  figma.on("selectionchange", notifySelectionPairs);
  notifySelectionPairs();
}

PLUGIN_CHANNEL.registerMessageHandler("getSelectionPairs", async () => {
  return collectSelectionInfo();
});

PLUGIN_CHANNEL.registerMessageHandler("clearSelection", async () => {
  figma.currentPage.selection = [];
  notifySelectionPairs();
});

PLUGIN_CHANNEL.registerMessageHandler("notify", async (message: string) => {
  log("notify", message);
  try {
    figma.notify(message, { timeout: 2000 });
  } catch (err) {
    console.warn("Failed to notify", err);
  }
});

PLUGIN_CHANNEL.registerMessageHandler("getCollections", async () => {
  log("getCollections");
  return listCollections();
});

PLUGIN_CHANNEL.registerMessageHandler("loadMappingState", async () => {
  log("loadMappingState");
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
    log("saveMappingState", state);
    await figma.clientStorage.setAsync(MAPPING_STATE_KEY, state);
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "loadPairs",
  async (payload: LoadPairsRequest) => {
    log("loadPairs", payload);
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
    log("createPair", payload);
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
    log("createPair variable created", variable.id);
    applyVariableGroup(variable, payload.groupId ?? null);
    variable.scopes = ["TEXT_CONTENT"];
    variable.setValueForMode(payload.sfModeId, payload.sf.symbol);
    variable.setValueForMode(payload.materialModeId, payload.material.name);
    variable.description = buildPairDescription(payload.sf, payload.material);

    log("createPair variable configured", {
      id: variable.id,
      name: variable.name,
    });
    return serializePair(variable, payload.sfModeId, payload.materialModeId);
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "updatePair",
  async (payload: UpdatePairRequest) => {
    log("updatePair", payload);
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
  log("deletePair", { variableId });
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) return;
  variable.remove();
});
