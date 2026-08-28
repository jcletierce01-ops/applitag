/**
 * File d'opérations hors ligne — P0.8
 *
 * Chaque opération représente une intention de modification serveur.
 * Elle est persistée dans IndexedDB avant toute tentative réseau.
 *
 * Cycle de vie d'une opération :
 *   BROUILLON → ENREGISTRE_LOCAL → EN_ATTENTE → SYNCHRONISATION_EN_COURS
 *             → SYNCHRONISE | CONFLIT | ECHEC
 *
 * Idempotence :
 *   Chaque opération porte une idempotencyKey unique générée côté client.
 *   Le serveur la vérifie et retourne la réponse mise en cache en cas de renvoi.
 *   Format : <entityType>/<action>/<appareilId>/<uuid>
 */

import { ouvrirDB, idbReq } from './db.js';

export const ETATS = Object.freeze({
  BROUILLON:               'BROUILLON',
  ENREGISTRE_LOCAL:        'ENREGISTRE_LOCAL',
  EN_ATTENTE:              'EN_ATTENTE',
  SYNCHRONISATION_EN_COURS:'SYNCHRONISATION_EN_COURS',
  SYNCHRONISE:             'SYNCHRONISE',
  CONFLIT:                 'CONFLIT',
  ECHEC:                   'ECHEC',
} as const);

export type EtatOperation = typeof ETATS[keyof typeof ETATS];

export interface Operation {
  operationId: string;
  idempotencyKey: string;
  tenantId: string;
  utilisateurId: string;
  appareilId: string;
  entityType: string;
  entityLocalId: string;
  entityServerId: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: unknown;
  piecesJointes: string[];
  dateCreation: string;
  nombreTentatives: number;
  dernièreErreur: string | null;
  etat: EtatOperation;
}

interface Brouillon {
  brouillonId: string;
  tenantId: string;
  entityType: string;
  entityLocalId: string;
  data: unknown;
  updatedAt: string;
}

const MAX_TENTATIVES_AUTO = 3;

// ── Identifiant d'appareil ────────────────────────────────────────────────────

function getAppareilId(): string {
  let id = localStorage.getItem('applitag_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('applitag_device_id', id);
  }
  return id;
}

function genIdempotencyKey(entityType: string, action: string): string {
  return `${entityType}/${action}/${getAppareilId()}/${crypto.randomUUID()}`;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Ajoute une opération dans la file.
 * @returns operationId
 */
export async function enqueueOperation({
  tenantId,
  utilisateurId,
  entityType,
  entityLocalId,
  action,
  payload,
  piecesJointes = [],
}: {
  tenantId: string;
  utilisateurId: string;
  entityType: string;
  entityLocalId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: unknown;
  piecesJointes?: string[];
}): Promise<string> {
  const db = await ouvrirDB();
  const operationId    = crypto.randomUUID();
  const idempotencyKey = genIdempotencyKey(entityType, action);

  const op: Operation = {
    operationId,
    idempotencyKey,
    tenantId,
    utilisateurId,
    appareilId:      getAppareilId(),
    entityType,
    entityLocalId,
    entityServerId:  null,
    action,
    payload,
    piecesJointes,
    dateCreation:    new Date().toISOString(),
    nombreTentatives: 0,
    dernièreErreur:  null,
    etat:            ETATS.ENREGISTRE_LOCAL,
  };

  await idbReq(db.transaction('operations', 'readwrite').objectStore('operations').add(op));
  return operationId;
}

/** Charge une opération par son ID. */
export async function getOperation(operationId: string): Promise<Operation | undefined> {
  const db = await ouvrirDB();
  return idbReq(db.transaction('operations', 'readonly').objectStore('operations').get(operationId));
}

/** Liste toutes les opérations d'un tenant dans un état donné. */
export async function listerParEtat(etat: EtatOperation, tenantId?: string): Promise<Operation[]> {
  const db   = await ouvrirDB();
  const tx   = db.transaction('operations', 'readonly');
  const idx  = tx.objectStore('operations').index('idx_etat');
  const tout = await idbReq(idx.getAll(etat)) as Operation[];
  return tout.filter(op => !tenantId || op.tenantId === tenantId);
}

/** Liste toutes les opérations en attente de synchronisation (EN_ATTENTE + ECHEC récupérable). */
export async function listerASync(tenantId?: string): Promise<Operation[]> {
  const [enAttente, echecs] = await Promise.all([
    listerParEtat(ETATS.EN_ATTENTE, tenantId),
    listerParEtat(ETATS.ECHEC, tenantId),
  ]);
  const echecsRecup = echecs.filter(op => op.nombreTentatives < MAX_TENTATIVES_AUTO);
  return [...enAttente, ...echecsRecup].sort((a, b) =>
    a.dateCreation.localeCompare(b.dateCreation),
  );
}

/**
 * Met à jour l'état d'une opération.
 * En cas de succès, enregistre l'entityServerId.
 */
export async function mettreAJourEtat(
  operationId: string,
  etat: EtatOperation,
  { entityServerId, erreur }: { entityServerId?: string | null; erreur?: string | null } = {}
): Promise<void> {
  const db = await ouvrirDB();
  const tx = db.transaction('operations', 'readwrite');
  const store = tx.objectStore('operations');
  const op = await idbReq(store.get(operationId)) as Operation | undefined;
  if (!op) return;

  op.etat = etat;
  if (entityServerId !== undefined) op.entityServerId = entityServerId;
  if (erreur !== undefined)         op.dernièreErreur = erreur;
  if (etat === ETATS.SYNCHRONISATION_EN_COURS) op.nombreTentatives += 1;

  await idbReq(store.put(op));
}

/** Marque une opération comme prête à synchroniser. */
export async function marquerEnAttente(operationId: string): Promise<void> {
  return mettreAJourEtat(operationId, ETATS.EN_ATTENTE);
}

/** Résumé du nombre d'opérations par état pour le tenant. */
export async function comptesParEtat(tenantId?: string): Promise<Record<string, number>> {
  const db   = await ouvrirDB();
  const tx   = db.transaction('operations', 'readonly');
  const tout = await idbReq(tx.objectStore('operations').getAll()) as Operation[];
  const filtre = tout.filter(op => !tenantId || op.tenantId === tenantId);
  return filtre.reduce<Record<string, number>>((acc, op) => {
    acc[op.etat] = (acc[op.etat] ?? 0) + 1;
    return acc;
  }, {});
}

// ── Brouillons ────────────────────────────────────────────────────────────────

/**
 * Sauvegarde un brouillon de formulaire (un seul par couple entityType+entityLocalId).
 */
export async function sauvegarderBrouillon({
  tenantId, entityType, entityLocalId, data,
}: {
  tenantId: string;
  entityType: string;
  entityLocalId: string;
  data: unknown;
}): Promise<void> {
  const db = await ouvrirDB();
  const brouillon: Brouillon = {
    brouillonId: `${entityType}:${entityLocalId}`,
    tenantId,
    entityType,
    entityLocalId,
    data,
    updatedAt: new Date().toISOString(),
  };
  await idbReq(db.transaction('brouillons', 'readwrite').objectStore('brouillons').put(brouillon));
}

/** Charge un brouillon existant. */
export async function chargerBrouillon(entityType: string, entityLocalId: string): Promise<Brouillon | undefined> {
  const db = await ouvrirDB();
  return idbReq(
    db.transaction('brouillons', 'readonly')
      .objectStore('brouillons')
      .get(`${entityType}:${entityLocalId}`),
  );
}

/** Supprime un brouillon après synchronisation réussie. */
export async function supprimerBrouillon(entityType: string, entityLocalId: string): Promise<void> {
  const db = await ouvrirDB();
  await idbReq(
    db.transaction('brouillons', 'readwrite')
      .objectStore('brouillons')
      .delete(`${entityType}:${entityLocalId}`),
  );
}

/** Liste tous les brouillons d'un tenant. */
export async function listerBrouillons(tenantId?: string): Promise<Brouillon[]> {
  const db   = await ouvrirDB();
  const tx   = db.transaction('brouillons', 'readonly');
  const tout = await idbReq(tx.objectStore('brouillons').getAll()) as Brouillon[];
  return tout.filter(b => !tenantId || b.tenantId === tenantId);
}
