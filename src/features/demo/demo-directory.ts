import { addDays } from "@/features/tasks/task-model";
import {
  type DemoClient,
  type DemoInvitation,
  type DemoMember,
  tx,
} from "./demo-types";

/** The signed-in demo persona; every demo action is attributed to this owner. */
export const DEMO_USER = "alex";

export const demoMembers: DemoMember[] = [
  {
    id: "alex",
    name: "Alex Morgan",
    email: "alex.morgan@atelier-habitat.example",
    role: "owner",
    initials: "AM",
    trade: tx("Gérant", "Managing director"),
  },
  {
    id: "lea",
    name: "Léa Janssens",
    email: "lea.janssens@atelier-habitat.example",
    role: "member",
    initials: "LJ",
    trade: tx("Cheffe de chantier", "Site lead"),
  },
  {
    id: "youssef",
    name: "Youssef El Amrani",
    email: "youssef.elamrani@atelier-habitat.example",
    role: "member",
    initials: "YE",
    trade: tx("Électricien", "Electrician"),
  },
  {
    id: "pieter",
    name: "Pieter Claes",
    email: "pieter.claes@atelier-habitat.example",
    role: "member",
    initials: "PC",
    trade: tx("Plombier", "Plumber"),
  },
];

export function demoInvitations(base: string): DemoInvitation[] {
  return [
    {
      id: "invite-ines",
      email: "ines.martin@atelier-habitat.example",
      state: "pending",
      expires: addDays(base, 5),
    },
    {
      id: "invite-pieter",
      email: "pieter.claes@atelier-habitat.example",
      state: "accepted",
      expires: addDays(base, -18),
    },
    {
      id: "invite-old",
      email: "stagiaire@atelier-habitat.example",
      state: "expired",
      expires: addDays(base, -40),
    },
  ];
}

export const demoClients: DemoClient[] = [
  {
    id: "client-laurent",
    name: "Sophie & Marc Laurent",
    kind: "individual",
    email: "laurent.famille@example.com",
    phone: "+32 470 12 34 56",
    billing: "24, rue des Tilleuls · 1050 Ixelles",
    properties: [
      {
        id: "prop-tilleuls",
        label: tx("Maison des Tilleuls", "Maison des Tilleuls"),
        address: "24, rue des Tilleuls",
        city: "Ixelles",
        country: "BE",
      },
      {
        id: "prop-knokke",
        label: tx("Appartement à la mer", "Seaside apartment"),
        address: "5, Zeedijk",
        city: "Knokke-Heist",
        country: "BE",
      },
    ],
  },
  {
    id: "client-dubois",
    name: "Camille Dubois",
    kind: "individual",
    email: "camille.dubois@example.com",
    phone: "+33 6 12 34 56 78",
    billing: "18, rue Nationale · 59000 Lille",
    properties: [
      {
        id: "prop-republique",
        label: tx("Appartement République", "Appartement République"),
        address: "18, rue Nationale",
        city: "Lille",
        country: "FR",
      },
    ],
  },
  {
    id: "client-desmet",
    name: "Thomas De Smet",
    kind: "individual",
    email: "thomas.desmet@example.com",
    phone: "+32 478 98 76 54",
    billing: "",
    properties: [
      {
        id: "prop-leie",
        label: tx("Loft aan de Leie", "Loft aan de Leie"),
        address: "12, Lindenstraat",
        city: "Gent",
        country: "BE",
      },
    ],
  },
  {
    id: "client-martin",
    name: "Julie & Nicolas Martin",
    kind: "individual",
    email: "martin.namur@example.com",
    phone: "+32 81 22 33 44",
    billing: "8, rue du Parc · 5000 Namur",
    properties: [
      {
        id: "prop-saint-aubain",
        label: tx("Maison Saint-Aubain", "Maison Saint-Aubain"),
        address: "8, rue du Parc",
        city: "Namur",
        country: "BE",
      },
    ],
  },
  {
    id: "client-vandijk",
    name: "Emma van Dijk",
    kind: "individual",
    email: "emma.vandijk@example.com",
    phone: "+31 6 1234 5678",
    billing: "",
    properties: [
      {
        id: "prop-oudegracht",
        label: tx("Studio Oudegracht", "Studio Oudegracht"),
        address: "42, Oudegracht",
        city: "Utrecht",
        country: "NL",
      },
    ],
  },
  {
    id: "client-petit",
    name: "Alexandre Petit",
    kind: "individual",
    email: "alexandre.petit@example.com",
    phone: "+32 2 555 01 23",
    billing: "16, avenue des Arts · 1000 Bruxelles",
    properties: [
      {
        id: "prop-arts",
        label: tx("Duplex des Arts", "Duplex des Arts"),
        address: "16, avenue des Arts",
        city: "Bruxelles",
        country: "BE",
      },
    ],
  },
  {
    id: "client-albert",
    name: "Syndic Résidence Albert",
    kind: "company",
    email: "gestion@residence-albert.example",
    phone: "+32 2 555 77 88",
    billing: "Avenue Albert 102 · 1190 Forest",
    properties: [
      {
        id: "prop-albert-hall",
        label: tx(
          "Hall d’entrée et cage d’escalier",
          "Entrance hall and stairwell",
        ),
        address: "Avenue Albert 102",
        city: "Forest",
        country: "BE",
      },
    ],
  },
  {
    id: "client-brasserie",
    name: "Brasserie du Parc SRL",
    kind: "company",
    email: "contact@brasserie-du-parc.example",
    phone: "+32 10 45 67 89",
    billing: "Place du Parc 3 · 1300 Wavre",
    properties: [],
  },
];

export const demoCompany = {
  name: "Atelier & Habitat",
  country: "BE" as "BE" | "FR" | "NL",
  language: "fr" as "fr" | "en",
  contact_address: "Rue de la Station 45 · 1300 Wavre",
  contact_email: "bonjour@atelier-habitat.example",
  contact_phone: "+32 10 23 45 67",
};

/** Fictional storage figures in bytes, shown with the live storage layout. */
export const demoStorage = {
  account: { limit: 1_000_000_000, used: 212_400_000, reserved: 4_100_000 },
  workspace: { limit: 1_000_000_000, used: 184_700_000, reserved: 4_100_000 },
};
