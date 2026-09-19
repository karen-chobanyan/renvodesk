import { describe, expect, it } from "vitest";
import { filterProjects, forecastMargin, initialProjects } from "./data";

describe("project selection", () => {
  it("searches accents, clients and cities", () => {
    expect(filterProjects(initialProjects, "republique", "all")[0].id).toBe(
      "appartement-lille",
    );
    expect(filterProjects(initialProjects, "sophie", "all")).toHaveLength(1);
    expect(filterProjects(initialProjects, "UTRECHT", "all")).toHaveLength(1);
  });
  it("combines status and search", () => {
    expect(filterProjects(initialProjects, "Lille", "planning")).toEqual([]);
    expect(filterProjects(initialProjects, "", "active")).toHaveLength(3);
  });
  it("subtracts remaining commitments and uncommitted work once", () => {
    expect(forecastMargin(initialProjects[0])).toBe(1790000);
  });
});
