import { useMemo, useState } from "react";
import { Activity, BarChart3, Flame, Leaf, Wind } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";

type AnalysisTab = "overall" | "health" | "food" | "aqi";
type TimeRange = "last_week" | "this_month";

const chartSeries = {
  last_week: [
    { label: "Mon", health: 72, food: 68, aqi: 60, overall: 67 },
    { label: "Tue", health: 75, food: 64, aqi: 58, overall: 66 },
    { label: "Wed", health: 70, food: 72, aqi: 55, overall: 68 },
    { label: "Thu", health: 78, food: 70, aqi: 57, overall: 70 },
    { label: "Fri", health: 80, food: 73, aqi: 59, overall: 72 },
    { label: "Sat", health: 74, food: 66, aqi: 61, overall: 67 },
    { label: "Sun", health: 76, food: 69, aqi: 63, overall: 69 },
  ],
  this_month: [
    { label: "W1", health: 70, food: 65, aqi: 56, overall: 65 },
    { label: "W2", health: 73, food: 67, aqi: 57, overall: 67 },
    { label: "W3", health: 76, food: 70, aqi: 59, overall: 69 },
    { label: "W4", health: 78, food: 72, aqi: 61, overall: 71 },
  ],
} as const;

const Analysis = () => {
  const [tab, setTab] = useState<AnalysisTab>("overall");
  const [range, setRange] = useState<TimeRange>("last_week");
  const rows = chartSeries[range];

  const chartKey: keyof (typeof rows)[number] = tab === "overall" ? "overall" : tab;
  const comparisonKey: keyof (typeof rows)[number] = tab === "overall" ? "health" : "overall";
  const maxValue = Math.max(...rows.map((row) => row[chartKey]), 1);
  const comparisonMaxValue = Math.max(...rows.map((row) => row[comparisonKey]), 1);

  const summaryCards = useMemo(
    () => [
      { label: "Overall", value: rows[rows.length - 1]?.overall ?? 0, icon: Activity, color: "text-primary" },
      { label: "Health", value: rows[rows.length - 1]?.health ?? 0, icon: BarChart3, color: "text-health-cyan" },
      { label: "Food", value: rows[rows.length - 1]?.food ?? 0, icon: Leaf, color: "text-health-teal" },
      { label: "AQI", value: rows[rows.length - 1]?.aqi ?? 0, icon: Wind, color: "text-health-rose" },
    ],
    [rows],
  );

  return (
    <AppLayout title="Deep Analysis" subtitle="Detailed trends for health, food, AQI, and overall score.">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-border/60 bg-card/60 p-1">
          {[
            { key: "overall", label: "Overall" },
            { key: "health", label: "Health" },
            { key: "food", label: "Food" },
            { key: "aqi", label: "AQI" },
          ].map((item) => (
            <Button
              key={item.key}
              type="button"
              variant={tab === item.key ? "default" : "ghost"}
              className="h-9 rounded-xl px-4 text-xs"
              onClick={() => setTab(item.key as AnalysisTab)}
            >
              {item.label}
            </Button>
          ))}
        </div>

        <div className="inline-flex rounded-2xl border border-border/60 bg-card/60 p-1">
          <Button
            type="button"
            variant={range === "last_week" ? "default" : "ghost"}
            className="h-9 rounded-xl px-4 text-xs"
            onClick={() => setRange("last_week")}
          >
            Last Week
          </Button>
          <Button
            type="button"
            variant={range === "this_month" ? "default" : "ghost"}
            className="h-9 rounded-xl px-4 text-xs"
            onClick={() => setRange("this_month")}
          >
            This Month
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => (
          <article key={card.label} className="glass-card rounded-2xl border-border/50 p-4">
            <div className="mb-2 flex items-center justify-between">
              <card.icon className={`h-4 w-4 ${card.color}`} />
              <span className="text-[11px] text-muted-foreground">Score</span>
            </div>
            <p className="text-xl font-bold">{card.value}</p>
            <p className="text-xs text-muted-foreground">{card.label}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Flame className="h-5 w-5 text-primary" />
            {tab[0].toUpperCase() + tab.slice(1)} Trend
          </h2>
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/75 to-card/35 p-4">
            <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_top,hsl(var(--border))_1px,transparent_1px)] [background-size:100%_22%]" />
            <div className="relative flex h-48 items-end gap-2 sm:gap-3">
              {rows.map((row) => (
                <div key={row.label} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className="relative min-h-3 rounded-t-md bg-gradient-to-t from-primary/65 via-primary/80 to-health-cyan/80 shadow-[0_10px_16px_-12px_rgba(15,118,110,0.95)]"
                    style={{ height: `${Math.round((row[chartKey] / maxValue) * 100)}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground">{row[chartKey]}</span>
                  </div>
                  <p className="mt-1 text-center text-[11px] font-medium text-muted-foreground">{row.label}</p>
                </div>
              ))}
            </div>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5">
          <h2 className="mb-3 text-lg font-semibold">Comparison with {comparisonKey === "overall" ? "Overall" : "Health"}</h2>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-4">
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={`cmp-${row.label}`}>
                  <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{row.label}</span>
                    <span>{row[comparisonKey]}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted/80">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-health-cyan/75 to-health-teal/85 shadow-[0_8px_12px_-10px_rgba(6,182,212,0.9)]"
                      style={{ width: `${Math.round((row[comparisonKey] / comparisonMaxValue) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default Analysis;
