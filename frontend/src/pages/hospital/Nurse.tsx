import { useMemo, useState } from "react";
import { BedDouble, CheckCircle2, Clock3, Pill, Syringe } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/Button";

type NurseTask = {
  id: string;
  title: string;
  ward: string;
  due: string;
  status: "Pending" | "In Progress" | "Done";
};

const initialTasks: NurseTask[] = [
  { id: "NU-101", title: "Administer antibiotics to Bed 12", ward: "ICU", due: "09:30", status: "Pending" },
  { id: "NU-102", title: "Update intake-output chart", ward: "ICU", due: "10:15", status: "In Progress" },
  { id: "NU-103", title: "Nebulization round", ward: "Pulmonology", due: "11:00", status: "Pending" },
  { id: "NU-104", title: "Post-op dressing support", ward: "Recovery", due: "12:20", status: "Done" },
];

const medicationRounds = [
  { time: "08:00", ward: "ICU", item: "Insulin & vitals check" },
  { time: "10:30", ward: "General Ward", item: "Antibiotic schedule" },
  { time: "13:00", ward: "Pulmonology", item: "Nebulizer + SpO2 review" },
];

const Nurse = () => {
  const [tasks, setTasks] = useState<NurseTask[]>(initialTasks);

  const counts = useMemo(
    () => ({
      pending: tasks.filter((task) => task.status === "Pending").length,
      inProgress: tasks.filter((task) => task.status === "In Progress").length,
      done: tasks.filter((task) => task.status === "Done").length,
    }),
    [tasks],
  );

  const updateTaskStatus = (id: string, status: NurseTask["status"]) => {
    setTasks((previous) => previous.map((task) => (task.id === id ? { ...task, status } : task)));
  };

  return (
    <AppLayout title="Nurse / Compounder Dashboard" subtitle="Ward assignments, medication rounds, and bedside duty tracking.">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Pending Tasks</p>
          <p className="mt-1 text-3xl font-bold">{counts.pending}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="mt-1 text-3xl font-bold">{counts.inProgress}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-3xl font-bold">{counts.done}</p>
        </article>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.5fr,1fr]">
        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Syringe className="h-5 w-5 text-primary" />
            Assigned Duty Board
          </h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <article key={task.id} className="rounded-2xl border border-border/60 bg-card/55 px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">{task.title}</p>
                  <span className="rounded-full border border-border/60 bg-card px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {task.due}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {task.id} | Ward: {task.ward}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant={task.status === "Pending" ? "default" : "outline"}
                    className="h-8 rounded-lg px-3 text-[11px]"
                    onClick={() => updateTaskStatus(task.id, "Pending")}
                  >
                    Pending
                  </Button>
                  <Button
                    type="button"
                    variant={task.status === "In Progress" ? "default" : "outline"}
                    className="h-8 rounded-lg px-3 text-[11px]"
                    onClick={() => updateTaskStatus(task.id, "In Progress")}
                  >
                    In Progress
                  </Button>
                  <Button
                    type="button"
                    variant={task.status === "Done" ? "default" : "outline"}
                    className="h-8 rounded-lg px-3 text-[11px]"
                    onClick={() => updateTaskStatus(task.id, "Done")}
                  >
                    Done
                  </Button>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
            <Pill className="h-5 w-5 text-primary" />
            Medication Rounds
          </h2>
          <div className="space-y-2.5">
            {medicationRounds.map((item) => (
              <div key={`${item.time}-${item.ward}`} className="rounded-2xl border border-border/60 bg-card/55 px-3.5 py-3">
                <p className="text-sm font-semibold">{item.item}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.time} | {item.ward}
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-2xl border border-border/60 bg-card/55 px-3.5 py-3">
            <p className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <BedDouble className="h-3.5 w-3.5" />
              Bedside Monitoring
            </p>
            <p className="mt-1 text-sm">ICU oxygen and saturation checks scheduled every 30 mins.</p>
            <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
              <Clock3 className="h-3.5 w-3.5" />
              Last update: just now
            </p>
          </div>
          <div className="mt-3 rounded-2xl border border-health-teal/35 bg-health-teal/10 px-3.5 py-3 text-xs text-health-teal">
            <CheckCircle2 className="mr-1 inline h-4 w-4" />
            Shift handoff notes are synced.
          </div>
        </article>
      </section>
    </AppLayout>
  );
};

export default Nurse;
