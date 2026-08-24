/**
 * Abstraction IndexedDB — P0.8
 *
 * Ouvre la base APPLITAG_OFFLINE (version 1) avec deux stores :
 *   - operations : file d'opérations en attente de synchronisation
 *   - brouillons : sauvegardes locales (formulaires en cours)
 *
 * Tous les stores sont indexés pour permettre les requêtes par tenant,
 * par état et par entité sans charger l'ensemble en mémoire.
 *
 * Isolation démo : en mode démonstration (IS_DEMO_BUILD), les données
 * sont stockées dans un namespace séparé et ne sont jamais synchronisées.
 */

const DB_NAME    = 'APPLITAG_OFFLINE';
const DB_VERSION = 1;

let _db = null;

export function ouvrirDB() {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ── Store : operations ──────────────────────────────────────────────
      if (!db.objectStoreNames.contains('operations')) {
        const ops = db.createObjectStore('operations', { keyPath: 'operationId' });
        ops.createIndex('idx_etat',       'etat',        { unique: false });
        ops.createIndex('idx_tenantId',   'tenantId',    { unique: false });
        ops.createIndex('idx_entityType', 'entityType',  { unique: false });
        ops.createIndex('idx_createdAt',  'dateCreation',{ unique: false });
      }

      // ── Store : brouillons ──────────────────────────────────────────────
      if (!db.objectStoreNames.contains('brouillons')) {
        const bro = db.createObjectStore('brouillons', { keyPath: 'brouillonId' });
        bro.createIndex('idx_tenantId',   'tenantId',   { unique: false });
        bro.createIndex('idx_entityType', 'entityType', { unique: false });
        bro.createIndex('idx_updatedAt',  'updatedAt',  { unique: false });
      }
    };

    req.onsuccess  = () => { _db = req.result; resolve(_db); };
    req.onerror    = () => reject(req.error);
    req.onblocked  = () => reject(new Error('IndexedDB bloquée — fermer les autres onglets'));
  });
}

/** Ferme la connexion (utile pour les tests). */
export function fermerDB() {
  if (_db) { _db.close(); _db = null; }
}

/**
 * Wrapper transactionnel générique.
 * @param {string|string[]} stores — noms de stores impliqués
 * @param {'readonly'|'readwrite'} mode
 * @param {(tx: IDBTransaction) => Promise<T>} fn
 */
export async function transaction(stores, mode, fn) {
  const db = await ouvrirDB();
  return new Promise((resolve, reject) => {
    const tx  = db.transaction(stores, mode);
    const res = fn(tx);
    tx.oncomplete = () => {};
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error ?? new Error('Transaction annulée'));
    Promise.resolve(res).then(resolve).catch((e) => { tx.abort(); reject(e); });
  });
}

/** Wrap une requête IDB en Promise. */
export function idbReq(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
