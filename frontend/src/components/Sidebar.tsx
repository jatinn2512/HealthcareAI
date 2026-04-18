import {
  Activity,
  AirVent,
  BedDouble,
  Brain,
  ChevronRight,
  ClipboardList,
  Crown,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Siren,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { HOSPITAL_ROLE_LABELS, readHospitalRole, resolveHospitalRoleLanding, type HospitalRole } from "@/lib/hospitalRole";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  to: string;
  icon: (typeof Activity);
};

const patientLinks: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Health", to: "/health", icon: HeartPulse },
  // { label: "Food", to: "/food", icon: Leaf },
  { label: "AQI", to: "/aqi", icon: AirVent },
  { label: "Analysis", to: "/analysis", icon: Brain },
  { label: "Community", to: "/community", icon: Users },
  { label: "Pricing", to: "/pricing", icon: Crown },
  { label: "Profile", to: "/profile", icon: UserRound },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const hospitalLinksByRole: Record<HospitalRole, NavItem[]> = {
  admin: [
    { label: "Admin Dashboard", to: "/hospital/admin", icon: LayoutDashboard },
    { label: "Doctors", to: "/hospital/doctors", icon: Stethoscope },
    { label: "Nurse Tasks", to: "/hospital/staff", icon: ClipboardList },
    { label: "Resources", to: "/hospital/resources", icon: BedDouble },
    { label: "Emergency", to: "/hospital/emergency", icon: Siren },
    { label: "Profile", to: "/hospital/profile", icon: UserRound },
    { label: "Settings", to: "/hospital/settings", icon: Settings },
    { label: "Switch Role", to: "/hospital/role-select", icon: Users },
  ],
  doctor: [
    { label: "Doctor Dashboard", to: "/hospital/doctor", icon: Stethoscope },
    { label: "Emergency", to: "/hospital/emergency", icon: Siren },
    { label: "Profile", to: "/hospital/profile", icon: UserRound },
    { label: "Settings", to: "/hospital/settings", icon: Settings },
    { label: "Switch Role", to: "/hospital/role-select", icon: Users },
  ],
  nurse: [
    { label: "Nurse Dashboard", to: "/hospital/nurse", icon: ClipboardList },
    { label: "Resources", to: "/hospital/resources", icon: BedDouble },
    { label: "Emergency", to: "/hospital/emergency", icon: Siren },
    { label: "Profile", to: "/hospital/profile", icon: UserRound },
    { label: "Settings", to: "/hospital/settings", icon: Settings },
    { label: "Switch Role", to: "/hospital/role-select", icon: Users },
  ],
  staff: [
    { label: "Staff Dashboard", to: "/hospital/staff-account", icon: Users },
    { label: "Resources", to: "/hospital/resources", icon: BedDouble },
    { label: "Profile", to: "/hospital/profile", icon: UserRound },
    { label: "Settings", to: "/hospital/settings", icon: Settings },
    { label: "Switch Role", to: "/hospital/role-select", icon: ClipboardList },
  ],
};

const hospitalGuestLinks: NavItem[] = [{ label: "Choose Role", to: "/hospital/role-select", icon: Users }];

const defaultHospitalRedirects = [
  { label: "Doctors", to: "/doctors", icon: Stethoscope },
  { label: "Staff", to: "/staff", icon: ClipboardList },
  { label: "Resources", to: "/resources", icon: BedDouble },
  { label: "Emergency", to: "/emergency", icon: Siren },
] as const;

interface SidebarProps {
  onNavigate?: () => void;
}

const Sidebar = ({ onNavigate }: SidebarProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHospitalRoute =
    location.pathname.startsWith("/hospital") ||
    defaultHospitalRedirects.some((route) => location.pathname === route.to);
  const selectedRole = isHospitalRoute ? readHospitalRole() : null;
  const links = isHospitalRoute ? (selectedRole ? hospitalLinksByRole[selectedRole] : hospitalGuestLinks) : patientLinks;
  const homeRoute = isHospitalRoute ? resolveHospitalRoleLanding(selectedRole) : "/dashboard";
  const subtitle = isHospitalRoute
    ? selectedRole
      ? `${HOSPITAL_ROLE_LABELS[selectedRole]} Panel`
      : "Hospital Console"
    : "Health Companion";
  const utilityTitle = isHospitalRoute ? "Role Access" : "Quick Safety";
  const utilityLabel = isHospitalRoute ? "Switch Role" : "Open Instant Alert";
  const utilityPath = isHospitalRoute ? "/hospital/role-select" : "/instant-alert";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        type="button"
        className="flex items-center gap-3 border-b border-border/60 px-4 py-6 text-left transition hover:bg-primary/5"
        onClick={() => {
          onNavigate?.();
          navigate(homeRoute);
        }}
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <Activity className="h-5.5 w-5.5 text-primary-foreground" />
        </div>
        <div>
          <p className="font-display text-[18px] font-bold leading-none">CuraSync</p>
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </button>

      <nav className="flex-1 space-y-1.5 overflow-y-auto px-3 py-5">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            onClick={() => onNavigate?.()}
            className={({ isActive }) =>
              cn(
                "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft ring-1 ring-primary/40"
                  : "text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )
            }
          >
            {({ isActive }) => (
              <>
                <span
                  className={cn(
                    "absolute left-1 top-1/2 h-7 w-1 -translate-y-1/2 rounded-full bg-primary-foreground/70 opacity-0 transition",
                    isActive ? "opacity-100" : "group-hover:opacity-60",
                  )}
                />
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
                {isActive ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5 shadow-soft">
          <p className="text-center text-sm text-muted-foreground">{utilityTitle}</p>
          <Button
            type="button"
            className="mt-2.5 h-10 w-full rounded-lg bg-primary text-sm text-primary-foreground"
            onClick={() => {
              onNavigate?.();
              navigate(utilityPath);
            }}
          >
            {utilityLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
