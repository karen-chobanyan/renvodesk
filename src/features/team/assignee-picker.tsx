import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { teamCopy } from "./team-copy";
import { listTeam, type TeamMember } from "./team-service";
export function AssigneePicker({
  org,
  value,
}: {
  org: string;
  value: string | null;
}) {
  const { locale } = useLocale(),
    c = teamCopy[locale];
  const [rows, setRows] = useState<TeamMember[]>([]),
    [selected, setSelected] = useState(value ?? ""),
    [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [more, setMore] = useState(false),
    [reload, setReload] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: retry reloads available assignees
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void listTeam(org)
      .then((data) => {
        if (active) {
          setRows(data);
          setMore(data.length === 50);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [org, reload]);
  async function loadMore() {
    setLoading(true);
    try {
      const data = await listTeam(org, rows.length);
      setRows((old) => [
        ...old,
        ...data.filter((r) => !old.some((o) => o.user_id === r.user_id)),
      ]);
      setMore(data.length === 50);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }
  return (
    <div className="field">
      <label htmlFor="task-assignee">{c.assignee}</label>
      <input type="hidden" name="assignee" value={selected} />
      <select
        id="task-assignee"
        className="input"
        disabled={loading || failed}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">{c.unassigned}</option>
        {selected && !rows.some((r) => r.user_id === selected) && (
          <option value={selected}>{c.savedAssignment}</option>
        )}
        {rows.map((row) => (
          <option key={row.user_id} value={row.user_id}>
            {row.email}
          </option>
        ))}
      </select>
      {failed && (
        <div role="alert">
          <p>{c.teamError}</p>
          <Button type="button" onClick={() => setReload((n) => n + 1)}>
            {c.retry}
          </Button>
        </div>
      )}
      {more && !failed && (
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={loadMore}
        >
          {c.more}
        </Button>
      )}
    </div>
  );
}
