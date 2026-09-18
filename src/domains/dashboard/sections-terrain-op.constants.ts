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
    id:"TRC-001", nom:"Chemin des Battets — section nord",
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
    id:"TRC-002", nom:"Piste de la Corniche — prolongement",
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
    id:"TRC-003", nom:"Route de la Biche — section sud",
    type:"existant", proprietaire:"Propriétaire privé",
    parcelles:["A 034"], surface:3.8,
    portance:"legere", largeur:2.8, pentePct:6,
    placeDepot:true, retournement:false, accesIncendie:"Oui — à améliorer",
    tonnageMobilisable:85, volumeMobilisable:120,
    coutProjet:8500, travaux:"Élargissement 2025 prévu",
    photos:1, statut:"a_ameliorer",
  },
];

export const NIVEAUX_RESTRICTION = [
  {id:"aucune",   label:"Aucune restriction",  icon:"🟢", couleur:"#065F46", bg:"#D1FAE5"},
  {id:"faible",   label:"Niveau faible",       icon:"🟡", couleur:"#92400E", bg:"#FEF3C7"},
  {id:"eleve",    label:"Niveau élevé",        icon:"🟠", couleur:"#C2410C", bg:"#FFEDD5"},
  {id:"tres_eleve",label:"Très élevé",         icon:"🔴", couleur:"#991B1B", bg:"#FEE2E2"},
  {id:"interdit", label:"Travaux interdits",   icon:"⛔", couleur:"#7F1D1D", bg:"#FEE2E2"},
];
