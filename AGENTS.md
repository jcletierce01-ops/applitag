# AGENTS.md — Cadre de mission APPLITAG

## PROJET : APPLITAG

Tu travailles dans le dépôt existant d'APPLITAG.

APPLITAG est une application métier de sécurisation de la chaîne bois-énergie, centrée sur le lot unique et reliant notamment :
contact, propriétaire, parcelle, visite terrain, ordre d'exploitation, chantier, relevés journaliers, clôture, déchiquetage, transport, livraison, documents et traçabilité.

---

## OBJECTIF ACTUEL

Nous ne sommes plus dans une phase d'ajout massif de fonctionnalités.
Nous sommes dans une phase de **sécurisation et d'industrialisation du Core Pilot**.

---

## RÈGLES IMPÉRATIVES

1. Inspecte le dépôt, le frontend, le backend, les modèles de données et les scripts avant de modifier le code.
2. Ne réécris pas toute l'application.
3. Travaille uniquement sur le périmètre demandé dans la mission.
4. Ne supprime aucune fonctionnalité existante sans justification.
5. Préserve le mode démonstration, mais isole-le strictement de la production.
6. Ne crée jamais de faux succès en cas d'échec API.
7. Ne fabrique jamais de donnée métier, GPS, signature, pesée ou synchronisation.
8. Toute règle de sécurité ou de workflow doit être appliquée côté serveur, pas seulement dans l'interface.
9. Toute donnée doit être isolée par entreprise/tenant.
10. N'ajoute pas de formule métier nouvelle sans source et validation explicites.
11. Ajoute les tests de non-régression correspondant à chaque correction.
12. N'effectue pas de migration destructive sans procédure de retour arrière.
13. Ne masque pas une erreur avec un catch silencieux.
14. Ne marque pas la mission comme terminée si le build, le typage ou les tests échouent.
15. Effectue des modifications atomiques et faciles à relire.

---

## LIVRABLE FINAL OBLIGATOIRE

À la fin de chaque mission, fournis :

- le résumé des modifications ;
- les fichiers créés ou modifiés ;
- les migrations de données ou de base ;
- les tests ajoutés ;
- les commandes de validation exécutées ;
- leurs résultats ;
- les risques restant ouverts ;
- les éventuelles actions manuelles nécessaires ;
- le hash ou le message du commit réalisé.

Ne commence aucune autre priorité que celle demandée.

---

## ROADMAP DE MISSIONS

### Phase P0 — Sécurisation fondamentale

| ID   | Titre                                           | Branche suggérée                        |
|------|-------------------------------------------------|-----------------------------------------|
| P0.1 | Séparation démonstration / production           | `hardening/demo-production-separation`  |
| P0.2 | Corrections d'urgence et faux succès            | `hotfix/core-pilot-runtime-errors`      |
| P0.3 | Authentification, RBAC et multi-tenant          | `security/auth-rbac-multitenant`        |
| P0.4 | Sécurisation des identifiants, PIN et codes     | `security/secure-codes`                 |
| P0.5 | Numérotation serveur des lots                   | `core/server-lot-numbering`             |
| P0.6 | Workflow et transitions métier serveur          | `core/lot-state-machine`                |
| P0.7 | Unités et formules métier                       | `core/units-formulas`                   |
| P0.8 | Véritable moteur hors ligne                     | `offline/sync-engine`                   |

### Phase P1 — Architecture et qualité

| ID   | Titre                                           | Branche suggérée                        |
|------|-------------------------------------------------|-----------------------------------------|
| P1.1 | Découpage du monolithe                          | `refactor/frontend-domains`             |
| P1.2 | Migration TypeScript et schémas partagés        | `architecture/typescript-schemas`       |
| P1.3 | Client API centralisé                           | `architecture/api-client`               |
| P1.4 | Journal d'événements immuable                   | `audit/event-log`                       |
| P1.5 | Documents, signatures et médias                 | `documents/secure-media`                |
| P1.6 | Stratégie de tests et CI                        | `quality/core-pilot-ci`                 |

### Phase P2 — Réactivation progressive des modules avancés

| ID | Titre                                                     | Branche suggérée         |
|----|-----------------------------------------------------------|--------------------------|
| P2 | Cadre de réactivation des modules avancés                 | `modules/readiness-framework` |

---

## CORE PILOT — PÉRIMÈTRE ACTIF EN PRODUCTION

- contacts et propriétaires ;
- lots ;
- visite terrain ;
- ordres d'exploitation ;
- suivi journalier ;
- clôture d'exploitation ;
- déchiquetage ;
- transport ;
- livraison ;
- documents essentiels ;
- alertes ;
- rôles et droits ;
- synchronisation hors ligne.

## MODULES À DÉSACTIVER PAR DÉFAUT EN PRODUCTION

- Scierie avancée ;
- Coproduits avancés ;
- Financements ;
- GES avancé ;
- Registre IA ;
- Territoire ;
- Facturation électronique avancée ;
- Academy ;
- Radio ;
- TV ;
- autres modules non nécessaires au pilote.

---

## PROTOCOLE DE REVUE INDÉPENDANTE

Avant chaque fusion :

1. Relis le prompt initial de la mission.
2. Compare chaque critère d'acceptation avec le code réellement produit.
3. Inspecte le diff complet.
4. Recherche : régressions, erreurs silencieuses, contournements de sécurité, dépendances inutiles, duplication, secrets, accès inter-tenant, faux succès, perte de données, tests insuffisants.
5. Exécute : lint, typecheck, tests, build, migrations de test.
6. Ne corrige que les défauts directement liés à la mission.
7. Fournis une conclusion : **GO** / **GO SOUS RÉSERVES** / **NO-GO**.
8. Pour chaque réserve, indique : gravité, fichier, scénario de reproduction, correction nécessaire.
9. Ne déclare jamais GO lorsqu'un critère d'acceptation n'est pas démontré.

---

## DÉTAIL DES MISSIONS

---

### MISSION P0.1 — ISOLER LE MODE DÉMONSTRATION DE LA PRODUCTION

Analyse le dépôt APPLITAG et mets en place une séparation stricte entre :

- le Core Pilot de production ;
- le mode démonstration ;
- les modules avancés non encore industrialisés.

**Objectifs**

1. Les données fictives, utilisateurs fictifs, PIN de démonstration, rôles fictifs et scénarios fictifs ne doivent jamais être chargés dans une exécution de production.
2. Les modules non retenus dans le Core Pilot doivent rester présents dans le dépôt, mais être désactivés par des feature flags.
3. Le comportement de repli local utilisé pour la démonstration ne doit jamais faire croire à une réussite en production.
4. Le mode actif doit être identifiable sans ambiguïté.

**Travail attendu**

- Créer une configuration d'environnement explicite.
- Créer un registre central des feature flags.
- Déplacer toutes les données `DEMO_*` dans un espace dédié.
- Supprimer du flux de production tout accès caché par PIN ou identifiant de démonstration.
- Empêcher l'import des données de démo dans le bundle de production lorsque l'architecture le permet.
- Afficher un bandeau clair lorsque l'application fonctionne en démonstration.
- Documenter le périmètre dans `docs/CORE_PILOT_SCOPE.md`.
- Ajouter des scripts de démarrage et de build distincts pour démo et production.
- Ne pas modifier l'apparence ni le parcours métier du Core Pilot.

**Critères d'acceptation**

- Le build de production ne permet pas de se connecter avec un PIN de démonstration.
- Aucun utilisateur `DEMO_*` n'est créé ou chargé en production.
- Aucun module avancé désactivé n'apparaît dans la navigation de production.
- Le mode démonstration continue de fonctionner avec ses données fictives.
- L'échec d'une API de production ne bascule pas automatiquement vers une fausse donnée de démonstration.
- Les tests vérifient les deux configurations.
- Le build production et le build démonstration réussissent.

---

### MISSION P0.2 — CORRECTIONS D'URGENCE ET SUPPRESSION DES FAUX SUCCÈS

Effectue une correction ciblée des erreurs d'exécution et comportements trompeurs actuellement identifiés dans APPLITAG.

**Corrections minimales attendues**

1. Dans l'édition d'une fiche lot :
   - le tableau réellement créé s'appelle `btns` ;
   - le code utilise actuellement une variable `actionsVisible` inexistante ;
   - corrige la logique des colonnes et l'affichage des boutons en utilisant la collection correcte ;
   - ajoute un test de rendu pour plusieurs nombres d'actions.

2. Dans la carte des lots :
   - le code calcule une variable `gps` pouvant provenir de plusieurs sources ;
   - les limites de carte ne doivent jamais utiliser directement `v.gps` lorsque `v` peut être absent ;
   - utilise exclusivement la position normalisée réellement calculée ;
   - ajoute des tests pour : lot avec GPS direct, lot avec GPS issu d'une visite, lot avec centroïde de département, lot sans aucune position.

3. Dans la palette :
   - recense toutes les références à des tokens inexistants, notamment `C.tx1` ;
   - remplace-les par le token canonique adapté ou complète proprement le design system ;
   - ajoute un contrôle statique empêchant la réutilisation de tokens non déclarés.

4. Dans l'enregistrement d'une visite :
   - en cas d'échec API, ne supprime jamais le brouillon ;
   - ne jamais afficher « visite enregistrée localement » si aucune persistance durable n'a réellement eu lieu ;
   - introduire au minimum les états : `ENREGISTREE_SERVEUR`, `EN_ATTENTE_SYNCHRONISATION`, `ECHEC_ENREGISTREMENT` ;
   - tant que le moteur hors ligne complet n'existe pas, conserver le brouillon et afficher une erreur explicite.

5. Dans tous les enregistrements métier critiques :
   - rechercher les `catch` silencieux qui produisent un message de réussite ;
   - corriger uniquement ceux concernant le Core Pilot ;
   - ne pas étendre cette mission aux autres refactorings.

6. GPS :
   - en cas d'échec de géolocalisation, enregistrer `GPS_INDISPONIBLE` ;
   - ne plus fabriquer de coordonnées aléatoires ou prédéfinies ;
   - conserver éventuellement un comportement simulé uniquement dans le mode démonstration isolé.

**Critères d'acceptation**

- Aucun `ReferenceError` sur les actions de fiche lot.
- Aucun crash de la carte selon l'origine du GPS.
- Aucun token de palette non défini dans les écrans concernés.
- Une visite non transmise n'est jamais présentée comme synchronisée.
- Le brouillon reste disponible après échec et rechargement.
- Aucune coordonnée fictive n'est créée en production.
- Des tests de régression couvrent chacun de ces cas.
- Lint, build et tests réussissent.

---

### MISSION P0.3 — AUTHENTIFICATION SERVEUR, RBAC ET ISOLATION MULTI-TENANT

Sécurise le Core Pilot APPLITAG pour que les données d'une entreprise ne puissent jamais être consultées ou modifiées par une autre entreprise.

**Principe non négociable**

Toute autorisation doit être déterminée côté serveur selon :

```
tenant + utilisateur + rôle + ressource + action
```

Le frontend ne constitue jamais une barrière de sécurité.

**Travail attendu**

1. Auditer toutes les routes API utilisées par le Core Pilot.
2. Classer chaque route comme : publique explicitement autorisée, authentifiée, réservée à certains rôles.
3. Appliquer une politique « authentification obligatoire par défaut ».
4. Limiter les routes publiques à une allowlist documentée : connexion, création publique APPLITAG Connect si maintenue, validation d'un code temporaire selon règles sécurisées, aucune route de lecture globale des contacts, lots, visites ou activités.
5. Le tenant doit provenir du contexte d'authentification serveur : ne jamais faire confiance à `entrepriseId` reçu dans le body ; ne jamais utiliser le tenant de `localStorage` comme preuve d'autorisation.
6. Ajouter un modèle clair de rôles et permissions : administrateur, manager, mandataire, opérateur, déchiqueteur, chauffeur, réceptionnaire, propriétaire / contact Connect, autres rôles réellement présents.
7. Pour APPLITAG Connect : supprimer les téléchargements globaux de contacts, déchiquetages ou activités ; créer des routes `/me` ou `/mon-espace` ; le serveur doit retourner uniquement les lots et informations autorisés pour le compte connecté ; ne jamais filtrer une liste globale par téléphone dans le navigateur.
8. Ajouter des protections contre : accès horizontal à un autre lot, modification d'un autre tenant, élévation de rôle, falsification d'`entrepriseId`, accès à un document d'un autre tenant.
9. Choisir un mécanisme de session adapté à l'architecture : privilégier un cookie sécurisé, `HttpOnly` et `SameSite` pour le web ; sinon utiliser des jetons courts et un stockage sécurisé documenté ; ne pas conserver durablement un jeton de production sensible dans `localStorage`.
10. Ajouter rate limiting, expiration de session et révocation.
11. Produire `docs/SECURITY_MODEL.md` avec : matrice rôles/actions, routes publiques, règles tenant, méthode de session, risques résiduels.

**Tests obligatoires**

- Un utilisateur du tenant A ne lit aucun lot du tenant B.
- Un administrateur du tenant A ne modifie pas le tenant B.
- Un opérateur ne change pas le prix d'un lot.
- Un chauffeur ne clôture pas une exploitation.
- Un compte Connect ne reçoit que ses propres données.
- `entrepriseId` falsifié dans le body est ignoré ou rejeté.
- Une ressource inexistante et une ressource interdite ne divulguent pas d'information sensible.
- Une route non déclarée publique exige une authentification.

**Livrable supplémentaire** : matrice complète rôle × ressource × action × décision autorisée/interdite.

---

### MISSION P0.4 — SÉCURISER IDENTIFIANTS, PIN, CODES ET SECRETS

Remplace tous les mécanismes de génération ou de conservation non sécurisés utilisés dans le Core Pilot.

**Problèmes à traiter**

- identifiants générés avec `Math.random()` ;
- codes d'ordre générés dans le navigateur ;
- PIN générés dans le navigateur ;
- PIN ou codes conservés en clair ;
- PIN parfois retournés au frontend ;
- accès de démonstration caché dans le flux normal ;
- codes sans expiration, tentative maximale ou usage unique.

**Travail attendu**

1. Inventorier tous les usages de : `Math.random()`, `uid` local, `genCode`, `genCodeAPT`, `genPin`, code QR, PIN administrateur, PIN opérateur, code d'ordre, code d'accès lot.
2. Classer chaque valeur comme : identifiant technique, secret, code temporaire, donnée de démonstration.
3. Pour les identifiants : les générer côté serveur, utiliser UUID/ULID ou la stratégie déjà retenue dans le backend, imposer une contrainte d'unicité en base.
4. Pour les secrets et PIN : génération cryptographiquement sûre côté serveur, stockage sous forme hachée, ne jamais retourner le hash, limiter le nombre de tentatives, journaliser les échecs sans journaliser le secret, permettre révocation et réinitialisation.
5. Pour les codes temporaires : expiration, usage unique lorsque le métier le permet, association stricte à un tenant, une ressource et une action, impossibilité d'utiliser le code pour une autre mission, protection contre l'énumération.
6. Pour APPLITAG Connect : ne plus conserver le code personnel en clair dans `localStorage`, mettre en place une vraie session serveur, prévoir un parcours de récupération/réinitialisation.
7. Supprimer tout accès caché de production, notamment les PIN codés en dur.
8. Conserver les comptes fictifs uniquement dans le mode démo isolé.
9. Nettoyer les anciennes données locales sensibles lors de la migration.
10. Ajouter une procédure de migration ou de réinitialisation pour les comptes existants.

**Critères d'acceptation**

- Aucun secret de production n'est généré par `Math.random()`.
- Aucun PIN en clair n'est conservé en base ou dans `localStorage`.
- Aucun PIN ou secret n'apparaît dans les logs.
- Les codes expirés sont rejetés.
- Les codes révoqués sont rejetés.
- Les tentatives excessives sont bloquées.
- Un code appartenant au tenant A ne fonctionne pas dans le tenant B.
- Les tests de sécurité sont présents.

---

### MISSION P0.5 — NUMÉROTATION TRANSACTIONNELLE DES LOTS CÔTÉ SERVEUR

Déplace entièrement la génération du numéro de lot vers le backend.

**Format métier actuel** : `LOT-AAAA-MM-DDD-NNN` (séquence actuellement calculée dans le navigateur).

**Objectif** : garantir qu'aucun doublon de numéro de lot ne puisse être créé, y compris lors de créations simultanées, hors ligne ou multi-utilisateurs.

**Travail attendu**

1. Identifier la règle métier exacte du numéro : année, mois, département, séquence, périmètre de séquence (tenant, département, mois ou année).
2. Documenter cette règle dans `docs/LOT_NUMBERING.md`.
3. Créer un service backend dédié.
4. Générer le numéro dans une transaction de base de données.
5. Ajouter une contrainte d'unicité en base.
6. Ne jamais accepter comme numéro définitif une valeur calculée par le client.
7. Le frontend peut afficher : soit « numéro attribué à l'enregistrement », soit un aperçu clairement marqué PROVISOIRE ; jamais un numéro présenté comme définitif avant confirmation serveur.
8. Prévoir le fonctionnement hors ligne : identifiant local temporaire, numéro officiel attribué lors de la synchronisation, mise à jour des références locales liées.
9. Prévoir une migration pour les lots existants : détecter les doublons, conserver l'historique, ne pas renuméroter silencieusement un document déjà émis.
10. Adapter les documents et références associées.

**Tests obligatoires**

- Création de plusieurs dizaines de lots en parallèle sans doublon.
- Créations simultanées sur deux appareils.
- Deux tenants peuvent suivre leur propre règle sans collision.
- Un numéro déjà utilisé est refusé par la base.
- Un lot hors ligne reçoit ensuite un numéro officiel sans perdre ses relations.
- Les documents existants restent rattachés au bon lot.

---

### MISSION P0.6 — MACHINE D'ÉTATS SERVEUR POUR LE CYCLE DE VIE DU LOT

Transforme les changements de statut du lot en véritable workflow métier contrôlé côté serveur.

**Objectif** : empêcher toute transition incohérente, même si le frontend est modifié, une requête API est forgée, deux utilisateurs agissent simultanément, ou un utilisateur ne possède pas le rôle requis.

**Travail attendu**

1. Recenser tous les statuts actuellement utilisés dans le code et la base.
2. Identifier les doublons, alias et statuts obsolètes.
3. Produire `docs/LOT_STATE_MACHINE.md` avec : liste canonique des statuts, transitions autorisées/interdites, rôles autorisés, champs et preuves nécessaires, conséquences automatiques, possibilités d'annulation ou de correction.
4. Flux métier de base : nouveau → visite prévue → visite réalisée → validé pour exploitation → exploitation en cours → bord de route → à déchiqueter → déchiquetage en cours → livraison → stock plateforme ou livraison chaufferie → clôture finale.
5. Identifier les embranchements plateforme/chaufferie, retours ou corrections, annulation, refus, alerte, blocage réglementaire.
6. Créer des commandes métier serveur : `planifierVisite`, `validerVisite`, `autoriserExploitation`, `demarrerExploitation`, `cloturerExploitation`, `demarrerDechiquetage`, `enregistrerDepart`, `confirmerReception`.
7. Interdire la modification libre de `statutLot` par un PATCH générique.
8. Exiger les données nécessaires à chaque transition.
9. Retourner au frontend : statut actuel, actions autorisées, raisons des actions bloquées.
10. Ajouter un mécanisme de version ou verrou optimiste pour éviter les modifications concurrentes.
11. Enregistrer chaque transition dans le journal d'audit.
12. Adapter l'interface pour qu'elle utilise les actions autorisées renvoyées par le serveur.

**Tests obligatoires**

- Impossible de livrer un lot non déchiqueté lorsque le workflow l'exige.
- Impossible de clôturer sans rôle autorisé.
- Impossible de démarrer une exploitation non autorisée.
- Impossible de sauter une étape réglementaire obligatoire.
- Deux transitions simultanées contradictoires ne sont pas acceptées.
- Le serveur refuse une transition même si le bouton frontend est forcé.
- Chaque transition autorisée crée un événement d'audit.

---

### MISSION P0.7 — MOTEUR D'UNITÉS ET FORMULES MÉTIER VERSIONNÉES

Audite, sécurise et centralise les calculs du Core Pilot APPLITAG.

**Principe absolu** : ne pas inventer ou corriger intuitivement une formule forestière, énergétique ou réglementaire. Lorsqu'une formule n'est pas scientifiquement ou métier validée : la marquer `NON_VALIDEE`, bloquer son utilisation comme donnée probante, conserver éventuellement son affichage en démonstration avec une mention explicite.

**Calculs à auditer en priorité** : cubage par diamètre, hauteur et population ; conversion m³ apparent / m³ réel ; conversion volume / tonnes ; densités par essence ; foisonnement ; humidité ; PCI et énergie ; calculs pondérés par essence ; poids ajusté selon humidité ; cumul abattage/débardage ; comparaisons estimation, bord de route, chargement et pesée réception.

**Anomalies connues à traiter** : humidité calculée à partir de `1 - foisonnement` ; conversion d'un tonnage en m³ par simple division par le foisonnement ; cubage d'une tige assimilée à un cylindre complet sans coefficient de forme ; incohérences possibles entre tonnes, kg/m³, MWh/t et MWh ; ambiguïté entre volume apparent, volume solide et volume de plaquettes.

**Travail attendu**

1. Inventorier toutes les formules et constantes dans le dépôt.
2. Les déplacer dans un domaine métier centralisé.
3. Pour chaque formule, définir : identifiant, version, libellé, source, statut de validation, unités d'entrée, unité de sortie, domaine de validité, hypothèses, incertitude, date de validation, auteur de validation.
4. Créer un modèle de quantité explicite avec : valeur, unité, origine (MESUREE / DECLAREE / CALCULEE / ESTIMEE / SIMULEE), méthode, formuleVersion, incertitude, date, auteur.
5. Ne plus manipuler des nombres métier sans unité identifiable.
6. Utiliser des types ou schémas empêchant les mélanges : tonne, kilogramme, m³ solide, m³ apparent, MAP, hectare, humidité sur brut ou sur sec, MWh, MWh/t.
7. Pour les calculs non validés : ne pas les utiliser dans un document officiel ; afficher « estimation non validée » ; ne pas produire de conformité RED automatique.
8. Créer `docs/METIER_FORMULAS_REGISTER.md`.
9. Préparer une table de cas de référence à faire valider ultérieurement par un expert métier.
10. Ajouter des tests dimensionnels et des tests de non-régression.

**Critères d'acceptation**

- Aucun calcul d'humidité ne dépend du foisonnement.
- Aucun résultat ne mélange tonne et m³ sans densité ou méthode définie.
- Chaque résultat énergétique indique ses unités.
- Chaque calcul affiche son origine et sa version.
- Les calculs non validés sont clairement neutralisés en production probante.
- Aucun nouveau coefficient n'est inventé.

---

### MISSION P0.8 — MOTEUR HORS LIGNE DURABLE POUR LE CORE PILOT

Remplace les replis localStorage dispersés par un véritable mécanisme hors ligne durable et vérifiable.

**Objectif** : garantir qu'une donnée saisie en forêt survive à un rechargement et une fermeture, soit identifiable comme non synchronisée, soit retransmise sans doublon, et ne soit jamais annoncée comme synchronisée avant accusé serveur.

**Périmètre Core Pilot** : création contact/lot, visite terrain, photos et pièces jointes, ordre d'exploitation, rapport journalier, clôture, déchiquetage, transport, livraison.

**Architecture attendue**

1. Abstraction de stockage durable : IndexedDB pour le client web/PWA actuel ; possibilité d'un adaptateur SQLite pour une future application native.
2. File d'opérations : `operationId`, `idempotencyKey`, `tenantId`, `utilisateurId`, `appareilId`, `entityType`, `entityLocalId`, `entityServerId` éventuel, `action`, `payload`, pièces jointes, `dateCreation`, `nombreTentatives`, `dernièreErreur`, état.
3. États minimum : `BROUILLON`, `ENREGISTRE_LOCAL`, `EN_ATTENTE`, `SYNCHRONISATION_EN_COURS`, `SYNCHRONISE`, `CONFLIT`, `ECHEC`.
4. Clés d'idempotence côté serveur.
5. Ne jamais réessayer automatiquement une opération non idempotente sans protection.
6. Stratégie de reprise progressive et non agressive.
7. Gestion des dépendances : lot local créé avant sa visite, photo rattachée au bon identifiant serveur, numéro officiel de lot remplaçant le numéro temporaire.
8. Gestion des conflits : afficher les deux versions, ne jamais écraser silencieusement, permettre une décision autorisée selon le rôle.
9. Écran de synchronisation : éléments en attente, synchronisés, conflits, erreurs, nouvelle tentative, détail lisible.
10. Pièces jointes en Blob, pas en énorme chaîne base64 dans localStorage.
11. Remplacement progressif des anciens replis locaux.
12. Migration des brouillons existants.
13. Journalisation exploitable.

**Tests obligatoires**

- Saisie d'une visite en mode avion.
- Fermeture complète puis réouverture.
- La visite et ses photos sont encore présentes.
- Reconnexion puis synchronisation.
- Le serveur ne crée qu'une seule visite malgré plusieurs tentatives.
- Coupure pendant l'envoi d'une photo.
- Conflit entre deux appareils.
- Refus serveur pour droit insuffisant.
- Changement d'identifiant local vers identifiant serveur.
- Aucun message « synchronisé » avant confirmation serveur.

---

### MISSION P1.1 — REFACTORING PROGRESSIF DU FRONTEND MONOLITHIQUE

Découpe le principal fichier React APPLITAG en architecture modulaire, sans changement fonctionnel volontaire.

**Contrainte** : ce chantier est un refactoring. Il ne doit ni ajouter de module, ni modifier les règles métier, ni modifier les parcours utilisateurs, ni changer les contrats API.

**Structure cible**

```
src/
  app/
  config/
  design-system/
  components/
  domains/
    auth/
    contacts/
    lots/
    visites/
    exploitation/
    dechiquetage/
    transport/
    livraison/
    documents/
    sync/
    connect/
  services/
  shared/
  demo/
```

**Méthode** : commencer par design tokens, composants atomiques, fonctions de formatage, données de démonstration, constantes métier, services API. Ensuite extraire les écrans domaine par domaine. Éviter un déplacement massif en un seul commit. Conserver des exports temporaires lorsque nécessaire. Éliminer progressivement les états globaux dupliqués. Identifier les données relevant de l'état local, d'un store, du cache serveur ou du moteur hors ligne. Ne pas créer de nouvelle architecture abstraite sans usage réel. Ajouter `docs/FRONTEND_ARCHITECTURE.md`.

**Critères d'acceptation**

- Le comportement visible reste identique.
- Les tests avant/après passent.
- Aucun domaine ne dépend directement des données de démo en production.
- Les composants réutilisables ne contiennent pas de logique métier cachée.
- Les règles métier sont séparées des composants visuels.
- Le build réussit à chaque étape.
- Les commits restent relisibles et réversibles.

---

### MISSION P1.2 — TYPESCRIPT STRICT ET SCHÉMAS DE DONNÉES PARTAGÉS

Migre progressivement le Core Pilot APPLITAG vers TypeScript strict et ajoute une validation runtime des données.

**Objectifs** : détecter les variables inexistantes, empêcher les statuts ou unités invalides, garantir la cohérence frontend/backend, sécuriser les payloads API, préparer le mode hors ligne.

**Travail attendu**

1. Activer TypeScript en mode strict progressivement — ne pas convertir tout le dépôt dans un seul commit.
2. Commencer par : design tokens, identifiants, statuts, quantités et unités, DTO API, erreurs, événements, file de synchronisation.
3. Créer des schémas runtime partagés avec l'outil compatible avec la stack existante.
4. Chaque payload entrant doit être validé côté serveur. Chaque réponse API importante doit être validée ou typée côté client.
5. Définir des types distincts pour : `LotLocal`, `LotServeur`, `LotSynchronise`, `VisiteBrouillon`, `VisiteValidee`, `QuantiteMetier`, `CoordonnéeGPSVérifiée`, `CoordonnéeIndisponible`, `StatutLot`, `ActionAutorisee`.
6. Éviter `any`. Ajouter des unions discriminées pour les états de synchronisation.
7. Produire une stratégie de migration documentée. Ajouter un contrôle CI typecheck.

**Critères d'acceptation**

- Les références à des variables inexistantes sont détectées au build.
- Un statut inconnu ne peut pas être envoyé sans erreur.
- Une quantité sans unité est refusée dans le domaine métier.
- Un payload API invalide produit une erreur structurée.
- Les écrans migrés ne contiennent pas de `any` non justifié.
- Typecheck et tests réussissent.

---

### MISSION P1.3 — CLIENT API UNIQUE POUR APPLITAG

Remplace les appels fetch dispersés du Core Pilot par un client API centralisé et typé.

**Objectifs** : appliquer l'authentification de façon homogène, normaliser les erreurs, distinguer erreur réseau et erreur métier, gérer idempotence et synchronisation, éviter les catch silencieux.

**Travail attendu**

1. Inventorier tous les appels fetch du Core Pilot.
2. Créer : un client authentifié, un client public strictement limité, des services par domaine.
3. Le client doit gérer : base URL par environnement, session, en-têtes communs, correlation ID, idempotency key, timeout, réponse non JSON, erreurs 400/401/403/404/409/422/429/500, état hors ligne, annulation de requête.
4. Ne pas réessayer automatiquement un POST non idempotent.
5. Ne jamais injecter `entrepriseId` depuis localStorage comme preuve de tenant.
6. Créer des erreurs structurées : `NetworkError`, `AuthenticationError`, `AuthorizationError`, `ValidationError`, `ConflictError`, `ServerError`.
7. Adapter progressivement les domaines.
8. Interdire les nouveaux appels directs par règle ESLint ou contrôle statique.
9. Autoriser uniquement des exceptions documentées pour les fournisseurs cartographiques externes.
10. Ajouter tests unitaires et d'intégration.

**Critères d'acceptation**

- Aucun fetch direct dans les domaines migrés.
- Une erreur réseau n'est pas confondue avec une réussite locale.
- Un 403 produit un message adapté, sans fuite de données.
- Un 409 déclenche un état de conflit.
- Les appels publics n'accèdent pas aux routes internes.
- Tous les appels possèdent des types d'entrée et de sortie.

---

### MISSION P1.4 — JOURNAL D'AUDIT ET HISTORIQUE IMMUABLE

Mets en place un journal d'événements serveur permettant de reconstituer les actions importantes réalisées sur un lot.

**Objectifs** : traçabilité, responsabilité, diagnostic, preuve de synchronisation, historique des transitions, détection des modifications sensibles.

**Données minimales d'un événement** : `eventId`, `tenantId`, `entityType`, `entityId`, `entityVersion`, `action`, `actorId`, `actorRole`, `dateHeureServeur`, `appareilId` si disponible, `correlationId`, `source` (ONLINE / OFFLINE_SYNC / IMPORT / SYSTEM), données avant/après ou diff, motif, résultat, `idempotencyKey` éventuelle.

**Travail attendu**

1. Créer un stockage append-only côté serveur.
2. Aucun utilisateur applicatif ne doit modifier ou supprimer un événement.
3. Enregistrer au minimum : création lot, visite validée, changement de statut, changement de prix, affectation d'une entreprise, ordre accepté/refusé, clôture, pesée, livraison, génération ou signature de document, synchronisation hors ligne, correction administrative.
4. Masquer les secrets et données inutiles. Ne pas dupliquer des pièces jointes dans le journal.
5. Créer une API de lecture autorisée.
6. Adapter l'écran historique pour utiliser ce journal.
7. Ajouter des filtres par date, acteur, action et lot.
8. Documenter la politique de conservation.
9. Ajouter des tests d'immuabilité et de tenant.

**Critères d'acceptation**

- Chaque transition du lot crée un événement.
- L'événement indique clairement qui a fait quoi et quand.
- Un utilisateur du tenant A ne lit pas le journal du tenant B.
- Un utilisateur normal ne modifie ni ne supprime un événement.
- Une opération hors ligne synchronisée conserve sa date locale et sa date serveur.
- Une opération rejouée avec la même clé d'idempotence ne crée pas de faux doublon.

---

### MISSION P1.5 — DOCUMENTS, MÉDIAS ET SIGNATURES FIABLES

Remplace les mécanismes de démonstration par une chaîne documentaire sécurisée pour le Core Pilot.

**Périmètre** : photos terrain, photos de plateforme, pièces jointes, bons et rapports, CMR, bons de livraison, signatures manuscrites sur écran, génération PDF, archivage.

**Travail attendu**

1. Photos : capturer de vrais fichiers, compression contrôlée, stockage objet sécurisé, hash, type MIME, taille, date, auteur, tenant, lot, coordonnées si autorisées, statut de synchronisation.
2. Ne plus stocker durablement de grandes images base64 dans localStorage ou les payloads JSON.
3. Prévoir des URL temporaires signées. Interdire l'accès à un média d'un autre tenant.
4. Ajouter un contrôle du type de fichier et de la taille.
5. PDF : générer côté serveur, modèles versionnés, texte sélectionnable, pagination, données échappées, identifiant documentaire, hash, archivage de la version émise.
6. Signature : empêcher la validation d'un canvas vide, conserver l'image de signature séparément, rattacher identité/consentement/document/hash/date/session, ne pas présenter une simple signature dessinée comme une signature électronique qualifiée, documenter sa valeur et ses limites.
7. Statut documentaire : `BROUILLON`, `GENERE`, `A_SIGNER`, `SIGNE`, `ARCHIVE`, `ANNULE`.
8. Une nouvelle version ne doit pas écraser une version signée.
9. Ajouter tests de sécurité et de génération.

**Critères d'acceptation**

- Un canvas vide ne peut pas être validé.
- Une photo réelle survit au mode hors ligne.
- Un média d'un autre tenant est inaccessible.
- Un PDF long se répartit correctement sur plusieurs pages.
- Le texte du PDF est sélectionnable.
- La version et le hash sont enregistrés.
- Une version signée est immuable.

---

### MISSION P1.6 — STRATÉGIE DE TESTS ET PIPELINE DE VALIDATION

Crée une stratégie de tests adaptée au Core Pilot APPLITAG et configure une CI bloquant les régressions critiques.

**Niveaux de tests**

1. Tests unitaires : unités et formules, transitions, permissions, formatage, idempotence, gestion des conflits.
2. Tests API : authentification, validation, isolation tenant, rôles, transitions, création lot, synchronisation.
3. Tests composants : formulaires, boutons autorisés, erreurs, états de synchronisation, accessibilité essentielle.
4. Tests E2E : création contact → lot → visite → autorisation → exploitation → clôture → déchiquetage → transport → livraison → document final.
5. Tests hors ligne : mode avion, fermeture/réouverture, synchronisation, doublon, conflit, pièce jointe.
6. Tests sécurité : accès inter-tenant, élévation de privilège, falsification d'identifiant, code expiré, brute force, accès document.

**Pipeline CI** (à chaque pull request) : installation propre, lint, typecheck, tests unitaires, tests API, build production, contrôle des migrations, recherche de secrets, analyse des dépendances, E2E essentiels.

**Règles** : aucun test critique désactivé pour faire passer la CI, aucun test dépendant de données réelles, données de démonstration isolées dans des fixtures, tests multi-tenant avec au moins deux tenants distincts, résultats publiés dans le rapport de CI.

**Critères d'acceptation**

- Une pull request ne peut pas être fusionnée si build ou tests critiques échouent.
- Les scénarios Core Pilot possèdent une couverture E2E.
- Les règles de rôle et de tenant ont une matrice automatisée.
- Le scénario hors ligne principal est automatisé.
- Les migrations sont testées sur une base vierge et une base existante.

---

### MISSION P2 — CADRE DE RÉACTIVATION DES MODULES AVANCÉS

Ne développe pas et ne réactive pas tous les modules avancés dans cette mission. Crée d'abord une méthode permettant de réactiver chaque module individuellement, sans fragiliser le Core Pilot.

**Modules concernés** : Desserte, Scierie, Coproduits, RED, GES, Financements, autres modules désactivés.

**Principe** : chaque module doit être une extension du Core APPLITAG et non une copie autonome de l'application. APPLITAG Scierie ne doit pas être un clone du produit ; il doit prolonger le lot unique avec réception scierie, transformation, rendement, produits principaux, coproduits, stocks et expéditions.

**Travail attendu**

1. Créer une matrice de maturité par module.
2. Définir pour chaque module : objectif métier, acteurs, entités, relations avec le lot, permissions, règles de tenant, besoins hors ligne, documents, calculs et unités, événements d'audit, tests, données personnelles, dépendances externes.
3. Feature flag par module : activable par environnement, par tenant, éventuellement par rôle.
4. Aucun module ne peut passer en production avant de satisfaire : authentification, isolation tenant, RBAC, validation serveur, historique, typage, client API centralisé, tests, gestion des erreurs, unités validées, documentation.
5. Proposer un ordre de réactivation en fonction de : valeur commerciale, dépendance au Core, risque réglementaire, coût de sécurisation.
6. Produire `docs/MODULE_READINESS_MATRIX.md`.
7. Sélectionner un seul module candidat pour le sprint suivant.
8. Ne pas coder ce module dans cette mission.

**Livrable final** : tableau module × valeur métier × dépendances × niveau actuel × risques × travaux requis × tests requis × décision GO/NO-GO × ordre recommandé.
