import { describe, expect, it } from "vitest";
import {
  addDays,
  dateLabel,
  onDay,
  overdue,
  validDate,
  validTask,
  weekStart,
} from "./task-model";

describe("calendar dates and schedule", () => {
  it("uses Monday and crosses year/month/DST boundaries without shifting days", () => {
    expect(weekStart("2026-09-20")).toBe("2026-09-14");
    expect(weekStart("2026-09-21")).toBe("2026-09-21");
    expect(addDays("2025-12-29", 6)).toBe("2026-01-04");
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDays("2024-02-28", 1)).toBe("2024-02-29");
    expect(dateLabel("2026-09-21", "en")).toContain("21");
  });
  it("rejects impossible, out of range, and reversed dates", () => {
    expect(validDate("2025-02-29")).toBe(false);
    expect(validDate("2024-02-29")).toBe(true);
    expect(validDate("2026-04-31")).toBe(false);
    expect(validDate("2101-01-01")).toBe(false);
    expect(
      validTask({
        title: "Paint",
        notes: "",
        status: "todo",
        start_date: "2026-09-22",
        due_date: "2026-09-21",
      }),
    ).toBe(false);
  });
  it("places ranges inclusively and one-date tasks on a single day", () => {
    expect(
      onDay({ start_date: "2026-09-20", due_date: "2026-09-23" }, "2026-09-21"),
    ).toBe(true);
    expect(
      onDay({ start_date: null, due_date: "2026-09-21" }, "2026-09-21"),
    ).toBe(true);
    expect(
      onDay({ start_date: "2026-09-21", due_date: null }, "2026-09-22"),
    ).toBe(false);
    expect(onDay({ start_date: null, due_date: null }, "2026-09-21")).toBe(
      false,
    );
  });
  it("only overdue unfinished tasks with a past due date are flagged", () => {
    expect(
      overdue({ status: "todo", due_date: "2026-09-20" }, "2026-09-21"),
    ).toBe(true);
    expect(
      overdue({ status: "todo", due_date: "2026-09-21" }, "2026-09-21"),
    ).toBe(false);
    expect(
      overdue({ status: "done", due_date: "2026-09-20" }, "2026-09-21"),
    ).toBe(false);
    expect(overdue({ status: "todo", due_date: null }, "2026-09-21")).toBe(
      false,
    );
  });
});
