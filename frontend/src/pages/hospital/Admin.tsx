import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BedDouble, ClipboardList, Gauge, Stethoscope } from "lucide-react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";
import { doctors, resources, staffTasks } from "@/data/hospitalData";

type DoctorAssignment = {
  id: string;
  patientName: string;
  doctorName: string;
  assignedAt: string;
};

type NurseAssignment = {
  id: string;
  nurseName: string;
  task: string;
  ward: string;
  assignedAt: string;
};

const nurseTeam = ["Nurse Priya", "Nurse Kavya", "Compounder Ramesh", "Nurse Alina"];

const Admin = () => {
  const navigate = useNavigate();
  const [patientName, setPatientName] = useState("");
  const [doctorId, setDoctorId] = useState(doctors[0]?.id ?? "");
  const [doctorAssignments, setDoctorAssignments] = useState<DoctorAssignment[]>([
    {
      id: "AD-1001",
      patientName: "Rahul Jain",
      doctorName: doctors[0]?.name ?? "Dr. Meera Khanna",
      assignedAt: "10:20",
    },
  ]);

  const [nurseName, setNurseName] = useState(nurseTeam[0]);
  const [nurseTask, setNurseTask] = useState("");
  const [nurseWard, setNurseWard] = useState("ICU");
  const [nurseAssignments, setNurseAssignments] = useState<NurseAssignment[]>([
    {
      id: "NU-210",
      nurseName: "Nurse Priya",
      task: "Check post-op vitals for beds 8-10",
      ward: "ICU",
      assignedAt: "09:40",
    },
  ]);

  const openStaffTasks = useMemo(() => staffTasks.filter((item) => item.state !== "Done").length, []);
  const onDutyDoctors = useMemo(() => doctors.filter((item) => item.status === "On Duty").length, []);
  const criticalResources = useMemo(() => resources.filter((item) => item.status !== "Healthy"), []);

  const handleAssignDoctor = () => {
    const trimmedPatient = patientName.trim();
    if (!trimmedPatient) return;
    const selectedDoctor = doctors.find((item) => item.id === doctorId);
    if (!selectedDoctor) return;

    const now = new Date();
    setDoctorAssignments((previous) => [
      {
        id: `AD-${now.getTime()}`,
        patientName: trimmedPatient,
        doctorName: selectedDoctor.name,
        assignedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...previous,
    ]);
    setPatientName("");
  };

  const handleAssignNurseTask = () => {
    const trimmedTask = nurseTask.trim();
    if (!trimmedTask) return;
    const now = new Date();
    setNurseAssignments((previous) => [
      {
        id: `NU-${now.getTime()}`,
        nurseName,
        task: trimmedTask,
        ward: nurseWard,
        assignedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      ...previous,
    ]);
    setNurseTask("");
  };

  return (
    <AppLayout title="Admin Control Desk" subtitle="Assign doctors, dispatch nurse tasks, and monitor critical hospital resources.">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Doctors On Duty</p>
          <p className="mt-1 text-3xl font-bold">{onDutyDoctors}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Open Nurse / Staff Tasks</p>
          <p className="mt-1 text-3xl font-bold">{openStaffTasks}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Critical Resource Alerts</p>
          <p className="mt-1 text-3xl font-bold">{criticalResources.length}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Quick Navigation</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button type="button" variant="outline" className="h-8 rounded-lg px-2 text-[11px]" onClick={() => navigate("/hospital/doctors")}>
              Doctors
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-lg px-2 text-[11px]" onClick={() => navigate("/hospital/staff")}>
              Tasks
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-lg px-2 text-[11px]" onClick={() => navigate("/hospital/resources")}>
              Resources
            </Button>
            <Button type="button" variant="outline" className="h-8 rounded-lg px-2 text-[11px]" onClick={() => navigate("/hospital/emergency")}>
              Emergency
            </Button>
          </div>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Stethoscope className="h-5 w-5 text-primary" />
            Assign Doctor
          </h2>
          <div className="grid gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Patient Name</span>
              <input
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                placeholder="Enter patient name"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Doctor</span>
              <select
                value={doctorId}
                onChange={(event) => setDoctorId(event.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              >
                {doctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} ({doctor.specialization})
                  </option>
                ))}
              </select>
            </label>
            <Button type="button" className="h-10 rounded-xl" onClick={handleAssignDoctor}>
              Confirm Doctor Assignment
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {doctorAssignments.slice(0, 4).map((assignment) => (
              <div key={assignment.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-card/55 px-3 py-2 text-sm">
                <span>
                  {assignment.patientName}
                  <ArrowRight className="mx-1 inline h-3.5 w-3.5 text-muted-foreground" />
                  {assignment.doctorName}
                </span>
                <span className="text-xs text-muted-foreground">{assignment.assignedAt}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <ClipboardList className="h-5 w-5 text-primary" />
            Assign Nurse / Compounder Task
          </h2>
          <div className="grid gap-3">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Nurse / Compounder</span>
              <select
                value={nurseName}
                onChange={(event) => setNurseName(event.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              >
                {nurseTeam.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Ward</span>
              <select
                value={nurseWard}
                onChange={(event) => setNurseWard(event.target.value)}
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              >
                <option value="ICU">ICU</option>
                <option value="Emergency">Emergency</option>
                <option value="General Ward">General Ward</option>
                <option value="Recovery">Recovery</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">Task</span>
              <input
                value={nurseTask}
                onChange={(event) => setNurseTask(event.target.value)}
                placeholder="e.g. Oxygen saturation checks every 30 mins"
                className="h-10 w-full rounded-xl border border-border/60 bg-card px-3 text-sm outline-none focus:ring-2 focus:ring-primary/25"
              />
            </label>
            <Button type="button" className="h-10 rounded-xl" onClick={handleAssignNurseTask}>
              Dispatch Task
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {nurseAssignments.slice(0, 4).map((assignment) => (
              <div key={assignment.id} className="rounded-xl border border-border/60 bg-card/55 px-3 py-2 text-sm">
                <p className="font-medium">{assignment.task}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {assignment.nurseName} | {assignment.ward} | {assignment.assignedAt}
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 text-xl font-semibold">Resource Watch (ICU Beds, Oxygen, Critical Assets)</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {resources.map((resource, index) => {
            const availabilityPercent = Math.round((resource.available / Math.max(resource.total, 1)) * 100);
            const isCritical = resource.status !== "Healthy";
            return (
              <motion.article
                key={resource.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className="rounded-2xl border border-border/60 bg-card/55 p-3.5"
              >
                <p className="text-sm font-semibold">{resource.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {resource.available} available of {resource.total}
                </p>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${isCritical ? "bg-health-rose" : "bg-primary"}`} style={{ width: `${availabilityPercent}%` }} />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{availabilityPercent}% available</span>
                  <span>{resource.updatedAt}</span>
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-xs">
                  {resource.name.toLowerCase().includes("bed") ? <BedDouble className="h-3.5 w-3.5 text-primary" /> : <Gauge className="h-3.5 w-3.5 text-primary" />}
                  <span className={isCritical ? "text-health-rose" : "text-muted-foreground"}>{resource.status}</span>
                </div>
              </motion.article>
            );
          })}
        </div>
      </section>
    </AppLayout>
  );
};

export default Admin;
