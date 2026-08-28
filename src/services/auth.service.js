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

const KEY_TOKEN   = "applitag_token";
const KEY_USER    = "applitag_user";
const KEY_TENANT  = "applitag_entreprise_id";

/** Retourne le JWT courant, ou null si non connecté. */
export const getToken = () => localStorage.getItem(KEY_TOKEN);

/** Retourne l'objet utilisateur courant depuis localStorage, ou null. */
export const getUser = () => {
  try { return JSON.parse(localStorage.getItem(KEY_USER) || "null"); }
  catch { return null; }
};

/** Retourne l'entrepriseId courant depuis localStorage, ou null. */
export const getEntrepriseId = () => localStorage.getItem(KEY_TENANT);

/** Persiste le token, l'utilisateur et le tenant après connexion réussie. */
export const setAuth = (token, user, entrepriseId) => {
  localStorage.setItem(KEY_TOKEN,  token);
  localStorage.setItem(KEY_USER,   JSON.stringify(user));
  localStorage.setItem(KEY_TENANT, entrepriseId);
};

/** Supprime toute la session courante (déconnexion). */
export const clearAuth = () => {
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_USER);
  localStorage.removeItem(KEY_TENANT);
};

/**
 * Retourne les headers JSON + Authorization pour un appel API authentifié.
 * À utiliser dans toutes les requêtes du Core Pilot.
 */
export const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${getToken()}`,
});

/**
 * Génère un PIN opérateur 6 chiffres via l'API (crypto.randomInt côté serveur).
 * Lève une erreur explicite — ne jamais masquer l'échec avec un catch silencieux.
 */
export const genPin4 = async (apiBase) => {
  const r = await fetch(`${apiBase}/operateurs/generate-pin`, {
    method: "POST",
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!r.ok) throw new Error("Génération PIN échouée");
  return (await r.json()).pin;
};
