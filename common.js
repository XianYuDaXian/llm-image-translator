const DEFAULT_PROMPT = [
  "请将图片中的文字翻译为目标语言，保持原图布局、字体风格、颜色、构图和视觉元素不变。",
  "只替换文字，不新增无关内容，不删除原有非文字信息，输出一张可直接展示的翻译后图片。"
].join("\n");

function createServiceProfile(overrides = {}) {
  const providerType = overrides.providerType === "compatible_image"
    ? "openai_compatible_image"
    : (overrides.providerType || "openai_compatible_image");
  const requestFormat = overrides.requestFormat || (
    providerType === "xai_compatible_image" ? "json_image_url" : "auto"
  );
  return {
    id: overrides.id || `svc_${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name || "默认服务",
    providerType,
    baseUrl: overrides.baseUrl || "https://api.openai.com",
    apiKey: overrides.apiKey || "",
    endpointMode: overrides.endpointMode || "responses",
    model: overrides.model || "",
    customPath: overrides.customPath || "",
    customHeaders: overrides.customHeaders || "[]",
    customResponseImagePath: overrides.customResponseImagePath || "",
    requestFormat,
    enabled: overrides.enabled ?? true
  };
}

const DEFAULT_SETTINGS = {
  providerType: "openai_compatible_image",
  baseUrl: "https://api.openai.com",
  apiKey: "",
  endpointMode: "responses",
  model: "",
  customPath: "",
  customHeaders: "[]",
  customResponseImagePath: "",
  requestFormat: "auto",
  relayEndpoint: "",
  concurrency: 2,
  translatePromptTemplate: DEFAULT_PROMPT,
  requestTimeoutMs: 45000,
  maxImageMegabytes: 8,
  hoverButtonEnabled: true,
  sidepanelTheme: "light",
  minImageDisplaySize: 120,
  minTranslationWidth: 160,
  minTranslationHeight: 160,
  targetLanguage: "auto",
  excludedSites: [],
  serviceProfiles: [
    createServiceProfile({
      id: "svc_default",
      name: "默认服务"
    })
  ],
  activeServiceId: "svc_default",
  lastConnectivityTestResult: null,
  lastCapabilityTestResult: null
};

const PROVIDER_TYPE_OPTIONS = [
  { value: "openai_official_image", label: "OpenAI 官方生图" },
  { value: "openai_compatible_image", label: "OpenAI 兼容生图" },
  { value: "xai_compatible_image", label: "xAI 兼容图片编辑" },
  { value: "gemini_official_image", label: "Gemini 官方生图" },
  { value: "gemini_compatible_image", label: "Gemini 兼容生图" },
  { value: "custom_endpoint", label: "自定义端点" }
];

const REQUEST_FORMAT_OPTIONS = [
  { value: "auto", label: "自动判断" },
  { value: "multipart_form", label: "multipart/form-data" },
  { value: "json_image_url", label: "JSON image_url" }
];

const ENDPOINT_MODE_OPTIONS = [
  { value: "responses", label: "Responses" },
  { value: "images", label: "Images" },
  { value: "chat", label: "Chat Completions" },
  { value: "custom", label: "Custom Template" }
];

const TARGET_LANGUAGE_OPTIONS = [
  { value: "auto", label: "跟随浏览器语言" },
  { value: "zh-CN", label: "简体中文" },
  { value: "zh-TW", label: "繁体中文" },
  { value: "en", label: "English" },
  { value: "ja", label: "日本語" },
  { value: "ko", label: "한국어" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "ru", label: "Русский" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "it", label: "Italiano" },
  { value: "ar", label: "العربية" },
  { value: "th", label: "ไทย" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "__custom__", label: "自定义" }
];

const MESSAGE_TYPES = {
  SHOW_HOVER_ACTION: "SHOW_HOVER_ACTION",
  HIDE_HOVER_ACTION: "HIDE_HOVER_ACTION",
  TRANSLATE_SINGLE_IMAGE: "TRANSLATE_SINGLE_IMAGE",
  START_TRANSLATE_QUEUE: "START_TRANSLATE_QUEUE",
  TASK_STATUS_UPDATE: "TASK_STATUS_UPDATE",
  RESTORE_IMAGE: "RESTORE_IMAGE",
  RESTORE_ALL_IMAGES: "RESTORE_ALL_IMAGES",
  TEST_API_CONNECTIVITY: "TEST_API_CONNECTIVITY",
  TEST_MODEL_CAPABILITY: "TEST_MODEL_CAPABILITY",
  AUTO_DETECT_ENDPOINT_MODE: "AUTO_DETECT_ENDPOINT_MODE",
  RESOLVE_IMAGE_FOR_DISPLAY: "RESOLVE_IMAGE_FOR_DISPLAY",
  GET_APP_STATE: "GET_APP_STATE",
  SETTINGS_UPDATED: "SETTINGS_UPDATED",
  SET_AUTO_TRANSLATE_TAB: "SET_AUTO_TRANSLATE_TAB",
  GET_AUTO_TRANSLATE_TAB_STATE: "GET_AUTO_TRANSLATE_TAB_STATE",
  AUTO_TRANSLATE_STATE_CHANGED: "AUTO_TRANSLATE_STATE_CHANGED",
  FIND_IMAGE_FOR_TRANSLATE: "FIND_IMAGE_FOR_TRANSLATE"
};

function mergeSettings(input = {}) {
  const normalizedInput = { ...input };
  if (normalizedInput.providerType === "direct") {
    normalizedInput.providerType = "openai_compatible_image";
  }
  if (normalizedInput.providerType === "relay") {
    normalizedInput.providerType = "custom_endpoint";
  }
  if (normalizedInput.providerType === "compatible_image") {
    normalizedInput.providerType = "openai_compatible_image";
  }
  if (normalizedInput.providerType === "xai_compatible") {
    normalizedInput.providerType = "xai_compatible_image";
  }
  const merged = {
    ...DEFAULT_SETTINGS,
    ...normalizedInput
  };
  const profiles = normalizeServiceProfiles(merged);
  const activeService = profiles.find((item) => item.id === merged.activeServiceId) || profiles[0];
  return {
    ...merged,
    ...activeService,
    excludedSites: normalizeExcludedSites(merged.excludedSites),
    serviceProfiles: profiles,
    activeServiceId: activeService?.id || profiles[0]?.id || "svc_default"
  };
}

function normalizeExcludedSites(input) {
  const values = Array.isArray(input)
    ? input
    : String(input || "").split(/\r?\n|,/);
  return Array.from(new Set(values
    .map((item) => String(item || "").trim().toLowerCase())
    .map((item) => item.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .map((item) => item.replace(/^\.+/, "").replace(/\.+$/, ""))
    .filter(Boolean)));
}

function normalizeServiceProfiles(settings) {
  const incomingProfiles = Array.isArray(settings.serviceProfiles) && settings.serviceProfiles.length
    ? settings.serviceProfiles.map((item) => createServiceProfile(item))
    : [
        createServiceProfile({
          id: settings.activeServiceId || "svc_default",
          name: settings.serviceName || "默认服务",
          providerType: settings.providerType,
          baseUrl: settings.baseUrl,
          apiKey: settings.apiKey,
          endpointMode: settings.endpointMode,
          model: settings.model,
          customPath: settings.customPath,
          customHeaders: settings.customHeaders,
          customResponseImagePath: settings.customResponseImagePath,
          requestFormat: settings.requestFormat
        })
      ];
  return incomingProfiles;
}

function safeJsonParse(input, fallback) {
  try {
    return JSON.parse(input);
  } catch {
    return fallback;
  }
}

function maskSecret(secret) {
  if (!secret) {
    return "";
  }
  if (secret.length <= 8) {
    return "*".repeat(secret.length);
  }
  return `${secret.slice(0, 4)}${"*".repeat(Math.max(secret.length - 8, 4))}${secret.slice(-4)}`;
}

function normalizeBaseUrl(baseUrl) {
  return (baseUrl || "").trim().replace(/\/+$/, "");
}

function buildSettingsSignature(settings) {
  return [
    settings.providerType,
    settings.baseUrl,
    settings.endpointMode,
    settings.model,
    settings.customPath,
    settings.customResponseImagePath,
    settings.requestFormat,
    settings.translatePromptTemplate
  ].join("|");
}

function normalizeCacheEntry(input) {
  if (!input) {
    return null;
  }
  if (typeof input === "string") {
    return {
      type: /^data:image\//i.test(input) ? "inline_data_url" : "remote_url",
      value: input
    };
  }
  if (typeof input === "object") {
    if (input.type === "remote_url" && typeof input.value === "string") {
      return { type: "remote_url", value: input.value };
    }
    if (input.type === "inline_data_url" && typeof input.value === "string") {
      return { type: "inline_data_url", value: input.value };
    }
    if (input.type === "blob_ref" && typeof input.blobKey === "string") {
      return {
        type: "blob_ref",
        blobKey: input.blobKey,
        mimeType: typeof input.mimeType === "string" ? input.mimeType : "image/png"
      };
    }
  }
  return null;
}

function getCacheEntryFingerprint(input) {
  const entry = normalizeCacheEntry(input);
  if (!entry) {
    return "";
  }
  if (entry.type === "blob_ref") {
    return `blob:${entry.blobKey}`;
  }
  return `${entry.type}:${entry.value}`;
}

if (typeof globalThis !== "undefined") {
  globalThis.AppShared = {
    DEFAULT_PROMPT,
    createServiceProfile,
    DEFAULT_SETTINGS,
    PROVIDER_TYPE_OPTIONS,
    REQUEST_FORMAT_OPTIONS,
    ENDPOINT_MODE_OPTIONS,
    TARGET_LANGUAGE_OPTIONS,
    MESSAGE_TYPES,
    mergeSettings,
    normalizeExcludedSites,
    safeJsonParse,
    maskSecret,
    normalizeBaseUrl,
    buildSettingsSignature,
    normalizeCacheEntry,
    getCacheEntryFingerprint
  };
}
