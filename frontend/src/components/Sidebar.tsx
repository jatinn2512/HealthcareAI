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
  Leaf,
  Settings,
  Siren,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";

const patientLinks = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Health", to: "/health", icon: HeartPulse },
  { label: "Food", to: "/food", icon: Leaf },
  { label: "AQI", to: "/aqi", icon: AirVent },
  { label: "Analysis", to: "/analysis", icon: Brain },
  { label: "Community", to: "/community", icon: Users },
  { label: "Pricing", to: "/pricing", icon: Crown },
  { label: "Profile", to: "/profile", icon: UserRound },
  { label: "Settings", to: "/settings", icon: Settings },
] as const;

const hospitalLinks = [
  { label: "Dashboard", to: "/hospital/dashboard", icon: LayoutDashboard },
  { label: "Doctors", to: "/hospital/doctors", icon: Stethoscope },
  { label: "Staff", to: "/hospital/staff", icon: ClipboardList },
  { label: "Resources", to: "/hospital/resources", icon: BedDouble },
  { label: "Emergency", to: "/hospital/emergency", icon: Siren },
  { label: "Profile", to: "/hospital/profile", icon: UserRound },
  { label: "Settings", to: "/hospital/settings", icon: Settings },
] as const;

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
  const links = isHospitalRoute ? hospitalLinks : patientLinks;
  const homeRoute = isHospitalRoute ? "/hospital/dashboard" : "/dashboard";
  const subtitle = isHospitalRoute ? "Hospital Console" : "Health Companion";
  const utilityTitle = isHospitalRoute ? "Emergency Desk" : "Quick Safety";
  const utilityLabel = isHospitalRoute ? "Open Alerts" : "Open Instant Alert";
  const utilityPath = isHospitalRoute ? "/hospital/emergency" : "/instant-alert";

  return (
    <div className="flex h-full min-h-0 flex-col">
      <button
        type="button"
        className="flex items-center gap-3 border-b border-border/60 px-4 py-6 text-left"
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
                "group flex items-center gap-3 rounded-xl px-3.5 py-3 text-[15px] font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )
            }
          >
            {({ isActive }) => (
              <>
                <link.icon className="h-5 w-5" />
                <span>{link.label}</span>
                {isActive ? <ChevronRight className="ml-auto h-4 w-4" /> : null}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border/60 p-4">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-3.5">
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
