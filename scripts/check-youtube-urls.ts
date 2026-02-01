/**
 * Check every YouTube URL in exercises.seed.json via YouTube oembed.
 * Videos that return 404 or error are not embeddable (disabled by owner or unavailable).
 */
import { readFileSync } from "fs";
import { join } from "path";

const SEED_PATH = join(__dirname, "../data/exercises.seed.json");

type Media = { type: string; url: string; thumbnailUrl?: string | null };
type Exercise = { slug: string; name: string; media?: Media[] };

async function checkOembed(watchUrl: string): Promise<{ ok: boolean; status?: number }> {
  const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}`;
  try {
    const res = await fetch(url, { method: "GET" });
    if (!res.ok) return { ok: false, status: res.status };
    const data = (await res.json()) as { title?: string };
    return { ok: Boolean(data?.title) };
  } catch {
    return { ok: false };
  }
}

async function main() {
  const raw = readFileSync(SEED_PATH, "utf-8");
  const exercises = JSON.parse(raw) as Exercise[];

  const entries: { slug: string; name: string; url: string }[] = [];
  for (const ex of exercises) {
    const yt = ex.media?.find((m) => m.type === "youtube");
    if (yt?.url) entries.push({ slug: ex.slug, name: ex.name, url: yt.url });
  }

  const uniqueByUrl = new Map<string, { slug: string; name: string }[]>();
  for (const e of entries) {
    const list = uniqueByUrl.get(e.url) ?? [];
    list.push({ slug: e.slug, name: e.name });
    uniqueByUrl.set(e.url, list);
  }

  const failed: { url: string; exercises: { slug: string; name: string }[]; status?: number }[] =
    [];
  let checked = 0;
  for (const [url, exercisesForUrl] of uniqueByUrl) {
    const result = await checkOembed(url);
    checked++;
    if (!result.ok) {
      failed.push({
        url,
        exercises: exercisesForUrl,
        status: result.status,
      });
    }
    if (checked % 10 === 0)
      process.stdout.write(`Checked ${checked}/${uniqueByUrl.size} URLs...\r`);
  }

  console.log(`\nChecked ${uniqueByUrl.size} unique URLs. Failed: ${failed.length}\n`);
  if (failed.length === 0) {
    console.log("All YouTube URLs are embeddable.");
    return;
  }
  console.log("URLs that are NOT embeddable (replace in data/exercises.seed.json):\n");
  for (const f of failed) {
    console.log(f.url);
    console.log(`  Status: ${f.status ?? "error"}`);
    for (const e of f.exercises) console.log(`  - ${e.slug} (${e.name})`);
    console.log("");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
