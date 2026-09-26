import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { validTask } from "@/features/tasks/task-model";
import { createTask } from "@/features/tasks/task-service";
import { useLocale } from "@/lib/i18n";
import type { SiteNoteAnalysis } from "./site-note-ai-service";

const copy = {
  fr: {
    title: "Analyser la note vocale",
    description:
      "Relisez la transcription et chaque suggestion. Aucune tâche n’est créée automatiquement. Le résultat disparaît si vous rechargez la page.",
    transcript: "Transcription",
    summary: "Résumé proposé",
    tasks: "Tâches proposées",
    empty: "Aucune tâche claire n’a été trouvée dans cette note.",
    titleField: "Titre de la tâche",
    notesField: "Notes",
    evidence: "Passage cité par l’IA",
    create: "Créer cette tâche",
    saved: "Tâche créée",
    invalid: "Corrigez le titre ou les notes avant de créer la tâche.",
    failed:
      "La création n’a pas été confirmée. Réessayez pour vérifier le même identifiant.",
    close: "Fermer",
  },
  en: {
    title: "Review voice note",
    description:
      "Check the transcript and each suggestion. No task is created automatically. Results disappear if you reload the page.",
    transcript: "Transcript",
    summary: "Suggested summary",
    tasks: "Suggested tasks",
    empty: "No clear task was found in this note.",
    titleField: "Task title",
    notesField: "Notes",
    evidence: "Passage cited by AI",
    create: "Create this task",
    saved: "Task created",
    invalid: "Correct the title or notes before creating the task.",
    failed:
      "Task creation was not confirmed. Retry to check the same request ID.",
    close: "Close",
  },
};

type ReviewTask = SiteNoteAnalysis["tasks"][number] & {
  id: string;
  saved: boolean;
  busy: boolean;
  attempted: boolean;
  error: "invalid" | "failed" | null;
};

export function SiteNoteReview({
  analysis,
  organizationId,
  projectId,
  close,
  onTaskCreated,
}: {
  analysis: SiteNoteAnalysis;
  organizationId: string;
  projectId: string;
  close: () => void;
  onTaskCreated: () => void;
}) {
  const { locale } = useLocale();
  const c = copy[locale];
  const [tasks, setTasks] = useState<ReviewTask[]>(() =>
    analysis.tasks.map((task) => ({
      ...task,
      id: crypto.randomUUID(),
      saved: false,
      busy: false,
      attempted: false,
      error: null,
    })),
  );
  const busy = tasks.some((task) => task.busy);
  function change(index: number, field: "title" | "notes", value: string) {
    setTasks((old) =>
      old.map((task, i) =>
        i === index ? { ...task, [field]: value, error: null } : task,
      ),
    );
  }
  async function create(index: number) {
    const task = tasks[index];
    if (!task || task.saved || busy) return;
    const input = {
      title: task.title.trim(),
      notes: task.notes.trim(),
      status: "todo" as const,
      start_date: null,
      due_date: null,
    };
    if (!validTask(input)) {
      setTasks((old) =>
        old.map((row, i) => (i === index ? { ...row, error: "invalid" } : row)),
      );
      return;
    }
    setTasks((old) =>
      old.map((row, i) =>
        i === index
          ? { ...row, busy: true, attempted: true, error: null }
          : row,
      ),
    );
    try {
      await createTask(organizationId, projectId, task.id, input);
      setTasks((old) =>
        old.map((row, i) =>
          i === index ? { ...row, busy: false, saved: true } : row,
        ),
      );
      onTaskCreated();
    } catch {
      setTasks((old) =>
        old.map((row, i) =>
          i === index ? { ...row, busy: false, error: "failed" } : row,
        ),
      );
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) close();
      }}
    >
      <DialogContent
        title={c.title}
        description={c.description}
        closeLabel={c.close}
        className="site-note-review-dialog"
      >
        <div className="site-note-review-content">
          <section>
            <h3>{c.transcript}</h3>
            <p className="site-note-transcript">{analysis.transcript}</p>
          </section>
          <section>
            <h3>{c.summary}</h3>
            <p>{analysis.summary}</p>
          </section>
          <section>
            <h3>{c.tasks}</h3>
            {tasks.length === 0 && <p>{c.empty}</p>}
            {tasks.map((task, index) => (
              <div className="site-note-task" key={task.id}>
                <label className="field">
                  {c.titleField}
                  <input
                    className="input"
                    maxLength={160}
                    value={task.title}
                    disabled={task.saved || task.attempted}
                    onChange={(event) =>
                      change(index, "title", event.target.value)
                    }
                  />
                </label>
                <label className="field">
                  {c.notesField}
                  <textarea
                    className="input"
                    maxLength={2000}
                    value={task.notes}
                    disabled={task.saved || task.attempted}
                    onChange={(event) =>
                      change(index, "notes", event.target.value)
                    }
                  />
                </label>
                <p className="helper-text">
                  <strong>{c.evidence}:</strong> {task.evidence}
                </p>
                {task.error && (
                  <p role="alert" className="error-message">
                    {c[task.error]}
                  </p>
                )}
                {task.saved ? (
                  <p role="status">{c.saved}</p>
                ) : (
                  <Button disabled={busy} onClick={() => void create(index)}>
                    {c.create}
                  </Button>
                )}
              </div>
            ))}
          </section>
        </div>
        <div className="dialog-actions">
          <Button variant="outline" disabled={busy} onClick={close}>
            {c.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
