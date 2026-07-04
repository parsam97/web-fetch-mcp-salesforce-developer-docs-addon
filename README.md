# web-fetch-mcp-salesforce-developer-docs-addon

A fetch-strategy plugin for [web-fetch-mcp](https://github.com/parsam97/web-fetch-mcp). It teaches the generic fetcher how to read **Salesforce developer documentation** on `developer.salesforce.com` — both the legacy Atlas system and the modern docs platform.

## Why this exists

### Atlas docs (`/docs/atlas.*.meta/...`)

Atlas doc pages render their content client-side and gate it behind a cookie-consent shell, so a generic fetch (Jina or even a stealth headless browser) returns only the consent modal — never the article. This plugin sidesteps that by calling Salesforce's own documentation JSON API directly:

1. `GET /docs/get_document/<meta>` → resolves the current `locale`, `deliverable`, and `doc_version`.
2. `GET /docs/get_document_content/<deliverable>/<file>/<locale>/<version>` → returns the article HTML.

The HTML fragment is converted to markdown with Turndown. No browser, no consent handling, no per-release hardcoding (the version is resolved at request time).

### Modern docs (`/docs/<product>/<guide>/guide/<page>.html`)

Salesforce is rolling out native markdown for modern doc pages: swapping the `.html` extension for `.md` returns the page as `text/markdown` — canonical markdown straight from the source, no conversion loss. The `salesforce-docs-markdown` handler fetches that variant first, verifying the response content type (unsupported pages return an HTML shell with a 200/404, never a markdown 404). Where `.md` isn't rolled out yet, it falls back to the page's server-rendered HTML: the `<main>` element is extracted and converted with Turndown.

This logic lives **here**, not in web-fetch-mcp, because that server is deliberately host-agnostic.

## Build

```bash
npm install
npm run build   # emits dist/index.js
npm test        # unit (offline) + one live integration test
```

## Use with web-fetch-mcp

Point `FETCH_PLUGINS` at the built module. The plugin claims only `developer.salesforce.com` doc URLs; everything else falls through to the generic fetcher.

Local (Node) run:

```jsonc
"env": { "FETCH_PLUGINS": "/absolute/path/to/web-fetch-mcp-salesforce-developer-docs-addon/dist/index.js" }
```

Docker run — mount the built plugin into the container and reference its in-container path:

```bash
docker run -i --rm \
  -v /abs/path/web-fetch-mcp-salesforce-developer-docs-addon/dist:/plugins/sf-developer-docs \
  -e FETCH_PLUGINS=/plugins/sf-developer-docs/index.js \
  web-fetch-mcp
```

## The handlers

Exports `handlers: Handler[]` — `{ name, matches(url), fetch(url) → { content } }`, mirroring web-fetch-mcp's plugin contract:

- `salesforce-docs-markdown` — modern doc pages, native `.md` variant with SSR-HTML fallback.
- `salesforce-atlas-docs` — Atlas doc pages via the documentation JSON API.
