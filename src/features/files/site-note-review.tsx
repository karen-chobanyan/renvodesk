import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { type TaskInput, validTask } from "@/features/tasks/task-model";
import { createTask } from "@/features/tasks/task-service";
import { listTeam, type TeamMember } from "@/features/team/team-service";
import { useLocale } from "@/lib/i18n";
import type { SiteNoteAnalysis } from "./site-note-ai-service";
import {
  type EditableField,
  SiteNoteTaskFields,
  type TeamState,
} from "./site-note-task-fields";

const copy = {
  fr: {
    title: "Analyser la note vocale",
    description:
      "Relisez la transcription et chaque suggestion. Aucune tâche n’est créée automatiquement. Le résultat disparaît si vous rechargez la page.",
    transcript: "Transcription",
    summary: "Résumé proposé",
    proposalUnavailable:
      "La transcription est disponible, mais le résumé et les tâches proposés n’ont pas pu être vérifiés. Vous pouvez réessayer l’analyse, ce qui peut entraîner un nouveau coût.",
    tasks: "Tâches proposées",
    suggestedFields:
      "Le responsable et les dates sont préremplis uniquement lorsque la note les mentionne. Vérifiez-les avant de créer la tâche.",
    empty: "Aucune tâche vérifiable n’est disponible pour cette note.",
    omitted:
      "Certaines suggestions n’ont pas été affichées, car leur passage cité ne figure pas dans la transcription ou leur contenu est invalide.",
    titleField: "Titre de la tâche",
    notesField: "Notes",
    evidence: "Passage cité par l’IA",
    create: "Créer cette tâche",
    saved: "Tâche créée",
    invalid:
      "Vérifiez le titre, les notes et les dates (1900–2100). La date limite doit être égale ou postérieure au début.",
    failed:
      "La création n’a pas été confirmée. Réessayez pour vérifier le même identifiant.",
    leave:
      "Des tâches proposées n’ont pas été créées. Elles seront perdues si vous fermez. Fermer quand même ?",
    close: "Fermer",
  },
  en: {
    title: "Review voice note",
    description:
      "Check the transcript and each suggestion. No task is created automatically. Results disappear if you reload the page.",
    transcript: "Transcript",
    summary: "Suggested summary",
    proposalUnavailable:
      "The transcript is available, but the suggested summary and tasks could not be verified. You can retry analysis, which may incur another charge.",
    tasks: "Suggested tasks",
    suggestedFields:
      "Assignee and dates are prefilled only when the note mentions them. Check them before creating the task.",
    empty: "No verified task is available for this note.",
    omitted:
      "Some suggestions were hidden because their cited passage was absent from the transcript or their content was invalid.",
    titleField: "Task title",
    notesField: "Notes",
    evidence: "Passage cited by AI",
    create: "Create this task",
    saved: "Task created",
    invalid:
      "Check the title, notes and dates (1900–2100). Due date must be on or after the start.",
    failed:
      "Task creation was not confirmed. Retry to check the same request ID.",
    leave:
      "Some suggested tasks have not been created. They will be lost if you close. Close anyway?",
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

function taskInput(task: ReviewTask): TaskInput {
  return {
    assignee_id: task.assigneeId || null,
    title: task.title.trim(),
    notes: task.notes.trim(),
    status: "todo",
    start_date: task.startDate || null,
    due_date: task.dueDate || null,
  };
}

function useTeam(organizationId: string): TeamState {
  const [rows, setRows] = useState<TeamMember[]>([]),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry reloads available assignees
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listTeam(organizationId)
      .then((data) => {
        if (active) setRows(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [organizationId, reload]);
  return { rows, loading, failed, retry: () => setReload((n) => n + 1) };
}

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
  const team = useTeam(organizationId);
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
  // Results are not stored yet, so closing discards uncreated suggestions.
  function requestClose() {
    if (busy) return;
    if (tasks.some((task) => !task.saved) && !window.confirm(c.leave)) return;
    close();
  }
  function change(index: number, field: EditableField, value: string) {
    const next = field === "title" || field === "notes" ? value : value || null;
    setTasks((old) =>
      old.map((task, i) =>
        i === index ? { ...task, [field]: next, error: null } : task,
      ),
    );
  }
  async function create(index: number) {
    const task = tasks[index];
    if (!task || task.saved || busy) return;
    const input = taskInput(task);
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
        if (!open) requestClose();
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
          {analysis.proposalStatus === "unavailable" ? (
            <p role="status" className="helper-text">
              {c.proposalUnavailable}
            </p>
          ) : (
            <section>
              <h3>{c.summary}</h3>
              <p>{analysis.summary}</p>
            </section>
          )}
          {analysis.proposalStatus === "ready" && (
            <section>
              <h3>{c.tasks}</h3>
              {tasks.length > 0 && (
                <p className="helper-text">{c.suggestedFields}</p>
              )}
              {analysis.omittedTaskCount > 0 && (
                <p role="status" className="helper-text">
                  {c.omitted}
                </p>
              )}
              {tasks.length === 0 && <p>{c.empty}</p>}
              {tasks.map((task, index) => (
                <div className="site-note-task" key={task.id}>
                  <SiteNoteTaskFields
                    id={`site-note-task-${index}`}
                    task={task}
                    locked={task.saved || task.attempted}
                    team={team}
                    labels={{ title: c.titleField, notes: c.notesField }}
                    change={(field, value) => change(index, field, value)}
                  />
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
          )}
        </div>
        <div className="dialog-actions">
          <Button variant="outline" disabled={busy} onClick={requestClose}>
            {c.close}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
