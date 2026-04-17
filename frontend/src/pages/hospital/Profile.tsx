import { useEffect, useMemo, useState } from "react";
import { Building2, Pencil, Save, ShieldCheck, X } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import { defaultHospitalProfile, type HospitalProfileData } from "@/data/hospitalData";
import { useAuth } from "@/lib/authContext";
import { apiClient } from "@/lib/apiClient";

const STORAGE_KEY_PREFIX = "curasync-hospital-profile";

const createStorageKey = (userId?: number) => `${STORAGE_KEY_PREFIX}:${userId ?? "anonymous"}`;

const loadStoredProfile = (storageKey: string): Partial<HospitalProfileData> | null => {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HospitalProfileData>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const buildProfileState = (storageKey: string, fallbackName?: string, fallbackEmail?: string, fallbackPhone?: string): HospitalProfileData => {
  const stored = loadStoredProfile(storageKey);
  return {
    ...defaultHospitalProfile,
    ...stored,
    adminName: stored?.adminName || fallbackName || defaultHospitalProfile.adminName,
    officialEmail: stored?.officialEmail || fallbackEmail || defaultHospitalProfile.officialEmail,
    supportPhone: stored?.supportPhone || fallbackPhone || defaultHospitalProfile.supportPhone,
  };
};

const Profile = () => {
  const { user, refreshUser } = useAuth();
  const storageKey = useMemo(() => createStorageKey(user?.id), [user?.id]);

  const [formData, setFormData] = useState<HospitalProfileData>(() =>
    buildProfileState(storageKey, user?.full_name, user?.email, user?.phone),
  );
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setFormData(buildProfileState(storageKey, user?.full_name, user?.email, user?.phone));
    setIsEditing(false);
  }, [storageKey, user?.email, user?.full_name, user?.phone]);

  const onChangeField = (key: keyof HospitalProfileData, value: string) => {
    setFormData((previous) => ({ ...previous, [key]: value }));
    setErrorMessage("");
  };

  const onCancel = () => {
    setFormData(buildProfileState(storageKey, user?.full_name, user?.email, user?.phone));
    setIsEditing(false);
    setErrorMessage("");
    setSuccessMessage("");
  };

  const onSave = async () => {
    if (!isEditing || isSaving) return;
    setIsSaving(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const trimmedAdminName = formData.adminName.trim();
      const trimmedSupportPhone = formData.supportPhone.trim();
      const trimmedOfficialEmail = formData.officialEmail.trim();
      if (!trimmedAdminName || !trimmedOfficialEmail || !trimmedSupportPhone) {
        throw new Error("Admin name, official email, and support phone are required.");
      }

      window.localStorage.setItem(storageKey, JSON.stringify(formData));

      if (user) {
        const profileUpdate: { full_name?: string; phone?: string } = {};
        if (trimmedAdminName !== user.full_name) {
          profileUpdate.full_name = trimmedAdminName;
        }
        if (trimmedSupportPhone !== user.phone) {
          profileUpdate.phone = trimmedSupportPhone;
        }

        if (Object.keys(profileUpdate).length > 0) {
          const response = await apiClient.updateProfile(profileUpdate);
          if (response.error) {
            throw new Error(response.error);
          }
          await refreshUser();
        }
      }

      setIsEditing(false);
      setSuccessMessage("Hospital profile updated successfully.");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to update hospital profile.");
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = isEditing
    ? "h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
    : "h-10 w-full cursor-not-allowed rounded-xl border border-border/50 bg-card/45 px-3 text-sm text-muted-foreground";

  const textareaClass = isEditing
    ? "w-full rounded-xl border border-border/60 bg-card px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-primary/25"
    : "w-full cursor-not-allowed rounded-xl border border-border/50 bg-card/45 px-3 py-2 text-sm text-muted-foreground";

  return (
    <AppLayout title="Hospital Profile" subtitle="Manage hospital identity, contact channels, and core operational metadata.">
      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <Building2 className="h-5 w-5 text-primary" />
              Organization Details
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {isEditing ? "Edit mode is active. Save to persist updates." : "Read-only mode. Click Edit Profile to update details."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {isEditing ? (
              <>
                <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={onCancel} disabled={isSaving}>
                  <X className="h-4 w-4" />
                  Cancel
                </Button>
                <Button type="button" className="h-9 rounded-lg bg-primary px-3 text-xs text-primary-foreground" onClick={onSave} disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </>
            ) : (
              <Button type="button" variant="outline" className="h-9 rounded-lg px-3 text-xs" onClick={() => setIsEditing(true)}>
                <Pencil className="h-4 w-4" />
                Edit Profile
              </Button>
            )}
          </div>
        </div>

        {errorMessage ? <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">{errorMessage}</div> : null}
        {successMessage ? (
          <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-500">{successMessage}</div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Hospital Name</span>
            <input value={formData.hospitalName} onChange={(event) => onChangeField("hospitalName", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Hospital Code</span>
            <input value={formData.hospitalCode} onChange={(event) => onChangeField("hospitalCode", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Admin Name</span>
            <input value={formData.adminName} onChange={(event) => onChangeField("adminName", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Official Email</span>
            <input
              type="email"
              value={formData.officialEmail}
              onChange={(event) => onChangeField("officialEmail", event.target.value)}
              disabled={!isEditing}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Support Phone</span>
            <input value={formData.supportPhone} onChange={(event) => onChangeField("supportPhone", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Emergency Hotline</span>
            <input
              value={formData.emergencyHotline}
              onChange={(event) => onChangeField("emergencyHotline", event.target.value)}
              disabled={!isEditing}
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">City</span>
            <input value={formData.city} onChange={(event) => onChangeField("city", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Address</span>
            <input value={formData.address} onChange={(event) => onChangeField("address", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Total Beds</span>
            <input value={formData.totalBeds} onChange={(event) => onChangeField("totalBeds", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">ICU Capacity</span>
            <input value={formData.icuCapacity} onChange={(event) => onChangeField("icuCapacity", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Trauma Level</span>
            <input value={formData.traumaLevel} onChange={(event) => onChangeField("traumaLevel", event.target.value)} disabled={!isEditing} className={inputClass} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">Specialties</span>
            <textarea
              rows={3}
              value={formData.specialties}
              onChange={(event) => onChangeField("specialties", event.target.value)}
              disabled={!isEditing}
              className={textareaClass}
            />
          </label>
        </div>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <ShieldCheck className="h-5 w-5 text-primary" />
          Compliance Snapshot
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
            <p className="text-xs text-muted-foreground">Facility Status</p>
            <p className="mt-1 text-lg font-semibold">Operational</p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
            <p className="text-xs text-muted-foreground">Safety Audit</p>
            <p className="mt-1 text-lg font-semibold">Passed</p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
            <p className="text-xs text-muted-foreground">Response SLA</p>
            <p className="mt-1 text-lg font-semibold">Under 9 min</p>
          </article>
        </div>
      </section>
    </AppLayout>
  );
};

export default Profile;
