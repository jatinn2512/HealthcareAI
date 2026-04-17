import { useEffect, useState } from "react";
import { Camera, Pencil, Save, ShieldPlus, Target, TrendingUp, User, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import { useAuth, type CurrentUser } from "@/lib/authContext";
import { apiClient } from "@/lib/apiClient";
import { scanStructuredDataFromImage } from "@/lib/cameraScan";

type ProfileFormData = {
  full_name: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  height_cm: string;
  weight_kg: string;
  activity_level: string;
  eyesight_left: string;
  eyesight_right: string;
  disability_status: string;
  chronic_conditions: string;
  allergies: string;
  smoking_status: string;
  alcohol_intake: string;
  medical_notes: string;
};

const toInputValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "";
  return String(value);
};

const toTextValue = (value: string | null | undefined): string => value ?? "";

const trimOrUndefined = (value: string): string | undefined => {
  const trimmed = value.trim();
  return trimmed ? trimmed : undefined;
};

const pickScanValue = (payload: Record<string, unknown> | null, keys: string[]): string => {
  if (!payload) return "";
  const loweredPayload = Object.fromEntries(Object.entries(payload).map(([key, value]) => [key.toLowerCase(), value]));
  for (const key of keys) {
    const raw = loweredPayload[key.toLowerCase()];
    if (raw === null || raw === undefined) continue;
    const resolved = String(raw).trim();
    if (resolved) return resolved;
  }
  return "";
};

const normalizeFromScan = (value: string, allowedValues: string[], fallback: string): string => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "_");
  return allowedValues.includes(normalized) ? normalized : fallback;
};

const normalizeGenderFromScan = (value: string, fallback: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized.startsWith("m")) return "Male";
  if (normalized.startsWith("f")) return "Female";
  if (normalized.startsWith("o")) return "Other";
  return fallback;
};

const normalizeSmokingFromScan = (value: string, fallback: string): string => {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  if (normalized === "yes" || normalized === "smoker") return "daily";
  if (normalized === "no" || normalized === "never") return "never";
  if (normalized === "occasionally" || normalized === "occasional") return "occasionally";
  if (normalized === "former") return "former";
  if (normalized === "daily") return "daily";
  return fallback;
};

const createEmptyProfileFormData = (): ProfileFormData => ({
  full_name: "",
  email: "",
  phone: "",
  age: "",
  gender: "",
  height_cm: "",
  weight_kg: "",
  activity_level: "moderate",
  eyesight_left: "",
  eyesight_right: "",
  disability_status: "na",
  chronic_conditions: "",
  allergies: "",
  smoking_status: "na",
  alcohol_intake: "na",
  medical_notes: "",
});

const mapUserToProfileFormData = (currentUser: CurrentUser | null): ProfileFormData => {
  if (!currentUser) return createEmptyProfileFormData();

  return {
    full_name: currentUser.full_name || "",
    email: currentUser.email || "",
    phone: currentUser.phone || "",
    age: currentUser.age ? String(currentUser.age) : "",
    gender: currentUser.gender || "",
    height_cm: toInputValue(currentUser.profile?.height_cm),
    weight_kg: toInputValue(currentUser.profile?.weight_kg),
    activity_level: currentUser.profile?.activity_level || "moderate",
    eyesight_left: toTextValue(currentUser.profile?.eyesight_left),
    eyesight_right: toTextValue(currentUser.profile?.eyesight_right),
    disability_status: toTextValue(currentUser.profile?.disability_status) || "na",
    chronic_conditions: toTextValue(currentUser.profile?.chronic_conditions),
    allergies: toTextValue(currentUser.profile?.allergies),
    smoking_status: toTextValue(currentUser.profile?.smoking_status) || "na",
    alcohol_intake: toTextValue(currentUser.profile?.alcohol_intake) || "na",
    medical_notes: toTextValue(currentUser.profile?.medical_notes),
  };
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();

  const [formData, setFormData] = useState<ProfileFormData>(() => createEmptyProfileFormData());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [showProfileCamera, setShowProfileCamera] = useState(false);
  const [isCameraProcessing, setIsCameraProcessing] = useState(false);

  useEffect(() => {
    setFormData(mapUserToProfileFormData(user));
    setIsEditing(false);
  }, [user]);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError("");
  };

  const handleStartEdit = () => {
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setError("");
    setSuccess("");
    setFormData(mapUserToProfileFormData(user));
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!isEditing) return;

    setError("");
    setSuccess("");
    setIsLoading(true);

    try {
      const payload: {
        full_name?: string;
        phone?: string;
        age?: number;
        gender?: string;
        height_cm?: number;
        weight_kg?: number;
        activity_level?: string;
        eyesight_left?: string;
        eyesight_right?: string;
        disability_status?: string;
        chronic_conditions?: string;
        allergies?: string;
        smoking_status?: string;
        alcohol_intake?: string;
        medical_notes?: string;
      } = {};

      payload.full_name = trimOrUndefined(formData.full_name);
      payload.phone = trimOrUndefined(formData.phone);
      payload.gender = trimOrUndefined(formData.gender);
      payload.activity_level = trimOrUndefined(formData.activity_level);
      payload.eyesight_left = trimOrUndefined(formData.eyesight_left);
      payload.eyesight_right = trimOrUndefined(formData.eyesight_right);
      payload.disability_status = trimOrUndefined(formData.disability_status);
      payload.chronic_conditions = trimOrUndefined(formData.chronic_conditions);
      payload.allergies = trimOrUndefined(formData.allergies);
      payload.smoking_status = trimOrUndefined(formData.smoking_status);
      payload.alcohol_intake = trimOrUndefined(formData.alcohol_intake);
      payload.medical_notes = trimOrUndefined(formData.medical_notes);

      if (formData.age.trim()) {
        const parsedAge = Number(formData.age);
        if (Number.isNaN(parsedAge) || parsedAge < 18) {
          throw new Error("Age must be at least 18");
        }
        payload.age = parsedAge;
      }
      if (formData.height_cm.trim()) {
        const parsedHeight = Number(formData.height_cm);
        if (Number.isNaN(parsedHeight) || parsedHeight <= 0) {
          throw new Error("Height must be a valid positive number");
        }
        payload.height_cm = parsedHeight;
      }
      if (formData.weight_kg.trim()) {
        const parsedWeight = Number(formData.weight_kg);
        if (Number.isNaN(parsedWeight) || parsedWeight <= 0) {
          throw new Error("Weight must be a valid positive number");
        }
        payload.weight_kg = parsedWeight;
      }

      const response = await apiClient.updateProfile(payload);
      if (response.error || !response.data) {
        throw new Error(response.error || "Failed to update profile");
      }

      await refreshUser();
      setIsEditing(false);
      setSuccess("Profile and medical details updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileCameraCapture = async (imageDataUrl: string) => {
    if (!isEditing) {
      setShowProfileCamera(false);
      return;
    }

    setIsCameraProcessing(true);
    setError("");

    try {
      const scan = await scanStructuredDataFromImage(imageDataUrl);
      const parsed = scan?.parsed;

      if (!parsed) {
        setSuccess("Camera capture done. No readable QR/text profile data was found, so existing values are kept.");
        setShowProfileCamera(false);
        return;
      }

      setFormData((prev) => {
        const scannedGender = normalizeGenderFromScan(pickScanValue(parsed, ["gender", "sex"]), prev.gender);

        return {
          ...prev,
          full_name: pickScanValue(parsed, ["full_name", "name"]) || prev.full_name,
          phone: pickScanValue(parsed, ["phone", "phone_number", "mobile"]) || prev.phone,
          age: pickScanValue(parsed, ["age"]) || prev.age,
          gender: scannedGender,
          height_cm: pickScanValue(parsed, ["height_cm", "height"]) || prev.height_cm,
          weight_kg: pickScanValue(parsed, ["weight_kg", "weight"]) || prev.weight_kg,
          activity_level: normalizeFromScan(
            pickScanValue(parsed, ["activity_level", "activity"]) || prev.activity_level,
            ["low", "moderate", "high", "na"],
            prev.activity_level || "moderate",
          ),
          eyesight_left: pickScanValue(parsed, ["eyesight_left", "left_eye"]) || prev.eyesight_left,
          eyesight_right: pickScanValue(parsed, ["eyesight_right", "right_eye"]) || prev.eyesight_right,
          disability_status: normalizeFromScan(
            pickScanValue(parsed, ["disability_status", "disability"]) || prev.disability_status,
            ["na", "none", "vision", "hearing", "mobility", "cognitive", "other"],
            prev.disability_status || "na",
          ),
          chronic_conditions: pickScanValue(parsed, ["chronic_conditions", "conditions"]) || prev.chronic_conditions,
          allergies: pickScanValue(parsed, ["allergies"]) || prev.allergies,
          smoking_status: normalizeSmokingFromScan(
            pickScanValue(parsed, ["smoking_status", "smoker"]) || prev.smoking_status,
            prev.smoking_status || "na",
          ),
          alcohol_intake: normalizeFromScan(
            pickScanValue(parsed, ["alcohol_intake", "alcohol"]) || prev.alcohol_intake,
            ["na", "none", "occasional", "weekly", "daily"],
            prev.alcohol_intake || "na",
          ),
          medical_notes: pickScanValue(parsed, ["medical_notes", "notes"]) || prev.medical_notes,
        };
      });

      setSuccess(`Camera scan complete. Profile fields auto-filled from ${scan?.source === "ocr" ? "photo text" : "QR"} data.`);
      setShowProfileCamera(false);
    } finally {
      setIsCameraProcessing(false);
    }
  };

  const editableFieldClass =
    "h-9 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25";
  const readOnlyFieldClass =
    "h-9 w-full cursor-not-allowed rounded-xl border border-border/50 bg-card/45 px-3 text-sm text-muted-foreground";
  const inputClassName = isEditing ? editableFieldClass : readOnlyFieldClass;
  const selectClassName = `${isEditing ? editableFieldClass : readOnlyFieldClass} appearance-none`;
  const textareaClassName = isEditing
    ? "w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
    : "w-full cursor-not-allowed rounded-xl border border-border/50 bg-card/45 px-3 py-2 text-sm text-muted-foreground";

  return (
    <AppLayout title="Profile" subtitle="Manage personal details and medical profile used by app insights.">
      <section className="space-y-4">
        <article className="glass-card rounded-3xl border-border/50 p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-semibold">
                <User className="h-5 w-5 text-primary" />
                Personal & Body Metrics
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {isEditing ? "Edit mode enabled. Update fields and save changes." : "Read-only mode. Click Edit Profile to make changes."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isEditing ? (
                <>
                  <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={handleCancelEdit} disabled={isLoading}>
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="h-9 rounded-lg bg-primary px-3 text-xs text-primary-foreground"
                    onClick={handleSave}
                    disabled={isLoading}
                  >
                    <Save className="h-4 w-4" />
                    {isLoading ? "Saving..." : "Save Changes"}
                  </Button>
                </>
              ) : (
                <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={handleStartEdit}>
                  <Pencil className="h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>

          {error ? <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{error}</div> : null}
          {success ? (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">{success}</div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Full Name</span>
              <input
                value={formData.full_name}
                onChange={(event) => handleInputChange("full_name", event.target.value)}
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Email</span>
              <input value={formData.email} disabled className={readOnlyFieldClass} />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Phone Number</span>
              <input
                value={formData.phone}
                onChange={(event) => handleInputChange("phone", event.target.value)}
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Age</span>
              <input
                type="number"
                value={formData.age}
                onChange={(event) => handleInputChange("age", event.target.value)}
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Gender</span>
              <select
                value={formData.gender}
                onChange={(event) => handleInputChange("gender", event.target.value)}
                disabled={!isEditing}
                className={selectClassName}
              >
                <option value="">N/A</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Activity Level</span>
              <select
                value={formData.activity_level}
                onChange={(event) => handleInputChange("activity_level", event.target.value)}
                disabled={!isEditing}
                className={selectClassName}
              >
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="na">N/A</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Height (cm)</span>
              <input
                type="number"
                value={formData.height_cm}
                onChange={(event) => handleInputChange("height_cm", event.target.value)}
                placeholder="Leave empty for N/A"
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Weight (kg)</span>
              <input
                type="number"
                value={formData.weight_kg}
                onChange={(event) => handleInputChange("weight_kg", event.target.value)}
                placeholder="Leave empty for N/A"
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <ShieldPlus className="h-5 w-5 text-health-cyan" />
              Medical Details
            </h2>
            {isEditing ? (
              <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={() => setShowProfileCamera(true)}>
                <Camera className="h-4 w-4" />
                Scan & Autofill
              </Button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Eye Sight (Left)</span>
              <input
                value={formData.eyesight_left}
                onChange={(event) => handleInputChange("eyesight_left", event.target.value)}
                placeholder="e.g. 6/6, -1.25 or N/A"
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Eye Sight (Right)</span>
              <input
                value={formData.eyesight_right}
                onChange={(event) => handleInputChange("eyesight_right", event.target.value)}
                placeholder="e.g. 6/6, -1.00 or N/A"
                disabled={!isEditing}
                className={inputClassName}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Disability</span>
              <select
                value={formData.disability_status}
                onChange={(event) => handleInputChange("disability_status", event.target.value)}
                disabled={!isEditing}
                className={selectClassName}
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
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Smoking Status</span>
              <select
                value={formData.smoking_status}
                onChange={(event) => handleInputChange("smoking_status", event.target.value)}
                disabled={!isEditing}
                className={selectClassName}
              >
                <option value="na">N/A</option>
                <option value="never">Never</option>
                <option value="occasionally">Occasionally</option>
                <option value="daily">Daily</option>
                <option value="former">Former smoker</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs text-muted-foreground">Alcohol Intake</span>
              <select
                value={formData.alcohol_intake}
                onChange={(event) => handleInputChange("alcohol_intake", event.target.value)}
                disabled={!isEditing}
                className={selectClassName}
              >
                <option value="na">N/A</option>
                <option value="none">None</option>
                <option value="occasional">Occasional</option>
                <option value="weekly">Weekly</option>
                <option value="daily">Daily</option>
              </select>
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Chronic Conditions</span>
              <textarea
                value={formData.chronic_conditions}
                onChange={(event) => handleInputChange("chronic_conditions", event.target.value)}
                placeholder="Diabetes, Asthma, Thyroid, BP etc (or N/A)"
                disabled={!isEditing}
                rows={2}
                className={textareaClassName}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Allergies</span>
              <textarea
                value={formData.allergies}
                onChange={(event) => handleInputChange("allergies", event.target.value)}
                placeholder="Food/medicine allergies (or N/A)"
                disabled={!isEditing}
                rows={2}
                className={textareaClassName}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs text-muted-foreground">Medical Notes</span>
              <textarea
                value={formData.medical_notes}
                onChange={(event) => handleInputChange("medical_notes", event.target.value)}
                placeholder="Any note relevant for app recommendations"
                disabled={!isEditing}
                rows={3}
                className={textareaClassName}
              />
            </label>
          </div>

          <p className="mt-2 text-xs text-muted-foreground">
            {isEditing
              ? "Tip: scan QR/text with fields like `full_name`, `height_cm`, `weight_kg`, `allergies` etc."
              : "Profile is currently read-only. Click Edit Profile to update any detail."}
          </p>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-4 sm:p-5">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-xl font-semibold">Health Summary</h2>
            <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={() => navigate("/analysis")}>
              <TrendingUp className="h-4 w-4" />
              Deep Analysis
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-4">
            {[
              { label: "BMI", value: "24.1", status: "Normal" },
              { label: "Avg Sleep", value: "7.2h", status: "Good" },
              { label: "Activity", value: "High", status: "Excellent" },
            ].map((summary) => (
              <div key={summary.label} className="rounded-2xl border border-border/60 bg-card/55 p-3 text-center">
                <p className="text-xl font-bold sm:text-2xl">{summary.value}</p>
                <p className="text-[11px] text-muted-foreground">{summary.label}</p>
                <p className="mt-1 text-xs font-medium text-primary">{summary.status}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-4 sm:p-5">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Target className="h-5 w-5 text-health-cyan" />
            Goals
          </h2>
          <div className="space-y-4">
            {[
              { label: "Daily Steps", current: 8432, target: 10000 },
              { label: "Active Minutes", current: 42, target: 60 },
              { label: "Weekly Workouts", current: 4, target: 5 },
            ].map((goal) => (
              <div key={goal.label}>
                <div className="mb-1.5 flex items-center justify-between text-sm">
                  <span>{goal.label}</span>
                  <span className="text-muted-foreground">
                    {goal.current} / {goal.target}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min((goal.current / goal.target) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>
      <CameraCaptureModal
        open={showProfileCamera}
        title="Profile Camera Autofill"
        subtitle="Scan profile card/photo to auto-fill fields. QR and plain text (OCR) are both supported."
        captureLabel="Capture & Autofill"
        processing={isCameraProcessing}
        onClose={() => setShowProfileCamera(false)}
        onCapture={handleProfileCameraCapture}
      />
    </AppLayout>
  );
};

export default Profile;
