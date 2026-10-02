import { type FormEvent, useState } from "react";
import { Link } from "react-router";
import { PageHeader } from "@/components/shared";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { teamCopy } from "@/features/team/team-copy";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";
import type { DemoMember } from "./demo-types";
import { say } from "./demo-types";

export function DemoTeamPage() {
  const { locale } = useLocale(),
    c = teamCopy[locale],
    d = useDemoCopy();
  const {
    members,
    invitations,
    company,
    createInvitation,
    revokeInvitation,
    removeMember,
  } = useDemo();
  const [email, setEmail] = useState(""),
    [link, setLink] = useState(""),
    [removing, setRemoving] = useState<DemoMember | null>(null);
  const inviteLink = (id: string) =>
    `${window.location.origin}/invite/demo-${id.slice(0, 8)}`;
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    setLink(inviteLink(createInvitation(value).id));
    setEmail("");
  }
  const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  return (
    <>
      <Link className="back-link" to="/projects">
        {c.back}
      </Link>
      <PageHeader eyebrow={company.name} title={c.title} description={c.hint} />
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
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <p className="helper-text">{c.transport}</p>
        <div className="dialog-actions">
          <Button>{c.create}</Button>
        </div>
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
            <p role="status" className="helper-text">
              {d.teamInvite}
            </p>
          </div>
        )}
      </form>
      <section className="saved-projects" aria-label={c.members}>
        <h2>{c.members}</h2>
        {members.map((m) => (
          <article className="task-row" key={m.id}>
            <div className="task-content">
              <strong>{m.name}</strong>
              <span>{m.email}</span>
              <small>
                {m.role === "owner" ? c.owner : c.member} ·{" "}
                {say(m.trade, locale)}
              </small>
            </div>
            {m.role === "member" && (
              <Button variant="ghost" onClick={() => setRemoving(m)}>
                {c.remove}
              </Button>
            )}
          </article>
        ))}
      </section>
      <section className="saved-projects" aria-label={c.invitations}>
        <h2>{c.invitations}</h2>
        {!invitations.length && <p>{c.empty}</p>}
        {invitations.map((i) => (
          <article className="task-row" key={i.id}>
            <div className="task-content">
              <strong>{i.email}</strong>
              <small>
                {c[i.state]} · {c.expires}:{" "}
                {dateFormat.format(new Date(`${i.expires}T12:00:00`))}
              </small>
            </div>
            {i.state === "pending" && (
              <div className="task-actions">
                <Button
                  variant="outline"
                  onClick={() => setLink(inviteLink(i.id))}
                >
                  {c.link}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    revokeInvitation(i.id);
                    setLink("");
                  }}
                >
                  {c.revoke}
                </Button>
              </div>
            )}
          </article>
        ))}
      </section>
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent
          title={c.confirm}
          description={removing?.email ?? ""}
          closeLabel={c.close}
        >
          <p>{c.removeHint}</p>
          <div className="dialog-actions">
            <Button variant="outline" onClick={() => setRemoving(null)}>
              {c.cancel}
            </Button>
            <Button
              onClick={() => {
                if (removing) removeMember(removing.id);
                setRemoving(null);
              }}
            >
              {c.remove}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
