import { Plus, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import type { ProjectStatus } from "./data";
import { ProjectRegisterHeader, ProjectRegisterList } from "./project-register";
export function ProjectsPage() {
  const { t } = useLocale();
  const { projects, addProject } = useDemo();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <section
      className="page-enter project-register"
      aria-labelledby="saved-projects-title"
    >
      <ProjectRegisterHeader
        scheduleHref="/schedule"
        action={
          <Dialog
            open={open}
            onOpenChange={(value) => {
              setOpen(value);
              setError("");
            }}
          >
            <DialogTrigger asChild>
              <Button>
                <Plus size={17} />
                {t("newProject")}
              </Button>
            </DialogTrigger>
            <DialogContent
              title={t("newProject")}
              description={t("createHint")}
              closeLabel={t("close")}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const data = new FormData(e.currentTarget);
                  const name = String(data.get("name") ?? "").trim(),
                    client = String(data.get("client") ?? "").trim(),
                    city = String(data.get("city") ?? "").trim();
                  if (!name || !client || !city) {
                    setError(t("required"));
                    return;
                  }
                  addProject({
                    id: crypto.randomUUID(),
                    name,
                    client,
                    city,
                    address: city,
                    status: "planning",
                    progress: 0,
                    budget: 0,
                    actual: 0,
                    committed: 0,
                    remaining: 0,
                    phase: "prepared",
                    next: "reviewEstimate",
                    color: "sage",
                  });
                  setQuery("");
                  setStatus("all");
                  setOpen(false);
                  setNotice(t("created"));
                }}
              >
                <label className="field" htmlFor="project-name">
                  {t("projectName")}
                  <Input
                    id="project-name"
                    name="name"
                    required
                    maxLength={120}
                  />
                </label>
                <label className="field" htmlFor="project-client">
                  {t("client")}
                  <Input
                    id="project-client"
                    name="client"
                    required
                    maxLength={120}
                  />
                </label>
                <label className="field" htmlFor="project-city">
                  {t("city")}
                  <Input
                    id="project-city"
                    name="city"
                    required
                    maxLength={120}
                  />
                </label>
                {error && (
                  <p role="alert" className="error-message">
                    {error}
                  </p>
                )}
                <div className="dialog-actions">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      {t("cancel")}
                    </Button>
                  </DialogClose>
                  <Button type="submit">{t("create")}</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        }
      />
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            type="button"
            aria-label={t("close")}
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <ProjectRegisterList
        projects={projects.map((project) => ({
          ...project,
          href: `/projects/${project.id}`,
        }))}
        query={query}
        status={status}
        onQuery={setQuery}
        onStatus={setStatus}
      />
    </section>
  );
}
