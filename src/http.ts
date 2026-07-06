const FETCH_TIMEOUT_MS = 30_000;

const BROWSER_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "sec-ch-ua": '"Chromium";v="126", "Not.A/Brand";v="8"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
};

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

export async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
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

export async function fetchWithTimeout(
  url: string,
  headers: Record<string, string> = {}
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { ...BROWSER_HEADERS, ...headers },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}
