// Constantes de données pour le module Terrain Op / Desserte / Permis incendie
// Séparé du fichier composants pour permettre React Fast Refresh

export const STATUT_FOURN_RED = {
  valide:    {label:"Valide",     color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  expire:    {label:"Expiré",    color:"#991B1B", bg:"#FEE2E2", icon:"❌"},
  incomplet: {label:"Incomplet", color:"#92400E", bg:"#FEF3C7", icon:"⚠️"},
  a_auditer: {label:"À auditer", color:"#1E40AF", bg:"#DBEAFE", icon:"🔵"},
};

export const DEMO_TRONCONS = [
  {
    id:"TRC-001-demo", nom:"Chemin des Battets — section nord",
    type:"existant", proprietaire:"Commune de Tronçais",
    parcelles:["B 112","B 113","B 114"], surface:12.5,
    portance:"renforcee", largeur:4.5, pentePct:8,
    placeDepot:true, retournement:true, accesIncendie:"Oui — accès DFCI conforme",
    tonnageMobilisable:320, volumeMobilisable:480,
    coutProjet:0, travaux:"Entretien fossés 2024",
    photos:2, statut:"operationnel",
    lat:46.51, lng:2.89,
  },
  {
    id:"TRC-002-demo", nom:"Piste de la Corniche — prolongement",
    type:"a_creer", proprietaire:"Syndicat forestier Allier",
    parcelles:["C 218","C 219"], surface:8.2,
    portance:"normale", largeur:3.5, pentePct:14,
    placeDepot:false, retournement:false, accesIncendie:"Non — à créer",
    tonnageMobilisable:180, volumeMobilisable:270,
    coutProjet:42000, travaux:"",
    photos:0, statut:"projet",
    lat:46.49, lng:2.91,
  },
  {
    id:"TRC-003-demo", nom:"Route de la Biche — section sud",
    type:"existant", proprietaire:"Propriétaire privé",
    parcelles:["A 034"], surface:3.8,
    portance:"legere", largeur:2.8, pentePct:6,
    placeDepot:true, retournement:false, accesIncendie:"Oui — à améliorer",
    tonnageMobilisable:85, volumeMobilisable:120,
    coutProjet:8500, travaux:"Élargissement 2025 prévu",
    photos:1, statut:"a_ameliorer",
  },
];

export const SOURCES_PROFIL = [
  "Opérateur terrain","Propriétaire forestier","ETF","Expert forestier","Mandataire",
  "Conducteur de travaux","Chauffeur transport","Collectivité","Administration","Autre",
];

export const PORTANCE_OPTS = [
  {v:"legere",   l:"Légère (< 10 t)",   col:"#065F46", bg:"#D1FAE5"},
  {v:"normale",  l:"Normale (10–19 t)", col:"#1E40AF", bg:"#DBEAFE"},
  {v:"renforcee",l:"Renforcée (≥ 19 t)",col:"#7C3AED", bg:"#EDE9FE"},
];

export const ACCES_INCENDIE_OPTS = ["Oui — accès DFCI conforme","Oui — à améliorer","Non — hors périmètre","Non — à créer"];

export const STATUT_TRONCON = {
  operationnel: {l:"Opérationnel",    col:"#065F46", bg:"#D1FAE5", icon:"✅"},
  a_ameliorer:  {l:"À améliorer",     col:"#B45309", bg:"#FEF3C7", icon:"⚠️"},
  projet:       {l:"Projet",          col:"#7C3AED", bg:"#EDE9FE", icon:"📐"},
  ferme:        {l:"Fermé / interdit",col:"#991B1B", bg:"#FEE2E2", icon:"🚫"},
};

export const TYPES_ANOMALIE = [
  {id:"orniere",      label:"Ornières / nids-de-poule",   icon:"🕳️", urgence:"orange"},
  {id:"ravinement",   label:"Ravinement",                 icon:"🌊", urgence:"orange"},
  {id:"arbre_tombe",  label:"Arbre tombé",                icon:"🌳", urgence:"rouge"},
  {id:"vegetation",   label:"Végétation envahissante",    icon:"🌿", urgence:"jaune"},
  {id:"pont_buse",    label:"Pont / buse dégradé",        icon:"🌉", urgence:"rouge"},
  {id:"largeur",      label:"Largeur insuffisante",       icon:"↔️", urgence:"orange"},
  {id:"fosse",        label:"Fossé bouché / débordement", icon:"💧", urgence:"orange"},
  {id:"affaissement", label:"Affaissement de chaussée",  icon:"⬇️", urgence:"rouge"},
  {id:"glissement",   label:"Glissement de terrain",     icon:"⛰️", urgence:"rouge"},
  {id:"barriere",     label:"Barrière bloquée / cassée", icon:"🚧", urgence:"orange"},
  {id:"signalisation",label:"Signalisation manquante",   icon:"🪧", urgence:"jaune"},
  {id:"incendie",     label:"Traces d'incendie",         icon:"🔥", urgence:"rouge"},
  {id:"autre",        label:"Autre",                     icon:"❓", urgence:"jaune"},
];

export const URGENCES = {
  rouge:  {label:"Urgent — accès bloqué",  col:"#991B1B", bg:"#FEE2E2", icon:"🔴"},
  orange: {label:"Dégradation notable",    col:"#C2410C", bg:"#FFEDD5", icon:"🟠"},
  jaune:  {label:"Signalement préventif",  col:"#92400E", bg:"#FEF3C7", icon:"🟡"},
};

export const NIVEAUX_RESTRICTION = [
  {id:"aucune",   label:"Aucune restriction",  icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
  {id:"faible",   label:"Niveau faible",       icon:"🟡", couleur:"#92400E", bg:"#FEF3C7"},
  {id:"eleve",    label:"Niveau élevé",        icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"tres_eleve",label:"Très élevé",         icon:"🔴", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"interdit", label:"Travaux interdits",   icon:"⛔", couleur:"#7F1D1D", bg:"#FEE2E2"},
];
