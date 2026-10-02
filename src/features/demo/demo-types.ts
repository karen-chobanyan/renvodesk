import type { categories } from "@/features/costs/cost-model";
import type { EstimateLine } from "@/features/estimates/model";
import type { EstimateStatus } from "@/features/estimates/workflow-copy";
import type { TaskStatus } from "@/features/tasks/task-model";
import type { Locale } from "@/lib/i18n";

/** Fictional demo content is written in both interface languages. */
export type Text = { fr: string; en: string };
export const tx = (fr: string, en: string): Text => ({ fr, en });
export const say = (text: Text, locale: Locale) => text[locale];

export type DemoTask = {
  id: string;
  projectId: string;
  title: Text;
  notes: Text | null;
  status: TaskStatus;
  start: string | null;
  due: string | null;
  assignee: string | null;
};

export type CostCategory = (typeof categories)[number];
export type DemoCost = {
  id: string;
  projectId: string;
  description: Text;
  category: CostCategory;
  amountCents: number;
  date: string;
  notes: Text | null;
  voided: boolean;
};

export type DemoLine = {
  id: string;
  text: Text;
  quantity: string;
  price: string;
  unit: EstimateLine["unit"];
};
export type DemoEstimateEvent = {
  id: string;
  status: EstimateStatus;
  note: Text;
  at: string;
};
export type DemoEstimate = {
  id: string;
  projectId: string;
  title: Text;
  status: EstimateStatus;
  revision: number;
  lines: DemoLine[];
  events: DemoEstimateEvent[];
};

export type DemoFileKind = "dxf" | "image" | "pdf" | "audio";
export type DemoFile = {
  id: string;
  projectId: string;
  name: string;
  kind: DemoFileKind;
  sizeBytes: number;
  /** Public fictional asset, or an estimate whose PDF is generated on demand. */
  url?: string;
  estimateId?: string;
};

export type SketchScene = "kitchen" | "bathroom" | "facade";
export type DemoSketch = {
  id: string;
  projectId: string;
  title: Text;
  revision: number;
  scene: SketchScene;
};

export type DemoActivityCategory =
  | "project"
  | "tasks"
  | "documents"
  | "estimates"
  | "costs";
export type DemoActivity = {
  id: string;
  projectId: string;
  at: string;
  category: DemoActivityCategory;
  event: string;
  label: Text | null;
  detail: Text | null;
  amountCents: number | null;
  actor: string;
};

export type DemoProperty = {
  id: string;
  label: Text;
  address: string;
  city: string;
  country: "BE" | "FR" | "NL";
};
export type DemoClient = {
  id: string;
  name: string;
  kind: "individual" | "company";
  email: string;
  phone: string;
  billing: string;
  properties: DemoProperty[];
};

export type DemoMember = {
  id: string;
  name: string;
  email: string;
  role: "owner" | "member";
  initials: string;
  trade: Text;
};
export type DemoInvitation = {
  id: string;
  email: string;
  state: "pending" | "accepted" | "revoked" | "expired";
  expires: string;
};

export type DemoSiteNote = {
  fileId: string;
  transcript: Text;
  summary: Text;
  tasks: { id: string; title: Text; due: string | null; assignee: string }[];
};
