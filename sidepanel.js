(function () {
  const {
    MESSAGE_TYPES,
    mergeSettings,
    normalizeExcludedSites,
    PROVIDER_TYPE_OPTIONS
  } = globalThis.AppShared;
  const elements = {};
  let currentTabId = null;
  let currentTab = null;
  let currentSettings = null;
  let currentRawSettings = null;

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    bindEvents();
    await resolveCurrentTab();
    await refreshState();
    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === MESSAGE_TYPES.TASK_STATUS_UPDATE || message.type === MESSAGE_TYPES.GET_APP_STATE) {
        refreshState();
      }
    });
    chrome.tabs.onActivated.addListener(async () => {
      await resolveCurrentTab();
      await refreshState();
    });
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
      if (tabId === currentTabId && changeInfo.status === "complete") {
        await resolveCurrentTab();
        await refreshState();
      }
    });
  }

  function cacheElements() {
    for (const id of ["excludeSiteButton", "restoreAllButton", "openOptionsButton", "refreshButton", "themeToggleButton", "summaryText", "taskList", "serviceSelect"]) {
      elements[id] = document.getElementById(id);
    }
  }

  function bindEvents() {
    elements.excludeSiteButton.addEventListener("click", toggleCurrentSiteExclusion);
    elements.restoreAllButton.addEventListener("click", restoreAllImages);
    elements.openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());
    elements.refreshButton.addEventListener("click", refreshState);
    elements.themeToggleButton.addEventListener("click", onThemeToggle);
    elements.serviceSelect.addEventListener("change", onServiceChange);
  }

  async function resolveCurrentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    currentTab = tab || null;
    currentTabId = tab?.id ?? null;
  }

  async function refreshState() {
    const response = await chrome.runtime.sendMessage({ type: MESSAGE_TYPES.GET_APP_STATE });
    const appState = response?.result || response?.payload || { queue: [], runningCount: 0 };
    currentRawSettings = appState.settings || {};
    currentSettings = mergeSettings(currentRawSettings);
    render(appState);
  }

  function render(appState) {
    renderServiceSwitcher();
    renderSiteExclusionButton();
    applyTheme();
    const tasks = (appState.queue || []).filter((item) => item.tabId === currentTabId);
    const completed = tasks.filter((item) => item.status === "completed").length;
    const running = tasks.filter((item) => item.status === "running" || item.status === "queued").length;
    const failed = tasks.filter((item) => item.status === "failed").length;
    elements.summaryText.textContent = `本页任务：${tasks.length}，处理中 ${running}，已完成 ${completed}，失败 ${failed}`;
    elements.taskList.innerHTML = tasks.length
      ? tasks.map(renderTask).join("")
      : `<div class="task-item"><strong>暂无任务</strong><div class="task-meta"><span>将鼠标移到页面图片上点击“翻译图片”。</span></div></div>`;
    bindTaskActions();
  }

  function renderSiteExclusionButton() {
    const host = getCurrentHost();
    if (!host) {
      elements.excludeSiteButton.disabled = true;
      elements.excludeSiteButton.textContent = "无法排除当前网站";
      return;
    }
    elements.excludeSiteButton.disabled = false;
    elements.excludeSiteButton.textContent = isHostExcluded(host)
      ? "取消排除当前网站"
      : "排除当前网站";
    elements.excludeSiteButton.title = isHostExcluded(host)
      ? `当前网站 ${host} 已被排除。点击后恢复翻译。`
      : `点击后不再翻译当前网站 ${host} 的图片。`;
  }

  function applyTheme() {
    const theme = currentSettings?.sidepanelTheme === "dark" ? "dark" : "light";
    document.body.dataset.theme = theme;
    elements.themeToggleButton.textContent = theme === "dark" ? "切换浅色" : "切换深色";
  }

  function renderServiceSwitcher() {
    const profiles = currentSettings?.serviceProfiles || [];
    if (!profiles.length) {
      elements.serviceSelect.innerHTML = `<option value="">暂无可用服务</option>`;
      elements.serviceSelect.disabled = true;
      return;
    }

    const groupedProfiles = groupServicesByProvider(profiles);
    elements.serviceSelect.innerHTML = groupedProfiles.map(renderServiceGroup).join("");
    elements.serviceSelect.disabled = profiles.length <= 1;
    elements.serviceSelect.title = profiles.length <= 1
      ? "请先到设置页添加更多翻译服务。"
      : "切换当前页使用的翻译服务。";
  }

  function groupServicesByProvider(profiles) {
    const groups = new Map();
    for (const service of profiles) {
      const providerLabel = getProviderLabel(service.providerType);
      if (!groups.has(providerLabel)) {
        groups.set(providerLabel, []);
      }
      groups.get(providerLabel).push(service);
    }
    return Array.from(groups.entries());
  }

  function renderServiceGroup([providerLabel, services]) {
    if (services.length === 1) {
      return renderServiceOption(services[0]);
    }
    return `
      <optgroup label="${escapeAttribute(providerLabel)}">
        ${services.map(renderServiceOption).join("")}
      </optgroup>
    `;
  }

  function renderServiceOption(service) {
    const selected = service.id === currentSettings?.activeServiceId ? "selected" : "";
    const providerLabel = getProviderLabel(service.providerType);
    return `
      <option value="${escapeAttribute(service.id)}" ${selected}>
        ${escapeHtml(service.name)} · ${escapeHtml(providerLabel)}
      </option>
    `;
  }

  function getProviderLabel(providerType) {
    return PROVIDER_TYPE_OPTIONS.find((item) => item.value === providerType)?.label || "未分类服务";
  }

  function renderTask(task) {
    const title = task.imageUrl?.slice(0, 42) || task.imageId;
    const previewUrl = task.resultUrl || task.imageUrl || "";
    return `
      <article class="task-item" data-image-id="${task.imageId}" data-image-url="${escapeHtml(task.imageUrl || "")}">
        ${previewUrl ? `<div class="task-preview"><img src="${escapeAttribute(previewUrl)}" alt="任务预览"></div>` : ""}
        <strong>${escapeHtml(title)}</strong>
        <div class="task-meta">
          <span>状态：${escapeHtml(task.status)}</span>
          <span>尝试次数：${task.attempts || 0}</span>
        </div>
        ${task.errorMessage ? `<p class="summary">${escapeHtml(task.errorMessage)}</p>` : ""}
        <div class="task-actions">
          <button data-action="retry">重试</button>
          <button data-action="restore">恢复原图</button>
        </div>
      </article>
    `;
  }

  function bindTaskActions() {
    for (const button of elements.taskList.querySelectorAll("button[data-action]")) {
      button.addEventListener("click", onTaskActionClick);
    }
  }

  async function onTaskActionClick(event) {
    const action = event.currentTarget.dataset.action;
    const card = event.currentTarget.closest(".task-item");
    const imageId = card?.dataset.imageId;
    const imageUrl = card?.dataset.imageUrl;
    if (!imageId || !currentTabId) {
      return;
    }

    if (action === "restore") {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.RESTORE_IMAGE,
        payload: { imageId, tabId: currentTabId }
      });
      refreshState();
      return;
    }

    if (action === "retry") {
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.TRANSLATE_SINGLE_IMAGE,
        payload: {
          tabId: currentTabId,
          imageId,
          imageUrl
        }
      });
      refreshState();
    }
  }

  async function restoreAllImages() {
    if (!currentTabId) {
      return;
    }
    await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.RESTORE_ALL_IMAGES,
      payload: { tabId: currentTabId }
    });
    refreshState();
  }

  async function toggleCurrentSiteExclusion() {
    const host = getCurrentHost();
    if (!host || !currentRawSettings) {
      return;
    }
    const list = normalizeExcludedSites(currentRawSettings.excludedSites);
    const excluded = isHostExcluded(host, list);
    const nextList = excluded
      ? list.filter((item) => !hostMatchesPattern(host, item))
      : [...list, host];
    const nextSettings = {
      ...currentRawSettings,
      excludedSites: nextList
    };
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: nextSettings
    });
    if (response?.ok) {
      currentRawSettings = response.result?.settings || nextSettings;
      currentSettings = mergeSettings(currentRawSettings);
      renderSiteExclusionButton();
    }
    refreshState();
  }

  async function onServiceChange() {
    if (!currentSettings || !currentRawSettings || !elements.serviceSelect.value) {
      return;
    }
    const nextSettings = {
      ...currentRawSettings,
      activeServiceId: elements.serviceSelect.value
    };
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: nextSettings
    });
    if (response?.ok) {
      currentRawSettings = response.result?.settings || nextSettings;
      currentSettings = mergeSettings(currentRawSettings);
    }
    refreshState();
  }

  function getCurrentHost() {
    try {
      const url = new URL(currentTab?.url || "");
      return /^https?:$/.test(url.protocol) ? url.hostname.toLowerCase() : "";
    } catch {
      return "";
    }
  }

  function isHostExcluded(host, list = normalizeExcludedSites(currentSettings?.excludedSites)) {
    return list.some((pattern) => hostMatchesPattern(host, pattern));
  }

  function hostMatchesPattern(host, pattern) {
    const normalized = String(pattern || "").trim().toLowerCase();
    if (!normalized) {
      return false;
    }
    if (normalized.startsWith("*.")) {
      const suffix = normalized.slice(2);
      return host === suffix || host.endsWith(`.${suffix}`);
    }
    return host === normalized || host.endsWith(`.${normalized}`);
  }

  async function onThemeToggle() {
    if (!currentSettings || !currentRawSettings) {
      return;
    }
    const nextTheme = currentSettings.sidepanelTheme === "dark" ? "light" : "dark";
    const nextSettings = {
      ...currentRawSettings,
      sidepanelTheme: nextTheme
    };
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.SETTINGS_UPDATED,
      payload: nextSettings
    });
    if (response?.ok) {
      currentRawSettings = response.result?.settings || nextSettings;
      currentSettings = mergeSettings(currentRawSettings);
      applyTheme();
    }
    refreshState();
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function escapeAttribute(text) {
    return escapeHtml(text);
  }
})();
