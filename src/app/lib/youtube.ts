/**
 * YouTube URL helpers for embed and watch links.
 * Supports: watch?v=ID, youtu.be/ID, youtube.com/embed/ID, youtube.com/shorts/ID
 */
export function getYouTubeId(url: string): string | null {
  try {
    if (!url || typeof url !== "string") return null;
    const u = new URL(url.trim());

    if (u.hostname === "youtu.be") {
      const id = u.pathname.replace(/^\//, "").trim();
      return id || null;
    }

    const v = u.searchParams.get("v");
    if (v) return v;

    const parts = u.pathname.split("/").filter(Boolean);
    const embedIdx = parts.indexOf("embed");
    if (embedIdx >= 0 && parts[embedIdx + 1]) return parts[embedIdx + 1] ?? null;
    const shortsIdx = parts.indexOf("shorts");
    if (shortsIdx >= 0 && parts[shortsIdx + 1]) return parts[shortsIdx + 1] ?? null;

    return null;
  } catch {
    return null;
  }
}

export function toNoCookieEmbedUrl(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
}

export function toWatchUrl(url: string): string | null {
  const id = getYouTubeId(url);
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}
