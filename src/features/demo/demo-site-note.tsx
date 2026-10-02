import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { dateLabel } from "@/features/tasks/task-model";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import { useAssigneeName } from "./demo-tasks";
import { say } from "./demo-types";
import { demoSiteNote } from "./demo-work";

/** Fixed fictional analysis; suggestions become tasks only on explicit click. */
export function DemoSiteNoteReview({
  projectId,
  close,
}: {
  projectId: string;
  close: () => void;
}) {
  const { locale } = useLocale(),
    d = useDemoCopy();
  const { base, saveTask } = useDemo();
  const assignee = useAssigneeName();
  const [note] = useState(() => demoSiteNote(base));
  const [created, setCreated] = useState<string[]>([]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <DialogContent
        title={d.aiTitle}
        description={d.aiDemo}
        closeLabel={locale === "fr" ? "Fermer" : "Close"}
        className="site-note-review-dialog"
      >
        <div className="site-note-review-content">
          <section>
            <h3>{d.transcript}</h3>
            <p className="site-note-transcript">
              {say(note.transcript, locale)}
            </p>
          </section>
          <section>
            <h3>{d.summary}</h3>
            <p>{say(note.summary, locale)}</p>
          </section>
          <section>
            <h3>{d.suggestions}</h3>
            {note.tasks.map((task) => (
              <div className="site-note-task" key={task.id}>
                <p>
                  <strong>{say(task.title, locale)}</strong>
                </p>
                <p className="helper-text">
                  {d.assignee}: {assignee(task.assignee)}
                  {task.due ? ` · ${dateLabel(task.due, locale)}` : ""}
                </p>
                {created.includes(task.id) ? (
                  <p role="status">{d.taskCreated}</p>
                ) : (
                  <Button
                    onClick={() => {
                      saveTask(
                        {
                          id: crypto.randomUUID(),
                          projectId,
                          title: task.title,
                          notes: null,
                          status: "todo",
                          start: null,
                          due: task.due,
                          assignee: task.assignee,
                        },
                        true,
                      );
                      setCreated((old) => [...old, task.id]);
                    }}
                  >
                    {d.createTask}
                  </Button>
                )}
              </div>
            ))}
          </section>
        </div>
        <div className="dialog-actions">
          <Button variant="outline" onClick={close}>
            {locale === "fr" ? "Fermer" : "Close"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
