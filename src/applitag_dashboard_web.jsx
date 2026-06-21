
// ============================================================
// APPLITAG — Dashboard Web Desktop
// Sprints: Dashboard · Navigation · Fiches · Actions · Garde-fous
// JSDoc TypeScript-style · Mock store (Zustand-like) · Responsive
// ============================================================

import { useState, useCallback, useMemo, useReducer, useEffect } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────

/**
 * @typedef {'proprietaire_forestier'|'cooperative'|'etf'|'transporteur'|'chaufferie'|'plateforme'|'negociant'|'collectivite'|'prospect'} ContactType
 * @typedef {'nouveau'|'a_rappeler'|'qualifie'|'converti'|'perdu'} ContactStatut
 * @typedef {'nouvelle'|'a_visiter'|'visite_programmee'|'visite_faite'|'lot_cree'|'perdue'} OppStatut
 * @typedef {'BROUILLON'|'A_VISITER'|'VISITE_REALISEE'|'VALIDE_EXPLOITATION'|'EN_EXPLOITATION'|'BORD_ROUTE'|'A_DECHIQUETER'|'DECHIQUETAGE_EN_COURS'|'EN_TRANSPORT'|'PARTIELLEMENT_LIVRE'|'LIVRE'|'CLOTURE'|'ANNULE'} LotStatut
 * @typedef {'prepare'|'en_route'|'arrive'|'annule'} TransportStatut
 * @typedef {'info'|'warn'|'critique'} AlerteNiveau
 */

/**
 * @typedef {Object} Contact
 * @property {string} id
 * @property {string} nom
 * @property {string} telephone
 * @property {ContactType} typeContact
 * @property {string} [prenom]
 * @property {string} [societe]
 * @property {ContactStatut} statut
 * @property {number} [gpsLat]
 * @property {number} [gpsLng]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Opportunite
 * @property {string} id
 * @property {string} contactId
 * @property {string} [commune]
 * @property {number} [volumeEstime]
 * @property {string} [typeBois]
 * @property {'basse'|'normale'|'haute'|'immediate'} urgence
 * @property {OppStatut} statut
 * @property {string} [notes]
 * @property {string} [lotId]
 * @property {number} [gpsLat]
 * @property {number} [gpsLng]
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Lot
 * @property {string} id
 * @property {string} numeroLot
 * @property {LotStatut} statut
 * @property {string} commune
 * @property {string} [essencePrincipale]
 * @property {number} [volumeEstime]
 * @property {number} [volumeReel]
 * @property {number} [surfaceHa]
 * @property {number} [humidite]
 * @property {number} gpsLat
 * @property {number} gpsLng
 * @property {string} [certification]
 * @property {string} [opportuniteId]
 * @property {string} [contactId]
 * @property {string} [etfNom]
 * @property {string} createdAt
 * @property {{id:string,numeroTas:string,volumeEstime:number,statut:string,gpsLat:number,gpsLng:number}[]} [tas]
 * @property {{id:string,numeroBl:string,poids:number,date:string,statut:string}[]} [livraisons]
 * @property {{id:string,chauffeur:string,statut:TransportStatut,destination:string}[]} [transports]
 */

/**
 * @typedef {Object} Transport
 * @property {string} id
 * @property {string} lotId
 * @property {string} lotNumero
 * @property {string} chauffeur
 * @property {string} camion
 * @property {string} destination
 * @property {TransportStatut} statut
 * @property {number} [poidsT]
 * @property {string} [heureDepart]
 * @property {number} gpsLat
 * @property {number} gpsLng
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Chaufferie
 * @property {string} id
 * @property {string} nom
 * @property {string} commune
 * @property {number} capaciteTan
 * @property {number} humiditeMax
 * @property {number} gpsLat
 * @property {number} gpsLng
 * @property {number} [stockActuelT]
 * @property {string[]} [lotsAssocies]
 */

/**
 * @typedef {Object} Plateforme
 * @property {string} id
 * @property {string} nom
 * @property {string} commune
 * @property {number} capaciteT
 * @property {number} stockActuelT
 * @property {number} humiditeMoy
 * @property {number} gpsLat
 * @property {number} gpsLng
 * @property {string[]} [lotsAssocies]
 */

/**
 * @typedef {Object} Alerte
 * @property {string} id
 * @property {AlerteNiveau} niveau
 * @property {string} message
 * @property {string} refType
 * @property {string} [refId]
 * @property {boolean} resolue
 * @property {string} createdAt
 */

/**
 * @typedef {Object} HistoriqueEvent
 * @property {string} id
 * @property {string} refId
 * @property {string} refType
 * @property {string} action
 * @property {string} message
 * @property {string} utilisateur
 * @property {string} createdAt
 */

/**
 * @typedef {Object} Toast
 * @property {string} id
 * @property {'success'|'error'|'warn'} type
 * @property {string} message
 */

// ── TOKENS ─────────────────────────────────────────────────────────────────────
const T = {
  green:"#1D9E75", greenL:"#E1F5EE", greenD:"#085041",
  purple:"#534AB7", purpleL:"#EEEDFE", purpleD:"#26215C",
  coral:"#D85A30", coralL:"#FAECE7", coralD:"#4A1B0C",
  blue:"#185FA5", blueL:"#E6F1FB", blueD:"#042C53",
  amber:"#BA7517", amberL:"#FAEEDA", amberD:"#412402",
  red:"#A32D2D", redL:"#FCEBEB",
  bg:"#F5F4F1", bg2:"#ECEAE6", bg3:"#fff",
  bd:"#DDDBD5", bd2:"#C8C5BE",
  tx:"#1A1A18", tx2:"#5A5955", tx3:"#9A9892",
  sb:"#111111", sbBd:"#222222", sbHov:"#1E1E1E",
};

// ── MOCK DATA ──────────────────────────────────────────────────────────────────
/** @type {Contact[]} */
const CONTACTS = [
  {id:"c1",nom:"Bernard",prenom:"Michel",telephone:"06 12 34 56 78",typeContact:"proprietaire_forestier",statut:"a_rappeler",gpsLat:47.98,gpsLng:3.09,createdAt:"2025-06-01T08:00:00Z"},
  {id:"c2",nom:"Coop Yonne Bois",telephone:"03 86 11 22 33",typeContact:"cooperative",statut:"qualifie",gpsLat:48.19,gpsLng:3.29,createdAt:"2025-06-02T09:00:00Z"},
  {id:"c3",nom:"Dupont",prenom:"Jean",telephone:"06 55 44 33 22",typeContact:"proprietaire_forestier",statut:"nouveau",gpsLat:47.85,gpsLng:3.52,createdAt:"2025-06-05T10:00:00Z"},
];

/** @type {Opportunite[]} */
const OPPORTUNITES = [
  {id:"o1",contactId:"c1",commune:"Charny (89)",volumeEstime:400,typeBois:"bois_sur_pied",urgence:"haute",statut:"a_visiter",notes:"Peuplier. Accès chemin forestier.",gpsLat:47.98,gpsLng:3.09,createdAt:"2025-06-10T14:00:00Z"},
  {id:"o2",contactId:"c2",commune:"Sens (89)",volumeEstime:800,typeBois:"bois_abattu",urgence:"normale",statut:"visite_programmee",gpsLat:48.19,gpsLng:3.29,createdAt:"2025-06-08T09:00:00Z"},
  {id:"o3",contactId:"c3",commune:"Joigny (89)",volumeEstime:250,typeBois:"bords_de_route",urgence:"basse",statut:"nouvelle",gpsLat:47.98,gpsLng:2.98,createdAt:"2025-06-09T11:00:00Z"},
];

/** @type {Lot[]} */
const LOTS = [
  {id:"l1",numeroLot:"LOT-2025-007",statut:"EN_EXPLOITATION",commune:"Charny (89)",essencePrincipale:"peuplier",volumeEstime:350,volumeReel:238,surfaceHa:12.5,humidite:38,gpsLat:47.9812,gpsLng:3.0891,certification:"PEFC",etfNom:"ETF Moreau",createdAt:"2025-01-15T08:00:00Z",
    tas:[{id:"t1",numeroTas:"A",volumeEstime:85,statut:"pret",gpsLat:47.9812,gpsLng:3.0891},{id:"t2",numeroTas:"B",volumeEstime:35,statut:"pret",gpsLat:47.9807,gpsLng:3.0899},{id:"t3",numeroTas:"C",volumeEstime:35,statut:"en_cours",gpsLat:47.9819,gpsLng:3.0884}],
    livraisons:[],transports:[]},
  {id:"l2",numeroLot:"LOT-2025-006",statut:"A_DECHIQUETER",commune:"Sens (89)",essencePrincipale:"acacia",volumeEstime:280,volumeReel:280,surfaceHa:8.0,humidite:34,gpsLat:48.1967,gpsLng:3.2875,etfNom:"Forêt Services",createdAt:"2025-02-01T08:00:00Z",
    tas:[{id:"t4",numeroTas:"A",volumeEstime:150,statut:"pret",gpsLat:48.197,gpsLng:3.288},{id:"t5",numeroTas:"B",volumeEstime:130,statut:"pret",gpsLat:48.196,gpsLng:3.287}],
    livraisons:[],transports:[]},
  {id:"l3",numeroLot:"LOT-2025-005",statut:"EN_TRANSPORT",commune:"Auxerre (89)",essencePrincipale:"chene",volumeEstime:145,volumeReel:145,humidite:32,gpsLat:47.7979,gpsLng:3.5714,etfNom:"ETF Moreau",createdAt:"2025-02-10T08:00:00Z",
    tas:[],livraisons:[{id:"lv1",numeroBl:"BL-2025-0089",poids:42,date:"2025-06-09",statut:"en_attente"}],
    transports:[{id:"tr1",chauffeur:"D. Martel",statut:"en_route",destination:"Chaufferie Troyes"}]},
  {id:"l4",numeroLot:"LOT-2025-004",statut:"PARTIELLEMENT_LIVRE",commune:"Joigny (89)",essencePrincipale:"frene",volumeEstime:200,volumeReel:195,humidite:31,gpsLat:47.9826,gpsLng:2.9816,createdAt:"2025-03-01T08:00:00Z",
    tas:[],livraisons:[{id:"lv2",numeroBl:"BL-2025-0088",poids:38.5,date:"2025-06-08",statut:"valide"},{id:"lv3",numeroBl:"BL-2025-0090",poids:42,date:"2025-06-10",statut:"en_attente"}],
    transports:[{id:"tr2",chauffeur:"M. Simon",statut:"en_route",destination:"Plateforme Sens"}]},
];

/** @type {Transport[]} */
const TRANSPORTS = [
  {id:"tr1",lotId:"l3",lotNumero:"LOT-2025-005",chauffeur:"D. Martel",camion:"EF-456-GH",destination:"Chaufferie Troyes Est",statut:"en_route",poidsT:42,heureDepart:"07:45",gpsLat:48.05,gpsLng:3.32,createdAt:"2025-06-09T07:45:00Z"},
  {id:"tr2",lotId:"l4",lotNumero:"LOT-2025-004",chauffeur:"M. Simon",camion:"AB-123-CD",destination:"Plateforme Sens",statut:"en_route",poidsT:42,heureDepart:"08:30",gpsLat:48.12,gpsLng:3.18,createdAt:"2025-06-09T08:30:00Z"},
];

/** @type {Chaufferie[]} */
const CHAUFFERIES = [
  {id:"ch1",nom:"Chaufferie Troyes Est",commune:"Troyes (10)",capaciteTan:5000,humiditeMax:35,gpsLat:48.2900,gpsLng:4.0733,stockActuelT:320,lotsAssocies:["l3"]},
  {id:"ch2",nom:"Chaufferie Auxerre Centre",commune:"Auxerre (89)",capaciteTan:3000,humiditeMax:35,gpsLat:47.7979,gpsLng:3.5714,stockActuelT:180,lotsAssocies:[]},
];

/** @type {Plateforme[]} */
const PLATEFORMES = [
  {id:"pl1",nom:"Plateforme Sens Biomasse",commune:"Sens (89)",capaciteT:8000,stockActuelT:2400,humiditeMoy:34,gpsLat:48.1967,gpsLng:3.2875,lotsAssocies:["l4"]},
];

/** @type {Alerte[]} */
const ALERTES_INIT = [
  {id:"a1",niveau:"critique",message:"LOT-2025-006 — Tas prêts depuis 5 jours sans déchiquetage",refType:"lot",refId:"l2",resolue:false,createdAt:"2025-06-09T08:00:00Z"},
  {id:"a2",niveau:"warn",message:"LOT-2025-007 — Humidité 38% > seuil contractuel 35%",refType:"lot",refId:"l1",resolue:false,createdAt:"2025-06-10T06:00:00Z"},
  {id:"a3",niveau:"warn",message:"LOT-2025-004 — BL non signé depuis 48h",refType:"lot",refId:"l4",resolue:false,createdAt:"2025-06-08T10:00:00Z"},
];

/** @type {HistoriqueEvent[]} */
const HISTORIQUE_INIT = [
  {id:"h1",refId:"l1",refType:"lot",action:"statut_change",message:"LOT-2025-007 — Statut EN_EXPLOITATION",utilisateur:"J. Moreau",createdAt:"2025-03-03T08:00:00Z"},
  {id:"h2",refId:"o1",refType:"opportunite",action:"opportunite_creee",message:"Nouvelle opportunité — Charny 400 t",utilisateur:"J. Moreau",createdAt:"2025-06-10T14:35:00Z"},
  {id:"h3",refId:"tr1",refType:"transport",action:"transport_parti",message:"CMR-2025-0089 — D. Martel parti 07h45",utilisateur:"Système",createdAt:"2025-06-09T07:45:00Z"},
  {id:"h4",refId:"l2",refType:"lot",action:"alerte",message:"LOT-2025-006 — Tas non déchiquetés depuis 5j",utilisateur:"Système",createdAt:"2025-06-09T08:00:00Z"},
];

// ── WORKFLOW GUARDS ─────────────────────────────────────────────────────────────
/**
 * @param {LotStatut} statut
 * @param {string} action
 * @returns {{ allowed: boolean, reason?: string }}
 */
const canDoLotAction = (statut, action) => {
  const rules = {
    valider_visite:     ["A_VISITER","VISITE_REALISEE"],
    demarrer_exploitation: ["VALIDE_EXPLOITATION"],
    ajouter_tas:        ["EN_EXPLOITATION","BORD_ROUTE"],
    planifier_dechiquetage: ["BORD_ROUTE"],
    creer_transport:    ["A_DECHIQUETER","DECHIQUETAGE_EN_COURS"],
    cloturer:           ["LIVRE","PARTIELLEMENT_LIVRE"],
  };
  const allowed_statuts = rules[action];
  if (!allowed_statuts) return {allowed:true};
  if (allowed_statuts.includes(statut)) return {allowed:true};
  const humanStatut = {
    A_VISITER:"À visiter", VISITE_REALISEE:"Visite réalisée",
    VALIDE_EXPLOITATION:"Validé exploitation", EN_EXPLOITATION:"En exploitation",
    BORD_ROUTE:"Bord de route", A_DECHIQUETER:"À déchiqueter",
    DECHIQUETAGE_EN_COURS:"Déchiquetage en cours", EN_TRANSPORT:"En transport",
    PARTIELLEMENT_LIVRE:"Partiellement livré", LIVRE:"Livré",
    CLOTURE:"Clôturé", ANNULE:"Annulé",
  };
  const actionLabel = {
    valider_visite:"Valider la visite",
    demarrer_exploitation:"Démarrer l'exploitation",
    ajouter_tas:"Ajouter des tas",
    planifier_dechiquetage:"Planifier le déchiquetage",
    creer_transport:"Créer un transport",
    cloturer:"Clôturer le lot",
  };
  return {allowed:false, reason:`"${actionLabel[action]}" nécessite le statut ${allowed_statuts.map(s=>humanStatut[s]).join(" ou ")} — statut actuel : ${humanStatut[statut]}`};
};

/**
 * @param {OppStatut} statut
 * @param {string} action
 * @returns {{ allowed: boolean, reason?: string }}
 */
const canDoOppAction = (statut, action) => {
  const rules = {
    planifier_visite:  ["nouvelle","a_visiter","a_rappeler"],
    creer_lot:         ["visite_programmee","visite_faite"],
    abandonner:        ["nouvelle","a_visiter","a_rappeler","visite_programmee","visite_faite"],
  };
  const allowed = rules[action];
  if (!allowed) return {allowed:true};
  if (allowed.includes(statut)) return {allowed:true};
  const labels = {
    planifier_visite:"Planifier une visite",
    creer_lot:"Créer un lot",
    abandonner:"Abandonner l'opportunité",
  };
  return {allowed:false, reason:`"${labels[action]}" non disponible pour le statut "${statut}"`};
};

// ── UNIT TESTS (console) ───────────────────────────────────────────────────────
const runTests = () => {
  const tests = [
    [canDoLotAction("EN_EXPLOITATION","valider_visite").allowed === false, "LOT EN_EXPLOITATION cannot valider_visite"],
    [canDoLotAction("VISITE_REALISEE","valider_visite").allowed === true,  "LOT VISITE_REALISEE can valider_visite"],
    [canDoLotAction("BORD_ROUTE","ajouter_tas").allowed === true,          "LOT BORD_ROUTE can ajouter_tas"],
    [canDoLotAction("LIVRE","cloturer").allowed === true,                  "LOT LIVRE can cloturer"],
    [canDoLotAction("EN_EXPLOITATION","cloturer").allowed === false,       "LOT EN_EXPLOITATION cannot cloturer"],
    [canDoOppAction("nouvelle","planifier_visite").allowed === true,       "OPP nouvelle can planifier_visite"],
    [canDoOppAction("lot_cree","abandonner").allowed === false,            "OPP lot_cree cannot abandonner"],
    [canDoOppAction("visite_faite","creer_lot").allowed === true,          "OPP visite_faite can creer_lot"],
  ];
  const passed = tests.filter(([r])=>r).length;
  console.log(`APPLITAG Tests: ${passed}/${tests.length} passed`);
  tests.forEach(([r,name]) => console.log(`  ${r?"✓":"✗"} ${name}`));
};
runTests();

// ── HELPERS ────────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2,9);
const now = () => new Date().toISOString();
const fmt = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}) : "—";
const fmtFull = (d) => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"}) : "—";

/** @param {LotStatut} s */
const lotBadge = (s) => ({
  BROUILLON:            {bg:"#F0EEE9",color:"#555",    label:"Brouillon"},
  A_VISITER:            {bg:T.amberL, color:T.amberD,  label:"À visiter"},
  VISITE_REALISEE:      {bg:T.amberL, color:T.amberD,  label:"Visité"},
  VALIDE_EXPLOITATION:  {bg:T.greenL, color:T.greenD,  label:"Validé"},
  EN_EXPLOITATION:      {bg:T.blueL,  color:T.blueD,   label:"En exploitation"},
  BORD_ROUTE:           {bg:"#F1EFE8",color:"#5C4A1E",  label:"Bord de route"},
  A_DECHIQUETER:        {bg:T.purpleL,color:T.purpleD,  label:"À déchiqueter"},
  DECHIQUETAGE_EN_COURS:{bg:T.purpleL,color:T.purpleD,  label:"Déchiquetage"},
  EN_TRANSPORT:         {bg:T.purpleL,color:T.purpleD,  label:"En transport"},
  PARTIELLEMENT_LIVRE:  {bg:T.amberL, color:T.amberD,  label:"Part. livré"},
  LIVRE:                {bg:T.greenL, color:T.greenD,   label:"Livré"},
  CLOTURE:              {bg:T.greenL, color:T.greenD,   label:"Clôturé ✓"},
  ANNULE:               {bg:T.redL,   color:T.red,      label:"Annulé"},
}[s] ?? {bg:T.bg2,color:T.tx2,label:s});

/** @param {OppStatut} s */
const oppBadge = (s) => ({
  nouvelle:          {bg:T.bg2,    color:T.tx2,    label:"Nouvelle"},
  a_visiter:         {bg:T.amberL, color:T.amberD, label:"À visiter"},
  visite_programmee: {bg:T.blueL,  color:T.blueD,  label:"Visite prog."},
  visite_faite:      {bg:T.purpleL,color:T.purpleD,label:"Visite faite"},
  lot_cree:          {bg:T.greenL, color:T.greenD, label:"Lot créé ✓"},
  perdue:            {bg:T.redL,   color:T.red,    label:"Perdue"},
}[s] ?? {bg:T.bg2,color:T.tx2,label:s});

const alertBadge = (n) => ({
  info:    {bg:T.blueL,  color:T.blueD, label:"Info"},
  warn:    {bg:T.amberL, color:T.amberD,label:"Avertis."},
  critique:{bg:T.redL,   color:T.red,   label:"Critique"},
}[n]);

const typeLabel = (t) => ({
  proprietaire_forestier:"Propriétaire", cooperative:"Coopérative",
  etf:"ETF", transporteur:"Transporteur", chaufferie:"Chaufferie",
  plateforme:"Plateforme", negociant:"Négociant", collectivite:"Collectivité", prospect:"Prospect",
}[t] ?? t);

const LOT_STATUT_STEPS = [
  "BROUILLON","A_VISITER","VISITE_REALISEE","VALIDE_EXPLOITATION",
  "EN_EXPLOITATION","BORD_ROUTE","A_DECHIQUETER","EN_TRANSPORT","LIVRE","CLOTURE",
];

// ── ATOMS ──────────────────────────────────────────────────────────────────────
const Badge = ({bg, color, children, style={}}) => (
  <span style={{display:"inline-block",padding:"2px 8px",borderRadius:9,
    fontSize:10,fontWeight:600,background:bg,color,whiteSpace:"nowrap",...style}}>
    {children}
  </span>
);

const Btn = ({onClick, bg=T.bg2, color=T.tx, children, disabled, small, style={}}) => (
  <button onClick={disabled?undefined:onClick} style={{
    padding:small?"5px 10px":"8px 14px", borderRadius:8,
    fontSize:small?11:12, fontWeight:500, display:"inline-flex",
    alignItems:"center", gap:6, cursor:disabled?"not-allowed":"pointer",
    border:"none", fontFamily:"inherit", background:disabled?T.bg2:bg,
    color:disabled?T.tx3:color, opacity:disabled?0.7:1, transition:"all .1s",
    whiteSpace:"nowrap", ...style,
  }}>{children}</button>
);

const PrimaryBtn = ({onClick, children, disabled, style={}}) => (
  <Btn onClick={onClick} bg={T.green} color="#fff" disabled={disabled} style={style}>{children}</Btn>
);

const Card = ({children, style={}}) => (
  <div style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,
    overflow:"hidden",...style}}>{children}</div>
);

const CardHead = ({children, extra}) => (
  <div style={{padding:"10px 14px",borderBottom:`1px solid ${T.bd}`,
    display:"flex",alignItems:"center",justifyContent:"space-between",
    background:T.bg, flexShrink:0}}>
    <div style={{fontSize:11,fontWeight:600,color:T.tx2,textTransform:"uppercase",
      letterSpacing:".05em"}}>{children}</div>
    {extra && <div>{extra}</div>}
  </div>
);

const Row = ({label, value, valueColor, border=true}) => (
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",
    padding:"6px 0",borderBottom:border?`0.5px solid ${T.bd}`:"none",fontSize:12}}>
    <span style={{color:T.tx2}}>{label}</span>
    <span style={{fontWeight:600,color:valueColor??T.tx}}>{value}</span>
  </div>
);

// Toast
const ToastList = ({toasts, onDismiss}) => (
  <div style={{position:"fixed",top:16,right:16,zIndex:9999,
    display:"flex",flexDirection:"column",gap:8,pointerEvents:"none"}}>
    {toasts.map(t => (
      <div key={t.id} style={{
        padding:"10px 16px",borderRadius:10,fontSize:12,fontWeight:500,
        background:t.type==="success"?T.greenD:t.type==="error"?T.red:T.amberD,
        color:"#fff",boxShadow:"0 4px 16px rgba(0,0,0,.18)",
        display:"flex",alignItems:"center",gap:10,pointerEvents:"auto",
        animation:"slideIn .2s ease",
      }}>
        <span>{t.type==="success"?"✓":t.type==="error"?"✗":"⚠"}</span>
        {t.message}
      </div>
    ))}
  </div>
);

// Confirm modal
const ConfirmModal = ({msg, onConfirm, onCancel}) => (
  <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.4)",
    display:"flex",alignItems:"center",justifyContent:"center",zIndex:9998}}>
    <div style={{background:"#fff",borderRadius:14,padding:"20px 24px",maxWidth:380,
      boxShadow:"0 8px 32px rgba(0,0,0,.2)"}}>
      <div style={{fontSize:14,fontWeight:500,marginBottom:8}}>Confirmation</div>
      <div style={{fontSize:13,color:T.tx2,marginBottom:18,lineHeight:1.6}}>{msg}</div>
      <div style={{display:"flex",gap:8,justifyContent:"flex-end"}}>
        <Btn onClick={onCancel}>Annuler</Btn>
        <Btn onClick={onConfirm} bg={T.red} color="#fff">Confirmer</Btn>
      </div>
    </div>
  </div>
);

// Blocked action tooltip
const BlockedBtn = ({action, reason, children}) => (
  <div style={{position:"relative",display:"inline-flex"}}
    title={reason}>
    <Btn disabled style={{background:T.bg2,color:T.tx3}}>{children}</Btn>
    <span style={{position:"absolute",top:-7,right:-5,width:14,height:14,
      borderRadius:"50%",background:T.amber,color:"#fff",
      fontSize:9,display:"flex",alignItems:"center",justifyContent:"center",
      fontWeight:700}}>!</span>
  </div>
);

// ── CARTE SVG ──────────────────────────────────────────────────────────────────
const MapCanvas = ({filters, lots, transports, opportunites, contacts, chaufferies, plateformes, alertes, onMarkerClick}) => {
  const [hovered, setHovered] = useState(null);

  // Convert geo coordinates to SVG space (simplified Yonne region)
  const toSVG = (lat, lng) => {
    const x = ((lng - 2.7) / 1.8) * 560 + 20;
    const y = ((48.5 - lat) / 0.9) * 340 + 20;
    return {x: Math.max(10, Math.min(580, x)), y: Math.max(10, Math.min(360, y))};
  };

  const markers = [];

  if (filters.includes("lots")) {
    lots.forEach(l => {
      const p = toSVG(l.gpsLat, l.gpsLng);
      const b = lotBadge(l.statut);
      markers.push({...p, id:l.id, type:"lot", label:l.numeroLot, color:b.color, bg:b.bg,
        icon:l.statut==="EN_EXPLOITATION"?"⛏":l.statut==="A_DECHIQUETER"?"🪓":l.statut==="EN_TRANSPORT"?"🚛":"🌲",
        data:l});
    });
  }
  if (filters.includes("opportunites")) {
    opportunites.forEach(o => {
      const p = toSVG(o.gpsLat||47.9, o.gpsLng||3.1);
      markers.push({...p, id:o.id, type:"opportunite", label:o.commune||"Opp.", color:T.amberD, bg:T.amberL, icon:"💡", data:o});
    });
  }
  if (filters.includes("transports")) {
    transports.forEach(t => {
      const p = toSVG(t.gpsLat, t.gpsLng);
      markers.push({...p, id:t.id, type:"transport", label:t.chauffeur, color:T.purpleD, bg:T.purpleL, icon:"🚛", data:t});
    });
  }
  if (filters.includes("chaufferies")) {
    chaufferies.forEach(c => {
      const p = toSVG(c.gpsLat, c.gpsLng);
      markers.push({...p, id:c.id, type:"chaufferie", label:c.nom.split(" ")[1]||c.nom, color:T.blueD, bg:T.blueL, icon:"🏭", data:c});
    });
  }
  if (filters.includes("plateformes")) {
    plateformes.forEach(pl => {
      const p = toSVG(pl.gpsLat, pl.gpsLng);
      markers.push({...p, id:pl.id, type:"plateforme", label:pl.nom.split(" ")[1]||pl.nom, color:T.purpleD, bg:T.purpleL, icon:"🏗️", data:pl});
    });
  }

  return (
    <svg viewBox="0 0 600 380" style={{width:"100%",height:"100%",
      background:"linear-gradient(160deg,#E8F4EC 0%,#D4EAD9 60%,#C6E2CF 100%)"}}>
      {/* Grid lines */}
      {[0.25,0.5,0.75].map(f => (
        <g key={f}>
          <line x1={f*600} y1={0} x2={f*600} y2={380} stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="4,4"/>
          <line x1={0} y1={f*380} x2={600} y2={f*380} stroke="rgba(255,255,255,.3)" strokeWidth="1" strokeDasharray="4,4"/>
        </g>
      ))}

      {/* Transport routes */}
      {filters.includes("transports") && transports.map(t => {
        const from = toSVG(t.gpsLat, t.gpsLng);
        const dest = chaufferies.find(c=>t.destination.includes(c.nom.split(" ")[1]||""))
          || plateformes.find(p=>t.destination.includes(p.nom.split(" ")[1]||""));
        if (!dest) return null;
        const to = toSVG(dest.gpsLat, dest.gpsLng);
        return (
          <g key={t.id}>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
              stroke={T.purple} strokeWidth="1.5" strokeDasharray="6,3" opacity=".6"/>
            <circle cx={(from.x+to.x)/2} cy={(from.y+to.y)/2} r="3"
              fill={T.purple} opacity=".8"/>
          </g>
        );
      })}

      {/* Markers */}
      {markers.map(m => {
        const isHov = hovered === m.id;
        return (
          <g key={m.id} style={{cursor:"pointer"}}
            onMouseEnter={()=>setHovered(m.id)}
            onMouseLeave={()=>setHovered(null)}
            onClick={()=>onMarkerClick(m.type, m.data)}>
            {/* Shadow */}
            <circle cx={m.x} cy={m.y+2} r={isHov?15:12} fill="rgba(0,0,0,.1)"/>
            {/* Background circle */}
            <circle cx={m.x} cy={m.y} r={isHov?14:11}
              fill={m.bg} stroke={m.color} strokeWidth={isHov?2:1.5}/>
            {/* Icon */}
            <text x={m.x} y={m.y+5} textAnchor="middle" fontSize={isHov?14:11}>{m.icon}</text>
            {/* Label on hover */}
            {isHov && (
              <g>
                <rect x={m.x-36} y={m.y-32} width={72} height={18} rx={4}
                  fill="rgba(0,0,0,.75)"/>
                <text x={m.x} y={m.y-20} textAnchor="middle"
                  fontSize={9} fill="#fff" fontWeight="600">{m.label}</text>
              </g>
            )}
          </g>
        );
      })}

      {/* Legend */}
      <g>
        <rect x={8} y={8} width={90} height={filters.length*14+10} rx={5} fill="rgba(255,255,255,.85)"/>
        {filters.map((f,i) => {
          const icons = {lots:"🌲",opportunites:"💡",transports:"🚛",chaufferies:"🏭",plateformes:"🏗️",alertes:"🔔"};
          const labels = {lots:"Lots",opportunites:"Opport.",transports:"Camions",chaufferies:"Chaufferies",plateformes:"Plateformes",alertes:"Alertes"};
          return (
            <g key={f}>
              <text x={14} y={22+i*14} fontSize={10}>{icons[f]}</text>
              <text x={28} y={22+i*14} fontSize={9} fill={T.tx2}>{labels[f]}</text>
            </g>
          );
        })}
      </g>
    </svg>
  );
};

// ── TIMELINE STATUT ────────────────────────────────────────────────────────────
const LotTimeline = ({statut}) => {
  const steps = ["Créé","Visité","Validé","Exploitation","Bord route","Transport","Livré","Clôturé"];
  const statuts = ["BROUILLON","VISITE_REALISEE","VALIDE_EXPLOITATION","EN_EXPLOITATION","BORD_ROUTE","EN_TRANSPORT","LIVRE","CLOTURE"];
  const curIdx = statuts.indexOf(statut);
  return (
    <div style={{display:"flex",alignItems:"center",gap:0,padding:"8px 0",overflowX:"auto"}}>
      {steps.map((s,i) => {
        const done = i < curIdx, active = i === curIdx;
        return (
          <div key={s} style={{display:"flex",alignItems:"center",gap:0,flexShrink:0}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:3}}>
              <div style={{width:20,height:20,borderRadius:"50%",
                background:done?T.green:active?T.amber:T.bg2,
                border:`1.5px solid ${done?T.green:active?T.amber:T.bd2}`,
                display:"flex",alignItems:"center",justifyContent:"center",
                fontSize:10,color:done?"#fff":active?T.amberD:T.tx3}}>
                {done?"✓":i+1}
              </div>
              <span style={{fontSize:9,color:done?T.greenD:active?T.amberD:T.tx3,
                fontWeight:active?600:400,whiteSpace:"nowrap"}}>{s}</span>
            </div>
            {i < steps.length-1 && (
              <div style={{width:24,height:2,background:done?T.green:T.bg2,
                margin:"0 2px",marginBottom:16,flexShrink:0}}/>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ── FICHE OPPORTUNITÉ ──────────────────────────────────────────────────────────
const FicheOpportunite = ({opp, contact, onClose, onUpdate, onCreateLot, onPlanifierVisite, toast}) => {
  const [confirm, setConfirm] = useState(null);
  const ob = oppBadge(opp.statut);

  const doAction = (action, fn, msg) => {
    const check = canDoOppAction(opp.statut, action);
    if (!check.allowed) { toast("error", check.reason); return; }
    if (msg) { setConfirm({msg, fn}); return; }
    fn();
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={()=>{confirm.fn();setConfirm(null);}} onCancel={()=>setConfirm(null)}/>}
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bd}`,
        display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
          fontSize:18,color:T.tx2,padding:"2px 8px 2px 0"}}>‹</button>
        <div style={{flex:1}}>
          <div style={{fontSize:15,fontWeight:500}}>Opportunité — {opp.commune??"N/A"}</div>
          <div style={{fontSize:11,color:T.tx3}}>
            {contact ? `${contact.prenom??""} ${contact.nom}` : "Contact inconnu"}
          </div>
        </div>
        <Badge bg={ob.bg} color={ob.color}>{ob.label}</Badge>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"14px 16px",display:"flex",flexDirection:"column",gap:10}}>
        <Card>
          <CardHead>Informations</CardHead>
          <div style={{padding:"8px 14px"}}>
            <Row label="Commune" value={opp.commune??"—"}/>
            <Row label="Volume estimé" value={opp.volumeEstime?`~${opp.volumeEstime} t`:"—"} valueColor={T.green}/>
            <Row label="Type de bois" value={opp.typeBois?.replace(/_/g," ")??"—"}/>
            <Row label="Urgence" value={opp.urgence}/>
            <Row label="Créé le" value={fmtFull(opp.createdAt)} border={false}/>
          </div>
        </Card>

        {contact && (
          <Card>
            <CardHead>Contact associé</CardHead>
            <div style={{padding:"8px 14px"}}>
              <Row label="Nom" value={`${contact.prenom??""} ${contact.nom}`}/>
              <Row label="Téléphone" value={contact.telephone} valueColor={T.blue}/>
              <Row label="Type" value={typeLabel(contact.typeContact)} border={false}/>
            </div>
          </Card>
        )}

        {opp.notes && (
          <div style={{background:T.bg2,borderRadius:10,padding:"10px 12px",fontSize:12,
            color:T.tx,lineHeight:1.6}}>{opp.notes}</div>
        )}

        {/* Mini carte position */}
        {opp.gpsLat && (
          <Card>
            <CardHead>Localisation</CardHead>
            <div style={{height:100,background:"linear-gradient(160deg,#E8F4EC,#D4EAD9)",
              display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
              <div style={{width:12,height:12,borderRadius:"50%",background:T.amber,
                border:"2px solid #fff",boxShadow:"0 1px 4px rgba(0,0,0,.3)"}}/>
              <span style={{position:"absolute",bottom:8,right:10,fontSize:10,
                color:T.greenD,fontFamily:"monospace"}}>
                {opp.gpsLat.toFixed(4)}°N · {opp.gpsLng?.toFixed(4)}°E
              </span>
            </div>
          </Card>
        )}

        {/* Actions */}
        <Card>
          <CardHead>Actions</CardHead>
          <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:7}}>
            {(() => {
              const checks = {
                planifier_visite: canDoOppAction(opp.statut, "planifier_visite"),
                creer_lot: canDoOppAction(opp.statut, "creer_lot"),
                abandonner: canDoOppAction(opp.statut, "abandonner"),
              };
              return (
                <>
                  {checks.planifier_visite.allowed
                    ? <PrimaryBtn onClick={()=>{ onPlanifierVisite(opp); toast("success","Visite planifiée →"); }}>🔭 Planifier une visite</PrimaryBtn>
                    : <BlockedBtn reason={checks.planifier_visite.reason}>🔭 Planifier une visite</BlockedBtn>}
                  {checks.creer_lot.allowed
                    ? <Btn onClick={()=>onCreateLot(opp)} bg={T.greenL} color={T.greenD} style={{width:"100%",justifyContent:"center"}}>🌲 Créer un lot</Btn>
                    : <BlockedBtn reason={checks.creer_lot.reason}>🌲 Créer un lot</BlockedBtn>}
                  {checks.abandonner.allowed
                    ? <Btn onClick={()=>doAction("abandonner",()=>onUpdate({...opp,statut:"perdue"}),`Abandonner l'opportunité pour ${opp.commune} ?`)} bg={T.redL} color={T.red} style={{width:"100%",justifyContent:"center"}}>✕ Abandonner</Btn>
                    : <BlockedBtn reason={checks.abandonner.reason}>✕ Abandonner</BlockedBtn>}
                </>
              );
            })()}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── FICHE LOT ──────────────────────────────────────────────────────────────────
const FicheLot = ({lot, onClose, onUpdate, toast}) => {
  const [confirm, setConfirm] = useState(null);
  const b = lotBadge(lot.statut);

  const doAction = (action, fn, confirmMsg) => {
    const check = canDoLotAction(lot.statut, action);
    if (!check.allowed) { toast("error", check.reason); return; }
    if (confirmMsg) { setConfirm({msg:confirmMsg, fn}); return; }
    fn();
  };

  const nextStatut = {
    A_VISITER: "VISITE_REALISEE", VISITE_REALISEE: "VALIDE_EXPLOITATION",
    VALIDE_EXPLOITATION: "EN_EXPLOITATION", EN_EXPLOITATION: "BORD_ROUTE",
    BORD_ROUTE: "A_DECHIQUETER", A_DECHIQUETER: "DECHIQUETAGE_EN_COURS",
    DECHIQUETAGE_EN_COURS: "EN_TRANSPORT", EN_TRANSPORT: "PARTIELLEMENT_LIVRE",
    PARTIELLEMENT_LIVRE: "LIVRE", LIVRE: "CLOTURE",
  };

  const actionButtons = [
    {action:"valider_visite",    label:"✅ Valider la visite",     targetStatut:"VISITE_REALISEE",   bg:T.greenL, color:T.greenD},
    {action:"demarrer_exploitation", label:"⛏ Démarrer exploitation", targetStatut:"EN_EXPLOITATION",   bg:T.blueL,  color:T.blueD},
    {action:"ajouter_tas",       label:"📦 Ajouter un tas",         targetStatut:null,                bg:T.purpleL,color:T.purpleD},
    {action:"planifier_dechiquetage",label:"🪓 Planifier déchiquetage",targetStatut:"A_DECHIQUETER",   bg:T.amberL, color:T.amberD},
    {action:"creer_transport",   label:"🚛 Créer un transport",      targetStatut:"EN_TRANSPORT",      bg:T.purpleL,color:T.purpleD},
    {action:"cloturer",          label:"🔒 Clôturer le lot",         targetStatut:"CLOTURE",           bg:T.greenL, color:T.greenD},
  ];

  const avancement = lot.volumeEstime
    ? Math.min(100, Math.round(((lot.volumeReel??0)/(lot.volumeEstime))*100))
    : 0;

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      {confirm && <ConfirmModal msg={confirm.msg} onConfirm={()=>{confirm.fn();setConfirm(null);}} onCancel={()=>setConfirm(null)}/>}

      <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bd}`,
        display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onClose} style={{background:"none",border:"none",
          cursor:"pointer",fontSize:18,color:T.tx2}}>‹</button>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontFamily:"monospace",fontSize:15,fontWeight:600}}>{lot.numeroLot}</div>
          <div style={{fontSize:11,color:T.tx3}}>{lot.commune}</div>
        </div>
        <Badge bg={b.bg} color={b.color}>{b.label}</Badge>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",
        display:"flex",flexDirection:"column",gap:10}}>

        {/* Timeline */}
        <Card>
          <CardHead>Cycle de vie</CardHead>
          <div style={{padding:"8px 14px"}}><LotTimeline statut={lot.statut}/></div>
        </Card>

        {/* KPIs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[
            ["Volume estimé", lot.volumeEstime?`${lot.volumeEstime} t`:"—", T.tx],
            ["Volume réel",   lot.volumeReel?`${lot.volumeReel} t`:"—", T.green],
            ["Humidité",      lot.humidite?`${lot.humidite} %`:"—", lot.humidite&&lot.humidite>35?T.red:T.tx],
          ].map(([l,v,c]) => (
            <div key={l} style={{background:T.bg2,borderRadius:9,padding:"9px 10px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.tx3}}>{l}</div>
              <div style={{fontSize:16,fontWeight:600,color:c}}>{v}</div>
            </div>
          ))}
        </div>
        {lot.volumeEstime && (
          <div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
              <span style={{color:T.tx2}}>Avancement</span>
              <span style={{fontWeight:600}}>{avancement} %</span>
            </div>
            <div style={{height:6,background:T.bg2,borderRadius:3,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${avancement}%`,background:T.green,borderRadius:3}}/>
            </div>
          </div>
        )}

        {/* Infos */}
        <Card>
          <CardHead>Informations</CardHead>
          <div style={{padding:"8px 14px"}}>
            <Row label="ETF" value={lot.etfNom??"—"}/>
            <Row label="Certification" value={lot.certification??"Aucune"}/>
            <Row label="Surface" value={lot.surfaceHa?`${lot.surfaceHa} ha`:"—"}/>
            <Row label="Essence principale" value={lot.essencePrincipale??"—"} border={false}/>
          </div>
        </Card>

        {/* Tas */}
        {lot.tas && lot.tas.length > 0 && (
          <Card>
            <CardHead extra={<Badge bg={T.greenL} color={T.greenD}>{lot.tas.length} tas</Badge>}>
              Tas bord de route
            </CardHead>
            <div style={{padding:"8px 14px"}}>
              {lot.tas.map(t => (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                  alignItems:"center",padding:"5px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:12}}>
                  <span style={{fontWeight:500}}>Tas {t.numeroTas}</span>
                  <div style={{display:"flex",gap:6}}>
                    <Badge bg={T.bg2} color={T.tx2}>{t.volumeEstime} t</Badge>
                    <Badge bg={t.statut==="pret"?T.greenL:T.amberL}
                      color={t.statut==="pret"?T.greenD:T.amberD}>
                      {t.statut}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Transports */}
        {lot.transports && lot.transports.length > 0 && (
          <Card>
            <CardHead>Transports</CardHead>
            <div style={{padding:"8px 14px"}}>
              {lot.transports.map(t => (
                <div key={t.id} style={{display:"flex",justifyContent:"space-between",
                  padding:"5px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:12}}>
                  <span>{t.chauffeur}</span>
                  <Badge bg={T.purpleL} color={T.purpleD}>{t.statut}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Livraisons */}
        {lot.livraisons && lot.livraisons.length > 0 && (
          <Card>
            <CardHead>Livraisons</CardHead>
            <div style={{padding:"8px 14px"}}>
              {lot.livraisons.map(l => (
                <div key={l.id} style={{display:"flex",justifyContent:"space-between",
                  padding:"5px 0",borderBottom:`0.5px solid ${T.bd}`,fontSize:12}}>
                  <span style={{fontFamily:"monospace",fontSize:11}}>{l.numeroBl}</span>
                  <div style={{display:"flex",gap:6}}>
                    <Badge bg={T.bg2} color={T.tx2}>{l.poids} t</Badge>
                    <Badge bg={l.statut==="valide"?T.greenL:T.amberL}
                      color={l.statut==="valide"?T.greenD:T.amberD}>{l.statut}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Actions workflow */}
        <Card>
          <CardHead>Actions disponibles</CardHead>
          <div style={{padding:"10px 14px",display:"grid",gridTemplateColumns:"1fr 1fr",gap:7}}>
            {actionButtons.map(({action,label,targetStatut,bg,color}) => {
              const check = canDoLotAction(lot.statut, action);
              return check.allowed ? (
                <Btn key={action} onClick={()=>{
                  const fn = () => {
                    if (targetStatut) onUpdate({...lot, statut:targetStatut});
                    toast("success", `${label} — effectué`);
                  };
                  if (action==="cloturer") {
                    doAction(action, fn, `Clôturer définitivement ${lot.numeroLot} ? Cette action est irréversible.`);
                  } else {
                    doAction(action, fn, null);
                  }
                }} bg={bg} color={color} style={{justifyContent:"center",fontSize:11}} key={action}>
                  {label}
                </Btn>
              ) : (
                <BlockedBtn key={action} reason={check.reason}>{label}</BlockedBtn>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── FICHE CHAUFFERIE ───────────────────────────────────────────────────────────
const FicheChaufferie = ({chaufferie, onClose, toast}) => (
  <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
    <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bd}`,
      display:"flex",alignItems:"center",gap:10}}>
      <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
        fontSize:18,color:T.tx2}}>‹</button>
      <div>
        <div style={{fontSize:15,fontWeight:500}}>{chaufferie.nom}</div>
        <div style={{fontSize:11,color:T.tx3}}>{chaufferie.commune}</div>
      </div>
    </div>
    <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
        <div style={{background:T.blueL,borderRadius:9,padding:"10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:T.blueD}}>Capacité/an</div>
          <div style={{fontSize:18,fontWeight:600,color:T.blueD}}>{chaufferie.capaciteTan.toLocaleString()} t</div>
        </div>
        <div style={{background:T.greenL,borderRadius:9,padding:"10px",textAlign:"center"}}>
          <div style={{fontSize:10,color:T.greenD}}>Stock actuel</div>
          <div style={{fontSize:18,fontWeight:600,color:T.greenD}}>{chaufferie.stockActuelT??0} t</div>
        </div>
      </div>
      <Card>
        <CardHead>Spécifications</CardHead>
        <div style={{padding:"8px 14px"}}>
          <Row label="Humidité max" value={`${chaufferie.humiditeMax} %`} valueColor={T.amber}/>
          <Row label="Lots associés" value={`${chaufferie.lotsAssocies?.length??0}`} border={false}/>
        </div>
      </Card>
      <Card>
        <CardHead>Actions</CardHead>
        <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:7}}>
          <PrimaryBtn onClick={()=>toast("success","Livraison prévue créée")}>+ Nouvelle livraison prévue</PrimaryBtn>
          <Btn onClick={()=>toast("success","Contrat associé")} bg={T.blueL} color={T.blueD} style={{justifyContent:"center"}}>📄 Associer un contrat</Btn>
          <Btn onClick={()=>toast("success","Besoin combustible créé")} bg={T.amberL} color={T.amberD} style={{justifyContent:"center"}}>🔥 Créer besoin combustible</Btn>
        </div>
      </Card>
    </div>
  </div>
);

// ── FICHE PLATEFORME ───────────────────────────────────────────────────────────
const FichePlateforme = ({plateforme, onClose, toast}) => {
  const pct = Math.round((plateforme.stockActuelT/plateforme.capaciteT)*100);
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
      <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bd}`,
        display:"flex",alignItems:"center",gap:10}}>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
          fontSize:18,color:T.tx2}}>‹</button>
        <div>
          <div style={{fontSize:15,fontWeight:500}}>{plateforme.nom}</div>
          <div style={{fontSize:11,color:T.tx3}}>{plateforme.commune}</div>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"12px 14px",display:"flex",flexDirection:"column",gap:10}}>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
          {[["Capacité",`${plateforme.capaciteT.toLocaleString()} t`,T.tx],
            ["Stock actuel",`${plateforme.stockActuelT} t`,T.green],
            ["Humidité moy.",`${plateforme.humiditeMoy} %`,plateforme.humiditeMoy>35?T.red:T.tx]
          ].map(([l,v,c])=>(
            <div key={l} style={{background:T.bg2,borderRadius:9,padding:"9px",textAlign:"center"}}>
              <div style={{fontSize:10,color:T.tx3}}>{l}</div>
              <div style={{fontSize:14,fontWeight:600,color:c}}>{v}</div>
            </div>
          ))}
        </div>
        <div>
          <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
            <span style={{color:T.tx2}}>Taux de remplissage</span>
            <span style={{fontWeight:600}}>{pct} %</span>
          </div>
          <div style={{height:8,background:T.bg2,borderRadius:4,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${pct}%`,
              background:pct>85?T.red:pct>60?T.amber:T.green,borderRadius:4}}/>
          </div>
        </div>
        <Card>
          <CardHead>Actions</CardHead>
          <div style={{padding:"10px 14px",display:"flex",flexDirection:"column",gap:7}}>
            <PrimaryBtn onClick={()=>toast("success","Entrée stock enregistrée")}>📥 Entrée stock</PrimaryBtn>
            <Btn onClick={()=>toast("warn","Sortie stock enregistrée")} bg={T.amberL} color={T.amberD} style={{justifyContent:"center"}}>📤 Sortie stock</Btn>
            <Btn onClick={()=>toast("success","Lot associé")} bg={T.greenL} color={T.greenD} style={{justifyContent:"center"}}>🌲 Associer un lot</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
};

// ── SIDEBAR ────────────────────────────────────────────────────────────────────
const MENU = [
  {id:"dashboard", icon:"📊", label:"Tableau de bord"},
  {id:"lots",       icon:"🌲", label:"Lots"},
  {id:"carte",      icon:"🗺️", label:"Carte"},
  {id:"opportunites",icon:"💡",label:"Opportunités"},
  {id:"contacts",   icon:"👥", label:"Contacts"},
  {id:"transports", icon:"🚛", label:"Transports"},
  {id:"livraisons", icon:"🏭", label:"Livraisons"},
  {id:"chaufferies",icon:"🔥", label:"Chaufferies"},
  {id:"alertes",    icon:"🔔", label:"Alertes"},
  {id:"rapports",   icon:"📈", label:"Rapports"},
  {id:"parametres", icon:"⚙️", label:"Paramètres"},
];

const Sidebar = ({active, onNav, alertCount}) => (
  <div style={{width:200,minWidth:200,background:T.sb,display:"flex",
    flexDirection:"column",height:"100vh",position:"sticky",top:0,flexShrink:0}}>
    {/* Logo */}
    <div style={{padding:"16px 14px 12px",borderBottom:`1px solid ${T.sbBd}`,
      display:"flex",alignItems:"center",gap:10}}>
      <div style={{width:30,height:30,background:T.green,borderRadius:8,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:15,flexShrink:0}}>🌲</div>
      <div>
        <div style={{fontSize:14,fontWeight:700,color:"#fff",letterSpacing:".02em"}}>APPLITAG</div>
        <div style={{fontSize:9,color:"#555",letterSpacing:".04em",textTransform:"uppercase"}}>Bois Énergie</div>
      </div>
    </div>
    {/* Nav */}
    <div style={{flex:1,overflowY:"auto",padding:"8px 6px"}}>
      {MENU.map(item => (
        <button key={item.id} onClick={()=>onNav(item.id)}
          style={{width:"100%",padding:"8px 10px",borderRadius:7,
            display:"flex",alignItems:"center",gap:9,
            cursor:"pointer",border:"none",fontFamily:"inherit",
            background:active===item.id?T.green:T.sb,
            color:active===item.id?"#fff":"#999",
            fontSize:12,fontWeight:active===item.id?600:400,
            marginBottom:1,textAlign:"left",transition:"all .1s",
            position:"relative"}}>
          <span style={{fontSize:15,opacity:active===item.id?1:0.6}}>{item.icon}</span>
          {item.label}
          {item.id==="alertes" && alertCount>0 && (
            <span style={{marginLeft:"auto",background:T.red,color:"#fff",
              fontSize:9,fontWeight:700,padding:"1px 5px",borderRadius:8}}>
              {alertCount}
            </span>
          )}
        </button>
      ))}
    </div>
    {/* User */}
    <div style={{padding:"12px 12px",borderTop:`1px solid ${T.sbBd}`,
      display:"flex",alignItems:"center",gap:8}}>
      <div style={{width:28,height:28,borderRadius:"50%",background:T.green,
        display:"flex",alignItems:"center",justifyContent:"center",
        fontSize:11,fontWeight:700,color:"#fff",flexShrink:0}}>JM</div>
      <div>
        <div style={{fontSize:11,fontWeight:600,color:"#ddd"}}>J. Moreau</div>
        <div style={{fontSize:9,color:"#666"}}>Exploitant</div>
      </div>
    </div>
  </div>
);

// ── TOPBAR ─────────────────────────────────────────────────────────────────────
const Topbar = ({title, subtitle, actions, alertCount, onAlerts}) => (
  <div style={{background:"#fff",borderBottom:`1px solid ${T.bd}`,
    padding:"10px 20px",display:"flex",alignItems:"center",gap:12,
    position:"sticky",top:0,zIndex:100,flexShrink:0}}>
    <div style={{flex:1}}>
      <div style={{fontSize:16,fontWeight:600}}>{title}</div>
      {subtitle && <div style={{fontSize:11,color:T.tx3}}>{subtitle}</div>}
    </div>
    <div style={{display:"flex",alignItems:"center",gap:8}}>
      {actions}
      <button onClick={onAlerts} style={{position:"relative",background:"none",
        border:"none",cursor:"pointer",padding:"6px 8px",borderRadius:8,
        background:alertCount>0?T.redL:T.bg2}}>
        <span style={{fontSize:16}}>🔔</span>
        {alertCount>0 && (
          <span style={{position:"absolute",top:2,right:2,width:14,height:14,
            borderRadius:"50%",background:T.red,color:"#fff",
            fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>
            {alertCount}
          </span>
        )}
      </button>
    </div>
  </div>
);

// ── KPI CARDS ──────────────────────────────────────────────────────────────────
const KpiCard = ({label, value, sub, color, icon, onClick}) => (
  <div onClick={onClick} style={{background:"#fff",border:`1px solid ${T.bd}`,
    borderRadius:12,padding:"13px 15px",cursor:onClick?"pointer":"default",
    transition:"box-shadow .1s"}}
    onMouseEnter={e=>{if(onClick)e.currentTarget.style.boxShadow="0 2px 12px rgba(0,0,0,.1)"}}
    onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
      <div style={{fontSize:11,color:T.tx2}}>{label}</div>
      <span style={{fontSize:18}}>{icon}</span>
    </div>
    <div style={{fontSize:24,fontWeight:700,color:color??T.tx}}>{value}</div>
    {sub && <div style={{fontSize:10,color:T.tx3,marginTop:3}}>{sub}</div>}
  </div>
);

// ── MAIN DASHBOARD PAGE ────────────────────────────────────────────────────────
const DashboardPage = ({lots, transports, opportunites, contacts, chaufferies, plateformes,
  alertes, historique, onOpenFiche, onNav}) => {

  const [mapFilters, setMapFilters] = useState(["lots","transports","chaufferies","plateformes","opportunites"]);
  const openAlerts = alertes.filter(a=>!a.resolue);

  const toggleFilter = (f) => setMapFilters(prev =>
    prev.includes(f) ? prev.filter(x=>x!==f) : [...prev,f]);

  const FILTER_OPTIONS = [
    ["lots","🌲 Lots"],["opportunites","💡 Opportunités"],["transports","🚛 Transports"],
    ["livraisons","📦 Livraisons"],["alertes","🔔 Alertes"],
    ["chaufferies","🏭 Chaufferies"],["plateformes","🏗️ Plateformes"],
  ];

  const tonnes7j = lots.reduce((s,l)=>{
    const lv = l.livraisons?.filter(lv=>lv.statut==="valide") ?? [];
    return s + lv.reduce((ss,lv)=>ss+lv.poids,0);
  }, 0);

  const humMoy = lots.filter(l=>l.humidite).reduce((s,l,_,arr)=>s+l.humidite/arr.length,0);

  return (
    <div style={{flex:1,display:"flex",flexDirection:"column",overflowY:"auto"}}>
      {/* KPIs */}
      <div style={{padding:"16px 20px 0",display:"grid",
        gridTemplateColumns:"repeat(5,1fr)",gap:10}}>
        <KpiCard label="Lots en exploitation" value={lots.filter(l=>l.statut==="EN_EXPLOITATION").length}
          sub="Chantiers actifs" color={T.blue} icon="⛏"
          onClick={()=>onNav("lots")}/>
        <KpiCard label="Tonnes livrées 7j" value={`${tonnes7j} t`}
          sub="Livraisons validées" color={T.green} icon="📦"
          onClick={()=>onNav("livraisons")}/>
        <KpiCard label="Humidité moyenne" value={`${humMoy.toFixed(1)} %`}
          sub={humMoy>35?"⚠ Seuil 35%":"✓ Conforme"} color={humMoy>35?T.red:T.green} icon="💧"/>
        <KpiCard label="Transports en cours" value={transports.filter(t=>t.statut==="en_route").length}
          sub="CMR actifs" color={T.purple} icon="🚛"
          onClick={()=>onNav("transports")}/>
        <KpiCard label="Alertes critiques" value={openAlerts.filter(a=>a.niveau==="critique").length}
          sub={`${openAlerts.length} total`} color={openAlerts.length>0?T.red:T.green} icon="🔔"
          onClick={()=>onNav("alertes")}/>
      </div>

      {/* Main grid */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 280px",
        gap:12,padding:"14px 20px",minHeight:0}}>

        {/* LEFT — Carte + filtres + chantiers */}
        <div style={{display:"flex",flexDirection:"column",gap:10,minWidth:0}}>

          {/* Map */}
          <Card style={{flex:1,minHeight:320,display:"flex",flexDirection:"column"}}>
            <CardHead extra={
              <div style={{display:"flex",gap:4,flexWrap:"wrap"}}>
                {FILTER_OPTIONS.map(([f,label]) => (
                  <button key={f} onClick={()=>toggleFilter(f)} style={{
                    padding:"3px 8px",borderRadius:6,fontSize:10,fontWeight:500,
                    cursor:"pointer",border:"none",fontFamily:"inherit",
                    background:mapFilters.includes(f)?T.green:T.bg2,
                    color:mapFilters.includes(f)?"#fff":T.tx2,
                  }}>{label}</button>
                ))}
              </div>
            }>
              Carte opérationnelle
            </CardHead>
            <div style={{flex:1,minHeight:280}}>
              <MapCanvas filters={mapFilters} lots={lots} transports={transports}
                opportunites={opportunites} contacts={contacts}
                chaufferies={chaufferies} plateformes={plateformes} alertes={alertes}
                onMarkerClick={(type, data) => onOpenFiche(type, data)}/>
            </div>
          </Card>

          {/* Raccourcis */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8}}>
            {[
              ["📦","Livraisons\ndu jour", "livraisons", lots.flatMap(l=>l.livraisons??[]).filter(l=>l.date===new Date().toISOString().slice(0,10)).length],
              ["🔴","Alertes\ncritiques", "alertes", openAlerts.filter(a=>a.niveau==="critique").length],
              ["📦","Bord de\nroute", "lots", lots.filter(l=>l.statut==="BORD_ROUTE").length],
              ["🚛","Transports\nen cours", "transports", transports.filter(t=>t.statut==="en_route").length],
              ["🔭","À visiter", "lots", opportunites.filter(o=>o.statut==="a_visiter").length],
            ].map(([icon, label, nav, count]) => (
              <button key={label} onClick={()=>onNav(nav)} style={{
                background:"#fff",border:`1px solid ${T.bd}`,borderRadius:10,
                padding:"10px 8px",cursor:"pointer",textAlign:"center",fontFamily:"inherit",
                transition:"box-shadow .1s",
              }}>
                <div style={{fontSize:18}}>{icon}</div>
                <div style={{fontSize:16,fontWeight:700,color:count>0?T.green:T.tx3,margin:"3px 0"}}>{count}</div>
                <div style={{fontSize:9,color:T.tx3,lineHeight:1.3,whiteSpace:"pre-line"}}>{label}</div>
              </button>
            ))}
          </div>

          {/* Chantiers du jour */}
          <Card>
            <CardHead extra={<Btn small onClick={()=>onNav("lots")} bg={T.greenL} color={T.greenD}>Voir tous</Btn>}>
              Chantiers actifs
            </CardHead>
            <div style={{padding:"0 14px"}}>
              {lots.filter(l=>["EN_EXPLOITATION","A_DECHIQUETER","EN_TRANSPORT"].includes(l.statut))
                .slice(0,4).map(l => {
                  const b = lotBadge(l.statut);
                  const av = l.volumeEstime ? Math.min(100,Math.round(((l.volumeReel??0)/l.volumeEstime)*100)) : 0;
                  return (
                    <div key={l.id} onClick={()=>onOpenFiche("lot",l)}
                      style={{display:"flex",alignItems:"center",gap:12,
                        padding:"9px 0",borderBottom:`0.5px solid ${T.bd}`,cursor:"pointer"}}>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <span style={{fontFamily:"monospace",fontSize:12,fontWeight:600}}>{l.numeroLot}</span>
                          <Badge bg={b.bg} color={b.color}>{b.label}</Badge>
                        </div>
                        <div style={{fontSize:11,color:T.tx3}}>{l.commune} · {l.essencePrincipale}</div>
                        <div style={{height:3,background:T.bg2,borderRadius:2,marginTop:5,overflow:"hidden"}}>
                          <div style={{height:"100%",width:`${av}%`,background:T.green}}/>
                        </div>
                      </div>
                      <div style={{textAlign:"right",flexShrink:0}}>
                        <div style={{fontSize:13,fontWeight:600,color:T.green}}>{l.volumeReel??0} t</div>
                        <div style={{fontSize:10,color:T.tx3}}>réel</div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </Card>
        </div>

        {/* RIGHT — Activité + alertes */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {/* Alertes */}
          {openAlerts.length > 0 && (
            <Card>
              <CardHead extra={<Badge bg={T.redL} color={T.red}>{openAlerts.length}</Badge>}>
                Alertes
              </CardHead>
              <div style={{padding:"6px 12px"}}>
                {openAlerts.slice(0,4).map(a => {
                  const ab = alertBadge(a.niveau);
                  const lot = lots.find(l=>l.id===a.refId);
                  return (
                    <div key={a.id} onClick={()=>lot&&onOpenFiche("lot",lot)}
                      style={{padding:"7px 0",borderBottom:`0.5px solid ${T.bd}`,
                        cursor:lot?"pointer":"default"}}>
                      <div style={{display:"flex",gap:6,alignItems:"flex-start"}}>
                        <Badge bg={ab.bg} color={ab.color}>{ab.label}</Badge>
                      </div>
                      <div style={{fontSize:11,color:T.tx,lineHeight:1.4,marginTop:3}}>{a.message}</div>
                      <div style={{fontSize:10,color:T.tx3,marginTop:2}}>{fmt(a.createdAt)}</div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Activité récente */}
          <Card style={{flex:1}}>
            <CardHead>Activité récente</CardHead>
            <div style={{padding:"6px 12px",flex:1,overflowY:"auto"}}>
              {historique.slice().sort((a,b)=>b.createdAt.localeCompare(a.createdAt))
                .slice(0,10).map((e,i) => {
                  const icons = {statut_change:"🔄",opportunite_creee:"💡",transport_parti:"🚛",
                    alerte:"⚠️",visite_validee:"✅",lot_cree:"🌲"};
                  const refObj = e.refType==="lot" ? lots.find(l=>l.id===e.refId)
                    : e.refType==="opportunite" ? opportunites.find(o=>o.id===e.refId) : null;
                  return (
                    <div key={e.id} onClick={()=>refObj&&onOpenFiche(e.refType,refObj)}
                      style={{display:"flex",gap:8,padding:"7px 0",
                        borderBottom:i<9?`0.5px solid ${T.bd}`:"none",
                        cursor:refObj?"pointer":"default"}}>
                      <div style={{width:22,height:22,borderRadius:"50%",background:T.bg2,
                        display:"flex",alignItems:"center",justifyContent:"center",
                        fontSize:11,flexShrink:0}}>{icons[e.action]??"•"}</div>
                      <div>
                        <div style={{fontSize:11,color:T.tx,lineHeight:1.4}}>{e.message}</div>
                        <div style={{fontSize:10,color:T.tx3}}>{fmtFull(e.createdAt)} · {e.utilisateur}</div>
                      </div>
                    </div>
                  );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

// ── PAGE LOTS ──────────────────────────────────────────────────────────────────
const LotsPage = ({lots, onOpenFiche}) => {
  const [filter, setFilter] = useState("tous");
  const statuts = [{v:"tous",l:"Tous"},{v:"EN_EXPLOITATION",l:"Exploitation"},{v:"BORD_ROUTE",l:"Bord route"},{v:"A_DECHIQUETER",l:"Déchiquetage"},{v:"EN_TRANSPORT",l:"Transport"},{v:"LIVRE",l:"Livré"}];
  const visible = filter==="tous" ? lots : lots.filter(l=>l.statut===filter);
  return (
    <div style={{padding:"16px 20px",flex:1,overflowY:"auto"}}>
      <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
        {statuts.map(({v,l}) => {
          const b = v==="tous"?{bg:T.green,color:"#fff"}:lotBadge(v);
          return (
            <button key={v} onClick={()=>setFilter(v)} style={{
              padding:"5px 12px",borderRadius:8,fontSize:11,fontWeight:500,
              cursor:"pointer",border:"none",fontFamily:"inherit",
              background:filter===v?(v==="tous"?T.green:b.bg):T.bg2,
              color:filter===v?(v==="tous"?"#fff":b.color):T.tx2,
            }}>{l} {v!=="tous"&&<span>({lots.filter(x=>x.statut===v).length})</span>}</button>
          );
        })}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:10}}>
        {visible.map(l => {
          const b = lotBadge(l.statut);
          const av = l.volumeEstime ? Math.min(100,Math.round(((l.volumeReel??0)/l.volumeEstime)*100)) : 0;
          return (
            <div key={l.id} onClick={()=>onOpenFiche("lot",l)}
              style={{background:"#fff",border:`1px solid ${T.bd}`,borderRadius:12,
                padding:"12px 14px",cursor:"pointer",borderLeft:`4px solid ${b.color}`}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                <span style={{fontFamily:"monospace",fontSize:12,fontWeight:600}}>{l.numeroLot}</span>
                <Badge bg={b.bg} color={b.color}>{b.label}</Badge>
              </div>
              <div style={{fontSize:13,fontWeight:500,marginBottom:3}}>{l.commune}</div>
              <div style={{fontSize:11,color:T.tx3,marginBottom:8}}>
                {l.essencePrincipale} · {l.surfaceHa??0} ha · {l.etfNom??"—"}
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                <span style={{color:T.tx2}}>Avancement</span>
                <span style={{fontWeight:600,color:T.green}}>{l.volumeReel??0}/{l.volumeEstime??0} t</span>
              </div>
              <div style={{height:5,background:T.bg2,borderRadius:3,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${av}%`,background:T.green}}/>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── PAGE ALERTES ───────────────────────────────────────────────────────────────
const AlertesPage = ({alertes, lots, onOpenFiche, onResolve}) => (
  <div style={{padding:"16px 20px",flex:1,overflowY:"auto"}}>
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {alertes.map(a => {
        const ab = alertBadge(a.niveau);
        const lot = lots.find(l=>l.id===a.refId);
        return (
          <div key={a.id} style={{background:"#fff",border:`1px solid ${T.bd}`,
            borderRadius:12,padding:"12px 14px",
            borderLeft:`4px solid ${a.niveau==="critique"?T.red:a.niveau==="warn"?T.amber:T.blue}`}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{flex:1}}>
                <div style={{display:"flex",gap:8,marginBottom:5}}>
                  <Badge bg={ab.bg} color={ab.color}>{ab.label}</Badge>
                  {a.resolue && <Badge bg={T.greenL} color={T.greenD}>Résolue</Badge>}
                </div>
                <div style={{fontSize:13,color:T.tx,lineHeight:1.5}}>{a.message}</div>
                <div style={{fontSize:11,color:T.tx3,marginTop:4}}>
                  {fmtFull(a.createdAt)}
                  {lot && <span style={{color:T.blue,marginLeft:8,cursor:"pointer"}} onClick={()=>onOpenFiche("lot",lot)}>→ {lot.numeroLot}</span>}
                </div>
              </div>
              {!a.resolue && (
                <Btn onClick={()=>onResolve(a.id)} bg={T.greenL} color={T.greenD} small>Résoudre</Btn>
              )}
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

// ── STUB PAGE ──────────────────────────────────────────────────────────────────
const StubPage = ({title, icon}) => (
  <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
    justifyContent:"center",gap:12,padding:40,color:T.tx3}}>
    <div style={{fontSize:48}}>{icon}</div>
    <div style={{fontSize:16,fontWeight:500,color:T.tx}}>{title}</div>
    <div style={{fontSize:12}}>Module en développement — Sprint suivant</div>
    <Badge bg={T.amberL} color={T.amberD}>À venir</Badge>
  </div>
);

// ── RIGHT PANEL (fiches) ───────────────────────────────────────────────────────
const RightPanel = ({fiche, onClose, onUpdateLot, onUpdateOpp, toast}) => {
  if (!fiche) return null;
  const style = {
    width:380,minWidth:380,height:"100%",background:"#fff",
    borderLeft:`1px solid ${T.bd}`,display:"flex",flexDirection:"column",
    flexShrink:0,overflow:"hidden",
  };
  return (
    <div style={style}>
      {fiche.type==="lot" && (
        <FicheLot lot={fiche.data} onClose={onClose} onUpdate={onUpdateLot} toast={toast}/>
      )}
      {fiche.type==="opportunite" && (
        <FicheOpportunite opp={fiche.data} contact={fiche.contact}
          onClose={onClose} onUpdate={onUpdateOpp}
          onCreateLot={()=>toast("success","Lot créé depuis l'opportunité")}
          onPlanifierVisite={()=>toast("success","Visite planifiée")}
          toast={toast}/>
      )}
      {fiche.type==="chaufferie" && (
        <FicheChaufferie chaufferie={fiche.data} onClose={onClose} toast={toast}/>
      )}
      {fiche.type==="plateforme" && (
        <FichePlateforme plateforme={fiche.data} onClose={onClose} toast={toast}/>
      )}
      {fiche.type==="transport" && (
        <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${T.bd}`,
            display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",
              fontSize:18,color:T.tx2}}>‹</button>
            <div>
              <div style={{fontSize:15,fontWeight:500}}>Transport · {fiche.data.lotNumero}</div>
              <div style={{fontSize:11,color:T.tx3}}>{fiche.data.chauffeur}</div>
            </div>
          </div>
          <div style={{padding:"14px 16px",flex:1,overflowY:"auto"}}>
            <Card>
              <CardHead>Détails mission</CardHead>
              <div style={{padding:"8px 14px"}}>
                <Row label="Chauffeur" value={fiche.data.chauffeur}/>
                <Row label="Camion" value={fiche.data.camion}/>
                <Row label="Destination" value={fiche.data.destination}/>
                <Row label="Poids" value={`${fiche.data.poidsT} t`} valueColor={T.green}/>
                <Row label="Départ" value={fiche.data.heureDepart??"—"} border={false}/>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

// ── APP ────────────────────────────────────────────────────────────────────────
export default function App() {
  const [lots, setLots] = useState(LOTS);
  const [opportunites, setOpportunites] = useState(OPPORTUNITES);
  const [alertes, setAlertes] = useState(ALERTES_INIT);
  const [historique, setHistorique] = useState(HISTORIQUE_INIT);
  const [toasts, setToasts] = useState([]);
  const [fiche, setFiche] = useState(null); // {type, data, contact?}
  const [activePage, setActivePage] = useState("dashboard");
  const [confirm, setConfirm] = useState(null);

  const toast = useCallback((type, message) => {
    const id = uid();
    setToasts(t=>[...t,{id,type,message}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3500);
  }, []);

  const addHistorique = useCallback((event) => {
    setHistorique(h=>[...h,{...event,id:uid(),createdAt:now()}]);
  }, []);

  const openFiche = useCallback((type, data) => {
    const extra = {};
    if (type==="opportunite") {
      extra.contact = CONTACTS.find(c=>c.id===data.contactId);
    }
    setFiche({type, data, ...extra});
  }, []);

  const updateLot = useCallback((lot) => {
    setLots(prev=>prev.map(l=>l.id===lot.id?lot:l));
    if (fiche?.type==="lot" && fiche.data.id===lot.id) setFiche({...fiche, data:lot});
    addHistorique({refId:lot.id, refType:"lot", action:"statut_change",
      message:`${lot.numeroLot} → ${lotBadge(lot.statut).label}`, utilisateur:"J. Moreau"});
    toast("success", `${lot.numeroLot} mis à jour → ${lotBadge(lot.statut).label}`);
  }, [fiche, addHistorique, toast]);

  const updateOpp = useCallback((opp) => {
    setOpportunites(prev=>prev.map(o=>o.id===opp.id?opp:o));
    if (fiche?.type==="opportunite" && fiche.data.id===opp.id) setFiche({...fiche,data:opp});
    addHistorique({refId:opp.id, refType:"opportunite", action:"statut_change",
      message:`Opportunité ${opp.commune??""} → ${oppBadge(opp.statut).label}`, utilisateur:"J. Moreau"});
  }, [fiche, addHistorique]);

  const resolveAlerte = useCallback((id) => {
    setAlertes(prev=>prev.map(a=>a.id===id?{...a,resolue:true}:a));
    toast("success","Alerte résolue");
  }, [toast]);

  const openAlerts = alertes.filter(a=>!a.resolue);

  const pageTitle = MENU.find(m=>m.id===activePage);

  const renderPage = () => {
    if (activePage==="dashboard") return (
      <DashboardPage lots={lots} transports={TRANSPORTS} opportunites={opportunites}
        contacts={CONTACTS} chaufferies={CHAUFFERIES} plateformes={PLATEFORMES}
        alertes={alertes} historique={historique} onOpenFiche={openFiche} onNav={setActivePage}/>
    );
    if (activePage==="lots") return <LotsPage lots={lots} onOpenFiche={openFiche}/>;
    if (activePage==="alertes") return (
      <AlertesPage alertes={alertes} lots={lots} onOpenFiche={openFiche} onResolve={resolveAlerte}/>
    );
    return <StubPage title={pageTitle?.label??activePage} icon={pageTitle?.icon??"🚧"}/>;
  };

  return (
    <div style={{display:"flex",minHeight:"100vh",background:T.bg,fontFamily:"-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,sans-serif"}}>
      <style>{`@keyframes slideIn{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}`}</style>
      <ToastList toasts={toasts} onDismiss={id=>setToasts(t=>t.filter(x=>x.id!==id))}/>

      {/* Sidebar */}
      <Sidebar active={activePage} onNav={(id)=>{setActivePage(id);setFiche(null);}}
        alertCount={openAlerts.length}/>

      {/* Main */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minWidth:0,overflow:"hidden"}}>
        <Topbar
          title={pageTitle?.label??"APPLITAG"}
          subtitle={activePage==="dashboard"?"Saison 2025 · Yonne (89)":undefined}
          alertCount={openAlerts.filter(a=>a.niveau==="critique").length}
          onAlerts={()=>setActivePage("alertes")}
          actions={
            <div style={{display:"flex",gap:8}}>
              <Btn onClick={()=>{openFiche("opportunite",OPPORTUNITES[0]);setActivePage("dashboard");}}
                bg={T.amberL} color={T.amberD}>+ Nouvelle opportunité</Btn>
              <PrimaryBtn onClick={()=>{toast("success","Nouveau lot créé");}}>+ Nouveau lot</PrimaryBtn>
            </div>
          }/>
        <div style={{flex:1,display:"flex",overflow:"hidden"}}>
          <div style={{flex:1,overflow:"auto",display:"flex",flexDirection:"column"}}>
            {renderPage()}
          </div>
          {fiche && (
            <RightPanel fiche={fiche} onClose={()=>setFiche(null)}
              onUpdateLot={updateLot} onUpdateOpp={updateOpp} toast={toast}/>
          )}
        </div>
      </div>
    </div>
  );
}
