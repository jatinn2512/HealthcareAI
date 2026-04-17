import { motion } from "framer-motion";
import { AlertTriangle, Siren, UserCircle2 } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { emergencyAlerts } from "@/data/hospitalData";

const priorityClassMap = {
  Critical: "border-health-rose/35 bg-health-rose/12 text-health-rose",
  High: "border-health-cyan/35 bg-health-cyan/12 text-health-cyan",
  Medium: "border-health-teal/35 bg-health-teal/12 text-health-teal",
} as const;

const stateClassMap = {
  New: "border-health-rose/35 bg-health-rose/12 text-health-rose",
  Acknowledged: "border-health-cyan/35 bg-health-cyan/12 text-health-cyan",
  Dispatched: "border-health-violet/35 bg-health-violet/12 text-health-violet",
  Resolved: "border-health-teal/35 bg-health-teal/12 text-health-teal",
} as const;

const Emergency = () => {
  return (
    <AppLayout title="Emergency" subtitle="Live alerts reported by users and current response status.">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">New Alerts</p>
          <p className="mt-1 text-3xl font-bold">{emergencyAlerts.filter((alert) => alert.state === "New").length}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Critical Priority</p>
          <p className="mt-1 text-3xl font-bold">{emergencyAlerts.filter((alert) => alert.priority === "Critical").length}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Dispatched Cases</p>
          <p className="mt-1 text-3xl font-bold">{emergencyAlerts.filter((alert) => alert.state === "Dispatched").length}</p>
        </article>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Siren className="h-5 w-5 text-primary" />
          User Alert Feed
        </h2>
        <div className="space-y-3">
          {emergencyAlerts.map((alert, index) => (
            <motion.article
              key={alert.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3.5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold">{alert.patientName}</p>
                  <p className="text-xs text-muted-foreground">{alert.id}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityClassMap[alert.priority]}`}>
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    {alert.priority}
                  </span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stateClassMap[alert.state]}`}>{alert.state}</span>
                </div>
              </div>

              <p className="mt-2 text-sm text-muted-foreground">{alert.issue}</p>
              <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                <p className="inline-flex items-center gap-1">
                  <UserCircle2 className="h-3.5 w-3.5" />
                  Location: {alert.location}
                </p>
                <p>Raised: {alert.raisedAt}</p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default Emergency;
