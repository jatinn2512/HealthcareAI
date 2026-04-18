import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  Bluetooth,
  Globe,
  Info,
  Link2Off,
  Loader2,
  LockKeyhole,
  Moon,
  Shield,
  SlidersHorizontal,
  Sun,
  Watch,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import useTheme from "@/hooks/useTheme";
import { useAuth } from "@/lib/authContext";
import { apiClient } from "@/lib/apiClient";

type UserSettingsResponse = {
  id: number;
  user_id: number;
  theme: string;
  units: string;
  notifications_enabled: boolean;
  email_alerts_enabled: boolean;
  community_visibility: string;
  location_access_for_aqi: boolean;
};

type WearableSyncResponse = {
  message: string;
  synced: {
    activity: boolean;
    vitals: boolean;
    sleep: boolean;
  };
};

type WearableForm = {
  source_device: string;
  steps: string;
  workout_minutes: string;
  calories_burned: string;
  distance_km: string;
  sleep_minutes: string;
  sleep_quality: string;
  heart_rate: string;
  systolic_bp: string;
  diastolic_bp: string;
  spo2: string;
  temperature_c: string;
};

type BluetoothLike = {
  requestDevice: (options: { acceptAllDevices: boolean; optionalServices?: string[] }) => Promise<{ name?: string }>;
};

const WEARABLE_SYNCED_EVENT = "curasync:wearable-synced";

const toIntOrNull = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toFloatOrNull = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const Settings = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { logout } = useAuth();

  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [medicationReminders, setMedicationReminders] = useState(true);
  const [twoFactor, setTwoFactor] = useState(false);
  const [communityVisibility, setCommunityVisibility] = useState(true);
  const [locationAccess, setLocationAccess] = useState(true);

  const [isConnectingWatch, setIsConnectingWatch] = useState(false);
  const [connectedWatchName, setConnectedWatchName] = useState<string | null>(null);
  const [watchStatusMessage, setWatchStatusMessage] = useState("");
  const [wearableError, setWearableError] = useState("");
  const [wearableSuccess, setWearableSuccess] = useState("");
  const [isSyncingWearable, setIsSyncingWearable] = useState(false);
  const [wearableForm, setWearableForm] = useState<WearableForm>({
    source_device: "smartwatch",
    steps: "",
    workout_minutes: "",
    calories_burned: "",
    distance_km: "",
    sleep_minutes: "",
    sleep_quality: "",
    heart_rate: "",
    systolic_bp: "",
    diastolic_bp: "",
    spo2: "",
    temperature_c: "",
  });

  const isBluetoothSupported = useMemo(() => typeof navigator !== "undefined" && "bluetooth" in navigator, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await apiClient.get<UserSettingsResponse>("/auth/settings");
        if (response.error || !response.data) {
          throw new Error(response.error || "Failed to load settings");
        }

        setPushNotifications(response.data.notifications_enabled ?? true);
        setEmailNotifications(response.data.email_alerts_enabled ?? true);
        setLocationAccess(response.data.location_access_for_aqi ?? true);
        setCommunityVisibility(response.data.community_visibility === "public");
      } catch (err) {
        console.error("Failed to load settings:", err);
      }
    };

    void loadSettings();
  }, []);

  const handleToggle = async (settingKey: string, value: boolean) => {
    try {
      const updatePayload: Record<string, unknown> = {};

      if (settingKey === "notifications") {
        setPushNotifications(value);
        updatePayload.notifications_enabled = value;
      } else if (settingKey === "email_alerts") {
        setEmailNotifications(value);
        updatePayload.email_alerts_enabled = value;
      } else if (settingKey === "location_aqi") {
        setLocationAccess(value);
        updatePayload.location_access_for_aqi = value;
      } else if (settingKey === "community_visibility") {
        setCommunityVisibility(value);
        updatePayload.community_visibility = value ? "public" : "friends";
      }

      const response = await apiClient.patch<UserSettingsResponse>("/auth/settings", updatePayload);
      if (response.error) {
        throw new Error(response.error);
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const updateWearableInput = (key: keyof WearableForm, value: string) => {
    setWearableForm((prev) => ({ ...prev, [key]: value }));
    setWearableError("");
  };

  const handleConnectWatch = async () => {
    setWearableError("");
    setWearableSuccess("");

    if (!isBluetoothSupported) {
      setWatchStatusMessage("Bluetooth API unsupported in this browser. Manual sync is still available below.");
      return;
    }

    const bluetooth = (navigator as Navigator & { bluetooth?: BluetoothLike }).bluetooth;
    if (!bluetooth) {
      setWatchStatusMessage("Bluetooth interface unavailable. You can continue with manual sync.");
      return;
    }

    setIsConnectingWatch(true);
    try {
      const device = await bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ["battery_service", "heart_rate"],
      });
      const deviceName = device.name?.trim() || "Smartwatch";
      setConnectedWatchName(deviceName);
      setWearableForm((prev) => ({ ...prev, source_device: deviceName }));
      setWatchStatusMessage(`${deviceName} connected. You can now sync watch metrics.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bluetooth pairing failed.";
      setWatchStatusMessage(`Connection failed: ${message}`);
    } finally {
      setIsConnectingWatch(false);
    }
  };

  const handleDisconnectWatch = () => {
    setConnectedWatchName(null);
    setWearableForm((prev) => ({ ...prev, source_device: "smartwatch" }));
    setWatchStatusMessage("Watch disconnected. Manual sync mode active.");
  };

  const handleWearableSync = async () => {
    setWearableError("");
    setWearableSuccess("");
    setIsSyncingWearable(true);

    try {
      const payload = {
        source_device: connectedWatchName || wearableForm.source_device.trim() || "smartwatch",
        steps: toIntOrNull(wearableForm.steps),
        workout_minutes: toIntOrNull(wearableForm.workout_minutes),
        calories_burned: toIntOrNull(wearableForm.calories_burned),
        distance_km: toFloatOrNull(wearableForm.distance_km),
        sleep_minutes: toIntOrNull(wearableForm.sleep_minutes),
        sleep_quality: toIntOrNull(wearableForm.sleep_quality),
        heart_rate: toIntOrNull(wearableForm.heart_rate),
        systolic_bp: toIntOrNull(wearableForm.systolic_bp),
        diastolic_bp: toIntOrNull(wearableForm.diastolic_bp),
        spo2: toFloatOrNull(wearableForm.spo2),
        temperature_c: toFloatOrNull(wearableForm.temperature_c),
      };

      const response = await apiClient.post<WearableSyncResponse>("/risk/wearable-sync", payload);
      if (response.error || !response.data) {
        throw new Error(response.error || "Wearable sync failed.");
      }

      const syncSummary = response.data.synced;
      const segments = [
        `activity: ${syncSummary.activity ? "yes" : "no"}`,
        `vitals: ${syncSummary.vitals ? "yes" : "no"}`,
        `sleep: ${syncSummary.sleep ? "yes" : "no"}`,
      ];
      setWearableSuccess(`${response.data.message} (${segments.join(", ")})`);
      window.dispatchEvent(
        new CustomEvent(WEARABLE_SYNCED_EVENT, {
          detail: {
            source_device: payload.source_device,
            synced: syncSummary,
            at: new Date().toISOString(),
          },
        }),
      );
    } catch (err) {
      setWearableError(err instanceof Error ? err.message : "Wearable sync failed.");
    } finally {
      setIsSyncingWearable(false);
    }
  };

  return (
    <AppLayout title="Settings" subtitle="Manage preferences, privacy, and optional wearable or device sync (supplementary only).">
      <section className="grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <SlidersHorizontal className="h-5 w-5 text-primary" />
            App Preferences
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-medium">
                {theme === "dark" ? <Moon className="h-4 w-4 text-health-indigo" /> : <Sun className="h-4 w-4 text-amber-500" />}
                Dark Mode
              </span>
              <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={toggleTheme}>
                {theme === "dark" ? "On" : "Off"}
              </Button>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <label className="mb-1 block text-xs text-muted-foreground">Language</label>
              <select className="h-9 w-full appearance-none rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option>English</option>
                <option>Hindi</option>
              </select>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <label className="mb-1 block text-xs text-muted-foreground">Unit System</label>
              <select className="h-9 w-full appearance-none rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option>Metric</option>
                <option>Imperial</option>
              </select>
            </div>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Bell className="h-5 w-5 text-health-violet" />
            Notifications
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Push Notifications",
                value: pushNotifications,
                onToggle: () => handleToggle("notifications", !pushNotifications),
              },
              {
                label: "Email Summaries",
                value: emailNotifications,
                onToggle: () => handleToggle("email_alerts", !emailNotifications),
              },
              {
                label: "Medication Reminders",
                value: medicationReminders,
                onToggle: () => setMedicationReminders((prev) => !prev),
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
                <span className="text-sm">{item.label}</span>
                <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={item.onToggle}>
                  {item.value ? "On" : "Off"}
                </Button>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Shield className="h-5 w-5 text-health-teal" />
            Privacy & Security
          </h2>
          <div className="space-y-3">
            {[
              {
                label: "Two-Factor Authentication",
                value: twoFactor,
                onToggle: () => setTwoFactor((prev) => !prev),
              },
              {
                label: "Community Profile Visibility",
                value: communityVisibility,
                onToggle: () => handleToggle("community_visibility", !communityVisibility),
              },
              {
                label: "Location Access for AQI",
                value: locationAccess,
                onToggle: () => handleToggle("location_aqi", !locationAccess),
              },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
                <span className="text-sm">{item.label}</span>
                <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={item.onToggle}>
                  {item.value ? "On" : "Off"}
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" className="h-10 w-full rounded-xl text-sm" onClick={() => navigate("/about")}>
              <Info className="h-4 w-4" />
              About & Privacy
            </Button>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <LockKeyhole className="h-5 w-5 text-health-cyan" />
            Account & Data
          </h2>
          <div className="space-y-3">
            <div className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <label className="mb-1 block text-xs text-muted-foreground">Time Zone</label>
              <select className="h-9 w-full appearance-none rounded-lg border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/20">
                <option>Asia/Kolkata</option>
                <option>UTC</option>
                <option>America/New_York</option>
              </select>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <span className="inline-flex items-center gap-2 text-sm">
                <Globe className="h-4 w-4 text-primary" />
                Sync data on mobile network
              </span>
              <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs">
                Enabled
              </Button>
            </div>
            <Button type="button" className="h-10 w-full rounded-xl bg-red-600/20 text-sm text-red-500" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </article>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <Watch className="h-5 w-5 text-primary" />
            Optional device sync
          </h2>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={handleConnectWatch} disabled={isConnectingWatch}>
              {isConnectingWatch ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bluetooth className="h-4 w-4" />}
              {isConnectingWatch ? "Connecting..." : "Connect Watch"}
            </Button>
            <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={handleDisconnectWatch} disabled={!connectedWatchName}>
              <Link2Off className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-border/60 bg-card/55 px-4 py-3 text-sm text-muted-foreground">
          {connectedWatchName ? (
            <p>
              Connected device: <span className="font-semibold text-foreground">{connectedWatchName}</span>
            </p>
          ) : (
            <p>No watch connected. You can still use manual sensor sync.</p>
          )}
          {watchStatusMessage ? <p className="mt-1 text-xs">{watchStatusMessage}</p> : null}
          {!isBluetoothSupported ? <p className="mt-1 text-xs">Bluetooth API unavailable in this browser session.</p> : null}
        </div>

        {wearableError ? <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{wearableError}</div> : null}
        {wearableSuccess ? (
          <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">{wearableSuccess}</div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Source Device</span>
            <input
              value={wearableForm.source_device}
              onChange={(event) => updateWearableInput("source_device", event.target.value)}
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Steps</span>
            <input
              type="number"
              value={wearableForm.steps}
              onChange={(event) => updateWearableInput("steps", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Workout Minutes</span>
            <input
              type="number"
              value={wearableForm.workout_minutes}
              onChange={(event) => updateWearableInput("workout_minutes", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Calories Burned</span>
            <input
              type="number"
              value={wearableForm.calories_burned}
              onChange={(event) => updateWearableInput("calories_burned", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Distance (km)</span>
            <input
              type="number"
              value={wearableForm.distance_km}
              onChange={(event) => updateWearableInput("distance_km", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Heart Rate</span>
            <input
              type="number"
              value={wearableForm.heart_rate}
              onChange={(event) => updateWearableInput("heart_rate", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Systolic BP</span>
            <input
              type="number"
              value={wearableForm.systolic_bp}
              onChange={(event) => updateWearableInput("systolic_bp", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Diastolic BP</span>
            <input
              type="number"
              value={wearableForm.diastolic_bp}
              onChange={(event) => updateWearableInput("diastolic_bp", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">SpO2 (%)</span>
            <input
              type="number"
              value={wearableForm.spo2}
              onChange={(event) => updateWearableInput("spo2", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Sleep Minutes</span>
            <input
              type="number"
              value={wearableForm.sleep_minutes}
              onChange={(event) => updateWearableInput("sleep_minutes", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Sleep Quality (0-100)</span>
            <input
              type="number"
              value={wearableForm.sleep_quality}
              onChange={(event) => updateWearableInput("sleep_quality", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Temperature (C)</span>
            <input
              type="number"
              value={wearableForm.temperature_c}
              onChange={(event) => updateWearableInput("temperature_c", event.target.value)}
              placeholder="N/A"
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">Leave any field blank to send it as N/A.</p>
          <Button type="button" className="h-10 rounded-xl bg-primary px-4 text-primary-foreground" onClick={handleWearableSync} disabled={isSyncingWearable}>
            {isSyncingWearable ? <Loader2 className="h-4 w-4 animate-spin" /> : <Watch className="h-4 w-4" />}
            {isSyncingWearable ? "Syncing..." : "Sync Wearable Data"}
          </Button>
        </div>
      </section>
    </AppLayout>
  );
};

export default Settings;
