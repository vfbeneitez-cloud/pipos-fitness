/**
 * Adherence calculation from training and nutrition logs (7-day).
 * Used by adjustWeeklyPlan for AI context and fallback rules.
 */

export function calculateAdherence(
  trainingLogs: Array<{ completed: boolean }>,
  nutritionLogs: Array<{ followedPlan: boolean }>,
): { training: number; nutrition: number } {
  const trainingAdherence =
    trainingLogs.length > 0
      ? trainingLogs.filter((l) => l.completed).length / trainingLogs.length
      : 1;
  const nutritionAdherence =
    nutritionLogs.length > 0
      ? nutritionLogs.filter((l) => l.followedPlan).length / nutritionLogs.length
      : 1;
  return { training: trainingAdherence, nutrition: nutritionAdherence };
}
