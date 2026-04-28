# LLM图片翻译助手隐私政策 / Privacy Policy

最后更新 / Last updated: 2026-04-28

`LLM图片翻译助手（LLM image translator）` 是一个浏览器扩展，用于识别网页中的图片，并将用户选择翻译的图片发送到**用户自行配置**的大模型图像服务端点，生成翻译后的结果图并在页面中展示。  
`LLM图片翻译助手 (LLM image translator)` is a browser extension that detects images on webpages and sends user-selected images to **user-configured** model image endpoints, then displays the translated result image on the page.

本隐私政策适用于本扩展及其公开项目页面。  
This privacy policy applies to the extension and its public project pages.

## 1. 我们处理哪些数据 / What data we process

为了提供图片翻译功能，扩展可能会处理以下数据：  
To provide image translation features, the extension may process the following data:

- 当前网页中的图片内容  
  Image content on the current webpage
- 图片 URL  
  Image URLs
- 当前页面 URL 或页面所属站点信息  
  Current page URL or site information
- 用户在设置页中填写的服务配置，包括：  
  User-provided service configuration from the settings page, including:
  - `Base URL`
  - `API Key`
  - `Model`
  - `Endpoint Mode`
  - 自定义 Header / Custom headers
  - 自定义响应路径 / Custom response paths
- 扩展运行过程中生成的任务状态、错误信息与结果缓存  
  Task state, error messages, and result cache generated during extension use

## 2. 我们如何使用这些数据 / How we use this data

扩展仅将上述数据用于以下目的：  
The extension uses the above data only for the following purposes:

- 识别当前网页中的可翻译图片  
  Detect translatable images on the current webpage
- 将用户明确选择的图片发送到用户配置的模型服务进行翻译  
  Send explicitly user-selected images to the user-configured model service for translation
- 在页面中显示翻译结果  
  Display the translated result on the page
- 在本地缓存翻译结果，避免重复请求  
  Cache translation results locally to avoid duplicate requests
- 在设置页执行连通性测试、能力测试和自动探测  
  Run connectivity tests, capability tests, and auto-detection from the settings page

## 3. 数据会发送给谁 / Who data is sent to

本扩展**不会默认**将图片或请求数据发送到开发者自有服务器。  
The extension does **not** send images or request data to a developer-controlled server by default.

当用户触发翻译、测试或自动探测时，相关请求会直接发送到**用户在扩展设置页中显式配置的第三方模型服务端点**。这些端点可能包括但不限于：  
When a user triggers translation, testing, or auto-detection, related requests are sent directly to the **third-party model service endpoint explicitly configured by the user in the extension settings**. These endpoints may include but are not limited to:

- OpenAI 官方接口 / OpenAI official APIs
- Gemini 官方接口 / Gemini official APIs
- xAI 兼容接口 / xAI-compatible endpoints
- OpenAI / Gemini 兼容接口 / OpenAI- or Gemini-compatible endpoints
- 用户自建私有服务 / User self-hosted private services
- 用户自建局域网服务 / User self-hosted local network services

用户应自行评估并确认目标服务的可信度、可用性和隐私政策。  
Users are responsible for evaluating the trustworthiness, availability, and privacy practices of the services they configure.

## 4. 本地存储 / Local storage

扩展会在浏览器本地存储以下数据，用于完成功能本身：  
The extension stores the following data locally in the browser to provide its features:

- 扩展设置 / Extension settings
- 最近任务状态 / Recent task state
- 排除翻译的网站与图片 / Excluded sites and excluded images
- 翻译结果缓存 / Translation result cache

其中：  
In particular:

- 远端返回的图片 URL 会作为缓存引用保存  
  Remote image URLs may be stored as cache references
- 对于 `base64` 或二进制结果图，扩展会将图片二进制缓存到浏览器本地 `IndexedDB`  
  For `base64` or binary result images, the extension stores image binaries in local browser `IndexedDB`

这些数据默认不会主动同步到开发者服务器。  
This data is not proactively synchronized to a developer-controlled server by default.

## 5. 数据共享与出售 / Data sharing and sale

开发者不会出售用户数据，也不会主动将扩展处理的数据共享给与本功能无关的第三方。  
The developer does not sell user data and does not proactively share extension-processed data with unrelated third parties.

唯一的外部数据传输场景，是用户主动配置并使用某个模型服务端点时，扩展将请求直接发送到该端点。  
The only external data transfer scenario is when a user configures and uses a model service endpoint, in which case the extension sends requests directly to that endpoint.

## 6. 用户控制 / User controls

用户可以随时：  
Users may at any time:

- 修改或删除模型服务配置 / Modify or delete model service configuration
- 清除浏览器中的扩展本地存储数据 / Clear the extension's local browser storage
- 停用或卸载扩展 / Disable or uninstall the extension
- 配置排除翻译的网站 / Configure excluded websites
- 停止使用任意第三方模型服务端点 / Stop using any third-party model service endpoint

## 7. 数据安全说明 / Data security note

本扩展是一个模型服务客户端，支持用户自定义端点。若用户配置的是第三方、私有部署或局域网服务，数据安全取决于用户所选择服务的网络环境和实现方式。  
This extension is a client for model services and supports user-defined endpoints. If users configure third-party, privately hosted, or local network services, data security depends on the network environment and implementation of those services.

用户应仅在自己信任的服务上使用本扩展。  
Users should only use this extension with services they trust.

## 8. 联系方式 / Contact

如有隐私政策相关问题，请联系：  
If you have any questions about this privacy policy, contact:

`xian_yu@live.com`
