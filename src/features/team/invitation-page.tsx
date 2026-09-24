import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Button } from "@/components/ui/button";
import { AuthLayout } from "@/features/auth/auth-page";
import { useAuth } from "@/features/auth/auth-provider";
import { workspaceKeys } from "@/features/organizations/workspace-context";
import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import { teamCopy } from "./team-copy";
import { invitation, invitePath } from "./team-service";
export function InvitationPage() {
  const { id = "" } = useParams();
  const { session } = useAuth();
  return <InvitationScreen key={`${id}:${session?.user.id}`} id={id} />;
}
function InvitationScreen({ id }: { id: string }) {
  const { session, loading: authLoading } = useAuth(),
    { locale } = useLocale(),
    c = teamCopy[locale],
    navigate = useNavigate();
  const client = useQueryClient();
  const [company, setCompany] = useState(""),
    [failed, setFailed] = useState(false),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [reload, setReload] = useState(0),
    [saveFailed, setSaveFailed] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: reload explicitly verifies invitation again
  useEffect(() => {
    let active = true;
    setLoading(true);
    setFailed(false);
    if (session)
      void invitation(id)
        .then((row) => {
          if (active) setCompany(row.company_name);
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
  }, [id, session?.user.id, reload]);
  const next = `?next=${encodeURIComponent(invitePath(id))}`;
  async function accept() {
    setBusy(true);
    setSaveFailed(false);
    try {
      const row = await invitation(id, true);
      client.removeQueries({
        queryKey: workspaceKeys.organizations(session?.user.id ?? ""),
      });
      navigate(`/workspace?company=${row.organization_id}`, { replace: true });
    } catch {
      setSaveFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <AuthLayout>
      <section className="auth-panel">
        <p className="eyebrow">RenvoDesk</p>
        <h1>{c.acceptTitle}</h1>
        {authLoading ? (
          <p role="status">{c.loading}</p>
        ) : !session ? (
          <>
            <p>{c.signHint}</p>
            <div className="dialog-actions">
              <Button asChild>
                <Link to={`/login${next}`}>{c.signIn}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={`/signup${next}`}>{c.signUp}</Link>
              </Button>
            </div>
          </>
        ) : (
          <>
            <p>
              {c.account}: {session.user.email}
            </p>
            {loading ? (
              <p role="status">{c.loading}</p>
            ) : failed ? (
              <div role="alert">
                <p>{c.unavailable}</p>
                <Button onClick={() => setReload((n) => n + 1)}>
                  {c.retry}
                </Button>
              </div>
            ) : (
              <>
                <h2>{company}</h2>
                <p>{c.permission}</p>
                <Button disabled={busy} onClick={accept}>
                  {c.accept}
                </Button>
              </>
            )}
            {saveFailed && <p role="alert">{c.failed}</p>}
            <Button
              variant="ghost"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  const { error } = await requireSupabase().auth.signOut({
                    scope: "local",
                  });
                  if (error) throw error;
                } catch {
                  setSaveFailed(true);
                } finally {
                  setBusy(false);
                }
              }}
            >
              {c.switchAccount}
            </Button>
          </>
        )}
      </section>
    </AuthLayout>
  );
}
