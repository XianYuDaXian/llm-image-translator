const UI_LANGUAGE = detectUiLanguage();

const LOCALE_TEXT = {
  zh: {
    extName: "LLM图片翻译助手",
    extDescription: "LLM image translator：悬浮翻译网页图片，兼容多种 OpenAI 兼容端点。",
    appNameShort: "LLM图片翻译助手",
    appNameEnglish: "LLM image translator",
    optionsPageTitle: "LLM图片翻译助手 设置",
    sidepanelPageTitle: "LLM图片翻译助手 任务",
    heroTitle: "多服务 API 配置与真实翻译测试",
    heroSummary: "左侧维护多个翻译服务，右侧编辑当前服务详情。默认服务会作为扩展实际调用的 API。",
    serviceListTitle: "翻译服务列表",
    serviceListSummary: "可添加多个服务，并设置一个默认服务供扩展实际调用。",
    addCustomService: "+ 添加自定义翻译服务",
    currentService: "当前服务",
    duplicateService: "复制服务",
    setAsDefault: "设为默认",
    deleteService: "删除服务",
    saveSettings: "保存设置",
    exportConfig: "导出配置",
    importConfig: "导入配置",
    testConnectivity: "测试基础连通",
    testCapability: "测试模型能力",
    autoDetect: "自动探测推荐配置",
    serviceNameLabel: "服务名称",
    providerTypeLabel: "接口类型",
    baseUrlLabel: "Base URL",
    apiKeyLabel: "API Key",
    showApiKey: "显示 API Key",
    endpointModeLabel: "Endpoint Mode",
    modelLabel: "Model",
    customPathLabel: "Custom Path",
    requestFormatLabel: "请求格式",
    serviceEnabled: "启用该服务",
    serviceNamePlaceholder: "例如：grok / codex / 内网服务",
    customPathPlaceholder: "/v1/custom/images",
    advancedRequestTitle: "高级请求设置",
    advancedRequestSummary: "兼容非标准 OpenAI-compatible 服务，可附加自定义 Header 与自定义响应路径。",
    customHeadersLabel: "Custom Headers（JSON 数组）",
    customHeadersPlaceholder: "[{\"name\":\"X-Provider\",\"value\":\"demo\"}]",
    customResponseImagePathLabel: "响应图片提取路径",
    customResponseImagePathPlaceholder: "例如 output.0.content.0.text 或 data.0.url",
    concurrencyLabel: "并发数",
    timeoutLabel: "请求超时（毫秒）",
    maxImageMbLabel: "最大图片大小（MB）",
    minHoverImageLabel: "最小悬浮图片尺寸（px）",
    minTranslationWidthLabel: "最小翻译宽度（px）",
    minTranslationHeightLabel: "最小翻译高度（px）",
    targetLanguageLabel: "目标语言",
    targetLanguagePlaceholder: "输入自定义语言代码，例如 id / pl / nl",
    excludedSitesLabel: "排除翻译网站",
    excludedSitesPlaceholder: "每行一个域名，例如 example.com 或 *.example.com",
    hoverButtonEnabledLabel: "启用图片悬浮翻译按钮",
    translatePromptLabel: "翻译提示词",
    testSectionTitle: "测试与自动探测",
    testSectionSummary: "测试针对当前正在编辑的服务执行。“测试模型能力”会直接翻译扩展内置的 testimage.png。",
    testOriginalImage: "测试原图",
    translatedResult: "翻译结果",
    resultSummaryTitle: "测试结果摘要",
    resultSummaryText: "快速判断“可连通”“可返图”还是“仅文本”。",
    requestPreviewTitle: "测试请求预览",
    requestPreviewText: "默认对 API Key 脱敏，便于排查路径与请求体结构。",
    noTestResult: "暂无测试结果",
    statusSaved: "设置已保存。",
    statusSaveFailed: "保存失败",
    statusExported: "配置已导出。",
    statusExportFailed: "导出配置失败",
    statusImportReady: "配置已导入，请确认后保存。",
    statusImportFailed: "导入配置失败",
    statusImportInvalid: "配置文件格式无效",
    statusNeedKeepOneService: "至少需要保留一个服务。",
    statusSetDefault: "已将“{name}”设为默认服务。",
    statusDeletedService: "已删除“{name}”。",
    statusDuplicatedService: "已复制“{source}”，并生成副本“{target}”。",
    statusRunningCapability: "正在使用 testimage.png 执行真实翻译测试...",
    statusRunningDetect: "正在自动探测...",
    statusRunningTest: "正在执行测试...",
    statusTestPassed: "测试通过",
    statusTestFailed: "测试失败",
    customServiceName: "自定义服务 {index}",
    genericServiceName: "服务",
    duplicateSuffix: "副本",
    serviceDefaultBadge: "当前默认",
    serviceEnabledState: "已启用",
    serviceDisabledState: "已停用",
    fileInvalidHeaders: "Custom Headers 必须是合法 JSON 数组",
    fileNameConfig: "image-translator-config.json",
    panelEyebrow: "任务面板",
    panelTitle: "当前页图片翻译",
    refresh: "刷新",
    openSettings: "打开设置页",
    restoreAllImages: "恢复全部原图",
    serviceSwitcherLabel: "翻译服务",
    recentTasks: "最近任务",
    sidepanelWaitingScan: "等待扫描页面图片。",
    sidepanelExcludedSiteTitle: "当前网站 {host} 已被排除。点击后恢复翻译。",
    sidepanelExcludeSiteTitle: "点击后不再翻译当前网站 {host} 的图片。",
    hoverTranslate: "翻译图片",
    hoverQueued: "等待翻译",
    hoverRunning: "翻译中",
    hoverRestore: "恢复原图",
    hoverRetry: "重试翻译",
    excludeTranslate: "排除翻译",
    toastExcludedImage: "已排除这张图片",
    toastExcludedTarget: "该图片已排除翻译",
    toastRestored: "已恢复原图",
    toastUsedCache: "已使用缓存结果",
    toastTaskCreatedFailed: "翻译任务创建失败",
    toastTaskDone: "图片翻译完成",
    toastResultLoadFailed: "图片已生成，但结果图加载失败",
    toastCacheLoadFailed: "缓存结果加载失败",
    contextTranslateImage: "翻译这张图片",
    providerOpenaiOfficial: "OpenAI 官方生图",
    providerOpenaiCompatible: "OpenAI 兼容生图",
    providerXaiCompatible: "xAI 兼容图片编辑",
    providerGeminiOfficial: "Gemini 官方生图",
    providerGeminiCompatible: "Gemini 兼容生图",
    providerCustom: "自定义端点",
    requestAuto: "自动判断",
    requestMultipart: "multipart/form-data",
    requestJsonImageUrl: "JSON image_url",
    endpointResponses: "Responses",
    endpointImages: "Images",
    endpointChat: "Chat Completions",
    endpointCustom: "Custom Template",
    targetAuto: "跟随浏览器语言",
    targetCustom: "自定义",
    serviceDefault: "默认服务",
    serviceUnavailable: "暂无可用服务",
    serviceUncategorized: "未分类服务",
    serviceSwitchHintNeedMore: "请先到设置页添加更多翻译服务。",
    serviceSwitchHintChange: "切换当前页使用的翻译服务。",
    sidepanelSummary: "本页任务：{total}，处理中 {running}，已完成 {completed}，失败 {failed}",
    sidepanelNoTaskTitle: "暂无任务",
    sidepanelNoTaskHint: "将鼠标移到页面图片上点击“翻译图片”。",
    sidepanelExcludeCurrentSite: "排除当前网站",
    sidepanelIncludeCurrentSite: "取消排除当前网站",
    sidepanelCannotExcludeSite: "无法排除当前网站",
    sidepanelThemeToLight: "切换浅色",
    sidepanelThemeToDark: "切换深色",
    taskStatus: "状态：{status}",
    taskAttempts: "尝试次数：{count}",
    taskRetry: "重试",
    taskRestore: "恢复原图",
    taskPreviewAlt: "任务预览",
    testOriginalImageAlt: "测试原图",
    translatedResultAlt: "翻译结果",
    defaultPromptLine1: "请将图片中的文字翻译为目标语言，保持原图布局、字体风格、颜色、构图和视觉元素不变。",
    defaultPromptLine2: "只替换文字，不新增无关内容，不删除原有非文字信息，输出一张可直接展示的翻译后图片。",
    promptTargetLanguage: "目标语言",
    currentBrowserLanguage: "当前浏览器语言",
    probeReplyOk: "请回复 ok。",
    probeReturnImage: "请原样返回一张测试图片。",
    errorUnknownMessageType: "未知消息类型: {type}",
    errorUnknown: "未知错误",
    errorMissingTabId: "缺少 tabId",
    errorMissingTaskParams: "缺少图片任务参数",
    errorCustomPathRequired: "Custom 模式下必须填写 Custom Path",
    errorBaseUrlRequired: "必须填写 Base URL",
    errorApiKeyRequired: "必须填写 API Key",
    errorModelRequired: "必须填写模型名称",
    errorCustomEndpointPathRequired: "自定义端点模式下必须填写 Custom Path",
    errorReadTestImageFailed: "测试图片读取失败",
    errorHttpAuth: "鉴权失败，请检查 API Key 或权限。",
    errorHttpNotFound: "未找到端点，请检查 Base URL 或路径。",
    errorHttpRateLimit: "请求过于频繁或额度不足。",
    errorHttpServer: "上游服务异常。",
    errorHttpGeneric: "请求失败，HTTP {status}",
    suggestionAuth: "请确认 API Key、权限或自定义 Header。",
    suggestionNotFound: "请确认端点模式是否正确，必要时填写 Custom Path。",
    suggestionRateLimit: "请降低并发或检查额度。",
    suggestionServer: "请稍后重试，或切换备用服务。",
    suggestionRequestShape: "请检查请求结构与兼容格式。",
    suggestionConnectivityPassed: "基础连通测试通过，可继续执行模型能力测试。",
    errorRequestTimeout: "请求超时",
    errorNetworkFailed: "网络请求失败",
    suggestionCheckNetwork: "请检查 Base URL、网络环境、CORS 以及路径配置。",
    errorCapabilityTimeout: "能力测试超时",
    errorCapabilityFailed: "能力测试失败",
    suggestionCapabilitySupport: "请确认当前模型支持图片输入与图片输出。",
    suggestionGeminiPassed: "Gemini 协议生图能力测试通过。",
    suggestionGeminiFailed: "Gemini 协议生图测试未通过。",
    suggestionCustomPassed: "自定义端点能力测试通过。",
    suggestionCustomFailed: "自定义端点测试未通过。",
    suggestionReachableButNoImage: "发现可连通端点，但尚未确认返图能力。",
    suggestionNoReachableEndpoint: "未找到可连通端点，请检查配置。",
    suggestionCapabilityPassed: "能力测试通过，当前模型支持返图。",
    errorTextOnlyResponse: "当前端点只返回文本，不支持返图。",
    errorUnsupportedResponse: "返回结构与已知兼容格式不匹配。",
    suggestionSwitchImageModel: "请切换支持图片输出的模型或端点模式。",
    suggestionCheckProviderFormat: "请检查供应商兼容格式，必要时改用 Custom 模式。"
  },
  en: {
    extName: "LLM image translator",
    extDescription: "LLM image translator: hover to translate web images with multiple OpenAI-compatible endpoints.",
    appNameShort: "LLM image translator",
    appNameEnglish: "LLM image translator",
    optionsPageTitle: "LLM Image Translator Settings",
    sidepanelPageTitle: "LLM Image Translator Tasks",
    heroTitle: "Multi-provider API setup and live translation testing",
    heroSummary: "Manage translation providers on the left and edit the selected provider on the right. The default provider is used by the extension.",
    serviceListTitle: "Translation Services",
    serviceListSummary: "Add multiple services and choose one default provider for the extension.",
    addCustomService: "+ Add custom translation service",
    currentService: "Current Service",
    duplicateService: "Duplicate",
    setAsDefault: "Set Default",
    deleteService: "Delete",
    saveSettings: "Save",
    exportConfig: "Export",
    importConfig: "Import",
    testConnectivity: "Test connectivity",
    testCapability: "Test model capability",
    autoDetect: "Auto detect recommended config",
    serviceNameLabel: "Service name",
    providerTypeLabel: "Provider type",
    baseUrlLabel: "Base URL",
    apiKeyLabel: "API Key",
    showApiKey: "Show API key",
    endpointModeLabel: "Endpoint mode",
    modelLabel: "Model",
    customPathLabel: "Custom path",
    requestFormatLabel: "Request format",
    serviceEnabled: "Enable this service",
    serviceNamePlaceholder: "For example: grok / codex / private endpoint",
    customPathPlaceholder: "/v1/custom/images",
    advancedRequestTitle: "Advanced request settings",
    advancedRequestSummary: "For non-standard OpenAI-compatible services, you can attach custom headers and a custom response image path.",
    customHeadersLabel: "Custom Headers (JSON array)",
    customHeadersPlaceholder: "[{\"name\":\"X-Provider\",\"value\":\"demo\"}]",
    customResponseImagePathLabel: "Response image path",
    customResponseImagePathPlaceholder: "For example: output.0.content.0.text or data.0.url",
    concurrencyLabel: "Concurrency",
    timeoutLabel: "Request timeout (ms)",
    maxImageMbLabel: "Max image size (MB)",
    minHoverImageLabel: "Min hover image size (px)",
    minTranslationWidthLabel: "Min translation width (px)",
    minTranslationHeightLabel: "Min translation height (px)",
    targetLanguageLabel: "Target language",
    targetLanguagePlaceholder: "Enter a custom language code, e.g. id / pl / nl",
    excludedSitesLabel: "Excluded sites",
    excludedSitesPlaceholder: "One domain per line, e.g. example.com or *.example.com",
    hoverButtonEnabledLabel: "Enable image hover action",
    translatePromptLabel: "Translation prompt",
    testSectionTitle: "Testing and auto detection",
    testSectionSummary: "Tests run against the service currently being edited. “Test model capability” translates the built-in testimage.png.",
    testOriginalImage: "Original test image",
    translatedResult: "Translated result",
    resultSummaryTitle: "Test result summary",
    resultSummaryText: "Quickly tell whether the endpoint is reachable, image-capable, or text-only.",
    requestPreviewTitle: "Request preview",
    requestPreviewText: "API keys are masked by default so you can inspect the path and payload safely.",
    noTestResult: "No test result yet",
    statusSaved: "Settings saved.",
    statusSaveFailed: "Failed to save settings",
    statusExported: "Configuration exported.",
    statusExportFailed: "Failed to export configuration",
    statusImportReady: "Configuration imported. Review it and save when ready.",
    statusImportFailed: "Failed to import configuration",
    statusImportInvalid: "Invalid configuration file format",
    statusNeedKeepOneService: "At least one service must remain.",
    statusSetDefault: "“{name}” is now the default service.",
    statusDeletedService: "Deleted “{name}”.",
    statusDuplicatedService: "Copied “{source}” and created “{target}”.",
    statusRunningCapability: "Running a live translation test with testimage.png...",
    statusRunningDetect: "Auto-detecting compatible endpoint mode...",
    statusRunningTest: "Running test...",
    statusTestPassed: "Test passed",
    statusTestFailed: "Test failed",
    customServiceName: "Custom Service {index}",
    genericServiceName: "Service",
    duplicateSuffix: "Copy",
    serviceDefaultBadge: "Default",
    serviceEnabledState: "Enabled",
    serviceDisabledState: "Disabled",
    fileInvalidHeaders: "Custom Headers must be a valid JSON array",
    fileNameConfig: "image-translator-config.json",
    panelEyebrow: "Task Panel",
    panelTitle: "Current Page Image Translation",
    refresh: "Refresh",
    openSettings: "Open settings",
    restoreAllImages: "Restore all",
    serviceSwitcherLabel: "Translation service",
    recentTasks: "Recent tasks",
    sidepanelWaitingScan: "Waiting to scan images on this page.",
    sidepanelExcludedSiteTitle: "{host} is excluded. Click to enable translation again.",
    sidepanelExcludeSiteTitle: "Stop translating images on {host}.",
    hoverTranslate: "Translate",
    hoverQueued: "Queued",
    hoverRunning: "Translating",
    hoverRestore: "Restore",
    hoverRetry: "Retry",
    excludeTranslate: "Exclude",
    toastExcludedImage: "This image has been excluded",
    toastExcludedTarget: "This image is excluded from translation",
    toastRestored: "Original image restored",
    toastUsedCache: "Loaded from cache",
    toastTaskCreatedFailed: "Failed to create translation task",
    toastTaskDone: "Image translation completed",
    toastResultLoadFailed: "Image generated, but loading the result failed",
    toastCacheLoadFailed: "Failed to load cached result",
    contextTranslateImage: "Translate this image",
    providerOpenaiOfficial: "OpenAI official image generation",
    providerOpenaiCompatible: "OpenAI-compatible image generation",
    providerXaiCompatible: "xAI-compatible image editing",
    providerGeminiOfficial: "Gemini official image generation",
    providerGeminiCompatible: "Gemini-compatible image generation",
    providerCustom: "Custom endpoint",
    requestAuto: "Auto",
    requestMultipart: "multipart/form-data",
    requestJsonImageUrl: "JSON image_url",
    endpointResponses: "Responses",
    endpointImages: "Images",
    endpointChat: "Chat Completions",
    endpointCustom: "Custom Template",
    targetAuto: "Follow browser language",
    targetCustom: "Custom",
    serviceDefault: "Default Service",
    serviceUnavailable: "No service available",
    serviceUncategorized: "Uncategorized",
    serviceSwitchHintNeedMore: "Add more translation services in settings first.",
    serviceSwitchHintChange: "Switch the translation service used on this page.",
    sidepanelSummary: "Tasks: {total}, Running {running}, Completed {completed}, Failed {failed}",
    sidepanelNoTaskTitle: "No tasks yet",
    sidepanelNoTaskHint: "Hover over an image on the page and click “Translate”.",
    sidepanelExcludeCurrentSite: "Exclude current site",
    sidepanelIncludeCurrentSite: "Remove site exclusion",
    sidepanelCannotExcludeSite: "Cannot exclude this site",
    sidepanelThemeToLight: "Light theme",
    sidepanelThemeToDark: "Dark theme",
    taskStatus: "Status: {status}",
    taskAttempts: "Attempts: {count}",
    taskRetry: "Retry",
    taskRestore: "Restore",
    taskPreviewAlt: "Task preview",
    testOriginalImageAlt: "Original test image",
    translatedResultAlt: "Translated result",
    defaultPromptLine1: "Translate the text in the image into the target language while keeping the original layout, typography, colors, composition, and visual elements unchanged.",
    defaultPromptLine2: "Only replace text. Do not add unrelated content or remove non-text information. Output a translated image that can be shown directly.",
    promptTargetLanguage: "Target language",
    currentBrowserLanguage: "current browser language",
    probeReplyOk: "Please reply with ok.",
    probeReturnImage: "Return the test image unchanged.",
    errorUnknownMessageType: "Unknown message type: {type}",
    errorUnknown: "Unknown error",
    errorMissingTabId: "Missing tabId",
    errorMissingTaskParams: "Missing image task parameters",
    errorCustomPathRequired: "Custom Path is required in Custom mode",
    errorBaseUrlRequired: "Base URL is required",
    errorApiKeyRequired: "API Key is required",
    errorModelRequired: "Model is required",
    errorCustomEndpointPathRequired: "Custom Path is required for custom endpoints",
    errorReadTestImageFailed: "Failed to read the test image",
    errorHttpAuth: "Authentication failed. Check the API key or permissions.",
    errorHttpNotFound: "Endpoint not found. Check the Base URL or path.",
    errorHttpRateLimit: "Too many requests or insufficient quota.",
    errorHttpServer: "Upstream service error.",
    errorHttpGeneric: "Request failed, HTTP {status}",
    suggestionAuth: "Check the API key, permissions, or custom headers.",
    suggestionNotFound: "Check whether the endpoint mode is correct. Fill in Custom Path if needed.",
    suggestionRateLimit: "Reduce concurrency or check your quota.",
    suggestionServer: "Try again later or switch to a fallback service.",
    suggestionRequestShape: "Check the request structure and compatibility format.",
    suggestionConnectivityPassed: "Connectivity test passed. You can continue with the model capability test.",
    errorRequestTimeout: "Request timed out",
    errorNetworkFailed: "Network request failed",
    suggestionCheckNetwork: "Check the Base URL, network environment, CORS, and path configuration.",
    errorCapabilityTimeout: "Capability test timed out",
    errorCapabilityFailed: "Capability test failed",
    suggestionCapabilitySupport: "Make sure the current model supports both image input and image output.",
    suggestionGeminiPassed: "Gemini image-generation capability test passed.",
    suggestionGeminiFailed: "Gemini image-generation test did not pass.",
    suggestionCustomPassed: "Custom endpoint capability test passed.",
    suggestionCustomFailed: "Custom endpoint test did not pass.",
    suggestionReachableButNoImage: "A reachable endpoint was found, but image output is not confirmed yet.",
    suggestionNoReachableEndpoint: "No reachable endpoint was found. Check the configuration.",
    suggestionCapabilityPassed: "Capability test passed. The current model can return images.",
    errorTextOnlyResponse: "The endpoint returned text only and does not support image output.",
    errorUnsupportedResponse: "The response structure does not match known compatible formats.",
    suggestionSwitchImageModel: "Switch to a model or endpoint mode that supports image output.",
    suggestionCheckProviderFormat: "Check the provider compatibility format, or switch to Custom mode if needed."
  }
};

function buildLocaleDefaultPrompt(language = UI_LANGUAGE) {
  const locale = String(language).toLowerCase().startsWith("zh") ? "zh" : "en";
  const table = LOCALE_TEXT[locale] || LOCALE_TEXT.zh;
  return [
    table.defaultPromptLine1,
    table.defaultPromptLine2
  ].join("\n");
}

const DEFAULT_PROMPT = buildLocaleDefaultPrompt(UI_LANGUAGE);

function createServiceProfile(overrides = {}) {
  const providerType = overrides.providerType === "compatible_image"
    ? "openai_compatible_image"
    : (overrides.providerType || "openai_compatible_image");
  const requestFormat = overrides.requestFormat || (
    providerType === "xai_compatible_image" ? "json_image_url" : "auto"
  );
  return {
    id: overrides.id || `svc_${Math.random().toString(36).slice(2, 10)}`,
    name: overrides.name || t("serviceDefault"),
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
      name: t("serviceDefault")
    })
  ],
  activeServiceId: "svc_default",
  lastConnectivityTestResult: null,
  lastCapabilityTestResult: null
};

const PROVIDER_TYPE_OPTIONS = [
  { value: "openai_official_image", labelKey: "providerOpenaiOfficial" },
  { value: "openai_compatible_image", labelKey: "providerOpenaiCompatible" },
  { value: "xai_compatible_image", labelKey: "providerXaiCompatible" },
  { value: "gemini_official_image", labelKey: "providerGeminiOfficial" },
  { value: "gemini_compatible_image", labelKey: "providerGeminiCompatible" },
  { value: "custom_endpoint", labelKey: "providerCustom" }
];

const REQUEST_FORMAT_OPTIONS = [
  { value: "auto", labelKey: "requestAuto" },
  { value: "multipart_form", labelKey: "requestMultipart" },
  { value: "json_image_url", labelKey: "requestJsonImageUrl" }
];

const ENDPOINT_MODE_OPTIONS = [
  { value: "responses", labelKey: "endpointResponses" },
  { value: "images", labelKey: "endpointImages" },
  { value: "chat", labelKey: "endpointChat" },
  { value: "custom", labelKey: "endpointCustom" }
];

const TARGET_LANGUAGE_OPTIONS = [
  { value: "auto", labelKey: "targetAuto" },
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
  { value: "__custom__", labelKey: "targetCustom" }
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
          name: settings.serviceName || t("serviceDefault"),
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

function detectUiLanguage() {
  const language =
    globalThis.chrome?.i18n?.getUILanguage?.() ||
    globalThis.navigator?.language ||
    "zh-CN";
  return String(language).toLowerCase().startsWith("zh") ? "zh" : "en";
}

function t(key, params = {}) {
  const table = LOCALE_TEXT[UI_LANGUAGE] || LOCALE_TEXT.zh;
  const fallback = LOCALE_TEXT.zh;
  const template = table[key] || fallback[key] || key;
  return String(template).replace(/\{(\w+)\}/g, (_, name) => String(params[name] ?? ""));
}

function getOptionLabel(option) {
  return option.labelKey ? t(option.labelKey) : option.label;
}

function applyI18n(root = document) {
  if (!root?.querySelectorAll) {
    return;
  }
  for (const node of root.querySelectorAll("[data-i18n]")) {
    node.textContent = t(node.dataset.i18n);
  }
  for (const node of root.querySelectorAll("[data-i18n-title]")) {
    node.title = t(node.dataset.i18nTitle);
  }
  for (const node of root.querySelectorAll("[data-i18n-placeholder]")) {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  }
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

function getDefaultPrompt(language = UI_LANGUAGE) {
  return buildLocaleDefaultPrompt(language);
}

function isBuiltInPrompt(prompt) {
  const normalized = String(prompt || "").trim();
  return normalized === buildLocaleDefaultPrompt("zh") || normalized === buildLocaleDefaultPrompt("en");
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
    UI_LANGUAGE,
    t,
    getOptionLabel,
    applyI18n,
    getDefaultPrompt,
    isBuiltInPrompt,
    buildSettingsSignature,
    normalizeCacheEntry,
    getCacheEntryFingerprint
  };
}
