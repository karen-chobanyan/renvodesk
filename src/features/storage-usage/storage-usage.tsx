import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";
import { requireSupabase } from "@/lib/supabase/client";
import {
  formatStorageBytes,
  type StorageScope,
  type StorageUsageData,
  storageLevel,
} from "./storage-model";

export async function readStorageUsage(
  organizationId: string,
): Promise<StorageUsageData> {
  const { data, error } = await requireSupabase()
    .rpc("read_storage_usage", { p_org: organizationId })
    .single();
  if (error) throw error;
  if (
    !data ||
    [
      data.account_limit_bytes,
      data.account_used_bytes,
      data.account_reserved_bytes,
      data.workspace_limit_bytes,
      data.workspace_used_bytes,
      data.workspace_reserved_bytes,
    ].some((value) => !Number.isSafeInteger(value) || value < 0) ||
    data.account_limit_bytes === 0 ||
    data.workspace_limit_bytes === 0
  ) {
    throw new Error("Invalid storage usage response");
  }
  return {
    account: {
      limit: data.account_limit_bytes,
      used: data.account_used_bytes,
      reserved: data.account_reserved_bytes,
    },
    workspace: {
      limit: data.workspace_limit_bytes,
      used: data.workspace_used_bytes,
      reserved: data.workspace_reserved_bytes,
    },
  };
}

const copy = {
  fr: {
    title: "Stockage",
    account: "Compte · toutes vos entreprises",
    workspace: "Cette entreprise",
    used: "utilisés",
    reserved: "réservés pour des imports en cours",
    available: "disponibles",
    full: "Limite atteinte. Terminez ou supprimez des imports incomplets ; supprimez des fichiers inutiles pour libérer de l’espace.",
    near: "Espace presque épuisé.",
    critical: "Il reste très peu d’espace de stockage.",
    error: "Impossible de charger l’utilisation du stockage.",
    retry: "Réessayer",
    loading: "Chargement du stockage…",
  },
  en: {
    title: "Storage",
    account: "Account · all your companies",
    workspace: "This company",
    used: "used",
    reserved: "reserved for incomplete uploads",
    available: "available",
    full: "Limit reached. Finish or remove incomplete uploads, or delete unneeded files to free space.",
    near: "Storage is almost full.",
    critical: "Very little storage space remains.",
    error: "Could not load storage usage.",
    retry: "Try again",
    loading: "Loading storage usage…",
  },
};

export function StorageUsage({
  organizationId,
  refreshKey = 0,
}: {
  organizationId: string;
  refreshKey?: number;
}) {
  const { locale } = useLocale();
  const c = copy[locale];
  const [usage, setUsage] = useState<StorageUsageData | null>(null);
  const [failed, setFailed] = useState(false);
  const [retry, setRetry] = useState(0);
  // biome-ignore lint/correctness/useExhaustiveDependencies: refreshKey and retry explicitly refetch current counters
  useEffect(() => {
    let active = true;
    setUsage(null);
    setFailed(false);
    void readStorageUsage(organizationId)
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [organizationId, refreshKey, retry]);
  return (
    <section className="storage-usage" aria-label={c.title}>
      <h2>{c.title}</h2>
      {failed ? (
        <div>
          <p>{c.error}</p>
          <Button variant="outline" onClick={() => setRetry((n) => n + 1)}>
            {c.retry}
          </Button>
        </div>
      ) : !usage ? (
        <p role="status">{c.loading}</p>
      ) : (
        (
          [
            ["account", c.account],
            ["workspace", c.workspace],
          ] as const
        ).map(([key, label]) => {
          const scope = usage[key];
          const charged = scope.used + scope.reserved;
          const level = storageLevel(scope);
          return (
            <div className="storage-usage-row" key={key}>
              <strong>{label}</strong>
              <progress
                value={Math.min(charged, scope.limit)}
                max={scope.limit}
                aria-label={label}
              />
              <p>
                {formatStorageBytes(scope.used, locale)} {c.used} ·{" "}
                {formatStorageBytes(scope.reserved, locale)} {c.reserved} ·{" "}
                {formatStorageBytes(Math.max(0, scope.limit - charged), locale)}{" "}
                {c.available} / {formatStorageBytes(scope.limit, locale)}
              </p>
              {level === "full" ? (
                <p role="status">{c.full}</p>
              ) : level === "critical" ? (
                <p role="status">{c.critical}</p>
              ) : level === "near" ? (
                <p role="status">{c.near}</p>
              ) : null}
            </div>
          );
        })
      )}
    </section>
  );
}

export function AccountStorageSummary({
  organizationId,
  refreshKey,
}: {
  organizationId: string;
  refreshKey: number;
}) {
  const { locale } = useLocale();
  const [account, setAccount] = useState<StorageScope | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: opening the menu refreshes account usage
  useEffect(() => {
    let active = true;
    setAccount(null);
    void readStorageUsage(organizationId)
      .then((data) => {
        if (active) setAccount(data.account);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [organizationId, refreshKey]);
  if (!account) return null;
  return (
    <p className="account-storage-summary">
      {locale === "fr" ? "Stockage du compte" : "Account storage"}:{" "}
      {formatStorageBytes(account.used + account.reserved, locale)} /{" "}
      {formatStorageBytes(account.limit, locale)}
    </p>
  );
}
