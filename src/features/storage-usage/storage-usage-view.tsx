import { Button } from "@/components/ui/button";
import { SettingsSection } from "@/features/organizations/settings-layout";
import { useLocale } from "@/lib/i18n";
import {
  formatStorageBytes,
  type StorageUsageData,
  storageLevel,
} from "./storage-model";

const copy = {
  fr: {
    title: "Stockage",
    hint: "Les fichiers et révisions de croquis partagent ces limites. Les imports incomplets réservent aussi de l’espace.",
    accountHint:
      "Limite partagée entre les entreprises que vous possédez. Les deux limites s’appliquent aux imports.",
    refresh: "Actualiser le stockage",
    refreshed: "Stockage actualisé.",
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
    hint: "Files and sketch revisions share these limits. Incomplete uploads also reserve space.",
    accountHint:
      "Shared across companies you own. Both limits apply to uploads.",
    refresh: "Refresh storage",
    refreshed: "Storage refreshed.",
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

export function StorageUsageView({
  usage,
  failed = false,
  busy = false,
  refreshed = false,
  onRefresh,
  settings = false,
  note,
}: {
  usage: StorageUsageData | null;
  failed?: boolean;
  busy?: boolean;
  refreshed?: boolean;
  onRefresh?: () => void;
  settings?: boolean;
  note?: string;
}) {
  const { locale } = useLocale();
  const c = copy[locale];
  const content = (
    <>
      {onRefresh && (
        <div className="storage-refresh">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onRefresh}
          >
            {busy ? c.loading : c.refresh}
          </Button>
          <span role="status">
            {!busy && !failed && refreshed ? c.refreshed : ""}
          </span>
        </div>
      )}
      {failed && (
        <div role="alert">
          <p>{c.error}</p>
          {!onRefresh && <p>{c.retry}</p>}
        </div>
      )}
      {!usage && !failed && <p role="status">{c.loading}</p>}
      {usage &&
        (
          [
            ["workspace", c.workspace],
            ["account", c.account],
          ] as const
        ).map(([key, label]) => {
          const scope = usage[key],
            charged = scope.used + scope.reserved,
            level = storageLevel(scope);
          return (
            <div className="storage-usage-row" key={key}>
              <div className="storage-usage-label">
                <strong>{label}</strong>
                <span>
                  {formatStorageBytes(scope.used, locale)} /{" "}
                  {formatStorageBytes(scope.limit, locale)}
                </span>
              </div>
              <progress
                value={Math.min(charged, scope.limit)}
                max={scope.limit}
                aria-label={label}
              />
              <p>
                {formatStorageBytes(scope.used, locale)} {c.used} ·{" "}
                {formatStorageBytes(Math.max(0, scope.limit - charged), locale)}{" "}
                {c.available}
              </p>
              {scope.reserved > 0 && (
                <p>
                  {formatStorageBytes(scope.reserved, locale)} {c.reserved}
                </p>
              )}
              {key === "account" && (
                <p className="helper-text">{c.accountHint}</p>
              )}
              {level !== "normal" &&
                (level === "full" ||
                  level === "critical" ||
                  level === "near") && <p role="status">{c[level]}</p>}
            </div>
          );
        })}
      {note && <p className="helper-text">{note}</p>}
    </>
  );
  return settings ? (
    <SettingsSection title={c.title} hint={c.hint}>
      {content}
    </SettingsSection>
  ) : (
    <section className="storage-usage" aria-label={c.title}>
      <h2>{c.title}</h2>
      {content}
    </section>
  );
}
