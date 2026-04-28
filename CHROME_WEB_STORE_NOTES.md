# Chrome Web Store 提审说明 / Review Notes

最后更新 / Last updated: 2026-04-28

本文档用于 `LLM图片翻译助手 / LLM image translator` 的 Chrome Web Store 提审说明与后台填写材料。  
This document is intended for Chrome Web Store review notes and submission materials for `LLM图片翻译助手 / LLM image translator`.

## 1. 单一用途 / Single purpose

该扩展的唯一用途是：  
The extension has a single purpose:

- 在网页中识别图片 / detect images on webpages
- 让用户明确选择某张图片进行翻译 / let the user explicitly choose an image to translate
- 将该图片发送到用户配置的模型端点 / send that image to the model endpoint configured by the user
- 将翻译后的结果图原位显示 / display the translated result image in place

该扩展不是通用自动化工具、下载器、代理工具或广告相关产品。  
The extension is not a general automation tool, downloader, proxy, or ad-related product.

## 2. 为什么需要 `<all_urls>` / Why `<all_urls>` is required

该扩展的核心交互是在任意网站的图片上直接提供翻译能力。  
The core interaction of the extension is to provide image translation directly on images across arbitrary websites.

为实现该能力，扩展需要：  
To provide this feature, the extension needs to:

- 识别当前页面中的 `<img>` 元素 / identify `<img>` elements on the active page
- 在符合条件的图片上显示悬浮翻译按钮 / show a hover translation button above eligible images
- 支持页面上下文中的图片翻译入口 / support image translation from the page context
- 支持当前页面任务侧边栏 / support the task side panel for the current page

如果没有跨站点的页面访问权限，扩展将无法稳定提供其核心功能。  
Without cross-site page access, the extension cannot reliably provide its main user-facing feature.

## 3. 为什么支持自定义端点 / Why custom endpoints are supported

该扩展本质上是一个模型服务客户端，不内置单一固定供应商。  
The extension is fundamentally a client for model services and does not embed a single fixed provider.

用户可以配置：  
Users may configure:

- 官方 API / official APIs
- OpenAI 兼容端点 / OpenAI-compatible endpoints
- Gemini 兼容端点 / Gemini-compatible endpoints
- xAI 兼容图片编辑端点 / xAI-compatible image editing endpoints
- 私有自托管服务 / private self-hosted services
- 局域网服务 / local network services

扩展不会默认把数据发送到开发者控制的服务器；请求只会发往用户显式配置的端点。  
The extension does not automatically send data to a developer-controlled server; requests are sent only to endpoints explicitly configured by the user.

## 4. 用户数据流 / User data flow

当用户发起图片翻译或运行服务测试时：  
When a user initiates image translation or runs a provider test:

1. 扩展读取用户选中的页面图片 / the extension reads the selected page image
2. 扩展使用用户配置的端点构造请求 / the extension prepares a request using the user's configured endpoint
3. 请求直接发送到该用户配置端点 / the request is sent directly to that user-configured endpoint
4. 结果图显示在页面中，并可能被本地缓存 / the result image is shown on the page and may be cached locally

扩展还可能本地存储：  
The extension may also store locally:

- 用户设置 / user settings
- 最近任务状态 / recent task state
- 排除的网站和图片 / excluded sites and excluded images
- 结果缓存引用 / cached result references
- 对 `base64` 或二进制结果使用的 `IndexedDB` blob 缓存 / `IndexedDB` blob cache for `base64` or binary outputs

## 5. 隐私披露摘要 / Privacy disclosure summary

该扩展仅在实现用户可见的图片翻译功能所必需的范围内处理网页图片及相关请求元数据。  
The extension handles webpage images and related request metadata only as needed for the user-facing image translation feature.

隐私政策地址：  
Privacy policy URLs:

- 项目主页 / Project page: `https://xianyudaxian.github.io/llm-image-translator/`
- 隐私政策 / Privacy policy: `https://xianyudaxian.github.io/llm-image-translator/privacy.html`

## 6. 测试说明 / Test instructions

审核员可按以下流程验证：  
Reviewers can validate the extension with the following flow:

1. 安装解压版扩展 / Install the unpacked extension.
2. 打开设置页 / Open the options page.
3. 添加或编辑服务配置 / Add or edit a provider profile.
4. 填写 `Base URL`、`API Key`、`Model` 等必要字段 / Fill in `Base URL`, `API Key`, `Model`, and other required fields.
5. 运行以下测试 / Run:
   - `Test connectivity`
   - `Test model capability`
   - `Auto detect recommended config`
6. 打开任意包含图片的网页 / Open a webpage containing images.
7. 悬浮到图片上并点击翻译按钮 / Hover over an image and click the translate button.
8. 打开侧边栏查看最近任务 / Open the side panel to review recent tasks.

如果审核员没有可用的模型端点，也可以先检查 UI 和权限声明；真实翻译能力需要有效 API 才能完成。  
If the reviewer does not have access to a working model endpoint, the UI and permission declarations can still be reviewed; live translation requires a valid API.

## 7. 联系方式 / Contact

联系邮箱 / Contact email:

`xian_yu@live.com`
