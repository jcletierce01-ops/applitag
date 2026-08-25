/**
 * Client API centralisé — P1.3
 *
 * Source unique pour tous les appels réseau vers le backend APPLITAG.
 * Toute la logique d'auth, d'encodage JSON et de gestion d'erreur HTTP
 * est ici — les composants n'ont plus à les gérer manuellement.
 *
 * Conventions :
 *   - Toutes les méthodes lancent une Error typée sur réponse non-ok.
 *   - Ne jamais faire de catch silencieux autour de ces appels.
 *   - Les endpoints publics (login, annonces sans auth) utilisent postPublic / getPublic.
 */

import { API_BASE_URL } from "@/config/env.js";
import { authHeaders, clearAuth } from "@/services/auth.service.js";

const BASE = API_BASE_URL;

// Garde contre les rechargements multiples si plusieurs requêtes simultanées reçoivent un 401.
let _sessionExpired = false;

const onUnauthorized = () => {
  if (_sessionExpired) return;
  _sessionExpired = true;
  clearAuth();
  window.location.reload();
};

/**
 * Décode la réponse : JSON si content-type le dit, texte sinon.
 * Lance une ApiError sur status >= 400.
 * Sur 401 : efface la session et recharge la page (token expiré ou révoqué).
 */
const handle = async (res) => {
  if (!res.ok) {
    if (res.status === 401) onUnauthorized();
    let detail = "";
    try { const j = await res.json(); detail = j.message || j.error || ""; } catch {}
    const err = new Error(`API ${res.status}${detail ? ` — ${detail}` : ""}`);
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return null;
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
};

const authJson = () => ({ ...authHeaders(), "Content-Type": "application/json" });

/** GET authentifié */
export const apiGet = (path) =>
  fetch(`${BASE}${path}`, { headers: authHeaders() }).then(handle);

/** GET public (sans token) */
export const apiGetPublic = (path) =>
  fetch(`${BASE}${path}`).then(handle);

/** POST authentifié avec corps JSON */
export const apiPost = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: authJson(),
    body: JSON.stringify(body),
  }).then(handle);

/** POST public (login, inscription, annonces sans compte) */
export const apiPostPublic = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(handle);

/** PATCH authentifié avec corps JSON */
export const apiPatch = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: authJson(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }).then(handle);

/** PUT authentifié avec corps JSON */
export const apiPut = (path, body) =>
  fetch(`${BASE}${path}`, {
    method: "PUT",
    headers: authJson(),
    body: JSON.stringify(body),
  }).then(handle);

/** DELETE authentifié */
export const apiDelete = (path) =>
  fetch(`${BASE}${path}`, { method: "DELETE", headers: authHeaders() }).then(handle);
