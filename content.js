(function () {
  const {
    DEFAULT_SETTINGS,
    MESSAGE_TYPES,
    mergeSettings,
    t,
    normalizeExcludedSites,
    buildSettingsSignature,
    normalizeCacheEntry,
    getCacheEntryFingerprint
  } = globalThis.AppShared || {};
  const CACHE_STORAGE_KEY = "translationCacheEntries";
  if (!MESSAGE_TYPES) {
    return;
  }

  const state = {
    settings: { ...DEFAULT_SETTINGS },
    hoverActions: null,
    hoverButton: null,
    excludeButton: null,
    toast: null,
    activeImage: null,
    hideTimer: 0,
    imageState: new Map(),
    cache: new Map(),
    excludedImages: new Set(),
    observer: null,
    suppressObserver: false,
    autoTranslateTimer: 0,
    autoTranslateRunning: false,
    autoTranslateEnabled: false
  };

  init();

  async function init() {
    await loadSettings();
    await loadAutoTranslateState();
    await loadPersistentCache();
    await loadExcludedImages();
    createUi();
    bindEvents();
    chrome.runtime.onMessage.addListener(handleRuntimeMessage);
    restoreCachedImages(document);
    observeDomChanges();
    scheduleAutoTranslate();
  }

  async function loadSettings() {
    const stored = await chrome.storage.local.get("settings");
    state.settings = mergeSettings(stored.settings);
  }

  async function loadAutoTranslateState() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.GET_AUTO_TRANSLATE_TAB_STATE,
        payload: {}
      });
      state.autoTranslateEnabled = Boolean(response?.result?.enabled);
    } catch {
      state.autoTranslateEnabled = false;
    }
  }

  function createUi() {
    state.hoverActions = document.createElement("div");
    state.hoverActions.className = "itx-hover-actions";
    state.hoverActions.addEventListener("mouseenter", clearHideTimer);
    state.hoverActions.addEventListener("mouseleave", scheduleHide);

    state.hoverButton = document.createElement("button");
    state.hoverButton.className = "itx-hover-button";
    state.hoverButton.textContent = t("hoverTranslate");
    state.hoverButton.addEventListener("click", onHoverButtonClick);
    state.hoverActions.appendChild(state.hoverButton);

    state.excludeButton = document.createElement("button");
    state.excludeButton.className = "itx-hover-exclude-button";
    state.excludeButton.textContent = "⊘";
    state.excludeButton.title = t("excludeTranslate");
    state.excludeButton.setAttribute("aria-label", t("excludeTranslate"));
    state.excludeButton.addEventListener("click", onExcludeButtonClick);
    state.hoverActions.appendChild(state.excludeButton);

    document.documentElement.appendChild(state.hoverActions);

    state.toast = document.createElement("div");
    state.toast.className = "itx-toast";
    document.documentElement.appendChild(state.toast);
  }

  function bindEvents() {
    document.addEventListener("mousemove", handleMouseMove, true);
    window.addEventListener("scroll", () => {
      repositionHoverButton();
      scheduleAutoTranslate();
    }, true);
    window.addEventListener("resize", () => {
      repositionHoverButton();
      scheduleAutoTranslate();
    }, true);
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === "local" && changes.settings) {
        state.settings = mergeSettings(changes.settings.newValue);
        if (isCurrentSiteExcluded()) {
          hideHoverButton();
          restoreAllTranslatedImages();
          return;
        }
        restoreCachedImages(document);
      }
      if (areaName === "local" && changes[CACHE_STORAGE_KEY]) {
        const nextCache = changes[CACHE_STORAGE_KEY].newValue || {};
        state.cache = new Map(Object.entries(nextCache));
        restoreCachedImages(document);
      }
      if (areaName === "local" && changes.excludedImageUrls) {
        state.excludedImages = new Set(changes.excludedImageUrls.newValue || []);
        hideHoverButton();
      }
    });
  }

  async function loadPersistentCache() {
    const stored = await chrome.storage.local.get(CACHE_STORAGE_KEY);
    state.cache = new Map(Object.entries(stored[CACHE_STORAGE_KEY] || {}));
  }

  async function loadExcludedImages() {
    const stored = await chrome.storage.local.get("excludedImageUrls");
    state.excludedImages = new Set(stored.excludedImageUrls || []);
  }

  function handleRuntimeMessage(message, sender, sendResponse) {
    if (message.type === MESSAGE_TYPES.TASK_STATUS_UPDATE) {
      void applyTaskUpdate(message.payload);
    }
    if (message.type === MESSAGE_TYPES.RESTORE_IMAGE) {
      restoreImage(message.payload?.imageId);
    }
    if (message.type === MESSAGE_TYPES.RESTORE_ALL_IMAGES) {
      for (const imageId of state.imageState.keys()) {
        restoreImage(imageId);
      }
    }
    if (message.type === MESSAGE_TYPES.START_TRANSLATE_QUEUE) {
      if (message.payload?.auto) {
        void triggerAutoTranslate();
        sendResponse({ scheduled: true });
        return true;
      }
      sendResponse({ images: collectViewportImages({ includeFailed: true }) });
      return true;
    }
    if (message.type === MESSAGE_TYPES.FIND_IMAGE_FOR_TRANSLATE) {
      sendResponse(findImageForTranslate(message.payload?.imageUrl, {
        ignoreExclusions: Boolean(message.payload?.ignoreExclusions)
      }));
      return true;
    }
    if (message.type === MESSAGE_TYPES.AUTO_TRANSLATE_STATE_CHANGED) {
      state.autoTranslateEnabled = Boolean(message.payload?.enabled);
      if (state.autoTranslateEnabled) {
        scheduleAutoTranslate();
      } else {
        clearTimeout(state.autoTranslateTimer);
      }
    }
    return false;
  }

  function handleMouseMove(event) {
    if (!state.settings.hoverButtonEnabled || isCurrentSiteExcluded()) {
      hideHoverButton();
      return;
    }
    if (isInteractivePointerTarget(event.target)) {
      hideHoverButton();
      return;
    }

    const image = resolveHoveredImage(event);
    if (!image || !isQualifiedImage(image)) {
      if (!state.hoverActions.matches(":hover")) {
        scheduleHide();
      }
      return;
    }

    clearHideTimer();
    state.activeImage = image;
    const imageId = ensureImageId(image);
    const status = state.imageState.get(imageId)?.status || "idle";
    renderHoverButton(status);
    positionHoverButton(image);
  }

  function getXMediaContainer(element) {
    if (!(element instanceof Element)) {
      return null;
    }
    return element.closest(
      [
        '[data-testid="tweetPhoto"]',
        '[aria-label="图像"]',
        '[aria-label="Image"]',
        'a[href*="/photo/"]',
        '[data-testid="swipe-to-dismiss"]'
      ].join(", ")
    );
  }

  function getBestImageFromContainer(container) {
    if (!(container instanceof Element)) {
      return null;
    }

    const images = Array.from(container.querySelectorAll("img"));
    let bestImage = null;
    let bestScore = -1;

    for (const image of images) {
      if (!(image instanceof HTMLImageElement)) {
        continue;
      }
      const rect = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      let score = rect.width * rect.height;

      if (image.currentSrc || image.src) {
        score += 1000;
      }
      if (style.display !== "none" && style.visibility !== "hidden") {
        score += 500;
      }
      if (Number(style.opacity || "1") >= 0.5) {
        score += 500;
      }
      if (image.alt === "图像" || image.alt === "Image") {
        score += 200;
      }
      if (rect.width >= state.settings.minImageDisplaySize && rect.height >= state.settings.minImageDisplaySize) {
        score += 200;
      }

      if (score > bestScore) {
        bestScore = score;
        bestImage = image;
      }
    }

    return bestImage;
  }

  function resolveHoveredImage(event) {
    const directImage = event.target instanceof Element ? event.target.closest("img") : null;
    if (directImage instanceof HTMLImageElement) {
      return directImage;
    }

    const container = event.target instanceof Element ? getXMediaContainer(event.target) : null;
    const containerImage = getBestImageFromContainer(container);
    if (containerImage instanceof HTMLImageElement) {
      return containerImage;
    }

    if (typeof document.elementsFromPoint !== "function") {
      return null;
    }

    const hoveredElements = document.elementsFromPoint(event.clientX, event.clientY);
    for (const element of hoveredElements) {
      if (!(element instanceof Element)) {
        continue;
      }
      if (element instanceof HTMLImageElement) {
        return element;
      }
      const nestedContainer = getXMediaContainer(element);
      const nestedImage = getBestImageFromContainer(nestedContainer);
      if (nestedImage instanceof HTMLImageElement) {
        return nestedImage;
      }
    }

    return null;
  }

  function isQualifiedImage(image) {
    if (isCurrentSiteExcluded() || isImageExcluded(image)) {
      return false;
    }
    if (image.dataset.itxTranslated === "true") {
      return false;
    }
    if (image.getAttribute("role") === "presentation") {
      return false;
    }
    if (image.closest(".lightboxed-content.hidden")) {
      return false;
    }
    if (image.classList.contains("post-background-image-filter")) {
      return false;
    }
    if (image.classList.contains("itx-translated-layer")) {
      return false;
    }
    const rect = image.getBoundingClientRect();
    if (rect.width < state.settings.minImageDisplaySize || rect.height < state.settings.minImageDisplaySize) {
      return false;
    }
    if (!image.currentSrc && !image.src) {
      return false;
    }
    const style = getComputedStyle(image);
    if (style.visibility === "hidden" || style.display === "none") {
      return false;
    }
    const xMediaContainer = getXMediaContainer(image);
    if (Number(style.opacity) < 0.5 && !xMediaContainer) {
      return false;
    }
    return rect.bottom >= 0 && rect.right >= 0 && rect.top <= innerHeight && rect.left <= innerWidth;
  }

  function isWithinTranslationSizeRange(image) {
    const rect = image.getBoundingClientRect();
    return rect.width >= state.settings.minTranslationWidth && rect.height >= state.settings.minTranslationHeight;
  }

  function ensureImageId(image) {
    if (!image.dataset.itxImageId) {
      image.dataset.itxImageId = `itx-${Math.random().toString(36).slice(2)}-${Date.now()}`;
    }
    return image.dataset.itxImageId;
  }

  function renderHoverButton(status) {
    const labels = {
      idle: t("hoverTranslate"),
      queued: t("hoverQueued"),
      running: t("hoverRunning"),
      completed: t("hoverRestore"),
      failed: t("hoverRetry")
    };
    state.hoverButton.dataset.state =
      status === "completed" ? "done" :
      status === "failed" ? "error" :
      (status === "running" || status === "queued") ? "running" : "";
    state.hoverButton.textContent = labels[status] || labels.idle;
    state.excludeButton.style.display = status === "idle" || status === "failed" ? "inline-flex" : "none";
    state.hoverActions.style.display = "inline-flex";
    state.hoverActions.style.pointerEvents = "auto";
  }

  function positionHoverButton(image) {
    const rect = image.getBoundingClientRect();
    const width = state.hoverActions.offsetWidth || 210;
    state.hoverActions.style.top = `${Math.max(12, rect.top + 10)}px`;
    state.hoverActions.style.left = `${Math.max(12, rect.right - width - 10)}px`;
  }

  function repositionHoverButton() {
    if (state.activeImage && state.hoverActions.style.display !== "none") {
      positionHoverButton(state.activeImage);
    }
  }

  async function onHoverButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const image = state.activeImage;
    if (!image) {
      return;
    }
    if (isCurrentSiteExcluded() || isImageExcluded(image)) {
      hideHoverButton();
      showToast(t("toastExcludedTarget"));
      return;
    }

    const imageId = ensureImageId(image);
    const current = state.imageState.get(imageId);
    if (current?.status === "completed") {
      restoreImage(imageId);
      renderHoverButton("idle");
      showToast(t("toastRestored"));
      return;
    }

    const cacheKey = `${buildSettingsSignature(state.settings)}|${image.currentSrc || image.src}`;
    const cached = normalizeCacheEntry(state.cache.get(cacheKey));
    if (cached) {
      resolveCachedDisplayUrl(cached).then((displayUrl) => {
        if (!displayUrl) {
          showToast(t("toastCacheLoadFailed"));
          return;
        }
        applyTranslatedImage(imageId, displayUrl, cached);
        renderHoverButton("completed");
        showToast(t("toastUsedCache"));
      });
      return;
    }

    setImageState(imageId, {
      status: "queued",
      imageUrl: image.currentSrc || image.src
    });
    renderHoverButton("queued");

    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.TRANSLATE_SINGLE_IMAGE,
      payload: {
        imageId,
        imageUrl: image.currentSrc || image.src,
        pageUrl: location.href
      }
    });

    if (!response?.ok) {
      setImageState(imageId, { status: "failed", errorMessage: response?.error?.message || "翻译任务创建失败" });
      renderHoverButton("failed");
      showToast(response?.error?.message || t("toastTaskCreatedFailed"));
    }
  }

  async function onExcludeButtonClick(event) {
    event.preventDefault();
    event.stopPropagation();

    const image = state.activeImage;
    if (!image) {
      return;
    }
    const imageKey = buildImageExclusionKey(image);
    if (!imageKey) {
      showToast("无法识别这张图片");
      return;
    }
    state.excludedImages.add(imageKey);
    await chrome.storage.local.set({
      excludedImageUrls: Array.from(state.excludedImages)
    });
    hideHoverButton();
    showToast(t("toastExcludedImage"));
  }

  function isCurrentSiteExcluded() {
    const host = location.hostname.toLowerCase();
    if (!host) {
      return false;
    }
    const sites = normalizeExcludedSites?.(state.settings.excludedSites) || [];
    return sites.some((pattern) => hostMatchesPattern(host, pattern));
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

  function isInteractivePointerTarget(target) {
    if (!(target instanceof Element)) {
      return false;
    }
    if (state.hoverActions?.contains(target)) {
      return false;
    }
    return Boolean(target.closest([
      "input",
      "textarea",
      "select",
      "button",
      "[contenteditable='true']",
      "[contenteditable='']",
      "[role='textbox']",
      "[role='searchbox']",
      "[role='combobox']",
      "[aria-multiline='true']"
    ].join(", ")));
  }

  function isImageExcluded(image) {
    const key = buildImageExclusionKey(image);
    return Boolean(key && state.excludedImages.has(key));
  }

  function buildImageExclusionKey(imageOrUrl) {
    const rawUrl = typeof imageOrUrl === "string"
      ? imageOrUrl
      : imageOrUrl?.dataset?.itxOriginalSrc || imageOrUrl?.currentSrc || imageOrUrl?.src || "";
    if (!rawUrl) {
      return "";
    }
    try {
      const url = new URL(rawUrl, location.href);
      return `${url.origin}${url.pathname}`;
    } catch {
      return String(rawUrl).trim();
    }
  }

  function setImageState(imageId, patch) {
    const current = state.imageState.get(imageId) || {};
    state.imageState.set(imageId, { ...current, ...patch });
  }

  async function applyTaskUpdate(task) {
    if (!task?.imageId) {
      return;
    }

    setImageState(task.imageId, task);
    const image = document.querySelector(`img[data-itx-image-id="${CSS.escape(task.imageId)}"]`);
    if (task.status === "running" || task.status === "queued") {
      if (state.activeImage === image) {
        renderHoverButton(task.status);
      }
      return;
    }
    if (task.status === "failed") {
      if (state.activeImage === image) {
        renderHoverButton("failed");
      }
      showToast(task.errorMessage || "翻译失败");
      return;
    }
    if (task.status === "completed") {
      const cacheEntry = normalizeCacheEntry(task.cacheEntry || task.translatedUrl || "");
      const displayUrl = task.translatedUrl || await resolveCachedDisplayUrl(cacheEntry);
      if (!displayUrl) {
        showToast(t("toastResultLoadFailed"));
        return;
      }
      applyTranslatedImage(task.imageId, displayUrl, cacheEntry || displayUrl);
      await persistCacheEntry(task.imageUrl || image?.dataset.itxOriginalSrc || image?.currentSrc || image?.src || "", cacheEntry || displayUrl);
      if (state.activeImage === image) {
        renderHoverButton("completed");
      }
      showToast(t("toastTaskDone"));
    }
  }

  function applyTranslatedImage(imageId, translatedUrl, cacheEntry = translatedUrl) {
    const image = document.querySelector(`img[data-itx-image-id="${CSS.escape(imageId)}"]`);
    if (!image) {
      return;
    }
    const cacheFingerprint = getCacheEntryFingerprint(cacheEntry);
    if (image.dataset.itxTranslated === "true" && image.dataset.itxCacheUrl === cacheFingerprint) {
      ensureControlHost(image, translatedUrl);
      setImageState(imageId, { status: "completed", translatedUrl, cacheEntry });
      return;
    }
    if (!image.dataset.itxOriginalSrc) {
      image.dataset.itxOriginalSrc = image.currentSrc || image.src;
    }
    runWithoutObserver(() => {
      image.dataset.itxTranslatedSrc = translatedUrl;
      image.dataset.itxCacheUrl = cacheFingerprint;
      image.dataset.itxTranslated = "true";
      ensureControlHost(image, translatedUrl);
    });
    setImageState(imageId, { status: "completed", translatedUrl, cacheEntry });
  }

  function restoreImage(imageId) {
    const image = document.querySelector(`img[data-itx-image-id="${CSS.escape(imageId)}"]`);
    if (!image || !image.dataset.itxOriginalSrc) {
      return;
    }
    runWithoutObserver(() => {
      image.removeAttribute("data-itx-translated");
      image.removeAttribute("data-itx-translated-src");
      image.removeAttribute("data-itx-cache-url");
      cleanupCompareUi(image);
    });
    setImageState(imageId, { status: "idle", translatedUrl: "" });
  }

  function restoreAllTranslatedImages() {
    for (const image of document.querySelectorAll("img[data-itx-image-id][data-itx-translated='true']")) {
      restoreImage(image.dataset.itxImageId);
    }
  }

  function ensureControlHost(image, translatedUrl) {
    const rect = image.getBoundingClientRect();
    let wrap = image.parentElement?.classList.contains("itx-compare-wrap") ? image.parentElement : null;
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "itx-compare-wrap";
      wrap.style.display = "inline-block";
      wrap.style.verticalAlign = "top";
      image.parentElement?.insertBefore(wrap, image);
      wrap.appendChild(image);
    }

    wrap.style.width = `${rect.width}px`;
    wrap.style.height = `${rect.height}px`;

    image.classList.add("itx-source-image-hidden");

    let translatedLayer = wrap.querySelector(".itx-translated-layer");
    if (!translatedLayer) {
      translatedLayer = document.createElement("img");
      translatedLayer.className = "itx-translated-layer";
      translatedLayer.alt = "";
      wrap.appendChild(translatedLayer);
    }
    translatedLayer.src = translatedUrl || image.dataset.itxTranslatedSrc || "";
    translatedLayer.style.width = `${rect.width}px`;
    translatedLayer.style.height = `${rect.height}px`;
    translatedLayer.style.objectFit = getComputedStyle(image).objectFit || "contain";

    let overlay = wrap.querySelector(".itx-compare-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "itx-compare-overlay";
      overlay.innerHTML = `<img alt="" src="${image.dataset.itxOriginalSrc}"><div class="itx-compare-divider"></div>`;
      wrap.appendChild(overlay);
    }
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    const overlayImage = overlay.querySelector("img");
    if (overlayImage) {
      overlayImage.src = image.dataset.itxOriginalSrc;
      overlayImage.style.width = `${rect.width}px`;
      overlayImage.style.height = `${rect.height}px`;
      overlayImage.style.objectFit = getComputedStyle(image).objectFit || "contain";
    }

    let controls = wrap.querySelector(".itx-image-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "itx-image-controls";
      controls.innerHTML = `
        <button type="button" class="itx-image-control" data-role="compare">对比</button>
        <button type="button" class="itx-image-control" data-role="restore">恢复原图</button>
      `;
      wrap.appendChild(controls);
      controls.addEventListener("click", onImageControlClick);
    }

    if (image.dataset.itxCompareBound !== "true") {
      image.dataset.itxCompareBound = "true";
      wrap.addEventListener("mousemove", onCompareMove);
    }

    updateCompareControls(image, false);
  }

  function cleanupCompareUi(image) {
    image.dataset.itxCompareBound = "false";
    image.classList.remove("itx-source-image-hidden");
    const wrap = image.parentElement?.classList.contains("itx-compare-wrap") ? image.parentElement : null;
    if (!wrap) {
      return;
    }
    wrap.removeEventListener("mousemove", onCompareMove);
    wrap.querySelector(".itx-translated-layer")?.remove();
    wrap.querySelector(".itx-compare-overlay")?.remove();
    wrap.querySelector(".itx-image-controls")?.remove();
    wrap.parentElement?.insertBefore(image, wrap);
    wrap.remove();
  }

  function onImageControlClick(event) {
    const button = event.target instanceof Element ? event.target.closest(".itx-image-control") : null;
    if (!button) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();

    const wrap = button.closest(".itx-compare-wrap");
    const image = wrap?.querySelector("img[data-itx-image-id]");
    if (!(image instanceof HTMLImageElement)) {
      return;
    }

    const role = button.dataset.role;
    if (role === "restore") {
      restoreImage(image.dataset.itxImageId);
      if (state.activeImage === image) {
        renderHoverButton("idle");
      }
      showToast(t("toastRestored"));
      return;
    }

    const enabled = button.dataset.active === "true";
    updateCompareControls(image, !enabled);
  }

  function updateCompareControls(image, enabled) {
    const wrap = image.parentElement?.classList.contains("itx-compare-wrap") ? image.parentElement : null;
    const overlay = wrap?.querySelector(".itx-compare-overlay");
    const compareButton = wrap?.querySelector('.itx-image-control[data-role="compare"]');
    if (!wrap || !overlay || !compareButton) {
      return;
    }

    image.dataset.itxCompareEnabled = enabled ? "true" : "false";
    overlay.dataset.visible = enabled ? "true" : "false";
    compareButton.dataset.active = enabled ? "true" : "false";
    compareButton.textContent = enabled ? "退出对比" : "对比";

    if (!enabled) {
      overlay.style.clipPath = "inset(0 0 100% 0)";
      return;
    }

    const rect = image.getBoundingClientRect();
    updateComparePosition(image, rect.top + rect.height / 2);
  }

  function updateComparePosition(image, clientY) {
    if (!(image instanceof HTMLImageElement)) {
      return;
    }
    const wrap = image.parentElement?.classList.contains("itx-compare-wrap") ? image.parentElement : null;
    const overlay = wrap?.querySelector(".itx-compare-overlay");
    const divider = wrap?.querySelector(".itx-compare-divider");
    if (!wrap || !overlay || !divider || image.dataset.itxCompareEnabled !== "true") {
      return;
    }
    const rect = image.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
    overlay.style.clipPath = `inset(0 0 ${(1 - ratio) * 100}% 0)`;
    divider.style.top = `${ratio * 100}%`;
  }

  function onCompareMove(event) {
    const wrap = event.currentTarget;
    const image = wrap instanceof Element ? wrap.querySelector("img[data-itx-image-id]") : null;
    updateComparePosition(image, event.clientY);
  }

  function collectViewportImages(options = {}) {
    const includeFailed = options.includeFailed ?? true;
    const items = [];
    const candidateImages = new Set(document.images);
    for (const container of document.querySelectorAll('[data-testid="tweetPhoto"], [aria-label="图像"], [aria-label="Image"], a[href*="/photo/"]')) {
      const image = getBestImageFromContainer(container);
      if (image) {
        candidateImages.add(image);
      }
    }

    for (const image of candidateImages) {
      if (!isQualifiedImage(image)) {
        continue;
      }
      if (!isWithinTranslationSizeRange(image)) {
        continue;
      }
      const imageId = ensureImageId(image);
      const currentState = state.imageState.get(imageId);
      if (currentState?.status === "queued" || currentState?.status === "running" || currentState?.status === "completed") {
        continue;
      }
      if (!includeFailed && currentState?.status === "failed") {
        continue;
      }
      items.push({
        imageId,
        imageUrl: image.currentSrc || image.src,
        pageUrl: location.href
      });
    }
    return items;
  }

  function findImageForTranslate(targetUrl, options = {}) {
    if (!targetUrl || (!options.ignoreExclusions && isCurrentSiteExcluded())) {
      return null;
    }

    const normalizedTargetUrl = normalizeImageUrl(targetUrl);
    let bestImage = null;
    let bestScore = -1;

    for (const image of document.images) {
      if (!(image instanceof HTMLImageElement)) {
        continue;
      }

      const candidates = [
        image.currentSrc,
        image.src,
        image.dataset.itxOriginalSrc
      ].map(normalizeImageUrl).filter(Boolean);

      if (!candidates.includes(normalizedTargetUrl)) {
        continue;
      }

      const rect = image.getBoundingClientRect();
      const area = Math.max(0, rect.width * rect.height);
      if (area > bestScore) {
        bestImage = image;
        bestScore = area;
      }
    }

    if (!bestImage || (!options.ignoreExclusions && isImageExcluded(bestImage))) {
      return null;
    }

    return {
      imageId: ensureImageId(bestImage),
      imageUrl: bestImage.currentSrc || bestImage.src,
      pageUrl: location.href
    };
  }

  function normalizeImageUrl(url) {
    if (!url) {
      return "";
    }
    try {
      return new URL(url, location.href).toString();
    } catch {
      return String(url).trim();
    }
  }

  function scheduleAutoTranslate() {
    if (!state.autoTranslateEnabled || isCurrentSiteExcluded()) {
      return;
    }
    clearTimeout(state.autoTranslateTimer);
    state.autoTranslateTimer = window.setTimeout(() => {
      void triggerAutoTranslate();
    }, 220);
  }

  async function triggerAutoTranslate() {
    if (!state.autoTranslateEnabled || state.autoTranslateRunning || isCurrentSiteExcluded()) {
      return;
    }
    const items = collectViewportImages({ includeFailed: false });
    if (!items.length) {
      return;
    }
    state.autoTranslateRunning = true;
    try {
      for (const item of items) {
        setImageState(item.imageId, {
          status: "queued",
          imageUrl: item.imageUrl
        });
      }
      await chrome.runtime.sendMessage({
        type: MESSAGE_TYPES.START_TRANSLATE_QUEUE,
        payload: {
          items,
          tabId: undefined
        }
      });
    } catch (error) {
      console.error("自动翻译当前可见图片失败", error);
    } finally {
      state.autoTranslateRunning = false;
    }
  }

  function hideHoverButton() {
    state.hoverActions.style.display = "none";
    state.hoverActions.style.pointerEvents = "none";
  }

  function scheduleHide() {
    clearHideTimer();
    state.hideTimer = window.setTimeout(() => {
      if (state.hoverActions.matches(":hover")) {
        return;
      }
      hideHoverButton();
    }, 180);
  }

  function clearHideTimer() {
    if (state.hideTimer) {
      clearTimeout(state.hideTimer);
      state.hideTimer = 0;
    }
  }

  function showToast(message) {
    state.toast.textContent = message;
    state.toast.dataset.visible = "true";
    clearTimeout(state.toast._timerId);
    state.toast._timerId = setTimeout(() => {
      state.toast.dataset.visible = "false";
    }, 2400);
  }

  async function persistCacheEntry(originalImageUrl, cacheInput) {
    const cacheEntry = normalizeCacheEntry(cacheInput);
    if (!originalImageUrl || !cacheEntry) {
      return;
    }
    const cacheKey = `${buildSettingsSignature(state.settings)}|${originalImageUrl}`;
    state.cache.set(cacheKey, cacheEntry);
    await chrome.storage.local.set({
      [CACHE_STORAGE_KEY]: Object.fromEntries(state.cache.entries())
    });
  }

  async function resolveCachedDisplayUrl(cacheInput) {
    const cacheEntry = normalizeCacheEntry(cacheInput);
    if (!cacheEntry) {
      return "";
    }
    if (cacheEntry.type === "inline_data_url") {
      return cacheEntry.value;
    }
    const response = await chrome.runtime.sendMessage({
      type: MESSAGE_TYPES.RESOLVE_IMAGE_FOR_DISPLAY,
      payload: { cacheEntry }
    });
    if (!response?.ok) {
      console.error("缓存结果解析失败", response?.error || response);
      return "";
    }
    return response.result || "";
  }

  async function restoreCachedImages(root) {
    const images = root instanceof HTMLImageElement
      ? [root]
      : Array.from(root.querySelectorAll?.("img") || []);

    for (const image of images) {
      if (!(image instanceof HTMLImageElement)) {
        continue;
      }
      if (!isQualifiedImage(image)) {
        continue;
      }
      if (image.closest(".itx-compare-overlay")) {
        continue;
      }
      const imageUrl = image.dataset.itxOriginalSrc || image.currentSrc || image.src;
      if (!imageUrl) {
        continue;
      }
      const cached = normalizeCacheEntry(state.cache.get(`${buildSettingsSignature(state.settings)}|${imageUrl}`));
      if (!cached) {
        continue;
      }
      if (image.dataset.itxTranslated === "true" && image.dataset.itxCacheUrl === getCacheEntryFingerprint(cached)) {
        continue;
      }
      const imageId = ensureImageId(image);
      const displayUrl = await resolveCachedDisplayUrl(cached);
      if (!displayUrl) {
        continue;
      }
      applyTranslatedImage(imageId, displayUrl, cached);
      setImageState(imageId, {
        status: "completed",
        imageUrl,
        translatedUrl: displayUrl,
        cacheEntry: cached
      });
    }
  }

  function observeDomChanges() {
    if (state.observer) {
      return;
    }
    state.observer = new MutationObserver((mutations) => {
      if (state.suppressObserver) {
        return;
      }
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (!(node instanceof Element)) {
            continue;
          }
          if (node.classList.contains("itx-compare-wrap") || node.classList.contains("itx-compare-overlay") || node.classList.contains("itx-image-controls")) {
            continue;
          }
          if (node instanceof HTMLImageElement) {
            restoreCachedImages(node);
            scheduleAutoTranslate();
            continue;
          }
          restoreCachedImages(node);
          scheduleAutoTranslate();
        }
      }
    });
    state.observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function runWithoutObserver(fn) {
    state.suppressObserver = true;
    try {
      fn();
    } finally {
      queueMicrotask(() => {
        state.suppressObserver = false;
      });
    }
  }
})();
