import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Camera, History, Loader2, Siren, Stethoscope } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import { useAuth } from "@/lib/authContext";
import { apiClient } from "@/lib/apiClient";
import { scanStructuredDataFromImage } from "@/lib/cameraScan";

type RiskLevel = "Low" | "Medium" | "High";

type InstantAlertScore = {
  risk_percent: number;
  risk_level: RiskLevel;
  reasons: string[];
};

type InstantAlertResponse = {
  id: number;
  overall_risk: RiskLevel;
  summary: string;
  created_at: string;
  scores: {
    heart_attack: InstantAlertScore;
    asthma: InstantAlertScore;
    diabetes: InstantAlertScore;
    hypertension: InstantAlertScore;
  };
};

type InstantAlertHistoryResponse = {
  items: InstantAlertResponse[];
};

type RiskOverviewResponse = {
  activity?: { steps?: number | null; workout_minutes?: number | null } | null;
  vitals?: { heart_rate?: number | null; systolic_bp?: number | null; diastolic_bp?: number | null } | null;
};

type AlertForm = {
  age: string;
  sex: string;
  height_cm: string;
  weight_kg: string;
  systolic_bp: string;
  diastolic_bp: string;
  heart_rate: string;
  spo2: string;
  glucose: string;
  cholesterol: string;
  aqi: string;
  activity: string;
  stress: string;
  smoker: string;
  chest_pain: string;
  breath_shortness: string;
  wheezing: string;
  cough: string;
  family_heart_history: string;
  family_asthma_history: string;
  family_diabetes_history: string;
  disability_type: string;
  notes: string;
};

const levelBadgeClass: Record<RiskLevel, string> = {
  Low: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600",
  Medium: "border-amber-500/30 bg-amber-500/10 text-amber-600",
  High: "border-red-500/30 bg-red-500/10 text-red-600",
};

const scoreCardClass: Record<RiskLevel, string> = {
  Low: "border-emerald-500/25",
  Medium: "border-amber-500/25",
  High: "border-red-500/25",
};

const toNumberOrNull = (value: string): number | null => {
  const normalized = value.trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

const formatDateTime = (isoDate: string): string => {
  const value = new Date(isoDate);
  if (!Number.isFinite(value.getTime())) return "Invalid date";
  return value.toLocaleString();
};

const pickScanValue = (payload: Record<string, unknown> | null, keys: string[]): string => {
  if (!payload) return "";
  const loweredPayload = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key.toLowerCase(), value]));
  for (const key of keys) {
    const raw = loweredPayload[key.toLowerCase()];
    if (raw === null || raw === undefined) continue;
    const text = String(raw).trim();
    if (text) return text;
  }
  return "";
};

const normalizeRiskChoice = (value: string, allowedValues: string[], fallback: string): string => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return allowedValues.includes(normalized) ? normalized : fallback;
};

const parseGenderToSexCode = (gender: string | null | undefined): string => {
  const normalized = (gender ?? "").trim().toLowerCase();
  if (normalized.startsWith("m")) return "1";
  if (normalized.startsWith("f")) return "0";
  return "";
};

const normalizeSmokerForAlert = (value: string, fallback: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (["yes", "smoker", "daily", "occasionally"].includes(normalized)) return "yes";
  if (["no", "never", "former"].includes(normalized)) return "no";
  return fallback;
};

const InstantAlert = () => {
  const { user } = useAuth();
  const [form, setForm] = useState<AlertForm>({
    age: "",
    sex: "0",
    height_cm: "",
    weight_kg: "",
    systolic_bp: "",
    diastolic_bp: "",
    heart_rate: "",
    spo2: "",
    glucose: "",
    cholesterol: "",
    aqi: "",
    activity: "na",
    stress: "na",
    smoker: "na",
    chest_pain: "na",
    breath_shortness: "na",
    wheezing: "na",
    cough: "na",
    family_heart_history: "na",
    family_asthma_history: "na",
    family_diabetes_history: "na",
    disability_type: "na",
    notes: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [result, setResult] = useState<InstantAlertResponse | null>(null);
  const [history, setHistory] = useState<InstantAlertResponse[]>([]);
  const [showHistory, setShowHistory] = useState(true);
  const [showCamera, setShowCamera] = useState(false);
  const [isCameraAutofilling, setIsCameraAutofilling] = useState(false);

  const orderedScores = useMemo(() => {
    if (!result) return [];
    return [
      { key: "Heart Attack", value: result.scores.heart_attack },
      { key: "Asthma", value: result.scores.asthma },
      { key: "Diabetes", value: result.scores.diabetes },
      { key: "Hypertension", value: result.scores.hypertension },
    ];
  }, [result]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    const response = await apiClient.get<InstantAlertHistoryResponse>("/risk/instant-alert/history?limit=15");
    if (!response.error && response.data) {
      setHistory(response.data.items || []);
    }
    setIsLoadingHistory(false);
  };

  useEffect(() => {
    void loadHistory();
  }, []);

  const onInputChange = (key: keyof AlertForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setError("");
  };

  const onSubmit = async () => {
    setError("");
    setSuccess("");
    setIsSubmitting(true);

    try {
      const payload = {
        age: toNumberOrNull(form.age),
        sex: toNumberOrNull(form.sex),
        height_cm: toNumberOrNull(form.height_cm),
        weight_kg: toNumberOrNull(form.weight_kg),
        systolic_bp: toNumberOrNull(form.systolic_bp),
        diastolic_bp: toNumberOrNull(form.diastolic_bp),
        heart_rate: toNumberOrNull(form.heart_rate),
        spo2: toNumberOrNull(form.spo2),
        glucose: toNumberOrNull(form.glucose),
        cholesterol: toNumberOrNull(form.cholesterol),
        aqi: toNumberOrNull(form.aqi),
        activity: form.activity,
        stress: form.stress,
        smoker: form.smoker,
        chest_pain: form.chest_pain,
        breath_shortness: form.breath_shortness,
        wheezing: form.wheezing,
        cough: form.cough,
        family_heart_history: form.family_heart_history,
        family_asthma_history: form.family_asthma_history,
        family_diabetes_history: form.family_diabetes_history,
        disability_type: form.disability_type,
        notes: form.notes.trim() || null,
      };

      const response = await apiClient.post<InstantAlertResponse>("/risk/instant-alert", payload);
      if (response.error || !response.data) {
        throw new Error(response.error || "Failed to generate instant alert.");
      }

      setResult(response.data);
      setSuccess("Instant alert generated successfully.");
      await loadHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate instant alert.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const onCameraAutofill = async (imageDataUrl: string) => {
    setIsCameraAutofilling(true);
    setError("");

    try {
      const [scan, overviewResponse] = await Promise.all([
        scanStructuredDataFromImage(imageDataUrl),
        apiClient.get<RiskOverviewResponse>("/risk/overview"),
      ]);
      const parsed = scan?.parsed;
      const overview = overviewResponse.data;
      const mappedSex = parseGenderToSexCode(user?.gender);

      setForm((prev) => ({
        ...prev,
        age: pickScanValue(parsed, ["age"]) || (user?.age ? String(user.age) : prev.age),
        sex: pickScanValue(parsed, ["sex", "gender_code"]) || mappedSex || prev.sex,
        height_cm: pickScanValue(parsed, ["height_cm", "height"]) || (user?.profile?.height_cm ? String(user.profile.height_cm) : prev.height_cm),
        weight_kg: pickScanValue(parsed, ["weight_kg", "weight"]) || (user?.profile?.weight_kg ? String(user.profile.weight_kg) : prev.weight_kg),
        systolic_bp:
          pickScanValue(parsed, ["systolic_bp", "bp"]) ||
          (overview?.vitals?.systolic_bp ? String(overview.vitals.systolic_bp) : prev.systolic_bp),
        diastolic_bp:
          pickScanValue(parsed, ["diastolic_bp"]) ||
          (overview?.vitals?.diastolic_bp ? String(overview.vitals.diastolic_bp) : prev.diastolic_bp),
        heart_rate:
          pickScanValue(parsed, ["heart_rate", "pulse"]) ||
          (overview?.vitals?.heart_rate ? String(overview.vitals.heart_rate) : prev.heart_rate),
        spo2: pickScanValue(parsed, ["spo2", "oxygen"]) || prev.spo2,
        glucose: pickScanValue(parsed, ["glucose", "sugar"]) || prev.glucose,
        cholesterol: pickScanValue(parsed, ["cholesterol", "chol"]) || prev.cholesterol,
        aqi: pickScanValue(parsed, ["aqi"]) || prev.aqi,
        activity: normalizeRiskChoice(
          pickScanValue(parsed, ["activity", "activity_level"]) || user?.profile?.activity_level || prev.activity,
          ["na", "low", "moderate", "high"],
          prev.activity,
        ),
        stress: normalizeRiskChoice(pickScanValue(parsed, ["stress"]) || prev.stress, ["na", "low", "medium", "high"], prev.stress),
        smoker: normalizeSmokerForAlert(
          pickScanValue(parsed, ["smoker", "smoking_status"]) || user?.profile?.smoking_status || prev.smoker,
          prev.smoker,
        ),
        chest_pain: normalizeRiskChoice(
          pickScanValue(parsed, ["chest_pain"]) || prev.chest_pain,
          ["na", "none", "mild", "moderate", "severe"],
          prev.chest_pain,
        ),
        breath_shortness: normalizeRiskChoice(
          pickScanValue(parsed, ["breath_shortness", "breathing"]) || prev.breath_shortness,
          ["na", "none", "mild", "moderate", "severe"],
          prev.breath_shortness,
        ),
        wheezing: normalizeRiskChoice(
          pickScanValue(parsed, ["wheezing"]) || prev.wheezing,
          ["na", "yes", "no"],
          prev.wheezing,
        ),
        cough: normalizeRiskChoice(
          pickScanValue(parsed, ["cough"]) || prev.cough,
          ["na", "none", "mild", "persistent"],
          prev.cough,
        ),
        family_heart_history: normalizeRiskChoice(
          pickScanValue(parsed, ["family_heart_history", "heart_history"]) || prev.family_heart_history,
          ["na", "yes", "no"],
          prev.family_heart_history,
        ),
        family_asthma_history: normalizeRiskChoice(
          pickScanValue(parsed, ["family_asthma_history", "asthma_history"]) || prev.family_asthma_history,
          ["na", "yes", "no"],
          prev.family_asthma_history,
        ),
        family_diabetes_history: normalizeRiskChoice(
          pickScanValue(parsed, ["family_diabetes_history", "diabetes_history"]) || prev.family_diabetes_history,
          ["na", "yes", "no"],
          prev.family_diabetes_history,
        ),
        disability_type: normalizeRiskChoice(
          pickScanValue(parsed, ["disability_type", "disability"]) || user?.profile?.disability_status || prev.disability_type,
          ["na", "none", "vision", "hearing", "mobility", "cognitive", "other"],
          prev.disability_type,
        ),
        notes: pickScanValue(parsed, ["notes", "medical_notes"]) || prev.notes,
      }));

      setSuccess(`Camera autofill complete. Form pre-filled from profile, latest logs, and scanned ${scan?.source === "ocr" ? "photo text" : "QR"} data.`);
      setShowCamera(false);
    } finally {
      setIsCameraAutofilling(false);
    }
  };

  return (
    <AppLayout title="Instant Alert" subtitle="Fill medical signals with N/A options and get immediate risk percentages.">
      <section className="grid gap-6 xl:grid-cols-[1.35fr,1fr]">
        <article className="glass-card rounded-3xl border-border/50 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Stethoscope className="h-5 w-5 text-primary" />
              Medical Alert Form
            </h2>
            <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={() => setShowCamera(true)}>
              <Camera className="h-4 w-4" />
              Camera Autofill
            </Button>
          </div>

          {error ? <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div> : null}
          {success ? (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">{success}</div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Age</span>
              <input
                type="number"
                value={form.age}
                onChange={(event) => onInputChange("age", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Sex</span>
              <select
                value={form.sex}
                onChange={(event) => onInputChange("sex", event.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="0">Female / Other</option>
                <option value="1">Male</option>
                <option value="">N/A</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Height (cm)</span>
              <input
                type="number"
                value={form.height_cm}
                onChange={(event) => onInputChange("height_cm", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Weight (kg)</span>
              <input
                type="number"
                value={form.weight_kg}
                onChange={(event) => onInputChange("weight_kg", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Heart Rate</span>
              <input
                type="number"
                value={form.heart_rate}
                onChange={(event) => onInputChange("heart_rate", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">SpO2 (%)</span>
              <input
                type="number"
                value={form.spo2}
                onChange={(event) => onInputChange("spo2", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Systolic BP</span>
              <input
                type="number"
                value={form.systolic_bp}
                onChange={(event) => onInputChange("systolic_bp", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Diastolic BP</span>
              <input
                type="number"
                value={form.diastolic_bp}
                onChange={(event) => onInputChange("diastolic_bp", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Glucose</span>
              <input
                type="number"
                value={form.glucose}
                onChange={(event) => onInputChange("glucose", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Cholesterol</span>
              <input
                type="number"
                value={form.cholesterol}
                onChange={(event) => onInputChange("cholesterol", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">AQI</span>
              <input
                type="number"
                value={form.aqi}
                onChange={(event) => onInputChange("aqi", event.target.value)}
                placeholder="N/A allowed"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Disability</span>
              <select
                value={form.disability_type}
                onChange={(event) => onInputChange("disability_type", event.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="na">N/A</option>
                <option value="none">None</option>
                <option value="vision">Vision</option>
                <option value="hearing">Hearing</option>
                <option value="mobility">Mobility</option>
                <option value="cognitive">Cognitive</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              { key: "activity", label: "Activity", options: ["na", "low", "moderate", "high"] },
              { key: "stress", label: "Stress", options: ["na", "low", "medium", "high"] },
              { key: "smoker", label: "Smoker", options: ["na", "no", "yes"] },
              { key: "chest_pain", label: "Chest Pain", options: ["na", "none", "mild", "moderate", "severe"] },
              { key: "breath_shortness", label: "Breath Shortness", options: ["na", "none", "mild", "moderate", "severe"] },
              { key: "wheezing", label: "Wheezing", options: ["na", "no", "yes"] },
              { key: "cough", label: "Cough", options: ["na", "none", "mild", "persistent"] },
              { key: "family_heart_history", label: "Family Heart History", options: ["na", "no", "yes"] },
              { key: "family_asthma_history", label: "Family Asthma History", options: ["na", "no", "yes"] },
              { key: "family_diabetes_history", label: "Family Diabetes History", options: ["na", "no", "yes"] },
            ].map((item) => (
              <label key={item.key} className="space-y-1 text-sm">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <select
                  value={form[item.key as keyof AlertForm]}
                  onChange={(event) => onInputChange(item.key as keyof AlertForm, event.target.value)}
                  className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 outline-none focus:ring-2 focus:ring-primary/25"
                >
                  {item.options.map((option) => (
                    <option key={option} value={option}>
                      {option.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <label className="mt-4 block space-y-1 text-sm">
            <span className="text-xs text-muted-foreground">Notes</span>
            <textarea
              value={form.notes}
              onChange={(event) => onInputChange("notes", event.target.value)}
              rows={3}
              placeholder="Optional notes"
              className="w-full rounded-xl border border-border/60 bg-card px-3 py-2 outline-none focus:ring-2 focus:ring-primary/25"
            />
          </label>

          <Button type="button" className="mt-4 h-10 rounded-xl bg-primary px-4 text-primary-foreground" onClick={onSubmit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
            {isSubmitting ? "Analyzing..." : "Generate Instant Alert"}
          </Button>
        </article>

        <article className="space-y-6">
          <section className="glass-card rounded-3xl border-border/50 p-4 sm:p-6">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Risk Result
            </h2>
            {result ? (
              <>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${levelBadgeClass[result.overall_risk]}`}>
                    Overall {result.overall_risk}
                  </span>
                  <span className="text-xs text-muted-foreground">{formatDateTime(result.created_at)}</span>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">{result.summary}</p>
                <div className="space-y-3">
                  {orderedScores.map((score) => (
                    <div key={score.key} className={`rounded-2xl border bg-card/55 p-3 ${scoreCardClass[score.value.risk_level]}`}>
                      <div className="mb-1 flex items-center justify-between">
                        <p className="text-sm font-semibold">{score.key}</p>
                        <span className="text-sm font-bold">{score.value.risk_percent.toFixed(0)}%</span>
                      </div>
                      <p className={`mb-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${levelBadgeClass[score.value.risk_level]}`}>
                        {score.value.risk_level}
                      </p>
                      <ul className="space-y-1 text-xs text-muted-foreground">
                        {score.value.reasons.slice(0, 2).map((reason) => (
                          <li key={reason} className="flex gap-2">
                            <span>•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/45 px-4 py-5 text-sm text-muted-foreground">
                Fill the form and generate alert to view percentages here.
              </div>
            )}
          </section>

          <section className="glass-card rounded-3xl border-border/50 p-4 sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <History className="h-5 w-5 text-primary" />
                Alert History
              </h2>
              <Button type="button" variant="outline" className="h-8 rounded-lg px-3 text-xs" onClick={() => setShowHistory((prev) => !prev)}>
                {showHistory ? "Hide" : "Show"}
              </Button>
            </div>

            {showHistory ? (
              isLoadingHistory ? (
                <div className="rounded-2xl border border-border/60 bg-card/50 px-4 py-4 text-sm text-muted-foreground">Loading history...</div>
              ) : history.length ? (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-border/60 bg-card/55 px-3 py-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] ${levelBadgeClass[item.overall_risk]}`}>
                          {item.overall_risk}
                        </span>
                        <span className="text-[11px] text-muted-foreground">{formatDateTime(item.created_at)}</span>
                      </div>
                      <p className="text-sm font-medium">{item.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Heart {item.scores.heart_attack.risk_percent.toFixed(0)}% | Asthma {item.scores.asthma.risk_percent.toFixed(0)}% | Diabetes{" "}
                        {item.scores.diabetes.risk_percent.toFixed(0)}% | Hypertension {item.scores.hypertension.risk_percent.toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border/70 bg-card/45 px-4 py-5 text-sm text-muted-foreground">
                  No instant alert history yet.
                </div>
              )
            ) : null}
          </section>
        </article>
      </section>
      <CameraCaptureModal
        open={showCamera}
        title="Instant Alert Camera Autofill"
        subtitle="Capture health sheet/photo and auto-fill from profile + latest vitals. QR and readable text are both supported."
        captureLabel="Capture & Autofill"
        processing={isCameraAutofilling}
        onClose={() => setShowCamera(false)}
        onCapture={onCameraAutofill}
      />
    </AppLayout>
  );
};

export default InstantAlert;
