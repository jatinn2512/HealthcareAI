import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Camera,
  Clock3,
  Download,
  Link2,
  QrCode,
  RefreshCw,
  Stethoscope,
  UserRound,
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import CameraCaptureModal from "@/components/CameraCaptureModal";
import { doctors } from "@/data/hospitalData";
import { getAccessToken, getApiBaseUrl } from "@/lib/auth";
import { apiClient } from "@/lib/apiClient";
import { scanStructuredDataFromImage } from "@/lib/cameraScan";

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
    } | null;
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
  const tokenFields = ["token_code", "connect_code", "qr_payload", "code"];
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
    const resolvedCode = (overrideCode ?? connectCode).trim();
    if (!resolvedCode) {
      setConnectError("Connect code is required.");
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
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Unable to connect patient.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnectWithPatientId = async () => {
    if (isConnecting) return;
    const parsedId = Number(patientIdInput.trim());
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
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Unable to connect patient by ID.");
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
    } catch (error) {
      setConnectError(error instanceof Error ? error.message : "Unable to scan token.");
    } finally {
      setIsScanProcessing(false);
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
            Scan patient's QR/code, enter connect code, or connect directly using patient ID.
          </p>

          {connectError ? <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{connectError}</div> : null}
          {connectSuccess ? (
            <div className="mb-3 rounded-lg border border-green-500/30 bg-green-500/10 px-3 py-2 text-sm text-green-500">{connectSuccess}</div>
          ) : null}

          <div className="grid gap-2 sm:grid-cols-[1fr,auto]">
            <input
              value={connectCode}
              onChange={(event) => setConnectCode(event.target.value)}
              placeholder="Enter connect code (example: CSXXXXXXXXXX)"
              className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
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
              className="h-10 rounded-xl border border-border/60 bg-card px-3 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/25"
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
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-3 text-xl font-semibold">Connected Patients</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {isLoadingPatients ? "Refreshing patient list..." : `Total connected: ${connectedPatients.length}`}
          </p>
          <div className="space-y-2.5">
            {connectedPatients.length ? (
              connectedPatients.map((row) => (
                <button
                  key={row.patient.id}
                  type="button"
                  onClick={() => setSelectedPatientId(row.patient.id)}
                  className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
                    selectedPatientId === row.patient.id
                      ? "border-primary/45 bg-primary/10"
                      : "border-border/60 bg-card/55 hover:border-primary/30"
                  }`}
                >
                  <p className="text-sm font-semibold">{row.patient.full_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Age {row.patient.age} | {row.patient.gender || "N/A"}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">Linked: {formatDateTime(row.linked_at)}</p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/70 bg-card/45 px-3.5 py-4 text-sm text-muted-foreground">
                No connected patient yet. Ask patient to generate QR/code from profile.
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
              Last synced: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "Not synced yet"}
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

        {reportError ? <div className="mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">{reportError}</div> : null}

        {isLoadingReport ? (
          <div className="rounded-xl border border-border/60 bg-card/45 px-3 py-4 text-sm text-muted-foreground">Loading report...</div>
        ) : patientReport ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="text-xs text-muted-foreground">Sleep</p>
                <p className="mt-1 text-sm font-semibold">{sleepOverview?.duration_minutes ?? "N/A"} mins</p>
                <p className="text-[11px] text-muted-foreground">Quality: {sleepOverview?.quality_score ?? "N/A"}</p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="text-xs text-muted-foreground">Activity</p>
                <p className="mt-1 text-sm font-semibold">{activityOverview?.steps ?? "N/A"} steps</p>
                <p className="text-[11px] text-muted-foreground">Workout: {activityOverview?.workout_minutes ?? "N/A"} mins</p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="text-xs text-muted-foreground">Vitals</p>
                <p className="mt-1 text-sm font-semibold">HR {vitalsOverview?.heart_rate ?? "N/A"}</p>
                <p className="text-[11px] text-muted-foreground">SBP {vitalsOverview?.systolic_bp ?? "N/A"}</p>
              </article>
              <article className="rounded-2xl border border-border/60 bg-card/55 p-3">
                <p className="text-xs text-muted-foreground">Food Alert</p>
                <p className="mt-1 text-sm font-semibold">{foodOverview?.latest_alert?.toUpperCase() || "N/A"}</p>
                <p className="text-[11px] text-muted-foreground">{foodOverview?.latest_item || "No latest meal"}</p>
              </article>
            </div>

            <div className="rounded-2xl border border-border/60 bg-card/55 p-3.5">
              <p className="text-sm font-semibold">Risk Assessment History</p>
              <div className="mt-2 space-y-2">
                {patientReport.recent_risk_assessments.length ? (
                  patientReport.recent_risk_assessments.map((risk) => (
                    <article key={`${risk.risk_type}-${risk.generated_at}`} className="rounded-xl border border-border/60 bg-card px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {risk.risk_type} ({risk.risk_level})
                        </p>
                        <span className="text-[11px] text-muted-foreground">{formatDateTime(risk.generated_at)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{risk.summary}</p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 bg-card px-3 py-3 text-xs text-muted-foreground">
                    No risk history available for this patient yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border/70 bg-card/45 px-3 py-4 text-sm text-muted-foreground">
            Connect and select a patient to open their report.
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
