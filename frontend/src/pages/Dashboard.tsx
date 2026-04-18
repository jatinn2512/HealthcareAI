import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  Bluetooth,
  Copy,
  Droplet,
  Flame,
  Footprints,
  HeartPulse,
  Link2,
  MessageSquare,
  Moon,
  QrCode,
  Sparkles,
  Stethoscope,
  UtensilsCrossed,
  Wind,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import { MonitoringChart } from "@/components/MonitoringChart";
import { apiClient } from "@/lib/apiClient";
import { useAuth } from "@/lib/authContext";
import type { RiskOverview } from "@/lib/riskOverviewTypes";

const weeklyData = [
  { day: "Mon", steps: 6200 },
  { day: "Tue", steps: 8400 },
  { day: "Wed", steps: 7100 },
  { day: "Thu", steps: 9200 },
  { day: "Fri", steps: 8432 },
  { day: "Sat", steps: 5600 },
  { day: "Sun", steps: 3200 },
] as const;

const getTimeBasedInsights = (hour: number) => {
  if (hour >= 5 && hour < 12) {
    return [
      { text: "Start with 20 minutes brisk walk and light stretching.", type: "positive" },
      { text: "Hydration target: finish 2 glasses of water before noon.", type: "warning" },
      { text: "Keep posture checks every 60 minutes while working.", type: "positive" },
    ] as const;
  }
  if (hour >= 12 && hour < 18) {
    return [
      { text: "Try a 25 minute run or 30 minute fast walk this evening.", type: "positive" },
      { text: "Take a 5 minute movement break every 2 hours.", type: "warning" },
      { text: "Plan a 30 minute meditation session for stress reset.", type: "positive" },
    ] as const;
  }
  return [
    { text: "Do 30 minute meditation to improve recovery and sleep.", type: "positive" },
    { text: "Light 15 minute stretch before bed for muscle recovery.", type: "warning" },
    { text: "Avoid late heavy activity so sleep quality stays strong.", type: "positive" },
  ] as const;
};

const quickActions = [
  { label: "Log Symptoms", icon: Stethoscope, path: "/health" },
  { label: "Add Meal", icon: UtensilsCrossed, path: "/health" },
  { label: "Check AQI", icon: Wind, path: "/aqi" },
  { label: "Devices (optional)", icon: Bluetooth, path: "/settings" },
] as const;

const WEARABLE_SYNCED_EVENT = "curasync:wearable-synced";

type DoctorConnectTokenResponse = {
  token_code: string;
  qr_payload: string;
  expires_at: string;
  created_at: string;
  patient: {
    id: number;
    full_name: string;
    age: number;
    gender: string | null;
  };
};

const formatLocalDateTime = (isoValue: string): string => {
  const parsed = new Date(isoValue);
  if (Number.isNaN(parsed.getTime())) return isoValue;
  return parsed.toLocaleString();
};

const getSourceBadgeClass = (source?: string | null) => {
  const s = (source || "").toLowerCase();
  if (s.includes("wearable") || s.includes("smartwatch") || s.includes("apple") || s.includes("garmin")) return "source-tag source-tag-wearable";
  if (s.includes("report") || s.includes("lab")) return "source-tag source-tag-report";
  if (s.includes("alert")) return "source-tag source-tag-alert";
  return "source-tag source-tag-manual";
};

const getRiskBadgeClass = (level: string) => {
  const l = level.toLowerCase();
  if (l === "high") return "status-badge-high";
  if (l === "medium" || l === "moderate") return "status-badge-moderate";
  return "status-badge-normal";
};

const Dashboard = () => {
  const [now, setNow] = useState<Date>(() => new Date());
  const [riskOverview, setRiskOverview] = useState<RiskOverview | null>(null);
  const [wearableLastSyncAt, setWearableLastSyncAt] = useState<string | null>(null);
  const [quickSys, setQuickSys] = useState("");
  const [quickDia, setQuickDia] = useState("");
  const [quickSugar, setQuickSugar] = useState("");
  const [quickSymptoms, setQuickSymptoms] = useState("");
  const [quickSaving, setQuickSaving] = useState(false);
  const [quickMessage, setQuickMessage] = useState("");
  const [doctorConnectToken, setDoctorConnectToken] = useState<DoctorConnectTokenResponse | null>(null);
  const [isGeneratingDoctorToken, setIsGeneratingDoctorToken] = useState(false);
  const [doctorConnectError, setDoctorConnectError] = useState("");
  const [doctorConnectSuccess, setDoctorConnectSuccess] = useState("");
  const [showDoctorConnectSection, setShowDoctorConnectSection] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const maxSteps = Math.max(...weeklyData.map((row) => row.steps));
  const resolvedName = user?.full_name || "User";
  const insights = useMemo(() => getTimeBasedInsights(now.getHours()), [now]);
  const stats = useMemo(
    () => [
      {
        label: "Steps",
        value: `${riskOverview?.activity?.steps ?? 8432}`,
        target: "10,000",
        icon: Footprints,
        color: "text-health-teal",
        bg: "bg-health-teal/12",
        percent: Math.min(100, Math.round(((riskOverview?.activity?.steps ?? 8432) / 10000) * 100)),
      },
      {
        label: "Calories",
        value: `${riskOverview?.activity?.calories_burned ?? 1845}`,
        target: "2,200",
        icon: Flame,
        color: "text-health-rose",
        bg: "bg-health-rose/12",
        percent: Math.min(100, Math.round(((riskOverview?.activity?.calories_burned ?? 1845) / 2200) * 100)),
      },
      {
        label: "Sleep",
        value: `${(((riskOverview?.sleep?.duration_minutes ?? 432) / 60) || 0).toFixed(1)}h`,
        target: "8h",
        icon: Moon,
        color: "text-health-indigo",
        bg: "bg-health-indigo/12",
        percent: Math.min(100, Math.round(((riskOverview?.sleep?.duration_minutes ?? 432) / 480) * 100)),
      },
      {
        label: "Heart Rate",
        value: `${riskOverview?.monitoring?.hr ?? riskOverview?.vitals?.heart_rate ?? 72}`,
        target: "bpm",
        icon: HeartPulse,
        color: "text-health-cyan",
        bg: "bg-health-cyan/12",
        percent: 100,
      },
    ],
    [riskOverview],
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const loadRiskOverview = async () => {
    try {
      // Add cache-busting parameter to force fresh data from server
      const response = await apiClient.get<RiskOverview>(`/risk/overview?t=${Date.now()}`);
      if (response.data) {
        setRiskOverview(response.data);
        const latestTimestamp =
          response.data.monitoring?.last_updated ||
          response.data.vitals?.logged_at ||
          response.data.activity?.logged_at ||
          response.data.sleep?.created_at ||
          null;
        if (latestTimestamp) {
          setWearableLastSyncAt(latestTimestamp);
        }
      } else if (response.error) {
        console.warn("Error loading risk overview:", response.error);
      }
    } catch (err) {
      console.error("Failed to load risk overview:", err);
    }
  };

  useEffect(() => {
    void loadRiskOverview();
    const refresh = () => {
      void loadRiskOverview();
    };
    const intervalId = window.setInterval(refresh, 20_000);
    window.addEventListener(WEARABLE_SYNCED_EVENT, refresh as EventListener);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener(WEARABLE_SYNCED_EVENT, refresh as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleGenerateDoctorConnectToken = async () => {
    if (isGeneratingDoctorToken) return;
    setDoctorConnectError("");
    setDoctorConnectSuccess("");
    setIsGeneratingDoctorToken(true);

    try {
      const response = await apiClient.post<DoctorConnectTokenResponse>("/doctor/share-token");
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to generate doctor connect token.");
      }
      setDoctorConnectToken(response.data);
      setDoctorConnectSuccess("Doctor connect token generated. Share this QR/code with your doctor.");
      setShowDoctorConnectSection(true);
    } catch (err: unknown) {
      setDoctorConnectError(err instanceof Error ? err.message : "Unable to generate doctor connect token.");
    } finally {
      setIsGeneratingDoctorToken(false);
    }
  };

  const handleSaveQuickReading = async () => {
    if (quickSaving) return;
    setQuickMessage("");
    const sys = quickSys.trim() ? Number(quickSys) : NaN;
    const dia = quickDia.trim() ? Number(quickDia) : NaN;
    const sugar = quickSugar.trim() ? Number(quickSugar) : NaN;
    const hasVitals =
      (!Number.isNaN(sys) && !Number.isNaN(dia)) || !Number.isNaN(sugar);
    const hasSymptoms = quickSymptoms.trim().length > 0;
    if (!hasVitals && !hasSymptoms) {
      setQuickMessage("Enter BP (systolic/diastolic), sugar, and/or symptoms.");
      return;
    }
    setQuickSaving(true);
    try {
      if (hasVitals) {
        const body: Record<string, string | number> = { source_type: "manual" };
        if (!Number.isNaN(sys) && !Number.isNaN(dia)) {
          body.systolic_bp = sys;
          body.diastolic_bp = dia;
        }
        if (!Number.isNaN(sugar)) {
          body.blood_glucose_mg_dl = sugar;
        }
        const res = await apiClient.post("/risk/vitals", body);
        if (res.error) {
          throw new Error(res.error);
        }
      }
      if (hasSymptoms) {
        const res = await apiClient.post("/risk/events", {
          feature: "manual_entry",
          action: "symptoms_note",
          metadata_json: JSON.stringify({ text: quickSymptoms.trim() }),
        });
        if (res.error) {
          throw new Error(res.error);
        }
      }
      setQuickSys("");
      setQuickDia("");
      setQuickSugar("");
      setQuickSymptoms("");
      setQuickMessage("Reading saved. Refreshing dashboard...");
      
      // Retry logic: wait and fetch multiple times to ensure data is available
      let retries = 0;
      const maxRetries = 3;
      let success = false;
      
      while (retries < maxRetries && !success) {
        await new Promise(resolve => setTimeout(resolve, 800 + (retries * 200)));
        await loadRiskOverview();
        
        // Check if new data was actually fetched
        if (riskOverview?.vitals?.logged_at || riskOverview?.monitoring?.last_updated) {
          success = true;
        }
        retries++;
      }
      
      setQuickMessage("Reading saved and dashboard updated!");
      setTimeout(() => setQuickMessage(""), 2000);
      
      // Dispatch event for other components
      window.dispatchEvent(new Event(WEARABLE_SYNCED_EVENT));
    } catch (e) {
      setQuickMessage(e instanceof Error ? e.message : "Unable to save.");
    } finally {
      setQuickSaving(false);
    }
  };

  const handleCopyDoctorConnectValue = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setDoctorConnectError("");
      setDoctorConnectSuccess(`${label} copied.`);
    } catch {
      setDoctorConnectError(`Unable to copy ${label.toLowerCase()}.`);
    }
  };

  return (
    <AppLayout title={`Welcome back, ${resolvedName}`} subtitle="Here's your health overview for today." centerHeader>
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {stats.map((stat, index) => (
          <motion.article
            key={stat.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="glass-card rounded-3xl border-border/50 p-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{stat.target}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stat.percent}%` }}
                transition={{ duration: 0.6 }}
                className="h-full rounded-full bg-primary"
              />
            </div>
          </motion.article>
        ))}
      </section>

      {/* Colored Vitals Cards - Similar to Doctor View */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-health-cyan/30 bg-health-cyan/10 p-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent to-health-cyan/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <p className="mb-2 text-xs font-semibold text-health-cyan flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Blood Pressure</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-foreground">
              {riskOverview?.monitoring?.bp || riskOverview?.vitals?.systolic_bp && riskOverview?.vitals?.diastolic_bp
                ? (riskOverview.monitoring?.bp || `${riskOverview.vitals.systolic_bp}/${riskOverview.vitals.diastolic_bp}`)
                : '120/80'}
            </p>
            <span className="text-xs text-muted-foreground">mmHg</span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            {riskOverview?.monitoring?.bp || (riskOverview?.vitals?.systolic_bp && riskOverview?.vitals?.diastolic_bp)
              ? 'Latest reading'
              : 'No recent data'}
          </p>
        </article>
        <article className="rounded-2xl border border-health-rose/30 bg-health-rose/10 p-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent to-health-rose/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <p className="mb-2 text-xs font-semibold text-health-rose flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Heart Rate</p>
          <div className="flex items-baseline gap-1">
            <p className="text-2xl font-bold text-foreground">
              {riskOverview?.monitoring?.hr ?? riskOverview?.vitals?.heart_rate ?? 72}
            </p>
            <span className="text-xs text-muted-foreground">bpm</span>
          </div>
          <p className="text-[11px] text-muted-foreground/80 mt-1">
            {riskOverview?.monitoring?.hr || riskOverview?.vitals?.heart_rate
              ? 'Latest reading'
              : 'No recent data'}
          </p>
        </article>
        <article className="rounded-2xl border border-health-indigo/30 bg-health-indigo/10 p-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent to-health-indigo/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <p className="mb-2 text-xs font-semibold text-health-indigo flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Sleep Quality</p>
          <p className="mt-2 text-xl font-bold text-foreground">
            {(((riskOverview?.sleep?.duration_minutes ?? 432) / 60) || 0).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">hrs</span>
          </p>
          <p className="text-[11px] text-health-indigo/80 mt-1">Score: {riskOverview?.sleep?.quality_score ?? 75}/100</p>
        </article>
        <article className="rounded-2xl border border-health-teal/30 bg-health-teal/10 p-4 relative overflow-hidden group">
          <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent to-health-teal/10 opacity-0 transition-opacity group-hover:opacity-100" />
          <p className="mb-2 text-xs font-semibold text-health-teal flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Recent Activity</p>
          <p className="mt-2 text-xl font-bold text-foreground">
            {riskOverview?.activity?.steps ?? 8432} <span className="text-xs text-muted-foreground font-normal">steps</span>
          </p>
          <p className="text-[11px] text-health-teal/80 mt-1">{riskOverview?.activity?.workout_minutes ?? 45} min active workout</p>
        </article>
      </section>

      {wearableLastSyncAt ? (
        <section className="space-y-2 rounded-xl border border-border/50 bg-card/45 px-4 py-3 text-sm text-muted-foreground glass-card">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-foreground">Last monitoring update:</span> 
            <span>{formatLocalDateTime(wearableLastSyncAt)}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {riskOverview?.monitoring?.bp ? (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">BP {riskOverview.monitoring.bp}</span>
                <span className={getSourceBadgeClass(riskOverview.monitoring.bp_source)}>{riskOverview.monitoring.bp_source_label || riskOverview.monitoring.bp_source || "—"}</span>
              </div>
            ) : null}
            {riskOverview?.monitoring?.hr != null && riskOverview?.monitoring?.hr !== undefined ? (
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-foreground">HR {riskOverview.monitoring.hr}</span>
                <span className={getSourceBadgeClass(riskOverview.monitoring.hr_source)}>{riskOverview.monitoring.hr_source_label || riskOverview.monitoring.hr_source || "—"}</span>
              </div>
            ) : null}
          </div>
          {riskOverview?.data_quality?.message ? (
            <p className="inline-block rounded border border-amber-500/20 bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-600 mt-1">{riskOverview.data_quality.message}</p>
          ) : null}
        </section>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[1fr_minmax(0,350px)] xl:grid-cols-[1fr_minmax(0,400px)]">
        <motion.article 
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl border-border/50 p-5 sm:p-6 flex flex-col"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Activity className="h-5 w-5 text-health-indigo" />
              Vitals Trend
            </h2>
          </div>
          <div className="flex-1 flex flex-col justify-center min-h-[220px]">
            {riskOverview?.monitoring?.bp || riskOverview?.monitoring?.hr ? (
              <MonitoringChart 
                type="bp"
                data={[
                  { label: "3 days ago", systolic: 118, diastolic: 78 },
                  { label: "2 days ago", systolic: 121, diastolic: 80 },
                  { label: "Yesterday", systolic: 119, diastolic: 79 },
                  { label: "Today", systolic: parseInt((riskOverview.monitoring?.bp || '120/80').split('/')[0]) || 120, diastolic: parseInt((riskOverview.monitoring?.bp || '120/80').split('/')[1]) || 80 },
                ]}
              />
            ) : (
              <div className="flex min-h-[160px] items-center justify-center text-sm text-muted-foreground rounded-xl border border-dashed border-border/60 bg-muted/20">
                Log BP to see trend chart
              </div>
            )}
          </div>
        </motion.article>

        <section className="rounded-3xl border border-border/60 bg-card/80 p-5 sm:p-6 glass-card">
          <h2 className="mb-2 text-lg font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-5 w-5 text-health-rose" />
            Quick Add
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Log manual vitals or symptoms.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="relative">
              <HeartPulse className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <div className="flex items-center">
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Sys"
                  value={quickSys}
                  onChange={(e) => setQuickSys(e.target.value)}
                  className="h-11 w-full rounded-l-xl border border-border bg-background/50 pl-9 pr-3 text-sm focus:bg-background focus:ring-1 focus:ring-primary/20"
                />
                <span className="flex h-11 items-center border-y border-border bg-muted/20 px-2 text-xs text-muted-foreground">/</span>
                <input
                  type="number"
                  inputMode="numeric"
                  placeholder="Dia"
                  value={quickDia}
                  onChange={(e) => setQuickDia(e.target.value)}
                  className="h-11 w-full rounded-r-xl border border-border bg-background/50 px-3 text-sm focus:bg-background focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </div>
            <div className="relative">
              <Droplet className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-health-rose" />
              <input
                type="number"
                inputMode="decimal"
                placeholder="Sugar"
                value={quickSugar}
                onChange={(e) => setQuickSugar(e.target.value)}
                className="h-11 w-full rounded-xl border border-border bg-background/50 pl-9 pr-3 text-sm focus:bg-background focus:ring-1 focus:ring-primary/20"
              />
            </div>
          </div>
          <div className="relative mt-3">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <textarea
              placeholder="Symptoms or notes"
              value={quickSymptoms}
              onChange={(e) => setQuickSymptoms(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-border bg-background/50 pl-9 pr-3 pt-2.5 text-sm focus:bg-background focus:ring-1 focus:ring-primary/20"
            />
          </div>
          {quickMessage ? (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-xs font-medium ${quickMessage.includes("saved") ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600" : "border-amber-500/30 bg-amber-500/10 text-amber-600"}`}>
              {quickMessage}
            </div>
          ) : null}
          <Button
            type="button"
            className="mt-4 h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground shadow-soft hover:brightness-105"
            onClick={() => void handleSaveQuickReading()}
            disabled={quickSaving}
          >
            {quickSaving ? "Saving…" : "Save reading"}
          </Button>
        </section>
      </section>

      {riskOverview?.rule_based_risk ? (
        <section className="rounded-2xl border border-border/60 bg-card/60 p-5 glass-card">
          <h3 className="mb-3 font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Risk Snapshot
          </h3>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <span className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Heart:</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                riskOverview.rule_based_risk.heart_risk.toLowerCase() === 'high'
                  ? 'border-health-rose/40 bg-health-rose/10 text-health-rose'
                  : riskOverview.rule_based_risk.heart_risk.toLowerCase() === 'moderate' || riskOverview.rule_based_risk.heart_risk.toLowerCase() === 'medium'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600'
                  : 'border-health-teal/40 bg-health-teal/10 text-health-teal'
              }`}>
                {riskOverview.rule_based_risk.heart_risk}
              </span>
            </span>
            <span className="flex items-center gap-1.5 text-sm">
              <span className="text-muted-foreground">Diabetes:</span>
              <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                riskOverview.rule_based_risk.diabetes_risk.toLowerCase() === 'high'
                  ? 'border-health-rose/40 bg-health-rose/10 text-health-rose'
                  : riskOverview.rule_based_risk.diabetes_risk.toLowerCase() === 'moderate' || riskOverview.rule_based_risk.diabetes_risk.toLowerCase() === 'medium'
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-600'
                  : 'border-health-teal/40 bg-health-teal/10 text-health-teal'
              }`}>
                {riskOverview.rule_based_risk.diabetes_risk}
              </span>
            </span>
            {riskOverview.rule_based_risk.bmi != null ? (
              <span className="flex items-center gap-1.5 text-sm">
                 <span className="text-muted-foreground">BMI:</span>
                 <span className="font-semibold">{riskOverview.rule_based_risk.bmi}</span>
              </span>
            ) : null}
          </div>
          {riskOverview.rule_based_risk.reason ? (
            <p className="mt-3 text-sm text-muted-foreground border-t border-border/50 pt-3">{riskOverview.rule_based_risk.reason}</p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-primary/30 bg-primary/10 p-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-foreground">Health Risk Report</p>
            <p className="text-xs text-muted-foreground">See current risks, expected impact, and next recommended actions.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-xl border-primary/50 bg-card/80 px-4 text-sm font-semibold"
            onClick={() => navigate("/report")}
          >
            Open Report
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="glass-card rounded-3xl border-border/50 p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-health-violet" />
            AI Insights
          </h2>
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.text}
                className={`rounded-2xl p-3 text-sm leading-relaxed ${
                  insight.type === "positive"
                    ? "bg-health-teal/10 text-health-teal"
                    : "bg-health-rose/10 text-health-rose"
                }`}
              >
                {insight.text}
              </div>
            ))}
          </div>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-3xl border-border/50 p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Activity className="h-5 w-5 text-primary" />
            Today Exercise
          </h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            {[
              "30 min meditation for stress balance",
              "20 min walk after dinner",
              "15 min stretching before sleep",
            ].map((item) => (
              <div key={item} className="rounded-xl border border-border/60 bg-card/60 p-3">
                {item}
              </div>
            ))}
          </div>
        </motion.article>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {quickActions.map((action, index) => (
            <motion.div key={action.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 + 0.12 }}>
              <Button
                type="button"
                variant="outline"
                className="h-20 w-full flex-col gap-2 rounded-2xl border-border/60 bg-card/65"
                onClick={() => navigate(action.path)}
              >
                <action.icon className="h-5 w-5 text-primary" />
                <span className="text-xs font-semibold">{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <QrCode className="h-5 w-5 text-primary" />
              Doctor Connect QR
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Generate a secure code so doctor can connect and view your reports.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {showDoctorConnectSection && doctorConnectToken && (
              <button
                type="button"
                onClick={() => setShowDoctorConnectSection(false)}
                className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                title="Close QR section"
              >
                <X className="h-4 w-4" />
              </button>
            )}
            <Button
              type="button"
              className="h-9 rounded-lg px-3 text-xs"
              onClick={() => void handleGenerateDoctorConnectToken()}
              disabled={isGeneratingDoctorToken}
            >
              <Link2 className="h-4 w-4" />
              {isGeneratingDoctorToken ? "Generating..." : doctorConnectToken ? "Regenerate" : "Generate"}
            </Button>
          </div>
        </div>

        {doctorConnectError ? (
          <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{doctorConnectError}</div>
        ) : null}
        {doctorConnectSuccess ? (
          <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">{doctorConnectSuccess}</div>
        ) : null}

        {showDoctorConnectSection && doctorConnectToken ? (
          <div className="grid gap-4 lg:grid-cols-[240px,1fr]">
            <div className="rounded-2xl border border-border/60 bg-card/60 p-3">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(doctorConnectToken.qr_payload)}`}
                alt="Doctor connect QR"
                className="mx-auto h-[220px] w-[220px] rounded-xl border border-border/60 bg-white p-2"
              />
              <p className="mt-2 text-center text-[11px] text-muted-foreground">If QR does not load, share connect code manually.</p>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl border border-border/60 bg-card/55 p-3">
                <p className="text-xs text-muted-foreground">Connect Code</p>
                <p className="mt-1 font-mono text-base font-semibold">{doctorConnectToken.token_code}</p>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => void handleCopyDoctorConnectValue(doctorConnectToken.token_code, "Connect code")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Code
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-border/60 bg-card/55 p-3">
                <p className="text-xs text-muted-foreground">QR Payload</p>
                <p className="mt-1 break-all font-mono text-xs">{doctorConnectToken.qr_payload}</p>
                <div className="mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => void handleCopyDoctorConnectValue(doctorConnectToken.qr_payload, "QR payload")}
                  >
                    <Copy className="h-3.5 w-3.5" />
                    Copy Payload
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Expires: <span className="font-medium text-foreground">{formatLocalDateTime(doctorConnectToken.expires_at)}</span>
              </p>
            </div>
          </div>
        ) : showDoctorConnectSection ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/35 px-3 py-4 text-sm text-muted-foreground">
            Generate once, then doctor can scan this QR or enter the code from their dashboard.
          </div>
        ) : null}
      </section>

      <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-3xl border-border/50 p-6"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Weekly Activity</h2>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-health-teal/12 px-3 py-1 text-xs font-semibold text-health-teal">
            <Activity className="h-3.5 w-3.5" />
            Active Trend
          </span>
        </div>

        <div className="relative h-56 overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-b from-card/75 to-card/35 p-4">
          <div className="pointer-events-none absolute inset-0 opacity-45 [background-image:linear-gradient(to_top,hsl(var(--border))_1px,transparent_1px)] [background-size:100%_22%]" />
          <div className="relative flex h-full items-end gap-3">
            {weeklyData.map((row) => (
              <div key={row.day} className="flex h-full flex-1 flex-col justify-end">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.round((row.steps / maxSteps) * 100)}%` }}
                  transition={{ duration: 0.7 }}
                  className="relative min-h-5 rounded-t-lg bg-gradient-to-t from-health-teal/65 via-health-teal/80 to-health-cyan/85 shadow-[0_10px_16px_-12px_rgba(20,184,166,0.9)]"
                >
                  <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-muted-foreground">{row.steps}</span>
                </motion.div>
                <p className="mt-2 text-center text-[11px] font-medium text-muted-foreground">{row.day}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.article>
    </AppLayout>
  );
};

export default Dashboard;
