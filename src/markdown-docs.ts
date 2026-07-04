import TurndownService from "turndown";
import { fetchWithTimeout, withRetry } from "./http.js";

const turndown = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
  bulletListMarker: "-",
});

export function isModernDocUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return (
      u.hostname === "developer.salesforce.com" &&
      /^\/docs\/(?!atlas\.)[^/]+\/.+\.html$/.test(u.pathname)
    );
  } catch {
    return false;
  }
}

function markdownUrl(url: string): string {
  const u = new URL(url);
  u.pathname = u.pathname.replace(/\.html$/, ".md");
  u.search = "";
  u.hash = "";
  return u.toString();
}

async function fetchHtmlFallback(url: string): Promise<{ content: string }> {
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText} (${url})`);
  }
  const html = await response.text();
  const main = html.match(/<main[\s>][\s\S]*<\/main>/)?.[0] ?? html;
  return { content: turndown.turndown(main) };
}

export async function fetchModernDoc(url: string): Promise<{ content: string }> {
  return withRetry(async () => {
    const mdUrl = markdownUrl(url);
    const response = await fetchWithTimeout(mdUrl, { Accept: "text/markdown" });
    if (response.status === 429 || response.status >= 500) {
      throw new Error(`HTTP ${response.status}: ${response.statusText} (${mdUrl})`);
    }
    const contentType = response.headers.get("content-type") ?? "";
    if (response.ok && contentType.includes("text/markdown")) {
      return { content: await response.text() };
    }
    return fetchHtmlFallback(url);
  });
}
