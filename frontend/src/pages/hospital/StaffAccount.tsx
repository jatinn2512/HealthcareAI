import { Building2, CheckCircle2, ClipboardList, PhoneCall, Truck } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { resources } from "@/data/hospitalData";

const staffChecklist = [
  { id: "SF-201", task: "Front desk patient intake verification", owner: "Reception", status: "In Progress" },
  { id: "SF-202", task: "Discharge file handover to billing", owner: "Billing Desk", status: "Pending" },
  { id: "SF-203", task: "Oxygen refill logistics confirmation", owner: "Logistics", status: "Completed" },
  { id: "SF-204", task: "Ward sanitation compliance scan", owner: "Facility Team", status: "Pending" },
];

const StaffAccount = () => {
  const oxygen = resources.find((item) => item.name.toLowerCase().includes("oxygen"));
  const icuBeds = resources.find((item) => item.name.toLowerCase().includes("icu beds"));

  return (
    <AppLayout title="Staff Operations Dashboard" subtitle="Front desk, logistics, and facility workflow for support teams.">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Pending Checklist Items</p>
          <p className="mt-1 text-3xl font-bold">{staffChecklist.filter((item) => item.status !== "Completed").length}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">ICU Beds Available</p>
          <p className="mt-1 text-3xl font-bold">{icuBeds?.available ?? "-"}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Oxygen Cylinders Available</p>
          <p className="mt-1 text-3xl font-bold">{oxygen?.available ?? "-"}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" />
            Daily Staff Checklist
          </h2>
          <div className="space-y-3">
            {staffChecklist.map((item) => (
              <article key={item.id} className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{item.task}</p>
                  <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.id} | Owner: {item.owner}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Building2 className="h-5 w-5 text-primary" />
            Operations Desk Notes
          </h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Truck className="h-3.5 w-3.5" />
                Logistics
              </p>
              <p className="mt-1 text-sm">Ambulance and oxygen supplier dispatch confirmed for evening shift.</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <PhoneCall className="h-3.5 w-3.5" />
                Coordination
              </p>
              <p className="mt-1 text-sm">Notify admin immediately if ICU beds fall below threshold.</p>
            </div>
            <div className="rounded-2xl border border-health-teal/35 bg-health-teal/10 px-4 py-3 text-xs text-health-teal">
              <CheckCircle2 className="mr-1 inline h-4 w-4" />
              Staff handoff summary synced with next shift.
            </div>
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default StaffAccount;
