const FETCH_TIMEOUT_MS = 30_000;

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
    return await fetch(url, { headers, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}
