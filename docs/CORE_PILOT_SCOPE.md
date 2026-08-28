# Périmètre pilote de production — APPLITAG

> Ce document définit les modules activés en production lors du déploiement pilote.
> Toute activation d'un module avancé doit satisfaire les critères P2 listés dans AGENTS.md.

## Modules Core Pilot (toujours actifs)

| Module | ID nav | Description |
|--------|--------|-------------|
| Tableau de bord | `dashboard` | Vue synthétique des KPI, alertes et planning |
| Planning | `planning` | Calendrier des chantiers et transports |
| Lots | `lots` | Gestion des lots bois (contact, visite, statut) |
| Chantiers | `chantiers` | Suivi des opérations d'exploitation |
| Transports | `transports` | CMR, traçabilité camions |
| Livraisons | `livraisons` | Réception chaufferie / plateforme, pesée, humidité |
| Chaufferies | `chaufferies` | Annuaires et historique réception |
| Alertes | `alertes` | Notifications opérationnelles temps réel |
| Parcelles | `parcelles` | Cadastre et cartographie parcellaire |
| Desserte | `desserte` | Accessibilité voiries et points de sortie |
| Permis chantier | `permis_incendie` | Documents de départ chantier |
| Documents | `documents` | Pièces jointes et archivage |
| Utilisateurs | `utilisateurs` | Gestion des comptes et rôles |
| Paramètres | `parametres` | Configuration de l'entreprise |

## Modules avancés (désactivés en production, actifs en démonstration)

Ces modules sont fonctionnels en mode démonstration (`VITE_APP_MODE=demo`) mais
masqués du menu de navigation en production (`VITE_APP_MODE=production`).

Ils seront activés progressivement en production après validation des critères P2 :
authentification serveur, isolation multi-tenant, RBAC, tests d'intégration.

| Module | ID nav | Flag |
|--------|--------|------|
| Scierie | `scierie` | `SCIERIE` |
| Coproduits | `coproduits` | `COPRODUITS` |
| Financements | `financements` | `FINANCEMENTS` |
| Projet financé | `projet_finance` | `PROJET_FINANCE` |
| Bilan GES | `ges` | `GES` |
| Registre IA | `registre_ia` | `REGISTRE_IA` |
| Territoire | `territoire` | `TERRITOIRE` |
| Facture électronique | `facture_elec` | `FACTURE_ELEC` |
| Conformité RED | `conformite_red` | `CONFORMITE_RED` |
| Coût RED/tonne | `cout_reglementaire` | `COUT_REGLEMENTAIRE` |
| Réglementation | `reglementation` | `REGLEMENTATION` |
| Analyses | `analyses` | `ANALYSES` |
| Rapports | `rapports` | `RAPPORTS` |
| Réseau & Offres | `reseau` | `RESEAU` |
| Abonnements | `abonnements` | `ABONNEMENTS` |
| Bois de crise | `bois_crise` | `BOIS_CRISE` |
| Fiche combustible | `fiche_comb` | `FICHE_COMB` |
| Anomalies voiries | `applitag_data` | `ANOMALIES_VOIRIES` |
| Démo scénario | `demo` | `DEMO_SCENAR` |
| Modules futurs | `futur` | `MODULES_FUTURS` |

## Procédure d'activation d'un module en production

1. Vérifier que les critères P2 sont remplis (voir `AGENTS.md §P2`)
2. Passer le flag correspondant à `true` dans `src/config/featureFlags.js`
3. Lancer `npm run build:prod` et vérifier l'absence d'erreurs
4. Créer une PR avec le livrable P2 associé
5. Obtenir une revue indépendante (cf. protocole de revue dans `AGENTS.md`)
