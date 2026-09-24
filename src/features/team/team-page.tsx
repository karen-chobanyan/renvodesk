import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useState } from "react";
import { Link, useParams } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/features/auth/auth-provider";
import { workspaceKeys } from "@/features/organizations/workspace-context";
import { useLocale } from "@/lib/i18n";
import { teamCopy } from "./team-copy";
import {
  type Invitation,
  invitationState,
  invite,
  invitePath,
  listInvitations,
  listTeam,
  removeMember,
  revoke,
  type TeamMember,
} from "./team-service";
export function TeamPage() {
  const { organizationId = "" } = useParams();
  return <TeamDirectory key={organizationId} org={organizationId} />;
}
function TeamDirectory({ org }: { org: string }) {
  const { locale } = useLocale(),
    c = teamCopy[locale];
  const { session } = useAuth();
  const userId = session?.user.id ?? "";
  const queryClient = useQueryClient();
  const memberQuery = useInfiniteQuery({
    queryKey: [...workspaceKeys.team(userId, org), "members"],
    queryFn: ({ pageParam }) => listTeam(org, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 50 ? pages.length * 50 : undefined,
    enabled: !!userId && !!org,
  });
  const invitationQuery = useInfiniteQuery({
    queryKey: [...workspaceKeys.team(userId, org), "invitations"],
    queryFn: ({ pageParam }) => listInvitations(org, pageParam),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length === 20 ? pages.length * 20 : undefined,
    enabled: !!userId && !!org,
  });
  const members: TeamMember[] = Array.from(
    new Map(
      memberQuery.data?.pages.flat().map((row) => [row.user_id, row]) ?? [],
    ).values(),
  );
  const invitations: Invitation[] = Array.from(
    new Map(
      invitationQuery.data?.pages.flat().map((row) => [row.id, row]) ?? [],
    ).values(),
  );
  const loading =
    (memberQuery.isPending && memberQuery.isFetching) ||
    (invitationQuery.isPending && invitationQuery.isFetching);
  const failed =
    (memberQuery.isError && !memberQuery.data) ||
    (invitationQuery.isError && !invitationQuery.data);
  const moreMembers = memberQuery.hasNextPage;
  const moreInvites = invitationQuery.hasNextPage;
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const [removing, setRemoving] = useState<TeamMember | null>(null);
  const [email, setEmail] = useState(""),
    [request, setRequest] = useState(() => crypto.randomUUID()),
    [attempted, setAttempted] = useState(false),
    [created, setCreated] = useState(false),
    [link, setLink] = useState(""),
    [copied, setCopied] = useState(false);
  function refresh() {
    void queryClient.invalidateQueries({
      queryKey: workspaceKeys.team(userId, org),
    });
  }
  async function action(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      await run();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await action(async () => {
      setAttempted(true);
      const id = await invite(org, email, request);
      setCreated(true);
      setLink(`${window.location.origin}${invitePath(id)}`);
      setCopied(false);
      refresh();
    });
  }
  async function more(kind: "members" | "invitations") {
    await action(async () => {
      if (kind === "members") {
        const result = await memberQuery.fetchNextPage();
        if (result.isError) throw result.error;
      } else {
        const result = await invitationQuery.fetchNextPage();
        if (result.isError) throw result.error;
      }
    });
  }
  return (
    <>
      <Link className="back-link" to={`/workspace?company=${org}`}>
        {c.back}
      </Link>
      <PageHeader
        eyebrow="RenvoDesk"
        title={c.title}
        description={c.hint}
        action={
          <Button
            variant="outline"
            disabled={busy || loading}
            onClick={refresh}
          >
            {c.refresh}
          </Button>
        }
      />
      <p className="page-description">{c.permission}</p>
      <form className="company-form" onSubmit={submit}>
        <label className="field" htmlFor="team-email">
          {c.email}
          <Input
            id="team-email"
            type="email"
            required
            maxLength={254}
            value={email}
            readOnly={attempted}
            disabled={busy}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <p className="helper-text">{c.transport}</p>
        <div className="dialog-actions">
          <Button disabled={busy || created || !!link}>{c.create}</Button>
          {(attempted || link) && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={() => {
                setEmail("");
                setRequest(crypto.randomUUID());
                setAttempted(false);
                setCreated(false);
                setLink("");
                setError(false);
                setCopied(false);
              }}
            >
              {c.reset}
            </Button>
          )}
        </div>
        {attempted && !created && !link && (
          <p className="helper-text">{c.resetHint}</p>
        )}
        {link && (
          <div className="invitation-link">
            <label className="field" htmlFor="team-link">
              {c.link}
              <Input
                id="team-link"
                value={link}
                readOnly
                onFocus={(e) => e.target.select()}
              />
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                action(async () => {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                })
              }
            >
              {c.copy}
            </Button>
            {copied && <p role="status">{c.copied}</p>}
          </div>
        )}
      </form>
      {error && <p role="alert">{c.failed}</p>}
      {loading && <p role="status">{c.loading}</p>}
      {(memberQuery.isError && memberQuery.data) ||
      (invitationQuery.isError && invitationQuery.data) ? (
        <p role="alert">{c.error}</p>
      ) : null}
      {failed ? (
        <div role="alert">
          {c.error}
          <Button onClick={refresh}>{c.retry}</Button>
        </div>
      ) : (
        <>
          <section className="saved-projects" aria-label={c.members}>
            <h2>{c.members}</h2>
            {members.map((m) => (
              <article className="task-row" key={m.user_id}>
                <div className="task-content">
                  <strong>{m.email}</strong>
                  <small>{m.role === "owner" ? c.owner : c.member}</small>
                </div>
                {m.role === "member" && (
                  <Button
                    variant="ghost"
                    disabled={busy}
                    onClick={() => {
                      setRemoving(m);
                      setError(false);
                    }}
                  >
                    {c.remove}
                  </Button>
                )}
              </article>
            ))}
            {moreMembers && (
              <Button
                disabled={busy || loading}
                onClick={() => more("members")}
              >
                {c.more}
              </Button>
            )}
          </section>
          <section className="saved-projects" aria-label={c.invitations}>
            <h2>{c.invitations}</h2>
            {!loading && !invitations.length && <p>{c.empty}</p>}
            {invitations.map((i) => {
              const state = invitationState(i);
              return (
                <article className="task-row" key={i.id}>
                  <div className="task-content">
                    <strong>{i.email}</strong>
                    <small>
                      {c[state]} · {c.expires}:{" "}
                      {new Intl.DateTimeFormat(locale, {
                        dateStyle: "medium",
                      }).format(new Date(i.expires_at))}
                    </small>
                  </div>
                  {state === "pending" && (
                    <div className="task-actions">
                      <Button
                        variant="outline"
                        disabled={busy}
                        onClick={() => {
                          setLink(
                            `${window.location.origin}${invitePath(i.id)}`,
                          );
                          setCopied(false);
                        }}
                      >
                        {c.link}
                      </Button>
                      <Button
                        variant="ghost"
                        disabled={busy}
                        onClick={() =>
                          action(async () => {
                            await revoke(org, i.id);
                            refresh();
                            if (link.endsWith(invitePath(i.id))) setLink("");
                          })
                        }
                      >
                        {c.revoke}
                      </Button>
                    </div>
                  )}
                </article>
              );
            })}
            {moreInvites && (
              <Button
                disabled={busy || loading}
                onClick={() => more("invitations")}
              >
                {c.more}
              </Button>
            )}
          </section>
        </>
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
        }}
      >
        <DialogContent
          title={c.confirm}
          description={removing?.email ?? ""}
          closeLabel={c.close}
        >
          <p>{c.removeHint}</p>
          {error && <p role="alert">{c.failed}</p>}
          <div className="dialog-actions">
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => setRemoving(null)}
            >
              {c.cancel}
            </Button>
            <Button
              disabled={busy}
              onClick={() =>
                action(async () => {
                  if (removing) {
                    await removeMember(org, removing.user_id);
                    setLink("");
                    setCopied(false);
                    setRemoving(null);
                    refresh();
                  }
                })
              }
            >
              {c.remove}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
