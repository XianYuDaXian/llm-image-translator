# Chrome Web Store Review Notes

Last updated: 2026-04-28

This document is intended for Chrome Web Store review and submission materials for `LLM图片翻译助手 / LLM image translator`.

## 1. Single purpose

The extension has a single purpose:

- detect images on web pages
- let the user explicitly choose an image to translate
- send that image to the model endpoint configured by the user
- display the translated result image in place

The extension is not a general web automation tool, downloader, proxy, or ad-related product.

## 2. Why `<all_urls>` is required

The core product interaction is image translation directly on arbitrary websites.

To provide that interaction, the extension needs to:

- identify `<img>` elements on the active page
- show a hover translation button above eligible images
- support image translation from the page context
- support the task side panel for the current page

Without page access across sites, the extension cannot provide its main user-facing feature consistently.

## 3. Why custom endpoints are supported

The extension is a client for user-specified model services. It does not embed a single fixed provider.

Users may configure:

- official APIs
- OpenAI-compatible endpoints
- Gemini-compatible endpoints
- xAI-compatible image editing endpoints
- private self-hosted services
- local network services

The extension does not automatically send data to a developer-controlled server. Requests are sent only to the endpoint explicitly configured by the user.

## 4. User data flow

When a user initiates image translation or runs a provider test:

1. the extension reads the selected page image
2. the extension prepares a request using the user's configured endpoint
3. the request is sent directly to that user-configured endpoint
4. the result image is shown on the page and may be cached locally

The extension may also store:

- user settings
- recent task state
- excluded sites and excluded images
- cached result references
- `IndexedDB` blob cache for `base64` or binary image outputs

## 5. Privacy disclosure summary

The extension handles webpage images and related request metadata only as needed for the user-facing image translation feature.

The extension's privacy policy is available at:

- Project page: `https://xianyudaxian.github.io/llm-image-translator/`
- Privacy policy: `https://xianyudaxian.github.io/llm-image-translator/privacy.html`

## 6. Test instructions

Basic reviewer flow:

1. Install the unpacked extension.
2. Open the options page.
3. Add or edit a provider profile.
4. Fill in `Base URL`, `API Key`, `Model`, and other required fields.
5. Run:
   - `Test connectivity`
   - `Test model capability`
   - `Auto detect recommended config`
6. Open a webpage containing images.
7. Hover over an image and click the translate button.
8. Open the side panel to review recent tasks.

If a reviewer does not have access to a working model endpoint, the UI can still be reviewed without running a live translation.

## 7. Contact

Contact email:

`xian_yu@live.com`
