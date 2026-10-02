import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useState,
} from "react";
import { demoActivity } from "@/features/demo/demo-activity";
import {
  DEMO_USER,
  demoClients,
  demoCompany,
  demoInvitations,
  demoMembers,
} from "@/features/demo/demo-directory";
import type {
  DemoActivity,
  DemoActivityCategory,
  DemoClient,
  DemoCost,
  DemoEstimate,
  DemoInvitation,
  DemoLine,
  DemoTask,
  Text,
} from "@/features/demo/demo-types";
import { tx } from "@/features/demo/demo-types";
import {
  demoBudgets,
  demoCosts,
  demoEstimates,
  demoFiles,
  demoSketches,
  demoTasks,
} from "@/features/demo/demo-work";
import type { EstimateStatus } from "@/features/estimates/workflow-copy";
import { initialProjects, type Project } from "@/features/projects/data";
import { addDays, today } from "@/features/tasks/task-model";

type ActivityInput = {
  projectId: string;
  category: DemoActivityCategory;
  event: string;
  label: Text | null;
  detail?: Text | null;
  amountCents?: number | null;
};

function useDemoState() {
  const [base] = useState(today);
  const [projects, setProjects] = useState(initialProjects);
  const [tasks, setTasks] = useState(() => demoTasks(base));
  const [costs, setCosts] = useState(() => demoCosts(base));
  const [budgets, setBudgets] = useState(demoBudgets);
  const [estimates, setEstimates] = useState(() => demoEstimates(base));
  const [activity, setActivity] = useState(() => demoActivity(base));
  const [clients, setClients] = useState(demoClients);
  const [members, setMembers] = useState(demoMembers);
  const [invitations, setInvitations] = useState(() => demoInvitations(base));
  const [company, setCompany] = useState(demoCompany);

  const log = useCallback((input: ActivityInput) => {
    const entry: DemoActivity = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      actor: DEMO_USER,
      detail: null,
      amountCents: null,
      ...input,
    };
    setActivity((old) => [entry, ...old]);
  }, []);

  const saveTask = useCallback(
    (task: DemoTask, created: boolean) => {
      setTasks((old) =>
        created
          ? [...old, task]
          : old.map((row) => (row.id === task.id ? task : row)),
      );
      log({
        projectId: task.projectId,
        category: "tasks",
        event: created ? "task.created" : "task.updated",
        label: task.title,
      });
    },
    [log],
  );
  const removeTask = useCallback(
    (task: DemoTask) => {
      setTasks((old) => old.filter((row) => row.id !== task.id));
      log({
        projectId: task.projectId,
        category: "tasks",
        event: "task.deleted",
        label: task.title,
      });
    },
    [log],
  );
  const saveCost = useCallback(
    (cost: DemoCost, created: boolean) => {
      setCosts((old) =>
        created
          ? [cost, ...old]
          : old.map((row) => (row.id === cost.id ? cost : row)),
      );
      log({
        projectId: cost.projectId,
        category: "costs",
        event: cost.voided
          ? "cost.voided"
          : created
            ? "cost.created"
            : "cost.updated",
        label: cost.description,
        amountCents: cost.amountCents,
      });
    },
    [log],
  );
  const setBudget = useCallback(
    (projectId: string, cents: number) => {
      setBudgets((old) => ({ ...old, [projectId]: cents }));
      log({
        projectId,
        category: "costs",
        event: "budget.updated",
        label: null,
        amountCents: cents,
      });
    },
    [log],
  );
  const createEstimate = useCallback(
    (projectId: string, title: string) => {
      const id = crypto.randomUUID();
      const estimate: DemoEstimate = {
        id,
        projectId,
        title: tx(title, title),
        status: "draft",
        revision: 1,
        lines: [],
        events: [],
      };
      setEstimates((old) => [estimate, ...old]);
      log({
        projectId,
        category: "estimates",
        event: "estimate.created",
        label: estimate.title,
      });
      return id;
    },
    [log],
  );
  const saveEstimate = useCallback(
    (estimate: DemoEstimate, title: Text, lines: DemoLine[]) => {
      const next = {
        ...estimate,
        title,
        lines,
        revision: estimate.revision + 1,
      };
      setEstimates((old) =>
        old.map((row) => (row.id === estimate.id ? next : row)),
      );
      log({
        projectId: estimate.projectId,
        category: "estimates",
        event: "estimate.updated",
        label: title,
      });
      return next;
    },
    [log],
  );
  const recordEstimate = useCallback(
    (estimate: DemoEstimate, status: EstimateStatus, note: string) => {
      const next = {
        ...estimate,
        status,
        revision: estimate.revision + 1,
        events: [
          ...estimate.events,
          {
            id: crypto.randomUUID(),
            status,
            note: tx(note, note),
            at: new Date().toISOString(),
          },
        ],
      };
      setEstimates((old) =>
        old.map((row) => (row.id === estimate.id ? next : row)),
      );
      log({
        projectId: estimate.projectId,
        category: "estimates",
        event: `estimate.${status}`,
        label: estimate.title,
        detail: tx(note, note),
      });
      return next;
    },
    [log],
  );
  const saveClient = useCallback((client: DemoClient) => {
    setClients((old) =>
      old.some((row) => row.id === client.id)
        ? old.map((row) => (row.id === client.id ? client : row))
        : [client, ...old],
    );
  }, []);
  const createInvitation = useCallback((email: string) => {
    const invitation: DemoInvitation = {
      id: crypto.randomUUID(),
      email,
      state: "pending",
      expires: addDays(today(), 7),
    };
    setInvitations((old) => [invitation, ...old]);
    return invitation;
  }, []);
  const revokeInvitation = useCallback((id: string) => {
    setInvitations((old) =>
      old.map((row) =>
        row.id === id ? { ...row, state: "revoked" as const } : row,
      ),
    );
  }, []);
  const removeMember = useCallback((id: string) => {
    setMembers((old) => old.filter((row) => row.id !== id));
    setTasks((old) =>
      old.map((row) =>
        row.assignee === id ? { ...row, assignee: null } : row,
      ),
    );
  }, []);

  return {
    base,
    projects,
    addProject: (project: Project) =>
      setProjects((current) => [project, ...current]),
    saveProject: (project: Project) => {
      setProjects((current) =>
        current.map((row) => (row.id === project.id ? project : row)),
      );
      log({
        projectId: project.id,
        category: "project",
        event: "project.updated",
        label: null,
      });
    },
    tasks,
    saveTask,
    removeTask,
    costs,
    saveCost,
    budgets,
    setBudget,
    estimates,
    createEstimate,
    saveEstimate,
    recordEstimate,
    files: demoFiles,
    sketches: demoSketches,
    activity,
    clients,
    saveClient,
    members,
    removeMember,
    invitations,
    createInvitation,
    revokeInvitation,
    company,
    saveCompany: (patch: Partial<typeof demoCompany>) =>
      setCompany((old) => ({ ...old, ...patch })),
  };
}

export type DemoStore = ReturnType<typeof useDemoState>;
const Context = createContext<DemoStore | null>(null);
export function DemoProvider({ children }: { children: ReactNode }) {
  const state = useDemoState();
  return <Context.Provider value={state}>{children}</Context.Provider>;
}
export function useDemo() {
  const value = useContext(Context);
  if (!value) throw new Error("DemoProvider missing");
  return value;
}
