import { motion } from "framer-motion";
import { BedDouble, Boxes, Gauge, Truck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { resources } from "@/data/hospitalData";

const statusClassMap = {
  Healthy: "border-health-teal/30 bg-health-teal/10 text-health-teal",
  Warning: "border-health-cyan/30 bg-health-cyan/10 text-health-cyan",
  Critical: "border-health-rose/30 bg-health-rose/10 text-health-rose",
} as const;

const resolveResourceIcon = (name: string) => {
  const normalized = name.toLowerCase();
  if (normalized.includes("bed")) return BedDouble;
  if (normalized.includes("ambulance")) return Truck;
  if (normalized.includes("oxygen")) return Gauge;
  return Boxes;
};

const Resources = () => {
  return (
    <AppLayout title="Resources" subtitle="Track ICU beds, medical assets, and facility capacity in real time.">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {resources.map((resource, index) => {
          const availabilityPercent = Math.round((resource.available / Math.max(resource.total, 1)) * 100);
          const isBelowThreshold = availabilityPercent <= resource.threshold;
          const Icon = resolveResourceIcon(resource.name);

          return (
            <motion.article
              key={resource.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-3xl border-border/50 p-5"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusClassMap[resource.status]}`}>
                  {resource.status}
                </span>
              </div>

              <h2 className="text-base font-semibold">{resource.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {resource.available} available of {resource.total}
              </p>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full ${isBelowThreshold ? "bg-health-rose" : "bg-primary"}`} style={{ width: `${availabilityPercent}%` }} />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{availabilityPercent}% available</span>
                <span>Updated {resource.updatedAt}</span>
              </div>
            </motion.article>
          );
        })}
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Critical Resource Notes</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {resources
            .filter((resource) => resource.status !== "Healthy")
            .map((resource) => (
              <article key={resource.id} className="rounded-2xl border border-border/60 bg-card/55 p-3.5">
                <p className="text-sm font-semibold">{resource.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Threshold: {resource.threshold}% • Current: {Math.round((resource.available / Math.max(resource.total, 1)) * 100)}%
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Action: trigger procurement and team review.</p>
              </article>
            ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default Resources;
