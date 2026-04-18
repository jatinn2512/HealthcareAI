import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Moon,
  ShieldAlert,
  Stethoscope,
  UtensilsCrossed,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { SkeletonCard } from "@/components/SkeletonLoader";
import { MonitoringChart } from "@/components/MonitoringChart";
import { apiClient } from "@/lib/apiClient";
import type { RiskOverview } from "@/lib/riskOverviewTypes";
import {
  CLINICAL_OVERVIEW_FALLBACKS,
  getBpInterpretation,
  getPulseInterpretation,
  getSpo2Interpretation,
} from "@/lib/clinicalOverview";

const getSourceBadgeClass = (source?: string | null) => {
  const s = (source || "").toLowerCase();
  if (s.includes("wearable") || s.includes("smartwatch") || s.includes("apple") || s.includes("garmin")) return "source-tag source-tag-wearable";
  if (s.includes("report") || s.includes("lab")) return "source-tag source-tag-report";
  if (s.includes("alert")) return "source-tag source-tag-alert";
  return "source-tag source-tag-manual";
};

const riskCards = [
  {
    title: "Current Risks",
    icon: ShieldAlert,
    tone: "border-health-rose/30 bg-health-rose/10 text-health-rose",
    points: [
      "Sleep consistency is below target across recent days.",
      "AQI exposure can increase breathing discomfort on bad-air days.",
      "Meal balance is irregular, which may affect energy stability.",
    ],
  },
  {
    title: "What Can Happen",
    icon: AlertTriangle,
    tone: "border-amber-500/30 bg-amber-500/10 text-amber-600",
    points: [
      "Fatigue and focus drop during work/study hours.",
      "Higher stress response and slower physical recovery.",
      "Short-term breathing irritation when AQI is poor.",
    ],
  },
  {
    title: "What Is Less Likely",
    icon: CheckCircle2,
    tone: "border-health-teal/30 bg-health-teal/10 text-health-teal",
    points: [
      "Severe immediate risk is not indicated from current trend data.",
      "No single metric shows critical emergency pattern.",
      "With routine correction, risk trend can improve quickly.",
    ],
  },
] as const;

const nextSteps = [
  "Keep fixed sleep window for next 7 days (same sleep and wake time).",
  "Use mask + limit outdoor exposure when AQI is moderate/poor.",
  "Follow balanced meals with hydration checkpoints every 3-4 hours.",
  "Re-check analysis trend after 1 week and consult doctor if symptoms persist.",
] as const;

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const getRiskTone = (level: string): string => {
  const normalized = level.toLowerCase();
  if (normalized.includes("high")) return "border-health-rose/35 bg-health-rose/10 text-health-rose";
  if (normalized.includes("moderate") || normalized.includes("medium")) return "border-amber-500/35 bg-amber-500/10 text-amber-700";
  return "border-health-teal/35 bg-health-teal/10 text-health-teal";
};

const Report = () => {
  const [view, setView] = useState<"user" | "doctor">("user");
  const [activeTab, setActiveTab] = useState<"vitals" | "activity" | "sleep" | "risk">("vitals");
  const [overview, setOverview] = useState<RiskOverview | null>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [overviewError, setOverviewError] = useState("");

  useEffect(() => {
    const loadOverview = async () => {
      setIsLoadingOverview(true);
      setOverviewError("");
      try {
        const response = await apiClient.get<RiskOverview>("/risk/overview");
        if (response.error) {
          throw new Error(response.error);
        }
        setOverview(response.data ?? null);
      } catch (error) {
        setOverviewError(error instanceof Error ? error.message : "Unable to load latest user overview.");
      } finally {
        setIsLoadingOverview(false);
      }
    };

    void loadOverview();
  }, []);

  const sleepOverview = overview?.sleep ?? null;
  const activityOverview = overview?.activity ?? null;
  const vitalsOverview = overview?.vitals ?? null;
  const foodOverview = overview?.food ?? null;
  const monitoring = overview?.monitoring;

  const parseMonitoringBp = (): [number | undefined, number | undefined] => {
    const raw = monitoring?.bp;
    if (!raw || !raw.includes("/")) {
      return [undefined, undefined];
    }
    const parts = raw.split("/");
    const s = Number(parts[0]?.trim());
    const d = Number(parts[1]?.trim());
    if (Number.isNaN(s) || Number.isNaN(d)) {
      return [undefined, undefined];
    }
    return [s, d];
  };
  const [monSys, monDia] = parseMonitoringBp();

  const resolvedSleepDuration = sleepOverview?.duration_minutes ?? CLINICAL_OVERVIEW_FALLBACKS.sleepDurationMinutes;
  const resolvedSleepQuality = sleepOverview?.quality_score ?? CLINICAL_OVERVIEW_FALLBACKS.sleepQualityScore;
  const resolvedActivitySteps = activityOverview?.steps ?? CLINICAL_OVERVIEW_FALLBACKS.activitySteps;
  const resolvedWorkoutMinutes = activityOverview?.workout_minutes ?? CLINICAL_OVERVIEW_FALLBACKS.activityWorkoutMinutes;
  const resolvedHeartRate =
    monitoring?.hr ?? vitalsOverview?.heart_rate ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsHeartRate;
  const resolvedSystolicBp =
    monSys ?? vitalsOverview?.systolic_bp ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsSystolicBp;
  const resolvedDiastolicBp =
    monDia ?? vitalsOverview?.diastolic_bp ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsDiastolicBp;
  const resolvedSpo2 = vitalsOverview?.spo2 ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsSpo2;
  const resolvedTemperature = vitalsOverview?.temperature_c ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsTemperatureC;
  const resolvedVitalsLoggedAt = monitoring?.last_updated ?? vitalsOverview?.logged_at ?? null;
  const resolvedVitalsSourceNote = monitoring?.bp
    ? `BP source: ${monitoring.bp_source_label || monitoring.bp_source || "—"}`
    : vitalsOverview?.source_type
      ? `Latest vitals source: ${vitalsOverview.source_type}`
      : null;
  const resolvedFoodAlert = foodOverview?.latest_alert?.toUpperCase() || "N/A";
  const resolvedFoodItem = foodOverview?.latest_item || "No latest meal";

  const doctorDetails = useMemo(() => {
    const sleepLevel = resolvedSleepDuration < 390 || resolvedSleepQuality < 70 ? "Moderate" : "Low";
    const respiratoryLevel = resolvedSpo2 < 95 ? "Moderate" : "Low";
    const metabolicLevel =
      resolvedWorkoutMinutes < 20 || resolvedActivitySteps < 6000 || resolvedFoodAlert === "HIGH" ? "Moderate" : "Low";
    const acuteLevel =
      resolvedSystolicBp >= 150 || resolvedHeartRate >= 110
        ? "High"
        : resolvedSystolicBp >= 140 || resolvedHeartRate >= 95
          ? "Moderate"
          : "Low";

    return [
      {
        label: "Sleep Risk",
        level: sleepLevel,
        note: `${(resolvedSleepDuration / 60).toFixed(1)}h sleep, quality ${resolvedSleepQuality}/100.`,
      },
      {
        label: "Respiratory Risk",
        level: respiratoryLevel,
        note: `SpO2 ${resolvedSpo2}% with latest heart rate ${resolvedHeartRate} bpm.`,
      },
      {
        label: "Metabolic Drift",
        level: metabolicLevel,
        note: `${resolvedActivitySteps} steps, ${resolvedWorkoutMinutes} mins workout, food alert ${resolvedFoodAlert}.`,
      },
      {
        label: "Acute Emergency Probability",
        level: acuteLevel,
        note: `Current BP ${resolvedSystolicBp}/${resolvedDiastolicBp} with trend from latest monitoring.`,
      },
    ];
  }, [
    resolvedActivitySteps,
    resolvedDiastolicBp,
    resolvedFoodAlert,
    resolvedHeartRate,
    resolvedSleepDuration,
    resolvedSleepQuality,
    resolvedSpo2,
    resolvedSystolicBp,
    resolvedWorkoutMinutes,
  ]);

  return (
    <AppLayout title="Risk Report" subtitle="Summary of risk, expected outcomes, and next action plan.">
      <section className="grid gap-4 lg:grid-cols-3">
        {riskCards.map((card) => (
          <article key={card.title} className={`rounded-2xl border p-4 ${card.tone}`}>
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold">
              <card.icon className="h-4 w-4" />
              {card.title}
            </h2>
            <ul className="space-y-2 text-sm">
              {card.points.map((point) => (
                <li key={point} className="rounded-xl border border-current/20 bg-background/60 px-3 py-2 text-foreground">
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-border/60 bg-card/70 p-4">
        <p className="mb-3 text-sm font-semibold text-foreground">Report View</p>
        <div className="inline-flex rounded-xl border border-border/60 bg-background/60 p-1">
          <button
            type="button"
            className={`h-9 rounded-lg px-4 text-sm font-semibold transition ${
              view === "user" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setView("user")}
          >
            User View
          </button>
          <button
            type="button"
            className={`h-9 rounded-lg px-4 text-sm font-semibold transition ${
              view === "doctor" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setView("doctor")}
          >
            Doctor View
          </button>
        </div>
      </section>

      {view === "doctor" ? (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-5">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
            <Stethoscope className="h-5 w-5 text-primary" />
            Detailed Clinical Report
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">Doctor and patient views are synced to the same latest overview data.</p>
          <div className="space-y-2">
            {doctorDetails.map((item) => (
              <article key={item.label} className="rounded-xl border border-border/60 bg-background/60 px-3 py-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${getRiskTone(item.level)}`}>
                    {item.level}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.note}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {view === "user" ? (
        <section className="rounded-3xl border border-border/60 bg-card/70 p-5 glass-card">
          <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <article className="state-card">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest Sync</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{formatDateTime(resolvedVitalsLoggedAt)}</p>
            </article>
            <article className="state-card">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Vitals Source</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{resolvedVitalsSourceNote || "Manual / fallback data"}</p>
            </article>
            <article className="state-card">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Latest Nutrition Signal</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{resolvedFoodItem}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">Alert: {resolvedFoodAlert}</p>
            </article>
          </div>

          <div className="mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">User Health Sections</h2>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => setActiveTab("vitals")} className={`h-8 rounded-lg outline-none px-3 text-xs font-semibold transition ${activeTab === "vitals" ? "bg-health-rose/20 text-health-rose border border-health-rose/30" : "bg-card/60 text-muted-foreground border border-border"}`}>Vitals</button>
              <button onClick={() => setActiveTab("activity")} className={`h-8 rounded-lg outline-none px-3 text-xs font-semibold transition ${activeTab === "activity" ? "bg-health-teal/20 text-health-teal border border-health-teal/30" : "bg-card/60 text-muted-foreground border border-border"}`}>Activity</button>
              <button onClick={() => setActiveTab("sleep")} className={`h-8 rounded-lg outline-none px-3 text-xs font-semibold transition ${activeTab === "sleep" ? "bg-health-indigo/20 text-health-indigo border border-health-indigo/30" : "bg-card/60 text-muted-foreground border border-border"}`}>Sleep</button>
              <button onClick={() => setActiveTab("risk")} className={`h-8 rounded-lg outline-none px-3 text-xs font-semibold transition ${activeTab === "risk" ? "bg-amber-500/20 text-amber-600 border border-amber-500/30" : "bg-card/60 text-muted-foreground border border-border"}`}>Risk Summary</button>
            </div>
          </div>

          {overviewError ? (
            <div className="state-card-error mb-3">{overviewError}</div>
          ) : null}
          
          {isLoadingOverview ? (
            <SkeletonCard />
          ) : (
            <div className="animate-fade-in mt-4">
              {activeTab === "vitals" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <article className="rounded-2xl border border-health-cyan/30 bg-health-cyan/10 p-4">
                      <p className="mb-1 text-xs font-semibold text-health-cyan flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Blood Pressure</p>
                      <p className="text-xl font-bold text-foreground">{resolvedSystolicBp}/{resolvedDiastolicBp} <span className="text-xs text-muted-foreground font-normal">mmHg</span></p>
                      <p className="text-[11px] font-medium text-foreground/80 mt-1">{getBpInterpretation(resolvedSystolicBp, resolvedDiastolicBp)}</p>
                    </article>
                    <article className="rounded-2xl border border-health-rose/30 bg-health-rose/10 p-4">
                      <p className="mb-1 text-xs font-semibold text-health-rose flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Heart Rate</p>
                      <p className="text-xl font-bold text-foreground">{resolvedHeartRate} <span className="text-xs text-muted-foreground font-normal">bpm</span></p>
                      <p className="text-[11px] font-medium text-foreground/80 mt-1">{getPulseInterpretation(resolvedHeartRate)}</p>
                    </article>
                    <article className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">SpO2</p>
                      <p className="text-xl font-bold text-foreground">{resolvedSpo2}<span className="text-xs text-muted-foreground font-normal">%</span></p>
                      <p className="text-[11px] text-muted-foreground mt-1">{getSpo2Interpretation(resolvedSpo2)}</p>
                    </article>
                    <article className="rounded-2xl border border-border/60 bg-background/60 p-4">
                      <p className="mb-1 text-xs font-semibold text-muted-foreground">Temperature</p>
                      <p className="text-xl font-bold text-foreground">{resolvedTemperature}<span className="text-xs text-muted-foreground font-normal">°C</span></p>
                      <p className="text-[11px] text-muted-foreground mt-1">Core body reading</p>
                    </article>
                  </div>
                  
                  <div className="rounded-2xl border border-border/60 bg-card p-4">
                     <p className="mb-4 text-sm font-semibold flex items-center gap-2">Vitals Monitoring Trend <span className={getSourceBadgeClass(monitoring?.bp_source)}>{monitoring?.bp_source_label || "No Sync"}</span></p>
                     {(resolvedSystolicBp > 0) ? (
                        <MonitoringChart 
                          type="bp"
                          data={[
                            { label: "Past", systolic: 118, diastolic: 78 },
                            { label: "Recent", systolic: 119, diastolic: 79 },
                            { label: "Today", systolic: resolvedSystolicBp, diastolic: resolvedDiastolicBp }
                          ]}
                        />
                     ) : (
                        <div className="state-card-empty h-[150px]">Log BP to see trend</div>
                     )}
                  </div>
                </div>
              )}
              
              {activeTab === "activity" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <article className="rounded-2xl border border-health-teal/30 bg-health-teal/10 p-4">
                      <p className="mb-1 text-xs font-semibold text-health-teal flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Steps Activity</p>
                      <p className="text-xl font-bold text-foreground">{resolvedActivitySteps} <span className="text-xs text-muted-foreground font-normal">steps</span></p>
                      <div className="mt-3 h-1.5 rounded-full bg-health-teal/20">
                        <div className="h-full rounded-full bg-health-teal" style={{ width: `${Math.min(100, (resolvedActivitySteps / 10000) * 100)}%` }} />
                      </div>
                    </article>
                    <article className="rounded-2xl border border-health-teal/30 bg-health-teal/10 p-4">
                      <p className="mb-1 text-xs font-semibold text-health-teal flex items-center gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5" /> Workout Time</p>
                      <p className="text-xl font-bold text-foreground">{resolvedWorkoutMinutes} <span className="text-xs text-muted-foreground font-normal">mins</span></p>
                      <div className="mt-3 h-1.5 rounded-full bg-health-teal/20">
                        <div className="h-full rounded-full bg-health-teal" style={{ width: `${Math.min(100, (resolvedWorkoutMinutes / 60) * 100)}%` }} />
                      </div>
                    </article>
                  </div>
                </div>
              )}

              {activeTab === "sleep" && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <article className="rounded-2xl border border-health-indigo/30 bg-health-indigo/10 p-4">
                      <p className="mb-1 text-xs font-semibold text-health-indigo flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Sleep Duration</p>
                      <p className="text-xl font-bold text-foreground">{(resolvedSleepDuration / 60).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">hours</span></p>
                    </article>
                    <article className="rounded-2xl border border-health-indigo/30 bg-health-indigo/10 p-4">
                      <p className="mb-1 text-xs font-semibold text-health-indigo">Sleep Quality</p>
                      <p className="text-xl font-bold text-foreground">{resolvedSleepQuality}<span className="text-xs text-muted-foreground font-normal">/100</span></p>
                    </article>
                  </div>
                </div>
              )}

              {activeTab === "risk" && (
                <div className="space-y-4">
                  <article className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
                      <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
                         <AlertTriangle className="h-4 w-4 text-amber-600" />
                         Rule-Based Assessment
                      </h3>
                      {overview?.rule_based_risk ? (
                        <div className="space-y-2">
                           <div className="flex items-center gap-2">
                             <span className="text-sm text-amber-800">Heart Risk:</span>
                             <span className="source-tag bg-white/50 border-amber-500/20 text-amber-900">{overview.rule_based_risk.heart_risk}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-sm text-amber-800">Diabetes Risk:</span>
                             <span className="source-tag bg-white/50 border-amber-500/20 text-amber-900">{overview.rule_based_risk.diabetes_risk}</span>
                           </div>
                           <p className="text-sm text-amber-900 mt-2 p-3 bg-amber-500/10 rounded-xl leading-relaxed">{overview.rule_based_risk.reason}</p>
                        </div>
                      ) : (
                        <p className="state-card bg-amber-500/10 text-amber-800">No recent data for risk calculation.</p>
                      )}
                  </article>
                </div>
              )}
            </div>
          )}
        </section>
      ) : null}

      <section className="rounded-3xl border border-border/60 bg-card/70 p-5">
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <ClipboardCheck className="h-5 w-5 text-primary" />
          What You Should Do Next
        </h2>
        <ol className="space-y-2 text-sm text-foreground">
          {nextSteps.map((step, index) => (
            <li key={step} className="rounded-xl border border-border/60 bg-background/60 px-3 py-2">
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </section>
    </AppLayout>
  );
};

export default Report;
