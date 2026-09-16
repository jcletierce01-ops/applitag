// @ts-nocheck
import { useState, useEffect } from "react";
import { C } from "../../design-system/tokens.js";
import { apiGet } from "../../services/api.service.js";

// Duplique depuis sections-energie.tsx — utilise par SectionChaufferies
const pciKWhT = (h) => Math.round(5200 - 58.8 * h);
// ── CHAUFFERIES ──────────────────────────────────────────────────

const CHAUFFERIES_DATA = [
  // ── Auvergne-Rhône-Alpes ──────────────────────────────────────
  {id:"ch1",nom:"Réseau chaleur Vichy Agglo",commune:"Vichy (03)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:6.8,consoAnnT:13600,stockCapaT:800,stockActuelT:312,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Perrier — 04 70 32 11 00",
   acces:"ZI de Vichy — accès PL 24h/24 sauf dimanche",
   horairesReception:"Lun–Ven 07h–17h / Sam 07h–12h",
   prochaineLivraison:"2026-07-28",volumePrevu:24,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  {id:"ch2",nom:"Chaufferie Moulins Énergie",commune:"Moulins (03)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:4.2,consoAnnT:8400,stockCapaT:500,stockActuelT:89,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Girard — 04 70 46 22 00",
   acces:"Rue des Châtaigniers — réservation obligatoire",
   horairesReception:"Lun–Ven 08h–16h",
   prochaineLivraison:"2026-07-24",volumePrevu:18,
   livraisons:4,livraisonsConformes:4,alertes:1,statut:"alerte"},
  {id:"ch3",nom:"Chaufferie Saint-Étienne Métropole",commune:"Saint-Étienne (42)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:12.5,consoAnnT:25000,stockCapaT:1500,stockActuelT:820,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Deschamps — 04 77 43 00 11",
   acces:"ZI Molina-la-Chazotte — accès PL dédié",
   horairesReception:"Lun–Sam 06h–18h",
   prochaineLivraison:"2026-07-30",volumePrevu:45,
   livraisons:14,livraisonsConformes:13,alertes:0,statut:"ok"},
  {id:"ch4",nom:"Réseau bois Annecy Montagne",commune:"Annecy (74)",region:"Auvergne-Rhône-Alpes",
   puissanceMW:8.0,consoAnnT:16000,stockCapaT:900,stockActuelT:430,
   humiMax:30,granuAccepte:"G30-G50 / P45",
   contact:"Mme Favre — 04 50 51 20 00",
   acces:"ZA des Glaisins — quai de réception couvert",
   horairesReception:"Lun–Ven 07h–17h30",
   prochaineLivraison:"2026-08-04",volumePrevu:32,
   livraisons:10,livraisonsConformes:10,alertes:0,statut:"ok"},
  // ── Bourgogne-Franche-Comté ───────────────────────────────────
  {id:"ch5",nom:"Chaufferie bois Dijon Métropole",commune:"Dijon (21)",region:"Bourgogne-Franche-Comté",
   puissanceMW:10.2,consoAnnT:20400,stockCapaT:1200,stockActuelT:156,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Renard — 03 80 74 52 00",
   acces:"ZI Cap Nord — portail automatique camion",
   horairesReception:"Lun–Ven 07h–19h / Sam 07h–12h",
   prochaineLivraison:"2026-07-25",volumePrevu:55,
   livraisons:12,livraisonsConformes:11,alertes:1,statut:"alerte"},
  {id:"ch6",nom:"Réseau chaleur Besançon Est",commune:"Besançon (25)",region:"Bourgogne-Franche-Comté",
   puissanceMW:5.6,consoAnnT:11200,stockCapaT:700,stockActuelT:390,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Pernet — 03 81 87 40 00",
   acces:"Rue de la Malcombe — pont-bascule sur site",
   horairesReception:"Lun–Ven 08h–17h",
   prochaineLivraison:"2026-08-10",volumePrevu:28,
   livraisons:7,livraisonsConformes:7,alertes:0,statut:"ok"},
  // ── Grand Est ────────────────────────────────────────────────
  {id:"ch7",nom:"Chaufferie bois Strasbourg Nord",commune:"Strasbourg (67)",region:"Grand Est",
   puissanceMW:22.0,consoAnnT:44000,stockCapaT:2500,stockActuelT:1100,
   humiMax:28,granuAccepte:"G30-G50 / G50",
   contact:"M. Schneider — 03 88 60 90 90",
   acces:"Port du Rhin — accès fluvial + PL",
   horairesReception:"Lun–Ven 06h–20h / Sam 06h–14h",
   prochaineLivraison:"2026-07-26",volumePrevu:80,
   livraisons:22,livraisonsConformes:21,alertes:0,statut:"ok"},
  {id:"ch8",nom:"Réseau de chaleur Nancy Plateau de Haye",commune:"Nancy (54)",region:"Grand Est",
   puissanceMW:7.5,consoAnnT:15000,stockCapaT:850,stockActuelT:62,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"Mme Mathieu — 03 83 32 00 00",
   acces:"Plateau de Haye — voie réservée bois-énergie",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-07-23",volumePrevu:35,
   livraisons:9,livraisonsConformes:9,alertes:1,statut:"alerte"},
  // ── Occitanie ────────────────────────────────────────────────
  {id:"ch9",nom:"Chaufferie bois Toulouse Lardenne",commune:"Toulouse (31)",region:"Occitanie",
   puissanceMW:9.0,consoAnnT:18000,stockCapaT:1000,stockActuelT:520,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Lacombe — 05 61 22 29 22",
   acces:"Route de Bayonne — déchargement automatisé",
   horairesReception:"Lun–Ven 07h–18h / Sam 07h–12h",
   prochaineLivraison:"2026-08-01",volumePrevu:40,
   livraisons:11,livraisonsConformes:10,alertes:0,statut:"ok"},
  {id:"ch10",nom:"Réseau chaleur Montpellier Ovalie",commune:"Montpellier (34)",region:"Occitanie",
   puissanceMW:6.0,consoAnnT:12000,stockCapaT:720,stockActuelT:280,
   humiMax:32,granuAccepte:"G30-G50 / P31",
   contact:"Mme Vidal — 04 67 34 70 00",
   acces:"ZA Ovalie — accès par chemin rural (18t maxi)",
   horairesReception:"Lun–Ven 08h–16h30",
   prochaineLivraison:"2026-08-06",volumePrevu:30,
   livraisons:6,livraisonsConformes:6,alertes:0,statut:"ok"},
  // ── Bretagne ─────────────────────────────────────────────────
  {id:"ch11",nom:"Chaufferie bois Rennes Beaulieu",commune:"Rennes (35)",region:"Bretagne",
   puissanceMW:5.5,consoAnnT:11000,stockCapaT:650,stockActuelT:195,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Le Goff — 02 99 87 41 00",
   acces:"Campus de Beaulieu — livraisons hors cours",
   horairesReception:"Lun–Ven 08h–17h (hors vacances scolaires)",
   prochaineLivraison:"2026-07-29",volumePrevu:25,
   livraisons:5,livraisonsConformes:5,alertes:0,statut:"ok"},
  {id:"ch12",nom:"Réseau chaleur Brest Kergaradec",commune:"Brest (29)",region:"Bretagne",
   puissanceMW:3.8,consoAnnT:7600,stockCapaT:450,stockActuelT:180,
   humiMax:32,granuAccepte:"G30-G50 / G50",
   contact:"Mme Riou — 02 98 00 80 80",
   acces:"ZI Kergaradec — portail téléguidé",
   horairesReception:"Lun–Ven 07h30–17h30",
   prochaineLivraison:"2026-08-12",volumePrevu:20,
   livraisons:4,livraisonsConformes:4,alertes:0,statut:"ok"},
  // ── Normandie ────────────────────────────────────────────────
  {id:"ch13",nom:"Chaufferie bois Rouen Rive Gauche",commune:"Rouen (76)",region:"Normandie",
   puissanceMW:8.4,consoAnnT:16800,stockCapaT:1000,stockActuelT:410,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Duplessis — 02 35 72 20 00",
   acces:"Zone de l'Aubette — quai à camion couvert",
   horairesReception:"Lun–Ven 07h–18h / Sam 07h–12h",
   prochaineLivraison:"2026-08-02",volumePrevu:38,
   livraisons:9,livraisonsConformes:9,alertes:0,statut:"ok"},
  // ── Nouvelle-Aquitaine ───────────────────────────────────────
  {id:"ch14",nom:"Réseau de chaleur Bordeaux Mérignac",commune:"Mérignac (33)",region:"Nouvelle-Aquitaine",
   puissanceMW:11.0,consoAnnT:22000,stockCapaT:1300,stockActuelT:750,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Aubert — 05 56 12 00 00",
   acces:"ZA du Phare — pont-bascule + déchargement pneumatique",
   horairesReception:"Lun–Sam 06h–19h",
   prochaineLivraison:"2026-07-27",volumePrevu:50,
   livraisons:15,livraisonsConformes:14,alertes:0,statut:"ok"},
  {id:"ch15",nom:"Chaufferie bois Limoges Beffroi",commune:"Limoges (87)",region:"Nouvelle-Aquitaine",
   puissanceMW:6.2,consoAnnT:12400,stockCapaT:750,stockActuelT:340,
   humiMax:30,granuAccepte:"G30-G50 / P45",
   contact:"Mme Delmas — 05 55 45 20 00",
   acces:"Rue Beffroi — camion max 10 t sur voie locale",
   horairesReception:"Lun–Ven 08h–17h",
   prochaineLivraison:"2026-08-08",volumePrevu:22,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  // ── Pays de la Loire ─────────────────────────────────────────
  {id:"ch16",nom:"Réseau chaleur Nantes Nord",commune:"Nantes (44)",region:"Pays de la Loire",
   puissanceMW:14.0,consoAnnT:28000,stockCapaT:1600,stockActuelT:700,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Guérin — 02 40 41 90 00",
   acces:"ZI de Carquefou — silo automatique + pont-bascule",
   horairesReception:"Lun–Ven 06h–20h",
   prochaineLivraison:"2026-07-28",volumePrevu:65,
   livraisons:18,livraisonsConformes:17,alertes:0,statut:"ok"},
  // ── Hauts-de-France ──────────────────────────────────────────
  {id:"ch17",nom:"Chaufferie bois Lille Hellemmes",commune:"Hellemmes (59)",region:"Hauts-de-France",
   puissanceMW:16.5,consoAnnT:33000,stockCapaT:2000,stockActuelT:890,
   humiMax:28,granuAccepte:"G30-G50",
   contact:"M. Leroy — 03 20 14 50 50",
   acces:"ZI Hellemmes — portique de contrôle + pont-bascule",
   horairesReception:"Lun–Sam 06h–20h",
   prochaineLivraison:"2026-07-26",volumePrevu:75,
   livraisons:20,livraisonsConformes:19,alertes:0,statut:"ok"},
  // ── Île-de-France ────────────────────────────────────────────
  {id:"ch18",nom:"Réseau bois Saclay — CEA",commune:"Saclay (91)",region:"Île-de-France",
   puissanceMW:20.0,consoAnnT:40000,stockCapaT:2200,stockActuelT:980,
   humiMax:28,granuAccepte:"G30-G50 / G50",
   contact:"M. Marchand — 01 69 08 50 00",
   acces:"Plateau de Saclay — badge sécurité requis + escorte",
   horairesReception:"Lun–Ven 07h–17h (badge obligatoire)",
   prochaineLivraison:"2026-08-01",volumePrevu:90,
   livraisons:25,livraisonsConformes:24,alertes:0,statut:"ok"},
  // ── Provence-Alpes-Côte d'Azur ───────────────────────────────
  {id:"ch19",nom:"Chaufferie bois Aix-en-Provence ZAC",commune:"Aix-en-Provence (13)",region:"Provence-Alpes-Côte d'Azur",
   puissanceMW:7.2,consoAnnT:14400,stockCapaT:850,stockActuelT:290,
   humiMax:32,granuAccepte:"G30-G50",
   contact:"Mme Bonnet — 04 42 91 90 00",
   acces:"ZAC Les Milles — entrée P2, 2e portail",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-08-05",volumePrevu:33,
   livraisons:8,livraisonsConformes:8,alertes:0,statut:"ok"},
  // ── Corse ────────────────────────────────────────────────────
  {id:"ch20",nom:"Chaufferie bois Ajaccio Cannes-Échelle",commune:"Ajaccio (2A)",region:"Corse",
   puissanceMW:2.4,consoAnnT:4800,stockCapaT:280,stockActuelT:95,
   humiMax:32,granuAccepte:"G30-G50",
   contact:"M. Colonna — 04 95 23 40 00",
   acces:"ZI de Mezzavia — route étroite (12 t maxi), croisement difficile",
   horairesReception:"Lun–Ven 08h–16h (approvisionnement maritime août)",
   prochaineLivraison:"2026-08-03",volumePrevu:15,
   livraisons:3,livraisonsConformes:3,alertes:0,statut:"ok"},
  {id:"ch21",nom:"Réseau chaleur Bastia Toga",commune:"Bastia (2B)",region:"Corse",
   puissanceMW:1.8,consoAnnT:3600,stockCapaT:200,stockActuelT:38,
   humiMax:34,granuAccepte:"G30-G50 / P45",
   contact:"Mme Santoni — 04 95 32 11 00",
   acces:"ZI de Toga — quai côté mer, accès PL limité port",
   horairesReception:"Lun–Ven 08h–12h uniquement",
   prochaineLivraison:"2026-07-25",volumePrevu:10,
   livraisons:2,livraisonsConformes:2,alertes:1,statut:"alerte"},
  // ── Guadeloupe (971) ─────────────────────────────────────────
  {id:"ch22",nom:"Chaufferie bagasse-bois Gardel",commune:"Le Moule — Guadeloupe (971)",region:"Guadeloupe",
   puissanceMW:4.0,consoAnnT:8000,stockCapaT:400,stockActuelT:180,
   humiMax:40,granuAccepte:"G30-G50 / résidus canne",
   contact:"M. Céleste — 05 90 23 00 00",
   acces:"Route de l'Usine Gardel — pesée obligatoire à l'entrée",
   horairesReception:"Lun–Ven 07h–17h",
   prochaineLivraison:"2026-08-10",volumePrevu:18,
   livraisons:4,livraisonsConformes:4,alertes:0,statut:"ok"},
  // ── Martinique (972) ─────────────────────────────────────────
  {id:"ch23",nom:"Chaufferie biomasse CHU Martinique",commune:"Fort-de-France (972)",region:"Martinique",
   puissanceMW:1.5,consoAnnT:3000,stockCapaT:150,stockActuelT:55,
   humiMax:38,granuAccepte:"G30-G50",
   contact:"Service énergie CHU — 05 96 55 20 00",
   acces:"Route de Châteaubœuf — livraisons sur RDV médical zone",
   horairesReception:"Mar et Jeu 07h30–11h30 uniquement",
   prochaineLivraison:"2026-08-04",volumePrevu:8,
   livraisons:2,livraisonsConformes:2,alertes:0,statut:"ok"},
  // ── La Réunion (974) ─────────────────────────────────────────
  {id:"ch24",nom:"Centrale biomasse Albioma Le Gol",commune:"Saint-Louis (974)",region:"La Réunion",
   puissanceMW:35.0,consoAnnT:70000,stockCapaT:3500,stockActuelT:1600,
   humiMax:45,granuAccepte:"G50 / bagasse / résidus canne",
   contact:"M. Payet — 02 62 49 40 00",
   acces:"Port du Gol — accès par convoi maritime + route littorale",
   horairesReception:"7j/7 06h–20h (consigne port obligatoire)",
   prochaineLivraison:"2026-07-27",volumePrevu:200,
   livraisons:30,livraisonsConformes:29,alertes:0,statut:"ok"},
  // ── Guyane (973) ─────────────────────────────────────────────
  {id:"ch25",nom:"Centrale biomasse EDF Dégrad-des-Cannes",commune:"Rémire-Montjoly (973)",region:"Guyane",
   puissanceMW:18.0,consoAnnT:36000,stockCapaT:2000,stockActuelT:820,
   humiMax:50,granuAccepte:"G50 / résidus forêt tropicale",
   contact:"M. Léonce — 05 94 27 00 00",
   acces:"Zone industrielle DDC — accès fluvial + route nationale",
   horairesReception:"Lun–Ven 07h–17h30 (contrôle phytosanitaire obligatoire)",
   prochaineLivraison:"2026-08-01",volumePrevu:120,
   livraisons:12,livraisonsConformes:12,alertes:0,statut:"ok"},
  // ── Mayotte (976) ────────────────────────────────────────────
  {id:"ch26",nom:"Chaufferie biomasse Longoni",commune:"Bandraboua (976)",region:"Mayotte",
   puissanceMW:2.0,consoAnnT:4000,stockCapaT:200,stockActuelT:42,
   humiMax:45,granuAccepte:"G30-G50 / résidus végétaux locaux",
   contact:"M. Madi — 02 69 61 00 00",
   acces:"Port de Longoni — accès containerisé uniquement",
   horairesReception:"Lun–Ven 08h–15h (selon marée port Longoni)",
   prochaineLivraison:"2026-08-15",volumePrevu:10,
   livraisons:1,livraisonsConformes:1,alertes:1,statut:"alerte"},
  // ── Saint-Pierre-et-Miquelon (975) ───────────────────────────
  {id:"ch27",nom:"Réseau chaleur Saint-Pierre Ville",commune:"Saint-Pierre (975)",region:"Saint-Pierre-et-Miquelon",
   puissanceMW:1.0,consoAnnT:2000,stockCapaT:120,stockActuelT:28,
   humiMax:30,granuAccepte:"G30-G50",
   contact:"M. Claireaux — 05 08 41 10 00",
   acces:"Port de Saint-Pierre — importation Canada/Métropole par cargo",
   horairesReception:"Selon arrivée cargo (planning trimestriel)",
   prochaineLivraison:"2026-09-10",volumePrevu:50,
   livraisons:2,livraisonsConformes:2,alertes:1,statut:"alerte"},
  // ── Polynésie française (987) ─────────────────────────────────
  {id:"ch28",nom:"Centrale biomasse EDT — Fare Ute",commune:"Papeete — Polynésie française (987)",region:"Polynésie française",
   puissanceMW:5.0,consoAnnT:10000,stockCapaT:500,stockActuelT:210,
   humiMax:45,granuAccepte:"G50 / copeaux locaux",
   contact:"M. Tetuanui — +689 40 86 60 00",
   acces:"Zone portuaire Fare Ute — livraison par barge inter-îles",
   horairesReception:"Lun–Ven 07h–16h (heure locale Tahiti)",
   prochaineLivraison:"2026-08-20",volumePrevu:30,
   livraisons:3,livraisonsConformes:3,alertes:0,statut:"ok"},
  // ── Nouvelle-Calédonie (988) ──────────────────────────────────
  {id:"ch29",nom:"Centrale biomasse Prony Energies",commune:"Prony (988)",region:"Nouvelle-Calédonie",
   puissanceMW:8.0,consoAnnT:16000,stockCapaT:900,stockActuelT:380,
   humiMax:48,granuAccepte:"G50 / résidus mine/bois locaux",
   contact:"M. Wamytan — +687 35 10 00",
   acces:"Route de Prony — accès industriel mine + port",
   horairesReception:"Lun–Ven 07h–17h (heure locale NC)",
   prochaineLivraison:"2026-08-18",volumePrevu:45,
   livraisons:5,livraisonsConformes:5,alertes:0,statut:"ok"},
];

/* ═══════════════════════════════════════════════════════
   SECTION FACTURATION ÉLECTRONIQUE
   Obligations à partir du 01/09/2026 (réception) et 01/09/2027 (émission TPE/PME)
═══════════════════════════════════════════════════════ */
export const SectionChaufferies = () => {
  const [selected,  setSelected]  = useState(null);
  const [filtRegion,setFiltRegion] = useState("Toutes");

  const ch = selected ? CHAUFFERIES_DATA.find(c=>c.id===selected) : null;

  const stockMoyPct = d => Math.round(d.stockActuelT/d.stockCapaT*100);
  const autonomieJ  = d => Math.round(d.stockActuelT/(d.consoAnnT/365));

  const REGIONS = ["Toutes", ...Array.from(new Set(CHAUFFERIES_DATA.map(d=>d.region))).sort()];
  const filtered = filtRegion==="Toutes" ? CHAUFFERIES_DATA : CHAUFFERIES_DATA.filter(d=>d.region===filtRegion);

  // Icônes par région
  const regionIco = r => ({
    "Auvergne-Rhône-Alpes":"⛰️","Bourgogne-Franche-Comté":"🍇","Grand Est":"🥨",
    "Occitanie":"☀️","Bretagne":"⚓","Normandie":"🌊","Nouvelle-Aquitaine":"🌲",
    "Pays de la Loire":"🏰","Hauts-de-France":"🌾","Île-de-France":"🗼",
    "Provence-Alpes-Côte d'Azur":"🌻","Corse":"🏔️",
    "Guadeloupe":"🌺","Martinique":"🌴","La Réunion":"🌋","Guyane":"🌿",
    "Mayotte":"🏝️","Saint-Pierre-et-Miquelon":"🧊",
    "Polynésie française":"🌺","Nouvelle-Calédonie":"🪸",
  }[r]||"📍");

  return (
    <div style={{maxWidth:1000,margin:"0 auto"}}>
      <div style={{marginBottom:14}}>
        <div style={{fontSize:20,fontWeight:800,color:C.tx}}>🔥 Chaufferies</div>
        <div style={{fontSize:13,color:C.tx2}}>Suivi des stocks, livraisons et consommations — France métropolitaine, Corse & Outre-mer</div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:14}}>
        {[
          {ico:"🔥",label:"Chaufferies actives",val:CHAUFFERIES_DATA.length,col:"#B45309",bg:"#FEF3C7"},
          {ico:"📦",label:"Stock moyen",val:Math.round(CHAUFFERIES_DATA.reduce((s,d)=>s+stockMoyPct(d),0)/CHAUFFERIES_DATA.length)+"%",col:"#0369A1",bg:"#DBEAFE"},
          {ico:"⚡",label:"Énergie en stock",val:Math.round(CHAUFFERIES_DATA.reduce((s,d)=>s+d.stockActuelT*pciKWhT(d.humiMax)/1000,0))+" MWh",col:"#7C3AED",bg:"#EDE9FE"},
          {ico:"🚛",label:"Livraisons totales",val:CHAUFFERIES_DATA.reduce((s,d)=>s+d.livraisons,0),col:"#1E5B3A",bg:"#D1FAE5"},
          {ico:"⚠️",label:"En alerte stock",val:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length,col:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length>0?"#991B1B":"#059669",bg:CHAUFFERIES_DATA.filter(d=>stockMoyPct(d)<20).length>0?"#FEE2E2":"#D1FAE5"},
        ].map(k=>(
          <div key={k.label} style={{background:k.bg,borderRadius:12,padding:"12px 14px"}}>
            <div style={{fontSize:18}}>{k.ico}</div>
            <div style={{fontSize:16,fontWeight:900,color:k.col,marginTop:2}}>{k.val}</div>
            <div style={{fontSize:10,color:k.col,opacity:.75}}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filtre région */}
      <div style={{display:"flex",gap:6,marginBottom:12,overflowX:"auto",
        scrollbarWidth:"none",paddingBottom:4}}>
        {REGIONS.map(r=>(
          <button key={r} onClick={()=>{setFiltRegion(r);setSelected(null);}} style={{
            flex:"0 0 auto",padding:"6px 12px",borderRadius:20,fontSize:11,fontWeight:700,
            cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",
            border:`1.5px solid ${filtRegion===r?"#B45309":C.bd}`,
            background:filtRegion===r?"#FEF3C7":"transparent",
            color:filtRegion===r?"#B45309":C.tx2,
            WebkitTapHighlightColor:"transparent"}}>
            {r==="Toutes"?"🗺️ Toutes régions":`${regionIco(r)} ${r}`}
          </button>
        ))}
      </div>

      <div style={{marginBottom:8,fontSize:11,color:C.tx3}}>
        {filtered.length} chaufferie{filtered.length>1?"s":""}{filtRegion!=="Toutes"?` en ${filtRegion}`:" — France entière"}
        {" · "}{filtered.filter(d=>d.alertes>0).length>0&&(
          <span style={{color:"#991B1B",fontWeight:700}}>
            ⚠️ {filtered.filter(d=>d.alertes>0).length} en alerte
          </span>
        )}
      </div>

      <div style={{display:"grid",gridTemplateColumns:ch?"1fr 360px":"repeat(2,1fr)",gap:12,alignItems:"start"}}>
        {filtered.map(d=>{
          const pct = stockMoyPct(d);
          const auto = autonomieJ(d);
          const isSelected = selected===d.id;
          const stockCol = pct>=40?"#059669":pct>=20?"#D97706":"#DC2626";
          const stockBg  = pct>=40?"#D1FAE5":pct>=20?"#FEF3C7":"#FEE2E2";
          return (
            <div key={d.id} onClick={()=>setSelected(isSelected?null:d.id)}
              style={{background:"#fff",borderRadius:12,padding:"14px 16px",cursor:"pointer",
                border:`2px solid ${isSelected?"#B45309":d.alertes>0?"#FCA5A5":C.bd}`}}>
              <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>
                <div style={{fontSize:24}}>🔥</div>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{d.nom}</div>
                  <div style={{fontSize:11,color:C.tx2}}>{d.commune} · {d.puissanceMW} MW</div>
                </div>
                {d.alertes>0&&<span style={{fontSize:9,fontWeight:700,padding:"2px 7px",
                  borderRadius:20,background:"#FEE2E2",color:"#991B1B"}}>⚠️ alerte</span>}
              </div>

              {/* Jauge stock */}
              <div style={{marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,marginBottom:3}}>
                  <span style={{color:C.tx3}}>Stock actuel</span>
                  <span style={{fontWeight:700,color:stockCol}}>{d.stockActuelT} / {d.stockCapaT} t · {pct}%</span>
                </div>
                <div style={{height:10,borderRadius:5,background:"#F3F4F6",overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${pct}%`,background:stockCol,borderRadius:5}}/>
                </div>
                <div style={{fontSize:10,color:C.tx3,marginTop:3}}>Autonomie estimée : {auto} jours</div>
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:6,fontSize:10,color:C.tx2}}>
                <div style={{background:stockBg,borderRadius:6,padding:"5px 8px"}}>
                  📅 Prochaine livraison :<br/>
                  <span style={{fontWeight:700,color:stockCol}}>{new Date(d.prochaineLivraison).toLocaleDateString("fr-FR")} · {d.volumePrevu} t</span>
                </div>
                <div style={{background:"#F9FAFB",borderRadius:6,padding:"5px 8px"}}>
                  ✅ Conformité :<br/>
                  <span style={{fontWeight:700,color:"#059669"}}>{d.livraisons>0?Math.round(d.livraisonsConformes/d.livraisons*100):0}% ({d.livraisonsConformes}/{d.livraisons})</span>
                </div>
                <div style={{background:"#EDE9FE",borderRadius:6,padding:"5px 8px"}}>
                  ⚡ Stock énergie :<br/>
                  <span style={{fontWeight:700,color:"#7C3AED"}}>{Math.round(d.stockActuelT*pciKWhT(d.humiMax)/1000)} MWh</span>
                </div>
              </div>
            </div>
          );
        })}

        {ch&&(
          <div style={{background:"#fff",borderRadius:14,border:"2px solid #B45309",
            padding:16,position:"sticky",top:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
              <div style={{fontSize:13,fontWeight:800,color:C.tx}}>{ch.nom}</div>
              <button onClick={()=>setSelected(null)}
                style={{background:"transparent",border:"none",cursor:"pointer",fontSize:18,color:C.tx3}}>✕</button>
            </div>
            {ch.alertes>0&&(
              <div style={{background:"#FEE2E2",borderRadius:8,padding:"7px 10px",
                marginBottom:10,fontSize:11,color:"#991B1B",border:"1px solid #FECACA"}}>
                ⚠️ Stock bas — livraison urgente à planifier
              </div>
            )}
            <div style={{display:"flex",flexDirection:"column",gap:6,fontSize:11}}>
              {[
                ["Commune",ch.commune],
                ["Puissance",ch.puissanceMW+" MW"],
                ["Consommation annuelle",ch.consoAnnT.toLocaleString("fr-FR")+" t/an · "+Math.round(ch.consoAnnT*pciKWhT(ch.humiMax)/1000).toLocaleString("fr-FR")+" MWh/an"],
                ["Capacité de stockage",ch.stockCapaT+" t"],
                ["Stock actuel",ch.stockActuelT+" t ("+stockMoyPct(ch)+"%)"],
                ["Énergie en stock",Math.round(ch.stockActuelT*pciKWhT(ch.humiMax)/1000)+" MWh (PCI ITEBE 2004, H="+ch.humiMax+"%)"],
                ["Autonomie estimée",autonomieJ(ch)+" jours"],
                ["Humidité max acceptée",ch.humiMax+"%"],
                ["Granulométrie acceptée",ch.granuAccepte],
                ["Contact",ch.contact],
                ["Accès",ch.acces],
                ["Horaires réception",ch.horairesReception],
                ["Prochaine livraison",new Date(ch.prochaineLivraison).toLocaleDateString("fr-FR")+" · "+ch.volumePrevu+" t"],
              ].map(([k,v])=>(
                <div key={k} style={{display:"flex",gap:8,borderBottom:`1px solid ${C.bd}`,paddingBottom:5}}>
                  <span style={{color:C.tx3,minWidth:140,flexShrink:0}}>{k}</span>
                  <span style={{fontWeight:600,color:C.tx}}>{v}</span>
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:6,marginTop:14}}>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"#B45309",border:"none",color:"#fff"}}>
                🚛 Planifier livraison
              </button>
              <button style={{flex:1,padding:"7px",borderRadius:8,fontSize:11,fontWeight:700,
                cursor:"pointer",fontFamily:"inherit",background:"transparent",
                border:`1px solid ${C.bd}`,color:C.tx2}}>
                📊 Historique
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
