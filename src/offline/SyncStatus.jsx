/**
 * Indicateur de synchronisation — P0.8
 *
 * Composant léger affiché dans l'en-tête ou la barre de statut.
 * Abonnement réactif aux événements du moteur de synchronisation.
 *
 * États affichés :
 *   - Nombre d'opérations en attente (badge orange)
 *   - Synchronisation en cours (spinner)
 *   - Conflits à résoudre (badge rouge)
 *   - Tout synchronisé (badge vert)
 *   - Hors ligne (badge gris)
 */

import { useState, useEffect, useCallback } from 'react';
import { onSyncStateChange, triggerSync } from './sync-engine.js';
import { comptesParEtat, ETATS } from './operation-queue.js';

const STYLE_BASE = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
  cursor: 'default', userSelect: 'none',
};

const COULEURS = {
  sync:    { background: '#DBEAFE', color: '#1E40AF' },
  attente: { background: '#FEF3C7', color: '#92400E' },
  conflit: { background: '#FEE2E2', color: '#991B1B' },
  ok:      { background: '#D1FAE5', color: '#065F46' },
  offline: { background: '#F3F4F6', color: '#6B7280' },
};

export function SyncStatus({ tenantId, apiBase, authHeaders, onConflitClick }) {
  const [comptes, setComptes]     = useState({});
  const [enCours, setEnCours]     = useState(false);
  const [estOnline, setEstOnline] = useState(navigator.onLine);

  const rafraichir = useCallback(async () => {
    const c = await comptesParEtat(tenantId).catch(() => ({}));
    setComptes(c);
  }, [tenantId]);

  useEffect(() => {
    rafraichir();

    const unsubSync = onSyncStateChange((state) => {
      setEnCours(state.en_cours ?? false);
      rafraichir();
    });

    const onOnline  = () => setEstOnline(true);
    const onOffline = () => setEstOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      unsubSync();
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [rafraichir]);

  const enAttente  = (comptes[ETATS.EN_ATTENTE] ?? 0) + (comptes[ETATS.ENREGISTRE_LOCAL] ?? 0);
  const conflits   = comptes[ETATS.CONFLIT]  ?? 0;
  const echecs     = comptes[ETATS.ECHEC]    ?? 0;

  const handleSync = async () => {
    if (enCours || !estOnline || !authHeaders) return;
    await triggerSync({ tenantId, apiBase, authHeaders }).catch(() => {});
    rafraichir();
  };

  if (!estOnline) {
    return (
      <span style={{ ...STYLE_BASE, ...COULEURS.offline }}>
        ⊘ Hors ligne {enAttente > 0 ? `(${enAttente} en attente)` : ''}
      </span>
    );
  }

  if (enCours) {
    return (
      <span style={{ ...STYLE_BASE, ...COULEURS.sync }}>
        ↻ Synchronisation…
      </span>
    );
  }

  if (conflits > 0) {
    return (
      <span
        style={{ ...STYLE_BASE, ...COULEURS.conflit, cursor: 'pointer' }}
        onClick={onConflitClick}
        title="Des conflits nécessitent une décision manuelle"
      >
        ⚠ {conflits} conflit{conflits > 1 ? 's' : ''}
      </span>
    );
  }

  if (enAttente > 0 || echecs > 0) {
    return (
      <span
        style={{ ...STYLE_BASE, ...COULEURS.attente, cursor: 'pointer' }}
        onClick={handleSync}
        title={echecs > 0 ? `${echecs} erreur(s) — cliquer pour réessayer` : 'Cliquer pour synchroniser'}
      >
        ↑ {enAttente + echecs} en attente
      </span>
    );
  }

  return (
    <span style={{ ...STYLE_BASE, ...COULEURS.ok }}>
      ✓ Synchronisé
    </span>
  );
}
