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

// Slugs que NO deben existir como ejercicios (bloques / plantillas)
const BLOCK_SLUGS = new Set([
  "circuit-a",
  "circuit-b",
  "hiit-block",
  "tabata",
  "amrap",
  "emom",
  "chipper",
  "metcon",
  "wod",
  "finisher",
  "warm-up-set",
  "cool-down-set",
  "mobility-block",
  "stretch-sequence",
  "recovery-run",
  "cross-train",
  "combo-session",
  "hybrid",
  "fusion-workout",
  "mixed-block",
]);

// Rechazados explícitos del proyecto
const REJECTED_SLUGS = new Set(["dead-bug", "deadbug"]);

// Duplicados/aliases típicos (solo los que sabemos que queréis unificar)
const SLUG_ALIASES: Record<string, string> = {
  // wall sit
  "wall-sit": "sentadilla-contra-la-pared",
  // pelvic tilt (si alguien lo añadió en inglés)
  "pelvic-tilt": "inclinacion-pelvica",
  // superman (si alguien creó slug alternativo)
  "superman-exercise": "superman",
  // push-up duplicates
  "calisthenics-push-up-41": "home-push-up-20",
  // romanian deadlift
  "romanian-deadlift": "peso-muerto-rumano",
  // burpee
  burpee: "home-burpee-26",
};

function hasYouTube(media?: Media[]) {
  return !!media?.some((m) => m.type === "youtube" && m.url?.includes("youtube.com"));
}
function hasImage(media?: Media[]) {
  return !!media?.some((m) => m.type === "image" && !!m.url);
}

function score(e: ExerciseSeed): number {
  let s = 0;
  if (e.description && e.description.trim().length > 40) s += 2;
  if (Array.isArray(e.cues) && e.cues.length >= 3) s += 2;
  if (hasYouTube(e.media)) s += 4;
  if (hasImage(e.media)) s += 2;
  if (Array.isArray(e.commonMistakes) && e.commonMistakes.length >= 2) s += 1;
  if (Array.isArray(e.regressions) && e.regressions.length >= 1) s += 1;
  if (Array.isArray(e.progressions) && e.progressions.length >= 1) s += 1;
  return s;
}

function normalizeSlug(raw: string): string {
  const s = (raw || "").trim();
  return SLUG_ALIASES[s] ?? s;
}

function looksLikeBlock(e: ExerciseSeed): boolean {
  const name = (e.name || "").toLowerCase();
  const slug = (e.slug || "").toLowerCase();
  if (BLOCK_SLUGS.has(slug)) return true;
  if (name.includes("block") || name.includes("circuit") || name.includes("tabata")) return true;
  if (
    name.includes("amrap") ||
    name.includes("emom") ||
    name.includes("wod") ||
    name.includes("metcon")
  )
    return true;
  return false;
}

function patchKnownCanonicals(e: ExerciseSeed): ExerciseSeed {
  // Unificar nombres (sin tocar slugs para no romper URLs)
  if (e.slug === "sentadilla-contra-la-pared") {
    if (!e.name.toLowerCase().includes("isométrica")) {
      e.name = "Sentadilla contra la pared (Wall sit / sentadilla isométrica)";
    }
    if (e.description && !e.description.toLowerCase().includes("isométrica")) {
      e.description = `También llamada sentadilla isométrica en pared: mantienes una posición de "sentado" apoyando la espalda en la pared. Es simple, sin impacto y fácil de dosificar.\n\n${e.description}`;
    }
  }

  if (e.slug === "inclinacion-pelvica") {
    if (!e.name.toLowerCase().includes("básculación")) {
      e.name = "Inclinación / básculación pélvica (pelvic tilt)";
    }
    if (e.description && !e.description.toLowerCase().includes("básculación")) {
      e.description = `Movimiento suave de pelvis y zona lumbar, también llamado básculación pélvica.\n\n${e.description}`;
    }
  }

  return e;
}

async function main() {
  const raw = await fs.readFile(INPUT, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error("data/exercises.seed.json debe ser un array de ejercicios.");
  }

  const originalCount = parsed.length;

  // Normaliza slugs + filtra rechazados/bloques
  const cleaned: ExerciseSeed[] = [];
  const removed: { slug: string; reason: string }[] = [];

  for (const item of parsed) {
    if (!item?.slug || !item?.name) continue;

    const e: ExerciseSeed = { ...item, slug: normalizeSlug(String(item.slug)) };

    const lowerSlug = e.slug.toLowerCase();
    if (REJECTED_SLUGS.has(lowerSlug)) {
      removed.push({ slug: e.slug, reason: "rejected" });
      continue;
    }
    if (looksLikeBlock(e)) {
      removed.push({ slug: e.slug, reason: "block" });
      continue;
    }

    cleaned.push(patchKnownCanonicals(e));
  }

  // Dedup por slug quedándonos con el "mejor" (score)
  const bySlug = new Map<string, ExerciseSeed>();
  const deduped: { slug: string; kept: number; dropped: number }[] = [];

  for (const e of cleaned) {
    const prev = bySlug.get(e.slug);
    if (!prev) {
      bySlug.set(e.slug, e);
      continue;
    }
    const prevScore = score(prev);
    const nextScore = score(e);

    if (nextScore > prevScore) {
      bySlug.set(e.slug, e);
      deduped.push({ slug: e.slug, kept: nextScore, dropped: prevScore });
    } else {
      deduped.push({ slug: e.slug, kept: prevScore, dropped: nextScore });
    }
  }

  // Orden estable (env, name) para diffs limpios
  const out = Array.from(bySlug.values()).sort((a, b) => {
    const ea = (a.environment || "").localeCompare(b.environment || "");
    if (ea !== 0) return ea;
    return (a.name || "").localeCompare(b.name || "");
  });

  // Backup
  const backupPath = INPUT.replace(/\.json$/, `.bak.${Date.now()}.json`);
  await fs.writeFile(backupPath, raw, "utf-8");

  await fs.writeFile(INPUT, JSON.stringify(out, null, 2) + "\n", "utf-8");

  // Log de auditoría
  console.log(`[normalize] input: ${originalCount}`);
  console.log(`[normalize] removed: ${removed.length}`);
  if (removed.length) console.log(removed.slice(0, 30));
  console.log(`[normalize] output: ${out.length}`);
  if (deduped.length) console.log(`[normalize] dedup events: ${deduped.length}`);
  console.log(`[normalize] backup: ${backupPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
