import "server-only";

const DISIFY_URL = "https://disify.com/api/email";
const BLOCK_CONFIDENCE = 90;
const REQUEST_TIMEOUT_MS = 2500;

function unavailable(reason, status = null) {
  console.warn("[disify] email validation unavailable", { reason, status });
  return { blocked: false, available: false, reason, status };
}

export async function checkDisposableEmail(email, { fetchImpl = fetch } = {}) {
  const apiKey = process.env.DISIFY_API_KEY;
  if (!apiKey) return unavailable("not_configured");

  try {
    const response = await fetchImpl(DISIFY_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Api-Key": apiKey,
      },
      body: new URLSearchParams({ email }).toString(),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) return unavailable("http_error", response.status);

    const result = await response.json();
    if (
      typeof result !== "object"
      || result === null
      || typeof result.format !== "boolean"
      || typeof result.disposable !== "boolean"
      || typeof result.confidence !== "number"
    ) {
      return unavailable("invalid_response");
    }

    return {
      available: true,
      blocked: result.format === true
        && result.disposable === true
        && result.confidence >= BLOCK_CONFIDENCE,
      confidence: result.confidence,
      signals: Array.isArray(result.signals)
        ? result.signals.filter((signal) => typeof signal === "string").slice(0, 10)
        : [],
    };
  } catch (error) {
    return unavailable(error?.name === "TimeoutError" ? "timeout" : "network_error");
  }
}
