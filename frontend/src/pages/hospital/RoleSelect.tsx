import { type ComponentType, useMemo, useState } from "react";
import { Activity, BriefcaseMedical, ClipboardList, LogOut, ShieldCheck, Stethoscope, Users } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { useAuth } from "@/lib/authContext";
import {
  HOSPITAL_ROLE_LABELS,
  HOSPITAL_ROLE_ROUTES,
  clearHospitalRole,
  saveHospitalRole,
  type HospitalRole,
} from "@/lib/hospitalRole";

const roleCards: Array<{
  role: HospitalRole;
  icon: ComponentType<{ className?: string }>;
  description: string;
}> = [
  {
    role: "admin",
    icon: ShieldCheck,
    description: "Assign doctors, allocate nurse tasks, and monitor ICU beds and oxygen resources.",
  },
  {
    role: "doctor",
    icon: Stethoscope,
    description: "View daily appointments, rounds, and your current patient workload.",
  },
  {
    role: "nurse",
    icon: BriefcaseMedical,
    description: "Track ward tasks, medication rounds, and assigned bedside duties.",
  },
  {
    role: "staff",
    icon: ClipboardList,
    description: "Handle front-desk and support operations with clear daily checklists.",
  },
];

const RoleSelect = () => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [activeRole, setActiveRole] = useState<HospitalRole | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const requestedPath = useMemo(() => {
    const state = location.state as { from?: string } | null;
    const fromPath = state?.from?.trim();
    if (!fromPath) return null;
    if (!fromPath.startsWith("/hospital")) return null;
    if (fromPath === "/hospital/login" || fromPath === "/hospital/role-select") return null;
    return fromPath;
  }, [location.state]);

  const handleSelectRole = (role: HospitalRole) => {
    if (activeRole) return;
    setActiveRole(role);
    saveHospitalRole(role);
    navigate(requestedPath ?? HOSPITAL_ROLE_ROUTES[role], { replace: true });
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      clearHospitalRole();
      await logout();
      navigate("/hospital/login", { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-8 text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.15),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.1),transparent_50%)]" />
      <div className="relative w-full max-w-4xl rounded-3xl border border-border/60 bg-card/92 p-5 shadow-[0_35px_75px_-45px_rgba(15,23,42,0.65)] backdrop-blur sm:p-7">
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground">
              <Activity className="h-3.5 w-3.5 text-primary" />
              Hospital Role Switch
            </p>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">Choose Access Panel</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Logged in as <span className="font-semibold text-foreground">{user?.full_name || user?.email || "Hospital User"}</span>. Select one role
              to continue.
            </p>
          </div>
          <Button type="button" variant="outline" className="h-10 rounded-xl px-4 text-xs" onClick={() => void handleLogout()} disabled={isLoggingOut}>
            <LogOut className="h-4 w-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {roleCards.map((item) => (
            <button
              key={item.role}
              type="button"
              onClick={() => handleSelectRole(item.role)}
              disabled={Boolean(activeRole)}
              className="group rounded-2xl border border-border/60 bg-card/75 px-4 py-4 text-left transition hover:border-primary/40 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <item.icon className="h-5 w-5" />
              </span>
              <p className="mt-3 text-lg font-semibold">{HOSPITAL_ROLE_LABELS[item.role]}</p>
              <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="pointer-events-none fixed inset-0 bg-black/20" />
    </div>
  );
};

export default RoleSelect;
