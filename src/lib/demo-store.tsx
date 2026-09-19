import { createContext, type ReactNode, useContext, useState } from "react";
import { type EstimateLine, initialLines } from "@/features/estimates/model";
import { initialProjects, type Project } from "@/features/projects/data";

type DemoStore = {
  projects: Project[];
  addProject: (project: Project) => void;
  drafts: Record<string, EstimateLine[]>;
  saveDraft: (id: string, lines: EstimateLine[]) => void;
};
const Context = createContext<DemoStore | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const [projects, setProjects] = useState(initialProjects);
  const [drafts, setDrafts] = useState<Record<string, EstimateLine[]>>({
    "maison-ixelles": initialLines,
  });
  return (
    <Context.Provider
      value={{
        projects,
        addProject: (p) => setProjects((current) => [p, ...current]),
        drafts,
        saveDraft: (id, lines) =>
          setDrafts((current) => ({ ...current, [id]: lines })),
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider missing");
  return value;
}
