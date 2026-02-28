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
const GROUP_PLUGIN_DATA_KEY = "variableGroupId";
const PLUGIN_DATA_KEY = "ipairs";
const SOURCE_MODE_SETTINGS_PLUGIN_DATA_KEY = "ipairsSourceSettings";
const USER_GROUP_SELECTIONS_STORAGE_KEY = "ipairsUserGroupSelections";
const HARDCODED_LIBRARY_COLLECTION_KEY = "bfa1827c219b14613541995a265ff542ea795e05";
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
  var _a, _b, _c, _d, _e;
  if (readOnlyStartupLogged) return;
  readOnlyStartupLogged = true;
  try {
    const collections = await listLibraryCollections();
    const selectedCollection = (_a = collections.find(
      (collection) => collection.key === HARDCODED_LIBRARY_COLLECTION_KEY
    )) != null ? _a : null;
    log("readOnlyStartupSelection", {
      persistedLibraryCollectionKey: null,
      hardcodedLibraryCollectionKey: HARDCODED_LIBRARY_COLLECTION_KEY,
      matchedCollectionKey: (_b = selectedCollection == null ? void 0 : selectedCollection.key) != null ? _b : null,
      matchedCollectionName: (_c = selectedCollection == null ? void 0 : selectedCollection.name) != null ? _c : null,
      matchedLibraryName: (_d = selectedCollection == null ? void 0 : selectedCollection.libraryName) != null ? _d : null,
      availableLibraryCollectionCount: collections.length
    });
  } catch (err) {
    log("readOnlyStartupSelection:error", String((_e = err == null ? void 0 : err.message) != null ? _e : err));
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
  return effectiveGroupId === groupId;
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
  const canWrite = resolveCanWrite(localCollections.length);
  if (isDevMode || !canWrite) {
    await logReadOnlyStartupSelection();
  }
  log("getEnvironment", { editorType: figma.editorType, isDevMode, canWrite });
  return { isDevMode, canWrite };
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
function collectSelectionInfo() {
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
    figma.ui.postMessage(__spreadValues({ type: "selectionPairs" }, info));
  } catch (err) {
    console.warn("Failed to post selection pairs", err);
  }
}
function startSelectionWatcher() {
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
  if (!resolveCanWrite(localCollections.length)) return null;
  return parseSourceModeSettings(
    figma.root.getPluginData(SOURCE_MODE_SETTINGS_PLUGIN_DATA_KEY)
  );
});
PLUGIN_CHANNEL.registerMessageHandler(
  "saveSourceModeSettings",
  async (settings) => {
    var _a;
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!resolveCanWrite(localCollections.length)) return;
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
  if (!resolveCanWrite(localCollections.length)) return {};
  const raw = await figma.clientStorage.getAsync(USER_GROUP_SELECTIONS_STORAGE_KEY);
  return parseUserGroupSelections(raw);
});
PLUGIN_CHANNEL.registerMessageHandler(
  "saveUserGroupSelection",
  async (selection) => {
    var _a;
    const localCollections = await figma.variables.getLocalVariableCollectionsAsync();
    if (!resolveCanWrite(localCollections.length)) return;
    if (!(selection == null ? void 0 : selection.collectionId)) return;
    const raw = await figma.clientStorage.getAsync(USER_GROUP_SELECTIONS_STORAGE_KEY);
    const map = parseUserGroupSelections(raw);
    map[selection.collectionId] = (_a = selection.groupId) != null ? _a : null;
    await figma.clientStorage.setAsync(USER_GROUP_SELECTIONS_STORAGE_KEY, map);
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
    const effectiveLibraryCollectionKey = HARDCODED_LIBRARY_COLLECTION_KEY;
    log("loadLibraryPairs", {
      requestedLibraryCollectionKey: payload.libraryCollectionKey,
      effectiveLibraryCollectionKey
    });
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGx1Z2luLmpzIiwic291cmNlcyI6WyIuLi9ub2RlX21vZHVsZXMvbW9ub3JlcG8tbmV0d29ya2VyL2Rpc3QvbW9ub3JlcG8tbmV0d29ya2VyLmpzIiwiLi4vc3JjL2NvbW1vbi9uZXR3b3JrU2lkZXMudHMiLCIuLi9zcmMvY29tbW9uL2Rlc2NyaXB0aW9uLnRzIiwiLi4vc3JjL3BsdWdpbi9wbHVnaW4ubmV0d29yay50cyIsIi4uL3NyYy9wbHVnaW4vcGx1Z2luLnRzIl0sInNvdXJjZXNDb250ZW50IjpbInZhciBwID0gT2JqZWN0LmRlZmluZVByb3BlcnR5O1xudmFyIHcgPSAoaSwgZSwgdCkgPT4gZSBpbiBpID8gcChpLCBlLCB7IGVudW1lcmFibGU6ICEwLCBjb25maWd1cmFibGU6ICEwLCB3cml0YWJsZTogITAsIHZhbHVlOiB0IH0pIDogaVtlXSA9IHQ7XG52YXIgdSA9IChpLCBlLCB0KSA9PiAodyhpLCB0eXBlb2YgZSAhPSBcInN5bWJvbFwiID8gZSArIFwiXCIgOiBlLCB0KSwgdCk7XG52YXIgbCA9IChpLCBlLCB0KSA9PiBuZXcgUHJvbWlzZSgociwgcykgPT4ge1xuICB2YXIgYSA9IChuKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGModC5uZXh0KG4pKTtcbiAgICB9IGNhdGNoIChTKSB7XG4gICAgICBzKFMpO1xuICAgIH1cbiAgfSwgbyA9IChuKSA9PiB7XG4gICAgdHJ5IHtcbiAgICAgIGModC50aHJvdyhuKSk7XG4gICAgfSBjYXRjaCAoUykge1xuICAgICAgcyhTKTtcbiAgICB9XG4gIH0sIGMgPSAobikgPT4gbi5kb25lID8gcihuLnZhbHVlKSA6IFByb21pc2UucmVzb2x2ZShuLnZhbHVlKS50aGVuKGEsIG8pO1xuICBjKCh0ID0gdC5hcHBseShpLCBlKSkubmV4dCgpKTtcbn0pO1xuY2xhc3MgeSBleHRlbmRzIEVycm9yIHtcbiAgY29uc3RydWN0b3IoZSkge1xuICAgIHN1cGVyKGUucGF5bG9hZFswXSk7XG4gIH1cbn1cbmZ1bmN0aW9uIGgoKSB7XG4gIGNvbnN0IGkgPSBuZXcgQXJyYXkoMzYpO1xuICBmb3IgKGxldCBlID0gMDsgZSA8IDM2OyBlKyspXG4gICAgaVtlXSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDE2KTtcbiAgcmV0dXJuIGlbMTRdID0gNCwgaVsxOV0gPSBpWzE5XSAmPSAtNSwgaVsxOV0gPSBpWzE5XSB8PSA4LCBpWzhdID0gaVsxM10gPSBpWzE4XSA9IGlbMjNdID0gXCItXCIsIGkubWFwKChlKSA9PiBlLnRvU3RyaW5nKDE2KSkuam9pbihcIlwiKTtcbn1cbmNvbnN0IGcgPSBcIl9fSU5URVJOQUxfU1VDQ0VTU19SRVNQT05TRV9FVkVOVFwiLCBFID0gXCJfX0lOVEVSTkFMX0VSUk9SX1JFU1BPTlNFX0VWRU5UXCI7XG5jbGFzcyBOIHtcbiAgY29uc3RydWN0b3IoZSkge1xuICAgIHUodGhpcywgXCJlbWl0U3RyYXRlZ2llc1wiLCAvKiBAX19QVVJFX18gKi8gbmV3IE1hcCgpKTtcbiAgICB1KHRoaXMsIFwicmVjZWl2ZVN0cmF0ZWdpZXNcIiwgLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKSk7XG4gICAgdGhpcy5zaWRlID0gZTtcbiAgfVxuICAvKipcbiAgICogUmVnaXN0ZXIgc3RyYXRlZ3kgZm9yIGhvdyB0aGlzIHNpZGUgcmVjZWl2ZXMgbWVzc2FnZXMgZnJvbSBnaXZlbiBvdGhlciBzaWRlLlxuICAgKlxuICAgKlxuICAgKiBAcGFyYW0gc2lkZSBUaGUgbmV0d29yayBzaWRlIGZyb20gd2hpY2ggbWVzc2FnZXMgd2lsbCBiZSByZWNlaXZlZC5cbiAgICogQHBhcmFtIHN0cmF0ZWd5IFRoZSBzdHJhdGVneSBmb3IgaGFuZGxpbmcgaW5jb21pbmcgbWVzc2FnZXMgZnJvbSB0aGUgc3BlY2lmaWVkIHNpZGUuXG4gICAqIEByZXR1cm5zIFRoaXMgY2hhbm5lbCwgc28geW91IGNhbiBjaGFpbiBtb3JlIHRoaW5ncyBhcyBuZWVkZWRcbiAgICovXG4gIHJlY2VpdmVzRnJvbShlLCB0KSB7XG4gICAgcmV0dXJuIHRoaXMucmVjZWl2ZVN0cmF0ZWdpZXMuc2V0KGUubmFtZSwgdCksIHRoaXM7XG4gIH1cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIHN0cmF0ZWd5IG9uIGhvdyB0aGlzIHNpZGUgZW1pdHMgbWVzc2FnZSB0byBnaXZlbiBvdGhlciBzaWRlLlxuICAgKlxuICAgKiBAcGFyYW0gdG8gVGhlIHRhcmdldCBuZXR3b3JrIHNpZGUgdG8gd2hpY2ggbWVzc2FnZXMgd2lsbCBiZSBlbWl0dGVkLlxuICAgKiBAcGFyYW0gc3RyYXRlZ3kgU3RyYXRlZ3kgZm9yIGVtaXR0aW5nIGEgbWVzc2FnZS5cbiAgICogQHJldHVybnMgVGhpcyBjaGFubmVsLCBzbyB5b3UgY2FuIGNoYWluIG1vcmUgdGhpbmdzIGFzIG5lZWRlZFxuICAgKi9cbiAgZW1pdHNUbyhlLCB0KSB7XG4gICAgcmV0dXJuIHRoaXMuZW1pdFN0cmF0ZWdpZXMuc2V0KGUubmFtZSwgdCksIHRoaXM7XG4gIH1cbiAgLyoqXG4gICAqIEZpbmFsaXplcyBhbmQgYnVpbGRzIHRoZSBDaGFubmVsLlxuICAgKiBBbmQgc3RhcnRzIGxpc3RlbmluZyB3aXRoIHJlZ2lzdGVyZWQgcmVjZWl2aW5nIHN0cmF0ZWdpZXMuXG4gICAqXG4gICAqIEByZXR1cm5zIFRoZSBjaGFubmVsXG4gICAqL1xuICBzdGFydExpc3RlbmluZygpIHtcbiAgICByZXR1cm4gbmV3IFIoXG4gICAgICB0aGlzLnNpZGUsXG4gICAgICB0aGlzLmVtaXRTdHJhdGVnaWVzLFxuICAgICAgdGhpcy5yZWNlaXZlU3RyYXRlZ2llc1xuICAgICk7XG4gIH1cbn1cbmNsYXNzIFIge1xuICBjb25zdHJ1Y3RvcihlLCB0ID0gLyogQF9fUFVSRV9fICovIG5ldyBNYXAoKSwgciA9IC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCkpIHtcbiAgICB1KHRoaXMsIFwibWVzc2FnZUhhbmRsZXJzXCIsIHt9KTtcbiAgICB1KHRoaXMsIFwic3Vic2NyaXB0aW9uTGlzdGVuZXJzXCIsIHt9KTtcbiAgICB1KHRoaXMsIFwicGVuZGluZ1JlcXVlc3RzXCIsIC8qIEBfX1BVUkVfXyAqLyBuZXcgTWFwKCkpO1xuICAgIHUodGhpcywgXCJjbGVhbnVwQ2FsbGJhY2tzXCIsIFtdKTtcbiAgICB0aGlzLnNpZGUgPSBlLCB0aGlzLmVtaXRTdHJhdGVnaWVzID0gdCwgdGhpcy5yZWNlaXZlU3RyYXRlZ2llcyA9IHIsIHIuZm9yRWFjaCgocykgPT4ge1xuICAgICAgY29uc3QgbyA9IHMoKGMsIG4pID0+IHRoaXMucmVjZWl2ZU5ldHdvcmtNZXNzYWdlKGMsIG4pKTtcbiAgICAgIG8gJiYgdGhpcy5jbGVhbnVwQ2FsbGJhY2tzLnB1c2gobyk7XG4gICAgfSk7XG4gIH1cbiAgLyoqXG4gICAqIFJlZ2lzdGVyIGEgaGFuZGxlciBmb3IgYW4gaW5jb21pbmcgbWVzc2FnZS5cbiAgICogVGhlIGhhbmRsZXIgaXMgcmVzcG9uc2libGUgb2YgbGlzdGVuaW5nIHRvIGluY29taW5nIGV2ZW50cywgYW5kIHBvc3NpYmx5IHJlc3BvbmRpbmcvcmV0dXJuaW5nIGEgdmFsdWUgdG8gdGhlbS5cbiAgICogQHBhcmFtIGV2ZW50TmFtZSBOYW1lIG9mIHRoZSBldmVudCB0byBiZSBsaXN0ZW5lZFxuICAgKiBAcGFyYW0gaGFuZGxlciBIYW5kbGVyIHRoYXQgYWNjZXB0cyBpbmNvbWluZyBtZXNzYWdlIGFuZCBzZW5kZXIsIHRoZW4gY29uc3VtZXMgdGhlbS5cbiAgICovXG4gIHJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoZSwgdCkge1xuICAgIHRoaXMubWVzc2FnZUhhbmRsZXJzW2VdID0gdDtcbiAgfVxuICBnZXRFbWl0U3RyYXRlZ3koZSkge1xuICAgIGNvbnN0IHQgPSB0aGlzLmVtaXRTdHJhdGVnaWVzLmdldChlLm5hbWUpO1xuICAgIGlmICghdCkge1xuICAgICAgY29uc3QgciA9IGQuZ2V0Q3VycmVudFNpZGUoKTtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcbiAgICAgICAgYE5vIGVtaXQgc3RyYXRlZ3kgaXMgcmVnaXN0ZXJlZCBmcm9tICR7ci5uYW1lfSB0byAke2UubmFtZX1gXG4gICAgICApO1xuICAgIH1cbiAgICByZXR1cm4gdDtcbiAgfVxuICByZWNlaXZlTmV0d29ya01lc3NhZ2UoZSwgdCkge1xuICAgIHJldHVybiBsKHRoaXMsIG51bGwsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICBpZiAoZS5ldmVudE5hbWUgPT09IGcpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlU3VjY2Vzc1Jlc3BvbnNlKGUpO1xuICAgICAgICByZXR1cm47XG4gICAgICB9XG4gICAgICBpZiAoZS5ldmVudE5hbWUgPT09IEUpIHtcbiAgICAgICAgdGhpcy5yZWNlaXZlRXJyb3JSZXNwb25zZShlKTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuICAgICAgdGhpcy5pbnZva2VTdWJzY3JpYmVycyhlKSwgdGhpcy5oYW5kbGVJbmNvbWluZ01lc3NhZ2UoZSwgdCk7XG4gICAgfSk7XG4gIH1cbiAgcmVjZWl2ZVN1Y2Nlc3NSZXNwb25zZShlKSB7XG4gICAgcmV0dXJuIGwodGhpcywgbnVsbCwgZnVuY3Rpb24qICgpIHtcbiAgICAgIHZhciByO1xuICAgICAgY29uc3QgeyByZXNvbHZlOiB0IH0gPSAociA9IHRoaXMucGVuZGluZ1JlcXVlc3RzLmdldChlLm1lc3NhZ2VJZCkpICE9IG51bGwgPyByIDoge307XG4gICAgICB0ICYmICh0aGlzLnBlbmRpbmdSZXF1ZXN0cy5kZWxldGUoZS5tZXNzYWdlSWQpLCB0KGUucGF5bG9hZFswXSkpO1xuICAgIH0pO1xuICB9XG4gIHJlY2VpdmVFcnJvclJlc3BvbnNlKGUpIHtcbiAgICByZXR1cm4gbCh0aGlzLCBudWxsLCBmdW5jdGlvbiogKCkge1xuICAgICAgdmFyIHI7XG4gICAgICBjb25zdCB7IHJlamVjdDogdCB9ID0gKHIgPSB0aGlzLnBlbmRpbmdSZXF1ZXN0cy5nZXQoZS5tZXNzYWdlSWQpKSAhPSBudWxsID8gciA6IHt9O1xuICAgICAgdCAmJiAodGhpcy5wZW5kaW5nUmVxdWVzdHMuZGVsZXRlKGUubWVzc2FnZUlkKSwgdChuZXcgeShlKSkpO1xuICAgIH0pO1xuICB9XG4gIGludm9rZVN1YnNjcmliZXJzKGUpIHtcbiAgICByZXR1cm4gbCh0aGlzLCBudWxsLCBmdW5jdGlvbiogKCkge1xuICAgICAgdmFyIHQ7XG4gICAgICBPYmplY3QudmFsdWVzKCh0ID0gdGhpcy5zdWJzY3JpcHRpb25MaXN0ZW5lcnNbZS5ldmVudE5hbWVdKSAhPSBudWxsID8gdCA6IHt9KS5mb3JFYWNoKFxuICAgICAgICAocikgPT4ge1xuICAgICAgICAgIHIoXG4gICAgICAgICAgICAuLi5lLnBheWxvYWQsXG4gICAgICAgICAgICBkLmdldFNpZGUoZS5mcm9tU2lkZSksXG4gICAgICAgICAgICBlXG4gICAgICAgICAgKTtcbiAgICAgICAgfVxuICAgICAgKTtcbiAgICB9KTtcbiAgfVxuICBoYW5kbGVJbmNvbWluZ01lc3NhZ2UoZSwgdCkge1xuICAgIHJldHVybiBsKHRoaXMsIG51bGwsIGZ1bmN0aW9uKiAoKSB7XG4gICAgICBjb25zdCByID0gdGhpcy5tZXNzYWdlSGFuZGxlcnNbZS5ldmVudE5hbWVdO1xuICAgICAgaWYgKHIgIT0gbnVsbCkge1xuICAgICAgICBjb25zdCBzID0gZC5nZXRTaWRlKGUuZnJvbVNpZGUpO1xuICAgICAgICBpZiAoIXMpXG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKFxuICAgICAgICAgICAgYE1lc3NhZ2UgcmVjZWl2ZWQgZnJvbSBhbiB1bmtub3duIHNpZGU6ICR7ZS5mcm9tU2lkZX1gXG4gICAgICAgICAgKTtcbiAgICAgICAgY29uc3QgYSA9IHRoaXMuZ2V0RW1pdFN0cmF0ZWd5KHMpO1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IG8gPSB5aWVsZCByKFxuICAgICAgICAgICAgLi4uZS5wYXlsb2FkLFxuICAgICAgICAgICAgZC5nZXRTaWRlKGUuZnJvbVNpZGUpLFxuICAgICAgICAgICAgZVxuICAgICAgICAgICk7XG4gICAgICAgICAgYSAhPSBudWxsICYmIGEoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG1lc3NhZ2VJZDogZS5tZXNzYWdlSWQsXG4gICAgICAgICAgICAgIGZyb21TaWRlOiBlLmZyb21TaWRlLFxuICAgICAgICAgICAgICBldmVudE5hbWU6IGcsXG4gICAgICAgICAgICAgIHBheWxvYWQ6IFtvXVxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHRcbiAgICAgICAgICApO1xuICAgICAgICB9IGNhdGNoIChvKSB7XG4gICAgICAgICAgYSAhPSBudWxsICYmIGEoXG4gICAgICAgICAgICB7XG4gICAgICAgICAgICAgIG1lc3NhZ2VJZDogZS5tZXNzYWdlSWQsXG4gICAgICAgICAgICAgIGZyb21TaWRlOiBlLmZyb21TaWRlLFxuICAgICAgICAgICAgICBldmVudE5hbWU6IEUsXG4gICAgICAgICAgICAgIHBheWxvYWQ6IFtcbiAgICAgICAgICAgICAgICBvIGluc3RhbmNlb2YgRXJyb3IgPyBvLm1lc3NhZ2UgOiBcIkZhaWxlZCB0byBoYW5kbGVcIlxuICAgICAgICAgICAgICBdXG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdFxuICAgICAgICAgICk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogRW1pdHMgYW4gZXZlbnQgdG8gYSB0YXJnZXQgc2lkZSBvZiB0aGUgbmV0d29yayB3aXRoIHRoZSBzcGVjaWZpZWQgZXZlbnQgbmFtZSBhbmQgYXJndW1lbnRzLlxuICAgKlxuICAgKiBAcGFyYW0gdGFyZ2V0U2lkZSAtIFRoZSBzaWRlIG9mIHRoZSBuZXR3b3JrIHRvIHdoaWNoIHRoZSBldmVudCB3aWxsIGJlIGVtaXR0ZWQuXG4gICAqIEBwYXJhbSBldmVudE5hbWUgLSBUaGUgbmFtZSBvZiB0aGUgZXZlbnQgdG8gZW1pdC5cbiAgICogQHBhcmFtIGVtaXRBcmdzIC0gVGhlIGFyZ3VtZW50cyBmb3IgdGhlIGV2ZW50IGhhbmRsZXIgY29ycmVzcG9uZGluZyB0byB0aGUgYGV2ZW50TmFtZWAuXG4gICAqIEBwYXJhbSBlbWl0TWV0YWRhdGEgLSBUaGUgbWV0YWRhdGEgZm9yIHRoZSBldmVudCBlbWl0dGVyIHRvIHVzZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIC8vIC4vY29tbW9uL3NpZGVzLnRzXG4gICAqICBjb25zdCBPVEhFUl9TSURFID0gTmV0d29ya2VyLmNyZWF0ZVNpZGUoXCJPdGhlci1zaWRlXCIpLmxpc3RlbnM8XG4gICAqICAgIGhlbGxvKGFyZzE6IHN0cmluZyk6IHZvaWQ7XG4gICAqICA+KCk7XG4gICAqXG4gICAqICBNWV9DSEFOTkVMLmVtaXQoT1RIRVJfU0lERSwgXCJoZWxsb1wiLCBbXCJ3b3JsZFwiXSk7XG4gICAqL1xuICBlbWl0KGUsIHQsIHIsIC4uLltzXSkge1xuICAgIHRoaXMuZ2V0RW1pdFN0cmF0ZWd5KGUpKFxuICAgICAge1xuICAgICAgICBtZXNzYWdlSWQ6IGgoKSxcbiAgICAgICAgZnJvbVNpZGU6IGQuZ2V0Q3VycmVudFNpZGUoKS5uYW1lLFxuICAgICAgICBldmVudE5hbWU6IHQudG9TdHJpbmcoKSxcbiAgICAgICAgcGF5bG9hZDogclxuICAgICAgfSxcbiAgICAgIHNcbiAgICApO1xuICB9XG4gIC8qKlxuICAgKiBTZW5kcyBhIHJlcXVlc3QgdG8gYSB0YXJnZXQgc2lkZSBvZiB0aGUgbmV0d29yayB3aXRoIHRoZSBzcGVjaWZpZWQgZXZlbnQgbmFtZSBhbmQgYXJndW1lbnRzLlxuICAgKiBSZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggdGhlIHJlc3BvbnNlIGZyb20gdGhlIHRhcmdldCBzaWRlLlxuICAgKlxuICAgKiBAcGFyYW0gdGFyZ2V0U2lkZSAtIFRoZSBzaWRlIG9mIHRoZSBuZXR3b3JrIHRvIHdoaWNoIHRoZSByZXF1ZXN0IHdpbGwgYmUgc2VudC5cbiAgICogQHBhcmFtIGV2ZW50TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudCB0byByZXF1ZXN0LlxuICAgKiBAcGFyYW0gZXZlbnRBcmdzIC0gVGhlIGFyZ3VtZW50cyBmb3IgdGhlIGV2ZW50IGhhbmRsZXIgY29ycmVzcG9uZGluZyB0byB0aGUgYGV2ZW50TmFtZWAuXG4gICAqIEBwYXJhbSBlbWl0TWV0YWRhdGEgLSBUaGUgbWV0YWRhdGEgZm9yIHRoZSBldmVudCBlbWl0dGVyIHRvIHVzZS5cbiAgICpcbiAgICogQHJldHVybnMgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgcmV0dXJuIHZhbHVlIG9mIHRoZSBldmVudCBoYW5kbGVyIG9uIHRoZSB0YXJnZXQgc2lkZS5cbiAgICpcbiAgICogQGV4YW1wbGVcbiAgICogIC8vIC4vY29tbW9uL3NpZGVzLnRzXG4gICAqICBjb25zdCBPVEhFUl9TSURFID0gTmV0d29ya2VyLmNyZWF0ZVNpZGUoXCJPdGhlci1zaWRlXCIpLmxpc3RlbnM8XG4gICAqICAgIGhlbGxvKGFyZzE6IHN0cmluZyk6IHZvaWQ7XG4gICAqICAgIHVwZGF0ZUl0ZW0oaXRlbUlkOiBzdHJpbmcsIG5hbWU6IHN0cmluZyk6IGJvb2xlYW47XG4gICAqICA+KCk7XG4gICAqXG4gICAqICBNWV9DSEFOTkVMLnJlcXVlc3QoT1RIRVJfU0lERSwgXCJoZWxsb1wiLCBbXCJ3b3JsZFwiXSkudGhlbigoKSA9PiB7XG4gICAqICAgIGNvbnNvbGUubG9nKFwiT3RoZXIgc2lkZSByZWNlaXZlZCBteSByZXF1ZXN0XCIpO1xuICAgKiAgfSk7XG4gICAqICBNWV9DSEFOTkVMLnJlcXVlc3QoT1RIRVJfU0lERSwgXCJ1cGRhdGVJdGVtXCIsIFtcIml0ZW0tMVwiLCBcIk15IEl0ZW1cIl0pLnRoZW4oKHN1Y2Nlc3MpID0+IHtcbiAgICogICAgY29uc29sZS5sb2coXCJVcGRhdGUgc3VjY2VzczpcIiwgc3VjY2Vzcyk7XG4gICAqICB9KTtcbiAgICovXG4gIHJlcXVlc3QoYSwgbywgYykge1xuICAgIHJldHVybiBsKHRoaXMsIGFyZ3VtZW50cywgZnVuY3Rpb24qIChlLCB0LCByLCAuLi5bc10pIHtcbiAgICAgIGNvbnN0IG4gPSB0aGlzLmdldEVtaXRTdHJhdGVneShlKSwgUyA9IGgoKTtcbiAgICAgIHJldHVybiBuZXcgUHJvbWlzZSgobSwgZikgPT4ge1xuICAgICAgICB0aGlzLnBlbmRpbmdSZXF1ZXN0cy5zZXQoUywgeyByZXNvbHZlOiBtLCByZWplY3Q6IGYgfSksIG4oXG4gICAgICAgICAge1xuICAgICAgICAgICAgbWVzc2FnZUlkOiBTLFxuICAgICAgICAgICAgZnJvbVNpZGU6IGQuZ2V0Q3VycmVudFNpZGUoKS5uYW1lLFxuICAgICAgICAgICAgZXZlbnROYW1lOiB0LnRvU3RyaW5nKCksXG4gICAgICAgICAgICBwYXlsb2FkOiByXG4gICAgICAgICAgfSxcbiAgICAgICAgICBzXG4gICAgICAgICk7XG4gICAgICB9KTtcbiAgICB9KTtcbiAgfVxuICAvKipcbiAgICogU3Vic2NyaWJlcyB0byBhbiBldmVudCB3aXRoIHRoZSBzcGVjaWZpZWQgZXZlbnQgbmFtZSBhbmQgbGlzdGVuZXIuXG4gICAqIFJldHVybnMgYW4gdW5zdWJzY3JpYmUgZnVuY3Rpb24gdG8gcmVtb3ZlIHRoZSBsaXN0ZW5lci5cbiAgICpcbiAgICogQHBhcmFtIGV2ZW50TmFtZSAtIFRoZSBuYW1lIG9mIHRoZSBldmVudCB0byBzdWJzY3JpYmUgdG8uXG4gICAqIEBwYXJhbSBldmVudExpc3RlbmVyIC0gVGhlIGxpc3RlbmVyIGZ1bmN0aW9uIHRvIGhhbmRsZSB0aGUgZXZlbnQgd2hlbiBpdCBpcyB0cmlnZ2VyZWQuXG4gICAqXG4gICAqIEByZXR1cm5zIEEgZnVuY3Rpb24gdG8gdW5zdWJzY3JpYmUgdGhlIGxpc3RlbmVyIGZyb20gdGhlIGV2ZW50LlxuICAgKlxuICAgKiBAZXhhbXBsZVxuICAgKiAgLy8gLi9jb21tb24vc2lkZXMudHNcbiAgICogIGNvbnN0IE1ZX1NJREUgPSBOZXR3b3JrZXIuY3JlYXRlU2lkZShcIk90aGVyLXNpZGVcIikubGlzdGVuczxcbiAgICogICAgcHJpbnQodGV4dDogc3RyaW5nKTogdm9pZDtcbiAgICogID4oKTtcbiAgICpcbiAgICogLy8gLi9teS1zaWRlL25ldHdvcmsudHNcbiAgICogIGNvbnN0IE1ZX0NIQU5ORUwgPSBNWV9TSURFLmNoYW5uZWxCdWlsZGVyKCkuYmVnaW5MaXN0ZW5pbmcoKTtcbiAgICpcbiAgICogIGNvbnN0IHVuc3Vic2NyaWJlID0gTVlfQ0hBTk5FTC5zdWJzY3JpYmUoXCJwcmludFwiLCB0ZXh0ID0+IHtcbiAgICogICAgY29uc29sZS5sb2codGV4dCk7XG4gICAqICB9KTtcbiAgICogIHNldFRpbWVvdXQoKCkgPT4gdW5zdWJzY3JpYmUoKSwgNTAwMCk7XG4gICAqL1xuICBzdWJzY3JpYmUoZSwgdCkge1xuICAgIHZhciBhLCBvO1xuICAgIGNvbnN0IHIgPSBoKCksIHMgPSAobyA9IChhID0gdGhpcy5zdWJzY3JpcHRpb25MaXN0ZW5lcnMpW2VdKSAhPSBudWxsID8gbyA6IGFbZV0gPSB7fTtcbiAgICByZXR1cm4gc1tyXSA9IHQsICgpID0+IHtcbiAgICAgIGRlbGV0ZSB0aGlzLnN1YnNjcmlwdGlvbkxpc3RlbmVyc1tlXVtyXTtcbiAgICB9O1xuICB9XG59XG5jbGFzcyB2IHtcbiAgY29uc3RydWN0b3IoZSkge1xuICAgIHRoaXMubmFtZSA9IGU7XG4gIH1cbiAgY2hhbm5lbEJ1aWxkZXIoKSB7XG4gICAgcmV0dXJuIG5ldyBOKHRoaXMpO1xuICB9XG59XG52YXIgZDtcbigoaSkgPT4ge1xuICBjb25zdCBlID0gW107XG4gIGxldCB0O1xuICBmdW5jdGlvbiByKCkge1xuICAgIGlmICh0ID09IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMb2dpY2FsIHNpZGUgaXMgbm90IGluaXRpYWxpemVkIHlldC5cIik7XG4gICAgcmV0dXJuIHQ7XG4gIH1cbiAgaS5nZXRDdXJyZW50U2lkZSA9IHI7XG4gIGZ1bmN0aW9uIHMoYywgbikge1xuICAgIGlmICh0ICE9IG51bGwpXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJMb2dpY2FsIHNpZGUgY2FuIGJlIGRlY2xhcmVkIG9ubHkgb25jZS5cIik7XG4gICAgaWYgKG4uc2lkZSAhPT0gYylcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdpdmVuIHNpZGUgYW5kIGNoYW5uZWwgc2lkZSBkb2Vzbid0IG1hdGNoXCIpO1xuICAgIHQgPSBjO1xuICB9XG4gIGkuaW5pdGlhbGl6ZSA9IHM7XG4gIGZ1bmN0aW9uIGEoYykge1xuICAgIHJldHVybiB7XG4gICAgICBsaXN0ZW5zOiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IG4gPSBuZXcgdihjKTtcbiAgICAgICAgcmV0dXJuIGUucHVzaChuKSwgbjtcbiAgICAgIH1cbiAgICB9O1xuICB9XG4gIGkuY3JlYXRlU2lkZSA9IGE7XG4gIGZ1bmN0aW9uIG8oYykge1xuICAgIGZvciAobGV0IG4gb2YgZSlcbiAgICAgIGlmIChuLm5hbWUgPT09IGMpXG4gICAgICAgIHJldHVybiBuO1xuICAgIHJldHVybiBudWxsO1xuICB9XG4gIGkuZ2V0U2lkZSA9IG87XG59KShkIHx8IChkID0ge30pKTtcbmV4cG9ydCB7XG4gIHkgYXMgTmV0d29ya0Vycm9yLFxuICBkIGFzIE5ldHdvcmtlclxufTtcbiIsImltcG9ydCB7IE5ldHdvcmtlciB9IGZyb20gXCJtb25vcmVwby1uZXR3b3JrZXJcIjtcbmltcG9ydCB7XG4gIENyZWF0ZVBhaXJSZXF1ZXN0LFxuICBFbnZpcm9ubWVudEluZm8sXG4gIExpYnJhcnlDb2xsZWN0aW9uSW5mbyxcbiAgTG9hZExpYnJhcnlQYWlyc1JlcXVlc3QsXG4gIExvYWRQYWlyc1JlcXVlc3QsXG4gIFNvdXJjZU1vZGVTZXR0aW5ncyxcbiAgVXBkYXRlUGFpclJlcXVlc3QsXG4gIFVzZXJHcm91cFNlbGVjdGlvbixcbiAgVmFyaWFibGVDb2xsZWN0aW9uSW5mbyxcbiAgVmFyaWFibGVQYWlyLFxufSBmcm9tIFwiLi90eXBlc1wiO1xuXG5leHBvcnQgY29uc3QgVUkgPSBOZXR3b3JrZXIuY3JlYXRlU2lkZShcIlVJLXNpZGVcIikubGlzdGVuczx7XG4gIHBpbmcoKTogXCJwb25nXCI7XG4gIG5vdGlmeShtZXNzYWdlOiBzdHJpbmcpOiB2b2lkO1xufT4oKTtcblxuZXhwb3J0IGNvbnN0IFBMVUdJTiA9IE5ldHdvcmtlci5jcmVhdGVTaWRlKFwiUGx1Z2luLXNpZGVcIikubGlzdGVuczx7XG4gIHBpbmcoKTogXCJwb25nXCI7XG4gIGdldENvbGxlY3Rpb25zKCk6IFByb21pc2U8VmFyaWFibGVDb2xsZWN0aW9uSW5mb1tdPjtcbiAgZ2V0RW52aXJvbm1lbnQoKTogUHJvbWlzZTxFbnZpcm9ubWVudEluZm8+O1xuICBnZXRMaWJyYXJ5Q29sbGVjdGlvbnMoKTogUHJvbWlzZTxMaWJyYXJ5Q29sbGVjdGlvbkluZm9bXT47XG4gIGdldFNlbGVjdGlvblBhaXJzKCk6IFByb21pc2U8eyBwYWlySWRzOiBzdHJpbmdbXTsgc2VsZWN0aW9uQ291bnQ6IG51bWJlciB9PjtcbiAgY2xlYXJTZWxlY3Rpb24oKTogUHJvbWlzZTx2b2lkPjtcbiAgbm90aWZ5KG1lc3NhZ2U6IHN0cmluZyk6IFByb21pc2U8dm9pZD47XG4gIGxvYWRTb3VyY2VNb2RlU2V0dGluZ3MoKTogUHJvbWlzZTxTb3VyY2VNb2RlU2V0dGluZ3MgfCBudWxsPjtcbiAgc2F2ZVNvdXJjZU1vZGVTZXR0aW5ncyhzZXR0aW5nczogU291cmNlTW9kZVNldHRpbmdzKTogUHJvbWlzZTx2b2lkPjtcbiAgbG9hZFVzZXJHcm91cFNlbGVjdGlvbnMoKTogUHJvbWlzZTxSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudWxsPj47XG4gIHNhdmVVc2VyR3JvdXBTZWxlY3Rpb24oc2VsZWN0aW9uOiBVc2VyR3JvdXBTZWxlY3Rpb24pOiBQcm9taXNlPHZvaWQ+O1xuICBsb2FkUGFpcnMocGF5bG9hZDogTG9hZFBhaXJzUmVxdWVzdCk6IFByb21pc2U8VmFyaWFibGVQYWlyW10+O1xuICBsb2FkTGlicmFyeVBhaXJzKHBheWxvYWQ6IExvYWRMaWJyYXJ5UGFpcnNSZXF1ZXN0KTogUHJvbWlzZTxWYXJpYWJsZVBhaXJbXT47XG4gIGNyZWF0ZVBhaXIocGF5bG9hZDogQ3JlYXRlUGFpclJlcXVlc3QpOiBQcm9taXNlPFZhcmlhYmxlUGFpcj47XG4gIHVwZGF0ZVBhaXIocGF5bG9hZDogVXBkYXRlUGFpclJlcXVlc3QpOiBQcm9taXNlPFZhcmlhYmxlUGFpcj47XG4gIGRlbGV0ZVBhaXIodmFyaWFibGVJZDogc3RyaW5nKTogUHJvbWlzZTx2b2lkPjtcbn0+KCk7XG4iLCJpbXBvcnQgeyBJY29uUGFpckRlc2NyaXB0aW9uLCBNYXRlcmlhbEljb24sIFNmU3ltYm9sIH0gZnJvbSBcIi4vdHlwZXNcIjtcblxuY29uc3QgTUVUQURBVEFfS0VZUyA9IFtcbiAgXCJTRlNcIixcbiAgXCJTRkdcIixcbiAgXCJTRkNcIixcbiAgXCJTRlRcIixcbiAgXCJNU1wiLFxuICBcIk1TQ1wiLFxuICBcIk1TVFwiLFxuXSBhcyBjb25zdDtcblxudHlwZSBNZXRhZGF0YUtleSA9ICh0eXBlb2YgTUVUQURBVEFfS0VZUylbbnVtYmVyXTtcblxuZnVuY3Rpb24gam9pbkxpc3QodmFsdWVzOiBzdHJpbmdbXSk6IHN0cmluZyB7XG4gIHJldHVybiB2YWx1ZXMuZmlsdGVyKEJvb2xlYW4pLmpvaW4oXCIsIFwiKTtcbn1cblxuZnVuY3Rpb24gc3BsaXRMaXN0KHZhbHVlOiBzdHJpbmcpOiBzdHJpbmdbXSB7XG4gIGlmICghdmFsdWUudHJpbSgpKSByZXR1cm4gW107XG4gIHJldHVybiB2YWx1ZVxuICAgIC5zcGxpdChcIixcIilcbiAgICAubWFwKChwYXJ0KSA9PiBwYXJ0LnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYnVpbGRQYWlyRGVzY3JpcHRpb24oXG4gIHNmOiBQaWNrPFNmU3ltYm9sLCBcIm5hbWVcIiB8IFwic3ltYm9sXCIgfCBcImNhdGVnb3JpZXNcIiB8IFwic2VhcmNoVGVybXNcIj4sXG4gIG1hdGVyaWFsOiBQaWNrPE1hdGVyaWFsSWNvbiwgXCJuYW1lXCIgfCBcImNhdGVnb3JpZXNcIiB8IFwidGFnc1wiPlxuKTogc3RyaW5nIHtcbiAgY29uc3QgcGFydHM6IFJlY29yZDxNZXRhZGF0YUtleSwgc3RyaW5nPiA9IHtcbiAgICBTRlM6IHNmLm5hbWUsXG4gICAgU0ZHOiBzZi5zeW1ib2wsXG4gICAgU0ZDOiBqb2luTGlzdChzZi5jYXRlZ29yaWVzKSxcbiAgICBTRlQ6IGpvaW5MaXN0KHNmLnNlYXJjaFRlcm1zKSxcbiAgICBNUzogbWF0ZXJpYWwubmFtZSxcbiAgICBNU0M6IGpvaW5MaXN0KG1hdGVyaWFsLmNhdGVnb3JpZXMpLFxuICAgIE1TVDogam9pbkxpc3QobWF0ZXJpYWwudGFncyksXG4gIH07XG5cbiAgcmV0dXJuIE1FVEFEQVRBX0tFWVMubWFwKChrZXkpID0+IGAke2tleX06ICR7cGFydHNba2V5XSA/PyBcIlwifWApLmpvaW4oXCJcXG5cIik7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVBhaXJEZXNjcmlwdGlvbihcbiAgZGVzY3JpcHRpb246IHN0cmluZ1xuKTogSWNvblBhaXJEZXNjcmlwdGlvbiB8IG51bGwge1xuICBjb25zdCBsaW5lcyA9IGRlc2NyaXB0aW9uLnNwbGl0KC9cXHI/XFxuLyk7XG4gIGNvbnN0IGZpZWxkczogUmVjb3JkPE1ldGFkYXRhS2V5LCBzdHJpbmc+ID0ge1xuICAgIFNGUzogXCJcIixcbiAgICBTRkc6IFwiXCIsXG4gICAgU0ZDOiBcIlwiLFxuICAgIFNGVDogXCJcIixcbiAgICBNUzogXCJcIixcbiAgICBNU0M6IFwiXCIsXG4gICAgTVNUOiBcIlwiLFxuICB9O1xuXG4gIGZvciAoY29uc3QgbGluZSBvZiBsaW5lcykge1xuICAgIGNvbnN0IG1hdGNoID0gbGluZS5tYXRjaCgvXihbQS1aXXsyLDN9KTpcXHMqKC4qKSQvKTtcbiAgICBpZiAoIW1hdGNoKSBjb250aW51ZTtcbiAgICBjb25zdCBrZXkgPSBtYXRjaFsxXSBhcyBNZXRhZGF0YUtleTtcbiAgICBpZiAoTUVUQURBVEFfS0VZUy5pbmNsdWRlcyhrZXkpKSB7XG4gICAgICBmaWVsZHNba2V5XSA9IG1hdGNoWzJdID8/IFwiXCI7XG4gICAgfVxuICB9XG5cbiAgaWYgKCFmaWVsZHMuU0ZTICYmICFmaWVsZHMuTVMpIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgc2ZOYW1lOiBmaWVsZHMuU0ZTLFxuICAgIHNmR2x5cGg6IGZpZWxkcy5TRkcsXG4gICAgc2ZDYXRlZ29yaWVzOiBzcGxpdExpc3QoZmllbGRzLlNGQyksXG4gICAgc2ZTZWFyY2hUZXJtczogc3BsaXRMaXN0KGZpZWxkcy5TRlQpLFxuICAgIG1hdGVyaWFsTmFtZTogZmllbGRzLk1TLFxuICAgIG1hdGVyaWFsQ2F0ZWdvcmllczogc3BsaXRMaXN0KGZpZWxkcy5NU0MpLFxuICAgIG1hdGVyaWFsVGFnczogc3BsaXRMaXN0KGZpZWxkcy5NU1QpLFxuICB9O1xufVxuIiwiaW1wb3J0IHsgcGFyc2VQYWlyRGVzY3JpcHRpb24gfSBmcm9tIFwiQGNvbW1vbi9kZXNjcmlwdGlvblwiO1xuaW1wb3J0IHsgUExVR0lOLCBVSSB9IGZyb20gXCJAY29tbW9uL25ldHdvcmtTaWRlc1wiO1xuaW1wb3J0IHtcbiAgQ3JlYXRlUGFpclJlcXVlc3QsXG4gIEljb25QYWlyRGVzY3JpcHRpb24sXG4gIExpYnJhcnlDb2xsZWN0aW9uSW5mbyxcbiAgTG9hZExpYnJhcnlQYWlyc1JlcXVlc3QsXG4gIExvYWRQYWlyc1JlcXVlc3QsXG4gIFNvdXJjZU1vZGVTZXR0aW5ncyxcbiAgVXBkYXRlUGFpclJlcXVlc3QsXG4gIFVzZXJHcm91cFNlbGVjdGlvbixcbiAgVmFyaWFibGVDb2xsZWN0aW9uSW5mbyxcbiAgVmFyaWFibGVHcm91cEluZm8sXG4gIFZhcmlhYmxlUGFpcixcbn0gZnJvbSBcIkBjb21tb24vdHlwZXNcIjtcblxuY29uc3QgR1JPVVBfUExVR0lOX0RBVEFfS0VZID0gXCJ2YXJpYWJsZUdyb3VwSWRcIjtcbmNvbnN0IFBMVUdJTl9EQVRBX0tFWSA9IFwiaXBhaXJzXCI7IC8vIGNvbXBhY3Qga2V5IHRvIHN0YXkgd2l0aGluIHBsdWdpbiBkYXRhIGxpbWl0c1xuY29uc3QgU09VUkNFX01PREVfU0VUVElOR1NfUExVR0lOX0RBVEFfS0VZID0gXCJpcGFpcnNTb3VyY2VTZXR0aW5nc1wiO1xuY29uc3QgVVNFUl9HUk9VUF9TRUxFQ1RJT05TX1NUT1JBR0VfS0VZID0gXCJpcGFpcnNVc2VyR3JvdXBTZWxlY3Rpb25zXCI7XG5jb25zdCBIQVJEQ09ERURfTElCUkFSWV9DT0xMRUNUSU9OX0tFWSA9XG4gIFwiYmZhMTgyN2MyMTliMTQ2MTM1NDE5OTVhMjY1ZmY1NDJlYTc5NWUwNVwiO1xubGV0IHJlYWRPbmx5U3RhcnR1cExvZ2dlZCA9IGZhbHNlO1xuXG5jb25zdCBsb2cgPSAoLi4uYXJnczogYW55W10pID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zb2xlLmxvZyhcIltpY29uLXBhaXJzXVtwbHVnaW5dXCIsIC4uLmFyZ3MpO1xuICB9IGNhdGNoIHtcbiAgICAvLyBpZ25vcmUgbG9nZ2luZyBlcnJvcnNcbiAgfVxufTtcblxuZXhwb3J0IGNvbnN0IFBMVUdJTl9DSEFOTkVMID0gUExVR0lOLmNoYW5uZWxCdWlsZGVyKClcbiAgLmVtaXRzVG8oVUksIChtZXNzYWdlKSA9PiB7XG4gICAgZmlnbWEudWkucG9zdE1lc3NhZ2UobWVzc2FnZSk7XG4gIH0pXG4gIC5yZWNlaXZlc0Zyb20oVUksIChuZXh0KSA9PiB7XG4gICAgY29uc3QgbGlzdGVuZXI6IE1lc3NhZ2VFdmVudEhhbmRsZXIgPSAoZXZlbnQpID0+IG5leHQoZXZlbnQpO1xuICAgIGZpZ21hLnVpLm9uKFwibWVzc2FnZVwiLCBsaXN0ZW5lcik7XG4gICAgcmV0dXJuICgpID0+IGZpZ21hLnVpLm9mZihcIm1lc3NhZ2VcIiwgbGlzdGVuZXIpO1xuICB9KVxuICAuc3RhcnRMaXN0ZW5pbmcoKTtcblxuLy8gLS0tLS0tLS0tLSBIZWxwZXJzXG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUdyb3VwKHJhdzogYW55KTogVmFyaWFibGVHcm91cEluZm8gfCBudWxsIHtcbiAgaWYgKHR5cGVvZiByYXcgPT09IFwic3RyaW5nXCIpIHtcbiAgICByZXR1cm4geyBpZDogcmF3LCBuYW1lOiByYXcgfTtcbiAgfVxuICBpZiAoIXJhdykgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGlkID1cbiAgICByYXcuaWQgPz9cbiAgICByYXcuZ3JvdXBJZCA/P1xuICAgIHJhdy5rZXkgPz9cbiAgICByYXcubW9kZUlkID8/XG4gICAgKHR5cGVvZiByYXcubmFtZSA9PT0gXCJzdHJpbmdcIiA/IHJhdy5uYW1lIDogbnVsbCk7XG4gIGNvbnN0IG5hbWUgPVxuICAgIHJhdy5uYW1lID8/XG4gICAgcmF3LmxhYmVsID8/XG4gICAgcmF3LnRpdGxlID8/XG4gICAgcmF3Lmdyb3VwTmFtZSA/P1xuICAgICh0eXBlb2YgcmF3LmlkID09PSBcInN0cmluZ1wiID8gcmF3LmlkIDogbnVsbCk7XG4gIGlmICghaWQpIHJldHVybiBudWxsO1xuICByZXR1cm4geyBpZDogU3RyaW5nKGlkKSwgbmFtZTogU3RyaW5nKG5hbWUgPz8gaWQpIH07XG59XG5cbmZ1bmN0aW9uIGlzUGFpclZhcmlhYmxlKHZhcmlhYmxlOiBWYXJpYWJsZSk6IGJvb2xlYW4ge1xuICBjb25zdCBwYXJzZWRGcm9tTmFtZSA9IHBhcnNlUGFpckZyb21WYXJpYWJsZU5hbWUodmFyaWFibGUubmFtZSB8fCBcIlwiKTtcbiAgaWYgKHBhcnNlZEZyb21OYW1lKSByZXR1cm4gdHJ1ZTtcbiAgY29uc3QgcGFyc2VkRnJvbURlc2NyaXB0aW9uID0gcGFyc2VQYWlyRGVzY3JpcHRpb24odmFyaWFibGUuZGVzY3JpcHRpb24gfHwgXCJcIik7XG4gIHJldHVybiBCb29sZWFuKHBhcnNlZEZyb21EZXNjcmlwdGlvbik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RDb2xsZWN0aW9ucygpOiBQcm9taXNlPFZhcmlhYmxlQ29sbGVjdGlvbkluZm9bXT4ge1xuICBjb25zdCBjb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICBjb25zdCB2YXJpYWJsZXMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZXNBc3luYyhcIlNUUklOR1wiKTtcblxuICByZXR1cm4gY29sbGVjdGlvbnMubWFwKChjb2xsZWN0aW9uKSA9PiB7XG4gICAgY29uc3QgY29sbGVjdGlvblZhcmlhYmxlcyA9IHZhcmlhYmxlcy5maWx0ZXIoXG4gICAgICAodmFyaWFibGUpID0+IHZhcmlhYmxlLnZhcmlhYmxlQ29sbGVjdGlvbklkID09PSBjb2xsZWN0aW9uLmlkXG4gICAgKTtcblxuICAgIGNvbnN0IHBhaXJWYXJpYWJsZXMgPSBjb2xsZWN0aW9uVmFyaWFibGVzLmZpbHRlcigodmFyaWFibGUpID0+XG4gICAgICBpc1BhaXJWYXJpYWJsZSh2YXJpYWJsZSlcbiAgICApO1xuXG4gICAgY29uc3QgZ3JvdXBzUmF3ID1cbiAgICAgIChjb2xsZWN0aW9uIGFzIGFueSkudmFyaWFibGVHcm91cHMgPz9cbiAgICAgIChjb2xsZWN0aW9uIGFzIGFueSkuZ3JvdXBzID8/XG4gICAgICAoY29sbGVjdGlvbiBhcyBhbnkpLnZhcmlhYmxlR3JvdXBJZHMgPz9cbiAgICAgIFtdO1xuICAgIGNvbnN0IGdyb3VwczogVmFyaWFibGVHcm91cEluZm9bXSA9IEFycmF5LmlzQXJyYXkoZ3JvdXBzUmF3KVxuICAgICAgPyBncm91cHNSYXdcbiAgICAgICAgICAubWFwKG5vcm1hbGl6ZUdyb3VwKVxuICAgICAgICAgIC5maWx0ZXIoKGdyb3VwKTogZ3JvdXAgaXMgVmFyaWFibGVHcm91cEluZm8gPT4gQm9vbGVhbihncm91cCkpXG4gICAgICA6IFtdO1xuXG4gICAgLy8gRGVyaXZlIGdyb3VwcyBmcm9tIHZhcmlhYmxlIG5hbWVzIHVzaW5nIHNsYXNoLXNlcGFyYXRlZCBwcmVmaXhlcy5cbiAgICBjb25zdCBkZXJpdmVkR3JvdXBzID0gbmV3IE1hcDxzdHJpbmcsIFZhcmlhYmxlR3JvdXBJbmZvPigpO1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgcGFpclZhcmlhYmxlcykge1xuICAgICAgY29uc3QgbmFtZSA9IHZhcmlhYmxlLm5hbWUgfHwgXCJcIjtcbiAgICAgIGNvbnN0IHBhcnRzID0gbmFtZS5zcGxpdChcIi9cIikuZmlsdGVyKEJvb2xlYW4pO1xuICAgICAgZm9yIChsZXQgaSA9IDE7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBjb25zdCBwcmVmaXggPSBwYXJ0cy5zbGljZSgwLCBpKS5qb2luKFwiL1wiKTtcbiAgICAgICAgaWYgKCFkZXJpdmVkR3JvdXBzLmhhcyhwcmVmaXgpKSB7XG4gICAgICAgICAgZGVyaXZlZEdyb3Vwcy5zZXQocHJlZml4LCB7IGlkOiBwcmVmaXgsIG5hbWU6IHByZWZpeCB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IHBhaXJHcm91cElkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuICAgIGZvciAoY29uc3QgdmFyaWFibGUgb2YgcGFpclZhcmlhYmxlcykge1xuICAgICAgY29uc3QgZXhwbGljaXRHcm91cElkID0gcmVhZFZhcmlhYmxlR3JvdXBJZCh2YXJpYWJsZSk7XG4gICAgICBpZiAoZXhwbGljaXRHcm91cElkKSBwYWlyR3JvdXBJZHMuYWRkKGV4cGxpY2l0R3JvdXBJZCk7XG4gICAgICBjb25zdCBwYXJ0cyA9ICh2YXJpYWJsZS5uYW1lIHx8IFwiXCIpLnNwbGl0KFwiL1wiKS5maWx0ZXIoQm9vbGVhbik7XG4gICAgICBmb3IgKGxldCBpID0gMTsgaSA8IHBhcnRzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHBhaXJHcm91cElkcy5hZGQocGFydHMuc2xpY2UoMCwgaSkuam9pbihcIi9cIikpO1xuICAgICAgfVxuICAgIH1cblxuICAgIGNvbnN0IG1lcmdlZEdyb3VwcyA9IG5ldyBNYXA8c3RyaW5nLCBWYXJpYWJsZUdyb3VwSW5mbz4oKTtcbiAgICBmb3IgKGNvbnN0IGcgb2YgZ3JvdXBzKSBtZXJnZWRHcm91cHMuc2V0KGcuaWQsIGcpO1xuICAgIGZvciAoY29uc3QgZyBvZiBkZXJpdmVkR3JvdXBzLnZhbHVlcygpKSBtZXJnZWRHcm91cHMuc2V0KGcuaWQsIGcpO1xuICAgIGNvbnN0IGdyb3Vwc1dpdGhQYWlycyA9IEFycmF5LmZyb20obWVyZ2VkR3JvdXBzLnZhbHVlcygpKS5maWx0ZXIoKGdyb3VwKSA9PlxuICAgICAgcGFpckdyb3VwSWRzLmhhcyhncm91cC5pZClcbiAgICApO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIGlkOiBjb2xsZWN0aW9uLmlkLFxuICAgICAgbmFtZTogY29sbGVjdGlvbi5uYW1lLFxuICAgICAgbW9kZXM6IGNvbGxlY3Rpb24ubW9kZXMubWFwKChtb2RlKSA9PiAoe1xuICAgICAgICBtb2RlSWQ6IG1vZGUubW9kZUlkLFxuICAgICAgICBuYW1lOiBtb2RlLm5hbWUsXG4gICAgICB9KSksXG4gICAgICBkZWZhdWx0TW9kZUlkOiBjb2xsZWN0aW9uLmRlZmF1bHRNb2RlSWQsXG4gICAgICBncm91cHM6IGdyb3Vwc1dpdGhQYWlycyxcbiAgICB9O1xuICB9KTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZUNhbldyaXRlKGxvY2FsQ29sbGVjdGlvbnNDb3VudDogbnVtYmVyKTogYm9vbGVhbiB7XG4gIGlmIChmaWdtYS5lZGl0b3JUeXBlICE9PSBcImZpZ21hXCIpIHJldHVybiBmYWxzZTtcbiAgaWYgKGlzRGV2UnVudGltZSgpKSByZXR1cm4gZmFsc2U7XG4gIHJldHVybiBsb2NhbENvbGxlY3Rpb25zQ291bnQgPiAwO1xufVxuXG5mdW5jdGlvbiBpc0RldlJ1bnRpbWUoKTogYm9vbGVhbiB7XG4gIHJldHVybiAoXG4gICAgZmlnbWEuZWRpdG9yVHlwZSA9PT0gXCJkZXZcIiB8fFxuICAgIChmaWdtYSBhcyBhbnkpLm1vZGUgPT09IFwiZGV2XCIgfHxcbiAgICAoZmlnbWEgYXMgYW55KS5tb2RlID09PSBcImNvZGVcIiB8fFxuICAgIChmaWdtYSBhcyBhbnkpLmlzSW5EZXZNb2RlID09PSB0cnVlIHx8XG4gICAgKGZpZ21hIGFzIGFueSkuZGV2TW9kZSA9PT0gdHJ1ZVxuICApO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gaXNTb3VyY2VXcml0ZU1vZGUoKTogUHJvbWlzZTxib29sZWFuPiB7XG4gIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgcmV0dXJuIHJlc29sdmVDYW5Xcml0ZShsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxpc3RMaWJyYXJ5Q29sbGVjdGlvbnMoKTogUHJvbWlzZTxMaWJyYXJ5Q29sbGVjdGlvbkluZm9bXT4ge1xuICBjb25zdCB0ZWFtTGlicmFyeSA9IChmaWdtYSBhcyBhbnkpLnRlYW1MaWJyYXJ5O1xuICBpZiAoIXRlYW1MaWJyYXJ5Py5nZXRBdmFpbGFibGVMaWJyYXJ5VmFyaWFibGVDb2xsZWN0aW9uc0FzeW5jKSB7XG4gICAgcmV0dXJuIFtdO1xuICB9XG4gIGNvbnN0IGNvbGxlY3Rpb25zID0gYXdhaXQgdGVhbUxpYnJhcnkuZ2V0QXZhaWxhYmxlTGlicmFyeVZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICByZXR1cm4gY29sbGVjdGlvbnMubWFwKChjb2xsZWN0aW9uOiBhbnkpID0+ICh7XG4gICAga2V5OiBTdHJpbmcoY29sbGVjdGlvbi5rZXkpLFxuICAgIG5hbWU6IFN0cmluZyhjb2xsZWN0aW9uLm5hbWUgPz8gY29sbGVjdGlvbi5rZXkpLFxuICAgIGxpYnJhcnlOYW1lOiBTdHJpbmcoXG4gICAgICBjb2xsZWN0aW9uLmxpYnJhcnlOYW1lID8/IGNvbGxlY3Rpb24ubGlicmFyeSA/PyBjb2xsZWN0aW9uLnB1Ymxpc2hlck5hbWUgPz8gXCJMaWJyYXJ5XCJcbiAgICApLFxuICB9KSk7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGxvZ1JlYWRPbmx5U3RhcnR1cFNlbGVjdGlvbigpIHtcbiAgaWYgKHJlYWRPbmx5U3RhcnR1cExvZ2dlZCkgcmV0dXJuO1xuICByZWFkT25seVN0YXJ0dXBMb2dnZWQgPSB0cnVlO1xuICB0cnkge1xuICAgIGNvbnN0IGNvbGxlY3Rpb25zID0gYXdhaXQgbGlzdExpYnJhcnlDb2xsZWN0aW9ucygpO1xuICAgIGNvbnN0IHNlbGVjdGVkQ29sbGVjdGlvbiA9XG4gICAgICBjb2xsZWN0aW9ucy5maW5kKFxuICAgICAgICAoY29sbGVjdGlvbikgPT4gY29sbGVjdGlvbi5rZXkgPT09IEhBUkRDT0RFRF9MSUJSQVJZX0NPTExFQ1RJT05fS0VZXG4gICAgICApID8/IG51bGw7XG5cbiAgICBsb2coXCJyZWFkT25seVN0YXJ0dXBTZWxlY3Rpb25cIiwge1xuICAgICAgcGVyc2lzdGVkTGlicmFyeUNvbGxlY3Rpb25LZXk6IG51bGwsXG4gICAgICBoYXJkY29kZWRMaWJyYXJ5Q29sbGVjdGlvbktleTogSEFSRENPREVEX0xJQlJBUllfQ09MTEVDVElPTl9LRVksXG4gICAgICBtYXRjaGVkQ29sbGVjdGlvbktleTogc2VsZWN0ZWRDb2xsZWN0aW9uPy5rZXkgPz8gbnVsbCxcbiAgICAgIG1hdGNoZWRDb2xsZWN0aW9uTmFtZTogc2VsZWN0ZWRDb2xsZWN0aW9uPy5uYW1lID8/IG51bGwsXG4gICAgICBtYXRjaGVkTGlicmFyeU5hbWU6IHNlbGVjdGVkQ29sbGVjdGlvbj8ubGlicmFyeU5hbWUgPz8gbnVsbCxcbiAgICAgIGF2YWlsYWJsZUxpYnJhcnlDb2xsZWN0aW9uQ291bnQ6IGNvbGxlY3Rpb25zLmxlbmd0aCxcbiAgICB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgbG9nKFwicmVhZE9ubHlTdGFydHVwU2VsZWN0aW9uOmVycm9yXCIsIFN0cmluZygoZXJyIGFzIGFueSk/Lm1lc3NhZ2UgPz8gZXJyKSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZW5zdXJlTW9kZXMoXG4gIGNvbGxlY3Rpb246IFZhcmlhYmxlQ29sbGVjdGlvbixcbiAgc2ZNb2RlSWRzOiBzdHJpbmdbXSxcbiAgbWF0ZXJpYWxNb2RlSWRzOiBzdHJpbmdbXVxuKSB7XG4gIGNvbnN0IGFsbE1vZGVJZHMgPSBjb2xsZWN0aW9uLm1vZGVzLm1hcCgobW9kZSkgPT4gbW9kZS5tb2RlSWQpO1xuICBjb25zdCBzZlNldCA9IG5ldyBTZXQoc2ZNb2RlSWRzKTtcbiAgY29uc3QgbWF0U2V0ID0gbmV3IFNldChtYXRlcmlhbE1vZGVJZHMpO1xuXG4gIGlmIChzZlNldC5zaXplID09PSAwIHx8IG1hdFNldC5zaXplID09PSAwKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQXNzaWduIGF0IGxlYXN0IG9uZSBtb2RlIHRvIFNGIGFuZCBvbmUgdG8gTWF0ZXJpYWwuXCIpO1xuICB9XG5cbiAgZm9yIChjb25zdCBpZCBvZiBzZlNldCkge1xuICAgIGlmICghYWxsTW9kZUlkcy5pbmNsdWRlcyhpZCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlNvbWUgU0YgbW9kZXMgYXJlIG5vdCBwYXJ0IG9mIHRoZSBjb2xsZWN0aW9uLlwiKTtcbiAgICB9XG4gICAgaWYgKG1hdFNldC5oYXMoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBIG1vZGUgY2Fubm90IGJlIGFzc2lnbmVkIHRvIGJvdGggU0YgYW5kIE1hdGVyaWFsLlwiKTtcbiAgICB9XG4gIH1cbiAgZm9yIChjb25zdCBpZCBvZiBtYXRTZXQpIHtcbiAgICBpZiAoIWFsbE1vZGVJZHMuaW5jbHVkZXMoaWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJTb21lIE1hdGVyaWFsIG1vZGVzIGFyZSBub3QgcGFydCBvZiB0aGUgY29sbGVjdGlvbi5cIik7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgY292ZXJlZCA9IG5ldyBTZXQoWy4uLnNmU2V0LCAuLi5tYXRTZXRdKTtcbiAgaWYgKGNvdmVyZWQuc2l6ZSAhPT0gYWxsTW9kZUlkcy5sZW5ndGgpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoXCJFdmVyeSBtb2RlIGluIHRoZSBjb2xsZWN0aW9uIG11c3QgYmUgYXNzaWduZWQgdG8gU0Ygb3IgTWF0ZXJpYWwuXCIpO1xuICB9XG59XG5cbmZ1bmN0aW9uIHJlYWRWYXJpYWJsZUdyb3VwSWQodmFyaWFibGU6IFZhcmlhYmxlKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHByb3BWYWx1ZSA9ICh2YXJpYWJsZSBhcyBhbnkpLnZhcmlhYmxlR3JvdXBJZCA/PyBudWxsO1xuICBjb25zdCBwbHVnaW5EYXRhVmFsdWUgPSB2YXJpYWJsZS5nZXRQbHVnaW5EYXRhPy4oR1JPVVBfUExVR0lOX0RBVEFfS0VZKTtcbiAgcmV0dXJuIChwbHVnaW5EYXRhVmFsdWUgfHwgcHJvcFZhbHVlIHx8IG51bGwpIGFzIHN0cmluZyB8IG51bGw7XG59XG5cbmZ1bmN0aW9uIGFwcGx5VmFyaWFibGVHcm91cCh2YXJpYWJsZTogVmFyaWFibGUsIGdyb3VwSWQ/OiBzdHJpbmcgfCBudWxsKSB7XG4gIGlmICghZ3JvdXBJZCkgcmV0dXJuO1xuICBjb25zdCBzZXR0ZXIgPVxuICAgICh2YXJpYWJsZSBhcyBhbnkpLnNldFZhcmlhYmxlR3JvdXBJZCA/P1xuICAgICh2YXJpYWJsZSBhcyBhbnkpLnNldEdyb3VwSWQgPz9cbiAgICAodmFyaWFibGUgYXMgYW55KS5hc3NpZ25WYXJpYWJsZUdyb3VwO1xuICBpZiAodHlwZW9mIHNldHRlciA9PT0gXCJmdW5jdGlvblwiKSB7XG4gICAgdHJ5IHtcbiAgICAgIHNldHRlci5jYWxsKHZhcmlhYmxlLCBncm91cElkKTtcbiAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgIGNvbnNvbGUud2FybihcIlVuYWJsZSB0byBzZXQgdmFyaWFibGUgZ3JvdXAgdmlhIHNldHRlclwiLCBlcnIpO1xuICAgIH1cbiAgfSBlbHNlIGlmIChcInZhcmlhYmxlR3JvdXBJZFwiIGluICh2YXJpYWJsZSBhcyBhbnkpKSB7XG4gICAgdHJ5IHtcbiAgICAgICh2YXJpYWJsZSBhcyBhbnkpLnZhcmlhYmxlR3JvdXBJZCA9IGdyb3VwSWQ7XG4gICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICBjb25zb2xlLndhcm4oXCJVbmFibGUgdG8gYXNzaWduIHZhcmlhYmxlR3JvdXBJZCBkaXJlY3RseVwiLCBlcnIpO1xuICAgIH1cbiAgfVxuXG4gIHRyeSB7XG4gICAgdmFyaWFibGUuc2V0UGx1Z2luRGF0YShHUk9VUF9QTFVHSU5fREFUQV9LRVksIGdyb3VwSWQpO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oXCJVbmFibGUgdG8gc3RvcmUgZ3JvdXAgaWQgaW4gcGx1Z2luIGRhdGFcIiwgZXJyKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZXJpdmVHcm91cEZyb21WYXJpYWJsZU5hbWUobmFtZTogc3RyaW5nKTogc3RyaW5nIHwgbnVsbCB7XG4gIGNvbnN0IHBhcnRzID0gKG5hbWUgfHwgXCJcIikuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKTtcbiAgaWYgKHBhcnRzLmxlbmd0aCA8IDIpIHJldHVybiBudWxsO1xuICByZXR1cm4gcGFydHMuc2xpY2UoMCwgLTEpLmpvaW4oXCIvXCIpO1xufVxuXG5mdW5jdGlvbiB2YXJpYWJsZU1hdGNoZXNHcm91cEZpbHRlcih2YXJpYWJsZTogVmFyaWFibGUsIGdyb3VwSWQ6IHN0cmluZyk6IGJvb2xlYW4ge1xuICBpZiAoIWdyb3VwSWQpIHJldHVybiB0cnVlO1xuICBjb25zdCBpc1N1Ymdyb3VwRmlsdGVyID0gZ3JvdXBJZC5pbmNsdWRlcyhcIi9cIik7XG4gIGNvbnN0IGV4cGxpY2l0R3JvdXBJZCA9IHJlYWRWYXJpYWJsZUdyb3VwSWQodmFyaWFibGUpO1xuICBjb25zdCBkZXJpdmVkR3JvdXBJZCA9IGRlcml2ZUdyb3VwRnJvbVZhcmlhYmxlTmFtZSh2YXJpYWJsZS5uYW1lIHx8IFwiXCIpO1xuICBjb25zdCBlZmZlY3RpdmVHcm91cElkID0gZXhwbGljaXRHcm91cElkIHx8IGRlcml2ZWRHcm91cElkO1xuICBpZiAoIWVmZmVjdGl2ZUdyb3VwSWQpIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNTdWJncm91cEZpbHRlcikge1xuICAgIHJldHVybiAoXG4gICAgICBlZmZlY3RpdmVHcm91cElkID09PSBncm91cElkIHx8XG4gICAgICBlZmZlY3RpdmVHcm91cElkLnN0YXJ0c1dpdGgoYCR7Z3JvdXBJZH0vYClcbiAgICApO1xuICB9XG5cbiAgLy8gVG9wLWxldmVsIGdyb3VwIGZpbHRlciBtYXRjaGVzIG9ubHkgZGlyZWN0IG1lbWJlcnMsIGV4Y2x1ZGluZyBzdWJncm91cHMuXG4gIHJldHVybiBlZmZlY3RpdmVHcm91cElkID09PSBncm91cElkO1xufVxuXG5mdW5jdGlvbiBub3JtYWxpemVUb2tlbih2YWx1ZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHZhbHVlLnRyaW0oKS50b0xvd2VyQ2FzZSgpLnJlcGxhY2UoL1xccysvZywgXCIgXCIpO1xufVxuXG5mdW5jdGlvbiB0b2tlbml6ZSh2YWx1ZTogc3RyaW5nKTogc3RyaW5nW10ge1xuICByZXR1cm4gdmFsdWVcbiAgICAuc3BsaXQoL1suXy9cXC1cXHNdKy8pXG4gICAgLm1hcCgodG9rZW4pID0+IHRva2VuLnRyaW0oKSlcbiAgICAuZmlsdGVyKEJvb2xlYW4pO1xufVxuXG5mdW5jdGlvbiBidWlsZEtleXdvcmREZXNjcmlwdGlvbihcbiAgc2Y6IFBpY2s8Q3JlYXRlUGFpclJlcXVlc3RbXCJzZlwiXSwgXCJuYW1lXCIgfCBcImNhdGVnb3JpZXNcIiB8IFwic2VhcmNoVGVybXNcIj4sXG4gIG1hdGVyaWFsOiBQaWNrPENyZWF0ZVBhaXJSZXF1ZXN0W1wibWF0ZXJpYWxcIl0sIFwibmFtZVwiIHwgXCJjYXRlZ29yaWVzXCIgfCBcInRhZ3NcIj5cbik6IHN0cmluZyB7XG4gIGNvbnN0IGtleXdvcmRzID0gbmV3IFNldDxzdHJpbmc+KCk7XG4gIGNvbnN0IHNvdXJjZXMgPSBbXG4gICAgLi4uc2Yuc2VhcmNoVGVybXMsXG4gICAgLi4uc2YuY2F0ZWdvcmllcyxcbiAgICAuLi50b2tlbml6ZShzZi5uYW1lKSxcbiAgICAuLi5tYXRlcmlhbC50YWdzLFxuICAgIC4uLm1hdGVyaWFsLmNhdGVnb3JpZXMsXG4gICAgLi4udG9rZW5pemUobWF0ZXJpYWwubmFtZSksXG4gIF07XG5cbiAgZm9yIChjb25zdCBzb3VyY2Ugb2Ygc291cmNlcykge1xuICAgIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVUb2tlbihTdHJpbmcoc291cmNlID8/IFwiXCIpKTtcbiAgICBpZiAobm9ybWFsaXplZCkga2V5d29yZHMuYWRkKG5vcm1hbGl6ZWQpO1xuICB9XG5cbiAgcmV0dXJuIEFycmF5LmZyb20oa2V5d29yZHMpLmpvaW4oXCIsIFwiKTtcbn1cblxuZnVuY3Rpb24gc2FuaXRpemVTZkxhYmVsKHNmTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcbiAgcmV0dXJuIHNmTmFtZVxuICAgIC5yZXBsYWNlKC9cXC4vZywgXCIgXCIpXG4gICAgLnJlcGxhY2UoL1xccysvZywgXCIgXCIpXG4gICAgLnRyaW0oKTtcbn1cblxuZnVuY3Rpb24gYnVpbGRWYXJpYWJsZUxlYWYoc2ZHbHlwaDogc3RyaW5nLCBzZk5hbWU6IHN0cmluZywgbWF0ZXJpYWxOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gYCR7c2ZHbHlwaH0gJHtzYW5pdGl6ZVNmTGFiZWwoc2ZOYW1lKX1fXyR7bWF0ZXJpYWxOYW1lLnRyaW0oKX1gO1xufVxuXG5mdW5jdGlvbiBwYXJzZVBhaXJGcm9tVmFyaWFibGVOYW1lKG5hbWU6IHN0cmluZyk6IEljb25QYWlyRGVzY3JpcHRpb24gfCBudWxsIHtcbiAgY29uc3QgcmF3TmFtZSA9IG5hbWUgfHwgXCJcIjtcbiAgY29uc3QgbGVhZiA9IHJhd05hbWUuc3BsaXQoXCIvXCIpLmZpbHRlcihCb29sZWFuKS5wb3AoKSB8fCByYXdOYW1lO1xuICBjb25zdCBkZWxpbWl0ZXJJbmRleCA9IGxlYWYuaW5kZXhPZihcIl9fXCIpO1xuICBpZiAoZGVsaW1pdGVySW5kZXggPCAwKSByZXR1cm4gbnVsbDtcblxuICBjb25zdCBsZWZ0ID0gbGVhZi5zbGljZSgwLCBkZWxpbWl0ZXJJbmRleCkudHJpbSgpO1xuICBjb25zdCBtYXRlcmlhbE5hbWUgPSBsZWFmLnNsaWNlKGRlbGltaXRlckluZGV4ICsgMikudHJpbSgpO1xuICBpZiAoIWxlZnQgfHwgIW1hdGVyaWFsTmFtZSkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgY2hhcnMgPSBBcnJheS5mcm9tKGxlZnQpO1xuICBjb25zdCBzZkdseXBoID0gY2hhcnNbMF0gfHwgXCJcIjtcbiAgY29uc3Qgc2ZMYWJlbCA9IGNoYXJzLnNsaWNlKDEpLmpvaW4oXCJcIikudHJpbSgpO1xuICBpZiAoIXNmR2x5cGggfHwgIXNmTGFiZWwpIHJldHVybiBudWxsO1xuXG4gIHJldHVybiB7XG4gICAgc2ZOYW1lOiBzZkxhYmVsLFxuICAgIHNmR2x5cGgsXG4gICAgc2ZDYXRlZ29yaWVzOiBbXSxcbiAgICBzZlNlYXJjaFRlcm1zOiBbXSxcbiAgICBtYXRlcmlhbE5hbWUsXG4gICAgbWF0ZXJpYWxDYXRlZ29yaWVzOiBbXSxcbiAgICBtYXRlcmlhbFRhZ3M6IFtdLFxuICB9O1xufVxuXG5mdW5jdGlvbiBzZXJpYWxpemVQYWlyKFxuICB2YXJpYWJsZTogVmFyaWFibGUsXG4gIHNmTW9kZUlkczogc3RyaW5nW10sXG4gIG1hdGVyaWFsTW9kZUlkczogc3RyaW5nW11cbik6IFZhcmlhYmxlUGFpciB7XG4gIGNvbnN0IHZhbHVlcyA9IHZhcmlhYmxlLnZhbHVlc0J5TW9kZSA/PyB7fTtcbiAgY29uc3Qgc2ZNb2RlSWQgPSBzZk1vZGVJZHNbMF07XG4gIGNvbnN0IG1hdGVyaWFsTW9kZUlkID0gbWF0ZXJpYWxNb2RlSWRzWzBdO1xuICBjb25zdCBzZlZhbHVlID1cbiAgICBzZk1vZGVJZCAmJiB0eXBlb2YgdmFsdWVzW3NmTW9kZUlkXSA9PT0gXCJzdHJpbmdcIlxuICAgICAgPyAodmFsdWVzW3NmTW9kZUlkXSBhcyBzdHJpbmcpXG4gICAgICA6IG51bGw7XG4gIGNvbnN0IG1hdGVyaWFsVmFsdWUgPVxuICAgIG1hdGVyaWFsTW9kZUlkICYmIHR5cGVvZiB2YWx1ZXNbbWF0ZXJpYWxNb2RlSWRdID09PSBcInN0cmluZ1wiXG4gICAgICA/ICh2YWx1ZXNbbWF0ZXJpYWxNb2RlSWRdIGFzIHN0cmluZylcbiAgICAgIDogbnVsbDtcbiAgY29uc3QgZGVzY3JpcHRpb24gPSB2YXJpYWJsZS5kZXNjcmlwdGlvbiA/PyBcIlwiO1xuICBjb25zdCBkZXNjcmlwdGlvbkZpZWxkcyA9XG4gICAgcGFyc2VQYWlyRnJvbVZhcmlhYmxlTmFtZSh2YXJpYWJsZS5uYW1lIHx8IFwiXCIpIHx8XG4gICAgcGFyc2VQYWlyRGVzY3JpcHRpb24oZGVzY3JpcHRpb24pIHx8XG4gICAgbnVsbDtcblxuICByZXR1cm4ge1xuICAgIGlkOiB2YXJpYWJsZS5pZCxcbiAgICBuYW1lOiB2YXJpYWJsZS5uYW1lLFxuICAgIGNvbGxlY3Rpb25JZDogdmFyaWFibGUudmFyaWFibGVDb2xsZWN0aW9uSWQsXG4gICAgZ3JvdXBJZDogcmVhZFZhcmlhYmxlR3JvdXBJZCh2YXJpYWJsZSksXG4gICAgZGVzY3JpcHRpb24sXG4gICAgZGVzY3JpcHRpb25GaWVsZHMsXG4gICAgc2ZWYWx1ZSxcbiAgICBtYXRlcmlhbFZhbHVlLFxuICB9O1xufVxuXG50eXBlIFBsdWdpbkRhdGFQYWlyID0ge1xuICBpZDogc3RyaW5nO1xuICBzZjogc3RyaW5nO1xuICBtYXQ6IHN0cmluZztcbiAgYzogbnVtYmVyOyAvLyBjcmVhdGVkXG4gIHU6IG51bWJlcjsgLy8gdXBkYXRlZFxufTtcblxuXG5mdW5jdGlvbiByZWFkU3RvcmVkUGFpcnMoKTogTWFwPHN0cmluZywgUGx1Z2luRGF0YVBhaXI+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCByYXcgPSBmaWdtYS5yb290LmdldFBsdWdpbkRhdGEoUExVR0lOX0RBVEFfS0VZKTtcbiAgICBpZiAoIXJhdykgcmV0dXJuIG5ldyBNYXAoKTtcbiAgICBjb25zdCBwYXJzZWQgPSBKU09OLnBhcnNlKHJhdyk7XG4gICAgaWYgKCFwYXJzZWQgfHwgIUFycmF5LmlzQXJyYXkocGFyc2VkLnApKSByZXR1cm4gbmV3IE1hcCgpO1xuICAgIGNvbnN0IG1hcCA9IG5ldyBNYXA8c3RyaW5nLCBQbHVnaW5EYXRhUGFpcj4oKTtcbiAgICBmb3IgKGNvbnN0IGVudHJ5IG9mIHBhcnNlZC5wKSB7XG4gICAgICBpZiAoXG4gICAgICAgIEFycmF5LmlzQXJyYXkoZW50cnkpICYmXG4gICAgICAgIHR5cGVvZiBlbnRyeVswXSA9PT0gXCJzdHJpbmdcIiAmJlxuICAgICAgICB0eXBlb2YgZW50cnlbMV0gPT09IFwic3RyaW5nXCIgJiZcbiAgICAgICAgdHlwZW9mIGVudHJ5WzJdID09PSBcInN0cmluZ1wiICYmXG4gICAgICAgIHR5cGVvZiBlbnRyeVszXSA9PT0gXCJudW1iZXJcIiAmJlxuICAgICAgICB0eXBlb2YgZW50cnlbNF0gPT09IFwibnVtYmVyXCJcbiAgICAgICkge1xuICAgICAgICBtYXAuc2V0KGVudHJ5WzBdLCB7XG4gICAgICAgICAgaWQ6IGVudHJ5WzBdLFxuICAgICAgICAgIHNmOiBlbnRyeVsxXSxcbiAgICAgICAgICBtYXQ6IGVudHJ5WzJdLFxuICAgICAgICAgIGM6IGVudHJ5WzNdLFxuICAgICAgICAgIHU6IGVudHJ5WzRdLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG1hcDtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIHBhcnNlIHBsdWdpbkRhdGEgcGFpcnNcIiwgZXJyKTtcbiAgICByZXR1cm4gbmV3IE1hcCgpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGNvbXBhY3RWYWx1ZSh2YWx1ZXNCeU1vZGU6IFZhcmlhYmxlW1widmFsdWVzQnlNb2RlXCJdKTogc3RyaW5nIHtcbiAgaWYgKCF2YWx1ZXNCeU1vZGUgfHwgdHlwZW9mIHZhbHVlc0J5TW9kZSAhPT0gXCJvYmplY3RcIikgcmV0dXJuIFwiXCI7XG4gIGZvciAoY29uc3QgdmFsdWUgb2YgT2JqZWN0LnZhbHVlcyh2YWx1ZXNCeU1vZGUpKSB7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIiAmJiB2YWx1ZSkgcmV0dXJuIHZhbHVlO1xuICB9XG4gIHJldHVybiBcIlwiO1xufVxuXG5cbmZ1bmN0aW9uIHBlcnNpc3RQYWlyc1RvUGx1Z2luRGF0YShwYWlyczogUGx1Z2luRGF0YVBhaXJbXSwgcmVhc29uOiBzdHJpbmcpIHtcbiAgY29uc3QgcGF5bG9hZCA9IHtcbiAgICB2OiAxLFxuICAgIHA6IHBhaXJzLm1hcCgocCkgPT4gW3AuaWQsIHAuc2YsIHAubWF0LCBwLmMsIHAudV0pLFxuICB9O1xuICB0cnkge1xuICAgIGZpZ21hLnJvb3Quc2V0UGx1Z2luRGF0YShQTFVHSU5fREFUQV9LRVksIEpTT04uc3RyaW5naWZ5KHBheWxvYWQpKTtcbiAgICBsb2coXCJwbHVnaW5EYXRhIHVwZGF0ZWRcIiwge1xuICAgICAgcmVhc29uLFxuICAgICAgY291bnQ6IHBhaXJzLmxlbmd0aCxcbiAgICAgIHBheWxvYWQsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycikge1xuICAgIGNvbnNvbGUud2FybihcIlVuYWJsZSB0byBzdG9yZSBwbHVnaW5EYXRhIHBhaXJzXCIsIGVycik7XG4gIH1cbn1cblxuZnVuY3Rpb24gcGFyc2VTb3VyY2VNb2RlU2V0dGluZ3MocmF3OiBzdHJpbmcpOiBTb3VyY2VNb2RlU2V0dGluZ3MgfCBudWxsIHtcbiAgdHJ5IHtcbiAgICBpZiAoIXJhdykgcmV0dXJuIG51bGw7XG4gICAgY29uc3QgcGFyc2VkID0gSlNPTi5wYXJzZShyYXcpO1xuICAgIGlmICghcGFyc2VkIHx8IHR5cGVvZiBwYXJzZWQgIT09IFwib2JqZWN0XCIpIHJldHVybiBudWxsO1xuICAgIGNvbnN0IGNvbGxlY3Rpb25JZCA9XG4gICAgICB0eXBlb2YgKHBhcnNlZCBhcyBhbnkpLmNvbGxlY3Rpb25JZCA9PT0gXCJzdHJpbmdcIlxuICAgICAgICA/IChwYXJzZWQgYXMgYW55KS5jb2xsZWN0aW9uSWRcbiAgICAgICAgOiBudWxsO1xuICAgIGNvbnN0IHNmTW9kZUlkcyA9IEFycmF5LmlzQXJyYXkoKHBhcnNlZCBhcyBhbnkpLnNmTW9kZUlkcylcbiAgICAgID8gKHBhcnNlZCBhcyBhbnkpLnNmTW9kZUlkcy5maWx0ZXIoKHZhbHVlOiBhbnkpID0+IHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIilcbiAgICAgIDogW107XG4gICAgY29uc3QgbWF0ZXJpYWxNb2RlSWRzID0gQXJyYXkuaXNBcnJheSgocGFyc2VkIGFzIGFueSkubWF0ZXJpYWxNb2RlSWRzKVxuICAgICAgPyAocGFyc2VkIGFzIGFueSkubWF0ZXJpYWxNb2RlSWRzLmZpbHRlcigodmFsdWU6IGFueSkgPT4gdHlwZW9mIHZhbHVlID09PSBcInN0cmluZ1wiKVxuICAgICAgOiBbXTtcbiAgICByZXR1cm4geyBjb2xsZWN0aW9uSWQsIHNmTW9kZUlkcywgbWF0ZXJpYWxNb2RlSWRzIH07XG4gIH0gY2F0Y2gge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlVXNlckdyb3VwU2VsZWN0aW9ucyhyYXc6IHVua25vd24pOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmcgfCBudWxsPiB7XG4gIGlmICghcmF3IHx8IHR5cGVvZiByYXcgIT09IFwib2JqZWN0XCIpIHJldHVybiB7fTtcbiAgY29uc3Qgc291cmNlID0gcmF3IGFzIFJlY29yZDxzdHJpbmcsIHVua25vd24+O1xuICBjb25zdCBvdXQ6IFJlY29yZDxzdHJpbmcsIHN0cmluZyB8IG51bGw+ID0ge307XG4gIGZvciAoY29uc3QgW2NvbGxlY3Rpb25JZCwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHNvdXJjZSkpIHtcbiAgICBpZiAoIWNvbGxlY3Rpb25JZCkgY29udGludWU7XG4gICAgaWYgKHR5cGVvZiB2YWx1ZSA9PT0gXCJzdHJpbmdcIikgb3V0W2NvbGxlY3Rpb25JZF0gPSB2YWx1ZTtcbiAgICBlbHNlIGlmICh2YWx1ZSA9PT0gbnVsbCkgb3V0W2NvbGxlY3Rpb25JZF0gPSBudWxsO1xuICB9XG4gIHJldHVybiBvdXQ7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBzbmFwc2hvdFBhaXJzUGx1Z2luRGF0YSgpIHtcbiAgY29uc3Qgc3RvcmVkID0gcmVhZFN0b3JlZFBhaXJzKCk7XG4gIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XG4gIGNvbnN0IHZhcmlhYmxlcyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlc0FzeW5jKFwiU1RSSU5HXCIpO1xuICBjb25zdCBwYWlyczogUGx1Z2luRGF0YVBhaXJbXSA9IHZhcmlhYmxlcy5tYXAoKHZhcmlhYmxlKSA9PiB7XG4gICAgY29uc3QgcGFyc2VkID1cbiAgICAgIHBhcnNlUGFpckZyb21WYXJpYWJsZU5hbWUodmFyaWFibGUubmFtZSB8fCBcIlwiKSB8fFxuICAgICAgcGFyc2VQYWlyRGVzY3JpcHRpb24odmFyaWFibGUuZGVzY3JpcHRpb24gPz8gXCJcIikgfHxcbiAgICAgIG51bGw7XG4gICAgY29uc3Qgc2ZOYW1lID0gcGFyc2VkPy5zZk5hbWUgfHwgdmFyaWFibGUubmFtZSB8fCBcIlwiO1xuICAgIGNvbnN0IG1hdE5hbWUgPSBwYXJzZWQ/Lm1hdGVyaWFsTmFtZSB8fCBjb21wYWN0VmFsdWUodmFyaWFibGUudmFsdWVzQnlNb2RlKSB8fCBcIlwiO1xuICAgIGNvbnN0IHByZXYgPSBzdG9yZWQuZ2V0KHZhcmlhYmxlLmlkKTtcbiAgICByZXR1cm4ge1xuICAgICAgaWQ6IHZhcmlhYmxlLmlkLFxuICAgICAgc2Y6IHNmTmFtZSxcbiAgICAgIG1hdDogbWF0TmFtZSxcbiAgICAgIGM6IHByZXY/LmMgPz8gbm93LFxuICAgICAgdTogbm93LFxuICAgIH07XG4gIH0pO1xuICBwZXJzaXN0UGFpcnNUb1BsdWdpbkRhdGEocGFpcnMsIFwic25hcHNob3RcIik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHVwc2VydFBhaXJQbHVnaW5EYXRhKHZhcmlhYmxlOiBWYXJpYWJsZSkge1xuICBjb25zdCBzdG9yZWQgPSByZWFkU3RvcmVkUGFpcnMoKTtcbiAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcbiAgY29uc3QgcGFyc2VkID1cbiAgICBwYXJzZVBhaXJGcm9tVmFyaWFibGVOYW1lKHZhcmlhYmxlLm5hbWUgfHwgXCJcIikgfHxcbiAgICBwYXJzZVBhaXJEZXNjcmlwdGlvbih2YXJpYWJsZS5kZXNjcmlwdGlvbiA/PyBcIlwiKSB8fFxuICAgIG51bGw7XG4gIGNvbnN0IHNmTmFtZSA9IHBhcnNlZD8uc2ZOYW1lIHx8IHZhcmlhYmxlLm5hbWUgfHwgXCJcIjtcbiAgY29uc3QgbWF0TmFtZSA9IHBhcnNlZD8ubWF0ZXJpYWxOYW1lIHx8IGNvbXBhY3RWYWx1ZSh2YXJpYWJsZS52YWx1ZXNCeU1vZGUpIHx8IFwiXCI7XG4gIGNvbnN0IHByZXYgPSBzdG9yZWQuZ2V0KHZhcmlhYmxlLmlkKTtcbiAgc3RvcmVkLnNldCh2YXJpYWJsZS5pZCwge1xuICAgIGlkOiB2YXJpYWJsZS5pZCxcbiAgICBzZjogc2ZOYW1lLFxuICAgIG1hdDogbWF0TmFtZSxcbiAgICBjOiBwcmV2Py5jID8/IG5vdyxcbiAgICB1OiBub3csXG4gIH0pO1xuICBwZXJzaXN0UGFpcnNUb1BsdWdpbkRhdGEoQXJyYXkuZnJvbShzdG9yZWQudmFsdWVzKCkpLCBcInVwc2VydFwiKTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gcmVtb3ZlUGFpclBsdWdpbkRhdGEodmFyaWFibGU6IFZhcmlhYmxlKSB7XG4gIGNvbnN0IHN0b3JlZCA9IHJlYWRTdG9yZWRQYWlycygpO1xuICBzdG9yZWQuZGVsZXRlKHZhcmlhYmxlLmlkKTtcbiAgcGVyc2lzdFBhaXJzVG9QbHVnaW5EYXRhKEFycmF5LmZyb20oc3RvcmVkLnZhbHVlcygpKSwgXCJyZW1vdmVcIik7XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGVuc3VyZUNvbGxlY3Rpb24oY29sbGVjdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPFZhcmlhYmxlQ29sbGVjdGlvbj4ge1xuICBjb25zdCBjb2xsZWN0aW9uID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldFZhcmlhYmxlQ29sbGVjdGlvbkJ5SWRBc3luYyhcbiAgICBjb2xsZWN0aW9uSWRcbiAgKTtcbiAgaWYgKCFjb2xsZWN0aW9uKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiQ29sbGVjdGlvbiBub3QgZm91bmQuXCIpO1xuICB9XG4gIHJldHVybiBjb2xsZWN0aW9uO1xufVxuXG4vLyAtLS0tLS0tLS0tIE1lc3NhZ2UgaGFuZGxlcnNcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcInBpbmdcIiwgKCkgPT4ge1xuICBsb2coXCJwaW5nXCIpO1xuICByZXR1cm4gXCJwb25nXCI7XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcImdldEVudmlyb25tZW50XCIsIGFzeW5jICgpID0+IHtcbiAgY29uc3QgaXNEZXZNb2RlID0gaXNEZXZSdW50aW1lKCk7XG4gIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgY29uc3QgY2FuV3JpdGUgPSByZXNvbHZlQ2FuV3JpdGUobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpO1xuICBpZiAoaXNEZXZNb2RlIHx8ICFjYW5Xcml0ZSkge1xuICAgIGF3YWl0IGxvZ1JlYWRPbmx5U3RhcnR1cFNlbGVjdGlvbigpO1xuICB9XG4gIGxvZyhcImdldEVudmlyb25tZW50XCIsIHsgZWRpdG9yVHlwZTogZmlnbWEuZWRpdG9yVHlwZSwgaXNEZXZNb2RlLCBjYW5Xcml0ZSB9KTtcbiAgcmV0dXJuIHsgaXNEZXZNb2RlLCBjYW5Xcml0ZSB9O1xufSk7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXCJnZXRMaWJyYXJ5Q29sbGVjdGlvbnNcIiwgYXN5bmMgKCkgPT4ge1xuICBsb2coXCJnZXRMaWJyYXJ5Q29sbGVjdGlvbnNcIik7XG4gIHJldHVybiBsaXN0TGlicmFyeUNvbGxlY3Rpb25zKCk7XG59KTtcblxuZnVuY3Rpb24gZXh0cmFjdElkcyhiaW5kaW5nOiBhbnkpOiBzdHJpbmdbXSB7XG4gIGxvZyhcImV4dHJhY3RJZHM6cmF3XCIsIGJpbmRpbmcpO1xuICBpZiAoIWJpbmRpbmcpIHJldHVybiBbXTtcbiAgaWYgKHR5cGVvZiBiaW5kaW5nID09PSBcInN0cmluZ1wiKSB7XG4gICAgaWYgKGJpbmRpbmcuc3RhcnRzV2l0aChcIlZhcmlhYmxlSUQ6XCIpIHx8IGJpbmRpbmcuc3RhcnRzV2l0aChcIlZhcmlhYmxlQ29sbGVjdGlvbklkOlwiKSkge1xuICAgICAgcmV0dXJuIFtiaW5kaW5nXTtcbiAgICB9XG4gICAgbG9nKFwiZXh0cmFjdElkczpzdHJpbmdfaWdub3JlZFwiLCBiaW5kaW5nKTtcbiAgICByZXR1cm4gW107XG4gIH1cbiAgaWYgKEFycmF5LmlzQXJyYXkoYmluZGluZykpIHtcbiAgICBjb25zdCByZXN1bHRzID0gYmluZGluZy5mbGF0TWFwKChpdGVtKSA9PiBleHRyYWN0SWRzKGl0ZW0pKTtcbiAgICBsb2coXCJleHRyYWN0SWRzOmFycmF5XCIsIHJlc3VsdHMpO1xuICAgIHJldHVybiByZXN1bHRzO1xuICB9XG4gIGlmICh0eXBlb2YgYmluZGluZyA9PT0gXCJvYmplY3RcIiAmJiBiaW5kaW5nICE9PSBudWxsKSB7XG4gICAgaWYgKHR5cGVvZiBiaW5kaW5nLmlkID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBsb2coXCJleHRyYWN0SWRzOm9iamVjdC5pZFwiLCBiaW5kaW5nLmlkKTtcbiAgICAgIHJldHVybiBbYmluZGluZy5pZF07XG4gICAgfVxuICAgIGlmICh0eXBlb2YgKGJpbmRpbmcgYXMgYW55KS52YXJpYWJsZUlkID09PSBcInN0cmluZ1wiKSB7XG4gICAgICBsb2coXCJleHRyYWN0SWRzOm9iamVjdC52YXJpYWJsZUlkXCIsIChiaW5kaW5nIGFzIGFueSkudmFyaWFibGVJZCk7XG4gICAgICByZXR1cm4gWyhiaW5kaW5nIGFzIGFueSkudmFyaWFibGVJZF07XG4gICAgfVxuICAgIGlmICh0eXBlb2YgKGJpbmRpbmcgYXMgYW55KS52YWx1ZSA9PT0gXCJzdHJpbmdcIikge1xuICAgICAgbG9nKFwiZXh0cmFjdElkczpvYmplY3QudmFsdWVcIiwgKGJpbmRpbmcgYXMgYW55KS52YWx1ZSk7XG4gICAgICByZXR1cm4gWyhiaW5kaW5nIGFzIGFueSkudmFsdWVdO1xuICAgIH1cbiAgICBsb2coXCJleHRyYWN0SWRzOm9iamVjdC51bmhhbmRsZWRLZXlzXCIsIE9iamVjdC5rZXlzKGJpbmRpbmcpKTtcbiAgfVxuICByZXR1cm4gW107XG59XG5cbmZ1bmN0aW9uIGNvbGxlY3RTZWxlY3Rpb25JbmZvKCk6IHsgcGFpcklkczogc3RyaW5nW107IHNlbGVjdGlvbkNvdW50OiBudW1iZXIgfSB7XG4gIGNvbnN0IGlkcyA9IG5ldyBTZXQ8c3RyaW5nPigpO1xuXG4gIGNvbnN0IHZpc2l0ID0gKG5vZGU6IFNjZW5lTm9kZSkgPT4ge1xuICAgIGxvZyhcInZpc2l0Om5vZGVcIiwgeyB0eXBlOiBub2RlLnR5cGUsIG5hbWU6IChub2RlIGFzIGFueSkubmFtZSB9KTtcbiAgICBpZiAoXCJjaGlsZHJlblwiIGluIG5vZGUpIHtcbiAgICAgIGZvciAoY29uc3QgY2hpbGQgb2Ygbm9kZS5jaGlsZHJlbikge1xuICAgICAgICB2aXNpdChjaGlsZCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKG5vZGUudHlwZSA9PT0gXCJURVhUXCIpIHtcbiAgICAgIGNvbnN0IGJvdW5kID0gKG5vZGUgYXMgYW55KS5ib3VuZFZhcmlhYmxlcztcbiAgICAgIGxvZyhcInRleHRcIiwgbm9kZSk7XG4gICAgICBsb2coXCJ0ZXh0OmJvdW5kVmFyaWFibGVzXCIsIGJvdW5kKTtcbiAgICAgIGNvbnN0IGNoYXJhY3RlcnMgPSBib3VuZD8uY2hhcmFjdGVycztcbiAgICAgIGNvbnN0IHZhcklkcyA9IGV4dHJhY3RJZHMoY2hhcmFjdGVycyk7XG4gICAgICBsb2coXCJ0ZXh0OmNoYXJhY3RlcnNWYXJJZHNcIiwgdmFySWRzKTtcbiAgICAgIHZhcklkcy5mb3JFYWNoKChpZCkgPT4gaWRzLmFkZChpZCkpO1xuICAgIH1cblxuICAgIGlmIChcImNvbXBvbmVudFByb3BlcnRpZXNcIiBpbiBub2RlKSB7XG4gICAgIGxvZyhcImluc3RhbmNlTm9kZVwiLCBub2RlKTtcbiAgICAgIGNvbnN0IHByb3BzID1cbiAgICAgICAgKChub2RlIGFzIGFueSkuY29tcG9uZW50UHJvcGVydGllcyBhcyBSZWNvcmQ8XG4gICAgICAgICAgc3RyaW5nLFxuICAgICAgICAgIHsgdHlwZT86IHN0cmluZzsgdmFsdWU/OiBhbnkgfVxuICAgICAgICA+KSA/PyB7fTtcbiAgICAgIGNvbnN0IGJvdW5kUHJvcHMgPVxuICAgICAgICAoKG5vZGUgYXMgYW55KS5ib3VuZFZhcmlhYmxlcz8uY29tcG9uZW50UHJvcGVydGllcyBhcyBSZWNvcmQ8XG4gICAgICAgICAgc3RyaW5nLFxuICAgICAgICAgIGFueVxuICAgICAgICA+KSA/PyB7fTtcbiAgICAgIGNvbnN0IHByb3BSZWZzID1cbiAgICAgICAgKChub2RlIGFzIGFueSkuY29tcG9uZW50UHJvcGVydHlSZWZlcmVuY2VzIGFzIFJlY29yZDxzdHJpbmcsIGFueT4pID8/XG4gICAgICAgIHt9O1xuXG4gICAgICBPYmplY3QuZW50cmllcyhwcm9wcykuZm9yRWFjaCgoW3Byb3BOYW1lLCBwcm9wXSkgPT4ge1xuICAgICAgICBjb25zdCBib3VuZCA9IGJvdW5kUHJvcHNbcHJvcE5hbWVdO1xuICAgICAgICBjb25zdCByZWYgPSBwcm9wUmVmc1twcm9wTmFtZV07XG4gICAgICAgIGNvbnN0IGlubGluZUJvdW5kID1cbiAgICAgICAgICAocHJvcCBhcyBhbnkpPy5ib3VuZFZhcmlhYmxlcz8udmFsdWUgPz9cbiAgICAgICAgICAocHJvcCBhcyBhbnkpPy5ib3VuZFZhcmlhYmxlcyA/P1xuICAgICAgICAgIHVuZGVmaW5lZDtcbiAgICAgICAgbG9nKFwiaW5zdGFuY2U6Y29tcG9uZW50UHJvcGVydHlcIiwge1xuICAgICAgICAgIG5vZGU6IChub2RlIGFzIGFueSkubmFtZSxcbiAgICAgICAgICBuYW1lOiBwcm9wTmFtZSxcbiAgICAgICAgICB0eXBlOiBwcm9wPy50eXBlLFxuICAgICAgICAgIHZhbHVlOiBwcm9wPy52YWx1ZSxcbiAgICAgICAgICBib3VuZCxcbiAgICAgICAgICByZWYsXG4gICAgICAgICAgaW5saW5lQm91bmQsXG4gICAgICAgIH0pO1xuXG4gICAgICAgIGNvbnN0IGlzVGV4dFByb3AgPVxuICAgICAgICAgIHByb3A/LnR5cGUgPT09IFwiVEVYVFwiIHx8IHByb3A/LnR5cGUgPT09IFwiU1RSSU5HXCIgfHwgcHJvcD8udHlwZSA9PT0gXCJURVhUX0xJVEVSQUxcIjtcblxuICAgICAgICBpZiAoaXNUZXh0UHJvcCkge1xuICAgICAgICAgIGNvbnN0IGZyb21Cb3VuZCA9IGV4dHJhY3RJZHMoYm91bmQpO1xuICAgICAgICAgIGNvbnN0IGZyb21WYWx1ZSA9IGV4dHJhY3RJZHMocHJvcD8udmFsdWUpO1xuICAgICAgICAgIGNvbnN0IGZyb21SZWYgPSBleHRyYWN0SWRzKHJlZik7XG4gICAgICAgICAgY29uc3QgZnJvbUlubGluZSA9IGV4dHJhY3RJZHMoaW5saW5lQm91bmQpO1xuICAgICAgICAgIGNvbnN0IGFsbCA9IFsuLi5mcm9tQm91bmQsIC4uLmZyb21WYWx1ZSwgLi4uZnJvbVJlZiwgLi4uZnJvbUlubGluZV07XG4gICAgICAgICAgbG9nKFwiaW5zdGFuY2U6Y29tcG9uZW50UHJvcGVydHlWYXJJZHNcIiwge1xuICAgICAgICAgICAgbmFtZTogcHJvcE5hbWUsXG4gICAgICAgICAgICBpZHM6IGFsbCxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBhbGwuZm9yRWFjaCgoaWQpID0+IGlkcy5hZGQoaWQpKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIGZvciAoY29uc3Qgbm9kZSBvZiBmaWdtYS5jdXJyZW50UGFnZS5zZWxlY3Rpb24pIHtcbiAgICB2aXNpdChub2RlKTtcbiAgfVxuXG4gIHJldHVybiB7IHBhaXJJZHM6IEFycmF5LmZyb20oaWRzKSwgc2VsZWN0aW9uQ291bnQ6IGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbi5sZW5ndGggfTtcbn1cblxuZnVuY3Rpb24gbm90aWZ5U2VsZWN0aW9uUGFpcnMoKSB7XG4gIGNvbnN0IGluZm8gPSBjb2xsZWN0U2VsZWN0aW9uSW5mbygpO1xuICBsb2coXG4gICAgXCJzZWxlY3Rpb25jaGFuZ2VcIixcbiAgICBgbm9kZXM9JHtpbmZvLnNlbGVjdGlvbkNvdW50fWAsXG4gICAgYHBhaXJJZHM9JHtpbmZvLnBhaXJJZHMuam9pbihcIixcIikgfHwgXCJub25lXCJ9YFxuICApO1xuICB0cnkge1xuICAgIGZpZ21hLnVpLnBvc3RNZXNzYWdlKHsgdHlwZTogXCJzZWxlY3Rpb25QYWlyc1wiLCAuLi5pbmZvIH0pO1xuICB9IGNhdGNoIChlcnIpIHtcbiAgICBjb25zb2xlLndhcm4oXCJGYWlsZWQgdG8gcG9zdCBzZWxlY3Rpb24gcGFpcnNcIiwgZXJyKTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3RhcnRTZWxlY3Rpb25XYXRjaGVyKCkge1xuICBmaWdtYS5vbihcInNlbGVjdGlvbmNoYW5nZVwiLCBub3RpZnlTZWxlY3Rpb25QYWlycyk7XG4gIG5vdGlmeVNlbGVjdGlvblBhaXJzKCk7XG59XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXCJnZXRTZWxlY3Rpb25QYWlyc1wiLCBhc3luYyAoKSA9PiB7XG4gIHJldHVybiBjb2xsZWN0U2VsZWN0aW9uSW5mbygpO1xufSk7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXCJjbGVhclNlbGVjdGlvblwiLCBhc3luYyAoKSA9PiB7XG4gIGZpZ21hLmN1cnJlbnRQYWdlLnNlbGVjdGlvbiA9IFtdO1xuICBub3RpZnlTZWxlY3Rpb25QYWlycygpO1xufSk7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXCJub3RpZnlcIiwgYXN5bmMgKG1lc3NhZ2U6IHN0cmluZykgPT4ge1xuICBsb2coXCJub3RpZnlcIiwgbWVzc2FnZSk7XG4gIHRyeSB7XG4gICAgZmlnbWEubm90aWZ5KG1lc3NhZ2UsIHsgdGltZW91dDogMjAwMCB9KTtcbiAgfSBjYXRjaCAoZXJyKSB7XG4gICAgY29uc29sZS53YXJuKFwiRmFpbGVkIHRvIG5vdGlmeVwiLCBlcnIpO1xuICB9XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcImdldENvbGxlY3Rpb25zXCIsIGFzeW5jICgpID0+IHtcbiAgbG9nKFwiZ2V0Q29sbGVjdGlvbnNcIik7XG4gIHJldHVybiBsaXN0Q29sbGVjdGlvbnMoKTtcbn0pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFwibG9hZFNvdXJjZU1vZGVTZXR0aW5nc1wiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgaWYgKCFyZXNvbHZlQ2FuV3JpdGUobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSByZXR1cm4gbnVsbDtcbiAgcmV0dXJuIHBhcnNlU291cmNlTW9kZVNldHRpbmdzKFxuICAgIGZpZ21hLnJvb3QuZ2V0UGx1Z2luRGF0YShTT1VSQ0VfTU9ERV9TRVRUSU5HU19QTFVHSU5fREFUQV9LRVkpXG4gICk7XG59KTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcbiAgXCJzYXZlU291cmNlTW9kZVNldHRpbmdzXCIsXG4gIGFzeW5jIChzZXR0aW5nczogU291cmNlTW9kZVNldHRpbmdzKSA9PiB7XG4gICAgY29uc3QgbG9jYWxDb2xsZWN0aW9ucyA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRMb2NhbFZhcmlhYmxlQ29sbGVjdGlvbnNBc3luYygpO1xuICAgIGlmICghcmVzb2x2ZUNhbldyaXRlKGxvY2FsQ29sbGVjdGlvbnMubGVuZ3RoKSkgcmV0dXJuO1xuICAgIGNvbnN0IHBheWxvYWQ6IFNvdXJjZU1vZGVTZXR0aW5ncyA9IHtcbiAgICAgIGNvbGxlY3Rpb25JZDogc2V0dGluZ3M/LmNvbGxlY3Rpb25JZCA/PyBudWxsLFxuICAgICAgc2ZNb2RlSWRzOiBBcnJheS5pc0FycmF5KHNldHRpbmdzPy5zZk1vZGVJZHMpXG4gICAgICAgID8gc2V0dGluZ3Muc2ZNb2RlSWRzLmZpbHRlcigoaWQpID0+IHR5cGVvZiBpZCA9PT0gXCJzdHJpbmdcIilcbiAgICAgICAgOiBbXSxcbiAgICAgIG1hdGVyaWFsTW9kZUlkczogQXJyYXkuaXNBcnJheShzZXR0aW5ncz8ubWF0ZXJpYWxNb2RlSWRzKVxuICAgICAgICA/IHNldHRpbmdzLm1hdGVyaWFsTW9kZUlkcy5maWx0ZXIoKGlkKSA9PiB0eXBlb2YgaWQgPT09IFwic3RyaW5nXCIpXG4gICAgICAgIDogW10sXG4gICAgfTtcbiAgICBmaWdtYS5yb290LnNldFBsdWdpbkRhdGEoXG4gICAgICBTT1VSQ0VfTU9ERV9TRVRUSU5HU19QTFVHSU5fREFUQV9LRVksXG4gICAgICBKU09OLnN0cmluZ2lmeShwYXlsb2FkKVxuICAgICk7XG4gIH1cbik7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXCJsb2FkVXNlckdyb3VwU2VsZWN0aW9uc1wiLCBhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgaWYgKCFyZXNvbHZlQ2FuV3JpdGUobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSByZXR1cm4ge307XG4gIGNvbnN0IHJhdyA9IGF3YWl0IGZpZ21hLmNsaWVudFN0b3JhZ2UuZ2V0QXN5bmMoVVNFUl9HUk9VUF9TRUxFQ1RJT05TX1NUT1JBR0VfS0VZKTtcbiAgcmV0dXJuIHBhcnNlVXNlckdyb3VwU2VsZWN0aW9ucyhyYXcpO1xufSk7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXG4gIFwic2F2ZVVzZXJHcm91cFNlbGVjdGlvblwiLFxuICBhc3luYyAoc2VsZWN0aW9uOiBVc2VyR3JvdXBTZWxlY3Rpb24pID0+IHtcbiAgICBjb25zdCBsb2NhbENvbGxlY3Rpb25zID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVDb2xsZWN0aW9uc0FzeW5jKCk7XG4gICAgaWYgKCFyZXNvbHZlQ2FuV3JpdGUobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSByZXR1cm47XG4gICAgaWYgKCFzZWxlY3Rpb24/LmNvbGxlY3Rpb25JZCkgcmV0dXJuO1xuXG4gICAgY29uc3QgcmF3ID0gYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5nZXRBc3luYyhVU0VSX0dST1VQX1NFTEVDVElPTlNfU1RPUkFHRV9LRVkpO1xuICAgIGNvbnN0IG1hcCA9IHBhcnNlVXNlckdyb3VwU2VsZWN0aW9ucyhyYXcpO1xuICAgIG1hcFtzZWxlY3Rpb24uY29sbGVjdGlvbklkXSA9IHNlbGVjdGlvbi5ncm91cElkID8/IG51bGw7XG4gICAgYXdhaXQgZmlnbWEuY2xpZW50U3RvcmFnZS5zZXRBc3luYyhVU0VSX0dST1VQX1NFTEVDVElPTlNfU1RPUkFHRV9LRVksIG1hcCk7XG4gIH1cbik7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXG4gIFwibG9hZFBhaXJzXCIsXG4gIGFzeW5jIChwYXlsb2FkOiBMb2FkUGFpcnNSZXF1ZXN0KSA9PiB7XG4gICAgbG9nKFwibG9hZFBhaXJzXCIsIHBheWxvYWQpO1xuICAgIGNvbnN0IGNvbGxlY3Rpb24gPSBhd2FpdCBlbnN1cmVDb2xsZWN0aW9uKHBheWxvYWQuY29sbGVjdGlvbklkKTtcbiAgICBlbnN1cmVNb2Rlcyhjb2xsZWN0aW9uLCBwYXlsb2FkLnNmTW9kZUlkcywgcGF5bG9hZC5tYXRlcmlhbE1vZGVJZHMpO1xuXG4gICAgY29uc3QgdmFyaWFibGVzID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVzQXN5bmMoXCJTVFJJTkdcIik7XG4gICAgY29uc3QgZmlsdGVyZWQgPSB2YXJpYWJsZXMuZmlsdGVyKCh2YXJpYWJsZSkgPT4ge1xuICAgICAgaWYgKHZhcmlhYmxlLnZhcmlhYmxlQ29sbGVjdGlvbklkICE9PSBwYXlsb2FkLmNvbGxlY3Rpb25JZCkgcmV0dXJuIGZhbHNlO1xuICAgICAgaWYgKHBheWxvYWQuZ3JvdXBJZCkge1xuICAgICAgICByZXR1cm4gdmFyaWFibGVNYXRjaGVzR3JvdXBGaWx0ZXIodmFyaWFibGUsIHBheWxvYWQuZ3JvdXBJZCk7XG4gICAgICB9XG4gICAgICByZXR1cm4gdHJ1ZTtcbiAgICB9KTtcblxuICAgIHJldHVybiBmaWx0ZXJlZC5tYXAoKHZhcmlhYmxlKSA9PlxuICAgICAgc2VyaWFsaXplUGFpcih2YXJpYWJsZSwgcGF5bG9hZC5zZk1vZGVJZHMsIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzKVxuICAgICk7XG4gIH1cbik7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXG4gIFwibG9hZExpYnJhcnlQYWlyc1wiLFxuICBhc3luYyAocGF5bG9hZDogTG9hZExpYnJhcnlQYWlyc1JlcXVlc3QpID0+IHtcbiAgICBjb25zdCBlZmZlY3RpdmVMaWJyYXJ5Q29sbGVjdGlvbktleSA9IEhBUkRDT0RFRF9MSUJSQVJZX0NPTExFQ1RJT05fS0VZO1xuICAgIGxvZyhcImxvYWRMaWJyYXJ5UGFpcnNcIiwge1xuICAgICAgcmVxdWVzdGVkTGlicmFyeUNvbGxlY3Rpb25LZXk6IHBheWxvYWQubGlicmFyeUNvbGxlY3Rpb25LZXksXG4gICAgICBlZmZlY3RpdmVMaWJyYXJ5Q29sbGVjdGlvbktleSxcbiAgICB9KTtcbiAgICBjb25zdCB0ZWFtTGlicmFyeSA9IChmaWdtYSBhcyBhbnkpLnRlYW1MaWJyYXJ5O1xuICAgIGlmICghdGVhbUxpYnJhcnk/LmdldFZhcmlhYmxlc0luTGlicmFyeUNvbGxlY3Rpb25Bc3luYykge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKFwiVGVhbSBsaWJyYXJ5IEFQSSBpcyBub3QgYXZhaWxhYmxlIGluIHRoaXMgZmlsZS5cIik7XG4gICAgfVxuICAgIGNvbnN0IGRlc2NyaXB0b3JzID0gYXdhaXQgdGVhbUxpYnJhcnkuZ2V0VmFyaWFibGVzSW5MaWJyYXJ5Q29sbGVjdGlvbkFzeW5jKFxuICAgICAgZWZmZWN0aXZlTGlicmFyeUNvbGxlY3Rpb25LZXlcbiAgICApO1xuICAgIGNvbnN0IHN0cmluZ0Rlc2NyaXB0b3JzID0gKEFycmF5LmlzQXJyYXkoZGVzY3JpcHRvcnMpID8gZGVzY3JpcHRvcnMgOiBbXSkuZmlsdGVyKFxuICAgICAgKGRlc2NyaXB0b3I6IGFueSkgPT4gZGVzY3JpcHRvcj8ucmVzb2x2ZWRUeXBlID09PSBcIlNUUklOR1wiXG4gICAgKTtcbiAgICBsb2coXCJsb2FkTGlicmFyeVBhaXJzOnN0cmluZ0Rlc2NyaXB0b3JDb3VudFwiLCBzdHJpbmdEZXNjcmlwdG9ycy5sZW5ndGgpO1xuICAgIGxvZyhcbiAgICAgIFwibG9hZExpYnJhcnlQYWlyczpzdHJpbmdEZXNjcmlwdG9yTmFtZXNcIixcbiAgICAgIHN0cmluZ0Rlc2NyaXB0b3JzLm1hcCgoZGVzY3JpcHRvcjogYW55KSA9PiBTdHJpbmcoKGRlc2NyaXB0b3IgYXMgYW55KS5uYW1lID8/IFwiXCIpKVxuICAgICk7XG5cbiAgICBjb25zdCBwYWlyczogVmFyaWFibGVQYWlyW10gPSBbXTtcbiAgICBmb3IgKGNvbnN0IGRlc2NyaXB0b3Igb2Ygc3RyaW5nRGVzY3JpcHRvcnMpIHtcbiAgICAgIGNvbnN0IHJhd05hbWUgPSBTdHJpbmcoKGRlc2NyaXB0b3IgYXMgYW55KS5uYW1lID8/IFwiXCIpO1xuICAgICAgY29uc3QgZmllbGRzID0gcGFyc2VQYWlyRnJvbVZhcmlhYmxlTmFtZShyYXdOYW1lKTtcbiAgICAgIGlmICghZmllbGRzKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IGtleSA9IFN0cmluZygoZGVzY3JpcHRvciBhcyBhbnkpLmtleSA/PyBcIlwiKTtcbiAgICAgIHBhaXJzLnB1c2goe1xuICAgICAgICBpZDoga2V5ID8gYExpYnJhcnlWYXJpYWJsZToke2tleX1gIDogcmF3TmFtZSxcbiAgICAgICAgbmFtZTogcmF3TmFtZSxcbiAgICAgICAgY29sbGVjdGlvbklkOiBlZmZlY3RpdmVMaWJyYXJ5Q29sbGVjdGlvbktleSxcbiAgICAgICAgZ3JvdXBJZDogbnVsbCxcbiAgICAgICAgZGVzY3JpcHRpb246IFwiXCIsXG4gICAgICAgIGRlc2NyaXB0aW9uRmllbGRzOiBmaWVsZHMsXG4gICAgICAgIHNmVmFsdWU6IGZpZWxkcy5zZkdseXBoIHx8IG51bGwsXG4gICAgICAgIG1hdGVyaWFsVmFsdWU6IGZpZWxkcy5tYXRlcmlhbE5hbWUgfHwgbnVsbCxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIGxvZyhcImxvYWRMaWJyYXJ5UGFpcnM6cGFyc2VkUGFpckNvdW50XCIsIHBhaXJzLmxlbmd0aCk7XG4gICAgcmV0dXJuIHBhaXJzO1xuICB9XG4pO1xuXG5QTFVHSU5fQ0hBTk5FTC5yZWdpc3Rlck1lc3NhZ2VIYW5kbGVyKFxuICBcImNyZWF0ZVBhaXJcIixcbiAgYXN5bmMgKHBheWxvYWQ6IENyZWF0ZVBhaXJSZXF1ZXN0KSA9PiB7XG4gICAgbG9nKFwiY3JlYXRlUGFpclwiLCBwYXlsb2FkKTtcbiAgICBjb25zdCBsb2NhbENvbGxlY3Rpb25zID0gYXdhaXQgZmlnbWEudmFyaWFibGVzLmdldExvY2FsVmFyaWFibGVDb2xsZWN0aW9uc0FzeW5jKCk7XG4gICAgaWYgKCFyZXNvbHZlQ2FuV3JpdGUobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJUaGlzIGZpbGUgaXMgcmVhZC1vbmx5LiBPcGVuIHRoZSBzb3VyY2UgdmFyaWFibGUgZmlsZSB0byBlZGl0IHBhaXJzLlwiKTtcbiAgICB9XG4gICAgY29uc3QgY29sbGVjdGlvbiA9IGF3YWl0IGVuc3VyZUNvbGxlY3Rpb24ocGF5bG9hZC5jb2xsZWN0aW9uSWQpO1xuICAgIGVuc3VyZU1vZGVzKGNvbGxlY3Rpb24sIHBheWxvYWQuc2ZNb2RlSWRzLCBwYXlsb2FkLm1hdGVyaWFsTW9kZUlkcyk7XG5cbiAgICBjb25zdCB2YXJpYWJsZSA9IGZpZ21hLnZhcmlhYmxlcy5jcmVhdGVWYXJpYWJsZShcbiAgICAgIHBheWxvYWQuZ3JvdXBJZFxuICAgICAgICA/IGAke3BheWxvYWQuZ3JvdXBJZH0vJHtidWlsZFZhcmlhYmxlTGVhZihcbiAgICAgICAgICAgIHBheWxvYWQuc2Yuc3ltYm9sLFxuICAgICAgICAgICAgcGF5bG9hZC5zZi5uYW1lLFxuICAgICAgICAgICAgcGF5bG9hZC5tYXRlcmlhbC5uYW1lXG4gICAgICAgICAgKX1gXG4gICAgICAgIDogYnVpbGRWYXJpYWJsZUxlYWYocGF5bG9hZC5zZi5zeW1ib2wsIHBheWxvYWQuc2YubmFtZSwgcGF5bG9hZC5tYXRlcmlhbC5uYW1lKSxcbiAgICAgIGNvbGxlY3Rpb24sXG4gICAgICBcIlNUUklOR1wiXG4gICAgKTtcbiAgICBsb2coXCJjcmVhdGVQYWlyIHZhcmlhYmxlIGNyZWF0ZWRcIiwgdmFyaWFibGUuaWQpO1xuICAgIGFwcGx5VmFyaWFibGVHcm91cCh2YXJpYWJsZSwgcGF5bG9hZC5ncm91cElkID8/IG51bGwpO1xuICAgIHZhcmlhYmxlLnNjb3BlcyA9IFtcIlRFWFRfQ09OVEVOVFwiXTtcbiAgICBwYXlsb2FkLnNmTW9kZUlkcy5mb3JFYWNoKChtb2RlSWQpID0+XG4gICAgICB2YXJpYWJsZS5zZXRWYWx1ZUZvck1vZGUobW9kZUlkLCBwYXlsb2FkLnNmLnN5bWJvbClcbiAgICApO1xuICAgIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzLmZvckVhY2goKG1vZGVJZCkgPT5cbiAgICAgIHZhcmlhYmxlLnNldFZhbHVlRm9yTW9kZShtb2RlSWQsIHBheWxvYWQubWF0ZXJpYWwubmFtZSlcbiAgICApO1xuICAgIHZhcmlhYmxlLmRlc2NyaXB0aW9uID0gYnVpbGRLZXl3b3JkRGVzY3JpcHRpb24ocGF5bG9hZC5zZiwgcGF5bG9hZC5tYXRlcmlhbCk7XG5cbiAgICBsb2coXCJjcmVhdGVQYWlyIHZhcmlhYmxlIGNvbmZpZ3VyZWRcIiwge1xuICAgICAgaWQ6IHZhcmlhYmxlLmlkLFxuICAgICAgbmFtZTogdmFyaWFibGUubmFtZSxcbiAgICB9KTtcbiAgICBhd2FpdCB1cHNlcnRQYWlyUGx1Z2luRGF0YSh2YXJpYWJsZSk7XG4gICAgcmV0dXJuIHNlcmlhbGl6ZVBhaXIodmFyaWFibGUsIHBheWxvYWQuc2ZNb2RlSWRzLCBwYXlsb2FkLm1hdGVyaWFsTW9kZUlkcyk7XG4gIH1cbik7XG5cblBMVUdJTl9DSEFOTkVMLnJlZ2lzdGVyTWVzc2FnZUhhbmRsZXIoXG4gIFwidXBkYXRlUGFpclwiLFxuICBhc3luYyAocGF5bG9hZDogVXBkYXRlUGFpclJlcXVlc3QpID0+IHtcbiAgICBsb2coXCJ1cGRhdGVQYWlyXCIsIHBheWxvYWQpO1xuICAgIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgICBpZiAoIXJlc29sdmVDYW5Xcml0ZShsb2NhbENvbGxlY3Rpb25zLmxlbmd0aCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIlRoaXMgZmlsZSBpcyByZWFkLW9ubHkuIE9wZW4gdGhlIHNvdXJjZSB2YXJpYWJsZSBmaWxlIHRvIGVkaXQgcGFpcnMuXCIpO1xuICAgIH1cbiAgICBjb25zdCB2YXJpYWJsZSA9IGF3YWl0IGZpZ21hLnZhcmlhYmxlcy5nZXRWYXJpYWJsZUJ5SWRBc3luYyhcbiAgICAgIHBheWxvYWQudmFyaWFibGVJZFxuICAgICk7XG4gICAgaWYgKCF2YXJpYWJsZSkgdGhyb3cgbmV3IEVycm9yKFwiVmFyaWFibGUgbm90IGZvdW5kLlwiKTtcbiAgICBpZiAodmFyaWFibGUucmVzb2x2ZWRUeXBlICE9PSBcIlNUUklOR1wiKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJPbmx5IFNUUklORyB2YXJpYWJsZXMgY2FuIGJlIHVwZGF0ZWQuXCIpO1xuICAgIH1cbiAgICBpZiAodmFyaWFibGUudmFyaWFibGVDb2xsZWN0aW9uSWQgIT09IHBheWxvYWQuY29sbGVjdGlvbklkKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW5ub3QgbW92ZSB2YXJpYWJsZSB0byBhIGRpZmZlcmVudCBjb2xsZWN0aW9uLlwiKTtcbiAgICB9XG5cbiAgICBjb25zdCBjb2xsZWN0aW9uID0gYXdhaXQgZW5zdXJlQ29sbGVjdGlvbihwYXlsb2FkLmNvbGxlY3Rpb25JZCk7XG4gICAgZW5zdXJlTW9kZXMoY29sbGVjdGlvbiwgcGF5bG9hZC5zZk1vZGVJZHMsIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzKTtcblxuICAgIGNvbnN0IGN1cnJlbnRHcm91cElkID0gcmVhZFZhcmlhYmxlR3JvdXBJZCh2YXJpYWJsZSk7XG4gICAgY29uc3QgdGFyZ2V0R3JvdXAgPSBwYXlsb2FkLmdyb3VwSWQgPz8gY3VycmVudEdyb3VwSWQgPz8gbnVsbDtcbiAgICBpZiAoKHRhcmdldEdyb3VwID8/IG51bGwpICE9PSAoY3VycmVudEdyb3VwSWQgPz8gbnVsbCkpIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcihcIkdyb3VwIGNhbm5vdCBiZSBjaGFuZ2VkIGZvciBhbiBleGlzdGluZyBwYWlyLlwiKTtcbiAgICB9XG5cbiAgICAvLyBSZS1hcHBseSB0byBlbnN1cmUgcGx1Z2luRGF0YS9hc3NpZ25tZW50IGlzIHNldFxuICAgIGFwcGx5VmFyaWFibGVHcm91cCh2YXJpYWJsZSwgdGFyZ2V0R3JvdXApO1xuXG4gICAgdmFyaWFibGUubmFtZSA9IHRhcmdldEdyb3VwXG4gICAgICA/IGAke3RhcmdldEdyb3VwfS8ke2J1aWxkVmFyaWFibGVMZWFmKFxuICAgICAgICAgIHBheWxvYWQuc2Yuc3ltYm9sLFxuICAgICAgICAgIHBheWxvYWQuc2YubmFtZSxcbiAgICAgICAgICBwYXlsb2FkLm1hdGVyaWFsLm5hbWVcbiAgICAgICAgKX1gXG4gICAgICA6IGJ1aWxkVmFyaWFibGVMZWFmKHBheWxvYWQuc2Yuc3ltYm9sLCBwYXlsb2FkLnNmLm5hbWUsIHBheWxvYWQubWF0ZXJpYWwubmFtZSk7XG4gICAgcGF5bG9hZC5zZk1vZGVJZHMuZm9yRWFjaCgobW9kZUlkKSA9PlxuICAgICAgdmFyaWFibGUuc2V0VmFsdWVGb3JNb2RlKG1vZGVJZCwgcGF5bG9hZC5zZi5zeW1ib2wpXG4gICAgKTtcbiAgICBwYXlsb2FkLm1hdGVyaWFsTW9kZUlkcy5mb3JFYWNoKChtb2RlSWQpID0+XG4gICAgICB2YXJpYWJsZS5zZXRWYWx1ZUZvck1vZGUobW9kZUlkLCBwYXlsb2FkLm1hdGVyaWFsLm5hbWUpXG4gICAgKTtcbiAgICB2YXJpYWJsZS5kZXNjcmlwdGlvbiA9IGJ1aWxkS2V5d29yZERlc2NyaXB0aW9uKHBheWxvYWQuc2YsIHBheWxvYWQubWF0ZXJpYWwpO1xuICAgIHZhcmlhYmxlLnNjb3BlcyA9IFtcIlRFWFRfQ09OVEVOVFwiXTtcblxuICAgIGF3YWl0IHVwc2VydFBhaXJQbHVnaW5EYXRhKHZhcmlhYmxlKTtcbiAgICByZXR1cm4gc2VyaWFsaXplUGFpcih2YXJpYWJsZSwgcGF5bG9hZC5zZk1vZGVJZHMsIHBheWxvYWQubWF0ZXJpYWxNb2RlSWRzKTtcbiAgfVxuKTtcblxuUExVR0lOX0NIQU5ORUwucmVnaXN0ZXJNZXNzYWdlSGFuZGxlcihcImRlbGV0ZVBhaXJcIiwgYXN5bmMgKHZhcmlhYmxlSWQpID0+IHtcbiAgbG9nKFwiZGVsZXRlUGFpclwiLCB7IHZhcmlhYmxlSWQgfSk7XG4gIGNvbnN0IGxvY2FsQ29sbGVjdGlvbnMgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0TG9jYWxWYXJpYWJsZUNvbGxlY3Rpb25zQXN5bmMoKTtcbiAgaWYgKCFyZXNvbHZlQ2FuV3JpdGUobG9jYWxDb2xsZWN0aW9ucy5sZW5ndGgpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKFwiVGhpcyBmaWxlIGlzIHJlYWQtb25seS4gT3BlbiB0aGUgc291cmNlIHZhcmlhYmxlIGZpbGUgdG8gZWRpdCBwYWlycy5cIik7XG4gIH1cbiAgY29uc3QgdmFyaWFibGUgPSBhd2FpdCBmaWdtYS52YXJpYWJsZXMuZ2V0VmFyaWFibGVCeUlkQXN5bmModmFyaWFibGVJZCk7XG4gIGlmICghdmFyaWFibGUpIHJldHVybjtcbiAgdmFyaWFibGUucmVtb3ZlKCk7XG4gIGF3YWl0IHJlbW92ZVBhaXJQbHVnaW5EYXRhKHZhcmlhYmxlKTtcbn0pO1xuIiwiaW1wb3J0IHsgUExVR0lOLCBVSSB9IGZyb20gXCJAY29tbW9uL25ldHdvcmtTaWRlc1wiO1xuaW1wb3J0IHtcbiAgaXNTb3VyY2VXcml0ZU1vZGUsXG4gIFBMVUdJTl9DSEFOTkVMLFxuICBzbmFwc2hvdFBhaXJzUGx1Z2luRGF0YSxcbiAgc3RhcnRTZWxlY3Rpb25XYXRjaGVyLFxufSBmcm9tIFwiQHBsdWdpbi9wbHVnaW4ubmV0d29ya1wiO1xuaW1wb3J0IHsgTmV0d29ya2VyIH0gZnJvbSBcIm1vbm9yZXBvLW5ldHdvcmtlclwiO1xuXG5hc3luYyBmdW5jdGlvbiBib290c3RyYXAoKSB7XG4gIE5ldHdvcmtlci5pbml0aWFsaXplKFBMVUdJTiwgUExVR0lOX0NIQU5ORUwpO1xuXG4gIGZpZ21hLnNob3dVSShfX2h0bWxfXywge1xuICAgIHdpZHRoOiAzMjAsXG4gICAgaGVpZ2h0OiA2NjAsXG4gICAgdGhlbWVDb2xvcnM6IHRydWUsXG4gIH0pO1xuXG4gIHN0YXJ0U2VsZWN0aW9uV2F0Y2hlcigpO1xuICBpZiAoYXdhaXQgaXNTb3VyY2VXcml0ZU1vZGUoKSkge1xuICAgIHNuYXBzaG90UGFpcnNQbHVnaW5EYXRhKCkuY2F0Y2goKGVycikgPT5cbiAgICAgIGNvbnNvbGUud2FybihcIkZhaWxlZCB0byBzbmFwc2hvdCBwbHVnaW4gZGF0YVwiLCBlcnIpXG4gICAgKTtcbiAgfVxuXG4gIGNvbnNvbGUubG9nKFwiQm9vdHN0cmFwcGVkIEBcIiwgTmV0d29ya2VyLmdldEN1cnJlbnRTaWRlKCkubmFtZSk7XG59XG5cbmJvb3RzdHJhcCgpO1xuIl0sIm5hbWVzIjpbIk5ldHdvcmtlciIsImciLCJwIiwiX2EiLCJfYiIsIl9jIl0sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsSUFBSSxJQUFJLE9BQU87QUFDZixJQUFJLElBQUksQ0FBQyxHQUFHLEdBQUcsTUFBTSxLQUFLLElBQUksRUFBRSxHQUFHLEdBQUcsRUFBRSxZQUFZLE1BQUksY0FBYyxNQUFJLFVBQVUsTUFBSSxPQUFPLEVBQUMsQ0FBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJO0FBQzdHLElBQUksSUFBSSxDQUFDLEdBQUcsR0FBRyxPQUFPLEVBQUUsR0FBRyxPQUFPLEtBQUssV0FBVyxJQUFJLEtBQUssR0FBRyxDQUFDLEdBQUc7QUFDbEUsSUFBSSxJQUFJLENBQUMsR0FBRyxHQUFHLE1BQU0sSUFBSSxRQUFRLENBQUMsR0FBRyxNQUFNO0FBQ3pDLE1BQUksSUFBSSxDQUFDLE1BQU07QUFDYixRQUFJO0FBQ0YsUUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO0FBQUEsSUFDYixTQUFTLEdBQUc7QUFDVixRQUFFLENBQUM7QUFBQSxJQUNMO0FBQUEsRUFDRixHQUFHLElBQUksQ0FBQyxNQUFNO0FBQ1osUUFBSTtBQUNGLFFBQUUsRUFBRSxNQUFNLENBQUMsQ0FBQztBQUFBLElBQ2QsU0FBUyxHQUFHO0FBQ1YsUUFBRSxDQUFDO0FBQUEsSUFDTDtBQUFBLEVBQ0YsR0FBRyxJQUFJLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxFQUFFLEtBQUssSUFBSSxRQUFRLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxHQUFHLENBQUM7QUFDdEUsS0FBRyxJQUFJLEVBQUUsTUFBTSxHQUFHLENBQUMsR0FBRyxNQUFNO0FBQzlCLENBQUM7QUFDRCxNQUFNLFVBQVUsTUFBTTtBQUFBLEVB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
