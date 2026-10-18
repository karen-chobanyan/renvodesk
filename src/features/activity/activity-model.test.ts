import { describe, expect, it } from "vitest";
import { activityCopy } from "./activity-copy";
import {
  type Activity,
  activityPresentation,
  activityTarget,
  groupSketchActivity,
  validCursor,
} from "./activity-model";

const row: Activity = {
  id: "11111111-1111-4111-8111-111111111111",
  organization_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  project_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  actor_user_id: "11111111-1111-4111-8111-111111111111",
  occurred_at: "2026-09-22T11:30:12.123456+00:00",
  category: "tasks",
  visibility: "member",
  entity_type: "task",
  entity_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  event_type: "task.updated",
  source_key: "task:revision:2",
  payload_version: 1,
  payload: {
    label: "Walls",
    from_status: "todo",
    to_status: "done",
    changed_fields: ["status", "notes"],
  },
};
describe("activity presentation", () => {
  it("covers every event in both locales and marks decisions as recorded", () => {
    expect(Object.keys(activityCopy.fr.events)).toEqual(
      Object.keys(activityCopy.en.events),
    );
    for (const locale of ["fr", "en"] as const)
      for (const event_type of Object.keys(activityCopy.en.events))
        expect(
          activityPresentation({ ...row, event_type }, locale).title,
        ).not.toBe(activityCopy[locale].unknown);
    expect(
      activityPresentation({ ...row, event_type: "estimate.accepted" }, "en")
        .title,
    ).toBe("Estimate acceptance recorded");
    expect(activityPresentation(row, "fr").detail).toBe("À faire → Terminée");
    expect(activityPresentation(row, "en").changes).toBe("Changed: notes");
  });
  it("formats cents without floating point even above the safe integer limit", () => {
    const input = { ...row, payload: { amount_cents: "9007199254740993" } };
    expect(activityPresentation(input, "en").amount).toBe(
      "€90,071,992,547,409.93 · excluding tax",
    );
    expect(activityPresentation(input, "fr").amount).toContain(
      ",93 € · hors taxes",
    );
    expect(
      activityPresentation({ ...row, payload: { amount_cents: "1e9" } }, "en")
        .amount,
    ).toBe("");
  });
  it("handles unknown versions, codes and malformed payloads without interpreting arbitrary values", () => {
    for (const event_type of ["future.changed", "toString", "__proto__"]) {
      expect(activityPresentation({ ...row, event_type }, "en").title).toBe(
        "Project activity",
      );
      expect(activityTarget({ ...row, event_type })).toBeNull();
    }
    expect(
      activityPresentation({ ...row, payload_version: 2 }, "en").label,
    ).toBe("");
    expect(
      activityPresentation({ ...row, payload: ["invalid"] }, "en").label,
    ).toBe("");
    expect(
      activityPresentation(
        {
          ...row,
          payload: {
            changed_fields: ["toString", 3, "unknown"],
            from_status: "toString",
            to_status: "done",
          },
        },
        "en",
      ).changes,
    ).toBe("");
  });
  it("focuses exact records and never links deleted or unknown events", () => {
    expect(activityTarget(row)).toBe(
      `/workspace/${row.organization_id}/projects/${row.project_id}?tab=tasks&task=${row.entity_id}`,
    );
    expect(
      activityTarget({ ...row, entity_type: "file", event_type: "file.added" }),
    ).toBe(
      `/workspace/${row.organization_id}/projects/${row.project_id}?tab=documents&file=${row.entity_id}`,
    );
    expect(activityTarget({ ...row, event_type: "task.deleted" })).toBeNull();
    expect(
      activityTarget({
        ...row,
        entity_type: "file",
        event_type: "file.deleted",
      }),
    ).toBeNull();
  });
  it("omits only redundant status fields, preserving changes without a full transition", () => {
    expect(
      activityPresentation(
        {
          ...row,
          payload: {
            from_status: "todo",
            to_status: "done",
            changed_fields: ["status"],
          },
        },
        "en",
      ).changes,
    ).toBe("");
    expect(
      activityPresentation(
        { ...row, payload: { to_status: "done", changed_fields: ["status"] } },
        "en",
      ).changes,
    ).toBe("Changed: status");
  });
  it("groups only adjacent same-sketch saves by one actor within a local day and five minute gap", () => {
    const make = (id: string, at: string, extra = {}) => ({
      id,
      at,
      event: "sketch.published",
      entityId: "sketch-a",
      actorId: "actor-a",
      ...extra,
    });
    const input = [
      make("1", "2026-10-18T12:03:00Z"),
      make("2", "2026-10-18T12:02:00Z"),
      make("3", "2026-10-18T12:01:00Z", { event: "task.updated" }),
      make("4", "2026-10-18T12:00:00Z"),
      make("5", "2026-10-18T11:59:00Z", { actorId: "actor-b" }),
      make("6", "2026-10-18T11:58:00Z", {
        entityId: "sketch-b",
        actorId: "actor-b",
      }),
      make("7", "2026-10-18T11:52:00Z", {
        entityId: "sketch-b",
        actorId: "actor-b",
      }),
    ];
    const groups = groupSketchActivity(input, "en");
    expect(groups.map((group) => group.map((entry) => entry.id))).toEqual([
      ["1", "2"],
      ["3"],
      ["4"],
      ["5"],
      ["6"],
      ["7"],
    ]);
    expect(groups.flat()).toEqual(input);
    const midnight = new Date(2026, 9, 18).getTime();
    expect(
      groupSketchActivity(
        [
          make("1", new Date(midnight + 60000).toISOString()),
          make("2", new Date(midnight - 60000).toISOString()),
        ],
        "fr",
      ),
    ).toHaveLength(2);
  });
  it("preserves Postgres timestamp precision while rejecting filter injection", () => {
    expect(validCursor(row)).toBe(true);
    expect(validCursor({ ...row, occurred_at: "2026-09-22T11:30:12Z" })).toBe(
      true,
    );
    expect(validCursor({ ...row, id: `${row.id},visibility.eq.owner` })).toBe(
      false,
    );
    expect(
      validCursor({ ...row, occurred_at: "2026-09-22T11:30:12Z),id.gt.0" }),
    ).toBe(false);
    expect(validCursor({ ...row, occurred_at: "not a date" })).toBe(false);
  });
});
