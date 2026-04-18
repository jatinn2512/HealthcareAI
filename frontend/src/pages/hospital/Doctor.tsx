import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  Camera,
  Clock3,
  Download,
  FileText,
  HeartPulse,
  Link2,
  Moon,
  QrCode,
  RefreshCw,
  Stethoscope,
  UserRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import { SkeletonCard, SkeletonMetric } from "@/components/SkeletonLoader";
import { doctors } from "@/data/hospitalData";
import { getAccessToken, getApiBaseUrl } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { scanStructuredDataFromImage } from "@/lib/cameraScan";
import {
  CLINICAL_OVERVIEW_FALLBACKS,
  getBpInterpretation,
  getPulseInterpretation,
  getSpo2Interpretation,
} from "@/lib/clinicalOverview";

type DoctorPatientLite = {
  id: number;
  full_name: string;
  age: number;
  gender: string | null;
};

type DoctorConnectResponse = {
  message: string;
  linked_at: string;
  patient: DoctorPatientLite;
};

type DoctorDisconnectResponse = {
  message: string;
  patient: DoctorPatientLite;
};

type DoctorPatientCardResponse = {
  patient: DoctorPatientLite;
  linked_at: string;
  last_accessed_at: string | null;
};

type DoctorPatientReportResponse = {
  patient: DoctorPatientLite;
  overview: {
    sleep?: {
      sleep_date?: string | null;
      duration_minutes?: number | null;
      quality_score?: number | null;
    } | null;
    activity?: {
      steps?: number | null;
      workout_minutes?: number | null;
    } | null;
    vitals?: {
      heart_rate?: number | null;
      systolic_bp?: number | null;
      diastolic_bp?: number | null;
      spo2?: number | null;
      temperature_c?: number | null;
      logged_at?: string | null;
      source_type?: string | null;
    } | null;
    monitoring?: {
      bp?: string | null;
      bp_source?: string | null;
      bp_source_label?: string | null;
      hr?: number | null;
      hr_source?: string | null;
      hr_source_label?: string | null;
      last_updated?: string | null;
    } | null;
    rule_based_risk?: { heart_risk: string; diabetes_risk: string; reason: string } | null;
    data_quality?: { message?: string } | null;
    food?: {
      latest_item?: string | null;
      latest_alert?: string | null;
      latest_calories?: number | null;
      latest_restaurant_name?: string | null;
      latest_choice_at?: string | null;
    } | null;
  };
  recent_risk_assessments: Array<{
    risk_type: string;
    risk_level: string;
    summary: string;
    generated_at: string;
  }>;
  linked_at: string;
  last_accessed_at: string | null;
};

type ExportScope = "complete" | "weekly" | "this_month";

const appointmentMap: Record<
  string,
  Array<{
    id: string;
    time: string;
    patient: string;
    reason: string;
    room: string;
  }>
> = {
  "DOC-101": [
    { id: "AP-1", time: "09:00", patient: "Rohit Malhotra", reason: "Post-op review", room: "Cardio 2" },
    { id: "AP-2", time: "10:30", patient: "Megha Jain", reason: "BP spike check", room: "Cardio 1" },
    { id: "AP-3", time: "12:15", patient: "Raman Bedi", reason: "Chest pain follow-up", room: "Cardio 3" },
  ],
  "DOC-123": [
    { id: "AP-4", time: "08:45", patient: "Anuj Kapoor", reason: "Trauma review", room: "ER 1" },
    { id: "AP-5", time: "11:10", patient: "S. Iqbal", reason: "Acute respiratory distress", room: "ER 4" },
    { id: "AP-6", time: "14:20", patient: "Vani Das", reason: "Procedure briefing", room: "Surgery 2" },
  ],
  "DOC-144": [
    { id: "AP-7", time: "09:20", patient: "Amitava Pal", reason: "COPD evaluation", room: "Pulmo 1" },
    { id: "AP-8", time: "11:45", patient: "Nisha A.", reason: "Ventilator step-down", room: "Pulmo ICU" },
    { id: "AP-9", time: "15:00", patient: "Sagar Verma", reason: "Asthma follow-up", room: "Pulmo 3" },
  ],
  "DOC-209": [
    { id: "AP-10", time: "10:00", patient: "Isha Chawla", reason: "General consultation", room: "General 2" },
    { id: "AP-11", time: "13:30", patient: "D. Yadav", reason: "Medication review", room: "General 4" },
    { id: "AP-12", time: "16:10", patient: "Parth Bhatia", reason: "Discharge fitness", room: "General 1" },
  ],
};

const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return "N/A";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

const parseTokenCandidate = (value: string | null | undefined): string => {
  if (!value) return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (trimmed.includes("::")) {
    const code = trimmed.split("::").pop() ?? "";
    return code.trim().toUpperCase();
  }
  return trimmed.replace(/\s+/g, "").toUpperCase();
};

const extractTokenFromScan = (parsed: Record<string, unknown> | null, rawValue: string): string => {
  const tokenFields = ["token_code", "connect_code", "qr_payload", "code", "patient_id", "id"];
  if (parsed) {
    for (const field of tokenFields) {
      const value = parsed[field];
      if (typeof value !== "string") continue;
      const candidate = parseTokenCandidate(value);
      if (candidate) return candidate;
    }
  }
  return parseTokenCandidate(rawValue);
};

const Doctor = () => {
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [connectCode, setConnectCode] = useState("");
  const [patientIdInput, setPatientIdInput] = useState("");
  const [connectError, setConnectError] = useState("");
  const [connectSuccess, setConnectSuccess] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectedPatients, setConnectedPatients] = useState<DoctorPatientCardResponse[]>([]);
  const [isLoadingPatients, setIsLoadingPatients] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  const [patientReport, setPatientReport] = useState<DoctorPatientReportResponse | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [showScanModal, setShowScanModal] = useState(false);
  const [isScanProcessing, setIsScanProcessing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportScope, setExportScope] = useState<ExportScope>("weekly");
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [isDisconnectingPatientId, setIsDisconnectingPatientId] = useState<number | null>(null);

  const activeDoctor = useMemo(() => doctors.find((item) => item.id === doctorId) ?? doctors[0], [doctorId]);
  const todayAppointments = useMemo(() => appointmentMap[doctorId] ?? [], [doctorId]);
  const selectedPatientCard = useMemo(
    () => connectedPatients.find((item) => item.patient.id === selectedPatientId) ?? null,
    [connectedPatients, selectedPatientId],
  );

  const loadConnectedPatients = async () => {
    setIsLoadingPatients(true);
    try {
      const response = await apiClient.get<DoctorPatientCardResponse[]>("/doctor/patients");
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to load connected patients.");
      }
      setConnectedPatients(response.data);
      setLastSyncedAt(new Date());
      if (response.data.length === 0) {
        setSelectedPatientId(null);
        setPatientReport(null);
      } else if (!selectedPatientId || !response.data.some((item) => item.patient.id === selectedPatientId)) {
        setSelectedPatientId(response.data[0]?.patient.id ?? null);
      }
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Unable to load connected patients.");
    } finally {
      setIsLoadingPatients(false);
    }
  };

  useEffect(() => {
    void loadConnectedPatients();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedPatientId) {
      setPatientReport(null);
      return;
    }

    void loadSelectedReport(selectedPatientId);
  }, [selectedPatientId]);

  const loadSelectedReport = async (patientId: number) => {
    setIsLoadingReport(true);
    setReportError("");
    try {
      const response = await apiClient.get<DoctorPatientReportResponse>(`/doctor/patients/${patientId}/report`);
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to load patient report.");
      }
      setPatientReport(response.data);
      setLastSyncedAt(new Date());
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Unable to load patient report.");
    } finally {
      setIsLoadingReport(false);
    }
  };

  useEffect(() => {
    const syncTimer = window.setInterval(() => {
      void loadConnectedPatients();
      if (selectedPatientId) {
        void loadSelectedReport(selectedPatientId);
      }
    }, 30_000);
    return () => window.clearInterval(syncTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPatientId]);

  const handleConnectWithCode = async (overrideCode?: string) => {
    if (isConnecting) return;
    const resolvedCode = parseTokenCandidate(overrideCode ?? connectCode);
    if (!resolvedCode) {
      setConnectError("Connect code is required.");
      return;
    }
    if (/^\d+$/.test(resolvedCode)) {
      setPatientIdInput(resolvedCode);
      await handleConnectWithPatientId(resolvedCode);
      return;
    }

    setIsConnecting(true);
    setConnectError("");
    setConnectSuccess("");
    try {
      const response = await apiClient.post<DoctorConnectResponse>("/doctor/connect", { token_code: resolvedCode });
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to connect patient.");
      }
      setConnectSuccess(`Connected: ${response.data.patient.full_name}`);
      setConnectCode("");
      await loadConnectedPatients();
      setSelectedPatientId(response.data.patient.id);
      await loadSelectedReport(response.data.patient.id);
      setShowConnectModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect patient.";
      setConnectError(message.includes("Failed to fetch") ? "Failed to fetch: backend/API not reachable. Check backend server and API URL." : message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectWithPatientId = async (overrideId?: string) => {
    if (isConnecting) return;
    const parsedId = Number((overrideId ?? patientIdInput).trim());
    if (!parsedId || Number.isNaN(parsedId) || parsedId <= 0) {
      setConnectError("Valid patient ID is required.");
      return;
    }

    setIsConnecting(true);
    setConnectError("");
    setConnectSuccess("");
    try {
      const response = await apiClient.post<DoctorConnectResponse>("/doctor/connect-by-id", { patient_id: parsedId });
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to connect patient by ID.");
      }
      setConnectSuccess(`Connected: ${response.data.patient.full_name}`);
      setPatientIdInput("");
      await loadConnectedPatients();
      setSelectedPatientId(response.data.patient.id);
      await loadSelectedReport(response.data.patient.id);
      setShowConnectModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to connect patient by ID.";
      setConnectError(message.includes("Failed to fetch") ? "Failed to fetch: backend/API not reachable. Check backend server and API URL." : message);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleScanCapture = async (imageDataUrl: string) => {
    setIsScanProcessing(true);
    setConnectError("");
    try {
      const scanResult = await scanStructuredDataFromImage(imageDataUrl);
      if (!scanResult) {
        throw new Error("No readable QR/text found. Please rescan.");
      }
      const detectedToken = extractTokenFromScan(scanResult.parsed, scanResult.rawValue);
      if (!detectedToken) {
        throw new Error("Token code not detected in scan.");
      }
      setConnectCode(detectedToken);
      await handleConnectWithCode(detectedToken);
      setShowScanModal(false);
      setShowConnectModal(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to scan token.";
      setConnectError(message.includes("Failed to fetch") ? "Failed to fetch: backend/API not reachable. Check backend server and API URL." : message);
    } finally {
      setIsScanProcessing(false);
    }
  };

  const handleDisconnectPatient = async (patientId: number) => {
    if (isDisconnectingPatientId) return;

    setIsDisconnectingPatientId(patientId);
    setConnectError("");
    setConnectSuccess("");
    try {
      const response = await apiClient.post<DoctorDisconnectResponse>("/doctor/disconnect", { patient_id: patientId });
      if (response.error || !response.data) {
        throw new Error(response.error || "Unable to disconnect patient.");
      }
      setConnectSuccess(`Disconnected: ${response.data.patient.full_name}`);
      if (selectedPatientId === patientId) {
        setSelectedPatientId(null);
        setPatientReport(null);
      }
      await loadConnectedPatients();
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Unable to disconnect patient.");
    } finally {
      setIsDisconnectingPatientId(null);
    }
  };

  const handleExportPatientReport = async () => {
    if (!selectedPatientId || isExporting) return;
    const token = getAccessToken();
    if (!token) {
      setReportError("Session expired. Please login again.");
      return;
    }

    setIsExporting(true);
    setReportError("");
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/doctor/patients/${selectedPatientId}/export/pdf?scope=${encodeURIComponent(exportScope)}`,
        {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) {
        let detail = "Unable to export patient report.";
        try {
          const parsed = (await response.json()) as { detail?: string };
          if (parsed?.detail) detail = parsed.detail;
        } catch {
          // Ignore JSON parse failures.
        }
        throw new Error(detail);
      }

      const pdfBlob = await response.blob();
      const objectUrl = URL.createObjectURL(pdfBlob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `connected-patient-${selectedPatientId}-${exportScope}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setReportError(error instanceof Error ? error.message : "Unable to export patient report.");
    } finally {
      setIsExporting(false);
    }
  };

  if (!activeDoctor) {
    return <AppLayout title="Doctor Desk" subtitle="No doctor profile available for this account.">{null}</AppLayout>;
  }

  const sleepOverview = patientReport?.overview.sleep ?? null;
  const activityOverview = patientReport?.overview.activity ?? null;
  const vitalsOverview = patientReport?.overview.vitals ?? null;
  const foodOverview = patientReport?.overview.food ?? null;
  const monitoring = patientReport?.overview.monitoring;
  const parseMonitoringBp = (): [number | undefined, number | undefined] => {
    const raw = monitoring?.bp;
    if (!raw || !raw.includes("/")) {
      return [undefined, undefined];
    }
    const parts = raw.split("/");
    const s = Number(parts[0]?.trim());
    const d = Number(parts[1]?.trim());
    if (Number.isNaN(s) || Number.isNaN(d)) {
      return [undefined, undefined];
    }
    return [s, d];
  };
  const [monSys, monDia] = parseMonitoringBp();
  const resolvedSleepDuration = sleepOverview?.duration_minutes ?? CLINICAL_OVERVIEW_FALLBACKS.sleepDurationMinutes;
  const resolvedSleepQuality = sleepOverview?.quality_score ?? CLINICAL_OVERVIEW_FALLBACKS.sleepQualityScore;
  const resolvedActivitySteps = activityOverview?.steps ?? CLINICAL_OVERVIEW_FALLBACKS.activitySteps;
  const resolvedWorkoutMinutes = activityOverview?.workout_minutes ?? CLINICAL_OVERVIEW_FALLBACKS.activityWorkoutMinutes;
  const resolvedHeartRate =
    monitoring?.hr ?? vitalsOverview?.heart_rate ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsHeartRate;
  const resolvedSystolicBp =
    monSys ?? vitalsOverview?.systolic_bp ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsSystolicBp;
  const resolvedDiastolicBp =
    monDia ?? vitalsOverview?.diastolic_bp ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsDiastolicBp;
  const resolvedSpo2 = vitalsOverview?.spo2 ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsSpo2;
  const resolvedTemperature = vitalsOverview?.temperature_c ?? CLINICAL_OVERVIEW_FALLBACKS.vitalsTemperatureC;
  const resolvedVitalsLoggedAt =
    monitoring?.last_updated ?? vitalsOverview?.logged_at ?? patientReport?.linked_at ?? null;

  return (
    <AppLayout title="Doctor Dashboard" subtitle="Appointments, patient connection via QR, and connected user reports.">
      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <div className="grid gap-3 sm:grid-cols-[1fr,2fr]">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">Active Doctor</span>
            <select
              value={doctorId}
              onChange={(event) => setDoctorId(event.target.value)}
              className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
            >
              {doctors.map((doctor) => (
                <option key={doctor.id} value={doctor.id}>
                  {doctor.name}
                </option>
              ))}
            </select>
          </label>
          <article className="rounded-2xl border border-border/60 bg-card/55 p-3.5">
            <p className="text-base font-semibold">{activeDoctor.name}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {activeDoctor.specialization} | Status: {activeDoctor.status}
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <CalendarClock className="h-3.5 w-3.5" />
            Appointments Today
          </p>
          <p className="mt-1 text-3xl font-bold">{activeDoctor.todayAppointments}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <UserRound className="h-3.5 w-3.5" />
            Assigned Patients
          </p>
          <p className="mt-1 text-3xl font-bold">{activeDoctor.patientsAssigned}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Next Round
          </p>
          <p className="mt-1 text-2xl font-semibold">{activeDoctor.nextRound}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr,1fr]">
        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-3 flex items-center gap-2 text-xl font-semibold">
            <QrCode className="h-5 w-5 text-primary" />
            Connect Patient
          </h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Open popup to scan QR/code or enter patient ID. Connected patient data syncs automatically.
          </p>
          {connectSuccess ? <div className="state-card-success mb-3">{connectSuccess}</div> : null}
          <Button type="button" className="h-10 rounded-xl px-4 text-xs" onClick={() => setShowConnectModal(true)}>
            <Link2 className="h-4 w-4" />
            Connect Patient
          </Button>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-3 text-xl font-semibold">Connected Patients</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {isLoadingPatients ? "Refreshing patient list..." : `Total connected: ${connectedPatients.length}`}
          </p>
          <div className="space-y-3">
            {connectedPatients.length ? (
              connectedPatients.map((row) => (
                <article
                  key={row.patient.id}
                  className={`group relative flex w-full flex-col gap-3 rounded-2xl border px-4 py-3.5 transition-all duration-300 ${
                    selectedPatientId === row.patient.id
                      ? "border-primary/40 bg-primary/5 shadow-[0_0_15px_-3px_rgba(20,184,166,0.15)]"
                      : "border-border/60 bg-card/55 hover:border-border hover:bg-card/80 shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-sm font-bold text-primary ring-1 ring-primary/30">
                      {row.patient.full_name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex items-center justify-between">
                        <p className="truncate text-sm font-semibold">{row.patient.full_name}</p>
                        <span className="shrink-0 text-[10px] uppercase text-muted-foreground ml-2">ID: {row.patient.id}</span>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        Age: <span className="font-medium text-foreground">{row.patient.age}</span> • {row.patient.gender || "Undisclosed"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between border-t border-border/40 pt-3">
                     <p className="text-[10px] text-muted-foreground">Last Access: {formatDateTime(row.last_accessed_at || row.linked_at)}</p>
                     <div className="flex items-center gap-2">
                       <button
                         type="button"
                         onClick={() => setSelectedPatientId(row.patient.id)}
                         className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${selectedPatientId === row.patient.id ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}
                       >
                         {selectedPatientId === row.patient.id ? "Viewing" : "View Report"}
                       </button>
                       <button
                         type="button"
                         onClick={() => void handleDisconnectPatient(row.patient.id)}
                         className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition"
                         disabled={isDisconnectingPatientId === row.patient.id}
                         title="Disconnect"
                       >
                         <X className="h-4 w-4" />
                       </button>
                     </div>
                  </div>
                </article>
              ))
            ) : (
              <div className="state-card-empty">
                No connected patients. <br /><span className="text-xs">Ask patient to generate QR/code.</span>
              </div>
            )}
          </div>
        </article>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-xl font-semibold">Connected Patient Report</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {selectedPatientCard ? `Viewing: ${selectedPatientCard.patient.full_name}` : "Select a connected patient to view reports."}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Report refreshed: {lastSyncedAt ? lastSyncedAt.toLocaleString() : "Not yet"}
              {patientReport?.overview.monitoring?.bp
                ? ` · BP ${patientReport.overview.monitoring.bp} (source: ${patientReport.overview.monitoring.bp_source_label || patientReport.overview.monitoring.bp_source || "—"})`
                : null}
              {patientReport?.overview.monitoring?.hr != null
                ? ` · HR ${patientReport.overview.monitoring.hr} (source: ${patientReport.overview.monitoring.hr_source_label || "—"})`
                : null}
            </p>
          </div>
          {selectedPatientId ? (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl border border-border/60 bg-card/60 p-1">
                {[
                  { key: "complete", label: "Complete" },
                  { key: "weekly", label: "Weekly" },
                  { key: "this_month", label: "This Month" },
                ].map((item) => (
                  <Button
                    key={item.key}
                    type="button"
                    variant={exportScope === item.key ? "default" : "ghost"}
                    className="h-8 rounded-lg px-3 text-xs"
                    onClick={() => setExportScope(item.key as ExportScope)}
                    disabled={isExporting}
                  >
                    {item.label}
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-3 text-xs"
                onClick={() => {
                  void loadConnectedPatients();
                  if (selectedPatientId) void loadSelectedReport(selectedPatientId);
                }}
                disabled={isLoadingReport}
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-3 text-xs"
                onClick={() => void handleExportPatientReport()}
                disabled={isExporting || isLoadingReport}
              >
                <Download className="h-4 w-4" />
                {isExporting ? "Exporting..." : "Export PDF"}
              </Button>
            </div>
          ) : null}
        </div>

        {reportError ? <div className="state-card-error mb-3">{reportError}</div> : null}

        {isLoadingReport ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
             <SkeletonMetric />
             <SkeletonMetric />
             <SkeletonCard />
             <SkeletonCard />
          </div>
        ) : patientReport ? (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold mt-4">Latest Vitals</h3>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-health-cyan/30 bg-health-cyan/10 p-4 relative overflow-hidden group">
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent to-health-cyan/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="mb-2 text-xs font-semibold text-health-cyan flex items-center gap-1.5"><HeartPulse className="h-3.5 w-3.5" /> Blood Pressure</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-2xl font-bold text-foreground">{resolvedSystolicBp}/{resolvedDiastolicBp}</p>
                   <span className="text-xs text-muted-foreground">mmHg</span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 mt-1">{getBpInterpretation(resolvedSystolicBp, resolvedDiastolicBp)}</p>
              </article>
              <article className="rounded-2xl border border-health-rose/30 bg-health-rose/10 p-4 relative overflow-hidden group">
                <div className="absolute right-0 top-0 h-full w-1/2 bg-gradient-to-r from-transparent to-health-rose/10 opacity-0 transition-opacity group-hover:opacity-100" />
                <p className="mb-2 text-xs font-semibold text-health-rose flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Heart Rate</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-2xl font-bold text-foreground">{resolvedHeartRate}</p>
                   <span className="text-xs text-muted-foreground">bpm</span>
                </div>
                <p className="text-[11px] text-muted-foreground/80 mt-1">{getPulseInterpretation(resolvedHeartRate)}</p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">SpO2</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-xl font-bold text-foreground">{resolvedSpo2}</p>
                   <span className="text-xs text-muted-foreground">%</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">{getSpo2Interpretation(resolvedSpo2)}</p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground">Temperature</p>
                <div className="flex items-baseline gap-1">
                   <p className="text-xl font-bold text-foreground">{resolvedTemperature}</p>
                   <span className="text-xs text-muted-foreground">°C</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">Core body reading</p>
              </article>
            </div>

            <h3 className="text-lg font-semibold mt-6">Lifestyle Profile</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <article className="rounded-2xl border border-health-indigo/30 bg-health-indigo/10 p-4">
                <p className="mb-1 text-xs font-semibold text-health-indigo flex items-center gap-1.5"><Moon className="h-3.5 w-3.5" /> Sleep Quality</p>
                <p className="mt-2 text-xl font-bold text-foreground">{(resolvedSleepDuration/60).toFixed(1)} <span className="text-xs text-muted-foreground font-normal">hrs</span></p>
                <p className="text-[11px] text-health-indigo/80 mt-1">Score: {resolvedSleepQuality}/100</p>
              </article>
              <article className="rounded-2xl border border-health-teal/30 bg-health-teal/10 p-4">
                <p className="mb-1 text-xs font-semibold text-health-teal flex items-center gap-1.5"><Activity className="h-3.5 w-3.5" /> Recent Activity</p>
                <p className="mt-2 text-xl font-bold text-foreground">{resolvedActivitySteps} <span className="text-xs text-muted-foreground font-normal">steps</span></p>
                <p className="text-[11px] text-health-teal/80 mt-1">{resolvedWorkoutMinutes} min active workout</p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-background/60 p-4">
                <p className="mb-1 text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><UtensilsCrossed className="h-3.5 w-3.5" /> Food Alerts</p>
                <p className="mt-2 text-sm font-semibold text-foreground overflow-hidden text-ellipsis whitespace-nowrap" title={foodOverview?.latest_item || "No latest meal"}>{foodOverview?.latest_item || "No logged meals"}</p>
                <p className={`text-[11px] mt-1 font-semibold ${(foodOverview?.latest_alert?.toLowerCase() === 'high') ? 'text-health-rose' : 'text-muted-foreground'}`}>Alert Level: {foodOverview?.latest_alert?.toUpperCase() || "N/A"}</p>
              </article>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/60 p-5 glass-card mt-6">
              <p className="text-sm font-semibold mb-4">Risk Assessment History</p>
              <div className="space-y-3">
                {patientReport.recent_risk_assessments.length ? (
                  patientReport.recent_risk_assessments.map((risk) => (
                    <article key={`${risk.risk_type}-${risk.generated_at}`} className="rounded-xl border border-border/60 bg-background/50 px-4 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold">{risk.risk_type}</p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-wider font-semibold ${risk.risk_level.toLowerCase() === 'high' ? 'border-health-rose/40 bg-health-rose/10 text-health-rose' : risk.risk_level.toLowerCase() === 'moderate' || risk.risk_level.toLowerCase() === 'medium' ? 'border-amber-500/40 bg-amber-500/10 text-amber-600' : 'border-health-teal/40 bg-health-teal/10 text-health-teal'}`}>
                             {risk.risk_level}
                          </span>
                        </div>
                        <span className="text-[10px] text-muted-foreground uppercase">{formatDateTime(risk.generated_at)}</span>
                      </div>
                      <p className="mt-2 text-sm text-foreground/80 leading-relaxed border-t border-border/40 pt-2">{risk.summary}</p>
                    </article>
                  ))
                ) : (
                  <div className="state-card-empty">
                    No risk history available. Wait for automatic AI generation or user trigger.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="state-card-empty flex flex-col items-center justify-center px-6 py-10">
            <FileText className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-foreground">No Patient Selected</p>
            <p className="mt-1 text-sm text-muted-foreground max-w-sm">Connect a new patient or select an existing one from the list to view their comprehensive clinical report.</p>
          </div>
        )}
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <Stethoscope className="h-5 w-5 text-primary" />
          Appointment Queue
        </h2>
        <div className="space-y-3">
          {todayAppointments.map((appointment) => (
            <article key={appointment.id} className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{appointment.patient}</p>
                <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {appointment.time}
                </span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{appointment.reason}</p>
              <p className="mt-1 text-xs text-muted-foreground">Room: {appointment.room}</p>
            </article>
          ))}
        </div>
      </section>

      {showConnectModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div className="w-full max-w-xl rounded-3xl border border-border/60 bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Connect Patient</h3>
              <button
                type="button"
                className="rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConnectModal(false)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {connectError ? <div className="state-card-error mb-3">{connectError}</div> : null}
            {connectSuccess ? (
              <div className="state-card-success mb-3">{connectSuccess}</div>
            ) : null}

            <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
              <input
                value={connectCode}
                onChange={(event) => setConnectCode(event.target.value)}
                placeholder="Enter connect code (example: CSXXXXXXXXXX)"
                className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              <Button type="button" className="h-10 rounded-xl px-4 text-xs" onClick={() => void handleConnectWithCode()} disabled={isConnecting}>
                <Link2 className="h-4 w-4" />
                {isConnecting ? "Connecting..." : "Connect"}
              </Button>
            </div>

            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr,auto]">
              <input
                value={patientIdInput}
                onChange={(event) => setPatientIdInput(event.target.value)}
                placeholder="Or enter patient ID (example: 12)"
                className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none transition focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
              />
              <Button type="button" variant="outline" className="h-10 rounded-xl px-4 text-xs" onClick={() => void handleConnectWithPatientId()} disabled={isConnecting}>
                <UserRound className="h-4 w-4" />
                Connect by ID
              </Button>
            </div>

            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                className="h-9 rounded-xl px-3 text-xs"
                onClick={() => setShowScanModal(true)}
                disabled={isConnecting}
              >
                <Camera className="h-4 w-4" />
                Scan QR / Photo
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <CameraCaptureModal
        open={showScanModal}
        title="Scan Patient Connect QR"
        subtitle="Capture patient QR or code image to auto-connect."
        captureLabel="Scan & Connect"
        processing={isScanProcessing}
        onClose={() => setShowScanModal(false)}
        onCapture={handleScanCapture}
      />
    </AppLayout>
  );
};

export default Doctor;
