// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { C } from "../../design-system/tokens.js";


// ── DÉMO SCÉNARIO COMPLET ──────────────────────────────────────
const DEMO_STEPS = [
  {
    id:1, icon:"📱", label:"Signal Connect",
    who:"M. Bernard — propriétaire forestier",
    date:"08 avril 2026", heure:"08h42",
    statut:"SIGNAL_PROPRIETAIRE",
    resume:"M. Bernard signale 12 ha de bois disponibles via APPLITAG Connect depuis son téléphone.",
    detail:"M. Henri Bernard ouvre APPLITAG Connect sur son iPhone. Il localise sa parcelle sur la carte IGN, photographie l'entrée du chemin et deux arbres représentatifs, saisit l'essence principale (chêne + acacia), une estimation visuelle du volume, et valide. L'alerte arrive instantanément chez le mandataire ALTEGAD.",
    docs:["📲 Signalement numérique","📸 3 photos géolocalisées"],
    kpis:[{icon:"📐",label:"Surface signalée",val:"12 ha"},{icon:"🌲",label:"Essences",val:"Chêne + Acacia"},{icon:"⏱️",label:"Délai alerte",val:"< 30 secondes"}],
    color:"#0369A1",bg:"#E0F2FE",
    script:[
      "Nous démarrons la démonstration avec le tout nouveau point d'entrée d'APPLITAG : le signal propriétaire depuis APPLITAG Connect.",
      "M. Bernard est propriétaire de 12 ha en forêt de Tronçais. Depuis son téléphone, sans aucune connaissance technique, il localise sa parcelle sur la carte, prend trois photos et valide son signalement en moins de deux minutes.",
      "L'alerte arrive instantanément chez le mandataire ALTEGAD. Le lot LOT-2026-042 est créé automatiquement dans le système avec toutes les données saisies. Rien à ressaisir, rien à transcrire.",
      "C'est une rupture avec les pratiques habituelles : le propriétaire n'attend plus qu'on le rappelle — c'est lui qui initie, depuis son canapé, la chaîne complète de valorisation de ses bois.",
    ],
  },
  {
    id:2, icon:"🛣️", label:"Vérification desserte",
    who:"Mandataire forestier",
    date:"09 avril 2026", heure:"09h15",
    statut:"QUALIFICATION_ACCES",
    resume:"Le mandataire consulte le module Desserte avant d'engager la visite terrain.",
    detail:"Avant de se déplacer, le mandataire ouvre le module Desserte dans APPLITAG. Il vérifie le tronçon TRC-001 (Chemin des Battets), sa portance renforcée (≥ 19 t), sa largeur de 4,5 m, la disponibilité d'une place de dépôt, et la conformité DFCI de l'accès incendie. L'accès est validé pour un porteur + grumier.",
    docs:["🛣️ Fiche tronçon TRC-001","📋 Contrôle portance & accès"],
    kpis:[{icon:"⚖️",label:"Portance",val:"Renforcée ≥ 19 t"},{icon:"📐",label:"Largeur",val:"4,5 m"},{icon:"🔥",label:"Accès DFCI",val:"Conforme"}],
    color:"#1E40AF",bg:"#DBEAFE",
    script:[
      "Avant d'envoyer un mandataire sur le terrain, APPLITAG permet maintenant de vérifier la desserte depuis le bureau.",
      "Le module Desserte référence tous les tronçons forestiers avec leur portance, largeur, pente maximale, place de dépôt et conformité aux règles incendie DFCI. Ici, le tronçon Battets est renforcé, large et DFCI conforme — le porteur et le grumier pourront circuler sans restriction.",
      "Si la desserte avait été classée 'À améliorer' ou 'Légère', le mandataire aurait pu engager une procédure de travaux ou choisir un engin plus léger — tout ça décidé depuis le bureau, sans trajet inutile.",
      "C'est l'un des nouveaux modules du sprint APPLITAG : un référentiel vivant des 585 tonnes mobilisables accessibles sur ce périmètre.",
    ],
  },
  {
    id:3, icon:"🔭", label:"Visite terrain",
    who:"Mandataire + propriétaire",
    date:"14 avril 2026", heure:"10h00",
    statut:"VISITE_TERRAIN",
    resume:"Visite terrain avec formulaire 12 étapes. GPS relevé. Arbitrage SNBC 3. PV signé sur place.",
    detail:"Le mandataire ouvre le formulaire de visite guidé en 12 étapes. Il géolocalise, photographie, cube les bois (180 m³ bois d'œuvre + 320 m³ rémanents), et complète le nouveau bloc SNBC 3 : usage potentiel 'mixte BO/BE', usage retenu 'bois énergie' pour les rémanents, niveau de sécurisation 'mobilisable sous conditions'. Certification PEFC parcelle n°23-0042.",
    docs:["📄 PV de visite terrain","📄 Rapport de cubage","📊 Arbitrage SNBC 3"],
    kpis:[{icon:"🪵",label:"Bois d'œuvre",val:"180 m³"},{icon:"🌀",label:"Plaquettes",val:"320 m³ → ~128 t"},{icon:"📍",label:"GPS",val:"46.58°N / 2.77°E"}],
    color:"#065F46",bg:"#D1FAE5",
    script:[
      "Le mandataire se rend sur place. Depuis APPLITAG mobile, il suit le formulaire de visite en 12 étapes guidées.",
      "Nouveauté SNBC 3 : APPLITAG demande maintenant l'arbitrage sur le flux de bois. Usage potentiel mixte bois-œuvre et bois-énergie — usage retenu bois-énergie pour les rémanents uniquement. Cette distinction est obligatoire pour la conformité réglementaire.",
      "Le cubage est saisi directement : 180 m³ de bois d'œuvre qui partiront en scierie, et 320 m³ de rémanents qui seront déchiquetés. La valeur carbone et le bilan GES sont déjà calculés en arrière-plan.",
      "Signature électronique du procès-verbal par les deux parties, sur le téléphone, avant même de quitter la parcelle.",
    ],
  },
  {
    id:4, icon:"📋", label:"Lot & contrat",
    who:"Admin APPLITAG",
    date:"15 avril 2026", heure:"14h30",
    statut:"EN_PREPARATION",
    resume:"Lot LOT-2026-042 créé. Contrat signé. QR Code chantier généré. Desserte validée.",
    detail:"Le lot est finalisé. Conditions de vente : bois d'œuvre à 45 €/m³, plaquettes à 38 €/t livraison chaufferie. Contrat signé électroniquement. QR Code chantier généré et imprimé pour l'ETF. La parcelle B 112–B 114 est liée au tronçon TRC-001 dans le module Desserte.",
    docs:["📄 Bon de commande BC-2026-042","📄 Contrat d'exploitation","🏷️ QR Code chantier"],
    kpis:[{icon:"🔢",label:"N° lot",val:"LOT-2026-042"},{icon:"💶",label:"Valeur estimée",val:"13 220 €"},{icon:"📅",label:"Deadline",val:"30 mai 2026"}],
    color:"#7C3AED",bg:"#EDE9FE",
    script:[
      "Le lot existe déjà depuis le signal Connect. Cette étape consiste uniquement à le finaliser — les données de la visite sont déjà intégrées, rien à ressaisir.",
      "Les conditions commerciales sont fixées. Le contrat est généré en PDF et signé électroniquement. Le QR code unique du chantier est imprimé et remis à l'ETF.",
      "Nouveauté : la parcelle B 112 est désormais liée au tronçon de desserte TRC-001 dans APPLITAG. Si le tronçon change de statut — travaux, fermeture saisonnière — tous les lots associés sont alertés automatiquement.",
    ],
  },
  {
    id:5, icon:"🪓", label:"Exploitation chantier",
    who:"ETF Dupont Frères",
    date:"20 avril 2026", heure:"07h45",
    statut:"EN_EXPLOITATION",
    resume:"Abattage harvester + débardage porteur. Saisie quotidienne dans APPLITAG. QR scanné à l'arrivée.",
    detail:"ETF Dupont Frères (agrément PEFC n°2023-0156). 3 opérateurs : 1 harvester + 1 porteur. Le chef de chantier scanne le QR à l'arrivée, ce qui déclenche le statut 'En exploitation'. Saisie quotidienne des volumes. Alerte automatique si écart > 10% vs estimation visite.",
    docs:["📄 Ordre d'exploitation","📲 Scan QR arrivée chantier","📊 Suivi volumes quotidien"],
    kpis:[{icon:"🪓",label:"Abattage",val:"183 m³"},{icon:"🚜",label:"Débardage",val:"183 m³"},{icon:"⏱️",label:"Durée",val:"8 jours"}],
    color:"#1E5B3A",bg:"#DCFCE7",
    script:[
      "L'ETF reçoit l'ordre d'exploitation depuis APPLITAG. Le scan du QR code le matin du premier jour déclenche automatiquement le statut En exploitation.",
      "Chaque soir, l'opérateur saisit les volumes abattus. Le mandataire suit l'avancement en temps réel sans appel téléphonique.",
      "Si un opérateur découvre une contrainte non identifiée — une zone humide, un câble — il la signale depuis l'application avec une photo géolocalisée. Une alerte est envoyée au mandataire dans la minute.",
    ],
  },
  {
    id:6, icon:"♻️", label:"Scierie & coproduits",
    who:"Scierie Moreau — Moulins",
    date:"28 avril 2026", heure:"07h00",
    statut:"BOIS_OEUVRE_EN_SCIERIE",
    resume:"Les 183 m³ de bois d'œuvre partent en scierie. Coproduits qualifiés et tracés dans APPLITAG.",
    detail:"Le bois d'œuvre (chêne, 183 m³) est livré à la Scierie Moreau. Dans le module Coproduits, les connexes sont immédiatement qualifiés : 45 t de plaquettes P31 (humidité 30%), 12 t de sciures (humidité 45%, valorisation interne chaudière scierie), 8 t de dosses hêtre/chêne (destination panneaux). Le tout tracé lot par lot dans APPLITAG.",
    docs:["📄 Bon de livraison scierie","📊 Qualification coproduits","🔀 Fiche destination matière/énergie"],
    kpis:[{icon:"🪚",label:"Plaquettes P31",val:"45 t (hum. 30%)"},{icon:"🌫️",label:"Sciures",val:"12 t → énergie interne"},{icon:"🪜",label:"Dosses",val:"8 t → panneaux"}],
    color:"#7C3AED",bg:"#EDE9FE",
    script:[
      "Nouveauté majeure : APPLITAG trace maintenant le bois d'œuvre jusqu'en scierie, et récupère la qualification des coproduits.",
      "Dès la réception en scierie, les connexes sont saisis dans le module Coproduits : plaquettes P31 à 30% d'humidité pour vente énergie, sciures pour la chaudière interne de la scierie, dosses pour la filière panneaux.",
      "Ici la distinction matière — énergie est tracée pour chaque flux. C'est ce que la SNBC 3 impose : prouver que la hiérarchie des usages est respectée. APPLITAG génère automatiquement la preuve documentaire.",
      "Les coproduits Scierie Moreau s'inscrivent également dans le cadre FEADER Grand Est — phase 2 ouverte en septembre 2026. APPLITAG prépare déjà le dossier de traçabilité.",
    ],
  },
  {
    id:7, icon:"🌀", label:"Déchiquetage rémanents",
    who:"JENZ Déchiquetage SARL",
    date:"02 mai 2026", heure:"08h00",
    statut:"EN_DECHIQUETAGE",
    resume:"320 m³ de rémanents déchiquetés sur chantier. 131 t de plaquettes PF2. Humidité 38%.",
    detail:"L'entreprise de déchiquetage intervient avec le Jenz HEM 593. Résultat : 131 t de plaquettes PF2 (humidité 38%). Chargement en camion-souffleur, livraison directe chaufferie. L'humidité 38% est enregistrée — elle sera comparée à la mesure d'arrivée. APPLITAG calcule en temps réel le coût RED à 3,3 €/t, soit 432 € de surcoût réglementaire estimé pour ce lot.",
    docs:["📄 Ordre de déchiquetage OD-2026-042","📊 Fiche humidité & granulométrie","📊 Calcul surcoût RED estimé"],
    kpis:[{icon:"🌀",label:"Volume déchiqueté",val:"320 m³"},{icon:"⚖️",label:"Tonnage",val:"131 t"},{icon:"💧",label:"Humidité",val:"38 %"},{icon:"💶",label:"Surcoût RED estimé",val:"432 €"}],
    color:"#92400E",bg:"#FEF3C7",
    script:[
      "Les rémanents sont déchiquetés sur le chantier. 131 tonnes de plaquettes PF2, humidité 38%.",
      "Nouveauté : APPLITAG calcule maintenant le surcoût RED en temps réel. Au benchmark de 3,3 euros par tonne — référence RED II pour les sites existants — ce lot représente 432 euros de surcoût réglementaire. Ce chiffre alimente le module Coût RED par tonne.",
      "L'humidité de 38% est enregistrée au départ. Elle sera comparée à la mesure à la réception. Si l'écart dépasse le seuil paramétré, une alerte est déclenchée automatiquement.",
    ],
  },
  {
    id:8, icon:"🚛", label:"Transport & CMR",
    who:"Transport Bernard SAS",
    date:"04 mai 2026", heure:"06h30",
    statut:"EN_TRANSPORT",
    resume:"3 rotations. CMR générés automatiquement. Traçabilité QR départ/arrivée.",
    detail:"3 camions semi-remorques. CMR n° CMR-2026-0831 à 0833 générés automatiquement dans APPLITAG. Chaque chauffeur scanne le QR au départ et à l'arrivée. Statut 'En route' visible en temps réel par le mandataire et la chaufferie.",
    docs:["📄 CMR Transport (×3)","📲 Scan QR chauffeur départ","📲 Scan QR chauffeur arrivée"],
    kpis:[{icon:"🚛",label:"Rotations",val:"3 camions"},{icon:"⚖️",label:"Total",val:"131 t"},{icon:"📍",label:"Distance",val:"~68 km"}],
    color:"#6D28D9",bg:"#EDE9FE",
    script:[
      "Le transport est planifié depuis le module Transports. Le chauffeur reçoit sa mission sur son téléphone : GPS, numéro de lot, destination, créneau.",
      "Au départ, scan du QR. La lettre de voiture CMR est générée automatiquement — plus de paperasse à 6h30 du matin. Le statut passe à En route, visible par le mandataire et la chaufferie.",
      "À l'arrivée, nouveau scan. La pesée à la bascule sera comparée au tonnage déclaré au départ. C'est la traçabilité physique bout en bout.",
    ],
  },
  {
    id:9, icon:"🔥", label:"Réception chaufferie",
    who:"Chaufferie Vichy Agglo — 6,8 MW",
    date:"04 mai 2026", heure:"09h10",
    statut:"LIVRE",
    resume:"Réception à la bascule. Jauge stock mise à jour. Autonomie calculée. F08 cosigné.",
    detail:"Le camion arrive à la Chaufferie Vichy Agglo (6,8 MW, 13 600 t/an). Le réceptionnaire retrouve le bon de livraison dans APPLITAG. Pesée : 43,8 t. Humidité sonde : 38,2%. Écart 150 kg — dans les tolérances. La jauge de stock passe de 312 t à 356 t. Autonomie estimée : de 8 à 10 jours. Les 3 rotations totalisent 131,2 t réceptionnées.",
    docs:["📄 Bon de livraison (×3)","📄 Réception F08 cosignée","📊 Contrôle humidité sonde"],
    kpis:[{icon:"📦",label:"Réceptionné",val:"131,2 t"},{icon:"💧",label:"Humidité mesurée",val:"38,2 %"},{icon:"🔥",label:"Stock chaufferie",val:"356 t (+131 t)"},{icon:"📅",label:"Autonomie",val:"10 jours"}],
    color:"#B45309",bg:"#FEF3C7",
    script:[
      "Le camion arrive à la Chaufferie Vichy Agglo, l'une des 29 chaufferies référencées dans APPLITAG — de Vichy à Papeete, de Bastia à Saint-Pierre-et-Miquelon.",
      "Le réceptionnaire retrouve instantanément le bon de livraison sur sa tablette. Pesée bascule, mesure humidité. Tout est saisi dans APPLITAG, les données alimentent directement la jauge de stock de la chaufferie.",
      "La jauge passe de 312 à 356 tonnes. L'autonomie remonte de 8 à 10 jours. Si le stock avait été sous le seuil d'alerte, une notification aurait déjà été envoyée au planning pour anticiper la prochaine livraison.",
      "Le bon de livraison F08 est cosigné numériquement par le chauffeur et le réceptionnaire. Archivé instantanément. En cas de litige : heure, poids, humidité, signatures — tout est là.",
    ],
  },
  {
    id:10, icon:"🧾", label:"Facturation électronique",
    who:"Admin APPLITAG",
    date:"05 mai 2026", heure:"08h30",
    statut:"FACTURE_EMISE",
    resume:"Facture FAC-2026-042 générée depuis le lot. Détection doublon. Transmission PDP.",
    detail:"APPLITAG génère la facture en un clic depuis le lot clôturé. FAC-2026-042 : 131,2 t × 38 €/t + 183 m³ × 45 €/m³. Total HT : 13 229,60 €. Le module détecte qu'une seconde facture avait été créée par erreur sur le même bon de livraison — doublon bloqué. La facture validée est transmise à la plateforme de dématérialisation partenaire (PDP) conformément à l'obligation du 1er septembre 2026.",
    docs:["🧾 FAC-2026-042 (validée)","🚫 Doublon FAC-2026-042b (bloqué)","📤 Transmission PDP"],
    kpis:[{icon:"💶",label:"Montant HT",val:"13 229,60 €"},{icon:"🔄",label:"Doublons détectés",val:"1 bloqué"},{icon:"📤",label:"Statut",val:"Transmise PDP"}],
    color:"#1E40AF",bg:"#DBEAFE",
    script:[
      "La facturation électronique est maintenant intégrée directement dans le flux APPLITAG — une obligation réglementaire à partir du 1er septembre 2026.",
      "La facture est générée en un clic depuis le lot clôturé. Montant calculé automatiquement depuis les données de livraison.",
      "APPLITAG a détecté qu'une deuxième facture avait été créée par erreur sur le même bon de livraison — doublon bloqué avant transmission. C'est le genre d'erreur qui coûtait des heures de correction manuelle, ou pire, qui passait inaperçue.",
      "La facture validée est transmise à la plateforme de dématérialisation partenaire. La piste d'audit complète — lot, livraison, facture, paiement — est archivée pour 10 ans.",
    ],
  },
  {
    id:11, icon:"🇪🇺", label:"Conformité RED & GES",
    who:"Responsable réglementaire",
    date:"06 mai 2026", heure:"10h00",
    statut:"CONTROLE_REGLEMENTAIRE",
    resume:"Vérification critères RED II. Calcul surcoût 3,3 €/t. Bilan GES lot. Arbitrage SNBC 3 validé.",
    detail:"Le module Conformité RED vérifie automatiquement les 6 critères du lot : origine géographique tracée, certification PEFC, pas de zone protégée, humidité mesurée, destination déclarée. Score : 5/6 (origine à compléter). Le module Coût RED calcule 432 € de surcoût pour ce lot. Le Bilan GES affiche 28 tCO₂eq évitées. L'arbitrage SNBC 3 — bois énergie justifié pour les rémanents — est documenté.",
    docs:["📋 Rapport conformité RED II","📊 Coût RED : 432 € (3,3 €/t)","🌡️ Bilan GES : 28 tCO₂eq évitées","📄 Arbitrage SNBC 3 validé"],
    kpis:[{icon:"🇪🇺",label:"Score RED",val:"5/6 critères"},{icon:"💶",label:"Surcoût RED",val:"432 € (3,3 €/t)"},{icon:"🌡️",label:"GES évités",val:"28 tCO₂eq"},{icon:"⚖️",label:"SNBC 3",val:"Arbitrage conforme"}],
    color:"#1E3A8A",bg:"#DBEAFE",
    script:[
      "Dernier module clé : la conformité réglementaire. APPLITAG vérifie automatiquement les critères RED II pour ce lot.",
      "5 critères sur 6 sont validés. Le sixième — justificatif d'origine géographique complémentaire — est signalé avec une action corrective à réaliser avant l'audit.",
      "Le surcoût RED calculé est de 432 euros pour ce lot, soit 3,3 euros par tonne — cohérent avec le benchmark du consortium que l'on retrouve dans le module Coût RED.",
      "Le Bilan GES affiche 28 tonnes de CO2 équivalent évitées. L'arbitrage SNBC 3 documenté lors de la visite est retrouvé et validé. Tout est cohérent, tout est traçable. APPLITAG est prêt pour l'audit.",
    ],
  },
  {
    id:12, icon:"📐", label:"Projet financé FEADER",
    who:"Porteur de projet — SCIC Tronçais",
    date:"07 mai 2026", heure:"14h00",
    statut:"DOSSIER_FEADER_EN_COURS",
    resume:"Le lot s'inscrit dans un projet financé FEADER. Desserte + traçabilité = indicateurs financeur.",
    detail:"La desserte du chantier Bernard fait l'objet d'un projet financé FEADER – Développement rural Grand Est (PRJ-2026-001). APPLITAG consolide automatiquement les indicateurs exigés : surface desservie (12 ha), tonnage mobilisé (131 t + 183 m³ bois d'œuvre), destination tracée, emplois. Les pièces encore manquantes sont signalées : attestation assurance maîtrise d'ouvrage, PV de réception travaux.",
    docs:["📐 Dossier PRJ-2026-001 (50% avancement)","📊 Indicateurs financeur FEADER","⏳ 2 pièces manquantes signalées"],
    kpis:[{icon:"💶",label:"Dépenses prévues",val:"42 000 €"},{icon:"✅",label:"Avancement",val:"50 %"},{icon:"📋",label:"Pièces manquantes",val:"2"}],
    color:"#065F46",bg:"#D1FAE5",
    script:[
      "Ce lot s'inscrit dans un projet financé FEADER. APPLITAG dispose d'un module générique Projets financés qui couvre le parcours complet en 8 étapes, du diagnostic au bilan final.",
      "Les indicateurs financeur — surface, tonnage, destination, emplois — sont consolidés automatiquement depuis les données déjà saisies dans les autres modules. Aucune ressaisie.",
      "APPLITAG signale les deux pièces justificatives encore manquantes pour compléter le dossier. Le porteur de projet sait exactement quoi fournir, sans relance du financeur.",
      "Voilà le fil conducteur de cette démonstration : un signal propriétaire, une desserte vérifiée, un lot tracé, une scierie référencée, des coproduits qualifiés, une chaufferie servie, une facture conforme, un audit RED préparé, un projet FEADER outillé. APPLITAG est la colonne vertébrale de la filière bois-énergie.",
    ],
  },
];

export const SectionDemoScenario = () => {
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [showScript, setShowScript] = useState(true);
  const timerRef = useRef(null);

  useEffect(()=>{
    if(playing){
      timerRef.current = setInterval(()=>{
        setStep(s=>{
          if(s>=DEMO_STEPS.length-1){ setPlaying(false); clearInterval(timerRef.current); return s; }
          return s+1;
        });
      },2800);
    } else {
      clearInterval(timerRef.current);
    }
    return ()=>clearInterval(timerRef.current);
  },[playing]);

  const cur = DEMO_STEPS[step];

  return (
    <div style={{maxWidth:960,margin:"0 auto"}}>
      <div style={{marginBottom:20,display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:12}}>
        <div>
          <div style={{fontSize:20,fontWeight:800,color:C.tx,marginBottom:4}}>🎬 Démo scénario complet</div>
          <div style={{fontSize:13,color:C.tx2}}>Parcours A→Z du lot LOT-2026-042 — Forêt de M. Bernard (12 ha, Tronçais)</div>
        </div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          <button onClick={()=>{setStep(0);setPlaying(false);}}
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`1px solid ${C.bd}`,background:"transparent",color:C.tx2,fontFamily:"inherit"}}>
            ⏮ Recommencer
          </button>
          <button onClick={()=>setPlaying(p=>!p)}
            style={{padding:"8px 20px",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer",
              border:"none",background:playing?"#B91C1C":"#1E5B3A",color:"#fff",fontFamily:"inherit"}}>
            {playing?"⏸ Pause":"▶ Lecture auto"}
          </button>
          <button onClick={()=>setShowScript(s=>!s)}
            style={{padding:"8px 16px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
              border:`2px solid ${showScript?"#7C3AED":"#D1D5DB"}`,
              background:showScript?"#EDE9FE":"transparent",
              color:showScript?"#7C3AED":C.tx2,fontFamily:"inherit"}}>
            🎤 {showScript?"Masquer script":"Script présentateur"}
          </button>
        </div>
      </div>

      {/* Timeline stepper */}
      <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:"16px 20px",marginBottom:20,overflowX:"auto"}}>
        <div style={{display:"flex",alignItems:"center",gap:0,minWidth:700}}>
          {DEMO_STEPS.map((s,i)=>(
            <div key={s.id} style={{display:"flex",alignItems:"center",flex:1}}>
              <div onClick={()=>{setPlaying(false);setStep(i);}}
                style={{display:"flex",flexDirection:"column",alignItems:"center",cursor:"pointer",
                  flex:"0 0 auto",width:60}}>
                <div style={{width:36,height:36,borderRadius:"50%",
                  background:i<=step?s.bg:"#F3F4F6",
                  border:`2px solid ${i<=step?s.color:"#D1D5DB"}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,transition:"all .3s",
                  boxShadow:i===step?`0 0 0 4px ${s.bg}`:undefined}}>
                  {i<step?"✓":s.icon}
                </div>
                <div style={{fontSize:9,color:i<=step?s.color:"#9CA3AF",marginTop:4,textAlign:"center",
                  fontWeight:i===step?700:400,lineHeight:1.2,maxWidth:58}}>
                  {s.label}
                </div>
              </div>
              {i<DEMO_STEPS.length-1&&(
                <div style={{flex:1,height:2,background:i<step?cur.color:"#E5E7EB",
                  transition:"background .5s",margin:"0 2px",marginBottom:22}}/>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Script présentateur */}
      {showScript&&(
        <div style={{background:"linear-gradient(135deg,#FAF5FF,#F3E8FF)",borderRadius:14,
          border:"2px solid #C4B5FD",padding:"18px 20px",marginBottom:20,position:"relative"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
            <span style={{fontSize:22}}>🎤</span>
            <div>
              <div style={{fontSize:13,fontWeight:800,color:"#5B21B6"}}>Script présentateur</div>
              <div style={{fontSize:11,color:"#7C3AED",opacity:.8}}>Texte à lire à voix haute — étape {cur.id}/{DEMO_STEPS.length} : {cur.label}</div>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {cur.script.map((para,i)=>(
              <div key={i} style={{display:"flex",gap:10,alignItems:"flex-start"}}>
                <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",
                  background:"#7C3AED",color:"#fff",fontSize:10,fontWeight:800,
                  display:"flex",alignItems:"center",justifyContent:"center",marginTop:1}}>
                  {i+1}
                </span>
                <p style={{margin:0,fontSize:14,color:"#3B1D8A",lineHeight:1.75,
                  fontStyle:"normal",fontWeight:i===0?600:400}}>
                  {para}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carte principale */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gap:16,alignItems:"start"}}>
        {/* Détail étape */}
        <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,overflow:"hidden"}}>
          <div style={{background:cur.bg,borderBottom:`1px solid ${cur.color}33`,
            padding:"16px 20px",display:"flex",gap:14,alignItems:"center"}}>
            <div style={{width:52,height:52,borderRadius:14,background:"#fff",
              border:`2px solid ${cur.color}44`,display:"flex",alignItems:"center",
              justifyContent:"center",fontSize:26,flexShrink:0}}>
              {cur.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
                <div style={{fontSize:17,fontWeight:800,color:cur.color}}>{cur.label}</div>
                <span style={{fontSize:10,padding:"2px 8px",borderRadius:20,fontWeight:700,
                  background:`${cur.color}18`,color:cur.color}}>Étape {cur.id}/{DEMO_STEPS.length}</span>
              </div>
              <div style={{fontSize:12,color:C.tx2,marginTop:3}}>
                👤 {cur.who} · 📅 {cur.date} {cur.heure}
              </div>
            </div>
          </div>
          <div style={{padding:"16px 20px"}}>
            <div style={{fontSize:13,fontWeight:600,color:C.tx,marginBottom:8,
              padding:"10px 12px",background:cur.bg,borderRadius:8,borderLeft:`3px solid ${cur.color}`}}>
              {cur.resume}
            </div>
            <div style={{fontSize:12,color:C.tx2,lineHeight:1.7,marginBottom:16}}>
              {cur.detail}
            </div>

            {/* Statut */}
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
              <span style={{fontSize:10,color:C.tx2,fontWeight:600}}>Statut lot :</span>
              <span style={{fontSize:11,padding:"3px 10px",borderRadius:5,fontWeight:700,
                background:cur.bg,color:cur.color}}>{cur.statut}</span>
            </div>

            {/* Documents */}
            {cur.docs.length>0&&(
              <div>
                <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:8}}>Documents générés</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {cur.docs.map((d,i)=>(
                    <span key={i} style={{fontSize:11,padding:"5px 10px",borderRadius:7,
                      background:"#F9FAFB",border:`1px solid ${C.bd}`,color:C.tx,fontWeight:500}}>
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div style={{borderTop:`1px solid ${C.bd}`,padding:"12px 20px",
            display:"flex",justifyContent:"space-between"}}>
            <button onClick={()=>setStep(s=>Math.max(0,s-1))} disabled={step===0}
              style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                border:`1px solid ${C.bd}`,background:"transparent",color:step===0?"#D1D5DB":C.tx2,
                fontFamily:"inherit",opacity:step===0?.4:1}}>
              ← Précédent
            </button>
            <span style={{fontSize:11,color:C.tx2,alignSelf:"center"}}>
              {step+1} / {DEMO_STEPS.length}
            </span>
            <button onClick={()=>setStep(s=>Math.min(DEMO_STEPS.length-1,s+1))} disabled={step===DEMO_STEPS.length-1}
              style={{padding:"8px 18px",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",
                border:"none",background:step===DEMO_STEPS.length-1?"#E5E7EB":cur.color,
                color:step===DEMO_STEPS.length-1?"#9CA3AF":"#fff",fontFamily:"inherit",
                opacity:step===DEMO_STEPS.length-1?.4:1}}>
              Suivant →
            </button>
          </div>
        </div>

        {/* Panneau KPIs + progression */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {/* KPIs étape */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Indicateurs clés</div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {cur.kpis.map((k,i)=>(
                <div key={i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  padding:"8px 12px",borderRadius:8,background:cur.bg}}>
                  <span style={{fontSize:12,color:C.tx2}}>{k.icon} {k.label}</span>
                  <span style={{fontSize:13,fontWeight:700,color:cur.color}}>{k.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Progression du lot */}
          <div style={{background:"#fff",borderRadius:14,border:`1px solid ${C.bd}`,padding:16}}>
            <div style={{fontSize:11,fontWeight:700,color:C.tx2,marginBottom:10}}>Avancement global</div>
            <div style={{marginBottom:8}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:11,color:C.tx2}}>Progression</span>
                <span style={{fontSize:11,fontWeight:700,color:"#1E5B3A"}}>
                  {Math.round(((step+1)/DEMO_STEPS.length)*100)} %
                </span>
              </div>
              <div style={{height:8,borderRadius:4,background:"#E5E7EB",overflow:"hidden"}}>
                <div style={{height:"100%",borderRadius:4,background:"#1E5B3A",
                  width:`${Math.round(((step+1)/DEMO_STEPS.length)*100)}%`,
                  transition:"width .5s ease"}}/>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:4,marginTop:10}}>
              {DEMO_STEPS.map((s,i)=>(
                <div key={s.id} onClick={()=>{setPlaying(false);setStep(i);}}
                  style={{display:"flex",alignItems:"center",gap:8,padding:"5px 8px",
                    borderRadius:6,cursor:"pointer",
                    background:i===step?s.bg:"transparent",
                    border:`1px solid ${i===step?s.color+"44":"transparent"}`}}>
                  <span style={{fontSize:12}}>{i<step?"✅":i===step?s.icon:"⬜"}</span>
                  <span style={{fontSize:11,color:i<=step?s.color:C.tx2,fontWeight:i===step?700:400}}>
                    {s.label}
                  </span>
                  <span style={{fontSize:9,color:C.tx2,marginLeft:"auto"}}>{s.date}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bilan final */}
          {step===DEMO_STEPS.length-1&&(
            <div style={{background:"#D1FAE5",borderRadius:14,border:"1px solid #34D399",padding:16}}>
              <div style={{fontSize:12,fontWeight:800,color:"#065F46",marginBottom:8}}>🏆 Lot clôturé</div>
              {[["Durée totale","24 jours"],["CA réalisé","13 220 €"],["CO₂ évité","~32 tCO₂eq"],["Docs générés","12 documents"]].map(([k,v])=>(
                <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,
                  padding:"3px 0",borderBottom:"1px solid #A7F3D044"}}>
                  <span style={{color:"#065F46"}}>{k}</span>
                  <span style={{fontWeight:700,color:"#064E3B"}}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

