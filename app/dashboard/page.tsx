import { getAnalyticsSummary, getAnalyticsOverTime, getRecentActivities } from "@/app/actions/analytics"
import { AnalyticsCharts } from "@/components/analytics-charts"

export default async function Page() {
  const [summary, timeline, activities] = await Promise.all([
    getAnalyticsSummary(30),
    getAnalyticsOverTime(30),
    getRecentActivities(10),
  ]);

  return (
    <div className="@container/main flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
        <AnalyticsCharts summary={summary} timeline={timeline} activities={activities} />
      </div>
    </div>
  )
}