export const workflowCopy = {
  fr: {
    draft: "Brouillon",
    sent: "Envoi enregistré",
    accepted: "Acceptation enregistrée",
    declined: "Refus enregistré",
    heading: "Suivi du devis",
    hint: "Consignez ici les échanges réalisés avec le client. Aucun e-mail ni signature électronique n’est envoyé par cette action.",
    send: "Marquer comme envoyé",
    accept: "Enregistrer l’acceptation",
    decline: "Enregistrer le refus",
    note: "Référence de l’échange",
    placeholder:
      "Ex. : e-mail du client du 20 septembre, référence du document signé…",
    confirm:
      "Confirmez-vous cet enregistrement ? Le contenu envoyé sera figé et cette action restera dans l’historique.",
    frozen:
      "Version envoyée figée. Les décisions sont consignées par un propriétaire de l’entreprise.",
    dirty: "Enregistrez les modifications avant de changer le statut.",
    empty: "Ajoutez au moins une ligne avant de marquer le devis comme envoyé.",
    history: "Historique des décisions",
    noEvents: "Aucune décision enregistrée.",
    failed:
      "Action non confirmée. Réessayez la même demande ou rechargez pour vérifier le statut.",
    conflict: "Le devis a changé. Rechargez avant de consigner une décision.",
    retry: "Réessayer",
    reload: "Recharger",
    loading: "Enregistrement…",
    recorded: "Consigné le",
    historyError: "Impossible de charger l’historique.",
    refresh: "Actualiser",
    pdfNotice:
      "Statut consigné par l’entreprise. TVA non calculée. Ce document n’est pas une facture.",
  },
  en: {
    draft: "Draft",
    sent: "Sending recorded",
    accepted: "Acceptance recorded",
    declined: "Decline recorded",
    heading: "Estimate tracking",
    hint: "Record communication with the customer here. This action does not send an email or an electronic signature request.",
    send: "Mark as sent",
    accept: "Record acceptance",
    decline: "Record decline",
    note: "Communication reference",
    placeholder:
      "E.g. customer email dated 20 September, signed document reference…",
    confirm:
      "Confirm this record? Sent content will be frozen and this action will remain in the history.",
    frozen:
      "Sent version is frozen. Decisions are recorded by a company owner.",
    dirty: "Save changes before changing the status.",
    empty: "Add at least one line before marking the estimate as sent.",
    history: "Decision history",
    noEvents: "No decisions recorded.",
    failed:
      "Action not confirmed. Retry the same request or reload to check its status.",
    conflict: "The estimate changed. Reload before recording a decision.",
    retry: "Try again",
    reload: "Reload",
    loading: "Recording…",
    recorded: "Recorded on",
    historyError: "Could not load history.",
    refresh: "Refresh",
    pdfNotice:
      "Status recorded by the company. VAT not calculated. This document is not an invoice.",
  },
};
export type EstimateStatus = "draft" | "sent" | "accepted" | "declined";
export function estimateStatus(value: string): EstimateStatus {
  if (value === "sent" || value === "accepted" || value === "declined")
    return value;
  return "draft";
}
