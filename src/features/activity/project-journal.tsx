import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth/auth-provider";
import { listTeam } from "@/features/team/team-service";
import { useLocale } from "@/lib/i18n";
import { activityCopy } from "./activity-copy";
import {
  type ActivityCategory,
  type ActivityCursor,
  activityDay,
  activityPresentation,
  activityTarget,
} from "./activity-model";
import { activityStartedAt, listActivity } from "./activity-service";
import {
  type JournalEntry,
  JournalView,
  useJournalPosition,
} from "./journal-view";

type Props = {
  org: string;
  project: string;
  owner: boolean;
  compact?: boolean;
  revision: number;
  refreshKey?: string;
  active?: boolean;
  onOpenSketch?: (id: string) => void;
};
export function ProjectJournal(props: Props) {
  const { session } = useAuth();
  return (
    <Journal
      key={`${session?.user.id}:${props.org}:${props.project}:${props.owner}`}
      {...props}
    />
  );
}
function Journal({
  org,
  project,
  owner,
  compact = false,
  revision,
  refreshKey = "",
  active = true,
  onOpenSketch,
}: Props) {
  const { locale } = useLocale(),
    c = activityCopy[locale];
  const { session } = useAuth();
  const [category, setCategory] = useState<ActivityCategory>("all");
  useJournalPosition(active && !compact);
  const scope = [
    "workspace",
    session?.user.id,
    org,
    "project-activity",
    project,
    owner,
  ];
  const query = useInfiniteQuery({
    queryKey: [...scope, compact ? "compact" : "full", category],
    queryFn: ({ pageParam }) =>
      listActivity(org, project, category, pageParam, compact ? 3 : 20),
    initialPageParam: null as ActivityCursor | null,
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: active,
    staleTime: 0,
    retry: false,
  });
  const tracking = useQuery({
    queryKey: [...scope, "tracking"],
    queryFn: activityStartedAt,
    enabled: active,
    staleTime: 300_000,
    retry: false,
  });
  const people = useQuery({
    queryKey: [...scope, "actors"],
    queryFn: () => listTeam(org),
    enabled: active,
    staleTime: 60_000,
    retry: false,
  });
  const refetch = query.refetch;
  const version = `${revision}:${refreshKey}`,
    lastVersion = useRef(version);
  useEffect(() => {
    if (!active) return;
    if (lastVersion.current !== version) {
      lastVersion.current = version;
      void refetch();
    }
  }, [active, version, refetch]);
  useEffect(() => {
    const focus = () => {
      if (active) void refetch({ cancelRefetch: false });
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [active, refetch]);
  const rows = Array.from(
    new Map(
      (query.data?.pages.flatMap((page) => page.rows) ?? []).map((row) => [
        row.id,
        row,
      ]),
    ).values(),
  );
  const entries: JournalEntry[] = rows.map((row) => {
    const content = activityPresentation(row, locale),
      target = activityTarget(row);
    return {
      ...content,
      id: row.id,
      at: row.occurred_at,
      category: row.category,
      event: row.payload_version === 1 ? row.event_type : "",
      entityId: row.entity_id,
      actorId: row.actor_user_id ?? "",
      actor:
        row.actor_user_id === session?.user.id
          ? c.you
          : !row.actor_user_id
            ? c.system
            : (people.data?.find(
                (person) => person.user_id === row.actor_user_id,
              )?.email ?? c.member),
      target,
      open:
        target && row.entity_type === "sketch" && onOpenSketch
          ? () => onOpenSketch(row.entity_id)
          : undefined,
      actionLabel:
        row.entity_type === "sketch"
          ? c.openSketch
          : ["cost", "budget"].includes(row.entity_type)
            ? c.viewCosts
            : undefined,
    };
  });
  return (
    <JournalView
      rows={entries}
      compact={compact}
      owner={owner}
      category={category}
      setCategory={setCategory}
      loading={query.isPending && !query.isError}
      updating={query.isFetching}
      error={query.isError && !query.isFetchNextPageError}
      retry={() => void refetch()}
      more={
        query.hasNextPage
          ? () => void query.fetchNextPage({ cancelRefetch: false })
          : undefined
      }
      loadingMore={query.isFetchingNextPage}
      moreError={query.isFetchNextPageError}
      footer={
        tracking.data ? (
          <span>
            {c.since} {activityDay(tracking.data, locale)}.
          </span>
        ) : tracking.isError ? (
          <span>
            {c.trackingError}{" "}
            <Button
              variant="ghost"
              disabled={tracking.isFetching}
              onClick={() => void tracking.refetch()}
            >
              {c.retryTracking}
            </Button>
          </span>
        ) : null
      }
    />
  );
}
