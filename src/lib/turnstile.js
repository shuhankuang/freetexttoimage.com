import "server-only";

export const TURNSTILE_ACTION = "turnstile-spin-v1";

const VERIFY_ENDPOINT = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const DEFAULT_HOSTNAMES = ["freetexttoimage.com", "www.freetexttoimage.com", "localhost", "127.0.0.1"];
const PASSING_TEST_SECRET = "1x0000000000000000000000000000000AA";

function allowedHostnames() {
  const configured = process.env.TURNSTILE_ALLOWED_HOSTNAMES
    ?.split(",")
    .map((hostname) => hostname.trim().toLowerCase())
    .filter(Boolean);

  return new Set(configured?.length ? configured : DEFAULT_HOSTNAMES);
}

export async function verifyTurnstileToken(token) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret || !token) return false;

  try {
    const response = await fetch(VERIFY_ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return false;

    const result = await response.json();
    const usesLocalTestKey = process.env.NODE_ENV !== "production"
      && process.env.TURNSTILE_TEST_MODE === "true"
      && secret === PASSING_TEST_SECRET;
    if (usesLocalTestKey) return result.success === true;

    return result.success === true
      && result.action === TURNSTILE_ACTION
      && typeof result.hostname === "string"
      && allowedHostnames().has(result.hostname.toLowerCase());
  } catch (error) {
    console.error("Turnstile verification failed", error);
    return false;
  }
}
