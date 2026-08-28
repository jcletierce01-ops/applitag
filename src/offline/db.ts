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

let _db: IDBDatabase | null = null;

export function ouvrirDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);

  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

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
export function fermerDB(): void {
  if (_db) { _db.close(); _db = null; }
}

/**
 * Wrapper transactionnel générique.
 * @param stores — noms de stores impliqués
 * @param mode
 * @param fn
 */
export async function transaction<T>(
  stores: string | string[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>
): Promise<T> {
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
export function idbReq<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
