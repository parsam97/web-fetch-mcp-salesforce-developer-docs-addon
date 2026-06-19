import TurndownService from "turndown";

const DOCS_BASE = "https://developer.salesforce.com/docs";
const FETCH_TIMEOUT_MS = 30_000;

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export function isAtlasDocUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "developer.salesforce.com" &&
      /^\/docs\/atlas\.[^/]+\.meta\/.+/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

function parseAtlasUrl(url: string): { meta: string; contentFile: string } {
  const segments = new URL(url).pathname.split("/").filter(Boolean);
  return { meta: segments[1], contentFile: segments[segments.length - 1] };
}

function isRetryable(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  if (err.name === "AbortError" || err.message.includes("fetch failed")) return true;
  const match = err.message.match(/HTTP (\d+)/);
  if (match) {
    const status = parseInt(match[1], 10);
    return status === 429 || status >= 500;
  }
  return false;
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let delay = 1000;
  let lastError: unknown;
  for (let i = 1; i <= attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (i === attempts || !isRetryable(err)) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }
  throw lastError;
}

async function fetchJson(url: string): Promise<any> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAtlasDoc(url: string): Promise<{ content: string }> {
  return withRetry(async () => {
    const { meta, contentFile } = parseAtlasUrl(url);

    const toc = await fetchJson(`${DOCS_BASE}/get_document/${meta}`);
    const locale = toc?.locale;
    const deliverable = toc?.deliverable;
    const version = toc?.version?.doc_version;
    if (!locale || !deliverable || !version) {
      throw new Error(`Atlas TOC missing locale/deliverable/version for ${meta}`);
    }

    const contentUrl = `${DOCS_BASE}/get_document_content/${deliverable}/${contentFile}/${locale}/${version}`;
    const doc = await fetchJson(contentUrl);
    const html: string = doc?.content;
    if (!html) {
      throw new Error(`Atlas content empty for ${contentFile}`);
    }

    return { content: turndown.turndown(html) };
  });
}
