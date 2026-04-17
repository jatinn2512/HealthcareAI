import { useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardCheck, ShieldAlert, Stethoscope } from "lucide-react";
import AppLayout from "@/components/AppLayout";

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
    title: "What Is Less Likely Now",
    icon: CheckCircle2,
    tone: "border-health-teal/30 bg-health-teal/10 text-health-teal",
    points: [
      "Severe immediate risk is not indicated from current trend data.",
      "No single metric shows critical emergency pattern.",
      "With routine correction, risk trend can improve quickly.",
    ],
  },
];

const nextSteps = [
  "Keep fixed sleep window for next 7 days (same sleep and wake time).",
  "Use mask + limit outdoor exposure when AQI is moderate/poor.",
  "Follow balanced meals with hydration checkpoints every 3-4 hours.",
  "Re-check analysis trend after 1 week and consult doctor if symptoms persist.",
];

const doctorDetails = [
  { label: "Sleep Risk", level: "Moderate", note: "Pattern instability with delayed recovery signs." },
  { label: "Respiratory Risk", level: "Mild-Moderate", note: "AQI-linked irritation probability on high exposure days." },
  { label: "Metabolic Drift", level: "Mild", note: "Meal timing and balance inconsistency present." },
  { label: "Acute Emergency Probability", level: "Low", note: "No current severe red-flag trend detected." },
];

const Report = () => {
  const [view, setView] = useState<"user" | "doctor">("user");

  return (
    <AppLayout title="Risk Report" subtitle="Summary of current risk, possible outcomes, and what to do next.">
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
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700">
            Suggested next: monitor for 7 days, review symptom diary, and escalate to physician if breathlessness/chest pain/dizziness appears.
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
