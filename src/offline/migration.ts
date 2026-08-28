/**
 * Migration des brouillons localStorage → IndexedDB — P0.8
 *
 * Cherche les clés localStorage commençant par les préfixes connus,
 * les importe comme brouillons dans IndexedDB, puis les supprime.
 *
 * Doit être appelé une seule fois au démarrage, avant tout autre usage
 * de l'offline store.
 *
 * Préfixes migrés :
 *   applitag_visite_draft   — brouillon visite terrain
 *   applitag_lot_draft_*    — brouillons lot/contact (futurs)
 *
 * La migration est idempotente : si la clé IndexedDB existe déjà,
 * le brouillon localStorage est simplement supprimé.
 */

import { sauvegarderBrouillon } from './operation-queue.js';

const PREFIXES = [
  { prefix: 'applitag_visite_draft', entityType: 'visite' },
  { prefix: 'applitag_lot_draft_',   entityType: 'contact' },
];

let _migrationFaite = false;

/**
 * Lance la migration si elle n'a pas encore été faite dans cette session.
 * @param tenantId — identifiant du tenant courant
 * @param utilisateurId
 */
export async function migrerBrouillonsLocalStorage(tenantId: string, utilisateurId: string): Promise<void> {
  if (_migrationFaite) return;
  _migrationFaite = true;

  for (const { prefix, entityType } of PREFIXES) {
    const keysToMigrate: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) keysToMigrate.push(key);
    }

    for (const lsKey of keysToMigrate) {
      try {
        const raw = localStorage.getItem(lsKey);
        if (!raw) continue;

        const data = JSON.parse(raw) as Record<string, unknown>;
        const entityLocalId = lsKey.slice(prefix.length).replace(/^_/, '') || crypto.randomUUID();

        await sauvegarderBrouillon({
          tenantId,
          entityType,
          entityLocalId: entityLocalId || `migrated-${Date.now()}`,
          data: { ...data, _migreDepuisLocalStorage: true, _lsKey: lsKey, utilisateurId },
        });

        localStorage.removeItem(lsKey);
      } catch {
        // Brouillon corrompu : on le supprime plutôt que de bloquer
        localStorage.removeItem(lsKey);
      }
    }
  }
}
