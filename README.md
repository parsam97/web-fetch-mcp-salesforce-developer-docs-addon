# web-fetch-mcp-salesforce-atlas-addon

A fetch-strategy plugin for [web-fetch-mcp](https://github.com/parsam97/web-fetch-mcp). It teaches the generic fetcher how to read **Salesforce Atlas documentation** (`developer.salesforce.com/docs/atlas.*.meta/...`).

## Why this exists

Atlas doc pages render their content client-side and gate it behind a cookie-consent shell, so a generic fetch (Jina or even a stealth headless browser) returns only the consent modal — never the article. This plugin sidesteps that by calling Salesforce's own documentation JSON API directly:

1. `GET /docs/get_document/<meta>` → resolves the current `locale`, `deliverable`, and `doc_version`.
2. `GET /docs/get_document_content/<deliverable>/<file>/<locale>/<version>` → returns the article HTML.

The HTML fragment is converted to markdown with Turndown. No browser, no consent handling, no per-release hardcoding (the version is resolved at request time).

This logic lives **here**, not in web-fetch-mcp, because that server is deliberately host-agnostic.

## Build

```bash
npm install
npm run build   # emits dist/index.js
npm test        # unit (offline) + one live integration test
```

## Use with web-fetch-mcp

Point `FETCH_PLUGINS` at the built module. The plugin claims only Atlas URLs; everything else falls through to the generic fetcher.

Local (Node) run:

```jsonc
"env": { "FETCH_PLUGINS": "/absolute/path/to/web-fetch-mcp-salesforce-atlas-addon/dist/index.js" }
```

Docker run — mount the built plugin into the container and reference its in-container path:

```bash
docker run -i --rm \
  -v /abs/path/web-fetch-mcp-salesforce-atlas-addon/dist:/plugins/atlas \
  -e FETCH_PLUGINS=/plugins/atlas/index.js \
  web-fetch-mcp
```

## The handler

Exports `handlers: Handler[]` with a single handler `salesforce-atlas-docs` — `{ name, matches(url), fetch(url) → { content } }`. The `Handler` shape mirrors web-fetch-mcp's plugin contract.
