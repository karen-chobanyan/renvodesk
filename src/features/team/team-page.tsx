import { type FormEvent, useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { AppShell } from "@/components/app-shell";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  const [members, setMembers] = useState<TeamMember[]>([]),
    [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true),
    [failed, setFailed] = useState(false),
    [reload, setReload] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const [moreMembers, setMoreMembers] = useState(false),
    [moreInvites, setMoreInvites] = useState(false),
    [removing, setRemoving] = useState<TeamMember | null>(null);
  const [email, setEmail] = useState(""),
    [request, setRequest] = useState(() => crypto.randomUUID()),
    [attempted, setAttempted] = useState(false),
    [created, setCreated] = useState(false),
    [link, setLink] = useState(""),
    [copied, setCopied] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: explicit reload refreshes saved team state
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    void Promise.all([listTeam(org), listInvitations(org)])
      .then(([m, i]) => {
        if (active) {
          setMembers(m);
          setInvitations(i);
          setMoreMembers(m.length === 50);
          setMoreInvites(i.length === 20);
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
      setReload((n) => n + 1);
    });
  }
  async function more(kind: "members" | "invitations") {
    await action(async () => {
      if (kind === "members") {
        const rows = await listTeam(org, members.length);
        setMembers((old) => [
          ...old,
          ...rows.filter((r) => !old.some((o) => o.user_id === r.user_id)),
        ]);
        setMoreMembers(rows.length === 50);
      } else {
        const rows = await listInvitations(org, invitations.length);
        setInvitations((old) => [
          ...old,
          ...rows.filter((r) => !old.some((o) => o.id === r.id)),
        ]);
        setMoreInvites(rows.length === 20);
      }
    });
  }
  return (
    <AppShell live>
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
            onClick={() => setReload((n) => n + 1)}
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
      {failed ? (
        <div role="alert">
          {c.error}
          <Button onClick={() => setReload((n) => n + 1)}>{c.retry}</Button>
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
                            setReload((n) => n + 1);
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
                    setReload((n) => n + 1);
                  }
                })
              }
            >
              {c.remove}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
