/**
 * Moteur de synchronisation — P0.8
 *
 * Stratégie :
 *   - Déclenché lors du passage online (window 'online' event).
 *   - Déclenché manuellement par l'utilisateur via triggerSync().
 *   - Traite les opérations EN_ATTENTE + ECHEC (< MAX_TENTATIVES) dans l'ordre FIFO.
 *   - Chaque opération est envoyée avec son idempotencyKey → le serveur déduplique.
 *   - Pas de retry automatique sur une opération non idempotente (DELETE, UPDATE hors lot).
 *   - En cas de conflit (409), passe l'opération en CONFLIT pour décision humaine.
 *   - En cas d'erreur réseau, laisse en ECHEC pour la prochaine tentative.
 *
 * Isolation démo : le moteur ne tente aucune synchronisation en mode démo.
 */

import {
  ETATS,
  listerASync,
  mettreAJourEtat,
} from './operation-queue.js';

const IS_DEMO_BUILD = import.meta.env.VITE_APP_MODE === 'demo';

// ── État du moteur ────────────────────────────────────────────────────────────

let _enCours   = false;
let _listeners = [];

/** Abonne un callback aux changements d'état de la synchronisation. */
export function onSyncStateChange(fn) {
  _listeners.push(fn);
  return () => { _listeners = _listeners.filter(l => l !== fn); };
}

function notifier(etat) {
  _listeners.forEach(fn => fn(etat));
}

// ── Envoi d'une opération ─────────────────────────────────────────────────────

const ENDPOINT_MAP = {
  contact:          { CREATE: '/contacts',  UPDATE: '/contacts/:id', DELETE: '/contacts/:id'  },
  visite:           { CREATE: '/visites',   UPDATE: '/visites/:id',  DELETE: '/visites/:id'   },
  releve_abatteur:  { CREATE: '/releves-abatteur', UPDATE: '/releves-abatteur/:id' },
  releve_debardeur: { CREATE: '/releves-debardeur' },
};

function buildUrl(apiBase, entityType, action, entityServerId) {
  const map = ENDPOINT_MAP[entityType];
  if (!map) throw new Error(`entityType inconnu : ${entityType}`);
  const tpl = map[action];
  if (!tpl) throw new Error(`action ${action} non gérée pour ${entityType}`);
  return apiBase + (entityServerId ? tpl.replace(':id', entityServerId) : tpl.replace('/:id', ''));
}

async function envoyerOperation(op, { apiBase, authHeaders }) {
  const method = op.action === 'CREATE' ? 'POST'
               : op.action === 'UPDATE' ? 'PATCH'
               : 'DELETE';

  const url = buildUrl(apiBase, op.entityType, op.action, op.entityServerId);

  const headers = {
    'Content-Type':    'application/json',
    'Idempotency-Key': op.idempotencyKey,
    'X-Entity-Type':   op.entityType,
    ...authHeaders,
  };

  const res = await fetch(url, {
    method,
    headers,
    body: op.action !== 'DELETE' ? JSON.stringify(op.payload) : undefined,
    signal: AbortSignal.timeout(30_000),
  });

  if (res.ok) {
    const data = res.json ? await res.json().catch(() => ({})) : {};
    return { ok: true, data, replay: res.headers.get('X-Idempotency-Replay') === 'true' };
  }

  if (res.status === 409) return { ok: false, conflit: true, status: 409 };
  if (res.status === 401) return { ok: false, authExpired: true, status: 401 };
  if (res.status === 403) return { ok: false, interdit: true, status: 403 };

  const errMsg = await res.text().catch(() => `HTTP ${res.status}`);
  return { ok: false, status: res.status, erreur: errMsg };
}

// ── Moteur principal ──────────────────────────────────────────────────────────

/**
 * Synchronise toutes les opérations en attente.
 * @param {object} options
 * @param {string} options.tenantId
 * @param {string} options.apiBase          ex: https://applitag-api-production.up.railway.app
 * @param {()=>object} options.authHeaders  callback retournant les headers Bearer à jour
 * @returns {Promise<{traitees: number, erreurs: number, conflits: number}>}
 */
export async function triggerSync({ tenantId, apiBase, authHeaders }) {
  if (IS_DEMO_BUILD) return { traitees: 0, erreurs: 0, conflits: 0 };
  if (_enCours) return { traitees: 0, erreurs: 0, conflits: 0 };

  _enCours = true;
  notifier({ en_cours: true });

  let traitees = 0, erreurs = 0, conflits = 0;

  try {
    const file = await listerASync(tenantId);

    for (const op of file) {
      await mettreAJourEtat(op.operationId, ETATS.SYNCHRONISATION_EN_COURS);

      try {
        const resultat = await envoyerOperation(op, { apiBase, authHeaders: authHeaders() });

        if (resultat.ok) {
          await mettreAJourEtat(op.operationId, ETATS.SYNCHRONISE, {
            entityServerId: resultat.data?.id ?? op.entityServerId,
          });
          traitees++;
        } else if (resultat.conflit) {
          await mettreAJourEtat(op.operationId, ETATS.CONFLIT, {
            erreur: 'Conflit détecté (409) — décision manuelle requise',
          });
          conflits++;
        } else if (resultat.authExpired || resultat.interdit) {
          // Pas de retry automatique — l'utilisateur doit se reconnecter
          await mettreAJourEtat(op.operationId, ETATS.ECHEC, {
            erreur: `Erreur d'autorisation (${resultat.status})`,
          });
          erreurs++;
          break;
        } else {
          await mettreAJourEtat(op.operationId, ETATS.ECHEC, {
            erreur: resultat.erreur ?? `Erreur serveur (${resultat.status})`,
          });
          erreurs++;
        }
      } catch (e) {
        // Erreur réseau ou timeout — passe en ECHEC pour la prochaine tentative
        await mettreAJourEtat(op.operationId, ETATS.ECHEC, {
          erreur: e?.message ?? 'Erreur réseau',
        });
        erreurs++;
      }
    }
  } finally {
    _enCours = false;
    notifier({ en_cours: false, traitees, erreurs, conflits });
  }

  return { traitees, erreurs, conflits };
}

// ── Auto-sync sur reconnexion ─────────────────────────────────────────────────

let _autoSyncContext = null;

/**
 * Active la synchronisation automatique lors du passage online.
 * Doit être appelé une seule fois au démarrage de l'application.
 */
export function startAutoSync(context) {
  if (IS_DEMO_BUILD) return () => {};
  _autoSyncContext = context;

  const handler = () => {
    if (navigator.onLine && _autoSyncContext) {
      triggerSync(_autoSyncContext).catch(() => {});
    }
  };

  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

/** Met à jour le contexte (token JWT renouvelé, etc.). */
export function setAutoSyncContext(context) {
  _autoSyncContext = context;
}
