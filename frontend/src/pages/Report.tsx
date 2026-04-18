import { useEffect, useState } from "react";
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
import { apiClient } from "@/lib/apiClient";
import type { RiskOverview } from "@/lib/riskOverviewTypes";
import {
  CLINICAL_OVERVIEW_FALLBACKS,
  getBpInterpretation,
  getPulseInterpretation,
  getSpo2Interpretation,
} from "@/lib/clinicalOverview";

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

const doctorDetails = [
  { label: "Sleep Risk", level: "Moderate", note: "Pattern instability with delayed recovery signs." },
  { label: "Respiratory Risk", level: "Mild-Moderate", note: "AQI-linked irritation probability on high exposure days." },
  { label: "Metabolic Drift", level: "Mild", note: "Meal timing and balance inconsistency present." },
  { label: "Acute Emergency Probability", level: "Low", note: "No severe red-flag trend detected." },
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

const Report = () => {
  const [view, setView] = useState<"user" | "doctor">("user");
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
          <div className="space-y-2">
            {doctorDetails.map((item) => (
              <article key={item.label} className="rounded-xl border border-border/60 bg-background/60 px-3 py-3">
                <div className="mb-1 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{item.label}</p>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
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
        <section className="rounded-3xl border border-border/60 bg-card/70 p-5">
          <h2 className="mb-3 text-lg font-semibold">User Clinical Add-ons</h2>
          {overviewError ? (
            <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{overviewError}</div>
          ) : null}
          {isLoadingOverview ? <p className="mb-3 text-sm text-muted-foreground">Loading latest user data...</p> : null}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Moon className="h-3.5 w-3.5" />
                Sleep
              </p>
              <p className="mt-1 text-sm font-semibold">{resolvedSleepDuration} mins</p>
              <p className="text-[11px] text-muted-foreground">Quality: {resolvedSleepQuality}</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Activity className="h-3.5 w-3.5" />
                Activity
              </p>
              <p className="mt-1 text-sm font-semibold">{resolvedActivitySteps} steps</p>
              <p className="text-[11px] text-muted-foreground">Workout: {resolvedWorkoutMinutes} mins</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <HeartPulse className="h-3.5 w-3.5" />
                Cardiac Pulse
              </p>
              <p className="mt-1 text-sm font-semibold">HR {resolvedHeartRate} bpm</p>
              <p className="text-[11px] text-muted-foreground">{getPulseInterpretation(resolvedHeartRate)}</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <UtensilsCrossed className="h-3.5 w-3.5" />
                Food Alert
              </p>
              <p className="mt-1 text-sm font-semibold">{resolvedFoodAlert}</p>
              <p className="text-[11px] text-muted-foreground">{resolvedFoodItem}</p>
            </article>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">Blood Pressure</p>
              <p className="mt-1 text-sm font-semibold">
                {resolvedSystolicBp}/{resolvedDiastolicBp} mmHg
              </p>
              <p className="text-[11px] text-muted-foreground">{getBpInterpretation(resolvedSystolicBp, resolvedDiastolicBp)}</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">SpO2</p>
              <p className="mt-1 text-sm font-semibold">{resolvedSpo2}%</p>
              <p className="text-[11px] text-muted-foreground">{getSpo2Interpretation(resolvedSpo2)}</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">Temperature</p>
              <p className="mt-1 text-sm font-semibold">{resolvedTemperature} °C</p>
              <p className="text-[11px] text-muted-foreground">Core body temperature reading</p>
            </article>
            <article className="rounded-2xl border border-border/60 bg-background/60 p-3">
              <p className="text-xs text-muted-foreground">Vitals Timestamp</p>
              <p className="mt-1 text-sm font-semibold">{formatDateTime(resolvedVitalsLoggedAt)}</p>
              <p className="text-[11px] text-muted-foreground">
                {resolvedVitalsSourceNote || "Latest clinical capture"}
              </p>
            </article>
          </div>
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
