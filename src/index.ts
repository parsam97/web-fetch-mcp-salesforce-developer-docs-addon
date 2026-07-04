import { isAtlasDocUrl, fetchAtlasDoc } from "./atlas.js";
import { isModernDocUrl, fetchModernDoc } from "./markdown-docs.js";

export interface Handler {
  name: string;
  matches(url: string): boolean;
  fetch(url: string): Promise<{ content: string }>;
}

export const handlers: Handler[] = [
  {
    name: "salesforce-docs-markdown",
    matches: isModernDocUrl,
    fetch: fetchModernDoc,
  },
  {
    name: "salesforce-atlas-docs",
    matches: isAtlasDocUrl,
    fetch: fetchAtlasDoc,
  },
];
