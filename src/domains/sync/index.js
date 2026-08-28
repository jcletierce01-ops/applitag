/**
 * Domaine SYNC — P1.1
 *
 * Infrastructure hors ligne déjà extraite en P0.8 :
 *   - @/offline/db.js
 *   - @/offline/operation-queue.js
 *   - @/offline/sync-engine.js
 *   - @/offline/migration.js
 *   - @/offline/SyncStatus.jsx
 *
 * À intégrer progressivement dans les formulaires en P1.
 */
export { triggerSync, startAutoSync, onSyncStateChange } from '@/offline/sync-engine.js';
export { enqueueOperation, marquerEnAttente, ETATS } from '@/offline/operation-queue.js';
export { SyncStatus } from '@/offline/SyncStatus.jsx';
