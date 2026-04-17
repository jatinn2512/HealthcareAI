import { motion } from "framer-motion";
import {
  AirVent,
  CircleChevronRight,
  HeartPulse,
  LayoutDashboard,
  Leaf,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/authContext";

const modules = [
  {
    title: "See your progress in one place",
    description: "Open your dashboard to review today's streaks, pending actions, and weekly momentum.",
    to: "/dashboard",
    icon: LayoutDashboard,
    color: "text-health-indigo",
    label: "Dashboard",
    cta: "Open Dashboard",
    buttonClass: "bg-health-indigo hover:bg-health-indigo/90 text-white",
  },
  {
    title: "Track symptoms and daily vitals",
    description: "Log health updates, monitor trends, and check personalized AI insights for better decisions.",
    to: "/health",
    icon: HeartPulse,
    color: "text-health-teal",
    label: "Health",
    cta: "Track Health",
    buttonClass: "bg-health-teal hover:bg-health-teal/90 text-white",
  },
  {
    title: "Plan meals with better consistency",
    description: "Manage calories, macros, and hydration targets so your nutrition stays aligned with goals.",
    to: "/food",
    icon: Leaf,
    color: "text-health-rose",
    label: "Food",
    cta: "Manage Food",
    buttonClass: "bg-health-rose hover:bg-health-rose/90 text-white",
  },
  {
    title: "Stay updated with your local AQI",
    description: "Check live air quality, understand exposure risk, and plan safe outdoor activity windows.",
    to: "/aqi",
    icon: AirVent,
    color: "text-health-cyan",
    label: "AQI",
    cta: "Check AQI",
    buttonClass: "bg-health-cyan hover:bg-health-cyan/90 text-white",
  },
];

const UserHome = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const resolvedName = user?.full_name || "User";

  return (
    <AppLayout
      title={`Welcome Back, ${resolvedName}`}
      subtitle=""
      centerHeader
    >
      <section className="mx-auto w-full max-w-5xl space-y-5">
        {modules.map((module, index) => {
          const isReverse = index % 2 === 1;

          return (
            <motion.article
              key={module.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.07 }}
              className="relative overflow-hidden rounded-3xl px-6 py-7 glass-card hover-lift sm:min-h-[250px] sm:px-8 sm:py-9"
            >
              <div className={cn("relative grid gap-5 md:grid-cols-[1.35fr_0.85fr] md:items-end", isReverse && "md:[&>*:first-child]:order-2")}>
                <div className="space-y-3">
                  <p className="inline-flex items-center gap-2 px-0 py-0 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    <module.icon className={cn("hidden h-3.5 w-3.5 sm:block", module.color)} />
                    {module.label}
                  </p>
                  <h3 className="text-2xl font-semibold leading-tight text-foreground sm:text-[1.72rem]">{module.title}</h3>
                  <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-[0.95rem]">{module.description}</p>
                </div>

                <div className={cn("mt-4 md:mt-0 flex w-full", isReverse ? "md:justify-start" : "md:justify-end")}>
                  <Button
                    type="button"
                    className={cn("h-16 w-full max-w-md justify-between border-0 text-base sm:text-lg", module.buttonClass)}
                    onClick={() => navigate(module.to)}
                  >
                    {module.cta}
                    <CircleChevronRight className="h-11 w-11" />
                  </Button>
                </div>
              </div>
            </motion.article>
          );
        })}
      </section>
    </AppLayout>
  );
};

export default UserHome;
