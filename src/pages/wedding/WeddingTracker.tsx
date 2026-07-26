import { useEffect, useMemo, useState } from "react";
import { loadTasks, saveTasks, WeddingTask, TaskStatus } from "@/lib/wedding/data";
import { Plus, Trash2, Star } from "lucide-react";

const MONTH_ORDER: WeddingTask["month"][] = ["Done", "August", "September", "October", "November"];

const STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: "Not Started",
  in_progress: "In Progress",
  done: "Done",
};

function StatusToggle({ value, onChange }: { value: TaskStatus; onChange: (s: TaskStatus) => void }) {
  const opts: TaskStatus[] = ["not_started", "in_progress", "done"];
  return (
    <div className="inline-flex rounded-full border border-[hsl(35_25%_82%)] bg-white p-0.5 text-xs">
      {opts.map((o) => {
        const active = value === o;
        const styles = active
          ? o === "done"
            ? "bg-[hsl(150_30%_25%)] text-[hsl(40_35%_96%)]"
            : o === "in_progress"
            ? "bg-[hsl(35_65%_45%)] text-white"
            : "bg-[hsl(30_15%_35%)] text-white"
          : "text-[hsl(30_15%_40%)] hover:bg-[hsl(40_25%_94%)]";
        return (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`px-3 py-1 rounded-full transition ${styles}`}
          >
            {STATUS_LABEL[o]}
          </button>
        );
      })}
    </div>
  );
}

function TaskCard({
  task,
  onUpdate,
  onDelete,
}: {
  task: WeddingTask;
  onUpdate: (t: WeddingTask) => void;
  onDelete: () => void;
}) {
  const done = task.status === "done";
  const inProg = task.status === "in_progress";
  const border = inProg
    ? "border-l-4 border-l-[hsl(35_65%_45%)]"
    : done
    ? "border-l-4 border-l-[hsl(150_30%_35%)]"
    : "border-l-4 border-l-transparent";
  const dueLabel = task.dueDate
    ? new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  return (
    <div
      className={`rounded-xl bg-white ${border} border border-[hsl(35_25%_86%)] p-5 shadow-[0_1px_2px_rgba(30,20,10,0.04)] transition ${
        done ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {task.priority && !done && (
              <span className="inline-flex items-center gap-1 text-[10px] tracking-wider uppercase text-[hsl(35_65%_40%)] font-semibold">
                <Star className="w-3 h-3 fill-current" /> Priority
              </span>
            )}
            {dueLabel && (
              <span className="text-[11px] tracking-wider uppercase text-[hsl(30_15%_45%)]">
                Due {dueLabel}
              </span>
            )}
          </div>
          <h3
            className={`wedding-serif text-lg mt-1 text-[hsl(150_30%_18%)] ${
              done ? "line-through decoration-[hsl(150_20%_40%)]/60" : ""
            }`}
          >
            {task.title}
          </h3>
        </div>
        <button
          onClick={onDelete}
          className="text-[hsl(30_15%_55%)] hover:text-[hsl(0_50%_45%)] transition"
          aria-label="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mt-3">
        <StatusToggle value={task.status} onChange={(s) => onUpdate({ ...task, status: s })} />
      </div>
      <textarea
        value={task.notes}
        onChange={(e) => onUpdate({ ...task, notes: e.target.value })}
        placeholder="Notes — vendor contact, decisions, follow-ups…"
        rows={task.notes ? 3 : 1}
        className="mt-3 w-full resize-none rounded-md border border-[hsl(35_20%_88%)] bg-[hsl(40_35%_98%)] px-3 py-2 text-sm text-[hsl(30_15%_25%)] placeholder:text-[hsl(30_15%_60%)] focus:outline-none focus:border-[hsl(35_60%_50%)]"
      />
    </div>
  );
}

export default function WeddingTracker() {
  const [tasks, setTasks] = useState<WeddingTask[]>(() => loadTasks());
  const [adding, setAdding] = useState<WeddingTask["month"] | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  const { doneCount, totalCount, pct } = useMemo(() => {
    const d = tasks.filter((t) => t.status === "done").length;
    const total = tasks.length;
    return { doneCount: d, totalCount: total, pct: total ? Math.round((d / total) * 100) : 0 };
  }, [tasks]);

  const grouped = useMemo(() => {
    const g: Record<string, WeddingTask[]> = {};
    for (const m of MONTH_ORDER) g[m] = [];
    for (const t of tasks) (g[t.month] ||= []).push(t);
    for (const m of MONTH_ORDER) {
      g[m].sort((a, b) => {
        if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });
    }
    return g;
  }, [tasks]);

  const update = (t: WeddingTask) => setTasks((prev) => prev.map((p) => (p.id === t.id ? t : p)));
  const remove = (id: string) => setTasks((prev) => prev.filter((p) => p.id !== id));
  const add = (month: WeddingTask["month"]) => {
    if (!newTitle.trim()) return;
    const nt: WeddingTask = {
      id: `t-${Date.now()}`,
      title: newTitle.trim(),
      month,
      dueDate: newDate ? new Date(newDate).toISOString() : undefined,
      status: month === "Done" ? "done" : "not_started",
      notes: "",
    };
    setTasks((prev) => [...prev, nt]);
    setNewTitle("");
    setNewDate("");
    setAdding(null);
  };

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-[hsl(35_25%_82%)] bg-white p-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] tracking-[0.25em] uppercase text-[hsl(30_15%_45%)]">Progress</p>
            <p className="wedding-serif text-3xl text-[hsl(150_30%_18%)] mt-1">
              {doneCount} <span className="text-[hsl(30_15%_50%)] text-2xl">of {totalCount} done</span>
            </p>
          </div>
          <p className="wedding-serif text-4xl text-[hsl(35_60%_40%)]">{pct}%</p>
        </div>
        <div className="mt-4 h-2 rounded-full bg-[hsl(40_25%_90%)] overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[hsl(150_30%_30%)] to-[hsl(35_60%_50%)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </section>

      {MONTH_ORDER.map((month) => (
        <section key={month}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="wedding-serif text-2xl text-[hsl(150_30%_18%)]">
              {month === "Done" ? "Already Done" : month}
              <span className="ml-3 text-sm text-[hsl(30_15%_50%)] font-sans">
                {grouped[month].length} {grouped[month].length === 1 ? "task" : "tasks"}
              </span>
            </h2>
            <button
              onClick={() => setAdding(adding === month ? null : month)}
              className="inline-flex items-center gap-1.5 text-sm text-[hsl(150_30%_25%)] hover:text-[hsl(35_60%_40%)] transition"
            >
              <Plus className="w-4 h-4" /> Add task
            </button>
          </div>
          {adding === month && (
            <div className="mb-4 rounded-xl border border-[hsl(35_25%_82%)] bg-[hsl(40_35%_96%)] p-4 flex gap-2 flex-wrap">
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add(month)}
                placeholder="Task title"
                className="flex-1 min-w-[200px] rounded-md border border-[hsl(35_20%_82%)] bg-white px-3 py-2 text-sm focus:outline-none focus:border-[hsl(35_60%_50%)]"
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="rounded-md border border-[hsl(35_20%_82%)] bg-white px-3 py-2 text-sm"
              />
              <button
                onClick={() => add(month)}
                className="rounded-md bg-[hsl(150_30%_25%)] text-[hsl(40_35%_96%)] px-4 py-2 text-sm hover:bg-[hsl(150_30%_20%)]"
              >
                Add
              </button>
            </div>
          )}
          <div className="grid gap-3">
            {grouped[month].map((task) => (
              <TaskCard key={task.id} task={task} onUpdate={update} onDelete={() => remove(task.id)} />
            ))}
            {grouped[month].length === 0 && (
              <p className="text-sm text-[hsl(30_15%_55%)] italic">No tasks yet.</p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}