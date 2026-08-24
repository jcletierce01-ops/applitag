/**
 * Registre centralisé des formules métier APPLITAG — P0.7
 *
 * Règle impérative (AGENTS.md §10) :
 * Aucun coefficient n'est inventé dans ce fichier. Chaque formule ou constante
 * doit référencer une source normative ou être explicitement marquée NON_VALIDEE.
 *
 * Statuts :
 *   VALIDEE     — source normative ou expertise métier vérifiée
 *   NON_VALIDEE — approximation ou absence de source : NE PAS utiliser dans un document probant
 *   EN_REVISION — validation en cours
 */

export const STATUT = Object.freeze({
  VALIDEE: 'VALIDEE',
  NON_VALIDEE: 'NON_VALIDEE',
  EN_REVISION: 'EN_REVISION',
});

export const UNITES = Object.freeze({
  M3_APPARENT:  'm³ apparent (tas)',
  M3_REEL:      'm³ bois plein (solide)',
  TONNE:        'tonne (t)',
  KG:           'kilogramme (kg)',
  KG_PAR_M3:   'kg/m³',
  MWH:          'MWh',
  MWH_PAR_T:   'MWh/t',
  MJ:           'MJ',
  POURCENT:     '%',
  ADIM:         'adimensionnel',
  METRE:        'm',
  HECTARE:      'ha',
  JOUR:         'jour',
  KG_CO2_EQ_PAR_MJ: 'gCO₂eq/MJ',
});

// ── CONSTANTES VALIDÉES ──────────────────────────────────────────────────────

export const HUMIDITE_REF_ITEBE = {
  id: 'HUMIDITE_REF_ITEBE',
  version: '1.0.0',
  libelle: 'Humidité de référence pour laquelle les densités ITEBE sont calibrées',
  valeur: 50,
  unite: UNITES.POURCENT,
  source: 'ITEBE 2004 — Guide des indices de calcul bois énergie',
  statut: STATUT.VALIDEE,
  hypotheses: 'Bois fraîchement abattu (bois vert), tous feuillus et résineux',
};

export const PCI_BOIS_ANHYDRE = {
  id: 'PCI_BOIS_ANHYDRE',
  version: '1.0.0',
  libelle: 'PCI du bois parfaitement sec (humidité 0%)',
  valeur: 5.18,
  unite: UNITES.MWH_PAR_T,
  source: 'NF EN ISO 18125 (simplifiée pour le bois)',
  statut: STATUT.VALIDEE,
};

export const CHALEUR_VAPORISATION_EAU = {
  id: 'CHALEUR_VAPORISATION_EAU',
  version: '1.0.0',
  libelle: 'Énergie consommée par la vaporisation de l\'eau dans la combustion',
  valeur: 0.68,
  unite: UNITES.MWH_PAR_T,
  source: 'Constante thermodynamique (chaleur latente vaporisation eau ≈ 2441 kJ/kg = 0.678 MWh/t)',
  statut: STATUT.VALIDEE,
};

// ── INDICES PAR ESSENCE — source ITEBE 2004 ──────────────────────────────────
// Toute modification de ces valeurs exige une nouvelle version et une source validée.

export const INDICES_ESSENCE = {
  peuplier:      { densite:850,  pci:2.4, foisonnement:0.40, hauteurMoy:25 },
  peupliers:     { densite:850,  pci:2.4, foisonnement:0.40, hauteurMoy:25 },
  chene:         { densite:1000, pci:3.8, foisonnement:0.55, hauteurMoy:20 },
  hetre:         { densite:1000, pci:4.0, foisonnement:0.55, hauteurMoy:22 },
  charme:        { densite:1000, pci:4.2, foisonnement:0.55, hauteurMoy:15 },
  frene:         { densite:900,  pci:3.9, foisonnement:0.52, hauteurMoy:20 },
  bouleau:       { densite:950,  pci:3.7, foisonnement:0.50, hauteurMoy:15 },
  orme:          { densite:960,  pci:3.8, foisonnement:0.52, hauteurMoy:18 },
  acacia:        { densite:1050, pci:4.1, foisonnement:0.55, hauteurMoy:15 },
  chataignier:   { densite:870,  pci:3.5, foisonnement:0.50, hauteurMoy:18 },
  fruitiers:     { densite:950,  pci:3.7, foisonnement:0.50, hauteurMoy:12 },
  erables:       { densite:950,  pci:3.8, foisonnement:0.52, hauteurMoy:18 },
  tilleul:       { densite:800,  pci:3.3, foisonnement:0.48, hauteurMoy:18 },
  aulne:         { densite:800,  pci:3.3, foisonnement:0.48, hauteurMoy:18 },
  saule:         { densite:780,  pci:3.0, foisonnement:0.42, hauteurMoy:15 },
  pin_sylvestre: { densite:830,  pci:3.0, foisonnement:0.45, hauteurMoy:25 },
  pin_maritime:  { densite:830,  pci:3.0, foisonnement:0.45, hauteurMoy:25 },
  sapin:         { densite:850,  pci:2.8, foisonnement:0.45, hauteurMoy:28 },
  epicea:        { densite:850,  pci:2.8, foisonnement:0.45, hauteurMoy:28 },
  meleze:        { densite:900,  pci:3.0, foisonnement:0.46, hauteurMoy:26 },
  douglas:       { densite:870,  pci:2.9, foisonnement:0.45, hauteurMoy:28 },
  resineux:      { densite:870,  pci:2.8, foisonnement:0.45, hauteurMoy:25 },
  melange:       { densite:950,  pci:3.5, foisonnement:0.50, hauteurMoy:20 },
  taillis:       { densite:900,  pci:3.5, foisonnement:0.48, hauteurMoy:12 },
};

export const DENSITE_DEFAUT = 950; // kg/m³ — utilisé si l'essence est inconnue

// ── FORMULES VALIDÉES ────────────────────────────────────────────────────────

/**
 * Calcule le PCI (Pouvoir Calorifique Inférieur) du bois en MWh/t
 * en fonction de son humidité sur brut (%).
 * Source : NF EN ISO 18125 (formulation simplifiée).
 */
export const calculerPci = (humPct) => {
  const w = Math.min(0.95, Math.max(0, (humPct || 0) / 100));
  return Math.max(0, PCI_BOIS_ANHYDRE.valeur * (1 - w) - CHALEUR_VAPORISATION_EAU.valeur * w);
};
calculerPci.meta = {
  id: 'FORMULE_PCI',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'NF EN ISO 18125',
  uniteEntree: { humPct: UNITES.POURCENT },
  uniteSortie: UNITES.MWH_PAR_T,
};

/**
 * Corrige le poids d'un lot bois en fonction de son humidité mesurée.
 * Les densités ITEBE sont calibrées à H_ref=50% (bois vert).
 * poids(H) = volume × densité_verte × (1 − H_réf/100) / (1 − H_mesurée/100)
 * Source : ITEBE 2004.
 */
export const calculerPoidsAjuste = (volumeM3, densiteKgM3, humiditePct) => {
  const h = Math.min(95, Math.max(0, parseFloat(humiditePct)));
  const facteur = (1 - HUMIDITE_REF_ITEBE.valeur / 100) / (1 - h / 100);
  return volumeM3 * densiteKgM3 * facteur / 1000;
};
calculerPoidsAjuste.meta = {
  id: 'FORMULE_POIDS_AJUSTE_HUMIDITE',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'ITEBE 2004',
  uniteEntree: { volumeM3: UNITES.M3_REEL, densiteKgM3: UNITES.KG_PAR_M3, humiditePct: UNITES.POURCENT },
  uniteSortie: UNITES.TONNE,
  hypotheses: `Densités ITEBE calibrées à ${HUMIDITE_REF_ITEBE.valeur}% d'humidité`,
};

/**
 * Volume apparent d'un tas rectangulaire.
 * Source : géométrie euclidienne.
 */
export const calculerVolApparent = (nbTas, longueurM, largeurM, hauteurM) =>
  nbTas * longueurM * largeurM * hauteurM;
calculerVolApparent.meta = {
  id: 'FORMULE_VOL_TAS',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'Géométrie euclidienne — standard filière bois énergie',
  uniteSortie: UNITES.M3_APPARENT,
};

/**
 * Conversion m³ apparent → m³ bois plein via le foisonnement ITEBE.
 * Source : ITEBE 2004.
 */
export const calculerVolReel = (volApparentM3, foisonnement) =>
  volApparentM3 * foisonnement;
calculerVolReel.meta = {
  id: 'FORMULE_FOISONNEMENT',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'ITEBE 2004',
  uniteEntree: { volApparentM3: UNITES.M3_APPARENT, foisonnement: UNITES.ADIM },
  uniteSortie: UNITES.M3_REEL,
  domaine: 'foisonnement ∈ [0.30, 0.65]',
};

/**
 * Conversion m³ bois plein → tonnes via densité essence.
 * Source : ITEBE 2004.
 */
export const calculerMasse = (volReelM3, densiteKgM3) =>
  volReelM3 * densiteKgM3 / 1000;
calculerMasse.meta = {
  id: 'FORMULE_VOL_VERS_MASSE',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'ITEBE 2004',
  uniteEntree: { volReelM3: UNITES.M3_REEL, densiteKgM3: UNITES.KG_PAR_M3 },
  uniteSortie: UNITES.TONNE,
};

/**
 * Énergie totale d'un lot (MWh).
 * Résultat en MWh = masse (t) × PCI (MWh/t).
 */
export const calculerEnergie = (masseTonnes, pciMWhParT) =>
  masseTonnes * pciMWhParT;
calculerEnergie.meta = {
  id: 'FORMULE_ENERGIE_MWH',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'ITEBE 2004 / NF EN ISO 18125',
  uniteEntree: { masseTonnes: UNITES.TONNE, pciMWhParT: UNITES.MWH_PAR_T },
  uniteSortie: UNITES.MWH,
};

// ── FORMULES NON VALIDÉES ────────────────────────────────────────────────────

/**
 * ⚠ NON_VALIDEE — Estimation empirique de l'humidité depuis le foisonnement.
 *
 * Cette relation n'est pas validée scientifiquement. Le lien entre foisonnement
 * et humidité est indirect et dépend fortement de l'essence, du séchage et des
 * conditions terrain. Elle sert uniquement à pré-remplir le champ humidité quand
 * aucune mesure directe n'est disponible.
 *
 * À remplacer par une mesure d'humidimètre dès que possible.
 * NE PAS utiliser dans un document officiel ou probant.
 */
export const estimerHumiditeDepuisFoisonnement = (foisonnement) =>
  Math.round((1 - foisonnement) * 100);
estimerHumiditeDepuisFoisonnement.meta = {
  id: 'FORMULE_HUMIDITE_DEPUIS_FOISONNEMENT',
  version: '1.0.0',
  statut: STATUT.NON_VALIDEE,
  source: null,
  avertissement: 'Relation non validée. Ne pas utiliser comme donnée probante.',
  uniteEntree: { foisonnement: UNITES.ADIM },
  uniteSortie: UNITES.POURCENT,
};

/**
 * ⚠ NON_VALIDEE — Cubage peuplement par formule cylindrique (sans coefficient de forme).
 *
 * Un arbre forestier n'est pas un cylindre parfait. Un coefficient de forme Vf
 * (≈ 0.40-0.70 selon essence et sylviculture) est requis pour un cubage précis.
 * Sans Vf, cette formule surestime le volume réel de 40 à 150%.
 *
 * Méthodes validées : tarifs de cubage INRAE, méthode de Huber, méthode de Smalian.
 * NE PAS utiliser comme mesure probante dans un document officiel.
 */
export const estimerVolumeParHa = (popParHa, diametreCm, surfaceHa, densiteKgM3, hauteurMoy) => {
  const nbTiges = parseFloat(popParHa) || 0;
  const dM = (parseFloat(diametreCm) || 0) / 100;
  const volUnit = (Math.PI / 4) * dM * dM * (hauteurMoy || 20);
  const volTotal = volUnit * nbTiges * (parseFloat(surfaceHa) || 0);
  return Math.round((volTotal * densiteKgM3 / 1000) * 100) / 100;
};
estimerVolumeParHa.meta = {
  id: 'FORMULE_CUBAGE_CYLINDRE',
  version: '1.0.0',
  statut: STATUT.NON_VALIDEE,
  source: 'Géométrie euclidienne — sans coefficient de forme Vf',
  avertissement: 'Surestimation systématique du volume réel (40-150%). Utiliser uniquement '
    + 'comme ordre de grandeur. Tarifs de cubage INRAE recommandés pour usage probant.',
  uniteEntree: {
    popParHa: UNITES.ADIM, diametreCm: UNITES.METRE,
    surfaceHa: UNITES.HECTARE, densiteKgM3: UNITES.KG_PAR_M3, hauteurMoy: UNITES.METRE,
  },
  uniteSortie: UNITES.TONNE,
};

/**
 * Indices pondérés par la composition réelle du lot (tableau {id, pct}).
 * Retourne les indices du mélange par défaut si le tableau est vide.
 * Source : ITEBE 2004.
 */
export const indicesPonderes = (essences) => {
  if (!essences?.length) return INDICES_ESSENCE.melange;
  const total = essences.reduce((s, e) => s + e.pct, 0) || 100;
  const get = id => INDICES_ESSENCE[id] || INDICES_ESSENCE.melange;
  return {
    densite:      essences.reduce((s, e) => s + get(e.id).densite * e.pct, 0) / total,
    pci:          essences.reduce((s, e) => s + get(e.id).pci * e.pct, 0) / total,
    foisonnement: essences.reduce((s, e) => s + get(e.id).foisonnement * e.pct, 0) / total,
    hauteurMoy:   essences.reduce((s, e) => s + get(e.id).hauteurMoy * e.pct, 0) / total,
  };
};
indicesPonderes.meta = {
  id: 'FORMULE_INDICES_PONDERES',
  version: '1.0.0',
  statut: STATUT.VALIDEE,
  source: 'ITEBE 2004 — pondération par surface terrière de chaque essence',
  uniteEntree: { essences: 'tableau [{id, pct}]' },
  uniteSortie: 'IndiceEssence',
};
