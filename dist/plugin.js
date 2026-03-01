var __defProp = Object.defineProperty;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var p = Object.defineProperty;
var w = (i, e, t) => e in i ? p(i, e, { enumerable: true, configurable: true, writable: true, value: t }) : i[e] = t;
var u = (i, e, t) => (w(i, typeof e != "symbol" ? e + "" : e, t), t);
var l = (i, e, t) => new Promise((r, s) => {
  var a = (n) => {
    try {
      c(t.next(n));
    } catch (S) {
      s(S);
    }
  }, o = (n) => {
    try {
      c(t.throw(n));
    } catch (S) {
      s(S);
    }
  }, c = (n) => n.done ? r(n.value) : Promise.resolve(n.value).then(a, o);
  c((t = t.apply(i, e)).next());
});
class y extends Error {
  constructor(e) {
    super(e.payload[0]);
  }
}
function h() {
  const i = new Array(36);
  for (let e = 0; e < 36; e++)
    i[e] = Math.floor(Math.random() * 16);
  return i[14] = 4, i[19] = i[19] &= -5, i[19] = i[19] |= 8, i[8] = i[13] = i[18] = i[23] = "-", i.map((e) => e.toString(16)).join("");
}
const g = "__INTERNAL_SUCCESS_RESPONSE_EVENT", E = "__INTERNAL_ERROR_RESPONSE_EVENT";
class N {
  constructor(e) {
    u(this, "emitStrategies", /* @__PURE__ */ new Map());
    u(this, "receiveStrategies", /* @__PURE__ */ new Map());
    this.side = e;
  }
  /**
   * Register strategy for how this side receives messages from given other side.
   *
   *
   * @param side The network side from which messages will be received.
   * @param strategy The strategy for handling incoming messages from the specified side.
   * @returns This channel, so you can chain more things as needed
   */
  receivesFrom(e, t) {
    return this.receiveStrategies.set(e.name, t), this;
  }
  /**
   * Register strategy on how this side emits message to given other side.
   *
   * @param to The target network side to which messages will be emitted.
   * @param strategy Strategy for emitting a message.
   * @returns This channel, so you can chain more things as needed
   */
  emitsTo(e, t) {
    return this.emitStrategies.set(e.name, t), this;
  }
  /**
   * Finalizes and builds the Channel.
   * And starts listening with registered receiving strategies.
   *
   * @returns The channel
   */
  startListening() {
    return new R(
      this.side,
      this.emitStrategies,
      this.receiveStrategies
    );
  }
}
class R {
  constructor(e, t = /* @__PURE__ */ new Map(), r = /* @__PURE__ */ new Map()) {
    u(this, "messageHandlers", {});
    u(this, "subscriptionListeners", {});
    u(this, "pendingRequests", /* @__PURE__ */ new Map());
    u(this, "cleanupCallbacks", []);
    this.side = e, this.emitStrategies = t, this.receiveStrategies = r, r.forEach((s) => {
      const o = s((c, n) => this.receiveNetworkMessage(c, n));
      o && this.cleanupCallbacks.push(o);
    });
  }
  /**
   * Register a handler for an incoming message.
   * The handler is responsible of listening to incoming events, and possibly responding/returning a value to them.
   * @param eventName Name of the event to be listened
   * @param handler Handler that accepts incoming message and sender, then consumes them.
   */
  registerMessageHandler(e, t) {
    this.messageHandlers[e] = t;
  }
  getEmitStrategy(e) {
    const t = this.emitStrategies.get(e.name);
    if (!t) {
      const r = d.getCurrentSide();
      throw new Error(
        `No emit strategy is registered from ${r.name} to ${e.name}`
      );
    }
    return t;
  }
  receiveNetworkMessage(e, t) {
    return l(this, null, function* () {
      if (e.eventName === g) {
        this.receiveSuccessResponse(e);
        return;
      }
      if (e.eventName === E) {
        this.receiveErrorResponse(e);
        return;
      }
      this.invokeSubscribers(e), this.handleIncomingMessage(e, t);
    });
  }
  receiveSuccessResponse(e) {
    return l(this, null, function* () {
      var r;
      const { resolve: t } = (r = this.pendingRequests.get(e.messageId)) != null ? r : {};
      t && (this.pendingRequests.delete(e.messageId), t(e.payload[0]));
    });
  }
  receiveErrorResponse(e) {
    return l(this, null, function* () {
      var r;
      const { reject: t } = (r = this.pendingRequests.get(e.messageId)) != null ? r : {};
      t && (this.pendingRequests.delete(e.messageId), t(new y(e)));
    });
  }
  invokeSubscribers(e) {
    return l(this, null, function* () {
      var t;
      Object.values((t = this.subscriptionListeners[e.eventName]) != null ? t : {}).forEach(
        (r) => {
          r(
            ...e.payload,
            d.getSide(e.fromSide),
            e
          );
        }
      );
    });
  }
  handleIncomingMessage(e, t) {
    return l(this, null, function* () {
      const r = this.messageHandlers[e.eventName];
      if (r != null) {
        const s = d.getSide(e.fromSide);
        if (!s)
          throw new Error(
            `Message received from an unknown side: ${e.fromSide}`
          );
        const a = this.getEmitStrategy(s);
        try {
          const o = yield r(
            ...e.payload,
            d.getSide(e.fromSide),
            e
          );
          a != null && a(
            {
              messageId: e.messageId,
              fromSide: e.fromSide,
              eventName: g,
              payload: [o]
            },
            t
          );
        } catch (o) {
          a != null && a(
            {
              messageId: e.messageId,
              fromSide: e.fromSide,
              eventName: E,
              payload: [
                o instanceof Error ? o.message : "Failed to handle"
              ]
            },
            t
          );
        }
      }
    });
  }
  /**
   * Emits an event to a target side of the network with the specified event name and arguments.
   *
   * @param targetSide - The side of the network to which the event will be emitted.
   * @param eventName - The name of the event to emit.
   * @param emitArgs - The arguments for the event handler corresponding to the `eventName`.
   * @param emitMetadata - The metadata for the event emitter to use.
   *
   * @example
   *  // ./common/sides.ts
   *  const OTHER_SIDE = Networker.createSide("Other-side").listens<
   *    hello(arg1: string): void;
   *  >();
   *
   *  MY_CHANNEL.emit(OTHER_SIDE, "hello", ["world"]);
   */
  emit(e, t, r, ...[s]) {
    this.getEmitStrategy(e)(
      {
        messageId: h(),
        fromSide: d.getCurrentSide().name,
        eventName: t.toString(),
        payload: r
      },
      s
    );
  }
  /**
   * Sends a request to a target side of the network with the specified event name and arguments.
   * Returns a promise that resolves with the response from the target side.
   *
   * @param targetSide - The side of the network to which the request will be sent.
   * @param eventName - The name of the event to request.
   * @param eventArgs - The arguments for the event handler corresponding to the `eventName`.
   * @param emitMetadata - The metadata for the event emitter to use.
   *
   * @returns A promise that resolves with the return value of the event handler on the target side.
   *
   * @example
   *  // ./common/sides.ts
   *  const OTHER_SIDE = Networker.createSide("Other-side").listens<
   *    hello(arg1: string): void;
   *    updateItem(itemId: string, name: string): boolean;
   *  >();
   *
   *  MY_CHANNEL.request(OTHER_SIDE, "hello", ["world"]).then(() => {
   *    console.log("Other side received my request");
   *  });
   *  MY_CHANNEL.request(OTHER_SIDE, "updateItem", ["item-1", "My Item"]).then((success) => {
   *    console.log("Update success:", success);
   *  });
   */
  request(a, o, c) {
    return l(this, arguments, function* (e, t, r, ...[s]) {
      const n = this.getEmitStrategy(e), S = h();
      return new Promise((m, f) => {
        this.pendingRequests.set(S, { resolve: m, reject: f }), n(
          {
            messageId: S,
            fromSide: d.getCurrentSide().name,
            eventName: t.toString(),
            payload: r
          },
          s
        );
      });
    });
  }
  /**
   * Subscribes to an event with the specified event name and listener.
   * Returns an unsubscribe function to remove the listener.
   *
   * @param eventName - The name of the event to subscribe to.
   * @param eventListener - The listener function to handle the event when it is triggered.
   *
   * @returns A function to unsubscribe the listener from the event.
   *
   * @example
   *  // ./common/sides.ts
   *  const MY_SIDE = Networker.createSide("Other-side").listens<
   *    print(text: string): void;
   *  >();
   *
   * // ./my-side/network.ts
   *  const MY_CHANNEL = MY_SIDE.channelBuilder().beginListening();
   *
   *  const unsubscribe = MY_CHANNEL.subscribe("print", text => {
   *    console.log(text);
   *  });
   *  setTimeout(() => unsubscribe(), 5000);
   */
  subscribe(e, t) {
    var a, o;
    const r = h(), s = (o = (a = this.subscriptionListeners)[e]) != null ? o : a[e] = {};
    return s[r] = t, () => {
      delete this.subscriptionListeners[e][r];
    };
  }
}
class v {
  constructor(e) {
    this.name = e;
  }
  channelBuilder() {
    return new N(this);
  }
}
var d;
((i) => {
  const e = [];
  let t;
  function r() {
    if (t == null)
      throw new Error("Logical side is not initialized yet.");
    return t;
  }
  i.getCurrentSide = r;
  function s(c, n) {
    if (t != null)
      throw new Error("Logical side can be declared only once.");
    if (n.side !== c)
      throw new Error("Given side and channel side doesn't match");
    t = c;
  }
  i.initialize = s;
  function a(c) {
    return {
      listens: () => {
        const n = new v(c);
        return e.push(n), n;
      }
    };
  }
  i.createSide = a;
  function o(c) {
    for (let n of e)
      if (n.name === c)
        return n;
    return null;
  }
  i.getSide = o;
})(d || (d = {}));
const UI = d.createSide("UI-side").listens();
const PLUGIN = d.createSide("Plugin-side").listens();
const METADATA_KEYS = [
  "SFS",
  "SFG",
  "SFC",
  "SFT",
  "MS",
  "MSC",
  "MST"
];
function splitList(value) {
  if (!value.trim()) return [];
  return value.split(",").map((part) => part.trim()).filter(Boolean);
}
function parsePairDescription(description) {
  var _a;
  const lines = description.split(/\r?\n/);
  const fields = {
    SFS: "",
    SFG: "",
    SFC: "",
    SFT: "",
    MS: "",
    MSC: "",
    MST: ""
  };
  for (const line of lines) {
    const match = line.match(/^([A-Z]{2,3}):\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    if (METADATA_KEYS.includes(key)) {
      fields[key] = (_a = match[2]) != null ? _a : "";
    }
  }
  if (!fields.SFS && !fields.MS) {
    return null;
  }
  return {
    sfName: fields.SFS,
    sfGlyph: fields.SFG,
    sfCategories: splitList(fields.SFC),
    sfSearchTerms: splitList(fields.SFT),
    materialName: fields.MS,
    materialCategories: splitList(fields.MSC),
    materialTags: splitList(fields.MST)
  };
}
const DEFAULT_READONLY_LIBRARY_COLLECTION_KEY = "bfa1827c219b14613541995a265ff542ea795e05";
const GROUP_PLUGIN_DATA_KEY = "variableGroupId";
const PLUGIN_DATA_KEY = "ipairs";
const SOURCE_MODE_SETTINGS_PLUGIN_DATA_KEY = "ipairsSourceSettings";
const USER_GROUP_SELECTIONS_STORAGE_KEY = "ipairsUserGroupSelections";
const READONLY_LIBRARY_SELECTION_STORAGE_KEY = "ipairsReadOnlyLibrarySelection";
let readOnlyStartupLogged = false;
const log = (...args) => {
  try {
    console.log("[icon-pairs][plugin]", ...args);
  } catch (e) {
  }
};
const PLUGIN_CHANNEL = PLUGIN.channelBuilder().emitsTo(UI, (message) => {
  figma.ui.postMessage(message);
}).receivesFrom(UI, (next) => {
  const listener = (event) => next(event);
  figma.ui.on("message", listener);
  return () => figma.ui.off("message", listener);
}).startListening();
function normalizeGroup(raw) {
  var _a, _b, _c, _d, _e, _f, _g, _h;
  if (typeof raw === "string") {
    return { id: raw, name: raw };
  }
  if (!raw) return null;
  const id = (_d = (_c = (_b = (_a = raw.id) != null ? _a : raw.groupId) != null ? _b : raw.key) != null ? _c : raw.modeId) != null ? _d : typeof raw.name === "string" ? raw.name : null;
  const name = (_h = (_g = (_f = (_e = raw.name) != null ? _e : raw.label) != null ? _f : raw.title) != null ? _g : raw.groupName) != null ? _h : typeof raw.id === "string" ? raw.id : null;
  if (!id) return null;
  return { id: String(id), name: String(name != null ? name : id) };
}
function isPairVariable(variable) {
  const parsedFromName = parsePairFromVariableName(variable.name || "");
  if (parsedFromName) return true;
  const parsedFromDescription = parsePairDescription(variable.description || "");
  return Boolean(parsedFromDescription);
}
async function listCollections() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const variables = await figma.variables.getLocalVariablesAsync("STRING");
  return collections.map((collection) => {
    var _a, _b, _c;
    const collectionVariables = variables.filter(
      (variable) => variable.variableCollectionId === collection.id
    );
    const pairVariables = collectionVariables.filter(
      (variable) => isPairVariable(variable)
    );
    const groupsRaw = (_c = (_b = (_a = collection.variableGroups) != null ? _a : collection.groups) != null ? _b : collection.variableGroupIds) != null ? _c : [];
    const groups = Array.isArray(groupsRaw) ? groupsRaw.map(normalizeGroup).filter((group) => Boolean(group)) : [];
    const derivedGroups = /* @__PURE__ */ new Map();
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
    const pairGroupIds = /* @__PURE__ */ new Set();
    for (const variable of pairVariables) {
      const explicitGroupId = readVariableGroupId(variable);
      if (explicitGroupId) pairGroupIds.add(explicitGroupId);
      const parts = (variable.name || "").split("/").filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        pairGroupIds.add(parts.slice(0, i).join("/"));
      }
    }
    const mergedGroups = /* @__PURE__ */ new Map();
    for (const g2 of groups) mergedGroups.set(g2.id, g2);
    for (const g2 of derivedGroups.values()) mergedGroups.set(g2.id, g2);
    const groupsWithPairs = Array.from(mergedGroups.values()).filter(
      (group) => pairGroupIds.has(group.id)
    );
    return {
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((mode) => ({
        modeId: mode.modeId,
        name: mode.name
      })),
      defaultModeId: collection.defaultModeId,
      groups: groupsWithPairs
    };
  });
}
function resolveCanWrite(localCollectionsCount) {
  if (figma.editorType !== "figma") return false;
  if (isDevRuntime()) return false;
  return localCollectionsCount > 0;
}
function isDevRuntime() {
  return figma.editorType === "dev" || figma.mode === "dev" || figma.mode === "code" || figma.isInDevMode === true || figma.devMode === true;
}
function hasLocalSourceCollections(localCollectionsCount) {
  return localCollectionsCount > 0;
}
async function isSourceWriteMode() {
  const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
  return resolveCanWrite(localCollections.length);
}
async function listLibraryCollections() {
  const teamLibrary = figma.teamLibrary;
  if (!(teamLibrary == null ? void 0 : teamLibrary.getAvailableLibraryVariableCollectionsAsync)) {
    return [];
  }
  const collections = await teamLibrary.getAvailableLibraryVariableCollectionsAsync();
  return collections.map((collection) => {
    var _a, _b, _c, _d;
    return {
      key: String(collection.key),
      name: String((_a = collection.name) != null ? _a : collection.key),
      libraryName: String(
        (_d = (_c = (_b = collection.libraryName) != null ? _b : collection.library) != null ? _c : collection.publisherName) != null ? _d : "Library"
      )
    };
  });
}
async function logReadOnlyStartupSelection() {
  var _a, _b, _c, _d, _e, _f, _g;
  if (readOnlyStartupLogged) return;
  readOnlyStartupLogged = true;
  try {
    const collections = await listLibraryCollections();
    const persistedRaw = await figma.clientStorage.getAsync(
      READONLY_LIBRARY_SELECTION_STORAGE_KEY
    );
    const persistedLibraryCollectionKey = typeof persistedRaw === "string" && persistedRaw ? persistedRaw : null;
    const selectedCollection = (_c = (_b = (_a = collections.find(
      (collection) => collection.key === persistedLibraryCollectionKey
    )) != null ? _a : collections.find(
      (collection) => collection.key === DEFAULT_READONLY_LIBRARY_COLLECTION_KEY
    )) != null ? _b : collections[0]) != null ? _c : null;
    log("readOnlyStartupSelection", {
      persistedLibraryCollectionKey,
      defaultLibraryCollectionKey: DEFAULT_READONLY_LIBRARY_COLLECTION_KEY,
      matchedCollectionKey: (_d = selectedCollection == null ? void 0 : selectedCollection.key) != null ? _d : null,
      matchedCollectionName: (_e = selectedCollection == null ? void 0 : selectedCollection.name) != null ? _e : null,
      matchedLibraryName: (_f = selectedCollection == null ? void 0 : selectedCollection.libraryName) != null ? _f : null,
      availableLibraryCollectionCount: collections.length
    });
  } catch (err) {
    log("readOnlyStartupSelection:error", String((_g = err == null ? void 0 : err.message) != null ? _g : err));
  }
}
function ensureModes(collection, sfModeIds, materialModeIds) {
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
  const covered = /* @__PURE__ */ new Set([...sfSet, ...matSet]);
  if (covered.size !== allModeIds.length) {
    throw new Error("Every mode in the collection must be assigned to SF or Material.");
  }
}
function readVariableGroupId(variable) {
  var _a, _b;
  const propValue = (_a = variable.variableGroupId) != null ? _a : null;
  const pluginDataValue = (_b = variable.getPluginData) == null ? void 0 : _b.call(variable, GROUP_PLUGIN_DATA_KEY);
  return pluginDataValue || propValue || null;
}
function applyVariableGroup(variable, groupId) {
  var _a, _b;
  if (!groupId) return;
  const setter = (_b = (_a = variable.setVariableGroupId) != null ? _a : variable.setGroupId) != null ? _b : variable.assignVariableGroup;
  if (typeof setter === "function") {
    try {
      setter.call(variable, groupId);
    } catch (err) {
      console.warn("Unable to set variable group via setter", err);
    }
  } else if ("variableGroupId" in variable) {
    try {
      variable.variableGroupId = groupId;
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
function deriveGroupFromVariableName(name) {
  const parts = (name || "").split("/").filter(Boolean);
  if (parts.length < 2) return null;
  return parts.slice(0, -1).join("/");
}
function variableMatchesGroupFilter(variable, groupId) {
  if (!groupId) return true;
  const isSubgroupFilter = groupId.includes("/");
  const explicitGroupId = readVariableGroupId(variable);
  const derivedGroupId = deriveGroupFromVariableName(variable.name || "");
  const effectiveGroupId = explicitGroupId || derivedGroupId;
  if (!effectiveGroupId) return false;
  if (isSubgroupFilter) {
    return effectiveGroupId === groupId || effectiveGroupId.startsWith(`${groupId}/`);
  }
  return !effectiveGroupId.includes("/");
}
function normalizeToken(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}
function tokenize(value) {
  return value.split(/[._/\-\s]+/).map((token) => token.trim()).filter(Boolean);
}
function buildKeywordDescription(sf, material) {
  const keywords = /* @__PURE__ */ new Set();
  const sources = [
    ...sf.searchTerms,
    ...sf.categories,
    ...tokenize(sf.name),
    ...material.tags,
    ...material.categories,
    ...tokenize(material.name)
  ];
  for (const source of sources) {
    const normalized = normalizeToken(String(source != null ? source : ""));
    if (normalized) keywords.add(normalized);
  }
  return Array.from(keywords).join(", ");
}
function sanitizeSfLabel(sfName) {
  return sfName.replace(/\./g, " ").replace(/\s+/g, " ").trim();
}
function buildVariableLeaf(sfGlyph, sfName, materialName) {
  return `${sfGlyph} ${sanitizeSfLabel(sfName)}__${materialName.trim()}`;
}
function parsePairFromVariableName(name) {
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
    materialTags: []
  };
}
function serializePair(variable, sfModeIds, materialModeIds) {
  var _a, _b;
  const values = (_a = variable.valuesByMode) != null ? _a : {};
  const sfModeId = sfModeIds[0];
  const materialModeId = materialModeIds[0];
  const sfValue = sfModeId && typeof values[sfModeId] === "string" ? values[sfModeId] : null;
  const materialValue = materialModeId && typeof values[materialModeId] === "string" ? values[materialModeId] : null;
  const description = (_b = variable.description) != null ? _b : "";
  const descriptionFields = parsePairFromVariableName(variable.name || "") || parsePairDescription(description) || null;
  return {
    id: variable.id,
    name: variable.name,
    collectionId: variable.variableCollectionId,
    groupId: readVariableGroupId(variable),
    description,
    descriptionFields,
    sfValue,
    materialValue
  };
}
function readStoredPairs() {
  try {
    const raw = figma.root.getPluginData(PLUGIN_DATA_KEY);
    if (!raw) return /* @__PURE__ */ new Map();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.p)) return /* @__PURE__ */ new Map();
    const map = /* @__PURE__ */ new Map();
    for (const entry of parsed.p) {
      if (Array.isArray(entry) && typeof entry[0] === "string" && typeof entry[1] === "string" && typeof entry[2] === "string" && typeof entry[3] === "number" && typeof entry[4] === "number") {
        map.set(entry[0], {
          id: entry[0],
          sf: entry[1],
          mat: entry[2],
          c: entry[3],
          u: entry[4]
        });
      }
    }
    return map;
  } catch (err) {
    console.warn("Failed to parse pluginData pairs", err);
    return /* @__PURE__ */ new Map();
  }
}
function compactValue(valuesByMode) {
  if (!valuesByMode || typeof valuesByMode !== "object") return "";
  for (const value of Object.values(valuesByMode)) {
    if (typeof value === "string" && value) return value;
  }
  return "";
}
function persistPairsToPluginData(pairs, reason) {
  const payload = {
    v: 1,
    p: pairs.map((p2) => [p2.id, p2.sf, p2.mat, p2.c, p2.u])
  };
  try {
    figma.root.setPluginData(PLUGIN_DATA_KEY, JSON.stringify(payload));
    log("pluginData updated", {
      reason,
      count: pairs.length,
      payload
    });
  } catch (err) {
    console.warn("Unable to store pluginData pairs", err);
  }
}
function parseSourceModeSettings(raw) {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const collectionId = typeof parsed.collectionId === "string" ? parsed.collectionId : null;
    const sfModeIds = Array.isArray(parsed.sfModeIds) ? parsed.sfModeIds.filter((value) => typeof value === "string") : [];
    const materialModeIds = Array.isArray(parsed.materialModeIds) ? parsed.materialModeIds.filter((value) => typeof value === "string") : [];
    return { collectionId, sfModeIds, materialModeIds };
  } catch (e) {
    return null;
  }
}
function parseUserGroupSelections(raw) {
  if (!raw || typeof raw !== "object") return {};
  const source = raw;
  const out = {};
  for (const [collectionId, value] of Object.entries(source)) {
    if (!collectionId) continue;
    if (typeof value === "string") out[collectionId] = value;
    else if (value === null) out[collectionId] = null;
  }
  return out;
}
async function snapshotPairsPluginData() {
  const stored = readStoredPairs();
  const now = Date.now();
  const variables = await figma.variables.getLocalVariablesAsync("STRING");
  const pairs = variables.map((variable) => {
    var _a, _b;
    const parsed = parsePairFromVariableName(variable.name || "") || parsePairDescription((_a = variable.description) != null ? _a : "") || null;
    const sfName = (parsed == null ? void 0 : parsed.sfName) || variable.name || "";
    const matName = (parsed == null ? void 0 : parsed.materialName) || compactValue(variable.valuesByMode) || "";
    const prev = stored.get(variable.id);
    return {
      id: variable.id,
      sf: sfName,
      mat: matName,
      c: (_b = prev == null ? void 0 : prev.c) != null ? _b : now,
      u: now
    };
  });
  persistPairsToPluginData(pairs, "snapshot");
}
async function upsertPairPluginData(variable) {
  var _a, _b;
  const stored = readStoredPairs();
  const now = Date.now();
  const parsed = parsePairFromVariableName(variable.name || "") || parsePairDescription((_a = variable.description) != null ? _a : "") || null;
  const sfName = (parsed == null ? void 0 : parsed.sfName) || variable.name || "";
  const matName = (parsed == null ? void 0 : parsed.materialName) || compactValue(variable.valuesByMode) || "";
  const prev = stored.get(variable.id);
  stored.set(variable.id, {
    id: variable.id,
    sf: sfName,
    mat: matName,
    c: (_b = prev == null ? void 0 : prev.c) != null ? _b : now,
    u: now
  });
  persistPairsToPluginData(Array.from(stored.values()), "upsert");
}
async function removePairPluginData(variable) {
  const stored = readStoredPairs();
  stored.delete(variable.id);
  persistPairsToPluginData(Array.from(stored.values()), "remove");
}
async function ensureCollection(collectionId) {
  const collection = await figma.variables.getVariableCollectionByIdAsync(
    collectionId
  );
  if (!collection) {
    throw new Error("Collection not found.");
  }
  return collection;
}
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
    isSourceFile
  });
  return { isDevMode, canWrite, isSourceFile };
});
PLUGIN_CHANNEL.registerMessageHandler("getLibraryCollections", async () => {
  log("getLibraryCollections");
  return listLibraryCollections();
});
function extractIds(binding) {
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
    if (typeof binding.variableId === "string") {
      log("extractIds:object.variableId", binding.variableId);
      return [binding.variableId];
    }
    if (typeof binding.value === "string") {
      log("extractIds:object.value", binding.value);
      return [binding.value];
    }
    log("extractIds:object.unhandledKeys", Object.keys(binding));
  }
  return [];
}
async function resolveSelectionPairIds(ids) {
  const out = /* @__PURE__ */ new Set();
  for (const id of ids) {
    out.add(id);
    if (!id.startsWith("VariableID:")) continue;
    try {
      const variable = await figma.variables.getVariableByIdAsync(id);
      const key = variable == null ? void 0 : variable.key;
      if (typeof key === "string" && key) {
        out.add(`LibraryVariable:${key}`);
      }
    } catch (err) {
      console.warn("Unable to resolve variable key from selection id", id, err);
    }
  }
  return Array.from(out);
}
async function collectSelectionInfo() {
  const ids = /* @__PURE__ */ new Set();
  const visit = (node) => {
    var _a, _b, _c, _d;
    log("visit:node", { type: node.type, name: node.name });
    if ("children" in node) {
      for (const child of node.children) {
        visit(child);
      }
    }
    if (node.type === "TEXT") {
      const bound = node.boundVariables;
      log("text", node);
      log("text:boundVariables", bound);
      const characters = bound == null ? void 0 : bound.characters;
      const varIds = extractIds(characters);
      log("text:charactersVarIds", varIds);
      varIds.forEach((id) => ids.add(id));
    }
    if ("componentProperties" in node) {
      log("instanceNode", node);
      const props = (_a = node.componentProperties) != null ? _a : {};
      const boundProps = (_c = (_b = node.boundVariables) == null ? void 0 : _b.componentProperties) != null ? _c : {};
      const propRefs = (_d = node.componentPropertyReferences) != null ? _d : {};
      Object.entries(props).forEach(([propName, prop]) => {
        var _a2, _b2, _c2;
        const bound = boundProps[propName];
        const ref = propRefs[propName];
        const inlineBound = (_c2 = (_b2 = (_a2 = prop == null ? void 0 : prop.boundVariables) == null ? void 0 : _a2.value) != null ? _b2 : prop == null ? void 0 : prop.boundVariables) != null ? _c2 : void 0;
        log("instance:componentProperty", {
          node: node.name,
          name: propName,
          type: prop == null ? void 0 : prop.type,
          value: prop == null ? void 0 : prop.value,
          bound,
          ref,
          inlineBound
        });
        const isTextProp = (prop == null ? void 0 : prop.type) === "TEXT" || (prop == null ? void 0 : prop.type) === "STRING" || (prop == null ? void 0 : prop.type) === "TEXT_LITERAL";
        if (isTextProp) {
          const fromBound = extractIds(bound);
          const fromValue = extractIds(prop == null ? void 0 : prop.value);
          const fromRef = extractIds(ref);
          const fromInline = extractIds(inlineBound);
          const all = [...fromBound, ...fromValue, ...fromRef, ...fromInline];
          log("instance:componentPropertyVarIds", {
            name: propName,
            ids: all
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
    figma.ui.postMessage(__spreadValues({ type: "selectionPairs" }, info));
  } catch (err) {
    console.warn("Failed to post selection pairs", err);
  }
}
function startSelectionWatcher() {
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
PLUGIN_CHANNEL.registerMessageHandler("notify", async (message) => {
  log("notify", message);
  try {
    figma.notify(message, { timeout: 2e3 });
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
  async (settings) => {
    var _a;
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!hasLocalSourceCollections(localCollections.length)) return;
    const payload = {
      collectionId: (_a = settings == null ? void 0 : settings.collectionId) != null ? _a : null,
      sfModeIds: Array.isArray(settings == null ? void 0 : settings.sfModeIds) ? settings.sfModeIds.filter((id) => typeof id === "string") : [],
      materialModeIds: Array.isArray(settings == null ? void 0 : settings.materialModeIds) ? settings.materialModeIds.filter((id) => typeof id === "string") : []
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
  async (selection) => {
    var _a;
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!hasLocalSourceCollections(localCollections.length)) return;
    if (!(selection == null ? void 0 : selection.collectionId)) return;
    const raw = await figma.clientStorage.getAsync(USER_GROUP_SELECTIONS_STORAGE_KEY);
    const map = parseUserGroupSelections(raw);
    map[selection.collectionId] = (_a = selection.groupId) != null ? _a : null;
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
  async (libraryCollectionKey) => {
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
  async (payload) => {
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
    return filtered.map(
      (variable) => serializePair(variable, payload.sfModeIds, payload.materialModeIds)
    );
  }
);
PLUGIN_CHANNEL.registerMessageHandler(
  "loadLibraryPairs",
  async (payload) => {
    var _a, _b;
    const effectiveLibraryCollectionKey = payload.libraryCollectionKey || null;
    log("loadLibraryPairs", { libraryCollectionKey: effectiveLibraryCollectionKey });
    if (!effectiveLibraryCollectionKey) {
      throw new Error("Missing library collection key.");
    }
    const teamLibrary = figma.teamLibrary;
    if (!(teamLibrary == null ? void 0 : teamLibrary.getVariablesInLibraryCollectionAsync)) {
      throw new Error("Team library API is not available in this file.");
    }
    const descriptors = await teamLibrary.getVariablesInLibraryCollectionAsync(
      effectiveLibraryCollectionKey
    );
    const stringDescriptors = (Array.isArray(descriptors) ? descriptors : []).filter(
      (descriptor) => (descriptor == null ? void 0 : descriptor.resolvedType) === "STRING"
    );
    log("loadLibraryPairs:stringDescriptorCount", stringDescriptors.length);
    log(
      "loadLibraryPairs:stringDescriptorNames",
      stringDescriptors.map((descriptor) => {
        var _a2;
        return String((_a2 = descriptor.name) != null ? _a2 : "");
      })
    );
    const pairs = [];
    for (const descriptor of stringDescriptors) {
      const rawName = String((_a = descriptor.name) != null ? _a : "");
      const fields = parsePairFromVariableName(rawName);
      if (!fields) continue;
      const key = String((_b = descriptor.key) != null ? _b : "");
      pairs.push({
        id: key ? `LibraryVariable:${key}` : rawName,
        name: rawName,
        collectionId: effectiveLibraryCollectionKey,
        groupId: null,
        description: "",
        descriptionFields: fields,
        sfValue: fields.sfGlyph || null,
        materialValue: fields.materialName || null
      });
    }
    log("loadLibraryPairs:parsedPairCount", pairs.length);
    return pairs;
  }
);
PLUGIN_CHANNEL.registerMessageHandler(
  "createPair",
  async (payload) => {
    var _a;
    log("createPair", payload);
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!resolveCanWrite(localCollections.length)) {
      throw new Error("This file is read-only. Open the source variable file to edit pairs.");
    }
    const collection = await ensureCollection(payload.collectionId);
    ensureModes(collection, payload.sfModeIds, payload.materialModeIds);
    const variable = figma.variables.createVariable(
      payload.groupId ? `${payload.groupId}/${buildVariableLeaf(
        payload.sf.symbol,
        payload.sf.name,
        payload.material.name
      )}` : buildVariableLeaf(payload.sf.symbol, payload.sf.name, payload.material.name),
      collection,
      "STRING"
    );
    log("createPair variable created", variable.id);
    applyVariableGroup(variable, (_a = payload.groupId) != null ? _a : null);
    variable.scopes = ["TEXT_CONTENT"];
    payload.sfModeIds.forEach(
      (modeId) => variable.setValueForMode(modeId, payload.sf.symbol)
    );
    payload.materialModeIds.forEach(
      (modeId) => variable.setValueForMode(modeId, payload.material.name)
    );
    variable.description = buildKeywordDescription(payload.sf, payload.material);
    log("createPair variable configured", {
      id: variable.id,
      name: variable.name
    });
    await upsertPairPluginData(variable);
    return serializePair(variable, payload.sfModeIds, payload.materialModeIds);
  }
);
PLUGIN_CHANNEL.registerMessageHandler(
  "updatePair",
  async (payload) => {
    var _a, _b;
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
    const targetGroup = (_b = (_a = payload.groupId) != null ? _a : currentGroupId) != null ? _b : null;
    if ((targetGroup != null ? targetGroup : null) !== (currentGroupId != null ? currentGroupId : null)) {
      throw new Error("Group cannot be changed for an existing pair.");
    }
    applyVariableGroup(variable, targetGroup);
    variable.name = targetGroup ? `${targetGroup}/${buildVariableLeaf(
      payload.sf.symbol,
      payload.sf.name,
      payload.material.name
    )}` : buildVariableLeaf(payload.sf.symbol, payload.sf.name, payload.material.name);
    payload.sfModeIds.forEach(
      (modeId) => variable.setValueForMode(modeId, payload.sf.symbol)
    );
    payload.materialModeIds.forEach(
      (modeId) => variable.setValueForMode(modeId, payload.material.name)
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
async function bootstrap() {
  d.initialize(PLUGIN, PLUGIN_CHANNEL);
  figma.showUI(__html__, {
    width: 320,
    height: 660,
    themeColors: true
  });
  startSelectionWatcher();
  if (await isSourceWriteMode()) {
    snapshotPairsPluginData().catch(
      (err) => console.warn("Failed to snapshot plugin data", err)
    );
  }
  console.log("Bootstrapped @", d.getCurrentSide().name);
}
bootstrap();
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvbW9ub3JlcG8tbmV0d29ya2VyL2Rpc3QvbW9ub3JlcG8tbmV0d29ya2VyLmpzIiwiLi4vc3JjL2NvbW1vbi9uZXR3b3JrU2lkZXMudHMiLCIuLi9zcmMvY29tbW9uL2Rlc2NyaXB0aW9uLnRzIiwiLi4vc3JjL2NvbW1vbi9kZWZhdWx0cy50cyIsIi4uL3NyYy9wbHVnaW4vcGx1Z2luLm5ldHdvcmsudHMiLCIuLi9zcmMvcGx1Z2luL3BsdWdpbi50cyJdLCJzb3VyY2VzQ29udGVudCI6WyJ2YXIgcCA9IE9iamVjdC5kZWZpbmVQcm9wZXJ0eTtcbnZhciB3ID0gKGksIGUsIHQpID0+IGUgaW4gaSA/IHAoaSwgZSwgeyBlbnVtZXJhYmxlOiAhMCwgY29uZmlndXJhYmxlOiAhMCwgd3JpdGFibGU6ICEwLCB2YWx1ZTogdCB9KSA6IGlbZV0gPSB0O1xudmFyIHUgPSAoaSwgZSwgdCkgPT4gKHcoaSwgdHlwZW9mIGUgIT0gXCJzeW1ib2xcIiA/IGUgKyBcIlwiIDogZSwgdCksIHQpO1xudmFyIGwgPSAoaSwgZSwgdCkgPT4gbmV3IFByb21pc2UoKHIsIHMpID0+IHtcbiAgdmFyIGEgPSAobikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjKHQubmV4dChuKSk7XG4gICAgfSBjYXRjaCAoUykge1xuICAgICAgcyhTKTtcbiAgICB9XG4gIH0sIG8gPSAobikgPT4ge1xuICAgIHRyeSB7XG4gICAgICBjKHQudGhyb3cobikpO1xuICAgIH0gY2F0Y2ggKFMpIHtcbiAgICAgIHMoUyk7XG4gICAgfVxuICB9LCBjID0gKG4pID0+IG4uZG9uZSA/IHIobi52YWx1ZSkgOiBQcm9taXNlLnJlc29sdmUobi52YWx1ZSkudGhlbihhLCBvKTtcbiAgYygodCA9IHQuYXBwbHkoaSwgZSkpLm5leHQoKSk7XG59KTtcbmNsYXNzIHkgZXh0ZW5kcyBFcnJvciB7XG4gIGNvbnN0cnVjdG9yKGUpIHtcbiAgICBzdXBlcihlLnBheWxvYWRbMF0pO1xuICB9XG59XG5mdW5jdGlvbiBoKCkge1xuICBjb25zdCBpID0gbmV3IEFycmF5KDM2KTtcbiAgZm9yIChsZXQgZSA9IDA7IGUgPCAzNjsgZSsrKVxuICAgIGlbZV0gPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxNik7XG4gIHJldHVybiBpWzE0XSA9IDQsIGlbMTldID0gaVsxOV0gJj0gLTUsIGlbMTldID0gaVsxOV0gfD0gOCwgaVs4XSA9IGlbMTNdID0gaVsxOF0gPSBpWzIzXSA9IFwiLVwiLCBpLm1hcCgoZSkgPT4gZS50b1N0cmluZygxNikpLmpvaW4oXCJcIik7XG59XG5jb25zdCBnID0gXCJfX0lOVEVSTkFMX1NVQ0NFU1NfUkVTUE9OU0VfRVZFTlRcIiwgRSA9IFwiX19JTlRFUk5BTF9FUlJPUl9SRVNQT05TRV9FVkVOVFwiO1xuY2xhc3MgTiB7XG4gIGNvbnN0cnVjdG9yKGUpIHtcbiAgICB1KHRoaXMsIFwiZW1pdFN0cmF0ZWdpZXNcIiwgLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKSk7XG4gICAgdSh0aGlzLCBcInJlY2VpdmVTdHJhdGVnaWVzXCIsIC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCkpO1xuICAgIHRoaXMuc2lkZSA9IGU7XG4gIH1cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHN0cmF0ZWd5IGZvciBob3cgdGhpcyBzaWRlIHJlY2VpdmVzIG1lc3NhZ2VzIGZyb20gZ2l2ZW4gb3RoZXIgc2lkZS5cbiAgICpcbiAgICpcbiAgICogQHBhcmFtIHNpZGUgVGhlIG5ldHdvcmsgc2lkZSBmcm9tIHdoaWNoIG1lc3NhZ2VzIHdpbGwgYmUgcmVjZWl2ZWQuXG4gICAqIEBwYXJhbSBzdHJhdGVneSBUaGUgc3RyYXRlZ3kgZm9yIGhhbmRsaW5nIGluY29taW5nIG1lc3NhZ2VzIGZyb20gdGhlIHNwZWNpZmllZCBzaWRlLlxuICAgKiBAcmV0dXJucyBUaGlzIGNoYW5uZWwsIHNvIHlvdSBjYW4gY2hhaW4gbW9yZSB0aGluZ3MgYXMgbmVlZGVkXG4gICAqL1xuICByZWNlaXZlc0Zyb20oZSwgdCkge1xuICAgIHJldHVybiB0aGlzLnJlY2VpdmVTdHJhdGVnaWVzLnNldChlLm5hbWUsIHQpLCB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiBSZWdpc3RlciBzdHJhdGVneSBvbiBob3cgdGhpcyBzaWRlIGVtaXRzIG1lc3NhZ2UgdG8gZ2l2ZW4gb3RoZXIgc2lkZS5cbiAgICpcbiAgICogQHBhcmFtIHRvIFRoZSB0YXJnZXQgbmV0d29yayBzaWRlIHRvIHdoaWNoIG1lc3NhZ2VzIHdpbGwgYmUgZW1pdHRlZC5cbiAgICogQHBhcmFtIHN0cmF0ZWd5IFN0cmF0ZWd5IGZvciBlbWl0dGluZyBhIG1lc3NhZ2UuXG4gICAqIEByZXR1cm5zIFRoaXMgY2hhbm5lbCwgc28geW91IGNhbiBjaGFpbiBtb3JlIHRoaW5ncyBhcyBuZWVkZWRcbiAgICovXG4gIGVtaXRzVG8oZSwgdCkge1xuICAgIHJldHVybiB0aGlzLmVtaXRTdHJhdGVnaWVzLnNldChlLm5hbWUsIHQpLCB0aGlzO1xuICB9XG4gIC8qKlxuICAgKiBGaW5hbGl6ZXMgYW5kIGJ1aWxkcyB0aGUgQ2hhbm5lbC5cbiAgICogQW5kIHN0YXJ0cyBsaXN0ZW5pbmcgd2l0aCByZWdpc3RlcmVkIHJlY2VpdmluZyBzdHJhdGVnaWVzLlxuICAgKlxuICAgKiBAcmV0dXJucyBUaGUgY2hhbm5lbFxuICAgKi9cbiAgc3RhcnRMaXN0ZW5pbmcoKSB7XG4gICAgcmV0dXJuIG5ldyBSKFxuICAgICAgdGhpcy5zaWRlLFxuICAgICAgdGhpcy5lbWl0U3RyYXRlZ2llcyxcbiAgICAgIHRoaXMucmVjZWl2ZVN0cmF0ZWdpZXNcbiAgICApO1xuICB9XG59XG5jbGFzcyBSIHtcbiAgY29uc3RydWN0b3IoZSwgdCA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCksIHIgPSAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpKSB7XG4gICAgdSh0aGlzLCBcIm1lc3NhZ2VIYW5kbGVyc1wiLCB7fSk7XG4gICAgdSh0aGlzLCBcInN1YnNjcmlwdGlvbkxpc3RlbmVyc1wiLCB7fSk7XG4gICAgdSh0aGlzLCBcInBlbmRpbmdSZXF1ZXN0c1wiLCAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpKTtcbiAgICB1KHRoaXMsIFwiY2xlYW51cENhbGxiYWNrc1wiLCBbXSk7XG4gICAgdGhpcy5zaWRlID0gZSwgdGhpcy5lbWl0U3RyYXRlZ2llcyA9IHQsIHRoaXMucmVjZWl2ZVN0cmF0ZWdpZXMgPSByLCByLmZvckVhY2goKHMpID0+IHtcbiAgICAgIGNvbnN0IG8gPSBzKChjLCBuKSA9PiB0aGlzLnJlY2VpdmVOZXR3b3JrTWVzc2FnZShjLCBuKSk7XG4gICAgICBvICYmIHRoaXMuY2xlYW51cENhbGxiYWNrcy5wdXNoKG8pO1xuICAgIH0pO1xuICB9XG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIGhhbmRsZXIgZm9yIGFuIGluY29taW5nIG1lc3NhZ2UuXG4gICAqIFRoZSBoYW5kbGVyIGlzIHJlc3BvbnNpYmxlIG9mIGxpc3RlbmluZyB0byBpbmNvbWluZyBldmVudHMsIGFuZCBwb3NzaWJseSByZXNwb25kaW5nL3JldHVybmluZyBhIHZhbHVlIHRvIHRoZW0uXG4gICAqIEBwYXJhbSBldmVudE5hbWUgTmFtZSBvZiB0aGUgZXZlbnQgdG8gYmUgbGlzdGVuZWRcbiAgICogQHBhcmFtIGhhbmRsZXIgSGFuZGxlciB0aGF0IGFjY2VwdHMgaW5jb21pbmcgbWVzc2FnZSBhbmQgc2VuZGVyLCB0aGVuIGNvbnN1bWVzIHRoZW0uXG4gICAqL1xuICByZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKGUsIHQpIHtcbiAgICB0aGlzLm1lc3NhZ2VIYW5kbGVyc1tlXSA9IHQ7XG4gIH1cbiAgZ2V0RW1pdFN0cmF0ZWd5KGUpIHtcbiAgICBjb25zdCB0ID0gdGhpcy5lbWl0U3RyYXRlZ2llcy5nZXQoZS5uYW1lKTtcbiAgICBpZiAoIXQpIHtcbiAgICAgIGNvbnN0IHIgPSBkLmdldEN1cnJlbnRTaWRlKCk7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXG4gICAgICAgIGBObyBlbWl0IHN0cmF0ZWd5IGlzIHJlZ2lzdGVyZWQgZnJvbSAke3IubmFtZX0gdG8gJHtlLm5hbWV9YFxuICAgICAgKTtcbiAgICB9XG4gICAgcmV0dXJuIHQ7XG4gIH1cbiAgcmVjZWl2ZU5ldHdvcmtNZXNzYWdlKGUsIHQpIHtcbiAgICByZXR1cm4gbCh0aGlzLCBudWxsLCBmdW5jdGlvbiogKCkge1xuICAgICAgaWYgKGUuZXZlbnROYW1lID09PSBnKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZVN1Y2Nlc3NSZXNwb25zZShlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgaWYgKGUuZXZlbnROYW1lID09PSBFKSB7XG4gICAgICAgIHRoaXMucmVjZWl2ZUVycm9yUmVzcG9uc2UoZSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cbiAgICAgIHRoaXMuaW52b2tlU3Vic2NyaWJlcnMoZSksIHRoaXMuaGFuZGxlSW5jb21pbmdNZXNzYWdlKGUsIHQpO1xuICAgIH0pO1xuICB9XG4gIHJlY2VpdmVTdWNjZXNzUmVzcG9uc2UoZSkge1xuICAgIHJldHVybiBsKHRoaXMsIG51bGwsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICB2YXIgcjtcbiAgICAgIGNvbnN0IHsgcmVzb2x2ZTogdCB9ID0gKHIgPSB0aGlzLnBlbmRpbmdSZXF1ZXN0cy5nZXQoZS5tZXNzYWdlSWQpKSAhPSBudWxsID8gciA6IHt9O1xuICAgICAgdCAmJiAodGhpcy5wZW5kaW5nUmVxdWVzdHMuZGVsZXRlKGUubWVzc2FnZUlkKSwgdChlLnBheWxvYWRbMF0pKTtcbiAgICB9KTtcbiAgfVxuICByZWNlaXZlRXJyb3JSZXNwb25zZShlKSB7XG4gICAgcmV0dXJuIGwodGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICAgIHZhciByO1xuICAgICAgY29uc3QgeyByZWplY3Q6IHQgfSA9IChyID0gdGhpcy5wZW5kaW5nUmVxdWVzdHMuZ2V0KGUubWVzc2FnZUlkKSkgIT0gbnVsbCA/IHIgOiB7fTtcbiAgICAgIHQgJiYgKHRoaXMucGVuZGluZ1JlcXVlc3RzLmRlbGV0ZShlLm1lc3NhZ2VJZCksIHQobmV3IHkoZSkpKTtcbiAgICB9KTtcbiAgfVxuICBpbnZva2VTdWJzY3JpYmVycyhlKSB7XG4gICAgcmV0dXJuIGwodGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICAgIHZhciB0O1xuICAgICAgT2JqZWN0LnZhbHVlcygodCA9IHRoaXMuc3Vic2NyaXB0aW9uTGlzdGVuZXJzW2UuZXZlbnROYW1lXSkgIT0gbnVsbCA/IHQgOiB7fSkuZm9yRWFjaChcbiAgICAgICAgKHIpID0+IHtcbiAgICAgICAgICByKFxuICAgICAgICAgICAgLi4uZS5wYXlsb2FkLFxuICAgICAgICAgICAgZC5nZXRTaWRlKGUuZnJvbVNpZGUpLFxuICAgICAgICAgICAgZVxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgICk7XG4gICAgfSk7XG4gIH1cbiAgaGFuZGxlSW5jb21pbmdNZXNzYWdlKGUsIHQpIHtcbiAgICByZXR1cm4gbCh0aGlzLCBudWxsLCBmdW5jdGlvbiogKCkge1xuICAgICAgY29uc3QgciA9IHRoaXMubWVzc2FnZUhhbmRsZXJzW2UuZXZlbnROYW1lXTtcbiAgICAgIGlmIChyICE9IG51bGwpIHtcbiAgICAgICAgY29uc3QgcyA9IGQuZ2V0U2lkZShlLmZyb21TaWRlKTtcbiAgICAgICAgaWYgKCFzKVxuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgICAgIGBNZXNzYWdlIHJlY2VpdmVkIGZyb20gYW4gdW5rbm93biBzaWRlOiAke2UuZnJvbVNpZGV9YFxuICAgICAgICAgICk7XG4gICAgICAgIGNvbnN0IGEgPSB0aGlzLmdldEVtaXRTdHJhdGVneShzKTtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBvID0geWllbGQgcihcbiAgICAgICAgICAgIC4uLmUucGF5bG9hZCxcbiAgICAgICAgICAgIGQuZ2V0U2lkZShlLmZyb21TaWRlKSxcbiAgICAgICAgICAgIGVcbiAgICAgICAgICApO1xuICAgICAgICAgIGEgIT0gbnVsbCAmJiBhKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBtZXNzYWdlSWQ6IGUubWVzc2FnZUlkLFxuICAgICAgICAgICAgICBmcm9tU2lkZTogZS5mcm9tU2lkZSxcbiAgICAgICAgICAgICAgZXZlbnROYW1lOiBnLFxuICAgICAgICAgICAgICBwYXlsb2FkOiBbb11cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICB0XG4gICAgICAgICAgKTtcbiAgICAgICAgfSBjYXRjaCAobykge1xuICAgICAgICAgIGEgIT0gbnVsbCAmJiBhKFxuICAgICAgICAgICAge1xuICAgICAgICAgICAgICBtZXNzYWdlSWQ6IGUubWVzc2FnZUlkLFxuICAgICAgICAgICAgICBmcm9tU2lkZTogZS5mcm9tU2lkZSxcbiAgICAgICAgICAgICAgZXZlbnROYW1lOiBFLFxuICAgICAgICAgICAgICBwYXlsb2FkOiBbXG4gICAgICAgICAgICAgICAgbyBpbnN0YW5jZW9mIEVycm9yID8gby5tZXNzYWdlIDogXCJGYWlsZWQgdG8gaGFuZGxlXCJcbiAgICAgICAgICAgICAgXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRcbiAgICAgICAgICApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIEVtaXRzIGFuIGV2ZW50IHRvIGEgdGFyZ2V0IHNpZGUgb2YgdGhlIG5ldHdvcmsgd2l0aCB0aGUgc3BlY2lmaWVkIGV2ZW50IG5hbWUgYW5kIGFyZ3VtZW50cy5cbiAgICpcbiAgICogQHBhcmFtIHRhcmdldFNpZGUgLSBUaGUgc2lkZSBvZiB0aGUgbmV0d29yayB0byB3aGljaCB0aGUgZXZlbnQgd2lsbCBiZSBlbWl0dGVkLlxuICAgKiBAcGFyYW0gZXZlbnROYW1lIC0gVGhlIG5hbWUgb2YgdGhlIGV2ZW50IHRvIGVtaXQuXG4gICAqIEBwYXJhbSBlbWl0QXJncyAtIFRoZSBhcmd1bWVudHMgZm9yIHRoZSBldmVudCBoYW5kbGVyIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGBldmVudE5hbWVgLlxuICAgKiBAcGFyYW0gZW1pdE1ldGFkYXRhIC0gVGhlIG1ldGFkYXRhIGZvciB0aGUgZXZlbnQgZW1pdHRlciB0byB1c2UuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICAvLyAuL2NvbW1vbi9zaWRlcy50c1xuICAgKiAgY29uc3QgT1RIRVJfU0lERSA9IE5ldHdvcmtlci5jcmVhdGVTaWRlKFwiT3RoZXItc2lkZVwiKS5saXN0ZW5zPFxuICAgKiAgICBoZWxsbyhhcmcxOiBzdHJpbmcpOiB2b2lkO1xuICAgKiAgPigpO1xuICAgKlxuICAgKiAgTVlfQ0hBTk5FTC5lbWl0KE9USEVSX1NJREUsIFwiaGVsbG9cIiwgW1wid29ybGRcIl0pO1xuICAgKi9cbiAgZW1pdChlLCB0LCByLCAuLi5bc10pIHtcbiAgICB0aGlzLmdldEVtaXRTdHJhdGVneShlKShcbiAgICAgIHtcbiAgICAgICAgbWVzc2FnZUlkOiBoKCksXG4gICAgICAgIGZyb21TaWRlOiBkLmdldEN1cnJlbnRTaWRlKCkubmFtZSxcbiAgICAgICAgZXZlbnROYW1lOiB0LnRvU3RyaW5nKCksXG4gICAgICAgIHBheWxvYWQ6IHJcbiAgICAgIH0sXG4gICAgICBzXG4gICAgKTtcbiAgfVxuICAvKipcbiAgICogU2VuZHMgYSByZXF1ZXN0IHRvIGEgdGFyZ2V0IHNpZGUgb2YgdGhlIG5ldHdvcmsgd2l0aCB0aGUgc3BlY2lmaWVkIGV2ZW50IG5hbWUgYW5kIGFyZ3VtZW50cy5cbiAgICogUmV0dXJucyBhIHByb21pc2UgdGhhdCByZXNvbHZlcyB3aXRoIHRoZSByZXNwb25zZSBmcm9tIHRoZSB0YXJnZXQgc2lkZS5cbiAgICpcbiAgICogQHBhcmFtIHRhcmdldFNpZGUgLSBUaGUgc2lkZSBvZiB0aGUgbmV0d29yayB0byB3aGljaCB0aGUgcmVxdWVzdCB3aWxsIGJlIHNlbnQuXG4gICAqIEBwYXJhbSBldmVudE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gcmVxdWVzdC5cbiAgICogQHBhcmFtIGV2ZW50QXJncyAtIFRoZSBhcmd1bWVudHMgZm9yIHRoZSBldmVudCBoYW5kbGVyIGNvcnJlc3BvbmRpbmcgdG8gdGhlIGBldmVudE5hbWVgLlxuICAgKiBAcGFyYW0gZW1pdE1ldGFkYXRhIC0gVGhlIG1ldGFkYXRhIGZvciB0aGUgZXZlbnQgZW1pdHRlciB0byB1c2UuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggdGhlIHJldHVybiB2YWx1ZSBvZiB0aGUgZXZlbnQgaGFuZGxlciBvbiB0aGUgdGFyZ2V0IHNpZGUuXG4gICAqXG4gICAqIEBleGFtcGxlXG4gICAqICAvLyAuL2NvbW1vbi9zaWRlcy50c1xuICAgKiAgY29uc3QgT1RIRVJfU0lERSA9IE5ldHdvcmtlci5jcmVhdGVTaWRlKFwiT3RoZXItc2lkZVwiKS5saXN0ZW5zPFxuICAgKiAgICBoZWxsbyhhcmcxOiBzdHJpbmcpOiB2b2lkO1xuICAgKiAgICB1cGRhdGVJdGVtKGl0ZW1JZDogc3RyaW5nLCBuYW1lOiBzdHJpbmcpOiBib29sZWFuO1xuICAgKiAgPigpO1xuICAgKlxuICAgKiAgTVlfQ0hBTk5FTC5yZXF1ZXN0KE9USEVSX1NJREUsIFwiaGVsbG9cIiwgW1wid29ybGRcIl0pLnRoZW4oKCkgPT4ge1xuICAgKiAgICBjb25zb2xlLmxvZyhcIk90aGVyIHNpZGUgcmVjZWl2ZWQgbXkgcmVxdWVzdFwiKTtcbiAgICogIH0pO1xuICAgKiAgTVlfQ0hBTk5FTC5yZXF1ZXN0KE9USEVSX1NJREUsIFwidXBkYXRlSXRlbVwiLCBbXCJpdGVtLTFcIiwgXCJNeSBJdGVtXCJdKS50aGVuKChzdWNjZXNzKSA9PiB7XG4gICAqICAgIGNvbnNvbGUubG9nKFwiVXBkYXRlIHN1Y2Nlc3M6XCIsIHN1Y2Nlc3MpO1xuICAgKiAgfSk7XG4gICAqL1xuICByZXF1ZXN0KGEsIG8sIGMpIHtcbiAgICByZXR1cm4gbCh0aGlzLCBhcmd1bWVudHMsIGZ1bmN0aW9uKiAoZSwgdCwgciwgLi4uW3NdKSB7XG4gICAgICBjb25zdCBuID0gdGhpcy5nZXRFbWl0U3RyYXRlZ3koZSksIFMgPSBoKCk7XG4gICAgICByZXR1cm4gbmV3IFByb21pc2UoKG0sIGYpID0+IHtcbiAgICAgICAgdGhpcy5wZW5kaW5nUmVxdWVzdHMuc2V0KFMsIHsgcmVzb2x2ZTogbSwgcmVqZWN0OiBmIH0pLCBuKFxuICAgICAgICAgIHtcbiAgICAgICAgICAgIG1lc3NhZ2VJZDogUyxcbiAgICAgICAgICAgIGZyb21TaWRlOiBkLmdldEN1cnJlbnRTaWRlKCkubmFtZSxcbiAgICAgICAgICAgIGV2ZW50TmFtZTogdC50b1N0cmluZygpLFxuICAgICAgICAgICAgcGF5bG9hZDogclxuICAgICAgICAgIH0sXG4gICAgICAgICAgc1xuICAgICAgICApO1xuICAgICAgfSk7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIFN1YnNjcmliZXMgdG8gYW4gZXZlbnQgd2l0aCB0aGUgc3BlY2lmaWVkIGV2ZW50IG5hbWUgYW5kIGxpc3RlbmVyLlxuICAgKiBSZXR1cm5zIGFuIHVuc3Vic2NyaWJlIGZ1bmN0aW9uIHRvIHJlbW92ZSB0aGUgbGlzdGVuZXIuXG4gICAqXG4gICAqIEBwYXJhbSBldmVudE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gc3Vic2NyaWJlIHRvLlxuICAgKiBAcGFyYW0gZXZlbnRMaXN0ZW5lciAtIFRoZSBsaXN0ZW5lciBmdW5jdGlvbiB0byBoYW5kbGUgdGhlIGV2ZW50IHdoZW4gaXQgaXMgdHJpZ2dlcmVkLlxuICAgKlxuICAgKiBAcmV0dXJucyBBIGZ1bmN0aW9uIHRvIHVuc3Vic2NyaWJlIHRoZSBsaXN0ZW5lciBmcm9tIHRoZSBldmVudC5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIC8vIC4vY29tbW9uL3NpZGVzLnRzXG4gICAqICBjb25zdCBNWV9TSURFID0gTmV0d29ya2VyLmNyZWF0ZVNpZGUoXCJPdGhlci1zaWRlXCIpLmxpc3RlbnM8XG4gICAqICAgIHByaW50KHRleHQ6IHN0cmluZyk6IHZvaWQ7XG4gICAqICA+KCk7XG4gICAqXG4gICAqIC8vIC4vbXktc2lkZS9uZXR3b3JrLnRzXG4gICAqICBjb25zdCBNWV9DSEFOTkVMID0gTVlfU0lERS5jaGFubmVsQnVpbGRlcigpLmJlZ2luTGlzdGVuaW5nKCk7XG4gICAqXG4gICAqICBjb25zdCB1bnN1YnNjcmliZSA9IE1ZX0NIQU5ORUwuc3Vic2NyaWJlKFwicHJpbnRcIiwgdGV4dCA9PiB7XG4gICAqICAgIGNvbnNvbGUubG9nKHRleHQpO1xuICAgKiAgfSk7XG4gICAqICBzZXRUaW1lb3V0KCgpID0+IHVuc3Vic2NyaWJlKCksIDUwMDApO1xuICAgKi9cbiAgc3Vic2NyaWJlKGUsIHQpIHtcbiAgICB2YXIgYSwgbztcbiAgICBjb25zdCByID0gaCgpLCBzID0gKG8gPSAoYSA9IHRoaXMuc3Vic2NyaXB0aW9uTGlzdGVuZXJzKVtlXSkgIT0gbnVsbCA/IG8gOiBhW2VdID0ge307XG4gICAgcmV0dXJuIHNbcl0gPSB0LCAoKSA9PiB7XG4gICAgICBkZWxldGUgdGhpcy5zdWJzY3JpcHRpb25MaXN0ZW5lcnNbZV1bcl07XG4gICAgfTtcbiAgfVxufVxuY2xhc3MgdiB7XG4gIGNvbnN0cnVjdG9yKGUpIHtcbiAgICB0aGlzLm5hbWUgPSBlO1xuICB9XG4gIGNoYW5uZWxCdWlsZGVyKCkge1xuICAgIHJldHVybiBuZXcgTih0aGlzKTtcbiAgfVxufVxudmFyIGQ7XG4oKGkpID0+IHtcbiAgY29uc3QgZSA9IFtdO1xuICBsZXQgdDtcbiAgZnVuY3Rpb24gcigpIHtcbiAgICBpZiAodCA9PSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTG9naWNhbCBzaWRlIGlzIG5vdCBpbml0aWFsaXplZCB5ZXQuXCIpO1xuICAgIHJldHVybiB0O1xuICB9XG4gIGkuZ2V0Q3VycmVudFNpZGUgPSByO1xuICBmdW5jdGlvbiBzKGMsIG4pIHtcbiAgICBpZiAodCAhPSBudWxsKVxuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiTG9naWNhbCBzaWRlIGNhbiBiZSBkZWNsYXJlZCBvbmx5IG9uY2UuXCIpO1xuICAgIGlmIChuLnNpZGUgIT09IGMpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJHaXZlbiBzaWRlIGFuZCBjaGFubmVsIHNpZGUgZG9lc24ndCBtYXRjaFwiKTtcbiAgICB0ID0gYztcbiAgfVxuICBpLmluaXRpYWxpemUgPSBzO1xuICBmdW5jdGlvbiBhKGMpIHtcbiAgICByZXR1cm4ge1xuICAgICAgbGlzdGVuczogKCkgPT4ge1xuICAgICAgICBjb25zdCBuID0gbmV3IHYoYyk7XG4gICAgICAgIHJldHVybiBlLnB1c2gobiksIG47XG4gICAgICB9XG4gICAgfTtcbiAgfVxuICBpLmNyZWF0ZVNpZGUgPSBhO1xuICBmdW5jdGlvbiBvKGMpIHtcbiAgICBmb3IgKGxldCBuIG9mIGUpXG4gICAgICBpZiAobi5uYW1lID09PSBjKVxuICAgICAgICByZXR1cm4gbjtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICBpLmdldFNpZGUgPSBvO1xufSkoZCB8fCAoZCA9IHt9KSk7XG5leHBvcnQge1xuICB5IGFzIE5ldHdvcmtFcnJvcixcbiAgZCBhcyBOZXR3b3JrZXJcbn07XG4iLCJpbXBvcnQgeyBOZXR3b3JrZXIgfSBmcm9tIFwibW9ub3JlcG8tbmV0d29ya2VyXCI7XG5pbXBvcnQge1xuICBDcmVhdGVQYWlyUmVxdWVzdCxcbiAgRW52aXJvbm1lbnRJbmZvLFxuICBMaWJyYXJ5Q29sbGVjdGlvbkluZm8sXG4gIExvYWRMaWJyYXJ5UGFpcnNSZXF1ZXN0LFxuICBMb2FkUGFpcnNSZXF1ZXN0LFxuICBTb3VyY2VNb2RlU2V0dGluZ3MsXG4gIFVwZGF0ZVBhaXJSZXF1ZXN0LFxuICBVc2VyR3JvdXBTZWxlY3Rpb24sXG4gIFZhcmlhYmxlQ29sbGVjdGlvbkluZm8sXG4gIFZhcmlhYmxlUGFpcixcbn0gZnJvbSBcIi4vdHlwZXNcIjtcblxuZXhwb3J0IGNvbnN0IFVJID0gTmV0d29ya2VyLmNyZWF0ZVNpZGUoXCJVSS1zaWRlXCIpLmxpc3RlbnM8e1xuICBwaW5nKCk6IFwicG9uZ1wiO1xuICBub3RpZnkobWVzc2FnZTogc3RyaW5nKTogdm9pZDtcbn0+KCk7XG5cbmV4cG9ydCBjb25zdCBQTFVHSU4gPSBOZXR3b3JrZXIuY3JlYXRlU2lkZShcIlBsdWdpbi1zaWRlXCIpLmxpc3RlbnM8e1xuICBwaW5nKCk6IFwicG9uZ1wiO1xuICBnZXRDb2xsZWN0aW9ucygpOiBQcm9taXNlPFZhcmlhYmxlQ29sbGVjdGlvbkluZm9bXT47XG4gIGdldEVudmlyb25tZW50KCk6IFByb21pc2U8RW52aXJvbm1lbnRJbmZvPjtcbiAgZ2V0TGlicmFyeUNvbGxlY3Rpb25zKCk6IFByb21pc2U8TGlicmFyeUNvbGxlY3Rpb25JbmZvW10+O1xuICBnZXRTZWxlY3Rpb25QYWlycygpOiBQcm9taXNlPHsgcGFpcklkczogc3RyaW5nW107IHNlbGVjdGlvbkNvdW50OiBudW1iZXIgfT47XG4gIGNsZWFyU2VsZWN0aW9uKCk6IFByb21pc2U8dm9pZD47XG4gIG5vdGlmeShtZXNzYWdlOiBzdHJpbmcpOiBQcm9taXNlPHZvaWQ+O1xuICBsb2FkU291cmNlTW9kZVNldHRpbmdzKCk6IFByb21pc2U8U291cmNlTW9kZVNldHRpbmdzIHwgbnVsbD47XG4gIHNhdmVTb3VyY2VNb2RlU2V0dGluZ3Moc2V0dGluZ3M6IFNvdXJjZU1vZGVTZXR0aW5ncyk6IFByb21pc2U8dm9pZD47XG4gIGxvYWRVc2VyR3JvdXBTZWxlY3Rpb25zKCk6IFByb21pc2U8UmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVsbD4+O1xuICBzYXZlVXNlckdyb3VwU2VsZWN0aW9uKHNlbGVjdGlvbjogVXNlckdyb3VwU2VsZWN0aW9uKTogUHJvbWlzZTx2b2lkPjtcbiAgbG9hZFJlYWRPbmx5TGlicmFyeVNlbGVjdGlvbigpOiBQcm9taXNlPHN0cmluZyB8IG51bGw+O1xuICBzYXZlUmVhZE9ubHlMaWJyYXJ5U2VsZWN0aW9uKGxpYnJhcnlDb2xsZWN0aW9uS2V5OiBzdHJpbmcgfCBudWxsKTogUHJvbWlzZTx2b2lkPjtcbiAgbG9hZFBhaXJzKHBheWxvYWQ6IExvYWRQYWlyc1JlcXVlc3QpOiBQcm9taXNlPFZhcmlhYmxlUGFpcltdPjtcbiAgbG9hZExpYnJhcnlQYWlycyhwYXlsb2FkOiBMb2FkTGlicmFyeVBhaXJzUmVxdWVzdCk6IFByb21pc2U8VmFyaWFibGVQYWlyW10+O1xuICBjcmVhdGVQYWlyKHBheWxvYWQ6IENyZWF0ZVBhaXJSZXF1ZXN0KTogUHJvbWlzZTxWYXJpYWJsZVBhaXI+O1xuICB1cGRhdGVQYWlyKHBheWxvYWQ6IFVwZGF0ZVBhaXJSZXF1ZXN0KTogUHJvbWlzZTxWYXJpYWJsZVBhaXI+O1xuICBkZWxldGVQYWlyKHZhcmlhYmxlSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XG59PigpO1xuIiwiaW1wb3J0IHsgSWNvblBhaXJEZXNjcmlwdGlvbiwgTWF0ZXJpYWxJY29uLCBTZlN5bWJvbCB9IGZyb20gXCIuL3R5cGVzXCI7XG5cbmNvbnN0IE1FVEFEQVRBX0tFWVMgPSBbXG4gIFwiU0ZTXCIsXG4gIFwiU0ZHXCIsXG4gIFwiU0ZDXCIsXG4gIFwiU0ZUXCIsXG4gIFwiTVNcIixcbiAgXCJNU0NcIixcbiAgXCJNU1RcIixcbl0gYXMgY29uc3Q7XG5cbnR5cGUgTWV0YWRhdGFLZXkgPSAodHlwZW9mIE1FVEFEQVRBX0tFWVMpW251bWJlcl07XG5cbmZ1bmN0aW9uIGpvaW5MaXN0KHZhbHVlczogc3RyaW5nW10pOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWVzLmZpbHRlcihCb29sZWFuKS5qb2luKFwiLCBcIik7XG59XG5cbmZ1bmN0aW9uIHNwbGl0TGlzdCh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICBpZiAoIXZhbHVlLnRyaW0oKSkgcmV0dXJuIFtdO1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoXCIsXCIpXG4gICAgLm1hcCgocGFydCkgPT4gcGFydC50cmltKCkpXG4gICAgLmZpbHRlcihCb29sZWFuKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGJ1aWxkUGFpckRlc2NyaXB0aW9uKFxuICBzZjogUGljazxTZlN5bWJvbCwgXCJuYW1lXCIgfCBcInN5bWJvbFwiIHwgXCJjYXRlZ29yaWVzXCIgfCBcInNlYXJjaFRlcm1zXCI+LFxuICBtYXRlcmlhbDogUGljazxNYXRlcmlhbEljb24sIFwibmFtZVwiIHwgXCJjYXRlZ29yaWVzXCIgfCBcInRhZ3NcIj5cbik6IHN0cmluZyB7XG4gIGNvbnN0IHBhcnRzOiBSZWNvcmQ8TWV0YWRhdGFLZXksIHN0cmluZz4gPSB7XG4gICAgU0ZTOiBzZi5uYW1lLFxuICAgIFNGRzogc2Yuc3ltYm9sLFxuICAgIFNGQzogam9pbkxpc3Qoc2YuY2F0ZWdvcmllcyksXG4gICAgU0ZUOiBqb2luTGlzdChzZi5zZWFyY2hUZXJtcyksXG4gICAgTVM6IG1hdGVyaWFsLm5hbWUsXG4gICAgTVNDOiBqb2luTGlzdChtYXRlcmlhbC5jYXRlZ29yaWVzKSxcbiAgICBNU1Q6IGpvaW5MaXN0KG1hdGVyaWFsLnRhZ3MpLFxuICB9O1xuXG4gIHJldHVybiBNRVRBREFUQV9LRVlTLm1hcCgoa2V5KSA9PiBgJHtrZXl9OiAke3BhcnRzW2tleV0gPz8gXCJcIn1gKS5qb2luKFwiXFxuXCIpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VQYWlyRGVzY3JpcHRpb24oXG4gIGRlc2NyaXB0aW9uOiBzdHJpbmdcbik6IEljb25QYWlyRGVzY3JpcHRpb24gfCBudWxsIHtcbiAgY29uc3QgbGluZXMgPSBkZXNjcmlwdGlvbi5zcGxpdCgvXFxyP1xcbi8pO1xuICBjb25zdCBmaWVsZHM6IFJlY29yZDxNZXRhZGF0YUtleSwgc3RyaW5nPiA9IHtcbiAgICBTRlM6IFwiXCIsXG4gICAgU0ZHOiBcIlwiLFxuICAgIFNGQzogXCJcIixcbiAgICBTRlQ6IFwiXCIsXG4gICAgTVM6IFwiXCIsXG4gICAgTVNDOiBcIlwiLFxuICAgIE1TVDogXCJcIixcbiAgfTtcblxuICBmb3IgKGNvbnN0IGxpbmUgb2YgbGluZXMpIHtcbiAgICBjb25zdCBtYXRjaCA9IGxpbmUubWF0Y2goL14oW0EtWl17MiwzfSk6XFxzKiguKikkLyk7XG4gICAgaWYgKCFtYXRjaCkgY29udGludWU7XG4gICAgY29uc3Qga2V5ID0gbWF0Y2hbMV0gYXMgTWV0YWRhdGFLZXk7XG4gICAgaWYgKE1FVEFEQVRBX0tFWVMuaW5jbHVkZXMoa2V5KSkge1xuICAgICAgZmllbGRzW2tleV0gPSBtYXRjaFsyXSA/PyBcIlwiO1xuICAgIH1cbiAgfVxuXG4gIGlmICghZmllbGRzLlNGUyAmJiAhZmllbGRzLk1TKSB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cblxuICByZXR1cm4ge1xuICAgIHNmTmFtZTogZmllbGRzLlNGUyxcbiAgICBzZkdseXBoOiBmaWVsZHMuU0ZHLFxuICAgIHNmQ2F0ZWdvcmllczogc3BsaXRMaXN0KGZpZWxkcy5TRkMpLFxuICAgIHNmU2VhcmNoVGVybXM6IHNwbGl0TGlzdChmaWVsZHMuU0ZUKSxcbiAgICBtYXRlcmlhbE5hbWU6IGZpZWxkcy5NUyxcbiAgICBtYXRlcmlhbENhdGVnb3JpZXM6IHNwbGl0TGlzdChmaWVsZHMuTVNDKSxcbiAgICBtYXRlcmlhbFRhZ3M6IHNwbGl0TGlzdChmaWVsZHMuTVNUKSxcbiAgfTtcbn1cbiIsImV4cG9ydCBjb25zdCBERUZBVUxUX1JFQURPTkxZX0xJQlJBUllfQ09MTEVDVElPTl9LRVkgPVxuICBcImJmYTE4MjdjMjE5YjE0NjEzNTQxOTk1YTI2NWZmNTQyZWE3OTVlMDVcIjtcblxuIiwiaW1wb3J0IHsgcGFyc2VQYWlyRGVzY3JpcHRpb24gfSBmcm9tIFwiQGNvbW1vbi9kZXNjcmlwdGlvblwiO1xuaW1wb3J0IHsgREVGQVVMVF9SRUFET05MWV9MSUJSQVJZX0NPTExFQ1RJT05fS0VZIH0gZnJvbSBcIkBjb21tb24vZGVmYXVsdHNcIjtcbmltcG9ydCB7IFBMVUdJTiwgVUkgfSBmcm9tIFwiQGNvbW1vbi9uZXR3b3JrU2lkZXNcIjtcbmltcG9ydCB7XG4gIENyZWF0ZVBhaXJSZXF1ZXN0LFxuICBJY29uUGFpckRlc2NyaXB0aW9uLFxuICBMaWJyYXJ5Q29sbGVjdGlvbkluZm8sXG4gIExvYWRMaWJyYXJ5UGFpcnNSZXF1ZXN0LFxuICBMb2FkUGFpcnNSZXF1ZXN0LFxuICBTb3VyY2VNb2RlU2V0dGluZ3MsXG4gIFVwZGF0ZVBhaXJSZXF1ZXN0LFxuICBVc2VyR3JvdXBTZWxlY3Rpb24sXG4gIFZhcmlhYmxlQ29sbGVjdGlvbkluZm8sXG4gIFZhcmlhYmxlR3JvdXBJbmZvLFxuICBWYXJpYWJsZVBhaXIsXG59IGZyb20gXCJAY29tbW9uL3R5cGVzXCI7XG5cbmNvbnN0IEdST1VQX1BMVUdJTl9EQVRBX0tFWSA9IFwidmFyaWFibGVHcm91cElkXCI7XG5jb25zdCBQTFVHSU5fREFUQV9LRVkgPSBcImlwYWlyc1wiOyAvLyBjb21wYWN0IGtleSB0byBzdGF5IHdpdGhpbiBwbHVnaW4gZGF0YSBsaW1pdHNcbmNvbnN0IFNPVVJDRV9NT0RFX1NFVFRJTkdTX1BMVUdJTl9EQVRBX0tFWSA9IFwiaXBhaXJzU291cmNlU2V0dGluZ3NcIjtcbmNvbnN0IFVTRVJfR1JPVVBfU0VMRUNUSU9OU19TVE9SQUdFX0tFWSA9IFwiaXBhaXJzVXNlckdyb3VwU2VsZWN0aW9uc1wiO1xuY29uc3QgUkVBRE9OTFlfTElCUkFSWV9TRUxFQ1RJT05fU1RPUkFHRV9LRVkgPSBcImlwYWlyc1JlYWRPbmx5TGlicmFyeVNlbGVjdGlvblwiO1xubGV0IHJlYWRPbmx5U3RhcnR1cExvZ2dlZCA9IGZhbHNlO1xuXG5jb25zdCBsb2cgPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhcIltpY29uLXBhaXJzXVtwbHVnaW5dXCIsIC4uLmFyZ3MpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBpZ25vcmUgbG9nZ2luZyBlcnJvcnNcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IFBMVUdJTl9DSEFOTkVMID0gUExVR0lOLmNoYW5uZWxCdWlsZGVyKClcbiAgLmVtaXRzVG8oVUksIChtZXNzYWdlKSA9PiB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gIH0pXG4gIC5yZWNlaXZlc0Zyb20oVUksIChuZXh0KSA9PiB7XG4gICAgY29uc3QgbGlzdGVuZXI6IE1lc3NhZ2VFdmVudEhhbmRsZXIgPSAoZXZlbnQpID0+IG5leHQoZXZlbnQpO1xuICAgIGZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG4gICAgcmV0dXJuICgpID0+IGZpZ21hLnVpLm9mZihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuICB9KVxuICAuc3RhcnRMaXN0ZW5pbmcoKTtcblxuLy8gLS0tLS0tLS0tLSBIZWxwZXJzXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUdyb3VwKHJhdzogYW55KTogVmFyaWFibGVHcm91cEluZm8gfCBudWxsIHtcbiAgaWYgKHR5cGVvZiByYXcgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4geyBpZDogcmF3LCBuYW1lOiByYXcgfTtcbiAgfVxuICBpZiAoIXJhdykgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGlkID1cbiAgICByYXcuaWQgPz9cbiAgICByYXcuZ3JvdXBJZCA/P1xuICAgIHJhdy5rZXkgPz9cbiAgICByYXcubW9kZUlkID8/XG4gICAgKHR5cGVvZiByYXcubmFtZSA9PT0gXCJzdHJpbmdcIiA/IHJhdy5uYW1lIDogbnVsbCk7XG4gIGNvbnN0IG5hbWUgPVxuICAgIHJhdy5uYW1lID8/XG4gICAgcmF3LmxhYmVsID8/XG4gICAgcmF3LnRpdGxlID8/XG4gICAgcmF3Lmdyb3VwTmFtZSA/P1xuICAgICh0eXBlb2YgcmF3LmlkID09PSBcInN0cmluZ1wiID8gcmF3LmlkIDogbnVsbCk7XG4gIGlmICghaWQpIHJldHVybiBudWxsO1xuICByZXR1cm4geyBpZDogU3RyaW5nKGlkKSwgbmFtZTogU3RyaW5nKG5hbWUgPz8gaWQpIH07XG59XG5cbmZ1bmN0aW9uIGlzUGFpclZhcmlhYmxlKHZhcmlhYmxlOiBWYXJpYWJsZSk6IGJvb2xlYW4ge1xuICBjb25zdCBwYXJzZWRGcm9tTmFtZSA9IHBhcnNlUGFpckZyb21WYXJpYWJsZU5hbWUodmFyaWFibGUubmFtZSB8fCBcIlwiKTtcbiAgaWYgKHBhcnNlZEZyb21OYW1lKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgcGFyc2VkRnJvbURlc2NyaXB0aW9uID0gcGFyc2VQYWlyRGVzY3JpcHRpb24odmFyaWFibGUuZGVzY3JpcHRpb24gfHwgXCJcIik7XG4gIHJldHVybiBCb29sZWFuKHBhcnNlZEZyb21EZXNjcmlwdGlvbik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RDb2xsZWN0aW9ucygpOiBQcm9taXNlPFZhcmlhYmxlQ29sbGVjdGlvbkluZm9bXT4ge1xuICBjb25zdCBjb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICBjb25zdCB2YXJpYWJsZXMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZXNBc3luYyhcIlNUUklOR1wiKTtcblxuICByZXR1cm4gY29sbGVjdGlvbnMubWFwKChjb2xsZWN0aW9uKSA9PiB7XG4gICAgY29uc3QgY29sbGVjdGlvblZhcmlhYmxlcyA9IHZhcmlhYmxlcy5maWx0ZXIoXG4gICAgICAodmFyaWFibGUpID0+IHZhcmlhYmxlLnZhcmlhYmxlQ29sbGVjdGlvbklkID09PSBjb2xsZWN0aW9uLmlkXG4gICAgKTtcblxuICAgIGNvbnN0IHBhaXJWYXJpYWJsZXMgPSBjb2xsZWN0aW9uVmFyaWFibGVzLmZpbHRlcigodmFyaWFibGUpID0+XG4gICAgICBpc1BhaXJWYXJpYWJsZSh2YXJpYWJsZSlcbiAgICApO1xuXG4gICAgY29uc3QgZ3JvdXBzUmF3ID1cbiAgICAgIChjb2xsZWN0aW9uIGFzIGFueSkudmFyaWFibGVHcm91cHMgPz9cbiAgICAgIChjb2xsZWN0aW9uIGFzIGFueSkuZ3JvdXBzID8/XG4gICAgICAoY29sbGVjdGlvbiBhcyBhbnkpLnZhcmlhYmxlR3JvdXBJZHMgPz9cbiAgICAgIFtdO1xuICAgIGNvbnN0IGdyb3VwczogVmFyaWFibGVHcm91cEluZm9bXSA9IEFycmF5LmlzQXJyYXkoZ3JvdXBzUmF3KVxuICAgICAgPyBncm91cHNSYXdcbiAgICAgICAgICAubWFwKG5vcm1hbGl6ZUdyb3VwKVxuICAgICAgICAgIC5maWx0ZXIoKGdyb3VwKTogZ3JvdXAgaXMgVmFyaWFibGVHcm91cEluZm8gPT4gQm9vbGVhbihncm91cCkpXG4gICAgICA6IFtdO1xuXG4gICAgLy8gRGVyaXZlIGdyb3VwcyBmcm9tIHZhcmlhYmxlIG5hbWVzIHVzaW5nIHNsYXNoLXNlcGFyYXRlZCBwcmVmaXhlcy5cbiAgICBjb25zdCBkZXJpdmVkR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFZhcmlhYmxlR3JvdXBJbmZvPigpO1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgcGFpclZhcmlhYmxlcykge1xuICAgICAgY29uc3QgbmFtZSA9IHZhcmlhYmxlLm5hbWUgfHwgXCJcIjtcbiAgICAgIGNvbnN0IHBhcnRzID0gbmFtZS5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBwcmVmaXggPSBwYXJ0cy5zbGljZSgwLCBpKS5qb2luKFwiL1wiKTtcbiAgICAgICAgaWYgKCFkZXJpdmVkR3JvdXBzLmhhcyhwcmVmaXgpKSB7XG4gICAgICAgICAgZGVyaXZlZEdyb3Vwcy5zZXQocHJlZml4LCB7IGlkOiBwcmVmaXgsIG5hbWU6IHByZWZpeCB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhaXJHcm91cElkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgcGFpclZhcmlhYmxlcykge1xuICAgICAgY29uc3QgZXhwbGljaXRHcm91cElkID0gcmVhZFZhcmlhYmxlR3JvdXBJZCh2YXJpYWJsZSk7XG4gICAgICBpZiAoZXhwbGljaXRHcm91cElkKSBwYWlyR3JvdXBJZHMuYWRkKGV4cGxpY2l0R3JvdXBJZCk7XG4gICAgICBjb25zdCBwYXJ0cyA9ICh2YXJpYWJsZS5uYW1lIHx8IFwiXCIpLnNwbGl0KFwiL1wiKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhaXJHcm91cElkcy5hZGQocGFydHMuc2xpY2UoMCwgaSkuam9pbihcIi9cIikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1lcmdlZEdyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBWYXJpYWJsZUdyb3VwSW5mbz4oKTtcbiAgICBmb3IgKGNvbnN0IGcgb2YgZ3JvdXBzKSBtZXJnZWRHcm91cHMuc2V0KGcuaWQsIGcpO1xuICAgIGZvciAoY29uc3QgZyBvZiBkZXJpdmVkR3JvdXBzLnZhbHVlcygpKSBtZXJnZWRHcm91cHMuc2V0KGcuaWQsIGcpO1xuICAgIGNvbnN0IGdyb3Vwc1dpdGhQYWlycyA9IEFycmF5LmZyb20obWVyZ2VkR3JvdXBzLnZhbHVlcygpKS5maWx0ZXIoKGdyb3VwKSA9PlxuICAgICAgcGFpckdyb3VwSWRzLmhhcyhncm91cC5pZClcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBjb2xsZWN0aW9uLmlkLFxuICAgICAgbmFtZTogY29sbGVjdGlvbi5uYW1lLFxuICAgICAgbW9kZXM6IGNvbGxlY3Rpb24ubW9kZXMubWFwKChtb2RlKSA9PiAoe1xuICAgICAgICBtb2RlSWQ6IG1vZGUubW9kZUlkLFxuICAgICAgICBuYW1lOiBtb2RlLm5hbWUsXG4gICAgICB9KSksXG4gICAgICBkZWZhdWx0TW9kZUlkOiBjb2xsZWN0aW9uLmRlZmF1bHRNb2RlSWQsXG4gICAgICBncm91cHM6IGdyb3Vwc1dpdGhQYWlycyxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUNhbldyaXRlKGxvY2FsQ29sbGVjdGlvbnNDb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGlmIChmaWdtYS5lZGl0b3JUeXBlICE9PSBcImZpZ21hXCIpIHJldHVybiBmYWxzZTtcbiAgaWYgKGlzRGV2UnVudGltZSgpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBsb2NhbENvbGxlY3Rpb25zQ291bnQgPiAwO1xufVxuXG5mdW5jdGlvbiBpc0RldlJ1bnRpbWUoKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgZmlnbWEuZWRpdG9yVHlwZSA9PT0gXCJkZXZcIiB8fFxuICAgIChmaWdtYSBhcyBhbnkpLm1vZGUgPT09IFwiZGV2XCIgfHxcbiAgICAoZmlnbWEgYXMgYW55KS5tb2RlID09PSBcImNvZGVcIiB8fFxuICAgIChmaWdtYSBhcyBhbnkpLmlzSW5EZXZNb2RlID09PSB0cnVlIHx8XG4gICAgKGZpZ21hIGFzIGFueSkuZGV2TW9kZSA9PT0gdHJ1ZVxuICApO1xufVxuXG5mdW5jdGlvbiBoYXNMb2NhbFNvdXJjZUNvbGxlY3Rpb25zKGxvY2FsQ29sbGVjdGlvbnNDb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIHJldHVybiBsb2NhbENvbGxlY3Rpb25zQ291bnQgPiAwO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNTb3VyY2VXcml0ZU1vZGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgcmV0dXJuIHJlc29sdmVDYW5Xcml0ZShsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RMaWJyYXJ5Q29sbGVjdGlvbnMoKTogUHJvbWlzZTxMaWJyYXJ5Q29sbGVjdGlvbkluZm9bXT4ge1xuICBjb25zdCB0ZWFtTGlicmFyeSA9IChmaWdtYSBhcyBhbnkpLnRlYW1MaWJyYXJ5O1xuICBpZiAoIXRlYW1MaWJyYXJ5Py5nZXRBdmFpbGFibGVMaWJyYXJ5VmFyaWFibGVDb2xsZWN0aW9uc0FzeW5jKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IGNvbGxlY3Rpb25zID0gYXdhaXQgdGVhbUxpYnJhcnkuZ2V0QXZhaWxhYmxlTGlicmFyeVZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICByZXR1cm4gY29sbGVjdGlvbnMubWFwKChjb2xsZWN0aW9uOiBhbnkpID0+ICh7XG4gICAga2V5OiBTdHJpbmcoY29sbGVjdGlvbi5rZXkpLFxuICAgIG5hbWU6IFN0cmluZyhjb2xsZWN0aW9uLm5hbWUgPz8gY29sbGVjdGlvbi5rZXkpLFxuICAgIGxpYnJhcnlOYW1lOiBTdHJpbmcoXG4gICAgICBjb2xsZWN0aW9uLmxpYnJhcnlOYW1lID8/IGNvbGxlY3Rpb24ubGlicmFyeSA/PyBjb2xsZWN0aW9uLnB1Ymxpc2hlck5hbWUgPz8gXCJMaWJyYXJ5XCJcbiAgICApLFxuICB9KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvZ1JlYWRPbmx5U3RhcnR1cFNlbGVjdGlvbigpIHtcbiAgaWYgKHJlYWRPbmx5U3RhcnR1cExvZ2dlZCkgcmV0dXJuO1xuICByZWFkT25seVN0YXJ0dXBMb2dnZWQgPSB0cnVlO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbGxlY3Rpb25zID0gYXdhaXQgbGlzdExpYnJhcnlDb2xsZWN0aW9ucygpO1xuICAgIGNvbnN0IHBlcnNpc3RlZFJhdyA9IGF3YWl0IGZpZ21hLmNsaWVudFN0b3JhZ2UuZ2V0QXN5bmMoXG4gICAgICBSRUFET05MWV9MSUJSQVJZX1NFTEVDVElPTl9TVE9SQUdFX0tFWVxuICAgICk7XG4gICAgY29uc3QgcGVyc2lzdGVkTGlicmFyeUNvbGxlY3Rpb25LZXkgPVxuICAgICAgdHlwZW9mIHBlcnNpc3RlZFJhdyA9PT0gXCJzdHJpbmdcIiAmJiBwZXJzaXN0ZWRSYXcgPyBwZXJzaXN0ZWRSYXcgOiBudWxsO1xuICAgIGNvbnN0IHNlbGVjdGVkQ29sbGVjdGlvbiA9XG4gICAgICBjb2xsZWN0aW9ucy5maW5kKFxuICAgICAgICAoY29sbGVjdGlvbikgPT4gY29sbGVjdGlvbi5rZXkgPT09IHBlcnNpc3RlZExpYnJhcnlDb2xsZWN0aW9uS2V5XG4gICAgICApID8/XG4gICAgICBjb2xsZWN0aW9ucy5maW5kKFxuICAgICAgICAoY29sbGVjdGlvbikgPT5cbiAgICAgICAgICBjb2xsZWN0aW9uLmtleSA9PT0gREVGQVVMVF9SRUFET05MWV9MSUJSQVJZX0NPTExFQ1RJT05fS0VZXG4gICAgICApID8/XG4gICAgICBjb2xsZWN0aW9uc1swXSA/P1xuICAgICAgbnVsbDtcblxuICAgIGxvZyhcInJlYWRPbmx5U3RhcnR1cFNlbGVjdGlvblwiLCB7XG4gICAgICBwZXJzaXN0ZWRMaWJyYXJ5Q29sbGVjdGlvbktleSxcbiAgICAgIGRlZmF1bHRMaWJyYXJ5Q29sbGVjdGlvbktleTogREVGQVVMVF9SRUFET05MWV9MSUJSQVJZX0NPTExFQ1RJT05fS0VZLFxuICAgICAgbWF0Y2hlZENvbGxlY3Rpb25LZXk6IHNlbGVjdGVkQ29sbGVjdGlvbj8ua2V5ID8/IG51bGwsXG4gICAgICBtYXRjaGVkQ29sbGVjdGlvbk5hbWU6IHNlbGVjdGVkQ29sbGVjdGlvbj8ubmFtZSA/PyBudWxsLFxuICAgICAgbWF0Y2hlZExpYnJhcnlOYW1lOiBzZWxlY3RlZENvbGxlY3Rpb24/LmxpYnJhcnlOYW1lID8/IG51bGwsXG4gICAgICBhdmFpbGFibGVMaWJyYXJ5Q29sbGVjdGlvbkNvdW50OiBjb2xsZWN0aW9ucy5sZW5ndGgsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGxvZyhcInJlYWRPbmx5U3RhcnR1cFNlbGVjdGlvbjplcnJvclwiLCBTdHJpbmcoKGVyciBhcyBhbnkpPy5tZXNzYWdlID8/IGVycikpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGVuc3VyZU1vZGVzKFxuICBjb2xsZWN0aW9uOiBWYXJpYWJsZUNvbGxlY3Rpb24sXG4gIHNmTW9kZUlkczogc3RyaW5nW10sXG4gIG1hdGVyaWFsTW9kZUlkczogc3RyaW5nW11cbikge1xuICBjb25zdCBhbGxNb2RlSWRzID0gY29sbGVjdGlvbi5tb2Rlcy5tYXAoKG1vZGUpID0+IG1vZGUubW9kZUlkKTtcbiAgY29uc3Qgc2ZTZXQgPSBuZXcgU2V0KHNmTW9kZUlkcyk7XG4gIGNvbnN0IG1hdFNldCA9IG5ldyBTZXQobWF0ZXJpYWxNb2RlSWRzKTtcblxuICBpZiAoc2ZTZXQuc2l6ZSA9PT0gMCB8fCBtYXRTZXQuc2l6ZSA9PT0gMCkge1xuICAgIHRocm93IG5ldyBFcnJvcihcIkFzc2lnbiBhdCBsZWFzdCBvbmUgbW9kZSB0byBTRiBhbmQgb25lIHRvIE1hdGVyaWFsLlwiKTtcbiAgfVxuXG4gIGZvciAoY29uc3QgaWQgb2Ygc2ZTZXQpIHtcbiAgICBpZiAoIWFsbE1vZGVJZHMuaW5jbHVkZXMoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTb21lIFNGIG1vZGVzIGFyZSBub3QgcGFydCBvZiB0aGUgY29sbGVjdGlvbi5cIik7XG4gICAgfVxuICAgIGlmIChtYXRTZXQuaGFzKGlkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiQSBtb2RlIGNhbm5vdCBiZSBhc3NpZ25lZCB0byBib3RoIFNGIGFuZCBNYXRlcmlhbC5cIik7XG4gICAgfVxuICB9XG4gIGZvciAoY29uc3QgaWQgb2YgbWF0U2V0KSB7XG4gICAgaWYgKCFhbGxNb2RlSWRzLmluY2x1ZGVzKGlkKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU29tZSBNYXRlcmlhbCBtb2RlcyBhcmUgbm90IHBhcnQgb2YgdGhlIGNvbGxlY3Rpb24uXCIpO1xuICAgIH1cbiAgfVxuXG4gIGNvbnN0IGNvdmVyZWQgPSBuZXcgU2V0KFsuLi5zZlNldCwgLi4ubWF0U2V0XSk7XG4gIGlmIChjb3ZlcmVkLnNpemUgIT09IGFsbE1vZGVJZHMubGVuZ3RoKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiRXZlcnkgbW9kZSBpbiB0aGUgY29sbGVjdGlvbiBtdXN0IGJlIGFzc2lnbmVkIHRvIFNGIG9yIE1hdGVyaWFsLlwiKTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZWFkVmFyaWFibGVHcm91cElkKHZhcmlhYmxlOiBWYXJpYWJsZSk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBwcm9wVmFsdWUgPSAodmFyaWFibGUgYXMgYW55KS52YXJpYWJsZUdyb3VwSWQgPz8gbnVsbDtcbiAgY29uc3QgcGx1Z2luRGF0YVZhbHVlID0gdmFyaWFibGUuZ2V0UGx1Z2luRGF0YT8uKEdST1VQX1BMVUdJTl9EQVRBX0tFWSk7XG4gIHJldHVybiAocGx1Z2luRGF0YVZhbHVlIHx8IHByb3BWYWx1ZSB8fCBudWxsKSBhcyBzdHJpbmcgfCBudWxsO1xufVxuXG5mdW5jdGlvbiBhcHBseVZhcmlhYmxlR3JvdXAodmFyaWFibGU6IFZhcmlhYmxlLCBncm91cElkPzogc3RyaW5nIHwgbnVsbCkge1xuICBpZiAoIWdyb3VwSWQpIHJldHVybjtcbiAgY29uc3Qgc2V0dGVyID1cbiAgICAodmFyaWFibGUgYXMgYW55KS5zZXRWYXJpYWJsZUdyb3VwSWQgPz9cbiAgICAodmFyaWFibGUgYXMgYW55KS5zZXRHcm91cElkID8/XG4gICAgKHZhcmlhYmxlIGFzIGFueSkuYXNzaWduVmFyaWFibGVHcm91cDtcbiAgaWYgKHR5cGVvZiBzZXR0ZXIgPT09IFwiZnVuY3Rpb25cIikge1xuICAgIHRyeSB7XG4gICAgICBzZXR0ZXIuY2FsbCh2YXJpYWJsZSwgZ3JvdXBJZCk7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJVbmFibGUgdG8gc2V0IHZhcmlhYmxlIGdyb3VwIHZpYSBzZXR0ZXJcIiwgZXJyKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoXCJ2YXJpYWJsZUdyb3VwSWRcIiBpbiAodmFyaWFibGUgYXMgYW55KSkge1xuICAgIHRyeSB7XG4gICAgICAodmFyaWFibGUgYXMgYW55KS52YXJpYWJsZUdyb3VwSWQgPSBncm91cElkO1xuICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgY29uc29sZS53YXJuKFwiVW5hYmxlIHRvIGFzc2lnbiB2YXJpYWJsZUdyb3VwSWQgZGlyZWN0bHlcIiwgZXJyKTtcbiAgICB9XG4gIH1cblxuICB0cnkge1xuICAgIHZhcmlhYmxlLnNldFBsdWdpbkRhdGEoR1JPVVBfUExVR0lOX0RBVEFfS0VZLCBncm91cElkKTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKFwiVW5hYmxlIHRvIHN0b3JlIGdyb3VwIGlkIGluIHBsdWdpbiBkYXRhXCIsIGVycik7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVyaXZlR3JvdXBGcm9tVmFyaWFibGVOYW1lKG5hbWU6IHN0cmluZyk6IHN0cmluZyB8IG51bGwge1xuICBjb25zdCBwYXJ0cyA9IChuYW1lIHx8IFwiXCIpLnNwbGl0KFwiL1wiKS5maWx0ZXIoQm9vbGVhbik7XG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHBhcnRzLnNsaWNlKDAsIC0xKS5qb2luKFwiL1wiKTtcbn1cblxuZnVuY3Rpb24gdmFyaWFibGVNYXRjaGVzR3JvdXBGaWx0ZXIodmFyaWFibGU6IFZhcmlhYmxlLCBncm91cElkOiBzdHJpbmcpOiBib29sZWFuIHtcbiAgaWYgKCFncm91cElkKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgaXNTdWJncm91cEZpbHRlciA9IGdyb3VwSWQuaW5jbHVkZXMoXCIvXCIpO1xuICBjb25zdCBleHBsaWNpdEdyb3VwSWQgPSByZWFkVmFyaWFibGVHcm91cElkKHZhcmlhYmxlKTtcbiAgY29uc3QgZGVyaXZlZEdyb3VwSWQgPSBkZXJpdmVHcm91cEZyb21WYXJpYWJsZU5hbWUodmFyaWFibGUubmFtZSB8fCBcIlwiKTtcbiAgY29uc3QgZWZmZWN0aXZlR3JvdXBJZCA9IGV4cGxpY2l0R3JvdXBJZCB8fCBkZXJpdmVkR3JvdXBJZDtcbiAgaWYgKCFlZmZlY3RpdmVHcm91cElkKSByZXR1cm4gZmFsc2U7XG5cbiAgaWYgKGlzU3ViZ3JvdXBGaWx0ZXIpIHtcbiAgICByZXR1cm4gKFxuICAgICAgZWZmZWN0aXZlR3JvdXBJZCA9PT0gZ3JvdXBJZCB8fFxuICAgICAgZWZmZWN0aXZlR3JvdXBJZC5zdGFydHNXaXRoKGAke2dyb3VwSWR9L2ApXG4gICAgKTtcbiAgfVxuXG4gIC8vIFRvcC1sZXZlbCBmaWx0ZXIgbWVhbnM6IGFsbCBwYWlycyBleGNlcHQgc3ViZ3JvdXAgcGFpcnMuXG4gIHJldHVybiAhZWZmZWN0aXZlR3JvdXBJZC5pbmNsdWRlcyhcIi9cIik7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZVRva2VuKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gdmFsdWUudHJpbSgpLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXFxzKy9nLCBcIiBcIik7XG59XG5cbmZ1bmN0aW9uIHRva2VuaXplKHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdCgvWy5fL1xcLVxcc10rLylcbiAgICAubWFwKCh0b2tlbikgPT4gdG9rZW4udHJpbSgpKVxuICAgIC5maWx0ZXIoQm9vbGVhbik7XG59XG5cbmZ1bmN0aW9uIGJ1aWxkS2V5d29yZERlc2NyaXB0aW9uKFxuICBzZjogUGljazxDcmVhdGVQYWlyUmVxdWVzdFtcInNmXCJdLCBcIm5hbWVcIiB8IFwiY2F0ZWdvcmllc1wiIHwgXCJzZWFyY2hUZXJtc1wiPixcbiAgbWF0ZXJpYWw6IFBpY2s8Q3JlYXRlUGFpclJlcXVlc3RbXCJtYXRlcmlhbFwiXSwgXCJuYW1lXCIgfCBcImNhdGVnb3JpZXNcIiB8IFwidGFnc1wiPlxuKTogc3RyaW5nIHtcbiAgY29uc3Qga2V5d29yZHMgPSBuZXcgU2V0PHN0cmluZz4oKTtcbiAgY29uc3Qgc291cmNlcyA9IFtcbiAgICAuLi5zZi5zZWFyY2hUZXJtcyxcbiAgICAuLi5zZi5jYXRlZ29yaWVzLFxuICAgIC4uLnRva2VuaXplKHNmLm5hbWUpLFxuICAgIC4uLm1hdGVyaWFsLnRhZ3MsXG4gICAgLi4ubWF0ZXJpYWwuY2F0ZWdvcmllcyxcbiAgICAuLi50b2tlbml6ZShtYXRlcmlhbC5uYW1lKSxcbiAgXTtcblxuICBmb3IgKGNvbnN0IHNvdXJjZSBvZiBzb3VyY2VzKSB7XG4gICAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZVRva2VuKFN0cmluZyhzb3VyY2UgPz8gXCJcIikpO1xuICAgIGlmIChub3JtYWxpemVkKSBrZXl3b3Jkcy5hZGQobm9ybWFsaXplZCk7XG4gIH1cblxuICByZXR1cm4gQXJyYXkuZnJvbShrZXl3b3Jkcykuam9pbihcIiwgXCIpO1xufVxuXG5mdW5jdGlvbiBzYW5pdGl6ZVNmTGFiZWwoc2ZOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gc2ZOYW1lXG4gICAgLnJlcGxhY2UoL1xcLi9nLCBcIiBcIilcbiAgICAucmVwbGFjZSgvXFxzKy9nLCBcIiBcIilcbiAgICAudHJpbSgpO1xufVxuXG5mdW5jdGlvbiBidWlsZFZhcmlhYmxlTGVhZihzZkdseXBoOiBzdHJpbmcsIHNmTmFtZTogc3RyaW5nLCBtYXRlcmlhbE5hbWU6IHN0cmluZyk6IHN0cmluZyB7XG4gIHJldHVybiBgJHtzZkdseXBofSAke3Nhbml0aXplU2ZMYWJlbChzZk5hbWUpfV9fJHttYXRlcmlhbE5hbWUudHJpbSgpfWA7XG59XG5cbmZ1bmN0aW9uIHBhcnNlUGFpckZyb21WYXJpYWJsZU5hbWUobmFtZTogc3RyaW5nKTogSWNvblBhaXJEZXNjcmlwdGlvbiB8IG51bGwge1xuICBjb25zdCByYXdOYW1lID0gbmFtZSB8fCBcIlwiO1xuICBjb25zdCBsZWFmID0gcmF3TmFtZS5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pLnBvcCgpIHx8IHJhd05hbWU7XG4gIGNvbnN0IGRlbGltaXRlckluZGV4ID0gbGVhZi5pbmRleE9mKFwiX19cIik7XG4gIGlmIChkZWxpbWl0ZXJJbmRleCA8IDApIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGxlZnQgPSBsZWFmLnNsaWNlKDAsIGRlbGltaXRlckluZGV4KS50cmltKCk7XG4gIGNvbnN0IG1hdGVyaWFsTmFtZSA9IGxlYWYuc2xpY2UoZGVsaW1pdGVySW5kZXggKyAyKS50cmltKCk7XG4gIGlmICghbGVmdCB8fCAhbWF0ZXJpYWxOYW1lKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBjaGFycyA9IEFycmF5LmZyb20obGVmdCk7XG4gIGNvbnN0IHNmR2x5cGggPSBjaGFyc1swXSB8fCBcIlwiO1xuICBjb25zdCBzZkxhYmVsID0gY2hhcnMuc2xpY2UoMSkuam9pbihcIlwiKS50cmltKCk7XG4gIGlmICghc2ZHbHlwaCB8fCAhc2ZMYWJlbCkgcmV0dXJuIG51bGw7XG5cbiAgcmV0dXJuIHtcbiAgICBzZk5hbWU6IHNmTGFiZWwsXG4gICAgc2ZHbHlwaCxcbiAgICBzZkNhdGVnb3JpZXM6IFtdLFxuICAgIHNmU2VhcmNoVGVybXM6IFtdLFxuICAgIG1hdGVyaWFsTmFtZSxcbiAgICBtYXRlcmlhbENhdGVnb3JpZXM6IFtdLFxuICAgIG1hdGVyaWFsVGFnczogW10sXG4gIH07XG59XG5cbmZ1bmN0aW9uIHNlcmlhbGl6ZVBhaXIoXG4gIHZhcmlhYmxlOiBWYXJpYWJsZSxcbiAgc2ZNb2RlSWRzOiBzdHJpbmdbXSxcbiAgbWF0ZXJpYWxNb2RlSWRzOiBzdHJpbmdbXVxuKTogVmFyaWFibGVQYWlyIHtcbiAgY29uc3QgdmFsdWVzID0gdmFyaWFibGUudmFsdWVzQnlNb2RlID8/IHt9O1xuICBjb25zdCBzZk1vZGVJZCA9IHNmTW9kZUlkc1swXTtcbiAgY29uc3QgbWF0ZXJpYWxNb2RlSWQgPSBtYXRlcmlhbE1vZGVJZHNbMF07XG4gIGNvbnN0IHNmVmFsdWUgPVxuICAgIHNmTW9kZUlkICYmIHR5cGVvZiB2YWx1ZXNbc2ZNb2RlSWRdID09PSBcInN0cmluZ1wiXG4gICAgICA/ICh2YWx1ZXNbc2ZNb2RlSWRdIGFzIHN0cmluZylcbiAgICAgIDogbnVsbDtcbiAgY29uc3QgbWF0ZXJpYWxWYWx1ZSA9XG4gICAgbWF0ZXJpYWxNb2RlSWQgJiYgdHlwZW9mIHZhbHVlc1ttYXRlcmlhbE1vZGVJZF0gPT09IFwic3RyaW5nXCJcbiAgICAgID8gKHZhbHVlc1ttYXRlcmlhbE1vZGVJZF0gYXMgc3RyaW5nKVxuICAgICAgOiBudWxsO1xuICBjb25zdCBkZXNjcmlwdGlvbiA9IHZhcmlhYmxlLmRlc2NyaXB0aW9uID8/IFwiXCI7XG4gIGNvbnN0IGRlc2NyaXB0aW9uRmllbGRzID1cbiAgICBwYXJzZVBhaXJGcm9tVmFyaWFibGVOYW1lKHZhcmlhYmxlLm5hbWUgfHwgXCJcIikgfHxcbiAgICBwYXJzZVBhaXJEZXNjcmlwdGlvbihkZXNjcmlwdGlvbikgfHxcbiAgICBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgaWQ6IHZhcmlhYmxlLmlkLFxuICAgIG5hbWU6IHZhcmlhYmxlLm5hbWUsXG4gICAgY29sbGVjdGlvbklkOiB2YXJpYWJsZS52YXJpYWJsZUNvbGxlY3Rpb25JZCxcbiAgICBncm91cElkOiByZWFkVmFyaWFibGVHcm91cElkKHZhcmlhYmxlKSxcbiAgICBkZXNjcmlwdGlvbixcbiAgICBkZXNjcmlwdGlvbkZpZWxkcyxcbiAgICBzZlZhbHVlLFxuICAgIG1hdGVyaWFsVmFsdWUsXG4gIH07XG59XG5cbnR5cGUgUGx1Z2luRGF0YVBhaXIgPSB7XG4gIGlkOiBzdHJpbmc7XG4gIHNmOiBzdHJpbmc7XG4gIG1hdDogc3RyaW5nO1xuICBjOiBudW1iZXI7IC8vIGNyZWF0ZWRcbiAgdTogbnVtYmVyOyAvLyB1cGRhdGVkXG59O1xuXG5cbmZ1bmN0aW9uIHJlYWRTdG9yZWRQYWlycygpOiBNYXA8c3RyaW5nLCBQbHVnaW5EYXRhUGFpcj4ge1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IGZpZ21hLnJvb3QuZ2V0UGx1Z2luRGF0YShQTFVHSU5fREFUQV9LRVkpO1xuICAgIGlmICghcmF3KSByZXR1cm4gbmV3IE1hcCgpO1xuICAgIGNvbnN0IHBhcnNlZCA9IEpTT04ucGFyc2UocmF3KTtcbiAgICBpZiAoIXBhcnNlZCB8fCAhQXJyYXkuaXNBcnJheShwYXJzZWQucCkpIHJldHVybiBuZXcgTWFwKCk7XG4gICAgY29uc3QgbWFwID0gbmV3IE1hcDxzdHJpbmcsIFBsdWdpbkRhdGFQYWlyPigpO1xuICAgIGZvciAoY29uc3QgZW50cnkgb2YgcGFyc2VkLnApIHtcbiAgICAgIGlmIChcbiAgICAgICAgQXJyYXkuaXNBcnJheShlbnRyeSkgJiZcbiAgICAgICAgdHlwZW9mIGVudHJ5WzBdID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgIHR5cGVvZiBlbnRyeVsxXSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICB0eXBlb2YgZW50cnlbMl0gPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgdHlwZW9mIGVudHJ5WzNdID09PSBcIm51bWJlclwiICYmXG4gICAgICAgIHR5cGVvZiBlbnRyeVs0XSA9PT0gXCJudW1iZXJcIlxuICAgICAgKSB7XG4gICAgICAgIG1hcC5zZXQoZW50cnlbMF0sIHtcbiAgICAgICAgICBpZDogZW50cnlbMF0sXG4gICAgICAgICAgc2Y6IGVudHJ5WzFdLFxuICAgICAgICAgIG1hdDogZW50cnlbMl0sXG4gICAgICAgICAgYzogZW50cnlbM10sXG4gICAgICAgICAgdTogZW50cnlbNF0sXG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gbWFwO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcGFyc2UgcGx1Z2luRGF0YSBwYWlyc1wiLCBlcnIpO1xuICAgIHJldHVybiBuZXcgTWFwKCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gY29tcGFjdFZhbHVlKHZhbHVlc0J5TW9kZTogVmFyaWFibGVbXCJ2YWx1ZXNCeU1vZGVcIl0pOiBzdHJpbmcge1xuICBpZiAoIXZhbHVlc0J5TW9kZSB8fCB0eXBlb2YgdmFsdWVzQnlNb2RlICE9PSBcIm9iamVjdFwiKSByZXR1cm4gXCJcIjtcbiAgZm9yIChjb25zdCB2YWx1ZSBvZiBPYmplY3QudmFsdWVzKHZhbHVlc0J5TW9kZSkpIHtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiICYmIHZhbHVlKSByZXR1cm4gdmFsdWU7XG4gIH1cbiAgcmV0dXJuIFwiXCI7XG59XG5cblxuZnVuY3Rpb24gcGVyc2lzdFBhaXJzVG9QbHVnaW5EYXRhKHBhaXJzOiBQbHVnaW5EYXRhUGFpcltdLCByZWFzb246IHN0cmluZykge1xuICBjb25zdCBwYXlsb2FkID0ge1xuICAgIHY6IDEsXG4gICAgcDogcGFpcnMubWFwKChwKSA9PiBbcC5pZCwgcC5zZiwgcC5tYXQsIHAuYywgcC51XSksXG4gIH07XG4gIHRyeSB7XG4gICAgZmlnbWEucm9vdC5zZXRQbHVnaW5EYXRhKFBMVUdJTl9EQVRBX0tFWSwgSlNPTi5zdHJpbmdpZnkocGF5bG9hZCkpO1xuICAgIGxvZyhcInBsdWdpbkRhdGEgdXBkYXRlZFwiLCB7XG4gICAgICByZWFzb24sXG4gICAgICBjb3VudDogcGFpcnMubGVuZ3RoLFxuICAgICAgcGF5bG9hZCxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKFwiVW5hYmxlIHRvIHN0b3JlIHBsdWdpbkRhdGEgcGFpcnNcIiwgZXJyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBwYXJzZVNvdXJjZU1vZGVTZXR0aW5ncyhyYXc6IHN0cmluZyk6IFNvdXJjZU1vZGVTZXR0aW5ncyB8IG51bGwge1xuICB0cnkge1xuICAgIGlmICghcmF3KSByZXR1cm4gbnVsbDtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgaWYgKCFwYXJzZWQgfHwgdHlwZW9mIHBhcnNlZCAhPT0gXCJvYmplY3RcIikgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgY29sbGVjdGlvbklkID1cbiAgICAgIHR5cGVvZiAocGFyc2VkIGFzIGFueSkuY29sbGVjdGlvbklkID09PSBcInN0cmluZ1wiXG4gICAgICAgID8gKHBhcnNlZCBhcyBhbnkpLmNvbGxlY3Rpb25JZFxuICAgICAgICA6IG51bGw7XG4gICAgY29uc3Qgc2ZNb2RlSWRzID0gQXJyYXkuaXNBcnJheSgocGFyc2VkIGFzIGFueSkuc2ZNb2RlSWRzKVxuICAgICAgPyAocGFyc2VkIGFzIGFueSkuc2ZNb2RlSWRzLmZpbHRlcigodmFsdWU6IGFueSkgPT4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKVxuICAgICAgOiBbXTtcbiAgICBjb25zdCBtYXRlcmlhbE1vZGVJZHMgPSBBcnJheS5pc0FycmF5KChwYXJzZWQgYXMgYW55KS5tYXRlcmlhbE1vZGVJZHMpXG4gICAgICA/IChwYXJzZWQgYXMgYW55KS5tYXRlcmlhbE1vZGVJZHMuZmlsdGVyKCh2YWx1ZTogYW55KSA9PiB0eXBlb2YgdmFsdWUgPT09IFwic3RyaW5nXCIpXG4gICAgICA6IFtdO1xuICAgIHJldHVybiB7IGNvbGxlY3Rpb25JZCwgc2ZNb2RlSWRzLCBtYXRlcmlhbE1vZGVJZHMgfTtcbiAgfSBjYXRjaCB7XG4gICAgcmV0dXJuIG51bGw7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VVc2VyR3JvdXBTZWxlY3Rpb25zKHJhdzogdW5rbm93bik6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bGw+IHtcbiAgaWYgKCFyYXcgfHwgdHlwZW9mIHJhdyAhPT0gXCJvYmplY3RcIikgcmV0dXJuIHt9O1xuICBjb25zdCBzb3VyY2UgPSByYXcgYXMgUmVjb3JkPHN0cmluZywgdW5rbm93bj47XG4gIGNvbnN0IG91dDogUmVjb3JkPHN0cmluZywgc3RyaW5nIHwgbnVsbD4gPSB7fTtcbiAgZm9yIChjb25zdCBbY29sbGVjdGlvbklkLCB2YWx1ZV0gb2YgT2JqZWN0LmVudHJpZXMoc291cmNlKSkge1xuICAgIGlmICghY29sbGVjdGlvbklkKSBjb250aW51ZTtcbiAgICBpZiAodHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKSBvdXRbY29sbGVjdGlvbklkXSA9IHZhbHVlO1xuICAgIGVsc2UgaWYgKHZhbHVlID09PSBudWxsKSBvdXRbY29sbGVjdGlvbklkXSA9IG51bGw7XG4gIH1cbiAgcmV0dXJuIG91dDtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHNuYXBzaG90UGFpcnNQbHVnaW5EYXRhKCkge1xuICBjb25zdCBzdG9yZWQgPSByZWFkU3RvcmVkUGFpcnMoKTtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgdmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoXCJTVFJJTkdcIik7XG4gIGNvbnN0IHBhaXJzOiBQbHVnaW5EYXRhUGFpcltdID0gdmFyaWFibGVzLm1hcCgodmFyaWFibGUpID0+IHtcbiAgICBjb25zdCBwYXJzZWQgPVxuICAgICAgcGFyc2VQYWlyRnJvbVZhcmlhYmxlTmFtZSh2YXJpYWJsZS5uYW1lIHx8IFwiXCIpIHx8XG4gICAgICBwYXJzZVBhaXJEZXNjcmlwdGlvbih2YXJpYWJsZS5kZXNjcmlwdGlvbiA/PyBcIlwiKSB8fFxuICAgICAgbnVsbDtcbiAgICBjb25zdCBzZk5hbWUgPSBwYXJzZWQ/LnNmTmFtZSB8fCB2YXJpYWJsZS5uYW1lIHx8IFwiXCI7XG4gICAgY29uc3QgbWF0TmFtZSA9IHBhcnNlZD8ubWF0ZXJpYWxOYW1lIHx8IGNvbXBhY3RWYWx1ZSh2YXJpYWJsZS52YWx1ZXNCeU1vZGUpIHx8IFwiXCI7XG4gICAgY29uc3QgcHJldiA9IHN0b3JlZC5nZXQodmFyaWFibGUuaWQpO1xuICAgIHJldHVybiB7XG4gICAgICBpZDogdmFyaWFibGUuaWQsXG4gICAgICBzZjogc2ZOYW1lLFxuICAgICAgbWF0OiBtYXROYW1lLFxuICAgICAgYzogcHJldj8uYyA/PyBub3csXG4gICAgICB1OiBub3csXG4gICAgfTtcbiAgfSk7XG4gIHBlcnNpc3RQYWlyc1RvUGx1Z2luRGF0YShwYWlycywgXCJzbmFwc2hvdFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdXBzZXJ0UGFpclBsdWdpbkRhdGEodmFyaWFibGU6IFZhcmlhYmxlKSB7XG4gIGNvbnN0IHN0b3JlZCA9IHJlYWRTdG9yZWRQYWlycygpO1xuICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xuICBjb25zdCBwYXJzZWQgPVxuICAgIHBhcnNlUGFpckZyb21WYXJpYWJsZU5hbWUodmFyaWFibGUubmFtZSB8fCBcIlwiKSB8fFxuICAgIHBhcnNlUGFpckRlc2NyaXB0aW9uKHZhcmlhYmxlLmRlc2NyaXB0aW9uID8/IFwiXCIpIHx8XG4gICAgbnVsbDtcbiAgY29uc3Qgc2ZOYW1lID0gcGFyc2VkPy5zZk5hbWUgfHwgdmFyaWFibGUubmFtZSB8fCBcIlwiO1xuICBjb25zdCBtYXROYW1lID0gcGFyc2VkPy5tYXRlcmlhbE5hbWUgfHwgY29tcGFjdFZhbHVlKHZhcmlhYmxlLnZhbHVlc0J5TW9kZSkgfHwgXCJcIjtcbiAgY29uc3QgcHJldiA9IHN0b3JlZC5nZXQodmFyaWFibGUuaWQpO1xuICBzdG9yZWQuc2V0KHZhcmlhYmxlLmlkLCB7XG4gICAgaWQ6IHZhcmlhYmxlLmlkLFxuICAgIHNmOiBzZk5hbWUsXG4gICAgbWF0OiBtYXROYW1lLFxuICAgIGM6IHByZXY/LmMgPz8gbm93LFxuICAgIHU6IG5vdyxcbiAgfSk7XG4gIHBlcnNpc3RQYWlyc1RvUGx1Z2luRGF0YShBcnJheS5mcm9tKHN0b3JlZC52YWx1ZXMoKSksIFwidXBzZXJ0XCIpO1xufVxuXG5hc3luYyBmdW5jdGlvbiByZW1vdmVQYWlyUGx1Z2luRGF0YSh2YXJpYWJsZTogVmFyaWFibGUpIHtcbiAgY29uc3Qgc3RvcmVkID0gcmVhZFN0b3JlZFBhaXJzKCk7XG4gIHN0b3JlZC5kZWxldGUodmFyaWFibGUuaWQpO1xuICBwZXJzaXN0UGFpcnNUb1BsdWdpbkRhdGEoQXJyYXkuZnJvbShzdG9yZWQudmFsdWVzKCkpLCBcInJlbW92ZVwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZW5zdXJlQ29sbGVjdGlvbihjb2xsZWN0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8VmFyaWFibGVDb2xsZWN0aW9uPiB7XG4gIGNvbnN0IGNvbGxlY3Rpb24gPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0VmFyaWFibGVDb2xsZWN0aW9uQnlJZEFzeW5jKFxuICAgIGNvbGxlY3Rpb25JZFxuICApO1xuICBpZiAoIWNvbGxlY3Rpb24pIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJDb2xsZWN0aW9uIG5vdCBmb3VuZC5cIik7XG4gIH1cbiAgcmV0dXJuIGNvbGxlY3Rpb247XG59XG5cbi8vIC0tLS0tLS0tLS0gTWVzc2FnZSBoYW5kbGVyc1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFwicGluZ1wiLCAoKSA9PiB7XG4gIGxvZyhcInBpbmdcIik7XG4gIHJldHVybiBcInBvbmdcIjtcbn0pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFwiZ2V0RW52aXJvbm1lbnRcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBpc0Rldk1vZGUgPSBpc0RldlJ1bnRpbWUoKTtcbiAgY29uc3QgbG9jYWxDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICBjb25zdCBpc1NvdXJjZUZpbGUgPSBsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCA+IDA7XG4gIGNvbnN0IGNhbldyaXRlID0gcmVzb2x2ZUNhbldyaXRlKGxvY2FsQ29sbGVjdGlvbnMubGVuZ3RoKTtcbiAgaWYgKGlzRGV2TW9kZSB8fCAhY2FuV3JpdGUpIHtcbiAgICBhd2FpdCBsb2dSZWFkT25seVN0YXJ0dXBTZWxlY3Rpb24oKTtcbiAgfVxuICBsb2coXCJnZXRFbnZpcm9ubWVudFwiLCB7XG4gICAgZWRpdG9yVHlwZTogZmlnbWEuZWRpdG9yVHlwZSxcbiAgICBpc0Rldk1vZGUsXG4gICAgY2FuV3JpdGUsXG4gICAgaXNTb3VyY2VGaWxlLFxuICB9KTtcbiAgcmV0dXJuIHsgaXNEZXZNb2RlLCBjYW5Xcml0ZSwgaXNTb3VyY2VGaWxlIH07XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcImdldExpYnJhcnlDb2xsZWN0aW9uc1wiLCBhc3luYyAoKSA9PiB7XG4gIGxvZyhcImdldExpYnJhcnlDb2xsZWN0aW9uc1wiKTtcbiAgcmV0dXJuIGxpc3RMaWJyYXJ5Q29sbGVjdGlvbnMoKTtcbn0pO1xuXG5mdW5jdGlvbiBleHRyYWN0SWRzKGJpbmRpbmc6IGFueSk6IHN0cmluZ1tdIHtcbiAgbG9nKFwiZXh0cmFjdElkczpyYXdcIiwgYmluZGluZyk7XG4gIGlmICghYmluZGluZykgcmV0dXJuIFtdO1xuICBpZiAodHlwZW9mIGJpbmRpbmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICBpZiAoYmluZGluZy5zdGFydHNXaXRoKFwiVmFyaWFibGVJRDpcIikgfHwgYmluZGluZy5zdGFydHNXaXRoKFwiVmFyaWFibGVDb2xsZWN0aW9uSWQ6XCIpKSB7XG4gICAgICByZXR1cm4gW2JpbmRpbmddO1xuICAgIH1cbiAgICBsb2coXCJleHRyYWN0SWRzOnN0cmluZ19pZ25vcmVkXCIsIGJpbmRpbmcpO1xuICAgIHJldHVybiBbXTtcbiAgfVxuICBpZiAoQXJyYXkuaXNBcnJheShiaW5kaW5nKSkge1xuICAgIGNvbnN0IHJlc3VsdHMgPSBiaW5kaW5nLmZsYXRNYXAoKGl0ZW0pID0+IGV4dHJhY3RJZHMoaXRlbSkpO1xuICAgIGxvZyhcImV4dHJhY3RJZHM6YXJyYXlcIiwgcmVzdWx0cyk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG4gIH1cbiAgaWYgKHR5cGVvZiBiaW5kaW5nID09PSBcIm9iamVjdFwiICYmIGJpbmRpbmcgIT09IG51bGwpIHtcbiAgICBpZiAodHlwZW9mIGJpbmRpbmcuaWQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGxvZyhcImV4dHJhY3RJZHM6b2JqZWN0LmlkXCIsIGJpbmRpbmcuaWQpO1xuICAgICAgcmV0dXJuIFtiaW5kaW5nLmlkXTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiAoYmluZGluZyBhcyBhbnkpLnZhcmlhYmxlSWQgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIGxvZyhcImV4dHJhY3RJZHM6b2JqZWN0LnZhcmlhYmxlSWRcIiwgKGJpbmRpbmcgYXMgYW55KS52YXJpYWJsZUlkKTtcbiAgICAgIHJldHVybiBbKGJpbmRpbmcgYXMgYW55KS52YXJpYWJsZUlkXTtcbiAgICB9XG4gICAgaWYgKHR5cGVvZiAoYmluZGluZyBhcyBhbnkpLnZhbHVlID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBsb2coXCJleHRyYWN0SWRzOm9iamVjdC52YWx1ZVwiLCAoYmluZGluZyBhcyBhbnkpLnZhbHVlKTtcbiAgICAgIHJldHVybiBbKGJpbmRpbmcgYXMgYW55KS52YWx1ZV07XG4gICAgfVxuICAgIGxvZyhcImV4dHJhY3RJZHM6b2JqZWN0LnVuaGFuZGxlZEtleXNcIiwgT2JqZWN0LmtleXMoYmluZGluZykpO1xuICB9XG4gIHJldHVybiBbXTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVzb2x2ZVNlbGVjdGlvblBhaXJJZHMoaWRzOiBTZXQ8c3RyaW5nPik6IFByb21pc2U8c3RyaW5nW10+IHtcbiAgY29uc3Qgb3V0ID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGZvciAoY29uc3QgaWQgb2YgaWRzKSB7XG4gICAgb3V0LmFkZChpZCk7XG4gICAgaWYgKCFpZC5zdGFydHNXaXRoKFwiVmFyaWFibGVJRDpcIikpIGNvbnRpbnVlO1xuICAgIHRyeSB7XG4gICAgICBjb25zdCB2YXJpYWJsZSA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRWYXJpYWJsZUJ5SWRBc3luYyhpZCk7XG4gICAgICBjb25zdCBrZXkgPSAodmFyaWFibGUgYXMgYW55KT8ua2V5O1xuICAgICAgaWYgKHR5cGVvZiBrZXkgPT09IFwic3RyaW5nXCIgJiYga2V5KSB7XG4gICAgICAgIG91dC5hZGQoYExpYnJhcnlWYXJpYWJsZToke2tleX1gKTtcbiAgICAgIH1cbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIlVuYWJsZSB0byByZXNvbHZlIHZhcmlhYmxlIGtleSBmcm9tIHNlbGVjdGlvbiBpZFwiLCBpZCwgZXJyKTtcbiAgICB9XG4gIH1cbiAgcmV0dXJuIEFycmF5LmZyb20ob3V0KTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gY29sbGVjdFNlbGVjdGlvbkluZm8oKTogUHJvbWlzZTx7IHBhaXJJZHM6IHN0cmluZ1tdOyBzZWxlY3Rpb25Db3VudDogbnVtYmVyIH0+IHtcbiAgY29uc3QgaWRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG5cbiAgY29uc3QgdmlzaXQgPSAobm9kZTogU2NlbmVOb2RlKSA9PiB7XG4gICAgbG9nKFwidmlzaXQ6bm9kZVwiLCB7IHR5cGU6IG5vZGUudHlwZSwgbmFtZTogKG5vZGUgYXMgYW55KS5uYW1lIH0pO1xuICAgIGlmIChcImNoaWxkcmVuXCIgaW4gbm9kZSkge1xuICAgICAgZm9yIChjb25zdCBjaGlsZCBvZiBub2RlLmNoaWxkcmVuKSB7XG4gICAgICAgIHZpc2l0KGNoaWxkKTtcbiAgICAgIH1cbiAgICB9XG5cbiAgICBpZiAobm9kZS50eXBlID09PSBcIlRFWFRcIikge1xuICAgICAgY29uc3QgYm91bmQgPSAobm9kZSBhcyBhbnkpLmJvdW5kVmFyaWFibGVzO1xuICAgICAgbG9nKFwidGV4dFwiLCBub2RlKTtcbiAgICAgIGxvZyhcInRleHQ6Ym91bmRWYXJpYWJsZXNcIiwgYm91bmQpO1xuICAgICAgY29uc3QgY2hhcmFjdGVycyA9IGJvdW5kPy5jaGFyYWN0ZXJzO1xuICAgICAgY29uc3QgdmFySWRzID0gZXh0cmFjdElkcyhjaGFyYWN0ZXJzKTtcbiAgICAgIGxvZyhcInRleHQ6Y2hhcmFjdGVyc1Zhcklkc1wiLCB2YXJJZHMpO1xuICAgICAgdmFySWRzLmZvckVhY2goKGlkKSA9PiBpZHMuYWRkKGlkKSk7XG4gICAgfVxuXG4gICAgaWYgKFwiY29tcG9uZW50UHJvcGVydGllc1wiIGluIG5vZGUpIHtcbiAgICAgbG9nKFwiaW5zdGFuY2VOb2RlXCIsIG5vZGUpO1xuICAgICAgY29uc3QgcHJvcHMgPVxuICAgICAgICAoKG5vZGUgYXMgYW55KS5jb21wb25lbnRQcm9wZXJ0aWVzIGFzIFJlY29yZDxcbiAgICAgICAgICBzdHJpbmcsXG4gICAgICAgICAgeyB0eXBlPzogc3RyaW5nOyB2YWx1ZT86IGFueSB9XG4gICAgICAgID4pID8/IHt9O1xuICAgICAgY29uc3QgYm91bmRQcm9wcyA9XG4gICAgICAgICgobm9kZSBhcyBhbnkpLmJvdW5kVmFyaWFibGVzPy5jb21wb25lbnRQcm9wZXJ0aWVzIGFzIFJlY29yZDxcbiAgICAgICAgICBzdHJpbmcsXG4gICAgICAgICAgYW55XG4gICAgICAgID4pID8/IHt9O1xuICAgICAgY29uc3QgcHJvcFJlZnMgPVxuICAgICAgICAoKG5vZGUgYXMgYW55KS5jb21wb25lbnRQcm9wZXJ0eVJlZmVyZW5jZXMgYXMgUmVjb3JkPHN0cmluZywgYW55PikgPz9cbiAgICAgICAge307XG5cbiAgICAgIE9iamVjdC5lbnRyaWVzKHByb3BzKS5mb3JFYWNoKChbcHJvcE5hbWUsIHByb3BdKSA9PiB7XG4gICAgICAgIGNvbnN0IGJvdW5kID0gYm91bmRQcm9wc1twcm9wTmFtZV07XG4gICAgICAgIGNvbnN0IHJlZiA9IHByb3BSZWZzW3Byb3BOYW1lXTtcbiAgICAgICAgY29uc3QgaW5saW5lQm91bmQgPVxuICAgICAgICAgIChwcm9wIGFzIGFueSk/LmJvdW5kVmFyaWFibGVzPy52YWx1ZSA/P1xuICAgICAgICAgIChwcm9wIGFzIGFueSk/LmJvdW5kVmFyaWFibGVzID8/XG4gICAgICAgICAgdW5kZWZpbmVkO1xuICAgICAgICBsb2coXCJpbnN0YW5jZTpjb21wb25lbnRQcm9wZXJ0eVwiLCB7XG4gICAgICAgICAgbm9kZTogKG5vZGUgYXMgYW55KS5uYW1lLFxuICAgICAgICAgIG5hbWU6IHByb3BOYW1lLFxuICAgICAgICAgIHR5cGU6IHByb3A/LnR5cGUsXG4gICAgICAgICAgdmFsdWU6IHByb3A/LnZhbHVlLFxuICAgICAgICAgIGJvdW5kLFxuICAgICAgICAgIHJlZixcbiAgICAgICAgICBpbmxpbmVCb3VuZCxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgaXNUZXh0UHJvcCA9XG4gICAgICAgICAgcHJvcD8udHlwZSA9PT0gXCJURVhUXCIgfHwgcHJvcD8udHlwZSA9PT0gXCJTVFJJTkdcIiB8fCBwcm9wPy50eXBlID09PSBcIlRFWFRfTElURVJBTFwiO1xuXG4gICAgICAgIGlmIChpc1RleHRQcm9wKSB7XG4gICAgICAgICAgY29uc3QgZnJvbUJvdW5kID0gZXh0cmFjdElkcyhib3VuZCk7XG4gICAgICAgICAgY29uc3QgZnJvbVZhbHVlID0gZXh0cmFjdElkcyhwcm9wPy52YWx1ZSk7XG4gICAgICAgICAgY29uc3QgZnJvbVJlZiA9IGV4dHJhY3RJZHMocmVmKTtcbiAgICAgICAgICBjb25zdCBmcm9tSW5saW5lID0gZXh0cmFjdElkcyhpbmxpbmVCb3VuZCk7XG4gICAgICAgICAgY29uc3QgYWxsID0gWy4uLmZyb21Cb3VuZCwgLi4uZnJvbVZhbHVlLCAuLi5mcm9tUmVmLCAuLi5mcm9tSW5saW5lXTtcbiAgICAgICAgICBsb2coXCJpbnN0YW5jZTpjb21wb25lbnRQcm9wZXJ0eVZhcklkc1wiLCB7XG4gICAgICAgICAgICBuYW1lOiBwcm9wTmFtZSxcbiAgICAgICAgICAgIGlkczogYWxsLFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIGFsbC5mb3JFYWNoKChpZCkgPT4gaWRzLmFkZChpZCkpO1xuICAgICAgICB9XG4gICAgICB9KTtcbiAgICB9XG4gIH07XG5cbiAgZm9yIChjb25zdCBub2RlIG9mIGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbikge1xuICAgIHZpc2l0KG5vZGUpO1xuICB9XG5cbiAgY29uc3QgcGFpcklkcyA9IGF3YWl0IHJlc29sdmVTZWxlY3Rpb25QYWlySWRzKGlkcyk7XG4gIHJldHVybiB7IHBhaXJJZHMsIHNlbGVjdGlvbkNvdW50OiBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24ubGVuZ3RoIH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIG5vdGlmeVNlbGVjdGlvblBhaXJzKCkge1xuICBjb25zdCBpbmZvID0gYXdhaXQgY29sbGVjdFNlbGVjdGlvbkluZm8oKTtcbiAgbG9nKFxuICAgIFwic2VsZWN0aW9uY2hhbmdlXCIsXG4gICAgYG5vZGVzPSR7aW5mby5zZWxlY3Rpb25Db3VudH1gLFxuICAgIGBwYWlySWRzPSR7aW5mby5wYWlySWRzLmpvaW4oXCIsXCIpIHx8IFwibm9uZVwifWBcbiAgKTtcbiAgdHJ5IHtcbiAgICBmaWdtYS51aS5wb3N0TWVzc2FnZSh7IHR5cGU6IFwic2VsZWN0aW9uUGFpcnNcIiwgLi4uaW5mbyB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHBvc3Qgc2VsZWN0aW9uIHBhaXJzXCIsIGVycik7XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHN0YXJ0U2VsZWN0aW9uV2F0Y2hlcigpIHtcbiAgZmlnbWEub24oXCJzZWxlY3Rpb25jaGFuZ2VcIiwgKCkgPT4ge1xuICAgIHZvaWQgbm90aWZ5U2VsZWN0aW9uUGFpcnMoKTtcbiAgfSk7XG4gIHZvaWQgbm90aWZ5U2VsZWN0aW9uUGFpcnMoKTtcbn1cblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcImdldFNlbGVjdGlvblBhaXJzXCIsIGFzeW5jICgpID0+IHtcbiAgcmV0dXJuIGF3YWl0IGNvbGxlY3RTZWxlY3Rpb25JbmZvKCk7XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcImNsZWFyU2VsZWN0aW9uXCIsIGFzeW5jICgpID0+IHtcbiAgZmlnbWEuY3VycmVudFBhZ2Uuc2VsZWN0aW9uID0gW107XG4gIGF3YWl0IG5vdGlmeVNlbGVjdGlvblBhaXJzKCk7XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcIm5vdGlmeVwiLCBhc3luYyAobWVzc2FnZTogc3RyaW5nKSA9PiB7XG4gIGxvZyhcIm5vdGlmeVwiLCBtZXNzYWdlKTtcbiAgdHJ5IHtcbiAgICBmaWdtYS5ub3RpZnkobWVzc2FnZSwgeyB0aW1lb3V0OiAyMDAwIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gbm90aWZ5XCIsIGVycik7XG4gIH1cbn0pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFwiZ2V0Q29sbGVjdGlvbnNcIiwgYXN5bmMgKCkgPT4ge1xuICBsb2coXCJnZXRDb2xsZWN0aW9uc1wiKTtcbiAgcmV0dXJuIGxpc3RDb2xsZWN0aW9ucygpO1xufSk7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXCJsb2FkU291cmNlTW9kZVNldHRpbmdzXCIsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgbG9jYWxDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICBpZiAoIWhhc0xvY2FsU291cmNlQ29sbGVjdGlvbnMobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHBhcnNlU291cmNlTW9kZVNldHRpbmdzKFxuICAgIGZpZ21hLnJvb3QuZ2V0UGx1Z2luRGF0YShTT1VSQ0VfTU9ERV9TRVRUSU5HU19QTFVHSU5fREFUQV9LRVkpXG4gICk7XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcbiAgXCJzYXZlU291cmNlTW9kZVNldHRpbmdzXCIsXG4gIGFzeW5jIChzZXR0aW5nczogU291cmNlTW9kZVNldHRpbmdzKSA9PiB7XG4gICAgY29uc3QgbG9jYWxDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICAgIGlmICghaGFzTG9jYWxTb3VyY2VDb2xsZWN0aW9ucyhsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCkpIHJldHVybjtcbiAgICBjb25zdCBwYXlsb2FkOiBTb3VyY2VNb2RlU2V0dGluZ3MgPSB7XG4gICAgICBjb2xsZWN0aW9uSWQ6IHNldHRpbmdzPy5jb2xsZWN0aW9uSWQgPz8gbnVsbCxcbiAgICAgIHNmTW9kZUlkczogQXJyYXkuaXNBcnJheShzZXR0aW5ncz8uc2ZNb2RlSWRzKVxuICAgICAgICA/IHNldHRpbmdzLnNmTW9kZUlkcy5maWx0ZXIoKGlkKSA9PiB0eXBlb2YgaWQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgIDogW10sXG4gICAgICBtYXRlcmlhbE1vZGVJZHM6IEFycmF5LmlzQXJyYXkoc2V0dGluZ3M/Lm1hdGVyaWFsTW9kZUlkcylcbiAgICAgICAgPyBzZXR0aW5ncy5tYXRlcmlhbE1vZGVJZHMuZmlsdGVyKChpZCkgPT4gdHlwZW9mIGlkID09PSBcInN0cmluZ1wiKVxuICAgICAgICA6IFtdLFxuICAgIH07XG4gICAgZmlnbWEucm9vdC5zZXRQbHVnaW5EYXRhKFxuICAgICAgU09VUkNFX01PREVfU0VUVElOR1NfUExVR0lOX0RBVEFfS0VZLFxuICAgICAgSlNPTi5zdHJpbmdpZnkocGF5bG9hZClcbiAgICApO1xuICB9XG4pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFwibG9hZFVzZXJHcm91cFNlbGVjdGlvbnNcIiwgYXN5bmMgKCkgPT4ge1xuICBjb25zdCBsb2NhbENvbGxlY3Rpb25zID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVDb2xsZWN0aW9uc0FzeW5jKCk7XG4gIGlmICghaGFzTG9jYWxTb3VyY2VDb2xsZWN0aW9ucyhsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCkpIHJldHVybiB7fTtcbiAgY29uc3QgcmF3ID0gYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYyhVU0VSX0dST1VQX1NFTEVDVElPTlNfU1RPUkFHRV9LRVkpO1xuICByZXR1cm4gcGFyc2VVc2VyR3JvdXBTZWxlY3Rpb25zKHJhdyk7XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcbiAgXCJzYXZlVXNlckdyb3VwU2VsZWN0aW9uXCIsXG4gIGFzeW5jIChzZWxlY3Rpb246IFVzZXJHcm91cFNlbGVjdGlvbikgPT4ge1xuICAgIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgICBpZiAoIWhhc0xvY2FsU291cmNlQ29sbGVjdGlvbnMobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSByZXR1cm47XG4gICAgaWYgKCFzZWxlY3Rpb24/LmNvbGxlY3Rpb25JZCkgcmV0dXJuO1xuXG4gICAgY29uc3QgcmF3ID0gYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYyhVU0VSX0dST1VQX1NFTEVDVElPTlNfU1RPUkFHRV9LRVkpO1xuICAgIGNvbnN0IG1hcCA9IHBhcnNlVXNlckdyb3VwU2VsZWN0aW9ucyhyYXcpO1xuICAgIG1hcFtzZWxlY3Rpb24uY29sbGVjdGlvbklkXSA9IHNlbGVjdGlvbi5ncm91cElkID8/IG51bGw7XG4gICAgYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5zZXRBc3luYyhVU0VSX0dST1VQX1NFTEVDVElPTlNfU1RPUkFHRV9LRVksIG1hcCk7XG4gIH1cbik7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXG4gIFwibG9hZFJlYWRPbmx5TGlicmFyeVNlbGVjdGlvblwiLFxuICBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmF3ID0gYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYyhcbiAgICAgIFJFQURPTkxZX0xJQlJBUllfU0VMRUNUSU9OX1NUT1JBR0VfS0VZXG4gICAgKTtcbiAgICBpZiAodHlwZW9mIHJhdyAhPT0gXCJzdHJpbmdcIiB8fCAhcmF3KSByZXR1cm4gbnVsbDtcbiAgICByZXR1cm4gcmF3O1xuICB9XG4pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFxuICBcInNhdmVSZWFkT25seUxpYnJhcnlTZWxlY3Rpb25cIixcbiAgYXN5bmMgKGxpYnJhcnlDb2xsZWN0aW9uS2V5OiBzdHJpbmcgfCBudWxsKSA9PiB7XG4gICAgaWYgKCFsaWJyYXJ5Q29sbGVjdGlvbktleSkge1xuICAgICAgYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5zZXRBc3luYyhcbiAgICAgICAgUkVBRE9OTFlfTElCUkFSWV9TRUxFQ1RJT05fU1RPUkFHRV9LRVksXG4gICAgICAgIFwiXCJcbiAgICAgICk7XG4gICAgICByZXR1cm47XG4gICAgfVxuICAgIGF3YWl0IGZpZ21hLmNsaWVudFN0b3JhZ2Uuc2V0QXN5bmMoXG4gICAgICBSRUFET05MWV9MSUJSQVJZX1NFTEVDVElPTl9TVE9SQUdFX0tFWSxcbiAgICAgIGxpYnJhcnlDb2xsZWN0aW9uS2V5XG4gICAgKTtcbiAgfVxuKTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcbiAgXCJsb2FkUGFpcnNcIixcbiAgYXN5bmMgKHBheWxvYWQ6IExvYWRQYWlyc1JlcXVlc3QpID0+IHtcbiAgICBsb2coXCJsb2FkUGFpcnNcIiwgcGF5bG9hZCk7XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGF3YWl0IGVuc3VyZUNvbGxlY3Rpb24ocGF5bG9hZC5jb2xsZWN0aW9uSWQpO1xuICAgIGVuc3VyZU1vZGVzKGNvbGxlY3Rpb24sIHBheWxvYWQuc2ZNb2RlSWRzLCBwYXlsb2FkLm1hdGVyaWFsTW9kZUlkcyk7XG5cbiAgICBjb25zdCB2YXJpYWJsZXMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZXNBc3luYyhcIlNUUklOR1wiKTtcbiAgICBjb25zdCBmaWx0ZXJlZCA9IHZhcmlhYmxlcy5maWx0ZXIoKHZhcmlhYmxlKSA9PiB7XG4gICAgICBpZiAodmFyaWFibGUudmFyaWFibGVDb2xsZWN0aW9uSWQgIT09IHBheWxvYWQuY29sbGVjdGlvbklkKSByZXR1cm4gZmFsc2U7XG4gICAgICBpZiAocGF5bG9hZC5ncm91cElkKSB7XG4gICAgICAgIHJldHVybiB2YXJpYWJsZU1hdGNoZXNHcm91cEZpbHRlcih2YXJpYWJsZSwgcGF5bG9hZC5ncm91cElkKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiB0cnVlO1xuICAgIH0pO1xuXG4gICAgcmV0dXJuIGZpbHRlcmVkLm1hcCgodmFyaWFibGUpID0+XG4gICAgICBzZXJpYWxpemVQYWlyKHZhcmlhYmxlLCBwYXlsb2FkLnNmTW9kZUlkcywgcGF5bG9hZC5tYXRlcmlhbE1vZGVJZHMpXG4gICAgKTtcbiAgfVxuKTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcbiAgXCJsb2FkTGlicmFyeVBhaXJzXCIsXG4gIGFzeW5jIChwYXlsb2FkOiBMb2FkTGlicmFyeVBhaXJzUmVxdWVzdCkgPT4ge1xuICAgIGNvbnN0IGVmZmVjdGl2ZUxpYnJhcnlDb2xsZWN0aW9uS2V5ID1cbiAgICAgIHBheWxvYWQubGlicmFyeUNvbGxlY3Rpb25LZXkgfHwgbnVsbDtcbiAgICBsb2coXCJsb2FkTGlicmFyeVBhaXJzXCIsIHsgbGlicmFyeUNvbGxlY3Rpb25LZXk6IGVmZmVjdGl2ZUxpYnJhcnlDb2xsZWN0aW9uS2V5IH0pO1xuICAgIGlmICghZWZmZWN0aXZlTGlicmFyeUNvbGxlY3Rpb25LZXkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk1pc3NpbmcgbGlicmFyeSBjb2xsZWN0aW9uIGtleS5cIik7XG4gICAgfVxuICAgIGNvbnN0IHRlYW1MaWJyYXJ5ID0gKGZpZ21hIGFzIGFueSkudGVhbUxpYnJhcnk7XG4gICAgaWYgKCF0ZWFtTGlicmFyeT8uZ2V0VmFyaWFibGVzSW5MaWJyYXJ5Q29sbGVjdGlvbkFzeW5jKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUZWFtIGxpYnJhcnkgQVBJIGlzIG5vdCBhdmFpbGFibGUgaW4gdGhpcyBmaWxlLlwiKTtcbiAgICB9XG4gICAgY29uc3QgZGVzY3JpcHRvcnMgPSBhd2FpdCB0ZWFtTGlicmFyeS5nZXRWYXJpYWJsZXNJbkxpYnJhcnlDb2xsZWN0aW9uQXN5bmMoXG4gICAgICBlZmZlY3RpdmVMaWJyYXJ5Q29sbGVjdGlvbktleVxuICAgICk7XG4gICAgY29uc3Qgc3RyaW5nRGVzY3JpcHRvcnMgPSAoQXJyYXkuaXNBcnJheShkZXNjcmlwdG9ycykgPyBkZXNjcmlwdG9ycyA6IFtdKS5maWx0ZXIoXG4gICAgICAoZGVzY3JpcHRvcjogYW55KSA9PiBkZXNjcmlwdG9yPy5yZXNvbHZlZFR5cGUgPT09IFwiU1RSSU5HXCJcbiAgICApO1xuICAgIGxvZyhcImxvYWRMaWJyYXJ5UGFpcnM6c3RyaW5nRGVzY3JpcHRvckNvdW50XCIsIHN0cmluZ0Rlc2NyaXB0b3JzLmxlbmd0aCk7XG4gICAgbG9nKFxuICAgICAgXCJsb2FkTGlicmFyeVBhaXJzOnN0cmluZ0Rlc2NyaXB0b3JOYW1lc1wiLFxuICAgICAgc3RyaW5nRGVzY3JpcHRvcnMubWFwKChkZXNjcmlwdG9yOiBhbnkpID0+IFN0cmluZygoZGVzY3JpcHRvciBhcyBhbnkpLm5hbWUgPz8gXCJcIikpXG4gICAgKTtcblxuICAgIGNvbnN0IHBhaXJzOiBWYXJpYWJsZVBhaXJbXSA9IFtdO1xuICAgIGZvciAoY29uc3QgZGVzY3JpcHRvciBvZiBzdHJpbmdEZXNjcmlwdG9ycykge1xuICAgICAgY29uc3QgcmF3TmFtZSA9IFN0cmluZygoZGVzY3JpcHRvciBhcyBhbnkpLm5hbWUgPz8gXCJcIik7XG4gICAgICBjb25zdCBmaWVsZHMgPSBwYXJzZVBhaXJGcm9tVmFyaWFibGVOYW1lKHJhd05hbWUpO1xuICAgICAgaWYgKCFmaWVsZHMpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qga2V5ID0gU3RyaW5nKChkZXNjcmlwdG9yIGFzIGFueSkua2V5ID8/IFwiXCIpO1xuICAgICAgcGFpcnMucHVzaCh7XG4gICAgICAgIGlkOiBrZXkgPyBgTGlicmFyeVZhcmlhYmxlOiR7a2V5fWAgOiByYXdOYW1lLFxuICAgICAgICBuYW1lOiByYXdOYW1lLFxuICAgICAgICBjb2xsZWN0aW9uSWQ6IGVmZmVjdGl2ZUxpYnJhcnlDb2xsZWN0aW9uS2V5LFxuICAgICAgICBncm91cElkOiBudWxsLFxuICAgICAgICBkZXNjcmlwdGlvbjogXCJcIixcbiAgICAgICAgZGVzY3JpcHRpb25GaWVsZHM6IGZpZWxkcyxcbiAgICAgICAgc2ZWYWx1ZTogZmllbGRzLnNmR2x5cGggfHwgbnVsbCxcbiAgICAgICAgbWF0ZXJpYWxWYWx1ZTogZmllbGRzLm1hdGVyaWFsTmFtZSB8fCBudWxsLFxuICAgICAgfSk7XG4gICAgfVxuXG4gICAgbG9nKFwibG9hZExpYnJhcnlQYWlyczpwYXJzZWRQYWlyQ291bnRcIiwgcGFpcnMubGVuZ3RoKTtcbiAgICByZXR1cm4gcGFpcnM7XG4gIH1cbik7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXG4gIFwiY3JlYXRlUGFpclwiLFxuICBhc3luYyAocGF5bG9hZDogQ3JlYXRlUGFpclJlcXVlc3QpID0+IHtcbiAgICBsb2coXCJjcmVhdGVQYWlyXCIsIHBheWxvYWQpO1xuICAgIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgICBpZiAoIXJlc29sdmVDYW5Xcml0ZShsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZmlsZSBpcyByZWFkLW9ubHkuIE9wZW4gdGhlIHNvdXJjZSB2YXJpYWJsZSBmaWxlIHRvIGVkaXQgcGFpcnMuXCIpO1xuICAgIH1cbiAgICBjb25zdCBjb2xsZWN0aW9uID0gYXdhaXQgZW5zdXJlQ29sbGVjdGlvbihwYXlsb2FkLmNvbGxlY3Rpb25JZCk7XG4gICAgZW5zdXJlTW9kZXMoY29sbGVjdGlvbiwgcGF5bG9hZC5zZk1vZGVJZHMsIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzKTtcblxuICAgIGNvbnN0IHZhcmlhYmxlID0gZmlnbWEudmFyaWFibGVzLmNyZWF0ZVZhcmlhYmxlKFxuICAgICAgcGF5bG9hZC5ncm91cElkXG4gICAgICAgID8gYCR7cGF5bG9hZC5ncm91cElkfS8ke2J1aWxkVmFyaWFibGVMZWFmKFxuICAgICAgICAgICAgcGF5bG9hZC5zZi5zeW1ib2wsXG4gICAgICAgICAgICBwYXlsb2FkLnNmLm5hbWUsXG4gICAgICAgICAgICBwYXlsb2FkLm1hdGVyaWFsLm5hbWVcbiAgICAgICAgICApfWBcbiAgICAgICAgOiBidWlsZFZhcmlhYmxlTGVhZihwYXlsb2FkLnNmLnN5bWJvbCwgcGF5bG9hZC5zZi5uYW1lLCBwYXlsb2FkLm1hdGVyaWFsLm5hbWUpLFxuICAgICAgY29sbGVjdGlvbixcbiAgICAgIFwiU1RSSU5HXCJcbiAgICApO1xuICAgIGxvZyhcImNyZWF0ZVBhaXIgdmFyaWFibGUgY3JlYXRlZFwiLCB2YXJpYWJsZS5pZCk7XG4gICAgYXBwbHlWYXJpYWJsZUdyb3VwKHZhcmlhYmxlLCBwYXlsb2FkLmdyb3VwSWQgPz8gbnVsbCk7XG4gICAgdmFyaWFibGUuc2NvcGVzID0gW1wiVEVYVF9DT05URU5UXCJdO1xuICAgIHBheWxvYWQuc2ZNb2RlSWRzLmZvckVhY2goKG1vZGVJZCkgPT5cbiAgICAgIHZhcmlhYmxlLnNldFZhbHVlRm9yTW9kZShtb2RlSWQsIHBheWxvYWQuc2Yuc3ltYm9sKVxuICAgICk7XG4gICAgcGF5bG9hZC5tYXRlcmlhbE1vZGVJZHMuZm9yRWFjaCgobW9kZUlkKSA9PlxuICAgICAgdmFyaWFibGUuc2V0VmFsdWVGb3JNb2RlKG1vZGVJZCwgcGF5bG9hZC5tYXRlcmlhbC5uYW1lKVxuICAgICk7XG4gICAgdmFyaWFibGUuZGVzY3JpcHRpb24gPSBidWlsZEtleXdvcmREZXNjcmlwdGlvbihwYXlsb2FkLnNmLCBwYXlsb2FkLm1hdGVyaWFsKTtcblxuICAgIGxvZyhcImNyZWF0ZVBhaXIgdmFyaWFibGUgY29uZmlndXJlZFwiLCB7XG4gICAgICBpZDogdmFyaWFibGUuaWQsXG4gICAgICBuYW1lOiB2YXJpYWJsZS5uYW1lLFxuICAgIH0pO1xuICAgIGF3YWl0IHVwc2VydFBhaXJQbHVnaW5EYXRhKHZhcmlhYmxlKTtcbiAgICByZXR1cm4gc2VyaWFsaXplUGFpcih2YXJpYWJsZSwgcGF5bG9hZC5zZk1vZGVJZHMsIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzKTtcbiAgfVxuKTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcbiAgXCJ1cGRhdGVQYWlyXCIsXG4gIGFzeW5jIChwYXlsb2FkOiBVcGRhdGVQYWlyUmVxdWVzdCkgPT4ge1xuICAgIGxvZyhcInVwZGF0ZVBhaXJcIiwgcGF5bG9hZCk7XG4gICAgY29uc3QgbG9jYWxDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICAgIGlmICghcmVzb2x2ZUNhbldyaXRlKGxvY2FsQ29sbGVjdGlvbnMubGVuZ3RoKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBmaWxlIGlzIHJlYWQtb25seS4gT3BlbiB0aGUgc291cmNlIHZhcmlhYmxlIGZpbGUgdG8gZWRpdCBwYWlycy5cIik7XG4gICAgfVxuICAgIGNvbnN0IHZhcmlhYmxlID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldFZhcmlhYmxlQnlJZEFzeW5jKFxuICAgICAgcGF5bG9hZC52YXJpYWJsZUlkXG4gICAgKTtcbiAgICBpZiAoIXZhcmlhYmxlKSB0aHJvdyBuZXcgRXJyb3IoXCJWYXJpYWJsZSBub3QgZm91bmQuXCIpO1xuICAgIGlmICh2YXJpYWJsZS5yZXNvbHZlZFR5cGUgIT09IFwiU1RSSU5HXCIpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIk9ubHkgU1RSSU5HIHZhcmlhYmxlcyBjYW4gYmUgdXBkYXRlZC5cIik7XG4gICAgfVxuICAgIGlmICh2YXJpYWJsZS52YXJpYWJsZUNvbGxlY3Rpb25JZCAhPT0gcGF5bG9hZC5jb2xsZWN0aW9uSWQpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkNhbm5vdCBtb3ZlIHZhcmlhYmxlIHRvIGEgZGlmZmVyZW50IGNvbGxlY3Rpb24uXCIpO1xuICAgIH1cblxuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBhd2FpdCBlbnN1cmVDb2xsZWN0aW9uKHBheWxvYWQuY29sbGVjdGlvbklkKTtcbiAgICBlbnN1cmVNb2Rlcyhjb2xsZWN0aW9uLCBwYXlsb2FkLnNmTW9kZUlkcywgcGF5bG9hZC5tYXRlcmlhbE1vZGVJZHMpO1xuXG4gICAgY29uc3QgY3VycmVudEdyb3VwSWQgPSByZWFkVmFyaWFibGVHcm91cElkKHZhcmlhYmxlKTtcbiAgICBjb25zdCB0YXJnZXRHcm91cCA9IHBheWxvYWQuZ3JvdXBJZCA/PyBjdXJyZW50R3JvdXBJZCA/PyBudWxsO1xuICAgIGlmICgodGFyZ2V0R3JvdXAgPz8gbnVsbCkgIT09IChjdXJyZW50R3JvdXBJZCA/PyBudWxsKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiR3JvdXAgY2Fubm90IGJlIGNoYW5nZWQgZm9yIGFuIGV4aXN0aW5nIHBhaXIuXCIpO1xuICAgIH1cblxuICAgIC8vIFJlLWFwcGx5IHRvIGVuc3VyZSBwbHVnaW5EYXRhL2Fzc2lnbm1lbnQgaXMgc2V0XG4gICAgYXBwbHlWYXJpYWJsZUdyb3VwKHZhcmlhYmxlLCB0YXJnZXRHcm91cCk7XG5cbiAgICB2YXJpYWJsZS5uYW1lID0gdGFyZ2V0R3JvdXBcbiAgICAgID8gYCR7dGFyZ2V0R3JvdXB9LyR7YnVpbGRWYXJpYWJsZUxlYWYoXG4gICAgICAgICAgcGF5bG9hZC5zZi5zeW1ib2wsXG4gICAgICAgICAgcGF5bG9hZC5zZi5uYW1lLFxuICAgICAgICAgIHBheWxvYWQubWF0ZXJpYWwubmFtZVxuICAgICAgICApfWBcbiAgICAgIDogYnVpbGRWYXJpYWJsZUxlYWYocGF5bG9hZC5zZi5zeW1ib2wsIHBheWxvYWQuc2YubmFtZSwgcGF5bG9hZC5tYXRlcmlhbC5uYW1lKTtcbiAgICBwYXlsb2FkLnNmTW9kZUlkcy5mb3JFYWNoKChtb2RlSWQpID0+XG4gICAgICB2YXJpYWJsZS5zZXRWYWx1ZUZvck1vZGUobW9kZUlkLCBwYXlsb2FkLnNmLnN5bWJvbClcbiAgICApO1xuICAgIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzLmZvckVhY2goKG1vZGVJZCkgPT5cbiAgICAgIHZhcmlhYmxlLnNldFZhbHVlRm9yTW9kZShtb2RlSWQsIHBheWxvYWQubWF0ZXJpYWwubmFtZSlcbiAgICApO1xuICAgIHZhcmlhYmxlLmRlc2NyaXB0aW9uID0gYnVpbGRLZXl3b3JkRGVzY3JpcHRpb24ocGF5bG9hZC5zZiwgcGF5bG9hZC5tYXRlcmlhbCk7XG4gICAgdmFyaWFibGUuc2NvcGVzID0gW1wiVEVYVF9DT05URU5UXCJdO1xuXG4gICAgYXdhaXQgdXBzZXJ0UGFpclBsdWdpbkRhdGEodmFyaWFibGUpO1xuICAgIHJldHVybiBzZXJpYWxpemVQYWlyKHZhcmlhYmxlLCBwYXlsb2FkLnNmTW9kZUlkcywgcGF5bG9hZC5tYXRlcmlhbE1vZGVJZHMpO1xuICB9XG4pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFwiZGVsZXRlUGFpclwiLCBhc3luYyAodmFyaWFibGVJZCkgPT4ge1xuICBsb2coXCJkZWxldGVQYWlyXCIsIHsgdmFyaWFibGVJZCB9KTtcbiAgY29uc3QgbG9jYWxDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICBpZiAoIXJlc29sdmVDYW5Xcml0ZShsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGZpbGUgaXMgcmVhZC1vbmx5LiBPcGVuIHRoZSBzb3VyY2UgdmFyaWFibGUgZmlsZSB0byBlZGl0IHBhaXJzLlwiKTtcbiAgfVxuICBjb25zdCB2YXJpYWJsZSA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRWYXJpYWJsZUJ5SWRBc3luYyh2YXJpYWJsZUlkKTtcbiAgaWYgKCF2YXJpYWJsZSkgcmV0dXJuO1xuICB2YXJpYWJsZS5yZW1vdmUoKTtcbiAgYXdhaXQgcmVtb3ZlUGFpclBsdWdpbkRhdGEodmFyaWFibGUpO1xufSk7XG4iLCJpbXBvcnQgeyBQTFVHSU4sIFVJIH0gZnJvbSBcIkBjb21tb24vbmV0d29ya1NpZGVzXCI7XG5pbXBvcnQge1xuICBpc1NvdXJjZVdyaXRlTW9kZSxcbiAgUExVR0lOX0NIQU5ORUwsXG4gIHNuYXBzaG90UGFpcnNQbHVnaW5EYXRhLFxuICBzdGFydFNlbGVjdGlvbldhdGNoZXIsXG59IGZyb20gXCJAcGx1Z2luL3BsdWdpbi5uZXR3b3JrXCI7XG5pbXBvcnQgeyBOZXR3b3JrZXIgfSBmcm9tIFwibW9ub3JlcG8tbmV0d29ya2VyXCI7XG5cbmFzeW5jIGZ1bmN0aW9uIGJvb3RzdHJhcCgpIHtcbiAgTmV0d29ya2VyLmluaXRpYWxpemUoUExVR0lOLCBQTFVHSU5fQ0hBTk5FTCk7XG5cbiAgZmlnbWEuc2hvd1VJKF9faHRtbF9fLCB7XG4gICAgd2lkdGg6IDMyMCxcbiAgICBoZWlnaHQ6IDY2MCxcbiAgICB0aGVtZUNvbG9yczogdHJ1ZSxcbiAgfSk7XG5cbiAgc3RhcnRTZWxlY3Rpb25XYXRjaGVyKCk7XG4gIGlmIChhd2FpdCBpc1NvdXJjZVdyaXRlTW9kZSgpKSB7XG4gICAgc25hcHNob3RQYWlyc1BsdWdpbkRhdGEoKS5jYXRjaCgoZXJyKSA9PlxuICAgICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHNuYXBzaG90IHBsdWdpbiBkYXRhXCIsIGVycilcbiAgICApO1xuICB9XG5cbiAgY29uc29sZS5sb2coXCJCb290c3RyYXBwZWQgQFwiLCBOZXR3b3JrZXIuZ2V0Q3VycmVudFNpZGUoKS5uYW1lKTtcbn1cblxuYm9vdHN0cmFwKCk7XG4iXSwibmFtZXMiOlsiTmV0d29ya2VyIiwiZyIsInAiLCJfYSIsIl9iIiwiX2MiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxJQUFJLElBQUksT0FBTztB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
