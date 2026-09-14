/**
 * Client API centralisé — P1.3
 *
 * Source unique pour tous les appels réseau vers le backend APPLITAG.
 * Toute la logique d'auth, d'encodage JSON et de gestion d'erreur HTTP
 * est ici — les composants n'ont plus à les gérer manuellement.
 *
 * Conventions :
 *   - Toutes les méthodes lancent une ApiError typée sur réponse non-ok.
 *   - Ne jamais faire de catch silencieux autour de ces appels.
 *   - Les endpoints publics (login, annonces sans auth) utilisent postPublic / getPublic.
 */

import { API_BASE_URL } from "@/config/env.js";
import { authHeaders, clearAuth } from "@/services/auth.service.js";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const BASE = API_BASE_URL;

// Garde contre les rechargements multiples si plusieurs requêtes simultanées reçoivent un 401.
let _sessionExpired = false;

const onUnauthorized = (): void => {
  if (_sessionExpired) return;
  _sessionExpired = true;
  clearAuth();
  window.location.reload();
};

const extractDetail = async (res: Response): Promise<string> => {
  try {
    const j = await res.json() as { message?: string; error?: string };
    return j.message ?? j.error ?? "";
  } catch { return ""; }
};

/**
 * Décode la réponse : JSON si content-type le dit, texte sinon.
 * Lance une ApiError sur status >= 400.
 * Sur 401 : efface la session et recharge la page (token expiré ou révoqué).
 */
const handle = async (res: Response): Promise<unknown> => {
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    const detail = await extractDetail(res);
    throw new ApiError(`API ${res.status}${detail ? ` — ${detail}` : ""}`, res.status);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? res.json() : res.text();
};

/** Variante sans déclenchement de onUnauthorized — pour les endpoints publics où 401 = mauvais identifiants. */
const handlePublic = async (res: Response): Promise<unknown> => {
  if (!res.ok) {
    const detail = await extractDetail(res);
    throw new ApiError(`API ${res.status}${detail ? ` — ${detail}` : ""}`, res.status);
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") ?? "";
  return ct.includes("application/json") ? res.json() : res.text();
};

const authJson = (): Record<string, string> => ({
  ...authHeaders(),
  "Content-Type": "application/json",
});

/** GET authentifié */
export const apiGet = (path: string): Promise<unknown> =>
  fetch(`${BASE}${path}`, { headers: authHeaders() }).then(handle);

/** GET public (sans token) */
export const apiGetPublic = (path: string): Promise<unknown> =>
  fetch(`${BASE}${path}`).then(handlePublic);

/** POST authentifié avec corps JSON */
export const apiPost = (path: string, body: unknown): Promise<unknown> =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authJson(),
    body: JSON.stringify(body),
  }).then(handle);

/** POST public (login, inscription, annonces sans compte) */
export const apiPostPublic = (path: string, body: unknown): Promise<unknown> =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handlePublic);

/** PATCH authentifié avec corps JSON */
export const apiPatch = (path: string, body?: unknown): Promise<unknown> =>
  fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: authJson(),
    body: body !== undefined ? JSON.stringify(body) : null,
  }).then(handle);

/** PUT authentifié avec corps JSON */
export const apiPut = (path: string, body: unknown): Promise<unknown> =>
  fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: authJson(),
    body: JSON.stringify(body),
  }).then(handle);

/** DELETE authentifié */
export const apiDelete = (path: string): Promise<unknown> =>
  fetch(`${BASE}${path}`, { method: "DELETE", headers: authHeaders() }).then(handle);
