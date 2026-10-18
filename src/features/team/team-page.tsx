import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useAuth } from "@/features/auth/auth-provider";
import { workspaceKeys } from "@/features/organizations/workspace-context";
import { useLocale } from "@/lib/i18n";
import { teamCopy } from "./team-copy";
import {
  type DirectoryMember,
  TeamHeader,
  TeamInvitationDialog,
  TeamInvitations,
  TeamMembers,
} from "./team-directory";
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
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  const [removing, setRemoving] = useState<DirectoryMember | null>(null);
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<
    { email: string; link: string } | undefined
  >();
  const trigger = useRef<HTMLButtonElement | null>(null);
  const removeTrigger = useRef<HTMLButtonElement | null>(null);
  const invitationLink = (id: string) =>
    `${window.location.origin}${invitePath(id)}`;
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
  return (
    <div className="team-directory">
      <TeamHeader
        loading={busy || memberQuery.isFetching || invitationQuery.isFetching}
        refresh={refresh}
        invite={(button) => {
          trigger.current = button;
          setSelected(undefined);
          setInviting(true);
        }}
      />
      {error && !removing && (
        <p role="alert" className="error-message">
          {c.failed}
        </p>
      )}
      <TeamMembers
        rows={members.map((m) => ({
          id: m.user_id,
          email: m.email,
          role: m.role,
        }))}
        loading={memberQuery.isFetching}
        failed={memberQuery.isError}
        retry={() =>
          void (memberQuery.isFetchNextPageError
            ? memberQuery.fetchNextPage()
            : memberQuery.refetch())
        }
        more={
          memberQuery.hasNextPage
            ? () => void memberQuery.fetchNextPage()
            : undefined
        }
        busy={busy}
        remove={(m, button) => {
          removeTrigger.current = button;
          setRemoving(m);
          setError(false);
        }}
      />
      <TeamInvitations
        rows={invitations.map((i) => ({
          id: i.id,
          email: i.email,
          state: invitationState(i),
          expires: i.expires_at,
        }))}
        loading={invitationQuery.isFetching}
        failed={invitationQuery.isError}
        retry={() =>
          void (invitationQuery.isFetchNextPageError
            ? invitationQuery.fetchNextPage()
            : invitationQuery.refetch())
        }
        more={
          invitationQuery.hasNextPage
            ? () => void invitationQuery.fetchNextPage()
            : undefined
        }
        busy={busy}
        showLink={(i, button) => {
          trigger.current = button;
          setSelected({ email: i.email, link: invitationLink(i.id) });
          setInviting(true);
        }}
        revoke={(i) =>
          void action(async () => {
            await revoke(org, i.id);
            refresh();
          })
        }
      />
      {inviting && (
        <TeamInvitationDialog
          initial={selected}
          trigger={trigger.current}
          close={() => setInviting(false)}
          create={async (email, request) => {
            const id = await invite(org, email, request);
            refresh();
            return invitationLink(id);
          }}
        />
      )}
      <Dialog
        open={!!removing}
        onOpenChange={(open) => {
          if (!open && !busy) setRemoving(null);
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
                    await removeMember(org, removing.id);
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
    </div>
  );
}
