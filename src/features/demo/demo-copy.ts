import { useLocale } from "@/lib/i18n";

export const demoCopy = {
  fr: {
    banner:
      "Démonstration : données fictives conservées dans cet onglet jusqu’au rechargement.",
    clients: "Clients",
    schedule: "Planning",
    team: "Équipe",
    settings: "Paramètres",
    account: "Paramètres du compte",
    you: "Vous",
    unassigned: "Non attribuée",
    assignee: "Responsable",
    myTasks: "Mes tâches uniquement",
    loaded: "Tâches affichées",
    notFound: "Ce projet de démonstration n’existe pas.",
    estimateMissing: "Ce devis de démonstration n’existe pas.",
    estimatesHint:
      "Devis de démonstration, du plus récent au plus ancien. La recherche porte sur toute l’entreprise fictive.",
    estimateSearch: "Rechercher un devis, projet ou client",
    searchAction: "Rechercher",
    reset: "Réinitialiser",
    chooseProject: "Choisir un projet pour créer un devis",
    noEstimates:
      "Aucun devis trouvé. Créez un brouillon depuis un projet ou modifiez la recherche.",
    revision: "Révision",
    pdfDemo:
      "Le PDF est généré dans votre navigateur à partir des données fictives.",
    recorded: "Statut consigné pour cette session de démonstration.",
    uploadDemo:
      "Import désactivé dans la démonstration : aucun fichier ne quitte votre appareil.",
    captureDemo:
      "La photo et la note vocale utilisent la caméra et le micro dans l’application connectée.",
    aiTitle: "Analyse de la note vocale",
    aiDemo:
      "Transcription et suggestions fictives préparées à l’avance. Aucun audio n’est envoyé.",
    transcript: "Transcription",
    summary: "Résumé",
    suggestions: "Tâches proposées",
    createTask: "Créer la tâche",
    taskCreated: "Tâche créée",
    sketchDemo:
      "Croquis modifiable pour la démonstration. Les changements ne sont pas enregistrés.",
    sketchOpen: "Ouvrir le croquis",
    sketchNew:
      "La création de croquis est disponible dans l’application connectée.",
    downloadUnavailable: "Téléchargement indisponible pour ce fichier fictif.",
    teamInvite:
      "Démonstration : le lien d’invitation est fictif et ne donne accès à rien.",
    settingsSaved: "Enregistré pour cette session de démonstration.",
    passwordDemo:
      "Le changement de mot de passe est désactivé dans la démonstration.",
    storageDemo: "Valeurs de stockage fictives.",
    reviewTitle: "Analyse IA",
  },
  en: {
    banner: "Demo: fictional data kept in this tab until you reload.",
    clients: "Clients",
    schedule: "Schedule",
    team: "Team",
    settings: "Settings",
    account: "Account settings",
    you: "You",
    unassigned: "Unassigned",
    assignee: "Assignee",
    myTasks: "Only my tasks",
    loaded: "Tasks shown",
    notFound: "This demo project does not exist.",
    estimateMissing: "This demo estimate does not exist.",
    estimatesHint:
      "Demo estimates, newest first. Search covers the entire fictional company.",
    estimateSearch: "Search estimates, projects or clients",
    searchAction: "Search",
    reset: "Reset",
    chooseProject: "Choose a project to create an estimate",
    noEstimates:
      "No estimates found. Create a draft from a project or change your search.",
    revision: "Revision",
    pdfDemo: "The PDF is generated in your browser from the fictional data.",
    recorded: "Status recorded for this demo session.",
    uploadDemo: "Uploads are disabled in the demo: no file leaves your device.",
    captureDemo:
      "Photo and voice-note capture use the camera and microphone in the connected app.",
    aiTitle: "Voice note analysis",
    aiDemo:
      "Fictional transcript and suggestions prepared in advance. No audio is sent.",
    transcript: "Transcript",
    summary: "Summary",
    suggestions: "Suggested tasks",
    createTask: "Create task",
    taskCreated: "Task created",
    sketchDemo: "Editable demo sketch. Changes are not saved.",
    sketchOpen: "Open sketch",
    sketchNew: "Creating sketches is available in the connected app.",
    downloadUnavailable: "Download unavailable for this fictional file.",
    teamInvite: "Demo: the invitation link is fictional and grants no access.",
    settingsSaved: "Saved for this demo session.",
    passwordDemo: "Password changes are disabled in the demo.",
    storageDemo: "Fictional storage figures.",
    reviewTitle: "AI analysis",
  },
};

export function useDemoCopy() {
  const { locale } = useLocale();
  return demoCopy[locale];
}
