(function () {
  const {
    DEFAULT_SETTINGS,
    PROVIDER_TYPE_OPTIONS,
    ENDPOINT_MODE_OPTIONS,
    REQUEST_FORMAT_OPTIONS,
    TARGET_LANGUAGE_OPTIONS,
    MESSAGE_TYPES,
    mergeSettings,
    normalizeExcludedSites,
    safeJsonParse,
    createServiceProfile
  } = globalThis.AppShared;

  const elements = {};
  let settings = mergeSettings(DEFAULT_SETTINGS);
  let selectedServiceId = settings.activeServiceId;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    renderProviderOptions();
    renderEndpointOptions();
    renderRequestFormatOptions();
    renderTargetLanguageOptions();
    bindEvents();
    await loadSettings();
    render();
  }

  function cacheElements() {
    for (const id of [
      "serviceList",
      "addServiceButton",
      "serviceDetailTitle",
      "duplicateServiceButton",
      "setDefaultServiceButton",
      "deleteServiceButton",
      "serviceName",
      "providerType",
      "baseUrl",
      "apiKey",
      "showApiKey",
      "endpointMode",
      "model",
      "customPath",
      "requestFormat",
      "serviceEnabled",
      "customHeaders",
      "customResponseImagePath",
      "concurrency",
      "translatePromptTemplate",
      "requestTimeoutMs",
      "maxImageMegabytes",
      "hoverButtonEnabled",
      "minImageDisplaySize",
      "minTranslationWidth",
      "minTranslationHeight",
      "targetLanguagePreset",
      "targetLanguageCustom",
      "excludedSites",
      "saveButton",
      "exportConfigButton",
      "importConfigButton",
      "importConfigInput",
      "connectivityButton",
      "capabilityButton",
      "detectButton",
      "statusMessage",
      "resultView",
      "previewView",
      "originalPreview",
      "translatedPreview"
    ]) {
      elements[id] = document.getElementById(id);
    }
  }

  function renderProviderOptions() {
    elements.providerType.innerHTML = PROVIDER_TYPE_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  }

  function renderEndpointOptions() {
    elements.endpointMode.innerHTML = ENDPOINT_MODE_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  }

  function renderRequestFormatOptions() {
    elements.requestFormat.innerHTML = REQUEST_FORMAT_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  }

  function renderTargetLanguageOptions() {
    elements.targetLanguagePreset.innerHTML = TARGET_LANGUAGE_OPTIONS.map((item) => `<option value="${item.value}">${item.label}</option>`).join("");
  }

  function bindEvents() {
    elements.addServiceButton.addEventListener("click", addService);
    elements.duplicateServiceButton.addEventListener("click", duplicateSelectedService);
    elements.setDefaultServiceButton.addEventListener("click", setSelectedAsDefault);
    elements.deleteServiceButton.addEventListener("click", deleteSelectedService);
    elements.providerType.addEventListener("change", onProviderTypeChange);
    elements.targetLanguagePreset.addEventListener("change", syncTargetLanguageFields);
    elements.showApiKey.addEventListener("change", () => {
      elements.apiKey.type = elements.showApiKey.checked ? "text" : "password";
    });

    elements.saveButton.addEventListener("click", onSave);
    elements.exportConfigButton.addEventListener("click", onExportConfig);
    elements.importConfigButton.addEventListener("click", () => elements.importConfigInput.click());
    elements.importConfigInput.addEventListener("change", onImportConfig);
    elements.connectivityButton.addEventListener("click", () => runAction(MESSAGE_TYPES.TEST_API_CONNECTIVITY));
    elements.capabilityButton.addEventListener("click", () => runAction(MESSAGE_TYPES.TEST_MODEL_CAPABILITY));
    elements.detectButton.addEventListener("click", () => runAction(MESSAGE_TYPES.AUTO_DETECT_ENDPOINT_MODE));
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get("settings");
    settings = mergeSettings(stored.settings);
    selectedServiceId = settings.activeServiceId || settings.serviceProfiles[0]?.id;
  }

  function render() {
    renderServiceList();
    renderSelectedService();
    renderGlobalFields();
    renderTestViews();
  }

  function renderServiceList() {
    elements.serviceList.innerHTML = settings.serviceProfiles.map((service) => {
      const selected = service.id === selectedServiceId;
      const isDefault = service.id === settings.activeServiceId;
      return `
        <article class="service-item" data-service-id="${service.id}" data-selected="${selected ? "true" : "false"}">
          <div class="service-item-head">
            <div class="service-item-name">${escapeHtml(service.name)}</div>
            ${isDefault ? `<span class="service-badge">当前默认</span>` : ""}
          </div>
          <div class="service-item-meta">
            <span>${escapeHtml(getProviderLabel(service.providerType))}</span>
            <span>${service.enabled ? "已启用" : "已停用"}</span>
          </div>
        </article>
      `;
    }).join("");

    for (const card of elements.serviceList.querySelectorAll(".service-item")) {
      card.addEventListener("click", () => {
        selectedServiceId = card.dataset.serviceId;
        render();
      });
    }
  }

  function renderSelectedService() {
    const service = getSelectedService();
    if (!service) {
      return;
    }

    elements.serviceDetailTitle.textContent = service.name;
    elements.serviceName.value = service.name;
    elements.providerType.value = service.providerType;
    elements.baseUrl.value = service.baseUrl;
    elements.apiKey.value = service.apiKey;
    elements.endpointMode.value = service.endpointMode;
    elements.model.value = service.model;
    elements.customPath.value = service.customPath;
    elements.requestFormat.value = service.requestFormat || "auto";
    elements.serviceEnabled.checked = Boolean(service.enabled);
    elements.customHeaders.value = typeof service.customHeaders === "string"
      ? service.customHeaders
      : JSON.stringify(service.customHeaders, null, 2);
    elements.customResponseImagePath.value = service.customResponseImagePath || "";
    elements.apiKey.type = elements.showApiKey.checked ? "text" : "password";
    syncProviderDependentFields(service.providerType);
  }

  function renderGlobalFields() {
    elements.concurrency.value = settings.concurrency;
    elements.translatePromptTemplate.value = settings.translatePromptTemplate;
    elements.requestTimeoutMs.value = settings.requestTimeoutMs;
    elements.maxImageMegabytes.value = settings.maxImageMegabytes;
    elements.hoverButtonEnabled.checked = Boolean(settings.hoverButtonEnabled);
    elements.minImageDisplaySize.value = settings.minImageDisplaySize;
    elements.minTranslationWidth.value = settings.minTranslationWidth;
    elements.minTranslationHeight.value = settings.minTranslationHeight;
    elements.excludedSites.value = (settings.excludedSites || []).join("\n");

    const presetValues = new Set(TARGET_LANGUAGE_OPTIONS.map((item) => item.value));
    if (presetValues.has(settings.targetLanguage)) {
      elements.targetLanguagePreset.value = settings.targetLanguage;
      elements.targetLanguageCustom.value = "";
    } else {
      elements.targetLanguagePreset.value = "__custom__";
      elements.targetLanguageCustom.value = settings.targetLanguage || "";
    }
    syncTargetLanguageFields();
  }

  function renderTestViews() {
    const latest = settings.lastCapabilityTestResult || settings.lastConnectivityTestResult || { message: "暂无测试结果" };
    elements.resultView.textContent = JSON.stringify(latest, null, 2);
    elements.previewView.textContent = JSON.stringify(latest.preview || buildPreviewSource(buildSelectedServiceSettings()), null, 2);
    elements.originalPreview.src = chrome.runtime.getURL("testimage.png");
    elements.translatedPreview.src = latest.translatedPreviewUrl || "";
  }

  function addService() {
    const newService = createServiceProfile({
      name: `自定义服务 ${settings.serviceProfiles.length + 1}`,
      providerType: "openai_compatible_image"
    });
    settings.serviceProfiles = [...settings.serviceProfiles, newService];
    selectedServiceId = newService.id;
    render();
  }

  function duplicateSelectedService() {
    const service = collectCurrentServiceForm({ keepInvalidHeaders: true });
    const duplicated = createServiceProfile({
      ...service,
      id: "",
      name: buildDuplicatedServiceName(service.name)
    });
    settings.serviceProfiles = [...settings.serviceProfiles, duplicated];
    selectedServiceId = duplicated.id;
    render();
    setStatus(`已复制“${service.name}”，并生成副本“${duplicated.name}”。`);
  }

  function buildDuplicatedServiceName(baseName) {
    const trimmedName = (baseName || "服务").trim();
    const existingNames = new Set(settings.serviceProfiles.map((item) => item.name));
    let index = 1;
    let nextName = `${trimmedName} 副本`;
    while (existingNames.has(nextName)) {
      index += 1;
      nextName = `${trimmedName} 副本 ${index}`;
    }
    return nextName;
  }

  function setSelectedAsDefault() {
    const service = collectCurrentServiceForm();
    updateService(service);
    settings.activeServiceId = service.id;
    render();
    setStatus(`已将“${service.name}”设为默认服务。`);
  }

  function deleteSelectedService() {
    if (settings.serviceProfiles.length <= 1) {
      setStatus("至少需要保留一个服务。", true);
      return;
    }

    const service = getSelectedService();
    settings.serviceProfiles = settings.serviceProfiles.filter((item) => item.id !== service.id);
    if (settings.activeServiceId === service.id) {
      settings.activeServiceId = settings.serviceProfiles[0].id;
    }
    selectedServiceId = settings.activeServiceId;
    render();
    setStatus(`已删除“${service.name}”。`);
  }

  function onProviderTypeChange() {
    const service = collectCurrentServiceForm({ keepInvalidHeaders: true });
    if (service.providerType === "openai_official_image") {
      if (!service.baseUrl.trim()) {
        service.baseUrl = "https://api.openai.com";
      }
      service.endpointMode = "images";
      service.requestFormat = "multipart_form";
    } else if (service.providerType === "openai_compatible_image") {
      if (!service.baseUrl.trim()) {
        service.baseUrl = "https://api.openai.com";
      }
      if (!service.requestFormat || service.requestFormat === "json_image_url") {
        service.requestFormat = "auto";
      }
    } else if (service.providerType === "xai_compatible_image") {
      if (!service.baseUrl.trim() || /api\.openai\.com/i.test(service.baseUrl.trim())) {
        service.baseUrl = "https://api.x.ai";
      }
      service.endpointMode = "images";
      service.requestFormat = "json_image_url";
    } else if (service.providerType === "gemini_official_image") {
      if (!service.baseUrl.trim() || /api\.openai\.com/i.test(service.baseUrl.trim())) {
        service.baseUrl = "https://generativelanguage.googleapis.com";
      }
      service.endpointMode = "images";
    } else if (service.providerType === "gemini_compatible_image") {
      if (!service.baseUrl.trim() || /api\.openai\.com/i.test(service.baseUrl.trim())) {
        service.baseUrl = "https://generativelanguage.googleapis.com";
      }
      service.endpointMode = "images";
    } else if (service.providerType === "custom_endpoint") {
      service.endpointMode = "custom";
      if (!service.requestFormat) {
        service.requestFormat = "auto";
      }
    }
    updateService(service);
    renderSelectedService();
  }

  function syncProviderDependentFields(providerType) {
    const isCustom = providerType === "custom_endpoint";
    const isGeminiFamily = providerType === "gemini_official_image" || providerType === "gemini_compatible_image";
    const isLockedJsonProvider = providerType === "xai_compatible_image";
    const isLockedMultipartProvider = providerType === "openai_official_image";
    elements.endpointMode.disabled = isGeminiFamily;
    elements.customPath.disabled = !isCustom;
    elements.customHeaders.disabled = providerType === "openai_official_image" || providerType === "gemini_official_image";
    elements.requestFormat.disabled = isGeminiFamily || isLockedJsonProvider || isLockedMultipartProvider;
  }

  function syncTargetLanguageFields() {
    const isCustom = elements.targetLanguagePreset.value === "__custom__";
    elements.targetLanguageCustom.style.display = isCustom ? "block" : "none";
    elements.targetLanguageCustom.disabled = !isCustom;
  }

  function getSelectedService() {
    return settings.serviceProfiles.find((item) => item.id === selectedServiceId) || settings.serviceProfiles[0];
  }

  function collectCurrentServiceForm(options = {}) {
    const current = getSelectedService();
    const parsedHeaders = safeJsonParse(elements.customHeaders.value.trim() || "[]", options.keepInvalidHeaders ? [] : null);
    if (!options.keepInvalidHeaders && !parsedHeaders) {
      throw new Error("Custom Headers 必须是合法 JSON 数组");
    }
    return createServiceProfile({
      ...current,
      name: elements.serviceName.value.trim() || current.name,
      providerType: elements.providerType.value,
      baseUrl: elements.baseUrl.value.trim(),
      apiKey: elements.apiKey.value.trim(),
      endpointMode: elements.endpointMode.value,
      model: elements.model.value.trim(),
      customPath: elements.customPath.value.trim(),
      requestFormat: elements.requestFormat.value,
      customHeaders: JSON.stringify(parsedHeaders || [], null, 2),
      customResponseImagePath: elements.customResponseImagePath.value.trim(),
      enabled: Boolean(elements.serviceEnabled.checked)
    });
  }

  function collectSettings() {
    const service = collectCurrentServiceForm();
    updateService(service);

    const next = mergeSettings({
      ...settings,
      serviceProfiles: settings.serviceProfiles,
      activeServiceId: settings.activeServiceId,
      concurrency: Number(elements.concurrency.value || DEFAULT_SETTINGS.concurrency),
      translatePromptTemplate: elements.translatePromptTemplate.value.trim(),
      requestTimeoutMs: Number(elements.requestTimeoutMs.value || DEFAULT_SETTINGS.requestTimeoutMs),
      maxImageMegabytes: Number(elements.maxImageMegabytes.value || DEFAULT_SETTINGS.maxImageMegabytes),
      hoverButtonEnabled: Boolean(elements.hoverButtonEnabled.checked),
      minImageDisplaySize: Number(elements.minImageDisplaySize.value || DEFAULT_SETTINGS.minImageDisplaySize),
      minTranslationWidth: Number(elements.minTranslationWidth.value || DEFAULT_SETTINGS.minTranslationWidth),
      minTranslationHeight: Number(elements.minTranslationHeight.value || DEFAULT_SETTINGS.minTranslationHeight),
      excludedSites: normalizeExcludedSites(elements.excludedSites.value),
      targetLanguage: elements.targetLanguagePreset.value === "__custom__"
        ? (elements.targetLanguageCustom.value.trim() || "auto")
        : elements.targetLanguagePreset.value
    });
    return next;
  }

  function updateService(service) {
    settings.serviceProfiles = settings.serviceProfiles.map((item) => item.id === service.id ? service : item);
  }

  function buildSelectedServiceSettings() {
    const selected = getSelectedService();
    return mergeSettings({
      ...settings,
      ...selected,
      serviceProfiles: settings.serviceProfiles,
      activeServiceId: settings.activeServiceId
    });
  }

  async function onSave() {
    try {
      settings = collectSettings();
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.SETTINGS_UPDATED,
        payload: settings
      });
      if (!response?.ok) {
        throw new Error(response?.error?.message || "保存失败");
      }
      await loadSettings();
      render();
      setStatus("设置已保存。");
    } catch (error) {
      setStatus(error.message || "保存失败", true);
    }
  }

  async function onExportConfig() {
    try {
      settings = collectSettings();
      const exportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings
      };
      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "image-translator-config.json";
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus("配置已导出。");
    } catch (error) {
      setStatus(error.message || "导出配置失败", true);
    }
  }

  async function onImportConfig(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const text = await file.text();
      const parsed = safeJsonParse(text, null);
      if (!parsed?.settings) {
        throw new Error("配置文件格式无效");
      }
      settings = mergeSettings(parsed.settings);
      selectedServiceId = settings.activeServiceId || settings.serviceProfiles[0]?.id;
      render();
      setStatus("配置已导入，请确认后保存。");
    } catch (error) {
      setStatus(error.message || "导入配置失败", true);
    } finally {
      elements.importConfigInput.value = "";
    }
  }

  async function runAction(type) {
    try {
      settings = collectSettings();
      const targetSettings = buildSelectedServiceSettings();
      const pendingStatus = type === MESSAGE_TYPES.TEST_MODEL_CAPABILITY
        ? "正在使用 testimage.png 执行真实翻译测试..."
        : type === MESSAGE_TYPES.AUTO_DETECT_ENDPOINT_MODE
          ? "正在自动探测..."
          : "正在执行测试...";
      setStatus(pendingStatus);

      const response = await chrome.runtime.sendMessage({
        type,
        payload: targetSettings
      });
      if (!response?.ok) {
        throw new Error(response?.error?.message || "测试失败");
      }

      const result = response.result;
      elements.resultView.textContent = JSON.stringify(result, null, 2);
      elements.previewView.textContent = JSON.stringify(result.preview || buildPreviewSource(targetSettings), null, 2);
      elements.originalPreview.src = result.originalTestImageUrl || chrome.runtime.getURL("testimage.png");
      elements.translatedPreview.src = result.translatedPreviewUrl || "";
      setStatus(result.suggestion || (result.ok ? "测试通过" : "测试失败"), !result.ok);

      settings = mergeSettings({
        ...settings,
        lastConnectivityTestResult: type === MESSAGE_TYPES.TEST_API_CONNECTIVITY ? result : settings.lastConnectivityTestResult,
        lastCapabilityTestResult: type === MESSAGE_TYPES.TEST_MODEL_CAPABILITY ? result : settings.lastCapabilityTestResult
      });
      renderTestViews();
    } catch (error) {
      setStatus(error.message || "测试失败", true);
    }
  }

  function buildPreviewSource(currentSettings) {
    return {
      providerType: currentSettings.providerType,
      endpointMode: currentSettings.endpointMode,
      baseUrl: currentSettings.baseUrl,
      model: currentSettings.model,
      customPath: currentSettings.customPath,
      requestFormat: currentSettings.requestFormat,
      customHeaders: safeJsonParse(currentSettings.customHeaders || "[]", []),
      customResponseImagePath: currentSettings.customResponseImagePath || ""
    };
  }

  function getProviderLabel(providerType) {
    return PROVIDER_TYPE_OPTIONS.find((item) => item.value === providerType)?.label || providerType;
  }

  function setStatus(message, isError = false) {
    elements.statusMessage.textContent = message;
    elements.statusMessage.style.color = isError ? "#ff7a9d" : "#6be2a7";
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
