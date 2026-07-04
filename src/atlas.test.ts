import { describe, it, expect } from "vitest";
import { isAtlasDocUrl, fetchAtlasDoc } from "./atlas.js";

describe("isAtlasDocUrl", () => {
  it("matches an Atlas docs URL", () => {
    expect(
      isAtlasDocUrl(
        "https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_anonymous_block.htm"
      )
    ).toBe(true);
  });

  it("rejects non-Atlas developer.salesforce.com docs (markdown handler covers those)", () => {
    expect(
      isAtlasDocUrl(
        "https://developer.salesforce.com/docs/platform/named-credentials/guide/get-started.html"
      )
    ).toBe(false);
  });

  it("rejects other hosts", () => {
    expect(
      isAtlasDocUrl("https://example.com/docs/atlas.en-us.apexcode.meta/apexcode/x.htm")
    ).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isAtlasDocUrl("not a url")).toBe(false);
  });
});

describe("fetchAtlasDoc (live)", () => {
  it("extracts real article content from a consent-gated Atlas page", async () => {
    const { content } = await fetchAtlasDoc(
      "https://developer.salesforce.com/docs/atlas.en-us.apexcode.meta/apexcode/apex_anonymous_block.htm"
    );
    expect(content.length).toBeGreaterThan(500);
    expect(content).toContain("anonymous block");
    expect(content).not.toContain("Cookie Consent Manager");
    expect(content).not.toContain("<script");
  }, 60_000);
});
