import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  track: vi.fn(),
  result: { data: null as unknown, error: null as unknown },
}));
vi.mock("./runtime", () => ({ track: mock.track }));
vi.mock("@/lib/supabase/client", () => ({
  requireSupabase: () => {
    const chain = {
      from: () => chain,
      insert: () => chain,
      update: () => chain,
      select: () => chain,
      eq: () => chain,
      single: async () => mock.result,
      maybeSingle: async () => mock.result,
    };
    return chain;
  },
}));

import {
  type SavedEstimate,
  saveEstimate,
} from "@/features/estimates/estimate-service";
import { createProject } from "@/features/projects/project-service";

beforeEach(() => {
  mock.track.mockClear();
  mock.result = { data: null, error: null };
});
it("records a project only after a confirmed insert, without project contents", async () => {
  mock.result.data = { id: "request" };
  await createProject("org", "request", {
    name: "PRIVATE",
    client_name: "PRIVATE",
    city: "PRIVATE",
    address: "PRIVATE",
  });
  expect(mock.track).toHaveBeenCalledWith("project_created", "request");
  expect(JSON.stringify(mock.track.mock.calls)).not.toContain("PRIVATE");
});
it("does not record failed project creation", async () => {
  mock.result.error = { code: "403" };
  await expect(
    createProject("org", "request", {
      name: "PRIVATE",
      client_name: "PRIVATE",
      city: "PRIVATE",
      address: "PRIVATE",
    }),
  ).rejects.toEqual({ code: "403" });
  expect(mock.track).not.toHaveBeenCalled();
});
it("does not record a stale estimate update returning no row", async () => {
  await saveEstimate(
    {
      id: "estimate",
      organization_id: "org",
      project_id: "project",
      revision: 1,
    } as SavedEstimate,
    "PRIVATE",
    [],
  );
  expect(mock.track).not.toHaveBeenCalled();
});
it("records a saved estimate by revision only after success", async () => {
  mock.result.data = { id: "estimate", revision: 2 };
  await saveEstimate(
    {
      id: "estimate",
      organization_id: "org",
      project_id: "project",
      revision: 1,
    } as SavedEstimate,
    "PRIVATE",
    [],
  );
  expect(mock.track).toHaveBeenCalledWith("estimate_saved", "estimate:2");
});
