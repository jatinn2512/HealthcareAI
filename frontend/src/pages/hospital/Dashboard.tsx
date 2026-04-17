import { motion } from "framer-motion";
import { Activity, AlertTriangle, BedDouble, ClipboardList, Siren, Stethoscope, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";
import { dashboardKpis, departmentLoads, emergencyAlerts, throughputByDay } from "@/data/hospitalData";

const kpiIconMap = {
  "Analyses Today": ClipboardList,
  "Active Patients": Users,
  "Open Emergencies": AlertTriangle,
  "Staff On Shift": Stethoscope,
} as const;

const kpiToneMap = {
  up: "text-health-teal bg-health-teal/12",
  down: "text-health-rose bg-health-rose/12",
  stable: "text-health-cyan bg-health-cyan/12",
} as const;

const quickLinks = [
  { label: "Doctors", path: "/hospital/doctors", icon: Stethoscope },
  { label: "Staff Tasks", path: "/hospital/staff", icon: ClipboardList },
  { label: "Resources", path: "/hospital/resources", icon: BedDouble },
  { label: "Emergency", path: "/hospital/emergency", icon: Siren },
] as const;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const peakAnalyses = Math.max(...throughputByDay.map((row) => row.analyses), 1);
  const titleName = user?.full_name?.trim() || "Hospital Admin";

  return (
    <AppLayout title={`Hospital Command Center - ${titleName}`} subtitle="Live operations snapshot across analytics, capacity, and emergency flow.">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {dashboardKpis.map((kpi, index) => {
          const Icon = kpiIconMap[kpi.label as keyof typeof kpiIconMap] || Activity;
          return (
            <motion.article
              key={kpi.label}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="glass-card rounded-3xl border-border/50 p-5"
            >
              <div className="mb-4 flex items-start justify-between gap-2">
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${kpiToneMap[kpi.trend]}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="rounded-full border border-border/60 bg-card/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{kpi.delta}</span>
              </div>
              <p className="text-3xl font-bold">{kpi.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{kpi.label}</p>
            </motion.article>
          );
        })}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <motion.article
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-card rounded-3xl border-border/50 p-5 sm:p-6"
        >
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Weekly Throughput</h2>
            <span className="rounded-full border border-border/60 bg-card/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
              Analyses / Admissions / Discharges
            </span>
          </div>

          <div className="relative h-64 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/75 to-card/35 p-4">
            <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_top,hsl(var(--border))_1px,transparent_1px)] [background-size:100%_22%]" />
            <div className="relative flex h-full items-end gap-3">
              {throughputByDay.map((row) => {
                const analysisHeight = `${Math.max(Math.round((row.analyses / peakAnalyses) * 100), 8)}%`;
                return (
                  <div key={row.day} className="flex h-full flex-1 flex-col justify-end">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: analysisHeight }}
                      transition={{ duration: 0.7 }}
                      className="relative min-h-6 rounded-t-lg bg-gradient-to-t from-health-teal/65 via-health-teal/80 to-health-cyan/80"
                    >
                      <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground">{row.analyses}</span>
                    </motion.div>
                    <div className="mt-2 space-y-0.5 text-center text-[10px]">
                      <p className="font-semibold text-foreground">{row.day}</p>
                      <p className="text-muted-foreground">A {row.admissions}</p>
                      <p className="text-muted-foreground">D {row.discharges}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.14 }}
          className="glass-card rounded-3xl border-border/50 p-5 sm:p-6"
        >
          <h2 className="mb-4 text-xl font-semibold">Department Load</h2>
          <div className="space-y-4">
            {departmentLoads.map((item) => (
              <div key={item.department} className="rounded-2xl border border-border/60 bg-card/55 p-3.5">
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="font-semibold">{item.department}</span>
                  <span className="text-muted-foreground">{item.occupancyPercent}% occupied</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${item.occupancyPercent}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Active: {item.activeCases} | Waiting: {item.waitingCases}
                </p>
              </div>
            ))}
          </div>
        </motion.article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.3fr,1fr]">
        <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Emergency Feed</h2>
            <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => navigate("/hospital/emergency")}>
              View All
            </Button>
          </div>
          <div className="space-y-2.5">
            {emergencyAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="rounded-2xl border border-border/60 bg-card/55 px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{alert.patientName}</p>
                  <span className="rounded-full border border-border/60 bg-card px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {alert.priority}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{alert.issue}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {alert.location} • {alert.raisedAt}
                </p>
              </div>
            ))}
          </div>
        </motion.article>

        <motion.article initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 text-xl font-semibold">Quick Access</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-1">
            {quickLinks.map((link) => (
              <Button
                key={link.path}
                type="button"
                variant="outline"
                className="h-14 justify-start rounded-2xl border-border/60 bg-card/55 px-4 text-sm"
                onClick={() => navigate(link.path)}
              >
                <link.icon className="h-4.5 w-4.5 text-primary" />
                {link.label}
              </Button>
            ))}
          </div>
        </motion.article>
      </section>
    </AppLayout>
  );
};

export default Dashboard;
