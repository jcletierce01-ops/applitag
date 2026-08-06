/**
 * Détection du mode applicatif.
 *
 * IS_DEMO_BUILD est évalué à la compilation par Vite (import.meta.env.VITE_APP_MODE
 * est une constante statique inlinée). En mode production, les blocs dépendants
 * de IS_DEMO_BUILD peuvent être éliminés par le tree-shaker de Rolldown.
 *
 * Ne jamais utiliser cette valeur comme contrôle de sécurité côté serveur.
 * La sécurité côté serveur est gérée par l'API (token, tenant, RBAC).
 */
export const IS_DEMO_BUILD = import.meta.env.VITE_APP_MODE === "demo";

export const APP_MODE = import.meta.env.VITE_APP_MODE ?? "demo";

export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "https://applitag-api-production.up.railway.app";
