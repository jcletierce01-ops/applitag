/**
 * Données de démonstration APPLITAG.
 *
 * Ce module exporte des données fictives UNIQUEMENT en mode démonstration.
 * En mode production, toutes les valeurs sont vides / null.
 *
 * RÈGLE : ne jamais importer ces données dans un flux de production réel.
 * RÈGLE : aucune donnée de ce fichier ne représente une vraie entreprise ou personne.
 *
 * Vite inlinera import.meta.env.VITE_APP_MODE à la compilation :
 * le bundler peut éliminer les tableaux de données en production (dead-code).
 */

const IS_DEMO: boolean = import.meta.env.VITE_APP_MODE === "demo";

// Helpers de date dynamiques — toutes les dates démo restent dans le mois courant
const dAgo = (n: number, time = "12:00") => {
  const d = new Date(); d.setDate(d.getDate() - n);
  return d.toISOString().slice(0,10) + "T" + time;
};
const dateAgo = (n: number) => dAgo(n).slice(0,10);

export const DEMO_ENTREPRISE_ID: string | null = IS_DEMO ? "demo-applitag-2026" : null;

/**
 * Utilisateurs fictifs de démonstration.
 * NE JAMAIS utiliser comme référence d'authentification en production.
 * Les PINs ici sont publics et uniquement valides en mode démo.
 */
export const DEMO_USERS: Record<string, Record<string, unknown>> = IS_DEMO ? {
  admin:         { nom:"Demo",      prenom:"Admin",    role:"admin",          id:"demo-admin",         pin:"0000" },
  operateur:     { nom:"Dupont",    prenom:"Martin",   role:"operateur",      id:"demo-op1",           pin:"1111" },
  mandataire:    { nom:"Laurent",   prenom:"Claire",   role:"mandataire",     profil:"charge_mission", roles:["mandataire"], id:"demo-mandat",  pin:"6666" },
  proprietaire:  { nom:"Martin",    prenom:"Jean",     role:"proprietaire",   id:"demo-prop1",         pin:"2222" },
  chauffeur:     { nom:"Robert",    prenom:"Pierre",   role:"chauffeur",      id:"demo-chauf",         pin:"3333" },
  dechiquetage:  { nom:"Forestier", prenom:"François", role:"dechiquetage",   id:"demo-dechiquetage",  pin:"4444" },
  chaufferie:    { nom:"Énergie",   prenom:"Sophie",   role:"chaufferie",     id:"demo-chauff",        pin:"5555" },
  receptionnaire:{ nom:"Plateau",   prenom:"Nathalie", role:"receptionnaire", id:"demo-recep",         pin:"7777" },
  contact:       { nom:"Dubois",    prenom:"Marie",    role:"contact",        id:"demo-prop2",         pin:"8888" },
  entreprise:    { nom:"Gaillard",  prenom:"Henri",    role:"entreprise",     id:"demo-etf1",          pin:"9999", nomEntreprise:"ETF Gaillard" },
} : {};

export const DEMO_LOTS: Record<string, unknown>[] = IS_DEMO ? [
  { id:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo", nom:"Martin",   prenom:"Jean",
    telephone:"0386420123", commune:"Charny-Orée-de-Puisaye", surfaceHa:12.5,
    potentiel:"chene", statutLot:"EN_LIVRAISON", dateContact:"2026-06-01",
    adresseParcelle:"Lieu-dit Les Épines", refCadastrale:"B 142",
    entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-2", lotNumero:"LOT-2026-06-89-002-demo", nom:"Dubois",   prenom:"Marie",
    telephone:"0386431234", commune:"Sens", surfaceHa:8.2,
    potentiel:"hetre", statutLot:"EN_COURS_EXPLOITATION", dateContact:"2026-05-15",
    adresseParcelle:"Forêt communale Est", refCadastrale:"C 218",
    etfNom:"ETF Gaillard", tonnageCumul:45.5, entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-3", lotNumero:"LOT-2026-06-89-003-demo", nom:"Lefebvre", prenom:"Paul",
    telephone:"0386442345", commune:"Joigny", surfaceHa:22.0,
    potentiel:"melange", statutLot:"BORD_ROUTE", dateContact:"2026-04-20",
    adresseParcelle:"Bois du Moulin", refCadastrale:"A 089",
    etfNom:"ETF Moreau", tonnageCumul:51.4, entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-6", lotNumero:"LOT-2026-07-89-006-demo", nom:"Perrot",   prenom:"André",
    telephone:"0386475678", commune:"Toucy", surfaceHa:9.5,
    potentiel:"chene", statutLot:"NOUVEAU", dateContact:"2026-07-05",
    adresseParcelle:"Lieu-dit La Grosse Haie", refCadastrale:"F 112",
    mandataireId:"demo-mandat", entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-7", lotNumero:"LOT-2026-07-89-007-demo", nom:"Gauthier", prenom:"Sylvie",
    telephone:"0386486789", commune:"Saint-Fargeau", surfaceHa:15.0,
    potentiel:"melange", statutLot:"VISITE_PREVUE", dateContact:"2026-07-03",
    adresseParcelle:"Bois des Corbeaux", refCadastrale:"G 223",
    dateVisite:"2026-07-10",
    mandataireId:"demo-mandat", entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-8", lotNumero:"LOT-2026-07-89-008-demo", nom:"Renard",   prenom:"Michel",
    telephone:"0386497890", commune:"Bléneau", surfaceHa:6.3,
    potentiel:"peuplier", statutLot:"NOUVEAU", dateContact:"2026-07-07",
    adresseParcelle:"Ripisylve du Loing", refCadastrale:"H 334",
    mandataireId:"demo-mandat", entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-4", lotNumero:"LOT-2026-06-89-004-demo", nom:"Bernard",  prenom:"Lucien",
    telephone:"0386453456", commune:"Auxerre", surfaceHa:6.8,
    potentiel:"peuplier", statutLot:"EN_LIVRAISON", dateContact:"2026-04-05",
    adresseParcelle:"Ripisylve de l'Yonne", refCadastrale:"D 331",
    etfNom:"ETF Gaillard", tonnageCumul:62.0, entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-5", lotNumero:"LOT-2026-06-89-005-demo", nom:"Rousseau", prenom:"Élise",
    telephone:"0386464567", commune:"Migennes", surfaceHa:15.3,
    potentiel:"chene", statutLot:"EN_STOCK_PLATEFORME", dateContact:"2026-03-10",
    adresseParcelle:"Grand Bois de Migennes", refCadastrale:"E 445",
    etfNom:"ETF Moreau", tonnageCumul:52.4, entrepriseId:DEMO_ENTREPRISE_ID },
  { id:"demo-lot-9", lotNumero:"LOT-2026-07-89-009-demo", nom:"Dubois",   prenom:"Marie",
    telephone:"0386491234", commune:"Joigny", surfaceHa:9.2,
    potentiel:"chene", statutLot:"CONTRAT_EN_COURS", dateContact:"2026-07-01",
    adresseParcelle:"Bois du Château, lieu-dit Le Fourneau", refCadastrale:"B 217",
    proprietaireId:"demo-prop2", mandataireId:"demo-mandat",
    etfNom:"ETF Gaillard", tonnageCumul:0, entrepriseId:DEMO_ENTREPRISE_ID },
] : [];

export const DEMO_VISITES: Record<string, unknown>[] = IS_DEMO ? [
  { id:"demo-v1", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    date:dateAgo(10), statut:"validee",
    gps:{lat:47.7234,lng:3.0892,accuracy:5}, photos:["p1","p2","p3"],
    essences:[{id:"chene",label:"Chêne",pct:70,emoji:"🌳"},{id:"charme",label:"Charme",pct:30,emoji:"🌿"}],
    volumeEstimeT:180, surfaceHa:12.5, prixTonne:"42", tauxTVA:"20",
    accesCamion:"praticable", largeurAcces:4.5, distancePlateforme:200,
    replantation:"oui", essenceReplanT:"chene_pedoncule", surfaceReplant:8,
    certification:"pefc", numeroCertification:"PEFC/10-31-1892",
    contraintes:{ligneEDF:false,penteForte:false,zoneHumide:true} },
  { id:"demo-v2", lotId:"demo-lot-2", lotNumero:"LOT-2026-06-89-002-demo",
    date:dateAgo(15), statut:"validee",
    gps:{lat:48.1978,lng:3.2833,accuracy:8}, photos:["p1","p2"],
    essences:[{id:"hetre",label:"Hêtre",pct:100,emoji:"🌲"}],
    volumeEstimeT:120, surfaceHa:8.2, prixTonne:"48", tauxTVA:"20",
    accesCamion:"praticable", largeurAcces:5, distancePlateforme:150,
    replantation:"non", certification:"aucune" },
  { id:"demo-v4", lotId:"demo-lot-4", lotNumero:"LOT-2026-06-89-004-demo",
    date:dateAgo(22), statut:"validee",
    gps:{lat:47.8014,lng:3.5673,accuracy:6}, photos:["p1","p2"],
    essences:[{id:"peuplier",label:"Peuplier",pct:100,emoji:"🌿"}],
    volumeEstimeT:65, surfaceHa:6.8, prixTonne:"38", tauxTVA:"20",
    accesCamion:"praticable", largeurAcces:5, distancePlateforme:120,
    replantation:"non", certification:"red",
    redCategorie:"bois_forestier", redDistance:35, redPays:"France",
    numeroCertification:"" },
] : [];

export const DEMO_REPORTINGS: Record<string, unknown>[] = IS_DEMO ? [
  { id:"demo-r0a", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    dateJour:dateAgo(18), heureDebut:"07:00", heureFin:"17:00",
    typeOperationJour:"abattage", machineJour:"Tronçonneuse Stihl 500i",
    nbTasJour:4, foisonnement:0.55, nbOperateurs:2,
    observations:"Démarrage abattage section principale" },
  { id:"demo-r0b", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    dateJour:dateAgo(12), heureDebut:"07:30", heureFin:"16:30",
    typeOperationJour:"debardage", machineJour:"John Deere 1270G",
    nbTasJour:4, foisonnement:0.55, nbOperateurs:2,
    observations:"Débardage en cours" },
  { id:"demo-r1", lotId:"demo-lot-2", lotNumero:"LOT-2026-06-89-002-demo",
    dateJour:dateAgo(16), heureDebut:"07:00", heureFin:"17:00",
    typeOperationJour:"abattage", machineJour:"Tronçonneuse Stihl 500i",
    nbTasJour:3, foisonnement:0.55, nbOperateurs:2,
    observations:"Bonne progression, météo favorable" },
  { id:"demo-r2", lotId:"demo-lot-2", lotNumero:"LOT-2026-06-89-002-demo",
    dateJour:dateAgo(15), heureDebut:"07:30", heureFin:"16:30",
    typeOperationJour:"debardage", machineJour:"John Deere 1270G",
    nbTasJour:5, foisonnement:0.55, nbOperateurs:3,
    observations:"Débardage terminé section Nord" },
  { id:"demo-r3", lotId:"demo-lot-3", lotNumero:"LOT-2026-06-89-003-demo",
    dateJour:dateAgo(14), heureDebut:"06:30", heureFin:"18:00",
    typeOperationJour:"abattage_debardage", machineJour:"Ponsse Bear",
    nbTasJour:8, foisonnement:0.50, nbOperateurs:4,
    observations:"Volume supérieur aux estimations" },
  { id:"demo-r-today-ab", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    dateJour:dateAgo(0), heureDebut:"07:00", heureFin:"12:30",
    typeOperationJour:"abattage", machineJour:"Tronçonneuse Stihl 500i",
    nbTasJour:5, foisonnement:0.55, nbOperateurs:2, volumeJour:124.5,
    observations:"Abattage en cours — estimation journalière" },
  { id:"demo-r-today-db", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    dateJour:dateAgo(0), heureDebut:"13:00", heureFin:"17:00",
    typeOperationJour:"debardage", machineJour:"John Deere 1270G",
    nbTasJour:4, foisonnement:0.55, nbOperateurs:2, volumeJour:98.0,
    observations:"Débardage section principale" },
] : [];

export const DEMO_TRANSPORTS: Record<string, unknown>[] = IS_DEMO ? [
  { id:"demo-t1-demo", lotId:"demo-lot-4", lotNumero:"LOT-2026-06-89-004-demo",
    numeroCMR:"CMR-demo-0089", typeVehicule:"semi",
    immatTracteur:"AB-123-CD", immatRemorque:"EF-456-GH",
    nomChauffeur:"Pierre Robert", societeTransp:"Transports Moreau",
    adresse:"Lieu-dit Le Bois Brûlé", codePostal:"89120", commune:"Charny-Orée-de-Puisaye", departement:"Yonne (89)",
    heureDebut:"08:00", heureFin:"10:30", dateJour:dateAgo(0),
    departConfirme:true, statut:"EN_LIVRAISON" },
  { id:"demo-t2-demo", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    numeroCMR:"CMR-demo-0091", typeVehicule:"semi",
    immatTracteur:"CD-456-EF", immatRemorque:"GH-789-IJ",
    nomChauffeur:"Alain Dupré", societeTransp:"Transports Forêt 89",
    adresse:"Route de la forêt", codePostal:"89120", commune:"Charny-Orée-de-Puisaye", departement:"Yonne (89)",
    heureDebut:"09:30", heureFin:null, dateJour:dateAgo(0),
    departConfirme:true, statut:"EN_LIVRAISON" },
] : [];

export const DEMO_LIVRAISONS: Record<string, unknown>[] = IS_DEMO ? [
  { id:"demo-l1-demo", lotId:"demo-lot-5", lotNumero:"LOT-2026-06-89-005-demo",
    nomDestination:"Chaufferie Migennes Énergie",
    poidsBrut:142, poidsNet:142, humiditeReception:28,
    date:dAgo(14,"14:30"), statut:"verifiee", peseeVerifiee:true, numTicket:"TKT-demo-0081" },
  { id:"demo-l2-demo", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    nomDestination:"Chaufferie Migennes Énergie",
    poidsBrut:25, poidsNet:24.6, humiditeReception:30,
    date:dAgo(10,"11:15"), statut:"verifiee", peseeVerifiee:true, numTicket:"TKT-demo-0093" },
  { id:"demo-l3-demo", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    nomDestination:"Chaufferie Migennes Énergie",
    poidsBrut:27.5, poidsNet:27.1, humiditeReception:29,
    date:dAgo(8,"09:50"), statut:"verifiee", peseeVerifiee:true, numTicket:"TKT-demo-0098" },
  { id:"demo-lp1-demo", lotId:"demo-lot-4", lotNumero:"LOT-2026-06-89-004-demo",
    nomDestination:"Plateforme Auxerre Bois Énergie",
    poidsBrut:27.4, poidsNet:27.0, humiditeReception:31,
    date:new Date().toISOString().slice(0,16), statut:"declaree", peseeVerifiee:false },
  { id:"demo-lp2-demo", lotId:"demo-lot-3", lotNumero:"LOT-2026-06-89-003-demo",
    nomDestination:"Plateforme Auxerre Bois Énergie",
    poidsBrut:26.8, poidsNet:26.3, humiditeReception:33,
    date:dAgo(5,"10:20"), statut:"verifiee", peseeVerifiee:false },
  { id:"demo-lp2b-demo", lotId:"demo-lot-3", lotNumero:"LOT-2026-06-89-003-demo",
    nomDestination:"Plateforme Auxerre Bois Énergie",
    poidsBrut:25.5, poidsNet:25.1, humiditeReception:30,
    date:dAgo(3,"08:55"), statut:"verifiee", peseeVerifiee:false },
  { id:"demo-lp3-demo", lotId:"demo-lot-5", lotNumero:"LOT-2026-06-89-005-demo",
    nomDestination:"Plateforme Auxerre Bois Énergie",
    poidsBrut:28.2, poidsNet:27.8, humiditeReception:31,
    date:dAgo(7,"14:45"), statut:"verifiee", peseeVerifiee:false },
  { id:"demo-lp3b-demo", lotId:"demo-lot-5", lotNumero:"LOT-2026-06-89-005-demo",
    nomDestination:"Plateforme Auxerre Bois Énergie",
    poidsBrut:25, poidsNet:24.6, humiditeReception:29,
    date:dAgo(2,"07:30"), statut:"verifiee", peseeVerifiee:false },
  { id:"demo-lp4-demo", lotId:"demo-lot-2", lotNumero:"LOT-2026-06-89-002-demo",
    nomDestination:"Chaufferie Vichy Agglo",
    poidsBrut:30.1, poidsNet:29.7, humiditeReception:27,
    date:dAgo(1,"16:00"), statut:"verifiee", peseeVerifiee:true, numTicket:"TKT-demo-0112" },
] : [];

export const DEMO_DECHIQUETAGES: Record<string, unknown>[] = IS_DEMO ? [
  { id:"demo-d1-demo", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    dateJour:dateAgo(9), numeroCMR:"CMR-demo-0085", photoCMR:"photo-d1.jpg" },
  { id:"demo-d-today", lotId:"demo-lot-1", lotNumero:"LOT-2026-06-89-001-demo",
    dateJour:dateAgo(0),
    createdAt:new Date().toISOString(),
    machine:"Jenz HEM 593", typeChargement:"semi",
    tonnageCharge:27.2, cubageCharge:81.0,
    operateurDechiquetage:"François Forestier",
    telOperateur:"06 12 34 56 78" },
  { id:"demo-d2", lotId:"demo-lot-4", lotNumero:"LOT-2026-06-89-004-demo",
    dateJour:dateAgo(0),
    createdAt:new Date().toISOString(),
    machine:"Jenz HEM 593", typeChargement:"semi",
    tonnageCharge:26.8, cubageCharge:80.0,
    operateurDechiquetage:"François Forestier",
    telOperateur:"06 12 34 56 78" },
] : [];
