import { trackEvent } from "@/src/server/lib/events";
import { getWeeklyTrend } from "./trend";
import { getAdherenceAlerts } from "@/src/core/adherence/alerts";

export async function getAdherenceAlertsHandler(userId: string, url: string) {
  const trendResult = await getWeeklyTrend(userId, url);
  if (trendResult.status !== 200) return trendResult;

  const body = trendResult.body as {
    weeks: number;
    items: {
      weekStart: string;
      totalPercent: number;
      trainingPercent: number;
      nutritionPercent: number;
      computedAt?: string;
    }[];
    missing: string[];
  };

  const trendItems = body.items.map((i) => ({
    weekStart: i.weekStart,
    totalPercent: i.totalPercent,
    trainingPercent: i.trainingPercent,
    nutritionPercent: i.nutritionPercent,
  }));

  const alerts = getAdherenceAlerts(trendItems);

  trackEvent("adherence_insights_viewed", {
    endpoint: "/api/adherence/alerts",
    weeks: body.weeks,
    itemsCount: body.items.length,
    missingCount: body.missing.length,
    alertsCount: alerts.length,
  });

  return {
    status: 200,
    body: {
      weeks: body.weeks,
      items: body.items,
      missing: body.missing,
      alerts,
    },
  };
}
