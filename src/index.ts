import { isAtlasDocUrl, fetchAtlasDoc } from "./atlas.js";

export interface Handler {
  name: string;
  matches(url: string): boolean;
  fetch(url: string): Promise<{ content: string }>;
}

export const handlers: Handler[] = [
  {
    name: "salesforce-atlas-docs",
    matches: isAtlasDocUrl,
    fetch: fetchAtlasDoc,
  },
];
