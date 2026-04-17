import { motion } from "framer-motion";
import { CalendarClock, Clock3, Stethoscope, UserRound } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { doctors } from "@/data/hospitalData";

const statusClassMap = {
  "On Duty": "border-health-teal/30 bg-health-teal/10 text-health-teal",
  "In Surgery": "border-health-rose/30 bg-health-rose/10 text-health-rose",
  "Off Duty": "border-border/60 bg-card/65 text-muted-foreground",
} as const;

const Doctors = () => {
  return (
    <AppLayout title="Doctors" subtitle="Current duty roster, rounds, and daily patient load.">
      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {doctors.map((doctor, index) => (
          <motion.article
            key={doctor.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            className="glass-card rounded-3xl border-border/50 p-5"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-semibold">{doctor.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {doctor.id} • {doctor.specialization}
                </p>
              </div>
              <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClassMap[doctor.status]}`}>{doctor.status}</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UserRound className="h-3.5 w-3.5" />
                  Assigned
                </p>
                <p className="mt-1 text-2xl font-bold">{doctor.patientsAssigned}</p>
                <p className="text-[11px] text-muted-foreground">Active patients</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  Appointments
                </p>
                <p className="mt-1 text-2xl font-bold">{doctor.todayAppointments}</p>
                <p className="text-[11px] text-muted-foreground">Today</p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock3 className="h-3.5 w-3.5" />
                  Next Round
                </p>
                <p className="mt-1 text-base font-semibold">{doctor.nextRound}</p>
                <p className="text-[11px] text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </motion.article>
        ))}
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Stethoscope className="h-5 w-5 text-primary" />
          Shift Summary
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border/60 bg-card/55 p-3">
            <p className="text-xs text-muted-foreground">On Duty</p>
            <p className="mt-1 text-2xl font-bold">{doctors.filter((doctor) => doctor.status === "On Duty").length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/55 p-3">
            <p className="text-xs text-muted-foreground">In Surgery</p>
            <p className="mt-1 text-2xl font-bold">{doctors.filter((doctor) => doctor.status === "In Surgery").length}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-card/55 p-3">
            <p className="text-xs text-muted-foreground">Total Patients Assigned</p>
            <p className="mt-1 text-2xl font-bold">{doctors.reduce((total, doctor) => total + doctor.patientsAssigned, 0)}</p>
          </div>
        </div>
      </section>
    </AppLayout>
  );
};

export default Doctors;
