import { useMemo, useState } from "react";
import { Activity, BarChart3, Flame, Leaf, Wind, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
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

const getColorByTab = (tab: AnalysisTab) => {
  switch (tab) {
    case "health":
      return "from-health-indigo/65 via-health-indigo/80 to-health-cyan/80";
    case "food":
      return "from-health-teal/65 via-health-teal/80 to-health-cyan/80";
    case "aqi":
      return "from-health-rose/65 via-health-rose/80 to-orange-400/80";
    default:
      return "from-primary/65 via-primary/80 to-health-cyan/80";
  }
};

const getMetricColor = (metric: AnalysisTab) => {
  switch (metric) {
    case "health":
      return "bg-health-indigo/20 text-health-indigo border-health-indigo/30";
    case "food":
      return "bg-health-teal/20 text-health-teal border-health-teal/30";
    case "aqi":
      return "bg-health-rose/20 text-health-rose border-health-rose/30";
    default:
      return "bg-primary/20 text-primary border-primary/30";
  }
};

const Analysis = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<AnalysisTab>("overall");
  const [range, setRange] = useState<TimeRange>("last_week");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const rows = chartSeries[range];

  const chartKey: keyof (typeof rows)[number] = tab === "overall" ? "overall" : tab;
  const comparisonKey: keyof (typeof rows)[number] = tab === "overall" ? "health" : "overall";
  const maxValue = Math.max(...rows.map((row) => row[chartKey]), 1);
  const comparisonMaxValue = Math.max(...rows.map((row) => row[comparisonKey]), 1);

  // Calculate trend
  const calculateTrend = () => {
    if (rows.length < 2) return { change: 0, percent: 0, isPositive: false };
    const first = rows[0][chartKey];
    const last = rows[rows.length - 1][chartKey];
    const change = last - first;
    const percent = Math.round((Math.abs(change) / first) * 100);
    return { change, percent, isPositive: change >= 0 };
  };

  const trend = calculateTrend();

  const summaryCards = useMemo(
    () => [
      { 
        label: "Overall", 
        value: rows[rows.length - 1]?.overall ?? 0, 
        icon: Activity, 
        color: "text-primary",
        metric: "overall" as AnalysisTab
      },
      { 
        label: "Health", 
        value: rows[rows.length - 1]?.health ?? 0, 
        icon: BarChart3, 
        color: "text-health-cyan",
        metric: "health" as AnalysisTab
      },
      { 
        label: "Food", 
        value: rows[rows.length - 1]?.food ?? 0, 
        icon: Leaf, 
        color: "text-health-teal",
        metric: "food" as AnalysisTab
      },
      { 
        label: "AQI", 
        value: rows[rows.length - 1]?.aqi ?? 0, 
        icon: Wind, 
        color: "text-health-rose",
        metric: "aqi" as AnalysisTab
      },
    ],
    [rows],
  );

  return (
    <AppLayout title="Deep Analysis" subtitle="Detailed trends for health, food, AQI, and overall score.">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
                className="h-9 rounded-xl px-4 text-xs transition-all"
                onClick={() => setTab(item.key as AnalysisTab)}
              >
                {item.label}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-xl border-primary/40 bg-card/70 px-4 text-xs font-semibold transition-all hover:border-primary/60"
            onClick={() => navigate("/report")}
          >
            Open Report
          </Button>
        </div>

        <div className="inline-flex rounded-2xl border border-border/60 bg-card/60 p-1">
          <Button
            type="button"
            variant={range === "last_week" ? "default" : "ghost"}
            className="h-9 rounded-xl px-4 text-xs transition-all"
            onClick={() => setRange("last_week")}
          >
            Last Week
          </Button>
          <Button
            type="button"
            variant={range === "this_month" ? "default" : "ghost"}
            className="h-9 rounded-xl px-4 text-xs transition-all"
            onClick={() => setRange("this_month")}
          >
            This Month
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {summaryCards.map((card) => {
          const cardTrend = calculateTrend();
          return (
            <article 
              key={card.label} 
              className={`glass-card rounded-2xl border-border/50 p-4 cursor-pointer transition-all hover:border-border/80 hover:shadow-lg ${
                tab === card.metric ? "ring-1 ring-primary/50" : ""
              }`}
              onClick={() => setTab(card.metric)}
            >
              <div className="mb-3 flex items-center justify-between">
                <card.icon className={`h-5 w-5 ${card.color} transition-transform hover:scale-110`} />
                <span className={`text-[10px] font-semibold px-2 py-1 rounded-full border ${getMetricColor(card.metric)}`}>
                  Score
                </span>
              </div>
              <p className="text-2xl font-bold mb-1">{card.value}</p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">{card.label}</p>
                {cardTrend.change !== 0 && (
                  <div className={`flex items-center gap-1 text-xs font-semibold ${
                    cardTrend.isPositive ? "text-emerald-500" : "text-rose-500"
                  }`}>
                    {cardTrend.isPositive ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span>{cardTrend.percent}%</span>
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              <Flame className="h-5 w-5 text-primary" />
              {tab[0].toUpperCase() + tab.slice(1)} Trend
            </h2>
            <div className={`flex items-center gap-1 text-sm font-semibold px-3 py-1 rounded-full border ${
              trend.isPositive 
                ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" 
                : "text-rose-600 bg-rose-500/10 border-rose-500/20"
            }`}>
              {trend.isPositive ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <span>{trend.isPositive ? "+" : ""}{trend.change} ({trend.percent}%)</span>
            </div>
          </div>
          
          <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/75 to-card/35 p-6">
            {/* Grid background */}
            <div className="pointer-events-none absolute inset-0 opacity-30">
              <svg className="h-full w-full" preserveAspectRatio="none">
                <defs>
                  <pattern id="grid" width="100%" height="25%" patternUnits="objectBoundingBox">
                    <path d="M 0 0 L 100% 0" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {/* Chart */}
            <div className="relative flex h-56 items-end gap-1.5 sm:gap-3">
              {rows.map((row, idx) => {
                const normalizedHeight = (row[chartKey] / maxValue) * 100;
                const isHovered = hoveredIndex === idx;
                
                return (
                  <div 
                    key={row.label} 
                    className="flex h-full flex-1 flex-col justify-end gap-2 group"
                    onMouseEnter={() => setHoveredIndex(idx)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-card border border-border/80 rounded-xl px-3 py-2 z-10 whitespace-nowrap shadow-lg">
                        <p className="text-sm font-bold">{row[chartKey]}</p>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                      </div>
                    )}
                    
                    {/* Bar */}
                    <div
                      className={`relative w-full rounded-t-lg bg-gradient-to-t ${getColorByTab(tab)} shadow-[0_10px_16px_-12px_rgba(15,118,110,0.95)] transition-all duration-300 group-hover:shadow-[0_15px_25px_-10px_rgba(15,118,110,1)] ${
                        isHovered ? "group-hover:brightness-110" : ""
                      }`}
                      style={{ 
                        height: `${Math.round(normalizedHeight)}%`,
                        minHeight: '12px'
                      }}
                    >
                      <span className={`absolute -top-6 left-1/2 -translate-x-1/2 text-[11px] font-bold transition-all duration-300 ${
                        isHovered ? "opacity-100 -top-7 text-primary" : "opacity-70"
                      }`}>
                        {row[chartKey]}
                      </span>
                    </div>
                    
                    {/* Label */}
                    <p className="text-center text-[11px] font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
                      {row.label}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Y-axis scale */}
            <div className="absolute left-0 top-6 h-56 flex flex-col justify-between text-[10px] text-muted-foreground/50 font-semibold">
              <span>{maxValue}</span>
              <span>{Math.round(maxValue / 2)}</span>
              <span>0</span>
            </div>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5">
          <h2 className="mb-4 text-lg font-semibold">Comparison with {comparisonKey === "overall" ? "Overall" : "Health"}</h2>
          <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-card/70 to-card/40 p-5">
            <div className="space-y-4">
              {rows.map((row, idx) => {
                const normalizedWidth = (row[comparisonKey] / comparisonMaxValue) * 100;
                const isHovered = hoveredIndex === idx;
                
                return (
                  <div key={`cmp-${row.label}`} className="group">
                    <div className="mb-2 flex items-center justify-between">
                      <span className={`text-sm font-semibold transition-colors ${
                        isHovered ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {row.label}
                      </span>
                      <span className={`text-sm font-bold px-2 py-1 rounded-lg transition-all ${
                        isHovered 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted/30 text-muted-foreground"
                      }`}>
                        {row[comparisonKey]}
                      </span>
                    </div>
                    <div 
                      className="relative h-3 rounded-full bg-muted/50 overflow-hidden border border-border/40 group-hover:border-border/70 transition-all"
                      onMouseEnter={() => setHoveredIndex(idx)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-health-cyan/75 to-health-teal/85 shadow-[0_8px_12px_-10px_rgba(6,182,212,0.9)] transition-all duration-300 group-hover:shadow-[0_12px_20px_-8px_rgba(6,182,212,1)]"
                        style={{ width: `${Math.round(normalizedWidth)}%` }}
                      />
                      {/* Percentage label on bar */}
                      {normalizedWidth > 20 && (
                        <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          {Math.round(normalizedWidth)}%
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 flex items-center gap-4 pt-4 border-t border-border/40">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-gradient-to-r from-health-cyan/75 to-health-teal/85" />
                <span className="text-xs text-muted-foreground">
                  {comparisonKey === "overall" ? "Overall Score" : "Health Score"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-muted/50" />
                <span className="text-xs text-muted-foreground">Target Range</span>
              </div>
            </div>
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default Analysis;
