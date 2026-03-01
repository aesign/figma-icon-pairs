import { parsePairDescription } from "@common/description";
import { DEFAULT_READONLY_LIBRARY_COLLECTION_KEY } from "@common/defaults";
import { PLUGIN, UI } from "@common/networkSides";
import {
  CreatePairRequest,
  IconPairDescription,
  LibraryCollectionInfo,
  LoadLibraryPairsRequest,
  LoadPairsRequest,
  SourceModeSettings,
  UpdatePairRequest,
  UserGroupSelection,
  VariableCollectionInfo,
  VariableGroupInfo,
  VariablePair,
} from "@common/types";

const GROUP_PLUGIN_DATA_KEY = "variableGroupId";
const PLUGIN_DATA_KEY = "ipairs"; // compact key to stay within plugin data limits
const SOURCE_MODE_SETTINGS_PLUGIN_DATA_KEY = "ipairsSourceSettings";
const USER_GROUP_SELECTIONS_STORAGE_KEY = "ipairsUserGroupSelections";
const READONLY_LIBRARY_SELECTION_STORAGE_KEY = "ipairsReadOnlyLibrarySelection";
let readOnlyStartupLogged = false;

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

function isPairVariable(variable: Variable): boolean {
  const parsedFromName = parsePairFromVariableName(variable.name || "");
  if (parsedFromName) return true;
  const parsedFromDescription = parsePairDescription(variable.description || "");
  return Boolean(parsedFromDescription);
}

async function listCollections(): Promise<VariableCollectionInfo[]> {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync("STRING");

  return collections.map((collection) => {
    const collectionVariables = variables.filter(
      (variable) => variable.variableCollectionId === collection.id
    );

    const pairVariables = collectionVariables.filter((variable) =>
      isPairVariable(variable)
    );

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

    // Derive groups from variable names using slash-separated prefixes.
    const derivedGroups = new Map<string, VariableGroupInfo>();
    for (const variable of pairVariables) {
      const name = variable.name || "";
      const parts = name.split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        const prefix = parts.slice(0, i).join("/");
        if (!derivedGroups.has(prefix)) {
          derivedGroups.set(prefix, { id: prefix, name: prefix });
        }
      }
    }

    const pairGroupIds = new Set<string>();
    for (const variable of pairVariables) {
      const explicitGroupId = readVariableGroupId(variable);
      if (explicitGroupId) pairGroupIds.add(explicitGroupId);
      const parts = (variable.name || "").split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        pairGroupIds.add(parts.slice(0, i).join("/"));
      }
    }

    const mergedGroups = new Map<string, VariableGroupInfo>();
    for (const g of groups) mergedGroups.set(g.id, g);
    for (const g of derivedGroups.values()) mergedGroups.set(g.id, g);
    const groupsWithPairs = Array.from(mergedGroups.values()).filter((group) =>
      pairGroupIds.has(group.id)
    );

    return {
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((mode) => ({
        modeId: mode.modeId,
        name: mode.name,
      })),
      defaultModeId: collection.defaultModeId,
      groups: groupsWithPairs,
    };
  });
}

function resolveCanWrite(localCollectionsCount: number): boolean {
  if (figma.editorType !== "figma") return false;
  if (isDevRuntime()) return false;
  return localCollectionsCount > 0;
}

function isDevRuntime(): boolean {
  return (
    figma.editorType === "dev" ||
    (figma as any).mode === "dev" ||
    (figma as any).mode === "code" ||
    (figma as any).isInDevMode === true ||
    (figma as any).devMode === true
  );
}

function hasLocalSourceCollections(localCollectionsCount: number): boolean {
  return localCollectionsCount > 0;
}

export async function isSourceWriteMode(): Promise<boolean> {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  return resolveCanWrite(localCollections.length);
}

async function listLibraryCollections(): Promise<LibraryCollectionInfo[]> {
  const teamLibrary = (figma as any).teamLibrary;
  if (!teamLibrary?.getAvailableLibraryVariableCollectionsAsync) {
    return [];
  }
  const collections = await teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  return collections.map((collection: any) => ({
    key: String(collection.key),
    name: String(collection.name ?? collection.key),
    libraryName: String(
      collection.libraryName ?? collection.library ?? collection.publisherName ?? "Library"
    ),
  }));
}

async function logReadOnlyStartupSelection() {
  if (readOnlyStartupLogged) return;
  readOnlyStartupLogged = true;
  try {
    const collections = await listLibraryCollections();
    const persistedRaw = await figma.clientStorage.getAsync(
      READONLY_LIBRARY_SELECTION_STORAGE_KEY
    );
    const persistedLibraryCollectionKey =
      typeof persistedRaw === "string" && persistedRaw ? persistedRaw : null;
    const selectedCollection =
      collections.find(
        (collection) => collection.key === persistedLibraryCollectionKey
      ) ??
      collections.find(
        (collection) =>
          collection.key === DEFAULT_READONLY_LIBRARY_COLLECTION_KEY
      ) ??
      collections[0] ??
      null;

    log("readOnlyStartupSelection", {
      persistedLibraryCollectionKey,
      defaultLibraryCollectionKey: DEFAULT_READONLY_LIBRARY_COLLECTION_KEY,
      matchedCollectionKey: selectedCollection?.key ?? null,
      matchedCollectionName: selectedCollection?.name ?? null,
      matchedLibraryName: selectedCollection?.libraryName ?? null,
      availableLibraryCollectionCount: collections.length,
    });
  } catch (err) {
    log("readOnlyStartupSelection:error", String((err as any)?.message ?? err));
  }
}

function ensureModes(
  collection: VariableCollection,
  sfModeIds: string[],
  materialModeIds: string[]
) {
  const allModeIds = collection.modes.map((mode) => mode.modeId);
  const sfSet = new Set(sfModeIds);
  const matSet = new Set(materialModeIds);

  if (sfSet.size === 0 || matSet.size === 0) {
    throw new Error("Assign at least one mode to SF and one to Material.");
  }

  for (const id of sfSet) {
    if (!allModeIds.includes(id)) {
      throw new Error("Some SF modes are not part of the collection.");
    }
    if (matSet.has(id)) {
      throw new Error("A mode cannot be assigned to both SF and Material.");
    }
  }
  for (const id of matSet) {
    if (!allModeIds.includes(id)) {
      throw new Error("Some Material modes are not part of the collection.");
    }
  }

  const covered = new Set([...sfSet, ...matSet]);
  if (covered.size !== allModeIds.length) {
    throw new Error("Every mode in the collection must be assigned to SF or Material.");
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

function deriveGroupFromVariableName(name: string): string | null {
  const parts = (name || "").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(0, -1).join("/");
}

function variableMatchesGroupFilter(variable: Variable, groupId: string): boolean {
  if (!groupId) return true;
  const isSubgroupFilter = groupId.includes("/");
  const explicitGroupId = readVariableGroupId(variable);
  const derivedGroupId = deriveGroupFromVariableName(variable.name || "");
  const effectiveGroupId = explicitGroupId || derivedGroupId;
  if (!effectiveGroupId) return false;

  if (isSubgroupFilter) {
    return (
      effectiveGroupId === groupId ||
      effectiveGroupId.startsWith(`${groupId}/`)
    );
  }

  // Top-level filter means: all pairs except subgroup pairs.
  return !effectiveGroupId.includes("/");
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function tokenize(value: string): string[] {
  return value
    .split(/[._/\-\s]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function buildKeywordDescription(
  sf: Pick<CreatePairRequest["sf"], "name" | "categories" | "searchTerms">,
  material: Pick<CreatePairRequest["material"], "name" | "categories" | "tags">
): string {
  const keywords = new Set<string>();
  const sources = [
    ...sf.searchTerms,
    ...sf.categories,
    ...tokenize(sf.name),
    ...material.tags,
    ...material.categories,
    ...tokenize(material.name),
  ];

  for (const source of sources) {
    const normalized = normalizeToken(String(source ?? ""));
    if (normalized) keywords.add(normalized);
  }

  return Array.from(keywords).join(", ");
}

function sanitizeSfLabel(sfName: string): string {
  return sfName
    .replace(/\./g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildVariableLeaf(sfGlyph: string, sfName: string, materialName: string): string {
  return `${sfGlyph} ${sanitizeSfLabel(sfName)}__${materialName.trim()}`;
}

function parsePairFromVariableName(name: string): IconPairDescription | null {
  const rawName = name || "";
  const leaf = rawName.split("/").filter(Boolean).pop() || rawName;
  const delimiterIndex = leaf.indexOf("__");
  if (delimiterIndex < 0) return null;

  const left = leaf.slice(0, delimiterIndex).trim();
  const materialName = leaf.slice(delimiterIndex + 2).trim();
  if (!left || !materialName) return null;

  const chars = Array.from(left);
  const sfGlyph = chars[0] || "";
  const sfLabel = chars.slice(1).join("").trim();
  if (!sfGlyph || !sfLabel) return null;

  return {
    sfName: sfLabel,
    sfGlyph,
    sfCategories: [],
    sfSearchTerms: [],
    materialName,
    materialCategories: [],
    materialTags: [],
  };
}

function serializePair(
  variable: Variable,
  sfModeIds: string[],
  materialModeIds: string[]
): VariablePair {
  const values = variable.valuesByMode ?? {};
  const sfModeId = sfModeIds[0];
  const materialModeId = materialModeIds[0];
  const sfValue =
    sfModeId && typeof values[sfModeId] === "string"
      ? (values[sfModeId] as string)
      : null;
  const materialValue =
    materialModeId && typeof values[materialModeId] === "string"
      ? (values[materialModeId] as string)
      : null;
  const description = variable.description ?? "";
  const descriptionFields =
    parsePairFromVariableName(variable.name || "") ||
    parsePairDescription(description) ||
    null;

  return {
    id: variable.id,
    name: variable.name,
    collectionId: variable.variableCollectionId,
    groupId: readVariableGroupId(variable),
    description,
    descriptionFields,
    sfValue,
    materialValue,
  };
}

type PluginDataPair = {
  id: string;
  sf: string;
  mat: string;
  c: number; // created
  u: number; // updated
};


function readStoredPairs(): Map<string, PluginDataPair> {
  try {
    const raw = figma.root.getPluginData(PLUGIN_DATA_KEY);
    if (!raw) return new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.p)) return new Map();
    const map = new Map<string, PluginDataPair>();
    for (const entry of parsed.p) {
      if (
        Array.isArray(entry) &&
        typeof entry[0] === "string" &&
        typeof entry[1] === "string" &&
        typeof entry[2] === "string" &&
        typeof entry[3] === "number" &&
        typeof entry[4] === "number"
      ) {
        map.set(entry[0], {
          id: entry[0],
          sf: entry[1],
          mat: entry[2],
          c: entry[3],
          u: entry[4],
        });
      }
    }
    return map;
  } catch (err) {
    console.warn("Failed to parse pluginData pairs", err);
    return new Map();
  }
}

function compactValue(valuesByMode: Variable["valuesByMode"]): string {
  if (!valuesByMode || typeof valuesByMode !== "object") return "";
  for (const value of Object.values(valuesByMode)) {
    if (typeof value === "string" && value) return value;
  }
  return "";
}


function persistPairsToPluginData(pairs: PluginDataPair[], reason: string) {
  const payload = {
    v: 1,
    p: pairs.map((p) => [p.id, p.sf, p.mat, p.c, p.u]),
  };
  try {
    figma.root.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(payload));
    log("pluginData updated", {
      reason,
      count: pairs.length,
      payload,
    });
  } catch (err) {
    console.warn("Unable to store pluginData pairs", err);
  }
}

function parseSourceModeSettings(raw: string): SourceModeSettings | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const collectionId =
      typeof (parsed as any).collectionId === "string"
        ? (parsed as any).collectionId
        : null;
    const sfModeIds = Array.isArray((parsed as any).sfModeIds)
      ? (parsed as any).sfModeIds.filter((value: any) => typeof value === "string")
      : [];
    const materialModeIds = Array.isArray((parsed as any).materialModeIds)
      ? (parsed as any).materialModeIds.filter((value: any) => typeof value === "string")
      : [];
    return { collectionId, sfModeIds, materialModeIds };
  } catch {
    return null;
  }
}

function parseUserGroupSelections(raw: unknown): Record<string, string | null> {
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const out: Record<string, string | null> = {};
  for (const [collectionId, value] of Object.entries(source)) {
    if (!collectionId) continue;
    if (typeof value === "string") out[collectionId] = value;
    else if (value === null) out[collectionId] = null;
  }
  return out;
}

export async function snapshotPairsPluginData() {
  const stored = readStoredPairs();
  const now = Date.now();
  const variables = await figma.variables.getLocalVariablesAsync("STRING");
  const pairs: PluginDataPair[] = variables.map((variable) => {
    const parsed =
      parsePairFromVariableName(variable.name || "") ||
      parsePairDescription(variable.description ?? "") ||
      null;
    const sfName = parsed?.sfName || variable.name || "";
    const matName = parsed?.materialName || compactValue(variable.valuesByMode) || "";
    const prev = stored.get(variable.id);
    return {
      id: variable.id,
      sf: sfName,
      mat: matName,
      c: prev?.c ?? now,
      u: now,
    };
  });
  persistPairsToPluginData(pairs, "snapshot");
}

async function upsertPairPluginData(variable: Variable) {
  const stored = readStoredPairs();
  const now = Date.now();
  const parsed =
    parsePairFromVariableName(variable.name || "") ||
    parsePairDescription(variable.description ?? "") ||
    null;
  const sfName = parsed?.sfName || variable.name || "";
  const matName = parsed?.materialName || compactValue(variable.valuesByMode) || "";
  const prev = stored.get(variable.id);
  stored.set(variable.id, {
    id: variable.id,
    sf: sfName,
    mat: matName,
    c: prev?.c ?? now,
    u: now,
  });
  persistPairsToPluginData(Array.from(stored.values()), "upsert");
}

async function removePairPluginData(variable: Variable) {
  const stored = readStoredPairs();
  stored.delete(variable.id);
  persistPairsToPluginData(Array.from(stored.values()), "remove");
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
  const isDevMode = isDevRuntime();
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  const isSourceFile = localCollections.length > 0;
  const canWrite = resolveCanWrite(localCollections.length);
  if (isDevMode || !canWrite) {
    await logReadOnlyStartupSelection();
  }
  log("getEnvironment", {
    editorType: figma.editorType,
    isDevMode,
    canWrite,
    isSourceFile,
  });
  return { isDevMode, canWrite, isSourceFile };
});

PLUGIN_CHANNEL.registerMessageHandler("getLibraryCollections", async () => {
  log("getLibraryCollections");
  return listLibraryCollections();
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

async function resolveSelectionPairIds(ids: Set<string>): Promise<string[]> {
  const out = new Set<string>();
  for (const id of ids) {
    out.add(id);
    if (!id.startsWith("VariableID:")) continue;
    try {
      const variable = await figma.variables.getVariableByIdAsync(id);
      const key = (variable as any)?.key;
      if (typeof key === "string" && key) {
        out.add(`LibraryVariable:${key}`);
      }
    } catch (err) {
      console.warn("Unable to resolve variable key from selection id", id, err);
    }
  }
  return Array.from(out);
}

async function collectSelectionInfo(): Promise<{ pairIds: string[]; selectionCount: number }> {
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

  const pairIds = await resolveSelectionPairIds(ids);
  return { pairIds, selectionCount: figma.currentPage.selection.length };
}

async function notifySelectionPairs() {
  const info = await collectSelectionInfo();
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
  figma.on("selectionchange", () => {
    void notifySelectionPairs();
  });
  void notifySelectionPairs();
}

PLUGIN_CHANNEL.registerMessageHandler("getSelectionPairs", async () => {
  return await collectSelectionInfo();
});

PLUGIN_CHANNEL.registerMessageHandler("clearSelection", async () => {
  figma.currentPage.selection = [];
  await notifySelectionPairs();
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

PLUGIN_CHANNEL.registerMessageHandler("loadSourceModeSettings", async () => {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  if (!hasLocalSourceCollections(localCollections.length)) return null;
  return parseSourceModeSettings(
    figma.root.getPluginData(SOURCE_MODE_SETTINGS_PLUGIN_DATA_KEY)
  );
});

PLUGIN_CHANNEL.registerMessageHandler(
  "saveSourceModeSettings",
  async (settings: SourceModeSettings) => {
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!hasLocalSourceCollections(localCollections.length)) return;
    const payload: SourceModeSettings = {
      collectionId: settings?.collectionId ?? null,
      sfModeIds: Array.isArray(settings?.sfModeIds)
        ? settings.sfModeIds.filter((id) => typeof id === "string")
        : [],
      materialModeIds: Array.isArray(settings?.materialModeIds)
        ? settings.materialModeIds.filter((id) => typeof id === "string")
        : [],
    };
    figma.root.setPluginData(
      SOURCE_MODE_SETTINGS_PLUGIN_DATA_KEY,
      JSON.stringify(payload)
    );
  }
);

PLUGIN_CHANNEL.registerMessageHandler("loadUserGroupSelections", async () => {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  if (!hasLocalSourceCollections(localCollections.length)) return {};
  const raw = await figma.clientStorage.getAsync(USER_GROUP_SELECTIONS_STORAGE_KEY);
  return parseUserGroupSelections(raw);
});

PLUGIN_CHANNEL.registerMessageHandler(
  "saveUserGroupSelection",
  async (selection: UserGroupSelection) => {
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!hasLocalSourceCollections(localCollections.length)) return;
    if (!selection?.collectionId) return;

    const raw = await figma.clientStorage.getAsync(USER_GROUP_SELECTIONS_STORAGE_KEY);
    const map = parseUserGroupSelections(raw);
    map[selection.collectionId] = selection.groupId ?? null;
    await figma.clientStorage.setAsync(USER_GROUP_SELECTIONS_STORAGE_KEY, map);
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "loadReadOnlyLibrarySelection",
  async () => {
    const raw = await figma.clientStorage.getAsync(
      READONLY_LIBRARY_SELECTION_STORAGE_KEY
    );
    if (typeof raw !== "string" || !raw) return null;
    return raw;
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "saveReadOnlyLibrarySelection",
  async (libraryCollectionKey: string | null) => {
    if (!libraryCollectionKey) {
      await figma.clientStorage.setAsync(
        READONLY_LIBRARY_SELECTION_STORAGE_KEY,
        ""
      );
      return;
    }
    await figma.clientStorage.setAsync(
      READONLY_LIBRARY_SELECTION_STORAGE_KEY,
      libraryCollectionKey
    );
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "loadPairs",
  async (payload: LoadPairsRequest) => {
    log("loadPairs", payload);
    const collection = await ensureCollection(payload.collectionId);
    ensureModes(collection, payload.sfModeIds, payload.materialModeIds);

    const variables = await figma.variables.getLocalVariablesAsync("STRING");
    const filtered = variables.filter((variable) => {
      if (variable.variableCollectionId !== payload.collectionId) return false;
      if (payload.groupId) {
        return variableMatchesGroupFilter(variable, payload.groupId);
      }
      return true;
    });

    return filtered.map((variable) =>
      serializePair(variable, payload.sfModeIds, payload.materialModeIds)
    );
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "loadLibraryPairs",
  async (payload: LoadLibraryPairsRequest) => {
    const effectiveLibraryCollectionKey =
      payload.libraryCollectionKey || null;
    log("loadLibraryPairs", { libraryCollectionKey: effectiveLibraryCollectionKey });
    if (!effectiveLibraryCollectionKey) {
      throw new Error("Missing library collection key.");
    }
    const teamLibrary = (figma as any).teamLibrary;
    if (!teamLibrary?.getVariablesInLibraryCollectionAsync) {
      throw new Error("Team library API is not available in this file.");
    }
    const descriptors = await teamLibrary.getVariablesInLibraryCollectionAsync(
      effectiveLibraryCollectionKey
    );
    const stringDescriptors = (Array.isArray(descriptors) ? descriptors : []).filter(
      (descriptor: any) => descriptor?.resolvedType === "STRING"
    );
    log("loadLibraryPairs:stringDescriptorCount", stringDescriptors.length);
    log(
      "loadLibraryPairs:stringDescriptorNames",
      stringDescriptors.map((descriptor: any) => String((descriptor as any).name ?? ""))
    );

    const pairs: VariablePair[] = [];
    for (const descriptor of stringDescriptors) {
      const rawName = String((descriptor as any).name ?? "");
      const fields = parsePairFromVariableName(rawName);
      if (!fields) continue;
      const key = String((descriptor as any).key ?? "");
      pairs.push({
        id: key ? `LibraryVariable:${key}` : rawName,
        name: rawName,
        collectionId: effectiveLibraryCollectionKey,
        groupId: null,
        description: "",
        descriptionFields: fields,
        sfValue: fields.sfGlyph || null,
        materialValue: fields.materialName || null,
      });
    }

    log("loadLibraryPairs:parsedPairCount", pairs.length);
    return pairs;
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "createPair",
  async (payload: CreatePairRequest) => {
    log("createPair", payload);
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!resolveCanWrite(localCollections.length)) {
      throw new Error("This file is read-only. Open the source variable file to edit pairs.");
    }
    const collection = await ensureCollection(payload.collectionId);
    ensureModes(collection, payload.sfModeIds, payload.materialModeIds);

    const variable = figma.variables.createVariable(
      payload.groupId
        ? `${payload.groupId}/${buildVariableLeaf(
            payload.sf.symbol,
            payload.sf.name,
            payload.material.name
          )}`
        : buildVariableLeaf(payload.sf.symbol, payload.sf.name, payload.material.name),
      collection,
      "STRING"
    );
    log("createPair variable created", variable.id);
    applyVariableGroup(variable, payload.groupId ?? null);
    variable.scopes = ["TEXT_CONTENT"];
    payload.sfModeIds.forEach((modeId) =>
      variable.setValueForMode(modeId, payload.sf.symbol)
    );
    payload.materialModeIds.forEach((modeId) =>
      variable.setValueForMode(modeId, payload.material.name)
    );
    variable.description = buildKeywordDescription(payload.sf, payload.material);

    log("createPair variable configured", {
      id: variable.id,
      name: variable.name,
    });
    await upsertPairPluginData(variable);
    return serializePair(variable, payload.sfModeIds, payload.materialModeIds);
  }
);

PLUGIN_CHANNEL.registerMessageHandler(
  "updatePair",
  async (payload: UpdatePairRequest) => {
    log("updatePair", payload);
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!resolveCanWrite(localCollections.length)) {
      throw new Error("This file is read-only. Open the source variable file to edit pairs.");
    }
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
    ensureModes(collection, payload.sfModeIds, payload.materialModeIds);

    const currentGroupId = readVariableGroupId(variable);
    const targetGroup = payload.groupId ?? currentGroupId ?? null;
    if ((targetGroup ?? null) !== (currentGroupId ?? null)) {
      throw new Error("Group cannot be changed for an existing pair.");
    }

    // Re-apply to ensure pluginData/assignment is set
    applyVariableGroup(variable, targetGroup);

    variable.name = targetGroup
      ? `${targetGroup}/${buildVariableLeaf(
          payload.sf.symbol,
          payload.sf.name,
          payload.material.name
        )}`
      : buildVariableLeaf(payload.sf.symbol, payload.sf.name, payload.material.name);
    payload.sfModeIds.forEach((modeId) =>
      variable.setValueForMode(modeId, payload.sf.symbol)
    );
    payload.materialModeIds.forEach((modeId) =>
      variable.setValueForMode(modeId, payload.material.name)
    );
    variable.description = buildKeywordDescription(payload.sf, payload.material);
    variable.scopes = ["TEXT_CONTENT"];

    await upsertPairPluginData(variable);
    return serializePair(variable, payload.sfModeIds, payload.materialModeIds);
  }
);

PLUGIN_CHANNEL.registerMessageHandler("deletePair", async (variableId) => {
  log("deletePair", { variableId });
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  if (!resolveCanWrite(localCollections.length)) {
    throw new Error("This file is read-only. Open the source variable file to edit pairs.");
  }
  const variable = await figma.variables.getVariableByIdAsync(variableId);
  if (!variable) return;
  variable.remove();
  await removePairPluginData(variable);
});
