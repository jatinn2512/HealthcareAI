import { motion } from "framer-motion";
import { ClipboardCheck, Clock3, Flag, ListTodo } from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { staffTasks } from "@/data/hospitalData";

const priorityClassMap = {
  High: "border-health-rose/30 bg-health-rose/10 text-health-rose",
  Medium: "border-health-cyan/30 bg-health-cyan/10 text-health-cyan",
  Low: "border-health-teal/30 bg-health-teal/10 text-health-teal",
} as const;

const stateClassMap = {
  Open: "border-border/60 bg-card/65 text-muted-foreground",
  "In Progress": "border-health-cyan/30 bg-health-cyan/10 text-health-cyan",
  Done: "border-health-teal/30 bg-health-teal/10 text-health-teal",
} as const;

const Staff = () => {
  return (
    <AppLayout title="Staff" subtitle="Operational tasks, ownership, and due timelines for management teams.">
      <section className="grid gap-4 sm:grid-cols-3">
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Open Tasks</p>
          <p className="mt-1 text-3xl font-bold">{staffTasks.filter((task) => task.state === "Open").length}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">In Progress</p>
          <p className="mt-1 text-3xl font-bold">{staffTasks.filter((task) => task.state === "In Progress").length}</p>
        </article>
        <article className="glass-card rounded-3xl border-border/50 p-4">
          <p className="text-xs text-muted-foreground">Completed</p>
          <p className="mt-1 text-3xl font-bold">{staffTasks.filter((task) => task.state === "Done").length}</p>
        </article>
      </section>

      <section className="glass-card rounded-3xl border-border/50 p-5 sm:p-6">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold">
          <ListTodo className="h-5 w-5 text-primary" />
          Task Board
        </h2>

        <div className="space-y-3">
          {staffTasks.map((task, index) => (
            <motion.article
              key={task.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              className="rounded-2xl border border-border/60 bg-card/55 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {task.id} • {task.department}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${priorityClassMap[task.priority]}`}>
                    <Flag className="mr-1 h-3 w-3" />
                    {task.priority}
                  </span>
                  <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${stateClassMap[task.state]}`}>
                    <ClipboardCheck className="mr-1 h-3 w-3" />
                    {task.state}
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                <p>Owner: {task.owner}</p>
                <p className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  Due: {task.dueAt}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>
    </AppLayout>
  );
};

export default Staff;
