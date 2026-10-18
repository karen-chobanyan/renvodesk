import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { teamCopy } from "@/features/team/team-copy";
import {
  type DirectoryMember,
  TeamHeader,
  TeamInvitationDialog,
  TeamInvitations,
  TeamMembers,
} from "@/features/team/team-directory";
import { useDemo } from "@/lib/demo-store";
import { useLocale } from "@/lib/i18n";
import { useDemoCopy } from "./demo-copy";

export function DemoTeamPage() {
  const { locale } = useLocale(),
    c = teamCopy[locale],
    d = useDemoCopy();
  const {
    members,
    invitations,
    createInvitation,
    revokeInvitation,
    removeMember,
  } = useDemo();
  const [removing, setRemoving] = useState<DirectoryMember | null>(null);
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<
    { email: string; link: string } | undefined
  >();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  const inviteLink = (id: string) =>
    `${window.location.origin}/invite/demo-${id.slice(0, 8)}`;
  return (
    <div className="team-directory">
      <TeamHeader
        invite={(button) => {
          trigger.current = button;
          setSelected(undefined);
          setInviting(true);
        }}
      />
      <TeamMembers
        rows={members}
        remove={(member, button) => {
          removeTrigger.current = button;
          setRemoving(member);
        }}
      />
      <TeamInvitations
        rows={invitations.map((i) => ({
          ...i,
          expires: `${i.expires}T12:00:00`,
        }))}
        showLink={(i, button) => {
          trigger.current = button;
          setSelected({ email: i.email, link: inviteLink(i.id) });
          setInviting(true);
        }}
        revoke={(i) => revokeInvitation(i.id)}
      />
      {inviting && (
        <TeamInvitationDialog
          initial={selected}
          trigger={trigger.current}
          close={() => setInviting(false)}
          demoNotice={d.teamInvite}
          create={async (email) => inviteLink(createInvitation(email).id)}
        />
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open) setRemoving(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            if (removeTrigger.current?.isConnected)
              removeTrigger.current.focus();
            else document.getElementById("team-invite")?.focus();
          }}
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
    </div>
  );
}
