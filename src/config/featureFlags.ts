/**
 * Registre central des feature flags APPLITAG.
 *
 * CORE PILOT — toujours actif en production.
 * MODULES AVANCÉS — actifs uniquement en mode démonstration
 *   jusqu'à ce qu'ils satisfassent les critères de production (P2).
 *
 * Pour activer un module en production : passer la valeur à `true`
 * et s'assurer que les critères P2 (auth, tenant, RBAC, tests…) sont remplis.
 */
import { IS_DEMO_BUILD } from "./env.js";

export const FEATURE_FLAGS = {
  // ── Core Pilot — toujours actif ────────────────────────────────
  DASHBOARD:        true,
  PLANNING:         true,
  LOTS:             true,
  CHANTIERS:        true,
  TRANSPORTS:       true,
  LIVRAISONS:       true,
  CHAUFFERIES:      true,
  ALERTES:          true,
  PARCELLES:        true,
  DESSERTE:         true,
  PERMIS_INCENDIE:  true,
  DOCUMENTS:        true,
  UTILISATEURS:     true,
  PARAMETRES:       true,

  // ── Modules avancés — désactivés en production (activés en démo) ─
  SCIERIE:              IS_DEMO_BUILD,
  COPRODUITS:           IS_DEMO_BUILD,
  FINANCEMENTS:         IS_DEMO_BUILD,
  PROJET_FINANCE:       IS_DEMO_BUILD,
  GES:                  IS_DEMO_BUILD,
  REGISTRE_IA:          IS_DEMO_BUILD,
  TERRITOIRE:           IS_DEMO_BUILD,
  FACTURE_ELEC:         IS_DEMO_BUILD,
  CONFORMITE_RED:       IS_DEMO_BUILD,
  COUT_REGLEMENTAIRE:   IS_DEMO_BUILD,
  REGLEMENTATION:       IS_DEMO_BUILD,
  ANALYSES:             IS_DEMO_BUILD,
  RAPPORTS:             IS_DEMO_BUILD,
  RESEAU:               IS_DEMO_BUILD,
  ABONNEMENTS:          IS_DEMO_BUILD,
  BOIS_CRISE:           IS_DEMO_BUILD,
  FICHE_COMB:           IS_DEMO_BUILD,
  ANOMALIES_VOIRIES:    IS_DEMO_BUILD,
  DEMO_SCENAR:          IS_DEMO_BUILD,
  MODULES_FUTURS:       IS_DEMO_BUILD,
} satisfies Record<string, boolean>;
