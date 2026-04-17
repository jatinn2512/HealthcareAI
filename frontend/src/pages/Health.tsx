import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
  Download,
  Footprints,
  HeartPulse,
  Moon,
  Plus,
  Sparkles,
  Stethoscope,
  Wind,
  X,
  XCircle,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import RiskDriftTracker from "@/components/RiskDriftTracker";
import WeeklyPlanGenerator from "@/components/WeeklyPlanGenerator";
import { getAccessToken, getApiBaseUrl } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { pushNotification } from "@/lib/notifications";

type SymptomIntensity = "mild" | "moderate" | "severe";

type SymptomPreset = {
  id: string;
  label: string;
  followupQuestion: string;
  intensityOptions: { id: SymptomIntensity; label: string }[];
  suggestions: Record<SymptomIntensity, string[]>;
};

const symptomPresets: SymptomPreset[] = [
  {
    id: "headache",
    label: "Headache",
    followupQuestion: "What type of headache is it?",
    intensityOptions: [
      { id: "mild", label: "Mild / slow pain" },
      { id: "moderate", label: "Throbbing pain" },
      { id: "severe", label: "Sharp severe pain" },
    ],
    suggestions: {
      mild: ["Drink water slowly.", "Take screen breaks for 10-15 min.", "Rest in a quiet room."],
      moderate: ["Hydrate and avoid loud noise.", "Use cold compress for 10 min.", "Avoid skipping meals."],
      severe: [
        "Stop heavy activity and rest now.",
        "Stay hydrated and avoid bright screens.",
        "Consult a doctor quickly if pain is sudden or worst-ever.",
      ],
    },
  },
  {
    id: "vomiting",
    label: "Vomiting",
    followupQuestion: "How frequent is vomiting right now?",
    intensityOptions: [
      { id: "mild", label: "1 time only" },
      { id: "moderate", label: "2-3 times" },
      { id: "severe", label: "Frequent / cannot hold fluids" },
    ],
    suggestions: {
      mild: ["Take small sips of water.", "Avoid oily food for now.", "Rest your stomach for 1-2 hours."],
      moderate: ["Use ORS or electrolyte water.", "Eat light foods like banana/toast.", "Monitor signs of dehydration."],
      severe: [
        "Start ORS immediately in small frequent sips.",
        "Avoid exercise and heavy food.",
        "Seek medical care if vomiting continues more than 6-8 hours.",
      ],
    },
  },
  {
    id: "dizziness",
    label: "Dizziness",
    followupQuestion: "How strong is the dizziness?",
    intensityOptions: [
      { id: "mild", label: "Light / brief" },
      { id: "moderate", label: "On standing or walking" },
      { id: "severe", label: "Heavy spinning / near-faint" },
    ],
    suggestions: {
      mild: ["Sit down and breathe deeply.", "Drink water and avoid sudden movement.", "Have a light snack if hungry."],
      moderate: ["Lie down for 10-15 minutes.", "Avoid driving for now.", "Check BP if possible."],
      severe: [
        "Sit or lie down immediately.",
        "Do not walk alone right now.",
        "Get urgent medical help if chest pain, fainting, or confusion is present.",
      ],
    },
  },
  {
    id: "fever",
    label: "Fever",
    followupQuestion: "How high does your fever feel?",
    intensityOptions: [
      { id: "mild", label: "Low-grade (feels warm)" },
      { id: "moderate", label: "Moderate with body ache" },
      { id: "severe", label: "High fever / chills" },
    ],
    suggestions: {
      mild: ["Drink warm water regularly.", "Take adequate rest.", "Track temperature every few hours."],
      moderate: ["Use light meals and stay hydrated.", "Avoid strenuous workout.", "Keep room ventilation good."],
      severe: [
        "Rest completely and hydrate aggressively.",
        "Use a cool sponge if body feels too hot.",
        "Consult a doctor the same day, especially if fever is persistent.",
      ],
    },
  },
  {
    id: "cough",
    label: "Cough",
    followupQuestion: "How uncomfortable is your cough?",
    intensityOptions: [
      { id: "mild", label: "Occasional dry cough" },
      { id: "moderate", label: "Frequent cough" },
      { id: "severe", label: "Persistent with breath trouble" },
    ],
    suggestions: {
      mild: ["Drink warm fluids.", "Avoid cold drinks and smoke.", "Use steam inhalation once daily."],
      moderate: ["Take steam inhalation 2-3 times.", "Avoid outdoor pollution exposure.", "Sleep with head slightly elevated."],
      severe: [
        "Avoid heavy activity immediately.",
        "Use a mask outdoors.",
        "Seek medical care if breathlessness or chest pain is present.",
      ],
    },
  },
  {
    id: "stomach_pain",
    label: "Stomach Pain",
    followupQuestion: "What is the pain intensity?",
    intensityOptions: [
      { id: "mild", label: "Mild cramps" },
      { id: "moderate", label: "On and off moderate pain" },
      { id: "severe", label: "Sharp severe pain" },
    ],
    suggestions: {
      mild: ["Drink warm water.", "Eat bland food.", "Avoid spicy/oily meals for now."],
      moderate: ["Take rest and avoid heavy workout.", "Use small light meals.", "Monitor if pain shifts or worsens."],
      severe: [
        "Avoid self-medication in strong pain.",
        "Do not delay medical review.",
        "Go to emergency if severe pain is sudden or with vomiting/fever.",
      ],
    },
  },
];

const metrics = [
  { label: "Heart Rate", value: "72 bpm", icon: HeartPulse, color: "text-health-rose", bg: "bg-health-rose/12" },
  { label: "Blood Pressure", value: "120/80", icon: Activity, color: "text-health-cyan", bg: "bg-health-cyan/12" },
  { label: "Sleep Score", value: "85/100", icon: Moon, color: "text-health-indigo", bg: "bg-health-indigo/12" },
  { label: "Steps Today", value: "8,432", icon: Footprints, color: "text-health-teal", bg: "bg-health-teal/12" },
] as const;

type RiskLevel = "Low" | "Medium" | "High";

type ConditionRisk = {
  id: string;
  name: string;
  icon: LucideIcon;
  level: RiskLevel;
  probability: number;
  summary: string;
  reasons: string[];
  last30Days: string[];
  recommendations: string[];
};

type ExerciseTask = {
  id: string;
  title: string;
  detail: string;
  completed: boolean;
};

const gymTemplates: Record<string, ExerciseTask[]> = {
  Chest: [
    { id: "chest-bench", title: "Bench Press - 4 sets", detail: "Heavy push movement.", completed: false },
    { id: "chest-incline", title: "Incline Dumbbell Press - 3 sets", detail: "Upper chest focus.", completed: false },
    { id: "chest-fly", title: "Cable Fly - 3 sets", detail: "Controlled chest isolation.", completed: false },
  ],
  Back: [
    { id: "back-row", title: "Barbell Row - 4 sets", detail: "Mid-back and lats.", completed: false },
    { id: "back-lat", title: "Lat Pulldown - 3 sets", detail: "Vertical pulling volume.", completed: false },
    { id: "back-facepull", title: "Face Pull - 3 sets", detail: "Rear delt + posture.", completed: false },
  ],
  Legs: [
    { id: "legs-squat", title: "Barbell Squat - 4 sets", detail: "Primary strength lift.", completed: false },
    { id: "legs-rdl", title: "Romanian Deadlift - 3 sets", detail: "Hamstring focus.", completed: false },
    { id: "legs-lunge", title: "Walking Lunge - 3 sets", detail: "Single-leg volume.", completed: false },
  ],
  Shoulders: [
    { id: "shoulder-press", title: "Overhead Press - 4 sets", detail: "Primary shoulder compound.", completed: false },
    { id: "shoulder-lateral", title: "Lateral Raise - 4 sets", detail: "Side delt isolation.", completed: false },
    { id: "shoulder-rear", title: "Rear Delt Fly - 3 sets", detail: "Rear delt stability.", completed: false },
  ],
  Arms: [
    { id: "arms-curl", title: "Barbell Curl - 4 sets", detail: "Biceps strength.", completed: false },
    { id: "arms-pushdown", title: "Triceps Pushdown - 4 sets", detail: "Triceps volume.", completed: false },
    { id: "arms-hammer", title: "Hammer Curl - 3 sets", detail: "Brachialis focus.", completed: false },
  ],
  Core: [
    { id: "core-plank", title: "Plank - 3 rounds", detail: "Core bracing.", completed: false },
    { id: "core-raise", title: "Leg Raise - 3 sets", detail: "Lower abs control.", completed: false },
    { id: "core-twist", title: "Russian Twist - 3 sets", detail: "Oblique rotation.", completed: false },
  ],
};

type ExportScope = "complete" | "weekly" | "this_month";

type RiskOverview = {
  sleep: { duration_minutes?: number | null; quality_score?: number | null; sleep_date?: string | null } | null;
  activity: { steps?: number | null; workout_minutes?: number | null } | null;
  vitals: { heart_rate?: number | null; systolic_bp?: number | null } | null;
  food:
    | {
        latest_item?: string | null;
        latest_logged_at?: string | null;
        latest_calories?: number | null;
        latest_sodium_mg?: number | null;
        latest_note?: string | null;
        latest_alert?: string | null;
        latest_dish_name?: string | null;
        latest_restaurant_name?: string | null;
        latest_choice_at?: string | null;
        alert_counts?: { green?: number; yellow?: number; red?: number } | null;
        recent_choices?: number | null;
      }
    | null;
};

type HealthRiskApiResponse = {
  overall_risk: RiskLevel;
  conditions: {
    diabetes: { level: RiskLevel; probability: number; reasons: string[] };
    heart: { level: RiskLevel; probability: number; reasons: string[] };
    hypertension: { level: RiskLevel; score: number; reasons: string[] };
    obesity: { level: RiskLevel; bmi: number };
    aqi_risk: { level: RiskLevel; aqi: number; advice: string };
  };
};

const buildPlaceholderConditionRisks = (): ConditionRisk[] => [
  {
    id: "diabetes",
    name: "Diabetes",
    icon: CheckCircle2,
    level: "Low",
    probability: 0.2,
    summary: "Not enough user data yet for personalized diabetes risk.",
    reasons: ["Add glucose, meal, and vitals logs to generate a data-backed estimate."],
    last30Days: ["No personal diabetes-relevant logs available yet."],
    recommendations: ["Log meals and vitals for at least a few days to unlock personalized insights."],
  },
  {
    id: "hypertension",
    name: "Hypertension",
    icon: AlertTriangle,
    level: "Low",
    probability: 0.2,
    summary: "Not enough user data yet for personalized blood pressure risk.",
    reasons: ["Add BP and activity logs to calculate real hypertension trend."],
    last30Days: ["No BP/activity trend available for this account yet."],
    recommendations: ["Start logging BP and daily activity."],
  },
  {
    id: "heart",
    name: "Heart Disease",
    icon: HeartPulse,
    level: "Low",
    probability: 0.2,
    summary: "Not enough user data yet for personalized heart risk.",
    reasons: ["Add resting pulse, BP, and activity data for a better estimate."],
    last30Days: ["No personalized heart trend available yet."],
    recommendations: ["Track resting pulse and workout minutes regularly."],
  },
  {
    id: "obesity",
    name: "Obesity",
    icon: XCircle,
    level: "Low",
    probability: 0.2,
    summary: "Not enough body profile data yet for BMI-based risk.",
    reasons: ["Height/weight profile is needed for reliable obesity risk."],
    last30Days: ["BMI trend unavailable for this account yet."],
    recommendations: ["Update height and weight in Profile."],
  },
  {
    id: "aqi",
    name: "Asthma",
    icon: Wind,
    level: "Low",
    probability: 0.2,
    summary: "Not enough environment exposure data yet for asthma-risk signal.",
    reasons: ["AQI snapshots help estimate respiratory exposure risk."],
    last30Days: ["No AQI exposure trend available yet."],
    recommendations: ["Enable AQI tracking and keep location access on."],
  },
  {
    id: "stroke",
    name: "Stroke",
    icon: AlertTriangle,
    level: "Low",
    probability: 0.2,
    summary: "Not enough risk signals yet for stroke vulnerability trends.",
    reasons: ["Add BP, stress, activity, and heart trend data for better stroke-risk screening."],
    last30Days: ["Stroke-related trend is waiting for more BP and activity logs."],
    recommendations: ["Track blood pressure regularly.", "Keep stress and sleep in check."],
  },
];

const normalizeActivity = (value: string | undefined): "low" | "moderate" | "high" => {
  const normalized = (value ?? "").trim().toLowerCase();
  if (normalized.includes("low")) return "low";
  if (normalized.includes("high")) return "high";
  return "moderate";
};

const levelToProbability = (level: RiskLevel): number => {
  if (level === "High") return 0.8;
  if (level === "Medium") return 0.55;
  return 0.25;
};

const riskLevelRank: Record<RiskLevel, number> = {
  Low: 1,
  Medium: 2,
  High: 3,
};

const getHigherRiskLevel = (left: RiskLevel, right: RiskLevel): RiskLevel =>
  riskLevelRank[left] >= riskLevelRank[right] ? left : right;

const buildRiskPayload = (
  age: number | undefined,
  gender: string | null | undefined,
  profile: { height_cm?: number | null; weight_kg?: number | null; activity_level?: string | null } | null | undefined,
  overview: RiskOverview | null,
) => {
  const heightCm = profile?.height_cm ?? null;
  const weightKg = profile?.weight_kg ?? null;
  const bmi = heightCm && weightKg ? weightKg / ((heightCm / 100) * (heightCm / 100)) : 24;
  const latestFoodSodium = overview?.food?.latest_sodium_mg ?? 0;
  const sodiumBpBoost = latestFoodSodium >= 1200 ? 10 : latestFoodSodium >= 800 ? 5 : 0;
  const systolic = (overview?.vitals?.systolic_bp ?? 120) + sodiumBpBoost;
  const heartRate = overview?.vitals?.heart_rate ?? 150;
  const steps = overview?.activity?.steps ?? 0;
  const latestFoodAlert = (overview?.food?.latest_alert ?? "").trim().toLowerCase();
  let stress: "low" | "medium" | "high" = steps < 4000 ? "high" : steps < 8000 ? "medium" : "low";
  if (latestFoodAlert === "red") {
    stress = "high";
  } else if (latestFoodAlert === "yellow" && stress === "low") {
    stress = "medium";
  }
  const sex = (gender ?? "").toLowerCase().startsWith("m") ? 1 : 0;

  return {
    age: age ?? 30,
    sex,
    glucose: 110,
    bmi: Number(bmi.toFixed(2)),
    bp: systolic,
    insulin: 80,
    pregnancies: 0,
    skin_thickness: 20,
    dpf: 0.5,
    chol: 190,
    fbs: 0,
    thalach: heartRate,
    cp: 0,
    activity: normalizeActivity(profile?.activity_level ?? undefined),
    stress,
    aqi: 140,
  };
};

const buildConditionRisksFromApi = (risk: HealthRiskApiResponse, overview: RiskOverview | null): ConditionRisk[] => {
  const sleepSummary = overview?.sleep
    ? `Latest sleep: ${overview.sleep.duration_minutes ?? "N/A"} min, quality ${overview.sleep.quality_score ?? "N/A"}`
    : "Sleep logs not available yet.";
  const activitySummary = overview?.activity
    ? `Latest activity: ${overview.activity.steps ?? 0} steps, ${overview.activity.workout_minutes ?? 0} workout mins`
    : "Activity logs not available yet.";
  const vitalsSummary = overview?.vitals
    ? `Latest vitals: HR ${overview.vitals.heart_rate ?? "N/A"}, BP ${overview.vitals.systolic_bp ?? "N/A"}`
    : "Vitals logs not available yet.";
  const foodSummary = overview?.food?.latest_item
    ? `Latest food: ${overview.food.latest_item} (${overview.food.latest_alert ?? "N/A"} alert)`
    : "No restaurant food analysis logged yet.";
  const hypertensionProbability = Math.min(Math.max(risk.conditions.hypertension.score / 10, 0), 1);
  const strokeLevel = getHigherRiskLevel(risk.conditions.heart.level, risk.conditions.hypertension.level);
  const strokeProbability = Number(
    Math.min(
      0.95,
      Math.max((risk.conditions.heart.probability + hypertensionProbability) / 2, levelToProbability(strokeLevel)),
    ).toFixed(2),
  );

  return [
    {
      id: "diabetes",
      name: "Diabetes",
      icon: CheckCircle2,
      level: risk.conditions.diabetes.level,
      probability: risk.conditions.diabetes.probability,
      summary: risk.conditions.diabetes.reasons[0] || "Model-based diabetes estimate generated.",
      reasons: risk.conditions.diabetes.reasons.length ? risk.conditions.diabetes.reasons : ["No major diabetes markers detected."],
      last30Days: [sleepSummary, activitySummary, foodSummary],
      recommendations: ["Reduce added sugar intake.", "Keep post-meal walk habit.", "Log fasting sugar regularly."],
    },
    {
      id: "hypertension",
      name: "Hypertension",
      icon: AlertTriangle,
      level: risk.conditions.hypertension.level,
      probability: hypertensionProbability,
      summary: risk.conditions.hypertension.reasons[0] || "Rule-based hypertension score generated.",
      reasons: risk.conditions.hypertension.reasons.length
        ? risk.conditions.hypertension.reasons
        : ["No major hypertension markers detected."],
      last30Days: [vitalsSummary, activitySummary, foodSummary],
      recommendations: ["Track BP at fixed time daily.", "Lower sodium intake.", "Add stress management routine."],
    },
    {
      id: "heart",
      name: "Heart Disease",
      icon: HeartPulse,
      level: risk.conditions.heart.level,
      probability: risk.conditions.heart.probability,
      summary: risk.conditions.heart.reasons[0] || "Model-based heart-risk estimate generated.",
      reasons: risk.conditions.heart.reasons.length ? risk.conditions.heart.reasons : ["No major heart markers detected."],
      last30Days: [vitalsSummary, activitySummary, foodSummary],
      recommendations: ["Maintain regular cardio.", "Keep BP and pulse monitoring active.", "Avoid prolonged inactivity."],
    },
    {
      id: "obesity",
      name: "Obesity",
      icon: XCircle,
      level: risk.conditions.obesity.level,
      probability: levelToProbability(risk.conditions.obesity.level),
      summary: `BMI based assessment: ${risk.conditions.obesity.bmi}`,
      reasons: ["BMI-based risk score was used."],
      last30Days: [activitySummary, sleepSummary, foodSummary],
      recommendations: ["Maintain calorie balance.", "Keep protein-focused meals.", "Track body weight weekly."],
    },
    {
      id: "aqi",
      name: "Asthma",
      icon: Wind,
      level: risk.conditions.aqi_risk.level,
      probability: levelToProbability(risk.conditions.aqi_risk.level),
      summary: `AQI risk level: ${risk.conditions.aqi_risk.level}`,
      reasons: [risk.conditions.aqi_risk.advice],
      last30Days: ["Respiratory exposure risk uses AQI trend + overall risk.", vitalsSummary, foodSummary],
      recommendations: ["Use mask on poor AQI days.", "Prefer indoor workouts on high AQI.", "Check AQI before commute."],
    },
    {
      id: "stroke",
      name: "Stroke",
      icon: AlertTriangle,
      level: strokeLevel,
      probability: strokeProbability,
      summary: "Composite screening from BP, heart-risk, and stress-associated activity trends.",
      reasons: [
        ...risk.conditions.hypertension.reasons.slice(0, 1),
        ...risk.conditions.heart.reasons.slice(0, 1),
      ].filter(Boolean),
      last30Days: [vitalsSummary, activitySummary, sleepSummary],
      recommendations: [
        "Keep BP checks consistent at the same time daily.",
        "Avoid missed sleep and unmanaged high stress days.",
        "Consult clinician quickly for sudden numbness, speech, or facial weakness.",
      ],
    },
  ];
};

const levelTextClass = (level: RiskLevel): string => {
  if (level === "Low") return "text-emerald-600";
  if (level === "Medium") return "text-amber-600";
  return "text-red-600";
};

const levelBadgeClass = (level: RiskLevel): string => {
  if (level === "Low") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-600";
  if (level === "Medium") return "border-amber-500/30 bg-amber-500/10 text-amber-600";
  return "border-red-500/30 bg-red-500/10 text-red-600";
};

const levelIcon = (level: RiskLevel): LucideIcon => {
  if (level === "Low") return CheckCircle2;
  if (level === "Medium") return AlertTriangle;
  return XCircle;
};

const buildExercisePlan = (hour: number): ExerciseTask[] => {
  if (hour >= 5 && hour < 12) {
    return [
      { id: "walk", title: "20 min brisk walk", detail: "Wake-up mobility and light cardio.", completed: false },
      { id: "stretch", title: "10 min stretching", detail: "Neck, back, and hamstring mobility.", completed: false },
      { id: "breath", title: "8 min breathing", detail: "Calm breathing before work.", completed: false },
    ];
  }
  if (hour >= 12 && hour < 18) {
    return [
      { id: "run", title: "25 min run", detail: "Moderate pace cardio session.", completed: false },
      { id: "core", title: "15 min core", detail: "Plank and bodyweight core set.", completed: false },
      { id: "meditation", title: "30 min meditation", detail: "Recovery + stress control.", completed: false },
    ];
  }
  return [
    { id: "walk_evening", title: "20 min evening walk", detail: "Light recovery and digestion support.", completed: false },
    { id: "yoga", title: "15 min yoga flow", detail: "Easy movement before sleep.", completed: false },
    { id: "meditation_night", title: "30 min meditation", detail: "Wind down and improve sleep quality.", completed: false },
  ];
};

const Health = () => {
  const [planHour, setPlanHour] = useState<number>(() => new Date().getHours());
  const [selectedSymptomId, setSelectedSymptomId] = useState<string | null>(null);
  const [selectedIntensity, setSelectedIntensity] = useState<SymptomIntensity | null>(null);
  const [isSymptomModalOpen, setIsSymptomModalOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [exportSuccess, setExportSuccess] = useState("");
  const [exportScope, setExportScope] = useState<ExportScope>("complete");
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [conditionRisks, setConditionRisks] = useState<ConditionRisk[]>(() => buildPlaceholderConditionRisks());
  const [riskInfoMessage, setRiskInfoMessage] = useState("Add your health logs to generate personalized risk alerts.");
  const [isRiskLoading, setIsRiskLoading] = useState(true);
  const [exercisePlan, setExercisePlan] = useState<ExerciseTask[]>(() => buildExercisePlan(new Date().getHours()));
  const [exerciseMode, setExerciseMode] = useState<"home" | "gym">("home");
  const [selectedGymGroup, setSelectedGymGroup] = useState<keyof typeof gymTemplates>("Chest");
  const [customExercise, setCustomExercise] = useState("");
  const [customExerciseLogs, setCustomExerciseLogs] = useState<ExerciseTask[]>([]);
  const [pendingReminderSent, setPendingReminderSent] = useState(false);
  const [selectedRiskId, setSelectedRiskId] = useState<string | null>(null);

  const selectedRisk = conditionRisks.find((risk) => risk.id === selectedRiskId) ?? null;
  const selectedSymptom = symptomPresets.find((symptom) => symptom.id === selectedSymptomId) ?? null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      const currentHour = new Date().getHours();
      setPlanHour((prev) => (prev === currentHour ? prev : currentHour));
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (exerciseMode === "gym") {
      setExercisePlan(gymTemplates[selectedGymGroup].map((task) => ({ ...task })));
    } else {
      setExercisePlan(buildExercisePlan(planHour));
    }
    setPendingReminderSent(false);
  }, [exerciseMode, planHour, selectedGymGroup]);

  useEffect(() => {
    let cancelled = false;

    const loadConditionRisks = async () => {
      setIsRiskLoading(true);
      setRiskInfoMessage("Loading personalized risk alerts...");

      const [userResponse, overviewResponse] = await Promise.all([
        apiClient.getCurrentUser(),
        apiClient.get<RiskOverview>("/risk/overview"),
      ]);

      if (cancelled) return;

      const user = userResponse.data;
      const overview = overviewResponse.data ?? null;
      const hasVitals = Boolean(overview?.vitals && (overview.vitals.systolic_bp ?? overview.vitals.heart_rate));
      const hasActivity = Boolean(overview?.activity && ((overview.activity.steps ?? 0) > 0 || (overview.activity.workout_minutes ?? 0) > 0));
      const hasBodyProfile = Boolean(user?.profile?.height_cm && user?.profile?.weight_kg);
      const hasFood = Boolean((overview?.food?.recent_choices ?? 0) > 0 || overview?.food?.latest_item);

      if (!user || (!hasVitals && !hasActivity && !hasBodyProfile && !hasFood)) {
        setConditionRisks(buildPlaceholderConditionRisks());
        setRiskInfoMessage("No personal health logs found yet. Add vitals/activity/profile data for personalized risk.");
        setIsRiskLoading(false);
        return;
      }

      const riskPayload = buildRiskPayload(user.age, user.gender, user.profile, overview);
      const riskResponse = await apiClient.post<HealthRiskApiResponse>("/health/risk", riskPayload);
      if (cancelled) return;

      if (riskResponse.data) {
        setConditionRisks(buildConditionRisksFromApi(riskResponse.data, overview));
        setRiskInfoMessage("Personalized risk generated from your current profile and latest logs.");
      } else {
        setConditionRisks(buildPlaceholderConditionRisks());
        setRiskInfoMessage("Risk engine could not read your data right now. Showing starter guidance.");
      }
      setIsRiskLoading(false);
    };

    void loadConditionRisks();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (pendingReminderSent) return;
    const pendingCount = exercisePlan.filter((task) => !task.completed).length;
    if (!pendingCount) return;
    pushNotification({
      type: "reminder",
      title: "Exercise pending",
      message: `${pendingCount} exercise task${pendingCount > 1 ? "s are" : " is"} pending.`,
    });
    setPendingReminderSent(true);
  }, [exercisePlan, pendingReminderSent]);

  const handleExportPdf = async () => {
    setExportError("");
    setExportSuccess("");
    setIsExporting(true);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error("Session expired. Please login again.");
      }

      const response = await fetch(`${getApiBaseUrl()}/auth/export/pdf?scope=${encodeURIComponent(exportScope)}`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        let message = "Failed to export user data.";
        const contentType = response.headers.get("content-type");
        if (contentType?.includes("application/json")) {
          try {
            const payload = (await response.json()) as { detail?: string };
            if (payload.detail) {
              message = payload.detail;
            }
          } catch {
            // Use fallback message when error response cannot be parsed.
          }
        }
        throw new Error(message);
      }

      const pdfBlob = await response.blob();
      const objectUrl = window.URL.createObjectURL(pdfBlob);

      const disposition = response.headers.get("content-disposition");
      const filenameMatch = disposition?.match(/filename=\"?([^\";]+)\"?/i);
      const fileName = filenameMatch?.[1] || "curasync-user-data.pdf";

      const downloadLink = document.createElement("a");
      downloadLink.href = objectUrl;
      downloadLink.download = fileName;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      downloadLink.remove();
      window.URL.revokeObjectURL(objectUrl);

      const scopeLabel = exportScope === "weekly" ? "weekly" : exportScope === "this_month" ? "this month" : "complete";
      setExportSuccess(`User ${scopeLabel} health data exported successfully as PDF.`);
      setIsExportModalOpen(false);
      setTimeout(() => setExportSuccess(""), 3000);
    } catch (error: unknown) {
      if (error instanceof Error) {
        setExportError(error.message);
      } else {
        setExportError("Failed to export user data.");
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSymptomSelect = (symptomId: string) => {
    setSelectedSymptomId(symptomId);
    setSelectedIntensity(null);
    setIsSymptomModalOpen(true);
  };

  const handleIntensitySelect = (intensity: SymptomIntensity) => {
    setSelectedIntensity(intensity);
    setIsSymptomModalOpen(false);
  };

  const clearSymptomSelection = () => {
    setSelectedSymptomId(null);
    setSelectedIntensity(null);
    setIsSymptomModalOpen(false);
  };

  const markExerciseCompleted = (taskId: string) => {
    let completedTaskTitle = "";
    setExercisePlan((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.completed) return task;
        completedTaskTitle = task.title;
        return { ...task, completed: true };
      }),
    );
    if (completedTaskTitle) {
      pushNotification({
        type: "exercise",
        title: "Exercise completed",
        message: `You completed ${completedTaskTitle}.`,
      });
    }
  };

  const addCustomExercise = () => {
    const title = customExercise.trim();
    if (!title) return;

    setCustomExerciseLogs((prev) => [
      {
        id: `custom-${Date.now()}`,
        title,
        detail: "Logged by you",
        completed: false,
      },
      ...prev,
    ]);
    pushNotification({
      type: "exercise",
      title: "Exercise added",
      message: `${title} added to your exercise logs.`,
    });
    setCustomExercise("");
  };

  const markCustomExerciseCompleted = (taskId: string) => {
    let completedTaskTitle = "";
    setCustomExerciseLogs((prev) =>
      prev.map((task) => {
        if (task.id !== taskId || task.completed) return task;
        completedTaskTitle = task.title;
        return { ...task, completed: true };
      }),
    );
    if (completedTaskTitle) {
      pushNotification({
        type: "exercise",
        title: "Exercise completed",
        message: `You completed ${completedTaskTitle}.`,
      });
    }
  };

  return (
    <AppLayout hideHeader>
      <section className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-3xl font-bold tracking-tight lg:text-4xl">Health</h1>
          <Button type="button" className="h-9 rounded-xl bg-primary px-4 text-primary-foreground" onClick={() => setIsExportModalOpen(true)} disabled={isExporting}>
            <Download className="h-4 w-4" />
            {isExporting ? "Exporting..." : "Export"}
          </Button>
        </div>
        {exportError ? (
          <div className="w-full rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{exportError}</div>
        ) : null}
        {exportSuccess ? (
          <div className="w-full rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">{exportSuccess}</div>
        ) : null}
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
        {metrics.map((metric, index) => (
          <motion.article
            key={metric.label}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="glass-card rounded-2xl border-border/50 p-3 sm:rounded-3xl sm:p-5"
          >
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card sm:h-10 sm:w-10 sm:rounded-xl">
                <metric.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${metric.color}`} />
              </div>
              <div>
                <p className="text-base font-bold sm:text-lg">{metric.value}</p>
                <p className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{metric.label}</p>
              </div>
            </div>
          </motion.article>
        ))}
      </section>

      <section className="grid gap-6">
        <article className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Disease Risk Alerts
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">{isRiskLoading ? "Preparing personalized risk..." : riskInfoMessage}</p>
          <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
            {conditionRisks.map((risk) => (
              <button
                key={risk.id}
                type="button"
                className="flex h-full min-h-[90px] w-full items-center justify-between rounded-2xl border border-border/60 bg-card/55 px-4 py-3 text-left transition-colors hover:border-primary/50"
                onClick={() => setSelectedRiskId(risk.id)}
              >
                <span>
                  <span className="block text-[13px] font-semibold sm:text-sm">{risk.name}</span>
                  <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[11px] ${levelBadgeClass(risk.level)}`}>
                    {risk.level}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </article>

        <motion.article initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl border-border/50 p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Stethoscope className="h-5 w-5 text-primary" />
            Symptom Checker
          </h2>

          <div className="space-y-4 rounded-2xl border border-border/60 bg-card/45 p-4">
            <div className="flex flex-wrap gap-2">
              {symptomPresets.map((symptom) => (
                <Button
                  key={symptom.id}
                  type="button"
                  variant={selectedSymptomId === symptom.id ? "default" : "outline"}
                  className="h-8 rounded-lg px-3 text-xs"
                  onClick={() => handleSymptomSelect(symptom.id)}
                >
                  {symptom.label}
                </Button>
              ))}
            </div>

            {selectedSymptom && selectedIntensity ? (
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                    {selectedSymptom.label} ({selectedIntensity})
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-7 rounded-md px-2 text-[11px] text-emerald-800 hover:bg-emerald-500/20"
                    onClick={clearSymptomSelection}
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back
                  </Button>
                </div>
                <ul className="space-y-1 text-sm text-emerald-800">
                  {selectedSymptom.suggestions[selectedIntensity].map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span>•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </motion.article>
      </section>

      <WeeklyPlanGenerator conditionRisks={conditionRisks.map((risk) => ({ id: risk.id, name: risk.name, level: risk.level }))} />

      <RiskDriftTracker />

      <section className="glass-card rounded-3xl border-border/50 p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Sparkles className="h-5 w-5 text-health-violet" />
          Exercise Plan
        </h2>
        <div className="mb-4 inline-flex rounded-xl border border-border/60 bg-card/60 p-1">
          <Button
            type="button"
            variant={exerciseMode === "home" ? "default" : "ghost"}
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setExerciseMode("home")}
          >
            Home
          </Button>
          <Button
            type="button"
            variant={exerciseMode === "gym" ? "default" : "ghost"}
            className="h-8 rounded-lg px-3 text-xs"
            onClick={() => setExerciseMode("gym")}
          >
            Gym
          </Button>
        </div>

        {exerciseMode === "gym" ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {(Object.keys(gymTemplates) as Array<keyof typeof gymTemplates>).map((group) => (
              <Button
                key={group}
                type="button"
                variant={selectedGymGroup === group ? "default" : "outline"}
                className="h-8 rounded-lg px-3 text-xs"
                onClick={() => setSelectedGymGroup(group)}
              >
                <Dumbbell className="h-3.5 w-3.5" />
                {group}
              </Button>
            ))}
          </div>
        ) : null}

        <div className="mb-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input
            value={customExercise}
            onChange={(event) => setCustomExercise(event.target.value)}
            placeholder="Add your own exercise log (e.g., 40 min cycling)"
            className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
          />
          <Button type="button" className="h-10 rounded-xl px-4 text-xs" onClick={addCustomExercise}>
            <Plus className="h-3.5 w-3.5" />
            Add
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {exercisePlan.map((task) => (
            <div key={task.id} className="rounded-2xl border border-border/60 bg-card/55 p-4">
              <p className="text-sm font-semibold">{task.title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{task.detail}</p>
              <div className="mt-3">
                <Button
                  type="button"
                  variant={task.completed ? "outline" : "default"}
                  className={`h-8 rounded-lg px-3 text-xs ${task.completed ? "border-emerald-500/40 text-emerald-600" : ""}`}
                  onClick={() => markExerciseCompleted(task.id)}
                  disabled={task.completed}
                >
                  {task.completed ? "Completed" : "Complete"}
                </Button>
              </div>
            </div>
          ))}
        </div>
        {customExerciseLogs.length ? (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your exercise logs</p>
            {customExerciseLogs.map((task) => (
              <div key={task.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/55 px-3 py-2">
                <div>
                  <p className="text-sm font-semibold">{task.title}</p>
                  <p className="text-xs text-muted-foreground">{task.detail}</p>
                </div>
                <Button
                  type="button"
                  variant={task.completed ? "outline" : "default"}
                  className={`h-8 rounded-lg px-3 text-xs ${task.completed ? "border-emerald-500/40 text-emerald-600" : ""}`}
                  onClick={() => markCustomExerciseCompleted(task.id)}
                  disabled={task.completed}
                >
                  {task.completed ? "Completed" : "Complete"}
                </Button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      <AnimatePresence>
        {isSymptomModalOpen && selectedSymptom ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            onClick={() => setIsSymptomModalOpen(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="w-full max-w-md rounded-3xl border border-border/60 bg-background p-5 shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <Button type="button" variant="ghost" className="h-7 rounded-md px-2 text-[11px]" onClick={clearSymptomSelection}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Back
                </Button>
                <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setIsSymptomModalOpen(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <h3 className="text-lg font-semibold">{selectedSymptom.label}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{selectedSymptom.followupQuestion}</p>

              <div className="mt-4 space-y-2">
                {selectedSymptom.intensityOptions.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    variant={selectedIntensity === option.id ? "default" : "outline"}
                    className="h-9 w-full justify-start rounded-lg px-3 text-xs"
                    onClick={() => handleIntensitySelect(option.id)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </motion.section>
          </motion.div>
        ) : null}

        {isExportModalOpen ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            onClick={() => {
              if (!isExporting) setIsExportModalOpen(false);
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.section
              className="w-full max-w-lg rounded-3xl border border-border/60 bg-background p-5 shadow-2xl sm:p-6"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold">Export Data</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Choose the data range and export your health report as PDF.</p>
                </div>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setIsExportModalOpen(false)} disabled={isExporting}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="inline-flex rounded-xl border border-border/60 bg-card/60 p-1">
                {[
                  { key: "complete", label: "Complete" },
                  { key: "weekly", label: "Weekly" },
                  { key: "this_month", label: "This Month" },
                ].map((option) => (
                  <Button
                    key={option.key}
                    type="button"
                    variant={exportScope === option.key ? "default" : "ghost"}
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => setExportScope(option.key as ExportScope)}
                    disabled={isExporting}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={() => setIsExportModalOpen(false)} disabled={isExporting}>
                  Cancel
                </Button>
                <Button type="button" className="h-9 rounded-lg px-4 text-xs" onClick={handleExportPdf} disabled={isExporting}>
                  <Download className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export PDF"}
                </Button>
              </div>
            </motion.section>
          </motion.div>
        ) : null}

        {selectedRisk ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
            onClick={() => setSelectedRiskId(null)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-2xl rounded-3xl border border-border/60 bg-background p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
              initial={{ opacity: 0, scale: 0.96, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 18 }}
              transition={{ duration: 0.2 }}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-2xl font-semibold">{selectedRisk.name} Risk Overview</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Risk based on current profile trends and recent behavior signals.</p>
                </div>
                <Button type="button" variant="outline" size="icon" className="h-9 w-9 rounded-full" onClick={() => setSelectedRiskId(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-semibold ${levelBadgeClass(selectedRisk.level)}`}>
                  {selectedRisk.level} Risk
                </span>
                <span className="text-sm text-muted-foreground">Estimated probability: {(selectedRisk.probability * 100).toFixed(0)}%</span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border/60 bg-card/55 p-4">
                  <p className="mb-2 text-sm font-semibold">Why this alert</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {selectedRisk.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <span className={levelTextClass(selectedRisk.level)}>•</span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-2xl border border-border/60 bg-card/55 p-4">
                  <p className="mb-2 text-sm font-semibold">Last 30 days snapshot</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {selectedRisk.last30Days.map((item) => (
                      <li key={item} className="flex gap-2">
                        <span>•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-border/60 bg-card/55 p-4">
                <p className="mb-2 text-sm font-semibold">Suggested next actions</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {selectedRisk.recommendations.map((tip) => (
                    <li key={tip} className="flex gap-2">
                      <span className="mt-0.5">
                        {(() => {
                          const Icon = levelIcon(selectedRisk.level);
                          return <Icon className={`h-3.5 w-3.5 ${levelTextClass(selectedRisk.level)}`} />;
                        })()}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </AppLayout>
  );
};

export default Health;
