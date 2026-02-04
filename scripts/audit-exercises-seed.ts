import { promises as fs } from "node:fs";
import path from "node:path";

type Media = { type: string; url: string; thumbnailUrl?: string };
type ExerciseSeed = {
  slug: string;
  name: string;
  environment: string;
  primaryMuscle: string;
  description?: string;
  cues?: string[];
  commonMistakes?: string[];
  regressions?: string[];
  progressions?: string[];
  media?: Media[];
};

const INPUT = path.resolve(process.cwd(), "data/exercises.seed.json");

function youtubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com")) return u.searchParams.get("v");
    if (u.hostname === "youtu.be") return u.pathname.replace("/", "") || null;
    return null;
  } catch {
    return null;
  }
}

function isCommons(url: string) {
  return url.includes("upload.wikimedia.org") || url.includes("commons.wikimedia.org");
}

function normName(name: string) {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const raw = await fs.readFile(INPUT, "utf-8");
  const arr: ExerciseSeed[] = JSON.parse(raw);

  const bySlug = new Map<string, ExerciseSeed[]>();
  const byNormName = new Map<string, ExerciseSeed[]>();

  const missingYouTube: ExerciseSeed[] = [];
  const missingImage: ExerciseSeed[] = [];
  const nonCommonsImages: { slug: string; url: string }[] = [];
  const badYoutubeUrls: { slug: string; url: string }[] = [];

  const environments = new Set<string>();
  const muscles = new Set<string>();

  for (const e of arr) {
    environments.add(e.environment);
    muscles.add(e.primaryMuscle);

    bySlug.set(e.slug, [...(bySlug.get(e.slug) ?? []), e]);

    const nn = normName(e.name);
    byNormName.set(nn, [...(byNormName.get(nn) ?? []), e]);

    const media = e.media ?? [];
    const yt = media.filter((m) => m.type === "youtube");
    const img = media.filter((m) => m.type === "image");

    if (yt.length === 0) missingYouTube.push(e);
    else {
      for (const m of yt) {
        const id = youtubeId(m.url);
        if (!id) badYoutubeUrls.push({ slug: e.slug, url: m.url });
      }
    }

    if (img.length === 0) missingImage.push(e);
    else {
      for (const m of img) {
        if (!isCommons(m.url)) nonCommonsImages.push({ slug: e.slug, url: m.url });
      }
    }
  }

  const dupSlugs = Array.from(bySlug.entries()).filter(([, v]) => v.length > 1);
  const dupNames = Array.from(byNormName.entries()).filter(([, v]) => v.length > 1);

  const report = {
    total: arr.length,
    duplicateSlugs: dupSlugs.map(([slug, items]) => ({
      slug,
      count: items.length,
      names: items.map((x) => x.name),
    })),
    duplicateNames: dupNames
      .map(([name, items]) => ({
        normalizedName: name,
        count: items.length,
        slugs: items.map((x) => x.slug),
      }))
      .slice(0, 50),
    missingYouTube: missingYouTube.map((e) => ({ slug: e.slug, name: e.name })).slice(0, 50),
    missingImage: missingImage.map((e) => ({ slug: e.slug, name: e.name })).slice(0, 50),
    badYoutubeUrls: badYoutubeUrls.slice(0, 100),
    nonCommonsImages: nonCommonsImages.slice(0, 100),
    environments: Array.from(environments).sort(),
    primaryMuscles: Array.from(muscles).sort(),
  };

  const outPath = path.resolve(process.cwd(), "data/exercises.audit.json");
  await fs.writeFile(outPath, JSON.stringify(report, null, 2) + "\n", "utf-8");

  console.log(`[audit] total: ${report.total}`);
  console.log(`[audit] duplicate slugs: ${report.duplicateSlugs.length}`);
  console.log(`[audit] duplicate names: ${dupNames.length}`);
  console.log(`[audit] missing youtube: ${missingYouTube.length}`);
  console.log(`[audit] missing image: ${missingImage.length}`);
  console.log(`[audit] bad youtube urls: ${badYoutubeUrls.length}`);
  console.log(`[audit] non-commons images: ${nonCommonsImages.length}`);
  console.log(`[audit] wrote: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
