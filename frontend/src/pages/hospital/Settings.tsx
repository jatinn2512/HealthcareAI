import { useEffect, useMemo, useState } from "react";
import { Bell, Clock3, LogOut, Settings2, Shield, Siren } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import useTheme from "@/hooks/useTheme";
import { defaultHospitalSettings, type HospitalSettingsData } from "@/data/hospitalData";
import { useAuth } from "@/lib/authContext";
import { clearHospitalRole } from "@/lib/hospitalRole";

const STORAGE_KEY_PREFIX = "curasync-hospital-settings";

const createStorageKey = (userId?: number) => `${STORAGE_KEY_PREFIX}:${userId ?? "anonymous"}`;

const readStoredSettings = (storageKey: string): HospitalSettingsData => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return defaultHospitalSettings;
    const parsed = JSON.parse(raw) as Partial<HospitalSettingsData>;
    return {
      ...defaultHospitalSettings,
      ...parsed,
    };
  } catch {
    return defaultHospitalSettings;
  }
};

const ToggleRow = ({
  label,
  value,
  onToggle,
}: {
  label: string;
  value: boolean;
  onToggle: () => void;
}) => (
  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
    <span className="text-sm">{label}</span>
    <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={onToggle}>
      {value ? "On" : "Off"}
    </Button>
  </div>
);

const Settings = () => {
  const { theme, toggleTheme } = useTheme();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const storageKey = useMemo(() => createStorageKey(user?.id), [user?.id]);
  const [settings, setSettings] = useState<HospitalSettingsData>(() => readStoredSettings(storageKey));
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setSettings(readStoredSettings(storageKey));
  }, [storageKey]);

  const saveSettings = (nextValue: HospitalSettingsData) => {
    setSettings(nextValue);
    window.localStorage.setItem(storageKey, JSON.stringify(nextValue));
    setSuccessMessage("Settings updated.");
    window.setTimeout(() => setSuccessMessage(""), 1400);
  };

  const toggleSetting = (key: keyof HospitalSettingsData) => {
    const currentValue = settings[key];
    if (typeof currentValue !== "boolean") return;
    saveSettings({ ...settings, [key]: !currentValue });
  };

  const updateNumberSetting = (key: keyof HospitalSettingsData, value: number) => {
    saveSettings({ ...settings, [key]: value });
  };

  const handleLogout = async () => {
    clearHospitalRole();
    await logout();
    navigate("/");
  };

  return (
    <AppLayout title="Settings" subtitle="Configure hospital alerts, escalation behavior, and dashboard controls.">
      {successMessage ? (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">{successMessage}</div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Bell className="h-5 w-5 text-primary" />
            Emergency Notification Rules
          </h2>
          <div className="space-y-3">
            <ToggleRow label="Emergency SMS Alerts" value={settings.emergencySmsEnabled} onToggle={() => toggleSetting("emergencySmsEnabled")} />
            <ToggleRow label="Emergency Email Alerts" value={settings.emergencyEmailEnabled} onToggle={() => toggleSetting("emergencyEmailEnabled")} />
            <ToggleRow
              label="Auto Assign Emergency Cases"
              value={settings.autoAssignEmergencyEnabled}
              onToggle={() => toggleSetting("autoAssignEmergencyEnabled")}
            />
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Siren className="h-5 w-5 text-primary" />
            Escalation Controls
          </h2>
          <div className="space-y-3">
            <ToggleRow label="Auto Escalation" value={settings.autoEscalationEnabled} onToggle={() => toggleSetting("autoEscalationEnabled")} />

            <label className="block rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <span className="text-xs text-muted-foreground">Escalation Time (minutes)</span>
              <input
                type="number"
                min={1}
                value={settings.escalationMinutes}
                onChange={(event) => updateNumberSetting("escalationMinutes", Math.max(1, Number(event.target.value) || 1))}
                className="mt-1 h-9 w-full rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>

            <label className="block rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <span className="text-xs text-muted-foreground">Low Resource Threshold (%)</span>
              <input
                type="number"
                min={5}
                max={90}
                value={settings.lowResourceThresholdPercent}
                onChange={(event) =>
                  updateNumberSetting("lowResourceThresholdPercent", Math.min(90, Math.max(5, Number(event.target.value) || 5)))
                }
                className="mt-1 h-9 w-full rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Settings2 className="h-5 w-5 text-primary" />
            Operational Preferences
          </h2>
          <div className="space-y-3">
            <ToggleRow
              label="Staff Task Reminder Notifications"
              value={settings.staffTaskRemindersEnabled}
              onToggle={() => toggleSetting("staffTaskRemindersEnabled")}
            />

            <label className="block rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <span className="text-xs text-muted-foreground">Dashboard Auto Refresh (seconds)</span>
              <input
                type="number"
                min={10}
                value={settings.dashboardRefreshSeconds}
                onChange={(event) => updateNumberSetting("dashboardRefreshSeconds", Math.max(10, Number(event.target.value) || 10))}
                className="mt-1 h-9 w-full rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>

            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <span className="text-sm">Theme</span>
              <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={toggleTheme}>
                {theme === "dark" ? "Dark" : "Light"}
              </Button>
            </div>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-5 w-5 text-primary" />
            Account Actions
          </h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3 text-sm text-muted-foreground">
              Hospital admin account is currently active and receiving live dashboard updates.
            </div>
            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3 text-sm text-muted-foreground">
              <Clock3 className="mr-1 inline h-4 w-4" />
              Last settings sync: just now
            </div>
            <Button type="button" className="h-10 w-full rounded-xl bg-red-600/20 text-sm text-red-500" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default Settings;
