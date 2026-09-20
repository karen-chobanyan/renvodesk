import { useLocale } from "@/lib/i18n";

const fr = {
  login: "Bienvenue chez RenvoDesk.",
  loginHint: "Connectez-vous à votre espace de travail.",
  email: "Adresse e-mail",
  password: "Mot de passe",
  loginAction: "Se connecter",
  signup: "Créer votre compte",
  signupTitle: "Chaque projet commence ici.",
  signupHint: "Créez un compte, puis votre espace entreprise.",
  signupAction: "Créer mon compte",
  forgot: "Mot de passe oublié ?",
  resetTitle: "Retrouver votre accès.",
  resetHint: "Recevez un lien pour choisir un nouveau mot de passe.",
  resetAction: "Envoyer le lien",
  resetSent:
    "Si un compte correspond à cette adresse, un lien de réinitialisation vous sera envoyé.",
  confirmation:
    "Consultez votre boîte mail pour confirmer votre inscription. Ouvrez le lien dans ce navigateur.",
  updateTitle: "Un nouveau mot de passe.",
  updateHint: "Choisissez un mot de passe d’au moins 12 caractères.",
  updateAction: "Enregistrer le mot de passe",
  updated: "Mot de passe mis à jour.",
  expired:
    "Ce lien a expiré ou ne correspond pas à ce navigateur. Demandez un nouveau lien.",
  backLogin: "Retour à la connexion",
  demo: "Explorer la démonstration",
  account: "Mon espace",
  logout: "Se déconnecter",
  loading: "Chargement de votre espace…",
  working: "Veuillez patienter…",
  generic: "Une erreur est survenue. Réessayez dans un instant.",
  invalid: "Adresse e-mail ou mot de passe incorrect.",
  unconfirmed: "Confirmez votre adresse e-mail avant de vous connecter.",
  rateLimit: "Trop de tentatives. Patientez avant de réessayer.",
  network: "Connexion indisponible. Vérifiez votre réseau et réessayez.",
  config:
    "La connexion à Supabase n’est pas configurée. Consultez le guide de configuration.",
  passwordHint: "Au moins 12 caractères.",
  workspace: "Votre espace de travail",
  companyTitle: "Créons votre entreprise.",
  companyHint:
    "Vos données seront accessibles uniquement aux membres de votre entreprise.",
  companyName: "Nom de l’entreprise",
  country: "Pays",
  createCompany: "Créer mon entreprise",
  companies: "Vos entreprises",
  addCompany: "Ajouter une entreprise",
  owner: "Propriétaire",
  belgium: "Belgique",
  france: "France",
  netherlands: "Pays-Bas",
  workspaceHint: "Votre compte et votre entreprise sont connectés à Supabase.",
  realData: "Espace connecté",
  demoHint:
    "Les projets et devis restent disponibles dans une démonstration séparée. Leur sauvegarde en base sera la prochaine étape.",
  noCompany: "Aucune entreprise",
  loadError: "Impossible de charger vos entreprises.",
  retry: "Réessayer",
  cancel: "Annuler",
  selected: "Entreprise sélectionnée",
  select: "Ouvrir",
  verify: "Vérification de votre connexion…",
  language: "Langue",
  callbackError:
    "Le lien de connexion n’est plus valide. Reconnectez-vous ou demandez un nouveau lien.",
  signupFooter: "Vous avez déjà un compte ?",
  signinFooter: "Vous découvrez RenvoDesk ?",
  companyInvalid:
    "Renseignez un nom d’entreprise (120 caractères maximum) et un pays valide.",
};
export type AuthKey = keyof typeof fr;
const en: Record<AuthKey, string> = {
  login: "Welcome to RenvoDesk.",
  loginHint: "Sign in to your workspace.",
  email: "Email address",
  password: "Password",
  loginAction: "Sign in",
  signup: "Create an account",
  signupTitle: "Every project starts here.",
  signupHint: "Create your account, then set up your company.",
  signupAction: "Create my account",
  forgot: "Forgot your password?",
  resetTitle: "Get back to your workspace.",
  resetHint: "Receive a link to choose a new password.",
  resetAction: "Send reset link",
  resetSent:
    "If an account matches this address, a password reset link will be sent.",
  confirmation:
    "Check your inbox to confirm your account. Open the link in this browser.",
  updateTitle: "A new password.",
  updateHint: "Choose a password with at least 12 characters.",
  updateAction: "Save password",
  updated: "Password updated.",
  expired:
    "This link has expired or belongs to another browser. Request a new link.",
  backLogin: "Back to sign in",
  demo: "Explore the demo",
  account: "My workspace",
  logout: "Sign out",
  loading: "Loading your workspace…",
  working: "Please wait…",
  generic: "Something went wrong. Please try again shortly.",
  invalid: "Incorrect email address or password.",
  unconfirmed: "Confirm your email address before signing in.",
  rateLimit: "Too many attempts. Please wait before trying again.",
  network: "Connection unavailable. Check your network and try again.",
  config: "Supabase is not configured. See the setup guide.",
  passwordHint: "At least 12 characters.",
  workspace: "Your workspace",
  companyTitle: "Let’s set up your company.",
  companyHint: "Your data will only be accessible to members of your company.",
  companyName: "Company name",
  country: "Country",
  createCompany: "Create my company",
  companies: "Your companies",
  addCompany: "Add a company",
  owner: "Owner",
  belgium: "Belgium",
  france: "France",
  netherlands: "The Netherlands",
  workspaceHint: "Your account and company are connected to Supabase.",
  realData: "Connected workspace",
  demoHint:
    "Projects and estimates are still available in a separate demo. Database persistence is the next step.",
  noCompany: "No company yet",
  loadError: "Your companies could not be loaded.",
  retry: "Try again",
  cancel: "Cancel",
  selected: "Selected company",
  select: "Open",
  verify: "Verifying your session…",
  language: "Language",
  callbackError:
    "This sign-in link is no longer valid. Sign in or request a new link.",
  signupFooter: "Already have an account?",
  signinFooter: "New to RenvoDesk?",
  companyInvalid:
    "Enter a company name (up to 120 characters) and a valid country.",
};
export function useAuthCopy() {
  const { locale } = useLocale();
  return (key: AuthKey) => (locale === "fr" ? fr : en)[key];
}
export function authErrorKey(error: unknown): AuthKey {
  if (error && typeof error === "object") {
    const e = error as { code?: string; status?: number; name?: string };
    if (e.code === "invalid_credentials") return "invalid";
    if (e.code === "email_not_confirmed") return "unconfirmed";
    if (e.status === 429 || e.code?.includes("rate_limit")) return "rateLimit";
    if (e.name === "AuthRetryableFetchError" || e.name === "TypeError")
      return "network";
  }
  return "generic";
}
