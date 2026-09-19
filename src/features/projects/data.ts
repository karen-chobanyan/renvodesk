import type { Key } from "@/lib/i18n";
export type ProjectStatus = "active" | "planning" | "completed";
export type Project = {
  id: string;
  name: string;
  client: string;
  city: string;
  address: string;
  status: ProjectStatus;
  progress: number;
  budget: number;
  actual: number;
  committed: number;
  remaining: number;
  phase: Key;
  next: Key;
  color: string;
};
export const initialProjects: Project[] = [
  {
    id: "maison-ixelles",
    name: "Maison des Tilleuls",
    client: "Sophie & Marc Laurent",
    city: "Ixelles",
    address: "24, rue des Tilleuls · 1050 Ixelles",
    status: "active",
    progress: 62,
    budget: 8450000,
    actual: 3820000,
    committed: 1640000,
    remaining: 1200000,
    phase: "renovation",
    next: "confirmMaterials",
    color: "sage",
  },
  {
    id: "appartement-lille",
    name: "Appartement République",
    client: "Camille Dubois",
    city: "Lille",
    address: "18, rue Nationale · 59000 Lille",
    status: "active",
    progress: 38,
    budget: 4620000,
    actual: 1350000,
    committed: 1720000,
    remaining: 650000,
    phase: "renovation",
    next: "siteVisit",
    color: "sand",
  },
  {
    id: "loft-gent",
    name: "Loft aan de Leie",
    client: "Thomas De Smet",
    city: "Gent",
    address: "12, Lindenstraat · 9000 Gent",
    status: "planning",
    progress: 12,
    budget: 12800000,
    actual: 480000,
    committed: 2100000,
    remaining: 7600000,
    phase: "prepared",
    next: "reviewEstimate",
    color: "blue",
  },
  {
    id: "maison-namur",
    name: "Maison Saint-Aubain",
    client: "Julie & Nicolas Martin",
    city: "Namur",
    address: "8, rue du Parc · 5000 Namur",
    status: "active",
    progress: 84,
    budget: 6350000,
    actual: 4280000,
    committed: 650000,
    remaining: 220000,
    phase: "finishing",
    next: "siteVisit",
    color: "rose",
  },
  {
    id: "studio-utrecht",
    name: "Studio Oudegracht",
    client: "Emma van Dijk",
    city: "Utrecht",
    address: "42, Oudegracht · 3511 Utrecht",
    status: "planning",
    progress: 0,
    budget: 2890000,
    actual: 0,
    committed: 0,
    remaining: 2310000,
    phase: "prepared",
    next: "reviewEstimate",
    color: "sage",
  },
  {
    id: "duplex-bruxelles",
    name: "Duplex des Arts",
    client: "Alexandre Petit",
    city: "Bruxelles",
    address: "16, avenue des Arts · 1000 Bruxelles",
    status: "completed",
    progress: 100,
    budget: 5720000,
    actual: 4680000,
    committed: 0,
    remaining: 0,
    phase: "handover",
    next: "siteVisit",
    color: "sand",
  },
];
export function filterProjects(
  projects: Project[],
  query: string,
  status: ProjectStatus | "all",
) {
  const normalize = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase();
  const q = normalize(query.trim());
  return projects.filter(
    (p) =>
      (status === "all" || p.status === status) &&
      normalize(`${p.name} ${p.client} ${p.city}`).includes(q),
  );
}
export function forecastMargin(project: Project) {
  return (
    project.budget - project.actual - project.committed - project.remaining
  );
}
