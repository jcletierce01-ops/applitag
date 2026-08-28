/**
 * Service d'authentification — tokens JWT et session utilisateur
 *
 * Source unique pour la lecture/écriture du token en localStorage.
 * Toute logique applicative qui a besoin du token doit passer ici.
 *
 * Isolation sécurité :
 *   - Ne jamais utiliser le token pour une vérification d'autorisation côté client.
 *   - Toute vérification d'identité et de droits est faite côté serveur (RBAC).
 *   - Le frontend utilise le token uniquement pour porter l'identité dans les requêtes.
 */

const KEY_TOKEN  = "applitag_token";
const KEY_USER   = "applitag_user";
const KEY_TENANT = "applitag_entreprise_id";

/** Forme minimale de l'objet utilisateur stocké en session. */
export type SessionUser = Record<string, unknown>;

/** Retourne le JWT courant, ou null si non connecté. */
export const getToken = (): string | null => localStorage.getItem(KEY_TOKEN);

/** Retourne l'objet utilisateur courant depuis localStorage, ou null. */
export const getUser = (): SessionUser | null => {
  try {
    const raw = localStorage.getItem(KEY_USER);
    const parsed: unknown = JSON.parse(raw ?? "null");
    return parsed !== null && typeof parsed === "object" ? (parsed as SessionUser) : null;
  } catch {
    return null;
  }
};

/** Retourne l'entrepriseId courant depuis localStorage, ou null. */
export const getEntrepriseId = (): string | null => localStorage.getItem(KEY_TENANT);

/** Persiste le token, l'utilisateur et le tenant après connexion réussie. */
export const setAuth = (token: string, user: SessionUser, entrepriseId: string): void => {
  localStorage.setItem(KEY_TOKEN,  token);
  localStorage.setItem(KEY_USER,   JSON.stringify(user));
  localStorage.setItem(KEY_TENANT, entrepriseId);
};

/** Supprime toute la session courante (déconnexion). */
export const clearAuth = (): void => {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_TENANT);
};

/**
 * Retourne les headers JSON + Authorization pour un appel API authentifié.
 * À utiliser dans toutes les requêtes du Core Pilot.
 */
export const authHeaders = (): { "Content-Type": string; Authorization: string } => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/**
 * Génère un PIN opérateur 6 chiffres via l'API (crypto.randomInt côté serveur).
 * Lève une erreur explicite — ne jamais masquer l'échec avec un catch silencieux.
 */
export const genPin4 = async (apiBase: string): Promise<string> => {
  const r = await fetch(`${apiBase}/operateurs/generate-pin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error("Génération PIN échouée");
  const json = (await r.json()) as { pin: string };
  return json.pin;
};
