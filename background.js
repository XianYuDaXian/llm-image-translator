import "./common.js";

const {
  DEFAULT_SETTINGS,
  MESSAGE_TYPES,
  mergeSettings,
  safeJsonParse,
  normalizeBaseUrl,
  buildSettingsSignature,
  maskSecret,
  normalizeCacheEntry,
  t
} = globalThis.AppShared;

const state = {
  settings: { ...DEFAULT_SETTINGS },
  queue: [],
  runningCount: 0,
  tasks: new Map(),
  taskWaiters: new Map(),
  autoTranslateTabs: new Set()
};

const CONTEXT_MENU_TRANSLATE_IMAGE = "itx_translate_image";
const IMAGE_CACHE_DB_NAME = "llm-image-translator-cache";
const IMAGE_CACHE_DB_VERSION = 1;
const IMAGE_CACHE_STORE_NAME = "images";
void initializeExtension();

async function initializeExtension() {
  await ensureSettings();
  await ensureContextMenu();
}

chrome.runtime.onInstalled.addListener(async () => {
  await initializeExtension();
  if (chrome.sidePanel?.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  }
});

chrome.runtime.onStartup?.addListener(async () => {
  await initializeExtension();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_TRANSLATE_IMAGE || !tab?.id || !info.srcUrl) {
    return;
  }
  void handleContextTranslateImage(info.srcUrl, tab.id);
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes.settings) {
    state.settings = mergeSettings(changes.settings.newValue);
    broadcastState();
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  if (state.autoTranslateTabs.delete(tabId)) {
    broadcastState();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((error) => sendResponse({ ok: false, error: serializeError(error) }));
  return true;
});

async function handleMessage(message, sender) {
  await ensureSettings();

  switch (message.type) {
    case MESSAGE_TYPES.GET_APP_STATE:
      return buildAppState();
    case MESSAGE_TYPES.SETTINGS_UPDATED:
      return saveSettings(message.payload);
    case MESSAGE_TYPES.TEST_API_CONNECTIVITY:
      return testConnectivity(message.payload || state.settings);
    case MESSAGE_TYPES.TEST_MODEL_CAPABILITY:
      return testCapability(message.payload || state.settings);
    case MESSAGE_TYPES.AUTO_DETECT_ENDPOINT_MODE:
      return autoDetectEndpoint(message.payload || state.settings);
    case MESSAGE_TYPES.RESOLVE_IMAGE_FOR_DISPLAY:
      return resolveImageForDisplay(message.payload?.cacheEntry);
    case MESSAGE_TYPES.SET_AUTO_TRANSLATE_TAB:
      return setAutoTranslateTabState(message.payload, sender.tab?.id);
    case MESSAGE_TYPES.GET_AUTO_TRANSLATE_TAB_STATE:
      return getAutoTranslateTabState(sender.tab?.id ?? message.payload?.tabId);
    case MESSAGE_TYPES.TRANSLATE_SINGLE_IMAGE:
      return enqueueTask({
        ...message.payload,
        tabId: sender.tab?.id ?? message.payload?.tabId
      }, { waitForCompletion: true });
    case MESSAGE_TYPES.START_TRANSLATE_QUEUE:
      return enqueueBatch({
        ...message.payload,
        tabId: sender.tab?.id ?? message.payload?.tabId
      }, { waitForCompletion: true });
    case MESSAGE_TYPES.RESTORE_IMAGE:
      return restoreSingleImage(message.payload, sender.tab?.id);
    case MESSAGE_TYPES.RESTORE_ALL_IMAGES:
      return restoreAllImages(sender.tab?.id ?? message.payload?.tabId);
    default:
      throw new Error(t("errorUnknownMessageType", { type: message.type }));
  }
}

async function ensureContextMenu() {
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({
    id: CONTEXT_MENU_TRANSLATE_IMAGE,
    title: t("contextTranslateImage"),
    contexts: ["image"],
    documentUrlPatterns: ["<all_urls>"]
  });
}

async function ensureSettings() {
  const stored = await chrome.storage.local.get("settings");
  state.settings = mergeSettings(stored.settings);
  if (!stored.settings) {
    await chrome.storage.local.set({ settings: state.settings });
  }
  return state.settings;
}

async function saveSettings(payload) {
  state.settings = mergeSettings(payload);
  await chrome.storage.local.set({ settings: state.settings });
  broadcastState();
  return { settings: state.settings };
}

function serializeError(error) {
  return {
    message: error?.message || t("errorUnknown"),
    code: error?.code || "",
    stack: error?.stack || ""
  };
}

function buildAppState() {
  return {
    settings: state.settings,
    queue: Array.from(state.tasks.values()),
    runningCount: state.runningCount,
    autoTranslateTabs: Array.from(state.autoTranslateTabs)
  };
}

async function handleContextTranslateImage(srcUrl, tabId) {
  const response = await chrome.tabs.sendMessage(tabId, {
    type: MESSAGE_TYPES.FIND_IMAGE_FOR_TRANSLATE,
    payload: { imageUrl: srcUrl, ignoreExclusions: true }
  }).catch((error) => ({ ok: false, error }));

  const result = response?.result || response;
  if (!result?.imageId || !result?.imageUrl) {
    return;
  }

  await enqueueTask({
    tabId,
    imageId: result.imageId,
    imageUrl: result.imageUrl,
    pageUrl: result.pageUrl || ""
  });
}

async function setAutoTranslateTabState(payload, senderTabId) {
  const tabId = payload?.tabId ?? senderTabId;
  if (!tabId) {
    throw new Error(t("errorMissingTabId"));
  }
  if (payload?.enabled) {
    state.autoTranslateTabs.add(tabId);
  } else {
    state.autoTranslateTabs.delete(tabId);
  }
  chrome.tabs.sendMessage(tabId, {
    type: MESSAGE_TYPES.AUTO_TRANSLATE_STATE_CHANGED,
    payload: { enabled: Boolean(payload?.enabled), tabId }
  }).catch(() => {});
  broadcastState();
  return { tabId, enabled: state.autoTranslateTabs.has(tabId) };
}

function getAutoTranslateTabState(tabId) {
  return { tabId, enabled: tabId ? state.autoTranslateTabs.has(tabId) : false };
}

function isGeminiFamily(providerType) {
  return providerType === "gemini_official_image" || providerType === "gemini_compatible_image";
}

function isOpenAiFamily(providerType) {
  return providerType === "openai_official_image" || providerType === "openai_compatible_image";
}

function isXaiImagesApi(settings) {
  try {
    const endpoint = buildEndpoint(settings, settings.endpointMode);
    const url = new URL(endpoint);
    return url.hostname === "api.x.ai" && settings.endpointMode === "images";
  } catch {
    return false;
  }
}

function resolveRequestFormat(settings) {
  if (isGeminiFamily(settings.providerType)) {
    return "gemini_inline_data";
  }
  if (settings.requestFormat && settings.requestFormat !== "auto") {
    return settings.requestFormat;
  }
  if (settings.providerType === "xai_compatible_image" || isXaiImagesApi(settings)) {
    return "json_image_url";
  }
  if (settings.endpointMode === "images" || settings.endpointMode === "custom" || settings.providerType === "openai_official_image") {
    return "multipart_form";
  }
  return "json_image_url";
}

function buildHeaders(settings, contentType = "application/json") {
  const headers = new Headers();
  if (contentType) {
    headers.set("Content-Type", contentType);
  }

  if (isGeminiFamily(settings.providerType)) {
    if (settings.apiKey) {
      headers.set("x-goog-api-key", settings.apiKey);
    }
  } else if (settings.apiKey) {
    headers.set("Authorization", `Bearer ${settings.apiKey}`);
  }

  const customHeaders = Array.isArray(settings.customHeaders)
    ? settings.customHeaders
    : safeJsonParse(settings.customHeaders || "[]", []);
  if (settings.providerType === "openai_official_image" || settings.providerType === "gemini_official_image") {
    return headers;
  }
  for (const item of customHeaders) {
    if (item?.name && item?.value) {
      headers.set(item.name, item.value);
    }
  }
  return headers;
}

function buildEndpoint(settings, mode = settings.endpointMode) {
  if (isGeminiFamily(settings.providerType)) {
    const fallbackBaseUrl = settings.providerType === "gemini_official_image"
      ? "https://generativelanguage.googleapis.com"
      : settings.baseUrl;
    const baseUrl = normalizeBaseUrl(fallbackBaseUrl || "https://generativelanguage.googleapis.com");
    return `${baseUrl}/v1beta/models/${settings.model}:generateContent`;
  }

  if (isOpenAiFamily(settings.providerType)) {
    const baseUrl = normalizeBaseUrl(settings.baseUrl || "https://api.openai.com");
    const pathMap = {
      responses: "/v1/responses",
      images: "/v1/images/edits",
      chat: "/v1/chat/completions"
    };
    return `${baseUrl}${pathMap[mode] || pathMap.images}`;
  }

  const baseUrl = normalizeBaseUrl(settings.baseUrl);
  if (settings.providerType === "custom_endpoint" || mode === "custom") {
    const path = (settings.customPath || "").trim();
    if (!path) {
      throw new Error(t("errorCustomPathRequired"));
    }
    if (/^https?:\/\//i.test(path)) {
      return path;
    }
    return `${baseUrl}/${path.replace(/^\/+/, "")}`;
  }

  const pathMap = {
    responses: "/v1/responses",
    images: "/v1/images/edits",
    chat: "/v1/chat/completions"
  };
  return `${baseUrl}${pathMap[mode]}`;
}

function buildFinalPrompt(settings) {
  const targetLanguage = settings.targetLanguage === "auto"
    ? chrome.i18n?.getUILanguage?.() || t("currentBrowserLanguage")
    : settings.targetLanguage;
  return `${settings.translatePromptTemplate}\n${t("promptTargetLanguage")}：${targetLanguage}`;
}

function buildRequestPreview(settings, mode = settings.endpointMode) {
  const endpoint = buildEndpoint(settings, mode);
  const requestFormat = resolveRequestFormat(settings);
  const shouldUseMultipart = requestFormat === "multipart_form";
  const headers = Object.fromEntries(buildHeaders(settings, shouldUseMultipart ? null : "application/json").entries());
  if (headers.Authorization || headers.authorization) {
    headers.Authorization = `Bearer ${maskSecret(settings.apiKey)}`;
    delete headers.authorization;
  }
  if (headers["x-goog-api-key"]) {
    headers["x-goog-api-key"] = maskSecret(settings.apiKey);
  }

  const prompt = buildFinalPrompt(settings);
  let body;
  if (isGeminiFamily(settings.providerType)) {
    body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: prompt },
            { inline_data: { mime_type: "image/png", data: "<base64-data>" } }
          ]
        }
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"]
      }
    };
  } else if (mode === "responses") {
    body = {
      model: settings.model,
      input: [
        {
          role: "user",
          content: [
            { type: "input_text", text: prompt },
            { type: "input_image", image_url: "<image-data-or-url>" }
          ]
        }
      ]
    };
  } else if (mode === "chat") {
    body = {
      model: settings.model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: "<image-data-or-url>" } }
          ]
        }
      ]
    };
  } else {
    body = requestFormat === "json_image_url"
      ? {
          model: settings.model,
          prompt,
          image: {
            url: "<image-data-or-url>",
            type: "image_url"
          }
        }
      : {
          model: settings.model,
          prompt,
          image: "<multipart-binary>"
        };
  }

  return {
    endpoint,
    method: "POST",
    headers,
    body
  };
}

function validateRequiredSettings(settings, requireModel) {
  if (!settings.baseUrl) {
    throw new Error(t("errorBaseUrlRequired"));
  }
  if (!settings.apiKey) {
    throw new Error(t("errorApiKeyRequired"));
  }
  if (settings.providerType === "custom_endpoint" && !settings.customPath) {
    throw new Error(t("errorCustomEndpointPathRequired"));
  }
  if (requireModel && !settings.model) {
    throw new Error(t("errorModelRequired"));
  }
}

function buildConnectivityProbeBody(settings) {
  if (isGeminiFamily(settings.providerType)) {
    return {
      contents: [
        {
          role: "user",
          parts: [{ text: t("probeReplyOk") }]
        }
      ]
    };
  }
  if (settings.endpointMode === "responses") {
    return {
      model: settings.model,
      input: [{ role: "user", content: [{ type: "input_text", text: t("probeReplyOk") }] }]
    };
  }
  if (settings.endpointMode === "chat") {
    return {
      model: settings.model,
      messages: [{ role: "user", content: t("probeReplyOk") }],
      max_tokens: 8
    };
  }
  if (resolveRequestFormat(settings) === "json_image_url") {
    return {
      model: settings.model,
      prompt: t("probeReturnImage"),
      image: {
        url: createProbeImageDataUrl(),
        type: "image_url"
      }
    };
  }
  return {
    model: settings.model,
    prompt: t("probeReplyOk")
  };
}

function buildConnectivityProbeRequest(settings, signal) {
  if (isGeminiFamily(settings.providerType) || settings.endpointMode === "responses" || settings.endpointMode === "chat") {
    return {
      method: "POST",
      headers: buildHeaders(settings),
      body: JSON.stringify(buildConnectivityProbeBody(settings)),
      signal
    };
  }

  const requestFormat = resolveRequestFormat(settings);
  if (requestFormat === "json_image_url") {
    return {
      method: "POST",
      headers: buildHeaders(settings),
      body: JSON.stringify(buildConnectivityProbeBody(settings)),
      signal
    };
  }

  const formData = new FormData();
  formData.set("model", settings.model);
  formData.set("prompt", t("probeReturnImage"));
  formData.set("image", dataUrlToBlob(createProbeImageDataUrl()), "probe.png");
  return {
    method: "POST",
    headers: buildHeaders(settings, null),
    body: formData,
    signal
  };
}

function buildHttpErrorMessage(status) {
  if (status === 401 || status === 403) {
    return t("errorHttpAuth");
  }
  if (status === 404) {
    return t("errorHttpNotFound");
  }
  if (status === 429) {
    return t("errorHttpRateLimit");
  }
  if (status >= 500) {
    return t("errorHttpServer");
  }
  return t("errorHttpGeneric", { status });
}

function buildSuggestionByStatus(status) {
  if (status === 401 || status === 403) {
    return t("suggestionAuth");
  }
  if (status === 404) {
    return t("suggestionNotFound");
  }
  if (status === 429) {
    return t("suggestionRateLimit");
  }
  if (status >= 500) {
    return t("suggestionServer");
  }
  return t("suggestionRequestShape");
}

function truncateText(text, limit) {
  if (!text) {
    return "";
  }
  return text.length > limit ? `${text.slice(0, limit)}...` : text;
}

function createProbeImageDataUrl() {
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4////fwAJ+wP9Dn1n8wAAAABJRU5ErkJggg==";
}

async function fetchExtensionImageAsDataUrl(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(t("errorReadTestImageFailed"));
  }
  return blobToDataUrl(await response.blob());
}

function dataUrlToBlob(dataUrl) {
  const [meta, base64] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] || "application/octet-stream";
  const bytes = Uint8Array.from(atob(base64), (item) => item.charCodeAt(0));
  return new Blob([bytes], { type: mime });
}

function extractTextResult(payload) {
  if (!payload) {
    return "";
  }
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }
  const choice = payload.choices?.[0]?.message?.content;
  if (typeof choice === "string") {
    return choice;
  }
  return "";
}

function extractImageResult(payload, customResponseImagePath = "") {
  const customResult = extractImageResultFromCustomPath(payload, customResponseImagePath);
  if (customResult) {
    return customResult;
  }
  if (Array.isArray(payload?.candidates)) {
    for (const candidate of payload.candidates) {
      for (const part of candidate?.content?.parts || []) {
        if (typeof part?.inlineData?.data === "string") {
          return { kind: "b64_json", value: part.inlineData.data };
        }
        if (typeof part?.inline_data?.data === "string") {
          return { kind: "b64_json", value: part.inline_data.data };
        }
      }
    }
  }

  if (Array.isArray(payload?.data)) {
    for (const item of payload.data) {
      if (item?.b64_json) {
        return { kind: "b64_json", value: item.b64_json };
      }
      if (item?.url) {
        return { kind: "url", value: item.url };
      }
    }
  }

  if (Array.isArray(payload?.output)) {
    for (const block of payload.output) {
      for (const item of block?.content || []) {
        if (item?.type === "output_image" && item?.image_url) {
          return { kind: "url", value: item.image_url };
        }
        if (item?.type === "output_image" && item?.b64_json) {
          return { kind: "b64_json", value: item.b64_json };
        }
      }
    }
  }

  if (payload?.image_url) {
    return { kind: "url", value: payload.image_url };
  }
  if (payload?.b64_json) {
    return { kind: "b64_json", value: payload.b64_json };
  }

  const markdownResult = extractMarkdownImageFromPayload(payload);
  if (markdownResult) {
    return markdownResult;
  }

  return null;
}

function extractImageResultFromCustomPath(payload, path) {
  if (!payload || !path) {
    return null;
  }
  const value = readValueByPath(payload, path);
  return normalizeImageCandidate(value);
}

function extractMarkdownImageFromPayload(payload) {
  const textCandidates = [];
  collectTextCandidates(payload, textCandidates, 0);
  for (const candidate of textCandidates) {
    const match = extractMarkdownImageUrl(candidate);
    if (match) {
      return { kind: "url", value: match };
    }
  }
  return null;
}

function collectTextCandidates(value, bucket, depth) {
  if (depth > 6 || bucket.length > 30 || value == null) {
    return;
  }
  if (typeof value === "string") {
    bucket.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectTextCandidates(item, bucket, depth + 1);
    }
    return;
  }
  if (typeof value === "object") {
    for (const item of Object.values(value)) {
      collectTextCandidates(item, bucket, depth + 1);
    }
  }
}

function extractMarkdownImageUrl(text) {
  if (!text) {
    return "";
  }
  const markdownMatch = text.match(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/i);
  if (markdownMatch?.[1]) {
    return markdownMatch[1];
  }
  const plainMatch = text.match(/https?:\/\/\S+\.(?:png|jpg|jpeg|webp|gif)(?:\?\S*)?/i);
  return plainMatch?.[0] || "";
}

function readValueByPath(payload, path) {
  const normalized = path.replace(/\[(\d+)\]/g, ".$1").split(".").filter(Boolean);
  let current = payload;
  for (const segment of normalized) {
    if (current == null) {
      return null;
    }
    current = current[segment];
  }
  return current;
}

function normalizeImageCandidate(value) {
  if (!value) {
    return null;
  }
  if (typeof value === "string") {
    if (/^data:image\//i.test(value)) {
      return { kind: "url", value };
    }
    if (/^https?:\/\//i.test(value)) {
      return { kind: "url", value };
    }
    const markdownUrl = extractMarkdownImageUrl(value);
    if (markdownUrl) {
      return { kind: "url", value: markdownUrl };
    }
    if (/^[A-Za-z0-9+/=\s]+$/.test(value) && value.length > 128) {
      return { kind: "b64_json", value: value.replace(/\s+/g, "") };
    }
    return null;
  }
  if (typeof value === "object") {
    if (typeof value.url === "string") {
      return { kind: "url", value: value.url };
    }
    if (typeof value.image_url === "string") {
      return { kind: "url", value: value.image_url };
    }
    if (typeof value.b64_json === "string") {
      return { kind: "b64_json", value: value.b64_json };
    }
  }
  return null;
}

async function testConnectivity(rawSettings) {
  const settings = mergeSettings(rawSettings);
  validateRequiredSettings(settings, false);
  const preview = buildRequestPreview(settings);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), settings.requestTimeoutMs);

  try {
    const response = await fetch(preview.endpoint, buildConnectivityProbeRequest(settings, controller.signal));
    const text = await response.text();
    const parsed = safeJsonParse(text, null);
    const result = {
      ok: response.ok,
      endpointResolved: preview.endpoint,
      modelResolved: settings.model,
      httpStatus: response.status,
      canChat: settings.endpointMode === "chat",
      canImage: settings.endpointMode === "images" || settings.endpointMode === "responses",
      canImageEdit: settings.endpointMode === "images",
      canImageToImage: false,
      errorCode: response.ok ? "" : `HTTP_${response.status}`,
      errorMessage: response.ok ? "" : buildHttpErrorMessage(response.status),
      suggestion: response.ok ? t("suggestionConnectivityPassed") : buildSuggestionByStatus(response.status),
      preview,
      responseSample: parsed || truncateText(text, 800)
    };
    await persistTestResult("lastConnectivityTestResult", settings, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      endpointResolved: preview.endpoint,
      modelResolved: settings.model,
      httpStatus: 0,
      canChat: false,
      canImage: false,
      canImageEdit: false,
      canImageToImage: false,
      errorCode: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
      errorMessage: error.name === "AbortError" ? t("errorRequestTimeout") : (error.message || t("errorNetworkFailed")),
      suggestion: t("suggestionCheckNetwork"),
      preview,
      responseSample: null
    };
    await persistTestResult("lastConnectivityTestResult", settings, result);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function testCapability(rawSettings) {
  const settings = mergeSettings(rawSettings);
  validateRequiredSettings(settings, true);
  const preview = buildRequestPreview(settings);
  const originalTestImageUrl = chrome.runtime.getURL("testimage.png");
  const imageDataUrl = await fetchExtensionImageAsDataUrl(originalTestImageUrl);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), settings.requestTimeoutMs);

  try {
    const request = await buildCapabilityRequest(settings, imageDataUrl, controller.signal);
    const response = await fetch(buildEndpoint(settings), request);
    const result = await parseCapabilityResponse(response, settings, preview);
    result.originalTestImageUrl = originalTestImageUrl;
    await persistTestResult("lastCapabilityTestResult", settings, result);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      endpointResolved: preview.endpoint,
      modelResolved: settings.model,
      originalTestImageUrl,
      capabilities: {
        canChat: settings.endpointMode === "chat",
        canImage: settings.endpointMode === "images" || settings.endpointMode === "responses",
        canImageEdit: settings.endpointMode === "images",
        canImageToImage: false
      },
      errorCode: error.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
      errorMessage: error.name === "AbortError" ? t("errorCapabilityTimeout") : (error.message || t("errorCapabilityFailed")),
      suggestion: t("suggestionCapabilitySupport"),
      preview
    };
    await persistTestResult("lastCapabilityTestResult", settings, result);
    return result;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function autoDetectEndpoint(rawSettings) {
  const settings = mergeSettings(rawSettings);
  if (isGeminiFamily(settings.providerType)) {
    const connectivity = await testConnectivity(settings);
    const capability = connectivity.ok ? await testCapability(settings) : null;
    return {
      ok: Boolean(capability?.ok || connectivity?.ok),
      recommendedMode: settings.providerType,
      reports: [{ mode: settings.providerType, connectivity, capability }],
      suggestion: capability?.ok
        ? t("suggestionGeminiPassed")
        : (capability?.suggestion || connectivity?.suggestion || t("suggestionGeminiFailed"))
    };
  }

  if (settings.providerType === "custom_endpoint") {
    const current = { ...settings, endpointMode: "custom" };
    const connectivity = await testConnectivity(current);
    const capability = connectivity.ok ? await testCapability(current) : null;
    return {
      ok: Boolean(capability?.ok || connectivity?.ok),
      recommendedMode: "custom",
      reports: [{ mode: "custom", connectivity, capability }],
      suggestion: capability?.ok
        ? t("suggestionCustomPassed")
        : (capability?.suggestion || connectivity?.suggestion || t("suggestionCustomFailed"))
    };
  }

  const reports = [];

  for (const mode of ["responses", "images", "chat", "custom"]) {
    if (mode === "custom" && !settings.customPath) {
      continue;
    }
    const next = { ...settings, endpointMode: mode };
    const connectivity = await testConnectivity(next);
    const capability = connectivity.ok ? await testCapability(next) : null;
    reports.push({ mode, connectivity, capability });
    if (capability?.ok && capability.capabilities?.canImageToImage) {
      return { ok: true, recommendedMode: mode, reports };
    }
  }

  const fallback = reports.find((item) => item.connectivity?.ok);
  return {
    ok: Boolean(fallback),
    recommendedMode: fallback?.mode || settings.endpointMode,
    reports,
    suggestion: fallback
      ? t("suggestionReachableButNoImage")
      : t("suggestionNoReachableEndpoint")
  };
}

async function buildCapabilityRequest(settings, imageDataUrl, signal) {
  const prompt = buildFinalPrompt(settings);
  if (isGeminiFamily(settings.providerType)) {
    const [meta, base64] = String(imageDataUrl).split(",");
    const mimeType = meta.match(/data:(.*?);base64/)?.[1] || "image/png";
    return {
      method: "POST",
      headers: buildHeaders(settings),
      signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: mimeType,
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          responseModalities: ["TEXT", "IMAGE"]
        }
      })
    };
  }

  if (settings.endpointMode === "responses") {
    return {
      method: "POST",
      headers: buildHeaders(settings),
      signal,
      body: JSON.stringify({
        model: settings.model,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: imageDataUrl }
            ]
          }
        ]
      })
    };
  }

  if (settings.endpointMode === "chat") {
    return {
      method: "POST",
      headers: buildHeaders(settings),
      signal,
      body: JSON.stringify({
        model: settings.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } }
            ]
          }
        ]
      })
    };
  }

  if (resolveRequestFormat(settings) === "json_image_url") {
    return {
      method: "POST",
      headers: buildHeaders(settings),
      signal,
      body: JSON.stringify({
        model: settings.model,
        prompt,
        image: {
          url: imageDataUrl,
          type: "image_url"
        }
      })
    };
  }

  const formData = new FormData();
  formData.set("model", settings.model);
  formData.set("prompt", prompt);
  formData.set("image", dataUrlToBlob(imageDataUrl), "probe.png");
  return {
    method: "POST",
    headers: buildHeaders(settings, null),
    signal,
    body: formData
  };
}

async function parseCapabilityResponse(response, settings, preview) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok) {
    const text = await response.text();
    return {
      ok: false,
      endpointResolved: preview.endpoint,
      modelResolved: settings.model,
      capabilities: {
        canChat: settings.endpointMode === "chat",
        canImage: settings.endpointMode === "images" || settings.endpointMode === "responses",
        canImageEdit: settings.endpointMode === "images",
        canImageToImage: false
      },
      errorCode: `HTTP_${response.status}`,
      errorMessage: buildHttpErrorMessage(response.status),
      suggestion: buildSuggestionByStatus(response.status),
      preview,
      responseSample: truncateText(text, 800)
    };
  }

  if (contentType.startsWith("image/")) {
    const blob = await response.blob();
    return {
      ok: true,
      endpointResolved: preview.endpoint,
      modelResolved: settings.model,
      capabilities: {
        canChat: settings.endpointMode === "chat",
        canImage: true,
        canImageEdit: settings.endpointMode === "images",
        canImageToImage: true
      },
      imageResult: { type: "binary" },
      translatedPreviewUrl: await blobToDataUrl(blob),
      suggestion: t("suggestionCapabilityPassed"),
      preview
    };
  }

  const text = await response.text();
  const parsed = safeJsonParse(text, {});
  const imageResult = extractImageResult(parsed, settings.customResponseImagePath);
  const textResult = extractTextResult(parsed);
  return {
    ok: Boolean(imageResult),
    endpointResolved: preview.endpoint,
    modelResolved: settings.model,
    capabilities: {
      canChat: settings.endpointMode === "chat",
      canImage: settings.endpointMode === "images" || settings.endpointMode === "responses",
      canImageEdit: settings.endpointMode === "images",
      canImageToImage: Boolean(imageResult)
    },
    imageResult: imageResult ? { type: imageResult.kind } : null,
    translatedPreviewUrl: imageResult
      ? imageResult.kind === "url"
        ? imageResult.value
        : `data:image/png;base64,${imageResult.value}`
      : "",
    errorCode: imageResult ? "" : textResult ? "TEXT_ONLY" : "UNSUPPORTED_RESPONSE",
    errorMessage: imageResult ? "" : textResult ? t("errorTextOnlyResponse") : t("errorUnsupportedResponse"),
    suggestion: imageResult
      ? t("suggestionCapabilityPassed")
      : textResult
        ? t("suggestionSwitchImageModel")
        : t("suggestionCheckProviderFormat"),
    preview,
    responseSample: parsed
  };
}

async function persistTestResult(fieldName, settings, result) {
  state.settings = {
    ...state.settings,
    ...settings,
    [fieldName]: {
      ...result,
      signature: buildSettingsSignature(settings),
      checkedAt: new Date().toISOString()
    }
  };
  await chrome.storage.local.set({ settings: state.settings });
  broadcastState();
}

function buildTaskId(taskInput) {
  return taskInput.taskId || `${taskInput.tabId}:${taskInput.imageId}`;
}

function waitForTask(taskId) {
  const existing = state.taskWaiters.get(taskId);
  if (existing) {
    return existing.promise;
  }
  let resolve;
  const promise = new Promise((resolver) => {
    resolve = resolver;
  });
  state.taskWaiters.set(taskId, { promise, resolve });
  return promise;
}

function settleTask(task) {
  const waiter = state.taskWaiters.get(task.id);
  if (!waiter) {
    return;
  }
  waiter.resolve({
    id: task.id,
    status: task.status,
    errorMessage: task.errorMessage || "",
    resultUrl: task.resultUrl || "",
    cacheEntry: task.cacheEntry || null
  });
  state.taskWaiters.delete(task.id);
}

async function enqueueTask(taskInput, options = {}) {
  if (!taskInput?.tabId || !taskInput?.imageId || !taskInput?.imageUrl) {
    throw new Error(t("errorMissingTaskParams"));
  }

  const taskId = buildTaskId(taskInput);
  const existing = state.tasks.get(taskId);
  if (existing && (existing.status === "queued" || existing.status === "running")) {
    return options.waitForCompletion ? waitForTask(taskId) : existing;
  }

  const task = {
    id: taskId,
    tabId: taskInput.tabId,
    imageId: taskInput.imageId,
    imageUrl: taskInput.imageUrl,
    pageUrl: taskInput.pageUrl || "",
    status: "queued",
    attempts: existing?.attempts || 0,
    errorMessage: "",
    resultUrl: "",
    cacheEntry: null,
    createdAt: Date.now()
  };
  state.tasks.set(taskId, task);
  state.queue.push(taskId);
  broadcastState();
  processQueue();
  return options.waitForCompletion ? waitForTask(taskId) : task;
}

async function enqueueBatch(payload, options = {}) {
  const items = payload?.items || [];
  const taskIds = [];
  for (const item of items) {
    taskIds.push(buildTaskId({ ...item, tabId: payload.tabId }));
    await enqueueTask({ ...item, tabId: payload.tabId });
  }
  if (!options.waitForCompletion) {
    return { queued: items.length };
  }
  return Promise.all(taskIds.map((taskId) => waitForTask(taskId)));
}

async function processQueue() {
  while (state.runningCount < state.settings.concurrency && state.queue.length > 0) {
    const taskId = state.queue.shift();
    const task = state.tasks.get(taskId);
    if (!task) {
      continue;
    }

    state.runningCount += 1;
    task.status = "running";
    task.attempts += 1;
    broadcastTaskUpdate(task);

    runTask(task)
      .catch((error) => {
        task.status = "failed";
        task.errorMessage = error.message || "翻译失败";
        broadcastTaskUpdate(task);
        settleTask(task);
      })
      .finally(() => {
        state.runningCount -= 1;
        broadcastState();
        processQueue();
      });
  }
}

async function runTask(task) {
  const settings = await ensureSettings();
  const translated = await translateImage(task.imageUrl, settings);
  task.status = "completed";
  task.resultUrl = translated.displayUrl || "";
  task.cacheEntry = translated.cacheEntry || null;
  task.errorMessage = "";
  broadcastTaskUpdate(task);
  chrome.tabs.sendMessage(task.tabId, {
    type: MESSAGE_TYPES.TASK_STATUS_UPDATE,
    payload: {
      imageId: task.imageId,
      taskId: task.id,
      imageUrl: task.imageUrl,
      status: task.status,
      translatedUrl: translated.displayUrl,
      cacheEntry: task.cacheEntry
    }
  }).catch(() => {});
  settleTask(task);
}

async function translateImage(imageUrl, settings) {
  const imageBlob = await fetchImageBlob(imageUrl, settings.maxImageMegabytes);
  const imageDataUrl = await blobToDataUrl(imageBlob);
  const request = await buildCapabilityRequest(settings, imageDataUrl, undefined);
  const response = await fetch(buildEndpoint(settings), request);

  if (!response.ok) {
    throw new Error(buildHttpErrorMessage(response.status));
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.startsWith("image/")) {
    const responseBlob = await response.blob();
    const dataUrl = await blobToDataUrl(responseBlob);
    const cacheEntry = await storeBlobCache(responseBlob, responseBlob.type || "image/png");
    return {
      displayUrl: dataUrl,
      cacheEntry
    };
  }

  const parsed = safeJsonParse(await response.text(), {});
  if (parsed?.error) {
    throw new Error(
      parsed.error.message ||
      parsed.error.code ||
      "上游返回业务错误，未生成结果图。"
    );
  }
  if (parsed?.ok === false && parsed?.message) {
    throw new Error(parsed.message);
  }
  const imageResult = extractImageResult(parsed, settings.customResponseImagePath);
  if (!imageResult) {
    const text = extractTextResult(parsed);
    throw new Error(text ? "上游只返回文本，不支持返图。" : "未识别到可用图片结果。");
  }
  if (imageResult.kind === "url") {
    const cacheEntry = normalizeCacheEntry({
      type: "remote_url",
      value: imageResult.value
    });
    return {
      displayUrl: isPrivateNetworkUrl(imageResult.value) ? "" : imageResult.value,
      cacheEntry
    };
  }
  const dataUrl = `data:image/png;base64,${imageResult.value}`;
  const cacheEntry = await storeDataUrlCache(dataUrl);
  return {
    displayUrl: dataUrl,
    cacheEntry
  };
}

async function fetchImageBlob(imageUrl, maxImageMegabytes) {
  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error("源图片读取失败");
  }
  const blob = await response.blob();
  if (blob.size > maxImageMegabytes * 1024 * 1024) {
    throw new Error(`图片超过大小限制（${maxImageMegabytes} MB）`);
  }
  return blob;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("图片编码失败"));
    reader.readAsDataURL(blob);
  });
}

async function resolveImageForDisplay(input) {
  const cacheEntry = normalizeCacheEntry(input);
  if (cacheEntry?.type === "blob_ref") {
    const blob = await readBlobCache(cacheEntry.blobKey);
    if (!blob) {
      return "";
    }
    return blobToDataUrl(blob);
  }
  const value = cacheEntry?.value || (typeof input === "string" ? input : "");
  if (!value) {
    return "";
  }
  if (/^data:image\//i.test(value)) {
    return value;
  }
  if (!isPrivateNetworkUrl(value)) {
    return value;
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  let response;
  try {
    response = await fetch(value, { signal: controller.signal });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error("局域网结果图读取超时");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
  if (!response.ok) {
    throw new Error("局域网结果图读取失败");
  }
  return blobToDataUrl(await response.blob());
}

async function storeDataUrlCache(dataUrl) {
  const blob = dataUrlToBlob(dataUrl);
  return storeBlobCache(blob, blob.type || "image/png");
}

async function storeBlobCache(blob, mimeType) {
  const blobKey = `blob_${Date.now()}_${crypto.randomUUID()}`;
  const database = await openImageCacheDb();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_CACHE_STORE_NAME, "readwrite");
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    const request = store.put({
      blobKey,
      blob,
      mimeType,
      updatedAt: Date.now()
    });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Blob 缓存写入失败"));
  });
  return {
    type: "blob_ref",
    blobKey,
    mimeType: mimeType || "image/png"
  };
}

async function readBlobCache(blobKey) {
  if (!blobKey) {
    return null;
  }
  const database = await openImageCacheDb();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(IMAGE_CACHE_STORE_NAME, "readonly");
    const store = transaction.objectStore(IMAGE_CACHE_STORE_NAME);
    const request = store.get(blobKey);
    request.onsuccess = () => resolve(request.result?.blob || null);
    request.onerror = () => reject(request.error || new Error("Blob 缓存读取失败"));
  });
}

function openImageCacheDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IMAGE_CACHE_DB_NAME, IMAGE_CACHE_DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(IMAGE_CACHE_STORE_NAME)) {
        database.createObjectStore(IMAGE_CACHE_STORE_NAME, { keyPath: "blobKey" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("图片缓存数据库打开失败"));
  });
}

function isPrivateNetworkUrl(url) {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1") {
      return true;
    }
    if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
      return true;
    }
    const match172 = hostname.match(/^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/);
    if (match172) {
      const second = Number(match172[1]);
      return second >= 16 && second <= 31;
    }
    return false;
  } catch {
    return false;
  }
}

async function restoreSingleImage(payload, tabId) {
  await chrome.tabs.sendMessage(tabId ?? payload?.tabId, {
    type: MESSAGE_TYPES.RESTORE_IMAGE,
    payload
  });
  return { restored: true };
}

async function restoreAllImages(tabId) {
  await chrome.tabs.sendMessage(tabId, {
    type: MESSAGE_TYPES.RESTORE_ALL_IMAGES,
    payload: {}
  });
  return { restored: true };
}

function broadcastTaskUpdate(task) {
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.TASK_STATUS_UPDATE,
    payload: task
  }).catch(() => {});
  broadcastState();
}

function broadcastState() {
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.GET_APP_STATE,
    payload: buildAppState()
  }).catch(() => {});
}
