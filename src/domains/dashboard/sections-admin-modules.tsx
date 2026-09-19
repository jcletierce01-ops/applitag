// @ts-nocheck
import { useState } from "react";
import { C } from "../../design-system/tokens.js";
// ── ARCHITECTURE FONCTIONNELLE 7 MODULES / 36 SOUS-MODULES ────
const MODULES_COMMERCIAUX = [
  {
    id:"operations",
    nom:"APPLITAG Operations",
    icon:"⚙️",
    couleur:"#1E5B3A",
    bg:"#D1FAE5",
    tagline:"Piloter les opérations terrain et forestières",
    sousMods:[
      {n:1,  nom:"Operations",  fn:"Centraliser et piloter l'ensemble des activités opérationnelles.", statut:"ok",      app:"Tableau de bord"},
      {n:2,  nom:"Commercial",  fn:"Gérer contacts, prospects, propriétaires, clients et opportunités.", statut:"ok",      app:"Lots (fiche propriétaire)"},
      {n:3,  nom:"Forest",      fn:"Recenser parcelles, peuplements, essences, accès et potentiels forestiers.", statut:"ok",   app:"Parcelles & Travaux"},
      {n:4,  nom:"Worksite",    fn:"Préparer, suivre et clôturer les chantiers forestiers.", statut:"ok",      app:"Chantiers"},
      {n:5,  nom:"Lots",        fn:"Créer et suivre chaque lot de son origine à sa destination.", statut:"ok",      app:"Lots"},
      {n:6,  nom:"Stock",       fn:"Mesurer et gérer les tas, volumes, tonnages et stocks.", statut:"roadmap", app:"—"},
      {n:7,  nom:"Production",  fn:"Suivre le broyage, les rendements et les quantités produites.", statut:"partial", app:"Transports (déchiquetage)"},
      {n:8,  nom:"Planning",    fn:"Planifier les visites, chantiers, broyages et interventions.", statut:"ok",      app:"Planning"},
      {n:9,  nom:"Equipment",   fn:"Gérer les matériels, entretiens, pannes et disponibilités.", statut:"roadmap", app:"—"},
      {n:10, nom:"Workflow",    fn:"Encadrer les opérations avec étapes, validations et règles métier.", statut:"ok",   app:"Formulaire visite 12 étapes"},
      {n:11, nom:"Mobile",      fn:"Permettre la saisie et la consultation sur smartphone ou tablette.", statut:"ok",   app:"Interface responsive terrain"},
      {n:12, nom:"Offline",     fn:"Garantir la saisie terrain sans réseau et la synchronisation.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"logistics",
    nom:"APPLITAG Logistics",
    icon:"🚛",
    couleur:"#0369A1",
    bg:"#DBEAFE",
    tagline:"Organiser les transports, livraisons et chaufferies",
    sousMods:[
      {n:13, nom:"Logistics",      fn:"Planifier les chargements, véhicules, chauffeurs, itinéraires.", statut:"ok",      app:"Transports"},
      {n:14, nom:"Delivery",       fn:"Enregistrer les pesées, livraisons, signatures, réserves et refus.", statut:"ok",   app:"Livraisons"},
      {n:15, nom:"Platforms",      fn:"Piloter les entrées, sorties, stocks et zones des plateformes.", statut:"partial", app:"Livraisons (réception)"},
      {n:16, nom:"Heating Plants", fn:"Suivre les besoins, stocks, consommations et livraisons des chaufferies.", statut:"ok", app:"Chaufferies"},
    ],
  },
  {
    id:"traceability",
    nom:"APPLITAG Traceability",
    icon:"🔍",
    couleur:"#7C3AED",
    bg:"#EDE9FE",
    tagline:"Traçabilité, qualité et conformité de la parcelle à la chaufferie",
    sousMods:[
      {n:17, nom:"Traceability", fn:"Assurer une continuité d'information de la parcelle au client final.", statut:"ok",      app:"QR code lot, statuts bout-en-bout"},
      {n:18, nom:"Quality",      fn:"Contrôler l'humidité, la granulométrie, les essences et la conformité.", statut:"partial", app:"Livraisons (humidité mesurée)"},
      {n:19, nom:"Documents",    fn:"Générer, classer et rattacher les documents aux opérations.", statut:"ok",      app:"Documents (9 types, PDF)"},
      {n:20, nom:"Compliance",   fn:"Gérer les obligations réglementaires, certifications et audits.", statut:"ok",      app:"Veille réglementaire"},
      {n:21, nom:"RED",          fn:"Collecter les données nécessaires aux exigences RED II et RED III.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"data",
    nom:"APPLITAG Data",
    icon:"📊",
    couleur:"#B45309",
    bg:"#FEF3C7",
    tagline:"Transformer les données en tableaux de bord, alertes et analyses",
    sousMods:[
      {n:22, nom:"Data",    fn:"Produire des tableaux de bord, indicateurs, analyses et prévisions.", statut:"ok",   app:"Analyses & Rapports"},
      {n:23, nom:"Map",     fn:"Cartographier les parcelles, stocks, chantiers, plateformes et chaufferies.", statut:"ok", app:"Territoire (CARTOFOB)"},
      {n:24, nom:"Alert",   fn:"Détecter les retards, anomalies, ruptures et documents manquants.", statut:"ok",   app:"Alertes"},
      {n:25, nom:"Finance", fn:"Calculer les coûts, marges, rentabilités, valeurs de stocks et écarts.", statut:"ok", app:"Analyses (marges, CA, rentabilité)"},
    ],
  },
  {
    id:"connect",
    nom:"APPLITAG Connect",
    icon:"🔗",
    couleur:"#065F46",
    bg:"#CCFBF1",
    tagline:"Connecter utilisateurs, partenaires et systèmes externes",
    sousMods:[
      {n:26, nom:"Connect",       fn:"Relier APPLITAG aux ERP, ponts-bascules, GPS, capteurs et logiciels partenaires.", statut:"roadmap", app:"—"},
      {n:27, nom:"Administration",fn:"Paramétrer les entreprises, utilisateurs, rôles, droits et modèles.", statut:"ok",      app:"Utilisateurs & Paramètres"},
      {n:28, nom:"Owner",         fn:"Offrir au propriétaire un accès à ses parcelles, chantiers et documents.", statut:"roadmap", app:"—"},
      {n:29, nom:"Client Portal", fn:"Donner aux clients une visibilité sur leurs stocks, livraisons et qualités.", statut:"roadmap", app:"—"},
      {n:30, nom:"Demo",          fn:"Présenter la plateforme à partir de scénarios et données fictives.", statut:"ok",      app:"Démo scénario"},
      {n:31, nom:"Pilot",         fn:"Préparer les déploiements pilotes et suivre les retours utilisateurs.", statut:"roadmap", app:"—"},
    ],
  },
  {
    id:"network",
    nom:"APPLITAG Network",
    icon:"🤝",
    couleur:"#6D28D9",
    bg:"#EDE9FE",
    tagline:"Réseau professionnel et mise en relation de la filière",
    sousMods:[
      {n:32, nom:"Network",     fn:"Constituer un annuaire professionnel qualifié des acteurs de la filière.", statut:"ok",   app:"Réseau & Offres (annuaire)"},
      {n:33, nom:"Marketplace", fn:"Mettre en relation les offres et besoins de bois, transport et prestations.", statut:"ok", app:"Réseau & Offres (offres)"},
    ],
  },
  {
    id:"academy",
    nom:"APPLITAG Academy & Media",
    icon:"🎓",
    couleur:"#92400E",
    bg:"#FEF3C7",
    tagline:"Former, informer et valoriser les acteurs du bois-énergie",
    sousMods:[
      {n:34, nom:"Academy", fn:"Former les utilisateurs aux outils, métiers, normes et bonnes pratiques.", statut:"futur", app:"—"},
      {n:35, nom:"Radio",   fn:"Diffuser interviews, actualités, chroniques et émissions professionnelles.", statut:"futur", app:"—"},
      {n:36, nom:"TV",      fn:"Diffuser reportages, démonstrations, formations et événements de la filière.", statut:"futur", app:"—"},
    ],
  },
];

const SM_STATUT = {
  ok:      {label:"Disponible",  color:"#065F46", bg:"#D1FAE5", icon:"✅"},
  partial: {label:"Partiel",     color:"#92400E", bg:"#FEF3C7", icon:"🔄"},
  roadmap: {label:"Roadmap",     color:"#0369A1", bg:"#DBEAFE", icon:"🔜"},
  futur:   {label:"Futur",       color:"#6D28D9", bg:"#EDE9FE", icon:"🔵"},
};

export const SectionModulesFuturs = () => {
  const [selMod, setSelMod] = useState("operations");
  const [filtre, setFiltre] = useState("all");
  const mod = MODULES_COMMERCIAUX.find(m=>m.id===selMod);

  const smFiltres = filtre==="all" ? mod.sousMods : mod.sousMods.filter(s=>s.statut===filtre);

  const totals = {
    ok:      MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="ok").length,
    partial: MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="partial").length,
    roadmap: MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="roadmap").length,
    futur:   MODULES_COMMERCIAUX.flatMap(m=>m.sousMods).filter(s=>s.statut==="futur").length,
  };

  return (
    <div style={{maxWidth:1040,margin:"0 auto"}}>
      {/* En-tête */}
      <div style={{marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12,marginBottom:16}}>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.tx,marginBottom:4}}>
              🗂️ Architecture fonctionnelle APPLITAG
            </div>
            <div style={{fontSize:13,color:C.tx2}}>7 modules commerciaux · 36 sous-modules · classification officielle</div>
          </div>
          {/* Légende compteurs */}
          <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {Object.entries(SM_STATUT).map(([k,s])=>(
              <div key={k} style={{display:"flex",alignItems:"center",gap:5,
                padding:"5px 10px",borderRadius:20,background:s.bg,
                border:`1px solid ${s.color}44`,fontSize:11,fontWeight:700,color:s.color}}>
                {s.icon} {totals[k]} {s.label}
              </div>
            ))}
          </div>
        </div>

        {/* 7 cartes modules */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:8}}>
          {MODULES_COMMERCIAUX.map(m=>{
            const nbOk = m.sousMods.filter(s=>s.statut==="ok").length;
            const total = m.sousMods.length;
            const isActive = selMod===m.id;
            return (
              <div key={m.id} onClick={()=>setSelMod(m.id)}
                style={{background:"#fff",borderRadius:12,padding:"12px 10px",cursor:"pointer",
                  border:`2px solid ${isActive?m.couleur:C.bd}`,
                  boxShadow:isActive?`0 0 0 3px ${m.bg}`:"none",
                  transition:"all .2s",textAlign:"center"}}>
                <div style={{fontSize:26,marginBottom:6}}>{m.icon}</div>
                <div style={{fontSize:10,fontWeight:800,color:isActive?m.couleur:C.tx,lineHeight:1.2,marginBottom:6}}>
                  {m.nom.replace("APPLITAG ","")}
                </div>
                <div style={{height:4,borderRadius:2,background:"#E5E7EB",overflow:"hidden",marginBottom:5}}>
                  <div style={{height:"100%",borderRadius:2,background:m.couleur,
                    width:`${Math.round((nbOk/total)*100)}%`}}/>
                </div>
                <div style={{fontSize:9,color:C.tx2}}>{nbOk}/{total} dispo</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Détail module sélectionné */}
      {mod&&(
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          {/* Header module */}
          <div style={{background:mod.bg,borderBottom:`1px solid ${mod.couleur}22`,
            padding:"14px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:30}}>{mod.icon}</span>
              <div>
                <div style={{fontSize:16,fontWeight:900,color:mod.couleur}}>{mod.nom}</div>
                <div style={{fontSize:12,color:C.tx2}}>{mod.tagline}</div>
              </div>
            </div>
            {/* Filtre statut */}
            <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
              {[["all","Tous","#374151","#F3F4F6"],...Object.entries(SM_STATUT).map(([k,s])=>[k,s.label,s.color,s.bg])].map(([k,label,col,bg])=>(
                <button key={k} onClick={()=>setFiltre(k)}
                  style={{padding:"4px 10px",borderRadius:20,fontSize:11,fontWeight:700,cursor:"pointer",
                    fontFamily:"inherit",border:`1px solid ${filtre===k?col:"#E5E7EB"}`,
                    background:filtre===k?bg:"transparent",color:filtre===k?col:C.tx2}}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Grille sous-modules */}
          <div style={{padding:"16px 20px",display:"grid",
            gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
            {smFiltres.map(sm=>{
              const ss = SM_STATUT[sm.statut];
              return (
                <div key={sm.n} style={{borderRadius:10,border:`1px solid ${ss.color}33`,
                  background:`${ss.bg}60`,padding:"12px 14px",position:"relative"}}>
                  {/* Numéro + statut */}
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:8}}>
                    <span style={{fontSize:9,fontWeight:800,color:ss.color,
                      background:ss.bg,border:`1px solid ${ss.color}44`,
                      padding:"2px 7px",borderRadius:10}}>
                      #{sm.n} {ss.icon} {ss.label}
                    </span>
                  </div>
                  <div style={{fontSize:14,fontWeight:800,color:mod.couleur,marginBottom:4}}>{sm.nom}</div>
                  <div style={{fontSize:11,color:C.tx2,lineHeight:1.5,marginBottom:8}}>{sm.fn}</div>
                  {sm.app!=="—"&&(
                    <div style={{display:"inline-flex",alignItems:"center",gap:5,
                      fontSize:10,fontWeight:700,color:mod.couleur,
                      background:mod.bg,border:`1px solid ${mod.couleur}33`,
                      padding:"3px 8px",borderRadius:6}}>
                      📍 {sm.app}
                    </div>
                  )}
                  {sm.app==="—"&&(
                    <div style={{fontSize:10,color:"#9CA3AF",fontStyle:"italic"}}>Non encore développé</div>
                  )}
                </div>
              );
            })}
            {smFiltres.length===0&&(
              <div style={{gridColumn:"1/-1",textAlign:"center",padding:30,color:C.tx2,fontSize:13}}>
                Aucun sous-module dans ce filtre pour ce module.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};


// ── FINANCEMENTS & RESTAURATION FORESTIÈRE ─────────────────────

export const STATUT_REG = {
  BROUILLON:                   {label:"Brouillon",               color:"#6B7280", bg:"#F3F4F6"},
  ANNONCE_EN_ATTENTE_DE_TEXTE: {label:"Annoncé – texte attendu", color:"#92400E", bg:"#FEF3C7"},
  OUVERT:                      {label:"Ouvert",                  color:"#065F46", bg:"#D1FAE5"},
  SUSPENDU:                    {label:"Suspendu",                color:"#B45309", bg:"#FEF3C7"},
  FERME:                       {label:"Fermé",                   color:"#991B1B", bg:"#FEE2E2"},
  REMPLACE:                    {label:"Remplacé",                color:"#5B21B6", bg:"#EDE9FE"},
  EXPIRE:                      {label:"Expiré",                  color:"#374151", bg:"#E5E7EB"},
};

export const FUNDING_PROGRAMS = [
  {
    id:"fff2100",
    nom:"France Forêt 2100",
    acronyme:"FFF2100",
    type:"Plateforme de mise en relation",
    organisme:"Start-up d'État — pilotage Gouvernement",
    origine:"État",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:null,
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Collectivités","Gestionnaires","Établissements publics","Porteurs de projets"],
    operationsEligibles:["Restauration de massifs","Renouvellement","Adaptation climatique","Projets carbone/biodiversité"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Connecteur désactivé — aucune API officielle publiée. Intermédiaire de financement, pas un guichet de subvention ouvert.",
    couleur:"#1E5B3A", bg:"#D1FAE5",
    icon:"🌳",
    fonctions:[
      "Dépôt d'un projet forestier",
      "Recherche de financeurs publics et privés",
      "Mise en relation",
      "Suivi des manifestations d'intérêt",
      "Construction d'un plan de financement combiné",
    ],
  },
  {
    id:"fonds-vert-foret-2027",
    nom:"Fonds vert – Adaptation des forêts",
    acronyme:"FV-FORET",
    type:"Subvention",
    organisme:"Ministère de la Transition écologique",
    origine:"État – Fonds vert (1 Md€ total)",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"Budget 2027",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Collectivités","Propriétaires","Gestionnaires","Établissements publics"],
    operationsEligibles:["Restauration de massifs incendiés","Adaptation climatique","Résilience forestière","Zones tampons","Prévention incendie","Réduction de la vulnérabilité"],
    tauxMin:null, tauxMax:null, plafond:null,
    montantNational:"100 000 000 €",
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Taux, plafonds et procédures non encore publiés. Budget 2027 à voter.",
    couleur:"#0369A1", bg:"#DBEAFE",
    icon:"💧",
    fonctions:[
      "Restauration massifs incendiés",
      "Renouvellement peuplements dépérissants",
      "Création zones tampons",
      "Prévention des incendies",
    ],
  },
  {
    id:"renouvellement-foret-2027",
    nom:"Renouvellement forestier 2027",
    acronyme:"RF2027",
    type:"Aide au renouvellement",
    organisme:"À préciser",
    origine:"État",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"À partir de 2027",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Gestionnaires"],
    operationsEligibles:["Parcelles touchées nématode du pin","Peuplements ≥ 40 % dépérissement","Renouvellement","Enrichissement","Régénération naturelle","Plantation"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Seuil de 40 % de dépérissement annoncé. Règles non bloquantes jusqu'à publication des textes d'application.",
    couleur:"#7C3AED", bg:"#EDE9FE",
    icon:"🌱",
    fonctions:[
      "Nématode du pin – éligibilité des parcelles touchées",
      "Dépérissement ≥ 40 % – ciblage des peuplements",
      "Renouvellement et enrichissement",
      "Régénération naturelle assistée",
    ],
  },
  {
    id:"label-bas-carbone",
    nom:"Label bas-carbone forestier",
    acronyme:"LBC",
    type:"Financement carbone privé",
    organisme:"Ministère chargé de l'Écologie",
    origine:"Financeurs privés – marché carbone volontaire",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:"Avant fin 2026",
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires forestiers","Gestionnaires","Porteurs de projets"],
    operationsEligibles:["Boisement","Reconstitution","Enrichissement","Régénération","Stockage carbone","Suivi peuplements vulnérables"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026 — Nouvelle méthode annoncée",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Nouvelle méthode permettant de financer l'enrichissement des peuplements vulnérables. Cahier des charges non encore publié.",
    couleur:"#065F46", bg:"#CCFBF1",
    icon:"🌿",
    fonctions:[
      "Unités carbone générées et vérifiées",
      "Financement par entreprises privées",
      "Suivi pluriannuel des peuplements",
      "Certification et contrôle tiers",
    ],
  },
  {
    id:"credits-biodiversite",
    nom:"Crédits biodiversité",
    acronyme:"CB",
    type:"Financement services écosystémiques",
    organisme:"À préciser",
    origine:"État – financeurs privés",
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    dateAnnonce:"21 juillet 2026",
    dateOuverture:null,
    dateCloture:null,
    territoire:"National",
    beneficiaires:["Propriétaires","Collectivités","Porteurs de projets"],
    operationsEligibles:["Services écosystémiques","Habitats forestiers","Conservation","Restauration biodiversité"],
    tauxMin:null, tauxMax:null, plafond:null,
    texteRef:"Communiqué gouvernemental – 21 juillet 2026",
    urlOfficielle:null,
    version:"v0.1-annonce",
    derniereVerif:"21 juillet 2026",
    notes:"Calendrier non précisé. Structure générique à paramétrer à l'ouverture du dispositif.",
    couleur:"#92400E", bg:"#FEF3C7",
    icon:"🦋",
    fonctions:[
      "Services écosystémiques forestiers",
      "Habitats et indicateurs de biodiversité",
      "Engagements de conservation",
      "Contrôles et résultats pluriannuels",
    ],
  },
];

export const WORKFLOW_FIN_STEPS = [
  {n:1,  label:"Projet identifié",              icon:"🔍", desc:"Identification de la parcelle et du besoin de restauration ou de renouvellement."},
  {n:2,  label:"Parcelle enregistrée",          icon:"📍", desc:"Enregistrement dans APPLITAG avec références cadastrales et coordonnées GPS."},
  {n:3,  label:"Diagnostic forestier",          icon:"🌲", desc:"Diagnostic sanitaire : essence, âge, dépérissement, nématode, risques climatiques, photos géolocalisées."},
  {n:4,  label:"Recherche des dispositifs",     icon:"🔎", desc:"Interrogation du moteur de règles pour identifier les programmes potentiellement compatibles."},
  {n:5,  label:"Pré-éligibilité",               icon:"✅", desc:"Vérification automatique des critères d'éligibilité principaux (localisation, bénéficiaire, surface, seuils)."},
  {n:6,  label:"Sélection du dispositif",       icon:"🎯", desc:"Choix du ou des programmes retenus par le porteur de projet."},
  {n:7,  label:"Construction du budget",        icon:"🧮", desc:"Saisie des postes de coûts, devis, essences, surfaces. Indicateur prévisionnel : 5 000 à 10 000 €/ha."},
  {n:8,  label:"Plan de financement",           icon:"💶", desc:"Répartition entre financeurs, calcul du reste à charge, simulation de scénarios."},
  {n:9,  label:"Collecte des pièces",           icon:"📎", desc:"Rassemblement des justificatifs requis : titre de propriété, cadastre, DGD, diagnostic, devis, RIB…"},
  {n:10, label:"Contrôle de complétude",        icon:"🔄", desc:"Vérification automatique des pièces obligatoires et signalement des manquantes."},
  {n:11, label:"Validation interne",            icon:"👁️", desc:"Contrôle par le gestionnaire forestier avant dépôt."},
  {n:12, label:"Dépôt",                         icon:"📤", desc:"Transmission du dossier à l'organisme instructeur."},
  {n:13, label:"Instruction",                   icon:"⚖️", desc:"Examen du dossier par l'instructeur. Délai en attente."},
  {n:14, label:"Demande de complément",         icon:"📬", desc:"L'instructeur demande des pièces supplémentaires ou des précisions."},
  {n:15, label:"Accord ou refus",               icon:"🏛️", desc:"Décision de l'organisme financeur. Montant accordé enregistré."},
  {n:16, label:"Autorisation de commencer",     icon:"🚦", desc:"L'autorisation de démarrer les travaux est reçue. Blocage si travaux prématurés."},
  {n:17, label:"Réalisation des travaux",       icon:"🪓", desc:"Exécution : plantation, régénération, sécurisation, préparation du sol, protection…"},
  {n:18, label:"Collecte des preuves",          icon:"📸", desc:"Photos géolocalisées avant/pendant/après, bons de livraison plants, fiches chantier."},
  {n:19, label:"Demande acompte/solde",         icon:"📄", desc:"Constitution de la demande de paiement avec dépenses présentées et justificatifs."},
  {n:20, label:"Contrôle",                      icon:"🔍", desc:"Contrôle par le financeur ou un contrôleur mandaté. Accès limité au dossier autorisé."},
  {n:21, label:"Paiement",                      icon:"💳", desc:"Versement de l'acompte ou du solde. Date et montant enregistrés dans le journal."},
  {n:22, label:"Suivi pluriannuel",             icon:"📅", desc:"Suivi de reprise, contrôle carbone ou biodiversité, obligations de conservation."},
  {n:23, label:"Clôture",                       icon:"✅", desc:"Validation de la bonne fin du projet par toutes les parties."},
  {n:24, label:"Archivage réglementaire",       icon:"🗄️", desc:"Conservation sécurisée des documents pendant la durée réglementaire. Journal d'audit non modifiable."},
];

export const DEMO_DOSSIER = {
  id:"DOS-2026-001",
  programme:"France Forêt 2100 + Fonds vert",
  proprietaire:"M. Henri Bernard",
  parcelle:"Forêt de Tronçais — 12 ha — Allier (03)",
  surface:12,
  dateCreation:"22 juillet 2026",
  statut:"DIAGNOSTIC EN COURS",
  stepCurrent:3,
  montantDemande:96000,
  tauxDepVt:null,
  piecesManquantes:["Titre de propriété","Document de gestion durable","Devis entreprise"],
  piecesOk:["Diagnostic parcellaire (provisoire)","Références cadastrales","RIB"],
  alertes:[
    {type:"warning", msg:"Document de gestion durable manquant — obligatoire pour tous les programmes."},
    {type:"info",    msg:"Les programmes sélectionnés sont au statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Aucune demande de subvention déposable à ce jour."},
    {type:"info",    msg:"Indicateur prévisionnel : 5 000–10 000 €/ha, soit 60 000–120 000 € pour 12 ha. Modifiable."},
  ],
};

export const CONTROLES_AUTO = [
  {statut:"ok",      msg:"Bénéficiaire identifié : propriétaire forestier privé — compatible tous programmes."},
  {statut:"ok",      msg:"Localisation : Forêt de Tronçais, Allier (03) — territoire national éligible."},
  {statut:"ok",      msg:"Surface : 12 ha — au-dessus du seuil minimal présumé."},
  {statut:"warning", msg:"Taux de dépérissement : non encore mesuré. Requis pour RF2027 (seuil 40 %)."},
  {statut:"warning", msg:"Nématode du pin : statut non vérifié sur cette parcelle."},
  {statut:"error",   msg:"Travaux non démarrés — autorisation préalable requise avant tout commencement (règle bloquante)."},
  {statut:"ok",      msg:"Aucun dépassement budgétaire détecté."},
  {statut:"warning", msg:"Document de gestion durable (DGD) absent — pièce obligatoire."},
  {statut:"info",    msg:"Règles réglementaires : statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Contrôles non bloquants jusqu'à publication des textes."},
];

const VEILLE_REG = [
  {
    date:"21 juillet 2026", type:"annonce", statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    titre:"Communiqué gouvernemental — Réunion Barbut / Lefèvre",
    programme:"Tous dispositifs forêt",
    contenu:"Annonce de France Forêt 2100, Fonds vert (100 M€), Renouvellement forestier, Label bas-carbone nouvelle méthode, Crédits biodiversité. Textes budgétaires et réglementaires à venir.",
    impact:"APPLITAG enregistre les 5 dispositifs en statut ANNONCÉ_EN_ATTENTE_DE_TEXTE. Aucun dossier ne peut être déposé.",
    icon:"📢", color:"#92400E", bg:"#FEF3C7",
  },
  {
    date:"21 juillet 2026", type:"info", statut:"info",
    titre:"Coût de restauration : indicateur prévisionnel",
    programme:"Tous dispositifs",
    contenu:"Le Gouvernement évalue le coût moyen de restauration entre 5 000 et 10 000 €/ha. Cet indicateur est intégré dans APPLITAG comme valeur modifiable, non comme barème réglementaire.",
    impact:"Indicateur prévisionnel disponible dans le module Budget. Modifiable par l'utilisateur.",
    icon:"📊", color:"#0369A1", bg:"#DBEAFE",
  },
  {
    date:"21 juillet 2026", type:"calendrier", statut:"info",
    titre:"Point d'étape gouvernemental prévu",
    programme:"Tous dispositifs",
    contenu:"Présentation des premiers engagements et résultats attendue en septembre 2026.",
    impact:"Surveillance programmée — mise à jour des dispositifs prévue à réception.",
    icon:"📅", color:"#065F46", bg:"#D1FAE5",
  },
];

/* Versionnement réglementaire — Aide au renouvellement forestier
   Décret 2025-05-02 annulé CE 15/07/2026 · Arrêté d'application survivant */
const RENOUVELLEMENT_VERSIONS = [
  {
    version:"v0.0",
    label:"Avant-décret",
    dateDebut:"2020",
    dateFin:"2025-04-30",
    statut:"EXPIRE",
    texte:"Régime antérieur — PSG / CBPS comme condition d'éligibilité",
    urlTexte:null,
    dateConsult:null,
    versionCahier:null,
    piecesCles:["PSG ou CBPS","Plan de reboisement","Devis travaux","Relevé parcellaire"],
    reservesJur:[],
    notes:"Régime de référence avant la réforme 2025.",
  },
  {
    version:"v1.0",
    label:"Décret du 2 mai 2025",
    dateDebut:"2025-05-02",
    dateFin:"2026-07-15",
    statut:"ANNULE",
    texte:"Décret n° 2025-XXX du 2 mai 2025 — annulé par le Conseil d'État le 15 juillet 2026",
    urlTexte:null,
    dateConsult:"Non réalisée — motif d'annulation",
    versionCahier:"v1.0 (2025)",
    piecesCles:["Plan de reboisement adapté au climat","Diagnostic sylvicole","Engagement de suivi 10 ans","Devis entrepreneur agréé"],
    reservesJur:[
      "Décret annulé CE 15/07/2026 faute de consultation préalable du public (art. L123-19-1 CE)",
      "L'arrêté d'application n'a pas été annulé — recours jugé tardif",
      "Les dossiers acceptés sous ce régime ne sont pas automatiquement annulés",
      "Ne pas utiliser les critères d'éligibilité de ce décret comme cadre définitif",
    ],
    notes:"ATTENTION — Ce texte a été annulé. L'arrêté d'application subsiste mais son champ d'application autonome est incertain.",
  },
  {
    version:"v1.1",
    label:"Arrêté d'application (survivant)",
    dateDebut:"2026-07-15",
    dateFin:null,
    statut:"SUSPENDU",
    texte:"Arrêté d'application du 2 mai 2025 — non annulé (recours tardif)",
    urlTexte:null,
    dateConsult:null,
    versionCahier:"v1.0 (2025) — portée à confirmer",
    piecesCles:["À confirmer par le ministère"],
    reservesJur:[
      "Portée autonome de l'arrêté sans son décret-support incertaine — avis juridique recommandé",
      "Guichet classé SUSPENDU par le ministère de l'Agriculture",
      "Aucun dépôt conseillé avant clarification officielle",
    ],
    notes:"Situation intermédiaire au 22/07/2026. En attente d'un nouveau décret de base ou d'une clarification ministérielle.",
  },
  {
    version:"v2.0",
    label:"Nouveau cadre (attendu)",
    dateDebut:null,
    dateFin:null,
    statut:"ANNONCE_EN_ATTENTE_DE_TEXTE",
    texte:"Nouveau décret à venir — annonce SNBC 3 / Plan forêt 2026",
    urlTexte:null,
    dateConsult:"À prévoir — consultation publique obligatoire",
    versionCahier:"À publier",
    piecesCles:["À définir par le nouveau texte"],
    reservesJur:[
      "Aucune règle d'éligibilité du régime annulé ne doit être appliquée par anticipation",
      "Objectif SNBC 3 : renouveler 10 % des forêts françaises d'ici 2032",
      "Zones prioritaires : dépérissantes et DFCI",
    ],
    notes:"APPLITAG est techniquement prêt. Aucun moteur d'éligibilité définitif ne sera activé avant la parution du nouveau cadre.",
  },
];

