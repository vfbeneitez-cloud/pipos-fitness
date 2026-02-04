/**
 * Red-flag detection from training logs (pain, serious symptoms).
 * Used by adjustWeeklyPlan before calling AI.
 */

export type RedFlag = {
  detected: boolean;
  message?: string;
};

export function detectRedFlags(logs: Array<{ pain: boolean; painNotes: string | null }>): RedFlag {
  const hasPain = logs.some((l) => l.pain);
  const painNotes = logs
    .filter((l) => l.pain && l.painNotes)
    .map((l) => l.painNotes?.toLowerCase() ?? "")
    .join(" ");
  const redFlagKeywords = [
    "agudo",
    "mareos",
    "dificultad respiratoria",
    "lesión",
    "lesion",
    "grave",
    "intenso",
  ];

  if (hasPain && redFlagKeywords.some((kw) => painNotes.includes(kw))) {
    return {
      detected: true,
      message:
        "He detectado señales que requieren atención profesional. Recomiendo consultar con un profesional sanitario antes de continuar.",
    };
  }

  return { detected: false };
}
