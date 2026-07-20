/**
 * Keep OAuth return targets on this application. OAuth entry routes accept a
 * path rather than a full URL so an attacker cannot turn a callback into an
 * open redirect.
 */
export function normalizeReturnPath(
  value: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const parsed = new URL(value, "https://playlist.local");
    if (parsed.origin !== "https://playlist.local") return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}

export function returnPathWithError(path: string, error: string): string {
  const parsed = new URL(path, "https://playlist.local");
  parsed.searchParams.set("error", error);
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
