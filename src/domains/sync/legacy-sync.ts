/**
 * Synchronisation legacy : retente l'envoi des enregistrements locaux non synchronisés.
 *
 * Ce module gère le repli localStorage pour trois entités en attente d'endpoints API
 * garantis stables. Appelé au chargement de l'app admin — silencieux par conception :
 * les erreurs réseau sont attendues (hors-ligne, API indisponible) et ne doivent pas
 * bloquer l'utilisateur.
 */

import { API_BASE_URL } from "@/config/env.js";
import { ordresExplLocalGet, ordresExplLocalSave } from "@/domains/exploitation/local-storage.js";
import { annoncesLocalGet, annoncesLocalSave, comptesLocalGet, comptesLocalSave } from "@/domains/connect/local-storage.js";

interface SyncRecord {
  synced?: boolean;
  [key: string]: unknown;
}

const SYNC_SOURCES = [
  { get: ordresExplLocalGet, save: ordresExplLocalSave, url: `${API_BASE_URL}/ordres-exploitation` },
  { get: annoncesLocalGet,   save: annoncesLocalSave,   url: `${API_BASE_URL}/annonces` },
  { get: comptesLocalGet,    save: comptesLocalSave,    url: `${API_BASE_URL}/comptes-contact` },
];

export const countPendingSync = (): number =>
  SYNC_SOURCES.reduce((s, src) => s + (src.get() as SyncRecord[]).filter(r => !r.synced).length, 0);

export const resyncPendingRecords = async (): Promise<void> => {
  for (const src of SYNC_SOURCES) {
    const records = src.get() as SyncRecord[];
    let changed = false;
    for (const r of records) {
      if (r.synced) continue;
      try {
        const res = await fetch(src.url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        if (res.ok) { r.synced = true; changed = true; }
      } catch {
        // silence intentionnel — erreur réseau attendue hors-ligne
      }
    }
    if (changed) src.save(records as unknown[]);
  }
};
