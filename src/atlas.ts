import TurndownService from "turndown";
import { fetchWithTimeout, withRetry } from "./http.js";

const DOCS_BASE = "https://developer.salesforce.com/docs";

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

async function fetchJson(url: string): Promise<any> {
  const response = await fetchWithTimeout(url, { Accept: "application/json" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
  }
  return response.json();
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
