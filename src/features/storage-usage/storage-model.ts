export type StorageScope = {
  limit: number;
  used: number;
  reserved: number;
};
export type StorageUsageData = {
  account: StorageScope;
  workspace: StorageScope;
};

export function quotaErrorCode(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  return code === "PZ101" || code === "PZ102" ? code : null;
}

export function formatStorageBytes(bytes: number, locale: "fr" | "en") {
  const units =
    locale === "fr"
      ? ["octets", "ko", "Mo", "Go"]
      : ["bytes", "kB", "MB", "GB"];
  let scale = 1;
  let unit = 0;
  while (unit < 3 && bytes >= scale * 1000) {
    scale *= 1000;
    unit += 1;
  }
  return `${new Intl.NumberFormat(locale === "fr" ? "fr-FR" : "en-GB", {
    maximumFractionDigits: unit === 0 ? 0 : 2,
  }).format(bytes / scale)} ${units[unit]}`;
}

export function storageLevel(scope: StorageScope) {
  const charged = scope.used + scope.reserved;
  if (charged >= scope.limit) return "full";
  if (charged * 100 >= scope.limit * 95) return "critical";
  if (charged * 100 >= scope.limit * 80) return "near";
  return "normal";
}
