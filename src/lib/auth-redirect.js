export function safeRedirectPath(value, fallback = "/") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://freetexttoimage.local");
    if (parsed.origin !== "https://freetexttoimage.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function loginPathWithRedirect(loginPath, returnTo) {
  const target = safeRedirectPath(returnTo);
  return `${loginPath}?redirect=${encodeURIComponent(target)}`;
}
