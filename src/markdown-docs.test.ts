import { describe, it, expect, vi, afterEach } from "vitest";
import { isModernDocUrl, fetchModernDoc } from "./markdown-docs.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("isModernDocUrl", () => {
  it("matches a modern docs URL", () => {
    expect(
      isModernDocUrl(
        "https://developer.salesforce.com/docs/revenue/cpq-developer-guide/guide/cpq-api-get-started.html"
      )
    ).toBe(true);
  });

  it("rejects Atlas URLs (handled by the Atlas handler)", () => {
    expect(
      isModernDocUrl(
        "https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_anonymous_block.htm"
      )
    ).toBe(false);
  });

  it("rejects non-.html paths", () => {
    expect(
      isModernDocUrl("https://developer.salesforce.com/docs/platform/lwc/overview")
    ).toBe(false);
  });

  it("rejects other hosts", () => {
    expect(
      isModernDocUrl("https://example.com/docs/revenue/cpq-developer-guide/guide/x.html")
    ).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isModernDocUrl("not a url")).toBe(false);
  });
});

describe("fetchModernDoc fallback (offline)", () => {
  it("falls back to SSR HTML when the .md variant is not markdown", async () => {
    const mdShell = new Response("<!DOCTYPE html><html>spa shell</html>", {
      status: 404,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
    const ssrPage = new Response(
      "<html><nav>chrome</nav><main role=\"main\"><h1>Real Title</h1><p>Body text.</p></main><footer>x</footer></html>",
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mdShell)
      .mockResolvedValueOnce(ssrPage);
    vi.stubGlobal("fetch", fetchMock);

    const { content } = await fetchModernDoc(
      "https://developer.salesforce.com/docs/revenue/cpq-developer-guide/guide/no-md-yet.html"
    );

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://developer.salesforce.com/docs/revenue/cpq-developer-guide/guide/no-md-yet.md"
    );
    expect(fetchMock.mock.calls[1][0]).toBe(
      "https://developer.salesforce.com/docs/revenue/cpq-developer-guide/guide/no-md-yet.html"
    );
    expect(content).toContain("# Real Title");
    expect(content).not.toContain("chrome");
    expect(content).not.toContain("footer");
  });
});

describe("fetchModernDoc (live)", () => {
  it("fetches native markdown via the .md variant", async () => {
    const { content } = await fetchModernDoc(
      "https://developer.salesforce.com/docs/revenue/cpq-developer-guide/guide/cpq-api-get-started.html"
    );
    expect(content).toContain("# Get Started with Salesforce CPQ API");
    expect(content).not.toContain("<script");
    expect(content).not.toContain("<!DOCTYPE");
  }, 60_000);

  it("follows redirects to relocated markdown", async () => {
    const { content } = await fetchModernDoc(
      "https://developer.salesforce.com/docs/einstein/genai/guide/get-started.html"
    );
    expect(content.length).toBeGreaterThan(500);
    expect(content).not.toContain("<!DOCTYPE");
  }, 60_000);
});
